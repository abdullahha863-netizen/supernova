import { createHash } from "crypto";

export interface DeviceFingerprintData {
  userAgent: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  language: string;
  canvasFingerprint?: string;
  webglFingerprint?: string;
}

export interface DeviceFingerprintResult {
  device_id: string;
  fingerprint: string;
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  changes_detected: string[];
  reason: string;
}

export interface PreviousFingerprint {
  fingerprint: string;
  timestamp: Date;
  risk_score: number;
}

/**
 * Generate a unique device fingerprint from browser/client data
 */
export function generateDeviceFingerprint(data: DeviceFingerprintData): string {
  const components = [
    data.userAgent,
    data.platform,
    data.screenResolution,
    data.timezone,
    data.language,
    data.canvasFingerprint || "",
    data.webglFingerprint || "",
  ];

  const fingerprintString = components.join("|");
  return createHash("sha256").update(fingerprintString).digest("hex");
}

/**
 * Calculate risk score based on device fingerprint changes
 */
export function calculateDeviceRiskScore(
  currentFingerprint: string,
  previousFingerprints: PreviousFingerprint[],
  currentData: DeviceFingerprintData
): { score: number; changes: string[]; reason: string } {
  if (previousFingerprints.length === 0) {
    return {
      score: 10, // New device, low initial risk
      changes: ["First device fingerprint recorded"],
      reason: "New device detected - establishing baseline"
    };
  }

  const latestPrevious = previousFingerprints[previousFingerprints.length - 1];
  const changes: string[] = [];

  // Check for exact fingerprint match
  if (currentFingerprint === latestPrevious.fingerprint) {
    return {
      score: Math.max(0, latestPrevious.risk_score - 5), // Slight decrease over time
      changes: [],
      reason: "Device fingerprint unchanged - consistent usage pattern"
    };
  }

  // Analyze what changed
  const previousData = parseFingerprintComponents(latestPrevious.fingerprint);

  if (currentData.userAgent !== previousData.userAgent) {
    changes.push("Browser/User-Agent changed");
  }

  if (currentData.platform !== previousData.platform) {
    changes.push("Operating system changed");
  }

  if (currentData.screenResolution !== previousData.screenResolution) {
    changes.push("Screen resolution changed");
  }

  if (currentData.timezone !== previousData.timezone) {
    changes.push("Timezone changed");
  }

  if (currentData.language !== previousData.language) {
    changes.push("Language changed");
  }

  if (currentData.canvasFingerprint && previousData.canvasFingerprint &&
      currentData.canvasFingerprint !== previousData.canvasFingerprint) {
    changes.push("Canvas fingerprint changed");
  }

  if (currentData.webglFingerprint && previousData.webglFingerprint &&
      currentData.webglFingerprint !== previousData.webglFingerprint) {
    changes.push("WebGL fingerprint changed");
  }

  // Calculate risk score based on changes
  let riskScore = 0;

  // Major changes (high risk)
  if (changes.includes("Operating system changed")) riskScore += 40;
  if (changes.includes("Canvas fingerprint changed")) riskScore += 30;
  if (changes.includes("WebGL fingerprint changed")) riskScore += 30;

  // Medium changes
  if (changes.includes("Browser/User-Agent changed")) riskScore += 20;
  if (changes.includes("Timezone changed")) riskScore += 15;

  // Minor changes
  if (changes.includes("Screen resolution changed")) riskScore += 10;
  if (changes.includes("Language changed")) riskScore += 5;

  // Frequency factor - if many recent changes
  const recentChanges = previousFingerprints.filter(p =>
    Date.now() - p.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
  ).length;

  if (recentChanges > 3) riskScore += 20; // Frequent changes

  // Cap at 100
  riskScore = Math.min(100, riskScore);

  // Boost score if multiple changes
  if (changes.length > 2) riskScore = Math.min(100, riskScore + 15);

  let reason = "";
  if (changes.length === 0) {
    reason = "Minor fingerprint variation detected";
  } else if (changes.length === 1) {
    reason = `Single change detected: ${changes[0]}`;
  } else {
    reason = `${changes.length} device changes detected including ${changes.slice(0, 2).join(", ")}`;
  }

  return { score: riskScore, changes, reason };
}

/**
 * Parse fingerprint components back from stored fingerprint (for comparison)
 * Note: This is a simplified reverse - in production, store components separately
 */
function parseFingerprintComponents(fingerprint: string): Partial<DeviceFingerprintData> {
  // In a real implementation, you'd store the components separately
  // This is a placeholder for demonstration
  return {};
}

/**
 * Main function to process device fingerprint and return risk assessment
 */
export function assessDeviceFingerprintRisk(
  userId: string,
  currentData: DeviceFingerprintData,
  previousFingerprints: PreviousFingerprint[]
): DeviceFingerprintResult {
  const currentFingerprint = generateDeviceFingerprint(currentData);
  const riskAssessment = calculateDeviceRiskScore(currentFingerprint, previousFingerprints, currentData);

  // Generate device ID (could be user-specific or fingerprint-based)
  const deviceId = createHash("sha256")
    .update(`${userId}:${currentFingerprint}`)
    .digest("hex")
    .substring(0, 16);

  const riskLevel: "LOW" | "MEDIUM" | "HIGH" =
    riskAssessment.score >= 70 ? "HIGH" :
    riskAssessment.score >= 40 ? "MEDIUM" : "LOW";

  return {
    device_id: deviceId,
    fingerprint: currentFingerprint,
    risk_score: riskAssessment.score,
    risk_level: riskLevel,
    changes_detected: riskAssessment.changes,
    reason: riskAssessment.reason
  };
}

/**
 * Extract device data from HTTP request headers
 */
export function extractDeviceDataFromRequest(request: Request): DeviceFingerprintData {
  const headers = Object.fromEntries(request.headers.entries());

  return {
    userAgent: headers['user-agent'] || 'Unknown',
    platform: headers['sec-ch-ua-platform'] || 'Unknown',
    screenResolution: 'Unknown', // Would need client-side data
    timezone: headers['x-timezone'] || 'Unknown', // Custom header
    language: headers['accept-language']?.split(',')[0] || 'Unknown',
    canvasFingerprint: headers['x-canvas-fingerprint'], // Custom header
    webglFingerprint: headers['x-webgl-fingerprint'], // Custom header
  };
}