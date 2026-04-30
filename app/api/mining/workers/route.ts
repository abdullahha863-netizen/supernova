import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, safeJsonBody, safeResponseError, validateId, validateNonEmptyString, validateNonNegativeInt } from "@/lib/apiHardening";
import { isAdminRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { updateMiningAbuseStatsWithClient } from "@/services/shared/mining-abuse-core.mjs";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = enforceRateLimit(req, "mining:workers-get", { windowMs: 60_000, max: 20 });
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

    return NextResponse.json({ ok: true, workers });
  } catch (error) {
    console.error("[mining/workers][GET]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rateLimitResponse = enforceRateLimit(req, "mining:workers-post", { windowMs: 60_000, max: 20 });
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
    const event = String(body.event || "").trim();

    const nextStatus = event === "disconnect" ? "offline" : event === "share_rejected" ? "warning" : "online";
    const hashrate = validateNonNegativeInt(body.hashrate ?? 0, "hashrate");

    await prisma.minerWorker.upsert({
      where: {
        userId_name: {
          userId,
          name: workerName,
        },
      },
      update: {
        status: nextStatus,
        hashrate: Math.max(0, hashrate),
        lastShare: new Date(),
      },
      create: {
        userId,
        name: workerName,
        hashrate: Math.max(0, hashrate),
        status: nextStatus,
        lastShare: new Date(),
        rejectRate: 0,
      },
    });

    if (event === "share_rejected") {
      await updateMiningAbuseStatsWithClient(prisma, {
        userId,
        accepted: false,
        logger: console,
      });

      await prisma.securityEvent.create({
        data: {
          userId,
          eventType: "stratum_share_rejected",
          success: false,
          reason: String(body?.reason || "rejected"),
          ip: String(body?.sourceIp || "stratum"),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[mining/workers][POST]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
