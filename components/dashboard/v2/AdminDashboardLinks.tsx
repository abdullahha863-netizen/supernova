import Link from "next/link";
import { Bell } from "lucide-react";

const links = [
  ["System Health", "/admin/dashboard/system-health"],
  ["General Stats", "/admin/dashboard/stats"],
  ["Miners", "/admin/dashboard/miners"],
  ["Workers Overview", "/admin/dashboard/workers-overview"],
  ["Notifications", "/admin/dashboard/notifications"],
  ["Support Tickets", "/admin/dashboard/tickets"],
  ["Miner Cashout", "/admin/dashboard/cashout-review"],
  ["Stratum Metrics", "/admin/dashboard/stratum-metrics"],
  ["Queue Monitoring", "/admin/dashboard/queue-monitoring"],
  ["Observability", "/admin/dashboard/observability"],
  ["API Monitoring", "/admin/dashboard/api-monitoring"],
  ["Load Balancer", "/admin/dashboard/load-balancer"],
  ["Member Cards", "/admin/dashboard/tools/member-cards"],
  ["Metal Cards", "/admin/dashboard/tools/metal-cards"],
  ["Reset 2FA", "/admin/dashboard/tools/reset-2fa"],
] as const;

export default function AdminDashboardLinks() {
  return (
    <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-[#C9EB55]/80 mb-2">Admin Dashboard</p>
      <h2 className="text-2xl font-black mb-4">Monitoring & Operations</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(([label, href]) => (
          <Link key={`${href}:${label}`} href={href} className="rounded-xl border border-[#C9EB55]/25 bg-[#C9EB55]/8 px-4 py-3 text-sm font-semibold text-[#D7F27A] hover:bg-[#C9EB55]/14">
            <span className="inline-flex items-center gap-2">
              {label === "Notifications" ? <Bell className="h-4 w-4" /> : null}
              <span>{label}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
