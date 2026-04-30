"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminToolShell from "@/components/admin/AdminToolShell";

// ─── Types ──────────────────────────────────────────────────────────────────

type Worker = { id: number; name: string; hashrate: number; status: string; last_share: string; reject_rate: number };

type UserData = {
  id: string; name: string; email: string; createdAt: string;
  twoFactorEnabled: boolean; lastLogin: string | null; lastIp: string | null;
  tier: string; payoutAddress: string; pendingBalance: number;
  totalHashrate: number; rewardFlow: number; workers: Worker[];
};

type HashratePoint = { ts: string; hashrate: number };
type HashrateData = {
  currentHashrate: number;
  windows: Record<string, HashratePoint[]>;
  comparison: Record<string, number>;
};

type CashoutData = {
  pendingBalance: number; totalPaidOut: number; payoutCount: number;
  lastPayout: { date: string; amount: number; status: string; tx: string } | null;
  history: Array<{ id: number; payout_date: string; amount: number; status: string; tx: string }>;
};

type UptimeData = {
  workerCount: number; onlineCount: number; offlineCount: number;
  avgRejectRate: number; uptimeHours24: number; uptimeHours7d: number;
  uptimeHours30d: number; disconnects: number; totalShares: number; rejects: number; errors: number;
  workers: Worker[];
};

type FraudFlag = { id: string; label: string; severity: "high" | "medium" | "low"; detail: string };
type FraudData = { overallRisk: "clean" | "suspicious" | "high_risk"; flagCount: number; flags: FraudFlag[] };

// ─── Mini sparkline chart (no external deps) ────────────────────────────────
function Sparkline({ points, color = "#C9EB55" }: { points: HashratePoint[]; color?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const chartPoints = points
    .map((point) => ({ ...point, hashrate: Number(point.hashrate) }))
    .filter((point) => Number.isFinite(point.hashrate));

  if (!chartPoints.length) return null;

  const values = chartPoints.map((p) => p.hashrate);
  const min = Math.min(...values);
  const max = Math.max(...values) || 1;
  const W = 100;
  const H = 40;
  const step = W / (chartPoints.length - 1 || 1);

  const pathD = chartPoints
    .map((p, i) => {
      const x = i * step;
      const y = H - ((p.hashrate - min) / (max - min || 1)) * H;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const fillD = `${pathD} L ${W} ${H} L 0 ${H} Z`;

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-10" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={fillD} fill="url(#sfill)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────
function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl border border-[#C9EB55]/18 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/55">{label}</p>
      <p className="mt-1 text-xl font-black text-[#C9EB55] truncate">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-white/40 truncate">{sub}</p>}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-[#C9EB55]/15 bg-white/[0.03] p-5 space-y-4">
      <h2 className="text-lg font-black text-[#D7F27A] uppercase tracking-[0.15em]">{title}</h2>
      {children}
    </section>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────
const SEVERITY_COLORS = {
  high: "bg-red-500/15 border-red-400/40 text-red-200",
  medium: "bg-yellow-500/15 border-yellow-400/40 text-yellow-200",
  low: "bg-blue-500/15 border-blue-400/40 text-blue-200",
};

function FraudBadge({ flag }: { flag: FraudFlag }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${SEVERITY_COLORS[flag.severity]}`}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-70">{flag.severity}</span>
        <span className="font-bold text-sm">{flag.label}</span>
      </div>
      <p className="mt-1 text-xs opacity-75">{flag.detail}</p>
    </div>
  );
}

// ─── Hashrate window tabs ───────────────────────────────────────────────────
const WINDOWS = ["1h", "3h", "6h", "24h", "3d", "7d", "14d", "30d"] as const;
type WindowKey = (typeof WINDOWS)[number];

// ─── Main page ────────────────────────────────────────────────────────────
export default function MinerReviewPage() {
  const params = useParams<{ minerId: string }>();
  const minerId = typeof params?.minerId === "string" ? params.minerId : "";
  const router = useRouter();

  const [user, setUser] = useState<UserData | null>(null);
  const [hashrate, setHashrate] = useState<HashrateData | null>(null);
  const [cashout, setCashout] = useState<CashoutData | null>(null);
  const [uptime, setUptime] = useState<UptimeData | null>(null);
  const [fraud, setFraud] = useState<FraudData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeWindow, setActiveWindow] = useState<WindowKey>("24h");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!minerId) {
      setLoading(false);
      setError("Missing miner id");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [uRes, hRes, cRes, utRes, fRes] = await Promise.all([
        fetch(`/api/mining/user/${minerId}`),
        fetch(`/api/mining/hashrate/history?userId=${minerId}`),
        fetch(`/api/mining/cashout?userId=${minerId}`),
        fetch(`/api/mining/uptime?userId=${minerId}`),
        fetch(`/api/mining/fraud-check?userId=${minerId}`),
      ]);

      const [uData, hData, cData, utData, fData] = await Promise.all([
        uRes.json(), hRes.json(), cRes.json(), utRes.json(), fRes.json(),
      ]);

      if (!uData.ok) throw new Error(uData.error || "Failed to load user");
      setUser(uData.user);
      if (hData.ok) setHashrate(hData);
      if (cData.ok) setCashout(cData);
      if (utData.ok) setUptime(utData);
      if (fData.ok) setFraud(fData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [minerId]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  async function doAction(action: "approve" | "reject" | "flag") {
    setActionLoading(true);
    setActionMsg(null);
    try {
      if (action === "flag") {
        const res = await fetch("/api/mining/fraud-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: minerId }),
        });
        const d = await res.json();
        setActionMsg(d.ok ? "User marked as suspicious." : d.error);
      } else {
        const res = await fetch("/api/mining/cashout", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: minerId, action }),
        });
        const d = await res.json();
        setActionMsg(d.ok ? `Cashout ${action}d successfully.` : d.error);
        if (d.ok) void fetchAll();
      }
    } catch {
      setActionMsg("Action failed. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  const fmt = (n: number, dec = 2) => n.toFixed(dec);
  const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—";

  const riskColors = {
    clean: "text-green-300 border-green-400/30 bg-green-500/10",
    suspicious: "text-yellow-200 border-yellow-400/30 bg-yellow-500/10",
    high_risk: "text-red-200 border-red-400/30 bg-red-500/10",
  };

  return (
    <AdminToolShell
      title={loading ? "Miner Review" : `Miner: ${user?.name ?? minerId}`}
      subtitle="Full miner analysis — hashrate history, cashout review, and anti-fraud indicators."
    >
      {loading && (
        <div className="text-center py-16 text-white/50 text-sm">Loading miner data…</div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-red-200 text-sm">
          {error}
        </div>
      )}

      {!loading && user && (
        <div className="space-y-6">

          {/* ── 1. Identity ──────────────────────────────────────────────── */}
          <Section title="Miner Identity">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Name" value={user.name} />
              <Stat label="Email" value={user.email} />
              <Stat label="User ID" value={<span className="text-sm font-mono">{user.id}</span>} />
              <Stat label="Membership Tier" value={user.tier} />
              <Stat label="Registered" value={fmtDate(user.createdAt)} />
              <Stat label="Last Login" value={fmtDate(user.lastLogin)} />
              <Stat label="Last IP" value={user.lastIp ?? "—"} />
              <Stat label="2FA" value={user.twoFactorEnabled ? "Enabled" : "Disabled"} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Active Workers" value={`${uptime?.onlineCount ?? 0} / ${uptime?.workerCount ?? user.workers.length}`} />
              <Stat label="Current Hashrate" value={`${fmt(user.totalHashrate)} MH/s`} />
              <Stat label="Payout Address" value={<span className="text-xs font-mono">{user.payoutAddress || "—"}</span>} />
            </div>
          </Section>

          {/* ── 2. Cashout History ────────────────────────────────────────── */}
          <Section title="Cashout History">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Stat label="Pending Balance" value={`${fmt(cashout?.pendingBalance ?? user.pendingBalance)} KAS`} />
              <Stat label="Total Paid Out" value={`${fmt(cashout?.totalPaidOut ?? 0)} KAS`} />
              <Stat label="Cashout Count" value={`${cashout?.payoutCount ?? 0}`} />
              <Stat
                label="Last Cashout"
                value={cashout?.lastPayout ? fmt(cashout.lastPayout.amount) + " KAS" : "—"}
                sub={cashout?.lastPayout ? fmtDate(cashout.lastPayout.date) : undefined}
              />
              <Stat label="Last Status" value={cashout?.lastPayout?.status ?? "—"} />
              <Stat label="Last TX" value={<span className="text-xs font-mono truncate">{cashout?.lastPayout?.tx ?? "—"}</span>} />
            </div>

            {cashout && cashout.history.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm text-white/80">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.14em] text-white/45">
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">TX</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashout.history.slice(0, 10).map((row) => (
                      <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="px-4 py-2">{fmtDate(row.payout_date)}</td>
                        <td className="px-4 py-2 text-right font-mono">{fmt(row.amount)} KAS</td>
                        <td className="px-4 py-2">
                          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${row.status === "paid" ? "bg-green-500/15 text-green-300" : "bg-yellow-500/15 text-yellow-200"}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-white/50 max-w-[160px] truncate">{row.tx}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* ── 3. Historical Hashrate Graph ──────────────────────────────── */}
          {hashrate && (
            <Section title="Historical Hashrate">
              {/* Window selector */}
              <div className="flex flex-wrap gap-2">
                {WINDOWS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setActiveWindow(w)}
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] transition-all ${
                      activeWindow === w
                        ? "border-[#C9EB55]/60 bg-[#C9EB55]/15 text-[#D7F27A]"
                        : "border-white/15 bg-white/[0.03] text-white/55 hover:border-white/30"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>

              {/* Chart */}
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-xs text-white/50 uppercase tracking-[0.14em]">Hashrate — Last {activeWindow}</span>
                  <span className="text-[#C9EB55] font-black">{fmt(hashrate.currentHashrate)} MH/s</span>
                </div>
                <Sparkline points={hashrate.windows[activeWindow] ?? []} />
                {/* X-axis labels */}
                <div className="flex justify-between mt-1 text-[10px] text-white/30">
                  <span>Start</span>
                  <span>Now</span>
                </div>
              </div>

              {/* Comparison table */}
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-white/45 mb-2">Hashrate Comparison</p>
                <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
                  {WINDOWS.map((w) => {
                    const val = hashrate.comparison[w] ?? 0;
                    const current = hashrate.currentHashrate || 1;
                    const diff = ((val - current) / current) * 100;
                    return (
                      <div key={w} className="rounded-xl border border-white/10 bg-black/20 p-3 text-center">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">{w} ago</p>
                        <p className="text-sm font-black text-white mt-1">{fmt(val, 1)}</p>
                        <p className={`text-[10px] mt-0.5 ${diff > 0 ? "text-green-400" : diff < 0 ? "text-red-400" : "text-white/40"}`}>
                          {diff > 0 ? "+" : ""}{fmt(diff, 1)}%
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Section>
          )}

          {/* ── 4. Uptime Report ──────────────────────────────────────────── */}
          {uptime && (
            <Section title="Uptime Report">
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
                <Stat label="Uptime 24h" value={`${fmt(uptime.uptimeHours24, 1)} hrs`} />
                <Stat label="Uptime 7d" value={`${fmt(uptime.uptimeHours7d, 1)} hrs`} />
                <Stat label="Uptime 30d" value={`${fmt(uptime.uptimeHours30d, 1)} hrs`} />
                <Stat label="Disconnects" value={uptime.disconnects} />
                <Stat label="Total Shares" value={uptime.totalShares.toLocaleString()} />
                <Stat label="Rejected Shares" value={`${uptime.rejects.toLocaleString()} (${uptime.totalShares > 0 ? fmt((uptime.rejects / uptime.totalShares) * 100, 1) : "0"}%)`} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Errors" value={uptime.errors ?? 0} />
                <Stat label="Workers Online" value={uptime.onlineCount} />
                <Stat label="Workers Offline" value={uptime.offlineCount} />
              </div>

              {/* Workers table */}
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm text-white/80">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.14em] text-white/45">
                      <th className="px-4 py-3 text-left">Worker</th>
                      <th className="px-4 py-3 text-right">Hashrate</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Reject %</th>
                      <th className="px-4 py-3 text-left">Last Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uptime.workers.map((w) => (
                      <tr key={w.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="px-4 py-2 font-mono text-xs">{w.name}</td>
                        <td className="px-4 py-2 text-right">{fmt(w.hashrate, 1)} MH/s</td>
                        <td className="px-4 py-2">
                          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${w.status === "online" ? "bg-green-500/15 text-green-300" : w.status === "warning" ? "bg-yellow-500/15 text-yellow-200" : "bg-red-500/15 text-red-300"}`}>
                            {w.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">{fmt(w.reject_rate * 100, 1)}%</td>
                        <td className="px-4 py-2 text-white/50 text-xs">{fmtDate(w.last_share)}</td>
                      </tr>
                    ))}
                    {uptime.workers.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-white/35 text-sm">No workers found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* ── 5. Anti-Fraud Indicators ──────────────────────────────────── */}
          {fraud && (
            <Section title="Anti-Fraud Indicators">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`rounded-xl border px-4 py-2 text-sm font-black uppercase tracking-[0.14em] ${riskColors[fraud.overallRisk]}`}>
                  {fraud.overallRisk === "clean" ? "✓ Clean" : fraud.overallRisk === "suspicious" ? "⚠ Suspicious" : "✗ High Risk"}
                </span>
                {fraud.flagCount > 0 && (
                  <span className="text-sm text-white/55">{fraud.flagCount} flag(s) detected</span>
                )}
              </div>

              {fraud.flags.length === 0 && (
                <p className="text-sm text-green-300/70">No fraud indicators found. Miner activity looks normal.</p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {fraud.flags.map((f) => <FraudBadge key={f.id} flag={f} />)}
              </div>
            </Section>
          )}

          {/* ── 6. Admin Action Buttons ───────────────────────────────────── */}
          <Section title="Admin Controls">
            <div className="flex flex-wrap gap-3">
              <a
                href={`/admin/dashboard/cashout-review/${encodeURIComponent(minerId)}`}
                className="cursor-pointer rounded-xl border border-green-400/40 bg-green-500/10 px-5 py-3 text-sm font-bold text-green-200 hover:bg-green-500/20 transition-all"
              >
                → Go to Cashout Decision
              </a>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void doAction("flag")}
                className="cursor-pointer rounded-xl border border-yellow-400/40 bg-yellow-500/10 px-5 py-3 text-sm font-bold text-yellow-200 hover:bg-yellow-500/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
              >
                ⚑ Mark as Suspicious
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="cursor-pointer rounded-xl border border-white/15 bg-white/[0.03] px-5 py-3 text-sm font-bold text-white/60 hover:bg-white/[0.06] transition-all"
              >
                ← Back
              </button>
            </div>
            {actionMsg && (
              <p className="text-sm text-[#C9EB55]/80 mt-1">{actionMsg}</p>
            )}
          </Section>

        </div>
      )}
    </AdminToolShell>
  );
}
