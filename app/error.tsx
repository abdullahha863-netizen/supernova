"use client";

import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  console.error(error);

  return (
    <div className="relative min-h-[calc(100vh-8rem)] overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(201,235,85,0.10),transparent_34%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_8%,rgba(201,235,85,0.05),transparent_36%)]" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl items-center justify-center px-6 py-16">
        <section className="w-full rounded-[32px] border border-[#C9EB55]/20 bg-white/[0.035] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl md:p-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#C9EB55]/80">Application Error</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl">Something went wrong</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/68 md:text-base">
            An unexpected runtime error interrupted this screen. You can try the action again or return to the main
            site entry point.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center rounded-full border border-[#C9EB55]/45 bg-[#C9EB55] px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-black transition-all hover:-translate-y-0.5"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white/82 transition-colors hover:bg-white/[0.08]"
            >
              Back to Home
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
