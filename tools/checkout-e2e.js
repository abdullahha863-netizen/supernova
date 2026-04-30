const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env file not found");
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
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

  const base = process.env.BASE_URL || "http://localhost:3001";
  const stripeSecretKey = String(process.env.STRIPE_SECRET_KEY || "").trim();
  const adminKey = String(process.env.ADMIN_KEY || "").trim();
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is required for checkout e2e verification");
  }
  if (!adminKey) {
    throw new Error("ADMIN_KEY is required for admin fulfillment verification");
  }

  const email = `checkout-e2e+${Date.now()}@example.com`;
  const password = "Passw0rd!123";
  const prisma = new PrismaClient();

  try {
    const registerRes = await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Checkout E2E", email, password }),
    });
    const registerBody = await readJson(registerRes);
    if (!registerRes.ok || !registerBody.ok) {
      throw new Error(`Registration failed: ${JSON.stringify(registerBody)}`);
    }

    const setCookie = registerRes.headers.get("set-cookie") || "";
    const cookie = setCookie.split(";")[0] || "";
    if (!cookie.startsWith("sn_auth=")) {
      throw new Error("Registration did not return sn_auth cookie");
    }

    const shippingPayload = {
      fullName: "Checkout E2E Receiver",
      phone: "+1 555 0100",
      line1: "123 Neon Grid Ave",
      line2: "Suite 42",
      city: "Austin",
      state: "TX",
      postalCode: "73301",
      country: "USA",
    };

    const checkoutRes = await fetch(`${base}/api/checkout/intent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie,
      },
      body: JSON.stringify({ tier: "silver", shipping: shippingPayload }),
    });
    const checkoutBody = await readJson(checkoutRes);
    if (!checkoutRes.ok || !checkoutBody.ok) {
      throw new Error(`Checkout intent creation failed: ${JSON.stringify(checkoutBody)}`);
    }

    const finalProviderIntentId = checkoutBody.intent?.providerIntentId;
    const finalInternalIntentId = checkoutBody.intent?.id;
    const finalToken = checkoutBody.token;
    if (!finalProviderIntentId || !finalInternalIntentId || !finalToken) {
      throw new Error(`Checkout response missing required fields: ${JSON.stringify(checkoutBody)}`);
    }

    const stripeConfirmRes = await fetch(`https://api.stripe.com/v1/payment_intents/${finalProviderIntentId}/confirm`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        payment_method: "pm_card_visa",
        return_url: `${base}/checkout/success`,
      }),
    });
    const stripeConfirmBody = await readJson(stripeConfirmRes);
    if (!stripeConfirmRes.ok) {
      throw new Error(`Stripe confirmation failed: ${JSON.stringify(stripeConfirmBody)}`);
    }

    const syncRes = await fetch(
      `${base}/api/checkout/intent?id=${encodeURIComponent(finalInternalIntentId)}&token=${encodeURIComponent(finalToken)}`,
      {
        headers: { cookie },
      }
    );
    const syncBody = await readJson(syncRes);
    if (!syncRes.ok || !syncBody.ok) {
      throw new Error(`Checkout sync failed: ${JSON.stringify(syncBody)}`);
    }

    const overviewRes = await fetch(`${base}/api/dashboard/overview`, {
      headers: { cookie },
    });
    const overviewBody = await readJson(overviewRes);
    if (!overviewRes.ok || !overviewBody.ok) {
      throw new Error(`Dashboard overview failed: ${JSON.stringify(overviewBody)}`);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      throw new Error("Test user was not found in the database");
    }

    const planRows = await prisma.$queryRaw`
      SELECT plan
      FROM miner_profiles
      WHERE user_id = ${user.id}
      LIMIT 1
    `;

    const cardRows = await prisma.$queryRaw`
      SELECT checkout_intent_id, tier, card_label, fulfillment_status
      FROM member_card_fulfillments
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `;

    const plan = planRows[0]?.plan || null;
    const card = cardRows[0] || null;

    const verification = {
      email,
      stripeStatus: stripeConfirmBody.status,
      syncedStatus: syncBody.intent?.status,
      dashboardPlan: overviewBody.overview?.plan,
      dbPlan: plan,
      dashboardMemberCard: overviewBody.overview?.memberCard || null,
      dbMemberCard: card,
    };

    if (verification.stripeStatus !== "succeeded") {
      throw new Error(`Expected Stripe status succeeded, got ${verification.stripeStatus}`);
    }
    if (verification.syncedStatus !== "succeeded") {
      throw new Error(`Expected synced status succeeded, got ${verification.syncedStatus}`);
    }
    if (verification.dashboardPlan !== "Silver" || verification.dbPlan !== "Silver") {
      throw new Error(`Expected dashboard and DB plan Silver, got ${verification.dashboardPlan} / ${verification.dbPlan}`);
    }
    if (!verification.dashboardMemberCard || verification.dashboardMemberCard.status !== "queued") {
      throw new Error("Expected dashboard memberCard with queued status");
    }
    if (!verification.dbMemberCard || verification.dbMemberCard.fulfillment_status !== "queued") {
      throw new Error("Expected DB member_card_fulfillments row with queued status");
    }
    if (verification.dashboardMemberCard?.shipping?.city !== "Austin") {
      throw new Error("Expected dashboard shipping snapshot to include Austin.");
    }

    const adminUpdateRes = await fetch(`${base}/api/admin/member-cards`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
      body: JSON.stringify({
        checkoutIntentId: finalInternalIntentId,
        fulfillmentStatus: "shipped",
        carrier: "DHL",
        trackingNumber: "SNOVA-TRACK-123",
        trackingUrl: "https://example.com/track/SNOVA-TRACK-123",
        notes: "Packed in reinforced member-card sleeve.",
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        shippingFullName: "Checkout E2E Receiver",
        shippingPhone: "+1 555 0100",
        shippingLine1: "123 Neon Grid Ave",
        shippingLine2: "Suite 42",
        shippingCity: "Austin",
        shippingState: "TX",
        shippingPostalCode: "73301",
        shippingCountry: "USA",
      }),
    });
    const adminUpdateBody = await readJson(adminUpdateRes);
    if (!adminUpdateRes.ok || !adminUpdateBody.ok) {
      throw new Error(`Admin fulfillment update failed: ${JSON.stringify(adminUpdateBody)}`);
    }

    const refreshedOverviewRes = await fetch(`${base}/api/dashboard/overview`, {
      headers: { cookie },
    });
    const refreshedOverviewBody = await readJson(refreshedOverviewRes);
    if (!refreshedOverviewRes.ok || !refreshedOverviewBody.ok) {
      throw new Error(`Refreshed dashboard overview failed: ${JSON.stringify(refreshedOverviewBody)}`);
    }

    const updatedCardRows = await prisma.$queryRaw`
      SELECT checkout_intent_id, fulfillment_status, carrier, tracking_number
      FROM member_card_fulfillments
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `;

    const finalVerification = {
      ...verification,
      dashboardMemberCardAfterAdminUpdate: refreshedOverviewBody.overview?.memberCard || null,
      dbMemberCardAfterAdminUpdate: updatedCardRows[0] || null,
    };

    console.log(JSON.stringify(finalVerification, null, 2));

    if (finalVerification.dashboardMemberCardAfterAdminUpdate?.status !== "shipped") {
      throw new Error("Expected dashboard memberCard status to be shipped after admin update.");
    }
    if (finalVerification.dashboardMemberCardAfterAdminUpdate?.trackingNumber !== "SNOVA-TRACK-123") {
      throw new Error("Expected dashboard tracking number to be updated after admin update.");
    }
    if (finalVerification.dashboardMemberCardAfterAdminUpdate?.trackingUrl !== "https://example.com/track/SNOVA-TRACK-123") {
      throw new Error("Expected dashboard tracking URL to be updated after admin update.");
    }
    if (finalVerification.dashboardMemberCardAfterAdminUpdate?.notes !== "Packed in reinforced member-card sleeve.") {
      throw new Error("Expected dashboard notes to be updated after admin update.");
    }
    if (!finalVerification.dashboardMemberCardAfterAdminUpdate?.estimatedDelivery) {
      throw new Error("Expected dashboard estimated delivery to be populated after admin update.");
    }
    if (finalVerification.dbMemberCardAfterAdminUpdate?.fulfillment_status !== "shipped") {
      throw new Error("Expected DB fulfillment status to be shipped after admin update.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});