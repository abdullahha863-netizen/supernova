import { getActiveMetalCardForUser } from "@/lib/memberCards";

export type SmartLimitsStatus = {
  maxWorkers: number;
  apiTier: "standard" | "enhanced" | "pro" | "elite";
  monitoring: "basic" | "priority" | "advanced" | "vip";
  label: string;
  cardTier: string | null;
  source: "metal_card" | "base";
};

export async function getSmartLimitsForUser(userId: string): Promise<SmartLimitsStatus> {
  const card = await getActiveMetalCardForUser(userId);
  if (!card) {
    return {
      maxWorkers: 20,
      apiTier: "standard",
      monitoring: "basic",
      label: "Standard Limits",
      cardTier: null,
      source: "base",
    };
  }

  if (card.tier === "Titan Elite") {
    return {
      maxWorkers: 250,
      apiTier: "elite",
      monitoring: "vip",
      label: "Titan Elite Smart Limits",
      cardTier: card.tier,
      source: "metal_card",
    };
  }

  if (card.tier === "Hash Pro") {
    return {
      maxWorkers: 100,
      apiTier: "pro",
      monitoring: "advanced",
      label: "Hash Pro Smart Limits",
      cardTier: card.tier,
      source: "metal_card",
    };
  }

  return {
    maxWorkers: 50,
    apiTier: "enhanced",
    monitoring: "priority",
    label: "Silver Smart Limits",
    cardTier: card.tier,
    source: "metal_card",
  };
}
