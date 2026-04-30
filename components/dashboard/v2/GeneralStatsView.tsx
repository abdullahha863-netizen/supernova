"use client";

import { useMemo } from "react";
import { PageShell, StatCard } from "@/components/dashboard/v2/PageShell";
import { useRealtimeMiningData } from "@/components/dashboard/v2/useRealtimeMiningData";

type MetricsPayload = {
  counters: Record<string, number>;
  latency: Record<string, { avg: number; p95: number; p99: number; count: number }>;
};

type StatsPayload = {
  totalMiners: number;
  activeMinerCount: number;
  totalShares: number;
  totalDifficulty: number;
  totalReward: number;
  generatedAt?: string;
};

export default function GeneralStatsView({
  backHref = "/dashboard",
  title = "General Mining Stats",
  subtitle = "Live counters, gauges, latency, throughput and error metrics.",
  statsEndpoint = "/api/mining/stats",
  metricsEndpoint = "/api/mining/metrics",
  buildStageMessage,
}: {
  backHref?: string;
  title?: string;
  subtitle?: string;
  statsEndpoint?: string | null;
  metricsEndpoint?: string | null;
  buildStageMessage?: string;
}) {
  const metrics = useRealtimeMiningData<MetricsPayload>(metricsEndpoint, 8000);
  const stats = useRealtimeMiningData<StatsPayload>(statsEndpoint, 8000);
  const statsDisabled = !statsEndpoint;
  const metricsDisabled = !metricsEndpoint;
  const buildStageText = buildStageMessage || "This page stays in build-stage mode until the mining database and runtime metrics are enabled.";

  const topCounters = useMemo(
    () => Object.entries(metrics.data?.counters || {}).sort((a, b) => b[1] - a[1]).slice(0, 10),
    [metrics.data?.counters],
  );

  return (
    <PageShell title={title} subtitle={subtitle} backHref={backHref}>
      {statsDisabled || metricsDisabled ? (
        <section className="rounded-3xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
          {buildStageText}
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Miners" value={statsDisabled ? "Build" : String(stats.data?.totalMiners || 0)} />
        <StatCard label="Active Miners" value={statsDisabled ? "Build" : String(stats.data?.activeMinerCount || 0)} />
        <StatCard label="Total Shares" value={statsDisabled ? "Build" : String(stats.data?.totalShares || 0)} />
        <StatCard label="Total Reward" value={statsDisabled ? "Build" : String((stats.data?.totalReward || 0).toFixed?.(4) || 0)} />
      </section>

      {stats.error && !statsDisabled ? (
        <section className="rounded-3xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-100">
          Failed to load stats: {stats.error}
        </section>
      ) : null}

      <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
        <h2 className="text-lg font-bold text-[#C9EB55] mb-3">Top Counters</h2>
        {metricsDisabled ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 text-sm text-white/60">
            Live counters stay disabled during build stage to avoid Redis-dependent runtime work while you are still building the project.
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {topCounters.map(([name, value]) => (
              <div key={name} className="rounded-xl border border-white/10 p-3 bg-black/30 flex items-center justify-between gap-4">
                <span className="text-sm text-white/80 break-all">{name}</span>
                <span className="text-[#C9EB55] font-bold">{value}</span>
              </div>
            ))}
            {topCounters.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 text-sm text-white/55">
                No counters available yet.
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
        <h2 className="text-lg font-bold text-[#C9EB55] mb-3">Latency Table</h2>
        {metricsDisabled ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 text-sm text-white/60">
            Latency sampling is disabled during build stage. Re-enable mining runtime metrics when you are ready for runtime validation.
          </div>
        ) : (
          <div className="overflow-auto text-sm">
            <table className="w-full">
              <thead className="text-white/60">
                <tr><th className="text-left pb-2">Metric</th><th className="text-right pb-2">Avg</th><th className="text-right pb-2">P95</th><th className="text-right pb-2">P99</th><th className="text-right pb-2">Count</th></tr>
              </thead>
              <tbody>
                {Object.entries(metrics.data?.latency || {}).map(([name, row]) => (
                  <tr key={name} className="border-t border-white/10">
                    <td className="py-2 break-all">{name}</td>
                    <td className="py-2 text-right">{row.avg} ms</td>
                    <td className="py-2 text-right">{row.p95} ms</td>
                    <td className="py-2 text-right">{row.p99} ms</td>
                    <td className="py-2 text-right">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageShell>
  );
}
