import type { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";
import { calculateNetMiningRewardWithClient } from "@/services/shared/reward-core.mjs";

export type CalculateNetMiningRewardInput = {
  userId: string;
  grossReward: number | string | Decimal;
};

export type NetMiningRewardResult = {
  userId: string;
  grossReward: number;
  baseFee: number;
  metalCardDiscount: number;
  effectiveFee: number;
  poolFeeAmount: number;
  netReward: number;
  feeSource: "metal_card" | "base";
};

export async function calculateNetMiningReward(
  input: CalculateNetMiningRewardInput,
): Promise<NetMiningRewardResult> {
  // Shared JS-safe core keeps fee math identical for Next routes and standalone workers.
  const result = await calculateNetMiningRewardWithClient(prisma, input);
  return result as NetMiningRewardResult;
}
