import type { Decimal } from "@prisma/client/runtime/library";

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

export function calculateNetMiningRewardWithClient(
  prisma: any,
  input: { userId: string; grossReward: number | string | Decimal },
): Promise<NetMiningRewardResult>;

export function accrueMiningRewardWithClient(
  prisma: any,
  input: { userId: string; grossReward: number | string | Decimal; shareId?: string; source?: string },
): Promise<NetMiningRewardResult>;
