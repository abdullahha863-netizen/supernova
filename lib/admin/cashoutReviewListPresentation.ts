import type {
  CashoutReviewListRow,
  CashoutReviewPayload,
  ListBadgeTone,
  VpnStatus,
} from "@/lib/admin/minerCashoutMonitor";
import type { CashoutReviewListBusinessResult } from "@/lib/admin/cashoutReviewListBusiness";

function getRiskTone(score: number): ListBadgeTone {
  if (score >= 70) return "danger";
  if (score >= 40) return "warn";
  return "safe";
}

function getVpnTone(status: VpnStatus): ListBadgeTone {
  if (status === "No") return "safe";
  if (status === "Suspected") return "warn";
  if (status === "Yes") return "danger";
  return "neutral";
}

function formatDate(value: string) {
  return `Requested ${new Date(value).toLocaleString()}`;
}

function formatNumber(amount: number) {
  return `${amount.toFixed(2)} KAS`;
}

export function mapCashoutReviewListToPayload(business: CashoutReviewListBusinessResult): CashoutReviewPayload {
  const rows: CashoutReviewListRow[] = business.rows.map((row) => ({
    payoutId: row.payoutId,
    minerId: row.minerId,
    minerName: row.minerName,
    minerEmail: row.minerEmail,
    payoutAmount: row.payoutAmount,
    payoutDate: row.payoutDate,
    currentIp: row.currentIp,
    country: row.country,
    vpnStatus: row.vpnStatus,
    riskScore: row.riskScore,
    requestedAtLabel: formatDate(row.payoutDate),
    payoutAmountLabel: formatNumber(row.payoutAmount),
    riskLabel: `${Math.round(row.riskScore)}/100`,
    riskTone: getRiskTone(row.riskScore),
    vpnTone: getVpnTone(row.vpnStatus),
    locationLabel: `${row.country} / ${row.currentIp || "—"}`,
    sourceLabel: row.sourceLabel,
  }));

  return {
    ok: true,
    enabled: true,
    mode: "live",
    summary: {
      requestsCount: business.requestsCount,
      highRiskCount: business.highRiskCount,
      pendingAmount: business.pendingAmount,
      requestsLabel: String(business.requestsCount),
      highRiskLabel: String(business.highRiskCount),
      pendingAmountLabel: `${business.pendingAmount.toFixed(2)} KAS`,
    },
    queueState: {
      title: "Connected to pending requests",
      description: "Open the details page for any miner to review hashrate history, fraud signals, and approve or reject the cashout request.",
    },
    rows,
  };
}
