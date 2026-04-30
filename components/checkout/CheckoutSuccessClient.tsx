"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type IntentStatusResponse = {
  ok: boolean;
  error?: string;
  intent?: {
    id: string;
    tier: string;
    amountUsd: number;
    currency: string;
    status: string;
    provider: string;
    expiresAt: string;
  };
};

type CheckoutSuccessClientProps = {
  intentId: string;
  token: string;
  tier: string;
  redirectStatus: string;
  provider?: string;
};

export default function CheckoutSuccessClient({ intentId, token, tier, redirectStatus, provider }: CheckoutSuccessClientProps) {
  const [status, setStatus] = useState<{ loading: boolean; error: string; intentStatus: string; amount: number | null }>({
    loading: true,
    error: "",
    intentStatus: "pending",
    amount: null,
  });

  useEffect(() => {
    if (!intentId || !token) {
      setStatus({ loading: false, error: "Missing checkout confirmation details.", intentStatus: "pending", amount: null });
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const loadStatus = async () => {
      try {
        const res = await fetch(`/api/checkout/intent?id=${encodeURIComponent(intentId)}&token=${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as IntentStatusResponse;
        if (!res.ok || !data.ok || !data.intent) {
          throw new Error(data.error || "Failed to load checkout result.");
        }

        if (cancelled) return;

        setStatus({
          loading: false,
          error: "",
          intentStatus: data.intent.status,
          amount: data.intent.amountUsd,
        });

        attempts += 1;
        if (["pending", "processing", "requires_action", "requires_payment_method"].includes(data.intent.status) && attempts < 8) {
          window.setTimeout(loadStatus, 2500);
        }
      } catch (error) {
        if (cancelled) return;
        setStatus({
          loading: false,
          error: error instanceof Error ? error.message : "Failed to load checkout result.",
          intentStatus: "pending",
          amount: null,
        });
      }
    };

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [intentId, token]);

  const headline = useMemo(() => {
    if (status.loading) return "Checking Payment Status";
    if (status.intentStatus === "succeeded") return "Payment Confirmed";
    if (status.intentStatus === "processing") return provider === "nowpayments" ? "Crypto Payment Processing" : "Payment Processing";
    if (redirectStatus === "succeeded") return "Payment Submitted";
    return "Payment Status Pending";
  }, [provider, redirectStatus, status.intentStatus, status.loading]);

  return (
    <div className="min-h-screen overflow-hidden bg-[#0A0A0F] text-white">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1f2e,_#0a0a0f)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(201,235,85,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(201,235,85,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-16 md:px-10 md:py-20">
        <section className="rounded-3xl border border-[#C9EB55]/20 bg-[radial-gradient(circle_at_top,rgba(201,235,85,0.12),rgba(4,6,7,0.92)_45%)] p-8 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9EB55]/85">Checkout Result</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">{headline}</h1>
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/75 md:text-base">
            {status.loading
              ? provider === "nowpayments"
                ? "We are verifying the latest crypto payment state with NOWPayments and the server."
                : "We are verifying the latest payment state with the server."
              : status.error
                ? status.error
                : `Tier: ${tier || "Unknown"} | Amount: ${status.amount ? `$${status.amount.toFixed(2)}` : "-"} | Status: ${status.intentStatus}`}
          </p>
        </section>

        <section className="mt-10 grid gap-4 rounded-3xl border border-[#C9EB55]/20 bg-[#0b0f0a] p-6 md:grid-cols-2 md:p-8">
          <Link
            href="/dashboard"
            className="rounded-2xl border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-5 py-4 text-center text-sm font-semibold uppercase tracking-[0.14em] text-[#C9EB55] transition-colors hover:bg-[#C9EB55]/20"
          >
            Open Dashboard
          </Link>
          <Link
            href={tier ? `/pricing/${tier}` : "/pricing/silver"}
            className="rounded-2xl border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-5 py-4 text-center text-sm font-semibold uppercase tracking-[0.14em] text-[#C9EB55] transition-colors hover:bg-[#C9EB55]/20"
          >
            Return To Plan
          </Link>
        </section>
      </main>
    </div>
  );
}