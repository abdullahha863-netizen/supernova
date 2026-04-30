// Fraud Score Aggregator - Combines results from all three detection engines
// Device (25%), IP (35%), Behavior (40%)

import { assessDeviceFingerprintRisk, DeviceFingerprintData } from "@/lib/deviceFingerprint";
import { assessIPReputation } from "@/lib/ipReputation";
import { analyzeUserBehavior } from "@/lib/behaviorTimeline";

export interface FraudAggregationResult {
  fraud_score: number;
  decision: "ALLOW" | "REVIEW" | "BLOCK";
  dominant_factor: "DEVICE" | "IP" | "BEHAVIOR";
  final_reason: string;
}

export interface FraudInput {
  userId: string;
  deviceData: DeviceFingerprintData;
  ipAddress: string;
  // Previous fingerprints would be fetched from database in production
  previousFingerprints?: any[];
  // Historical events would be fetched from database in production
  historicalEvents?: any[];
  currentEvents?: any[];
}

/**
 * Aggregate fraud scores from all three engines
 */
export function aggregateFraudScores(input: FraudInput): FraudAggregationResult {
  const { userId, deviceData, ipAddress, previousFingerprints = [], historicalEvents = [], currentEvents = [] } = input;

  // Get device risk score
  const deviceResult = assessDeviceFingerprintRisk(userId, deviceData, previousFingerprints);
  const deviceScore = deviceResult.risk_score;

  // Get IP risk score
  const ipResult = assessIPReputation({ ip: ipAddress });
  const ipScore = ipResult.risk_score;

  // Get behavior risk score (using temporal_score from sequence analysis)
  const behaviorResult = analyzeUserBehavior(userId, currentEvents, historicalEvents);
  const behaviorScore = behaviorResult.temporal_score;

  // Calculate weighted fraud score
  const fraudScore = Math.round(
    (deviceScore * 0.25) +
    (ipScore * 0.35) +
    (behaviorScore * 0.40)
  );

  // Determine decision
  let decision: "ALLOW" | "REVIEW" | "BLOCK";
  if (fraudScore <= 39) {
    decision = "ALLOW";
  } else if (fraudScore <= 69) {
    decision = "REVIEW";
  } else {
    decision = "BLOCK";
  }

  // Determine dominant factor
  const scores = { DEVICE: deviceScore, IP: ipScore, BEHAVIOR: behaviorScore };
  const dominantFactor = Object.entries(scores).reduce((a, b) => scores[a[0] as keyof typeof scores] > scores[b[0] as keyof typeof scores] ? a : b)[0] as "DEVICE" | "IP" | "BEHAVIOR";

  // Generate final reason (one sentence)
  const reason = generateFinalReason(fraudScore, decision, dominantFactor, deviceResult.reason, behaviorResult.insight_summary);

  return {
    fraud_score: fraudScore,
    decision,
    dominant_factor: dominantFactor,
    final_reason: reason
  };
}

/**
 * Generate a single clear sentence explaining the final decision
 */
function generateFinalReason(
  fraudScore: number,
  decision: string,
  dominantFactor: string,
  deviceReason: string,
  behaviorInsight: string
): string {
  const baseReason = `Transaction ${decision.toLowerCase()} with fraud score ${fraudScore} due to ${dominantFactor.toLowerCase()} risk factors`;

  if (decision === "BLOCK") {
    return `${baseReason} indicating high fraud probability.`;
  } else if (decision === "REVIEW") {
    return `${baseReason} requiring manual verification.`;
  } else {
    return `${baseReason} within acceptable limits.`;
  }
}
