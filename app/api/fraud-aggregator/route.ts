import { NextRequest, NextResponse } from "next/server";
import { aggregateFraudScores, FraudInput } from "@/lib/fraudAggregator";
import { DeviceFingerprintData } from "@/lib/deviceFingerprint";

// Mock storage - in production, fetch from database
const mockPreviousFingerprints: Record<string, any[]> = {};
const mockHistoricalEvents: Record<string, any[]> = {};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, deviceData, ipAddress, currentEvents = [] } = body;

    if (!userId || !deviceData || !ipAddress) {
      return NextResponse.json(
        { error: "userId, deviceData, and ipAddress are required" },
        { status: 400 }
      );
    }

    // Prepare input for aggregation
    const input: FraudInput = {
      userId,
      deviceData: deviceData as DeviceFingerprintData,
      ipAddress,
      previousFingerprints: mockPreviousFingerprints[userId] || [],
      historicalEvents: mockHistoricalEvents[userId] || [],
      currentEvents
    };

    // Aggregate fraud scores
    const result = aggregateFraudScores(input);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[fraud-aggregator]', error);
    return NextResponse.json(
      { error: 'Failed to aggregate fraud scores' },
      { status: 500 }
    );
  }
}