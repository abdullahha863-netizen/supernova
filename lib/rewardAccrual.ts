import {
  calculateNetMiningReward,
  type NetMiningRewardResult,
} from "@/lib/rewardEngine";
import { accrueMiningRewardWithClient as accrueMiningRewardWithPrismaClient } from "@/services/shared/reward-core.mjs";
import type { Decimal } from "@prisma/client/runtime/library";
import type { RewardSource } from "@/lib/rewardSources";

export type AccrueMiningRewardInput = {
  userId: string;
  grossReward: number | string | Decimal;
  shareId?: string;
  source?: RewardSource;
};

export async function accrueMiningReward(
  input: AccrueMiningRewardInput,
): Promise<NetMiningRewardResult> {
  const calculatedReward = await calculateNetMiningReward({
    userId: input.userId,
    grossReward: input.grossReward,
  });

  return calculatedReward;
}

export async function accrueMiningRewardWithClient(
  prismaClient: unknown,
  input: AccrueMiningRewardInput,
): Promise<NetMiningRewardResult> {
  const calculatedReward = await accrueMiningRewardWithPrismaClient(prismaClient, input);
  return calculatedReward as NetMiningRewardResult;
}
