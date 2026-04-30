"use client";

import Link from "next/link";

export function PageShell({ title, subtitle, children, backHref = "/dashboard" }: { title: string; subtitle: string; children: React.ReactNode; backHref?: string | null }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(201,235,85,0.08),transparent_42%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_8%,rgba(201,235,85,0.05),transparent_36%)]" />
      </div>
      <main className="mx-auto w-full max-w-7xl px-5 py-8 md:px-10 md:py-10 space-y-6">
        <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#C9EB55]/80">Dashboard v2</p>
              <h1 className="text-3xl font-black">{title}</h1>
              <p className="text-sm text-white/65">{subtitle}</p>
            </div>
            {backHref ? (
              <Link href={backHref} className="rounded-full border border-white/20 bg-white/[0.05] px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/80">
                Back
              </Link>
            ) : null}
          </div>
        </section>
        {children}
      </main>
    </div>
  );
}

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#C9EB55]/20 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-white/60">{label}</p>
      <p className="mt-2 text-2xl font-black text-[#C9EB55]">{value}</p>
    </div>
  );
}
