import { fraudSafeModeConfig } from "@/lib/fraudSafeMode";

// Fraud Decision Brain - Final Integration Layer
// Combines all fraud detection signals into a single decision

export interface FraudDecisionInput {
  device_risk_score: number;
  ip_risk_score: number;
  behavior_risk_score: number;
  anomaly_score: number;
}

export interface FraudDecisionResult {
  fraud_score: number;
  decision: "ALLOW" | "REVIEW" | "BLOCK";
  dominant_factor: "DEVICE" | "IP" | "BEHAVIOR" | "ANOMALY";
  final_reason: string;
}

/**
 * Calculate final fraud score with weighted combination
 */
function calculateFinalFraudScore(input: FraudDecisionInput): number {
  const { device_risk_score, ip_risk_score, behavior_risk_score, anomaly_score } = input;

  const fraudScore = Math.round(
    (device_risk_score * 0.20) +
    (ip_risk_score * 0.30) +
    (behavior_risk_score * 0.30) +
    (anomaly_score * 0.20)
  );

  return Math.min(100, Math.max(0, fraudScore));
}

/**
 * Apply dynamic override rules
 */
function applyOverrideRules(input: FraudDecisionInput, baseScore: number): "ALLOW" | "REVIEW" | "BLOCK" {
  const { anomaly_score, behavior_risk_score, ip_risk_score, device_risk_score } = input;
  const { thresholds, overrideRules, enabled } = fraudSafeModeConfig;

  if (enabled) {
    const isMultiSignalBlock =
      (device_risk_score >= overrideRules.multiSignal.device && ip_risk_score >= overrideRules.multiSignal.ip && behavior_risk_score >= overrideRules.multiSignal.behavior) ||
      (anomaly_score >= overrideRules.multiSignal.anomaly && ip_risk_score >= overrideRules.multiSignal.ip && behavior_risk_score >= overrideRules.multiSignal.behavior);

    if (isMultiSignalBlock) {
      return "BLOCK";
    }

    if (anomaly_score >= overrideRules.anomalyWithIp.anomaly && ip_risk_score >= overrideRules.anomalyWithIp.ip) {
      return "BLOCK";
    }

    if (behavior_risk_score >= overrideRules.behaviorWithIp.behavior && ip_risk_score >= overrideRules.behaviorWithIp.ip) {
      return "BLOCK";
    }

    if (baseScore <= thresholds.allow) {
      return "ALLOW";
    }

    return "REVIEW";
  }

  if (baseScore <= 39) {
    return "ALLOW";
  } else if (baseScore <= 69) {
    return "REVIEW";
  } else {
    return "BLOCK";
  }
}

/**
 * Determine the dominant factor (highest weighted contribution)
 */
function determineDominantFactor(input: FraudDecisionInput): "DEVICE" | "IP" | "BEHAVIOR" | "ANOMALY" {
  const contributions = {
    DEVICE: input.device_risk_score * 0.20,
    IP: input.ip_risk_score * 0.30,
    BEHAVIOR: input.behavior_risk_score * 0.30,
    ANOMALY: input.anomaly_score * 0.20
  };

  return Object.entries(contributions).reduce((a, b) => contributions[a[0] as keyof typeof contributions] > contributions[b[0] as keyof typeof contributions] ? a : b)[0] as "DEVICE" | "IP" | "BEHAVIOR" | "ANOMALY";
}

/**
 * Generate final insight explaining the decision
 */
function generateFinalReason(
  decision: "ALLOW" | "REVIEW" | "BLOCK",
  dominantFactor: string,
  input: FraudDecisionInput,
  fraudScore: number
): string {
  const factorNames = {
    DEVICE: "device fingerprint",
    IP: "IP reputation",
    BEHAVIOR: "behavioral patterns",
    ANOMALY: "population anomaly"
  };

  const factorName = factorNames[dominantFactor as keyof typeof factorNames];

  if (decision === "BLOCK") {
    if (input.anomaly_score > 90) {
      return `Decision driven by extreme anomaly patterns overriding standard scoring.`;
    }
    if (input.behavior_risk_score > 85 && input.ip_risk_score > 80) {
      return `Decision driven by combined high behavioral and IP risk factors.`;
    }
    return `Decision driven by high ${factorName} risk with overall fraud score of ${fraudScore}.`;
  }

  if (decision === "REVIEW") {
    return `Decision requires review due to elevated ${factorName} indicators.`;
  }

  return `Decision allows transaction with acceptable risk levels across all factors.`;
}

/**
 * Main function: Fraud Decision Brain
 */
export function makeFraudDecision(input: FraudDecisionInput): FraudDecisionResult {
  // Calculate final fraud score
  const fraudScore = calculateFinalFraudScore(input);

  // Apply dynamic overrides
  const decision = applyOverrideRules(input, fraudScore);

  // Determine dominant factor
  const dominantFactor = determineDominantFactor(input);

  // Generate final reason
  const finalReason = generateFinalReason(decision, dominantFactor, input, fraudScore);

  return {
    fraud_score: fraudScore,
    decision,
    dominant_factor: dominantFactor,
    final_reason: finalReason
  };
}