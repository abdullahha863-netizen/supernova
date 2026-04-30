import type { VpnStatus } from "@/lib/admin/minerCashoutMonitor";
import type { RawCashoutReviewListData, SecurityEventRow } from "@/lib/admin/cashoutReviewListData";
import {
  deriveRiskScore,
  deriveVpnStatus,
  normalizeIpHistoryEvents,
  summarizeIpHistory,
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
  sourceLabel: "live";
};

export type CashoutReviewListBusinessResult = {
  rows: ComputedCashoutReviewListRow[];
  requestsCount: number;
  highRiskCount: number;
  pendingAmount: number;
};

export function deriveCashoutReviewList(data: RawCashoutReviewListData): CashoutReviewListBusinessResult {
  const groupedEvents = new Map<string, SecurityEventRow[]>();

  for (const event of data.securityRows) {
    const existing = groupedEvents.get(event.userId) ?? [];
    existing.push(event);
    groupedEvents.set(event.userId, existing);
  }

  const rows = data.rows.map((row) => {
    const userEvents = groupedEvents.get(row.userId) ?? [];
    const normalizedEvents = normalizeIpHistoryEvents(userEvents);
    const summary = summarizeIpHistory(normalizedEvents);
    const vpnStatus = deriveVpnStatus(summary.uniqueIps24h.size, summary.countryChanges24h, summary.currentIp, summary.currentCountry);
    const riskScore = deriveRiskScore({
      vpnStatus,
      ipChanges24h: summary.ipChanges24h,
      countryChanges24h: summary.countryChanges24h,
      currentCountry: summary.currentCountry,
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
      riskScore,
      sourceLabel: "live" as const,
    };
  });

  const requestsCount = rows.length;
  const highRiskCount = rows.filter((row) => row.riskScore >= 70).length;
  const pendingAmount = rows.reduce((sum, row) => sum + row.payoutAmount, 0);

  return {
    rows,
    requestsCount,
    highRiskCount,
    pendingAmount,
  };
}
