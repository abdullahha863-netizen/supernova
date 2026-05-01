"use client";

import { motion } from "framer-motion";
import { Check, Clock, Gauge, Percent, Shield, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

function createParticles(count: number, durationMin: number, durationMax: number, delayMax: number) {
  return Array.from({ length: count }, () => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    duration: Math.random() * (durationMax - durationMin) + durationMin,
    delay: Math.random() * delayMax,
  }));
}

export default function StarterTierPage() {
  const isClient = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
  const dots = useMemo(() => (isClient ? createParticles(200, 5, 13, 8) : []), [isClient]);
  const stars = useMemo(() => (isClient ? createParticles(150, 2, 5, 5) : []), [isClient]);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white selection:bg-[#C9EB55] selection:text-black font-sans overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1f2e,_#0a0a0f)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(201,235,85,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(201,235,85,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
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

        <motion.div 
          className="absolute top-1/4 -left-48 w-96 h-96 bg-[#C9EB55]/20 rounded-full blur-[128px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-1/4 -right-48 w-96 h-96 bg-[#C9EB55]/20 rounded-full blur-[128px]"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{ duration: 8, repeat: Infinity, delay: 2 }}
        />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-8 py-12 min-h-screen">
        <motion.div 
          className="fixed top-8 right-8 z-50"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Link 
            href="/dashboard" 
            className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:border-[#C9EB55]/30 transition-colors"
          >
            <X className="w-4 h-4 text-white group-hover:text-[#C9EB55]" />
            <span className="text-sm text-white group-hover:text-[#C9EB55]">Close</span>
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start pt-20">
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="relative w-fit text-6xl lg:text-7xl font-black leading-[0.9]">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-[#C9EB55]/25 blur-[100px] -z-10 pointer-events-none" />
              <span className="text-[#C9EB55]">GET</span>
              <br />
              <span className="text-[#C9EB55]">STARTED</span>
            </h1>

            <p className="text-xl text-white leading-relaxed max-w-xl">
              Your first step into the <span className="text-[#C9EB55] font-semibold">SUPERNOVA ecosystem</span> with essential 
              monitoring and core tools for new miners.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <motion.div
                className="group p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#C9EB55]/30 transition-all"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="w-4 h-4 text-[#C9EB55]" />
                  <span className="text-xs font-medium text-white/80">Basic Monitoring</span>
                </div>
                <div className="text-lg font-bold text-[#C9EB55] mb-1">Essential</div>
                <p className="text-xs text-white leading-relaxed">Essential visibility for your miner with simple dashboard access.</p>
              </motion.div>

              <motion.div
                className="group p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#C9EB55]/30 transition-all"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-[#C9EB55]" />
                  <span className="text-xs font-medium text-white/80">Protection</span>
                </div>
                <div className="text-lg font-bold text-[#C9EB55] mb-1">Not included</div>
                <p className="text-xs text-white leading-relaxed">Protection not included. Emergency Lock: Not included.</p>
              </motion.div>

              <motion.div
                className="group p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#C9EB55]/30 transition-all"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-[#C9EB55]" />
                  <span className="text-xs font-medium text-white/80">Community Support</span>
                </div>
                <div className="text-lg font-bold text-[#C9EB55] mb-1">Public Help</div>
                <p className="text-xs text-white leading-relaxed">Access to public help channels and community forums.</p>
              </motion.div>

              <motion.div
                className="group p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#C9EB55]/30 transition-all"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="w-4 h-4 text-[#C9EB55]" />
                  <span className="text-xs font-medium text-white/80">Better Fees</span>
                </div>
                <div className="text-lg font-bold text-[#C9EB55] mb-1">4.0% Pool</div>
                <p className="text-xs text-white leading-relaxed">Competitive pool fee with simple payout tracking.</p>
              </motion.div>
            </div>

            <motion.div 
              className="pt-6 space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <h3 className="text-sm font-medium text-[#C9EB55] tracking-wider">WHAT&apos;S INCLUDED</h3>
              <div className="space-y-3">
                {[
                  "Basic monitoring dashboard",
                  "Community support access",
                  "Payout tracking",
                  "Pool fee: 4.0%",
                  "Essential performance tools",
                  "Referral rewards program",
                  "Device support (limited)"
                ].map((item, i) => (
                  <motion.div 
                    key={i} 
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + i * 0.1 }}
                  >
                    <div className="relative">
                      <Check className="w-5 h-5 text-[#C9EB55] shrink-0" />
                      <motion.div 
                        className="absolute inset-0 bg-[#C9EB55] rounded-full blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.3 }}
                        transition={{ delay: 0.8 + i * 0.1 }}
                      />
                    </div>
                    <span className="text-white">{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div 
              className="pt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              <Link
                href="/register"
                className="inline-flex cursor-pointer px-10 py-5 bg-[#C9EB55] hover:bg-[#bce045] text-black font-extrabold rounded-xl transition-all shadow-[0_10px_30px_rgba(201,235,85,0.3)] hover:shadow-[0_15px_40px_rgba(201,235,85,0.45)] hover:-translate-y-1 w-full md:w-auto text-lg tracking-wide uppercase items-center justify-center"
              >
                Start Free
              </Link>
            </motion.div>
          </motion.div>

          <motion.div 
            className="relative"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="sticky top-20 space-y-6">
              <motion.div
                className="p-8 rounded-3xl bg-gradient-to-br from-[#C9EB55]/10 to-[#C9EB55]/5 border border-[#C9EB55]/30 hover:border-[#C9EB55] transition-all"
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-full bg-[#C9EB55]/20">
                    <span className="text-2xl font-bold text-[#C9EB55]">✓</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white">100% Free</h3>
                </div>
                <p className="text-white/80 leading-relaxed mb-6">No credit card required. Get started instantly with full access to our core mining features.</p>
                
                <div className="space-y-2 text-sm text-white/70">
                  <p>✓ Unlimited Duration</p>
                  <p>✓ No Hidden Charges</p>
                  <p>✓ Upgrade Anytime</p>
                  <p>✓ Keep All Your Data</p>
                </div>
              </motion.div>

              <motion.div
                className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-[#C9EB55]/30 transition-all"
                whileHover={{ y: -2 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">→</span> Ready to upgrade?
                </h3>
                <p className="text-white/70 text-sm mb-6">Unlock Guardian protection, paid monitoring features, and priority support.</p>
                <Link href="/pricing/silver" className="inline-flex items-center gap-2 text-[#C9EB55] font-semibold hover:text-[#e2ff78] transition-colors">
                  Explore Silver Tier
                  <span>→</span>
                </Link>
              </motion.div>

              <motion.div
                className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <p className="text-sm text-white/60 mb-3">Join thousands of miners</p>
                <p className="text-2xl font-bold text-[#C9EB55]">5,000+</p>
                <p className="text-xs text-white/60">Active miners on Starter</p>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* FAQ Section */}
        <motion.div 
          className="mt-32 pt-20 border-t border-white/10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-bold text-center mb-16">Frequently Asked Questions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              { q: "Is Starter truly free forever?", a: "Yes, Starter tier is completely free with no time limits or hidden fees." },
              { q: "Can I upgrade to Silver, Hash Pro, or Titan Elite later?", a: "Absolutely. Upgrade anytime without losing your mining data or rewards." },
              { q: "What happens to my rewards?", a: "Your rewards stay with you. They increment and carry over if you upgrade." },
              { q: "Do I need a credit card to sign up?", a: "No credit card needed for Starter. Just create an account and start mining." },
            ].map((faq, idx) => (
              <motion.div
                key={idx}
                className="p-6 rounded-2xl border border-white/10 hover:border-[#C9EB55]/30 transition-colors bg-white/5"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <h4 className="font-bold text-[#C9EB55] mb-3">{faq.q}</h4>
                <p className="text-white/70 text-sm leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <footer className="border-t border-white/10 mt-32 pt-16 flex flex-col items-center gap-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="text-base font-bold tracking-[0.25em] text-white uppercase">SUPERNOVA</div>
            <div className="text-xs font-medium text-[#C9EB55] tracking-[0.2em]">SNOVAPOOL IO</div>
          </div>
          <div className="text-xs text-gray-600 mt-2">© 2026 SUPERNOVA All rights reserved</div>
        </footer>
      </div>
    </div>
  );
}
