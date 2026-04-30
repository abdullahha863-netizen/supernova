import { notFound } from "next/navigation";

import { isPricingTierSlug, pricingTierConfig, pricingTierSlugs } from "../pricing-data";

type PricingTierPageProps = {
  params: Promise<{ tier: string }>;
};

export function generateStaticParams() {
  return pricingTierSlugs.map((tier) => ({ tier }));
}

export default async function PricingTierPage({ params }: PricingTierPageProps) {
  const { tier } = await params;

  if (!isPricingTierSlug(tier)) {
    notFound();
  }

  const TierComponent = pricingTierConfig[tier].component;

  return <TierComponent />;
}
