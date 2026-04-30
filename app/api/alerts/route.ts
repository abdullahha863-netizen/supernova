import { NextRequest, NextResponse } from "next/server";
import { getDashboardUserIdFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const userId = await getDashboardUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const alerts = await prisma.alert.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        message: true,
        severity: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, alerts });
  } catch (error) {
    console.error("[alerts][GET]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
