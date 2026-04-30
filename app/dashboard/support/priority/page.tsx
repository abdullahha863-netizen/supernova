"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { PageShell } from "@/components/dashboard/v2/PageShell";

type PrioritySupportResponse = {
  ok?: boolean;
  message?: string;
  priority?: string;
  cardTier?: string;
  error?: string;
};

type MetalCardStatusResponse = {
  ok?: boolean;
  hasActiveMetalCard?: boolean;
  card?: {
    metalCardId: string;
    tier: string;
    status: string;
    activatedAt: string | null;
  } | null;
  error?: string;
};

export default function DashboardPrioritySupportPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [metalCardStatus, setMetalCardStatus] = useState<MetalCardStatusResponse | null>(null);
  const [result, setResult] = useState<{
    type: "success" | "error";
    text: string;
    cardTier?: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadMetalCardStatus() {
      setIsStatusLoading(true);

      try {
        const response = await fetch("/api/member/metal-card/status", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as MetalCardStatusResponse | null;

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Unable to load Metal Card status.");
        }

        if (isMounted) {
          setMetalCardStatus(payload);
        }
      } catch (error) {
        if (isMounted) {
          setMetalCardStatus({
            ok: false,
            hasActiveMetalCard: false,
            card: null,
            error: error instanceof Error ? error.message : "Unable to load Metal Card status.",
          });
        }
      } finally {
        if (isMounted) {
          setIsStatusLoading(false);
        }
      }
    }

    void loadMetalCardStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  async function submitPriorityRequest(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch("/api/support/priority", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as PrioritySupportResponse | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Unable to submit priority support request.");
      }

      setResult({
        type: "success",
        text: payload.message || "Priority support request received.",
        cardTier: payload.cardTier,
      });
      setSubject("");
      setMessage("");
    } catch (error) {
      setResult({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to submit priority support request.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Priority Support"
      subtitle="Send a high-priority request using your active Metal Card privileges."
    >
      {isStatusLoading ? (
        <section className="mx-auto max-w-4xl rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <p className="text-sm text-white/60">Checking Metal Card privileges...</p>
        </section>
      ) : metalCardStatus?.hasActiveMetalCard ? (
        <section className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-[1fr_0.8fr]">
          <form onSubmit={submitPriorityRequest} className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm text-white/70">Subject</label>
                <input
                  id="subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  maxLength={160}
                  className="w-full rounded-lg border border-[#C6E65A]/20 bg-white/6 px-4 py-3 text-white placeholder-white/40 focus:border-[#C9EB55] focus:outline-none focus:ring-1 focus:ring-[#C9EB55]/30"
                  placeholder="Short summary"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="text-sm text-white/70">Message</label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={5000}
                  rows={8}
                  className="w-full resize-y rounded-lg border border-[#C6E65A]/20 bg-white/6 px-4 py-3 text-white placeholder-white/40 focus:border-[#C9EB55] focus:outline-none focus:ring-1 focus:ring-[#C9EB55]/30"
                  placeholder="Describe what happened and what needs attention."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !subject.trim() || !message.trim()}
                className="w-full rounded-lg bg-[#C9EB55] py-3 font-semibold text-black shadow-[0_0_20px_rgba(201,235,85,0.25)] transition hover:shadow-[0_0_35px_rgba(201,235,85,0.45)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit Priority Request"}
              </button>

              {result ? (
                <div className={`rounded-2xl border px-4 py-3 text-sm ${
                  result.type === "success"
                    ? "border-[#C9EB55]/25 bg-[#C9EB55]/10 text-[#D7F36C]"
                    : "border-red-400/30 bg-red-500/10 text-red-200"
                }`}>
                  <p>{result.text}</p>
                  {result.type === "success" && result.cardTier ? (
                    <p className="mt-1 text-xs text-white/65">Card tier: {result.cardTier}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </form>

          <aside className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-white/55">Access</p>
            <h2 className="mt-2 text-xl font-bold text-white">Metal Card Priority</h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Priority Support is available after your Metal Card is activated. Requests are checked against your session and active card status.
            </p>
          </aside>
        </section>
      ) : (
        <section className="mx-auto max-w-4xl rounded-3xl border border-[#C9EB55]/35 bg-[#C9EB55]/10 p-6 shadow-[0_0_32px_rgba(201,235,85,0.08)]">
          <div className="max-w-2xl space-y-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[#C9EB55]">Premium Access</p>
            <h2 className="text-2xl font-black text-white">Priority Support is a Premium Feature</h2>
            <p className="text-sm leading-6 text-white/70">
              This feature is available only for users with an active Metal Card (paid upgrade).
            </p>
            <Link
              href="/dashboard/metal-card/activate"
              className="inline-flex rounded-full border border-[#C9EB55]/35 bg-[#C9EB55] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-black hover:bg-[#D7F36C] transition-colors"
            >
              Activate Metal Card
            </Link>
          </div>
        </section>
      )}
    </PageShell>
  );
}
