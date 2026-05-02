import { prisma } from "@/lib/prisma";
import {
  deriveVpnStatus,
  evaluateRiskSignals,
  normalizeIpHistoryEvents,
  summarizeIpHistory,
  type RiskEvaluation,
} from "@/lib/admin/cashoutReviewSharedEngine";

export async function evaluateMinerFraudRisk(
  userId: string,
  options: { hasCashoutAttempt?: boolean } = {},
): Promise<RiskEvaluation> {
  const now = Date.now();
  const historySince = new Date(now - 6 * 60 * 60 * 1000);
  const recentPayoutSince = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const [securityRows, workerRows, payoutRows, profile, user, historyRows] = await Promise.all([
    prisma.securityEvent.findMany({
      where: { userId, ip: { not: null }, createdAt: { gte: new Date(now - 24 * 60 * 60 * 1000) } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { ip: true, createdAt: true },
    }),
    prisma.minerWorker.findMany({
      where: { userId },
      select: { status: true, lastShare: true, hashrate: true, rejectRate: true },
    }),
    prisma.minerPayout.findMany({
      where: { userId, payoutDate: { gt: recentPayoutSince } },
      select: { id: true },
    }),
    prisma.minerProfile.findUnique({
      where: { userId },
      select: { pendingBalance: true, totalHashrate: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    }),
    prisma.minerHashrateHistory.findMany({
      where: { userId, recordedAt: { gte: historySince } },
      orderBy: { recordedAt: "asc" },
      select: { recordedAt: true, hashrate: true },
    }),
  ]);

  let sharesCount = 0;
  let rejectsCount = 0;
  try {
    [sharesCount, rejectsCount] = await Promise.all([
      prisma.share.count({ where: { userId, createdAt: { gte: recentPayoutSince } } }),
      prisma.share.count({ where: { userId, accepted: false, createdAt: { gte: recentPayoutSince } } }),
    ]);
  } catch {
    // Share model may be unavailable during partial migrations.
  }

  const ipEvents = normalizeIpHistoryEvents(securityRows.map((row) => ({
    ip: row.ip || "",
    createdAt: row.createdAt,
  })));
  const summary = summarizeIpHistory(ipEvents);
  const vpnStatus = deriveVpnStatus(summary.uniqueIps24h.size, summary.countryChanges24h, summary.currentIp, summary.currentCountry);
  const accountAgeDays = user ? (now - new Date(user.createdAt).getTime()) / (24 * 60 * 60 * 1000) : undefined;

  return evaluateRiskSignals({
    vpnStatus,
    ipChanges24h: summary.ipChanges24h,
    countryChanges24h: summary.countryChanges24h,
    currentCountry: summary.currentCountry,
    workers: workerRows.map((worker) => ({
      status: worker.status,
      lastShare: worker.lastShare,
      hashrate: Number(worker.hashrate),
      rejectRate: Number(worker.rejectRate),
    })),
    historyRows: historyRows.map((row) => ({
      recorded_at: row.recordedAt,
      hashrate: Number(row.hashrate),
    })),
    recentPayoutCount7d: payoutRows.length,
    pendingBalance: Number(profile?.pendingBalance ?? 0),
    totalHashrate: Number(profile?.totalHashrate ?? 0),
    sharesCount,
    rejectsCount,
    accountAgeDays,
    hasCashoutAttempt: options.hasCashoutAttempt,
  });
}
