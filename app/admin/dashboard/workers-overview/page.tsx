"use client";

import { useMemo, useState } from "react";
import { PageShell, StatCard } from "@/components/dashboard/v2/PageShell";
import { useRealtimeMiningData } from "@/components/dashboard/v2/useRealtimeMiningData";

type Worker = { id: string; userId: string; name: string; hashrate: number; status: "online" | "offline" | "warning"; lastShare: string; rejectRate: number; createdAt: string };
type WorkersPayload = { ok: boolean; overview: { workers: Worker[]; summary: { onlineWorkers: number; totalWorkers: number; warningOffline: number } } };
type SourcePayload = { source: string; throughputPerSec: number; connections: number; errors: number; counters: Record<string, number> };

const runtimeMetricsEnabled = process.env.NEXT_PUBLIC_ENABLE_MINING_RUNTIME_METRICS === "true";

export default function WorkersOverviewPage() {
  const [activeTab, setActiveTab] = useState<"workers" | "throughput">("workers");

  const workersData = useRealtimeMiningData<WorkersPayload>("/api/admin/workers", { intervalMs: 10000, enableWebSocket: false });
  const rest = useRealtimeMiningData<SourcePayload>(runtimeMetricsEnabled ? "/api/mining/rest" : null, 7000);
  const ws = useRealtimeMiningData<SourcePayload>(runtimeMetricsEnabled ? "/api/mining/ws" : null, 7000);
  const stratum = useRealtimeMiningData<SourcePayload>(runtimeMetricsEnabled ? "/api/mining/stratum" : null, 7000);

  const workers = workersData.data?.overview?.workers || [];
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
    <PageShell title="Workers Overview" subtitle="Workers list with live throughput metrics across all sources." backHref="/admin/dashboard">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-white/10 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("workers")}
          className={`px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "workers"
              ? "border-b-2 border-[#C9EB55] text-[#C9EB55]"
              : "text-white/60 hover:text-white/80"
          }`}
        >
          Workers List
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("throughput")}
          className={`px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "throughput"
              ? "border-b-2 border-[#C9EB55] text-[#C9EB55]"
              : "text-white/60 hover:text-white/80"
          }`}
        >
          Throughput Metrics
        </button>
      </div>

      {/* Workers Tab */}
      {activeTab === "workers" && (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            <StatCard label="Online Workers" value={String(workersData.data?.overview?.summary?.onlineWorkers || 0)} />
            <StatCard label="Total Workers" value={String(workersData.data?.overview?.summary?.totalWorkers || 0)} />
            <StatCard label="Warning/Offline" value={String(workersData.data?.overview?.summary?.warningOffline || 0)} />
          </section>

          <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
            <h2 className="text-lg font-bold text-[#C9EB55] mb-3">Workers Table</h2>
            <div className="overflow-auto text-sm">
              <table className="w-full">
                <thead className="text-white/60">
                  <tr>
                    <th className="text-left pb-2">Worker</th>
                    <th className="text-left pb-2">Status</th>
                    <th className="text-right pb-2">Hashrate</th>
                    <th className="text-right pb-2">Reject</th>
                    <th className="text-right pb-2">Last Share</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map((w) => (
                    <tr key={w.id} className="border-t border-white/10">
                      <td className="py-2">{w.name}</td>
                      <td className="py-2">{w.status}</td>
                      <td className="py-2 text-right">{w.hashrate.toFixed(1)} GH/s</td>
                      <td className="py-2 text-right">{w.rejectRate.toFixed(1)}%</td>
                      <td className="py-2 text-right">{w.lastShare}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* Throughput Tab */}
      {activeTab === "throughput" && (
        <div className="space-y-6">
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
        </div>
      )}
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
        : "Healthy";

  const statusBg = !runtimeMetricsEnabled
    ? "bg-amber-500/15"
    : data?.errors
      ? "bg-red-500/15"
      : rejectRate >= 5
        ? "bg-yellow-500/15"
        : "bg-green-500/15";

  const statusText = !runtimeMetricsEnabled
    ? "text-amber-200"
    : data?.errors
      ? "text-red-200"
      : rejectRate >= 5
        ? "text-yellow-200"
        : "text-green-200";

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white">{title}</span>
        <span className={`text-xs font-semibold rounded-full px-2 py-1 ${statusBg} ${statusText}`}>{status}</span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-white/60">Throughput</span>
          <span className="text-white">{runtimeMetricsEnabled ? throughput.toFixed(2) : "—"} req/s</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-1.5">
          <div className="bg-[#C9EB55] h-1.5 rounded-full" style={{ width: `${throughputWidth}%` }} />
        </div>

        <div className="flex justify-between">
          <span className="text-white/60">Connections</span>
          <span className="text-white">{runtimeMetricsEnabled ? data?.connections || 0 : "—"}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-white/60">Accept Rate</span>
          <span className="text-white">{runtimeMetricsEnabled ? ((totalShares > 0 ? (accepted / totalShares) * 100 : 0).toFixed(1)) : "—"}%</span>
        </div>

        <div className="flex justify-between">
          <span className="text-white/60">Reject Rate</span>
          <span className="text-white">{runtimeMetricsEnabled ? rejectRate.toFixed(1) : "—"}%</span>
        </div>
      </div>
    </div>
  );
}
