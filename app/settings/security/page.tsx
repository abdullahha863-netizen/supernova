"use client";

import Link from "next/link";
import SecurityPanel from "@/components/security/SecurityPanel";

export default function SecuritySettingsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto w-full max-w-5xl px-5 py-8 md:px-10 md:py-10 space-y-7">
        <section className="rounded-3xl border border-[#C9EB55]/18 bg-white/[0.03] p-6 md:p-8">
          <div className="space-y-2">
            <Link href="/dashboard" className="text-xs uppercase tracking-[0.2em] text-white/60 hover:text-white">
              Back to Dashboard
            </Link>
            <h1 className="text-3xl md:text-4xl font-black">Security Settings</h1>
            <p className="text-white/70 text-sm md:text-base">Manage PIN reset, recovery, and emergency lock controls.</p>
          </div>
        </section>

        <SecurityPanel />
      </main>
    </div>
  );
}

