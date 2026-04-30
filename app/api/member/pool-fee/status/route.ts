import { NextResponse } from "next/server";
import { getUserIdFromRequestSession } from "@/lib/auth";
import { getClientIp } from "@/lib/getClientIp";
import { getEffectivePoolFeeForUser } from "@/lib/poolFees";
import { rateLimit } from "@/lib/rateLimit";

export async function GET(req: Request) {
  const userId = await getUserIdFromRequestSession(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`${getClientIp(req)}:${userId}:member-pool-fee-status`, {
    windowMs: 30_000,
    max: 30,
  });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  }

  try {
    const feeStatus = await getEffectivePoolFeeForUser(userId);

    return NextResponse.json(
      {
        ok: true,
        baseFee: feeStatus.baseFee,
        discount: feeStatus.discount,
        effectiveFee: feeStatus.effectiveFee,
        source: feeStatus.source,
      },
      // Fee status affects privilege display and should not be cached.
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[member/pool-fee/status][GET]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
