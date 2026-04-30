// Advanced Behavior Timeline Engine - Sequence-Based Analysis
// This engine analyzes behavioral sequences, state transitions, and temporal patterns
// NOT event-based like previous modules - completely different architecture

export enum BehaviorState {
  IDLE = 'IDLE',
  ACTIVE = 'ACTIVE',
  HIGH_ACTIVITY = 'HIGH_ACTIVITY',
  CASHOUT_MODE = 'CASHOUT_MODE',
  SUSPICIOUS_MODE = 'SUSPICIOUS_MODE'
}

export interface SequenceAnomaly {
  type: 'ABNORMAL_SEQUENCE' | 'MISSING_STEP' | 'REVERSED_ORDER' | 'SUSPICIOUS_SHORTCUT';
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  sequence: string[];
  expectedSequence?: string[];
}

export interface StateTransition {
  fromState: BehaviorState;
  toState: BehaviorState;
  timestamp: Date;
  triggerEvent: string;
  isNormal: boolean;
  transitionReason: string;
}

export interface TemporalMetrics {
  avgTimeGap: number; // seconds between actions
  transitionSpeed: number; // actions per minute
  sessionRhythm: number; // consistency score 0-1
  burstFrequency: number; // rapid action bursts per hour
}

export interface BehaviorAnalysisResult {
  user_id: string;
  sequence_anomalies: SequenceAnomaly[];
  state_transitions: StateTransition[];
  temporal_score: number;
  behavior_risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  insight_summary: string;
}

export interface TimelineEvent {
  id: string;
  userId: string;
  eventType: 'login' | 'logout' | 'browse' | 'activity' | 'cashout' | 'ip_change' | 'device_change';
  timestamp: Date;
  metadata: {
    sessionDuration?: number;
    ip?: string;
    deviceFingerprint?: string;
    amount?: number;
    activityType?: string;
    page?: string;
  };
}

// Normal behavioral sequences (expected flow)
const NORMAL_SEQUENCES = {
  STANDARD_FLOW: ['login', 'browse', 'activity', 'cashout', 'logout'],
  QUICK_CASHOUT: ['login', 'activity', 'cashout', 'logout'],
  BROWSE_ONLY: ['login', 'browse', 'logout'],
  ACTIVITY_FOCUS: ['login', 'activity', 'activity', 'logout']
};

// Suspicious shortcuts (dangerous direct transitions)
const SUSPICIOUS_SHORTCUTS = [
  ['login', 'cashout'], // Direct login to cashout
  ['browse', 'cashout'], // Skip activity
  ['activity', 'cashout', 'activity'], // Cashout then continue activity
  ['logout', 'login', 'cashout'] // Quick re-login for cashout
];

/**
 * Define normal behavioral sequences for a user based on their history
 */
function defineNormalSequences(historicalEvents: TimelineEvent[]): string[][] {
  if (historicalEvents.length < 10) {
    return Object.values(NORMAL_SEQUENCES);
  }

  // Analyze historical sequences to learn user's normal patterns
  const sequences = extractSequences(historicalEvents, 5); // sequences of 5 events
  const frequentSequences = sequences
    .filter(seq => seq.frequency > 3) // appeared more than 3 times
    .map(seq => seq.sequence);

  return [...Object.values(NORMAL_SEQUENCES), ...frequentSequences];
}

/**
 * Extract sequences from events
 */
function extractSequences(events: TimelineEvent[], maxLength: number = 5) {
  const sequences: { sequence: string[]; frequency: number }[] = [];

  for (let i = 0; i <= events.length - maxLength; i++) {
    const seq = events.slice(i, i + maxLength).map(e => e.eventType);
    const existing = sequences.find(s => JSON.stringify(s.sequence) === JSON.stringify(seq));

    if (existing) {
      existing.frequency++;
    } else {
      sequences.push({ sequence: seq, frequency: 1 });
    }
  }

  return sequences.sort((a, b) => b.frequency - a.frequency);
}

/**
 * Analyze sequence anomalies in current session
 */
function analyzeSequenceAnomalies(
  currentEvents: TimelineEvent[],
  normalSequences: string[][]
): SequenceAnomaly[] {
  const anomalies: SequenceAnomaly[] = [];
  const currentSequence = currentEvents.map(e => e.eventType);

  // Check for suspicious shortcuts
  for (const shortcut of SUSPICIOUS_SHORTCUTS) {
    if (containsSubsequence(currentSequence, shortcut)) {
      anomalies.push({
        type: 'SUSPICIOUS_SHORTCUT',
        description: `Dangerous shortcut detected: ${shortcut.join(' → ')}`,
        severity: 'HIGH',
        sequence: shortcut
      });
    }
  }

  // Check for abnormal sequences (not in normal patterns)
  const isAbnormal = !normalSequences.some(normalSeq =>
    containsSubsequence(normalSeq, currentSequence) ||
    containsSubsequence(currentSequence, normalSeq)
  );

  if (isAbnormal && currentSequence.length >= 3) {
    anomalies.push({
      type: 'ABNORMAL_SEQUENCE',
      description: `Unusual sequence pattern: ${currentSequence.join(' → ')}`,
      severity: 'MEDIUM',
      sequence: currentSequence
    });
  }

  // Check for missing expected steps
  const expectedNextSteps = predictNextSteps(currentSequence, normalSequences);
  if (expectedNextSteps.length > 0 && currentEvents.length > 2) {
    const lastEvent = currentEvents[currentEvents.length - 1];
    const timeSinceLast = Date.now() - lastEvent.timestamp.getTime();
    const expectedTime = 5 * 60 * 1000; // 5 minutes

    if (timeSinceLast > expectedTime) {
      anomalies.push({
        type: 'MISSING_STEP',
        description: `Missing expected step after ${lastEvent.eventType}. Expected: ${expectedNextSteps.join(' or ')}`,
        severity: 'LOW',
        sequence: currentSequence,
        expectedSequence: expectedNextSteps
      });
    }
  }

  // Check for reversed order (unusual flow reversal)
  if (currentSequence.length >= 4) {
    const reversedFlow = ['cashout', 'activity', 'browse', 'login'];
    if (containsSubsequence(currentSequence, reversedFlow)) {
      anomalies.push({
        type: 'REVERSED_ORDER',
        description: 'Reversed behavioral flow detected (cashout before proper activity)',
        severity: 'HIGH',
        sequence: reversedFlow
      });
    }
  }

  return anomalies;
}

/**
 * Check if sequence contains a subsequence
 */
function containsSubsequence(mainSeq: string[], subSeq: string[]): boolean {
  if (subSeq.length > mainSeq.length) return false;

  for (let i = 0; i <= mainSeq.length - subSeq.length; i++) {
    if (mainSeq.slice(i, i + subSeq.length).every((val, idx) => val === subSeq[idx])) {
      return true;
    }
  }
  return false;
}

/**
 * Predict next expected steps based on normal sequences
 */
function predictNextSteps(currentSeq: string[], normalSequences: string[][]): string[] {
  const predictions: Record<string, number> = {};

  for (const normalSeq of normalSequences) {
    const idx = findSubsequenceIndex(normalSeq, currentSeq);
    if (idx !== -1 && idx + currentSeq.length < normalSeq.length) {
      const nextStep = normalSeq[idx + currentSeq.length];
      predictions[nextStep] = (predictions[nextStep] || 0) + 1;
    }
  }

  return Object.entries(predictions)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([step]) => step);
}

/**
 * Find index of subsequence in sequence
 */
function findSubsequenceIndex(mainSeq: string[], subSeq: string[]): number {
  for (let i = 0; i <= mainSeq.length - subSeq.length; i++) {
    if (mainSeq.slice(i, i + subSeq.length).every((val, idx) => val === subSeq[idx])) {
      return i;
    }
  }
  return -1;
}

/**
 * Build behavior state machine from events
 */
function buildStateMachine(events: TimelineEvent[]): StateTransition[] {
  const transitions: StateTransition[] = [];
  let currentState = BehaviorState.IDLE;

  for (const event of events) {
    const newState = determineNextState(currentState, event);
    const isNormal = isNormalTransition(currentState, newState, event);

    if (newState !== currentState) {
      transitions.push({
        fromState: currentState,
        toState: newState,
        timestamp: event.timestamp,
        triggerEvent: event.eventType,
        isNormal,
        transitionReason: getTransitionReason(currentState, newState, event)
      });
      currentState = newState;
    }
  }

  return transitions;
}

/**
 * Determine next state based on current state and event
 */
function determineNextState(currentState: BehaviorState, event: TimelineEvent): BehaviorState {
  switch (currentState) {
    case BehaviorState.IDLE:
      if (event.eventType === 'login') return BehaviorState.ACTIVE;
      break;

    case BehaviorState.ACTIVE:
      if (event.eventType === 'activity' || event.eventType === 'browse') {
        // Check for high activity (multiple activities in short time)
        return BehaviorState.ACTIVE; // Will be upgraded if needed
      }
      if (event.eventType === 'cashout') return BehaviorState.CASHOUT_MODE;
      if (event.eventType === 'logout') return BehaviorState.IDLE;
      break;

    case BehaviorState.HIGH_ACTIVITY:
      if (event.eventType === 'cashout') return BehaviorState.CASHOUT_MODE;
      if (event.eventType === 'logout') return BehaviorState.IDLE;
      break;

    case BehaviorState.CASHOUT_MODE:
      if (event.eventType === 'activity') return BehaviorState.SUSPICIOUS_MODE; // Activity after cashout
      if (event.eventType === 'logout') return BehaviorState.IDLE;
      break;

    case BehaviorState.SUSPICIOUS_MODE:
      // Stay suspicious
      break;
  }

  // Check for high activity upgrade
  if (currentState === BehaviorState.ACTIVE && event.eventType === 'activity') {
    // Logic to detect high activity bursts would go here
    // For now, simple check
    return BehaviorState.HIGH_ACTIVITY;
  }

  return currentState;
}

/**
 * Check if state transition is normal
 */
function isNormalTransition(fromState: BehaviorState, toState: BehaviorState, event: TimelineEvent): boolean {
  const normalTransitions: Record<BehaviorState, BehaviorState[]> = {
    [BehaviorState.IDLE]: [BehaviorState.ACTIVE],
    [BehaviorState.ACTIVE]: [BehaviorState.HIGH_ACTIVITY, BehaviorState.CASHOUT_MODE, BehaviorState.IDLE],
    [BehaviorState.HIGH_ACTIVITY]: [BehaviorState.CASHOUT_MODE, BehaviorState.IDLE],
    [BehaviorState.CASHOUT_MODE]: [BehaviorState.IDLE],
    [BehaviorState.SUSPICIOUS_MODE]: [BehaviorState.IDLE]
  };

  return normalTransitions[fromState]?.includes(toState) ?? false;
}

/**
 * Get reason for state transition
 */
function getTransitionReason(fromState: BehaviorState, toState: BehaviorState, event: TimelineEvent): string {
  if (toState === BehaviorState.ACTIVE && fromState === BehaviorState.IDLE) {
    return 'User logged in and became active';
  }
  if (toState === BehaviorState.HIGH_ACTIVITY) {
    return 'Detected high activity pattern';
  }
  if (toState === BehaviorState.CASHOUT_MODE) {
    return `Entered cashout mode after ${event.eventType}`;
  }
  if (toState === BehaviorState.SUSPICIOUS_MODE) {
    return 'Suspicious behavior detected after cashout';
  }
  if (toState === BehaviorState.IDLE) {
    return 'Session ended, returned to idle';
  }
  return 'State transition occurred';
}

/**
 * Calculate temporal metrics from events
 */
function calculateTemporalMetrics(events: TimelineEvent[]): TemporalMetrics {
  if (events.length < 2) {
    return {
      avgTimeGap: 0,
      transitionSpeed: 0,
      sessionRhythm: 1,
      burstFrequency: 0
    };
  }

  const timestamps = events.map(e => e.timestamp.getTime()).sort((a, b) => a - b);
  const gaps = [];

  for (let i = 1; i < timestamps.length; i++) {
    gaps.push((timestamps[i] - timestamps[i - 1]) / 1000); // seconds
  }

  const avgTimeGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  const totalDuration = (timestamps[timestamps.length - 1] - timestamps[0]) / 1000; // seconds
  const transitionSpeed = events.length / (totalDuration / 60); // actions per minute

  // Session rhythm (consistency of gaps)
  const gapVariance = gaps.reduce((sum, gap) => sum + Math.pow(gap - avgTimeGap, 2), 0) / gaps.length;
  const sessionRhythm = Math.max(0, 1 - (Math.sqrt(gapVariance) / avgTimeGap)); // 0-1 consistency score

  // Burst frequency (rapid actions)
  const burstThreshold = 30; // 30 seconds
  const bursts = gaps.filter(gap => gap < burstThreshold).length;
  const burstFrequency = bursts / (totalDuration / 3600); // bursts per hour

  return {
    avgTimeGap,
    transitionSpeed,
    sessionRhythm,
    burstFrequency
  };
}

/**
 * Calculate temporal score (0-100) based on temporal metrics
 */
function calculateTemporalScore(metrics: TemporalMetrics, baseline?: TemporalMetrics): number {
  let score = 0;

  // High transition speed (too fast)
  if (metrics.transitionSpeed > 10) { // more than 10 actions per minute
    score += 30;
  }

  // Low session rhythm (inconsistent timing)
  if (metrics.sessionRhythm < 0.3) {
    score += 25;
  }

  // High burst frequency
  if (metrics.burstFrequency > 5) { // more than 5 bursts per hour
    score += 20;
  }

  // Compare to baseline if available
  if (baseline) {
    const speedDeviation = Math.abs(metrics.transitionSpeed - baseline.transitionSpeed) / Math.max(baseline.transitionSpeed, 1);
    if (speedDeviation > 2) {
      score += Math.min(25, speedDeviation * 10);
    }
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Generate intelligent insight summary
 */
function generateInsightSummary(
  anomalies: SequenceAnomaly[],
  transitions: StateTransition[],
  temporalScore: number,
  userId: string
): string {
  const insights = [];

  // Sequence-based insights
  const highSeverityAnomalies = anomalies.filter(a => a.severity === 'HIGH');
  if (highSeverityAnomalies.length > 0) {
    const shortcut = highSeverityAnomalies.find(a => a.type === 'SUSPICIOUS_SHORTCUT');
    if (shortcut) {
      insights.push(`User bypassed normal behavioral flow by taking dangerous shortcut: ${shortcut.sequence.join(' → ')}`);
    }

    const reversed = highSeverityAnomalies.find(a => a.type === 'REVERSED_ORDER');
    if (reversed) {
      insights.push('User exhibited reversed behavioral pattern, completing high-value actions before establishing normal activity');
    }
  }

  // State transition insights
  const suspiciousTransitions = transitions.filter(t => !t.isNormal);
  if (suspiciousTransitions.length > 0) {
    const lastSuspicious = suspiciousTransitions[suspiciousTransitions.length - 1];
    insights.push(`Abnormal state transition detected: ${lastSuspicious.fromState} → ${lastSuspicious.toState} triggered by ${lastSuspicious.triggerEvent}`);
  }

  // Temporal insights
  if (temporalScore > 60) {
    insights.push('Temporal behavior shows high-risk patterns with rapid transitions and inconsistent timing');
  }

  // Overall assessment
  if (insights.length === 0) {
    insights.push('User behavior follows expected sequences with normal state transitions and temporal patterns');
  }

  return insights.join('. ') + '.';
}

/**
 * Calculate dynamic baseline from last 7 days only
 */
function calculateDynamicBaseline(events: TimelineEvent[]): {
  normalSequences: string[][];
  baselineTemporal: TemporalMetrics;
  lastUpdated: Date;
} {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentEvents = events.filter(e => e.timestamp >= sevenDaysAgo);

  const normalSequences = defineNormalSequences(recentEvents);
  const baselineTemporal = calculateTemporalMetrics(recentEvents);

  return {
    normalSequences,
    baselineTemporal,
    lastUpdated: new Date()
  };
}

/**
 * Main function: Advanced sequence-based behavior analysis
 */
export function analyzeUserBehavior(
  userId: string,
  currentSessionEvents: TimelineEvent[],
  historicalEvents: TimelineEvent[]
): BehaviorAnalysisResult {
  // Calculate dynamic baseline from last 7 days
  const baseline = calculateDynamicBaseline(historicalEvents);

  // Analyze sequence anomalies
  const sequenceAnomalies = analyzeSequenceAnomalies(currentSessionEvents, baseline.normalSequences);

  // Build state machine and get transitions
  const stateTransitions = buildStateMachine(currentSessionEvents);

  // Calculate temporal metrics and score
  const currentTemporal = calculateTemporalMetrics(currentSessionEvents);
  const temporalScore = calculateTemporalScore(currentTemporal, baseline.baselineTemporal);

  // Determine overall risk level
  const anomalyScore = sequenceAnomalies.reduce((sum, a) => {
    switch (a.severity) {
      case 'HIGH': return sum + 30;
      case 'MEDIUM': return sum + 15;
      case 'LOW': return sum + 5;
      default: return sum;
    }
  }, 0);

  const transitionScore = stateTransitions.filter(t => !t.isNormal).length * 10;
  const totalScore = anomalyScore + transitionScore + temporalScore;

  const behaviorRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
    totalScore >= 70 ? 'HIGH' :
    totalScore >= 35 ? 'MEDIUM' : 'LOW';

  // Generate intelligent insight summary
  const insightSummary = generateInsightSummary(
    sequenceAnomalies,
    stateTransitions,
    temporalScore,
    userId
  );

  return {
    user_id: userId,
    sequence_anomalies: sequenceAnomalies,
    state_transitions: stateTransitions,
    temporal_score: Math.round(temporalScore),
    behavior_risk_level: behaviorRiskLevel,
    insight_summary: insightSummary
  };
}

/**
 * Create a timeline event
 */
export function createTimelineEvent(
  userId: string,
  eventType: TimelineEvent['eventType'],
  metadata: TimelineEvent['metadata'] = {}
): TimelineEvent {
  return {
    id: `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    eventType,
    timestamp: new Date(),
    metadata
  };
}