import { NextResponse } from "next/server";
import { getUserIdFromRequestSession } from "@/lib/auth";
import { getClientIp } from "@/lib/getClientIp";
import { rateLimit } from "@/lib/rateLimit";
import { getWorkerLimitStatusForUser } from "@/lib/workerLimits";

export async function GET(req: Request) {
  const userId = await getUserIdFromRequestSession(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`${getClientIp(req)}:${userId}:member-worker-limits-status`, {
    windowMs: 30_000,
    max: 30,
  });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  }

  try {
    const workerLimits = await getWorkerLimitStatusForUser(userId);

    return NextResponse.json(
      {
        ok: true,
        currentWorkers: workerLimits.currentWorkers,
        maxWorkers: workerLimits.maxWorkers,
        canCreate: workerLimits.canCreate,
        source: workerLimits.source,
        cardTier: workerLimits.cardTier,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[member/worker-limits/status][GET]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
