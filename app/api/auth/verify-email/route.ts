import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";

export async function POST(req: Request) {
  const rl = rateLimit(getClientIp(req), { windowMs: 10 * 60_000, max: 12 });
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const vt = await prisma.verificationToken.findUnique({ where: { token } });
  if (vt && vt.type === "email_verification" && vt.expiresAt >= new Date()) {
    await prisma.user.update({ where: { id: vt.userId }, data: { emailVerified: new Date() } });
    await prisma.verificationToken.deleteMany({ where: { id: vt.id } });
    return NextResponse.json({ ok: true });
  }

  const pending = await prisma.pendingEmailChange.findUnique({
    where: { token },
  });

  if (!pending || pending.expiresAt < new Date()) {
    if (pending) {
      await prisma.pendingEmailChange.delete({ where: { token } });
    }
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  const emailOwner = await prisma.user.findFirst({
    where: { email: pending.newEmail },
    select: { id: true },
  });
  if (emailOwner && emailOwner.id !== pending.userId) {
    await prisma.pendingEmailChange.delete({ where: { token } });
    return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: pending.userId },
    data: { email: pending.newEmail, emailVerified: new Date() },
  });
  await prisma.pendingEmailChange.delete({ where: { token } });

  return NextResponse.json({ ok: true });
}
