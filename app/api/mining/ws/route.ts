import { NextResponse } from "next/server";
import { getSourceMetrics } from "@/lib/miningMetricsView";

export const dynamic = "force-dynamic";

const MINING_RUNTIME_METRICS_ENABLED = process.env.ENABLE_MINING_RUNTIME_METRICS === "true";

export async function GET() {
  if (!MINING_RUNTIME_METRICS_ENABLED) {
    return NextResponse.json({
      ok: true,
      enabled: false,
      status: "disabled",
      source: "websocket",
      counters: {},
      latency: {},
      errors: 0,
      throughputPerSec: 0,
      connections: 0,
      connectionsOpened: 0,
      connectionsClosed: 0,
      activeConnectionsEstimate: 0,
      at: new Date().toISOString(),
      message: "WebSocket runtime metrics are disabled during build stage.",
    });
  }

  try {
    const metrics = await getSourceMetrics("websocket");
    return NextResponse.json({ ok: true, enabled: true, ...metrics, at: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false, error: "WebSocket metrics unavailable" }, { status: 503 });
  }
}
