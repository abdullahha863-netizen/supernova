export const OPTIONAL_COOKIE_CATEGORIES = ["analytics", "marketing"] as const;

export type OptionalCookieCategory = (typeof OPTIONAL_COOKIE_CATEGORIES)[number];

// Keep the banner disabled until optional analytics or marketing cookies are actually introduced.
export const COOKIE_BANNER_ENABLED = false;

// Non-sensitive user preferences should live in localStorage. Use cookies only when the server
// must read the value during the request lifecycle.
export const PREFERENCE_STORAGE_GUIDANCE = {
  theme: "localStorage",
  language: "localStorage",
  filters: "localStorage",
} as const;