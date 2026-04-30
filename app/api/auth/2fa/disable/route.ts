export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const [{ prisma }, { getUserIdFromRequestSession }, { verifyTotp }, { rateLimit }, { getClientIp }] =
      await Promise.all([
        import("@/lib/prisma"),
        import("@/lib/auth"),
        import("@/lib/totp"),
        import("@/lib/rateLimit"),
        import("@/lib/getClientIp"),
      ]);

    const body = await req.json();
    const { code } = body || {};

    const rl = rateLimit(getClientIp(req));
    if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

    const userId = await getUserIdFromRequestSession(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

    const two = await prisma.twoFactor.findUnique({ where: { userId } });
    if (!two || !two.secret || !two.enabled) return NextResponse.json({ error: "2FA not enabled" }, { status: 400 });

    const ok = verifyTotp(code, two.secret);
    if (!ok) return NextResponse.json({ error: "Invalid code" }, { status: 401 });

    await prisma.twoFactor.update({ where: { userId }, data: { enabled: false, secret: null } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[2fa][disable]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
