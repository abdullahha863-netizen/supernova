"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CashoutReviewPayload, ListBadgeTone } from "@/lib/admin/minerCashoutMonitor";

function SummaryCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5">
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-sm text-white/48">{note}</p>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: ListBadgeTone }) {
  const classes =
    tone === "safe"
      ? "border-emerald-400/35 bg-emerald-500/12 text-emerald-200"
      : tone === "warn"
        ? "border-amber-400/35 bg-amber-500/12 text-amber-200"
        : tone === "danger"
          ? "border-orange-400/40 bg-orange-500/12 text-orange-100"
          : tone === "critical"
            ? "border-red-300/60 bg-red-600/20 text-red-50 ring-1 ring-red-400/25"
            : "border-white/12 bg-white/[0.05] text-white/65";

  return <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${classes}`}>{label}</span>;
}

export default function MinerCashoutMonitor() {
  const [payload, setPayload] = useState<CashoutReviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/admin/cashout-review", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load cashout review queue.");
        }

        return response.json() as Promise<CashoutReviewPayload>;
      })
      .then((nextPayload) => setPayload(nextPayload))
      .catch(() => {
        setPayload({
          ok: false,
          enabled: false,
          mode: "unavailable",
          summary: {
            requestsCount: 0,
            highRiskCount: 0,
            pendingAmount: 0,
            requestsLabel: "0",
            highRiskLabel: "0",
            pendingAmountLabel: "0.00 KAS",
          },
          queueState: {
            title: "Cashout review is unavailable",
            description: "Failed to load live cashout requests.",
          },
          rows: [],
          minerGroups: [],
          error: "Failed to load live cashout requests.",
        });
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const filteredGroups = useMemo(() => {
    const groups = payload?.minerGroups ?? [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return groups;

    return groups.filter((group) => {
      const haystack = [
        group.minerId,
        group.minerName,
        group.minerEmail,
        ...group.requests.map((request) => request.payoutId),
      ]
        .map((value) => String(value || "").toLowerCase());

      return haystack.some((value) => value.includes(query));
    });
  }, [payload?.minerGroups, searchQuery]);

  return (
    <div className="space-y-6">
      <section className="rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(201,235,85,0.12),_transparent_32%),linear-gradient(180deg,rgba(8,11,20,0.98),rgba(12,16,26,0.99))] p-6 shadow-[0_32px_120px_rgba(0,0,0,0.34)]">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.34em] text-[#C9EB55]">SUPERNOVA CASHOUT QUEUE</p>
            <h1 className="mt-3 text-4xl font-black tracking-[0.04em] text-white">Pending Miner Cashout Requests</h1>
            <p className="mt-3 text-base leading-7 text-white/58">
              This page only lists miners who requested cashout. Click the review button beside any miner to open the full details page with hashrate, IP, VPN, risk context, and actions.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Requests" value={payload?.summary.requestsLabel ?? "0"} note="Visible cashout requests" />
            <SummaryCard label="High Risk" value={payload?.summary.highRiskLabel ?? "0"} note="Need closer review" />
            <SummaryCard label="Pending Amount" value={payload?.summary.pendingAmountLabel ?? "0.00 KAS"} note="Visible payout total" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">Queue State</p>
          <p className="mt-2 text-lg font-semibold text-white">{loading ? "Loading cashout requests..." : payload?.queueState.title || "Connected to pending requests"}</p>
          <p className="mt-2 text-sm text-white/55">{loading ? "Fetching the latest cashout queue state." : payload?.queueState.description || "Open the details page for any miner to review hashrate history, fraud signals, and approve or reject the cashout request."}</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">How It Works</p>
          <div className="mt-3 space-y-2 text-sm text-white/55">
            <p>1. See who requested cashout.</p>
            <p>2. Open the miner review details.</p>
            <p>3. Review the full investigation page before deciding.</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(14,17,29,0.98),rgba(8,10,18,0.99))] p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">Cashout Queue</p>
            <h2 className="mt-2 text-2xl font-black text-white">Pending Cashout Requests</h2>
          </div>
          <p className="text-sm text-white/50">Grouped by miner, with every open payout request still available.</p>
        </div>

        <div className="mb-5 relative max-w-xl">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or miner ID..."
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 pr-12 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-[#C9EB55]/35"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-sm text-white/45 transition-colors hover:text-white/80"
              aria-label="Clear search"
            >
              X
            </button>
          ) : null}
        </div>

        <div className="space-y-4">
          {!loading && filteredGroups.length === 0 ? (
            <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5 text-sm text-white/50">
              No cashout requests found matching your search.
            </div>
          ) : null}

          {filteredGroups.map((group) => {
            return (
              <article
                key={group.minerId}
                className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5"
              >
                <div className="flex flex-col gap-5">
                  <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_0.8fr_0.8fr] xl:items-start">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">Miner</p>
                      <p className="mt-2 text-xl font-black text-white">{group.minerName}</p>
                      <p className="mt-1 font-mono text-xs text-white/50">{group.minerId}</p>
                      <p className="mt-1 text-xs text-white/50">{group.minerEmail}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">Open Requests</p>
                      <p className="mt-2 text-2xl font-black text-white">{group.openRequestCountLabel}</p>
                      <p className="mt-1 text-xs text-white/50">Newest: {group.newestPayoutLabel.replace("Requested ", "")}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">Total Requested</p>
                      <p className="mt-2 text-2xl font-black text-[#D7F27A]">{group.totalRequestedAmountLabel}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">Highest Risk</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge label={group.highestRiskLabel} tone={group.highestRiskTone} />
                        <Badge label={group.highestRiskLevelLabel} tone={group.highestRiskTone} />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-white">View requests</p>
                        <p className="mt-0.5 text-xs text-white/45">Every open payout for this miner is listed below.</p>
                      </div>
                      <Badge label={group.openRequestCountLabel} tone={group.openRequestCount > 1 ? "warn" : "neutral"} />
                    </div>
                    <div className="divide-y divide-white/10">
                      {group.requests.map((record) => (
                        <div key={`${record.payoutId}-${record.minerId}`} className="grid gap-4 px-4 py-4 md:grid-cols-[0.8fr_0.8fr_1fr_auto] md:items-center">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">Request</p>
                            <p className="mt-1 font-mono text-sm font-semibold text-white">#{record.payoutId}</p>
                            <p className="mt-1 text-xs text-white/50">{record.requestedAtLabel}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">Payout</p>
                            <p className="mt-1 text-lg font-black text-[#D7F27A]">{record.payoutAmountLabel}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">Risk</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge label={record.riskLabel} tone={record.riskTone} />
                              <Badge label={record.riskLevelLabel} tone={record.riskTone} />
                              <Badge label={record.vpnStatus} tone={record.vpnTone} />
                            </div>
                            <div className="mt-2 text-xs leading-5 text-white/50">
                              {record.reasons.length > 0 ? `Reasons: ${record.reasons.slice(0, 3).join(", ")}` : "Reasons: No active risk contributors"}
                            </div>
                          </div>
                          <div className="flex flex-col items-start gap-3 md:items-end">
                            <div className="text-sm text-white/50">{record.locationLabel}</div>
                            <Link
                              href={`/admin/dashboard/cashout-review/${record.minerId}?payoutId=${record.payoutId}`}
                              className="rounded-2xl border border-[#C9EB55]/35 bg-[#C9EB55]/12 px-5 py-3 text-sm font-semibold text-[#E6FF97] transition hover:bg-[#C9EB55]/20"
                            >
                              Review Details
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
