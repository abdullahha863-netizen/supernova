import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";

const SAFE_ID_REGEX = /^[A-Za-z0-9_.:@\-]{3,128}$/;
const SAFE_SOURCE_REGEX = /^[A-Za-z0-9_-]{1,32}$/;

export function validateId(value: unknown, name: string) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    throw new Error(`${name} is required`);
  }

  if (!SAFE_ID_REGEX.test(raw)) {
    throw new Error(`${name} contains invalid characters or length`);
  }

  return raw;
}

export function validateNonEmptyString(value: unknown, name: string) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    throw new Error(`${name} is required`);
  }
  return raw;
}

export function validatePositiveInt(value: unknown, name: string) {
  if (value === null || value === undefined || value === "") {
    throw new Error(`${name} is required`);
  }

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || Number.isNaN(numberValue) || !Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return numberValue;
}

export function validateNonNegativeInt(value: unknown, name: string) {
  if (value === null || value === undefined || value === "") {
    throw new Error(`${name} is required`);
  }

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || Number.isNaN(numberValue) || !Number.isInteger(numberValue) || numberValue < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }

  return numberValue;
}

export function validateQueryInt(value: unknown, name: string, min: number, max: number) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || Number.isNaN(numberValue) || !Number.isInteger(numberValue)) {
    throw new Error(`${name} must be an integer`);
  }
  if (numberValue < min || numberValue > max) {
    throw new Error(`${name} must be between ${min} and ${max}`);
  }
  return numberValue;
}

export function validateSource(value: unknown, name: string) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    throw new Error(`${name} is required`);
  }
  if (!SAFE_SOURCE_REGEX.test(raw)) {
    throw new Error(`${name} contains invalid characters`);
  }
  return raw;
}

export function validateOptionalId(value: unknown, name: string) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  if (!SAFE_ID_REGEX.test(raw)) {
    throw new Error(`${name} contains invalid characters or length`);
  }
  return raw;
}

export function safeJsonBody(body: unknown): Record<string, any> {
  if (body === null || body === undefined) {
    return {};
  }
  if (typeof body === "object" && body !== null) {
    return body as Record<string, any>;
  }
  return {};
}

export function enforceRateLimit(req: NextRequest, routeKey: string, options: { windowMs?: number; max?: number } = {}) {
  const ip = getClientIp(req);
  const key = `ratelimit:${routeKey}:${ip}`;
  const result = rateLimit(key, options);
  if (!result.ok) {
    const response = NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
    response.headers.set("Retry-After", String(Math.ceil(result.retryAfter ?? 1 / 1000)));
    return response;
  }
  return null;
}

export function safeResponseError(errorMessage: string, status = 400) {
  return NextResponse.json({ ok: false, error: errorMessage }, { status });
}
