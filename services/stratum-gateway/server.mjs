import cluster from "node:cluster";
import crypto from "node:crypto";
import net from "node:net";
import os from "node:os";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { publishShare, closeRabbit } from "../shared/rabbitmq.mjs";
import { closeRedis, getRedis, publishRedis } from "../shared/redis.mjs";
import { incCounter, recordLatency } from "../shared/mining-metrics.mjs";
import { logger } from "../shared/logger.mjs";
import { postBackendEvent } from "../shared/backend-sync.mjs";
import { assertNoProductionLocalDatabase, assertProductionMiningSafety } from "../shared/production-safety.mjs";
import { buildKaspaBlockCandidate, KaspaRpcClient } from "../shared/kaspa-rpc.mjs";

const HOST = process.env.STRATUM_HOST || "0.0.0.0";
const V1_PORT = Number(process.env.STRATUM_V1_PORT || "3333");
const V2_PORT = Number(process.env.STRATUM_V2_PORT || "4444");
const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
const DEFAULT_DIFFICULTY = Number(process.env.STRATUM_DEFAULT_DIFFICULTY || "2048");
const RATE_LIMIT_PER_SECOND = Number(process.env.STRATUM_RATE_LIMIT_PER_SECOND || "12000");
const JOB_INTERVAL_MS = Number(process.env.STRATUM_JOB_INTERVAL_MS || "12000");
const JOB_TTL_MS = Number(process.env.STRATUM_JOB_TTL_MS || "120000");
const USE_CLUSTER = process.env.STRATUM_CLUSTER === "true";
const WORKERS = Number(process.env.STRATUM_WORKERS || Math.max(1, os.cpus().length));
const AUTH_TIMEOUT_MS = Number(process.env.STRATUM_AUTH_TIMEOUT_MS || "15000");
const VERSION_ROLLING_MASK = process.env.STRATUM_V2_VERSION_ROLLING_MASK || "1fffe000";

const MAX_TARGET = (BigInt(1) << BigInt(256)) - BigInt(1);
const kaspaRpcConfig = assertProductionMiningSafety("stratum-gateway");
assertNoProductionLocalDatabase("stratum-gateway");
const kaspaRpc = new KaspaRpcClient(kaspaRpcConfig);

if (USE_CLUSTER && cluster.isPrimary) {
  for (let i = 0; i < WORKERS; i += 1) cluster.fork();
  cluster.on("exit", () => cluster.fork());
} else {
  startGateway().catch((err) => {
    logger.error("stratum_gateway_boot_failed", { error: String(err) });
    process.exit(1);
  });
}

function difficultyToTargetHex(difficulty) {
  const d = Number.isFinite(difficulty) ? Math.max(1, difficulty) : 1;
  const scaled = BigInt(Math.max(1000, Math.round(d * 1000)));
  const target = (MAX_TARGET * BigInt(1000)) / scaled;
  return target.toString(16).padStart(64, "0");
}

function doubleSha256Hex(data) {
  const first = crypto.createHash("sha256").update(data).digest();
  return crypto.createHash("sha256").update(first).digest("hex");
}

function normalizeNonce(nonce) {
  return String(nonce || "").trim().toLowerCase();
}

function parseUsername(raw) {
  const value = String(raw || "").trim();
  const dot = value.indexOf(".");
  if (dot <= 0 || dot >= value.length - 1) return null;
  return {
    userId: value.slice(0, dot),
    workerName: value.slice(dot + 1),
    full: value,
  };
}

function buildSyntheticTemplate() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Synthetic Stratum templates are disabled in production");
  }

  const now = Math.floor(Date.now() / 1000);
  return {
    prevHash: crypto.randomBytes(32).toString("hex"),
    merkleRoot: crypto.randomBytes(32).toString("hex"),
    version: "20000000",
    nbits: "1d00ffff",
    ntime: now.toString(16).padStart(8, "0"),
  };
}

async function buildTemplateForSession(session) {
  if (process.env.NODE_ENV !== "production") {
    return {
      template: buildSyntheticTemplate(),
      kaspaTemplate: null,
      blockTargetHex: null,
    };
  }

  try {
    const kaspaTemplate = await kaspaRpc.getBlockTemplate(`supernova:${session.userId}:${session.workerName}`);
    return {
      template: kaspaTemplate.stratum,
      kaspaTemplate,
      blockTargetHex: kaspaTemplate.targetHex,
    };
  } catch (error) {
    logger.error("kaspa_rpc_template_failed", {
      userId: session.userId,
      workerName: session.workerName,
      error: String(error),
    });
    throw error;
  }
}

function buildShareMaterial(job, submit) {
  return `${job.jobId}:${job.userId}:${job.minerId}:${job.template.prevHash}:${job.template.merkleRoot}:${job.extranonce1}:${submit.extranonce2}:${submit.ntime}:${submit.nonce}:${submit.version || job.template.version}`;
}

function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && typeof decoded === "object") {
      const userId = typeof decoded.sub === "string"
        ? decoded.sub
        : typeof decoded.userId === "string"
          ? decoded.userId
          : null;
      if (userId) return { ...decoded, userId };
    }
    return null;
  } catch {
    return null;
  }
}

function respondV1(socket, id, result, error = null) {
  socket.write(`${JSON.stringify({ id, result, error })}\n`);
}

function notifyV1(socket, method, params) {
  socket.write(`${JSON.stringify({ id: null, method, params })}\n`);
}

function encodeV2Frame(obj) {
  const json = Buffer.from(JSON.stringify(obj), "utf8");
  const header = Buffer.allocUnsafe(4);
  header.writeUInt32BE(json.length, 0);
  return Buffer.concat([header, json]);
}

function sendV2(socket, obj) {
  socket.write(encodeV2Frame(obj));
}

async function updateWorkerSnapshot(prisma, input) {
  const { userId, workerName, hashrate, status } = input;
  const lastShare = new Date();

  await prisma.minerWorker.upsert({
    where: {
      userId_name: {
        userId,
        name: workerName,
      },
    },
    update: {
      hashrate,
      status,
      lastShare,
    },
    create: {
      userId,
      name: workerName,
      hashrate,
      status,
      lastShare,
      rejectRate: 0,
    },
  });

  const activeWorkers = await prisma.minerWorker.findMany({
    where: {
      userId,
      status: { in: ["online", "warning"] },
    },
    select: {
      hashrate: true,
    },
  });
  const totalHashrate = activeWorkers.reduce((sum, worker) => sum + Number(worker.hashrate), 0);

  await prisma.minerProfile.updateMany({
    where: { userId },
    data: { totalHashrate },
  });
}

async function syncTelemetry(payload) {
  await Promise.allSettled([
    postBackendEvent("/api/mining/hashrate", payload),
    postBackendEvent("/api/mining/workers", payload),
    postBackendEvent("/api/mining/uptime", payload),
  ]);
}

async function distributeAcceptedKaspaBlock(input) {
  const blockHash = String(input?.blockHash || "").trim();
  const height = Number(input?.height);
  const grossReward = Number(input?.grossReward);
  const foundAt = input?.foundAt || new Date().toISOString();

  if (!blockHash || !Number.isInteger(height) || height < 0 || !Number.isFinite(grossReward) || grossReward <= 0) {
    logger.warn("kaspa_block_distribution_skipped_invalid_payload", {
      blockHash,
      height: input?.height,
      grossReward: input?.grossReward,
    });
    return { ok: false, skipped: true };
  }

  logger.info("kaspa_block_found", { blockHash, height, grossReward, foundAt });
  logger.info("kaspa_block_accepted", { blockHash, height });
  logger.info("kaspa_pplns_distribution_started", { blockHash, height });

  const response = await postBackendEvent("/api/admin/mining/distribute-block", {
    blockHash,
    height,
    grossReward,
    foundAt,
    acceptedByKaspaNode: true,
    rewardSource: "kaspa_node",
  });

  if (response?.ok) {
    logger.info("kaspa_pplns_distribution_completed", {
      blockHash,
      height,
      result: response.body,
    });
  } else {
    logger.error("kaspa_pplns_distribution_failed", {
      blockHash,
      height,
      status: response?.status,
      response: response?.body,
      error: response?.error,
    });
  }

  return response;
}

async function isAllowedRate(redis, keyBase) {
  const key = `stratum:rate:${keyBase}`;
  const current = await redis.incr(key);
  if (current === 1) await redis.expire(key, 1);
  return current <= RATE_LIMIT_PER_SECOND;
}

async function startGateway() {
  logger.info("stratum_kaspa_rpc_config_loaded", {
    network: kaspaRpcConfig.network,
    hasRpcUrl: Boolean(kaspaRpcConfig.rpcUrl),
    hasPoolAddress: Boolean(kaspaRpcConfig.poolAddress),
  });

  const prisma = new PrismaClient();
  const redis = getRedis();

  const sessions = new Map();
  const jobs = new Map();

  function createSession(socket, protocol) {
    const state = {
      id: crypto.randomUUID(),
      protocol,
      socket,
      authorized: false,
      userId: null,
      minerId: null,
      workerName: null,
      channelId: null,
      channelSecret: crypto.randomBytes(16).toString("hex"),
      difficulty: DEFAULT_DIFFICULTY,
      extranonce1: crypto.randomBytes(4).toString("hex"),
      extranonce2Size: 8,
      subscriptionId: crypto.randomUUID(),
      connectedAt: Date.now(),
      acceptedWindow: 0,
      rejectedWindow: 0,
      lastAdjustAt: Date.now(),
      lastSeen: Date.now(),
      remoteAddress: socket.remoteAddress || "unknown",
      buffer: "",
      v2Buffer: Buffer.alloc(0),
    };

    sessions.set(socket, state);
    return state;
  }

  function removeSession(socket) {
    sessions.delete(socket);
  }

  async function buildJobForSession(session) {
    const templateResult = await buildTemplateForSession(session);
    const template = templateResult.template;
    const jobId = crypto.randomBytes(8).toString("hex");
    const targetHex = difficultyToTargetHex(session.difficulty);
    const entry = {
      jobId,
      templateId: templateResult.kaspaTemplate?.templateId || null,
      userId: session.userId,
      minerId: session.minerId,
      workerName: session.workerName,
      protocol: session.protocol,
      difficulty: session.difficulty,
      targetHex,
      blockTargetHex: templateResult.blockTargetHex,
      template,
      kaspaTemplate: templateResult.kaspaTemplate,
      extranonce1: session.extranonce1,
      createdAt: Date.now(),
      expiresAt: Date.now() + JOB_TTL_MS,
    };
    jobs.set(jobId, entry);
    return entry;
  }

  async function issueJobToSession(session) {
    try {
      const job = await buildJobForSession(session);
      pushJobToSession(session, job);
      return job;
    } catch (error) {
      logger.error("stratum_job_issue_failed", {
        protocol: session.protocol,
        userId: session.userId,
        workerName: session.workerName,
        production: process.env.NODE_ENV === "production",
        error: String(error),
      });
      if (process.env.NODE_ENV === "production") {
        if (session.protocol === "v1") {
          respondV1(session.socket, null, null, [20, "kaspa_rpc_unavailable", null]);
        } else {
          sendV2(session.socket, { type: "error", code: "kaspa_rpc_unavailable" });
        }
      }
      return null;
    }
  }

  function pushJobToSession(session, job) {
    if (session.protocol === "v1") {
      notifyV1(session.socket, "mining.set_difficulty", [session.difficulty]);
      notifyV1(session.socket, "mining.notify", [
        job.jobId,
        job.template.prevHash,
        "coinb1",
        "coinb2",
        [],
        job.template.version,
        job.template.nbits,
        job.template.ntime,
        true,
      ]);
      return;
    }

    sendV2(session.socket, {
      type: "new_job",
      channelId: session.channelId,
      jobId: job.jobId,
      prevHash: job.template.prevHash,
      merkleRoot: job.template.merkleRoot,
      version: job.template.version,
      nbits: job.template.nbits,
      ntime: job.template.ntime,
      targetHex: job.targetHex,
      difficulty: session.difficulty,
      versionRollingMask: VERSION_ROLLING_MASK,
      headerOnly: true,
      cleanJobs: true,
    });
  }

  function adjustDifficultyIfNeeded(session) {
    const now = Date.now();
    if (now - session.lastAdjustAt < 30000) return;

    const total = session.acceptedWindow + session.rejectedWindow;
    if (total > 30) {
      session.difficulty = Math.min(1_000_000_000, session.difficulty * 1.2);
    } else if (total > 0 && total < 8) {
      session.difficulty = Math.max(1, session.difficulty * 0.85);
    }

    session.acceptedWindow = 0;
    session.rejectedWindow = 0;
    session.lastAdjustAt = now;
  }

  async function authorizeMiner({ username, password, remoteAddress }) {
    const parsed = parseUsername(username);
    if (!parsed) return { ok: false, code: 24, error: "Username must be userId.workerName" };

    const user = await prisma.user.findUnique({
      where: { id: parsed.userId },
      select: { id: true },
    });

    if (!user) return { ok: false, code: 25, error: "User not found" };

    if (password && password !== "x") {
      const decoded = verifyToken(password);
      if (!decoded || decoded.userId !== parsed.userId) {
        return { ok: false, code: 26, error: "Invalid token" };
      }
    }

    const miner = await prisma.miner.upsert({
      where: { userId_poolWorkerName: { userId: parsed.userId, poolWorkerName: parsed.workerName } },
      create: {
        userId: parsed.userId,
        minerName: parsed.workerName,
        minerAddress: remoteAddress,
        poolWorkerName: parsed.workerName,
        difficulty: DEFAULT_DIFFICULTY,
        isActive: true,
      },
      update: {
        minerAddress: remoteAddress,
        isActive: true,
        lastSeen: new Date(),
      },
    });

    await updateWorkerSnapshot(prisma, {
      userId: parsed.userId,
      workerName: parsed.workerName,
      hashrate: 0,
      status: "online",
    });

    return {
      ok: true,
      userId: parsed.userId,
      workerName: parsed.workerName,
      minerId: miner.id,
      difficulty: Number(miner.difficulty || DEFAULT_DIFFICULTY),
    };
  }

  async function validateAndProcessShare(session, submit) {
    const startedAt = Date.now();

    if (!session.authorized || !session.userId || !session.minerId || !session.workerName) {
      return { ok: false, reason: "not_authorized" };
    }

    const nonce = normalizeNonce(submit.nonce);
    if (!/^[0-9a-f]{8,64}$/i.test(nonce)) {
      return { ok: false, reason: "invalid_nonce" };
    }

    const jobId = String(submit.jobId || "").trim();
    if (!/^[0-9a-f]{8,64}$/i.test(jobId)) {
      return { ok: false, reason: "invalid_job_id" };
    }

    const extranonce2 = String(submit.extranonce2 || "").trim().toLowerCase();
    if (extranonce2 && !/^[0-9a-f]{1,64}$/i.test(extranonce2)) {
      return { ok: false, reason: "invalid_extranonce2" };
    }

    const submittedTime = String(submit.ntime || "").trim().toLowerCase();
    if (submittedTime && !/^[0-9a-f]{8}$/i.test(submittedTime)) {
      return { ok: false, reason: "invalid_ntime" };
    }

    const submittedVersion = String(submit.version || "").trim().toLowerCase();
    if (submittedVersion && !/^[0-9a-f]{1,16}$/i.test(submittedVersion)) {
      return { ok: false, reason: "invalid_version" };
    }

    if (!jobs.has(jobId)) {
      return { ok: false, reason: "job_not_found" };
    }

    const job = jobs.get(jobId);
    if (Date.now() > job.expiresAt) {
      return { ok: false, reason: "stale_job" };
    }

    if (job.userId !== session.userId || job.minerId !== session.minerId) {
      return { ok: false, reason: "job_owner_mismatch" };
    }

    const replayKey = `stratum:nonce:${job.jobId}:${nonce}`;
    const replayClaim = await redis.set(replayKey, "1", "EX", 300, "NX");
    if (!replayClaim) {
      return { ok: false, reason: "duplicate_nonce" };
    }

    const material = buildShareMaterial(job, {
      extranonce2,
      ntime: submittedTime || job.template.ntime,
      nonce,
      version: submittedVersion || job.template.version,
    });

    const hashHex = doubleSha256Hex(material);
    const hashInt = BigInt(`0x${hashHex}`);
    const targetInt = BigInt(`0x${job.targetHex}`);
    if (hashInt > targetInt) {
      return { ok: false, reason: "low_difficulty_share" };
    }

    const achievedDifficulty = Number((MAX_TARGET * BigInt(1000)) / hashInt) / 1000;

    const blockTargetInt = job.blockTargetHex ? BigInt(`0x${job.blockTargetHex}`) : null;
    const isBlockCandidate = Boolean(job.kaspaTemplate && blockTargetInt !== null && hashInt <= blockTargetInt);
    let blockAccepted = false;

    if (isBlockCandidate) {
      const candidateBlock = buildKaspaBlockCandidate(job.kaspaTemplate, { nonce });
      try {
        const submitResult = await kaspaRpc.submitBlock(candidateBlock);
        blockAccepted = submitResult.accepted;

        logger.info("kaspa_block_candidate_submitted", {
          jobId: job.jobId,
          userId: session.userId,
          workerName: session.workerName,
          accepted: blockAccepted,
          rejectionReason: submitResult.rejectionReason,
        });

        if (blockAccepted) {
          await distributeAcceptedKaspaBlock({
            blockHash: hashHex,
            height: job.kaspaTemplate.height,
            grossReward: job.kaspaTemplate.grossReward,
            foundAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        logger.error("kaspa_block_submit_failed", {
          jobId: job.jobId,
          userId: session.userId,
          workerName: session.workerName,
          error: String(error),
        });
        return { ok: false, reason: "block_submit_failed" };
      }
    }

    await publishShare({
      minerId: session.minerId,
      userId: session.userId,
      nonce,
      difficulty: job.difficulty,
      accepted: true,
      reward: 0,
      submittedAt: new Date().toISOString(),
      sourceIp: session.remoteAddress,
      source: session.protocol === "v1" ? "stratum_v1" : "stratum_v2",
      jobId: job.jobId,
      workerName: session.workerName,
      achievedDifficulty,
      blockCandidate: isBlockCandidate,
      blockAccepted,
    });

    await publishRedis("mining:shares:ingested", {
      minerId: session.minerId,
      userId: session.userId,
      workerName: session.workerName,
      difficulty: job.difficulty,
      protocol: session.protocol,
      at: Date.now(),
    });

    await updateWorkerSnapshot(prisma, {
      userId: session.userId,
      workerName: session.workerName,
      hashrate: Math.max(1, Math.round(job.difficulty / 32)),
      status: "online",
    });

    await syncTelemetry({
      userId: session.userId,
      workerName: session.workerName,
      minerId: session.minerId,
      protocol: session.protocol,
      event: "share_accepted",
      difficulty: job.difficulty,
      achievedDifficulty,
      hashrate: Math.max(1, Math.round(job.difficulty / 32)),
      at: Date.now(),
    });

    session.acceptedWindow += 1;
    adjustDifficultyIfNeeded(session);

    void incCounter("share_accepted", { source: session.protocol === "v1" ? "stratum_v1" : "stratum_v2" });
    void recordLatency("stratum_submit_share", Date.now() - startedAt);

    return { ok: true, achievedDifficulty, requiredDifficulty: job.difficulty, hashHex };
  }

  async function broadcastJobs() {
    for (const session of sessions.values()) {
      if (!session.authorized) continue;
      await issueJobToSession(session);
    }

    const now = Date.now();
    for (const [jobId, job] of jobs.entries()) {
      if (job.expiresAt < now) jobs.delete(jobId);
    }
  }

  const v1Server = net.createServer();
  const v2Server = net.createServer();

  v1Server.on("connection", (socket) => {
    socket.setNoDelay(true);
    socket.setKeepAlive(true, 15000);
    socket.setTimeout(AUTH_TIMEOUT_MS);

    const session = createSession(socket, "v1");
    void incCounter("connection_opened", { source: "stratum_v1" });

    socket.on("timeout", () => {
      if (!session.authorized) socket.end();
    });

    socket.on("data", async (chunk) => {
      session.buffer += chunk.toString("utf8");
      const frames = session.buffer.split("\n");
      session.buffer = frames.pop() || "";

      for (const frame of frames) {
        const raw = frame.trim();
        if (!raw) continue;

        let msg = null;
        try {
          msg = JSON.parse(raw);
        } catch {
          respondV1(socket, null, null, [20, "invalid_json", null]);
          continue;
        }

        const id = msg.id ?? null;
        const method = String(msg.method || "");
        const params = msg.params || [];

        if (method === "mining.subscribe") {
          respondV1(socket, id, [[[
            "mining.set_difficulty",
            session.subscriptionId,
          ], ["mining.notify", session.subscriptionId]], session.extranonce1, session.extranonce2Size]);
          continue;
        }

        if (method === "mining.authorize") {
          const username = String(params[0] || "");
          const password = String(params[1] || "x");
          const auth = await authorizeMiner({ username, password, remoteAddress: session.remoteAddress });
          if (!auth.ok) {
            respondV1(socket, id, false, [auth.code, auth.error, null]);
            continue;
          }

          session.authorized = true;
          session.userId = auth.userId;
          session.minerId = auth.minerId;
          session.workerName = auth.workerName;
          session.difficulty = auth.difficulty;

          respondV1(socket, id, true);
          notifyV1(socket, "mining.set_difficulty", [session.difficulty]);
          await issueJobToSession(session);

          await syncTelemetry({
            userId: session.userId,
            workerName: session.workerName,
            minerId: session.minerId,
            protocol: "v1",
            event: "connect",
            hashrate: 0,
            at: Date.now(),
          });
          await postBackendEvent("/api/mining/connections", {
            source: "stratum_v1",
            eventType: "connect",
            sourceIp: session.remoteAddress,
            country: "UNKNOWN",
            userId: session.userId,
            workerName: session.workerName,
            at: Date.now(),
          });
          continue;
        }

        if (method === "mining.submit") {
          const [username, jobId, extranonce2, ntime, nonce] = Array.isArray(params) ? params : [];
          if (!session.authorized || String(username || "") !== `${session.userId}.${session.workerName}`) {
            void incCounter("share_rejected", { source: "stratum_v1", reason: "not_authorized" });
            respondV1(socket, id, false, [26, "not_authorized", null]);
            continue;
          }

          const allowed = await isAllowedRate(redis, session.minerId || session.id);
          if (!allowed) {
            session.rejectedWindow += 1;
            void incCounter("share_rejected", { source: "stratum_v1", reason: "rate_limited" });
            respondV1(socket, id, false, [28, "rate_limited", null]);
            continue;
          }

          const result = await validateAndProcessShare(session, {
            jobId: String(jobId || ""),
            extranonce2: String(extranonce2 || ""),
            ntime: String(ntime || ""),
            nonce: String(nonce || ""),
            version: null,
          });

          if (!result.ok) {
            session.rejectedWindow += 1;
            adjustDifficultyIfNeeded(session);
            await syncTelemetry({
              userId: session.userId,
              workerName: session.workerName,
              minerId: session.minerId,
              protocol: "v1",
              event: "share_rejected",
              reason: result.reason,
              at: Date.now(),
            });
            void incCounter("share_rejected", { source: "stratum_v1", reason: result.reason });
            respondV1(socket, id, false, [27, result.reason, null]);
            continue;
          }

          respondV1(socket, id, true);
          continue;
        }

        if (method === "mining.ping" || method === "mining.keepalive") {
          respondV1(socket, id, true);
          continue;
        }

        respondV1(socket, id, null, [21, "unsupported_method", null]);
      }
    });

    socket.on("close", async () => {
      removeSession(socket);
      void incCounter("connection_closed", { source: "stratum_v1" });
      if (session.authorized && session.userId && session.workerName) {
        await updateWorkerSnapshot(prisma, {
          userId: session.userId,
          workerName: session.workerName,
          hashrate: 0,
          status: "offline",
        });
        await syncTelemetry({
          userId: session.userId,
          workerName: session.workerName,
          minerId: session.minerId,
          protocol: "v1",
          event: "disconnect",
          hashrate: 0,
          at: Date.now(),
        });
      }
    });

    socket.on("error", () => removeSession(socket));

    socket.write(`${JSON.stringify({ method: "mining.hello", params: ["SUPERNOVA Stratum V1", process.pid] })}\n`);
  });

  v2Server.on("connection", (socket) => {
    socket.setNoDelay(true);
    socket.setKeepAlive(true, 15000);
    socket.setTimeout(AUTH_TIMEOUT_MS);

    const session = createSession(socket, "v2");
    session.channelId = crypto.randomBytes(8).toString("hex");
    void incCounter("connection_opened", { source: "stratum_v2" });

    socket.on("timeout", () => {
      if (!session.authorized) socket.end();
    });

    socket.on("data", async (chunk) => {
      session.v2Buffer = Buffer.concat([session.v2Buffer, chunk]);

      while (session.v2Buffer.length >= 4) {
        const frameLength = session.v2Buffer.readUInt32BE(0);
        if (session.v2Buffer.length < 4 + frameLength) break;

        const frameBody = session.v2Buffer.subarray(4, 4 + frameLength);
        session.v2Buffer = session.v2Buffer.subarray(4 + frameLength);

        let msg = null;
        try {
          msg = JSON.parse(frameBody.toString("utf8"));
        } catch {
          sendV2(socket, { type: "error", code: "invalid_frame" });
          continue;
        }

        const type = String(msg.type || "");

        if (type === "setup_connection" || type === "open_channel") {
          const username = String(msg.username || msg.miner || "");
          const password = String(msg.password || "x");
          const auth = await authorizeMiner({ username, password, remoteAddress: session.remoteAddress });
          if (!auth.ok) {
            sendV2(socket, { type: "error", code: "auth_failed", detail: auth.error });
            continue;
          }

          session.authorized = true;
          session.userId = auth.userId;
          session.minerId = auth.minerId;
          session.workerName = auth.workerName;
          session.difficulty = auth.difficulty;

          sendV2(socket, {
            type: "setup_success",
            channelId: session.channelId,
            channelSecret: session.channelSecret,
            extranoncePrefix: session.extranonce1,
            difficulty: session.difficulty,
            targetHex: difficultyToTargetHex(session.difficulty),
            versionRollingMask: VERSION_ROLLING_MASK,
          });

          await issueJobToSession(session);

          await syncTelemetry({
            userId: session.userId,
            workerName: session.workerName,
            minerId: session.minerId,
            protocol: "v2",
            event: "connect",
            hashrate: 0,
            at: Date.now(),
          });
          await postBackendEvent("/api/mining/connections", {
            source: "stratum_v2",
            eventType: "connect",
            sourceIp: session.remoteAddress,
            country: "UNKNOWN",
            userId: session.userId,
            workerName: session.workerName,
            at: Date.now(),
          });

          continue;
        }

        if (type === "submit_share") {
          if (!session.authorized) {
            sendV2(socket, { type: "submit_result", ok: false, reason: "not_authorized" });
            continue;
          }

          if (String(msg.channelId || "") !== String(session.channelId || "")) {
            sendV2(socket, { type: "submit_result", ok: false, reason: "channel_mismatch" });
            continue;
          }

          if (String(msg.channelSecret || "") !== String(session.channelSecret || "")) {
            sendV2(socket, { type: "submit_result", ok: false, reason: "hijack_protection_failed" });
            continue;
          }

          const allowed = await isAllowedRate(redis, session.minerId || session.id);
          if (!allowed) {
            session.rejectedWindow += 1;
            sendV2(socket, { type: "submit_result", ok: false, reason: "rate_limited" });
            void incCounter("share_rejected", { source: "stratum_v2", reason: "rate_limited" });
            continue;
          }

          const result = await validateAndProcessShare(session, {
            jobId: String(msg.jobId || ""),
            extranonce2: String(msg.extranonce2 || ""),
            ntime: String(msg.ntime || ""),
            nonce: String(msg.nonce || ""),
            version: String(msg.version || ""),
          });

          if (!result.ok) {
            session.rejectedWindow += 1;
            adjustDifficultyIfNeeded(session);
            await syncTelemetry({
              userId: session.userId,
              workerName: session.workerName,
              minerId: session.minerId,
              protocol: "v2",
              event: "share_rejected",
              reason: result.reason,
              at: Date.now(),
            });
            void incCounter("share_rejected", { source: "stratum_v2", reason: result.reason });
            sendV2(socket, { type: "submit_result", ok: false, reason: result.reason });
            continue;
          }

          sendV2(socket, {
            type: "submit_result",
            ok: true,
            achievedDifficulty: result.achievedDifficulty,
            requiredDifficulty: result.requiredDifficulty,
          });
          continue;
        }

        if (type === "ping") {
          sendV2(socket, { type: "pong", ts: Date.now() });
          continue;
        }

        sendV2(socket, { type: "error", code: "unsupported_message", messageType: type });
      }
    });

    socket.on("close", async () => {
      removeSession(socket);
      void incCounter("connection_closed", { source: "stratum_v2" });
      if (session.authorized && session.userId && session.workerName) {
        await updateWorkerSnapshot(prisma, {
          userId: session.userId,
          workerName: session.workerName,
          hashrate: 0,
          status: "offline",
        });
        await syncTelemetry({
          userId: session.userId,
          workerName: session.workerName,
          minerId: session.minerId,
          protocol: "v2",
          event: "disconnect",
          hashrate: 0,
          at: Date.now(),
        });
      }
    });

    socket.on("error", () => removeSession(socket));

    sendV2(socket, { type: "hello", server: "SUPERNOVA Stratum V2", pid: process.pid });
  });

  const dispatcher = setInterval(() => {
    void broadcastJobs();
  }, JOB_INTERVAL_MS);

  v1Server.listen(V1_PORT, HOST, () => {
    logger.info("stratum_v1_listening", { host: HOST, port: V1_PORT, pid: process.pid });
  });

  v2Server.listen(V2_PORT, HOST, () => {
    logger.info("stratum_v2_listening", { host: HOST, port: V2_PORT, pid: process.pid });
  });

  const shutdown = async () => {
    clearInterval(dispatcher);

    for (const session of sessions.values()) {
      session.socket.destroy();
    }

    await new Promise((resolve) => v1Server.close(() => resolve(undefined)));
    await new Promise((resolve) => v2Server.close(() => resolve(undefined)));

    await closeRabbit();
    await closeRedis();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
