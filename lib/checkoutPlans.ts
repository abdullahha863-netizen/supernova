export const CHECKOUT_PLANS = {
  silver: {
    title: "Silver",
    firstPaymentUsd: 112.99,
    renewalUsd: 14.99,
    renewalLabel: "Renewal (Every 3 Months)",
    fee: "3.2%",
    supportWindow: "10-24 hours",
    summary: "Advanced monitoring, Scout AI coverage, and faster support for growing miners.",
    currency: "USD",
  },
  "hash-pro": {
    title: "Hash Pro",
    firstPaymentUsd: 134.99,
    renewalUsd: 34.99,
    renewalLabel: "Renewal (Every 3 Months)",
    fee: "2.4%",
    supportWindow: "6-12 hours",
    summary: "Premium operational visibility, stronger protection awareness, and VIP member positioning.",
    currency: "USD",
  },
  "titan-elite": {
    title: "Titan Elite",
    firstPaymentUsd: 182.99,
    renewalUsd: 79.99,
    renewalLabel: "Renewal (After First Year)",
    fee: "1.3%",
    supportWindow: "1-6 hours",
    summary: "Top-tier performance, priority support, and the strongest access level in SUPERNOVA.",
    currency: "USD",
  },
} as const;

export type TierKey = keyof typeof CHECKOUT_PLANS;

export function normalizeTier(raw: unknown): TierKey | null {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "silver" || value === "hash-pro" || value === "titan-elite") {
    return value;
  }
  return null;
}
