import { prisma } from "@/lib/prisma";

type MiningMinerRecord = {
  id: string;
  userId: string;
  minerName: string;
  minerAddress: string;
  poolWorkerName: string;
  difficulty: number;
  lastSeen: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type MiningShareAggregate = {
  _count: number;
  _sum: {
    difficulty: number | null;
    reward: number | null;
  };
};

type CreateManyResult = {
  count: number;
};

type MiningPrismaClient = typeof prisma & {
  miner: {
    findFirst: (...args: unknown[]) => Promise<MiningMinerRecord | null>;
    findMany: (...args: unknown[]) => Promise<MiningMinerRecord[]>;
    upsert: (...args: unknown[]) => Promise<MiningMinerRecord>;
    update: (...args: unknown[]) => Promise<MiningMinerRecord>;
  };
  share: {
    aggregate: (...args: unknown[]) => Promise<MiningShareAggregate>;
    createMany: (...args: unknown[]) => Promise<CreateManyResult>;
  };
};

// VS Code can lag on Prisma model type refresh; this keeps mining routes unblocked.
export const miningPrisma = prisma as MiningPrismaClient;
