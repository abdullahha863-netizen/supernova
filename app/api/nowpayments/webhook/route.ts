import { NextResponse } from "next/server";
import {
  fulfillCheckoutIntent,
  getCheckoutIntentById,
  getCheckoutIntentByProviderIntentId,
  mapNowPaymentsStatus,
  updateCheckoutIntentStatus,
  verifyNowPaymentsWebhookSignature,
} from "@/lib/checkoutIntents";

type NowPaymentsWebhookPayload = {
  payment_id?: number;
  invoice_id?: number | null;
  order_id?: string | null;
  payment_status?: string | null;
};

export async function POST(req: Request) {
  const signature = req.headers.get("x-nowpayments-sig") || "";
  const payload = await req.text();

  try {
    const body = JSON.parse(payload) as NowPaymentsWebhookPayload;

    if (!verifyNowPaymentsWebhookSignature(body, signature)) {
      return NextResponse.json({ ok: false, error: "Invalid webhook signature" }, { status: 400 });
    }

    const internalIntentId = String(body.order_id || "").trim();
    const providerIntentId = String(body.invoice_id || body.payment_id || "").trim() || null;

    if (!internalIntentId && !providerIntentId) {
      return NextResponse.json({ received: true });
    }

    const nextStatus = mapNowPaymentsStatus(body.payment_status);
    await updateCheckoutIntentStatus({
      intentId: internalIntentId || undefined,
      providerIntentId,
      status: nextStatus,
    });

    const checkoutIntent = internalIntentId
      ? await getCheckoutIntentById(internalIntentId)
      : providerIntentId
        ? await getCheckoutIntentByProviderIntentId(providerIntentId)
        : null;

    if (checkoutIntent) {
      await fulfillCheckoutIntent(checkoutIntent);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[nowpayments/webhook][POST]", error);
    return NextResponse.json({ ok: false, error: "Invalid webhook payload" }, { status: 400 });
  }
}
