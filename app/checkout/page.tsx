import {
  ArrowLeft,
  BadgeCheck,
  CreditCard,
  Radar,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import CheckoutActions from "@/components/checkout/CheckoutActions";
import { CHECKOUT_PLANS, normalizeTier, type TierKey } from "@/lib/checkoutPlans";

type CheckoutPageProps = {
  searchParams?:
    | {
        tier?: string | string[];
      }
    | Promise<{
    tier?: string | string[];
      }>;
};

function resolveTier(rawTier: string | string[] | undefined): TierKey | null {
  const firstValue = Array.isArray(rawTier) ? rawTier[0] : rawTier;
  return normalizeTier(firstValue);
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const resolvedSearchParams = (await Promise.resolve(searchParams)) || {};
  const tier = resolveTier(resolvedSearchParams?.tier);
  if (!tier) {
    redirect("/pricing/silver");
  }

  const plan = CHECKOUT_PLANS[tier];
  const nextPath = `/checkout?tier=${tier}`;
  const firstPaymentLabel = tier === "titan-elite" ? "Metal Card + 1 Year Access" : "Metal Card + 3 Month Access";
  const capabilityCards = [
    {
      icon: Radar,
      label: "Coverage",
      value: plan.title,
      description: plan.summary,
    },
    {
      icon: ShieldCheck,
      label: "Pool Fee",
      value: plan.fee,
      description: "Reduced operational drag while keeping the same secured access flow.",
    },
    {
      icon: Zap,
      label: "Activation",
      value: "Signed Intent",
      description: "Payment access is initialized through a server-signed intent before checkout continues.",
    },
  ] as const;
  const trustSignals = [
    "Strict tier allowlist validation",
    "Secure intent signing before payment",
    "Stripe card flow and NOWPayments crypto flow share the same fulfillment logic",
  ] as const;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0A0A0F] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1f2e,_#0a0a0f_58%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(201,235,85,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(201,235,85,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#C9EB55]/12 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#C9EB55]/10 blur-[150px]" />
        <div className="absolute left-1/2 top-1/3 h-px w-[72vw] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#C9EB55]/20 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10 lg:px-8 lg:py-14">
        <div className="flex items-center justify-between gap-4">
          <Link
            href={`/pricing/${tier}`}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/78 transition-colors hover:border-[#C9EB55]/35 hover:text-[#C9EB55]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back To Plan
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#C9EB55]">
            <Sparkles className="h-3.5 w-3.5" />
            Secure Checkout
          </div>
        </div>

        <div className="mt-10 grid gap-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
          <section className="relative overflow-hidden rounded-[34px] border border-[#C9EB55]/20 bg-white/[0.035] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:p-10">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9EB55]/60 to-transparent" />
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#C9EB55]/10 blur-[90px]" />

            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#C9EB55]/80">SUPERNOVA MEMBER ACCESS</p>
            <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[0.92] tracking-tight text-[#C9EB55] md:text-6xl">
              CHECKOUT
              <br />
              {plan.title.toUpperCase()} PLAN
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/74 md:text-lg">
              The plan is right. The screen should feel like mission control, not a generic payment box. This flow now mirrors the same SUPERNOVA visual language used in the pricing experience.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/45">
                  <CreditCard className="h-4 w-4 text-[#C9EB55]" />
                  First Charge
                </div>
                <div className="mt-3 text-3xl font-black text-[#C9EB55]">${plan.firstPaymentUsd.toFixed(2)}</div>
                <p className="mt-2 text-sm text-white/55">{firstPaymentLabel}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/45">
                  <TimerReset className="h-4 w-4 text-[#C9EB55]" />
                  Renewal
                </div>
                <div className="mt-3 text-3xl font-black text-white">${plan.renewalUsd.toFixed(2)}</div>
                <p className="mt-2 text-sm text-white/55">{plan.renewalLabel}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/45">
                  <ShieldCheck className="h-4 w-4 text-[#C9EB55]" />
                  Support
                </div>
                <div className="mt-3 text-3xl font-black text-white">{plan.supportWindow}</div>
                <p className="mt-2 text-sm text-white/55">Dedicated response window for this member tier</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {capabilityCards.map((item) => {
                const Icon = item.icon;

                return (
                  <article key={item.label} className="group rounded-[26px] border border-white/10 bg-white/[0.03] p-5 transition-all hover:-translate-y-1 hover:border-[#C9EB55]/28 hover:bg-white/[0.045]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#C9EB55]/25 bg-[#C9EB55]/10 text-[#C9EB55] shadow-[0_0_20px_rgba(201,235,85,0.14)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">{item.label}</p>
                    <h2 className="mt-2 text-xl font-bold text-white">{item.value}</h2>
                    <p className="mt-3 text-sm leading-6 text-white/62">{item.description}</p>
                  </article>
                );
              })}
            </div>

            <div className="mt-8 rounded-[28px] border border-[#C9EB55]/15 bg-black/30 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#C9EB55]/25 bg-[#C9EB55]/12 text-[#C9EB55]">
                  <BadgeCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C9EB55]/78">Trust Layer</p>
                  <p className="text-sm text-white/58">The purchase flow keeps the same security posture as the rest of the platform.</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {trustSignals.map((signal) => (
                  <div key={signal} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/72">
                    {signal}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[34px] border border-[#C9EB55]/22 bg-[#050507]/85 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.7)] backdrop-blur-xl lg:p-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9EB55]/55 to-transparent" />
            <div className="absolute -right-8 top-6 h-32 w-32 rounded-full bg-[#C9EB55]/10 blur-[80px]" />

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#C9EB55]/78">Order Console</p>
              <div className="mt-4">
                <div>
                  <h2 className="text-2xl font-black text-white">{plan.title} Plan</h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-white/60">{plan.summary}</p>
                </div>
              </div>

              <div className="mt-6 space-y-3 text-sm text-white/84">
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/30 px-4 py-3">
                  <span className="text-white/60">Plan</span>
                  <span className="font-semibold text-[#C9EB55]">{plan.title}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/30 px-4 py-3">
                  <span className="text-white/60">Initial Access Charge</span>
                  <span className="font-semibold">${plan.firstPaymentUsd.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/30 px-4 py-3">
                  <span className="text-white/60">Renewal Cycle</span>
                  <span className="font-semibold">${plan.renewalUsd.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/30 px-4 py-3">
                  <span className="text-white/60">Renewal Terms</span>
                  <span className="font-semibold">{plan.renewalLabel}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/30 px-4 py-3">
                  <span className="text-white/60">Support Response</span>
                  <span className="font-semibold">{plan.supportWindow}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[28px] border border-[#C9EB55]/16 bg-[#C9EB55]/[0.05] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#C9EB55]/80">Launch Payment</p>
              <p className="mt-3 text-sm leading-6 text-white/65">
                Confirm shipping first, then continue directly into card payment or NOWPayments crypto checkout. If the user is not authenticated, the flow routes into login and returns straight back here.
              </p>

              <section className="mt-5 space-y-3">
                <CheckoutActions tier={tier} nextPath={nextPath} />

                <Link
                  href={`/register?plan=${tier}&next=${encodeURIComponent(nextPath)}`}
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-[#C9EB55]/40 bg-[#C9EB55]/14 px-5 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#C9EB55] transition-all hover:bg-[#C9EB55]/22 hover:shadow-[0_0_24px_rgba(201,235,85,0.14)]"
                >
                  Continue To Registration
                </Link>

                <Link
                  href={`/login?next=${encodeURIComponent(nextPath)}`}
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-white/84 transition-colors hover:bg-white/[0.08]"
                >
                  Already Have Account? Login
                </Link>

                <Link
                  href="/#upgrade-cards"
                  className="inline-flex w-full items-center justify-center text-xs uppercase tracking-[0.18em] text-white/48 transition-colors hover:text-[#C9EB55]"
                >
                  Browse Other Plans
                </Link>
              </section>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-sm text-white/72">
                <p className="font-semibold uppercase tracking-[0.12em] text-[#C9EB55]">No Refunds - All sales are final</p>
                <p className="mt-2 leading-6">
                  Users can evaluate the platform through the free Starter plan before upgrading. Therefore, all paid plans are non-refundable once the purchase is completed.
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.12em] text-white/45">
                  Completing checkout confirms acceptance of the refund policy and plan terms.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
