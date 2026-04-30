import { prisma } from "@/lib/prisma";
import type { CashoutRequestApiRow } from "@/lib/admin/minerCashoutMonitor";

export type SecurityEventRow = {
  userId: string;
  ip: string;
  createdAt: Date;
};

export type RawCashoutReviewListData = {
  rows: CashoutRequestApiRow[];
  securityRows: SecurityEventRow[];
};

export async function fetchCashoutReviewListData(): Promise<RawCashoutReviewListData> {
  const payouts = await prisma.minerPayout.findMany({
    where: { status: "pending" },
    orderBy: { payoutDate: "desc" },
    take: 200,
    select: {
      id: true,
      userId: true,
      amount: true,
      payoutDate: true,
      status: true,
    },
  });
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(new Set(payouts.map((payout) => payout.userId))) } },
    select: { id: true, name: true, email: true },
  });
  const userById = new Map(users.map((user) => [user.id, user]));
  const rows: CashoutRequestApiRow[] = payouts.map((payout) => {
    const user = userById.get(payout.userId);
    return {
      payoutId: payout.id,
      userId: payout.userId,
      name: user?.name || "",
      email: user?.email || "",
      amount: Number(payout.amount),
      payoutDate: payout.payoutDate.toISOString(),
      status: payout.status,
    };
  });

  if (rows.length === 0) {
    return { rows: [], securityRows: [] };
  }

  const userIds = Array.from(new Set(rows.map((row) => row.userId)));
  const securityRows = (await Promise.all(userIds.map((userId) =>
    prisma.securityEvent.findMany({
      where: {
        userId,
        ip: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { userId: true, ip: true, createdAt: true },
    })
  ))).flat().map((row) => ({
    userId: row.userId,
    ip: row.ip || "",
    createdAt: row.createdAt,
  })).sort((a, b) => a.userId.localeCompare(b.userId) || b.createdAt.getTime() - a.createdAt.getTime());

  return { rows, securityRows };
}
