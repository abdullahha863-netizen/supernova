import { prisma } from "@/lib/prisma";
import { getSmartLimitsForUser } from "@/lib/smartLimits";

export type WorkerLimitStatus = {
  currentWorkers: number;
  maxWorkers: number;
  canCreate: boolean;
  source: "metal_card" | "base";
  cardTier: string | null;
};

export async function getWorkerLimitStatusForUser(userId: string): Promise<WorkerLimitStatus> {
  const [smartLimits, currentWorkers] = await Promise.all([
    getSmartLimitsForUser(userId),
    prisma.minerWorker.count({ where: { userId } }),
  ]);

  return {
    currentWorkers,
    maxWorkers: smartLimits.maxWorkers,
    canCreate: currentWorkers < smartLimits.maxWorkers,
    source: smartLimits.source,
    cardTier: smartLimits.cardTier,
  };
}

export async function canCreateNewWorker(userId: string) {
  const status = await getWorkerLimitStatusForUser(userId);
  return status.canCreate;
}
