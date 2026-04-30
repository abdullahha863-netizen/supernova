import { PrismaClient } from "@prisma/client";
import { getRedisSubscriber, getRedis, closeRedis } from "../shared/redis.mjs";
import { logger } from "../shared/logger.mjs";
import { assertNoProductionLocalDatabase } from "../shared/production-safety.mjs";

const CHANNEL = "mining:shares:processed";
const SNAPSHOT_INTERVAL_MS = Number(process.env.MINING_HASHRATE_SNAPSHOT_INTERVAL_MS || "300000");
const HISTORY_RETENTION_DAYS = Number(process.env.MINING_HASHRATE_HISTORY_RETENTION_DAYS || "45");

assertNoProductionLocalDatabase("stats-aggregator");

const prisma = new PrismaClient();
let snapshotTimer;
let redisEnabled = false;

async function tryInitRedis() {
  try {
    const redis = getRedis();
    const sub = getRedisSubscriber();
    await Promise.all([redis.ping(), sub.ping()]);
    redisEnabled = true;
    return { redis, sub };
  } catch (error) {
    redisEnabled = false;
    logger.warn("stats_aggregator_redis_unavailable", { error: String(error) });
    return { redis: null, sub: null };
  }
}

async function captureHashrateSnapshots() {
  try {
    const workers = await prisma.minerWorker.findMany({
      select: {
        userId: true,
        hashrate: true,
        status: true,
      },
    });

    const snapshotsByUser = new Map();
    for (const worker of workers) {
      const snapshot = snapshotsByUser.get(worker.userId) || {
        userId: worker.userId,
        hashrate: 0,
        workerCount: 0,
        onlineWorkers: 0,
      };

      snapshot.workerCount += 1;
      if (worker.status === "online" || worker.status === "warning") {
        snapshot.hashrate += Number(worker.hashrate);
        snapshot.onlineWorkers += 1;
      }

      snapshotsByUser.set(worker.userId, snapshot);
    }

    const rows = [...snapshotsByUser.values()];

    if (rows.length > 0) {
      const recordedAt = new Date();
      await prisma.minerHashrateHistory.createMany({
        data: rows.map((row) => ({
          userId: row.userId,
          hashrate: row.hashrate,
          workerCount: row.workerCount,
          onlineWorkers: row.onlineWorkers,
          recordedAt,
        })),
      });
    }

    await prisma.minerHashrateHistory.deleteMany({
      where: {
        recordedAt: {
          lt: new Date(Date.now() - HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000),
        },
      },
    });
  } catch (error) {
    logger.warn("hashrate_snapshot_capture_failed", { error: String(error) });
  }
}

async function start() {
  const { sub, redis } = await tryInitRedis();

  await captureHashrateSnapshots();

  snapshotTimer = setInterval(() => {
    void captureHashrateSnapshots();
  }, SNAPSHOT_INTERVAL_MS);

  if (sub && redis) {
    await sub.subscribe(CHANNEL);

    sub.on("message", async (channel, message) => {
      if (channel !== CHANNEL) return;

      try {
        const payload = JSON.parse(message);
        const key = `mining:agg:${new Date().toISOString().slice(0, 13)}`;
        await redis.hincrbyfloat(key, "shares", Number(payload.shares || 0));
        await redis.hincrbyfloat(key, "difficulty", Number(payload.difficulty || 0));
        await redis.expire(key, 60 * 60 * 24);
      } catch {
        // Ignore malformed messages.
      }
    });
  }

  logger.info("Stats aggregator started", {
    channel: CHANNEL,
    snapshotIntervalMs: SNAPSHOT_INTERVAL_MS,
    redisEnabled,
  });
}

async function shutdown() {
  if (snapshotTimer) clearInterval(snapshotTimer);
  await closeRedis();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

start().catch(async () => {
  await shutdown();
});
