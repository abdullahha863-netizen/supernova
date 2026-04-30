import { NextResponse } from "next/server";
import { getDashboardUserIdFromRequest } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboardDb";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";

export async function GET(req: Request) {
  try {
    const userId = await getDashboardUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(`${getClientIp(req)}:${userId}:dashboard-overview`, {
      windowMs: 30_000,
      max: 30,
    });
    if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

    const overview = await getDashboardOverview(userId);
    return NextResponse.json({ ok: true, overview }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[dashboard/overview]", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}


