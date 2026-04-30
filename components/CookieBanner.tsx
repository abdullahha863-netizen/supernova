"use client";

import { COOKIE_BANNER_ENABLED, OPTIONAL_COOKIE_CATEGORIES } from "@/lib/cookieConsent";

export default function CookieBanner() {
  if (!COOKIE_BANNER_ENABLED) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 rounded-2xl border border-[#C9EB55]/20 bg-[#050607]/95 p-4 text-sm text-white shadow-[0_16px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl">
      <p className="font-semibold uppercase tracking-[0.12em] text-[#C9EB55]">Cookie Notice</p>
      <p className="mt-2 leading-6 text-white/75">
        Optional {OPTIONAL_COOKIE_CATEGORIES.join(" and ")} cookies are disabled by default until they are added to the platform.
      </p>
    </div>
  );
}