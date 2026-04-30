export type MiningAbuseStatsResult = {
  totalShares: number;
  acceptedShares: number;
  rejectedShares: number;
  rejectRate: number;
  sharesPerMinute: number;
  isFlagged: boolean;
  flagReason: string | null;
};

export function updateMiningAbuseStatsWithClient(
  prisma: any,
  input: {
    userId: string;
    accepted: boolean;
    at?: Date | string;
    logger?: { warn?: (message: string, payload?: Record<string, unknown>) => void };
  },
): Promise<MiningAbuseStatsResult | null>;
