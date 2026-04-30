import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { getRedis } from "@/lib/redis";
import { ensureMiningQueueReady } from "@/lib/miningQueue";
import { prisma } from "@/lib/prisma";

const MINING_RUNTIME_METRICS_ENABLED = process.env.ENABLE_MINING_RUNTIME_METRICS === "true";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({
      status: "ok",
      at: new Date().toISOString(),
    });
  }

  if (!MINING_RUNTIME_METRICS_ENABLED) {
    return NextResponse.json({
      status: "disabled",
      enabled: false,
      checks: {
        redis: false,
        rabbitmq: false,
      },
      at: new Date().toISOString(),
      message: "Mining health checks are disabled during build stage.",
    });
  }

  const checks = {
    redis: false,
    rabbitmq: false,
  };

  try {
    const redis = getRedis();
    await redis.ping();
    checks.redis = true;
  } catch {
    checks.redis = false;
  }

  try {
    await ensureMiningQueueReady();
    checks.rabbitmq = true;
  } catch {
    checks.rabbitmq = false;
  }

  const healthy = checks.redis && checks.rabbitmq;

  if (!healthy) {
    const degradedServices = [
      checks.redis ? null : "Redis",
      checks.rabbitmq ? null : "RabbitMQ",
    ].filter(Boolean).join(", ");

    const recentNotification = await prisma.notification.findFirst({
      where: {
        type: "system_degraded",
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });

    if (!recentNotification) {
      await prisma.notification.create({
        data: {
          type: "system_degraded",
          title: "System Health Alert",
          message: `One or more services are degraded: ${degradedServices}`,
          severity: "critical",
          link: "/admin/dashboard/system-health",
        },
      });
    }
  }

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      enabled: true,
      checks,
      at: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
