import { prisma } from "@/lib/prisma";
import { accrueMiningReward } from "@/lib/rewardAccrual";
import { buildDeterministicShareId, getRewardInputForShare } from "@/lib/rewardSources";
import { updateMiningAbuseStatsWithClient } from "@/services/shared/mining-abuse-core.mjs";
const BATCH_SIZE = 100;
const BATCH_TIMEOUT_MS = 5000; // 5 seconds

interface ShareData {
  minerId: string;
  userId: string;
  nonce: string;
  difficulty: number;
  accepted: boolean;
  reward?: number;
  submittedAt?: string;
  source?: string;
}

let pendingShares: ShareData[] = [];
let batchTimeoutId: NodeJS.Timeout | null = null;

export async function queueShare(share: ShareData): Promise<void> {
  pendingShares.push(share);

  // If batch is full, flush immediately
  if (pendingShares.length >= BATCH_SIZE) {
    await flushShares();
  } else if (!batchTimeoutId) {
    // Set timeout to flush after BATCH_TIMEOUT_MS
    batchTimeoutId = setTimeout(() => {
      flushShares().catch((error: unknown) => console.error('Share flush error:', error));
    }, BATCH_TIMEOUT_MS);
  }
}

export async function flushShares(): Promise<void> {
  if (pendingShares.length === 0) {
    if (batchTimeoutId) {
      clearTimeout(batchTimeoutId);
      batchTimeoutId = null;
    }
    return;
  }

  const sharesToInsert = [...pendingShares];
  pendingShares = [];

  if (batchTimeoutId) {
    clearTimeout(batchTimeoutId);
    batchTimeoutId = null;
  }

  try {
    let insertedCount = 0;

    for (const share of sharesToInsert) {
      const shareId = buildDeterministicShareId(share);

      try {
        await prisma.$transaction(async (tx) => {
          await tx.share.create({
            data: {
              id: shareId,
              minerId: share.minerId,
              userId: share.userId,
              nonce: share.nonce,
              difficulty: share.difficulty,
              accepted: share.accepted,
              reward: 0,
              createdAt: share.submittedAt ? new Date(share.submittedAt) : new Date(),
            },
          });

          insertedCount += 1;

          await updateMiningAbuseStatsWithClient(tx, {
            userId: share.userId,
            accepted: share.accepted,
            at: share.submittedAt,
          });

          const rewardInput = getRewardInputForShare({
            ...share,
            grossReward: share.reward,
          });
          if (!rewardInput) return;

          const result = await accrueMiningReward({
            userId: rewardInput.userId,
            grossReward: rewardInput.grossReward,
            shareId: rewardInput.shareId,
            source: rewardInput.source,
          });

          if (result.netReward <= 0) return;

          // Share.reward stores gross reward for audit.
          // pendingBalance stores net reward after fee calculation.
          await tx.minerProfile.upsert({
            where: { userId: share.userId },
            update: {
              pendingBalance: { increment: result.netReward },
              rewardFlow: { increment: result.netReward },
              updatedAt: new Date(),
            },
            create: {
              userId: share.userId,
              pendingBalance: result.netReward,
              rewardFlow: result.netReward,
            },
          });

          await tx.share.update({
            where: { id: shareId },
            data: { reward: result.grossReward },
          });

          console.info("[reward] Reward applied", {
            userId: share.userId,
            grossReward: result.grossReward,
            netReward: result.netReward,
            shareId,
          });
        });
      } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
          continue;
        }

        throw error;
      }
    }

    console.log(`[Batch] Inserted ${insertedCount} shares`);
  } catch (error) {
    console.error('Error flushing shares:', error);
    // Re-queue failed shares
    pendingShares.unshift(...sharesToInsert);
    throw error;
  }
}

// Graceful shutdown
export async function shutdownBatchProcessor(): Promise<void> {
  if (batchTimeoutId) {
    clearTimeout(batchTimeoutId);
    batchTimeoutId = null;
  }
  await flushShares();
}

// periodically flush shares (every 10 seconds)
setInterval(async () => {
  if (pendingShares.length > 0) {
    await flushShares().catch((error: unknown) =>
      console.error('Periodic share flush error:', error)
    );
  }
}, 10000);
