export type MiningAlertSeverity = "high" | "medium" | "low";

export type MiningAlertCandidate = {
  type: string;
  message: string;
  severity: MiningAlertSeverity;
};

export type MiningAlertWorker = {
  id: number | string;
  name?: string | null;
  hashrate?: number | null;
  status?: string | null;
  reject_rate?: number | null;
};

export type MiningAlertHashratePoint = {
  ts: Date | string;
  hashrate: number;
};

function formatHashrate(value: number) {
  return value.toFixed(1);
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function buildWorkerSignals(workers: MiningAlertWorker[]) {
  return workers.flatMap((worker) => {
    const alerts: MiningAlertCandidate[] = [];
    const displayName = worker.name?.trim() || `Worker ${worker.id}`;
    const hashrate = Number(worker.hashrate || 0);
    const rejectRate = Number(worker.reject_rate || 0);
    const status = String(worker.status || "unknown");

    if (hashrate < 10) {
      alerts.push({
        type: `low_hashrate_${worker.id}`,
        message: `${displayName} is producing only ${formatHashrate(hashrate)} GH/s, below expected performance.`,
        severity: "high",
      });
    }

    if (rejectRate > 5) {
      alerts.push({
        type: `high_reject_${worker.id}`,
        message: `${displayName} reject rate is ${rejectRate.toFixed(1)}%, which may reduce earnings.`,
        severity: "medium",
      });
    }

    if (status !== "online") {
      alerts.push({
        type: `offline_${worker.id}`,
        message: `${displayName} appears offline or not submitting shares. Last known status: ${status}.`,
        severity: "high",
      });
    }

    return alerts;
  });
}

function buildHistorySignals(points: MiningAlertHashratePoint[]) {
  const values = points
    .map((point) => Number(point.hashrate || 0))
    .filter((value) => Number.isFinite(value) && value >= 0);

  if (values.length < 4) return [];

  const alerts: MiningAlertCandidate[] = [];
  const current = values[values.length - 1];
  const previousValues = values.slice(0, -1);
  const baseline = average(previousValues);

  if (baseline > 0) {
    const ratio = current / baseline;

    if (ratio <= 0.35) {
      alerts.push({
        type: "hashrate_drop",
        message: `Your hashrate dropped ${((1 - ratio) * 100).toFixed(0)}% compared to your recent average.`,
        severity: "medium",
      });
    }

    // Hashrate spikes can be a fraud/manipulation signal, so they belong in
    // admin fraud review rather than normal user-facing alerts.
  }

  const avg = average(values);
  if (avg > 0) {
    const swings = values.slice(1).map((value, index) => Math.abs(value - values[index]));
    const averageSwing = average(swings);
    const peak = Math.max(...values);
    const low = Math.min(...values);

    if (averageSwing / avg >= 0.4 || (low > 0 && peak / low >= 3)) {
      alerts.push({
        type: "unstable_mining",
        message: "Your mining performance is unstable, which can reduce consistency of rewards.",
        severity: "low",
      });
    }
  }

  return alerts;
}

export function getMiningAlertCandidates(params: {
  userId: string;
  workers: MiningAlertWorker[];
  hashrateHistory?: MiningAlertHashratePoint[];
}): MiningAlertCandidate[] {
  if (!params.userId) return [];

  return [
    ...buildWorkerSignals(params.workers),
    ...buildHistorySignals(params.hashrateHistory ?? []),
  ];
}
