import type { ComponentType } from "react";

import HashProUpgradePage from "./_tiers/HashProUpgradePage";
import SilverUpgradePage from "./_tiers/SilverUpgradePage";
import StarterTierPage from "./_tiers/StarterTierPage";
import TitanElitePage from "./_tiers/TitanElitePage";

export const pricingTierSlugs = ["starter", "silver", "hash-pro", "titan-elite"] as const;

export type PricingTierSlug = (typeof pricingTierSlugs)[number];

type PricingTierConfigEntry = {
  component: ComponentType;
};

export const pricingTierConfig: Record<PricingTierSlug, PricingTierConfigEntry> = {
  starter: { component: StarterTierPage },
  silver: { component: SilverUpgradePage },
  "hash-pro": { component: HashProUpgradePage },
  "titan-elite": { component: TitanElitePage },
};

export function isPricingTierSlug(value: string): value is PricingTierSlug {
  return pricingTierSlugs.includes(value as PricingTierSlug);
}
