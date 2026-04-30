import { NextResponse } from "next/server";
import { getDashboardUserIdFromRequest } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { createWorker } from "@/lib/dashboardDb";
import { getClientIp } from "@/lib/getClientIp";

export async function POST(req: Request) {
  try {
    const userId = await getDashboardUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const ip = getClientIp(req);
    const rl = rateLimit(`${ip}:${userId}:dashboard-worker-create`, {
      windowMs: 60_000,
      max: 20,
    });
    if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });

    const body = (await req.json().catch(() => null)) as { name?: string; description?: string } | null;
    const name = String(body?.name || "");
    const description = typeof body?.description === "string" ? body.description : "";

    const result = await createWorker(userId, name, description);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({ ok: true, ...result.worker }, { status: 201 });
  } catch (error) {
    console.error("[dashboard/workers][POST]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
