import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

type PlanName = "Starter" | "Silver" | "Hash Pro" | "Titan Elite";

const BASE_RENEWAL_PRICE: Record<PlanName, number> = {
  Starter: 0,
  Silver: 49,
  "Hash Pro": 99,
  "Titan Elite": 199,
};

function normalizePlan(value: string | null | undefined): PlanName {
  if (value === "Starter" || value === "Silver" || value === "Hash Pro" || value === "Titan Elite") {
    return value;
  }
  return "Starter";
}

function hashSignal(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  return createHash("sha256").update(normalized).digest("hex");
}

async function getUserPlan(userId: string): Promise<PlanName> {
  const profile = await prisma.minerProfile.findUnique({
    where: { userId },
    select: { plan: true },
  });
  return normalizePlan(profile?.plan);
}

function getRewardForPlan(plan: PlanName, qualifiedCount: number) {
  if (plan === "Starter") {
    if (qualifiedCount >= 7) return { type: "starter_silver_3m", amount: 0 };
    if (qualifiedCount >= 5) return { type: "starter_silver_1m", amount: 0 };
    return null;
  }

  if (qualifiedCount >= 3) return { type: "renewal_discount_3pct", amount: 3 };
  return null;
}

export async function recordReferralAudit(input: {
  referrerId: string;
  referredUserId: string;
  ip: string | null | undefined;
  userAgent: string | null | undefined;
}) {
  const ipHash = hashSignal(input.ip);
  const uaHash = hashSignal(input.userAgent);

  await prisma.referralAudit.upsert({
    where: { referredUserId: input.referredUserId },
    update: {
      referrerId: input.referrerId,
      ipHash,
      uaHash,
    },
    create: {
      referrerId: input.referrerId,
      referredUserId: input.referredUserId,
      ipHash,
      uaHash,
    },
  });
}

async function findSuspiciousReferredUserIds(userId: string) {
  const rows = await prisma.referralAudit.findMany({
    where: { referrerId: userId },
    select: {
      referredUserId: true,
      ipHash: true,
      uaHash: true,
    },
  });

  const ipCounts = new Map<string, number>();
  const uaCounts = new Map<string, number>();

  for (const row of rows) {
    if (row.ipHash) ipCounts.set(row.ipHash, (ipCounts.get(row.ipHash) ?? 0) + 1);
    if (row.uaHash) uaCounts.set(row.uaHash, (uaCounts.get(row.uaHash) ?? 0) + 1);
  }

  const suspiciousIds = new Set<string>();
  for (const row of rows) {
    const duplicateIp = row.ipHash ? (ipCounts.get(row.ipHash) ?? 0) > 1 : false;
    const duplicateUa = row.uaHash ? (uaCounts.get(row.uaHash) ?? 0) > 1 : false;
    if (duplicateIp || duplicateUa) {
      suspiciousIds.add(row.referredUserId);
    }
  }

  return [...suspiciousIds];
}

export async function autoUpdateReferralEligibility(userId: string) {
  const suspiciousIds = await findSuspiciousReferredUserIds(userId);
  if (suspiciousIds.length) {
    await prisma.referral.updateMany({
      where: {
        referrerId: userId,
        referredUserId: { in: suspiciousIds },
      },
      data: {
        status: "rejected",
        rewardStatus: "blocked",
        rewardType: "fraud_duplicate_signal",
        rewardAmount: 0,
      },
    });
  }

  const referrals = await prisma.referral.findMany({
    where: { referrerId: userId },
    select: {
      id: true,
      status: true,
      rewardStatus: true,
      referred: {
        select: {
          emailVerified: true,
          createdAt: true,
        },
      },
    },
  }) as Array<{
    id: string;
    status: string;
    rewardStatus: string;
    referred: { emailVerified: Date | null; createdAt: Date };
  }>;

  const now = Date.now();
  const holdMs = 14 * 24 * 60 * 60 * 1000;

  for (const item of referrals) {
    if (item.status === "rejected" || item.status === "approved") continue;
    if (item.rewardStatus === "blocked") continue;

    const verified = Boolean(item.referred?.emailVerified);
    const oldEnough = now - new Date(item.referred?.createdAt || 0).getTime() >= holdMs;
    const nextStatus = verified && oldEnough ? "qualified" : "pending";

    if (nextStatus !== item.status) {
      await prisma.referral.update({
        where: { id: item.id },
        data: { status: nextStatus },
      });
    }
  }

  const plan = await getUserPlan(userId);
  const qualifiedCount = await prisma.referral.count({
    where: {
      referrerId: userId,
      status: "qualified",
      rewardStatus: { not: "blocked" },
    },
  });

  const reward = getRewardForPlan(plan, qualifiedCount);
  if (reward) {
    await prisma.referral.updateMany({
      where: {
        referrerId: userId,
        status: "qualified",
        rewardStatus: { not: "blocked" },
      },
      data: {
        rewardStatus: "approved",
        rewardType: reward.type,
        rewardAmount: reward.amount,
      },
    });
  } else {
    await prisma.referral.updateMany({
      where: {
        referrerId: userId,
        status: "qualified",
        rewardStatus: { not: "blocked" },
      },
      data: {
        rewardStatus: "pending",
        rewardType: null,
        rewardAmount: 0,
      },
    });
  }
}

export async function getRenewalQuote(userId: string) {
  await autoUpdateReferralEligibility(userId);

  const plan = await getUserPlan(userId);
  const basePrice = BASE_RENEWAL_PRICE[plan];

  const approvedRenewalDiscounts = await prisma.referral.count({
    where: {
      referrerId: userId,
      status: { in: ["qualified", "approved"] },
      rewardStatus: "approved",
      rewardType: "renewal_discount_3pct",
    },
  });

  const discountPercent = approvedRenewalDiscounts > 0 ? 3 : 0;
  const discountAmount = Number(((basePrice * discountPercent) / 100).toFixed(2));
  const finalPrice = Number((basePrice - discountAmount).toFixed(2));

  return {
    plan,
    basePrice,
    discountPercent,
    discountAmount,
    finalPrice,
    approvedRenewalDiscounts,
  };
}

export async function applyRenewalDiscount(userId: string) {
  const quote = await getRenewalQuote(userId);
  if (quote.discountPercent <= 0) {
    return {
      ...quote,
      discountApplied: false,
    };
  }

  const reward = await prisma.referral.findFirst({
    where: {
      referrerId: userId,
      status: { in: ["qualified", "approved"] },
      rewardStatus: "approved",
      rewardType: "renewal_discount_3pct",
    },
    orderBy: { updatedAt: "asc" },
    select: { id: true },
  });

  if (reward?.id) {
    await prisma.referral.update({
      where: { id: reward.id },
      data: {
        status: "approved",
        rewardStatus: "paid",
      },
    });
  }

  return {
    ...quote,
    discountApplied: Boolean(reward?.id),
  };
}
