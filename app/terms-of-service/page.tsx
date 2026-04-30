import Link from "next/link";

const LAST_UPDATED = "April 1, 2026";
const LEGAL_ENTITY = "SUPERNOVA";
const GOVERNING_LAW = "[Insert Governing Law State/Country]";
const EXCLUSIVE_VENUE = "[Insert Exclusive Court Venue]";
const ARBITRATION_PROVIDER = "[Insert Arbitration Provider and Rules]";

type TermsSection = {
  id: string;
  chip: string;
  title: string;
  body: string[];
};

const sections: TermsSection[] = [
  {
    id: "acceptance",
    chip: "Acceptance",
    title: "1. Acceptance of Terms",
    body: [
      `By accessing or using ${LEGAL_ENTITY} services on snovapool.io, you agree to these Terms of Service and all incorporated policies, including Privacy Policy, Refund Policy, and any plan-specific terms displayed at checkout.`,
      "If you do not agree, you must not access or use the platform.",
    ],
  },
  {
    id: "definitions",
    chip: "Definitions",
    title: "2. Definitions",
    body: [
      "Service means the website, dashboard, APIs, subscriptions, support channels, and related features provided by SUPERNOVA.",
      "User means any visitor, account holder, subscriber, agent, or entity using the Service.",
      "Prohibited Conduct means behavior that is unlawful, fraudulent, abusive, deceptive, or harmful to platform integrity, security, or other users.",
    ],
  },
  {
    id: "eligibility",
    chip: "Eligibility",
    title: "3. Eligibility, Registration, and Account Security",
    body: [
      "You must provide accurate and complete registration information and promptly update it when it changes.",
      "You are solely responsible for credential confidentiality, account access, account activity, and any actions taken by authorized users, devices, or integrations under your account.",
      "You must immediately notify us of suspected unauthorized use, account compromise, or security incidents.",
      "We may require identity verification, additional controls, or temporary access restrictions where risk indicators exist.",
    ],
  },
  {
    id: "security-controls",
    chip: "Security",
    title: "4. Security Controls and Platform Protection",
    body: [
      "We may implement authentication controls, two-factor authentication flows, anti-abuse monitoring, and rate limiting to protect users and infrastructure.",
      "You may not circumvent security controls, probe vulnerabilities, abuse recovery flows, or interfere with service availability, monitoring, or incident response.",
      "We may suspend or block requests, traffic sources, or accounts presenting elevated risk to security, compliance, or platform stability.",
    ],
  },
  {
    id: "subscriptions",
    chip: "Billing",
    title: "5. Subscriptions, Billing, Renewals, and Payment Authorization",
    body: [
      "Paid plans may include Silver, Hash Pro, and Titan Elite with pricing, billing intervals, and renewal terms shown at checkout and plan pages at purchase time.",
      "By purchasing a subscription, you authorize us and our payment processors to charge your selected payment method for initial fees, renewals, taxes, and other authorized charges.",
      "You are responsible for maintaining valid payment information, timely payment, and all applicable taxes, duties, and transaction costs unless explicitly stated otherwise.",
      "Non-payment, failed authorization, chargebacks, disputes, suspected fraud, or processor-level risk flags may result in immediate feature limitation, suspension, or termination.",
    ],
  },
  {
    id: "refunds",
    chip: "Refunds",
    title: "6. Refunds, Cancellations, Plan Changes, and Physical Deliverables",
    body: [
      "Users can evaluate the platform through the free Starter plan before upgrading to a paid tier.",
      "Accordingly, all paid plan purchases are final and non-refundable once checkout is completed, except where a refund is required by applicable law.",
      "You may cancel or change plans according to controls made available in your account, and effect dates depend on billing cycle timing and processor settlement status.",
      "Physical deliverables, activated features, fulfilled services, shipping fees, and completed processing actions are non-refundable to the maximum extent permitted by law.",
    ],
  },
  {
    id: "acceptable-use",
    chip: "Acceptable Use",
    title: "7. Acceptable Use and Prohibited Conduct",
    body: [
      "You may not use the platform for unlawful activity, fraud, abuse, unauthorized access attempts, or interference with system integrity.",
      "You may not reverse engineer, scrape at abusive volume, exploit APIs beyond permitted scope, distribute malware, impersonate others, or manipulate service outputs for deceptive purposes.",
      "You may not perform or facilitate sanctions violations, money laundering, financing abuse, or jurisdictionally restricted activity.",
    ],
  },
  {
    id: "api-data",
    chip: "API and Data",
    title: "8. API Use, Data Access, and Automation Restrictions",
    body: [
      "API access is limited to approved and documented use cases and may be rate-limited, monitored, or revoked for abuse, instability risk, or policy violations.",
      "Automated collection, extraction, or replication of platform data beyond explicitly allowed access is prohibited.",
      "We may enforce technical controls, including token revocation, throttling, or IP restrictions, to protect systems and user data.",
    ],
  },
  {
    id: "referrals",
    chip: "Referrals",
    title: "9. Referral Program, Incentives, and Anti-Fraud Enforcement",
    body: [
      "Referral participation is subject to program-specific terms, anti-fraud controls, and verification processes presented within the referral section.",
      "Self-referrals, fake accounts, traffic manipulation, deceptive promotion, or reward gaming may result in disqualification, reward reversal, account suspension, legal action, or all of these remedies.",
    ],
  },
  {
    id: "ip",
    chip: "Intellectual Property",
    title: "10. Intellectual Property, License Grant, and Takedown Rights",
    body: [
      "All platform software, visual assets, content, branding, and underlying materials are owned by SUPERNOVA or its licensors and are protected by applicable laws.",
      "Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service for legitimate business and account purposes.",
      "We reserve the right to remove or disable content, integrations, or accounts alleged to infringe rights or violate law or policy.",
    ],
  },
  {
    id: "user-content",
    chip: "User Content",
    title: "11. User Content, Feedback, and Submission License",
    body: [
      "You represent that you have rights to any content, data, or materials you submit and that such submissions do not violate law or third-party rights.",
      "You grant SUPERNOVA a worldwide, non-exclusive, royalty-free license to host, process, transmit, and use submitted content solely to operate, secure, and improve the Service.",
      "Feedback, suggestions, and feature requests may be used by us without restriction or compensation unless prohibited by applicable law.",
    ],
  },
  {
    id: "disclaimers",
    chip: "Disclaimers",
    title: "12. Service Disclaimers",
    body: [
      "To the maximum extent permitted by law, the Service is provided on an as is and as available basis without warranties of any kind, express or implied.",
      "We disclaim warranties of merchantability, fitness for a particular purpose, non-infringement, uninterrupted availability, and error-free operation.",
      "Operational, financial, commercial, and strategic decisions based on platform data are made at your sole risk.",
    ],
  },
  {
    id: "liability",
    chip: "Liability",
    title: "13. Limitation of Liability",
    body: [
      "To the maximum extent permitted by law, SUPERNOVA and its affiliates are not liable for indirect, incidental, consequential, special, exemplary, or punitive damages, including lost revenue, lost profits, lost data, or business interruption.",
      "If liability cannot be excluded under applicable law, aggregate liability for claims arising out of or related to the Service is limited to the amount you paid to SUPERNOVA for the Service during the twelve months preceding the event giving rise to the claim.",
    ],
  },
  {
    id: "indemnification",
    chip: "Indemnity",
    title: "14. Indemnification",
    body: [
      "You agree to defend, indemnify, and hold harmless SUPERNOVA, its affiliates, officers, employees, contractors, and partners from claims, liabilities, losses, damages, costs, and expenses, including reasonable legal fees, arising from your use of the Service, your submissions, or your breach of these Terms.",
      "We reserve the right to control defense and settlement of indemnified claims, and you agree to cooperate fully in such matters.",
    ],
  },
  {
    id: "dispute-resolution",
    chip: "Dispute Resolution",
    title: "15. Dispute Resolution, Arbitration, and Class Action Waiver",
    body: [
      `Any dispute, claim, or controversy arising from these Terms or the Service will be resolved by binding arbitration administered by ${ARBITRATION_PROVIDER}, except where mandatory law requires otherwise.`,
      "You and SUPERNOVA agree to resolve disputes only on an individual basis and waive any right to participate in class actions, representative actions, or consolidated proceedings.",
      "Nothing in this section prevents either party from seeking injunctive or equitable relief in a competent court for intellectual property misuse, security abuse, or urgent harm prevention.",
    ],
  },
  {
    id: "governing-law",
    chip: "Governing Law",
    title: "16. Governing Law and Jurisdiction",
    body: [
      `These Terms are governed by the laws of ${GOVERNING_LAW}, excluding conflict-of-law rules to the extent permitted by law.`,
      `Where court proceedings are permitted, you agree to exclusive jurisdiction and venue in ${EXCLUSIVE_VENUE}.`,
    ],
  },
  {
    id: "force-majeure",
    chip: "Force Majeure",
    title: "17. Force Majeure",
    body: [
      "SUPERNOVA is not liable for failure or delay caused by events beyond reasonable control, including network outages, infrastructure failures, cyber incidents, government action, sanctions, labor disruptions, natural disasters, or third-party service failures.",
    ],
  },
  {
    id: "termination",
    chip: "Termination",
    title: "18. Suspension, Restriction, and Termination",
    body: [
      "We may suspend, restrict, or terminate access immediately where there is violation of these Terms, elevated risk, legal request, sanctions concern, payment failure, or suspected fraud.",
      "You may stop using the Service at any time, subject to payment, cancellation, and non-refundable fulfillment terms that apply to your plan.",
    ],
  },
  {
    id: "electronic-consent",
    chip: "Electronic Consent",
    title: "19. Electronic Communications and Contract Formation",
    body: [
      "You agree that electronic notices, records, checkboxes, click-through acceptance, and digital confirmations satisfy legal writing and signature requirements where permitted by law.",
      "We may rely on system logs, timestamps, IP addresses, and version history as evidence of acceptance and account actions.",
    ],
  },
  {
    id: "compliance",
    chip: "Compliance",
    title: "20. Compliance, Sanctions, and Regional Restrictions",
    body: [
      "You represent that your use complies with applicable anti-money laundering, sanctions, export, and trade restrictions.",
      "We may refuse service, limit access, or terminate accounts associated with restricted jurisdictions, prohibited entities, or elevated compliance risk.",
    ],
  },
  {
    id: "general",
    chip: "General Terms",
    title: "21. Assignment, Severability, No Waiver, and Survival",
    body: [
      "You may not assign these Terms without our prior written consent. We may assign these Terms in connection with merger, acquisition, restructuring, or asset transfer.",
      "If any provision is held unenforceable, remaining provisions remain in full effect.",
      "Failure to enforce any provision is not a waiver. Provisions that by nature should survive termination, including payment, liability, indemnity, dispute resolution, and intellectual property terms, will survive.",
    ],
  },
  {
    id: "changes",
    chip: "Updates",
    title: "22. Changes to Terms and Service",
    body: [
      "We may update these Terms to reflect service improvements, legal requirements, or policy changes.",
      "Unless stated otherwise, updates are effective when posted. Continued use after effective date constitutes acceptance of revised Terms.",
    ],
  },
  {
    id: "contact",
    chip: "Contact",
    title: "23. Contact Information",
    body: [
      "For legal and support questions related to these Terms, contact us at support@snovapool.io.",
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#0A0A0F] text-white">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1f2e,_#0a0a0f)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(201,235,85,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(201,235,85,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-16 md:px-10 md:py-20">
        <section className="rounded-3xl border border-[#C9EB55]/20 bg-[radial-gradient(circle_at_top,rgba(201,235,85,0.14),rgba(4,6,7,0.92)_45%)] p-8 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9EB55]/85">Legal</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Terms of Service</h1>
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/75 md:text-base">
            These Terms are designed as a strict legal framework for platform use, billing, security, risk allocation, and dispute handling.
            Please review carefully before using the Service.
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/50">Last Updated: {LAST_UPDATED}</p>

          <div className="mt-7 flex flex-wrap gap-3">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80 transition-colors hover:border-[#C9EB55]/35 hover:text-[#C9EB55]"
              >
                {section.chip}
              </a>
            ))}
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
            href="/refund-policy"
            className="rounded-2xl border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-5 py-4 text-center text-sm font-semibold uppercase tracking-[0.14em] text-[#C9EB55] transition-colors hover:bg-[#C9EB55]/20"
          >
            Open Refund Policy
          </Link>
          <Link
            href="/support"
            className="rounded-2xl border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-5 py-4 text-center text-sm font-semibold uppercase tracking-[0.14em] text-[#C9EB55] transition-colors hover:bg-[#C9EB55]/20"
          >
            Contact Support
          </Link>
          <Link
            href="/faq"
            className="rounded-2xl border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-5 py-4 text-center text-sm font-semibold uppercase tracking-[0.14em] text-[#C9EB55] transition-colors hover:bg-[#C9EB55]/20"
          >
            Open FAQ
          </Link>
        </section>
      </main>
    </div>
  );
}
