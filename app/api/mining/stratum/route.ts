import { NextResponse } from "next/server";
import { getStratumMetrics } from "@/lib/miningMetricsView";

export const dynamic = "force-dynamic";

const MINING_RUNTIME_METRICS_ENABLED = process.env.ENABLE_MINING_RUNTIME_METRICS === "true";

export async function GET() {
  if (!MINING_RUNTIME_METRICS_ENABLED) {
    return NextResponse.json({
      ok: true,
      enabled: false,
      status: "disabled",
      source: "stratum",
      counters: {},
      latency: {},
      errors: 0,
      throughputPerSec: 0,
      connections: 0,
      connectionsOpened: 0,
      connectionsClosed: 0,
      activeConnectionsEstimate: 0,
      at: new Date().toISOString(),
      message: "Stratum runtime metrics are disabled during build stage.",
    });
  }

  try {
    const metrics = await getStratumMetrics();
    return NextResponse.json({ ok: true, enabled: true, ...metrics, at: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false, error: "Stratum metrics unavailable" }, { status: 503 });
  }
}
