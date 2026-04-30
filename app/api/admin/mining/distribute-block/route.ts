import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { distributePplnsBlockReward } from "@/lib/pplnsRewards";

type DistributeAcceptedBlockBody = {
  blockHash?: string;
  height?: number;
  grossReward?: number | string;
  foundAt?: string;
  acceptedByKaspaNode?: boolean;
  rewardSource?: string;
};

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as DistributeAcceptedBlockBody;
    if (body.acceptedByKaspaNode !== true) {
      return NextResponse.json(
        { ok: false, error: "Kaspa node acceptance is required before distribution" },
        { status: 409 },
      );
    }

    if (!body.blockHash || body.height === undefined || body.grossReward === undefined) {
      return NextResponse.json(
        { ok: false, error: "blockHash, height, and grossReward are required" },
        { status: 400 },
      );
    }

    const grossReward = Number(body.grossReward);
    if (!Number.isFinite(grossReward) || grossReward <= 0) {
      return NextResponse.json({ ok: false, error: "grossReward must be greater than 0" }, { status: 400 });
    }

    console.info("[kaspa] accepted block distribution requested", {
      blockHash: body.blockHash,
      height: body.height,
      grossReward: body.grossReward,
      foundAt: body.foundAt || null,
      rewardSource: body.rewardSource || "kaspa_node",
    });

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
    console.error("[admin/mining/distribute-block][POST]", error);
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
