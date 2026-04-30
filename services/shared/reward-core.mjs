import { Decimal } from "@prisma/client/runtime/library";
import { getEffectivePoolFeeForUserWithClient } from "./pool-fees-core.mjs";

function assertPositiveReward(value) {
  if (value.lte(0)) {
    throw new Error("grossReward must be a positive number");
  }
}

export async function calculateNetMiningRewardWithClient(prisma, input) {
  const userId = String(input.userId || "").trim();
  if (!userId) {
    throw new Error("userId is required");
  }

  const grossRewardDecimal = new Decimal(input.grossReward);
  assertPositiveReward(grossRewardDecimal);

  const feeStatus = await getEffectivePoolFeeForUserWithClient(prisma, userId);
  const effectiveFeeDecimal = new Decimal(feeStatus.effectiveFee);
  const poolFeeAmountDecimal = grossRewardDecimal.mul(effectiveFeeDecimal).div(100);
  const netRewardDecimal = grossRewardDecimal.sub(poolFeeAmountDecimal);

  return {
    userId,
    grossReward: grossRewardDecimal.toNumber(),
    baseFee: feeStatus.baseFee,
    metalCardDiscount: feeStatus.discount,
    effectiveFee: feeStatus.effectiveFee,
    poolFeeAmount: poolFeeAmountDecimal.toNumber(),
    netReward: netRewardDecimal.toNumber(),
    feeSource: feeStatus.source,
  };
}

export async function accrueMiningRewardWithClient(prisma, input) {
  return calculateNetMiningRewardWithClient(prisma, input);
}
