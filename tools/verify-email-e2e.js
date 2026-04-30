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
  const email = `verify-email-e2e+${Date.now()}@example.com`;
  const password = "Passw0rd!123";
  let userId = null;

  try {
    const registerRes = await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Verify Email E2E", email, password }),
    });
    const registerBody = await readJson(registerRes);
    if (!registerRes.ok || !registerBody.ok) {
      throw new Error(`Registration failed: ${JSON.stringify(registerBody)}`);
    }

    const sessionCookie = (registerRes.headers.get("set-cookie") || "").split(";")[0] || "";
    if (!sessionCookie.startsWith("sn_auth=")) {
      throw new Error("Registration did not return an auth cookie.");
    }

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, emailVerified: true } });
    if (!user) {
      throw new Error("Registered user not found.");
    }
    userId = user.id;

    const sendRes = await fetch(`${base}/api/auth/verify-email/send`, {
      method: "POST",
      headers: { cookie: sessionCookie },
    });
    const sendBody = await readJson(sendRes);
    if (!sendRes.ok || !sendBody.ok) {
      throw new Error(`Verify-email send failed: ${JSON.stringify(sendBody)}`);
    }

    const tokenRecord = await prisma.verificationToken.findFirst({
      where: { userId, type: "email_verification" },
      orderBy: { createdAt: "desc" },
      select: { token: true },
    });
    if (!tokenRecord) {
      throw new Error("Verify-email token was not created.");
    }

    const verifyRes = await fetch(`${base}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tokenRecord.token }),
    });
    const verifyBody = await readJson(verifyRes);
    if (!verifyRes.ok || !verifyBody.ok) {
      throw new Error(`Verify-email confirmation failed: ${JSON.stringify(verifyBody)}`);
    }

    const refreshedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });
    if (!refreshedUser?.emailVerified) {
      throw new Error("Expected emailVerified to be set after verification.");
    }

    const remainingTokens = await prisma.verificationToken.count({
      where: { userId, type: "email_verification" },
    });
    if (remainingTokens !== 0) {
      throw new Error(`Expected email verification tokens to be cleared, found ${remainingTokens}.`);
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          email,
          emailVerified: Boolean(refreshedUser.emailVerified),
        },
        null,
        2
      )
    );
  } finally {
    if (userId) {
      await prisma.session.deleteMany({ where: { userId } });
      await prisma.verificationToken.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});