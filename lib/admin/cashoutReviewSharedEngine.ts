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
