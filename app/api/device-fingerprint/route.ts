import { NextRequest, NextResponse } from "next/server";
import { assessDeviceFingerprintRisk, extractDeviceDataFromRequest, generateDeviceFingerprint } from "@/lib/deviceFingerprint";
import { getUserIdFromRequest } from "@/lib/requestUser";

// In production, this would be stored in database
const deviceHistory: Record<string, Array<{ fingerprint: string; timestamp: Date; risk_score: number }>> = {};

export async function POST(req: NextRequest) {
  try {
    const authenticatedUserId = await getUserIdFromRequest(req);

    // Extract device data from request
    const deviceData = extractDeviceDataFromRequest(req);
    const userId = authenticatedUserId || `anon:${generateDeviceFingerprint(deviceData).slice(0, 32)}`;

    // Get previous fingerprints for this user
    const previousFingerprints = deviceHistory[userId] || [];

    // Assess risk
    const result = assessDeviceFingerprintRisk(userId, deviceData, previousFingerprints);

    // Store current fingerprint (simplified - in production use database)
    deviceHistory[userId] = [
      ...(deviceHistory[userId] || []),
      {
        fingerprint: result.fingerprint,
        timestamp: new Date(),
        risk_score: result.risk_score
      }
    ].slice(-10); // Keep last 10

    return NextResponse.json(result);
  } catch (error) {
    console.error('[device-fingerprint]', error);
    return NextResponse.json(
      { error: 'Failed to process device fingerprint' },
      { status: 500 }
    );
  }
}
