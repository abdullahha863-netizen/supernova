export type PoolFeeSource = "metal_card" | "base";

export type PoolFeeStatus = {
  baseFee: number;
  discount: number;
  effectiveFee: number;
  source: PoolFeeSource;
};

export function publicMetalCardTier(value: string): string;
export function getBasePoolFeeForUserWithClient(prisma: any, userId: string): Promise<number>;
export function getMetalCardFeeDiscountForUserWithClient(prisma: any, userId: string): Promise<number>;
export function getEffectivePoolFeeForUserWithClient(prisma: any, userId: string): Promise<PoolFeeStatus>;
