"use client";

import { useState, type FormEvent } from "react";
import { PageShell } from "@/components/dashboard/v2/PageShell";

type ActivationResponse = {
  ok: boolean;
  card?: {
    metalCardId: string;
    tier: string;
    status: string;
    activatedAt: string | null;
  };
  error?: string;
};

export default function MetalCardActivationPage() {
  const [metalCardId, setMetalCardId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activatedCard, setActivatedCard] = useState<ActivationResponse["card"] | null>(null);

  async function activateCard(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setActivatedCard(null);

    try {
      const response = await fetch("/api/member/metal-card/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metalCardId: metalCardId.trim(),
          verificationCode: verificationCode.trim(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as ActivationResponse | null;

      if (!response.ok || !payload?.ok || !payload.card) {
        throw new Error(payload?.error || "Unable to activate Metal Card.");
      }

      setActivatedCard(payload.card);
      setMessage({ type: "success", text: "Metal Card activated successfully." });
      setMetalCardId("");
      setVerificationCode("");
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to activate Metal Card.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Metal Card Activation"
      subtitle="Activate your physical Metal Card with the card ID and 6-digit verification code."
    >
      <section className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-[1fr_0.9fr]">
        <form onSubmit={activateCard} className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="metalCardId" className="text-sm text-white/70">Metal Card ID</label>
              <input
                id="metalCardId"
                value={metalCardId}
                onChange={(event) => setMetalCardId(event.target.value)}
                className="w-full rounded-lg border border-[#C6E65A]/20 bg-white/6 px-4 py-3 text-white placeholder-white/40 focus:border-[#C9EB55] focus:outline-none focus:ring-1 focus:ring-[#C9EB55]/30"
                autoComplete="off"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="verificationCode" className="text-sm text-white/70">6-Digit Code</label>
              <input
                id="verificationCode"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full rounded-lg border border-[#C6E65A]/20 bg-white/6 px-4 py-3 text-white placeholder-white/40 focus:border-[#C9EB55] focus:outline-none focus:ring-1 focus:ring-[#C9EB55]/30"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !metalCardId.trim() || verificationCode.length !== 6}
              className="w-full rounded-lg bg-[#C9EB55] py-3 font-semibold text-black shadow-[0_0_20px_rgba(201,235,85,0.25)] transition hover:shadow-[0_0_35px_rgba(201,235,85,0.45)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Activating..." : "Activate Metal Card"}
            </button>

            {message ? (
              <p className={`text-sm ${message.type === "success" ? "text-[#D7F36C]" : "text-red-200"}`}>
                {message.text}
              </p>
            ) : null}
          </div>
        </form>

        <aside className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-white/55">Activation Status</p>
          {activatedCard ? (
            <div className="mt-4 space-y-3 text-sm text-white/75">
              <div className="rounded-2xl border border-[#C9EB55]/20 bg-[#C9EB55]/10 p-4">
                <p className="font-bold text-[#D7F36C]">{activatedCard.metalCardId}</p>
                <p className="mt-1">Tier: {activatedCard.tier}</p>
                <p>Status: {activatedCard.status}</p>
                <p>Activated: {activatedCard.activatedAt ? new Date(activatedCard.activatedAt).toLocaleString() : "-"}</p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-white/60">
              Your code is checked securely. The verification hash and internal card fields are never shown.
            </p>
          )}
        </aside>
      </section>
    </PageShell>
  );
}
