import Link from "next/link";

const platformLinks = [
  { href: "/why-supernova", label: "Why Supernova" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/security-overview", label: "Security Overview" },
];

const resourceLinks = [
  { href: "/faq", label: "FAQ" },
  { href: "/support", label: "Support" },
];

const legalLinks = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-service", label: "Terms of Service" },
  { href: "/cookies-policy", label: "Cookies Policy" },
  { href: "/refund-policy", label: "Refund Policy" },
];

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit max-w-fit flex-none self-start leading-none text-sm text-white/62 transition-colors hover:text-[#C9EB55]"
    >
      {label}
    </Link>
  );
}

export default function Footer() {
  return (
    <footer className="w-full border-t border-[#C9EB55]/18 bg-[#030604]/95 text-white shadow-[0_-20px_80px_rgba(201,235,85,0.04)] backdrop-blur-sm">
      <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-5 py-11 sm:px-6 sm:py-12 md:grid-cols-[minmax(0,0.95fr)_minmax(0,2.05fr)] md:gap-12 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,2.1fr)] lg:gap-10 lg:px-8 lg:py-14">
        <div className="max-w-md">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-[#C9EB55]/25 bg-[#C9EB55]/10 text-sm font-black text-[#D7F36C]">
              SN
            </span>
            <span className="text-sm font-black uppercase tracking-[0.24em] text-white sm:text-base">
              Supernova
            </span>
          </Link>
          <p className="mt-4 max-w-[34rem] text-sm leading-6 text-white/58">
            Crypto mining dashboard, payout settings, and account-security controls in one dark workspace.
          </p>
          <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full border border-[#C9EB55]/18 bg-white/[0.03] px-3 py-1.5 text-xs text-white/58">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C9EB55]" />
            Security overview and policy pages available
          </div>
        </div>

        <div className="grid w-full gap-y-9 gap-x-8 border-t border-white/8 pt-9 sm:grid-cols-3 sm:border-t-0 sm:pt-0 md:grid-cols-3 md:justify-items-stretch lg:gap-x-14 xl:gap-x-16">
          <div className="min-w-0">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[#C9EB55]">Platform</h2>
            <div className="mt-4 inline-flex w-fit max-w-fit flex-col items-start gap-3">
              {platformLinks.map((link) => (
                <FooterLink key={link.href} href={link.href} label={link.label} />
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[#C9EB55]">Resources</h2>
            <div className="mt-4 inline-flex w-fit max-w-fit flex-col items-start gap-3">
              {resourceLinks.map((link) => (
                <FooterLink key={link.href} href={link.href} label={link.label} />
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[#C9EB55]">Legal</h2>
            <div className="mt-4 inline-flex w-fit max-w-fit flex-col items-start gap-3">
              {legalLinks.map((link) => (
                <FooterLink key={link.href} href={link.href} label={link.label} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/8">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 px-5 py-5 text-center text-xs text-white/42 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-left lg:px-8">
          <p>&copy; {new Date().getFullYear()} Supernova. All rights reserved.</p>
          <p className="font-mono uppercase tracking-[0.16em]">Encrypted access &middot; Account controls</p>
        </div>
      </div>
    </footer>
  );
}
