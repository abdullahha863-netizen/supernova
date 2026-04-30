"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function HeaderVisibility({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const hideHeader = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  if (hideHeader) return null;

  return <div className="relative z-[100]">{children}</div>;
}
