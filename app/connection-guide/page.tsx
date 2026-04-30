import Link from "next/link";

const poolStratumHost = process.env.NEXT_PUBLIC_POOL_STRATUM_HOST || "snovapool.io";
const poolStratumPort = process.env.NEXT_PUBLIC_POOL_STRATUM_PORT || "3333";
const poolRestHost = process.env.NEXT_PUBLIC_POOL_REST_HOST || "snovapool.io";
const poolRestPort = process.env.NEXT_PUBLIC_POOL_REST_PORT || "443";
const poolName = process.env.NEXT_PUBLIC_POOL_NAME || "SUPERNOVA";

export default function ConnectionGuidePage() {
  const connectionFormat = "kaspa_address.worker_name";
  const stratumEndpoint = `${poolStratumHost}:${poolStratumPort}`;
  const restEndpoint = `${poolRestHost}:${poolRestPort}`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0A0A0F] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_16%,rgba(201,235,85,0.10),transparent_34%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(201,235,85,0.06),transparent_32%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(201,235,85,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(201,235,85,0.02)_1px,transparent_1px)] bg-[size:56px_56px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 py-12 md:px-10 md:py-16">
        <section className="rounded-[32px] border border-[#C9EB55]/18 bg-white/[0.035] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl md:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#C9EB55]/80">Pool Setup</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl">How to Connect Your Miner</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/68 md:text-base">
            Use the pool details below to point your miner at {poolName} and start sending shares with the correct
            worker format.
          </p>
        </section>

        <div className="mt-8 grid gap-6">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <h2 className="text-2xl font-bold text-[#C9EB55]">Pool Endpoints</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Stratum</p>
                <p className="mt-3 font-mono text-lg text-white">{stratumEndpoint}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">REST</p>
                <p className="mt-3 font-mono text-lg text-white">{restEndpoint}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <h2 className="text-2xl font-bold text-[#C9EB55]">Connection Format</h2>
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Wallet.Worker</p>
              <p className="mt-3 font-mono text-lg text-white">{connectionFormat}</p>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <h2 className="text-2xl font-bold text-[#C9EB55]">Example Commands</h2>
            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">NBMiner</p>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-sm leading-6 text-white/85">
{`nbminer -a kaspa -o stratum+tcp://${stratumEndpoint} -u ${connectionFormat}`}
                </pre>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">CGMiner</p>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-sm leading-6 text-white/85">
{`cgminer --url stratum+tcp://${stratumEndpoint} --userpass ${connectionFormat}:x`}
                </pre>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <h2 className="text-2xl font-bold text-[#C9EB55]">Next Steps</h2>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full border border-[#C9EB55]/40 bg-[#C9EB55]/12 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#C9EB55] transition-colors hover:bg-[#C9EB55]/20"
              >
                Register
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white/82 transition-colors hover:bg-white/[0.08]"
              >
                Dashboard
              </Link>
              <Link
                href="/support"
                className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white/82 transition-colors hover:bg-white/[0.08]"
              >
                Support
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
