import { NextResponse } from "next/server";
import { getUserIdFromRequestSession } from "@/lib/auth";
import { getClientIp } from "@/lib/getClientIp";
import { rateLimit } from "@/lib/rateLimit";
import { getSmartLimitsForUser } from "@/lib/smartLimits";

export async function GET(req: Request) {
  const userId = await getUserIdFromRequestSession(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`${getClientIp(req)}:${userId}:member-smart-limits-status`, {
    windowMs: 30_000,
    max: 30,
  });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  }

  try {
    const smartLimits = await getSmartLimitsForUser(userId);

    return NextResponse.json(
      {
        ok: true,
        maxWorkers: smartLimits.maxWorkers,
        apiTier: smartLimits.apiTier,
        monitoring: smartLimits.monitoring,
        label: smartLimits.label,
        cardTier: smartLimits.cardTier,
        source: smartLimits.source,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[member/smart-limits/status][GET]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
