"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

function createParticles(count: number, durationMin: number, durationMax: number, delayMax: number) {
  return Array.from({ length: count }, () => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    duration: Math.random() * (durationMax - durationMin) + durationMin,
    delay: Math.random() * delayMax,
  }));
}

export default function SupportPage() {
  const [isClient, setIsClient] = useState(false);
  const dots = useMemo(() => createParticles(200, 5, 13, 8), []);
  const stars = useMemo(() => createParticles(150, 2, 5, 5), []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1f2e,_#0a0a0f)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(201,235,85,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(201,235,85,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

        {isClient && (
          <>
            {dots.map((dot, i) => (
              <motion.div
                key={i}
                className="absolute w-[2px] h-[2px] bg-[#C9EB55]/40 rounded-full"
                style={{
                  left: dot.left,
                  top: dot.top,
                }}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0, 0.8, 0],
                }}
                transition={{
                  duration: dot.duration,
                  repeat: Infinity,
                  delay: dot.delay,
                  ease: "easeInOut",
                }}
              />
            ))}

            {stars.map((star, i) => (
              <motion.div
                key={`star-${i}`}
                className="absolute w-[1px] h-[1px] bg-white rounded-full"
                style={{
                  left: star.left,
                  top: star.top,
                }}
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: star.duration,
                  repeat: Infinity,
                  delay: star.delay,
                  ease: "easeInOut",
                }}
              />
            ))}
          </>
        )}
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-6 md:px-10 py-20 md:py-24 space-y-14">
        <section className="text-center space-y-5">
          <div className="relative inline-block">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-5xl md:text-6xl font-bold neon-headline text-[#C9EB55]"
            >
              Support Center
            </motion.h1>
            <div className="pointer-events-none absolute inset-x-0 -bottom-6 h-20 bg-[#C9EB55]/20 blur-[60px]" aria-hidden />
          </div>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto"
          >
            Get help with your SUPERNOVA account through a support path that matches the urgency and level of assistance you need.
          </motion.p>
        </section>

        <section className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="nova-glow rounded-2xl p-7 h-full relative overflow-hidden flex flex-col"
          >
            <div className="flex h-full flex-col">
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="inline-flex items-center rounded-full border border-[#C9EB55]/20 bg-[#C9EB55]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9EB55]/80">
                    Standard Route
                  </div>
                  <h2 className="text-3xl font-bold text-[#C9EB55]">Standard Ticket</h2>
                  <p className="text-white/60">
                    For general questions, account help, and routine technical issues with a standard response window.
                  </p>
                </div>
                <ul className="space-y-3 text-white/70">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#C9EB55] mt-1 shrink-0" />
                    <span>General questions and account support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#C9EB55] mt-1 shrink-0" />
                    <span>Billing and account management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#C9EB55] mt-1 shrink-0" />
                    <span>Standard technical guidance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#C9EB55] mt-1 shrink-0" />
                    <span>Typical response within 24–48 hours</span>
                  </li>
                </ul>
              </div>
              <div className="mt-auto flex min-h-20 flex-col gap-3 pt-6">
                <Link
                  href="/support/ticket"
                  className="block w-full text-center px-6 py-3 bg-[#C9EB55]/10 border border-[#C9EB55]/30 text-[#C9EB55] rounded-full font-semibold hover:bg-[#C9EB55]/20 transition-all duration-300"
                >
                  Submit Ticket
                </Link>
                <p className="invisible text-center text-xs text-white/50" aria-hidden="true">
                  Available for Silver, Hash Pro, and Titan members
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="nova-glow rounded-2xl p-7 h-full relative overflow-hidden flex flex-col"
          >
            <div className="absolute top-4 right-4 px-3 py-1 bg-[#C9EB55]/20 border border-[#C9EB55]/40 rounded-full text-xs font-bold text-[#C9EB55]">
              PRIORITY
            </div>
            <div className="flex h-full flex-col">
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="inline-flex items-center rounded-full border border-[#C9EB55]/20 bg-[#C9EB55]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9EB55]/80">
                    Upgraded Members
                  </div>
                  <h2 className="text-3xl font-bold text-[#C9EB55]">Membership Priority Support</h2>
                  <p className="text-white/60">
                    A faster support path for urgent issues, elevated member needs, and requests that require quicker attention.
                  </p>
                </div>
                <ul className="space-y-3 text-white/70">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#C9EB55] mt-1 shrink-0" />
                    <span>Urgent account or operational issues</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#C9EB55] mt-1 shrink-0" />
                    <span>Priority routing and direct contact options</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#C9EB55] mt-1 shrink-0" />
                    <span className="space-y-1">
                      <span className="block">Response time depends on your membership tier:</span>
                      <span className="block">Silver: 10–24 hours</span>
                      <span className="block">Hash Pro: 6–12 hours</span>
                      <span className="block">Titan Elite: 1–5 hours</span>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#C9EB55] mt-1 shrink-0" />
                    <span>Best suited for upgraded and VIP members</span>
                  </li>
                </ul>
              </div>
              <div className="mt-auto flex min-h-20 flex-col gap-3 pt-6">
                <Link
                  href="/support/priority"
                  className="block w-full text-center px-6 py-3 bg-[#C9EB55] text-black rounded-full font-semibold hover:shadow-[0_0_24px_rgba(201,235,85,0.5)] transition-all duration-300"
                >
                  Request Priority Support
                </Link>
                <p className="text-center text-xs text-white/50">Available for Silver, Hash Pro, and Titan members</p>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
