"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRealtimeMiningData } from "@/components/dashboard/v2/useRealtimeMiningData";

type SourceMetricsResponse = {
  ok: boolean;
  enabled?: boolean;
  status?: string;
  message?: string;
  source: string;
  counters: Record<string, number>;
  latency: Record<string, { count: number; avg: number; p50: number; p95: number; p99: number }>;
  errors: number;
  throughputPerSec: number;
  connectionsOpened: number;
  connectionsClosed: number;
  activeConnectionsEstimate: number;
  at: string;
};

const runtimeMetricsEnabled = process.env.NEXT_PUBLIC_ENABLE_MINING_RUNTIME_METRICS === "true";

export function SourceMetricsView({ title, endpoint, backHref = "/dashboard" }: { title: string; endpoint: string; backHref?: string }) {
  const effectiveEndpoint = runtimeMetricsEnabled ? endpoint : null;
  const { data, loading, error, reload } = useRealtimeMiningData<SourceMetricsResponse>(effectiveEndpoint, { intervalMs: 0, enableWebSocket: false });

  const counterRows = useMemo(() => Object.entries(data?.counters || {}).sort((a, b) => b[1] - a[1]), [data?.counters]);
  const latencyRows = useMemo(() => Object.entries(data?.latency || {}), [data?.latency]);
  const chartValues = useMemo(() => counterRows.slice(0, 8).map(([, value]) => value), [counterRows]);
  const chartMax = Math.max(...chartValues, 1);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(201,235,85,0.08),transparent_42%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_8%,rgba(201,235,85,0.05),transparent_36%)]" />
      </div>

      <main className="mx-auto w-full max-w-7xl px-5 py-8 md:px-10 md:py-10 space-y-6">
        <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#C9EB55]/80">Dashboard v2</p>
              <h1 className="text-3xl font-black">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/75">
                Manual Refresh
              </span>
              <button onClick={() => void reload()} className="cursor-pointer rounded-full border border-[#C9EB55]/35 bg-[#C9EB55]/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#C9EB55]">
                Refresh
              </button>
              <Link href={backHref} className="rounded-full border border-white/20 bg-white/[0.05] px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/80">
                Back
              </Link>
            </div>
          </div>
        </section>

        {loading ? <p className="text-white/70">Loading...</p> : null}
        {error ? <p className="text-red-300">{error}</p> : null}
        {!runtimeMetricsEnabled ? <p className="text-white/60">Runtime mining metrics are disabled during build stage.</p> : null}
        {!loading && !error && data?.message ? <p className="text-white/60">{data.message}</p> : null}

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="Active Conn. Est." value={String(data?.activeConnectionsEstimate || 0)} />
          <StatCard label="Events / Sec Est." value={(data?.throughputPerSec || 0).toFixed(2)} />
          <StatCard label="Errors" value={String(data?.errors || 0)} />
          <StatCard label="Counters" value={String(counterRows.length)} />
        </section>

        <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <div className="grid gap-4 md:grid-cols-3 text-sm text-white/75">
            <p>Connections Opened: {data?.connectionsOpened || 0}</p>
            <p>Connections Closed: {data?.connectionsClosed || 0}</p>
            <p>Last Updated: {data?.at ? new Date(data.at).toISOString().replace("T", " ").replace(".000Z", " UTC") : "Not loaded yet"}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <h2 className="text-lg font-bold text-[#C9EB55] mb-4">Counters Chart</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {counterRows.slice(0, 8).map(([name, value]) => (
              <div key={name} className="rounded-xl border border-white/10 p-3 bg-black/30">
                <p className="text-xs text-white/60 truncate">{name}</p>
                <p className="text-xl font-semibold">{value}</p>
                <div className="mt-2 h-2 rounded bg-white/10">
                  <div className="h-2 rounded bg-[#C9EB55]" style={{ width: `${Math.max(6, (value / chartMax) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
            <h2 className="text-lg font-bold text-[#C9EB55] mb-3">Counters Table</h2>
            <div className="max-h-[360px] overflow-auto text-sm">
              <table className="w-full">
                <thead className="text-white/60">
                  <tr><th className="text-left pb-2">Name</th><th className="text-right pb-2">Value</th></tr>
                </thead>
                <tbody>
                  {counterRows.map(([name, value]) => (
                    <tr key={name} className="border-t border-white/10">
                      <td className="py-2 pr-2 break-all">{name}</td>
                      <td className="py-2 text-right">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
            <h2 className="text-lg font-bold text-[#C9EB55] mb-3">Latency Table</h2>
            <div className="max-h-[360px] overflow-auto text-sm">
              <table className="w-full">
                <thead className="text-white/60">
                  <tr>
                    <th className="text-left pb-2">Metric</th>
                    <th className="text-right pb-2">Avg</th>
                    <th className="text-right pb-2">P95</th>
                    <th className="text-right pb-2">P99</th>
                  </tr>
                </thead>
                <tbody>
                  {latencyRows.map(([name, v]) => (
                    <tr key={name} className="border-t border-white/10">
                      <td className="py-2 pr-2 break-all">{name}</td>
                      <td className="py-2 text-right">{v.avg} ms</td>
                      <td className="py-2 text-right">{v.p95} ms</td>
                      <td className="py-2 text-right">{v.p99} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#C9EB55]/20 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-white/60">{label}</p>
      <p className="mt-2 text-2xl font-black text-[#C9EB55]">{value}</p>
    </div>
  );
}
