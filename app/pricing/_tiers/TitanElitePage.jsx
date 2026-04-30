"use client";

import { motion } from "framer-motion";
import {
  Check,
  Shield,
  Gauge,
  ArrowUpRight,
  X,
  HelpCircle,
  CreditCard,
  Gem,
  MapPin,
  Truck,
  Crown,
  Scan,
  BellRing,
  Cpu,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { DroneGraphic } from "@/components/ui/DroneGraphic";

function createParticles(count, durationMin, durationMax, delayMax) {
  return Array.from({ length: count }, () => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    duration: Math.random() * (durationMax - durationMin) + durationMin,
    delay: Math.random() * delayMax,
  }));
}

export default function TitanElitePage() {
  const [isHovered, setIsHovered] = useState(false);
  const dots = useMemo(() => createParticles(200, 5, 13, 8), []);
  const stars = useMemo(() => createParticles(150, 2, 5, 5), []);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white selection:bg-[#C9EB55] selection:text-black font-sans overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1f2e,_#0a0a0f)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(201,235,85,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(201,235,85,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <>
            <motion.div
              className="absolute top-24 right-8 lg:right-28 z-0 opacity-90 pointer-events-none"
              initial={{ y: 0, x: 0, rotate: -3 }}
              animate={{
                y: [0, -40, 20, -30, 0],
                x: [0, -150, -50, -200, 0],
                rotate: [-3, 2, -5, 1, -3],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <DroneGraphic className="w-40 h-40 lg:w-64 lg:h-64 drop-shadow-[0_0_20px_rgba(201,235,85,0.15)]" />
            </motion.div>

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
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C9EB55]/80">
                <Crown className="w-3.5 h-3.5" />
                Titan Elite Tier
              </div>

              <h1 className="relative w-fit text-6xl lg:text-7xl font-black leading-[0.9]">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-[#C9EB55]/25 blur-[100px] -z-10 pointer-events-none" />
                <span className="text-[#C9EB55]">TITAN</span>
                <br />
                <span className="text-[#C9EB55]">ELITE</span>
              </h1>
            </div>

            <p className="text-xl text-white leading-relaxed max-w-xl">
              Enter the highest membership tier with <span className="text-[#C9EB55] font-semibold">Guardian Full Coverage</span>,
              Emergency Lock availability, elite-grade support routing, and a premium Titan Elite physical access card.
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
                  <span className="text-xs font-medium text-white/80">Performance Layer</span>
                </div>
                <div className="text-lg font-bold text-[#C9EB55] mb-1">Maximum Coverage</div>
                <p className="text-xs text-white leading-relaxed">Move with the strongest monitoring posture and high-visibility oversight across critical mining activity.</p>
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
                <div className="text-lg font-bold text-[#C9EB55] mb-1">Guardian Full Coverage</div>
                <p className="text-xs text-white leading-relaxed">Full Guardian coverage with premium protection handling. Activate Guardian with a Security PIN to enable protection. Emergency Lock: Available.</p>
              </motion.div>

              <motion.div
                className="group p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#C9EB55]/30 transition-all"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <BellRing className="w-4 h-4 text-[#C9EB55]" />
                  <span className="text-xs font-medium text-white/80">Incident Channel</span>
                </div>
                <div className="text-lg font-bold text-[#C9EB55] mb-1">Direct line, 1-5 hours</div>
                <p className="text-xs text-white leading-relaxed">Gain direct contact access with a typical response window of 1 to 5 hours for high-priority issues.</p>
              </motion.div>

              <motion.div
                className="group p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#C9EB55]/30 transition-all"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className="w-4 h-4 text-[#C9EB55]" />
                  <span className="text-xs font-medium text-white/80">Elite Community</span>
                </div>
                <div className="text-lg font-bold text-[#C9EB55] mb-1">Private Group Access</div>
                <p className="text-xs text-white leading-relaxed">Access the Titan Elite Private Group: a dedicated space for strategy, feedback, and direct discussions with other elite members.</p>
              </motion.div>
            </div>

            <motion.div
              className="grid grid-cols-2 gap-4 pt-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
            >
              <motion.div
                className="col-span-2 p-4 rounded-2xl bg-gradient-to-r from-[#C9EB55]/10 to-[#C9EB55]/5 border border-[#C9EB55]/30 hover:border-[#C9EB55] transition-all"
                whileHover={{ y: -2 }}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-[#C9EB55]/20">
                    <Gem className="w-5 h-5 text-[#C9EB55]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold text-[#C9EB55]">Titan Elite Metal Card</h4>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#C9EB55]/20 text-[#C9EB55]">Elite Access</span>
                    </div>
                    <p className="text-xs text-white leading-relaxed">A premium physical access card for the top-tier member experience, built to reflect the most exclusive level inside SUPERNOVA.</p>
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                      <div className="flex items-center gap-1">
                        <Truck className="w-3 h-3 text-[#C9EB55]" />
                        <span className="text-[10px] text-white/80">USA: 15-25 business days</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#C9EB55]" />
                        <span className="text-[10px] text-white/80">International: 15-40 business days (varies by country)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <CreditCard className="w-3 h-3 text-[#C9EB55]" />
                      <span className="text-[10px] text-white/80">Price includes taxes and free worldwide shipping.</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              className="pt-6 space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <h3 className="text-sm font-medium text-[#C9EB55] tracking-wider">WHAT IS INCLUDED</h3>
              <div className="space-y-3">
                {[
                  "Advanced continuous monitoring",
                  "Guardian Full Coverage protection monitoring",
                  "Guardian activation with Security PIN",
                  "Direct line support: 1-5 hours",
                  "Emergency Lock: Available",
                  "Reduced pool fee: 1.3%",
                  "Performance SLA and rollback support",
                  "Custom orchestration layer",
                  "Access to the Titan Elite Private Group: a dedicated space for strategy, feedback, and direct discussions with other elite members.",
                  "Titan Elite physical member card",
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
              <p className="mb-4 text-sm text-white/70">
                First payment: <span className="text-[#C9EB55] font-semibold">$182.99</span> (includes metal card + 3-month subscription). After 1 year, you only pay the subscription : $79.99 every cycle.
              </p>
              <div className="mb-5 rounded-2xl border border-[#C9EB55]/20 bg-white/5 px-4 py-3 text-sm text-white/72">
                <p className="font-semibold uppercase tracking-[0.12em] text-[#C9EB55]">No Refunds - All sales are final</p>
                <p className="mt-2 leading-relaxed">Users can evaluate the platform through the free Starter plan before upgrading.</p>
              </div>
              <Link
                href="/checkout?tier=titan-elite"
                className="group relative inline-flex items-center gap-3 px-8 py-5 bg-[#C9EB55] text-black font-bold rounded-2xl overflow-hidden w-full lg:w-auto justify-center text-lg shadow-[0_0_12px_-5px_rgba(201,235,85,0.15)] hover:shadow-[0_0_18px_-5px_rgba(201,235,85,0.25)] transition-shadow duration-300"
              >
                <span className="relative z-10">Upgrade to Titan Elite</span>
                <ArrowUpRight className="relative z-10 w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                <motion.div
                  className="absolute inset-0 bg-white"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            className="space-y-8"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div
              className="relative w-full aspect-[1/0.7] rounded-3xl"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <motion.div
                className="absolute inset-0 bg-[#C9EB55]/20 rounded-3xl blur-3xl"
                animate={{
                  opacity: isHovered ? 0.3 : 0.1,
                  scale: isHovered ? 1.1 : 1,
                }}
                transition={{ duration: 0.3 }}
              />

              <div className="relative w-full h-full rounded-3xl border-2 border-[#C9EB55] bg-gradient-to-br from-[#1a1f2e] to-[#0b0e14] overflow-hidden shadow-2xl">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-[#C9EB55]/10 to-transparent"
                  animate={{
                    x: ["-100%", "200%"],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                    repeatDelay: 1,
                  }}
                />

                <div className="relative w-full h-full flex items-center justify-center p-6">
                  <Image
                    src="/uploads/IMG_0381.PNG"
                    alt="Titan Elite metal card"
                    width={900}
                    height={620}
                    className="w-full h-auto object-contain drop-shadow-2xl relative z-10"
                    priority
                  />
                </div>

                <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-[#C9EB55]/30 rounded-tl-xl" />
                <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-[#C9EB55]/30 rounded-tr-xl" />
                <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-[#C9EB55]/30 rounded-bl-xl" />
                <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-[#C9EB55]/30 rounded-br-xl" />
              </div>
            </div>

            <motion.div
              className="rounded-3xl border border-white/10 bg-white/5 p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#C9EB55]/15 border border-[#C9EB55]/20">
                  <Scan className="w-5 h-5 text-[#C9EB55]" />
                </div>
                <div>
                  <h3 className="text-[#C9EB55] font-bold mb-2">Top Tier Member Identity</h3>
                  <p className="text-sm text-white leading-relaxed">
                    Titan Elite is positioned as the highest physical access layer, pairing top-tier brand identity with Guardian Full Coverage and the strongest support posture.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          className="max-w-4xl mx-auto mt-32"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12">
            <span className="text-[#C9EB55]">Frequently Asked</span> <span className="text-[#C9EB55]">Questions</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                q: "What is Titan Elite?",
                a: "Titan Elite is the highest current membership tier, designed for users who want Guardian Full Coverage, Emergency Lock availability, and a direct support line with a 1-5 hour response window.",
              },
              {
                q: "What does Full Coverage mean?",
                a: "Full Coverage is the top Guardian protection tier. It activates after you create a Security PIN and includes premium protection handling.",
              },
              {
                q: "Is there a physical Titan Elite card?",
                a: "Yes. Titan Elite includes a physical metal access card intended to reflect the highest level of member identity in the ecosystem.",
              },
              {
                q: "Who is this tier best for?",
                a: "Titan Elite is best for users who want the most premium blend of monitoring, support positioning, Guardian Full Coverage, and Emergency Lock availability.",
              },
              {
                q: "Can I move to Titan Elite later?",
                a: "Yes. You can move into Titan Elite whenever you're ready to step into the highest tier.",
              },
              {
                q: "Will I receive shipping details for the card?",
                a: "Yes. After purchase, shipping and tracking details for the Titan Elite card can be sent by email.",
              },
            ].map((faq, idx) => (
              <motion.div
                key={idx}
                className="border border-[#C9EB55]/20 rounded-2xl p-6 hover:border-[#C9EB55] transition-all bg-white/5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3 + idx * 0.05 }}
              >
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-[#C9EB55] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-[#C9EB55] mb-2">{faq.q}</h3>
                    <p className="text-sm text-white leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

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
