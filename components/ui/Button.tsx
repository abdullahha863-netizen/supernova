"use client";

import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export default function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: Props) {
  const base = "w-full py-3 rounded-lg font-semibold transition focus-ring";
  const variants =
    variant === "primary"
      ? "bg-[#C9EB55] text-black shadow-[0_0_20px_rgba(201,235,85,0.25)] hover:shadow-[0_0_35px_rgba(201,235,85,0.45)]"
      : "bg-transparent text-white/85 border border-white/8";

  return (
    <button className={`${base} ${variants} ${className}`} {...props}>
      {children}
    </button>
  );
}
