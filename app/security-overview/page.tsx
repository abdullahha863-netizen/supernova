"use client";

import Link from "next/link";
import { DroneGraphic } from "@/components/ui/DroneGraphic";

const safeguards = [
  {
    title: "Authentication Sessions",
    body:
      "Signed session tokens are issued through a protected authentication flow and stored in HttpOnly cookies with SameSite=Lax semantics.",
  },
  {
    title: "Two-Factor Authentication",
    body:
      "The platform supports 2FA flows to strengthen account access and reduce the risk of unauthorized sign-in.",
  },
  {
    title: "Request Protection",
    body:
      "Cross-site unsafe API requests are blocked in middleware, and rate limits are applied on sensitive authentication routes.",
  },
  {
    title: "Session Validation",
    body:
      "Authenticated requests are checked against persisted session records and expiry timestamps before user access is accepted.",
  },
];

const droneLayers = [
  {
    tier: "Starter",
    title: "Baseline Protection",
    body:
      "Starter gives users a safe entry path into the platform, but it does not include automated security drone coverage.",
  },
  {
    tier: "Silver",
    title: "Scout AI Security Drone",
    body:
      "Silver introduces the Scout AI security drone with threat detection, anomaly awareness, DDoS-oriented protection language, and faster alert visibility.",
  },
  {
    tier: "Hash Pro",
    title: "Advanced Guardian Coverage",
    body:
      "Hash Pro steps into stronger Guardian Drone support with deeper protection response and stronger awareness than lower tiers.",
  },
  {
    tier: "Titan Elite",
    title: "Full Guardian Coverage",
    body:
      "Titan Elite is positioned as the strongest listed protection layer in the current stack, with full Guardian Drone coverage and the highest security posture in the plan lineup.",
  },
];

const notes = [
  "Security controls may evolve over time as the platform adds stronger protections and broader operational coverage.",
  "This overview is informational and should be read together with the Terms of Service and Cookies Policy where applicable.",
];

export default function SecurityOverviewPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#0A0A0F] text-white">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1f2e,_#0a0a0f)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(201,235,85,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(201,235,85,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-20">
        <section className="rounded-3xl border border-[#C9EB55]/20 bg-[radial-gradient(circle_at_top,rgba(201,235,85,0.12),rgba(4,6,7,0.92)_45%)] p-8 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9EB55]/85">Security</p>
          <h1 className="relative mt-3 text-4xl font-black tracking-tight md:text-6xl">
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 -z-10 h-24 w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C9EB55]/16 blur-[65px]"
            />
            Security Overview
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/75 md:text-base">
            This overview summarizes the main security layers currently visible in the platform flow, including session handling, login protection, and request safeguards.
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="rounded-3xl border border-white/10 bg-black/25 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9EB55]/80">Protection Drone Layer</p>
              <h2 className="mt-3 text-2xl font-bold text-white md:text-3xl">Security is not only account-based. It is also product-layered through visible drone coverage.</h2>
              <p className="mt-4 text-sm leading-relaxed text-white/76 md:text-base">
                The platform positions protection as a progressive member capability, moving from baseline access in Starter into Scout and Guardian Drone layers as users move up the pricing stack.
              </p>
            </div>

            <div className="flex items-center justify-center rounded-3xl border border-[#C9EB55]/20 bg-white/[0.03] p-6">
              <DroneGraphic className="h-40 w-40 text-[#C9EB55] md:h-56 md:w-56" />
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          {safeguards.map((item) => (
            <article key={item.title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
              <h2 className="text-2xl font-bold text-[#C9EB55]">{item.title}</h2>
              <p className="mt-4 text-sm leading-relaxed text-white/78 md:text-base">{item.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-3xl border border-[#C9EB55]/18 bg-[#0b0f0a]/90 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C9EB55]/80">Drone Coverage By Tier</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {droneLayers.map((layer) => (
              <article key={layer.tier} className="rounded-2xl border border-white/10 bg-black/25 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">{layer.tier}</p>
                <h2 className="mt-2 text-xl font-bold text-[#C9EB55]">{layer.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-white/76">{layer.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-[#C9EB55]/18 bg-[#0b0f0a] p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C9EB55]/80">Important Notes</p>
          <div className="mt-5 space-y-3 text-sm leading-relaxed text-white/76 md:text-base">
            {notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-4 rounded-3xl border border-[#C9EB55]/20 bg-[#0b0f0a] p-6 md:grid-cols-2 md:p-8">
          <Link
            href="/terms-of-service"
            className="rounded-2xl border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-5 py-4 text-center text-sm font-semibold uppercase tracking-[0.14em] text-[#C9EB55] transition-colors hover:bg-[#C9EB55]/20"
          >
            Open Terms of Service
          </Link>
          <Link
            href="/cookies-policy"
            className="rounded-2xl border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-5 py-4 text-center text-sm font-semibold uppercase tracking-[0.14em] text-[#C9EB55] transition-colors hover:bg-[#C9EB55]/20"
          >
            Open Cookies Policy
          </Link>
        </section>
      </main>
    </div>
  );
}