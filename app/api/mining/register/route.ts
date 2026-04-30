import { NextRequest, NextResponse } from 'next/server';
import { miningPrisma } from '@/lib/miningPrisma';
import { getRedis } from '@/lib/redis';
import { getUserIdFromRequest } from '@/lib/requestUser';
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/getClientIp';

interface RegisterMinerRequest {
  minerName: string;
  minerAddress: string;
  poolWorkerName: string;
}

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimit(`${getClientIp(request)}:mining-register`, { windowMs: 60_000, max: 30 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Rate limit' },
        { status: 429 }
      );
    }

    const body: RegisterMinerRequest = await request.json();

    // Validate input
    if (!body.minerName || !body.poolWorkerName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create or update miner
    const miner = await miningPrisma.miner.upsert({
      where: {
        userId_poolWorkerName: {
          userId,
          poolWorkerName: body.poolWorkerName,
        },
      },
      create: {
        userId,
        minerName: body.minerName,
        minerAddress: body.minerAddress || '',
        poolWorkerName: body.poolWorkerName,
      },
      update: {
        minerName: body.minerName,
        minerAddress: body.minerAddress || '',
        isActive: true,
        lastSeen: new Date(),
      },
    });

    // Invalidate cache
    const redis = getRedis();
    await redis.del(`miner:${userId}:${body.poolWorkerName}`);
    await redis.del(`stats:${userId}`);

    return NextResponse.json(
      {
        minerId: miner.id,
        message: 'Miner registered successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register miner error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
