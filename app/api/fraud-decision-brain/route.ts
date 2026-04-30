import { NextRequest, NextResponse } from "next/server";
import { makeFraudDecision, FraudDecisionInput } from "@/lib/fraudDecisionBrain";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      device_risk_score,
      ip_risk_score,
      behavior_risk_score,
      anomaly_score
    } = body;

    // Validate required inputs
    if (
      typeof device_risk_score !== 'number' ||
      typeof ip_risk_score !== 'number' ||
      typeof behavior_risk_score !== 'number' ||
      typeof anomaly_score !== 'number'
    ) {
      return NextResponse.json(
        { error: "All risk scores (device_risk_score, ip_risk_score, behavior_risk_score, anomaly_score) must be numbers" },
        { status: 400 }
      );
    }

    // Prepare input
    const input: FraudDecisionInput = {
      device_risk_score,
      ip_risk_score,
      behavior_risk_score,
      anomaly_score
    };

    // Make fraud decision
    const result = makeFraudDecision(input);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[fraud-decision-brain]', error);
    return NextResponse.json(
      { error: 'Failed to process fraud decision' },
      { status: 500 }
    );
  }
}