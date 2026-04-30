// Fraud Safe Mode configuration for launch
// Controls softer decision thresholds and override rules without changing core fraud logic.

export const fraudSafeModeConfig = {
  enabled: true,
  thresholds: {
    allow: 39,
    reviewMin: 40,
    reviewMax: 84,
    block: 85,
  },
  overrideRules: {
    anomalyWithIp: {
      anomaly: 90,
      ip: 80,
    },
    behaviorWithIp: {
      behavior: 85,
      ip: 80,
    },
    multiSignal: {
      device: 80,
      ip: 75,
      behavior: 80,
      anomaly: 80,
    },
  },
  signalWeights: {
    vpn: 0.2,
    ipChange: "low",
    hashrateSpike: "monitor",
    anomalyRequiresPartnerSignal: true,
  },
};
