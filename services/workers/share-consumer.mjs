import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { SHARE_QUEUE, getRabbitChannel, closeRabbit } from "../shared/rabbitmq.mjs";
import { publishRedis, closeRedis } from "../shared/redis.mjs";
import { logger } from "../shared/logger.mjs";
import { updateMiningAbuseStatsWithClient } from "../shared/mining-abuse-core.mjs";
import { accrueMiningRewardWithClient } from "../shared/reward-core.mjs";
import { assertNoProductionLocalDatabase, assertProductionMiningSafety } from "../shared/production-safety.mjs";

assertProductionMiningSafety("share-consumer");
assertNoProductionLocalDatabase("share-consumer");

const prisma = new PrismaClient();
const BATCH_SIZE = Number(process.env.MINING_BATCH_SIZE || "300");
const BATCH_FLUSH_MS = Number(process.env.MINING_BATCH_FLUSH_MS || "1000");
const PREFETCH = Number(process.env.MINING_QUEUE_PREFETCH || "800");

let pending = [];
let flushTimer;

const TEST_REWARD_SOURCE_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.ENABLE_TEST_MINING_REWARDS === "true";
const TEST_GROSS_REWARD = process.env.TEST_MINING_GROSS_REWARD || "0.000001";

function buildDeterministicShareId(input) {
  const submittedAt = input.submittedAt ? new Date(input.submittedAt).toISOString() : "";
  const digest = crypto
    .createHash("sha256")
    .update([input.userId, input.minerId, input.nonce, input.difficulty, submittedAt].join(":"))
    .digest("hex");

  return `share_${digest.slice(0, 28)}`;
}

function positiveDecimal(value) {
  if (value === null || value === undefined) return null;

  const decimal = new Decimal(value);
  if (decimal.lte(0)) return null;

  return decimal;
}

function rewardInputForPayload(payload, shareId) {
  const realGrossReward = positiveDecimal(payload.reward);
  if (realGrossReward) {
    return {
      userId: payload.userId,
      shareId,
      grossReward: realGrossReward,
      source: payload.source === "block" || payload.source === "pplns" || payload.source === "test" ? payload.source : "block",
    };
  }

  if (!TEST_REWARD_SOURCE_ENABLED) return null;

  const testGrossReward = positiveDecimal(TEST_GROSS_REWARD);
  if (!testGrossReward) return null;

  return {
    userId: payload.userId,
    shareId,
    grossReward: testGrossReward,
    source: "test",
  };
}

async function persistShare(entry) {
  const payload = entry.payload;
  const shareId = buildDeterministicShareId(payload);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.share.create({
        data: {
          id: shareId,
          minerId: payload.minerId,
          userId: payload.userId,
          nonce: payload.nonce,
          difficulty: payload.difficulty,
          accepted: payload.accepted,
          reward: 0,
          createdAt: payload.submittedAt ? new Date(payload.submittedAt) : new Date(),
        },
      });

      await updateMiningAbuseStatsWithClient(tx, {
        userId: payload.userId,
        accepted: payload.accepted,
        at: payload.submittedAt,
        logger,
      });

      const rewardInput = rewardInputForPayload(payload, shareId);
      if (!rewardInput) return;

      const result = await accrueMiningRewardWithClient(prisma, {
        userId: rewardInput.userId,
        grossReward: rewardInput.grossReward,
        shareId: rewardInput.shareId,
        source: rewardInput.source,
      });
      if (result.netReward <= 0) return;

      // Share.reward stores gross reward for audit.
      // pendingBalance stores net reward after fee calculation.
      await tx.minerProfile.upsert({
        where: { userId: payload.userId },
        update: {
          pendingBalance: { increment: result.netReward },
          rewardFlow: { increment: result.netReward },
          updatedAt: new Date(),
        },
        create: {
          userId: payload.userId,
          pendingBalance: result.netReward,
          rewardFlow: result.netReward,
        },
      });

      await tx.share.update({
        where: { id: shareId },
        data: { reward: result.grossReward },
      });

      logger.info("Reward applied", {
        userId: payload.userId,
        grossReward: result.grossReward,
        netReward: result.netReward,
        shareId,
      });
    });

    return true;
  } catch (error) {
    if (error?.code === "P2002") {
      return false;
    }

    throw error;
  }
}

function scheduleFlush() {
  if (!flushTimer) {
    flushTimer = setTimeout(async () => {
      flushTimer = null;
      await flushBatch();
    }, BATCH_FLUSH_MS);
  }
}

async function flushBatch() {
  if (pending.length === 0) return;

  const batch = pending;
  pending = [];

  try {
    let insertedShares = 0;
    for (const entry of batch) {
      const inserted = await persistShare(entry);
      if (inserted) insertedShares += 1;
    }

    await Promise.all(
      batch.map((entry) =>
        entry.channel.ack(entry.msg)
      )
    );

    const totals = batch.reduce(
      (acc, entry) => {
        acc.shares += 1;
        acc.difficulty += Number(entry.payload.difficulty || 0);
        return acc;
      },
      { shares: 0, difficulty: 0 }
    );

    await publishRedis("mining:shares:processed", {
      shares: insertedShares,
      difficulty: totals.difficulty,
      at: Date.now(),
    });
  } catch {
    for (const entry of batch) {
      entry.channel.nack(entry.msg, false, true);
    }
  }
}

async function start() {
  const channel = await getRabbitChannel();
  await channel.prefetch(PREFETCH);

  await channel.consume(
    SHARE_QUEUE,
    async (msg) => {
      if (!msg) return;

      let payload;
      try {
        payload = JSON.parse(msg.content.toString());
      } catch {
        channel.ack(msg);
        return;
      }

      pending.push({ channel, msg, payload });

      if (pending.length >= BATCH_SIZE) {
        await flushBatch();
      } else {
        scheduleFlush();
      }
    },
    { noAck: false }
  );

  logger.info("Share consumer started", { queue: SHARE_QUEUE, prefetch: PREFETCH, batchSize: BATCH_SIZE });
}

async function shutdown() {
  if (flushTimer) clearTimeout(flushTimer);
  await flushBatch();
  await closeRabbit();
  await closeRedis();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

start().catch(async () => {
  await shutdown();
});
