"use client";

import React from "react";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id: string;
}

export default function Input({ label, id, className = "", ...props }: Props) {
  return (
    <div className="flex flex-col">
      {label && (
        <label htmlFor={id} className="text-sm text-white/70 mb-2">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-4 py-3 rounded-lg bg-white/6 text-white placeholder-white/40 border border-[#C6E65A]/20 focus:outline-none focus:border-[#C9EB55] focus:ring-1 focus:ring-[#C9EB55]/30 ${className}`}
        {...props}
      />
    </div>
  );
}
