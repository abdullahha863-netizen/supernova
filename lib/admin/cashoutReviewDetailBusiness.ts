import {
  buildSeries,
  deriveVpnAssessment,
  evaluateRiskSignals,
  normalizeIp,
  normalizeIpHistoryEvents,
  summarizeIpHistory,
  type RiskEvaluation,
} from "@/lib/admin/cashoutReviewSharedEngine";
import type { WindowKey } from "@/lib/admin/cashoutReviewDetail";
import type { HistoryRow, RawCashoutReviewDetailData, WorkerRow } from "@/lib/admin/cashoutReviewDetailData";

export type FraudFlag = {
  id: string;
  label: string;
  severity: "high" | "medium" | "low";
  detail: string;
};

export type ProcessedIpEntry = {
  ip: string;
  createdAt: Date;
  country: string;
};

export type ProcessedHashratePoint = {
  ts: Date;
  hashrate: number;
};

export type BusinessCashoutReviewDetail = {
  user: NonNullable<RawCashoutReviewDetailData["user"]>;
  profile: RawCashoutReviewDetailData["profile"];
  selectedPayoutId: number;
  lastSessionAt: Date | null;
  pendingRequest: RawCashoutReviewDetailData["payoutRows"][number] | null;
  hasSelectedPendingRequest: boolean;
  paidHistory: RawCashoutReviewDetailData["payoutRows"];
  totalWithdrawals: number;
  lastWithdrawal: RawCashoutReviewDetailData["payoutRows"][number] | null;
  recentIpHistory: ProcessedIpEntry[];
  lastIp: string | null;
  ipChanges24h: number;
  countryChanges24h: number;
  vpnAssessment: {
    status: "Yes" | "No" | "Suspected" | "Unknown";
    reasons: string[];
    currentCountry: string;
  };
  currentCountry: string;
  sortedWorkers: WorkerRow[];
  onlineWorkersCount: number;
  suspiciousWorkers: WorkerRow[];
  loginIpEntry: ProcessedIpEntry | null;
  requestIpEntry: ProcessedIpEntry | null;
  loginVsRequestChanged: boolean;
  fraud: {
    overallRisk: "clean" | "suspicious" | "high_risk";
    flags: FraudFlag[];
  };
  riskEvaluation: RiskEvaluation;
  networkAlertLevel: "neutral" | "warning" | "danger";
  hashrate: {
    currentHashrate: number;
    windows: Record<WindowKey, ProcessedHashratePoint[]>;
    averages: Record<WindowKey, number>;
    peaks: Record<WindowKey, number>;
  };
  uptime: {
    uptimeHours24: number;
    uptimeHours7d: number;
    uptimeHours30d: number;
    disconnects: number;
    errorsCount: number;
    rejectRatePercent: number;
  };
  sharesCount: number;
  rejectsCount: number;
};

const WINDOWS: Record<WindowKey, { hours: number; points: number }> = {
  "1h": { hours: 1, points: 12 },
  "3h": { hours: 3, points: 18 },
  "6h": { hours: 6, points: 24 },
  "24h": { hours: 24, points: 24 },
  yesterday: { hours: 24, points: 24 },
  "3d": { hours: 72, points: 36 },
  "7d": { hours: 168, points: 42 },
  "14d": { hours: 336, points: 56 },
  "30d": { hours: 720, points: 60 },
  "60d": { hours: 1440, points: 60 },
};


function findNearestIpEntry(entries: ProcessedIpEntry[], target: Date | string | null | undefined) {
  if (!target || !entries.length) return null;
  const targetTime = new Date(target).getTime();
  if (Number.isNaN(targetTime)) return null;

  let bestEntry: ProcessedIpEntry | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const entry of entries) {
    const entryTime = new Date(entry.createdAt).getTime();
    if (Number.isNaN(entryTime)) continue;
    const distance = Math.abs(entryTime - targetTime);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestEntry = entry;
    }
  }

  return bestDistance <= 36 * 60 * 60 * 1000 ? bestEntry : null;
}

function buildFraudFlags(data: RawCashoutReviewDetailData, workers: WorkerRow[]): { overallRisk: "clean" | "suspicious" | "high_risk"; flags: FraudFlag[] } {
  const flags: FraudFlag[] = [];
  const now = Date.now();

  const recentIps = data.securityRows.filter((row) => now - new Date(row.created_at).getTime() < 24 * 3600 * 1000);
  const uniqueIps = new Set(recentIps.map((row) => normalizeIp(row.ip)).filter(Boolean)).size;
  if (uniqueIps >= 5) {
    flags.push({
      id: "frequent_ip_changes",
      label: "Frequent IP Changes",
      severity: uniqueIps >= 8 ? "high" : "medium",
      detail: `${uniqueIps} different IPs detected in the last 24 hours.`,
    });
  }

  const flappingWorkers = workers.filter(
    (worker) => worker.status === "offline" && now - new Date(worker.last_share).getTime() < 5 * 60 * 1000,
  );
  if (flappingWorkers.length > 0) {
    flags.push({
      id: "worker_flapping",
      label: "Workers Flapping",
      severity: flappingWorkers.length >= 3 ? "high" : "medium",
      detail: `${flappingWorkers.length} worker(s) went offline within the last 5 minutes.`,
    });
  }

  const onlineWorkers = workers.filter((worker) => worker.status === "online");
  const totalHashrate = onlineWorkers.reduce((sum, worker) => sum + worker.hashrate, 0);
  const avgHashrate = workers.length > 0 ? workers.reduce((sum, worker) => sum + worker.hashrate, 0) / workers.length : 0;
  if (avgHashrate > 0) {
    const ratio = totalHashrate / avgHashrate;
    if (ratio > 3) {
      flags.push({
        id: "hashrate_spike",
        label: "Sudden Hashrate Spike",
        severity: "high",
        detail: `Current hashrate is ${ratio.toFixed(1)}× above average — possible farm manipulation.`,
      });
    } else if (totalHashrate > 0 && ratio < 0.2) {
      flags.push({
        id: "hashrate_drop",
        label: "Sudden Hashrate Drop",
        severity: "medium",
        detail: `Current hashrate dropped to ${(ratio * 100).toFixed(0)}% of average.`,
      });
    }
  }

  const avgRejectRate = workers.length > 0 ? workers.reduce((sum, worker) => sum + worker.reject_rate, 0) / workers.length : 0;
  if (avgRejectRate > 0.2) {
    flags.push({
      id: "high_reject_rate",
      label: "High Share Reject Rate",
      severity: avgRejectRate > 0.5 ? "high" : "medium",
      detail: `Average reject rate across workers: ${(avgRejectRate * 100).toFixed(1)}%.`,
    });
  }

  const recentPayouts = data.payoutRows.filter(
    (row) => now - new Date(row.payout_date).getTime() < 7 * 24 * 3600 * 1000,
  );
  if (recentPayouts.length >= 5) {
    flags.push({
      id: "rapid_cashouts",
      label: "Rapid Cashout Requests",
      severity: "high",
      detail: `${recentPayouts.length} cashout requests in the last 7 days.`,
    });
  }

  if (data.profile && data.profile.pending_balance > 100 && data.profile.total_hashrate === 0) {
    flags.push({
      id: "cashout_no_mining",
      label: "Large Balance Without Active Mining",
      severity: "high",
      detail: `Pending balance: ${data.profile.pending_balance.toFixed(2)} KAS — but no active hashrate detected.`,
    });
  }

  if (data.rejectsCount > 100) {
    flags.push({
      id: "invalid_shares",
      label: "High Invalid Share Count",
      severity: data.rejectsCount > 500 ? "high" : "medium",
      detail: `${data.rejectsCount.toLocaleString()} invalid shares recorded — possible stale or forged submissions.`,
    });
  }

  const accountAgeDays = (now - new Date(data.user?.createdAt ?? now).getTime()) / (86400 * 1000);
  if (data.user && data.profile && accountAgeDays < 3 && data.profile.pending_balance > 50) {
    flags.push({
      id: "new_account_high_balance",
      label: "New Account With High Balance",
      severity: "high",
      detail: `Account is ${accountAgeDays.toFixed(1)} days old with ${data.profile.pending_balance.toFixed(2)} KAS pending.`,
    });
  }

  const overallRisk = flags.some((flag) => flag.severity === "high")
    ? "high_risk"
    : flags.length > 0
      ? "suspicious"
      : "clean";

  return { overallRisk, flags };
}

export function deriveCashoutReviewDetail(data: RawCashoutReviewDetailData, selectedPayoutId: number): BusinessCashoutReviewDetail {
  if (!data.user) {
    throw new Error("User not found");
  }

  const now = Date.now();
  const normalizedEvents = data.securityRows.slice(0, 25).map((event) => ({
    ...event,
    createdAt: event.created_at,
  }));
  const recentIpHistory = normalizeIpHistoryEvents(normalizedEvents);
  const lastIp = recentIpHistory[0]?.ip || null;
  const summary = summarizeIpHistory(recentIpHistory);
  const ipChanges24h = summary.ipChanges24h;
  const countryChanges24h = summary.countryChanges24h;
  const vpnAssessment = deriveVpnAssessment(summary.uniqueIps24h.size, countryChanges24h, lastIp);

  const sortedWorkers = [...data.workerRows].sort((a, b) => (b.hashrate || 0) - (a.hashrate || 0));
  const onlineWorkersCount = data.workerRows.filter((worker) => worker.status === "online" || worker.status === "active").length;
  const suspiciousWorkers = sortedWorkers.filter((worker) => worker.reject_rate >= 5 || worker.status === "warning");

  const paidHistory = data.payoutRows.filter((row) => row.status === "paid");
  const pendingRequest = selectedPayoutId > 0
    ? data.payoutRows.find((row) => row.id === selectedPayoutId && ["pending", "review_queue"].includes(row.status)) ?? null
    : data.payoutRows.find((row) => ["pending", "review_queue"].includes(row.status)) ?? null;
  const hasSelectedPendingRequest = selectedPayoutId > 0 ? Boolean(pendingRequest) : true;
  const totalWithdrawals = paidHistory.reduce((sum, row) => sum + row.amount, 0);
  const lastWithdrawal = paidHistory[0] ?? null;

  const loginIpEntry = findNearestIpEntry(recentIpHistory, data.lastSessionAt);
  const requestIpEntry = findNearestIpEntry(recentIpHistory, pendingRequest?.payout_date ?? null);
  const loginVsRequestChanged = Boolean(loginIpEntry?.ip && requestIpEntry?.ip && loginIpEntry.ip !== requestIpEntry.ip);

  const fraud = buildFraudFlags(data, data.workerRows);
  const recentPayoutCount7d = data.payoutRows.filter(
    (row) => now - new Date(row.payout_date).getTime() < 7 * 24 * 3600 * 1000,
  ).length;
  const accountAgeDays = (now - new Date(data.user.createdAt).getTime()) / (24 * 60 * 60 * 1000);
  const riskEvaluation = evaluateRiskSignals({
    vpnStatus: vpnAssessment.status,
    ipChanges24h,
    countryChanges24h,
    currentCountry: vpnAssessment.currentCountry,
    loginVsRequestChanged,
    workers: data.workerRows.map((worker) => ({
      status: worker.status,
      lastShare: worker.last_share,
      hashrate: worker.hashrate,
      rejectRate: worker.reject_rate,
    })),
    historyRows: data.historyRows,
    recentPayoutCount7d,
    pendingBalance: data.profile?.pending_balance ?? 0,
    totalHashrate: data.profile?.total_hashrate ?? 0,
    sharesCount: data.sharesCount,
    rejectsCount: data.rejectsCount,
    accountAgeDays,
    hasCashoutAttempt: Boolean(pendingRequest),
  });
  const flaggedIds = new Set(fraud.flags.map((flag) => flag.id));
  const currentCountry = vpnAssessment.currentCountry || recentIpHistory[0]?.country || "UNKNOWN";
  const networkAlertLevel: "neutral" | "warning" | "danger" =
    vpnAssessment.status === "Yes" || flaggedIds.has("frequent_ip_changes") || countryChanges24h >= 2
      ? "danger"
      : vpnAssessment.status === "Suspected" || ipChanges24h >= 2 || countryChanges24h >= 1
        ? "warning"
        : "neutral";

  const fallbackHashrate = data.workerRows.reduce(
    (sum, worker) => sum + (worker.status === "online" ? worker.hashrate : 0),
    0,
  );
  const currentHashrate = data.historyRows[data.historyRows.length - 1]?.hashrate ?? fallbackHashrate;
  const windows = Object.fromEntries(
    Object.entries(WINDOWS).map(([windowKey, config]) => [windowKey, buildSeries(data.historyRows, config.hours, config.points, fallbackHashrate)]),
  ) as Record<WindowKey, ProcessedHashratePoint[]>;
  const averages = Object.fromEntries(
    Object.entries(windows).map(([windowKey, points]) => [windowKey, points.length ? points.reduce((sum, point) => sum + point.hashrate, 0) / points.length : 0]),
  ) as Record<WindowKey, number>;
  const peaks = Object.fromEntries(
    Object.entries(windows).map(([windowKey, points]) => [windowKey, points.length ? Math.max(...points.map((point) => point.hashrate)) : 0]),
  ) as Record<WindowKey, number>;

  const errorsCount = data.workerRows.filter((worker) => worker.status === "error").length;
  const activeWorkers = data.workerRows.filter((worker) => now - new Date(worker.last_share).getTime() < 10 * 60 * 1000);
  const oldestShare = data.workerRows.reduce<Date | null>((oldest, worker) => {
    const date = new Date(worker.last_share);
    return oldest === null || date < oldest ? date : oldest;
  }, null);
  const ageMs = oldestShare ? now - oldestShare.getTime() : 0;
  const uptimeHours24 = Math.min(24, (ageMs / 3600000) * (activeWorkers.length / Math.max(1, data.workerRows.length)));
  const uptimeHours7d = Math.min(168, (ageMs / 3600000) * (activeWorkers.length / Math.max(1, data.workerRows.length)));
  const uptimeHours30d = Math.min(720, (ageMs / 3600000) * (activeWorkers.length / Math.max(1, data.workerRows.length)));
  const disconnects = data.workerRows.filter(
    (worker) => worker.status === "offline" && now - new Date(worker.last_share).getTime() < 7 * 24 * 3600 * 1000,
  ).length;
  const rejectRatePercent = data.sharesCount > 0 ? (data.rejectsCount / data.sharesCount) * 100 : 0;

  return {
    user: data.user,
    profile: data.profile,
    selectedPayoutId,
    lastSessionAt: data.lastSessionAt,
    pendingRequest,
    hasSelectedPendingRequest,
    paidHistory,
    totalWithdrawals,
    lastWithdrawal,
    recentIpHistory,
    lastIp,
    ipChanges24h,
    countryChanges24h,
    vpnAssessment,
    currentCountry,
    sortedWorkers,
    onlineWorkersCount,
    suspiciousWorkers,
    loginIpEntry,
    requestIpEntry,
    loginVsRequestChanged,
    fraud,
    riskEvaluation,
    networkAlertLevel,
    hashrate: {
      currentHashrate,
      windows,
      averages,
      peaks,
    },
    uptime: {
      uptimeHours24,
      uptimeHours7d,
      uptimeHours30d,
      disconnects,
      errorsCount,
      rejectRatePercent,
    },
    sharesCount: data.sharesCount,
    rejectsCount: data.rejectsCount,
  };
}
