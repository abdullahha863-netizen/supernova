export type CashoutRequestApiRow = {
  payoutId: number;
  userId: string;
  name: string;
  email: string;
  amount: number;
  payoutDate: string;
  status: string;
};

export type VpnStatus = "Yes" | "No" | "Suspected" | "Unknown";

export type ListBadgeTone = "safe" | "warn" | "danger" | "neutral";

export type CashoutReviewListRow = {
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
  requestedAtLabel: string;
  payoutAmountLabel: string;
  riskLabel: string;
  riskTone: ListBadgeTone;
  vpnTone: ListBadgeTone;
  locationLabel: string;
  sourceLabel: "live";
};

export type CashoutReviewPayload = {
  ok: boolean;
  enabled: boolean;
  mode: "live" | "unavailable";
  summary: {
    requestsCount: number;
    highRiskCount: number;
    pendingAmount: number;
    requestsLabel: string;
    highRiskLabel: string;
    pendingAmountLabel: string;
  };
  queueState: {
    title: string;
    description: string;
  };
  rows: CashoutReviewListRow[];
  error?: string;
};

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

export function buildCashoutReviewPayload(
  rows: CashoutReviewListRow[],
  options: Pick<CashoutReviewPayload, "ok" | "enabled" | "mode"> & { error?: string },
): CashoutReviewPayload {
  const requestsCount = rows.length;
  const highRiskCount = rows.filter((row) => row.riskScore >= 70).length;
  const pendingAmount = rows.reduce((sum, row) => sum + row.payoutAmount, 0);

  return {
    ok: options.ok,
    enabled: options.enabled,
    mode: options.mode,
    summary: {
      requestsCount,
      highRiskCount,
      pendingAmount,
      requestsLabel: String(requestsCount),
      highRiskLabel: String(highRiskCount),
      pendingAmountLabel: `${pendingAmount.toFixed(2)} KAS`,
    },
    queueState: {
      title: options.mode === "unavailable"
          ? "Cashout review is unavailable"
          : "Connected to pending requests",
      description: options.mode === "unavailable"
          ? options.error || "Cashout review data could not be loaded."
          : "Open the details page for any miner to review hashrate history, fraud signals, and approve or reject the cashout request.",
    },
    rows,
    error: options.error,
  };
}

export function buildMinerCashoutMonitorFallbackRows() {
  return [];
}

export function buildMinerCashoutMonitorFallbackPayload(error?: string) {
  return buildCashoutReviewPayload(buildMinerCashoutMonitorFallbackRows(), {
    ok: false,
    enabled: false,
    mode: "unavailable",
    error: error || "Cashout review data is unavailable.",
  });
}
