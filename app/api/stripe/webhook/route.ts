import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  fulfillCheckoutIntent,
  getCheckoutIntentByProviderIntentId,
  getStripeClient,
  getCheckoutIntentById,
  mapStripeIntentStatus,
  updateCheckoutIntentStatus,
} from "@/lib/checkoutIntents";

export async function POST(req: Request) {
  const stripe = getStripeClient();
  const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  const signature = req.headers.get("stripe-signature") || "";

  if (!stripe || !webhookSecret || !signature) {
    return NextResponse.json({ ok: false, error: "Webhook is not configured" }, { status: 400 });
  }

  try {
    const payload = await req.text();
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    if (event.type.startsWith("payment_intent.")) {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const internalIntentId = String(paymentIntent.metadata?.internal_intent_id || "").trim() || undefined;

      let nextStatus = mapStripeIntentStatus(paymentIntent.status);
      if (event.type === "payment_intent.payment_failed") {
        nextStatus = "payment_failed";
      }

      await updateCheckoutIntentStatus({
        intentId: internalIntentId,
        providerIntentId: paymentIntent.id,
        status: nextStatus,
      });

      const checkoutIntent = internalIntentId
        ? await getCheckoutIntentById(internalIntentId)
        : await getCheckoutIntentByProviderIntentId(paymentIntent.id);

      if (checkoutIntent) {
        await fulfillCheckoutIntent(checkoutIntent);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[stripe/webhook][POST]", error);
    return NextResponse.json({ ok: false, error: "Invalid webhook payload" }, { status: 400 });
  }
}
