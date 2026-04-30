import Link from "next/link";

type CheckoutCancelPageProps = {
  searchParams?: Promise<{
    tier?: string;
  }>;
};

export default async function CheckoutCancelPage({ searchParams }: CheckoutCancelPageProps) {
  const resolvedSearchParams = (await Promise.resolve(searchParams)) || {};
  const tier = resolvedSearchParams.tier || "silver";

  return (
    <div className="min-h-screen overflow-hidden bg-[#0A0A0F] text-white">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1f2e,_#0a0a0f)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(201,235,85,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(201,235,85,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-16 md:px-10 md:py-20">
        <section className="rounded-3xl border border-[#C9EB55]/20 bg-[radial-gradient(circle_at_top,rgba(201,235,85,0.12),rgba(4,6,7,0.92)_45%)] p-8 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9EB55]/85">Checkout</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Payment Cancelled</h1>
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/75 md:text-base">
            No charge has been confirmed from this screen. You can return to checkout whenever you are ready to continue.
          </p>
        </section>

        <section className="mt-10 grid gap-4 rounded-3xl border border-[#C9EB55]/20 bg-[#0b0f0a] p-6 md:grid-cols-2 md:p-8">
          <Link
            href={`/checkout?tier=${encodeURIComponent(tier)}`}
            className="rounded-2xl border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-5 py-4 text-center text-sm font-semibold uppercase tracking-[0.14em] text-[#C9EB55] transition-colors hover:bg-[#C9EB55]/20"
          >
            Return To Checkout
          </Link>
          <Link
            href={`/pricing/${encodeURIComponent(tier)}`}
            className="rounded-2xl border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-5 py-4 text-center text-sm font-semibold uppercase tracking-[0.14em] text-[#C9EB55] transition-colors hover:bg-[#C9EB55]/20"
          >
            Back To Plan
          </Link>
        </section>
      </main>
    </div>
  );
}