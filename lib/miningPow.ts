import { createHash, randomBytes, randomUUID } from "crypto";
import type Redis from "ioredis";

export type PowJob = {
  jobId: string;
  userId: string;
  minerId: string;
  salt: string;
  difficulty: number;
  targetHex: string;
  createdAt: number;
  expiresAt: number;
};

type VerifyResult =
  | { ok: true; hashHex: string; achievedDifficulty: number; requiredDifficulty: number }
  | { ok: false; reason: string };

const JOB_KEY_PREFIX = "powjob:";
const NONCE_KEY_PREFIX = "pownonce:";
const TWO_POW_256 = BigInt(1) << BigInt(256);
const MAX_TARGET = TWO_POW_256 - BigInt(1);

function normalizeNonce(nonce: string) {
  return nonce.trim().toLowerCase();
}

function isValidNonceFormat(nonce: string) {
  return /^[0-9a-f]{8,64}$/i.test(nonce);
}

function difficultyToTargetHex(difficulty: number) {
  const normalized = Number.isFinite(difficulty) ? Math.max(1, difficulty) : 1;
  const scaledDifficulty = BigInt(Math.max(1000, Math.round(normalized * 1000)));
  const target = (MAX_TARGET * BigInt(1000)) / scaledDifficulty;
  return target.toString(16).padStart(64, "0");
}

function hashShareInput(job: PowJob, nonce: string) {
  const material = `${job.jobId}:${job.userId}:${job.minerId}:${job.salt}:${nonce}`;
  return createHash("sha256").update(material).digest("hex");
}

function achievedDifficultyFromHash(hashHex: string) {
  const hashInt = BigInt(`0x${hashHex}`);
  if (hashInt <= BigInt(0)) return Number.POSITIVE_INFINITY;
  const scaled = (MAX_TARGET * BigInt(1000)) / hashInt;
  return Number(scaled) / 1000;
}

export async function issuePowJob(
  redis: Redis,
  input: { userId: string; minerId: string; difficulty: number; ttlSec?: number }
) {
  const ttlSec = Math.max(20, Math.min(300, input.ttlSec ?? 90));
  const now = Date.now();
  const job: PowJob = {
    jobId: randomUUID().replace(/-/g, ""),
    userId: input.userId,
    minerId: input.minerId,
    salt: randomBytes(16).toString("hex"),
    difficulty: Math.max(1, input.difficulty || 1),
    targetHex: difficultyToTargetHex(input.difficulty || 1),
    createdAt: now,
    expiresAt: now + ttlSec * 1000,
  };

  await redis.set(`${JOB_KEY_PREFIX}${job.jobId}`, JSON.stringify(job), "EX", ttlSec);
  return job;
}

export async function loadPowJob(redis: Redis, jobId: string) {
  const raw = await redis.get(`${JOB_KEY_PREFIX}${jobId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PowJob;
  } catch {
    return null;
  }
}

export async function verifyPowShare(
  redis: Redis,
  input: { userId: string; minerId: string; jobId: string; nonce: string }
): Promise<VerifyResult> {
  const nonce = normalizeNonce(input.nonce);
  if (!isValidNonceFormat(nonce)) {
    return { ok: false, reason: "invalid_nonce_format" };
  }

  const job = await loadPowJob(redis, input.jobId);
  if (!job) {
    return { ok: false, reason: "job_not_found_or_expired" };
  }

  if (job.userId !== input.userId || job.minerId !== input.minerId) {
    return { ok: false, reason: "job_owner_mismatch" };
  }

  if (Date.now() > job.expiresAt) {
    return { ok: false, reason: "stale_job" };
  }

  const nonceKey = `${NONCE_KEY_PREFIX}${job.jobId}:${nonce}`;
  const claimed = await redis.set(nonceKey, "1", "EX", 300, "NX");
  if (!claimed) {
    return { ok: false, reason: "duplicate_nonce" };
  }

  const hashHex = hashShareInput(job, nonce);
  const hashInt = BigInt(`0x${hashHex}`);
  const targetInt = BigInt(`0x${job.targetHex}`);

  if (hashInt > targetInt) {
    return { ok: false, reason: "low_difficulty_share" };
  }

  return {
    ok: true,
    hashHex,
    achievedDifficulty: achievedDifficultyFromHash(hashHex),
    requiredDifficulty: job.difficulty,
  };
}
