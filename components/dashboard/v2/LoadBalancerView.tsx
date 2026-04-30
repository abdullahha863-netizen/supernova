"use client";

import { PageShell, StatCard } from "@/components/dashboard/v2/PageShell";
import { useRealtimeMiningData } from "@/components/dashboard/v2/useRealtimeMiningData";

type HealthPayload = { status: string; checks: { redis: boolean; rabbitmq: boolean } };
type SourcePayload = { throughputPerSec: number; connections: number; errors: number };
const runtimeMetricsEnabled = process.env.NEXT_PUBLIC_ENABLE_MINING_RUNTIME_METRICS === "true";

export default function LoadBalancerView({ backHref = "/dashboard" }: { backHref?: string }) {
  const health = useRealtimeMiningData<HealthPayload>(runtimeMetricsEnabled ? "/api/mining/health" : null, 5000);
  const ws = useRealtimeMiningData<SourcePayload>(runtimeMetricsEnabled ? "/api/mining/ws" : null, 7000);
  const stratum = useRealtimeMiningData<SourcePayload>(runtimeMetricsEnabled ? "/api/mining/stratum" : null, 7000);
  const rest = useRealtimeMiningData<SourcePayload>(runtimeMetricsEnabled ? "/api/mining/rest" : null, 7000);

  const serviceChecks = runtimeMetricsEnabled
    ? [
        { label: "Redis", value: health.data?.checks?.redis ? "UP" : "DOWN" },
        { label: "RabbitMQ", value: health.data?.checks?.rabbitmq ? "UP" : "DOWN" },
      ]
    : [
        { label: "Redis", value: "Build" },
        { label: "RabbitMQ", value: "Build" },
      ];

  const sourceErrors = runtimeMetricsEnabled
    ? [
        { label: "REST", errors: rest.data?.errors || 0, status: "Live" },
        { label: "WebSocket", errors: ws.data?.errors || 0, status: "Live" },
        { label: "Stratum", errors: stratum.data?.errors || 0, status: "Live" },
      ]
    : [
        { label: "REST", errors: 0, status: "Build Stage" },
        { label: "WebSocket", errors: 0, status: "Build Stage" },
        { label: "Stratum", errors: 0, status: "Build Stage" },
      ];

  return (
    <PageShell title="Load Balancer (NGINX)" subtitle="Upstream availability, per-protocol traffic split, connections and errors." backHref={backHref}>
      {!runtimeMetricsEnabled ? (
        <section className="rounded-3xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
          Runtime mining metrics are disabled during build stage. This page shows build-stage status only and does not trigger live runtime fetches.
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="LB Health" value={runtimeMetricsEnabled ? health.data?.status || "unknown" : "Build"} />
        <StatCard label="REST Conn" value={runtimeMetricsEnabled ? String(rest.data?.connections || 0) : "Build"} />
        <StatCard label="WS Conn" value={runtimeMetricsEnabled ? String(ws.data?.connections || 0) : "Build"} />
        <StatCard label="Stratum Conn" value={runtimeMetricsEnabled ? String(stratum.data?.connections || 0) : "Build"} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {serviceChecks.map((service) => (
          <div key={service.label} className="rounded-2xl border border-[#C9EB55]/18 bg-white/[0.03] p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-white/50">Service Check</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[#C9EB55]">{service.label}</h2>
              <span className={`rounded-full border px-3 py-1 text-xs ${service.value === "UP" ? "border-emerald-400/40 text-emerald-200" : service.value === "DOWN" ? "border-red-500/40 text-red-200" : "border-amber-400/40 text-amber-200"}`}>
                {service.value}
              </span>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
        <h2 className="text-lg font-bold text-[#C9EB55] mb-3">Traffic Split</h2>
        <TrafficRow label="REST" value={rest.data?.throughputPerSec || 0} />
        <TrafficRow label="WebSocket" value={ws.data?.throughputPerSec || 0} />
        <TrafficRow label="Stratum" value={stratum.data?.throughputPerSec || 0} />
      </section>

      <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
        <h2 className="text-lg font-bold text-[#C9EB55] mb-3">Per-Source Errors</h2>
        <div className="overflow-auto text-sm">
          <table className="w-full">
            <thead className="text-white/60">
              <tr><th className="text-left pb-2">Source</th><th className="text-left pb-2">Mode</th><th className="text-right pb-2">Errors</th></tr>
            </thead>
            <tbody>
              {sourceErrors.map((row) => (
                <tr key={row.label} className="border-t border-white/10">
                  <td className="py-2 text-white/85">{row.label}</td>
                  <td className="py-2 text-white/60">{row.status}</td>
                  <td className="py-2 text-right text-[#C9EB55] font-semibold">{row.errors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PageShell>
  );
}

function TrafficRow({ label, value }: { label: string; value: number }) {
  const width = Math.min(100, value * 5);
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm text-white/70"><span>{label}</span><span>{value.toFixed(2)}/s</span></div>
      <div className="h-2 rounded bg-white/10 mt-1"><div className="h-2 rounded bg-[#C9EB55]" style={{ width: `${Math.max(4, width)}%` }} /></div>
    </div>
  );
}
