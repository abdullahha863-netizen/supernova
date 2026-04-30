import Link from "next/link";

const reasons = [
  {
    title: "Clarity Over Noise",
    body:
      "SUPERNOVA is positioned to feel intentional and understandable instead of overloaded with scattered messaging and generic dashboards.",
  },
  {
    title: "Security As Core Infrastructure",
    body:
      "Authentication, 2FA, controlled recovery paths, and request protections are treated as part of the product foundation rather than add-ons.",
  },
  {
    title: "Premium Tier Progression",
    body:
      "Starter, Silver, Hash Pro, and Titan Elite are meant to form a visible ladder of support, access, and operational positioning.",
  },
  {
    title: "One Platform For The Full Journey",
    body:
      "Users can move from onboarding to upgrades, referrals, support, and account security from the same product surface without a fragmented flow.",
  },
];

export default function WhySupernovaPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#0A0A0F] text-white">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1f2e,_#0a0a0f)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(201,235,85,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(201,235,85,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-20">
        <section className="rounded-3xl border border-[#C9EB55]/20 bg-[radial-gradient(circle_at_top,rgba(201,235,85,0.12),rgba(4,6,7,0.92)_45%)] p-8 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9EB55]/85">Positioning</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Why SUPERNOVA</h1>
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/75 md:text-base">
            SUPERNOVA is built around a simple idea: a mining platform should feel strong, organized, and credible from the first visit to the daily operating workflow.
          </p>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          {reasons.map((reason) => (
            <article key={reason.title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
              <h2 className="text-2xl font-bold text-[#C9EB55]">{reason.title}</h2>
              <p className="mt-4 text-sm leading-relaxed text-white/78 md:text-base">{reason.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-3xl border border-[#C9EB55]/18 bg-[#0b0f0a] p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C9EB55]/80">What This Means In Practice</p>
          <div className="mt-5 space-y-3 text-sm leading-relaxed text-white/76 md:text-base">
            <p>Users can begin with a free plan, evaluate the experience, and upgrade only when premium features and faster support become necessary.</p>
            <p>The visual layer, legal pages, checkout flow, and member routes are all shaped to reinforce trust, consistency, and controlled growth.</p>
          </div>
        </section>

        <section className="mt-10 grid gap-4 rounded-3xl border border-[#C9EB55]/20 bg-[#0b0f0a] p-6 md:grid-cols-2 md:p-8">
          <Link
            href="/about"
            className="rounded-2xl border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-5 py-4 text-center text-sm font-semibold uppercase tracking-[0.14em] text-[#C9EB55] transition-colors hover:bg-[#C9EB55]/20"
          >
            Open About Page
          </Link>
          <Link
            href="/security-overview"
            className="rounded-2xl border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-5 py-4 text-center text-sm font-semibold uppercase tracking-[0.14em] text-[#C9EB55] transition-colors hover:bg-[#C9EB55]/20"
          >
            Review Security Overview
          </Link>
        </section>
      </main>
    </div>
  );
}