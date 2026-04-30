"use client";

import { useCallback, useEffect, useState } from "react";

type WriterPayload = {
  ok: boolean;
  enabled?: boolean;
  status: "healthy" | "stale" | "empty" | "disabled";
  latestSnapshotAt: string | null;
  snapshotAgeMs: number | null;
  snapshotsLastHour: number;
  activeUsersLastHour: number;
  totalRows: number;
  intervalMs: number;
  at?: string;
  message?: string;
};

function formatRelativeAge(snapshotAgeMs: number | null) {
  if (snapshotAgeMs === null) return "No snapshots yet";
  const totalSeconds = Math.max(0, Math.round(snapshotAgeMs / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s ago`;
  const totalMinutes = Math.round(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m ago`;
  const totalHours = (totalMinutes / 60).toFixed(1);
  return `${totalHours}h ago`;
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().replace("T", " ").replace(".000Z", " UTC");
}

export default function HashrateWriterStatus({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<WriterPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mining/hashrate-writer", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || `Failed: ${res.status}`);
      }
      setData(payload as WriterPayload);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const status = data?.status || "empty";
  const statusTone = status === "healthy"
    ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-100"
    : status === "stale"
      ? "border-amber-400/35 bg-amber-500/10 text-amber-100"
      : status === "disabled"
        ? "border-white/20 bg-white/[0.04] text-white/75"
      : "border-white/15 bg-white/[0.03] text-white/75";

  if (compact) {
    return (
      <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#C9EB55]/75">Hashrate Writer</p>
            <h2 className="text-xl font-black text-white">Historical Snapshots</h2>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.14em] ${statusTone}`}>
            {status}
          </span>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="cursor-pointer rounded-full border border-white/20 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Metric label="Last Snapshot" value={formatRelativeAge(data?.snapshotAgeMs ?? null)} />
          <Metric label="Last Hour" value={String(data?.snapshotsLastHour ?? 0)} />
          <Metric label="Total Rows" value={String(data?.totalRows ?? 0)} />
        </div>
        {data?.message ? <p className="mt-3 text-xs text-white/50">{data.message}</p> : null}
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#C9EB55]">Hashrate Writer</h2>
          <p className="text-sm text-white/65">Writer health, snapshot freshness, and historical accumulation state.</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.14em] ${statusTone}`}>
          {status}
        </span>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="cursor-pointer rounded-full border border-white/20 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Refresh
        </button>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <Metric label="Last Snapshot" value={formatRelativeAge(data?.snapshotAgeMs ?? null)} sub={formatTimestamp(data?.latestSnapshotAt)} />
        <Metric label="Snapshots / Hour" value={String(data?.snapshotsLastHour ?? 0)} />
        <Metric label="Active Users / Hour" value={String(data?.activeUsersLastHour ?? 0)} />
        <Metric label="Total History Rows" value={String(data?.totalRows ?? 0)} sub={data?.intervalMs ? `Every ${Math.round(data.intervalMs / 60000)} min` : undefined} />
      </div>
      {data?.message ? <p className="mt-3 text-sm text-white/55">{data.message}</p> : null}
      <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-white/40">
        Last checked: {formatTimestamp(data?.at) || "Not checked yet"}
      </p>
      {loading ? <p className="mt-2 text-xs text-white/45">Refreshing...</p> : null}
    </section>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-[#C9EB55]/20 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/55">{label}</p>
      <p className="mt-2 text-lg font-black text-[#D7F27A]">{value}</p>
      {sub ? <p className="mt-1 text-xs text-white/45">{sub}</p> : null}
    </div>
  );
}
