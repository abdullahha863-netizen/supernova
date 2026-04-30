"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Gauge, Cpu, Scan, Layers, Crown } from "lucide-react";

function createParticles(count, durationMin, durationMax, delayMax) {
  return Array.from({ length: count }, () => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    duration: Math.random() * (durationMax - durationMin) + durationMin,
    delay: Math.random() * delayMax,
  }));
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
};

export default function AboutPage() {
  const [isClient, setIsClient] = useState(false);
  const dots = useMemo(() => createParticles(200, 5, 13, 8), []);
  const stars = useMemo(() => createParticles(150, 2, 5, 5), []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const pillars = [
    {
      icon: Gauge,
      title: "Performance First",
      desc: "SUPERNOVA is built to keep mining operations clear, responsive, and stable through a high-visibility operating layer.",
    },
    {
      icon: Shield,
      title: "Protection By Design",
      desc: "Security is treated as core infrastructure, not an afterthought, with layered controls around access, monitoring, and recovery.",
    },
    {
      icon: Cpu,
      title: "Premium Member Experience",
      desc: "Every tier is designed to feel structured and intentional, with stronger coverage, support, and access as members upgrade.",
    },
  ];

  const standards = [
    {
      icon: Layers,
      title: "Structured Platform Thinking",
      copy: "We build around clear systems, clean access paths, and membership tiers that feel deliberate rather than improvised.",
    },
    {
      icon: Scan,
      title: "Operational Visibility",
      copy: "The platform is shaped around awareness: seeing what matters, detecting issues early, and responding with more confidence.",
    },
    {
      icon: Shield,
      title: "Trust Through Clarity",
      copy: "We aim to present technology in a way that feels strong and premium without becoming noisy, confusing, or overstated.",
    },
    {
      icon: Crown,
      title: "Long-Term Brand Standard",
      copy: "SUPERNOVA is being shaped as a serious ecosystem with a clear identity, premium access layers, and room to scale carefully.",
    },
  ];

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

      <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 py-24 space-y-24">
        <section className="text-center max-w-4xl mx-auto">
          <motion.p
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            variants={fadeUp}
            className="text-xs font-semibold uppercase tracking-[0.35em] text-[#C9EB55]/75 mb-5"
          >
            About SUPERNOVA
          </motion.p>
          <motion.h1
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            variants={fadeUp}
            className="relative text-4xl md:text-6xl font-extrabold tracking-tight text-white"
          >
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 -z-10 h-28 w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C9EB55]/14 blur-[70px]"
            />
            A premium mining platform built around clarity, trust, and control.
          </motion.h1>
          <motion.p
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            variants={fadeUp}
            transition={{ delay: 0.1, duration: 0.8 }}
            className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto mt-6 leading-relaxed"
          >
            SUPERNOVA is being shaped as a more structured way to experience mining operations, combining premium design, visible protection layers, and a platform identity built to feel credible from the first visit.
          </motion.p>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-[#C9EB55]/22 bg-gradient-to-br from-[#0a0e10] via-[#050708] to-[#0a0e10] backdrop-blur-2xl p-8 md:p-12 shadow-[0_12px_48px_rgba(0,0,0,0.72),0_0_42px_rgba(201,235,85,0.12)]">
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

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-10 items-center">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              className="space-y-5"
            >
              <p className="text-sm uppercase tracking-[0.24em] text-[#C9EB55]/70">Our Direction</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                We are building a platform that feels premium without losing trust.
              </h2>
              <p className="text-white/70 leading-relaxed">
                The goal behind SUPERNOVA is not to overwhelm users with noise. It is to create a stronger standard for how a mining platform can look, feel, and operate when performance, protection, and membership experience are treated as one connected system.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              transition={{ delay: 0.08, duration: 0.8 }}
              className="grid grid-cols-2 gap-4"
            >
              {[
                { value: "Premium", label: "Platform Identity" },
                { value: "Layered", label: "Protection Model" },
                { value: "Clear", label: "Member Experience" },
                { value: "Scalable", label: "Growth Direction" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 text-center"
                >
                  <div className="text-2xl md:text-3xl font-black text-white mb-1" style={{ textShadow: "0 0 20px rgba(201,235,85,0.2)" }}>
                    {item.value}
                  </div>
                  <div className="text-xs uppercase tracking-[0.18em] text-white/55">{item.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="space-y-10">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            className="text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white">The Thinking Behind SUPERNOVA</h2>
            <p className="text-white/60 mt-3 max-w-3xl mx-auto">
              Behind the platform is a clear product mindset: build something that feels premium, structured, and credible without becoming noisy or difficult to trust.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.35 }}
            variants={fadeUp}
            className="relative overflow-hidden rounded-3xl border border-[#C9EB55]/22 bg-gradient-to-br from-[#0a0e10] via-[#050708] to-[#0a0e10] backdrop-blur-2xl p-8 md:p-10 shadow-[0_12px_48px_rgba(0,0,0,0.72),0_0_42px_rgba(201,235,85,0.12)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-tl from-[rgb(201,235,85)]/5 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "Design With Restraint",
                  copy: "The visual direction is meant to feel elevated and memorable, while still giving visitors a sense of calm and control.",
                },
                {
                  title: "Build For Trust",
                  copy: "Every page is shaped to reduce friction, communicate clearly, and help the platform feel more credible at every step.",
                },
                {
                  title: "Scale With Intention",
                  copy: "The goal is not only to launch something strong, but to grow it carefully into a more complete and trusted ecosystem.",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/8 bg-white/[0.03] p-6"
                >
                  <h3 className="text-lg font-semibold text-white mb-3">{item.title}</h3>
                  <p className="text-white/70 text-sm leading-relaxed">{item.copy}</p>
                </div>
              ))}
            </div>
          </motion.div>

        </section>

        <section className="space-y-10">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            className="text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white">What Shapes The Platform</h2>
            <p className="text-white/60 mt-3 max-w-2xl mx-auto">
              These are the principles guiding how SUPERNOVA is presented and how the experience is being developed.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pillars.map((item, idx) => (
              <motion.div
                key={item.title}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.35 }}
                variants={fadeUp}
                transition={{ delay: idx * 0.06, duration: 0.7 }}
                className="relative overflow-hidden rounded-2xl border border-[#C9EB55]/18 bg-gradient-to-br from-[#0a0e10] via-[#050708] to-[#0a0e10] p-7 backdrop-blur-xl shadow-[0_10px_36px_rgba(0,0,0,0.72),0_0_24px_rgba(201,235,85,0.08)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-tl from-[rgb(201,235,85)]/5 via-transparent to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col gap-4 h-full">
                  <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-xl border border-[#C9EB55]/20 bg-[#C9EB55]/10">
                    <div className="absolute inset-0 bg-[rgb(201,235,85)]/14 rounded-xl blur-md" />
                    <item.icon className="w-5 h-5 text-[#C9EB55] relative z-10" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                  <p className="text-white/70 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="space-y-10">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.45 }}
            variants={fadeUp}
            className="text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white">The Standard We Aim For</h2>
            <p className="text-white/60 mt-3 max-w-2xl mx-auto">
              Beyond visuals, the platform is being shaped to feel more trustworthy, more structured, and more deliberate with every tier.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {standards.map((item, idx) => (
              <motion.div
                key={item.title}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                variants={fadeUp}
                transition={{ delay: idx * 0.05, duration: 0.7 }}
                className="relative overflow-hidden rounded-2xl border border-[#C9EB55]/18 bg-gradient-to-br from-[#0a0e10] via-[#050708] to-[#0a0e10] p-7 backdrop-blur-xl shadow-[0_10px_36px_rgba(0,0,0,0.72),0_0_24px_rgba(201,235,85,0.08)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-tl from-[rgb(201,235,85)]/5 via-transparent to-transparent pointer-events-none" />
                <div className="relative z-10 flex items-start gap-4">
                  <div className="relative inline-flex items-center justify-center w-11 h-11 rounded-xl border border-[#C9EB55]/20 bg-[#C9EB55]/10 shrink-0">
                    <div className="absolute inset-0 bg-[rgb(201,235,85)]/14 rounded-xl blur-md" />
                    <item.icon className="w-5 h-5 text-[#C9EB55] relative z-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-white/70 text-sm leading-relaxed">{item.copy}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="text-center">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            className="relative overflow-hidden rounded-3xl border border-[#C9EB55]/22 bg-gradient-to-br from-[#0a0e10] via-[#050708] to-[#0a0e10] p-10 md:p-12 inline-block max-w-4xl shadow-[0_12px_48px_rgba(0,0,0,0.72),0_0_42px_rgba(201,235,85,0.12)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-tl from-[rgb(201,235,85)]/5 via-transparent to-transparent pointer-events-none" />
            <p className="text-white/85 text-lg md:text-2xl leading-relaxed">
              SUPERNOVA is being built to feel premium, stable, and trustworthy from the first impression to the final upgrade path.
            </p>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
