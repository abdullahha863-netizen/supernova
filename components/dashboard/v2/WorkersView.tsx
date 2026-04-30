"use client";

import { PageShell, StatCard } from "@/components/dashboard/v2/PageShell";
import { useRealtimeMiningData } from "@/components/dashboard/v2/useRealtimeMiningData";

type Worker = { id: string; name: string; hashrate: string; status: "online" | "offline" | "warning"; lastShare: string; rejectRate: string };
type OverviewPayload = { ok: boolean; overview: { workers: Worker[]; summary: { onlineWorkers: number; totalWorkers: number } } };

export default function WorkersView({ backHref = "/dashboard" }: { backHref?: string }) {
  const { data } = useRealtimeMiningData<OverviewPayload>("/api/dashboard/overview", 10000);
  const workers = data?.overview?.workers || [];

  return (
    <PageShell title="Workers" subtitle="Live workers table, status gauges, reject rates and share timing." backHref={backHref}>
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Online Workers" value={String(data?.overview?.summary?.onlineWorkers || 0)} />
        <StatCard label="Total Workers" value={String(data?.overview?.summary?.totalWorkers || 0)} />
        <StatCard label="Warning/Offline" value={String(workers.filter((w) => w.status !== "online").length)} />
      </section>

      <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
        <h2 className="text-lg font-bold text-[#C9EB55] mb-3">Workers Table</h2>
        <div className="overflow-auto text-sm">
          <table className="w-full">
            <thead className="text-white/60">
              <tr><th className="text-left pb-2">Worker</th><th className="text-left pb-2">Status</th><th className="text-right pb-2">Hashrate</th><th className="text-right pb-2">Reject</th><th className="text-right pb-2">Last Share</th></tr>
            </thead>
            <tbody>
              {workers.map((w) => (
                <tr key={w.id} className="border-t border-white/10">
                  <td className="py-2">{w.name}</td>
                  <td className="py-2">{w.status}</td>
                  <td className="py-2 text-right">{w.hashrate}</td>
                  <td className="py-2 text-right">{w.rejectRate}</td>
                  <td className="py-2 text-right">{w.lastShare}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PageShell>
  );
}
