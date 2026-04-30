import Stripe from "stripe";
import { createHmac, timingSafeEqual } from "crypto";
import {
  PLAN_RANK,
  normalizeDashboardPlan,
  queueMemberCardFulfillment,
  type PlanName,
} from "@/lib/dashboardDb";
import { prisma } from "@/lib/prisma";
import { normalizeShippingProfile, type ShippingProfile } from "@/lib/userProfiles";

export type CheckoutIntentStatus =
  | "pending"
  | "requires_payment_method"
  | "requires_action"
  | "processing"
  | "succeeded"
  | "canceled"
  | "payment_failed";

export type CheckoutProvider = "stripe" | "nowpayments" | "mock";

type NowPaymentsInvoiceResponse = {
  id?: number;
  invoice_url?: string;
};

type NowPaymentsStatusResponse = {
  payment_status?: string | null;
  status?: string | null;
};

export type CheckoutIntentRow = {
  id: string;
  user_id: string | null;
  tier: string;
  amount_usd: number;
  currency: string;
  status: string;
  provider: string;
  provider_intent_id: string | null;
  ip: string | null;
  user_agent: string | null;
  shipping_full_name: string;
  shipping_phone: string;
  shipping_line1: string;
  shipping_line2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  created_at: Date;
  expires_at: Date;
  fulfilled_at: Date | null;
};

type CheckoutIntentRecord = {
  id: string;
  userId: string | null;
  tier: string;
  amountUsd: unknown;
  currency: string;
  status: string;
  provider: string;
  providerIntentId: string | null;
  ip: string | null;
  userAgent: string | null;
  shippingFullName: string;
  shippingPhone: string;
  shippingLine1: string;
  shippingLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  createdAt: Date;
  expiresAt: Date;
  fulfilledAt: Date | null;
};

function toCheckoutIntentRow(record: CheckoutIntentRecord): CheckoutIntentRow {
  return {
    id: record.id,
    user_id: record.userId,
    tier: record.tier,
    amount_usd: Number(record.amountUsd),
    currency: record.currency,
    status: record.status,
    provider: record.provider,
    provider_intent_id: record.providerIntentId,
    ip: record.ip,
    user_agent: record.userAgent,
    shipping_full_name: record.shippingFullName,
    shipping_phone: record.shippingPhone,
    shipping_line1: record.shippingLine1,
    shipping_line2: record.shippingLine2,
    shipping_city: record.shippingCity,
    shipping_state: record.shippingState,
    shipping_postal_code: record.shippingPostalCode,
    shipping_country: record.shippingCountry,
    created_at: record.createdAt,
    expires_at: record.expiresAt,
    fulfilled_at: record.fulfilledAt,
  };
}

let stripeClient: Stripe | null = null;

export function isStripeCheckoutEnabled() {
  return String(process.env.ENABLE_STRIPE_CHECKOUT || "").trim().toLowerCase() === "true";
}

export function getStripeClient() {
  if (!isStripeCheckoutEnabled()) return null;
  const secretKey = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!secretKey) return null;

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      appInfo: { name: "supernov1-checkout" },
    });
  }

  return stripeClient;
}

export function isNowPaymentsCheckoutEnabled() {
  return String(process.env.ENABLE_NOWPAYMENTS_CHECKOUT || "").trim().toLowerCase() === "true";
}

function getNowPaymentsApiKey() {
  return String(process.env.NOWPAYMENTS_API_KEY || "").trim();
}

export function getNowPaymentsIpnSecret() {
  return String(process.env.NOWPAYMENTS_IPN_SECRET || "").trim();
}

export async function createNowPaymentsInvoice(params: {
  intentId: string;
  tier: string;
  amountUsd: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  ipnCallbackUrl: string;
}) {
  if (!isNowPaymentsCheckoutEnabled()) {
    throw new Error("NOWPayments checkout is disabled.");
  }

  const apiKey = getNowPaymentsApiKey();
  if (!apiKey) {
    throw new Error("NOWPayments API key is missing.");
  }

  const response = await fetch("https://api.nowpayments.io/v1/invoice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      price_amount: Number(params.amountUsd.toFixed(2)),
      price_currency: params.currency.toLowerCase(),
      order_id: params.intentId,
      order_description: `SUPERNOVA ${params.tier} access and metal card order`,
      ipn_callback_url: params.ipnCallbackUrl,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as NowPaymentsInvoiceResponse & {
    message?: string;
    error?: string;
  };
  if (!response.ok || !data.id || !data.invoice_url) {
    throw new Error(data.message || data.error || "Failed to initialize NOWPayments invoice.");
  }

  return {
    invoiceId: String(data.id),
    hostedUrl: data.invoice_url,
  };
}

export function mapNowPaymentsStatus(status: string | null | undefined): CheckoutIntentStatus {
  switch (String(status || "").trim().toLowerCase()) {
    case "finished":
      return "succeeded";
    case "failed":
      return "payment_failed";
    case "expired":
      return "canceled";
    case "partially_paid":
    case "confirming":
    case "confirmed":
    case "sending":
      return "processing";
    case "waiting":
      return "pending";
    default:
      return "processing";
  }
}

function sortNowPaymentsPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortNowPaymentsPayload(entry));
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = sortNowPaymentsPayload((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }

  return value;
}

export function verifyNowPaymentsWebhookSignature(payload: unknown, signature: string) {
  const secret = getNowPaymentsIpnSecret();
  if (!secret || !signature) {
    return false;
  }

  const expected = createHmac("sha512", secret)
    .update(JSON.stringify(sortNowPaymentsPayload(payload)))
    .digest("hex");
  const provided = Buffer.from(signature, "utf8");
  const calculated = Buffer.from(expected, "utf8");
  if (provided.length !== calculated.length) {
    return false;
  }

  return timingSafeEqual(provided, calculated);
}

export function mapStripeIntentStatus(status: Stripe.PaymentIntent.Status): CheckoutIntentStatus {
  switch (status) {
    case "requires_payment_method":
      return "requires_payment_method";
    case "requires_action":
      return "requires_action";
    case "processing":
      return "processing";
    case "succeeded":
      return "succeeded";
    case "canceled":
      return "canceled";
    default:
      return "pending";
  }
}

export async function getCheckoutIntentById(intentId: string) {
  const record = await prisma.checkoutIntent.findUnique({
    where: { id: intentId },
  });

  return record ? toCheckoutIntentRow(record) : null;
}

export async function getCheckoutIntentByProviderIntentId(providerIntentId: string) {
  const record = await prisma.checkoutIntent.findFirst({
    where: { providerIntentId },
    orderBy: { createdAt: "desc" },
  });

  return record ? toCheckoutIntentRow(record) : null;
}

export async function updateCheckoutIntentStatus(params: {
  intentId?: string;
  providerIntentId?: string | null;
  status: CheckoutIntentStatus;
}) {
  const { intentId, providerIntentId, status } = params;
  if (!intentId && !providerIntentId) return;

  if (intentId) {
    await prisma.checkoutIntent.updateMany({
      where: { id: intentId },
      data: {
        status,
        ...(providerIntentId ? { providerIntentId } : {}),
      },
    });
    return;
  }

  await prisma.checkoutIntent.updateMany({
    where: { providerIntentId },
    data: { status },
  });
}

function getDashboardPlanForTier(tier: string): PlanName | null {
  if (tier === "silver") return "Silver";
  if (tier === "hash-pro") return "Hash Pro";
  if (tier === "titan-elite") return "Titan Elite";
  return null;
}

function getCheckoutIntentShippingProfile(row: CheckoutIntentRow): ShippingProfile {
  return normalizeShippingProfile({
    fullName: row.shipping_full_name,
    phone: row.shipping_phone,
    line1: row.shipping_line1,
    line2: row.shipping_line2,
    city: row.shipping_city,
    state: row.shipping_state,
    postalCode: row.shipping_postal_code,
    country: row.shipping_country,
  });
}

async function countOtherSucceededIntents(userId: string, intentId: string) {
  return prisma.checkoutIntent.count({
    where: {
      userId,
      status: "succeeded",
      id: { not: intentId },
    },
  });
}

async function markCheckoutIntentFulfilled(intentId: string) {
  await prisma.checkoutIntent.updateMany({
    where: {
      id: intentId,
      fulfilledAt: null,
    },
    data: { fulfilledAt: new Date() },
  });
}

export async function fulfillCheckoutIntent(row: CheckoutIntentRow) {
  if (row.status !== "succeeded" || !row.user_id || row.fulfilled_at) {
    return row;
  }

  const purchasedPlan = getDashboardPlanForTier(row.tier);
  if (!purchasedPlan) {
    await markCheckoutIntentFulfilled(row.id);
    return {
      ...row,
      fulfilled_at: row.fulfilled_at || new Date(),
    };
  }

  const profile = await prisma.minerProfile.findUnique({
    where: { userId: row.user_id },
    select: { plan: true },
  });

  const currentPlan = normalizeDashboardPlan(profile?.plan);
  const otherSucceededIntents = await countOtherSucceededIntents(row.user_id, row.id);
  const shouldApplyPurchasedPlan =
    PLAN_RANK[purchasedPlan] >= PLAN_RANK[currentPlan] || otherSucceededIntents === 0;

  if (shouldApplyPurchasedPlan && purchasedPlan !== currentPlan) {
    await prisma.minerProfile.upsert({
      where: { userId: row.user_id },
      update: {
        plan: purchasedPlan,
        updatedAt: new Date(),
      },
      create: {
        userId: row.user_id,
        plan: purchasedPlan,
      },
    });
  }

  if (purchasedPlan !== "Starter") {
    await queueMemberCardFulfillment({
      checkoutIntentId: row.id,
      userId: row.user_id,
      plan: purchasedPlan,
      shippingProfile: getCheckoutIntentShippingProfile(row),
    });
  }

  await markCheckoutIntentFulfilled(row.id);

  return {
    ...row,
    fulfilled_at: row.fulfilled_at || new Date(),
  };
}

export async function syncCheckoutIntentStatusFromNowPayments(row: CheckoutIntentRow) {
  if (row.provider !== "nowpayments" || !row.provider_intent_id) {
    return row;
  }

  const apiKey = getNowPaymentsApiKey();
  if (!apiKey) {
    return row;
  }

  try {
    const response = await fetch(`https://api.nowpayments.io/v1/payment/${encodeURIComponent(row.provider_intent_id)}`, {
      headers: {
        "x-api-key": apiKey,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return row;
    }

    const data = (await response.json().catch(() => null)) as NowPaymentsStatusResponse | null;
    const remoteStatus = data?.payment_status || data?.status;
    if (!remoteStatus) {
      return row;
    }

    const nextStatus = mapNowPaymentsStatus(remoteStatus);
    if (nextStatus !== row.status) {
      await updateCheckoutIntentStatus({
        intentId: row.id,
        providerIntentId: row.provider_intent_id,
        status: nextStatus,
      });
    }

    const nextRow = {
      ...row,
      status: nextStatus,
    };

    return fulfillCheckoutIntent(nextRow);
  } catch {
    return row;
  }
}

export async function syncCheckoutIntentStatus(row: CheckoutIntentRow) {
  if (row.provider === "stripe") {
    return syncCheckoutIntentStatusFromStripe(row);
  }

  if (row.provider === "nowpayments") {
    return syncCheckoutIntentStatusFromNowPayments(row);
  }

  return row;
}

export async function syncCheckoutIntentStatusFromStripe(row: CheckoutIntentRow) {
  if (row.provider !== "stripe" || !row.provider_intent_id) {
    return row;
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return row;
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(row.provider_intent_id);
  const nextStatus = mapStripeIntentStatus(paymentIntent.status);
  if (nextStatus !== row.status) {
    await updateCheckoutIntentStatus({
      intentId: row.id,
      providerIntentId: paymentIntent.id,
      status: nextStatus,
    });
  }

  const nextRow = {
    ...row,
    status: nextStatus,
    provider_intent_id: paymentIntent.id,
  };

  return fulfillCheckoutIntent(nextRow);
}
