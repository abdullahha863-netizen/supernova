import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { getClientIp } from "@/lib/getClientIp";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

type WorkerStatus = "online" | "offline" | "warning";

export async function GET(req: NextRequest) {
  const rl = rateLimit(`${getClientIp(req)}:admin-workers-get`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });

  if (process.env.NODE_ENV === "production" && !isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await prisma.minerWorker.findMany({
      where: {},
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        name: true,
        hashrate: true,
        status: true,
        lastShare: true,
        rejectRate: true,
        createdAt: true,
      },
    });

    const workers = rows.map((worker) => ({
      id: String(worker.id),
      userId: worker.userId,
      name: worker.name,
      hashrate: Number(worker.hashrate),
      status: worker.status as WorkerStatus,
      lastShare: worker.lastShare.toISOString(),
      rejectRate: Number(worker.rejectRate),
      createdAt: worker.createdAt.toISOString(),
    }));

    const totalWorkers = rows.length;
    const onlineWorkers = rows.filter((worker) => worker.status === "online").length;
    const warningOffline = rows.filter((worker) => worker.status !== "online").length;

    return NextResponse.json({
      ok: true,
      overview: {
        workers,
        summary: {
          onlineWorkers,
          totalWorkers,
          warningOffline,
        },
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin/workers][GET]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
