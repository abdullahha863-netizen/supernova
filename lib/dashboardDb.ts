import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { type ShippingProfile } from "@/lib/userProfiles";

export type PlanName = "Starter" | "Silver" | "Hash Pro" | "Titan Elite";

export const PLAN_RANK: Record<PlanName, number> = {
  Starter: 0,
  Silver: 1,
  "Hash Pro": 2,
  "Titan Elite": 3,
};

export function normalizeDashboardPlan(value: string | null | undefined): PlanName {
  if (value === "Starter" || value === "Silver" || value === "Hash Pro" || value === "Titan Elite") {
    return value;
  }
  return "Starter";
}

type OverviewRow = {
  plan: PlanName;
  payout_address: string | null;
  min_payout: number;
  payout_schedule: string;
  pending_balance: number;
  total_hashrate: number;
  reward_flow: number;
};

type WorkerRow = {
  id: number;
  name: string;
  description: string | null;
  hashrate: number;
  status: "online" | "offline" | "warning";
  last_share: Date;
  reject_rate: number;
  created_at: Date;
};

type PayoutRow = {
  id: number;
  payout_date: Date;
  amount: number;
  status: "paid" | "pending";
  tx: string;
};

export type MemberCardFulfillmentStatus = "queued" | "in_production" | "shipped" | "delivered";

type MemberCardFulfillmentRow = {
  id: number;
  checkout_intent_id: string;
  user_id: string;
  tier: PlanName;
  card_label: string;
  fulfillment_status: MemberCardFulfillmentStatus;
  payment_status: string | null;
  payment_provider: string | null;
  amount_usd: number | null;
  currency: string | null;
  purchase_date: Date | null;
  shipping_full_name: string;
  shipping_email: string;
  shipping_phone: string;
  shipping_line1: string;
  shipping_line2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  carrier: string;
  tracking_number: string;
  tracking_url: string;
  notes: string;
  estimated_delivery: Date | null;
  shipped_at: Date | null;
  delivered_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type CheckoutIntentForMemberCard = {
  status: string;
  provider: string;
  amountUsd: unknown;
  currency: string;
  createdAt: Date;
  fulfilledAt: Date | null;
};

type MemberCardFulfillmentRecord = {
  id: number;
  checkoutIntentId: string;
  userId: string;
  tier: string;
  cardLabel: string;
  fulfillmentStatus: string;
  shippingFullName: string;
  shippingEmail: string;
  shippingPhone: string;
  shippingLine1: string;
  shippingLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  notes: string;
  estimatedDelivery: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const DEFAULT_PLAN: PlanName = "Starter";

function isDashboardDemoSeedEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.ENABLE_DASHBOARD_DEMO_SEED === "true";
}

function toMemberCardFulfillmentRow(
  fulfillment: MemberCardFulfillmentRecord,
  checkoutIntent?: CheckoutIntentForMemberCard | null
): MemberCardFulfillmentRow {
  return {
    id: fulfillment.id,
    checkout_intent_id: fulfillment.checkoutIntentId,
    user_id: fulfillment.userId,
    tier: normalizeDashboardPlan(fulfillment.tier),
    card_label: fulfillment.cardLabel,
    fulfillment_status: fulfillment.fulfillmentStatus as MemberCardFulfillmentStatus,
    payment_status: checkoutIntent?.status ?? null,
    payment_provider: checkoutIntent?.provider ?? null,
    amount_usd: checkoutIntent ? Number(checkoutIntent.amountUsd) : null,
    currency: checkoutIntent?.currency ?? null,
    purchase_date: checkoutIntent ? checkoutIntent.fulfilledAt || checkoutIntent.createdAt : null,
    shipping_full_name: fulfillment.shippingFullName,
    shipping_email: fulfillment.shippingEmail,
    shipping_phone: fulfillment.shippingPhone,
    shipping_line1: fulfillment.shippingLine1,
    shipping_line2: fulfillment.shippingLine2,
    shipping_city: fulfillment.shippingCity,
    shipping_state: fulfillment.shippingState,
    shipping_postal_code: fulfillment.shippingPostalCode,
    shipping_country: fulfillment.shippingCountry,
    carrier: fulfillment.carrier,
    tracking_number: fulfillment.trackingNumber,
    tracking_url: fulfillment.trackingUrl,
    notes: fulfillment.notes,
    estimated_delivery: fulfillment.estimatedDelivery,
    shipped_at: fulfillment.shippedAt,
    delivered_at: fulfillment.deliveredAt,
    created_at: fulfillment.createdAt,
    updated_at: fulfillment.updatedAt,
  };
}

function getMemberCardLabel(plan: Exclude<PlanName, "Starter">) {
  if (plan === "Silver") return "Silver Metal Card";
  if (plan === "Hash Pro") return "Hash Pro Metal Card";
  return "Titan Elite Metal Card";
}

export async function queueMemberCardFulfillment(params: {
  checkoutIntentId: string;
  userId: string;
  plan: Exclude<PlanName, "Starter">;
  shippingProfile: ShippingProfile;
}) {
  const cardLabel = getMemberCardLabel(params.plan);
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { name: true, email: true },
  });

  await prisma.memberCardFulfillment.upsert({
    where: { checkoutIntentId: params.checkoutIntentId },
    update: {
      tier: params.plan,
      cardLabel,
      shippingFullName: params.shippingProfile.fullName || user?.name || "",
      shippingEmail: user?.email || "",
      shippingPhone: params.shippingProfile.phone,
      shippingLine1: params.shippingProfile.line1,
      shippingLine2: params.shippingProfile.line2,
      shippingCity: params.shippingProfile.city,
      shippingState: params.shippingProfile.state,
      shippingPostalCode: params.shippingProfile.postalCode,
      shippingCountry: params.shippingProfile.country,
      updatedAt: new Date(),
    },
    create: {
      checkoutIntentId: params.checkoutIntentId,
      userId: params.userId,
      tier: params.plan,
      cardLabel,
      fulfillmentStatus: "queued",
      shippingFullName: params.shippingProfile.fullName || user?.name || "",
      shippingEmail: user?.email || "",
      shippingPhone: params.shippingProfile.phone,
      shippingLine1: params.shippingProfile.line1,
      shippingLine2: params.shippingProfile.line2,
      shippingCity: params.shippingProfile.city,
      shippingState: params.shippingProfile.state,
      shippingPostalCode: params.shippingProfile.postalCode,
      shippingCountry: params.shippingProfile.country,
    },
  });
}

export async function listMemberCardFulfillments(limit = 100) {
  const rowLimit = Math.min(Math.max(Math.trunc(limit), 1), 250);
  const fulfillments = await prisma.memberCardFulfillment.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: rowLimit,
  });
  const checkoutIntentIds = fulfillments.map((fulfillment) => fulfillment.checkoutIntentId);
  const checkoutIntents = await prisma.checkoutIntent.findMany({
    where: { id: { in: checkoutIntentIds } },
    select: {
      id: true,
      status: true,
      provider: true,
      amountUsd: true,
      currency: true,
      createdAt: true,
      fulfilledAt: true,
    },
  });
  const checkoutIntentById = new Map(checkoutIntents.map((intent) => [intent.id, intent]));

  return fulfillments.map((fulfillment) =>
    toMemberCardFulfillmentRow(fulfillment, checkoutIntentById.get(fulfillment.checkoutIntentId))
  );
}

export async function updateMemberCardFulfillment(params: {
  checkoutIntentId: string;
  fulfillmentStatus: MemberCardFulfillmentStatus;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  notes: string;
  estimatedDelivery: string;
  shippingFullName: string;
  shippingPhone: string;
  shippingLine1: string;
  shippingLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
}) {
  const existing = await prisma.memberCardFulfillment.findUnique({
    where: { checkoutIntentId: params.checkoutIntentId },
  });
  if (!existing) {
    return null;
  }

  const shippedAt =
    params.fulfillmentStatus === "shipped" || params.fulfillmentStatus === "delivered"
      ? existing.shippedAt || new Date()
      : null;
  const deliveredAt = params.fulfillmentStatus === "delivered" ? existing.deliveredAt || new Date() : null;
  const estimatedDelivery = params.estimatedDelivery ? new Date(params.estimatedDelivery) : null;

  const [updated, checkoutIntent] = await Promise.all([
    prisma.memberCardFulfillment.update({
      where: { checkoutIntentId: params.checkoutIntentId },
      data: {
        fulfillmentStatus: params.fulfillmentStatus,
        carrier: params.carrier,
        trackingNumber: params.trackingNumber,
        trackingUrl: params.trackingUrl,
        notes: params.notes,
        estimatedDelivery,
        shippingFullName: params.shippingFullName,
        shippingPhone: params.shippingPhone,
        shippingLine1: params.shippingLine1,
        shippingLine2: params.shippingLine2,
        shippingCity: params.shippingCity,
        shippingState: params.shippingState,
        shippingPostalCode: params.shippingPostalCode,
        shippingCountry: params.shippingCountry,
        shippedAt,
        deliveredAt,
        updatedAt: new Date(),
      },
    }),
    prisma.checkoutIntent.findUnique({
      where: { id: params.checkoutIntentId },
      select: {
        status: true,
        provider: true,
        amountUsd: true,
        currency: true,
        createdAt: true,
        fulfilledAt: true,
      },
    }),
  ]);

  return toMemberCardFulfillmentRow(updated, checkoutIntent);
}

export async function ensureDashboardSeed(userId: string) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Dashboard demo seeding is disabled in production.");
  }

  if (!isDashboardDemoSeedEnabled()) {
    return;
  }

  await prisma.minerProfile.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      plan: DEFAULT_PLAN,
      payoutAddress: "kaspa:qz9v...4e5u",
      minPayout: 30,
      payoutSchedule: "daily",
      pendingBalance: 42.18,
      totalHashrate: 8.3,
      rewardFlow: 24.8,
    },
  });

  await prisma.minerProfile.updateMany({
    where: {
      userId,
      minPayout: { lt: 30 },
    },
    data: { minPayout: 30 },
  });

  const workerCount = await prisma.minerWorker.count({
    where: { userId },
  });
  if (workerCount === 0) {
    const now = Date.now();
    await prisma.minerWorker.createMany({
      data: [
        {
          userId,
          name: "RIG-ALPHA-01",
          hashrate: 3.4,
          status: "online",
          lastShare: new Date(now - 12 * 1000),
          rejectRate: 0.8,
        },
        {
          userId,
          name: "RIG-BETA-03",
          hashrate: 2.8,
          status: "online",
          lastShare: new Date(now - 19 * 1000),
          rejectRate: 1.1,
        },
        {
          userId,
          name: "RIG-DELTA-02",
          hashrate: 0,
          status: "offline",
          lastShare: new Date(now - 26 * 60 * 1000),
          rejectRate: 0,
        },
        {
          userId,
          name: "RIG-GAMMA-07",
          hashrate: 2.1,
          status: "warning",
          lastShare: new Date(now - 2 * 60 * 1000),
          rejectRate: 4.9,
        },
      ],
    });
  }

  const payoutCount = await prisma.minerPayout.count({
    where: { userId },
  });
  if (payoutCount === 0) {
    await prisma.minerPayout.createMany({
      data: [
        {
          userId,
          payoutDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          amount: new Prisma.Decimal("24.52"),
          status: "paid",
          tx: "0x7a3...fa2",
        },
        {
          userId,
          payoutDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          amount: new Prisma.Decimal("23.87"),
          status: "paid",
          tx: "0x3df...9b1",
        },
        {
          userId,
          payoutDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          amount: new Prisma.Decimal("22.94"),
          status: "pending",
          tx: "Processing",
        },
      ],
    });
  }

  await prisma.emergencySecurity.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function getDashboardOverview(userId: string) {
  const [profileRecord, workerRecords, payoutRecords, security] = await Promise.all([
    prisma.minerProfile.findUnique({
      where: { userId },
      select: {
        plan: true,
        payoutAddress: true,
        minPayout: true,
        payoutSchedule: true,
        pendingBalance: true,
        totalHashrate: true,
        rewardFlow: true,
      },
    }),
    prisma.minerWorker.findMany({
      where: { userId },
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        hashrate: true,
        status: true,
        lastShare: true,
        rejectRate: true,
        createdAt: true,
      },
    }),
    prisma.minerPayout.findMany({
      where: { userId },
      orderBy: [{ payoutDate: "desc" }, { id: "desc" }],
      take: 20,
      select: {
        id: true,
        payoutDate: true,
        amount: true,
        status: true,
        tx: true,
      },
    }),
    prisma.emergencySecurity.findUnique({
      where: { userId },
      select: {
        emergencyLocked: true,
        lockoutUntil: true,
        pinHash: true,
        pinResetLockoutUntil: true,
        pinResetRecoveryUntil: true,
      },
    }),
  ]);

  const profile: OverviewRow | undefined = profileRecord
    ? {
        plan: normalizeDashboardPlan(profileRecord.plan),
        payout_address: profileRecord.payoutAddress,
        min_payout: Number(profileRecord.minPayout),
        payout_schedule: profileRecord.payoutSchedule,
        pending_balance: Number(profileRecord.pendingBalance),
        total_hashrate: Number(profileRecord.totalHashrate),
        reward_flow: Number(profileRecord.rewardFlow),
      }
    : undefined;

  const workerRows: WorkerRow[] = workerRecords.map((worker) => ({
    id: worker.id,
    name: worker.name,
    description: worker.description,
    hashrate: Number(worker.hashrate),
    status: worker.status as WorkerRow["status"],
    last_share: worker.lastShare,
    reject_rate: Number(worker.rejectRate),
    created_at: worker.createdAt,
  }));

  const payoutRows: PayoutRow[] = payoutRecords.map((payout) => ({
    id: payout.id,
    payout_date: payout.payoutDate,
    amount: Number(payout.amount),
    status: payout.status as PayoutRow["status"],
    tx: payout.tx,
  }));

  const memberCardRecord = await prisma.memberCardFulfillment.findFirst({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  const memberCardCheckoutIntent = memberCardRecord
    ? await prisma.checkoutIntent.findUnique({
        where: { id: memberCardRecord.checkoutIntentId },
        select: {
          status: true,
          provider: true,
          amountUsd: true,
          currency: true,
          createdAt: true,
          fulfilledAt: true,
        },
      })
    : null;
  const memberCard = memberCardRecord
    ? toMemberCardFulfillmentRow(memberCardRecord, memberCardCheckoutIntent)
    : null;
  const onlineWorkers = workerRows.filter((w) => w.status === "online").length;
  const normalizedPlan = normalizeDashboardPlan(profile?.plan);
  const totalHashrate = profile?.total_hashrate ?? 0;
  const pendingBalance = profile?.pending_balance ?? 0;
  const rewardFlow = profile?.reward_flow ?? 0;
  const payoutAddress = profile?.payout_address || null;
  const minPayout = profile?.min_payout ?? 30;

  return {
    plan: normalizedPlan,
    payoutSettings: {
      payoutAddress,
      minPayout,
    },
    summary: {
      totalHashrate: `${totalHashrate.toFixed(1)} GH/s`,
      pendingBalance: `${pendingBalance.toFixed(2)} KAS`,
      rewardFlow: `${rewardFlow.toFixed(1)}%`,
      onlineWorkers,
      totalWorkers: workerRows.length,
    },
    workers: workerRows.map((w) => ({
      id: String(w.id),
      name: w.name,
      description: w.description || "",
      hashrate: `${w.hashrate.toFixed(1)} GH/s`,
      status: w.status,
      lastShare: w.last_share.toISOString(),
      rejectRate: `${w.reject_rate.toFixed(1)}%`,
      createdAt: w.created_at.toISOString(),
    })),
    payouts: payoutRows.map((p) => ({
      id: String(p.id),
      date: p.payout_date.toISOString().slice(0, 10),
      amount: `${p.amount.toFixed(2)} KAS`,
      status: p.status,
      tx: p.tx,
    })),
    security: {
      emergencyLocked: Boolean(security?.emergencyLocked),
      lockoutUntil: security?.lockoutUntil ? security.lockoutUntil.toISOString() : null,
      hasPinConfigured: Boolean(security?.pinHash),
      pinResetLockoutUntil: security?.pinResetLockoutUntil ? security.pinResetLockoutUntil.toISOString() : null,
      pinResetRecoveryUntil: security?.pinResetRecoveryUntil ? security.pinResetRecoveryUntil.toISOString() : null,
    },
    memberCard: memberCard
      ? {
          checkoutIntentId: memberCard.checkout_intent_id,
          tier: memberCard.tier,
          label: memberCard.card_label,
          status: memberCard.fulfillment_status,
          shipping: {
            fullName: memberCard.shipping_full_name,
            email: memberCard.shipping_email,
            phone: memberCard.shipping_phone,
            line1: memberCard.shipping_line1,
            line2: memberCard.shipping_line2,
            city: memberCard.shipping_city,
            state: memberCard.shipping_state,
            postalCode: memberCard.shipping_postal_code,
            country: memberCard.shipping_country,
          },
          carrier: memberCard.carrier,
          trackingNumber: memberCard.tracking_number,
          trackingUrl: memberCard.tracking_url,
          notes: memberCard.notes,
          estimatedDelivery: memberCard.estimated_delivery ? memberCard.estimated_delivery.toISOString() : null,
          shippedAt: memberCard.shipped_at ? memberCard.shipped_at.toISOString() : null,
          deliveredAt: memberCard.delivered_at ? memberCard.delivered_at.toISOString() : null,
          createdAt: memberCard.created_at.toISOString(),
          updatedAt: memberCard.updated_at.toISOString(),
        }
      : null,
  };
}

export async function updatePayoutSettings(
  userId: string,
  payoutAddress: string,
  minPayout: number
) {
  const lockCheck = await assertAccountNotEmergencyLocked(userId);
  if (!lockCheck.ok) return lockCheck;

  const addressValue = String(payoutAddress || "").trim();
  if (!/^kaspa:[a-z0-9]{6,}$/i.test(addressValue)) {
    return { ok: false as const, error: "Invalid Kaspa payout address." };
  }

  if (!Number.isFinite(minPayout) || minPayout < 30 || minPayout > 100000) {
    return { ok: false as const, error: "Minimum payout must be at least 30 KAS." };
  }

  await prisma.minerProfile.upsert({
    where: { userId },
    update: {
      payoutAddress: addressValue,
      minPayout,
      payoutSchedule: "daily",
      updatedAt: new Date(),
    },
    create: {
      userId,
      payoutAddress: addressValue,
      minPayout,
      payoutSchedule: "daily",
    },
  });

  return { ok: true as const };
}

export async function renameWorker(
  userId: string,
  workerId: number,
  nextName: string
) {
  const lockCheck = await assertAccountNotEmergencyLocked(userId);
  if (!lockCheck.ok) return lockCheck;

  if (!Number.isInteger(workerId) || workerId <= 0) {
    return { ok: false as const, status: 400, error: "Invalid worker id." };
  }

  const normalizedName = String(nextName || "").trim();
  if (normalizedName.length < 3 || normalizedName.length > 40) {
    return { ok: false as const, status: 400, error: "Worker name must be 3-40 characters." };
  }

  if (!/^[A-Za-z0-9 _-]+$/.test(normalizedName)) {
    return {
      ok: false as const,
      status: 400,
      error: "Worker name can contain letters, numbers, spaces, '-' and '_' only.",
    };
  }

  const updated = await prisma.minerWorker.updateMany({
    where: {
      id: workerId,
      userId,
    },
    data: {
      name: normalizedName,
    },
  });

  if (updated.count === 0) {
    return { ok: false as const, status: 404, error: "Worker not found." };
  }

  return { ok: true as const };
}

export async function pauseWorker(userId: string, workerId: number) {
  const lockCheck = await assertAccountNotEmergencyLocked(userId);
  if (!lockCheck.ok) return lockCheck;

  if (!Number.isInteger(workerId) || workerId <= 0) {
    return { ok: false as const, status: 400, error: "Invalid worker id." };
  }

  const updated = await prisma.minerWorker.updateMany({
    where: {
      id: workerId,
      userId,
    },
    data: {
      status: "offline",
      hashrate: 0,
    },
  });

  if (updated.count === 0) {
    return { ok: false as const, status: 404, error: "Worker not found." };
  }

  return { ok: true as const };
}

export async function deleteWorker(userId: string, workerId: number) {
  const lockCheck = await assertAccountNotEmergencyLocked(userId);
  if (!lockCheck.ok) return lockCheck;

  if (!Number.isInteger(workerId) || workerId <= 0) {
    return { ok: false as const, status: 400, error: "Invalid worker id." };
  }

  const deleted = await prisma.minerWorker.deleteMany({
    where: {
      id: workerId,
      userId,
    },
  });

  if (deleted.count === 0) {
    return { ok: false as const, status: 404, error: "Worker not found." };
  }

  return { ok: true as const };
}

export async function createWorker(
  userId: string,
  workerName: string,
  description?: string
) {
  const lockCheck = await assertAccountNotEmergencyLocked(userId);
  if (!lockCheck.ok) return lockCheck;

  const normalizedName = String(workerName || "").trim();
  if (normalizedName.length < 1 || normalizedName.length > 50) {
    return { ok: false as const, status: 400, error: "Worker name must be 1-50 characters." };
  }

  if (!/^[A-Za-z0-9 _-]+$/.test(normalizedName)) {
    return {
      ok: false as const,
      status: 400,
      error: "Worker name can contain letters, numbers, spaces, '-' and '_' only.",
    };
  }

  const normalizedDescription = String(description || "").trim().slice(0, 250);

  const created = await prisma.minerWorker.create({
    data: {
      userId,
      name: normalizedName,
      description: normalizedDescription || null,
      hashrate: 0,
      status: "offline",
      rejectRate: 0,
      lastShare: new Date(),
    },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
    },
  });
  if (!created) {
    return { ok: false as const, status: 500, error: "Failed to create worker." };
  }

  return {
    ok: true as const,
    worker: {
      id: String(created.id),
      name: created.name,
      description: created.description || "",
      createdAt: created.createdAt.toISOString(),
    },
  };
}

function getLockoutMsForAttempt(attempt: number) {
  if (attempt === 3) return 5 * 60 * 1000;
  if (attempt === 4) return 10 * 60 * 1000;
  if (attempt >= 5) return 24 * 60 * 60 * 1000;
  return 0;
}

function getPinResetLockoutMsForAttempt(attempt: number) {
  if (attempt % 3 !== 0) return 0;
  if (attempt >= 9) return 48 * 60 * 60 * 1000;
  if (attempt >= 6) return 10 * 60 * 1000;
  return 5 * 60 * 1000;
}

async function logSecurityEvent(userId: string, eventType: string, success: boolean, reason: string, ip?: string) {
  await prisma.securityEvent.create({
    data: {
      userId,
      eventType,
      success,
      reason,
      ip: ip || null,
    },
  });
}

export async function assertAccountNotEmergencyLocked(userId: string) {
  const security = await prisma.emergencySecurity.findUnique({
    where: { userId },
    select: { emergencyLocked: true },
  });

  if (security?.emergencyLocked) {
    return {
      ok: false as const,
      status: 403,
      error: "Account is locked. Unlock your account to continue.",
    };
  }

  return { ok: true as const };
}

export async function setEmergencyPin(
  userId: string,
  newPin: string,
  currentPin?: string,
  context?: { ip?: string }
) {
  if (!/^\d{6}$/.test(newPin)) {
    return { ok: false as const, error: "New PIN must be exactly 6 digits." };
  }

  const overview = await getDashboardOverview(userId);
  if (overview.plan === "Starter") {
    return { ok: false as const, error: "Guardian PIN is available on Silver, Hash Pro, and Titan Elite only." };
  }

  await prisma.emergencySecurity.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  const security = await prisma.emergencySecurity.findUnique({
    where: { userId },
    select: {
      pinHash: true,
      pinResetFailedAttempts: true,
      pinResetLockoutUntil: true,
      pinResetRecoveryUntil: true,
    },
  });
  const existingPinHash = security?.pinHash || null;
  const resetLockoutUntil = security?.pinResetLockoutUntil || null;
  const recoveryUntil = security?.pinResetRecoveryUntil || null;
  const hasRecoveryBypass = Boolean(recoveryUntil && recoveryUntil.getTime() > Date.now());

  if (resetLockoutUntil && resetLockoutUntil.getTime() > Date.now()) {
    await logSecurityEvent(userId, "pin_reset_failed", false, "blocked_by_lockout", context?.ip);
    return {
      ok: false as const,
      status: 429,
      error: "PIN reset is temporarily locked due to repeated failed attempts.",
      lockoutUntil: resetLockoutUntil.toISOString(),
    };
  }

  if (existingPinHash && !hasRecoveryBypass) {
    if (!currentPin || !/^\d{6}$/.test(currentPin)) {
      await logSecurityEvent(userId, "pin_reset_failed", false, "missing_or_invalid_current_pin", context?.ip);
      return { ok: false as const, error: "Current PIN is required and must be 6 digits." };
    }
    const currentPinOk = await bcrypt.compare(currentPin, existingPinHash);
    if (!currentPinOk) {
      const nextAttempts = (security?.pinResetFailedAttempts || 0) + 1;
      const lockoutMs = getPinResetLockoutMsForAttempt(nextAttempts);
      const lockoutUntil = lockoutMs > 0 ? new Date(Date.now() + lockoutMs) : null;

      await prisma.emergencySecurity.update({
        where: { userId },
        data: {
          pinResetFailedAttempts: nextAttempts,
          pinResetLockoutUntil: lockoutUntil,
          updatedAt: new Date(),
        },
      });

      await logSecurityEvent(userId, "pin_reset_failed", false, "incorrect_current_pin", context?.ip);

      return {
        ok: false as const,
        status: lockoutUntil ? 429 : 400,
        error: lockoutUntil
          ? "Too many incorrect current PIN attempts. PIN reset is temporarily locked."
          : "Current PIN is incorrect.",
        failedAttempts: nextAttempts,
        lockoutUntil: lockoutUntil ? lockoutUntil.toISOString() : null,
      };
    }
  }

  const pinHash = await bcrypt.hash(newPin, 10);

  await prisma.emergencySecurity.update({
    where: { userId },
    data: {
      pinHash,
      failedAttempts: 0,
      lockoutUntil: null,
      pinResetFailedAttempts: 0,
      pinResetLockoutUntil: null,
      pinResetRecoveryUntil: null,
      updatedAt: new Date(),
    },
  });

  await logSecurityEvent(userId, "pin_reset_success", true, "pin_updated", context?.ip);

  return { ok: true as const };
}

export async function triggerEmergencyLock(userId: string, pin: string) {
  if (!/^\d{6}$/.test(pin)) {
    return { ok: false as const, status: 400, error: "PIN must be exactly 6 digits." };
  }

  const overview = await getDashboardOverview(userId);
  if (!(overview.plan === "Hash Pro" || overview.plan === "Titan Elite")) {
    return { ok: false as const, status: 403, error: "Emergency lock is available on Hash Pro and Titan Elite only." };
  }

  const security = await prisma.emergencySecurity.findUnique({
    where: { userId },
    select: {
      pinHash: true,
      failedAttempts: true,
      lockoutUntil: true,
      emergencyLocked: true,
    },
  });

  if (!security?.pinHash) {
    return { ok: false as const, status: 400, error: "Security PIN is not configured." };
  }

  if (security.lockoutUntil && security.lockoutUntil.getTime() > Date.now()) {
    return {
      ok: false as const,
      status: 429,
      error: "Lock control is temporarily disabled.",
      lockoutUntil: security.lockoutUntil.toISOString(),
    };
  }

  if (security.emergencyLocked) {
    return { ok: true as const, alreadyLocked: true };
  }

  const pinOk = await bcrypt.compare(pin, security.pinHash);
  if (!pinOk) {
    const nextAttempts = security.failedAttempts + 1;
    const lockoutMs = getLockoutMsForAttempt(nextAttempts);
    const lockoutUntil = lockoutMs > 0 ? new Date(Date.now() + lockoutMs) : null;

    await prisma.emergencySecurity.update({
      where: { userId },
      data: {
        failedAttempts: nextAttempts,
        lockoutUntil,
        updatedAt: new Date(),
      },
    });

    return {
      ok: false as const,
      status: lockoutUntil ? 429 : 401,
      error: lockoutUntil ? "Too many invalid PIN attempts." : "Incorrect PIN.",
      failedAttempts: nextAttempts,
      lockoutUntil: lockoutUntil ? lockoutUntil.toISOString() : null,
    };
  }

  await prisma.emergencySecurity.update({
    where: { userId },
    data: {
      emergencyLocked: true,
      lockedAt: new Date(),
      failedAttempts: 0,
      lockoutUntil: null,
      updatedAt: new Date(),
    },
  });

  return { ok: true as const, locked: true };
}

export async function unlockEmergencyLock(userId: string, pin: string) {
  if (!/^\d{6}$/.test(pin)) {
    return { ok: false as const, status: 400, error: "PIN must be exactly 6 digits." };
  }

  const overview = await getDashboardOverview(userId);
  if (!(overview.plan === "Hash Pro" || overview.plan === "Titan Elite")) {
    return { ok: false as const, status: 403, error: "Emergency lock is available on Hash Pro and Titan Elite only." };
  }

  const security = await prisma.emergencySecurity.findUnique({
    where: { userId },
    select: {
      pinHash: true,
      failedAttempts: true,
      lockoutUntil: true,
      emergencyLocked: true,
    },
  });

  if (!security?.pinHash) {
    return { ok: false as const, status: 400, error: "Security PIN is not configured." };
  }

  if (security.lockoutUntil && security.lockoutUntil.getTime() > Date.now()) {
    return {
      ok: false as const,
      status: 429,
      error: "Unlock control is temporarily disabled.",
      lockoutUntil: security.lockoutUntil.toISOString(),
    };
  }

  const pinOk = await bcrypt.compare(pin, security.pinHash);
  if (!pinOk) {
    const nextAttempts = security.failedAttempts + 1;
    const lockoutMs = getLockoutMsForAttempt(nextAttempts);
    const lockoutUntil = lockoutMs > 0 ? new Date(Date.now() + lockoutMs) : null;

    await prisma.emergencySecurity.update({
      where: { userId },
      data: {
        failedAttempts: nextAttempts,
        lockoutUntil,
        updatedAt: new Date(),
      },
    });

    return {
      ok: false as const,
      status: lockoutUntil ? 429 : 401,
      error: lockoutUntil ? "Too many invalid PIN attempts." : "Incorrect PIN.",
      failedAttempts: nextAttempts,
      lockoutUntil: lockoutUntil ? lockoutUntil.toISOString() : null,
    };
  }

  await prisma.emergencySecurity.update({
    where: { userId },
    data: {
      emergencyLocked: false,
      lockedAt: null,
      failedAttempts: 0,
      lockoutUntil: null,
      updatedAt: new Date(),
    },
  });

  return { ok: true as const, unlocked: true };
}
