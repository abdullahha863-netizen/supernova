import Link from "next/link";

type FAQItem = {
  question: string;
  answer: string;
};

type FAQSection = {
  id: string;
  title: string;
  items: FAQItem[];
};

const sections: FAQSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    items: [
      {
        question: "What is SUPERNOVA?",
        answer:
          "SUPERNOVA is the snovapool.io platform for account-based mining operations, subscription upgrades, security controls, and support workflows in one place.",
      },
      {
        question: "How do I start?",
        answer:
          "Create an account from the Register page, verify your email, sign in, and then manage everything from your dashboard.",
      },
      {
        question: "Do I need a paid plan to begin?",
        answer:
          "No. You can start with the free Starter path and upgrade later whenever you need stronger support windows and higher-tier features.",
      },
    ],
  },
  {
    id: "plans-pricing",
    title: "Plans and Pricing",
    items: [
      {
        question: "What paid plans are available?",
        answer:
          "Current paid plans are Silver, Hash Pro, and Titan Elite. Each tier improves support priority, visibility, and premium benefits.",
      },
      {
        question: "What are the current first-payment prices?",
        answer:
          "Silver: $112.99, Hash Pro: $134.99, Titan Elite: $182.99.",
      },
      {
        question: "How do renewals work?",
        answer:
          "Silver renews at $14.99 every 3 months, Hash Pro renews at $34.99 every 3 months, and Titan Elite renews at $79.99 after the first year.",
      },
      {
        question: "Can I change or upgrade my plan later?",
        answer:
          "Yes. You can move between plans when needed based on your operational and support requirements.",
      },
    ],
  },
  {
    id: "security-account",
    title: "Security and Account Access",
    items: [
      {
        question: "Does the platform support 2FA?",
        answer:
          "Yes. You can enable and manage two-factor authentication from your settings security pages.",
      },
      {
        question: "What if I lose access to 2FA?",
        answer:
          "Use the available security recovery/reset flows through account settings or support routes, including admin-assisted reset when applicable.",
      },
      {
        question: "I forgot my password. What should I do?",
        answer:
          "Use the Forgot Password flow to request a reset link, then set a new password securely.",
      },
      {
        question: "Do I need to verify my email?",
        answer:
          "Yes. Email verification is part of account security and helps protect sign-in and recovery operations.",
      },
    ],
  },
  {
    id: "referrals",
    title: "Referral Program",
    items: [
      {
        question: "Do users get a referral link?",
        answer:
          "Yes. Every account has a unique referral code, and your referral link is shown in Dashboard Settings under the referral section.",
      },
      {
        question: "Where can I find my referral code?",
        answer:
          "Open Dashboard Settings and go to the referral section to copy your personal link.",
      },
      {
        question: "Are there referral rules?",
        answer:
          "Yes. Anti-fraud and legal terms are displayed in the referral section and should be followed for valid participation.",
      },
    ],
  },
  {
    id: "support",
    title: "Support and Response Time",
    items: [
      {
        question: "How can I contact support?",
        answer:
          "You can use the Support Center, submit a standard ticket, or request priority support depending on urgency and membership level.",
      },
      {
        question: "What is the standard support response window?",
        answer:
          "Standard ticket responses are typically within 24-48 hours.",
      },
      {
        question: "What are plan-based support windows?",
        answer:
          "Typical windows are Silver: 10-24 hours, Hash Pro: 6-12 hours, Titan Elite: 1-6 hours.",
      },
      {
        question: "What is the support email?",
        answer: "The secure support channel is support@snovapool.io.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#0A0A0F] text-white">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1f2e,_#0a0a0f)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(201,235,85,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(201,235,85,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-20">
        <section className="rounded-3xl border border-[#C9EB55]/20 bg-[radial-gradient(circle_at_top,rgba(201,235,85,0.12),rgba(4,6,7,0.9)_45%)] p-8 md:p-12">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-[#C9EB55]/85">Help Center</p>
          <h1 className="text-4xl font-black tracking-tight md:text-6xl">SUPERNOVA FAQ</h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/75 md:text-lg">
            Everything important about the platform in one place: account access, plans, billing, security,
            referral links, and support routes.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 transition-colors hover:border-[#C9EB55]/40 hover:text-[#C9EB55]"
              >
                {section.title}
              </a>
            ))}
          </div>
        </section>

        <section className="mt-10 space-y-8">
          {sections.map((section) => (
            <article key={section.id} id={section.id} className="scroll-mt-24 rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
              <h2 className="mb-5 text-2xl font-bold text-[#C9EB55] md:text-3xl">{section.title}</h2>
              <div className="space-y-3">
                {section.items.map((item) => (
                  <details key={item.question} className="group rounded-2xl border border-white/10 bg-black/30 px-5 py-4 open:border-[#C9EB55]/40">
                    <summary className="cursor-pointer list-none pr-8 text-base font-semibold text-white marker:content-none">
                      <span className="inline-flex items-start gap-3">
                        <span className="mt-1 h-2 w-2 rounded-full bg-[#C9EB55]" />
                        <span>{item.question}</span>
                      </span>
                    </summary>
                    <p className="pt-3 pl-5 text-sm leading-relaxed text-white/75 md:text-base">{item.answer}</p>
                  </details>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="mt-10 grid gap-4 rounded-3xl border border-[#C9EB55]/20 bg-[#0b0f0a] p-6 md:grid-cols-3 md:gap-6 md:p-8">
          <Link
            href="/support"
            className="rounded-2xl border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-5 py-4 text-center text-sm font-semibold uppercase tracking-[0.14em] text-[#C9EB55] transition-colors hover:bg-[#C9EB55]/20"
          >
            Open Support Center
          </Link>
          <Link
            href="/#upgrade-cards"
            className="rounded-2xl border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-5 py-4 text-center text-sm font-semibold uppercase tracking-[0.14em] text-[#C9EB55] transition-colors hover:bg-[#C9EB55]/20"
          >
            View Plans
          </Link>
          <Link
            href="/register"
            className="rounded-2xl border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-5 py-4 text-center text-sm font-semibold uppercase tracking-[0.14em] text-[#C9EB55] transition-colors hover:bg-[#C9EB55]/20"
          >
            Create Account
          </Link>
        </section>
      </main>
    </div>
  );
}
