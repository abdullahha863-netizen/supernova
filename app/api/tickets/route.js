import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserIdFromRequestSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";

const prisma = new PrismaClient();
const SUPPORTED_PRIORITIES = new Set(["Starter", "Silver", "Hash Pro", "Titan Elite"]);
const PAID_PRIORITIES = new Set(["Silver", "Hash Pro", "Titan Elite"]);
const PLAN_RANK = {
  Starter: 0,
  Silver: 1,
  "Hash Pro": 2,
  "Titan Elite": 3,
};

function normalizePlan(value) {
  if (value === "Silver" || value === "Hash Pro" || value === "Titan Elite") return value;
  if (value === "silver") return "Silver";
  if (value === "hash-pro") return "Hash Pro";
  if (value === "titan-elite") return "Titan Elite";
  return "Starter";
}

function planMeetsRequested(actualPlan, requestedPlan) {
  return PLAN_RANK[normalizePlan(actualPlan)] >= PLAN_RANK[normalizePlan(requestedPlan)];
}

async function getVerifiedPlanForAuthenticatedUser(userId, requestedPlan) {
  const profile = await prisma.minerProfile.findUnique({
    where: { userId },
    select: { plan: true },
  });
  const profilePlan = normalizePlan(profile?.plan);
  if (planMeetsRequested(profilePlan, requestedPlan)) {
    return profilePlan;
  }

  const fulfillment = await prisma.memberCardFulfillment.findFirst({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { tier: true },
  });
  const fulfillmentPlan = normalizePlan(fulfillment?.tier);
  if (planMeetsRequested(fulfillmentPlan, requestedPlan)) {
    return fulfillmentPlan;
  }

  const checkout = await prisma.checkoutIntent.findFirst({
    where: {
      userId,
      status: "succeeded",
      fulfilledAt: { not: null },
    },
    orderBy: { fulfilledAt: "desc" },
    select: { tier: true },
  });
  const checkoutPlan = normalizePlan(checkout?.tier);
  if (planMeetsRequested(checkoutPlan, requestedPlan)) {
    return checkoutPlan;
  }

  return null;
}

async function getVerifiedPlanForEmailAndMembershipId(email, membershipId, requestedPlan) {
  if (!email || !membershipId) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  const fulfillment = await prisma.memberCardFulfillment.findFirst({
    where: {
      shippingEmail: email,
      OR: [
        { checkoutIntentId: membershipId },
        ...(Number.isInteger(Number(membershipId)) ? [{ id: Number(membershipId) }] : []),
      ],
    },
    select: { tier: true },
  });
  const fulfillmentPlan = normalizePlan(fulfillment?.tier);
  if (planMeetsRequested(fulfillmentPlan, requestedPlan)) {
    return fulfillmentPlan;
  }

  const checkout = await prisma.checkoutIntent.findFirst({
    where: {
      id: membershipId,
      status: "succeeded",
      fulfilledAt: { not: null },
      ...(user ? { userId: user.id } : { userId: "__no_matching_user__" }),
    },
    select: { tier: true },
  });
  const checkoutPlan = normalizePlan(checkout?.tier);
  if (planMeetsRequested(checkoutPlan, requestedPlan)) {
    return checkoutPlan;
  }

  return null;
}

async function verifyPriorityMembership(request, email, membershipId, requestedPlan) {
  const sessionUserId = await getUserIdFromRequestSession(request);
  if (sessionUserId) {
    const verifiedPlan = await getVerifiedPlanForAuthenticatedUser(sessionUserId, requestedPlan);
    if (verifiedPlan) {
      return { verified: true, verifiedPlan, method: "authenticated session" };
    }
  }

  const verifiedPlan = await getVerifiedPlanForEmailAndMembershipId(email, membershipId, requestedPlan);
  if (verifiedPlan) {
    return { verified: true, verifiedPlan, method: "email and membership ID" };
  }

  return { verified: false, verifiedPlan: null, method: null };
}

export async function POST(request) {
  try {
    const rl = rateLimit(getClientIp(request), {
      windowMs: 5 * 60_000,
      max: 12,
    });
    if (!rl.ok) {
      return NextResponse.json(
        { success: false, message: "Rate limit" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      title,
      email,
      priority,
      description,
      cardLast4,
      screenshotUrl,
    } = body || {};

    const titleValue = String(title || "").trim();
    const emailValue = String(email || "").trim().toLowerCase();
    const normalizedPriority = String(priority || "").trim();
    const descriptionValue = String(description || "").trim();
    const cardLast4Value = cardLast4 ? String(cardLast4).trim() : "";
    const screenshotUrlValue = screenshotUrl ? String(screenshotUrl).trim() : "";

    if (!titleValue || !emailValue || !normalizedPriority || !descriptionValue) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
    if (!emailOk) {
      return NextResponse.json(
        { success: false, message: "Invalid email format" },
        { status: 400 }
      );
    }

    if (!SUPPORTED_PRIORITIES.has(normalizedPriority)) {
      return NextResponse.json(
        { success: false, message: "Invalid support priority" },
        { status: 400 }
      );
    }

    if (titleValue.length > 160 || descriptionValue.length > 5000) {
      return NextResponse.json(
        { success: false, message: "Input too long" },
        { status: 400 }
      );
    }

    const requiresCard = ["Silver", "Hash Pro", "Titan Elite"].includes(normalizedPriority);
    if (requiresCard && !cardLast4Value) {
      return NextResponse.json(
        { success: false, message: "cardLast4 is required for this priority" },
        { status: 400 }
      );
    }

    let savedPriority = normalizedPriority;
    let savedDescription = descriptionValue;

    if (PAID_PRIORITIES.has(normalizedPriority)) {
      const verification = await verifyPriorityMembership(request, emailValue, cardLast4Value, normalizedPriority);

      if (verification.verified) {
        savedDescription = [
          "Priority membership verified: yes",
          `Verified plan: ${verification.verifiedPlan}`,
          `Verification method: ${verification.method}`,
          "",
          descriptionValue,
        ].join("\n");
      } else {
        savedPriority = "Starter";
        savedDescription = [
          "Priority membership verified: no",
          `Requested priority: ${normalizedPriority}`,
          `Provided membership ID: ${cardLast4Value}`,
          "",
          descriptionValue,
        ].join("\n");
      }
    }

    if (savedDescription.length > 5000) {
      savedDescription = savedDescription.slice(0, 5000);
    }

    const data = {
      title: titleValue,
      email: emailValue,
      priority: savedPriority,
      description: savedDescription,
      cardLast4: cardLast4Value || null,
      screenshotUrl: screenshotUrlValue || null,
    };

    await prisma.ticket.create({ data });
    await prisma.notification.create({
      data: {
        type: "support_ticket",
        title: "New Support Ticket",
        message: "A user submitted a new support ticket.",
        severity: "low",
        link: "/admin/dashboard/tickets",
      },
    });

    return NextResponse.json({ success: true, message: "Ticket created successfully" });
  } catch (error) {
    console.error("Failed to create ticket", error);
    return NextResponse.json(
      { success: false, message: "Failed to create ticket" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ success: false, message: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ success: false, message: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ success: false, message: "Method not allowed" }, { status: 405 });
}
