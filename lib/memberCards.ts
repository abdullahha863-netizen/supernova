import { prisma } from "@/lib/prisma";

export type SafeMetalCard = {
  metalCardId: string;
  tier: string;
  status: string;
  activatedAt: Date | null;
};

export function publicMetalCardTier(value: string) {
  if (value === "Hash_Pro") return "Hash Pro";
  if (value === "Titan_Elite") return "Titan Elite";
  return value;
}

function toSafeMetalCard(card: SafeMetalCard): SafeMetalCard {
  return {
    metalCardId: card.metalCardId,
    tier: publicMetalCardTier(card.tier),
    status: card.status,
    activatedAt: card.activatedAt,
  };
}

export async function getActiveMetalCardForUser(userId: string) {
  const card = await prisma.memberCard.findFirst({
    where: {
      userId,
      status: "activated",
      revokedAt: null,
    },
    // If a user has multiple active cards, privileges follow the most recently activated one.
    orderBy: { activatedAt: "desc" },
    select: {
      metalCardId: true,
      tier: true,
      status: true,
      activatedAt: true,
    },
  });

  return card ? toSafeMetalCard(card) : null;
}

export async function userHasActiveMetalCard(userId: string) {
  const card = await prisma.memberCard.findFirst({
    where: {
      userId,
      status: "activated",
      revokedAt: null,
    },
    select: { id: true },
  });

  return Boolean(card);
}

export async function requireActiveMetalCard(userId: string) {
  const card = await getActiveMetalCardForUser(userId);
  if (!card) {
    throw new Error("Active Metal Card required");
  }

  return card;
}
