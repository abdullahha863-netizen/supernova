import Link from "next/link";

export default function NavbarSimple() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#C9EB55]/18 bg-black/90 backdrop-blur-sm">
      <nav className="mx-auto grid max-w-[1200px] grid-cols-[1fr_auto] items-center gap-4 px-4 py-5">
        <div>
          <Link href="/" className="inline-flex items-center gap-3 no-underline group">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#c9eb55]/25 bg-gradient-to-br from-[#c9eb55]/25 via-[#c9eb55]/10 to-transparent shadow-[0_0_22px_rgba(201,235,85,0.35)] transition duration-500 group-hover:scale-[1.05] group-hover:shadow-[0_0_32px_rgba(201,235,85,0.55)]">
              <div className="absolute inset-0 rounded-full bg-[#c9eb55]/12 blur-[12px] opacity-80 transition group-hover:opacity-100" />
              <svg
                className="h-7 w-7 text-[#c9eb55] transition duration-500 group-hover:scale-110 group-hover:rotate-[120deg]"
                viewBox="0 0 120 120"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="nova-simple" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#E8FF7A" />
                    <stop offset="100%" stopColor="#C6E65A" />
                  </linearGradient>
                </defs>

                <path d="M60 6c18 10 30 28 24 44-10-10-26-18-40-18 2-12 6-20 16-26z" fill="url(#nova-simple)" />
                <path d="M114 60c-10 18-28 30-44 24 10-10 18-26 18-40 12 2 20 6 26 16z" fill="url(#nova-simple)" />
                <path d="M60 114c-18-10-30-28-24-44 10 10 26 18 40 18-2 12-6 20-16 26z" fill="url(#nova-simple)" />
                <path d="M6 60c10-18 28-30 44-24-10 10-18 26-18 40-12-2-20-6-26-16z" fill="url(#nova-simple)" />
              </svg>
              <span className="absolute inset-0 rounded-full bg-[#c9eb55] opacity-15 animate-ping" />
            </div>

            <span className="text-[22px] font-bold tracking-[1px] text-[#C6E65A] drop-shadow-[0_0_12px_rgba(198,230,90,0.55)]">
              SUPERNOVA
            </span>
          </Link>
        </div>

        <div className="justify-self-end">
          <Link
            href="/"
            className="rounded-full border border-[#C6E65A]/60 px-5 py-2.5 text-[13px] font-semibold uppercase tracking-[0.16em] text-[#C6E65A] transition-all duration-300 hover:-translate-y-[2px] hover:bg-[#C6E65A]/10 hover:shadow-[0_0_18px_rgba(198,230,90,0.45)]"
          >
            Back to Home
          </Link>
        </div>
      </nav>
    </header>
  );
}
