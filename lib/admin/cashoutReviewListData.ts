import { prisma } from "@/lib/prisma";
import type { CashoutRequestApiRow } from "@/lib/admin/minerCashoutMonitor";
import type { Prisma } from "@prisma/client";

export type SecurityEventRow = {
  userId: string;
  ip: string;
  createdAt: Date;
};

export type CashoutReviewWorkerRow = {
  userId: string;
  status: string;
  lastShare: Date;
  hashrate: number;
  rejectRate: number;
};

export type CashoutReviewProfileRow = {
  userId: string;
  pendingBalance: number;
  totalHashrate: number;
};

export type CashoutReviewHistoryRow = {
  userId: string;
  recordedAt: Date;
  hashrate: number;
};

export type RawCashoutReviewListData = {
  rows: CashoutRequestApiRow[];
  securityRows: SecurityEventRow[];
  workerRows: CashoutReviewWorkerRow[];
  profileRows: CashoutReviewProfileRow[];
  recentPayoutCounts: Record<string, number>;
  historyRows: CashoutReviewHistoryRow[];
};

type CashoutReviewJoinedRow = {
  payoutId: number;
  payoutUserId: string;
  userId: string | null;
  name: string | null;
  email: string | null;
  amount: Prisma.Decimal;
  payoutDate: Date;
  status: string;
};

export async function fetchCashoutReviewListData(): Promise<RawCashoutReviewListData> {
  const recentPayoutSince = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const historySince = new Date(Date.now() - 6 * 3600 * 1000);
  const joinedRows = await prisma.$queryRaw<CashoutReviewJoinedRow[]>`
    SELECT
      payout."id" AS "payoutId",
      payout."user_id" AS "payoutUserId",
      "user"."id" AS "userId",
      "user"."name" AS "name",
      "user"."email" AS "email",
      payout."amount" AS "amount",
      payout."payout_date" AS "payoutDate",
      payout."status" AS "status"
    FROM "miner_payouts" payout
    LEFT JOIN "User" "user" ON "user"."id" = payout."user_id"
    WHERE payout."status" IN ('pending', 'review_queue')
    ORDER BY payout."payout_date" DESC, payout."id" DESC
    LIMIT 200
  `;

  const rows: CashoutRequestApiRow[] = joinedRows.map((row) => {
    return {
      payoutId: row.payoutId,
      userId: row.payoutUserId,
      name: row.name || row.payoutUserId,
      email: row.email || "",
      amount: Number(row.amount),
      payoutDate: row.payoutDate.toISOString(),
      status: row.status,
    };
  });

  if (rows.length === 0) {
    return { rows: [], securityRows: [], workerRows: [], profileRows: [], recentPayoutCounts: {}, historyRows: [] };
  }

  const userIds = Array.from(new Set(rows.map((row) => row.userId)));
  const [securityRowsRaw, workerRowsRaw, profileRowsRaw, recentPayoutRows, historyRowsRaw] = await Promise.all([
    Promise.all(userIds.map((userId) =>
      prisma.securityEvent.findMany({
        where: {
          userId,
          ip: { not: null },
        },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: { userId: true, ip: true, createdAt: true },
      })
    )),
    prisma.minerWorker.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, status: true, lastShare: true, hashrate: true, rejectRate: true },
    }),
    prisma.minerProfile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, pendingBalance: true, totalHashrate: true },
    }),
    prisma.minerPayout.findMany({
      where: { userId: { in: userIds }, payoutDate: { gt: recentPayoutSince } },
      select: { userId: true },
    }),
    prisma.minerHashrateHistory.findMany({
      where: { userId: { in: userIds }, recordedAt: { gte: historySince } },
      orderBy: { recordedAt: "asc" },
      select: { userId: true, recordedAt: true, hashrate: true },
    }),
  ]);
  const securityRows = securityRowsRaw.flat().map((row) => ({
    userId: row.userId,
    ip: row.ip || "",
    createdAt: row.createdAt,
  })).sort((a, b) => a.userId.localeCompare(b.userId) || b.createdAt.getTime() - a.createdAt.getTime());

  const recentPayoutCounts = recentPayoutRows.reduce<Record<string, number>>((counts, payout) => {
    counts[payout.userId] = (counts[payout.userId] ?? 0) + 1;
    return counts;
  }, {});

  return {
    rows,
    securityRows,
    workerRows: workerRowsRaw.map((worker) => ({
      userId: worker.userId,
      status: worker.status,
      lastShare: worker.lastShare,
      hashrate: Number(worker.hashrate),
      rejectRate: Number(worker.rejectRate),
    })),
    profileRows: profileRowsRaw.map((profile) => ({
      userId: profile.userId,
      pendingBalance: Number(profile.pendingBalance),
      totalHashrate: Number(profile.totalHashrate),
    })),
    recentPayoutCounts,
    historyRows: historyRowsRaw.map((row) => ({
      userId: row.userId,
      recordedAt: row.recordedAt,
      hashrate: Number(row.hashrate),
    })),
  };
}
