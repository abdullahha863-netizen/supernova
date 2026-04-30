import { NextResponse } from "next/server";
import { getUserIdFromRequestSession } from "@/lib/auth";
import { getClientIp } from "@/lib/getClientIp";
import { getPayoutPriorityForUser } from "@/lib/payoutPriority";
import { rateLimit } from "@/lib/rateLimit";

export async function GET(req: Request) {
  const userId = await getUserIdFromRequestSession(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`${getClientIp(req)}:${userId}:member-payout-priority-status`, {
    windowMs: 30_000,
    max: 30,
  });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  }

  try {
    const payoutPriority = await getPayoutPriorityForUser(userId);

    return NextResponse.json(
      {
        ok: true,
        priority: payoutPriority.priority,
        label: payoutPriority.label,
        estimatedReview: payoutPriority.estimatedReview,
        cardTier: payoutPriority.cardTier,
        source: payoutPriority.source,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[member/payout-priority/status][GET]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
