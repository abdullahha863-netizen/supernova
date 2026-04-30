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
      "This Privacy Policy explains how SUPERNOVA collects, uses, stores, and protects information across the platform.",
      "By using the service, you acknowledge the processing practices described in this policy, subject to applicable law.",
    ],
  },
  {
    id: "data-we-collect",
    title: "2. Data We Collect",
    body: [
      "We may collect account information such as name, email address, authentication data, support submissions, referral-related records, and other details required to operate the platform.",
      "Technical information such as IP address, request metadata, device details, and security logs may also be processed to maintain service integrity and prevent abuse.",
    ],
  },
  {
    id: "how-we-use-data",
    title: "3. How We Use Data",
    body: [
      "We use personal data to provide account access, process subscriptions, manage support workflows, operate referral systems, secure the platform, and comply with legal obligations.",
      "We may also use limited technical and operational data to diagnose issues, enforce policies, and improve platform reliability.",
    ],
  },
  {
    id: "sharing",
    title: "4. Sharing and Processors",
    body: [
      "We may share necessary data with infrastructure providers, payment processors, email providers, and service partners strictly to operate the platform and fulfill legitimate business purposes.",
      "We do not describe optional advertising or marketing data-sharing flows in the current platform implementation.",
    ],
  },
  {
    id: "security",
    title: "5. Security and Retention",
    body: [
      "We apply reasonable technical and organizational measures to protect account and platform data, including authentication controls, session handling, rate limiting, and security monitoring.",
      "Data retention periods depend on operational need, security requirements, legal obligations, and legitimate business purposes.",
    ],
  },
  {
    id: "rights",
    title: "6. Your Rights",
    body: [
      "Depending on your jurisdiction, you may have rights related to access, correction, deletion, restriction, objection, or portability of personal data.",
      "To make a privacy-related request, contact support@snovapool.io with enough detail for verification and review.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#0A0A0F] text-white">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1f2e,_#0a0a0f)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(201,235,85,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(201,235,85,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-16 md:px-10 md:py-20">
        <section className="rounded-3xl border border-[#C9EB55]/20 bg-[radial-gradient(circle_at_top,rgba(201,235,85,0.14),rgba(4,6,7,0.92)_45%)] p-8 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9EB55]/85">Legal</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Privacy Policy</h1>
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/75 md:text-base">
            This policy explains how personal and technical information may be collected and used across the platform for account access, security, support, and operational delivery.
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