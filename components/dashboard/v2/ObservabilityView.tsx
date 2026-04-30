"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageShell, StatCard } from "@/components/dashboard/v2/PageShell";
import { useRealtimeMiningData } from "@/components/dashboard/v2/useRealtimeMiningData";
import { useEffect, useEffectEvent, useMemo, useState } from "react";

type MetricsPayload = {
  generatedAt?: string;
  counters: Record<string, number>;
  latency: Record<string, { avg: number; p50: number; p95: number; p99: number; count: number }>;
};

type ConnectionsPayload = {
  source: string;
  topIps: Array<{ source: string; ip: string; count: number }>;
  topCountries: Array<{ source: string; country: string; count: number }>;
  recent: Array<{
    source: string;
    sourceIp: string;
    country: string;
    userId: string;
    workerName: string;
    eventType: string;
    at: number;
  }>;
};

type ParsedCounter = {
  key: string;
  name: string;
  value: number;
  labels: Record<string, string>;
};

type SnapshotPoint = {
  ts: number;
  payload: MetricsPayload;
};

type Severity = "high" | "medium" | "low";

function parseCounterKey(key: string) {
  const match = key.match(/^([^{}]+)(?:\{(.+)\})?$/);
  const name = match?.[1] || key;
  const labelsRaw = match?.[2] || "";
  const labels: Record<string, string> = {};

  if (labelsRaw) {
    for (const token of labelsRaw.split(",")) {
      const labelMatch = token.trim().match(/^([a-zA-Z0-9_]+)="([^"]*)"$/);
      if (labelMatch) {
        labels[labelMatch[1]] = labelMatch[2];
      }
    }
  }

  return { name, labels };
}

function sumCounter(parsed: ParsedCounter[], name: string, source: string) {
  return parsed
    .filter((entry) => entry.name === name && (source === "all" ? true : entry.labels.source === source))
    .reduce((acc, entry) => acc + entry.value, 0);
}

function latencyBySource(latency: MetricsPayload["latency"], source: string) {
  if (source === "all") return latency;
  const result: MetricsPayload["latency"] = {};
  const matcher = source.toLowerCase();

  for (const [key, value] of Object.entries(latency || {})) {
    const lower = key.toLowerCase();
    const sourceMapped = source === "stratum_v1" ? "v1" : source === "stratum_v2" ? "v2" : source;
    if (lower.includes(matcher) || lower.includes(sourceMapped)) {
      result[key] = value;
    }
  }

  return result;
}

function getWindowBase<T>(points: T[], timestamps: number[], windowMs: number): T | null {
  if (points.length === 0 || timestamps.length === 0) return null;
  const latestTs = timestamps[timestamps.length - 1];
  for (let i = timestamps.length - 1; i >= 0; i -= 1) {
    if (latestTs - timestamps[i] >= windowMs) {
      return points[i];
    }
  }
  return points[0] ?? null;
}

function toCompact(n: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function TrendLine({
  points,
  color,
  height = 110,
  className = "h-[110px] w-full overflow-visible",
  strokeWidth = 2.5,
}: {
  points: number[];
  color: string;
  height?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const chartPoints = points.filter((point) => Number.isFinite(point));

  if (chartPoints.length < 2) {
    return <div className={className.replace("overflow-visible", "").trim() || "w-full"} />;
  }

  const width = 520;
  const min = Math.min(...chartPoints);
  const max = Math.max(...chartPoints);
  const range = max - min || 1;
  const stepX = width / Math.max(chartPoints.length - 1, 1);
  const d = chartPoints
    .map((value, idx) => {
      const x = idx * stepX;
      const y = height - ((value - min) / range) * height;
      return `${idx === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className}>
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} />
    </svg>
  );
}

function maskIp(ip: string, masked: boolean) {
  if (!masked) return ip;
  const trimmed = String(ip || "").replace(/^::ffff:/, "");
  if (!trimmed || trimmed === "unknown") return "unknown";
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    if (parts.length <= 2) return "****:****";
    return `${parts.slice(0, 2).join(":")}::****`;
  }
  const parts = trimmed.split(".");
  if (parts.length !== 4) return "***.***.***.***";
  return `${parts[0]}.${parts[1]}.***.***`;
}

function formatSourceLabel(source: string) {
  if (source === "ws") return "WebSocket";
  if (source === "rest") return "REST";
  if (source === "stratum_v1") return "Stratum V1";
  if (source === "stratum_v2") return "Stratum V2";
  if (source === "all") return "All Sources";
  return source.replace(/_/g, " ");
}

function formatAge(ms: number | null) {
  if (ms === null || Number.isNaN(ms)) return "Unknown";
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

export default function ObservabilityView({ backHref = "/dashboard", runtimeEnabled = true }: { backHref?: string; runtimeEnabled?: boolean }) {
  if (!runtimeEnabled) {
    return (
      <PageShell
        title="Observability"
        subtitle="Runtime metrics and connection telemetry are intentionally disabled during build stage."
        backHref={backHref}
      >
        <section className="rounded-3xl border border-amber-400/25 bg-amber-500/10 p-5 text-sm text-amber-100">
          This page is in build-stage mode. Redis-backed counters, connection insights, and live source comparison stay off until you explicitly enable mining runtime metrics.
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard label="Runtime Metrics" value="Disabled" />
          <StatCard label="Connection Insights" value="Disabled" />
          <StatCard label="Build Stage" value="Active" />
        </section>

        <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6 text-sm text-white/65">
          Re-enable this page only when Redis and the rest of the mining runtime are ready for real operational validation.
        </section>
      </PageShell>
    );
  }

  return <ObservabilityRuntimeView backHref={backHref} />;
}

function ObservabilityRuntimeView({ backHref = "/dashboard" }: { backHref?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data, wsConnected } = useRealtimeMiningData<MetricsPayload>("/api/mining/metrics", 7000);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [history, setHistory] = useState<SnapshotPoint[]>([]);
  const [maskIpEnabled, setMaskIpEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const { data: connectionData } = useRealtimeMiningData<ConnectionsPayload>(`/api/mining/connections?source=${encodeURIComponent(sourceFilter)}&top=12&recent=30`, 7000);

  const appendHistory = useEffectEvent((snapshot: MetricsPayload) => {
    setHistory((prev) => {
      const next = [...prev, { ts: Date.now(), payload: snapshot }];
      if (next.length > 90) return next.slice(next.length - 90);
      return next;
    });
  });

  const resetSourceFilter = useEffectEvent(() => {
    setSourceFilter("all");
  });

  const syncSourceFilterFromQuery = useEffectEvent((requestedSource: string, availableSources: string[]) => {
    const nextSource = requestedSource === "all" || availableSources.includes(requestedSource) ? requestedSource : "all";

    if (nextSource !== sourceFilter) {
      setSourceFilter(nextSource);
    }
  });

  useEffect(() => {
    if (!data) return;
    appendHistory(data);
  }, [data]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const parsedCounters = useMemo<ParsedCounter[]>(() => {
    return Object.entries(data?.counters || {}).map(([key, value]) => {
      const parsed = parseCounterKey(key);
      return {
        key,
        value,
        name: parsed.name,
        labels: parsed.labels,
      };
    });
  }, [data]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    for (const entry of parsedCounters) {
      if (entry.labels.source) {
        set.add(entry.labels.source);
      }
    }
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [parsedCounters]);

  useEffect(() => {
    if (sourceFilter !== "all" && !sources.includes(sourceFilter)) {
      resetSourceFilter();
    }
  }, [sourceFilter, sources]);

  useEffect(() => {
    const requestedSource = searchParams.get("source") || "all";
    syncSourceFilterFromQuery(requestedSource, sources);
  }, [searchParams, sourceFilter, sources]);

  useEffect(() => {
    const currentSource = searchParams.get("source") || "all";
    if (currentSource === sourceFilter) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    if (sourceFilter === "all") {
      nextParams.delete("source");
    } else {
      nextParams.set("source", sourceFilter);
    }

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, sourceFilter]);

  const counterEntries = useMemo(() => {
    const rows = Object.entries(data?.counters || {})
      .filter(([key]) => {
        if (sourceFilter === "all") return true;
        return key.includes(`source="${sourceFilter}"`);
      })
      .sort((a, b) => b[1] - a[1]);
    return rows;
  }, [data, sourceFilter]);

  const filteredLatency = useMemo(() => latencyBySource(data?.latency || {}, sourceFilter), [data, sourceFilter]);

  const totalEvents = useMemo(() => counterEntries.reduce((acc, [, v]) => acc + v, 0), [counterEntries]);

  const trendSeries = useMemo(() => {
    return history.map((point) => {
      const parsed = Object.entries(point.payload.counters || {}).map(([key, value]) => {
        const parsedKey = parseCounterKey(key);
        return { key, name: parsedKey.name, value, labels: parsedKey.labels };
      });

      const accepted = sumCounter(parsed, "share_accepted", sourceFilter);
      const rejected = sumCounter(parsed, "share_rejected", sourceFilter);
      const fallback = sumCounter(parsed, "share_mq_fallback", sourceFilter);
      const latency = latencyBySource(point.payload.latency || {}, sourceFilter);
      const latencyRows = Object.values(latency);
      const p95 = latencyRows.length
        ? Math.max(...latencyRows.map((row) => row.p95 || 0))
        : 0;

      return {
        ts: point.ts,
        accepted,
        rejected,
        fallback,
        p95,
        total: accepted + rejected,
      };
    });
  }, [history, sourceFilter]);

  const timestamps = trendSeries.map((x) => x.ts);
  const basePoint = getWindowBase(trendSeries, timestamps, 5 * 60 * 1000);
  const latestPoint = trendSeries[trendSeries.length - 1] || null;

  const acceptedDelta = latestPoint && basePoint ? Math.max(0, latestPoint.accepted - basePoint.accepted) : 0;
  const rejectedDelta = latestPoint && basePoint ? Math.max(0, latestPoint.rejected - basePoint.rejected) : 0;
  const fallbackDelta = latestPoint && basePoint ? Math.max(0, latestPoint.fallback - basePoint.fallback) : 0;
  const shareDelta = acceptedDelta + rejectedDelta;
  const acceptanceRate = shareDelta > 0 ? (acceptedDelta / shareDelta) * 100 : 0;
  const rejectRate = shareDelta > 0 ? (rejectedDelta / shareDelta) * 100 : 0;
  const currentP95 = latestPoint?.p95 || 0;
  const latestTotal = latestPoint?.total || 0;
  const baseTotal = basePoint?.total || 0;
  const latestTs = latestPoint?.ts || 0;
  const baseTs = basePoint?.ts || latestTs;
  const minutes = Math.max(1 / 60, (latestTs - baseTs) / 60000);
  const throughputPerMin = Math.max(0, latestTotal - baseTotal) / minutes;

  const rejectRateTrend = useMemo(() => {
    if (trendSeries.length < 2) return [] as number[];
    const out: number[] = [];
    for (let i = 1; i < trendSeries.length; i += 1) {
      const prev = trendSeries[i - 1];
      const cur = trendSeries[i];
      const deltaAccepted = Math.max(0, cur.accepted - prev.accepted);
      const deltaRejected = Math.max(0, cur.rejected - prev.rejected);
      const total = deltaAccepted + deltaRejected;
      out.push(total > 0 ? (deltaRejected / total) * 100 : 0);
    }
    return out;
  }, [trendSeries]);

  const throughputTrend = useMemo(() => {
    if (trendSeries.length < 2) return [] as number[];
    const out: number[] = [];
    for (let i = 1; i < trendSeries.length; i += 1) {
      const prev = trendSeries[i - 1];
      const cur = trendSeries[i];
      const deltaTotal = Math.max(0, cur.total - prev.total);
      const deltaMinutes = Math.max(1 / 60, (cur.ts - prev.ts) / 60000);
      out.push(deltaTotal / deltaMinutes);
    }
    return out;
  }, [trendSeries]);

  const p95Trend = trendSeries.map((x) => x.p95);

  const snapshotAgeMs = data?.generatedAt
    ? Math.max(0, currentTime - new Date(data.generatedAt).getTime())
    : null;

  const eventBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of connectionData?.recent || []) {
      counts.set(row.eventType, (counts.get(row.eventType) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([eventType, count]) => ({ eventType, count }))
      .sort((a, b) => b.count - a.count);
  }, [connectionData]);

  const topRejectReasons = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of parsedCounters) {
      if (entry.name !== "share_rejected") continue;
      if (sourceFilter !== "all" && entry.labels.source !== sourceFilter) continue;
      const reason = entry.labels.reason || "unspecified";
      counts.set(reason, (counts.get(reason) || 0) + entry.value);
    }
    return Array.from(counts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [parsedCounters, sourceFilter]);

  const comparisonSources = useMemo(() => {
    const knownOrder = ["rest", "ws", "stratum_v1", "stratum_v2"];
    const available = sources.filter((source) => source !== "all");
    return [
      ...knownOrder.filter((source) => available.includes(source)),
      ...available.filter((source) => !knownOrder.includes(source)),
    ];
  }, [sources]);

  const sourceComparison = useMemo(() => {
    return comparisonSources.map((source) => {
      const series = history.map((point) => {
        const parsed = Object.entries(point.payload.counters || {}).map(([key, value]) => {
          const parsedKey = parseCounterKey(key);
          return { key, name: parsedKey.name, value, labels: parsedKey.labels };
        });

        const accepted = sumCounter(parsed, "share_accepted", source);
        const rejected = sumCounter(parsed, "share_rejected", source);
        const fallback = sumCounter(parsed, "share_mq_fallback", source);
        const latency = latencyBySource(point.payload.latency || {}, source);
        const latencyRows = Object.values(latency);

        return {
          ts: point.ts,
          accepted,
          rejected,
          fallback,
          total: accepted + rejected,
          p95: latencyRows.length ? Math.max(...latencyRows.map((row) => row.p95 || 0)) : 0,
        };
      });

      const seriesTimestamps = series.map((row) => row.ts);
      const latest = series[series.length - 1] || null;
      const base = getWindowBase(series, seriesTimestamps, 5 * 60 * 1000);
      const acceptedDelta = latest && base ? Math.max(0, latest.accepted - base.accepted) : 0;
      const rejectedDelta = latest && base ? Math.max(0, latest.rejected - base.rejected) : 0;
      const fallbackDelta = latest && base ? Math.max(0, latest.fallback - base.fallback) : 0;
      const totalDelta = acceptedDelta + rejectedDelta;
      const rejectRate = totalDelta > 0 ? (rejectedDelta / totalDelta) * 100 : 0;
      const latestTs = latest?.ts || 0;
      const baseTs = base?.ts || latestTs;
      const minutes = Math.max(1 / 60, (latestTs - baseTs) / 60000);

      return {
        source,
        acceptedDelta,
        rejectedDelta,
        fallbackDelta,
        totalDelta,
        rejectRate,
        throughputPerMin: totalDelta / minutes,
        p95: latest?.p95 || 0,
        throughputTrend: series.slice(-12).map((point, index, rows) => {
          if (index === 0) return 0;
          const previous = rows[index - 1];
          const deltaTotal = Math.max(0, point.total - previous.total);
          const deltaMinutes = Math.max(1 / 60, (point.ts - previous.ts) / 60000);
          return deltaTotal / deltaMinutes;
        }).slice(1),
      };
    });
  }, [comparisonSources, history]);

  const alerts = useMemo(() => {
    const rows: { severity: Severity; message: string }[] = [];
    if (rejectRate >= 10) {
      rows.push({ severity: "high", message: `Reject rate is ${rejectRate.toFixed(1)}% in the last 5m.` });
    } else if (rejectRate >= 5) {
      rows.push({ severity: "medium", message: `Reject rate is elevated at ${rejectRate.toFixed(1)}% in the last 5m.` });
    }

    if (currentP95 >= 2000) {
      rows.push({ severity: "high", message: `P95 latency is high at ${Math.round(currentP95)} ms.` });
    } else if (currentP95 >= 1200) {
      rows.push({ severity: "medium", message: `P95 latency is above target at ${Math.round(currentP95)} ms.` });
    }

    if (fallbackDelta > 0) {
      rows.push({ severity: "medium", message: `Queue fallback happened ${fallbackDelta} times in the last 5m.` });
    }

    if (snapshotAgeMs !== null && snapshotAgeMs >= 60_000) {
      rows.push({ severity: "high", message: `Metrics snapshot is stale (${formatAge(snapshotAgeMs)} old).` });
    } else if (snapshotAgeMs !== null && snapshotAgeMs >= 20_000) {
      rows.push({ severity: "medium", message: `Metrics snapshot freshness is slipping (${formatAge(snapshotAgeMs)} old).` });
    }

    if ((connectionData?.recent.length || 0) >= 10 && throughputPerMin < 1) {
      rows.push({ severity: "medium", message: "Connections are active but share throughput is near zero. Check auth, upstream pool, or worker config." });
    }

    if (!wsConnected) {
      rows.push({ severity: "low", message: "Realtime WS is disconnected, using polling only." });
    }

    return rows;
  }, [connectionData, currentP95, fallbackDelta, rejectRate, snapshotAgeMs, throughputPerMin, wsConnected]);

  const severityClass: Record<Severity, string> = {
    high: "border-red-500/40 bg-red-500/10 text-red-200",
    medium: "border-amber-400/40 bg-amber-400/10 text-amber-100",
    low: "border-sky-400/40 bg-sky-400/10 text-sky-100",
  };

  return (
    <PageShell title="Observability" subtitle="Global counters, histograms, latency percentiles, errors and throughput signals." backHref={backHref}>
      <section className="rounded-2xl border border-[#C9EB55]/16 bg-white/[0.02] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs uppercase tracking-[0.2em] text-white/55">Source Filter</label>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="rounded-lg border border-[#C9EB55]/25 bg-black/40 px-3 py-2 text-sm text-white"
          >
            {sources.map((source) => (
              <option key={source} value={source} className="bg-black">
                {source}
              </option>
            ))}
          </select>
          <span className={`rounded-full border px-3 py-1 text-xs ${wsConnected ? "border-emerald-400/40 text-emerald-200" : "border-amber-400/40 text-amber-200"}`}>
            {wsConnected ? "WS: Live" : "WS: Polling"}
          </span>
          <span className={`rounded-full border px-3 py-1 text-xs ${snapshotAgeMs !== null && snapshotAgeMs >= 20_000 ? "border-amber-400/40 text-amber-200" : "border-sky-400/40 text-sky-200"}`}>
            Snapshot Age: {formatAge(snapshotAgeMs)}
          </span>
          <button
            type="button"
            onClick={() => setMaskIpEnabled((v) => !v)}
            className="rounded-full border border-white/20 bg-white/[0.04] px-3 py-1 text-xs text-white/85"
          >
            {maskIpEnabled ? "IP Mask: ON" : "IP Mask: OFF"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Acceptance 5m" value={`${acceptanceRate.toFixed(1)}%`} />
        <StatCard label="Reject Rate 5m" value={`${rejectRate.toFixed(1)}%`} />
        <StatCard label="P95 Latency" value={`${Math.round(currentP95)} ms`} />
        <StatCard label="Throughput / min" value={toCompact(Math.round(throughputPerMin))} />
      </section>

      <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#C9EB55]">Source Comparison</h2>
            <p className="text-xs text-white/55">5-minute view across the active mining ingestion paths. Click any card to focus the page on that source.</p>
          </div>
          <div className="text-xs text-white/45">Accepted + rejected shares, reject rate, live p95 latency.</div>
        </div>
        <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
          {sourceComparison.map((row) => {
            const statusClass = row.rejectRate >= 10 || row.p95 >= 2000
              ? "border-red-500/30 bg-red-500/10"
              : row.rejectRate >= 5 || row.p95 >= 1200
                ? "border-amber-400/30 bg-amber-400/10"
                : "border-white/10 bg-black/20";

            return (
              <button
                key={row.source}
                type="button"
                onClick={() => setSourceFilter((current) => current === row.source ? "all" : row.source)}
                className={`rounded-2xl border p-4 text-left transition hover:border-[#C9EB55]/35 hover:bg-white/[0.05] ${statusClass} ${sourceFilter === row.source ? "ring-1 ring-[#C9EB55]/40" : ""}`}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="font-semibold text-white">{formatSourceLabel(row.source)}</div>
                  <div className="text-xs text-white/55">{sourceFilter === row.source ? "Active" : "5m"}</div>
                </div>
                <div className="mb-2 flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.14em] text-white/45">
                  <span>Throughput Trend</span>
                  <span>Recent snapshots</span>
                </div>
                <div className="mb-3 rounded-xl border border-white/10 bg-black/20 px-2 py-2">
                  <TrendLine
                    points={row.throughputTrend}
                    color="#C9EB55"
                    height={42}
                    className="h-[42px] w-full overflow-visible"
                    strokeWidth={2}
                  />
                </div>
                <div className="grid gap-2 text-sm text-white/85">
                  <div className="flex items-center justify-between gap-3"><span>Shares</span><strong>{toCompact(Math.round(row.totalDelta))}</strong></div>
                  <div className="flex items-center justify-between gap-3"><span>Reject Rate</span><strong>{row.rejectRate.toFixed(1)}%</strong></div>
                  <div className="flex items-center justify-between gap-3"><span>P95</span><strong>{Math.round(row.p95)} ms</strong></div>
                  <div className="flex items-center justify-between gap-3"><span>Fallback</span><strong>{row.fallbackDelta}</strong></div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <h2 className="mb-1 text-lg font-bold text-[#C9EB55]">Reject Rate Trend</h2>
          <p className="mb-3 text-xs text-white/55">Per refresh interval (%).</p>
          <TrendLine points={rejectRateTrend} color="#f87171" />
        </div>
        <div className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <h2 className="mb-1 text-lg font-bold text-[#C9EB55]">Throughput Trend</h2>
          <p className="mb-3 text-xs text-white/55">Shares per minute.</p>
          <TrendLine points={throughputTrend} color="#22d3ee" />
        </div>
        <div className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <h2 className="mb-1 text-lg font-bold text-[#C9EB55]">P95 Latency Trend</h2>
          <p className="mb-3 text-xs text-white/55">Milliseconds.</p>
          <TrendLine points={p95Trend} color="#c9eb55" />
        </div>
      </section>

      <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
        <h2 className="mb-3 text-lg font-bold text-[#C9EB55]">Alerts</h2>
        <div className="space-y-2">
          {alerts.length > 0 ? alerts.map((alert, idx) => (
            <div key={`${alert.message}-${idx}`} className={`rounded-xl border px-4 py-3 text-sm ${severityClass[alert.severity]}`}>
              <strong className="mr-2 uppercase text-xs tracking-[0.14em]">{alert.severity}</strong>
              <span>{alert.message}</span>
            </div>
          )) : (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              No active alerts. Core metrics are within expected thresholds.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <h2 className="mb-3 text-lg font-bold text-[#C9EB55]">Event Breakdown</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {eventBreakdown.map((row) => (
              <div key={row.eventType} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-white/45">Event</div>
                <div className="mt-2 text-sm font-semibold text-white">{row.eventType}</div>
                <div className="mt-3 text-2xl font-bold text-[#D7F27A]">{row.count}</div>
              </div>
            ))}
            {eventBreakdown.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 text-sm text-white/55">
                No connection events recorded for this filter yet.
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <h2 className="mb-3 text-lg font-bold text-[#C9EB55]">Top Reject Reasons</h2>
          <div className="space-y-3">
            {topRejectReasons.map((row) => {
              const totalRejects = Math.max(1, rejectedDelta);
              const percent = (row.count / totalRejects) * 100;
              return (
                <div key={row.reason} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3 text-sm text-white">
                    <span className="font-semibold">{row.reason}</span>
                    <span>{toCompact(row.count)}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[#C9EB55]" style={{ width: `${Math.min(100, percent)}%` }} />
                  </div>
                  <div className="mt-2 text-xs text-white/55">{percent.toFixed(1)}% of current filtered rejects</div>
                </div>
              );
            })}
            {topRejectReasons.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 text-sm text-white/55">
                No labeled reject reasons found for this filter.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <h2 className="mb-3 text-lg font-bold text-[#C9EB55]">Top Miner IPs</h2>
          <div className="max-h-[300px] overflow-auto text-sm">
            <table className="w-full">
              <thead className="text-white/60">
                <tr><th className="pb-2 text-left">IP</th><th className="pb-2 text-left">Source</th><th className="pb-2 text-right">Count</th></tr>
              </thead>
              <tbody>
                {(connectionData?.topIps || []).map((row) => (
                  <tr key={`${row.source}:${row.ip}`} className="border-t border-white/10">
                    <td className="py-2">{maskIp(row.ip, maskIpEnabled)}</td>
                    <td className="py-2 text-white/70">{row.source}</td>
                    <td className="py-2 text-right">{row.count}</td>
                  </tr>
                ))}
                {(connectionData?.topIps || []).length === 0 ? (
                  <tr><td className="py-2 text-white/55" colSpan={3}>No IP data yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <h2 className="mb-3 text-lg font-bold text-[#C9EB55]">Top Countries</h2>
          <div className="max-h-[300px] overflow-auto text-sm">
            <table className="w-full">
              <thead className="text-white/60">
                <tr><th className="pb-2 text-left">Country</th><th className="pb-2 text-left">Source</th><th className="pb-2 text-right">Count</th></tr>
              </thead>
              <tbody>
                {(connectionData?.topCountries || []).map((row) => (
                  <tr key={`${row.source}:${row.country}`} className="border-t border-white/10">
                    <td className="py-2">{row.country}</td>
                    <td className="py-2 text-white/70">{row.source}</td>
                    <td className="py-2 text-right">{row.count}</td>
                  </tr>
                ))}
                {(connectionData?.topCountries || []).length === 0 ? (
                  <tr><td className="py-2 text-white/55" colSpan={3}>No country data yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <h2 className="mb-3 text-lg font-bold text-[#C9EB55]">Recent Connections</h2>
          <div className="max-h-[300px] overflow-auto text-xs text-white/85">
            <div className="space-y-2">
              {(connectionData?.recent || []).map((row, idx) => (
                <div key={`${row.source}-${row.sourceIp}-${row.at}-${idx}`} className="rounded-lg border border-white/10 bg-black/20 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#D7F27A]">{row.source}</span>
                    <span className="text-white/55">{new Date(row.at).toLocaleTimeString()}</span>
                  </div>
                  <div className="mt-1 text-white/80">IP: {maskIp(row.sourceIp, maskIpEnabled)} | Country: {row.country}</div>
                  <div className="mt-1 text-white/60">Event: {row.eventType} {row.workerName ? `| Worker: ${row.workerName}` : ""}</div>
                </div>
              ))}
              {(connectionData?.recent || []).length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/15 bg-black/20 p-3 text-white/55">No recent connection events yet.</div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <h2 className="text-lg font-bold text-[#C9EB55] mb-3">Counters</h2>
          <div className="max-h-[360px] overflow-auto text-sm">
            <table className="w-full">
              <tbody>
                {counterEntries.map(([k, v]) => (
                  <tr key={k} className="border-t border-white/10"><td className="py-2 break-all">{k}</td><td className="py-2 text-right">{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <h2 className="text-lg font-bold text-[#C9EB55] mb-3">Histogram/Latency</h2>
          <div className="max-h-[360px] overflow-auto text-sm">
            <table className="w-full">
              <thead className="text-white/60">
                <tr><th className="text-left pb-2">Name</th><th className="text-right pb-2">P50</th><th className="text-right pb-2">P95</th><th className="text-right pb-2">P99</th></tr>
              </thead>
              <tbody>
                {Object.entries(filteredLatency).sort((a, b) => (b[1].p95 || 0) - (a[1].p95 || 0)).map(([k, v]) => (
                  <tr key={k} className="border-t border-white/10"><td className="py-2 break-all">{k}</td><td className="py-2 text-right">{v.p50}</td><td className="py-2 text-right">{v.p95}</td><td className="py-2 text-right">{v.p99}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Counters" value={String(counterEntries.length)} />
        <StatCard label="Latency Metrics" value={String(Object.keys(filteredLatency || {}).length)} />
        <StatCard label="Total Events" value={toCompact(totalEvents)} />
      </section>
    </PageShell>
  );
}
