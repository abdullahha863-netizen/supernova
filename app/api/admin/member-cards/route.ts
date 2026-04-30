import { NextResponse } from "next/server";
import {
  listMemberCardFulfillments,
  updateMemberCardFulfillment,
  type MemberCardFulfillmentStatus,
} from "@/lib/dashboardDb";
import { isAdminRequest } from "@/lib/adminAuth";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";

function normalizeStatus(value: unknown): MemberCardFulfillmentStatus | null {
  if (value === "queued" || value === "in_production" || value === "shipped" || value === "delivered") {
    return value;
  }
  return null;
}

function normalizeText(value: unknown, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

export async function GET(req: Request) {
  const rl = rateLimit(`${getClientIp(req)}:admin-member-cards-get`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });

  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await listMemberCardFulfillments(100);
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error("[admin/member-cards][GET]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const rl = rateLimit(`${getClientIp(req)}:admin-member-cards-patch`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });

  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    const checkoutIntentId = normalizeText(body?.checkoutIntentId, 80);
    const fulfillmentStatus = normalizeStatus(body?.fulfillmentStatus);

    if (!checkoutIntentId) {
      return NextResponse.json({ ok: false, error: "checkoutIntentId is required." }, { status: 400 });
    }
    if (!fulfillmentStatus) {
      return NextResponse.json({ ok: false, error: "Invalid fulfillment status." }, { status: 400 });
    }

    const updated = await updateMemberCardFulfillment({
      checkoutIntentId,
      fulfillmentStatus,
      carrier: normalizeText(body?.carrier, 60),
      trackingNumber: normalizeText(body?.trackingNumber, 80),
      trackingUrl: normalizeText(body?.trackingUrl, 300),
      notes: normalizeText(body?.notes, 1000),
      estimatedDelivery: normalizeText(body?.estimatedDelivery, 60),
      shippingFullName: normalizeText(body?.shippingFullName, 80),
      shippingPhone: normalizeText(body?.shippingPhone, 30),
      shippingLine1: normalizeText(body?.shippingLine1, 120),
      shippingLine2: normalizeText(body?.shippingLine2, 120),
      shippingCity: normalizeText(body?.shippingCity, 60),
      shippingState: normalizeText(body?.shippingState, 60),
      shippingPostalCode: normalizeText(body?.shippingPostalCode, 20),
      shippingCountry: normalizeText(body?.shippingCountry, 60),
    });

    if (!updated) {
      return NextResponse.json({ ok: false, error: "Fulfillment record not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, item: updated });
  } catch (error) {
    console.error("[admin/member-cards][PATCH]", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
