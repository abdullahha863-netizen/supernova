import { NextResponse } from "next/server";
import { getUserIdFromRequestSession } from "@/lib/auth";
import { getClientIp } from "@/lib/getClientIp";
import { getActiveMetalCardForUser } from "@/lib/memberCards";
import { rateLimit } from "@/lib/rateLimit";

function toResponseCard(card: Awaited<ReturnType<typeof getActiveMetalCardForUser>>) {
  if (!card) return null;

  return {
    metalCardId: card.metalCardId,
    tier: card.tier,
    status: card.status,
    activatedAt: card.activatedAt ? card.activatedAt.toISOString() : null,
  };
}

export async function GET(req: Request) {
  const userId = await getUserIdFromRequestSession(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`${getClientIp(req)}:${userId}:member-metal-card-status`, {
    windowMs: 30_000,
    max: 30,
  });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  }

  try {
    const card = await getActiveMetalCardForUser(userId);

    return NextResponse.json(
      {
        ok: true,
        hasActiveMetalCard: Boolean(card),
        card: toResponseCard(card),
      },
      // Card status controls privileges, so this response must not be cached.
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[member/metal-card/status][GET]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
