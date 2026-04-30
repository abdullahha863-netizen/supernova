"use client";

import { useEffect, useMemo, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import CheckoutPaymentForm from "@/components/checkout/CheckoutPaymentForm";

type TierKey = "silver" | "hash-pro" | "titan-elite";

type CheckoutActionsProps = {
  tier: TierKey;
  nextPath: string;
};

type IntentResponse = {
  ok: boolean;
  error?: string;
  loginRequired?: boolean;
  intent?: {
    id: string;
    tier: string;
    amountUsd: number;
    currency: string;
    status: string;
    provider?: string;
    providerIntentId?: string | null;
    expiresAt: string;
  };
  payment?: {
    mode: "stripe" | "nowpayments" | "mock";
    clientSecret: string;
    publishableKey?: string;
    hostedUrl?: string;
  };
  token?: string;
};

type PaymentMethod = "stripe" | "nowpayments";

type CheckoutState = {
  intentId: string;
  token: string;
  clientSecret: string;
  publishableKey: string;
  hostedUrl: string;
  mode: "stripe" | "nowpayments" | "mock";
};

type ShippingProfile = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

const EMPTY_SHIPPING: ShippingProfile = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

const COUNTRY_OPTIONS = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Germany",
  "France",
  "Italy",
  "Spain",
  "Netherlands",
  "Belgium",
  "Sweden",
  "Norway",
  "Denmark",
  "Switzerland",
  "Austria",
  "Ireland",
  "Poland",
  "Czech Republic",
  "Romania",
  "Greece",
  "Portugal",
  "Turkey",
  "United Arab Emirates",
  "Saudi Arabia",
  "Qatar",
  "Kuwait",
  "Bahrain",
  "Oman",
  "Jordan",
  "Lebanon",
  "Egypt",
  "Morocco",
  "Tunisia",
  "Palestine",
  "Israel",
  "India",
  "Pakistan",
  "Japan",
  "South Korea",
  "Singapore",
  "Malaysia",
  "Indonesia",
  "Philippines",
  "Thailand",
  "Vietnam",
  "China",
  "Hong Kong",
  "Brazil",
  "Mexico",
  "Argentina",
  "Chile",
  "South Africa",
  "New Zealand",
] as const;

function validateShipping(shipping: ShippingProfile) {
  if (shipping.fullName.trim().length < 2) {
    return "Enter the full recipient name.";
  }
  if (shipping.phone.trim().length < 5) {
    return "Enter a valid phone number for delivery updates.";
  }
  if (shipping.country.trim().length < 2) {
    return "Select or enter the destination country.";
  }
  if (shipping.city.trim().length < 2) {
    return "Enter the destination city.";
  }
  if (shipping.postalCode.trim().length < 3) {
    return "Enter the postal or ZIP code.";
  }
  if (shipping.line1.trim().length < 5) {
    return "Enter the primary shipping address.";
  }
  return "";
}

export default function CheckoutActions({ tier, nextPath }: CheckoutActionsProps) {
  const [message, setMessage] = useState<{ type: "success" | "error" | null; text: string }>({ type: null, text: "" });
  const [checkoutState, setCheckoutState] = useState<CheckoutState | null>(null);
  const [shipping, setShipping] = useState<ShippingProfile>(EMPTY_SHIPPING);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [shippingConfirmed, setShippingConfirmed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe");

  useEffect(() => {
    let cancelled = false;

    const loadShipping = async () => {
      try {
        const res = await fetch("/api/dashboard/profile", { cache: "no-store" });
        if (!res.ok) {
          if (res.status === 401) {
            return;
          }
          throw new Error("Failed to preload shipping details.");
        }

        const data = await res.json();
        if (cancelled) return;
        setShipping({
          fullName: String(data.profile?.shipping?.fullName || ""),
          phone: String(data.profile?.shipping?.phone || ""),
          line1: String(data.profile?.shipping?.line1 || ""),
          line2: String(data.profile?.shipping?.line2 || ""),
          city: String(data.profile?.shipping?.city || ""),
          state: String(data.profile?.shipping?.state || ""),
          postalCode: String(data.profile?.shipping?.postalCode || ""),
          country: String(data.profile?.shipping?.country || ""),
        });
      } catch {
        if (!cancelled) {
          setMessage({ type: null, text: "" });
        }
      } finally {
        if (!cancelled) {
          setIsProfileLoading(false);
        }
      }
    };

    void loadShipping();

    return () => {
      cancelled = true;
    };
  }, []);

  const stripePromise = useMemo(() => {
    if (!checkoutState?.publishableKey || checkoutState.mode !== "stripe") {
      return null;
    }

    return loadStripe(checkoutState.publishableKey);
  }, [checkoutState]);

  const shippingError = useMemo(() => validateShipping(shipping), [shipping]);

  const updateShippingField = <K extends keyof ShippingProfile,>(key: K, value: ShippingProfile[K]) => {
    setShipping((current) => ({ ...current, [key]: value }));
    if (shippingConfirmed || checkoutState) {
      setShippingConfirmed(false);
      setCheckoutState(null);
      setMessage({ type: null, text: "" });
    }
  };

  const continueToPayment = async () => {
    if (shippingError) {
      setMessage({ type: "error", text: shippingError });
      return;
    }

    setShippingConfirmed(true);
    await createIntent({ preserveConfirmedState: true });
  };

  const createIntent = async (options?: { preserveConfirmedState?: boolean }) => {
    setMessage({ type: null, text: "" });
    setCheckoutState(null);

    try {
      const res = await fetch("/api/checkout/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, provider: paymentMethod, shipping }),
      });

      const data = (await res.json()) as IntentResponse;
      if (res.status === 401 || data?.loginRequired) {
        window.location.href = `/login?next=${encodeURIComponent(nextPath)}`;
        return;
      }

      if (!res.ok || !data?.ok || !data.intent?.id) {
        throw new Error(data?.error || "Failed to create checkout intent.");
      }

      const paymentMode = data.payment?.mode || "mock";
      if (paymentMode === "stripe" && data.token && data.payment?.clientSecret && data.payment?.publishableKey) {
        setCheckoutState({
          intentId: data.intent.id,
          token: data.token,
          clientSecret: data.payment.clientSecret,
          publishableKey: data.payment.publishableKey,
          hostedUrl: "",
          mode: paymentMode,
        });
      }

      if (paymentMode === "nowpayments" && data.token && data.payment?.hostedUrl) {
        const nextState = {
          intentId: data.intent.id,
          token: data.token,
          clientSecret: "",
          publishableKey: "",
          hostedUrl: data.payment.hostedUrl,
          mode: paymentMode,
        } satisfies CheckoutState;
        setCheckoutState(nextState);
        window.location.href = data.payment.hostedUrl;
        return;
      }

      setMessage({
        type: "success",
        text:
          paymentMode === "stripe"
            ? `Payment is ready. Complete the card step below.`
            : paymentMode === "nowpayments"
              ? `Crypto checkout is ready. Redirecting to NOWPayments now.`
            : `Mock intent created: ${data.intent.id.slice(0, 8)}... (expires ${new Date(data.intent.expiresAt).toLocaleTimeString()})`,
      });
    } catch (error) {
      if (!options?.preserveConfirmedState) {
        setShippingConfirmed(false);
      }
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create checkout intent.",
      });
    } finally {
    }
  };

  return (
    <div className="space-y-3">
      {!shippingConfirmed ? (
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C9EB55]/80">Step 1 · Shipping Details</p>
              <h3 className="mt-2 text-xl font-bold text-white">Confirm The Delivery Address First</h3>
              <p className="mt-1 max-w-xl text-xs leading-5 text-white/55">This shipping step supports international delivery and US delivery. Confirm the exact destination for your physical metal card, then continue with card or hosted crypto payment.</p>
            </div>
            <div className="rounded-full border border-[#C9EB55]/20 bg-[#C9EB55]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C9EB55]">
              Shipping First
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="text"
              value={shipping.fullName}
              onChange={(event) => updateShippingField("fullName", event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/40"
              placeholder={isProfileLoading ? "Loading full name..." : "Recipient full name"}
            />
            <input
              type="text"
              value={shipping.phone}
              onChange={(event) => updateShippingField("phone", event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/40"
              placeholder={isProfileLoading ? "Loading phone..." : "Phone number for delivery"}
            />
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-2">
              <input
                list="checkout-country-options"
                type="text"
                value={shipping.country}
                onChange={(event) => updateShippingField("country", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/40"
                placeholder="Country"
              />
              <datalist id="checkout-country-options">
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country} value={country} />
                ))}
              </datalist>
            </div>
            <input
              type="text"
              value={shipping.city}
              onChange={(event) => updateShippingField("city", event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/40"
              placeholder="City"
            />
            <input
              type="text"
              value={shipping.state}
              onChange={(event) => updateShippingField("state", event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/40"
              placeholder="State / Province / Region"
            />
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <input
              type="text"
              value={shipping.line1}
              onChange={(event) => updateShippingField("line1", event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/40"
              placeholder={isProfileLoading ? "Loading address..." : "Street address, house number, building"}
            />
            <input
              type="text"
              value={shipping.postalCode}
              onChange={(event) => updateShippingField("postalCode", event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/40"
              placeholder="ZIP / Postal code"
            />
          </div>

          <div className="mt-3 grid gap-3">
            <input
              type="text"
              value={shipping.line2}
              onChange={(event) => updateShippingField("line2", event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9EB55]/40"
              placeholder="Apartment, suite, floor, landmark (optional)"
            />
          </div>

          <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Address Validation</p>
            <p className="mt-2 text-xs leading-5 text-white/60">
              {shippingError || "The delivery address looks complete. Confirm it to continue immediately into the selected payment method."}
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setPaymentMethod("stripe")}
              className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                paymentMethod === "stripe"
                  ? "border-[#C9EB55]/40 bg-[#C9EB55]/12 text-white"
                  : "border-white/10 bg-black/20 text-white/72 hover:border-[#C9EB55]/20"
              }`}
            >
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C9EB55]">Pay By Card</span>
              <span className="mt-2 block text-sm leading-5">Stay in the checkout page and complete payment with Stripe Elements.</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("nowpayments")}
              className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                paymentMethod === "nowpayments"
                  ? "border-[#C9EB55]/40 bg-[#C9EB55]/12 text-white"
                  : "border-white/10 bg-black/20 text-white/72 hover:border-[#C9EB55]/20"
              }`}
            >
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C9EB55]">Pay With Crypto</span>
              <span className="mt-2 block text-sm leading-5">You will be redirected to NOWPayments to choose the crypto and complete the payment securely.</span>
            </button>
          </div>

          <button
            type="button"
            onClick={continueToPayment}
            className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-[#C9EB55]/45 bg-[#C9EB55] px-5 py-3.5 text-sm font-black uppercase tracking-[0.18em] text-black shadow-[0_0_24px_rgba(201,235,85,0.22)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_34px_rgba(201,235,85,0.3)]"
          >
            {paymentMethod === "nowpayments" ? "Confirm Address And Continue To Crypto" : "Confirm Shipping Address"}
          </button>
        </div>
      ) : (
        <div className="rounded-[28px] border border-[#C9EB55]/20 bg-[#C9EB55]/[0.04] p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C9EB55]/80">Step 2 · Payment Details</p>
              <h3 className="mt-2 text-xl font-bold text-white">Shipping Confirmed, Payment Unlocked</h3>
              <p className="mt-1 text-xs leading-5 text-white/55">This payment step is now tied to the confirmed delivery address below and to the selected payment method.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShippingConfirmed(false);
                setCheckoutState(null);
                setMessage({ type: null, text: "" });
              }}
              className="rounded-full border border-white/12 bg-black/25 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70 hover:border-[#C9EB55]/30 hover:text-[#C9EB55]"
            >
              Edit Address
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Confirmed Shipping Summary</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/75">
                <span className="block text-[11px] uppercase tracking-[0.16em] text-white/40">Recipient</span>
                <span className="mt-1 block">{shipping.fullName}</span>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/75">
                <span className="block text-[11px] uppercase tracking-[0.16em] text-white/40">Phone</span>
                <span className="mt-1 block">{shipping.phone}</span>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/75 md:col-span-2">
                <span className="block text-[11px] uppercase tracking-[0.16em] text-white/40">Address</span>
                <span className="mt-1 block">{shipping.line1}</span>
                {shipping.line2 ? <span className="mt-1 block text-white/55">{shipping.line2}</span> : null}
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/75 md:col-span-2">
                <span className="block text-[11px] uppercase tracking-[0.16em] text-white/40">Destination</span>
                <span className="mt-1 block">{[shipping.city, shipping.state, shipping.postalCode, shipping.country].filter(Boolean).join(", ")}</span>
              </div>
            </div>
          </div>

          {message.type ? (
            <p
              className={`mt-4 rounded-2xl border px-4 py-3 text-xs leading-5 ${
                message.type === "success"
                  ? "border-[#C9EB55]/25 bg-[#C9EB55]/10 text-[#E8FF9A]"
                  : "border-red-400/20 bg-red-500/10 text-red-200"
              }`}
            >
              {message.text}
            </p>
          ) : null}

          {checkoutState && stripePromise ? (
            <div className="mt-4 rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9EB55]/80">Card Details</p>
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: checkoutState.clientSecret,
                  appearance: {
                    theme: "night",
                    variables: {
                      colorPrimary: "#C9EB55",
                      colorBackground: "#0b0f0a",
                      colorText: "#f3f4f6",
                      colorDanger: "#ef4444",
                      borderRadius: "14px",
                    },
                  },
                }}
              >
                <CheckoutPaymentForm intentId={checkoutState.intentId} token={checkoutState.token} tier={tier} />
              </Elements>
            </div>
          ) : null}

          {checkoutState?.mode === "nowpayments" && checkoutState.hostedUrl ? (
            <div className="mt-4 rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9EB55]/80">Crypto Checkout</p>
              <p className="mt-3 text-sm leading-6 text-white/65">
                If the redirect did not open automatically, continue to NOWPayments manually using the button below.
              </p>
              <a
                href={checkoutState.hostedUrl}
                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-[#C9EB55]/45 bg-[#C9EB55] px-5 py-3.5 text-sm font-black uppercase tracking-[0.18em] text-black shadow-[0_0_24px_rgba(201,235,85,0.22)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_34px_rgba(201,235,85,0.3)]"
              >
                Open NOWPayments
              </a>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
