import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { accrueMiningRewardWithClient } from "@/lib/rewardAccrual";

const DEFAULT_PPLNS_WINDOW_SHARES = 100000;
const DEFAULT_PPLNS_WINDOW_MINUTES = 60;

type PplnsShareWindowRow = {
  userId: string;
  difficulty: number;
};

type PplnsUserWeight = {
  userId: string;
  weight: Prisma.Decimal;
};

export type DistributePplnsBlockRewardInput = {
  blockHash: string;
  height: number;
  grossReward: number | string | Prisma.Decimal;
  foundAt?: string | Date;
};

export type DistributePplnsBlockRewardResult = {
  ok: true;
  blockHash: string;
  status: string;
  alreadyDistributed: boolean;
  usersPaid: number;
  totalWindowWeight: number;
  grossReward: number;
  totalNetReward: number;
};

function getWindowShareLimit() {
  const value = Number(process.env.PPLNS_WINDOW_SHARES || DEFAULT_PPLNS_WINDOW_SHARES);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_PPLNS_WINDOW_SHARES;
  return Math.floor(value);
}

function getFallbackMinutes() {
  const value = Number(process.env.PPLNS_WINDOW_MINUTES || DEFAULT_PPLNS_WINDOW_MINUTES);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_PPLNS_WINDOW_MINUTES;
  return value;
}

function normalizeDistributionInput(input: DistributePplnsBlockRewardInput) {
  const blockHash = String(input.blockHash || "").trim();
  if (!blockHash) throw new Error("blockHash is required");

  const height = Number(input.height);
  if (!Number.isInteger(height) || height < 0) throw new Error("height must be a non-negative integer");

  const grossReward = new Prisma.Decimal(input.grossReward);
  if (grossReward.lte(0)) throw new Error("grossReward must be greater than 0");

  const foundAt = input.foundAt ? new Date(input.foundAt) : new Date();
  if (Number.isNaN(foundAt.getTime())) throw new Error("foundAt must be a valid date");

  return { blockHash, height, grossReward, foundAt };
}

function groupSharesByUser(shares: PplnsShareWindowRow[]) {
  const weights = new Map<string, Prisma.Decimal>();

  for (const share of shares) {
    const difficulty = new Prisma.Decimal(share.difficulty || 0);
    if (difficulty.lte(0)) continue;
    weights.set(share.userId, (weights.get(share.userId) || new Prisma.Decimal(0)).add(difficulty));
  }

  const users = Array.from(weights.entries()).map(([userId, weight]) => ({ userId, weight }));
  const total = users.reduce((sum, user) => sum.add(user.weight), new Prisma.Decimal(0));
  return { users, total };
}

async function getPplnsWindowWeights(tx: Prisma.TransactionClient, foundAt: Date) {
  const shareLimit = getWindowShareLimit();
  const fallbackMinutes = getFallbackMinutes();

  const shares = await tx.share.findMany({
    where: {
      accepted: true,
      createdAt: { lte: foundAt },
      difficulty: { gt: 0 },
    },
    orderBy: { createdAt: "desc" },
    take: shareLimit,
    select: {
      userId: true,
      difficulty: true,
    },
  });

  if (shares.length > 0) {
    return { ...groupSharesByUser(shares), source: "share_count" as const, sharesConsidered: shares.length };
  }

  const fallbackStart = new Date(foundAt.getTime() - fallbackMinutes * 60 * 1000);
  const fallbackRows = await tx.share.findMany({
    where: {
      accepted: true,
      createdAt: {
        gte: fallbackStart,
        lte: foundAt,
      },
      difficulty: { gt: 0 },
    },
    orderBy: { createdAt: "desc" },
    select: {
      userId: true,
      difficulty: true,
    },
  });

  return { ...groupSharesByUser(fallbackRows), source: "time_fallback" as const, sharesConsidered: fallbackRows.length };
}

export async function distributePplnsBlockReward(
  input: DistributePplnsBlockRewardInput,
): Promise<DistributePplnsBlockRewardResult> {
  const normalized = normalizeDistributionInput(input);

  console.info("[pplns] distribution started", {
    blockHash: normalized.blockHash,
    height: normalized.height,
    grossReward: normalized.grossReward.toString(),
    foundAt: normalized.foundAt.toISOString(),
  });

  return prisma.$transaction(async (tx) => {
    let block = await tx.poolBlock.upsert({
      where: { blockHash: normalized.blockHash },
      update: {},
      create: {
        blockHash: normalized.blockHash,
        height: normalized.height,
        grossReward: normalized.grossReward,
        status: "pending",
        foundAt: normalized.foundAt,
      },
    });

    await tx.$queryRaw`SELECT "id" FROM "PoolBlock" WHERE "id" = ${block.id} FOR UPDATE`;

    block = await tx.poolBlock.findUniqueOrThrow({
      where: { id: block.id },
    });

    if (block.status === "distributed") {
      const summary = await tx.blockRewardDistribution.aggregate({
        where: { poolBlockId: block.id },
        _count: true,
        _sum: { netReward: true },
      });

      console.info("[pplns] block already distributed", {
        blockHash: block.blockHash,
        usersPaid: summary._count,
        totalNetReward: Number(summary._sum.netReward || 0),
      });

      return {
        ok: true,
        blockHash: block.blockHash,
        status: block.status,
        alreadyDistributed: true,
        usersPaid: summary._count,
        totalWindowWeight: 0,
        grossReward: Number(block.grossReward),
        totalNetReward: Number(summary._sum.netReward || 0),
      };
    }

    if (block.status === "orphaned") {
      throw new Error("Cannot distribute an orphaned block");
    }

    await tx.poolBlock.update({
      where: { id: block.id },
      data: {
        height: normalized.height,
        grossReward: normalized.grossReward,
        foundAt: normalized.foundAt,
      },
    });

    const window = await getPplnsWindowWeights(tx, normalized.foundAt);
    if (window.sharesConsidered <= 0 || window.users.length === 0 || window.total.lte(0)) {
      throw new Error("No accepted shares in PPLNS window");
    }

    console.info("[pplns] share window loaded", {
      blockHash: normalized.blockHash,
      source: window.source,
      sharesConsidered: window.sharesConsidered,
      users: window.users.length,
      totalWindowWeight: window.total.toString(),
    });

    let usersPaid = 0;
    let totalNetReward = new Prisma.Decimal(0);

    for (const user of window.users as PplnsUserWeight[]) {
      const userGrossReward = normalized.grossReward.mul(user.weight).div(window.total);
      if (userGrossReward.lte(0)) continue;

      const reward = await accrueMiningRewardWithClient(tx, {
        userId: user.userId,
        grossReward: userGrossReward,
        shareId: `pplns:${normalized.blockHash}:${user.userId}`,
        source: "pplns",
      });

      if (reward.netReward <= 0) continue;

      await tx.minerProfile.upsert({
        where: { userId: user.userId },
        update: {
          pendingBalance: { increment: reward.netReward },
          rewardFlow: { increment: reward.netReward },
          updatedAt: new Date(),
        },
        create: {
          userId: user.userId,
          pendingBalance: reward.netReward,
          rewardFlow: reward.netReward,
        },
      });

      await tx.blockRewardDistribution.create({
        data: {
          poolBlockId: block.id,
          blockHash: normalized.blockHash,
          userId: user.userId,
          userShareWeight: user.weight,
          totalWindowWeight: window.total,
          grossReward: reward.grossReward,
          netReward: reward.netReward,
          poolFeeAmount: reward.poolFeeAmount,
        },
      });

      usersPaid += 1;
      totalNetReward = totalNetReward.add(reward.netReward);
    }

    if (usersPaid === 0) {
      throw new Error("PPLNS distribution produced no positive net rewards");
    }

    await tx.poolBlock.update({
      where: { id: block.id },
      data: {
        status: "distributed",
        distributedAt: new Date(),
      },
    });

    console.info("[pplns] distribution completed", {
      blockHash: normalized.blockHash,
      usersPaid,
      grossReward: normalized.grossReward.toString(),
      totalNetReward: totalNetReward.toString(),
      totalWindowWeight: window.total.toString(),
    });

    return {
      ok: true,
      blockHash: normalized.blockHash,
      status: "distributed",
      alreadyDistributed: false,
      usersPaid,
      totalWindowWeight: window.total.toNumber(),
      grossReward: normalized.grossReward.toNumber(),
      totalNetReward: totalNetReward.toNumber(),
    };
  });
}

export async function markPplnsBlockOrphaned(blockHash: string) {
  const normalizedBlockHash = String(blockHash || "").trim();
  if (!normalizedBlockHash) throw new Error("blockHash is required");

  return prisma.$transaction(async (tx) => {
    const block = await tx.poolBlock.findUnique({
      where: { blockHash: normalizedBlockHash },
    });

    if (!block) throw new Error("Pool block not found");
    await tx.$queryRaw`SELECT "id" FROM "PoolBlock" WHERE "id" = ${block.id} FOR UPDATE`;

    if (block.status === "pending") {
      const updated = await tx.poolBlock.update({
        where: { id: block.id },
        data: { status: "orphaned" },
      });
      console.warn("[pplns] pending block marked orphaned", { blockHash: updated.blockHash });
      return updated;
    }

    // TODO: Add reversal ledger for already-distributed orphaned blocks.
    console.warn("[pplns] orphan notice received for non-pending block; reversal not applied", {
      blockHash: block.blockHash,
      status: block.status,
    });
    return block;
  });
}
