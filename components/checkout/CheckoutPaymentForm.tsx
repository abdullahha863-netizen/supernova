"use client";

import { useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

type CheckoutPaymentFormProps = {
  intentId: string;
  token: string;
  tier: string;
};

export default function CheckoutPaymentForm({ intentId, token, tier }: CheckoutPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string>("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements) {
      setMessage("Stripe is still loading. Please wait a moment.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const returnUrl = `${window.location.origin}/checkout/success?tier=${encodeURIComponent(tier)}&intentId=${encodeURIComponent(intentId)}&token=${encodeURIComponent(token)}`;
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
    });

    if (result.error) {
      setMessage(result.error.message || "Payment confirmation failed.");
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      {message ? (
        <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs leading-5 text-red-200">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!stripe || !elements || isSubmitting}
        className="inline-flex w-full cursor-pointer items-center justify-center rounded-2xl border border-[#C9EB55]/45 bg-[#C9EB55] px-5 py-3.5 text-sm font-black uppercase tracking-[0.18em] text-black shadow-[0_0_24px_rgba(201,235,85,0.22)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_34px_rgba(201,235,85,0.3)] disabled:cursor-not-allowed disabled:opacity-65"
      >
        {isSubmitting ? "Confirming Payment..." : "Confirm Payment"}
      </button>

      <a
        href={`/checkout/cancel?tier=${encodeURIComponent(tier)}`}
        className="inline-flex w-full items-center justify-center rounded-2xl border border-white/12 bg-white/[0.03] px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/75 transition-colors hover:bg-white/[0.06]"
      >
        Cancel Checkout
      </a>
    </form>
  );
}