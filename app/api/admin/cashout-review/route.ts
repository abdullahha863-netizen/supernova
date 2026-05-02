import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { enforceRateLimit } from "@/lib/apiHardening";
import { fetchCashoutReviewListData } from "@/lib/admin/cashoutReviewListData";
import { deriveCashoutReviewList } from "@/lib/admin/cashoutReviewListBusiness";
import { mapCashoutReviewListToPayload } from "@/lib/admin/cashoutReviewListPresentation";
import { buildMinerCashoutMonitorFallbackPayload } from "@/lib/admin/minerCashoutMonitor";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = enforceRateLimit(req, "admin:cashout-review", { windowMs: 60_000, max: 15 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const rawData = await fetchCashoutReviewListData();
    const businessResult = deriveCashoutReviewList(rawData);
    const payload = mapCashoutReviewListToPayload(businessResult);

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[admin/cashout-review][GET]", error);
    return NextResponse.json(buildMinerCashoutMonitorFallbackPayload());
  }
}
