import { getActiveMetalCardForUser } from "@/lib/memberCards";

export type PayoutPriorityStatus = {
  priority: "standard" | "priority" | "high_priority" | "vip";
  label: string;
  estimatedReview: string;
  cardTier: string | null;
  source: "metal_card" | "base";
};

export async function getPayoutPriorityForUser(userId: string): Promise<PayoutPriorityStatus> {
  const card = await getActiveMetalCardForUser(userId);
  if (!card) {
    return {
      priority: "standard",
      label: "Standard Payout Review",
      estimatedReview: "Standard queue",
      cardTier: null,
      source: "base",
    };
  }

  if (card.tier === "Titan Elite") {
    return {
      priority: "vip",
      label: "VIP Payout Review",
      estimatedReview: "Fastest review queue",
      cardTier: card.tier,
      source: "metal_card",
    };
  }

  if (card.tier === "Hash Pro") {
    return {
      priority: "high_priority",
      label: "High Priority Payout Review",
      estimatedReview: "High-priority review queue",
      cardTier: card.tier,
      source: "metal_card",
    };
  }

  return {
    priority: "priority",
    label: "Priority Payout Review",
    estimatedReview: "Faster review queue",
    cardTier: card.tier,
    source: "metal_card",
  };
}
