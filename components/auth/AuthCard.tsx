"use client";

import React from "react";

export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative w-full rounded-2xl p-[1px] bg-gradient-to-b from-[#C9EB55] via-[#C9EB55]/15 to-transparent shadow-[0_0_60px_-15px_rgba(201,235,85,0.5)]">
        <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-[#C9EB55] to-transparent shadow-[0_0_20px_#C9EB55] opacity-90" />
        <div className="rounded-2xl bg-black/90 backdrop-blur-xl p-8 shadow-[inset_0_1px_0_rgba(201,235,85,0.1)]">
          <header className="mb-8 text-center relative">
            <h1 className="text-3xl font-bold tracking-wider text-[#C9EB55] drop-shadow-[0_0_20px_rgba(201,235,85,0.4)]">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-white/50 mt-1">{subtitle}</p>
            )}
          </header>

          {children}

          <div className="mt-6 text-center text-xs text-white/30">
            &copy; snovapool.io
          </div>
        </div>
      </div>
    </div>
  );
}
