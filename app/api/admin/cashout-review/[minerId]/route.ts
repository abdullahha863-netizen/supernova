import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { enforceRateLimit, safeResponseError, validateId, validateNonNegativeInt } from "@/lib/apiHardening";
import { deriveCashoutReviewDetail } from "@/lib/admin/cashoutReviewDetailBusiness";
import { fetchCashoutReviewDetailData } from "@/lib/admin/cashoutReviewDetailData";
import { mapCashoutReviewDetailToPayload } from "@/lib/admin/cashoutReviewDetailPresentation";

export async function GET(req: NextRequest, { params }: { params: Promise<{ minerId: string }> }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = enforceRateLimit(req, "admin:cashout-review-detail", { windowMs: 60_000, max: 15 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { minerId } = await params;
  let minerIdValue: string;
  try {
    minerIdValue = validateId(minerId, "minerId");
  } catch (error) {
    return safeResponseError((error as Error).message);
  }

  const { searchParams } = new URL(req.url);
  let selectedPayoutId: number;
  try {
    selectedPayoutId = validateNonNegativeInt(searchParams.get("payoutId") || "0", "payoutId");
  } catch (error) {
    return safeResponseError((error as Error).message);
  }

  try {
    const rawData = await fetchCashoutReviewDetailData(minerIdValue);

    if (!rawData.user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    const detail = deriveCashoutReviewDetail(rawData, selectedPayoutId);
    const payload = mapCashoutReviewDetailToPayload(detail);

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[admin/cashout-review/[minerId]][GET]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
