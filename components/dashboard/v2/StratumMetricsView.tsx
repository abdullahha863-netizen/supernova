"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRealtimeMiningData } from "@/components/dashboard/v2/useRealtimeMiningData";

type LatencySummary = { count: number; avg: number; p50: number; p95: number; p99: number };

type ProtocolSummary = {
  protocol: "v1" | "v2";
  acceptedShares: number;
  rejectedShares: number;
  totalShares: number;
  acceptRate: number;
  rejectRate: number;
  connectionChurn: number;
  connectionsOpened: number;
  connectionsClosed: number;
  activeConnectionsEstimate: number;
  throughputPerSec: number;
  rejectReasons: Record<string, number>;
};

type StratumMetricsResponse = {
  ok: boolean;
  enabled?: boolean;
  status?: string;
  message?: string;
  source: string;
  counters: Record<string, number>;
  latency: Record<string, LatencySummary>;
  errors: number;
  throughputPerSec: number;
  connectionsOpened: number;
  connectionsClosed: number;
  activeConnectionsEstimate: number;
  acceptedShares: number;
  rejectedShares: number;
  totalShares: number;
  acceptRate: number;
  rejectRate: number;
  connectionChurn: number;
  rejectReasons: Record<string, number>;
  submitLatency: LatencySummary | null;
  alerts: Array<{ level: "high" | "medium" | "low"; message: string }>;
  protocols: {
    v1: ProtocolSummary;
    v2: ProtocolSummary;
  };
  at: string;
};

const runtimeMetricsEnabled = process.env.NEXT_PUBLIC_ENABLE_MINING_RUNTIME_METRICS === "true";

function formatUtc(value?: string) {
  if (!value) return "Not loaded yet";
  return new Date(value).toISOString().replace("T", " ").replace(".000Z", " UTC");
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function alertTone(level: "high" | "medium" | "low") {
  if (level === "high") return "border-red-400/35 bg-red-500/10 text-red-100";
  if (level === "medium") return "border-amber-400/35 bg-amber-500/10 text-amber-100";
  return "border-emerald-400/35 bg-emerald-500/10 text-emerald-100";
}

function rejectReasonTone(reason: string, share: number) {
  const normalized = reason.toLowerCase();

  if (normalized === "not_authorized" || normalized === "job_owner_mismatch") {
    return "border-red-400/30 bg-red-500/10 text-red-100";
  }
  if (normalized === "rate_limited" || normalized === "stale_job") {
    return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  }
  if (normalized === "invalid_nonce") {
    return share >= 0.2
      ? "border-red-400/30 bg-red-500/10 text-red-100"
      : "border-orange-400/30 bg-orange-500/10 text-orange-100";
  }

  if (share >= 0.35) {
    return "border-red-400/30 bg-red-500/10 text-red-100";
  }
  if (share >= 0.15) {
    return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  }
  return "border-white/10 bg-black/20 text-white/75";
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-[#C9EB55]/20 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-white/60">{label}</p>
      <p className="mt-2 text-2xl font-black text-[#C9EB55]">{value}</p>
      {sub ? <p className="mt-1 text-xs text-white/45">{sub}</p> : null}
    </div>
  );
}

function ProtocolCard({ title, data }: { title: string; data: ProtocolSummary }) {
  return (
    <div className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#C9EB55]">{title}</h2>
        <span className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/75">
          {data.totalShares} shares
        </span>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Accept Rate" value={formatPercent(data.acceptRate)} sub={`${data.acceptedShares} accepted`} />
        <StatCard label="Reject Rate" value={formatPercent(data.rejectRate)} sub={`${data.rejectedShares} rejected`} />
        <StatCard label="Active Conn. Est." value={String(data.activeConnectionsEstimate)} sub={`${data.connectionsOpened} opened / ${data.connectionsClosed} closed`} />
        <StatCard label="Events / Sec Est." value={data.throughputPerSec.toFixed(2)} sub={`Churn ${data.connectionChurn}`} />
      </div>
    </div>
  );
}

function RejectReasonsCard({ title, reasons }: { title: string; reasons: Record<string, number> }) {
  const rows = Object.entries(reasons).sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
      <h2 className="text-lg font-bold text-[#C9EB55] mb-3">{title}</h2>
      {rows.length === 0 ? <p className="text-sm text-white/55">No rejected share reasons recorded in the current snapshot.</p> : null}
      {rows.length > 0 ? (
        <div className="space-y-2 text-sm">
          {rows.map(([reason, count]) => (
            <div key={reason} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${rejectReasonTone(reason, total > 0 ? count / total : 0)}`}>
              <div className="min-w-0">
                <p className="break-all">{reason}</p>
                <p className="mt-1 text-xs opacity-75">{total > 0 ? formatPercent(count / total) : "0.0%"} of rejects</p>
              </div>
              <span className="pl-3 font-semibold text-[#D7F27A]">{count}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function StratumMetricsView({ backHref = "/admin/dashboard" }: { backHref?: string }) {
  const endpoint = runtimeMetricsEnabled ? "/api/mining/stratum" : null;
  const { data, loading, error, reload } = useRealtimeMiningData<StratumMetricsResponse>(endpoint, { intervalMs: 0, enableWebSocket: false });

  const counterRows = useMemo(() => Object.entries(data?.counters || {}).sort((a, b) => b[1] - a[1]), [data?.counters]);
  const latencyRows = useMemo(() => Object.entries(data?.latency || {}), [data?.latency]);
  const alerts = data?.alerts || [];

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
              <h1 className="text-3xl font-black">Stratum Metrics</h1>
              <p className="mt-2 text-sm text-white/60">Health-oriented Stratum view with V1/V2 comparison, derived alerting, and raw counters lower in the page.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/75">Manual Refresh</span>
              <button onClick={() => void reload()} className="cursor-pointer rounded-full border border-[#C9EB55]/35 bg-[#C9EB55]/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#C9EB55]">Refresh</button>
              <Link href={backHref} className="rounded-full border border-white/20 bg-white/[0.05] px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/80">Back</Link>
            </div>
          </div>
        </section>

        {loading ? <p className="text-white/70">Loading...</p> : null}
        {error ? <p className="text-red-300">{error}</p> : null}
        {!runtimeMetricsEnabled ? <p className="text-white/60">Runtime mining metrics are disabled during build stage.</p> : null}
        {!loading && !error && data?.message ? <p className="text-white/60">{data.message}</p> : null}

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="Active Conn. Est." value={String(data?.activeConnectionsEstimate || 0)} sub={`${data?.connectionsOpened || 0} opened / ${data?.connectionsClosed || 0} closed`} />
          <StatCard label="Accept Rate" value={formatPercent(data?.acceptRate || 0)} sub={`${data?.acceptedShares || 0} accepted`} />
          <StatCard label="Reject Rate" value={formatPercent(data?.rejectRate || 0)} sub={`${data?.rejectedShares || 0} rejected`} />
          <StatCard label="P95 Submit Latency" value={data?.submitLatency ? `${data.submitLatency.p95} ms` : "-"} sub={`Updated ${formatUtc(data?.at)}`} />
        </section>

        <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-[#C9EB55]">Stratum Alerts</h2>
              <p className="text-sm text-white/60">Derived from reject rates, latency bands, and connection/share behavior.</p>
            </div>
            <p className="text-xs uppercase tracking-[0.14em] text-white/45">Last updated: {formatUtc(data?.at)}</p>
          </div>
          <div className="mt-4 space-y-2">
            {alerts.map((alert, index) => (
              <div key={`${alert.message}-${index}`} className={`rounded-xl border px-4 py-3 text-sm ${alertTone(alert.level)}`}>
                {alert.message}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <ProtocolCard title="Stratum V1" data={data?.protocols.v1 || { protocol: "v1", acceptedShares: 0, rejectedShares: 0, totalShares: 0, acceptRate: 0, rejectRate: 0, connectionChurn: 0, connectionsOpened: 0, connectionsClosed: 0, activeConnectionsEstimate: 0, throughputPerSec: 0, rejectReasons: {} }} />
          <ProtocolCard title="Stratum V2" data={data?.protocols.v2 || { protocol: "v2", acceptedShares: 0, rejectedShares: 0, totalShares: 0, acceptRate: 0, rejectRate: 0, connectionChurn: 0, connectionsOpened: 0, connectionsClosed: 0, activeConnectionsEstimate: 0, throughputPerSec: 0, rejectReasons: {} }} />
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <RejectReasonsCard title="Reject Reasons: All Stratum" reasons={data?.rejectReasons || {}} />
          <RejectReasonsCard title="Reject Reasons: V1" reasons={data?.protocols.v1.rejectReasons || {}} />
          <RejectReasonsCard title="Reject Reasons: V2" reasons={data?.protocols.v2.rejectReasons || {}} />
        </section>

        <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <h2 className="text-lg font-bold text-[#C9EB55] mb-4">Shared Submit Latency</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Average" value={data?.submitLatency ? `${data.submitLatency.avg} ms` : "-"} />
            <StatCard label="P50" value={data?.submitLatency ? `${data.submitLatency.p50} ms` : "-"} />
            <StatCard label="P95" value={data?.submitLatency ? `${data.submitLatency.p95} ms` : "-"} />
            <StatCard label="P99" value={data?.submitLatency ? `${data.submitLatency.p99} ms` : "-"} sub={data?.submitLatency ? `${data.submitLatency.count} samples` : undefined} />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
            <h2 className="text-lg font-bold text-[#C9EB55] mb-3">Raw Counters</h2>
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
            <h2 className="text-lg font-bold text-[#C9EB55] mb-3">Raw Latency Metrics</h2>
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