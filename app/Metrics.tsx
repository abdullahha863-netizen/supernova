"use client";

import { useMemo, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { 
  Check, 
  Shield, 
  Sparkles,
  Clock,
  Gauge,
  Zap,
  Cpu,
  Lock,
  Rocket,
  GitBranch,
  Battery,
  LifeBuoy,
  Crown,
  Scan,
  BellRing,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import DroneGraphic from "../components/ui/DroneGraphic";

function createParticles(count: number, durationMin: number, durationMax: number, delayMax: number) {
  return Array.from({ length: count }, () => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    duration: Math.random() * (durationMax - durationMin) + durationMin,
    delay: Math.random() * delayMax,
  }));
}

function getPricingFeatureTitle(feature: string) {
  if (feature === "Protection: Guardian Basic / Scout") {
    return "Basic monitoring and protection alerts. Emergency Lock is not included.";
  }
  if (feature === "Protection: Guardian Advanced") {
    return "Advanced monitoring with stronger protection response.";
  }
  if (feature === "Protection: Guardian Full Coverage") {
    return "Premium protection handling with the strongest Guardian coverage.";
  }
  if (feature === "Emergency Lock: Not included") {
    return "Emergency Lock is available on Hash Pro and Titan Elite.";
  }
  if (feature === "Emergency Lock: Available") {
    return "Freeze your account if you suspect unauthorized access.";
  }
  return undefined;
}

type MetricsProps = {
  showDashboard?: boolean;
  showAdminDashboard?: boolean;
};

export default function Metrics({ showDashboard = false, showAdminDashboard = false }: MetricsProps) {
  const isClient = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
  const dots = useMemo(() => createParticles(200, 5, 13, 8), []);
  const stars = useMemo(() => createParticles(150, 2, 5, 5), []);

  const pricingPlans = [
    {
      name: "Starter",
      price: "$0",
      tagline: "",
      icon: Zap,
      link: "/pricing/starter",
      accent: "from-[rgb(201,235,85)]/18 via-[rgb(201,235,85)]/8 to-transparent",
      features: [
        "Basic monitoring",
        "Community access",
        "Product updates",
        "Payout tracking",
        "Pool Fee: 4.0%",
        "Protection: Not included",
        "Emergency Lock: Not included",
      ],
      cta: "Start Igniting",
    },
    {
      name: "Silver",
      price: "$14.99 / 3 months",
      tagline: "",
      icon: Cpu,
      link: "/pricing/silver",
      accent: "from-[rgb(201,235,85)]/22 via-[rgb(201,235,85)]/10 to-transparent",
      features: [
        "Enhanced monitoring",
        "Support Response: 10-24 hours",
        "Performance tuning",
        "Reward optimization",
        "Pool Fee: 3.2%",
        "Protection: Guardian Basic / Scout",
        "Emergency Lock: Not included",
      ],
      cta: "Lock In Pulse",
    },
    {
      name: "Hash Pro",
      price: "$34.99 / 3 months",
      tagline: "",
      icon: Gauge,
      link: "/pricing/hash-pro",
      accent: "from-[rgb(201,235,85)]/26 via-[rgb(201,235,85)]/12 to-transparent",
      features: [
        "Real-time monitoring",
        "Support Response: 6-12 hours",
        "Emergency Account Lock",
        "Seamless system switching",
        "Reward forecasting",
        "Pool Fee: 2.4%",
        "Protection: Guardian Advanced",
        "Emergency Lock: Available",
      ],
      cta: "Activate Nova",
    },
    {
      name: "Titan Elite",
      price: "$79.99 / year",
      tagline: "",
      icon: Shield,
      link: "/pricing/titan-elite",
      accent: "from-[rgb(201,235,85)]/30 via-[rgb(201,235,85)]/14 to-transparent",
      features: [
        "Advanced continuous monitoring",
        "Direct Line: 1-5 hours",
        "Emergency Account Lock",
        "Performance SLA + rollback",
        "Custom orchestration",
        "Pool Fee: 1.3%",
        "Protection: Guardian Full Coverage",
        "Emergency Lock: Available",
      ],
      cta: "Enter Apex",
    },
  ];

  return (
    <>
      {/* ==================== HERO SECTION ==================== */}
      <section className="relative w-full h-[600px] overflow-hidden rounded-2xl isolate mb-10 z-10 border-b border-[#C9EB55]/22 shadow-[0_8px_18px_rgba(201,235,85,0.12)]">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src="/uploads/555.mp4" type="video/mp4" />
        </video>

        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6">
          <motion.h1
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-7xl md:text-8xl font-extrabold tracking-tighter text-white"
            style={{
              textShadow:
                "0 0 24px rgba(201,235,85,0.35), 0 0 56px rgba(201,235,85,0.2)",
            }}
          >
            SUPERNOVA
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.2 }}
            className="mt-8 text-xl md:text-2xl text-gray-200 leading-relaxed max-w-2xl mx-auto"
          >
            Next-generation Kaspa mining infrastructure optimized for BlockDAG performance and fast reward delivery.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, delay: 0.4 }}
            className="mt-12 flex flex-col sm:flex-row justify-center gap-6"
          >
            <div className="flex flex-col gap-3">
              <motion.button
                whileHover={{ scale: 1.08, boxShadow: "0 0 30px rgba(201,235,85,0.45)" }}
                whileTap={{ scale: 0.95 }}
                className="cursor-pointer px-10 py-4 rounded-lg font-bold text-lg border-2 border-[#C9EB55] text-[#C9EB55] hover:bg-[#C9EB55]/10 transition-all duration-300"
              >
                Get Started
              </motion.button>
              {showAdminDashboard ? (
                <Link href="/admin/dashboard">
                  <motion.button
                    whileHover={{ scale: 1.04, boxShadow: "0 0 22px rgba(201,235,85,0.25)" }}
                    whileTap={{ scale: 0.96 }}
                    className="cursor-pointer w-full px-10 py-3 rounded-lg font-bold text-sm uppercase tracking-[0.14em] bg-[#C9EB55]/12 border border-[#C9EB55]/60 text-[#DFF58C] hover:bg-[#C9EB55]/18 transition-all duration-300"
                  >
                    Admin Dashboard
                  </motion.button>
                </Link>
              ) : null}
            </div>

            {showDashboard ? (
              <Link href="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.08, boxShadow: "0 0 30px rgba(201,235,85,0.3)" }}
                  whileTap={{ scale: 0.95 }}
                  className="cursor-pointer px-10 py-4 rounded-lg font-bold text-lg bg-black/50 border-2 border-[#C9EB55]/70 text-white hover:bg-black/30 transition-all duration-300"
                >
                  Dashboard
                </motion.button>
              </Link>
            ) : null}
          </motion.div>
        </div>
      </section>

      {/* ==================== SILVER TIER BACKGROUND (STARS + GREEN PARTICLES) ==================== */}
      <div className="relative bg-[#0A0A0F]">
        {/* Silver Tier Background Effect */}
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

        {/* All Content Below Hero (with relative z-index to appear above background) */}
        <div className="relative z-10">





          {/* ==================== WHY KASPA + SUPERNOVA ==================== */}
          <section className="relative py-32 px-6 md:px-12">
            <div className="max-w-7xl mx-auto">
              <motion.div 
                className="mb-20 text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
                  Why Kaspa + SUPERNOVA?
                </h2>
                <p className="text-white/70 text-lg max-w-2xl mx-auto leading-relaxed">
                  The perfect fusion of BlockDAG technology and premium mining infrastructure
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { icon: GitBranch, title: "BlockDAG Speed", desc: "Kaspa processes blocks in parallel for unmatched throughput.", delay: 0.1 },
                  { icon: Clock, title: "Instant Finality", desc: "Transactions confirm in seconds with zero bottlenecks.", delay: 0.2 },
                  { icon: Battery, title: "Energy Efficiency", desc: "Optimized mining with plasma‑tuned performance.", delay: 0.3 },
                  { icon: Sparkles, title: "SUPERNOVA Integration", desc: "A next‑gen dashboard built for miners and power users.", delay: 0.4 },
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: item.delay }}
                    className="relative group"
                    style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.7), 0 0 30px rgba(201,235,85,0.08)" }}
                  >
                    <div className="absolute -inset-1 bg-gradient-to-b from-[rgb(201,235,85)]/15 via-[rgb(201,235,85)]/5 to-transparent rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative bg-gradient-to-br from-[#0a0e10] via-[#050708] to-[#0a0e10] border border-[#C9EB55]/25 rounded-2xl p-8 backdrop-blur-xl overflow-hidden transition-all duration-500 group-hover:border-[#C9EB55]/45 h-full min-h-[320px] flex flex-col">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-tl from-[rgb(201,235,85)]/5 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent pointer-events-none rounded-b-2xl" />
                      <div className="absolute top-0 left-0 w-20 h-20">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-[rgb(201,235,85)]/40 via-[rgb(201,235,85)]/15 to-transparent" />
                        <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-[rgb(201,235,85)]/40 via-[rgb(201,235,85)]/15 to-transparent" />
                      </div>
                      <div className="absolute bottom-0 right-0 w-20 h-20">
                        <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-l from-[rgb(201,235,85)]/40 via-[rgb(201,235,85)]/15 to-transparent" />
                        <div className="absolute bottom-0 right-0 w-[1px] h-full bg-gradient-to-t from-[rgb(201,235,85)]/40 via-[rgb(201,235,85)]/15 to-transparent" />
                      </div>
                      <div className="absolute top-12 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[rgb(201,235,85)]/10 to-transparent" />

                      <div className="relative z-10 flex flex-col h-full">
                        <div className="relative mb-6 inline-block w-fit">
                          <div className="absolute inset-0 bg-[rgb(201,235,85)]/15 rounded-lg blur-lg" />
                          <item.icon className="w-12 h-12 text-[#C9EB55] relative z-10" style={{ filter: "drop-shadow(0 0 10px rgba(201,235,85,0.5))" }} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-4 leading-tight">{item.title}</h3>
                        <p className="text-white/80 text-sm leading-relaxed mt-auto">{item.desc}</p>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-[rgb(201,235,85)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ==================== PRICING ==================== */}
          <section id="upgrade-cards" className="relative scroll-mt-24 py-32 px-6 md:px-12 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-[url('/textures/noise.svg')] opacity-[0.08]" />
              <div className="absolute -left-16 top-8 w-80 h-80 bg-[rgb(201,235,85)]/10 blur-3xl rounded-full" />
              <div className="absolute right-[-8rem] bottom-0 w-96 h-96 bg-[rgb(201,235,85)]/12 blur-3xl rounded-full" />
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-black/65" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
              <motion.div
                className="text-center mb-16"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <p className="text-[#C9EB55]/70 text-xs font-semibold uppercase tracking-[0.35em] mb-4">
                  Pricing Crafted for Kaspa Miners
                </p>
                <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
                  Choose Your SUPERNOVA Membership
                </h2>
                <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed">
                  Four premium access levels built for different stages of mining growth.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">
                {pricingPlans.map((plan, idx) => (
                  <motion.div
                    key={plan.name}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: 0.1 * idx }}
                    className="relative group h-full"
                    style={{ boxShadow: "0 10px 38px rgba(0,0,0,0.75), 0 0 36px rgba(201,235,85,0.12)" }}
                  >
                    <div className={`absolute -inset-[1px] rounded-2xl bg-gradient-to-b ${plan.accent} opacity-60 group-hover:opacity-100 transition-all duration-500 blur-[3px]`} />
                    <div className="relative h-full bg-[#080808]/90 backdrop-blur-2xl border border-white/10 group-hover:border-[#C9EB55]/40 rounded-2xl p-8 flex flex-col transition-all duration-300 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-tl from-[rgb(201,235,85)]/6 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />

                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex flex-col items-center gap-3 mb-6 text-center">
                          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#C9EB55]/70">{plan.name}</div>
                          <div className="relative inline-flex items-center justify-center">
                            <div className="absolute inset-0 bg-[rgb(201,235,85)]/18 rounded-lg blur-lg" />
                            <plan.icon className="w-11 h-11 text-[#C9EB55] relative z-10" style={{ filter: "drop-shadow(0 0 10px rgba(201,235,85,0.45))" }} />
                          </div>
                          <div className="text-2xl font-black text-white tracking-tight whitespace-nowrap" style={{ textShadow: "0 0 26px rgba(201,235,85,0.25)" }}>
                            {plan.price}
                          </div>
                        </div>

                        <p className="text-white/70 text-sm leading-relaxed mb-8">{plan.tagline}</p>

                        <div className="space-y-4 mb-10 flex-grow">
                          {plan.features.map((feature) => (
                            <div key={feature} title={getPricingFeatureTitle(feature)} className="flex items-start gap-3 text-white/85 text-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#C9EB55] mt-2 shrink-0 shadow-[0_0_10px_#C9EB55]" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>

                        <Link href={plan.link} className="w-full mt-8 group flex items-center justify-center gap-2 text-[#C9EB55] no-underline cursor-pointer text-sm font-bold tracking-widest uppercase transition-all duration-300 hover:text-[#C9EB55] hover:brightness-110 hover:drop-shadow-[0_0_8px_rgba(201,235,85,0.6)]">
                          Learn More
                          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ==================== TRUST / SECURITY PROOF ==================== */}
          <section className="relative py-32 px-6 md:px-12 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-0 top-10 w-80 h-80 bg-[rgb(201,235,85)]/8 blur-3xl rounded-full" />
              <div className="absolute right-0 bottom-0 w-96 h-96 bg-[rgb(201,235,85)]/10 blur-3xl rounded-full" />
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-black/60" />
              <div className="absolute inset-0 bg-[linear-gradient(rgba(201,235,85,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(201,235,85,0.02)_1px,transparent_1px)] bg-[size:56px_56px]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
              <motion.div
                className="mb-16 text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <p className="text-[#C9EB55]/70 text-xs font-semibold uppercase tracking-[0.35em] mb-4">
                  Trust Layer
                </p>
                <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
                  Security You Can Verify
                </h2>
                <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed">
                  Designed to protect miner access, account actions, and payout operations through visible safeguards at every critical layer.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 items-stretch">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  className="relative overflow-hidden rounded-3xl border border-[#C9EB55]/28 bg-gradient-to-br from-[#0a0e10] via-[#050708] to-[#0a0e10] backdrop-blur-2xl p-8 md:p-10 shadow-[0_14px_52px_rgba(0,0,0,0.76),0_0_42px_rgba(201,235,85,0.14)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-tl from-[rgb(201,235,85)]/5 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                  <div className="absolute top-12 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[rgb(201,235,85)]/12 to-transparent" />

                  <div className="absolute top-0 left-0 w-24 h-24">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-[rgb(201,235,85)]/40 via-[rgb(201,235,85)]/15 to-transparent" />
                    <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-[rgb(201,235,85)]/40 via-[rgb(201,235,85)]/15 to-transparent" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-24 h-24">
                    <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-l from-[rgb(201,235,85)]/40 via-[rgb(201,235,85)]/15 to-transparent" />
                    <div className="absolute bottom-0 right-0 w-[1px] h-full bg-gradient-to-t from-[rgb(201,235,85)]/40 via-[rgb(201,235,85)]/15 to-transparent" />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-2xl border border-[#C9EB55]/25 bg-[#C9EB55]/10">
                        <div className="absolute inset-0 bg-[rgb(201,235,85)]/16 rounded-2xl blur-lg" />
                        <Lock className="w-7 h-7 text-[#C9EB55] relative z-10" style={{ filter: "drop-shadow(0 0 10px rgba(201,235,85,0.5))" }} />
                      </div>
                      <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-[#C9EB55]/70">Protection Matrix</p>
                        <h3 className="text-2xl md:text-3xl font-extrabold text-white">Critical actions are secured through layered protection.</h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {[
                        {
                          icon: Shield,
                          title: "Encrypted Access Flows",
                          desc: "Sensitive account activity and wallet-linked actions are protected through hardened security layers.",
                        },
                        {
                          icon: BellRing,
                          title: "24/7 Threat Monitoring",
                          desc: "Continuous monitoring helps surface suspicious behavior before it turns into operational risk.",
                        },
                        {
                          icon: LifeBuoy,
                          title: "Automatic Recovery Paths",
                          desc: "Failover logic and recovery procedures help keep the platform stable during disruption events.",
                        },
                        {
                          icon: Scan,
                          title: "Verified Account Protection",
                          desc: "2FA-backed access control and security checks strengthen account protection where it matters most.",
                        },
                      ].map((item, idx) => (
                        <motion.div
                          key={item.title}
                          initial={{ opacity: 0, y: 18 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, delay: idx * 0.08 }}
                          className="rounded-2xl border border-white/8 bg-white/[0.02] p-5"
                        >
                          <div className="flex items-start gap-4">
                            <div className="relative mt-1 inline-flex items-center justify-center w-11 h-11 rounded-xl border border-[#C9EB55]/20 bg-[#C9EB55]/10 shrink-0">
                              <div className="absolute inset-0 bg-[rgb(201,235,85)]/14 rounded-xl blur-md" />
                              <item.icon className="w-5 h-5 text-[#C9EB55] relative z-10" />
                            </div>
                            <div>
                              <h4 className="text-white font-bold text-lg mb-2">{item.title}</h4>
                              <p className="text-white/70 text-sm leading-relaxed">{item.desc}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  className="relative overflow-hidden rounded-3xl border border-[#C9EB55]/24 bg-gradient-to-br from-[#0a0e10] via-[#050708] to-[#0a0e10] backdrop-blur-2xl p-8 shadow-[0_12px_42px_rgba(0,0,0,0.75),0_0_36px_rgba(201,235,85,0.12)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[rgb(201,235,85)]/6 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                  <div className="absolute top-12 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[rgb(201,235,85)]/12 to-transparent" />
                  <div className="absolute top-0 left-0 w-20 h-20">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-[rgb(201,235,85)]/40 via-[rgb(201,235,85)]/15 to-transparent" />
                    <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-[rgb(201,235,85)]/40 via-[rgb(201,235,85)]/15 to-transparent" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-20 h-20">
                    <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-l from-[rgb(201,235,85)]/40 via-[rgb(201,235,85)]/15 to-transparent" />
                    <div className="absolute bottom-0 right-0 w-[1px] h-full bg-gradient-to-t from-[rgb(201,235,85)]/40 via-[rgb(201,235,85)]/15 to-transparent" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-sm uppercase tracking-[0.24em] text-[#C9EB55]/70 mb-6">Command Status</p>

                    <div className="space-y-4 mb-8">
                      {[
                        "2FA-ready account protection",
                        "Monitored access and threat detection",
                        "Secure payout handling pipeline",
                        "Recovery-ready infrastructure design",
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-3 text-white/85 text-sm">
                          <Check className="w-4 h-4 text-[#C9EB55] shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-[#C9EB55]/20 bg-gradient-to-br from-white/[0.03] via-[#0b0d0a] to-[#080808] p-5 mb-8">
                      <div className="absolute inset-0 bg-gradient-to-tl from-[rgb(201,235,85)]/6 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent pointer-events-none" />
                      <div className="flex items-start gap-4">
                        <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-xl border border-[#C9EB55]/20 bg-[#C9EB55]/10 shrink-0">
                          <div className="absolute inset-0 bg-[rgb(201,235,85)]/14 rounded-xl blur-md" />
                          <DroneGraphic className="w-8 h-8 text-[#C9EB55] relative z-10" />
                        </div>
                        <div className="relative z-10">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C9EB55]/70 mb-2">Guardian Drone Active</p>
                          <p className="text-white text-base font-bold mb-2">AI sentinel coverage supporting live protection.</p>
                          <p className="text-white/70 text-sm leading-relaxed">
                            The Guardian Drone extends the trust layer with continuous monitoring, alerts, and fast anomaly awareness.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { value: "24/7", label: "Monitoring" },
                        { value: "2FA", label: "Account Shield" },
                        { value: "Auto", label: "Recovery Logic" },
                        { value: "Secure", label: "Payout Flow" },
                      ].map((item, idx) => (
                        <motion.div
                          key={item.label}
                          initial={{ opacity: 0, scale: 0.96 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: 0.12 * idx }}
                          className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 text-center"
                        >
                          <div className="text-2xl md:text-3xl font-black text-white mb-1" style={{ textShadow: "0 0 20px rgba(201,235,85,0.2)" }}>
                            {item.value}
                          </div>
                          <div className="text-xs uppercase tracking-[0.18em] text-white/55">
                            {item.label}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ==================== CONNECTION GUIDE + QUICK START ==================== */}
          <section className="relative py-32 px-6 md:px-12 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -left-12 top-10 w-72 h-72 bg-[rgb(201,235,85)]/8 blur-3xl rounded-full" />
              <div className="absolute right-[-5rem] bottom-0 w-80 h-80 bg-[rgb(201,235,85)]/10 blur-3xl rounded-full" />
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-black/60" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
              <motion.div
                className="mb-16 text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <p className="text-[#C9EB55]/70 text-xs font-semibold uppercase tracking-[0.35em] mb-4">
                  Ready to Connect?
                </p>
                <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
                  Connect Your Miner With Confidence
                </h2>
                <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed">
                  Use the connection guide to point your miner at the correct pool endpoint, format your worker name,
                  and start sending shares with the right setup from the beginning.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7 }}
                  className="relative group"
                  style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.7), 0 0 30px rgba(201,235,85,0.08)" }}
                >
                  <div className="absolute -inset-1 bg-gradient-to-b from-[rgb(201,235,85)]/15 via-[rgb(201,235,85)]/5 to-transparent rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative bg-gradient-to-br from-[#0a0e10] via-[#050708] to-[#0a0e10] border border-[#C9EB55]/25 rounded-2xl p-6 backdrop-blur-xl overflow-hidden transition-all duration-500 group-hover:border-[#C9EB55]/45 h-full min-h-[280px] flex flex-col">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-tl from-[rgb(201,235,85)]/5 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent pointer-events-none rounded-b-2xl" />
                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex items-start justify-between gap-4 mb-6">
                        <div className="relative inline-block w-fit">
                          <div className="absolute inset-0 bg-[rgb(201,235,85)]/15 rounded-lg blur-lg" />
                          <Zap className="w-10 h-10 text-[#C9EB55] relative z-10" style={{ filter: "drop-shadow(0 0 10px rgba(201,235,85,0.5))" }} />
                        </div>
                        <div className="text-2xl font-black text-white/18 tracking-tight">
                          Guide
                        </div>
                      </div>

                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C9EB55]/72 mb-3">
                        Miner Setup
                      </div>

                      <h3 className="text-lg font-bold text-white mb-3 leading-tight">Connection Guide</h3>
                      <p className="text-white/80 text-sm leading-relaxed">
                        View pool endpoints, worker naming format, and example commands before you connect your mining software.
                      </p>

                      <div className="mt-auto pt-6">
                        <Link
                          href="/connection-guide"
                          className="inline-flex items-center gap-2 rounded-lg border border-[#C9EB55]/35 bg-[#C9EB55]/10 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C9EB55] transition-colors hover:bg-[#C9EB55]/20"
                        >
                          <span>View Connection Guide</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {[
                  {
                    step: "01",
                    icon: Rocket,
                    title: "Create account",
                    desc: "Open your SUPERNOVA account to access the dashboard, setup tools, and pool details.",
                  },
                  {
                    step: "02",
                    icon: Cpu,
                    title: "Add your worker",
                    desc: "Create a worker profile so your miner has a clean identity and shows up in your dashboard.",
                  },
                  {
                    step: "03",
                    icon: Gauge,
                    title: "Start mining",
                    desc: "Point your miner to the pool endpoint, use the correct worker format, and begin submitting shares.",
                  },
                ].map((item, idx) => (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: idx * 0.08 }}
                    className="relative group"
                    style={{ boxShadow: "0 10px 36px rgba(0,0,0,0.74), 0 0 34px rgba(201,235,85,0.1)" }}
                  >
                    <div className="absolute -inset-1 bg-gradient-to-b from-[rgb(201,235,85)]/16 via-[rgb(201,235,85)]/6 to-transparent rounded-2xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative bg-gradient-to-br from-[#0a0e10] via-[#050708] to-[#0a0e10] border border-[#C9EB55]/26 rounded-2xl p-6 backdrop-blur-xl overflow-hidden transition-all duration-500 group-hover:border-[#C9EB55]/45 h-full min-h-[280px] flex flex-col">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-tl from-[rgb(201,235,85)]/5 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent pointer-events-none rounded-b-2xl" />
                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-start justify-between gap-4 mb-6">
                          <div className="relative inline-flex items-center justify-center w-13 h-13">
                            <div className="absolute inset-0 bg-[rgb(201,235,85)]/16 rounded-lg blur-lg" />
                            <item.icon className="w-10 h-10 text-[#C9EB55] relative z-10" style={{ filter: "drop-shadow(0 0 10px rgba(201,235,85,0.5))" }} />
                          </div>
                          <div className="text-2xl font-black text-white/18 tracking-tight">
                            {item.step}
                          </div>
                        </div>

                        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C9EB55]/72 mb-3">
                          Quick Start
                        </div>

                        <h3 className="text-lg font-bold text-white mb-3 leading-tight">{item.title}</h3>
                        <p className="text-white/80 text-sm leading-relaxed">{item.desc}</p>

                        <div className="mt-auto pt-6" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ==================== SUPERNOVA GUARDIAN DRONE ==================== */}
          <section className="relative py-32 px-6 md:px-12">
            <div className="max-w-7xl mx-auto">
              <motion.div
                className="flex flex-col items-center mb-12"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <div className="relative w-24 h-24 mb-8">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      animate={{ y: [0, -6, 0], x: [0, 3, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="flex items-center justify-center"
                    >
                      <DroneGraphic className="w-60 h-60" />
                    </motion.div>
                  </div>
                </div>
                <div className="mb-4 rounded-full border border-[#C9EB55]/25 bg-[#C9EB55]/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C9EB55]/80 shadow-[0_0_20px_rgba(201,235,85,0.08)]">
                  VIP Protection Layer
                </div>
                <div className="mb-4 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/72">
                  Available in Premium Tiers
                </div>
                <p className="text-[#C9EB55]/70 text-sm tracking-[0.2em] uppercase">Guardian AI Sentinel</p>
              </motion.div>

              <motion.div 
                className="mb-20 text-center"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
              >
                <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-4 tracking-tight">
                  SUPERNOVA Guardian Drone
                </h2>
                <p className="text-lg font-semibold text-[#C9EB55] mb-4" style={{ textShadow: "0 0 20px rgba(201,235,85,0.35)" }}>
                  AI Monitoring Built for Continuous Protection
                </p>
                <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed">
                  An intelligent monitoring layer designed for upgraded and VIP members, providing continuous oversight and rapid response across critical Kaspa operations.
                </p>
                <p className="text-white/55 text-sm max-w-2xl mx-auto leading-relaxed mt-4">
                  This protection layer is a paid feature and is available in premium membership tiers only.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { icon: Scan, title: "Real-Time Threat Detection", desc: "The drone continuously scans the network for anomalies, attacks, and suspicious activity.", delay: 0.1 },
                  { icon: BellRing, title: "System Monitoring & Alerts", desc: "Live diagnostics, performance tracking, and instant alerts for critical events.", delay: 0.2 },
                  { icon: Shield, title: "Emergency Response Protocol", desc: "Auto-recovery, fallback pipelines, and rapid stabilization during unexpected failures.", delay: 0.3 },
                  { icon: Crown, title: "VIP Protection Mode", desc: "Exclusive to upgraded users — priority routing, enhanced security layers, and faster incident response.", delay: 0.4 },
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.97 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: item.delay }}
                    className="relative group"
                    style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.78), 0 0 36px rgba(201,235,85,0.12)" }}
                  >
                    <div className="absolute -inset-1 bg-gradient-to-b from-[rgb(201,235,85)]/18 via-[rgb(201,235,85)]/6 to-transparent rounded-2xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative bg-gradient-to-br from-[#0a0e10] via-[#050708] to-[#0a0e10] border border-[#C9EB55]/28 rounded-2xl p-8 backdrop-blur-xl overflow-hidden transition-all duration-500 group-hover:border-[#C9EB55]/45 h-full min-h-[320px] flex flex-col">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-tl from-[rgb(201,235,85)]/5 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent pointer-events-none rounded-b-2xl" />
                      <div className="absolute top-0 left-0 w-20 h-20">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-[rgb(201,235,85)]/40 via-[rgb(201,235,85)]/15 to-transparent" />
                        <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-[rgb(201,235,85)]/40 via-[rgb(201,235,85)]/15 to-transparent" />
                      </div>
                      <div className="absolute bottom-0 right-0 w-20 h-20">
                        <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-l from-[rgb(201,235,85)]/40 via-[rgb(201,235,85)]/15 to-transparent" />
                        <div className="absolute bottom-0 right-0 w-[1px] h-full bg-gradient-to-t from-[rgb(201,235,85)]/40 via-[rgb(201,235,85)]/15 to-transparent" />
                      </div>
                      <div className="absolute top-12 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[rgb(201,235,85)]/12 to-transparent" />
                      
                      <div className="relative z-10 flex flex-col h-full">
                        <div className="relative mb-6 inline-block w-fit">
                          <div className="absolute inset-0 bg-[rgb(201,235,85)]/16 rounded-lg blur-lg" />
                          <item.icon className="w-12 h-12 text-[#C9EB55] relative z-10" style={{ filter: "drop-shadow(0 0 10px rgba(201,235,85,0.55))" }} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-4 leading-tight">{item.title}</h3>
                        <p className="text-white/80 text-sm leading-relaxed mt-auto">{item.desc}</p>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-[rgb(201,235,85)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ==================== FINAL CTA ==================== */}
          <section className="relative py-32 px-6 md:px-12 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -left-24 top-10 w-72 h-72 bg-[rgb(201,235,85)]/8 blur-3xl rounded-full" />
              <div className="absolute right-10 bottom-0 w-80 h-80 bg-[rgb(201,235,85)]/6 blur-3xl rounded-full" />
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-black/60" />
            </div>

            <div className="max-w-6xl mx-auto relative">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative overflow-hidden rounded-3xl border border-[#C9EB55]/25 bg-gradient-to-br from-[#0a0e10] via-[#050708] to-[#0a0e10] backdrop-blur-2xl p-12 md:p-16 shadow-[0_12px_48px_rgba(0,0,0,0.7),0_0_48px_rgba(201,235,85,0.15)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-tl from-[rgb(201,235,85)]/5 via-transparent to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

                <div className="absolute top-0 left-0 w-24 h-24">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-[rgb(201,235,85)]/40 via-[rgb(201,235,85)]/15 to-transparent" />
                  <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-[rgb(201,235,85)]/40 via-[rgb(201,235,85)]/15 to-transparent" />
                </div>
                <div className="absolute bottom-0 right-0 w-24 h-24">
                  <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-l from-[rgb(201,235,85)]/40 via-[rgb(201,235,85)]/15 to-transparent" />
                  <div className="absolute bottom-0 right-0 w-[1px] h-full bg-gradient-to-t from-[rgb(201,235,85)]/40 via-[rgb(201,235,85)]/15 to-transparent" />
                </div>

                <div className="relative z-10 text-center max-w-3xl mx-auto">
                  <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-4 tracking-tight">
                    Ready to Enter SUPERNOVA?
                  </h2>
                  <p className="text-lg font-semibold text-[#C9EB55] mb-4" style={{ textShadow: "0 0 20px rgba(201,235,85,0.35)" }}>
                    Join the next generation of Kaspa mining — secure, optimized, and powered by AI.
                  </p>
                  <p className="text-white/70 text-lg leading-relaxed mb-10">
                    Activate the SUPERNOVA stack with intelligent guardianship, plasma-grade performance, and premium-grade reliability.
                  </p>

                  <div className="flex justify-center">
                    <button
                      className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[rgb(201,235,85)] to-[#a8d430] text-black font-bold text-lg shadow-[0_10px_40px_rgba(201,235,85,0.25)] hover:shadow-[0_12px_48px_rgba(201,235,85,0.35)] transition-all duration-300 border border-[rgb(201,235,85)]/50"
                      style={{ textShadow: "0 0 10px rgba(0,0,0,0.25)" }}
                    >
                      Launch Your Dashboard
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* ==================== FOOTER ==================== */}
          <footer className="w-full bg-[#040506] border-t border-white/5 pt-20 pb-10">
            <div className="max-w-[1400px] mx-auto px-6 md:px-12">
              <div className="grid w-full grid-cols-1 justify-between gap-y-10 gap-x-8 sm:grid-cols-2 lg:grid-cols-[repeat(4,1fr)] lg:gap-x-12 xl:gap-x-16 mb-20 items-start">
                <div className="flex flex-col gap-6 lg:justify-self-start">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-widest">About</h3>
                  <div className="flex flex-col items-start gap-4 text-sm text-white/60">
                    <a href="/about" className="inline-flex w-fit max-w-fit flex-none leading-none hover:text-[#C9EB55] transition-colors">About SUPERNOVA</a>
                    <a href="/how-it-works" className="inline-flex w-fit max-w-fit flex-none leading-none hover:text-[#C9EB55] transition-colors">How It Works</a>
                    <a href="/why-supernova" className="inline-flex w-fit max-w-fit flex-none leading-none hover:text-[#C9EB55] transition-colors">Why SUPERNOVA</a>
                    <a href="/security-overview" className="inline-flex w-fit max-w-fit flex-none leading-none hover:text-[#C9EB55] transition-colors">Security Overview</a>
                  </div>
                </div>

                <div className="flex flex-col gap-6 lg:justify-self-center lg:border-l lg:border-white/10 lg:pl-6">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-widest">Support</h3>
                  <div className="flex flex-col items-start gap-4 text-sm text-white/60">
                    <a href="/faq" className="inline-flex w-fit max-w-fit flex-none leading-none hover:text-[#C9EB55] transition-colors">FAQ</a>
                    <a href="/support" className="inline-flex w-fit max-w-fit flex-none leading-none hover:text-[#C9EB55] transition-colors">Contact Support</a>
                    <a href="/support/ticket" className="inline-flex w-fit max-w-fit flex-none leading-none hover:text-[#C9EB55] transition-colors">Submit a Ticket</a>
                    <a href="/support/priority" className="inline-flex w-fit max-w-fit flex-none leading-none hover:text-[#C9EB55] transition-colors">Priority Support</a>
                  </div>
                </div>

                <div className="flex flex-col gap-6 lg:justify-self-center lg:border-l lg:border-white/10 lg:pl-6 xl:justify-self-end">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-widest">Legal</h3>
                  <div className="flex flex-col items-start gap-4 text-sm text-white/60">
                    <a href="/terms-of-service" className="inline-flex w-fit max-w-fit flex-none leading-none hover:text-[#C9EB55] transition-colors">Terms of Service</a>
                    <a href="/privacy-policy" className="inline-flex w-fit max-w-fit flex-none leading-none hover:text-[#C9EB55] transition-colors">Privacy Policy</a>
                    <a href="/cookies-policy" className="inline-flex w-fit max-w-fit flex-none leading-none hover:text-[#C9EB55] transition-colors">Cookies Policy</a>
                    <a href="/refund-policy" className="inline-flex w-fit max-w-fit flex-none leading-none hover:text-[#C9EB55] transition-colors">Refund Policy</a>
                  </div>
                </div>

                <div className="flex flex-col gap-6 lg:justify-self-end lg:border-l lg:border-white/10 lg:pl-6">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-widest">Connect</h3>
                  <div className="flex flex-col items-start gap-4 text-sm text-white/60">
                    <a href="#" className="inline-flex w-fit max-w-fit flex-none leading-none hover:text-[#C9EB55] transition-colors">Telegram</a>
                    <a href="#" className="inline-flex w-fit max-w-fit flex-none leading-none hover:text-[#C9EB55] transition-colors">Instagram</a>
                    <a href="#" className="inline-flex w-fit max-w-fit flex-none leading-none hover:text-[#C9EB55] transition-colors">YouTube</a>
                    <a href="#" className="inline-flex w-fit max-w-fit flex-none leading-none hover:text-[#C9EB55] transition-colors">Facebook</a>
                    <a href="#" className="inline-flex w-fit max-w-fit flex-none leading-none hover:text-[#C9EB55] transition-colors">Discord</a>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-10 flex flex-col items-center gap-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="text-base font-bold tracking-[0.25em] text-white uppercase">SUPERNOVA</div>
                  <div className="text-xs font-medium text-[#C9EB55] tracking-[0.2em]">SNOVAPOOL IO</div>
                </div>
                <div className="text-xs text-white/40 mt-2">© 2026 SUPERNOVA All rights reserved</div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}

