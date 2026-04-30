import Link from "next/link";

const LAST_UPDATED = "April 5, 2026";

type PolicySection = {
  id: string;
  title: string;
  body: string[];
};

const sections: PolicySection[] = [
  {
    id: "types",
    title: "1. Cookie Types We Use",
    body: [
      "Authentication cookies are used to keep signed-in users authenticated across requests and page loads.",
      "Security-related cookies may be used where needed to support session protection and account access flows.",
      "SUPERNOVA does not currently enable optional analytics or marketing cookies on the live platform.",
    ],
  },
  {
    id: "why",
    title: "2. Why We Use Cookies",
    body: [
      "We use essential cookies to support login sessions, secure account access, and other core platform functions.",
      "If optional analytics or marketing cookies are added later, they will be introduced behind an explicit consent flow.",
    ],
  },
  {
    id: "preferences",
    title: "3. User Preferences Storage",
    body: [
      "Non-sensitive preferences such as theme, language, and UI filters should be stored in localStorage.",
      "Cookies should only be used for preference values when the server needs to read that value during the request lifecycle.",
    ],
  },
  {
    id: "disable",
    title: "4. Disabling Non-Essential Cookies",
    body: [
      "There are currently no active non-essential cookies to disable.",
      "If optional analytics or marketing cookies are introduced later, users will be able to refuse them through the cookie banner or their browser controls.",
    ],
  },
  {
    id: "browser-controls",
    title: "5. Browser Controls",
    body: [
      "Most browsers allow you to block or delete cookies through browser settings.",
      "Blocking essential authentication cookies may prevent login, secure session continuity, or other core features from working correctly.",
    ],
  },
];

export default function CookiesPolicyPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#0A0A0F] text-white">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1f2e,_#0a0a0f)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(201,235,85,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(201,235,85,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-16 md:px-10 md:py-20">
        <section className="rounded-3xl border border-[#C9EB55]/20 bg-[radial-gradient(circle_at_top,rgba(201,235,85,0.14),rgba(4,6,7,0.92)_45%)] p-8 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9EB55]/85">Legal</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Cookies Policy</h1>
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/75 md:text-base">
            This page explains which cookies are used by the platform, why they are used, and how non-essential cookies would be handled if they are introduced later.
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/50">Last Updated: {LAST_UPDATED}</p>
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