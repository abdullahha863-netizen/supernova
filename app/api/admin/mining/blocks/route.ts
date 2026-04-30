import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const blocks = await prisma.poolBlock.findMany({
      orderBy: [{ foundAt: "desc" }, { height: "desc" }],
      take: 100,
      select: {
        blockHash: true,
        height: true,
        grossReward: true,
        status: true,
        foundAt: true,
        distributedAt: true,
        distributions: {
          select: {
            netReward: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      blocks: blocks.map((block) => ({
        blockHash: block.blockHash,
        height: block.height,
        grossReward: Number(block.grossReward),
        status: block.status,
        foundAt: block.foundAt.toISOString(),
        distributedAt: block.distributedAt?.toISOString() || null,
        usersPaid: block.distributions.length,
        totalDistributedNetReward: block.distributions.reduce((sum, row) => sum + Number(row.netReward), 0),
      })),
    });
  } catch (error) {
    console.error("[admin/mining/blocks][GET]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
