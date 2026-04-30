import { NextRequest, NextResponse } from "next/server";
import amqp from "amqplib";
import { isAdminRequest } from "@/lib/adminAuth";

const QUEUE = process.env.MINING_SHARE_QUEUE || "mining.share.submit.v1";
const MINING_RUNTIME_METRICS_ENABLED = process.env.ENABLE_MINING_RUNTIME_METRICS === "true";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!MINING_RUNTIME_METRICS_ENABLED) {
    return NextResponse.json({
      ok: true,
      enabled: false,
      status: "disabled",
      queue: QUEUE,
      messages: 0,
      consumers: 0,
      at: new Date().toISOString(),
      message: "Queue monitoring is disabled during build stage.",
    });
  }

  const url = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

  let conn: amqp.ChannelModel | null = null;
  let ch: amqp.Channel | null = null;

  try {
    conn = await amqp.connect(url);
    ch = await conn.createChannel();
    const info = await ch.checkQueue(QUEUE);

    return NextResponse.json({
      ok: true,
      enabled: true,
      status: info.consumerCount === 0 && info.messageCount > 0
        ? "no-consumers"
        : info.messageCount > 500
          ? "backlogged"
          : "healthy",
      queue: info.queue,
      messages: info.messageCount,
      consumers: info.consumerCount,
      at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        enabled: true,
        status: "unavailable",
        queue: QUEUE,
        messages: 0,
        consumers: 0,
        at: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Queue unavailable",
      },
      { status: 503 },
    );
  } finally {
    if (ch) await ch.close().catch(() => undefined);
    if (conn) await conn.close().catch(() => undefined);
  }
}
