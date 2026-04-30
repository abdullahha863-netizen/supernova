"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DroneGraphic from "@/components/ui/DroneGraphic";

type DashboardOverview = {
  plan: "Starter" | "Silver" | "Hash Pro" | "Titan Elite";
  payoutSettings: {
    payoutAddress: string;
    minPayout: number;
  };
  summary: {
    totalHashrate: string;
    pendingBalance: string;
    rewardFlow: string;
    onlineWorkers: number;
    totalWorkers: number;
  };
  workers: Array<{
    id: string;
    name: string;
    description: string;
    hashrate: string;
    status: "online" | "offline" | "warning";
    lastShare: string;
    rejectRate: string;
    createdAt: string;
  }>;
  payouts: Array<{
    id: string;
    date: string;
    amount: string;
    status: "paid" | "pending";
    tx: string;
  }>;
  security: {
    emergencyLocked: boolean;
    lockoutUntil: string | null;
    hasPinConfigured: boolean;
    pinResetLockoutUntil: string | null;
    pinResetRecoveryUntil: string | null;
  };
  memberCard: {
    checkoutIntentId: string;
    tier: "Silver" | "Hash Pro" | "Titan Elite";
    label: string;
    status: "queued" | "in_production" | "shipped" | "delivered";
    shipping: {
      fullName: string;
      email: string;
      phone: string;
      line1: string;
      line2: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    carrier: string;
    trackingNumber: string;
    trackingUrl: string;
    notes: string;
    estimatedDelivery: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
};

type MemberCardStatus = NonNullable<DashboardOverview["memberCard"]>["status"];
type HashrateWindow = "1h" | "24h" | "7d";
type HashrateHistoryPoint = {
  ts: string;
  hashrate: number;
};
type HashrateHistoryResponse = {
  ok?: boolean;
  points?: HashrateHistoryPoint[];
  stats?: {
    current?: number;
    average?: number;
    peak?: number;
    lastUpdated?: string | null;
  };
  error?: string;
};
type AlertItem = {
  id: string;
  type: string;
  message: string;
  severity: "high" | "medium" | "low";
  createdAt: string;
};
type AlertsResponse = {
  ok?: boolean;
  alerts?: AlertItem[];
  error?: string;
};
type MetalCardPrivilegeStatus = {
  ok?: boolean;
  hasActiveMetalCard?: boolean;
  card?: {
    metalCardId: string;
    tier: string;
    status: string;
    activatedAt: string | null;
  } | null;
  error?: string;
};
type PoolFeeStatus = {
  ok?: boolean;
  baseFee?: number;
  discount?: number;
  effectiveFee?: number;
  source?: "metal_card" | "base";
  error?: string;
};
type PayoutPriorityStatus = {
  ok?: boolean;
  priority?: "standard" | "priority" | "high_priority" | "vip";
  label?: string;
  estimatedReview?: string;
  cardTier?: string | null;
  source?: "metal_card" | "base";
  error?: string;
};
type SmartLimitsStatus = {
  ok?: boolean;
  maxWorkers?: number;
  apiTier?: "standard" | "enhanced" | "pro" | "elite";
  monitoring?: "basic" | "priority" | "advanced" | "vip";
  label?: string;
  cardTier?: string | null;
  source?: "metal_card" | "base";
  error?: string;
};
type WorkerLimitsStatus = {
  ok?: boolean;
  currentWorkers?: number;
  maxWorkers?: number;
  canCreate?: boolean;
  source?: "metal_card" | "base";
  cardTier?: string | null;
  error?: string;
};
type MinerConnectionField = "url" | "port" | "username" | "password";
type MinerConnectionDetail = {
  id: MinerConnectionField;
  label: string;
  value: string;
  canCopy: boolean;
  helperText?: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `${Math.max(1, Math.floor(diff / 1000))}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function formatMemberCardStatus(status: MemberCardStatus) {
  if (status === "in_production") return "In Production";
  if (status === "shipped") return "Shipped";
  if (status === "delivered") return "Delivered";
  return "Queued";
}

function formatShippingDestination(memberCard: NonNullable<DashboardOverview["memberCard"]>) {
  return [memberCard.shipping.city, memberCard.shipping.state, memberCard.shipping.country]
    .filter(Boolean)
    .join(", ") || "Shipping address pending";
}

function formatHashrateValue(value: number) {
  return `${value.toFixed(1)} GH/s`;
}

function formatTrendTimestamp(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatLastUpdated(value: string | null | undefined) {
  if (!value) return "No history yet";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMetalCardDate(value: string | null | undefined) {
  if (!value) return "Pending";
  return new Date(value).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPoolFee(value: number | null | undefined) {
  return `${Number(value ?? 0).toFixed(2)}%`;
}

function getAlertClassName(severity: AlertItem["severity"]) {
  if (severity === "high") return "border-red-400/30 bg-red-500/10 text-red-200";
  if (severity === "medium") return "border-orange-400/30 bg-orange-500/10 text-orange-200";
  return "border-yellow-300/30 bg-yellow-400/10 text-yellow-100";
}

export default function DashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string>("");
  const [poolStatus, setPoolStatus] = useState<string | null>(null);
  const [isPoolStatusLoading, setIsPoolStatusLoading] = useState(true);
  const [hashrateWindow, setHashrateWindow] = useState<HashrateWindow>("24h");
  const [hashrateHistory, setHashrateHistory] = useState<HashrateHistoryPoint[]>([]);
  const [hashrateStats, setHashrateStats] = useState({ current: 0, average: 0, peak: 0, lastUpdated: null as string | null });
  const [isHashrateHistoryLoading, setIsHashrateHistoryLoading] = useState(true);
  const [hashrateHistoryError, setHashrateHistoryError] = useState("");
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isAlertsLoading, setIsAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState("");
  const [metalCardStatus, setMetalCardStatus] = useState<MetalCardPrivilegeStatus | null>(null);
  const [isMetalCardStatusLoading, setIsMetalCardStatusLoading] = useState(true);
  const [poolFeeStatus, setPoolFeeStatus] = useState<PoolFeeStatus | null>(null);
  const [isPoolFeeStatusLoading, setIsPoolFeeStatusLoading] = useState(true);
  const [payoutPriorityStatus, setPayoutPriorityStatus] = useState<PayoutPriorityStatus | null>(null);
  const [isPayoutPriorityStatusLoading, setIsPayoutPriorityStatusLoading] = useState(true);
  const [smartLimitsStatus, setSmartLimitsStatus] = useState<SmartLimitsStatus | null>(null);
  const [isSmartLimitsStatusLoading, setIsSmartLimitsStatusLoading] = useState(true);
  const [workerLimitsStatus, setWorkerLimitsStatus] = useState<WorkerLimitsStatus | null>(null);
  const [isWorkerLimitsStatusLoading, setIsWorkerLimitsStatusLoading] = useState(true);
  const [copiedMinerField, setCopiedMinerField] = useState<MinerConnectionField | null>(null);
  const [copiedPayoutId, setCopiedPayoutId] = useState<string | null>(null);

  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [editingWorkerName, setEditingWorkerName] = useState("");
  const [isSavingWorkerName, setIsSavingWorkerName] = useState(false);
  const [workerActionId, setWorkerActionId] = useState<string | null>(null);
  const [isAddingWorker, setIsAddingWorker] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerDescription, setNewWorkerDescription] = useState("");
  const [isSavingNewWorker, setIsSavingNewWorker] = useState(false);
  const [workerNameMessage, setWorkerNameMessage] = useState<{ type: "success" | "error" | null; text: string }>({
    type: null,
    text: "",
  });

  const loadOverview = useCallback(async (options?: { background?: boolean }) => {
    const isBackgroundRefresh = Boolean(options?.background);
    if (isBackgroundRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setLoadError("");
    try {
      const res = await fetch("/api/dashboard/overview", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login?next=/dashboard");
        return;
      }
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load dashboard.");
      }
      const nextOverview = data.overview as DashboardOverview;
      setOverview(nextOverview);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load dashboard.");
    } finally {
      if (isBackgroundRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [router]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const fetchPoolStatus = useCallback(async () => {
    setIsPoolStatusLoading(true);
    try {
      const res = await fetch("/api/mining/health");
      const data = await res.json();
      setPoolStatus(data.status);
    } catch (err) {
      setPoolStatus("unhealthy");
    } finally {
      setIsPoolStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPoolStatus();
    const interval = setInterval(() => void fetchPoolStatus(), 60000);
    return () => clearInterval(interval);
  }, [fetchPoolStatus]);

  const loadAlerts = useCallback(async () => {
    setIsAlertsLoading(true);
    setAlertsError("");

    try {
      const res = await fetch("/api/alerts", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login?next=/dashboard");
        return;
      }

      const data = await res.json() as AlertsResponse;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load alerts.");
      }

      setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
    } catch (error) {
      setAlerts([]);
      setAlertsError(error instanceof Error ? error.message : "Failed to load alerts.");
    } finally {
      setIsAlertsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadAlerts();
    const interval = setInterval(() => void loadAlerts(), 15000);
    return () => clearInterval(interval);
  }, [loadAlerts]);

  const loadMetalCardStatus = useCallback(async () => {
    setIsMetalCardStatusLoading(true);

    try {
      const res = await fetch("/api/member/metal-card/status", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login?next=/dashboard");
        return;
      }

      const data = await res.json() as MetalCardPrivilegeStatus;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load Metal Card status.");
      }

      setMetalCardStatus(data);
    } catch (error) {
      setMetalCardStatus({
        ok: false,
        hasActiveMetalCard: false,
        card: null,
        error: error instanceof Error ? error.message : "Failed to load Metal Card status.",
      });
    } finally {
      setIsMetalCardStatusLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadMetalCardStatus();
  }, [loadMetalCardStatus]);

  const loadPoolFeeStatus = useCallback(async () => {
    setIsPoolFeeStatusLoading(true);

    try {
      const res = await fetch("/api/member/pool-fee/status", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login?next=/dashboard");
        return;
      }

      const data = await res.json() as PoolFeeStatus;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load pool fee status.");
      }

      setPoolFeeStatus(data);
    } catch (error) {
      setPoolFeeStatus({
        ok: false,
        baseFee: 4,
        discount: 0,
        effectiveFee: 4,
        source: "base",
        error: error instanceof Error ? error.message : "Failed to load pool fee status.",
      });
    } finally {
      setIsPoolFeeStatusLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadPoolFeeStatus();
  }, [loadPoolFeeStatus]);

  const loadPayoutPriorityStatus = useCallback(async () => {
    setIsPayoutPriorityStatusLoading(true);

    try {
      const res = await fetch("/api/member/payout-priority/status", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login?next=/dashboard");
        return;
      }

      const data = await res.json() as PayoutPriorityStatus;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load payout priority status.");
      }

      setPayoutPriorityStatus(data);
    } catch (error) {
      setPayoutPriorityStatus({
        ok: false,
        priority: "standard",
        label: "Standard Payout Review",
        estimatedReview: "Standard queue",
        cardTier: null,
        source: "base",
        error: error instanceof Error ? error.message : "Failed to load payout priority status.",
      });
    } finally {
      setIsPayoutPriorityStatusLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadPayoutPriorityStatus();
  }, [loadPayoutPriorityStatus]);

  const loadSmartLimitsStatus = useCallback(async () => {
    setIsSmartLimitsStatusLoading(true);

    try {
      const res = await fetch("/api/member/smart-limits/status", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login?next=/dashboard");
        return;
      }

      const data = await res.json() as SmartLimitsStatus;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load smart limits status.");
      }

      setSmartLimitsStatus(data);
    } catch (error) {
      setSmartLimitsStatus({
        ok: false,
        maxWorkers: 20,
        apiTier: "standard",
        monitoring: "basic",
        label: "Standard Limits",
        cardTier: null,
        source: "base",
        error: error instanceof Error ? error.message : "Failed to load smart limits status.",
      });
    } finally {
      setIsSmartLimitsStatusLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadSmartLimitsStatus();
  }, [loadSmartLimitsStatus]);

  const loadWorkerLimitsStatus = useCallback(async () => {
    setIsWorkerLimitsStatusLoading(true);

    try {
      const res = await fetch("/api/member/worker-limits/status", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login?next=/dashboard");
        return;
      }

      const data = await res.json() as WorkerLimitsStatus;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load worker limits status.");
      }

      setWorkerLimitsStatus(data);
    } catch (error) {
      setWorkerLimitsStatus({
        ok: false,
        currentWorkers: 0,
        maxWorkers: 20,
        canCreate: true,
        source: "base",
        cardTier: null,
        error: error instanceof Error ? error.message : "Failed to load worker limits status.",
      });
    } finally {
      setIsWorkerLimitsStatusLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadWorkerLimitsStatus();
  }, [loadWorkerLimitsStatus]);

  const loadHashrateHistory = useCallback(async () => {
    setIsHashrateHistoryLoading(true);
    setHashrateHistoryError("");
    try {
      const res = await fetch(`/api/mining/hashrate/history?window=${hashrateWindow}`, { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login?next=/dashboard");
        return;
      }

      const data = await res.json() as HashrateHistoryResponse;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load hashrate history.");
      }

      const points = Array.isArray(data.points) ? data.points : [];
      setHashrateHistory(points);
      setHashrateStats({
        current: Number(data.stats?.current ?? points[points.length - 1]?.hashrate ?? 0),
        average: Number(data.stats?.average ?? 0),
        peak: Number(data.stats?.peak ?? 0),
        lastUpdated: data.stats?.lastUpdated ?? points[points.length - 1]?.ts ?? null,
      });
    } catch (error) {
      setHashrateHistory([]);
      setHashrateStats({ current: 0, average: 0, peak: 0, lastUpdated: null });
      setHashrateHistoryError(error instanceof Error ? error.message : "Failed to load hashrate history.");
    } finally {
      setIsHashrateHistoryLoading(false);
    }
  }, [hashrateWindow, router]);

  useEffect(() => {
    void loadHashrateHistory();
  }, [loadHashrateHistory]);

  const copyMinerConnectionValue = useCallback(async (field: MinerConnectionField, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedMinerField(field);
      window.setTimeout(() => {
        setCopiedMinerField((current) => current === field ? null : current);
      }, 1600);
    } catch {
      setCopiedMinerField(null);
    }
  }, []);

  const copyPayoutTx = useCallback(async (payoutId: string, tx: string) => {
    try {
      await navigator.clipboard.writeText(tx);
      setCopiedPayoutId(payoutId);
      window.setTimeout(() => {
        setCopiedPayoutId((current) => current === payoutId ? null : current);
      }, 1600);
    } catch {
      setCopiedPayoutId(null);
    }
  }, []);

  const startWorkerRename = (workerId: string, currentName: string) => {
    setEditingWorkerId(workerId);
    setEditingWorkerName(currentName);
    setWorkerNameMessage({ type: null, text: "" });
  };

  const cancelWorkerRename = () => {
    setEditingWorkerId(null);
    setEditingWorkerName("");
  };

  const saveWorkerRename = async (workerId: string) => {

    const normalizedName = editingWorkerName.trim();
    if (normalizedName.length < 3 || normalizedName.length > 40) {
      setWorkerNameMessage({ type: "error", text: "Worker name must be 3-40 characters." });
      return;
    }

    setIsSavingWorkerName(true);
    setWorkerNameMessage({ type: null, text: "" });

    try {
      const res = await fetch(`/api/dashboard/workers/${workerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: normalizedName }),
      });

      if (res.status === 401) {
        router.replace("/login?next=/dashboard");
        return;
      }

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to rename worker.");
      }

      setWorkerNameMessage({ type: "success", text: "Worker name updated." });
      setEditingWorkerId(null);
      setEditingWorkerName("");
      await loadOverview({ background: true });
    } catch (error) {
      setWorkerNameMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to rename worker.",
      });
    } finally {
      setIsSavingWorkerName(false);
    }
  };

  const pauseDashboardWorker = async (workerId: string) => {
    setWorkerActionId(workerId);
    setWorkerNameMessage({ type: null, text: "" });

    try {
      const res = await fetch(`/api/dashboard/workers/${workerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause" }),
      });

      if (res.status === 401) {
        router.replace("/login?next=/dashboard");
        return;
      }

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to pause worker.");
      }

      setWorkerNameMessage({ type: "success", text: "Worker paused." });
      await loadOverview({ background: true });
    } catch (error) {
      setWorkerNameMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to pause worker.",
      });
    } finally {
      setWorkerActionId(null);
    }
  };

  const deleteDashboardWorker = async (workerId: string, workerName: string) => {
    if (!window.confirm(`Delete worker "${workerName}"? This cannot be undone.`)) return;

    setWorkerActionId(workerId);
    setWorkerNameMessage({ type: null, text: "" });

    try {
      const res = await fetch(`/api/dashboard/workers/${workerId}`, {
        method: "DELETE",
      });

      if (res.status === 401) {
        router.replace("/login?next=/dashboard");
        return;
      }

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to delete worker.");
      }

      if (editingWorkerId === workerId) {
        setEditingWorkerId(null);
        setEditingWorkerName("");
      }

      setWorkerNameMessage({ type: "success", text: "Worker deleted." });
      await loadOverview({ background: true });
    } catch (error) {
      setWorkerNameMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to delete worker.",
      });
    } finally {
      setWorkerActionId(null);
    }
  };

  const saveNewWorker = async () => {
    const normalizedName = newWorkerName.trim();
    if (normalizedName.length < 1 || normalizedName.length > 50) {
      setWorkerNameMessage({ type: "error", text: "Worker name must be 1-50 characters." });
      return;
    }

    setIsSavingNewWorker(true);
    setWorkerNameMessage({ type: null, text: "" });

    try {
      const res = await fetch("/api/dashboard/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: normalizedName,
          description: newWorkerDescription.trim(),
        }),
      });

      if (res.status === 401) {
        router.replace("/login?next=/dashboard");
        return;
      }

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to create worker.");
      }

      setWorkerNameMessage({ type: "success", text: "Worker created successfully." });
      setNewWorkerName("");
      setNewWorkerDescription("");
      setIsAddingWorker(false);
      await loadOverview({ background: true });
    } catch (error) {
      setWorkerNameMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create worker.",
      });
    } finally {
      setIsSavingNewWorker(false);
    }
  };

  const hashrateChartPath = useMemo(() => {
    const points = hashrateHistory;
    if (points.length === 0) return "";

    const max = Math.max(...points.map((point) => point.hashrate), 1);
    const w = 540;
    const h = 180;
    return points
      .map((point, i) => {
        const x = (i / (points.length - 1 || 1)) * w;
        const y = h - (point.hashrate / max) * (h - 28) - 14;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [hashrateHistory]);

  const hashrateXAxisLabels = useMemo(() => {
    if (hashrateHistory.length === 0) return [];
    const indexes = Array.from(new Set([
      0,
      Math.floor((hashrateHistory.length - 1) / 2),
      hashrateHistory.length - 1,
    ]));
    return indexes.map((index) => ({
      x: (index / (hashrateHistory.length - 1 || 1)) * 540,
      label: formatTrendTimestamp(hashrateHistory[index].ts),
    }));
  }, [hashrateHistory]);

  const truncatedAddress = useMemo(() => {
    const address = overview?.payoutSettings?.payoutAddress;
    if (!address) return null;
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  }, [overview?.payoutSettings?.payoutAddress]);

  const minerConnectionDetails = useMemo<MinerConnectionDetail[]>(() => {
    const payoutAddress = overview?.payoutSettings?.payoutAddress?.trim() || "";

    return [
      { id: "url", label: "Stratum URL", value: "stratum+tcp://snovapool.io", canCopy: true },
      { id: "port", label: "Port", value: "3333", canCopy: true },
      {
        id: "username",
        label: "Username / Worker Format",
        value: payoutAddress ? `${payoutAddress}.workerName` : "Add payout address in Settings",
        canCopy: Boolean(payoutAddress),
        helperText: payoutAddress ? undefined : "Set your payout address first to generate your miner username.",
      },
      { id: "password", label: "Password", value: "x", canCopy: true },
    ];
  }, [overview?.payoutSettings?.payoutAddress]);

  const currentPlan = overview?.plan ?? "Starter";
  const currentSecurity = overview?.security;
  const hasGuardian = currentPlan !== "Starter";
  const canUseEmergencyLock = currentPlan === "Hash Pro" || currentPlan === "Titan Elite";
  const hasActivatedGuardian = hasGuardian && Boolean(currentSecurity?.hasPinConfigured);
  const guardianProtectionLabel =
    currentPlan === "Starter"
      ? "Protection: Not included"
      : currentPlan === "Silver"
        ? "Protection: Guardian Basic / Scout"
        : currentPlan === "Hash Pro"
          ? "Protection: Guardian Advanced"
          : "Protection: Guardian Full Coverage";
  const emergencyLockLabel = canUseEmergencyLock ? "Emergency Lock: Available" : "Emergency Lock: Not included";
  const guardianProtectionTitle =
    currentPlan === "Silver"
      ? "Basic monitoring and protection alerts. Emergency Lock is not included."
      : currentPlan === "Hash Pro"
        ? "Advanced monitoring with stronger protection response."
        : currentPlan === "Titan Elite"
          ? "Premium protection handling with the strongest Guardian coverage."
          : undefined;
  const emergencyLockTitle = canUseEmergencyLock
    ? "Freeze your account if you suspect unauthorized access."
    : "Emergency Lock is available on Hash Pro and Titan Elite.";
  const guardianHelperText =
    currentPlan === "Starter"
      ? "Upgrade to unlock Guardian protection."
      : currentPlan === "Silver"
        ? "Guardian Basic includes protection monitoring. Emergency Lock is available on Hash Pro and Titan Elite."
        : "Emergency Lock lets you freeze your account if you suspect unauthorized access.";
  const securityLevel: "High" | "Medium" | "Basic" | "Attention" =
    currentSecurity?.emergencyLocked || currentSecurity?.lockoutUntil || currentSecurity?.pinResetLockoutUntil
      ? "Attention"
      : hasActivatedGuardian
        ? "High"
        : !hasGuardian
          ? "Basic"
          : "Medium";
  const securityLevelColor =
    securityLevel === "High"
      ? "text-green-300"
      : securityLevel === "Basic"
        ? "text-white/60"
      : securityLevel === "Medium"
        ? "text-orange-300"
        : "text-red-300";
  const guardianStatus = currentSecurity?.emergencyLocked
      ? "Locked"
      : currentSecurity?.lockoutUntil || currentSecurity?.pinResetLockoutUntil
        ? "Locked Out"
        : hasActivatedGuardian
          ? "Active"
          : hasGuardian
            ? "Activation Required"
            : "Upgrade Required";
  const guardianCta = currentSecurity?.emergencyLocked
    ? { href: "/dashboard/settings", label: "Manage Lock" }
    : currentPlan === "Starter"
      ? { href: "/pricing", label: "Upgrade" }
      : !hasActivatedGuardian
        ? { href: "/dashboard/settings", label: "Activate Guardian" }
        : currentPlan === "Silver"
          ? { href: "/pricing", label: "Upgrade for Emergency Lock" }
          : { href: "/dashboard/settings", label: "Manage Guardian" };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/70">Loading dashboard...</p>
      </div>
    );
  }

  if (loadError || !overview) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="rounded-2xl border border-red-400/35 bg-red-500/10 px-6 py-5 max-w-xl w-full">
          <p className="text-red-200 text-sm">{loadError || "Dashboard data is unavailable."}</p>
          <button
            type="button"
            onClick={() => void loadOverview()}
            className="mt-4 rounded-lg border border-[#C9EB55]/35 bg-[#C9EB55]/10 px-4 py-2 text-sm text-[#C9EB55] hover:bg-[#C9EB55]/20 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(201,235,85,0.08),transparent_42%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_8%,rgba(201,235,85,0.05),transparent_36%)]" />
      </div>

      <main className="mx-auto w-full max-w-7xl px-5 py-8 md:px-10 md:py-10 space-y-7">
        {(isPoolStatusLoading || poolStatus) && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-2.5 w-fit">
            <div className={`h-2 w-2 rounded-full ${
              isPoolStatusLoading ? "bg-white/35" : "animate-pulse"
            } ${
              poolStatus === "healthy" ? "bg-green-400" :
              poolStatus === "degraded" ? "bg-yellow-400" : "bg-red-500"
            }`} />
            <p className="text-xs font-semibold tracking-wide text-white/80">
              {isPoolStatusLoading && "Loading pool status..."}
              {!isPoolStatusLoading && poolStatus === "healthy" && "🟢 Pool Online"}
              {!isPoolStatusLoading && poolStatus === "degraded" && "🟡 Pool Degraded"}
              {!isPoolStatusLoading && poolStatus === "unhealthy" && "🔴 Pool Offline"}
            </p>
          </div>
        )}

        <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-6 lg:flex-nowrap lg:gap-8">
            <div className="max-w-xl space-y-2.5">
              <p className="text-xs uppercase tracking-[0.24em] text-[#C9EB55]/80">Miner Dashboard</p>
              <h1 className="text-3xl md:text-4xl font-black">SUPERNOVA Control Panel</h1>
              <p className="text-white/70 text-sm md:text-base">Live overview, payout settings, and account protection controls.</p>
              <div className="pt-1">
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/dashboard/settings"
                    className="inline-flex rounded-full border border-[#C9EB55]/35 bg-[#C9EB55]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C9EB55] hover:bg-[#C9EB55]/20 transition-colors"
                  >
                    Settings
                  </Link>
                  <Link
                    href="/dashboard/metal-card/activate"
                    className="inline-flex rounded-full border border-[#C9EB55]/35 bg-[#C9EB55]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C9EB55] hover:bg-[#C9EB55]/20 transition-colors"
                  >
                    Metal Card Activation
                  </Link>
                  <Link
                    href="/dashboard/support/priority"
                    className="inline-flex rounded-full border border-[#C9EB55]/35 bg-[#C9EB55]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C9EB55] hover:bg-[#C9EB55]/20 transition-colors"
                  >
                    Priority Support
                  </Link>
                </div>
              </div>
            </div>
            <div className="w-full max-w-xl rounded-2xl border border-[#C9EB55]/12 bg-white/[0.025] px-5 py-4 sm:w-auto sm:min-w-[360px]">
              <div className="flex items-center gap-4 md:gap-5">
                <DroneGraphic className="h-20 w-20 shrink-0 md:h-24 md:w-24" />
                <div className="space-y-2.5 text-left">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-white/80">
                  <span className="inline-flex items-center gap-1.5">
                    <span title="All systems optimal — no action required." className="h-2 w-2 rounded-full bg-green-400" />
                    <span>Healthy</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span title="Some settings incomplete — recommended to review." className="h-2 w-2 rounded-full bg-orange-400" />
                    <span>Need Work</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span title="Critical issue detected — immediate action required." className="h-2 w-2 rounded-full bg-red-500" />
                    <span>Attention</span>
                  </span>
                </div>
                  <div className="space-y-1.5 leading-relaxed">
                    <p title={guardianProtectionTitle} className="text-[11px] text-white/55">{guardianProtectionLabel}</p>
                    <p title={emergencyLockTitle} className="text-[11px] text-white/55">{emergencyLockLabel}</p>
                    <p className={`text-[11px] font-semibold ${securityLevelColor}`}>Security Level: {securityLevel}</p>
                    <p className="text-[11px] text-white/70">Guardian Status: {guardianStatus}</p>
                    <p className="max-w-xs text-[11px] leading-relaxed text-white/45">{guardianHelperText}</p>
                  </div>
                  <Link
                    href={guardianCta.href}
                    className="inline-flex rounded-full border border-[#C9EB55]/35 bg-[#C9EB55]/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C9EB55] hover:bg-[#C9EB55]/20 transition-colors"
                  >
                    {guardianCta.label}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6 space-y-4">
          <h2 className="text-xl font-bold text-[#C9EB55]">Alerts</h2>
          {isAlertsLoading ? (
            <p className="text-sm text-white/55">Loading alerts...</p>
          ) : alertsError ? (
            <p className="text-sm text-red-200">{alertsError}</p>
          ) : alerts.length === 0 ? (
            <p className="text-sm text-white/55">No alerts</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-2xl border px-4 py-3 text-sm ${getAlertClassName(alert.severity)}`}
                >
                  <span className="font-semibold">⚠️</span>{" "}
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-[#C9EB55]/15 bg-white/[0.025] p-4 md:col-span-2">
            <p className="text-xs uppercase tracking-[0.15em] text-white/50">Active Membership</p>
            <p className="mt-2 text-xl font-semibold text-[#C9EB55]">{overview.plan}</p>
            <p className="mt-1 text-xs text-white/60">
              {overview.memberCard
                ? `${overview.memberCard.label} ${String.fromCharCode(8226)} ${formatMemberCardStatus(overview.memberCard.status)}`
                : "No metal card fulfillment is active yet."}
            </p>
          </div>
          <div className="rounded-2xl border border-[#C9EB55]/15 bg-white/[0.025] p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-white/50">Total Hashrate</p>
            <p className="mt-2 text-xl font-semibold text-[#C9EB55]">{overview.summary.totalHashrate}</p>
          </div>
          <div className="rounded-2xl border border-[#C9EB55]/15 bg-white/[0.025] p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-white/50">Pending Balance</p>
            <p className="mt-2 text-xl font-semibold text-white">{overview.summary.pendingBalance}</p>
          </div>
          <div className="rounded-2xl border border-[#C9EB55]/15 bg-white/[0.025] p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-white/50">Reward Flow</p>
            <p className="mt-2 text-xl font-semibold text-white">{overview.summary.rewardFlow}</p>
          </div>
          <div className="rounded-2xl border border-[#C9EB55]/15 bg-white/[0.025] p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-white/50">Online Workers</p>
            <p className="mt-2 text-xl font-semibold text-white">{overview.summary.onlineWorkers}</p>
          </div>
          <div className="rounded-2xl border border-[#C9EB55]/15 bg-white/[0.025] p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-white/50">Total Workers</p>
            <p className="mt-2 text-xl font-semibold text-white">{overview.summary.totalWorkers}</p>
          </div>
        <div className="rounded-2xl border border-[#C9EB55]/15 bg-white/[0.025] p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-white/50">Payout Settings</p>
          {overview.payoutSettings.payoutAddress ? (
            <div className="mt-2">
              <p className="text-sm font-semibold text-[#C9EB55] truncate" title={overview.payoutSettings.payoutAddress}>
                {truncatedAddress}
              </p>
              <p className="text-[10px] text-white/60">
                Min: {overview.payoutSettings.minPayout} KAS
              </p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-white/60">
              Not configured.{" "}
              <Link href="/dashboard/settings" className="text-[#C9EB55] hover:underline">Configure</Link>
            </p>
          )}
        </div>
        </section>

        {overview.memberCard ? (
          <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1.5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#C9EB55]/75">Metal Card Fulfillment</p>
                <h2 className="text-2xl font-bold text-white">{overview.memberCard.label}</h2>
                <p className="text-sm text-white/65">Tier: {overview.memberCard.tier}</p>
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${
                  overview.memberCard.status === "delivered"
                    ? "bg-green-400/15 text-green-300"
                    : overview.memberCard.status === "shipped"
                      ? "bg-sky-400/15 text-sky-300"
                      : overview.memberCard.status === "in_production"
                        ? "bg-orange-400/15 text-orange-300"
                        : "bg-[#C9EB55]/10 text-[#C9EB55]"
                }`}
              >
                {formatMemberCardStatus(overview.memberCard.status)}
              </span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Order Created</p>
                <p className="mt-2 text-sm text-white/80">{new Date(overview.memberCard.createdAt).toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Last Update</p>
                <p className="mt-2 text-sm text-white/80">{new Date(overview.memberCard.updatedAt).toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Shipping Destination</p>
                <p className="mt-2 text-sm text-white/80">{formatShippingDestination(overview.memberCard)}</p>
                <p className="mt-1 text-xs text-white/55">{overview.memberCard.shipping.line1 || "No shipping address saved yet."}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Tracking</p>
                <p className="mt-2 text-sm text-white/80">
                  {overview.memberCard.trackingNumber
                    ? `${overview.memberCard.carrier || "Carrier"}: ${overview.memberCard.trackingNumber}`
                    : "Tracking not assigned yet."}
                </p>
                {overview.memberCard.trackingUrl ? (
                  <Link
                    href={overview.memberCard.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs text-[#C9EB55] hover:text-[#d8f37c]"
                  >
                    Open Tracking Link
                  </Link>
                ) : null}
                <p className="mt-1 text-xs text-white/55">
                  {overview.memberCard.deliveredAt
                    ? `Delivered ${new Date(overview.memberCard.deliveredAt).toLocaleString()}`
                    : overview.memberCard.shippedAt
                      ? `Shipped ${new Date(overview.memberCard.shippedAt).toLocaleString()}`
                      : "Waiting for production / dispatch update."}
                </p>
                {overview.memberCard.estimatedDelivery ? (
                  <p className="mt-1 text-xs text-white/55">
                    Estimated delivery {new Date(overview.memberCard.estimatedDelivery).toLocaleString()}
                  </p>
                ) : null}
                {overview.memberCard.notes ? (
                  <p className="mt-2 text-xs text-white/50">Notes: {overview.memberCard.notes}</p>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#C9EB55]/75">Pool Fee</p>
              <h2 className="mt-1 text-xl font-bold text-white">
                {isPoolFeeStatusLoading ? "Checking Fee..." : formatPoolFee(poolFeeStatus?.effectiveFee)}
              </h2>
              <p className="mt-1 text-xs text-white/55">Preview only. Your live mining reward and payout calculations are not changed yet.</p>
            </div>
            {!isPoolFeeStatusLoading && Number(poolFeeStatus?.discount ?? 0) <= 0 ? (
              <Link href="/dashboard/metal-card/activate" className="text-xs font-semibold text-[#C9EB55] hover:underline">
                Activate Metal Card to unlock fee discounts
              </Link>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Base Fee</p>
              <p className="mt-2 text-sm font-semibold text-white">{formatPoolFee(poolFeeStatus?.baseFee)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Metal Card Discount</p>
              <p className="mt-2 text-sm font-semibold text-[#C9EB55]">-{formatPoolFee(poolFeeStatus?.discount)}</p>
            </div>
            <div className="rounded-2xl border border-[#C9EB55]/20 bg-[#C9EB55]/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#C9EB55]/75">Effective Fee</p>
              <p className="mt-2 text-sm font-semibold text-[#D7F36C]">{formatPoolFee(poolFeeStatus?.effectiveFee)}</p>
            </div>
          </div>
          {poolFeeStatus?.error ? <p className="mt-3 text-xs text-red-200">{poolFeeStatus.error}</p> : null}
        </section>

        <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-[0.22em] text-[#C9EB55]/75">Payout Priority</p>
              <h2 className="text-xl font-bold text-white">
                {isPayoutPriorityStatusLoading ? "Checking Priority..." : payoutPriorityStatus?.label}
              </h2>
              <p className="text-sm text-white/65">
                {isPayoutPriorityStatusLoading ? "Review queue status loading." : payoutPriorityStatus?.estimatedReview}
              </p>
              {payoutPriorityStatus?.cardTier ? (
                <p className="text-sm font-semibold text-[#C9EB55]">Metal Card: {payoutPriorityStatus.cardTier}</p>
              ) : null}
              <p className="text-xs text-white/55">Preview only. Real payout approval logic is not changed yet.</p>
            </div>
            {!isPayoutPriorityStatusLoading && payoutPriorityStatus?.source !== "metal_card" ? (
              <Link
                href="/dashboard/metal-card/activate"
                className="inline-flex rounded-full border border-[#C9EB55]/35 bg-[#C9EB55]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C9EB55] hover:bg-[#C9EB55]/20 transition-colors"
              >
                Activate Metal Card to unlock faster payout review
              </Link>
            ) : null}
          </div>
          {payoutPriorityStatus?.error ? <p className="mt-3 text-xs text-red-200">{payoutPriorityStatus.error}</p> : null}
        </section>

        <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#C9EB55]/75">Smart Limits</p>
              <h2 className="mt-1 text-xl font-bold text-white">
                {isSmartLimitsStatusLoading ? "Checking Limits..." : smartLimitsStatus?.label}
              </h2>
              {smartLimitsStatus?.cardTier ? (
                <p className="mt-1 text-sm font-semibold text-[#C9EB55]">Metal Card: {smartLimitsStatus.cardTier}</p>
              ) : null}
              <p className="mt-1 text-xs text-white/55">Preview only. Real worker/API limits are not enforced yet.</p>
            </div>
            {!isSmartLimitsStatusLoading && smartLimitsStatus?.source !== "metal_card" ? (
              <Link href="/dashboard/metal-card/activate" className="text-xs font-semibold text-[#C9EB55] hover:underline">
                Activate Metal Card to unlock higher limits
              </Link>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Max Workers</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {isSmartLimitsStatusLoading ? "Loading" : smartLimitsStatus?.maxWorkers}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">API Tier</p>
              <p className="mt-2 text-sm font-semibold capitalize text-white">
                {isSmartLimitsStatusLoading ? "Loading" : smartLimitsStatus?.apiTier}
              </p>
            </div>
            <div className="rounded-2xl border border-[#C9EB55]/20 bg-[#C9EB55]/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#C9EB55]/75">Monitoring</p>
              <p className="mt-2 text-sm font-semibold capitalize text-[#D7F36C]">
                {isSmartLimitsStatusLoading ? "Loading" : smartLimitsStatus?.monitoring}
              </p>
            </div>
          </div>
          {smartLimitsStatus?.error ? <p className="mt-3 text-xs text-red-200">{smartLimitsStatus.error}</p> : null}
        </section>

        <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-[0.22em] text-[#C9EB55]/75">Worker Limits</p>
              <h2 className="text-xl font-bold text-white">
                {isWorkerLimitsStatusLoading
                  ? "Checking Workers..."
                  : `${workerLimitsStatus?.currentWorkers ?? 0} / ${workerLimitsStatus?.maxWorkers ?? 20}`}
              </h2>
              <p className={`text-sm font-semibold ${workerLimitsStatus?.canCreate === false ? "text-yellow-200" : "text-green-300"}`}>
                {isWorkerLimitsStatusLoading
                  ? "Worker capacity loading."
                  : workerLimitsStatus?.canCreate
                    ? "New worker slots available"
                    : "At preview limit"}
              </p>
              {workerLimitsStatus?.cardTier ? (
                <p className="text-sm font-semibold text-[#C9EB55]">Metal Card: {workerLimitsStatus.cardTier}</p>
              ) : null}
              <p className="text-xs text-white/55">Preview only. Worker limits are not enforced yet.</p>
            </div>
            {!isWorkerLimitsStatusLoading && workerLimitsStatus?.source !== "metal_card" ? (
              <Link
                href="/dashboard/metal-card/activate"
                className="inline-flex rounded-full border border-[#C9EB55]/35 bg-[#C9EB55]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C9EB55] hover:bg-[#C9EB55]/20 transition-colors"
              >
                Activate Metal Card to unlock higher worker limits
              </Link>
            ) : null}
          </div>
          {workerLimitsStatus?.error ? <p className="mt-3 text-xs text-red-200">{workerLimitsStatus.error}</p> : null}
        </section>

        <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-[0.22em] text-[#C9EB55]/75">Metal Card Privileges</p>
              {isMetalCardStatusLoading ? (
                <h2 className="text-xl font-bold text-white">Checking Metal Card...</h2>
              ) : metalCardStatus?.hasActiveMetalCard && metalCardStatus.card ? (
                <>
                  <h2 className="text-xl font-bold text-white">Metal Card Active</h2>
                  <p className="text-sm text-white/65">Tier: {metalCardStatus.card.tier}</p>
                  <p className="text-sm text-white/65">Activated: {formatMetalCardDate(metalCardStatus.card.activatedAt)}</p>
                  <p className="text-sm font-semibold text-green-300">Priority Support: Enabled</p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-white">No active Metal Card</h2>
                  <p className="text-sm text-white/60">Activate your shipped card to unlock Priority Support privileges.</p>
                </>
              )}
            </div>
            {!isMetalCardStatusLoading && !metalCardStatus?.hasActiveMetalCard ? (
              <Link
                href="/dashboard/metal-card/activate"
                className="inline-flex rounded-full border border-[#C9EB55]/35 bg-[#C9EB55]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C9EB55] hover:bg-[#C9EB55]/20 transition-colors"
              >
                Activate Metal Card
              </Link>
            ) : null}
          </div>
          {metalCardStatus?.error ? <p className="mt-3 text-xs text-red-200">{metalCardStatus.error}</p> : null}
        </section>

        <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#C9EB55]/75">Mining Setup</p>
            <h2 className="mt-1 text-xl font-bold text-[#C9EB55]">Connect Miner</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {minerConnectionDetails.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">{item.label}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <code className="min-w-0 break-all rounded-lg bg-black/30 px-2.5 py-1.5 text-sm text-white/85">
                    {item.value}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyMinerConnectionValue(item.id, item.value)}
                    disabled={!item.canCopy}
                    className="rounded-md border border-[#C9EB55]/35 bg-[#C9EB55]/10 px-3 py-1.5 text-xs font-semibold text-[#C9EB55] hover:bg-[#C9EB55]/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/35"
                  >
                    {copiedMinerField === item.id ? "Copied" : "Copy"}
                  </button>
                </div>
                {item.helperText ? <p className="mt-2 text-xs text-white/50">{item.helperText}</p> : null}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#C9EB55]">Live Workers</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsAddingWorker((current) => !current);
                  setWorkerNameMessage({ type: null, text: "" });
                }}
                className="rounded-lg border border-[#C9EB55]/30 px-3 py-1.5 text-xs text-[#C9EB55] hover:bg-[#C9EB55]/10 transition-colors"
              >
                Add Worker
              </button>
              {isRefreshing ? <span className="text-[11px] text-white/55">Refreshing...</span> : null}
              <button
                type="button"
                onClick={() => void loadOverview({ background: true })}
                disabled={isRefreshing}
                className="rounded-lg border border-[#C9EB55]/30 px-3 py-1.5 text-xs text-[#C9EB55] hover:bg-[#C9EB55]/10 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                Refresh
              </button>
            </div>
          </div>
          {workerNameMessage.type && (
            <p
              className={`text-xs ${
                workerNameMessage.type === "success" ? "text-green-300" : "text-red-300"
              }`}
            >
              {workerNameMessage.text}
            </p>
          )}
          {isAddingWorker ? (
            <div className="rounded-2xl border border-[#C9EB55]/15 bg-black/20 p-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <input
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  maxLength={50}
                  placeholder="Worker name"
                  className="rounded-md border border-[#C9EB55]/30 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#C9EB55]/60"
                />
                <input
                  value={newWorkerDescription}
                  onChange={(e) => setNewWorkerDescription(e.target.value)}
                  maxLength={250}
                  placeholder="Description (optional)"
                  className="rounded-md border border-white/20 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#C9EB55]/40"
                />
                <button
                  type="button"
                  onClick={() => void saveNewWorker()}
                  disabled={isSavingNewWorker}
                  className="rounded-md border border-[#C9EB55]/35 bg-[#C9EB55]/10 px-4 py-2 text-xs font-semibold text-[#C9EB55] hover:bg-[#C9EB55]/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingNewWorker ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewWorkerName("");
                    setNewWorkerDescription("");
                    setIsAddingWorker(false);
                  }}
                  disabled={isSavingNewWorker}
                  className="rounded-md border border-white/20 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
          <div className={`overflow-x-auto transition-opacity ${isRefreshing ? "opacity-75" : "opacity-100"}`}>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/55">
                  <th className="px-3 py-3 text-left font-medium">Worker</th>
                  <th className="px-3 py-3 text-left font-medium">Created</th>
                  <th className="px-3 py-3 text-left font-medium">Hashrate</th>
                  <th className="px-3 py-3 text-left font-medium">Status</th>
                  <th className="px-3 py-3 text-left font-medium">Last Share</th>
                  <th className="px-3 py-3 text-left font-medium">Reject Rate</th>
                  <th className="px-3 py-3 text-left font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
            {overview.workers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-white/50 italic">
                  No workers connected yet. Connect your miner to get started.
                </td>
              </tr>
            ) : overview.workers.map((worker) => (
                  <tr key={worker.id} className="border-b border-white/5">
                    <td className="px-3 py-3 text-white">
                      {editingWorkerId === worker.id ? (
                        <input
                          value={editingWorkerName}
                          onChange={(e) => setEditingWorkerName(e.target.value)}
                          maxLength={40}
                          className="w-44 rounded-md border border-[#C9EB55]/30 bg-black/40 px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#C9EB55]/60"
                        />
                      ) : (
                        <div className="space-y-1">
                          <p>{worker.name}</p>
                          <p className="text-xs text-white/45">{worker.description || "No description"}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-white/70">{new Date(worker.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-3 text-white/80">{worker.hashrate}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs ${
                          worker.status === "online"
                            ? "bg-green-400/15 text-green-300"
                            : worker.status === "warning"
                              ? "bg-yellow-400/15 text-yellow-300"
                              : "bg-white/10 text-white/65"
                        }`}
                      >
                        {worker.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-white/70">{timeAgo(worker.lastShare)}</td>
                    <td className="px-3 py-3 text-white/70">{worker.rejectRate}</td>
                    <td className="px-3 py-3">
                      {editingWorkerId === worker.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void saveWorkerRename(worker.id)}
                            disabled={isSavingWorkerName}
                            className="rounded-md border border-[#C9EB55]/35 bg-[#C9EB55]/10 px-2.5 py-1 text-[11px] text-[#C9EB55] hover:bg-[#C9EB55]/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSavingWorkerName ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelWorkerRename}
                            disabled={isSavingWorkerName}
                            className="rounded-md border border-white/20 px-2.5 py-1 text-[11px] text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startWorkerRename(worker.id, worker.name)}
                            disabled={workerActionId === worker.id}
                            className="rounded-md border border-white/20 px-2.5 py-1 text-[11px] text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Edit Name
                          </button>
                          <button
                            type="button"
                            onClick={() => void pauseDashboardWorker(worker.id)}
                            disabled={workerActionId === worker.id}
                            className="rounded-md border border-white/20 px-2.5 py-1 text-[11px] text-white/70 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {workerActionId === worker.id ? "Working..." : "Pause"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteDashboardWorker(worker.id, worker.name)}
                            disabled={workerActionId === worker.id}
                            className="rounded-md border border-red-400/35 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-[#C9EB55]">Hashrate Trend</h2>
              <div className="flex rounded-lg border border-[#C9EB55]/20 bg-black/25 p-1">
                {(["1h", "24h", "7d"] as const).map((windowKey) => (
                  <button
                    key={windowKey}
                    type="button"
                    onClick={() => setHashrateWindow(windowKey)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
                      hashrateWindow === windowKey
                        ? "bg-[#C9EB55]/15 text-[#C9EB55]"
                        : "text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {windowKey}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Current</p>
                <p className="mt-1 text-sm font-semibold text-white">{formatHashrateValue(hashrateStats.current)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Average</p>
                <p className="mt-1 text-sm font-semibold text-white">{formatHashrateValue(hashrateStats.average)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Peak</p>
                <p className="mt-1 text-sm font-semibold text-white">{formatHashrateValue(hashrateStats.peak)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Last Updated</p>
                <p className="mt-1 text-sm font-semibold text-white">{formatLastUpdated(hashrateStats.lastUpdated)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#C9EB55]/12 bg-black/35 p-4">
              {isHashrateHistoryLoading ? (
                <div className="flex h-52 items-center justify-center text-sm text-white/55">Loading hashrate history...</div>
              ) : hashrateHistoryError ? (
                <div className="flex h-52 items-center justify-center text-center text-sm text-red-200">{hashrateHistoryError}</div>
              ) : hashrateHistory.length === 0 ? (
                <div className="flex h-52 items-center justify-center text-center text-sm text-white/55">
                  No history yet. Keep workers connected to build a trend.
                </div>
              ) : (
                <svg viewBox="0 0 540 220" className="h-52 w-full">
                  <defs>
                    <linearGradient id="trendLine" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#8BBF2C" />
                      <stop offset="100%" stopColor="#D6F175" />
                    </linearGradient>
                  </defs>
                  {[40, 90, 140].map((y) => (
                    <line key={y} x1="0" x2="540" y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                  ))}
                  <path d={hashrateChartPath} fill="none" stroke="url(#trendLine)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                  {hashrateHistory.map((point, index) => {
                    const max = Math.max(...hashrateHistory.map((item) => item.hashrate), 1);
                    const x = (index / (hashrateHistory.length - 1 || 1)) * 540;
                    const y = 180 - (point.hashrate / max) * 152 - 14;
                    return <circle key={`${point.ts}:${index}`} cx={x} cy={y} r="2.8" fill="#D6F175" opacity="0.75" />;
                  })}
                  <text x="0" y="18" fill="rgba(255,255,255,0.5)" fontSize="11">
                    {formatHashrateValue(hashrateStats.peak)}
                  </text>
                  <text x="0" y="178" fill="rgba(255,255,255,0.5)" fontSize="11">0 GH/s</text>
                  {hashrateXAxisLabels.map((item) => (
                    <text key={`${item.x}:${item.label}`} x={item.x} y="214" fill="rgba(255,255,255,0.5)" fontSize="11" textAnchor={item.x === 0 ? "start" : item.x >= 540 ? "end" : "middle"}>
                      {item.label}
                    </text>
                  ))}
                </svg>
              )}
            </div>
            <p className="text-xs text-white/55">Real hashrate history from miner snapshots over the selected window.</p>
          </div>

          <div className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-[#C9EB55]">Latest Payouts</h2>
              <span className="text-xs text-white/45">Full payout history coming soon</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/55">
                    <th className="px-3 py-2 text-left font-medium">Date</th>
                    <th className="px-3 py-2 text-left font-medium">Amount</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">TX</th>
                  </tr>
                </thead>
                <tbody>
              {overview.payouts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center text-white/50 italic">
                    No payouts yet. Keep mining to reach your payout threshold.
                  </td>
                </tr>
              ) : overview.payouts.map((payout) => {
                const tx = payout.tx.trim();
                const hasTx = tx.length > 0 && tx.toLowerCase() !== "processing";

                return (
                    <tr key={payout.id} className="border-b border-white/5">
                      <td className="px-3 py-2 text-white/80">{payout.date}</td>
                      <td className="px-3 py-2 text-white">{payout.amount}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs ${
                            payout.status === "paid" ? "bg-green-400/15 text-green-300" : "bg-yellow-400/15 text-yellow-300"
                          }`}
                        >
                          {payout.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-white/65">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="max-w-[180px] truncate font-mono text-xs text-white/70">{payout.tx}</span>
                          {hasTx ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void copyPayoutTx(payout.id, tx)}
                                className="rounded-md border border-white/20 px-2.5 py-1 text-[11px] text-white/75 hover:bg-white/10"
                              >
                                {copiedPayoutId === payout.id ? "Copied" : "Copy"}
                              </button>
                              <a
                                href={`https://explorer.kaspa.org/txs/${encodeURIComponent(tx)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-md border border-[#C9EB55]/30 px-2.5 py-1 text-[11px] text-[#C9EB55] hover:bg-[#C9EB55]/10"
                              >
                                Explorer
                              </a>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                );
              })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
