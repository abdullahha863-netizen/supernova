import Link from "next/link";

const LAST_UPDATED = "April 5, 2026";

type PolicySection = {
  id: string;
  title: string;
  body: string[];
};

const sections: PolicySection[] = [
  {
    id: "overview",
    title: "1. Overview",
    body: [
      "SUPERNOVA offers a free Starter plan so users can evaluate the platform before purchasing any paid tier.",
      "For that reason, all paid plan purchases are final and non-refundable once checkout is completed, except where a refund is required by applicable law.",
    ],
  },
  {
    id: "paid-plans",
    title: "2. Paid Plans",
    body: [
      "This policy applies to paid upgrades and subscriptions including Silver, Hash Pro, and Titan Elite.",
      "Displayed prices, billing intervals, renewal terms, and plan descriptions shown on the pricing pages and at checkout form part of the purchase terms.",
    ],
  },
  {
    id: "non-refundable-items",
    title: "3. Non-Refundable Items",
    body: [
      "Paid subscriptions, activation charges, renewed billing cycles, fulfilled services, activated features, processing fees, shipping fees, and physical member cards are non-refundable to the maximum extent permitted by law.",
      "A cancellation stops future billing when supported by the account controls, but does not reverse already completed charges.",
    ],
  },
  {
    id: "legal-exceptions",
    title: "4. Legal Exceptions",
    body: [
      "If a refund is required under applicable consumer protection law, SUPERNOVA will process that refund only to the extent legally required.",
      "Nothing in this policy limits rights that cannot be waived under applicable law.",
    ],
  },
  {
    id: "chargebacks",
    title: "5. Chargebacks and Payment Disputes",
    body: [
      "Chargebacks, payment disputes, or reversed transactions may result in account review, access restriction, suspension, or permanent termination.",
      "Where a payment processor requests documentation, system records and checkout confirmations may be used to confirm acceptance of these terms.",
    ],
  },
  {
    id: "contact",
    title: "6. Questions",
    body: [
      "For billing or policy questions, contact support@snovapool.io before completing a paid upgrade if anything is unclear.",
    ],
  },
];

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#0A0A0F] text-white">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1f2e,_#0a0a0f)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(201,235,85,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(201,235,85,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-16 md:px-10 md:py-20">
        <section className="rounded-3xl border border-[#C9EB55]/20 bg-[radial-gradient(circle_at_top,rgba(201,235,85,0.14),rgba(4,6,7,0.92)_45%)] p-8 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9EB55]/85">Legal</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Refund Policy</h1>
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/75 md:text-base">
            This policy explains how paid upgrades, cancellations, renewals, and non-refundable items are handled across the platform.
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/50">Last Updated: {LAST_UPDATED}</p>

          <div className="mt-7 rounded-3xl border border-[#C9EB55]/20 bg-black/25 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9EB55]">No Refunds - All sales are final</p>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/75 md:text-base">
              Users can evaluate the platform through the free Starter plan before upgrading. Therefore, all paid plans are non-refundable once checkout is completed, except where a refund is required by applicable law.
            </p>
          </div>
        </section>

        <section className="mt-10 space-y-6">
          {sections.map((section) => (
            <article key={section.id} id={section.id} className="scroll-mt-24 rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
              <h2 className="text-2xl font-bold text-[#C9EB55] md:text-3xl">{section.title}</h2>
              <div className="mt-4 space-y-3">
                {section.body.map((line) => (
                  <p key={line} className="text-sm leading-relaxed text-white/78 md:text-base">
                    {line}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="mt-10 grid gap-4 rounded-3xl border border-[#C9EB55]/20 bg-[#0b0f0a] p-6 md:grid-cols-2 md:p-8">
          <Link
            href="/terms-of-service"
            className="rounded-2xl border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-5 py-4 text-center text-sm font-semibold uppercase tracking-[0.14em] text-[#C9EB55] transition-colors hover:bg-[#C9EB55]/20"
          >
            Open Terms of Service
          </Link>
          <Link
            href="/support"
            className="rounded-2xl border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-5 py-4 text-center text-sm font-semibold uppercase tracking-[0.14em] text-[#C9EB55] transition-colors hover:bg-[#C9EB55]/20"
          >
            Contact Support
          </Link>
        </section>
      </main>
    </div>
  );
}