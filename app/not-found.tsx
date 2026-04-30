import Link from "next/link";
import { cookies } from "next/headers";

export default async function NotFoundPage() {
  const cookieStore = await cookies();
  const isLoggedIn = Boolean(cookieStore.get("sn_auth")?.value || cookieStore.get("sn_admin")?.value);
  const href = isLoggedIn ? "/dashboard" : "/";
  const label = isLoggedIn ? "Back to Dashboard" : "Back to Home";

  return (
    <div className="relative min-h-[calc(100vh-8rem)] overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(201,235,85,0.10),transparent_36%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(201,235,85,0.06),transparent_34%)]" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl items-center justify-center px-6 py-16">
        <section className="w-full rounded-[32px] border border-[#C9EB55]/20 bg-white/[0.035] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl md:p-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#C9EB55]/80">Error 404</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl">Page Not Found</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/68 md:text-base">
            The page you requested does not exist or may have been moved. Use the link below to get back to a known
            safe place.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href={href}
              className="inline-flex items-center justify-center rounded-full border border-[#C9EB55]/40 bg-[#C9EB55]/12 px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#C9EB55] transition-colors hover:bg-[#C9EB55]/20"
            >
              {label}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
