"use client";

import { useMemo } from "react";
import { PageShell, StatCard } from "@/components/dashboard/v2/PageShell";
import { useRealtimeMiningData } from "@/components/dashboard/v2/useRealtimeMiningData";

type SourcePayload = { source: string; throughputPerSec: number; connections: number; errors: number; counters: Record<string, number> };
const runtimeMetricsEnabled = process.env.NEXT_PUBLIC_ENABLE_MINING_RUNTIME_METRICS === "true";

export default function WorkersThroughputView({ backHref = "/dashboard" }: { backHref?: string }) {
  const rest = useRealtimeMiningData<SourcePayload>(runtimeMetricsEnabled ? "/api/mining/rest" : null, 7000);
  const ws = useRealtimeMiningData<SourcePayload>(runtimeMetricsEnabled ? "/api/mining/ws" : null, 7000);
  const stratum = useRealtimeMiningData<SourcePayload>(runtimeMetricsEnabled ? "/api/mining/stratum" : null, 7000);

  const totalThroughput = (rest.data?.throughputPerSec || 0) + (ws.data?.throughputPerSec || 0) + (stratum.data?.throughputPerSec || 0);
  const maxThroughput = Math.max(rest.data?.throughputPerSec || 0, ws.data?.throughputPerSec || 0, stratum.data?.throughputPerSec || 0, 1);

  const sources = useMemo(
    () => [
      { title: "REST", data: rest.data },
      { title: "WebSocket", data: ws.data },
      { title: "Stratum", data: stratum.data },
    ],
    [rest.data, stratum.data, ws.data],
  );

  return (
    <PageShell title="Workers Throughput" subtitle="Per-source throughput, errors, connections and counters table." backHref={backHref}>
      {!runtimeMetricsEnabled ? (
        <section className="rounded-3xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
          Workers throughput is in build-stage mode. The layout stays visible, but live runtime metrics remain disabled until you explicitly enable mining runtime metrics.
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Throughput/s" value={runtimeMetricsEnabled ? totalThroughput.toFixed(2) : "Build"} />
        <StatCard label="REST Throughput/s" value={runtimeMetricsEnabled ? (rest.data?.throughputPerSec || 0).toFixed(2) : "Build"} />
        <StatCard label="WS Throughput/s" value={runtimeMetricsEnabled ? (ws.data?.throughputPerSec || 0).toFixed(2) : "Build"} />
        <StatCard label="Stratum Throughput/s" value={runtimeMetricsEnabled ? (stratum.data?.throughputPerSec || 0).toFixed(2) : "Build"} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {sources.map((source) => (
          <SourceBlock
            key={source.title}
            title={source.title}
            data={source.data}
            runtimeMetricsEnabled={runtimeMetricsEnabled}
            maxThroughput={maxThroughput}
          />
        ))}
      </section>
    </PageShell>
  );
}

function SourceBlock({
  title,
  data,
  runtimeMetricsEnabled,
  maxThroughput,
}: {
  title: string;
  data?: SourcePayload | null;
  runtimeMetricsEnabled: boolean;
  maxThroughput: number;
}) {
  const accepted = data?.counters?.share_accepted || 0;
  const rejected = data?.counters?.share_rejected || 0;
  const totalShares = accepted + rejected;
  const rejectRate = totalShares > 0 ? (rejected / totalShares) * 100 : 0;
  const throughput = data?.throughputPerSec || 0;
  const throughputWidth = runtimeMetricsEnabled ? Math.max(6, (throughput / maxThroughput) * 100) : 8;

  const status = !runtimeMetricsEnabled
    ? "Build Stage"
    : data?.errors
      ? "Elevated Errors"
      : rejectRate >= 5
        ? "Rejects Elevated"
        : throughput > 0 || (data?.connections || 0) > 0
          ? "Healthy"
          : "Idle";

  const statusClass = status === "Healthy"
    ? "border-emerald-400/40 text-emerald-200"
    : status === "Elevated Errors" || status === "Rejects Elevated"
      ? "border-amber-400/40 text-amber-200"
      : status === "Idle"
        ? "border-white/15 text-white/60"
        : "border-sky-400/40 text-sky-200";

  return (
    <div className="rounded-3xl border border-[#C9EB55]/20 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">Source</div>
          <h3 className="mt-2 text-lg font-bold text-[#C9EB55]">{title}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs ${statusClass}`}>
          {status}
        </span>
      </div>

      <div className="mb-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="mb-2 flex items-center justify-between gap-3 text-sm text-white/75">
          <span>Throughput</span>
          <strong className="text-white">{runtimeMetricsEnabled ? `${throughput.toFixed(2)}/s` : "Build"}</strong>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[#C9EB55]" style={{ width: `${Math.min(100, throughputWidth)}%` }} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MetricTile label="Connections" value={runtimeMetricsEnabled ? String(data?.connections || 0) : "Build"} />
        <MetricTile label="Errors" value={runtimeMetricsEnabled ? String(data?.errors || 0) : "Build"} />
        <MetricTile label="Accepted" value={runtimeMetricsEnabled ? String(accepted) : "Build"} />
        <MetricTile label="Rejected" value={runtimeMetricsEnabled ? String(rejected) : "Build"} />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
        <div className="flex items-center justify-between gap-3 text-sm text-white/75">
          <span>Reject Rate</span>
          <strong className="text-white">{runtimeMetricsEnabled ? `${rejectRate.toFixed(1)}%` : "Build"}</strong>
        </div>
      </div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">{label}</div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}
