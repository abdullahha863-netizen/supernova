// Anomaly Intelligence Layer - Population Baseline Comparison
// Compares user behavior against entire user population baseline

export interface PopulationBaseline {
  avgSessionDuration: number; // minutes
  avgLoginFrequency: number; // per day
  avgActivityRate: number; // activities per session
  avgCashoutFrequency: number; // per week
  stdSessionDuration: number; // standard deviation
  stdLoginFrequency: number;
  stdActivityRate: number;
  stdCashoutFrequency: number;
}

export interface UserBehaviorMetrics {
  sessionDuration: number;
  loginFrequency: number;
  activityRate: number;
  cashoutFrequency: number;
}

export interface AnomalyAnalysisResult {
  user_id: string;
  anomaly_score: number;
  percentile: number;
  is_anomalous: boolean;
  insight: string;
}

// Population baseline (would be calculated from all users in production)
const POPULATION_BASELINE: PopulationBaseline = {
  avgSessionDuration: 45, // minutes
  avgLoginFrequency: 2, // per day
  avgActivityRate: 10, // activities per session
  avgCashoutFrequency: 1, // per week
  stdSessionDuration: 15,
  stdLoginFrequency: 0.8,
  stdActivityRate: 3,
  stdCashoutFrequency: 0.3
};

/**
 * Calculate anomaly score based on deviation from population baseline
 */
function calculateAnomalyScore(userMetrics: UserBehaviorMetrics, baseline: PopulationBaseline): number {
  const deviations = {
    sessionDuration: Math.abs(userMetrics.sessionDuration - baseline.avgSessionDuration) / baseline.stdSessionDuration,
    loginFrequency: Math.abs(userMetrics.loginFrequency - baseline.avgLoginFrequency) / baseline.stdLoginFrequency,
    activityRate: Math.abs(userMetrics.activityRate - baseline.avgActivityRate) / baseline.stdActivityRate,
    cashoutFrequency: Math.abs(userMetrics.cashoutFrequency - baseline.avgCashoutFrequency) / baseline.stdCashoutFrequency
  };

  // Weighted anomaly score (0-100)
  const weights = { sessionDuration: 0.3, loginFrequency: 0.2, activityRate: 0.3, cashoutFrequency: 0.2 };
  const score = Object.entries(deviations).reduce((sum, [key, dev]) => {
    return sum + (dev * weights[key as keyof typeof weights]);
  }, 0);

  return Math.min(100, Math.max(0, score * 25)); // Scale to 0-100
}

/**
 * Calculate percentile (0-100) where higher percentile means more anomalous
 */
function calculatePercentile(userMetrics: UserBehaviorMetrics, baseline: PopulationBaseline): number {
  // Using normal distribution approximation
  const zScores = {
    sessionDuration: (userMetrics.sessionDuration - baseline.avgSessionDuration) / baseline.stdSessionDuration,
    loginFrequency: (userMetrics.loginFrequency - baseline.avgLoginFrequency) / baseline.stdLoginFrequency,
    activityRate: (userMetrics.activityRate - baseline.avgActivityRate) / baseline.stdActivityRate,
    cashoutFrequency: (userMetrics.cashoutFrequency - baseline.avgCashoutFrequency) / baseline.stdCashoutFrequency
  };

  // Average z-score
  const avgZScore = Object.values(zScores).reduce((sum, z) => sum + z, 0) / Object.values(zScores).length;

  // Convert z-score to percentile (approximation)
  const percentile = (1 - normalCDF(avgZScore)) * 100;

  return Math.min(100, Math.max(0, percentile));
}

/**
 * Normal cumulative distribution function approximation
 */
function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - prob : prob;
}

/**
 * Determine if behavior is anomalous (<1% of population)
 */
function isAnomalous(percentile: number): boolean {
  return percentile > 99; // Top 1%
}

/**
 * Generate insight explaining the anomaly
 */
function generateInsight(userMetrics: UserBehaviorMetrics, baseline: PopulationBaseline, percentile: number): string {
  const deviations = {
    sessionDuration: userMetrics.sessionDuration - baseline.avgSessionDuration,
    loginFrequency: userMetrics.loginFrequency - baseline.avgLoginFrequency,
    activityRate: userMetrics.activityRate - baseline.avgActivityRate,
    cashoutFrequency: userMetrics.cashoutFrequency - baseline.avgCashoutFrequency
  };

  // Find the most deviant metric
  const mostDeviant = Object.entries(deviations).reduce((a, b) =>
    Math.abs(deviations[a[0] as keyof typeof deviations]) > Math.abs(deviations[b[0] as keyof typeof deviations]) ? a : b
  )[0];

  const direction = deviations[mostDeviant as keyof typeof deviations] > 0 ? 'higher' : 'lower';
  const metricName = {
    sessionDuration: 'session duration',
    loginFrequency: 'login frequency',
    activityRate: 'activity rate',
    cashoutFrequency: 'cashout frequency'
  }[mostDeviant];

  return `User is in top ${Math.round(percentile)}% ${direction} ${metricName} compared to population baseline.`;
}

/**
 * Extract user behavior metrics from events
 */
function extractUserMetrics(events: any[], timeWindowDays: number = 7): UserBehaviorMetrics {
  if (events.length === 0) {
    return {
      sessionDuration: 0,
      loginFrequency: 0,
      activityRate: 0,
      cashoutFrequency: 0
    };
  }

  const windowStart = new Date(Date.now() - timeWindowDays * 24 * 60 * 60 * 1000);
  const windowEvents = events.filter(e => new Date(e.timestamp) >= windowStart);

  // Calculate metrics
  const sessions = windowEvents.filter(e => e.eventType === 'login');
  const activities = windowEvents.filter(e => e.eventType === 'activity');
  const cashouts = windowEvents.filter(e => e.eventType === 'cashout');

  const sessionDuration = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + (s.metadata?.sessionDuration || 0), 0) / sessions.length
    : 0;

  const loginFrequency = sessions.length / timeWindowDays;
  const activityRate = sessions.length > 0 ? activities.length / sessions.length : 0;
  const cashoutFrequency = cashouts.length / (timeWindowDays / 7); // per week

  return {
    sessionDuration,
    loginFrequency,
    activityRate,
    cashoutFrequency
  };
}

/**
 * Main function: Analyze user anomaly against population baseline
 */
export function analyzeUserAnomaly(
  userId: string,
  userEvents: any[],
  timeWindowDays: number = 7
): AnomalyAnalysisResult {
  const userMetrics = extractUserMetrics(userEvents, timeWindowDays);

  const anomalyScore = calculateAnomalyScore(userMetrics, POPULATION_BASELINE);
  const percentile = calculatePercentile(userMetrics, POPULATION_BASELINE);
  const anomalous = isAnomalous(percentile);
  const insight = generateInsight(userMetrics, POPULATION_BASELINE, percentile);

  return {
    user_id: userId,
    anomaly_score: Math.round(anomalyScore),
    percentile: Math.round(percentile),
    is_anomalous: anomalous,
    insight
  };
}