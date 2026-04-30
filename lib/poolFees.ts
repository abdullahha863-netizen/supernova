import { prisma } from "@/lib/prisma";
import {
  getBasePoolFeeForUserWithClient,
  getEffectivePoolFeeForUserWithClient,
  getMetalCardFeeDiscountForUserWithClient,
} from "@/services/shared/pool-fees-core.mjs";

export type PoolFeeStatus = {
  // Fee values are percentage points, e.g. 4.0 means 4.0%.
  baseFee: number;
  discount: number;
  effectiveFee: number;
  source: "metal_card" | "base";
};

export async function getBasePoolFeeForUser(userId: string) {
  return getBasePoolFeeForUserWithClient(prisma, userId);
}

export async function getMetalCardFeeDiscountForUser(userId: string) {
  return getMetalCardFeeDiscountForUserWithClient(prisma, userId);
}

export async function getEffectivePoolFeeForUser(userId: string): Promise<PoolFeeStatus> {
  const status = await getEffectivePoolFeeForUserWithClient(prisma, userId);
  return status as PoolFeeStatus;
}
