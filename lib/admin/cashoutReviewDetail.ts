export type UiTone = "neutral" | "success" | "warning" | "danger" | "critical";

export type WindowKey = "1h" | "3h" | "6h" | "24h" | "yesterday" | "3d" | "7d" | "14d" | "30d" | "60d";

export type DetailBadge = {
  label: string;
  tone: UiTone;
};

export type DetailStat = {
  label: string;
  value: string;
  sub?: string;
};

export type HashratePointView = {
  ts: string;
  tsLabel: string;
  hashrate: number;
  hashrateDisplay: string;
};

export type HashrateWindowView = {
  headline: string;
  currentDisplay: string;
  averageDisplay: string;
  peakDisplay: string;
  points: HashratePointView[];
  emptyMessage: string;
};

export type WorkerRowView = {
  id: number;
  name: string;
  hashrateDisplay: string;
  status: string;
  statusTone: UiTone;
  lastShareLabel: string;
  rejectRateDisplay: string;
};

export type IpHistoryRowView = {
  observedAtLabel: string;
  ip: string;
  country: string;
  signalLabel: string;
  signalTone: UiTone;
};

export type FraudIndicatorView = {
  label: string;
  statusLabel: string;
  detail: string;
  tone: UiTone;
  points?: number;
  severity?: "low" | "medium" | "high" | "critical";
};

export type RiskSummaryView = {
  riskScore: number;
  riskLevel: string;
  reasons: string[];
  contributingSignals: FraudIndicatorView[];
};

export type CashoutReviewDetailPayload = {
  ok: boolean;
  data?: {
    pageTitle: string;
    topBarBadges: DetailBadge[];
    heroBadges: DetailBadge[];
    identity: {
      name: string;
      email: string;
      id: string;
      tier: string;
    };
    heroMetrics: DetailStat[];
    networkAlert?: {
      tone: "warning" | "danger";
      message: string;
    };
    overviewStats: DetailStat[];
    missingSelectedRequestMessage?: string;
    minerProfileStats: DetailStat[];
    ipReview: {
      stats: DetailStat[];
      reviewSignalText: string;
      vpnHeuristicText: string;
      loginVsCashoutText: string;
      vpnNotes: string[];
      comparisonStats: DetailStat[];
      historyRows: IpHistoryRowView[];
      emptyHistoryMessage: string;
    };
    cashoutReviewStats: DetailStat[];
    hashrate: {
      currentDisplay: string;
      windows: Record<WindowKey, HashrateWindowView>;
    } | null;
    workers: {
      summaryStats: DetailStat[];
      rows: WorkerRowView[];
      emptyMessage: string;
    };
    uptime: {
      stats: DetailStat[];
    } | null;
    rejectError: {
      stats: DetailStat[];
      reviewSignalText: string;
      workerWarningText: string;
    } | null;
    antiFraud: {
      rows: FraudIndicatorView[];
      riskSummary: RiskSummaryView;
    } | null;
    actionContext: {
      minerId: string;
      pendingPayoutId: number | null;
      hasSelectedPendingRequest: boolean;
    };
  };
  error?: string;
};
