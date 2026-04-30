import { getMetricsSnapshot, type MetricsSnapshot } from "@/lib/miningMetrics";

type LatencyEntry = MetricsSnapshot["latency"][string];

function parseLabeledCounterKey(key: string): { name: string; labels: Record<string, string> } {
  const open = key.indexOf("{");
  if (open === -1) return { name: key, labels: {} };

  const name = key.slice(0, open);
  const labelsRaw = key.slice(open + 1, -1);
  const labels: Record<string, string> = {};

  for (const part of labelsRaw.split(",")) {
    const [k, v] = part.split("=");
    if (!k || !v) continue;
    labels[k.trim()] = v.trim().replace(/^"|"$/g, "");
  }

  return { name, labels };
}

export interface SourceMetricsSummary {
  source: string;
  counters: Record<string, number>;
  latency: MetricsSnapshot["latency"];
  errors: number;
  throughputPerSec: number;
  connections: number;
  connectionsOpened: number;
  connectionsClosed: number;
  activeConnectionsEstimate: number;
}

export interface StratumProtocolMetricsSummary extends SourceMetricsSummary {
  protocol: "v1" | "v2";
  acceptedShares: number;
  rejectedShares: number;
  totalShares: number;
  acceptRate: number;
  rejectRate: number;
  connectionChurn: number;
  rejectReasons: Record<string, number>;
}

export interface StratumAlert {
  level: "high" | "medium" | "low";
  message: string;
}

export interface StratumMetricsSummary extends SourceMetricsSummary {
  acceptedShares: number;
  rejectedShares: number;
  totalShares: number;
  acceptRate: number;
  rejectRate: number;
  connectionChurn: number;
  rejectReasons: Record<string, number>;
  protocols: {
    v1: StratumProtocolMetricsSummary;
    v2: StratumProtocolMetricsSummary;
  };
  submitLatency: LatencyEntry | null;
  alerts: StratumAlert[];
}

function matchesSource(requestedSource: string, actualSource: string | undefined) {
  if (!actualSource) return false;
  if (requestedSource === "stratum") {
    return actualSource === "stratum" || actualSource === "stratum_v1" || actualSource === "stratum_v2";
  }
  if (requestedSource === "websocket") {
    return actualSource === "websocket" || actualSource === "ws";
  }
  return actualSource === requestedSource;
}

function matchesLatencyMetric(requestedSource: string, metricName: string) {
  if (requestedSource === "stratum") {
    return metricName.startsWith("stratum_");
  }
  if (requestedSource === "websocket") {
    return metricName.startsWith("ws_") || metricName.startsWith("websocket_");
  }
  return metricName.startsWith(`${requestedSource}_`);
}

function collectSourceCounters(snapshot: MetricsSnapshot, source: string) {
  const counters: Record<string, number> = {};

  for (const [key, value] of Object.entries(snapshot.counters)) {
    const parsed = parseLabeledCounterKey(key);
    if (!matchesSource(source, parsed.labels.source)) continue;
    counters[parsed.name] = (counters[parsed.name] || 0) + value;
  }

  return counters;
}

function collectSourceLatency(snapshot: MetricsSnapshot, source: string) {
  const latency: MetricsSnapshot["latency"] = {};

  for (const [name, stat] of Object.entries(snapshot.latency)) {
    if (matchesLatencyMetric(source, name)) {
      latency[name] = stat;
    }
  }

  return latency;
}

function collectRejectReasons(snapshot: MetricsSnapshot, source: string) {
  const reasons: Record<string, number> = {};

  for (const [key, value] of Object.entries(snapshot.counters)) {
    const parsed = parseLabeledCounterKey(key);
    if (parsed.name !== "share_rejected") continue;
    if (!matchesSource(source, parsed.labels.source)) continue;

    const reason = parsed.labels.reason || "unknown";
    reasons[reason] = (reasons[reason] || 0) + value;
  }

  return reasons;
}

function buildSourceSummary(source: string, counters: Record<string, number>, latency: MetricsSnapshot["latency"], windowSec: number): SourceMetricsSummary {
  const accepted = counters.share_accepted || 0;
  const rejected = counters.share_rejected || 0;
  const connectionsOpened = counters.connection_opened || 0;
  const connectionsClosed = counters.connection_closed || 0;
  const activeConnectionsEstimate = Math.max(0, connectionsOpened - connectionsClosed);

  return {
    source,
    counters,
    latency,
    errors: rejected,
    throughputPerSec: (accepted + rejected) / Math.max(windowSec, 1),
    connections: activeConnectionsEstimate,
    connectionsOpened,
    connectionsClosed,
    activeConnectionsEstimate,
  };
}

function deriveProtocolMetrics(protocol: "v1" | "v2", summary: SourceMetricsSummary, rejectReasons: Record<string, number>): StratumProtocolMetricsSummary {
  const acceptedShares = summary.counters.share_accepted || 0;
  const rejectedShares = summary.counters.share_rejected || 0;
  const totalShares = acceptedShares + rejectedShares;
  const acceptRate = totalShares > 0 ? acceptedShares / totalShares : 0;
  const rejectRate = totalShares > 0 ? rejectedShares / totalShares : 0;
  const connectionChurn = summary.connectionsOpened + summary.connectionsClosed;

  return {
    ...summary,
    protocol,
    acceptedShares,
    rejectedShares,
    totalShares,
    acceptRate,
    rejectRate,
    connectionChurn,
    rejectReasons,
  };
}

function buildStratumAlerts(overall: Omit<StratumMetricsSummary, "protocols" | "submitLatency" | "alerts">, v1: StratumProtocolMetricsSummary, v2: StratumProtocolMetricsSummary, submitLatency: LatencyEntry | null) {
  const alerts: StratumAlert[] = [];

  if (overall.totalShares === 0 && overall.activeConnectionsEstimate > 0) {
    alerts.push({ level: "medium", message: "Connections appear active but no share traffic was captured in the current snapshot window." });
  }

  if (overall.totalShares >= 20) {
    if (overall.rejectRate >= 0.15) {
      alerts.push({ level: "high", message: `Overall reject rate is high at ${(overall.rejectRate * 100).toFixed(1)}%.` });
    } else if (overall.rejectRate >= 0.05) {
      alerts.push({ level: "medium", message: `Overall reject rate is elevated at ${(overall.rejectRate * 100).toFixed(1)}%.` });
    }
  }

  for (const protocol of [v1, v2]) {
    if (protocol.totalShares >= 20 && protocol.rejectRate >= 0.1) {
      alerts.push({ level: protocol.rejectRate >= 0.2 ? "high" : "medium", message: `Stratum ${protocol.protocol.toUpperCase()} reject rate is ${(protocol.rejectRate * 100).toFixed(1)}%.` });
    }
  }

  if (submitLatency) {
    if (submitLatency.p95 >= 2000) {
      alerts.push({ level: "high", message: `Submit-share latency p95 is ${submitLatency.p95} ms.` });
    } else if (submitLatency.p95 >= 1000) {
      alerts.push({ level: "medium", message: `Submit-share latency p95 is elevated at ${submitLatency.p95} ms.` });
    }
  }

  const topReason = Object.entries(overall.rejectReasons).sort((a, b) => b[1] - a[1])[0];
  if (topReason && overall.rejectedShares > 0) {
    alerts.push({ level: "low", message: `Top reject reason is ${topReason[0]} (${topReason[1]}).` });
  }

  if (alerts.length === 0) {
    alerts.push({ level: "low", message: "No active Stratum alerts in the current snapshot." });
  }

  return alerts;
}

export async function getSourceMetrics(source: string, windowSec = 15): Promise<SourceMetricsSummary> {
  const snapshot = await getMetricsSnapshot();
  const counters = collectSourceCounters(snapshot, source);
  const latency = collectSourceLatency(snapshot, source);
  return buildSourceSummary(source, counters, latency, windowSec);
}

export async function getStratumMetrics(windowSec = 15): Promise<StratumMetricsSummary> {
  const snapshot = await getMetricsSnapshot();
  const overallBase = buildSourceSummary("stratum", collectSourceCounters(snapshot, "stratum"), collectSourceLatency(snapshot, "stratum"), windowSec);
  const overallRejectReasons = collectRejectReasons(snapshot, "stratum");
  const v1 = deriveProtocolMetrics("v1", buildSourceSummary("stratum_v1", collectSourceCounters(snapshot, "stratum_v1"), {}, windowSec), collectRejectReasons(snapshot, "stratum_v1"));
  const v2 = deriveProtocolMetrics("v2", buildSourceSummary("stratum_v2", collectSourceCounters(snapshot, "stratum_v2"), {}, windowSec), collectRejectReasons(snapshot, "stratum_v2"));
  const acceptedShares = overallBase.counters.share_accepted || 0;
  const rejectedShares = overallBase.counters.share_rejected || 0;
  const totalShares = acceptedShares + rejectedShares;
  const acceptRate = totalShares > 0 ? acceptedShares / totalShares : 0;
  const rejectRate = totalShares > 0 ? rejectedShares / totalShares : 0;
  const connectionChurn = overallBase.connectionsOpened + overallBase.connectionsClosed;
  const submitLatency = overallBase.latency.stratum_submit_share ?? null;

  const overall: Omit<StratumMetricsSummary, "protocols" | "submitLatency" | "alerts"> = {
    ...overallBase,
    acceptedShares,
    rejectedShares,
    totalShares,
    acceptRate,
    rejectRate,
    connectionChurn,
    rejectReasons: overallRejectReasons,
  };

  return {
    ...overall,
    protocols: { v1, v2 },
    submitLatency,
    alerts: buildStratumAlerts(overall, v1, v2, submitLatency),
  };
}
