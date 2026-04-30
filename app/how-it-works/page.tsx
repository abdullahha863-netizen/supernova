import Link from "next/link";

const steps = [
  {
    title: "1. Start With Starter",
    body:
      "Users can create an account, verify access, and explore the core platform experience through the free Starter plan before moving into any paid tier.",
  },
  {
    title: "2. Upgrade When Ready",
    body:
      "When stronger support windows, lower pool fees, or premium access layers are needed, users can move into Silver, Hash Pro, or Titan Elite from the pricing flow.",
  },
  {
    title: "3. Secure Checkout",
    body:
      "Paid upgrades run through a signed checkout intent so pricing, access flow, and payment handling stay controlled before purchase is completed.",
  },
  {
    title: "4. Manage From Dashboard",
    body:
      "After sign-in, members manage profile data, renewals, referrals, support paths, and security settings from the dashboard and account routes.",
  },
];

const layers = [
  "Account registration, login, and email verification",
  "Optional 2FA and account recovery flows",
  "Plan upgrades with structured renewal terms",
  "Dashboard access for profile, workers, referrals, and subscription actions",
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#0A0A0F] text-white">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1f2e,_#0a0a0f)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(201,235,85,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(201,235,85,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-20">
        <section className="rounded-3xl border border-[#C9EB55]/20 bg-[radial-gradient(circle_at_top,rgba(201,235,85,0.12),rgba(4,6,7,0.92)_45%)] p-8 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9EB55]/85">Platform Flow</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">How It Works</h1>
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/75 md:text-base">
            SUPERNOVA is designed as a guided platform flow: start with core access, upgrade only when needed, and manage everything from one structured member environment.
          </p>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          {steps.map((step) => (
            <article key={step.title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
              <h2 className="text-2xl font-bold text-[#C9EB55]">{step.title}</h2>
              <p className="mt-4 text-sm leading-relaxed text-white/78 md:text-base">{step.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-3xl border border-[#C9EB55]/18 bg-[#0b0f0a] p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C9EB55]/80">Core Journey</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {layers.map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-sm text-white/75">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-4 rounded-3xl border border-[#C9EB55]/20 bg-[#0b0f0a] p-6 md:grid-cols-2 md:p-8">
          <Link
            href="/pricing/starter"
            className="rounded-2xl border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-5 py-4 text-center text-sm font-semibold uppercase tracking-[0.14em] text-[#C9EB55] transition-colors hover:bg-[#C9EB55]/20"
          >
            Open Starter Plan
          </Link>
          <Link
            href="/about"
            className="rounded-2xl border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-5 py-4 text-center text-sm font-semibold uppercase tracking-[0.14em] text-[#C9EB55] transition-colors hover:bg-[#C9EB55]/20"
          >
            Learn About SUPERNOVA
          </Link>
        </section>
      </main>
    </div>
  );
}