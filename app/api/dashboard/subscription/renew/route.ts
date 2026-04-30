import { NextResponse } from "next/server";
import { getDashboardUserIdFromRequest } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { applyRenewalDiscount, getRenewalQuote } from "@/lib/referralEngine";
import { getClientIp } from "@/lib/getClientIp";
import { assertAccountNotEmergencyLocked } from "@/lib/dashboardDb";

export async function GET(req: Request) {
  try {
    const userId = await getDashboardUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const ip = getClientIp(req);
    const rl = rateLimit(`${ip}:${userId}:dashboard-renew-quote`, {
      windowMs: 30_000,
      max: 30,
    });
    if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });

    const quote = await getRenewalQuote(userId);
    return NextResponse.json({ ok: true, quote });
  } catch (error) {
    console.error("[dashboard/subscription/renew][GET]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getDashboardUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const ip = getClientIp(req);
    const rl = rateLimit(`${ip}:${userId}:dashboard-renew-apply`, {
      windowMs: 60_000,
      max: 10,
    });
    if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });

    const lockCheck = await assertAccountNotEmergencyLocked(userId);
    if (!lockCheck.ok) {
      return NextResponse.json({ ok: false, error: lockCheck.error }, { status: lockCheck.status });
    }

    const applied = await applyRenewalDiscount(userId);
    return NextResponse.json({ ok: true, renewal: applied });
  } catch (error) {
    console.error("[dashboard/subscription/renew][POST]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
