import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { getMetricsSnapshot, toPrometheusText } from "@/lib/miningMetrics";

export const dynamic = "force-dynamic";
const MINING_RUNTIME_METRICS_ENABLED = process.env.ENABLE_MINING_RUNTIME_METRICS === "true";

/**
 * GET /api/mining/metrics
 *
 * Returns live mining metrics.
 * - Accept: text/plain  → Prometheus text format (0.0.4)
 * - Default            → JSON snapshot
 *
 * Requires Redis.  Returns 503 if Redis is unavailable.
 */
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!MINING_RUNTIME_METRICS_ENABLED) {
    return NextResponse.json({
      ok: true,
      enabled: false,
      generatedAt: new Date().toISOString(),
      counters: {},
      latency: {},
      message: "Mining metrics are disabled during build stage.",
    });
  }

  try {
    const snapshot = await getMetricsSnapshot();
    const accept = request.headers.get("accept") ?? "";

    if (accept.includes("text/plain")) {
      return new NextResponse(toPrometheusText(snapshot), {
        headers: {
          "content-type": "text/plain; version=0.0.4; charset=utf-8",
        },
      });
    }

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      ...snapshot,
    });
  } catch {
    return NextResponse.json(
      { error: "Metrics unavailable — is Redis running?" },
      { status: 503 },
    );
  }
}
