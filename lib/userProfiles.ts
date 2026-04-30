import { prisma } from "@/lib/prisma";

export type ShippingProfile = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export const EMPTY_SHIPPING_PROFILE: ShippingProfile = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

export function normalizeShippingProfile(input: Partial<ShippingProfile> | null | undefined): ShippingProfile {
  return {
    fullName: String(input?.fullName || "").trim(),
    phone: String(input?.phone || "").trim(),
    line1: String(input?.line1 || "").trim(),
    line2: String(input?.line2 || "").trim(),
    city: String(input?.city || "").trim(),
    state: String(input?.state || "").trim(),
    postalCode: String(input?.postalCode || "").trim(),
    country: String(input?.country || "").trim(),
  };
}

export function validateShippingProfile(profile: ShippingProfile) {
  const hasAnyValue = Object.values(profile).some((value) => value.length > 0);
  if (!hasAnyValue) {
    return { ok: true as const };
  }

  if (profile.fullName.length < 2 || profile.fullName.length > 80) {
    return { ok: false as const, error: "Shipping full name must be 2-80 characters." };
  }

  if (profile.line1.length < 5 || profile.line1.length > 120) {
    return { ok: false as const, error: "Shipping address line 1 must be 5-120 characters." };
  }

  if (profile.city.length < 2 || profile.city.length > 60) {
    return { ok: false as const, error: "Shipping city must be 2-60 characters." };
  }

  if (profile.postalCode.length < 3 || profile.postalCode.length > 20) {
    return { ok: false as const, error: "Shipping postal code must be 3-20 characters." };
  }

  if (profile.country.length < 2 || profile.country.length > 60) {
    return { ok: false as const, error: "Shipping country must be 2-60 characters." };
  }

  if (profile.phone && profile.phone.length > 30) {
    return { ok: false as const, error: "Shipping phone must be 30 characters or less." };
  }

  return { ok: true as const };
}

export function validateRequiredShippingProfile(profile: ShippingProfile) {
  const base = validateShippingProfile(profile);
  if (!base.ok) return base;

  if (!profile.fullName) {
    return { ok: false as const, error: "Shipping full name is required." };
  }
  if (!profile.phone) {
    return { ok: false as const, error: "Shipping phone is required." };
  }
  if (!profile.line1) {
    return { ok: false as const, error: "Shipping address line 1 is required." };
  }
  if (!profile.city) {
    return { ok: false as const, error: "Shipping city is required." };
  }
  if (!profile.postalCode) {
    return { ok: false as const, error: "Shipping postal code is required." };
  }
  if (!profile.country) {
    return { ok: false as const, error: "Shipping country is required." };
  }

  return { ok: true as const };
}

export async function getShippingProfile(userId: string) {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: {
      shippingFullName: true,
      shippingPhone: true,
      shippingLine1: true,
      shippingLine2: true,
      shippingCity: true,
      shippingState: true,
      shippingPostalCode: true,
      shippingCountry: true,
    },
  });

  if (!profile) {
    return EMPTY_SHIPPING_PROFILE;
  }

  return normalizeShippingProfile({
    fullName: profile.shippingFullName,
    phone: profile.shippingPhone,
    line1: profile.shippingLine1,
    line2: profile.shippingLine2,
    city: profile.shippingCity,
    state: profile.shippingState,
    postalCode: profile.shippingPostalCode,
    country: profile.shippingCountry,
  });
}

export async function upsertShippingProfile(userId: string, shippingProfile: ShippingProfile) {
  const data = {
    shippingFullName: shippingProfile.fullName,
    shippingPhone: shippingProfile.phone,
    shippingLine1: shippingProfile.line1,
    shippingLine2: shippingProfile.line2,
    shippingCity: shippingProfile.city,
    shippingState: shippingProfile.state,
    shippingPostalCode: shippingProfile.postalCode,
    shippingCountry: shippingProfile.country,
    updatedAt: new Date(),
  };

  await prisma.userProfile.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      ...data,
    },
  });
}
