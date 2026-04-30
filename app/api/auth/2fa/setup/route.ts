import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSecret } from "@/lib/totp";
import { getUserIdFromRequestSession } from "@/lib/auth";
import { authenticator } from "otplib";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";

export async function GET(req: Request) {
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
}
