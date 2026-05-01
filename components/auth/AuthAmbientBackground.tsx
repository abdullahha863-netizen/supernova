"use client";

import { motion } from "framer-motion";

type AmbientPoint = {
  left: string;
  top: string;
  duration: number;
  delay: number;
};

const ambientDots: AmbientPoint[] = Array.from({ length: 56 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  top: `${(i * 53 + 17) % 100}%`,
  duration: 5 + (i % 9),
  delay: (i * 0.37) % 8,
}));

const ambientStars: AmbientPoint[] = Array.from({ length: 44 }, (_, i) => ({
  left: `${(i * 41 + 7) % 100}%`,
  top: `${(i * 29 + 23) % 100}%`,
  duration: 2 + (i % 4),
  delay: (i * 0.23) % 5,
}));

export default function AuthAmbientBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1f2e,_#0a0a0f)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(201,235,85,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(201,235,85,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      {ambientDots.map((dot, i) => (
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

      {ambientStars.map((star, i) => (
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
    </div>
  );
}
