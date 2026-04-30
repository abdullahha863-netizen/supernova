import { prisma } from "@/lib/prisma";

export type SecurityEventRow = {
  ip: string;
  created_at: Date;
};

export type WorkerRow = {
  id: number;
  name: string;
  hashrate: number;
  status: string;
  last_share: Date;
  reject_rate: number;
};

export type PayoutRow = {
  id: number;
  payout_date: Date;
  amount: number;
  status: string;
  tx: string;
};

export type HistoryRow = {
  recorded_at: Date;
  hashrate: number;
};

export type RawCashoutReviewDetailData = {
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    twoFactorEnabled: boolean;
  } | null;
  profile: {
    plan: string;
    payout_address: string;
    pending_balance: number;
    total_hashrate: number;
    reward_flow: number;
  } | null;
  lastSessionAt: Date | null;
  securityRows: SecurityEventRow[];
  workerRows: WorkerRow[];
  payoutRows: PayoutRow[];
  historyRows: HistoryRow[];
  sharesCount: number;
  rejectsCount: number;
};

export async function fetchCashoutReviewDetailData(minerId: string): Promise<RawCashoutReviewDetailData> {
  const historySince = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [user, profileRecord, lastSession, securityRecords, workerRecords, payoutRecords, historyRecords] = await Promise.all([
    prisma.user.findUnique({
      where: { id: minerId },
      select: { id: true, name: true, email: true, createdAt: true, twoFactorEnabled: true },
    }),
    prisma.minerProfile.findUnique({
      where: { userId: minerId },
      select: {
        plan: true,
        payoutAddress: true,
        pendingBalance: true,
        totalHashrate: true,
        rewardFlow: true,
      },
    }),
    prisma.session.findFirst({ where: { userId: minerId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.securityEvent.findMany({
      where: {
        userId: minerId,
        ip: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { ip: true, createdAt: true },
    }),
    prisma.minerWorker.findMany({
      where: { userId: minerId },
      orderBy: { lastShare: "desc" },
      select: {
        id: true,
        name: true,
        hashrate: true,
        status: true,
        lastShare: true,
        rejectRate: true,
      },
    }),
    prisma.minerPayout.findMany({
      where: { userId: minerId },
      orderBy: { payoutDate: "desc" },
      take: 100,
      select: {
        id: true,
        payoutDate: true,
        amount: true,
        status: true,
        tx: true,
      },
    }),
    prisma.minerHashrateHistory.findMany({
      where: {
        userId: minerId,
        recordedAt: { gte: historySince },
      },
      orderBy: { recordedAt: "asc" },
      select: {
        recordedAt: true,
        hashrate: true,
      },
    }),
  ]);

  let sharesCount = 0;
  let rejectsCount = 0;
  try {
    [sharesCount, rejectsCount] = await Promise.all([
      prisma.share.count({ where: { userId: minerId } }),
      prisma.share.count({ where: { userId: minerId, accepted: false } }),
    ]);
  } catch {
    // Share model may be unavailable during partial migrations.
  }

  return {
    user,
    profile: profileRecord
      ? {
          plan: profileRecord.plan,
          payout_address: profileRecord.payoutAddress,
          pending_balance: Number(profileRecord.pendingBalance),
          total_hashrate: Number(profileRecord.totalHashrate),
          reward_flow: Number(profileRecord.rewardFlow),
        }
      : null,
    lastSessionAt: lastSession?.createdAt ?? null,
    securityRows: securityRecords.map((row) => ({
      ip: row.ip || "",
      created_at: row.createdAt,
    })),
    workerRows: workerRecords.map((worker) => ({
      id: worker.id,
      name: worker.name,
      hashrate: Number(worker.hashrate),
      status: worker.status,
      last_share: worker.lastShare,
      reject_rate: Number(worker.rejectRate),
    })),
    payoutRows: payoutRecords.map((payout) => ({
      id: payout.id,
      payout_date: payout.payoutDate,
      amount: Number(payout.amount),
      status: payout.status,
      tx: payout.tx,
    })),
    historyRows: historyRecords.map((row) => ({
      recorded_at: row.recordedAt,
      hashrate: Number(row.hashrate),
    })),
    sharesCount,
    rejectsCount,
  };
}
