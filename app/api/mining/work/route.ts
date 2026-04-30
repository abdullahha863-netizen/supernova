import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, safeResponseError, validateId } from "@/lib/apiHardening";
import { getSessionSubject, verifySession } from "@/lib/jwt";
import { miningPrisma } from "@/lib/miningPrisma";
import { getRedis } from "@/lib/redis";
import { issuePowJob } from "@/lib/miningPow";

export async function GET(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { ok: false, error: "Real Kaspa RPC work issuance is required in production" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    let minerId: string;
    try {
      minerId = validateId(searchParams.get("minerId"), "minerId");
    } catch (error) {
      return safeResponseError((error as Error).message);
    }
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization") || "";
    const bearerToken = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
    const token = bearerToken || String(request.headers.get("x-miner-token") || "").trim();

    if (!minerId || !token) {
      return NextResponse.json(
        { ok: false, error: "minerId and Authorization: Bearer <token> are required" },
        { status: 400 }
      );
    }

    const rateLimitResponse = enforceRateLimit(request, "mining:work", { windowMs: 60_000, max: 30 });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const decoded = verifySession(token);
    const userId = getSessionSubject(decoded);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Invalid or expired token" }, { status: 401 });
    }

    const miner = await miningPrisma.miner.findFirst({
      where: { id: minerId, userId },
      select: { id: true, difficulty: true },
    });

    if (!miner) {
      return NextResponse.json({ ok: false, error: "Miner not found or unauthorized" }, { status: 404 });
    }

    const redis = getRedis();
    const job = await issuePowJob(redis, {
      userId,
      minerId: miner.id,
      difficulty: Number(miner.difficulty || 1),
      ttlSec: 90,
    });

    return NextResponse.json({
      ok: true,
      algorithm: "sha256-v1",
      jobId: job.jobId,
      salt: job.salt,
      targetHex: job.targetHex,
      difficulty: job.difficulty,
      expiresAt: job.expiresAt,
    });
  } catch (error) {
    console.error("[mining/work][GET]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
