"use client";

import { useEffect, useState } from "react";
import AdminToolShell from "@/components/admin/AdminToolShell";

type Ticket = {
  id: string;
  title: string;
  email: string;
  priority: string;
  cardLast4: string | null;
  description: string;
  screenshotUrl: string | null;
  createdAt: string;
};

type TicketsResponse = {
  ok: boolean;
  tickets?: Ticket[];
  error?: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function priorityTone(priority: string) {
  if (priority === "Titan Elite") return "border-purple-300/30 bg-purple-500/15 text-purple-100";
  if (priority === "Hash Pro") return "border-cyan-300/30 bg-cyan-500/15 text-cyan-100";
  if (priority === "Silver") return "border-slate-200/30 bg-white/15 text-white";
  return "border-[#C9EB55]/25 bg-[#C9EB55]/10 text-[#D7F36C]";
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTickets() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/admin/tickets?limit=50", {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as TicketsResponse | null;

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Unable to load tickets.");
        }

        if (!cancelled) {
          setTickets(Array.isArray(payload.tickets) ? payload.tickets : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setTickets([]);
          setError(loadError instanceof Error ? loadError.message : "Unable to load tickets.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTickets();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminToolShell
      title="Support Tickets"
      subtitle="Review general support and priority support requests submitted by users."
    >
      <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/55">Ticket Inbox</p>
            <p className="mt-2 text-sm text-white/65">
              {loading ? "Loading tickets..." : `${tickets.length} latest ticket${tickets.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/60">
            Loading tickets...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-5 text-sm text-red-200">
            {error}
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/60">
            No tickets yet.
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <article key={ticket.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${priorityTone(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                      <span className="text-xs text-white/45">{formatDate(ticket.createdAt)}</span>
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-white">{ticket.title}</h2>
                      <p className="mt-1 text-sm text-white/55">{ticket.email}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 text-xs text-white/65">
                    {ticket.cardLast4 ? (
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                        Member ID: {ticket.cardLast4}
                      </span>
                    ) : null}
                    {ticket.screenshotUrl ? (
                      <a
                        href={ticket.screenshotUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-3 py-1 text-[#D7F36C]"
                      >
                        Screenshot
                      </a>
                    ) : null}
                  </div>
                </div>

                <p className="mt-4 whitespace-pre-wrap rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-white/72">
                  {ticket.description}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </AdminToolShell>
  );
}
