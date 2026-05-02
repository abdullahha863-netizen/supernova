import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { enforceRateLimit, safeJsonBody, safeResponseError, validateId, validateNonEmptyString, validateNonNegativeInt } from "@/lib/apiHardening";
import { isAdminRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { getDashboardUserIdFromRequest } from "@/lib/auth";
import { evaluateMinerFraudRisk } from "@/lib/miningFraudRisk";

export type CashoutStatus = "pending" | "approved" | "rejected" | "review_queue";

class ActiveCashoutRequestError extends Error {
  constructor() {
    super("You already have a pending cashout request.");
    this.name = "ActiveCashoutRequestError";
  }
}

class CashoutValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "CashoutValidationError";
    this.status = status;
  }
}

const ACTIVE_CASHOUT_STATUSES = ["pending", "review_queue", "approved"] as const;
const RELEASED_CASHOUT_STATUSES = ["rejected", "cancelled"] as const;

type LockedMinerProfileRow = {
  user_id: string;
  pending_balance: Prisma.Decimal;
  reserved_balance: Prisma.Decimal;
  min_payout: Prisma.Decimal;
  payout_address: string;
};

function toCashoutAmount(value: unknown) {
  const amount = new Prisma.Decimal(String(value));
  if (amount.lte(0)) {
    throw new CashoutValidationError("Valid cashout amount is required");
  }
  return amount.toDecimalPlaces(8);
}

function normalizeOptionalTxHash(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  return raw ? raw.slice(0, 256) : null;
}

function getIdempotencyKey(req: NextRequest, body: Record<string, any>, userId: string) {
  const raw = String(req.headers.get("idempotency-key") || body.idempotencyKey || "").trim();
  if (!raw) return null;
  return `cashout:${userId}:${raw.slice(0, 160)}`;
}

async function createCashoutRequestAdminNotification(params: {
  payoutId: number;
  userId: string;
  amount: Prisma.Decimal;
}) {
  try {
    const [user, profile] = await Promise.all([
      prisma.user.findUnique({
        where: { id: params.userId },
        select: { name: true, email: true },
      }),
      prisma.minerProfile.findUnique({
        where: { userId: params.userId },
        select: { payoutAddress: true },
      }),
    ]);
    const userIdentifier = user?.email || user?.name || profile?.payoutAddress || params.userId;
    const amount = Number(params.amount).toFixed(2);

    await prisma.notification.create({
      data: {
        type: "cashout_request",
        title: "New Cashout Request",
        message: `${userIdentifier} requested ${amount} KAS cashout.`,
        severity: "medium",
        link: `/admin/dashboard/cashout-review/${encodeURIComponent(params.userId)}?payoutId=${params.payoutId}`,
      },
    });
  } catch (error) {
    console.error("[mining/cashout][admin-notification]", error);
  }
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = enforceRateLimit(req, "mining:cashout-get", { windowMs: 60_000, max: 15 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(req.url);
  let userId: string;
  try {
    userId = validateId(searchParams.get("userId"), "userId");
  } catch (error) {
    return safeResponseError((error as Error).message);
  }

  try {
    const [payoutRecords, profile] = await Promise.all([
      prisma.minerPayout.findMany({
        where: { userId },
        orderBy: { payoutDate: "desc" },
        take: 100,
        select: {
          id: true,
          payoutDate: true,
          amount: true,
          status: true,
          tx: true,
          txHash: true,
          paidAt: true,
          statusHistory: {
            orderBy: { createdAt: "asc" },
            select: {
              fromStatus: true,
              toStatus: true,
              note: true,
              txHash: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.minerProfile.findUnique({
        where: { userId },
        select: { pendingBalance: true, reservedBalance: true },
      }),
    ]);

    const payoutRows = payoutRecords.map((payout) => ({
      id: payout.id,
      payout_date: payout.payoutDate,
      amount: Number(payout.amount),
      status: payout.status,
      tx: payout.tx,
      txHash: payout.txHash,
      paidAt: payout.paidAt,
      statusHistory: payout.statusHistory,
    }));

    const pending = Number(profile?.pendingBalance ?? 0);
    const reserved = Number(profile?.reservedBalance ?? 0);
    const total = payoutRows.reduce((s, r) => s + r.amount, 0);
    const lastPayout = payoutRows[0] ?? null;

    return NextResponse.json({
      ok: true,
      pendingBalance: pending,
      reservedBalance: reserved,
      totalPaidOut: total,
      payoutCount: payoutRows.length,
      lastPayout: lastPayout
        ? {
            date: lastPayout.payout_date,
            amount: lastPayout.amount,
            status: lastPayout.status,
            tx: lastPayout.tx,
            txHash: lastPayout.txHash,
            paidAt: lastPayout.paidAt,
          }
        : null,
      history: payoutRows,
    });
  } catch (err) {
    console.error("[mining/cashout][GET]", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getDashboardUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rateLimitResponse = enforceRateLimit(req, "mining:cashout-post", { windowMs: 60_000, max: 10 });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = safeJsonBody(await req.json().catch(() => null));
    const idempotencyKey = getIdempotencyKey(req, body, userId);

    const payout = await prisma.$transaction(
      async (tx) => {
        if (idempotencyKey) {
          const existingIdempotentPayout = await tx.minerPayout.findUnique({
            where: { idempotencyKey },
            select: { id: true, userId: true, amount: true, status: true },
          });

          if (existingIdempotentPayout) {
            if (existingIdempotentPayout.userId !== userId) {
              throw new ActiveCashoutRequestError();
            }
            return existingIdempotentPayout;
          }
        }

        const existingPendingPayout = await tx.minerPayout.findFirst({
          where: {
            userId,
            status: { in: [...ACTIVE_CASHOUT_STATUSES] },
          },
          select: { id: true },
        });

        if (existingPendingPayout) {
          throw new ActiveCashoutRequestError();
        }

        const profileRows = await tx.$queryRaw<LockedMinerProfileRow[]>`
          SELECT
            "user_id",
            "pending_balance",
            "reserved_balance",
            "min_payout",
            "payout_address"
          FROM "miner_profiles"
          WHERE "user_id" = ${userId}
          FOR UPDATE
        `;
        const profile = profileRows[0];

        if (!profile) {
          throw new CashoutValidationError("Mining profile not found", 404);
        }

        if (!profile.payout_address) {
          throw new CashoutValidationError("Payout address is required before requesting cashout");
        }

        const requestedAmount = body.amount === undefined
          ? new Prisma.Decimal(profile.pending_balance)
          : toCashoutAmount(body.amount);
        const minimumAmount = new Prisma.Decimal(profile.min_payout);
        const pendingBalance = new Prisma.Decimal(profile.pending_balance);
        const reservedBalance = new Prisma.Decimal(profile.reserved_balance);

        if (requestedAmount.lt(minimumAmount)) {
          throw new CashoutValidationError(`Minimum cashout amount is ${minimumAmount.toFixed(2)} KAS`);
        }

        if (pendingBalance.lt(requestedAmount)) {
          throw new CashoutValidationError("Cashout amount exceeds pending balance");
        }

        const risk = await evaluateMinerFraudRisk(userId, { hasCashoutAttempt: true });
        if (risk.riskScore >= 90) {
          throw new CashoutValidationError(
            `Cashout is temporarily blocked for fraud review. Risk Score: ${risk.riskScore} (${risk.riskLevel}).`,
            403,
          );
        }

        const initialStatus = risk.riskScore >= 40 ? "review_queue" : "pending";

        await tx.minerProfile.update({
          where: { userId },
          data: {
            pendingBalance: pendingBalance.sub(requestedAmount),
            reservedBalance: reservedBalance.add(requestedAmount),
            updatedAt: new Date(),
          },
        });

        const createdPayout = await tx.minerPayout.create({
          data: {
            userId,
            payoutDate: new Date(),
            amount: requestedAmount,
            status: initialStatus,
            tx: "Processing",
            idempotencyKey,
            statusHistory: {
              create: {
                fromStatus: null,
                toStatus: initialStatus,
                note: initialStatus === "review_queue"
                  ? `Cashout requested; funds reserved and queued for admin review. Risk Score: ${risk.riskScore} (${risk.riskLevel}).`
                  : "Cashout requested; funds reserved from pending balance.",
              },
            },
          },
          select: {
            id: true,
            userId: true,
            amount: true,
            status: true,
          },
        });

        console.info("[mining/cashout][reserve]", {
          payoutId: createdPayout.id,
          userId,
          amount: requestedAmount.toString(),
        });

        return createdPayout;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await createCashoutRequestAdminNotification({
      payoutId: payout.id,
      userId: payout.userId,
      amount: payout.amount,
    });

    return NextResponse.json({ ok: true, payoutId: payout.id }, { status: 201 });
  } catch (err) {
    if (err instanceof CashoutValidationError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }

    if (
      err instanceof ActiveCashoutRequestError ||
      (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034")
    ) {
      return NextResponse.json(
        { ok: false, error: "You already have a pending cashout request." },
        { status: 409 },
      );
    }

    console.error("[mining/cashout][POST]", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rateLimitResponse = enforceRateLimit(req, "mining:cashout-patch", { windowMs: 60_000, max: 15 });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = safeJsonBody(await req.json().catch(() => null));
    const payoutId = validateNonNegativeInt(body.payoutId ?? 0, "payoutId");
    const action = validateNonEmptyString(body.action, "action"); // approve | reject | reset | review_queue

    if (!["approve", "paid", "pay", "reject", "cancel", "cancelled", "reset", "review_queue"].includes(action)) {
      return NextResponse.json({ ok: false, error: "action (approve|paid|reject|cancel|reset|review_queue) is required" }, { status: 400 });
    }

    async function resolvePayoutId(tx: Prisma.TransactionClient) {
      if (payoutId > 0) return payoutId;

      const userId = String(body.userId || "").trim();
      if (!userId) {
        throw new CashoutValidationError("userId or payoutId is required");
      }
      validateId(userId, "userId");
      const payout = await tx.minerPayout.findFirst({
        where: {
          userId,
          status: { in: [...ACTIVE_CASHOUT_STATUSES] },
        },
        orderBy: [{ payoutDate: "desc" }, { id: "desc" }],
        select: { id: true },
      });
      if (!payout) {
        throw new CashoutValidationError("No active payout request found for this user", 404);
      }
      return payout.id;
    }

    const txHash = normalizeOptionalTxHash(body.txHash || body.transactionHash || body.tx);

    const result = await prisma.$transaction(
      async (tx) => {
        const targetPayoutId = await resolvePayoutId(tx);
        await tx.$queryRaw`
          SELECT "id"
          FROM "miner_payouts"
          WHERE "id" = ${targetPayoutId}
          FOR UPDATE
        `;

        const payout = await tx.minerPayout.findUnique({
          where: { id: targetPayoutId },
          select: { id: true, userId: true, amount: true, status: true },
        });

        if (!payout) {
          throw new CashoutValidationError("Payout request not found", 404);
        }

        const fromStatus = payout.status;
        const amount = new Prisma.Decimal(payout.amount);

        if (action === "approve" || action === "paid" || action === "pay") {
          if (fromStatus === "paid") {
            return { payoutId: targetPayoutId, status: "paid", alreadyProcessed: true };
          }

          if (![...ACTIVE_CASHOUT_STATUSES].includes(fromStatus as typeof ACTIVE_CASHOUT_STATUSES[number])) {
            throw new CashoutValidationError("Only active payout requests can be marked paid", 409);
          }

          const profileUpdate = await tx.minerProfile.updateMany({
            where: {
              userId: payout.userId,
              reservedBalance: { gte: amount },
            },
            data: {
              reservedBalance: { decrement: amount },
              updatedAt: new Date(),
            },
          });

          if (profileUpdate.count !== 1) {
            throw new CashoutValidationError("Reserved balance is insufficient for this payout", 409);
          }

          const updated = await tx.minerPayout.update({
            where: { id: targetPayoutId },
            data: {
              status: "paid",
              tx: txHash || "Paid",
              txHash,
              paidAt: new Date(),
              statusHistory: {
                create: {
                  fromStatus,
                  toStatus: "paid",
                  note: "Cashout paid; reserved balance consumed.",
                  txHash,
                },
              },
            },
            select: { id: true, status: true },
          });

          console.info("[mining/cashout][paid]", {
            payoutId: targetPayoutId,
            userId: payout.userId,
            amount: amount.toString(),
            txHash,
          });

          return { payoutId: updated.id, status: updated.status, alreadyProcessed: false };
        }

        if (action === "reject" || action === "cancel" || action === "cancelled") {
          const nextStatus = action === "reject" ? "rejected" : "cancelled";

          if (fromStatus === "paid") {
            throw new CashoutValidationError("Paid payouts are not automatically reversible", 409);
          }

          if ([...RELEASED_CASHOUT_STATUSES].includes(fromStatus as typeof RELEASED_CASHOUT_STATUSES[number])) {
            return { payoutId: targetPayoutId, status: fromStatus, alreadyProcessed: true };
          }

          if (![...ACTIVE_CASHOUT_STATUSES].includes(fromStatus as typeof ACTIVE_CASHOUT_STATUSES[number])) {
            throw new CashoutValidationError("Only active payout requests can be released", 409);
          }

          const profileUpdate = await tx.minerProfile.updateMany({
            where: {
              userId: payout.userId,
              reservedBalance: { gte: amount },
            },
            data: {
              pendingBalance: { increment: amount },
              reservedBalance: { decrement: amount },
              updatedAt: new Date(),
            },
          });

          if (profileUpdate.count !== 1) {
            throw new CashoutValidationError("Reserved balance is insufficient to release this payout", 409);
          }

          const updated = await tx.minerPayout.update({
            where: { id: targetPayoutId },
            data: {
              status: nextStatus,
              statusHistory: {
                create: {
                  fromStatus,
                  toStatus: nextStatus,
                  note: "Cashout released; reserved balance returned to pending balance.",
                },
              },
            },
            select: { id: true, status: true },
          });

          console.info("[mining/cashout][release]", {
            payoutId: targetPayoutId,
            userId: payout.userId,
            amount: amount.toString(),
            status: nextStatus,
          });

          return { payoutId: updated.id, status: updated.status, alreadyProcessed: false };
        }

        const nextStatus = action === "review_queue" ? "review_queue" : "pending";
        if (![...ACTIVE_CASHOUT_STATUSES].includes(fromStatus as typeof ACTIVE_CASHOUT_STATUSES[number])) {
          throw new CashoutValidationError("Released or paid payouts cannot be reset without a new cashout request", 409);
        }

        const updated = await tx.minerPayout.update({
          where: { id: targetPayoutId },
          data: {
            status: nextStatus,
            statusHistory: {
              create: {
                fromStatus,
                toStatus: nextStatus,
                note: `Cashout moved to ${nextStatus}. Reserved balance unchanged.`,
              },
            },
          },
          select: { id: true, status: true },
        });

        return { payoutId: updated.id, status: updated.status, alreadyProcessed: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return NextResponse.json({ ok: true, action, payoutId: result.payoutId, status: result.status, alreadyProcessed: result.alreadyProcessed });
  } catch (err) {
    if (err instanceof CashoutValidationError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }

    console.error("[mining/cashout][PATCH]", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
