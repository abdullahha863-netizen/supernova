import { resolveCountryCodeFromIp } from "@/lib/geoip";
import type { HistoryRow } from "@/lib/admin/cashoutReviewDetailData";
import type { VpnStatus } from "@/lib/admin/minerCashoutMonitor";

export type NormalizedIpHistoryEntry = {
  ip: string;
  country: string;
  createdAt: Date;
};

export type IpHistorySummary = {
  currentIp: string;
  currentCountry: string;
  recent24hEntries: NormalizedIpHistoryEntry[];
  uniqueIps24h: Set<string>;
  uniqueCountries24h: Set<string>;
  ipChanges24h: number;
  countryChanges24h: number;
};

export type RiskLevel = "OK" | "REVIEW" | "HIGH" | "CRITICAL";

export type RiskSignalContribution = {
  id: string;
  label: string;
  points: number;
  detail: string;
};

export type RiskEvaluation = {
  riskScore: number;
  riskLevel: RiskLevel;
  contributingSignals: RiskSignalContribution[];
};

export type RiskWorkerInput = {
  status: string;
  lastShare: Date;
  hashrate: number;
  rejectRate: number;
};

export type RiskEvaluationInput = {
  vpnStatus?: VpnStatus;
  ipChanges24h?: number;
  countryChanges24h?: number;
  currentCountry?: string;
  loginVsRequestChanged?: boolean;
  workers?: RiskWorkerInput[];
  historyRows?: HistoryRow[];
  recentPayoutCount7d?: number;
  pendingBalance?: number;
  totalHashrate?: number;
  sharesCount?: number;
  rejectsCount?: number;
  accountAgeDays?: number;
  hasCashoutAttempt?: boolean;
};

export function normalizeIp(input: string | null | undefined) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  return (raw.split(",")[0]?.trim() || "").replace(/^::ffff:/, "");
}

export function isPrivateOrLocalIp(ip: string) {
  if (!ip) return true;
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true;
  return false;
}

export function normalizeIpHistoryEvents(rows: Array<{ ip: string; createdAt: Date }>): NormalizedIpHistoryEntry[] {
  return rows.map((row) => {
    const ip = normalizeIp(row.ip);
    return {
      ip,
      country: ip ? resolveCountryCodeFromIp(ip) : "UNKNOWN",
      createdAt: row.createdAt,
    };
  });
}

export function summarizeIpHistory(entries: NormalizedIpHistoryEntry[], windowMs = 24 * 60 * 60 * 1000): IpHistorySummary {
  const nowMs = Date.now();
  const currentIp = entries[0]?.ip || "";
  const currentCountry = entries[0]?.country || "UNKNOWN";
  const recent24hEntries = entries.filter((entry) => nowMs - new Date(entry.createdAt).getTime() < windowMs);
  const uniqueIps24h = new Set(recent24hEntries.map((entry) => entry.ip).filter(Boolean));
  const uniqueCountries24h = new Set(
    recent24hEntries.map((entry) => entry.country).filter((country) => country && country !== "UNKNOWN"),
  );

  return {
    currentIp,
    currentCountry,
    recent24hEntries,
    uniqueIps24h,
    uniqueCountries24h,
    ipChanges24h: Math.max(0, uniqueIps24h.size - 1),
    countryChanges24h: Math.max(0, uniqueCountries24h.size - 1),
  };
}

export function deriveVpnStatus(uniqueIpCount24h: number, countryChangeCount: number, currentIp: string, currentCountry: string): VpnStatus {
  if (!currentIp || isPrivateOrLocalIp(currentIp)) {
    return "Unknown";
  }

  if (uniqueIpCount24h >= 8 || (uniqueIpCount24h >= 5 && countryChangeCount >= 2)) {
    return "Yes";
  }

  if (uniqueIpCount24h >= 4 || countryChangeCount >= 1 || currentCountry === "UNKNOWN") {
    return "Suspected";
  }

  return "No";
}

export function deriveVpnAssessment(uniqueIpCount24h: number, countryChangeCount: number, currentIp: string | null) {
  const normalizedIp = normalizeIp(currentIp);
  const currentCountry = resolveCountryCodeFromIp(normalizedIp);
  const reasons: string[] = [];

  if (!normalizedIp || isPrivateOrLocalIp(normalizedIp)) {
    reasons.push("Current IP is private, local, or unavailable, so VPN verification is limited.");
    return { status: "Unknown", reasons, currentCountry } as const;
  }

  if (uniqueIpCount24h >= 8) {
    reasons.push(`${uniqueIpCount24h} unique IPs were observed in the last 24 hours.`);
  }

  if (countryChangeCount >= 2) {
    reasons.push(`${countryChangeCount} country changes were detected in the last 24 hours.`);
  }

  if (currentCountry === "UNKNOWN") {
    reasons.push("Current IP country could not be resolved reliably.");
  }

  const status = deriveVpnStatus(uniqueIpCount24h, countryChangeCount, normalizedIp, currentCountry);
  return { status, reasons, currentCountry } as const;
}

export function deriveRiskScore(params: {
  vpnStatus: VpnStatus;
  ipChanges24h: number;
  countryChanges24h: number;
  currentCountry: string;
}) {
  let score = 12;

  if (params.vpnStatus === "Yes") score += 40;
  if (params.vpnStatus === "Suspected") score += 22;
  if (params.currentCountry === "UNKNOWN") score += 10;

  score += Math.min(params.ipChanges24h, 4) * 8;
  score += Math.min(params.countryChanges24h, 3) * 12;

  return Math.min(score, 100);
}

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 90) return "CRITICAL";
  if (score >= 70) return "HIGH";
  if (score >= 40) return "REVIEW";
  return "OK";
}

function clampRiskScore(score: number) {
  return Math.min(100, Math.max(0, Math.round(score)));
}

function addSignal(signals: RiskSignalContribution[], id: string, label: string, points: number, detail: string) {
  signals.push({ id, label, points, detail });
}

function normalizeRejectRateToPercent(value: number) {
  return value > 0 && value <= 1 ? value * 100 : value;
}

function hasRecentHashrateSwing(rows: HistoryRow[], windowMs = 6 * 60 * 60 * 1000) {
  const now = Date.now();
  const recent = rows
    .filter((row) => now - new Date(row.recorded_at).getTime() <= windowMs)
    .map((row) => Number(row.hashrate || 0))
    .filter((hashrate) => Number.isFinite(hashrate) && hashrate > 0);

  if (recent.length < 3) return false;

  const latest = recent[recent.length - 1];
  const previous = recent.slice(0, -1);
  const average = previous.reduce((sum, value) => sum + value, 0) / previous.length;
  if (average <= 0) return false;

  const ratio = latest / average;
  return ratio >= 3 || ratio <= 0.25;
}

export function evaluateRiskSignals(input: RiskEvaluationInput): RiskEvaluation {
  const signals: RiskSignalContribution[] = [];
  const workers = input.workers ?? [];
  const now = Date.now();
  const ipChanged = Boolean((input.ipChanges24h ?? 0) > 0 || input.loginVsRequestChanged);
  const countryChanged = (input.countryChanges24h ?? 0) > 0;

  if (ipChanged || countryChanged || input.vpnStatus === "Yes" || input.vpnStatus === "Suspected") {
    addSignal(
      signals,
      "ip_change",
      "IP change",
      10,
      `${input.ipChanges24h ?? 0} IP change(s) and ${input.countryChanges24h ?? 0} country change(s) observed recently.`,
    );
  }

  const flappingWorkers = workers.filter(
    (worker) => worker.status === "offline" && now - new Date(worker.lastShare).getTime() < 5 * 60 * 1000,
  );
  if (flappingWorkers.length > 0) {
    addSignal(signals, "device_change", "Device change", 10, `${flappingWorkers.length} worker(s) recently disconnected.`);
  }

  const avgRejectRateRaw = workers.length > 0
    ? workers.reduce((sum, worker) => sum + Number(worker.rejectRate || 0), 0) / workers.length
    : 0;
  const avgRejectRatePercent = normalizeRejectRateToPercent(avgRejectRateRaw);
  const shareRejectRatePercent = (input.sharesCount ?? 0) > 0
    ? ((input.rejectsCount ?? 0) / Math.max(1, input.sharesCount ?? 0)) * 100
    : 0;
  const highRejectRate = avgRejectRatePercent >= 20 || shareRejectRatePercent >= 20 || (input.rejectsCount ?? 0) > 500;
  if (highRejectRate) {
    addSignal(
      signals,
      "high_reject_rate",
      "High reject rate",
      25,
      `Average worker reject rate is ${avgRejectRatePercent.toFixed(1)}%; share reject rate is ${shareRejectRatePercent.toFixed(1)}%.`,
    );
  }

  const warningWorkers = workers.filter((worker) => worker.status === "warning" || worker.status === "error");
  const onlineWorkers = workers.filter((worker) => worker.status === "online" || worker.status === "active");
  const abnormalWorkers = warningWorkers.length > 0 || flappingWorkers.length >= 3 || (workers.length >= 4 && onlineWorkers.length === 0);
  if (abnormalWorkers) {
    addSignal(
      signals,
      "abnormal_workers",
      "Abnormal workers",
      20,
      `${warningWorkers.length} warning/error worker(s), ${onlineWorkers.length}/${workers.length} online.`,
    );
  }

  const totalOnlineHashrate = onlineWorkers.reduce((sum, worker) => sum + Number(worker.hashrate || 0), 0);
  const avgWorkerHashrate = workers.length > 0
    ? workers.reduce((sum, worker) => sum + Number(worker.hashrate || 0), 0) / workers.length
    : 0;
  const workerHashrateSwing = avgWorkerHashrate > 0 && (totalOnlineHashrate / avgWorkerHashrate > 3 || totalOnlineHashrate / avgWorkerHashrate < 0.2);
  const hashrateSwing = workerHashrateSwing || hasRecentHashrateSwing(input.historyRows ?? []);
  if (hashrateSwing) {
    addSignal(signals, "hashrate_swing", "Sudden hashrate spike/drop", 15, "Recent hashrate moved sharply away from the miner baseline.");
  }

  if ((input.recentPayoutCount7d ?? 0) >= 5) {
    addSignal(signals, "too_many_cashouts", "Too many cashouts", 20, `${input.recentPayoutCount7d} cashout request(s) in the last 7 days.`);
  }

  const illogicalCashout = Boolean(
    ((input.pendingBalance ?? 0) > 100 && (input.totalHashrate ?? 0) === 0) ||
    ((input.accountAgeDays ?? Number.POSITIVE_INFINITY) < 3 && (input.pendingBalance ?? 0) > 50),
  );
  if (illogicalCashout) {
    addSignal(signals, "illogical_cashout", "Illogical cashout", 30, "Cashout pattern does not match recent mining activity or account age.");
  }

  if (highRejectRate && hashrateSwing) {
    addSignal(signals, "correlation_reject_hashrate", "High reject rate + hashrate spike", 10, "Reject behavior and hashrate movement appeared together.");
  }

  if (ipChanged && input.hasCashoutAttempt) {
    addSignal(signals, "correlation_ip_cashout", "IP change + cashout attempt", 15, "Cashout was attempted after recent origin changes.");
  }

  const riskScore = clampRiskScore(signals.reduce((sum, signal) => sum + signal.points, 0));
  return {
    riskScore,
    riskLevel: getRiskLevel(riskScore),
    contributingSignals: signals,
  };
}

export function buildSeries(rows: HistoryRow[], hours: number, points: number, fallbackHashrate: number): { ts: Date; hashrate: number }[] {
  const now = Date.now();
  const windowMs = hours * 60 * 60 * 1000;
  const since = now - windowMs;
  const relevant = rows.filter((row) => new Date(row.recorded_at).getTime() >= since);

  if (relevant.length === 0) {
    return fallbackHashrate > 0 ? [{ ts: new Date(now), hashrate: fallbackHashrate }] : [];
  }

  const bucketMs = Math.max(1, Math.floor(windowMs / points));
  const buckets = new Map<number, { sum: number; count: number; lastTs: number }>();

  for (const row of relevant) {
    const ts = new Date(row.recorded_at).getTime();
    const bucketIndex = Math.min(points - 1, Math.max(0, Math.floor((ts - since) / bucketMs)));
    const current = buckets.get(bucketIndex) ?? { sum: 0, count: 0, lastTs: ts };
    current.sum += Number(row.hashrate || 0);
    current.count += 1;
    current.lastTs = Math.max(current.lastTs, ts);
    buckets.set(bucketIndex, current);
  }

  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, bucket]) => ({
      ts: new Date(bucket.lastTs),
      hashrate: Number((bucket.sum / Math.max(1, bucket.count)).toFixed(4)),
    }));
}
