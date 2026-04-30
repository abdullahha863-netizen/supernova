"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import AdminToolShell from "@/components/admin/AdminToolShell";
import type { CashoutReviewDetailPayload, HashratePointView, UiTone, WindowKey } from "@/lib/admin/cashoutReviewDetail";

const WINDOWS: WindowKey[] = ["1h", "3h", "6h", "24h", "yesterday", "3d", "7d", "14d", "30d", "60d"];

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl border border-[#C9EB55]/18 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/55">{label}</p>
      <p className="mt-1 truncate text-xl font-black text-[#C9EB55]">{value}</p>
      {sub ? <p className="mt-0.5 truncate text-xs text-white/40">{sub}</p> : null}
    </div>
  );
}

function Badge({ label, tone = "neutral" }: { label: string; tone?: UiTone }) {
  const toneClass = tone === "success"
    ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
    : tone === "warning"
      ? "border-amber-400/35 bg-amber-500/10 text-amber-200"
      : tone === "danger"
        ? "border-red-400/35 bg-red-500/10 text-red-200"
        : "border-white/15 bg-white/[0.04] text-white/70";

  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${toneClass}`}>{label}</span>;
}

function WorkerStatusBadge({ status, tone }: { status: string; tone: UiTone }) {
  const toneClass = tone === "success"
    ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
    : tone === "warning"
      ? "border-amber-400/35 bg-amber-500/10 text-amber-200"
      : tone === "danger"
        ? "border-red-400/35 bg-red-500/10 text-red-200"
        : "border-white/15 bg-white/[0.04] text-white/65";

  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${toneClass}`}>{status}</span>;
}

function HeroMetric({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-white/42">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      {note ? <p className="mt-1 text-xs text-white/45">{note}</p> : null}
    </div>
  );
}

function ActionCard({
  title,
  description,
  tone,
  disabled,
  onClick,
}: {
  title: string;
  description: string;
  tone: "approve" | "reject" | "flag" | "reset" | "review-queue";
  disabled: boolean;
  onClick: () => void;
}) {
  const cardClass = tone === "approve"
    ? "border-emerald-400/35 bg-emerald-500/10"
    : tone === "reject"
      ? "border-red-400/35 bg-red-500/10"
      : tone === "reset"
        ? "border-slate-400/35 bg-slate-500/10 text-slate-100"
        : tone === "review-queue"
          ? "border-amber-400/35 bg-amber-500/10 text-amber-100"
          : "border-amber-400/35 bg-amber-500/10";

  const buttonClass = tone === "approve"
    ? "border-emerald-300/35 bg-emerald-400/20 text-emerald-50 hover:bg-emerald-400/28"
    : tone === "reject"
      ? "border-red-300/35 bg-red-400/18 text-red-50 hover:bg-red-400/28"
      : tone === "reset"
        ? "border-slate-300/35 bg-slate-400/18 text-slate-50 hover:bg-slate-400/28"
        : tone === "review-queue"
          ? "border-amber-300/35 bg-amber-400/18 text-amber-50 hover:bg-amber-400/28"
          : "border-amber-300/35 bg-amber-400/18 text-amber-50 hover:bg-amber-400/28";

  return (
    <div className={`rounded-2xl border p-4 ${cardClass}`}>
      <div className="flex h-full flex-col justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em] text-white">{title}</p>
          <p className="mt-2 text-sm leading-6 text-white/72">{description}</p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onClick}
          className={`cursor-pointer rounded-xl border px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${buttonClass}`}
        >
          {title}
        </button>
      </div>
    </div>
  );
}

type FraudSignalRow = {
  label: string;
  detail: string;
  tone: UiTone;
  statusLabel: string;
  severity?: string;
};

function FraudSignalCard({ row }: { row: FraudSignalRow }) {
  const isFlagged = row.tone === "danger";
  const isCritical = row.severity === "critical" || (isFlagged && row.detail?.includes("critical"));

  const cardClass = isCritical
    ? "border-red-400/50 bg-red-500/15 text-red-200"
    : isFlagged
      ? "border-amber-400/35 bg-amber-500/12 text-amber-200"
      : "border-white/10 bg-white/[0.02] text-white/60";

  const statusIcon = isCritical
    ? "⚠️"
    : isFlagged
      ? "⚡"
      : "✓";

  return (
    <div className={`rounded-xl border px-4 py-3 transition-all duration-200 ${cardClass} ${isFlagged ? "ring-1 ring-current/20" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm">{statusIcon}</span>
            <span className={`font-semibold ${isFlagged ? "text-current" : "text-white/80"}`}>{row.label}</span>
          </div>
          <p className={`mt-1 text-xs ${isFlagged ? "opacity-90" : "opacity-60"}`}>{row.detail}</p>
        </div>
        <span className={`text-xs uppercase tracking-[0.12em] font-bold px-2 py-1 rounded-full ${
          isCritical
            ? "bg-red-500/20 text-red-100"
            : isFlagged
              ? "bg-amber-500/20 text-amber-100"
              : "bg-green-500/20 text-green-100"
        }`}>
          {row.statusLabel}
        </span>
      </div>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-3xl border border-[#C9EB55]/15 bg-white/[0.03] p-5">
      <div>
        <h2 className="text-lg font-black uppercase tracking-[0.15em] text-[#D7F27A]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-white/50">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function HashrateTimelineChart({ points, peakDisplay }: { points: HashratePointView[]; peakDisplay: string }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  if (!points.length) return <div className="flex h-[240px] items-center justify-center text-sm text-white/40">No chart data for this window</div>;

  const values = points.map((point) => point.hashrate);
  const min = Math.min(...values);
  const max = Math.max(...values) || 1;
  const width = 100;
  const height = 44;
  const step = width / (points.length - 1 || 1);
  const path = points
    .map((point, index) => {
      const x = index * step;
      const y = height - ((point.hashrate - min) / (max - min || 1)) * (height - 4) - 2;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const fill = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-white/45">
        <span>Hashrate Timeline</span>
        <span>{peakDisplay} peak</span>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="h-[240px] w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cashout-review-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9EB55" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#C9EB55" stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((percent) => (
          <line
            key={percent}
            x1="0"
            x2={width}
            y1={((height - 2) * percent) / 100 + 1}
            y2={((height - 2) * percent) / 100 + 1}
            stroke="rgba(255,255,255,0.08)"
            strokeDasharray="2 3"
          />
        ))}
        <path d={fill} fill="url(#cashout-review-fill)" />
        <path d={path} fill="none" stroke="#C9EB55" strokeWidth="1.5" />
        {points.map((point, index) => {
          const x = index * step;
          const y = height - ((point.hashrate - min) / (max - min || 1)) * (height - 4) - 2;
          return <circle key={`${point.ts}-${index}`} cx={x} cy={y} r="1.4" fill="#E8FF9D" />;
        })}
      </svg>
    </div>
  );
}

async function fetchCashoutReviewPayload(minerId: string, selectedPayoutId: number, signal?: AbortSignal) {
  const search = selectedPayoutId > 0 ? `?payoutId=${selectedPayoutId}` : "";
  const response = await fetch(`/api/admin/cashout-review/${minerId}${search}`, { cache: "no-store", signal });
  const nextPayload = (await response.json()) as CashoutReviewDetailPayload;

  if (!response.ok || !nextPayload.ok || !nextPayload.data) {
    throw new Error(nextPayload.error || "Failed to load cashout review");
  }

  return nextPayload;
}

export default function CashoutReviewPage() {
  const params = useParams<{ minerId: string }>();
  const searchParams = useSearchParams();
  const minerId = typeof params?.minerId === "string" ? params.minerId : "";
  const selectedPayoutId = Number(searchParams.get("payoutId") || 0);

  const [payload, setPayload] = useState<CashoutReviewDetailPayload | null>(null);
  const [activeWindow, setActiveWindow] = useState<WindowKey>("24h");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewerNote, setReviewerNote] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    if (!minerId) {
      setLoading(false);
      setError("Missing miner id");
      return () => controller.abort();
    }

    setLoading(true);
    setError(null);

    void fetchCashoutReviewPayload(minerId, selectedPayoutId, controller.signal)
      .then((nextPayload) => setPayload(nextPayload))
      .catch((loadError) => {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load cashout review");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [minerId, selectedPayoutId]);

  async function doAction(action: "approve" | "reject" | "flag" | "reset" | "review_queue") {
    setActionLoading(true);
    setMessage(null);

    try {
      if (action === "flag") {
        const response = await fetch("/api/mining/fraud-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: payload?.data?.actionContext.minerId || minerId, adminNote: reviewerNote }),
        });
        const result = await response.json();
        setMessage(result.ok ? "Miner marked as suspicious." : result.error || "Action failed.");
        if (result.ok) {
          setReviewerNote("");
        }
      } else {
        const pendingPayoutId = payload?.data?.actionContext.pendingPayoutId;
        if (!pendingPayoutId) {
          setMessage("No pending cashout request for this miner.");
          return;
        }

        const response = await fetch("/api/mining/cashout", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payoutId: pendingPayoutId, action, adminNote: reviewerNote }),
        });
        const result = await response.json();
        setMessage(result.ok
          ? action === "reset"
            ? "Cashout request reset for review successfully."
            : action === "review_queue"
              ? "Cashout request moved to review queue successfully."
              : `Cashout ${action}d successfully.`
          : result.error || "Action failed.");
        if (result.ok) {
          setReviewerNote("");
        }
      }

      if (!minerId) {
        setMessage("Missing miner id");
        return;
      }

      const nextPayload = await fetchCashoutReviewPayload(minerId, selectedPayoutId);
      setPayload(nextPayload);
    } catch {
      setMessage("Action failed.");
    } finally {
      setActionLoading(false);
    }
  }

  const data = payload?.data;
  const activeWindowData = data?.hashrate?.windows[activeWindow] ?? null;
  const auditTrail = (data as { auditTrail?: unknown } | undefined)?.auditTrail;
  const decisionHistory = Array.isArray(auditTrail)
    ? auditTrail.map((entry, index) => {
      const row = (entry ?? {}) as Record<string, unknown>;
      const actionRaw = row.action ?? row.decision ?? row.status ?? row.type;
      const timestampRaw = row.timestamp ?? row.createdAt ?? row.created_at ?? row.at;
      const noteRaw = row.adminNote ?? row.note ?? row.comment ?? row.reason;
      const parsedDate = timestampRaw ? new Date(String(timestampRaw)) : null;
      const timestamp = parsedDate && !Number.isNaN(parsedDate.getTime())
        ? parsedDate.toLocaleString()
        : timestampRaw
          ? String(timestampRaw)
          : "Unknown time";

      return {
        id: String(row.id ?? `${String(actionRaw ?? "entry")}-${String(timestampRaw ?? index)}-${index}`),
        action: actionRaw ? String(actionRaw) : "Unknown action",
        timestamp,
        note: noteRaw ? String(noteRaw) : "",
      };
    })
    : [];
  const rawHashrateSpikes = (data as { hashrateSpikes?: unknown } | undefined)?.hashrateSpikes;
  const hashrateSpikes = Array.isArray(rawHashrateSpikes)
    ? rawHashrateSpikes.map((entry, index) => {
      const row = (entry ?? {}) as Record<string, unknown>;
      const timestampRaw = row.timestamp ?? row.detectedAt ?? row.createdAt ?? row.created_at ?? row.at;
      const beforeRaw = row.before ?? row.hashrateBefore ?? row.previousHashrate;
      const afterRaw = row.after ?? row.hashrateAfter ?? row.currentHashrate;
      const changeRaw = row.changePercent ?? row.change_percentage ?? row.percentageChange ?? row.change;

      const before = Number(beforeRaw ?? 0);
      const after = Number(afterRaw ?? 0);
      const computedChange = before > 0 ? ((after - before) / before) * 100 : 0;
      const changePercent = Number.isFinite(Number(changeRaw)) ? Number(changeRaw) : computedChange;

      const parsedDate = timestampRaw ? new Date(String(timestampRaw)) : null;
      const timestamp = parsedDate && !Number.isNaN(parsedDate.getTime())
        ? parsedDate.toLocaleString()
        : timestampRaw
          ? String(timestampRaw)
          : "Unknown time";

      return {
        id: String(row.id ?? `spike-${timestamp}-${index}`),
        timestamp,
        beforeDisplay: Number.isFinite(before) ? before.toFixed(2) : "0.00",
        afterDisplay: Number.isFinite(after) ? after.toFixed(2) : "0.00",
        changeDisplay: `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}%`,
      };
    })
    : [];

  // ── Fraud Risk Assessment ──────────────────────────────────────────────────
  const fraudAssessment = useMemo(() => {
    if (!data?.antiFraud?.rows) return null;

    const rows = data.antiFraud.rows;
    const dangerCount = rows.filter(r => r.tone === "danger").length;
    const totalCount = rows.length;

    // Calculate risk score based on danger signals
    const riskScore = Math.min(Math.round((dangerCount / Math.max(totalCount, 1)) * 100), 100);

    // Determine risk level
    const riskLevel = riskScore >= 70 ? "high" : riskScore >= 40 ? "medium" : "low";

    // Main reason - find the most critical signal
    const mainReason = rows.find(r => r.tone === "danger")?.detail || "No significant risk indicators detected";

    // Confidence level
    const confidence = dangerCount > 0 ? "High" : "Very High";

    // Categorize signals
    const categorizedRows = rows.map(row => ({
      ...row,
      category: row.label.toLowerCase().includes("ip") || row.label.toLowerCase().includes("device")
        ? "identity"
        : row.label.toLowerCase().includes("hashrate") || row.label.toLowerCase().includes("worker") || row.label.toLowerCase().includes("share")
          ? "behavioral"
          : "financial",
      severity: row.tone === "danger" ? "high" : "low"
    }));

    return {
      ...data.antiFraud,
      rows: categorizedRows,
      riskScore,
      riskLevel,
      mainReason,
      confidence
    };
  }, [data?.antiFraud]);

  return (
    <AdminToolShell
      title={loading ? "Miner Cashout" : data?.pageTitle || `Miner Cashout: ${minerId}`}
      subtitle="Cashout review page with miner identity, payout review, hashrate history, uptime, and anti-fraud controls."
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#C9EB55]/15 bg-white/[0.03] px-4 py-3 text-sm text-white/65">
        <div className="flex flex-wrap items-center gap-2">
          {data?.topBarBadges.map((badge) => <Badge key={badge.label} label={badge.label} tone={badge.tone} />)}
        </div>
        <Link href="/admin/dashboard/cashout-review" className="font-semibold text-[#D7F27A] hover:text-[#F2FFBF]">
          Back To Requests
        </Link>
      </div>

      {loading ? <div className="py-16 text-center text-sm text-white/50">Loading cashout review...</div> : null}
      {error ? <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">{error}</div> : null}

      {!loading && !error && data ? (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[32px] border border-[#C9EB55]/15 bg-[radial-gradient(circle_at_top_left,_rgba(201,235,85,0.12),_transparent_34%),linear-gradient(180deg,rgba(8,11,20,0.98),rgba(12,16,26,0.99))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.28)]">
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
              <div>
                <p className="text-[11px] uppercase tracking-[0.34em] text-[#C9EB55]">SUPERNOVA CASHOUT REVIEW</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-black tracking-[0.04em] text-white">{data.identity.name}</h1>
                  {data.heroBadges.map((badge) => <Badge key={badge.label} label={badge.label} tone={badge.tone} />)}
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/58">
                  Full decision view for miner cashout approval. Review identity, payout history, hashrate evidence, worker stability, and anti-fraud signals before taking action.
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/55">
                  <span>{data.identity.email}</span>
                  <span className="text-white/25">/</span>
                  <span className="font-mono">{data.identity.id}</span>
                  <span className="text-white/25">/</span>
                  <span>{data.identity.tier}</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {data.heroMetrics.map((metric) => (
                  <HeroMetric key={metric.label} label={metric.label} value={metric.value} note={metric.sub} />
                ))}
              </div>
            </div>
          </section>

          {data.networkAlert ? (
            <div className={data.networkAlert.tone === "danger" ? "rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm text-red-100" : "rounded-2xl border border-amber-400/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-100"}>
              {data.networkAlert.message}
            </div>
          ) : null}

          <section className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
            {data.overviewStats.map((stat) => <Stat key={stat.label} label={stat.label} value={stat.value} sub={stat.sub} />)}
          </section>

          {data.missingSelectedRequestMessage ? (
            <div className="rounded-2xl border border-yellow-400/35 bg-yellow-500/10 px-5 py-4 text-sm text-yellow-200">
              {data.missingSelectedRequestMessage}
            </div>
          ) : null}

          <Section title="Miner Profile" description="Identity, access posture, and current account context.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.minerProfileStats.map((stat) => <Stat key={stat.label} label={stat.label} value={stat.value} sub={stat.sub} />)}
            </div>
          </Section>

          <Section title="IP & VPN Review" description="Recent network origin history for this miner, including IP churn and VPN suspicion before payout approval.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {data.ipReview.stats.map((stat) => <Stat key={stat.label} label={stat.label} value={stat.value} sub={stat.sub} />)}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
                <div className="mb-2 text-xs uppercase tracking-[0.16em] text-white/45">Review Signal</div>
                <div className="font-semibold text-white">{data.ipReview.reviewSignalText}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
                <div className="mb-2 text-xs uppercase tracking-[0.16em] text-white/45">VPN Heuristic</div>
                <div className="font-semibold text-white">{data.ipReview.vpnHeuristicText}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
                <div className="mb-2 text-xs uppercase tracking-[0.16em] text-white/45">Login vs Cashout Request</div>
                <div className="font-semibold text-white">{data.ipReview.loginVsCashoutText}</div>
              </div>
            </div>

            {data.ipReview.vpnNotes.length ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/72">
                <div className="mb-2 text-xs uppercase tracking-[0.16em] text-white/45">VPN Assessment Notes</div>
                <div className="space-y-2">
                  {data.ipReview.vpnNotes.map((note, index) => <p key={`${note}-${index}`}>{note}</p>)}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.ipReview.comparisonStats.map((stat) => <Stat key={stat.label} label={stat.label} value={stat.value} sub={stat.sub} />)}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
              <table className="w-full text-sm text-white/80">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.14em] text-white/45">
                    <th className="px-4 py-3 text-left">Observed At</th>
                    <th className="px-4 py-3 text-left">IP Address</th>
                    <th className="px-4 py-3 text-left">Country</th>
                    <th className="px-4 py-3 text-left">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ipReview.historyRows.map((row) => (
                    <tr key={`${row.ip}-${row.observedAtLabel}-${row.signalLabel}`} className="border-b border-white/5 hover:bg-white/[0.03]">
                      <td className="px-4 py-3 text-xs text-white/60">{row.observedAtLabel}</td>
                      <td className="px-4 py-3 font-mono text-white">{row.ip}</td>
                      <td className="px-4 py-3">{row.country}</td>
                      <td className="px-4 py-3"><Badge label={row.signalLabel} tone={row.signalTone} /></td>
                    </tr>
                  ))}
                  {data.ipReview.historyRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-sm text-white/50">{data.ipReview.emptyHistoryMessage}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Cashout Review" description="Requested payout details and historical withdrawal context.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.cashoutReviewStats.map((stat) => <Stat key={stat.label} label={stat.label} value={stat.value} sub={stat.sub} />)}
            </div>
          </Section>

          {data.hashrate ? (
            <Section title="Historical Hashrate" description="Windowed hashrate trends for quick payout validation.">
              <div className="flex flex-wrap gap-2">
                {WINDOWS.map((windowKey) => (
                  <button
                    key={windowKey}
                    type="button"
                    onClick={() => setActiveWindow(windowKey)}
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] ${
                      activeWindow === windowKey
                        ? "border-[#C9EB55]/60 bg-[#C9EB55]/15 text-[#D7F27A]"
                        : "border-white/15 bg-white/[0.03] text-white/55 hover:border-white/30"
                    }`}
                  >
                    {windowKey}
                  </button>
                ))}
              </div>

              {activeWindowData ? (
                <>
                  <div className="grid gap-4 xl:grid-cols-[1.45fr_0.55fr]">
                    <div>
                      <div className="mb-3 flex items-baseline justify-between">
                        <span className="text-xs uppercase tracking-[0.14em] text-white/50">{activeWindowData.headline}</span>
                        <span className="font-black text-[#C9EB55]">{activeWindowData.currentDisplay}</span>
                      </div>
                      <HashrateTimelineChart points={activeWindowData.points} peakDisplay={activeWindowData.peakDisplay} />
                    </div>

                    <div className="space-y-3">
                      <HeroMetric label="Window Average" value={activeWindowData.averageDisplay} note={`Average for ${activeWindow}`} />
                      <HeroMetric label="Window Peak" value={activeWindowData.peakDisplay} note="Highest point in selected range" />
                      <HeroMetric label="Current" value={activeWindowData.currentDisplay} note="Latest live reading returned by the endpoint" />
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
                    <table className="w-full text-sm text-white/80">
                      <thead>
                        <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.14em] text-white/45">
                          <th className="px-4 py-3 text-left">Timestamp</th>
                          <th className="px-4 py-3 text-right">Hashrate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeWindowData.points.map((point) => (
                          <tr key={point.ts} className="border-b border-white/5 hover:bg-white/[0.03]">
                            <td className="px-4 py-3 text-xs text-white/65">{point.tsLabel}</td>
                            <td className="px-4 py-3 text-right font-mono">{point.hashrateDisplay}</td>
                          </tr>
                        ))}
                        {activeWindowData.points.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="px-4 py-4 text-sm text-white/50">{activeWindowData.emptyMessage}</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </Section>
          ) : null}

          <Section title="Workers" description="Per-worker hashrate, status, last share timing, and reject rate for payout review.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {data.workers.summaryStats.map((stat) => <Stat key={stat.label} label={stat.label} value={stat.value} sub={stat.sub} />)}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
              <table className="w-full text-sm text-white/80">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.14em] text-white/45">
                    <th className="px-4 py-3 text-left">Worker</th>
                    <th className="px-4 py-3 text-right">Hashrate</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Last Share</th>
                    <th className="px-4 py-3 text-right">Reject Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.workers.rows.map((worker) => (
                    <tr key={worker.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                      <td className="px-4 py-3 font-semibold text-white">{worker.name}</td>
                      <td className="px-4 py-3 text-right font-mono">{worker.hashrateDisplay}</td>
                      <td className="px-4 py-3"><WorkerStatusBadge status={worker.status} tone={worker.statusTone} /></td>
                      <td className="px-4 py-3 text-xs text-white/60">{worker.lastShareLabel}</td>
                      <td className="px-4 py-3 text-right font-mono">{worker.rejectRateDisplay}</td>
                    </tr>
                  ))}
                  {data.workers.rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-sm text-white/50">{data.workers.emptyMessage}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Section>

          {data.uptime ? (
            <Section title="Uptime & Reliability" description="Worker availability, disconnects, rejects, and recent operational stability.">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.uptime.stats.map((stat) => <Stat key={stat.label} label={stat.label} value={stat.value} sub={stat.sub} />)}
              </div>
            </Section>
          ) : null}

          {data.rejectError ? (
            <Section title="Reject / Error Context" description="Operational rejection and error signals used to catch fake or unstable hashrate before payout approval.">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {data.rejectError.stats.map((stat) => <Stat key={stat.label} label={stat.label} value={stat.value} sub={stat.sub} />)}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
                  <div className="mb-2 text-xs uppercase tracking-[0.16em] text-white/45">Review Signal</div>
                  <div className="font-semibold text-white">{data.rejectError.reviewSignalText}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
                  <div className="mb-2 text-xs uppercase tracking-[0.16em] text-white/45">Worker Warning Count</div>
                  <div className="font-semibold text-white">{data.rejectError.workerWarningText}</div>
                </div>
              </div>
            </Section>
          ) : null}

          {fraudAssessment ? (
            <Section title="Fraud Decision Panel" description="Bank-grade risk assessment system with automated scoring and signal analysis.">
              {/* ── Risk Summary Header ────────────────────────────────────────────── */}
              <div className="mb-6 rounded-2xl border border-[#C9EB55]/25 bg-[#C9EB55]/8 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-black text-[#C9EB55]">{fraudAssessment.riskScore}</div>
                      <div className="text-sm text-white/70">Risk Score</div>
                    </div>
                    <div className="mt-1 text-sm text-white/60">{fraudAssessment.mainReason}</div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex rounded-full border px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] ${
                      fraudAssessment.riskLevel === "high" ? "border-red-400/35 bg-red-500/10 text-red-200" :
                      fraudAssessment.riskLevel === "medium" ? "border-amber-400/35 bg-amber-500/10 text-amber-200" :
                      "border-green-400/25 bg-green-500/10 text-green-200"
                    }`}>
                      {fraudAssessment.riskLevel.toUpperCase()} RISK
                    </div>
                    <div className="mt-2 text-xs text-white/50">Confidence: {fraudAssessment.confidence}</div>
                  </div>
                </div>
              </div>

              {/* ── Risk Score Engine ─────────────────────────────────────────────── */}
              <div className="mb-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-white/45 mb-2">Risk Score</div>
                  <div className="text-2xl font-black text-white">{fraudAssessment.riskScore}/100</div>
                  <div className="mt-2 h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        fraudAssessment.riskScore >= 70 ? "bg-red-500" :
                        fraudAssessment.riskScore >= 40 ? "bg-amber-500" : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(fraudAssessment.riskScore, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-white/45 mb-2">Risk Level</div>
                  <div className={`text-lg font-bold ${
                    fraudAssessment.riskLevel === "high" ? "text-red-300" :
                    fraudAssessment.riskLevel === "medium" ? "text-amber-300" : "text-green-300"
                  }`}>
                    {fraudAssessment.riskLevel.toUpperCase()}
                  </div>
                  <div className="mt-1 text-xs text-white/50">Automated assessment</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-white/45 mb-2">Signals Analyzed</div>
                  <div className="text-lg font-bold text-white">{fraudAssessment.rows.length}</div>
                  <div className="mt-1 text-xs text-white/50">
                    {fraudAssessment.rows.filter(r => r.tone === "danger").length} flagged
                  </div>
                </div>
              </div>

              {/* ── Signal Groups ────────────────────────────────────────────────── */}
              <div className="space-y-6">
                {/* Identity Signals */}
                <div>
                  <h3 className="text-sm font-bold text-[#C9EB55] uppercase tracking-[0.14em] mb-3">Identity Signals</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {fraudAssessment.rows
                      .filter(row => row.category === "identity")
                      .map((row) => (
                        <FraudSignalCard key={row.label} row={row} />
                      ))}
                  </div>
                </div>

                {/* Behavioral Signals */}
                <div>
                  <h3 className="text-sm font-bold text-[#C9EB55] uppercase tracking-[0.14em] mb-3">Behavioral Signals</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {fraudAssessment.rows
                      .filter(row => row.category === "behavioral")
                      .map((row) => (
                        <FraudSignalCard key={row.label} row={row} />
                      ))}
                  </div>
                </div>

                {/* Financial Signals */}
                <div>
                  <h3 className="text-sm font-bold text-[#C9EB55] uppercase tracking-[0.14em] mb-3">Financial Signals</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {fraudAssessment.rows
                      .filter(row => row.category === "financial")
                      .map((row) => (
                        <FraudSignalCard key={row.label} row={row} />
                      ))}
                  </div>
                </div>
              </div>
            </Section>
          ) : null}

          <Section title="HASHRATE SPIKE TIMELINE">
            {hashrateSpikes.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/55">
                No spike events detected in available history.
              </div>
            ) : (
              <div className="space-y-3">
                {hashrateSpikes.map((spike) => (
                  <div key={spike.id} className="rounded-xl border border-amber-400/35 bg-amber-500/12 p-4 text-amber-100">
                    <div className="text-xs uppercase tracking-[0.12em] text-amber-200/80">Spike detected at</div>
                    <div className="mt-1 text-sm font-semibold text-white">{spike.timestamp}</div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
                      <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                        <div className="text-xs uppercase tracking-[0.12em] text-white/55">Hashrate before</div>
                        <div className="mt-1 font-mono text-white">{spike.beforeDisplay}</div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                        <div className="text-xs uppercase tracking-[0.12em] text-white/55">Hashrate after</div>
                        <div className="mt-1 font-mono text-white">{spike.afterDisplay}</div>
                      </div>
                      <div className="rounded-lg border border-red-400/35 bg-red-500/10 px-3 py-2">
                        <div className="text-xs uppercase tracking-[0.12em] text-red-200/85">Change</div>
                        <div className="mt-1 font-mono text-red-100">{spike.changeDisplay}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Actions" description="Approve, reject, or flag the current payout request.">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <label htmlFor="reviewer-note" className="mb-2 block text-sm font-semibold text-white">
                Reviewer Notes
              </label>
              <textarea
                id="reviewer-note"
                value={reviewerNote}
                onChange={(event) => setReviewerNote(event.target.value)}
                placeholder="Add notes before taking action (optional)..."
                rows={4}
                className="w-full resize-y rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[#C9EB55]/40 focus:outline-none"
              />
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              <ActionCard
                title="Approve Cashout"
                description="Approve the current pending payout request and mark it as ready for fulfillment."
                tone="approve"
                disabled={actionLoading || !data.actionContext.pendingPayoutId || !data.actionContext.hasSelectedPendingRequest}
                onClick={() => void doAction("approve")}
              />
              <ActionCard
                title="Reject Cashout"
                description="Reject the current payout request when the miner activity or account evidence is not acceptable."
                tone="reject"
                disabled={actionLoading || !data.actionContext.pendingPayoutId || !data.actionContext.hasSelectedPendingRequest}
                onClick={() => void doAction("reject")}
              />
              <ActionCard
                title="Reset Review / Re-evaluate"
                description="Reset the current payout request to under review and clear manual suspicious/reject markers."
                tone="reset"
                disabled={actionLoading || !data.actionContext.pendingPayoutId || !data.actionContext.hasSelectedPendingRequest}
                onClick={() => void doAction("reset")}
              />
              <ActionCard
                title="Add to Review Queue"
                description="Move this payout request to the review queue without approving or rejecting it."
                tone="review-queue"
                disabled={actionLoading || !data.actionContext.pendingPayoutId || !data.actionContext.hasSelectedPendingRequest}
                onClick={() => void doAction("review_queue")}
              />
              <ActionCard
                title="Mark as Suspicious"
                description="Flag this miner for further fraud review without directly approving or rejecting the payout."
                tone="flag"
                disabled={actionLoading}
                onClick={() => void doAction("flag")}
              />
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/68">
              <span className="font-semibold text-white">Action Status:</span>{" "}
              {actionLoading
                ? "Submitting review decision..."
                : message || "No action submitted yet. Review the evidence above before taking a decision."}
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
              <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#D7F27A]">Decision History</h3>
              {decisionHistory.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/55">
                  No decision history recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
                  <table className="w-full text-sm text-white/80">
                    <thead>
                      <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.14em] text-white/45">
                        <th className="px-4 py-3 text-left">Action</th>
                        <th className="px-4 py-3 text-left">Timestamp</th>
                        <th className="px-4 py-3 text-left">Admin Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decisionHistory.map((entry) => (
                        <tr key={entry.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                          <td className="px-4 py-3 font-semibold text-white">{entry.action}</td>
                          <td className="px-4 py-3 text-xs text-white/65">{entry.timestamp}</td>
                          <td className="px-4 py-3 text-sm text-white/70">{entry.note || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Link
                href={`/admin/dashboard/miner-review/${encodeURIComponent(minerId)}`}
                className="rounded-xl border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-4 py-3 text-sm font-semibold text-[#D7F27A] hover:bg-[#C9EB55]/15 transition-colors"
              >
                → View Full Miner Details
              </Link>
            </div>
          </Section>
        </div>
      ) : null}
    </AdminToolShell>
  );
}
