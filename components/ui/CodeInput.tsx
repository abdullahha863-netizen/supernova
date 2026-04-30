"use client";

import React from "react";

export default function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      inputMode="numeric"
      pattern="[0-9]*"
      className="w-full text-center tracking-widest text-lg px-4 py-3 rounded-lg bg-white/6 text-white placeholder-white/40 border border-[#C6E65A]/20 focus:outline-none focus:border-[#C9EB55] focus:ring-1 focus:ring-[#C9EB55]/30"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
      maxLength={6}
      aria-label="Authentication code"
    />
  );
}
