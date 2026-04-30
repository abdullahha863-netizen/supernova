import Link from "next/link";
import NavbarAuth from "./NavbarAuth";

type NavbarProps = {
  forceGuest?: boolean;
};

export default function Navbar({ forceGuest = false }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-sm border-b border-[#C9EB55]/18">
      <nav className="max-w-[1200px] mx-auto px-4 py-5 grid grid-cols-[1fr_auto_1fr] items-center">

        {/* LEFT LOGO */}
        <div>
          <Link href="/" className="inline-flex items-center gap-3 no-underline group">
            <div className="relative w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-[#c9eb55]/25 via-[#c9eb55]/10 to-transparent border border-[#c9eb55]/25 shadow-[0_0_22px_rgba(201,235,85,0.35)] transition duration-500 group-hover:shadow-[0_0_32px_rgba(201,235,85,0.55)] group-hover:scale-[1.05]">
              <div className="absolute inset-0 rounded-full bg-[#c9eb55]/12 blur-[12px] opacity-80 group-hover:opacity-100 transition" />

              {/* OLD LOGO + ROTATION FIX */}
              <svg
                className="w-7 h-7 text-[#c9eb55] transition duration-500 group-hover:scale-110 group-hover:rotate-[120deg]"
                viewBox="0 0 120 120"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="nova" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#E8FF7A" />
                    <stop offset="100%" stopColor="#C6E65A" />
                  </linearGradient>
                </defs>

                <path d="M60 6c18 10 30 28 24 44-10-10-26-18-40-18 2-12 6-20 16-26z" fill="url(#nova)" />
                <path d="M114 60c-10 18-28 30-44 24 10-10 18-26 18-40 12 2 20 6 26 16z" fill="url(#nova)" />
                <path d="M60 114c-18-10-30-28-24-44 10 10 26 18 40 18-2 12-6 20-16 26z" fill="url(#nova)" />
                <path d="M6 60c10-18 28-30 44-24-10 10-18 26-18 40-12-2-20-6-26-16z" fill="url(#nova)" />
              </svg>

              <span className="absolute inset-0 rounded-full animate-ping opacity-15 bg-[#c9eb55]" />
            </div>

            <span className="font-bold text-[22px] tracking-[1px] text-[#C6E65A] drop-shadow-[0_0_12px_rgba(198,230,90,0.55)]">
              SUPERNOVA
            </span>
          </Link>
        </div>

        <NavbarAuth forceGuest={forceGuest} />
      </nav>
    </header>
  );
}
