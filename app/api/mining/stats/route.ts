import { NextRequest, NextResponse } from 'next/server';
import { miningPrisma } from '@/lib/miningPrisma';
import { getRedis } from '@/lib/redis';
import { getUserIdFromRequest } from '@/lib/requestUser';

const CACHE_TTL = 60; // 60 seconds

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const redis = getRedis();
    const cacheKey = `stats:${userId}`;

    // Try to get from cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return NextResponse.json(JSON.parse(cached), {
          headers: { 'X-Cache': 'HIT' },
        });
      }
    } catch (redisErr) {
      console.warn('Redis cache miss:', redisErr);
    }

    // Get stats from database
    const miners = await miningPrisma.miner.findMany({
      where: { userId },
      select: { id: true, minerName: true, isActive: true, lastSeen: true },
    });

    const shareStats = await miningPrisma.share.aggregate({
      where: { userId },
      _count: true,
      _sum: { difficulty: true, reward: true },
    });

    const stats = {
      userId,
      totalMiners: miners.length,
      activeMinerCount: miners.filter((m: { isActive: boolean }) => m.isActive).length,
      totalShares: shareStats._count,
      totalDifficulty: shareStats._sum.difficulty || 0,
      totalReward: shareStats._sum.reward || 0,
      miners,
      generatedAt: new Date(),
    };

    // Cache the result
    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(stats));
    } catch (redisErr) {
      console.warn('Redis cache set failed:', redisErr);
    }

    return NextResponse.json(stats, {
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
