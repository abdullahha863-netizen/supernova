import type {
  CashoutReviewDetailPayload,
  DetailBadge,
  DetailStat,
  FraudIndicatorView,
  HashrateWindowView,
  IpHistoryRowView,
  UiTone,
  WindowKey,
  WorkerRowView,
} from "@/lib/admin/cashoutReviewDetail";
import type { BusinessCashoutReviewDetail } from "@/lib/admin/cashoutReviewDetailBusiness";

const INDICATORS = [
  { id: "frequent_ip_changes", label: "IP changes" },
  { id: "worker_flapping", label: "Device changes" },
  { id: "hashrate_spike", label: "Sudden hashrate spike" },
  { id: "hashrate_drop", label: "Sudden hashrate drop" },
  { id: "rapid_cashouts", label: "Too many cashouts" },
  { id: "cashout_no_mining", label: "Illogical cashout" },
  { id: "high_reject_rate", label: "Abnormal workers" },
  { id: "invalid_shares", label: "Illogical shares" },
] as const;

function formatDate(value: Date | string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "—";
}

function formatNumber(value: number, decimals = 2) {
  return Number(value || 0).toFixed(decimals);
}

function toneFromRisk(overallRisk: string | null | undefined): UiTone {
  if (overallRisk === "high_risk") return "danger";
  if (overallRisk === "suspicious") return "warning";
  if (overallRisk === "clean") return "success";
  return "neutral";
}

function toneFromPayoutStatus(status: string | null | undefined): UiTone {
  if (!status) return "neutral";
  if (status === "pending") return "warning";
  if (status === "paid") return "success";
  return "danger";
}

function toneFromVpn(status: string | null | undefined): UiTone {
  if (status === "Yes") return "danger";
  if (status === "Suspected") return "warning";
  if (status === "No") return "success";
  return "neutral";
}

function toneFromWorkerStatus(status: string): UiTone {
  const normalized = String(status || "unknown").toLowerCase();
  if (normalized === "online" || normalized === "active") return "success";
  if (normalized === "warning") return "warning";
  return "neutral";
}

export function mapCashoutReviewDetailToPayload(detail: BusinessCashoutReviewDetail): CashoutReviewDetailPayload {
  const topRiskTone = toneFromRisk(detail.fraud.overallRisk);
  const payoutTone = toneFromPayoutStatus(detail.pendingRequest?.status);

  const topBarBadges: DetailBadge[] = [
    {
      label: detail.pendingRequest ? `Request #${detail.pendingRequest.id}` : "No Pending Request",
      tone: detail.pendingRequest ? "warning" : "neutral",
    },
    { label: detail.fraud.overallRisk.replace("_", " "), tone: topRiskTone },
    { label: detail.pendingRequest?.status || "no status", tone: payoutTone },
  ];

  const heroBadges: DetailBadge[] = [
    { label: detail.fraud.overallRisk.replace("_", " "), tone: topRiskTone },
    {
      label: detail.pendingRequest ? `Request #${detail.pendingRequest.id}` : "No Pending Request",
      tone: detail.pendingRequest ? "warning" : "neutral",
    },
    { label: detail.pendingRequest?.status || "no status", tone: payoutTone },
    { label: detail.currentCountry, tone: detail.currentCountry === "UNKNOWN" ? "warning" : "neutral" },
    { label: `VPN ${detail.vpnAssessment.status}`, tone: toneFromVpn(detail.vpnAssessment.status) },
  ];

  const heroMetrics: DetailStat[] = [
    {
      label: "Pending Balance",
      value: `${formatNumber(detail.profile?.pending_balance ?? 0)} KAS`,
      sub: "Current miner balance available for payout",
    },
    {
      label: "Requested Amount",
      value: `${formatNumber(detail.pendingRequest?.amount ?? 0)} KAS`,
      sub: formatDate(detail.pendingRequest?.payout_date ?? null),
    },
    {
      label: "Workers Online",
      value: `${detail.onlineWorkersCount}/${detail.sortedWorkers.length}`,
      sub: `${formatNumber(detail.profile?.total_hashrate ?? 0)} MH/s total`,
    },
    {
      label: "Primary Flag",
      value: detail.fraud.flags[0]?.label || detail.currentCountry,
      sub: detail.fraud.flags[0]?.detail || `Current observed country: ${detail.currentCountry}`,
    },
  ];

  const overviewStats: DetailStat[] = [
    {
      label: "Selected Request",
      value: detail.selectedPayoutId > 0 ? `#${detail.selectedPayoutId}` : "Auto",
      sub: detail.selectedPayoutId > 0 ? "Manually chosen payout" : "Latest pending payout",
    },
    { label: "Pending Balance", value: `${formatNumber(detail.profile?.pending_balance ?? 0)} KAS` },
    { label: "Reward Flow", value: `${formatNumber(detail.profile?.reward_flow ?? 0)} KAS` },
    {
      label: "Workers",
      value: String(detail.sortedWorkers.length),
      sub: `${formatNumber(detail.profile?.total_hashrate ?? 0)} MH/s total`,
    },
  ];

  const minerProfileStats: DetailStat[] = [
    { label: "Name", value: detail.user.name },
    { label: "Email", value: detail.user.email },
    { label: "ID", value: detail.user.id },
    { label: "Upgrade Tier", value: detail.profile?.plan ?? "Starter" },
    { label: "Last IP", value: detail.lastIp ?? "—" },
    { label: "Last Login", value: formatDate(detail.lastSessionAt) },
  ];

  const ipStats: DetailStat[] = [
    { label: "Current IP", value: detail.lastIp ?? "—" },
    { label: "Current Country", value: detail.currentCountry, sub: "Resolved from the latest observed IP" },
    {
      label: "VPN Status",
      value: detail.vpnAssessment.status,
      sub: "Derived from IP churn, country churn, and geo consistency",
    },
    { label: "IP Changes 24h", value: String(detail.ipChanges24h), sub: "Unique IP count minus the current origin" },
    { label: "Country Changes 24h", value: String(detail.countryChanges24h), sub: "Derived from geo lookup on recent IPs" },
  ];

  const historyRows: IpHistoryRowView[] = detail.recentIpHistory.map((entry, index) => ({
    observedAtLabel: formatDate(entry.createdAt),
    ip: entry.ip || "—",
    country: entry.country || "UNKNOWN",
    signalLabel: index === 0 ? "Latest" : entry.ip !== detail.recentIpHistory[0]?.ip ? "IP Changed" : "Same IP",
    signalTone: index === 0 ? "neutral" : entry.ip !== detail.recentIpHistory[0]?.ip ? "warning" : "success",
  }));

  const comparisonStats: DetailStat[] = [
    {
      label: "Last Login IP",
      value: detail.loginIpEntry?.ip ?? "—",
      sub: detail.loginIpEntry ? `${detail.loginIpEntry.country} / ${formatDate(detail.loginIpEntry.createdAt)}` : "Nearest observed IP around the last login time",
    },
    {
      label: "Cashout-Time IP",
      value: detail.requestIpEntry?.ip ?? "—",
      sub: detail.requestIpEntry ? `${detail.requestIpEntry.country} / ${formatDate(detail.requestIpEntry.createdAt)}` : "Nearest observed IP around the selected payout time",
    },
    {
      label: "Origin Comparison",
      value: detail.loginVsRequestChanged ? "Different Origin" : detail.loginIpEntry && detail.requestIpEntry ? "Same Origin" : "Insufficient Data",
      sub: "Comparison between last login origin and payout-time observed origin",
    },
  ];

  const cashoutReviewStats: DetailStat[] = [
    { label: "Requested Amount", value: `${formatNumber(detail.pendingRequest?.amount ?? 0)} KAS` },
    { label: "Request Date", value: formatDate(detail.pendingRequest?.payout_date ?? null) },
    { label: "Request Status", value: detail.pendingRequest?.status ?? "No pending request" },
    { label: "Previous Cashouts Count", value: String(detail.paidHistory.length) },
    { label: "Total Cashouts", value: `${formatNumber(detail.totalWithdrawals)} KAS` },
    {
      label: "Last Cashout",
      value: detail.lastWithdrawal ? `${formatNumber(detail.lastWithdrawal.amount)} KAS` : "—",
      sub: detail.lastWithdrawal ? formatDate(detail.lastWithdrawal.payout_date) : undefined,
    },
  ];

  const windowKeys: WindowKey[] = ["1h", "3h", "6h", "24h", "yesterday", "3d", "7d", "14d", "30d", "60d"];
  const hashrateWindows = Object.fromEntries(
    windowKeys.map((windowKey) => {
      const sourceWindowKey = windowKey === "yesterday"
        ? "24h"
        : windowKey === "60d"
          ? "30d"
          : windowKey;
      const points = detail.hashrate.windows[sourceWindowKey as WindowKey] ?? [];
      const average = detail.hashrate.averages[sourceWindowKey as WindowKey] ?? 0;
      const peak = detail.hashrate.peaks[sourceWindowKey as WindowKey] ?? 0;

      const entry: HashrateWindowView = {
        headline: `Last ${windowKey}`,
        currentDisplay: `${formatNumber(detail.hashrate.currentHashrate)} MH/s live`,
        averageDisplay: `${formatNumber(average)} MH/s`,
        peakDisplay: `${formatNumber(peak)} MH/s`,
        points: points.map((point) => ({
          ts: point.ts.toISOString(),
          tsLabel: formatDate(point.ts),
          hashrate: point.hashrate,
          hashrateDisplay: `${formatNumber(point.hashrate)} MH/s`,
        })),
        emptyMessage: "No hashrate points available for this time window.",
      };

      return [windowKey, entry];
    }),
  ) as Record<WindowKey, HashrateWindowView>;

  const workersSummaryStats: DetailStat[] = [
    { label: "Total Workers", value: String(detail.sortedWorkers.length) },
    { label: "Online Workers", value: String(detail.onlineWorkersCount) },
    { label: "Warning Workers", value: String(detail.suspiciousWorkers.length) },
    { label: "Total Hashrate", value: `${formatNumber(detail.profile?.total_hashrate ?? 0)} MH/s` },
  ];

  const workerRows: WorkerRowView[] = detail.sortedWorkers.map((worker) => ({
    id: worker.id,
    name: worker.name,
    hashrateDisplay: `${formatNumber(worker.hashrate)} MH/s`,
    status: worker.status,
    statusTone: toneFromWorkerStatus(worker.status),
    lastShareLabel: formatDate(worker.last_share),
    rejectRateDisplay: `${formatNumber(worker.reject_rate, 2)}%`,
  }));

  const rejectErrorStats: DetailStat[] = [
    { label: "Total Shares", value: String(detail.sharesCount) },
    { label: "Rejected Shares", value: String(detail.rejectsCount) },
    { label: "Reject Rate", value: `${formatNumber(detail.uptime.rejectRatePercent, 2)}%` },
    { label: "Runtime Errors", value: String(detail.uptime.errorsCount) },
  ];

  const overallRiskScore = detail.fraud.overallRisk === "high_risk"
    ? 70
    : detail.fraud.overallRisk === "suspicious"
      ? 40
      : 0;

  const antiFraudRows: FraudIndicatorView[] = INDICATORS.map((indicator) => {
    const matchingFlag = detail.fraud.flags.find((flag) => flag.id === indicator.id);
    const statusLabel = !matchingFlag
      ? "ok"
      : overallRiskScore >= 70
        ? "critical"
        : "flagged";

    return {
      label: indicator.label,
      statusLabel,
      detail: matchingFlag?.detail ?? "No abnormal signal detected.",
      tone: matchingFlag ? "danger" : "success",
    };
  });

  return {
    ok: true,
    data: {
      pageTitle: `Miner Cashout: ${detail.user.name}`,
      topBarBadges,
      heroBadges,
      identity: {
        name: detail.user.name,
        email: detail.user.email,
        id: detail.user.id,
        tier: detail.profile?.plan ?? "Starter",
      },
      heroMetrics,
      networkAlert: detail.networkAlertLevel === "danger"
        ? {
            tone: "danger",
            message: `Network risk is directly contributing to this review: VPN ${detail.vpnAssessment.status}, ${detail.ipChanges24h} IP changes, and ${detail.countryChanges24h} country changes in the last 24 hours.`,
          }
        : detail.networkAlertLevel === "warning"
          ? {
              tone: "warning",
              message: `Network review needs attention: ${detail.ipChanges24h} IP changes and ${detail.countryChanges24h} country changes were observed recently.`,
            }
          : undefined,
      overviewStats,
      missingSelectedRequestMessage: !detail.hasSelectedPendingRequest
        ? "Selected payout request was not found or is no longer pending. Cashout actions are disabled."
        : undefined,
      minerProfileStats,
      ipReview: {
        stats: ipStats,
        reviewSignalText: detail.ipChanges24h >= 2
          ? `Miner used ${detail.ipChanges24h + 1} different IPs in the last 24 hours.`
          : "No major IP churn detected in the last 24 hours.",
        vpnHeuristicText: detail.vpnAssessment.status === "Suspected"
          ? "Recent IP and country changes make VPN or proxy usage suspicious."
          : detail.vpnAssessment.status === "Yes"
            ? "IP churn and cross-country movement are strong enough to treat VPN or proxy usage as confirmed for review purposes."
            : detail.vpnAssessment.status === "No"
              ? "No strong VPN or proxy signal was detected from recent IP history."
              : "VPN status could not be determined from available login and security event history.",
        loginVsCashoutText: detail.loginIpEntry && detail.requestIpEntry
          ? detail.loginVsRequestChanged
            ? "Last login IP and the nearest observed IP at cashout time do not match."
            : "Last login origin and cashout-time observed origin are aligned."
          : "Not enough timed IP observations to compare login and request origin reliably.",
        vpnNotes: detail.vpnAssessment.reasons,
        comparisonStats,
        historyRows,
        emptyHistoryMessage: "No recent IP history found in security events for this miner.",
      },
      cashoutReviewStats,
      hashrate: {
        currentDisplay: `${formatNumber(detail.hashrate.currentHashrate)} MH/s live`,
        windows: hashrateWindows,
      },
      workers: {
        summaryStats: workersSummaryStats,
        rows: workerRows,
        emptyMessage: "No worker records available for this miner.",
      },
      uptime: {
        stats: [
          { label: "Last 24h", value: `${formatNumber(detail.uptime.uptimeHours24, 1)} hrs` },
          { label: "Last Week", value: `${formatNumber(detail.uptime.uptimeHours7d, 1)} hrs` },
          { label: "Last Month", value: `${formatNumber(detail.uptime.uptimeHours30d, 1)} hrs` },
          { label: "Disconnects", value: String(detail.uptime.disconnects) },
          { label: "Rejects", value: String(detail.rejectsCount) },
          { label: "Errors", value: String(detail.uptime.errorsCount) },
        ],
      },
      rejectError: {
        stats: rejectErrorStats,
        reviewSignalText: detail.uptime.rejectRatePercent >= 5
          ? "Reject rate is elevated and should be reviewed before approving payout."
          : "Reject rate is within a normal band for current share volume.",
        workerWarningText: detail.suspiciousWorkers.length > 0
          ? `${detail.suspiciousWorkers.length} worker(s) show warning status or elevated reject rate.`
          : "No workers currently show elevated reject behavior.",
      },
      antiFraud: {
        rows: antiFraudRows,
      },
      actionContext: {
        minerId: detail.user.id,
        pendingPayoutId: detail.pendingRequest?.id ?? null,
        hasSelectedPendingRequest: detail.hasSelectedPendingRequest,
      },
    },
  };
}
