export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const [{ getDashboardUserIdFromRequest }, { prisma }] = await Promise.all([
      import("@/lib/auth"),
      import("@/lib/prisma"),
    ]);
    const userId = await getDashboardUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

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
