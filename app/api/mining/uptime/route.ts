import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, safeJsonBody, safeResponseError, validateId, validateNonEmptyString } from "@/lib/apiHardening";
import { isAdminRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = enforceRateLimit(req, "mining:uptime-get", { windowMs: 60_000, max: 20 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(req.url);
  let userId: string;
  try {
    userId = validateId(searchParams.get("userId"), "userId");
  } catch (error) {
    return safeResponseError((error as Error).message);
  }

  try {
    const workers = (await prisma.minerWorker.findMany({
      where: { userId },
      orderBy: { lastShare: "desc" },
      select: {
        id: true,
        name: true,
        hashrate: true,
        status: true,
        lastShare: true,
        rejectRate: true,
      },
    })).map((worker) => ({
      id: worker.id,
      name: worker.name,
      hashrate: Number(worker.hashrate),
      status: worker.status,
      last_share: worker.lastShare,
      reject_rate: Number(worker.rejectRate),
    }));

    const now = Date.now();
    const onlineCount = workers.filter((w) => w.status === "online").length;
    const offlineCount = workers.filter((w) => w.status === "offline").length;
    const totalRejectRate =
      workers.length > 0 ? workers.reduce((s, w) => s + w.reject_rate, 0) / workers.length : 0;
    const errorsCount = workers.filter((w) => w.status === "error").length;

    // Uptime calculation: a worker is "online" if last_share was within last 10 minutes
    const ONLINE_THRESHOLD_MS = 10 * 60 * 1000;
    const activeWorkers = workers.filter(
      (w) => now - new Date(w.last_share).getTime() < ONLINE_THRESHOLD_MS
    );

    // Estimate uptime hours in last 24h, 7d, 30d from last_share timestamps
    // We probe oldest last_share to estimate total online hours (simplified model)
    const oldestShare = workers.reduce<Date | null>((oldest, w) => {
      const d = new Date(w.last_share);
      return oldest === null || d < oldest ? d : oldest;
    }, null);

    const ageMs = oldestShare ? now - oldestShare.getTime() : 0;
    const uptimeHours24 = Math.min(24, (ageMs / 3600000) * (activeWorkers.length / Math.max(1, workers.length)));
    const uptimeHours7d = Math.min(168, (ageMs / 3600000) * (activeWorkers.length / Math.max(1, workers.length)));
    const uptimeHours30d = Math.min(720, (ageMs / 3600000) * (activeWorkers.length / Math.max(1, workers.length)));

    // Disconnect count: workers that went offline recently
    const disconnects = workers.filter(
      (w) =>
        w.status === "offline" &&
        now - new Date(w.last_share).getTime() < 7 * 24 * 3600 * 1000
    ).length;

    // Total shares from Share model if available
    let sharesCount = 0;
    let rejectsCount = 0;
    try {
      const [totalShares, rejectedShares] = await Promise.all([
        prisma.share.count({ where: { userId } }),
        prisma.share.count({ where: { userId, accepted: false } }),
      ]);
      sharesCount = totalShares;
      rejectsCount = rejectedShares;
    } catch {
      // Share model may not be available during partial migrations.
    }

    return NextResponse.json({
      ok: true,
      workerCount: workers.length,
      onlineCount,
      offlineCount,
      avgRejectRate: totalRejectRate,
      uptimeHours24: parseFloat(uptimeHours24.toFixed(2)),
      uptimeHours7d: parseFloat(uptimeHours7d.toFixed(2)),
      uptimeHours30d: parseFloat(uptimeHours30d.toFixed(2)),
      disconnects,
      totalShares: sharesCount,
      rejects: rejectsCount,
      errors: errorsCount,
      workers,
    });
  } catch (err) {
    console.error("[mining/uptime][GET]", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rateLimitResponse = enforceRateLimit(req, "mining:uptime-post", { windowMs: 60_000, max: 20 });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = safeJsonBody(await req.json().catch(() => null));
    let userId: string;
    try {
      userId = validateId(body.userId, "userId");
    } catch (error) {
      return safeResponseError((error as Error).message);
    }
    const workerName = validateNonEmptyString(body.workerName, "workerName");
    const status = String(body.event === "disconnect" ? "offline" : "online");
    await prisma.minerWorker.upsert({
      where: {
        userId_name: {
          userId,
          name: workerName,
        },
      },
      update: {
        status,
        lastShare: new Date(),
      },
      create: {
        userId,
        name: workerName,
        hashrate: 0,
        status,
        lastShare: new Date(),
        rejectRate: 0,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[mining/uptime][POST]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
