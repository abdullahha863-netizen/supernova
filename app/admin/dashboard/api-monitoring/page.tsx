import AdminToolShell from "@/components/admin/AdminToolShell";
import { getRateLimitMetrics } from "@/lib/rateLimit";

export default function Page() {
  const metrics = getRateLimitMetrics();
  const routeRows = Object.entries(metrics.requestCounts);
  const blockedRows = Object.entries(metrics.blockedCounts);

  return (
    <AdminToolShell
      title="API Monitoring / Rate Limit Stats"
      subtitle="Read-only observability for rate-limited admin and mining endpoints."
      backHref="/admin/dashboard"
      showLinks={false}
    >
      <section className="grid gap-4 lg:grid-cols-4">
        <StatCard label="Tracked Endpoints" value={String(routeRows.length)} />
        <StatCard label="Blocked Requests" value={String(blockedRows.reduce((sum, [, count]) => sum + Number(count), 0))} />
        <StatCard label="Top IPs" value={String(metrics.topIps.length)} />
        <StatCard label="Metrics Generated" value={new Date(metrics.metricsAt).toLocaleString()} />
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-xl font-semibold text-[#C9EB55] mb-4">Requests Per Endpoint</h2>
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-white/60">
              <tr>
                <th className="pb-3">Endpoint</th>
                <th className="pb-3 text-right">Requests</th>
              </tr>
            </thead>
            <tbody>
              {routeRows.map(([route, count]) => (
                <tr key={route} className="border-t border-white/10">
                  <td className="py-3 pr-4 break-words">{route}</td>
                  <td className="py-3 text-right">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-semibold text-[#C9EB55] mb-4">Blocked Requests</h2>
          <div className="overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-white/60">
                <tr>
                  <th className="pb-3">Endpoint</th>
                  <th className="pb-3 text-right">Blocked</th>
                </tr>
              </thead>
              <tbody>
                {blockedRows.map(([route, count]) => (
                  <tr key={route} className="border-t border-white/10">
                    <td className="py-3 pr-4 break-words">{route}</td>
                    <td className="py-3 text-right">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-semibold text-[#C9EB55] mb-4">Top Users / IPs</h2>
          <div className="overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-white/60">
                <tr>
                  <th className="pb-3">IP</th>
                  <th className="pb-3 text-right">Requests</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topIps.map((row) => (
                  <tr key={row.ip} className="border-t border-white/10">
                    <td className="py-3 pr-4 break-words">{row.ip}</td>
                    <td className="py-3 text-right">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-xl font-semibold text-[#C9EB55] mb-4">Traffic Spikes</h2>
        <div className="space-y-3 text-sm text-white/80">
          {metrics.spikeNotes.map((note, index) => (
            <p key={`${note}:${index}`} className="rounded-2xl border border-white/10 bg-black/30 p-4">
              {note}
            </p>
          ))}
        </div>
      </section>
    </AdminToolShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-white/60">{label}</p>
      <p className="mt-3 text-3xl font-black text-[#C9EB55]">{value}</p>
    </div>
  );
}
