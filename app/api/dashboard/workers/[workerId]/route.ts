import { NextResponse } from "next/server";
import { getDashboardUserIdFromRequest } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { deleteWorker, pauseWorker, renameWorker } from "@/lib/dashboardDb";
import { getClientIp } from "@/lib/getClientIp";

export async function PATCH(req: Request, context: { params: Promise<{ workerId: string }> }) {
  try {
    const userId = await getDashboardUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const ip = getClientIp(req);
    const rl = rateLimit(`${ip}:${userId}:dashboard-worker-rename`, {
      windowMs: 60_000,
      max: 20,
    });
    if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });

    const body = (await req.json().catch(() => null)) as { action?: string; name?: string } | null;
    const name = String(body?.name || "");

    const { workerId } = await context.params;
    const result = body?.action === "pause" || body?.action === "disable"
      ? await pauseWorker(userId, Number(workerId))
      : await renameWorker(userId, Number(workerId), name);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[dashboard/workers/:workerId]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ workerId: string }> }) {
  try {
    const userId = await getDashboardUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const ip = getClientIp(req);
    const rl = rateLimit(`${ip}:${userId}:dashboard-worker-delete`, {
      windowMs: 60_000,
      max: 20,
    });
    if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });

    const { workerId } = await context.params;
    const result = await deleteWorker(userId, Number(workerId));

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[dashboard/workers/:workerId DELETE]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
