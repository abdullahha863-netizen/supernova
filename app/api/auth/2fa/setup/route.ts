export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const [{ prisma }, { generateSecret }, { getUserIdFromRequestSession }, { authenticator }, { rateLimit }, { getClientIp }] =
      await Promise.all([
        import("@/lib/prisma"),
        import("@/lib/totp"),
        import("@/lib/auth"),
        import("otplib"),
        import("@/lib/rateLimit"),
        import("@/lib/getClientIp"),
      ]);

    const rl = rateLimit(`${getClientIp(req)}:2fa-setup`, { windowMs: 60_000, max: 30 });
    if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

    const userId = await getUserIdFromRequestSession(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const secret = generateSecret();
    const issuer = process.env.NEXT_PUBLIC_APP_NAME || "Supernova";
    const otpauth = authenticator.keyuri(user.email, issuer, secret);

    // upsert twoFactor record with secret, not enabled yet
    await prisma.twoFactor.upsert({
      where: { userId },
      update: { secret, type: "totp", enabled: false },
      create: { userId, secret, type: "totp", enabled: false },
    });

    return NextResponse.json({ otpauthUrl: otpauth, secret });
  } catch (error) {
    console.error("[2fa][setup]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
