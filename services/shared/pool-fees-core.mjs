const FALLBACK_BASE_POOL_FEE = 4.0;
const PLAN_FEE_BY_NAME = {
  Starter: FALLBACK_BASE_POOL_FEE,
  Silver: 3.2,
  "Hash Pro": 2.4,
  "Titan Elite": 1.3,
};
const METAL_CARD_DISCOUNT_BY_TIER = {
  Silver: 0.5,
  "Hash Pro": 1.5,
  "Titan Elite": 2.8,
};

export function publicMetalCardTier(value) {
  if (value === "Hash_Pro") return "Hash Pro";
  if (value === "Titan_Elite") return "Titan Elite";
  return value;
}

function roundFee(value) {
  return Number(value.toFixed(2));
}

export async function getBasePoolFeeForUserWithClient(prisma, userId) {
  const profile = await prisma.minerProfile.findUnique({
    where: { userId },
    select: { plan: true },
  });

  if (!profile) {
    return FALLBACK_BASE_POOL_FEE;
  }

  const fee = PLAN_FEE_BY_NAME[profile.plan];
  if (fee === undefined) {
    console.warn("[poolFees] Unknown miner plan, using fallback fee", { userId, plan: profile.plan });
    return FALLBACK_BASE_POOL_FEE;
  }

  return fee;
}

export async function getMetalCardFeeDiscountForUserWithClient(prisma, userId) {
  const card = await prisma.memberCard.findFirst({
    where: {
      userId,
      status: "activated",
      revokedAt: null,
    },
    orderBy: { activatedAt: "desc" },
    select: { tier: true },
  });

  const tier = card ? publicMetalCardTier(card.tier) : null;
  return tier ? METAL_CARD_DISCOUNT_BY_TIER[tier] ?? 0 : 0;
}

export async function getEffectivePoolFeeForUserWithClient(prisma, userId) {
  const [baseFee, discount] = await Promise.all([
    getBasePoolFeeForUserWithClient(prisma, userId),
    getMetalCardFeeDiscountForUserWithClient(prisma, userId),
  ]);
  const effectiveFee = Math.max(baseFee - discount, 0);

  return {
    baseFee: roundFee(baseFee),
    discount: roundFee(discount),
    effectiveFee: roundFee(effectiveFee),
    source: discount > 0 ? "metal_card" : "base",
  };
}
