import { NextRequest, NextResponse } from "next/server";
import {
  analyzeUserBehavior,
  createTimelineEvent,
  TimelineEvent
} from "@/lib/behaviorTimeline";

// Mock storage - in production, use database
const userTimelines: Record<string, TimelineEvent[]> = {};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, events, analyzeCurrent = true } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Initialize user timeline if not exists
    if (!userTimelines[userId]) {
      userTimelines[userId] = [];
    }

    // Add new events to timeline
    if (events && Array.isArray(events)) {
      const newEvents = events.map((event: any) =>
        createTimelineEvent(userId, event.eventType, event.metadata || {})
      );
      userTimelines[userId].push(...newEvents);
    }

    // Keep only last 1000 events per user
    if (userTimelines[userId].length > 1000) {
      userTimelines[userId] = userTimelines[userId].slice(-1000);
    }

    // Analyze behavior if requested
    let analysisResult = null;
    if (analyzeCurrent) {
      // Get current session events (last 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const currentSessionEvents = userTimelines[userId].filter(
        e => e.timestamp >= twentyFourHoursAgo
      );

      analysisResult = analyzeUserBehavior(
        userId,
        currentSessionEvents,
        userTimelines[userId]
      );
    }

    return NextResponse.json({
      success: true,
      eventsStored: events?.length || 0,
      totalEvents: userTimelines[userId].length,
      analysis: analysisResult
    });
  } catch (error) {
    console.error('[behavior-timeline]', error);
    return NextResponse.json(
      { error: 'Failed to process behavior timeline' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve user behavior analysis
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: "userId parameter required" }, { status: 400 });
    }

    const timeline = userTimelines[userId] || [];

    // Analyze current behavior (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const currentSessionEvents = timeline.filter(e => e.timestamp >= twentyFourHoursAgo);

    const analysis = analyzeUserBehavior(userId, currentSessionEvents, timeline);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('[behavior-timeline-get]', error);
    return NextResponse.json(
      { error: 'Failed to retrieve behavior analysis' },
      { status: 500 }
    );
  }
}