const fs = require("fs");
const path = require("path");

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function readJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text}`);
  }
}

async function main() {
  loadEnvFile();

  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  const base = process.env.BASE_URL || "http://localhost:3000";
  const email = `email-2fa-e2e+${Date.now()}@example.com`;
  const password = "Passw0rd!123";
  let userId = null;

  try {
    const registerRes = await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Email 2FA E2E", email, password }),
    });
    const registerBody = await readJson(registerRes);
    if (!registerRes.ok || !registerBody.ok) {
      throw new Error(`Registration failed: ${JSON.stringify(registerBody)}`);
    }

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) {
      throw new Error("Registered user not found.");
    }
    userId = user.id;

    await prisma.twoFactor.upsert({
      where: { userId },
      update: { type: "email", enabled: true, secret: null },
      create: { userId, type: "email", enabled: true, secret: null },
    });
    await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });

    const loginRes = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const loginBody = await readJson(loginRes);
    if (!loginRes.ok || !loginBody.ok || !loginBody.twoFactor || loginBody.twoFactorType !== "email") {
      throw new Error(`Email 2FA login challenge failed: ${JSON.stringify(loginBody)}`);
    }

    const challengeToken = loginBody.challengeToken;
    if (!challengeToken) {
      throw new Error("Login response did not include challengeToken.");
    }

    const sendCodeRes = await fetch(`${base}/api/auth/2fa/send-email-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeToken }),
    });
    const sendCodeBody = await readJson(sendCodeRes);
    if (!sendCodeRes.ok || !sendCodeBody.ok) {
      throw new Error(`Send email 2FA code failed: ${JSON.stringify(sendCodeBody)}`);
    }

    const tokenRecord = await prisma.verificationToken.findFirst({
      where: { userId, type: "email_otp" },
      orderBy: { createdAt: "desc" },
      select: { token: true },
    });
    if (!tokenRecord) {
      throw new Error("Expected an email OTP token after sending the email code.");
    }

    const verifyRes = await fetch(`${base}/api/auth/2fa/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeToken, code: tokenRecord.token, type: "email" }),
    });
    const verifyBody = await readJson(verifyRes);
    if (!verifyRes.ok || !verifyBody.ok) {
      throw new Error(`Email 2FA verification failed: ${JSON.stringify(verifyBody)}`);
    }

    const authCookie = verifyRes.headers.get("set-cookie") || "";
    if (!authCookie.includes("sn_auth=")) {
      throw new Error("Expected email 2FA verification to create an auth cookie.");
    }

    const remainingOtps = await prisma.verificationToken.count({
      where: { userId, type: "email_otp" },
    });
    if (remainingOtps !== 0) {
      throw new Error(`Expected email OTP tokens to be cleared after verification, found ${remainingOtps}.`);
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          email,
          challengeIssued: true,
          emailCodeAccepted: true,
        },
        null,
        2
      )
    );
  } finally {
    if (userId) {
      await prisma.session.deleteMany({ where: { userId } });
      await prisma.verificationToken.deleteMany({ where: { userId } });
      await prisma.twoFactor.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});