import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { distributePplnsBlockReward } from "@/lib/pplnsRewards";

type DistributeTestBlockBody = {
  blockHash?: string;
  height?: number;
  grossReward?: number | string;
  foundAt?: string;
};

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Test block distribution is disabled in production" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as DistributeTestBlockBody;
    if (!body.blockHash || body.height === undefined || body.grossReward === undefined) {
      return NextResponse.json(
        { ok: false, error: "blockHash, height, and grossReward are required" },
        { status: 400 },
      );
    }

    const result = await distributePplnsBlockReward({
      blockHash: body.blockHash,
      height: body.height,
      grossReward: body.grossReward,
      foundAt: body.foundAt,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("No accepted shares") || message.includes("grossReward") ? 400 : 500;
    console.error("[admin/mining/distribute-test-block][POST]", error);
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
