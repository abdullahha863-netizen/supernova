import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, safeJsonBody, safeResponseError, validateId, validateNonEmptyString, validateNonNegativeInt } from "@/lib/apiHardening";
import { isAdminRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = enforceRateLimit(req, "mining:hashrate-get", { windowMs: 60_000, max: 20 });
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
      orderBy: { hashrate: "desc" },
      select: {
        name: true,
        hashrate: true,
        status: true,
        lastShare: true,
      },
    })).map((worker) => ({
      name: worker.name,
      hashrate: Number(worker.hashrate),
      status: worker.status,
      last_share: worker.lastShare,
    }));

    const currentHashrate = workers
      .filter((w) => w.status === "online" || w.status === "warning")
      .reduce((sum, w) => sum + (w.hashrate || 0), 0);

    return NextResponse.json({ ok: true, currentHashrate, workers });
  } catch (error) {
    console.error("[mining/hashrate][GET]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rateLimitResponse = enforceRateLimit(req, "mining:hashrate-post", { windowMs: 60_000, max: 20 });
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
    const hashrate = validateNonNegativeInt(body.hashrate ?? 0, "hashrate");
    const status = String(body.event === "disconnect" ? "offline" : "online");

    await prisma.minerWorker.upsert({
      where: {
        userId_name: {
          userId,
          name: workerName,
        },
      },
      update: {
        hashrate: Math.max(0, hashrate),
        status,
        lastShare: new Date(),
      },
      create: {
        userId,
        name: workerName,
        hashrate: Math.max(0, hashrate),
        status,
        lastShare: new Date(),
        rejectRate: 0,
      },
    });

    const activeWorkers = await prisma.minerWorker.findMany({
      where: {
        userId,
        status: { in: ["online", "warning"] },
      },
      select: { hashrate: true },
    });
    const totalHashrate = activeWorkers.reduce((sum, worker) => sum + Number(worker.hashrate), 0);

    await prisma.minerProfile.updateMany({
      where: { userId },
      data: { totalHashrate },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[mining/hashrate][POST]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
