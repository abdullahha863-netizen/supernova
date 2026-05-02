import type { VpnStatus } from "@/lib/admin/minerCashoutMonitor";
import type { RawCashoutReviewListData, SecurityEventRow } from "@/lib/admin/cashoutReviewListData";
import {
  deriveVpnStatus,
  evaluateRiskSignals,
  normalizeIpHistoryEvents,
  summarizeIpHistory,
  type RiskLevel,
  type RiskSignalContribution,
} from "@/lib/admin/cashoutReviewSharedEngine";

export type ComputedCashoutReviewListRow = {
  payoutId: number;
  minerId: string;
  minerName: string;
  minerEmail: string;
  payoutAmount: number;
  payoutDate: string;
  currentIp: string;
  country: string;
  vpnStatus: VpnStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  contributingSignals: RiskSignalContribution[];
  sourceLabel: "live";
};

export type ComputedCashoutReviewMinerGroup = {
  minerId: string;
  minerName: string;
  minerEmail: string;
  highestRiskScore: number;
  highestRiskLevel: RiskLevel;
  openRequestCount: number;
  totalRequestedAmount: number;
  newestPayoutDate: string;
  requests: ComputedCashoutReviewListRow[];
};

export type CashoutReviewListBusinessResult = {
  rows: ComputedCashoutReviewListRow[];
  minerGroups: ComputedCashoutReviewMinerGroup[];
  requestsCount: number;
  highRiskCount: number;
  pendingAmount: number;
};

export function deriveCashoutReviewList(data: RawCashoutReviewListData): CashoutReviewListBusinessResult {
  const groupedEvents = new Map<string, SecurityEventRow[]>();
  const groupedWorkers = new Map<string, RawCashoutReviewListData["workerRows"]>();
  const groupedHistory = new Map<string, RawCashoutReviewListData["historyRows"]>();
  const profileByUserId = new Map(data.profileRows.map((profile) => [profile.userId, profile]));

  for (const event of data.securityRows) {
    const existing = groupedEvents.get(event.userId) ?? [];
    existing.push(event);
    groupedEvents.set(event.userId, existing);
  }

  for (const worker of data.workerRows) {
    const existing = groupedWorkers.get(worker.userId) ?? [];
    existing.push(worker);
    groupedWorkers.set(worker.userId, existing);
  }

  for (const point of data.historyRows) {
    const existing = groupedHistory.get(point.userId) ?? [];
    existing.push(point);
    groupedHistory.set(point.userId, existing);
  }

  const rows = data.rows.map((row) => {
    const userEvents = groupedEvents.get(row.userId) ?? [];
    const normalizedEvents = normalizeIpHistoryEvents(userEvents);
    const summary = summarizeIpHistory(normalizedEvents);
    const vpnStatus = deriveVpnStatus(summary.uniqueIps24h.size, summary.countryChanges24h, summary.currentIp, summary.currentCountry);
    const profile = profileByUserId.get(row.userId);
    const risk = evaluateRiskSignals({
      vpnStatus,
      ipChanges24h: summary.ipChanges24h,
      countryChanges24h: summary.countryChanges24h,
      currentCountry: summary.currentCountry,
      workers: (groupedWorkers.get(row.userId) ?? []).map((worker) => ({
        status: worker.status,
        lastShare: worker.lastShare,
        hashrate: worker.hashrate,
        rejectRate: worker.rejectRate,
      })),
      historyRows: (groupedHistory.get(row.userId) ?? []).map((point) => ({
        recorded_at: point.recordedAt,
        hashrate: point.hashrate,
      })),
      recentPayoutCount7d: data.recentPayoutCounts[row.userId] ?? 0,
      pendingBalance: profile?.pendingBalance ?? 0,
      totalHashrate: profile?.totalHashrate ?? 0,
      hasCashoutAttempt: true,
    });

    return {
      payoutId: row.payoutId,
      minerId: row.userId,
      minerName: row.name,
      minerEmail: row.email,
      payoutAmount: row.amount,
      payoutDate: row.payoutDate,
      currentIp: summary.currentIp,
      country: summary.currentCountry,
      vpnStatus,
      riskScore: risk.riskScore,
      riskLevel: risk.riskLevel,
      contributingSignals: risk.contributingSignals,
      sourceLabel: "live" as const,
    };
  });

  const groupedRows = new Map<string, ComputedCashoutReviewListRow[]>();
  for (const row of rows) {
    const existing = groupedRows.get(row.minerId) ?? [];
    existing.push(row);
    groupedRows.set(row.minerId, existing);
  }

  const minerGroups = Array.from(groupedRows.entries()).map(([minerId, requests]) => {
    const sortedRequests = [...requests].sort((a, b) => {
      const dateDelta = new Date(b.payoutDate).getTime() - new Date(a.payoutDate).getTime();
      return dateDelta || b.payoutId - a.payoutId;
    });
    const highestRiskScore = sortedRequests.length > 0
      ? Math.max(...sortedRequests.map((request) => request.riskScore))
      : 0;
    const highestRiskRequest = sortedRequests.find((request) => request.riskScore === highestRiskScore);

    return {
      minerId,
      minerName: sortedRequests[0]?.minerName ?? minerId,
      minerEmail: sortedRequests[0]?.minerEmail ?? "",
      highestRiskScore,
      highestRiskLevel: highestRiskRequest?.riskLevel ?? "OK",
      openRequestCount: sortedRequests.length,
      totalRequestedAmount: sortedRequests.reduce((sum, request) => sum + request.payoutAmount, 0),
      newestPayoutDate: sortedRequests[0]?.payoutDate ?? new Date(0).toISOString(),
      requests: sortedRequests,
    };
  }).sort((a, b) => {
    const riskDelta = b.highestRiskScore - a.highestRiskScore;
    if (riskDelta !== 0) return riskDelta;
    return new Date(b.newestPayoutDate).getTime() - new Date(a.newestPayoutDate).getTime();
  });

  const requestsCount = rows.length;
  const highRiskCount = rows.filter((row) => row.riskScore >= 70).length;
  const pendingAmount = rows.reduce((sum, row) => sum + row.payoutAmount, 0);

  return {
    rows,
    minerGroups,
    requestsCount,
    highRiskCount,
    pendingAmount,
  };
}
