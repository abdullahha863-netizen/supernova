import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { markPplnsBlockOrphaned } from "@/lib/pplnsRewards";

type MarkOrphanBody = {
  blockHash?: string;
};

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as MarkOrphanBody;
    const block = await markPplnsBlockOrphaned(body.blockHash || "");

    return NextResponse.json({
      ok: true,
      blockHash: block.blockHash,
      status: block.status,
      reversalApplied: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("not found") ? 404 : message.includes("required") ? 400 : 500;
    console.error("[admin/mining/blocks/orphan][POST]", error);
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
