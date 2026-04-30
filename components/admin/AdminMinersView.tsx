"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Loader2, Search, X } from "lucide-react";

type MinerRow = {
  userId: string;
  name: string;
  email: string;
  registeredAt: string;
  twoFactorEnabled: boolean;
  totalMiners: number;
  activeMiners: number;
  lastSeen: string | null;
  totalShares: number;
  acceptedShares: number;
  rejectedShares: number;
  rejectRate: number;
  sharesPerMinute: number;
  isFlagged: boolean;
  flagReason: string | null;
  flaggedAt: string | null;
};

function formatNumber(value: number) {
  return value.toLocaleString();
}

function FlagBadge({ isFlagged, reason }: { isFlagged: boolean; reason: string | null }) {
  if (!isFlagged) {
    return (
      <span className="inline-flex items-center rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-semibold text-white/38">
        clear
      </span>
    );
  }

  const normalizedReason = reason || "flagged";
  const isSpamShares = normalizedReason === "spam_shares";
  const badgeClass = isSpamShares
    ? "border-red-400/40 bg-red-500/12 text-red-100"
    : "border-orange-400/40 bg-orange-500/12 text-orange-100";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${badgeClass}`}>
      <AlertTriangle className="h-3.5 w-3.5" />
      {normalizedReason}
    </span>
  );
}

export default function AdminMinersView() {
  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState<MinerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionLoadingUserId, setActionLoadingUserId] = useState<string | null>(null);

  const loadRows = useCallback(() => {
    setLoading(true);
    setError(null);

    fetch("/api/admin/miners")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setRows(d.rows);
        else setError(d.error ?? "Failed to load");
      })
      .catch(() => setError("Request failed"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) loadRows();
  }, [loadRows, mounted]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  async function runMinerAction(userId: string, action: "unflag" | "reset-stats") {
    if (action === "reset-stats" && !window.confirm("Are you sure you want to reset stats?")) {
      return;
    }

    setActionLoadingUserId(userId);
    setActionMessage(null);

    try {
      const response = await fetch(`/api/admin/miners/${encodeURIComponent(userId)}/${action}`, {
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Action failed");
      }

      setActionMessage(action === "unflag" ? "Miner unflagged." : "Miner stats reset.");
      loadRows();
    } catch (actionError) {
      setActionMessage(actionError instanceof Error ? actionError.message : "Action failed");
    } finally {
      setActionLoadingUserId(null);
    }
  }

  const summaryCards = useMemo(
    () => [
      { label: "Total Miners", value: formatNumber(rows.reduce((sum, row) => sum + row.totalMiners, 0)) },
      { label: "Active Miners", value: formatNumber(rows.reduce((sum, row) => sum + row.activeMiners, 0)) },
      { label: "Total Shares", value: formatNumber(rows.reduce((sum, row) => sum + row.totalShares, 0)) },
      { label: "Flagged Miners", value: formatNumber(rows.filter((row) => row.isFlagged).length) },
    ],
    [rows],
  );

  const filteredRows = useMemo(() => {
    const query = debouncedSearchQuery.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) => {
      const haystack = [row.userId, row.name, row.email]
        .map((value) => String(value || "").toLowerCase());

      return haystack.some((value) => value.includes(query));
    });
  }, [rows, debouncedSearchQuery]);

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-7">
        <div className="space-y-5">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-3.5 py-2 text-sm font-semibold text-white/70 transition-all hover:border-[#C9EB55]/35 hover:bg-[#C9EB55]/10 hover:text-[#D7F27A]"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C9EB55]/70">Admin Mining</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Miners Overview</h1>
              <p className="mt-1 text-sm text-white/50">Registered mining users, abuse signals, shares, and manual review actions.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-right">
              <div className="text-2xl font-black tabular-nums text-white">{formatNumber(rows.length)}</div>
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-white/42">Total Users</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-[#C9EB55]/14 bg-white/[0.035] p-4 transition-all hover:-translate-y-0.5 hover:border-[#C9EB55]/28 hover:bg-white/[0.055]"
            >
              <div className="text-2xl font-black tabular-nums text-white">{card.value}</div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/42">{card.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[#C9EB55]/15 bg-white/[0.03] shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
          <div className="border-b border-white/10 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-black text-[#D7F27A]">User Miner Table</h2>
                <p className="mt-1 text-sm text-white/45">{formatNumber(filteredRows.length)} visible rows</p>
              </div>
              <div className="relative w-full max-w-xl">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by name, email, or miner ID..."
                  className="w-full rounded-xl border border-white/10 bg-black/24 px-10 py-3 text-sm text-white outline-none transition-all placeholder:text-white/35 focus:border-[#C9EB55]/40 focus:bg-black/34"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-white/45 transition-all hover:bg-white/10 hover:text-white"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
            {actionMessage ? (
              <div className="mt-4 rounded-xl border border-[#C9EB55]/22 bg-[#C9EB55]/10 px-4 py-3 text-sm font-medium text-[#D7F27A]">
                {actionMessage}
              </div>
            ) : null}
          </div>

          {!mounted || loading ? (
            <div className="flex min-h-[260px] items-center justify-center text-white/45">
              <div className="flex items-center gap-3 text-sm font-medium">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading miners...
              </div>
            </div>
          ) : null}

          {mounted && error ? (
            <div className="flex min-h-[260px] items-center justify-center px-6 text-center">
              <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-5 py-4 text-sm text-red-200">{error}</div>
            </div>
          ) : null}

          {mounted && !loading && !error && rows.length === 0 ? (
            <div className="flex min-h-[260px] items-center justify-center px-6 text-center">
              <div>
                <p className="text-base font-semibold text-white/70">No miners found</p>
                <p className="mt-1 text-sm text-white/40">Mining users will appear here once workers are registered.</p>
              </div>
            </div>
          ) : null}

          {mounted && !loading && !error && rows.length > 0 && filteredRows.length === 0 ? (
            <div className="flex min-h-[260px] items-center justify-center px-6 text-center">
              <div>
                <p className="text-base font-semibold text-white/70">No results match your search</p>
                <p className="mt-1 text-sm text-white/40">Try a miner name, email, or a different user ID fragment.</p>
              </div>
            </div>
          ) : null}

          {mounted && !loading && !error && filteredRows.length > 0 ? (
            <div className="max-h-[68vh] overflow-auto">
              <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-sm">
                <thead className="sticky top-0 z-10 bg-[#10120F] text-xs uppercase tracking-[0.12em] text-white/46 shadow-[0_1px_0_rgba(255,255,255,0.08)]">
                  <tr>
                    <th className="px-5 py-3.5 text-left font-bold">Miner</th>
                    <th className="px-5 py-3.5 text-left font-bold">Email</th>
                    <th className="px-5 py-3.5 text-center font-bold">Miners</th>
                    <th className="px-5 py-3.5 text-center font-bold">Active</th>
                    <th className="px-5 py-3.5 text-right font-bold">Shares</th>
                    <th className="px-5 py-3.5 text-right font-bold">Reject %</th>
                    <th className="px-5 py-3.5 text-right font-bold">SPM</th>
                    <th className="px-5 py-3.5 text-left font-bold">Flag</th>
                    <th className="px-5 py-3.5 text-right font-bold">Last Seen</th>
                    <th className="px-5 py-3.5 text-right font-bold">2FA</th>
                    <th className="px-5 py-3.5 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => {
                    const actionLoading = actionLoadingUserId === row.userId;

                    return (
                      <tr
                        key={row.userId}
                        className={`border-t border-white/8 transition-all hover:bg-[#C9EB55]/[0.055] ${
                          index % 2 === 0 ? "bg-white/[0.015]" : "bg-black/10"
                        }`}
                      >
                        <td className="px-5 py-4 align-middle">
                          <div className="font-semibold text-white">{row.name}</div>
                          <div className="mt-1 font-mono text-xs text-white/38">{row.userId.slice(0, 12)}...</div>
                        </td>
                        <td className="px-5 py-4 align-middle text-white/68">{row.email}</td>
                        <td className="px-5 py-4 text-center align-middle font-semibold tabular-nums text-white/76">{row.totalMiners}</td>
                        <td className="px-5 py-4 text-center align-middle">
                          <span className={`inline-flex min-w-8 justify-center rounded-lg px-2 py-1 text-xs font-bold tabular-nums ${
                            row.activeMiners > 0
                              ? "bg-[#C9EB55]/18 text-[#D7F27A]"
                              : "bg-white/8 text-white/35"
                          }`}>
                            {row.activeMiners}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right align-middle font-mono text-white/72">{formatNumber(row.totalShares)}</td>
                        <td className="px-5 py-4 text-right align-middle text-white/72">
                          <div className="font-mono">{(row.rejectRate * 100).toFixed(1)}%</div>
                          <div className="mt-1 text-[11px] text-white/34">
                            {formatNumber(row.rejectedShares)} / {formatNumber(row.totalShares)}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right align-middle font-mono text-white/72">{row.sharesPerMinute.toFixed(1)}</td>
                        <td className="px-5 py-4 align-middle">
                          <FlagBadge isFlagged={row.isFlagged} reason={row.flagReason} />
                        </td>
                        <td className="px-5 py-4 text-right align-middle text-xs text-white/48">
                          {row.lastSeen ? new Date(row.lastSeen).toLocaleString() : "-"}
                        </td>
                        <td className="px-5 py-4 text-right align-middle">
                          <span className={`text-xs font-bold ${row.twoFactorEnabled ? "text-[#D7F27A]" : "text-white/32"}`}>
                            {row.twoFactorEnabled ? "ON" : "off"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right align-middle">
                          {row.isFlagged ? (
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => void runMinerAction(row.userId, "unflag")}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200 transition-all hover:border-emerald-300/45 hover:bg-emerald-500/18 disabled:cursor-not-allowed disabled:opacity-55"
                              >
                                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                Unflag
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => void runMinerAction(row.userId, "reset-stats")}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 transition-all hover:border-red-300/45 hover:bg-red-500/18 disabled:cursor-not-allowed disabled:opacity-55"
                              >
                                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                Reset Stats
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-white/28">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
