import { createHash } from "node:crypto";
import { Decimal } from "@prisma/client/runtime/library";

export type RewardSource = "block" | "pps" | "pplns" | "test";

export type RewardInput = {
  userId: string;
  shareId: string;
  grossReward: Decimal;
  source: RewardSource;
};

type ShareRewardCandidate = {
  userId: string;
  minerId: string;
  nonce: string;
  difficulty: number;
  submittedAt?: string | Date | null;
  grossReward?: number | string | Decimal | null;
  source?: string | null;
};

const TEST_REWARD_SOURCE_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.ENABLE_TEST_MINING_REWARDS === "true";

const TEST_GROSS_REWARD = process.env.TEST_MINING_GROSS_REWARD || "0.000001";

function normalizeRewardSource(value: string | null | undefined): RewardSource {
  if (value === "block" || value === "pps" || value === "pplns" || value === "test") {
    return value;
  }

  return "block";
}

function positiveDecimal(value: number | string | Decimal | null | undefined) {
  if (value === null || value === undefined) return null;

  const decimal = new Decimal(value);
  if (decimal.lte(0)) return null;

  return decimal;
}

export function buildDeterministicShareId(input: {
  userId: string;
  minerId: string;
  nonce: string;
  difficulty: number;
  submittedAt?: string | Date | null;
}) {
  const submittedAt = input.submittedAt ? new Date(input.submittedAt).toISOString() : "";
  const digest = createHash("sha256")
    .update([input.userId, input.minerId, input.nonce, input.difficulty, submittedAt].join(":"))
    .digest("hex");

  return `share_${digest.slice(0, 28)}`;
}

export function getRewardInputForShare(candidate: ShareRewardCandidate): RewardInput | null {
  const shareId = buildDeterministicShareId(candidate);
  const realGrossReward = positiveDecimal(candidate.grossReward);
  if (realGrossReward) {
    return {
      userId: candidate.userId,
      shareId,
      grossReward: realGrossReward,
      source: normalizeRewardSource(candidate.source),
    };
  }

  if (!TEST_REWARD_SOURCE_ENABLED) {
    return null;
  }

  const testGrossReward = positiveDecimal(TEST_GROSS_REWARD);
  if (!testGrossReward) {
    return null;
  }

  return {
    userId: candidate.userId,
    shareId,
    grossReward: testGrossReward,
    source: "test",
  };
}
