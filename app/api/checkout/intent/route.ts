export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

type CheckoutProvider = "stripe" | "nowpayments" | "mock";

async function signIntent(intentId: string, tier: string, amountUsd: number, expiresAtIso: string) {
  const { createHmac } = await import("crypto");
  const key = process.env.CHECKOUT_INTENT_SIGNING_KEY || process.env.JWT_SECRET || "dev-checkout-intent-key";
  const payload = `${intentId}:${tier}:${amountUsd}:${expiresAtIso}`;
  return createHmac("sha256", key).update(payload).digest("hex");
}

async function secureTokenEquals(a: string, b: string) {
  const { timingSafeEqual } = await import("crypto");
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function normalizeRequestedProvider(raw: unknown): CheckoutProvider | null {
  const value = String(raw || "").trim().toLowerCase();
  if (!value || value === "stripe" || value === "card") {
    return "stripe";
  }
  if (value === "nowpayments" || value === "crypto") {
    return "nowpayments";
  }
  if (value === "mock") {
    return "mock";
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const [
      { randomUUID },
      { getUserIdFromRequestSession },
      checkoutIntents,
      { buildAppUrl },
      { CHECKOUT_PLANS, normalizeTier },
      { getClientIp },
      { prisma },
      { rateLimit },
      userProfiles,
    ] = await Promise.all([
      import("crypto"),
      import("@/lib/auth"),
      import("@/lib/checkoutIntents"),
      import("@/lib/appUrl"),
      import("@/lib/checkoutPlans"),
      import("@/lib/getClientIp"),
      import("@/lib/prisma"),
      import("@/lib/rateLimit"),
      import("@/lib/userProfiles"),
    ]);
    const {
      createNowPaymentsInvoice,
      getStripeClient,
      isNowPaymentsCheckoutEnabled,
      mapStripeIntentStatus,
    } = checkoutIntents;
    const { normalizeShippingProfile, upsertShippingProfile, validateRequiredShippingProfile } = userProfiles;

    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "unknown";

    const rl = rateLimit(`${ip}:checkout-intent`, {
      windowMs: 60_000,
      max: 8,
    });
    if (!rl.ok) {
      return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const tier = normalizeTier((body as { tier?: unknown })?.tier);
    if (!tier) {
      return NextResponse.json({ ok: false, error: "Invalid tier" }, { status: 400 });
    }

    const requestedProvider = normalizeRequestedProvider((body as { provider?: unknown })?.provider);
    if (!requestedProvider) {
      return NextResponse.json({ ok: false, error: "Invalid payment provider" }, { status: 400 });
    }

    const shippingProfile = normalizeShippingProfile((body as { shipping?: unknown })?.shipping as Record<string, unknown> | undefined);
    const shippingValidation = validateRequiredShippingProfile(shippingProfile);
    if (!shippingValidation.ok) {
      return NextResponse.json({ ok: false, error: shippingValidation.error }, { status: 400 });
    }

    const sessionUserId = await getUserIdFromRequestSession(req);
    if (!sessionUserId) {
      return NextResponse.json({ ok: false, error: "Login required", loginRequired: true }, { status: 401 });
    }
    const userId = sessionUserId;
    await upsertShippingProfile(userId, shippingProfile);

    const intentId = randomUUID();
    const plan = CHECKOUT_PLANS[tier];
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const stripe = getStripeClient();
    const publishableKey = String(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "").trim();
    const signedToken = await signIntent(intentId, tier, plan.firstPaymentUsd, expiresAt.toISOString());

    let paymentMode: CheckoutProvider = "mock";
    let providerIntentId: string | null = null;
    let clientSecret = `mock_pi_${intentId.replace(/-/g, "")}_secret`;
    let hostedUrl = "";
    let checkoutStatus = "pending";

    if (requestedProvider === "nowpayments") {
      if (!isNowPaymentsCheckoutEnabled()) {
        return NextResponse.json({ ok: false, error: "Crypto checkout is not configured." }, { status: 503 });
      }

      try {
        const invoice = await createNowPaymentsInvoice({
          intentId,
          tier,
          amountUsd: plan.firstPaymentUsd,
          currency: plan.currency,
          successUrl: buildAppUrl(req, "/checkout/success", {
            provider: "nowpayments",
            intentId,
            token: signedToken,
            tier,
          }),
          cancelUrl: buildAppUrl(req, "/checkout/cancel", {
            provider: "nowpayments",
            tier,
          }),
          ipnCallbackUrl: buildAppUrl(req, "/api/nowpayments/webhook"),
        });

        paymentMode = "nowpayments";
        providerIntentId = invoice.invoiceId;
        hostedUrl = invoice.hostedUrl;
        clientSecret = "";
      } catch (error) {
        return NextResponse.json(
          {
            ok: false,
            error: error instanceof Error ? error.message : "Failed to initialize crypto checkout.",
          },
          { status: 503 }
        );
      }
    } else if (stripe && publishableKey) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(plan.firstPaymentUsd * 100),
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        metadata: {
          internal_intent_id: intentId,
          tier,
          user_id: userId || "guest",
          renewal_usd: String(plan.renewalUsd),
        },
      });

      if (!paymentIntent.client_secret) {
        return NextResponse.json({ ok: false, error: "Failed to initialize Stripe intent" }, { status: 502 });
      }

      paymentMode = "stripe";
      providerIntentId = paymentIntent.id;
      clientSecret = paymentIntent.client_secret;
      checkoutStatus = mapStripeIntentStatus(paymentIntent.status);
    } else if (requestedProvider === "stripe") {
      return NextResponse.json({ ok: false, error: "Card checkout is not configured." }, { status: 503 });
    }

    await prisma.checkoutIntent.create({
      data: {
        id: intentId,
        userId,
        tier,
        amountUsd: plan.firstPaymentUsd,
        currency: plan.currency,
        status: checkoutStatus,
        provider: paymentMode,
        providerIntentId,
        ip,
        userAgent,
        shippingFullName: shippingProfile.fullName,
        shippingPhone: shippingProfile.phone,
        shippingLine1: shippingProfile.line1,
        shippingLine2: shippingProfile.line2,
        shippingCity: shippingProfile.city,
        shippingState: shippingProfile.state,
        shippingPostalCode: shippingProfile.postalCode,
        shippingCountry: shippingProfile.country,
        expiresAt,
      },
    });

    return NextResponse.json({
      ok: true,
      intent: {
        id: intentId,
        tier,
        amountUsd: plan.firstPaymentUsd,
        renewalUsd: plan.renewalUsd,
        currency: plan.currency,
        status: checkoutStatus,
        provider: paymentMode,
        providerIntentId,
        expiresAt: expiresAt.toISOString(),
      },
      payment: {
        mode: paymentMode,
        clientSecret,
        publishableKey: paymentMode === "stripe" ? publishableKey : "",
        hostedUrl,
      },
      token: signedToken,
    });
  } catch (error) {
    console.error("[checkout/intent][POST]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const [
      checkoutIntents,
      { CHECKOUT_PLANS, normalizeTier },
      { getClientIp },
      { rateLimit },
    ] = await Promise.all([
      import("@/lib/checkoutIntents"),
      import("@/lib/checkoutPlans"),
      import("@/lib/getClientIp"),
      import("@/lib/rateLimit"),
    ]);
    const { getCheckoutIntentById, syncCheckoutIntentStatus } = checkoutIntents;

    const ip = getClientIp(req);
    const rl = rateLimit(`${ip}:checkout-intent-get`, {
      windowMs: 60_000,
      max: 30,
    });
    if (!rl.ok) {
      return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const intentId = String(searchParams.get("id") || "").trim();
    const token = String(searchParams.get("token") || "").trim();
    if (!intentId) {
      return NextResponse.json({ ok: false, error: "Missing intent id" }, { status: 400 });
    }
    if (!token) {
      return NextResponse.json({ ok: false, error: "Missing intent token" }, { status: 400 });
    }

    const row = await getCheckoutIntentById(intentId);
    if (!row) {
      return NextResponse.json({ ok: false, error: "Intent not found" }, { status: 404 });
    }

    const tier = normalizeTier(row.tier);
    if (!tier) {
      return NextResponse.json({ ok: false, error: "Invalid intent payload" }, { status: 400 });
    }

    const expected = await signIntent(row.id, tier, row.amount_usd, row.expires_at.toISOString());
    if (!(await secureTokenEquals(token, expected))) {
      return NextResponse.json({ ok: false, error: "Invalid intent token" }, { status: 403 });
    }

    const syncedRow = await syncCheckoutIntentStatus(row);

    return NextResponse.json({
      ok: true,
      intent: {
        id: syncedRow.id,
        tier,
        amountUsd: syncedRow.amount_usd,
        renewalUsd: CHECKOUT_PLANS[tier].renewalUsd,
        currency: syncedRow.currency,
        status: syncedRow.status,
        provider: syncedRow.provider,
        providerIntentId: syncedRow.provider_intent_id,
        expiresAt: syncedRow.expires_at.toISOString(),
      },
    });
  } catch (error) {
    console.error("[checkout/intent][GET]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
