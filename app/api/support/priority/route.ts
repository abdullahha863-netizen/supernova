import { NextResponse } from "next/server";
import { getUserIdFromRequestSession } from "@/lib/auth";
import { getClientIp } from "@/lib/getClientIp";
import { requireActiveMetalCard } from "@/lib/memberCards";
import { rateLimit } from "@/lib/rateLimit";

function normalizeText(value: unknown, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

export async function POST(req: Request) {
  const userId = await getUserIdFromRequestSession(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`${getClientIp(req)}:${userId}:support-priority-post`, {
    windowMs: 15 * 60_000,
    max: 10,
  });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  }

  try {
    const card = await requireActiveMetalCard(userId);
    const body = await req.json().catch(() => null);
    const subject = normalizeText(body?.subject, 160);
    const message = normalizeText(body?.message, 5000);

    if (!subject) {
      return NextResponse.json({ ok: false, error: "subject is required." }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ ok: false, error: "message is required." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: "Priority support request received.",
      priority: "high",
      cardTier: card.tier,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Active Metal Card required") {
      return NextResponse.json(
        { ok: false, error: "Priority Support requires an active Metal Card." },
        { status: 403 },
      );
    }

    console.error("[support/priority][POST]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
