import { NextRequest, NextResponse } from "next/server";
import { analyzeUserAnomaly } from "@/lib/anomalyIntelligence";

// Mock storage - in production, fetch from database
const userEvents: Record<string, any[]> = {};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, events, timeWindowDays = 7 } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Add new events to user timeline if provided
    if (events && Array.isArray(events)) {
      if (!userEvents[userId]) {
        userEvents[userId] = [];
      }
      userEvents[userId].push(...events);
    }

    // Get user events (use provided or stored)
    const userEventData = events || userEvents[userId] || [];

    // Analyze anomaly
    const result = analyzeUserAnomaly(userId, userEventData, timeWindowDays);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[anomaly-intelligence]', error);
    return NextResponse.json(
      { error: 'Failed to analyze user anomaly' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve anomaly analysis
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const timeWindowDays = parseInt(searchParams.get('timeWindowDays') || '7');

    if (!userId) {
      return NextResponse.json({ error: "userId parameter required" }, { status: 400 });
    }

    const userEventData = userEvents[userId] || [];

    const result = analyzeUserAnomaly(userId, userEventData, timeWindowDays);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[anomaly-intelligence-get]', error);
    return NextResponse.json(
      { error: 'Failed to retrieve anomaly analysis' },
      { status: 500 }
    );
  }
}