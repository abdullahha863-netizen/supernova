import type {
  CashoutReviewMinerGroup,
  CashoutReviewListRow,
  CashoutReviewPayload,
  ListBadgeTone,
  VpnStatus,
} from "@/lib/admin/minerCashoutMonitor";
import type {
  CashoutReviewListBusinessResult,
  ComputedCashoutReviewListRow,
} from "@/lib/admin/cashoutReviewListBusiness";

function getRiskTone(score: number): ListBadgeTone {
  if (score >= 90) return "critical";
  if (score >= 70) return "danger";
  if (score >= 40) return "warn";
  return "safe";
}

function getRiskLevelLabel(level: string) {
  return level === "HIGH" ? "HIGH RISK" : level;
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

function mapCashoutReviewListRow(row: ComputedCashoutReviewListRow): CashoutReviewListRow {
  return {
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
    riskLevel: row.riskLevel,
    contributingSignals: row.contributingSignals,
    requestedAtLabel: formatDate(row.payoutDate),
    payoutAmountLabel: formatNumber(row.payoutAmount),
    riskLabel: `${Math.round(row.riskScore)}/100`,
    riskLevelLabel: getRiskLevelLabel(row.riskLevel),
    reasons: row.contributingSignals.map((signal) => signal.label),
    riskTone: getRiskTone(row.riskScore),
    vpnTone: getVpnTone(row.vpnStatus),
    locationLabel: `${row.country} / ${row.currentIp || "-"}`,
    sourceLabel: row.sourceLabel,
  };
}

function resolveGroupedRequest(
  request: ComputedCashoutReviewListRow,
  rowByPayoutId: Map<number, CashoutReviewListRow>,
): CashoutReviewListRow {
  const mappedRequest = rowByPayoutId.get(request.payoutId);
  if (mappedRequest) return mappedRequest;

  if (process.env.NODE_ENV === "development") {
    console.warn("Cashout review group request missing from row map", {
      payoutId: request.payoutId,
      minerId: request.minerId,
    });
  }

  return mapCashoutReviewListRow(request);
}

function findHighestRiskRequest(requests: CashoutReviewListRow[]) {
  if (requests.length === 0) return undefined;

  return requests.slice().sort((a, b) => {
    const riskDelta = b.riskScore - a.riskScore;
    if (riskDelta !== 0) return riskDelta;
    const bPayoutTime = new Date(b.payoutDate).getTime();
    const aPayoutTime = new Date(a.payoutDate).getTime();
    return bPayoutTime - aPayoutTime;
  })[0];
}

export function mapCashoutReviewListToPayload(business: CashoutReviewListBusinessResult): CashoutReviewPayload {
  const rowByPayoutId = new Map<number, CashoutReviewListRow>();
  const rows: CashoutReviewListRow[] = business.rows.map((row) => {
    const mappedRow = mapCashoutReviewListRow(row);
    rowByPayoutId.set(row.payoutId, mappedRow);
    return mappedRow;
  });

  const minerGroups: CashoutReviewMinerGroup[] = business.minerGroups.map((group) => {
    const requests = group.requests.map((request) => resolveGroupedRequest(request, rowByPayoutId));
    const highestRiskRequest = findHighestRiskRequest(requests);
    const highestRiskScore = highestRiskRequest?.riskScore ?? 0;
    const highestRiskLevel = highestRiskRequest?.riskLevel ?? "OK";

    if (process.env.NODE_ENV === "development" && group.highestRiskScore < highestRiskScore) {
      console.warn("Cashout review group risk lower than visible request risk", {
        minerId: group.minerId,
        groupHighestRiskScore: group.highestRiskScore,
        visibleHighestRiskScore: highestRiskScore,
        payoutId: highestRiskRequest?.payoutId,
      });
    }

    return {
      minerId: group.minerId,
      minerName: group.minerName,
      minerEmail: group.minerEmail,
      highestRiskScore,
      highestRiskLevel,
      highestRiskLabel: `${Math.round(highestRiskScore)}/100`,
      highestRiskLevelLabel: getRiskLevelLabel(highestRiskLevel),
      highestRiskTone: getRiskTone(highestRiskScore),
      openRequestCount: group.openRequestCount,
      openRequestCountLabel: `${group.openRequestCount} open ${group.openRequestCount === 1 ? "request" : "requests"}`,
      totalRequestedAmount: group.totalRequestedAmount,
      totalRequestedAmountLabel: formatNumber(group.totalRequestedAmount),
      newestPayoutDate: group.newestPayoutDate,
      newestPayoutLabel: formatDate(group.newestPayoutDate),
      requests,
    };
  }).sort((a, b) => {
    const riskDelta = b.highestRiskScore - a.highestRiskScore;
    if (riskDelta !== 0) return riskDelta;
    return new Date(b.newestPayoutDate).getTime() - new Date(a.newestPayoutDate).getTime();
  });

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
    minerGroups,
  };
}
