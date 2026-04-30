"use client";

import { useMemo } from "react";
import { PageShell, StatCard } from "@/components/dashboard/v2/PageShell";
import { useRealtimeMiningData } from "@/components/dashboard/v2/useRealtimeMiningData";

type QueuePayload = {
  ok: boolean;
  enabled?: boolean;
  status?: string;
  queue: string;
  messages: number;
  consumers: number;
  at: string;
  message?: string;
  error?: string;
};

const runtimeMetricsEnabled = process.env.NEXT_PUBLIC_ENABLE_MINING_RUNTIME_METRICS === "true";

export default function QueueView({ backHref = "/dashboard" }: { backHref?: string }) {
  const { data, error } = useRealtimeMiningData<QueuePayload>(runtimeMetricsEnabled ? "/api/mining/queue" : null, 5000);

  const derivedStatus = useMemo(() => {
    if (!runtimeMetricsEnabled) return "Build Stage";
    if (error || data?.status === "unavailable") return "Unavailable";
    if (data?.status === "no-consumers") return "No Consumers";
    if (data?.status === "backlogged") return "Backlogged";
    if (data?.status === "healthy") return "Healthy";
    return "Unknown";
  }, [data?.status, error]);

  const warnings = useMemo(() => {
    const rows: string[] = [];
    if (!runtimeMetricsEnabled) {
      rows.push("Queue monitoring stays disabled during build stage to avoid RabbitMQ runtime dependencies.");
      return rows;
    }
    if (error) {
      rows.push(`Queue endpoint unavailable: ${error}`);
      return rows;
    }
    if ((data?.messages || 0) > 0 && (data?.consumers || 0) === 0) {
      rows.push("Messages are accumulating while there are no active consumers.");
    }
    if ((data?.messages || 0) > 500) {
      rows.push(`Queue backlog is elevated at ${data?.messages || 0} messages.`);
    }
    if ((data?.messages || 0) === 0 && (data?.consumers || 0) > 0) {
      rows.push("Queue is clear and consumers are attached.");
    }
    return rows;
  }, [data, error]);

  return (
    <PageShell title="Queue Monitoring" subtitle="RabbitMQ queue depth, consumers, and real-time ingestion pressure." backHref={backHref}>
      {!runtimeMetricsEnabled ? (
        <section className="rounded-3xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
          Queue monitoring is in build-stage mode. The page shows status guidance only and does not poll RabbitMQ until runtime metrics are enabled.
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Queue" value={data?.queue || "Build"} />
        <StatCard label="Messages" value={runtimeMetricsEnabled ? String(data?.messages || 0) : "Build"} />
        <StatCard label="Consumers" value={runtimeMetricsEnabled ? String(data?.consumers || 0) : "Build"} />
        <StatCard label="Status" value={derivedStatus} />
      </section>

      <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
        <h2 className="text-lg font-bold text-[#C9EB55] mb-3">Warnings</h2>
        <div className="space-y-2">
          {warnings.map((warning, index) => (
            <div key={`${warning}-${index}`} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">
              {warning}
            </div>
          ))}
          {warnings.length === 0 ? (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              No active queue warnings.
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
        <h2 className="text-lg font-bold text-[#C9EB55] mb-3">Queue Gauge</h2>
        <div className="h-3 rounded bg-white/10 overflow-hidden">
          <div className="h-3 rounded bg-[#C9EB55]" style={{ width: `${Math.min(100, (data?.messages || 0) / 20)}%` }} />
        </div>
        <div className="mt-3 text-xs text-white/50">Last updated: {runtimeMetricsEnabled ? (data?.at ? new Date(data.at).toLocaleTimeString() : "Unknown") : "Build Stage"}</div>
      </section>
    </PageShell>
  );
}
