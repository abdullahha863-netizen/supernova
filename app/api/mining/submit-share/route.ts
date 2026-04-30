import { NextRequest, NextResponse } from 'next/server';
import { miningPrisma } from '@/lib/miningPrisma';
import { queueShare } from '@/lib/shareBatchProcessor';
import { getRedis } from '@/lib/redis';
import { getSessionSubject, verifySession } from '@/lib/jwt';
import { publishShareSubmission } from '@/lib/miningQueue';
import { incCounter, recordLatency } from '@/lib/miningMetrics';
import { verifyPowShare } from '@/lib/miningPow';
import { recordConnectionObservation } from '@/lib/miningConnectionInsights';
import { resolveCountryCodeFromIp } from '@/lib/geoip';
import { updateMiningAbuseStatsWithClient } from '@/services/shared/mining-abuse-core.mjs';

interface SubmitShareRequest {
  minerId: string;
  jobId: string;
  nonce: string;
  difficulty: number;
  token: string;
}

const RATE_LIMIT_KEY_PREFIX = 'ratelimit:miner:';

async function checkRateLimit(minerId: string): Promise<boolean> {
  const redis = getRedis();
  const key = `${RATE_LIMIT_KEY_PREFIX}${minerId}`;

  try {
    const current = await redis.incr(key);

    if (current === 1) {
      // Set expiry on first request
      await redis.expire(key, 1); // 1 second window
    }

    // Allow up to 10,000 shares per second per miner
    return current <= 10000;
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Allow if Redis is down (fail open)
    return true;
  }
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    const body: SubmitShareRequest = await request.json();

    // Validate input
    if (!body.minerId || !body.jobId || !body.nonce || !body.token) {
      return NextResponse.json(
        { error: 'Missing required fields (minerId, jobId, nonce, token)' },
        { status: 400 }
      );
    }

    // Verify JWT token (from miner authorization)
    let userId: string;
    try {
      const decoded = verifySession(body.token);
      const subject = getSessionSubject(decoded);
      if (!subject) {
        throw new Error('Invalid token payload');
      }
      userId = subject;
    } catch {
      void incCounter('share_rejected', { reason: 'invalid_token', source: 'rest' });
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check rate limit
    const isAllowed = await checkRateLimit(body.minerId);
    if (!isAllowed) {
      void incCounter('share_rejected', { reason: 'rate_limited', source: 'rest' });
      await updateMiningAbuseStatsWithClient(miningPrisma, {
        userId,
        accepted: false,
        logger: console,
      });
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Verify miner belongs to user
    const miner = await miningPrisma.miner.findFirst({
      where: {
        id: body.minerId,
        userId,
      },
    });

    if (!miner) {
      void incCounter('share_rejected', { reason: 'miner_not_found', source: 'rest' });
      await updateMiningAbuseStatsWithClient(miningPrisma, {
        userId,
        accepted: false,
        logger: console,
      });
      return NextResponse.json(
        { error: 'Miner not found or unauthorized' },
        { status: 404 }
      );
    }

    // Phase 1 + 2 security: stale/replay checks + mandatory PoW verification.
    // The share is accepted only if it matches an active server-issued job target.
    const redis = getRedis();
    let pow;
    try {
      pow = await verifyPowShare(redis, {
        userId,
        minerId: body.minerId,
        jobId: body.jobId,
        nonce: body.nonce,
      });
    } catch (powErr) {
      console.error('PoW verification infrastructure error:', powErr);
      void incCounter('share_rejected', { reason: 'pow_infra_error', source: 'rest' });
      await updateMiningAbuseStatsWithClient(miningPrisma, {
        userId,
        accepted: false,
        logger: console,
      });
      return NextResponse.json({ error: 'PoW verification unavailable' }, { status: 503 });
    }

    if (!pow.ok) {
      void incCounter('share_rejected', { reason: pow.reason, source: 'rest' });
      await updateMiningAbuseStatsWithClient(miningPrisma, {
        userId,
        accepted: false,
        logger: console,
      });
      return NextResponse.json(
        { error: `Invalid share: ${pow.reason}` },
        { status: 422 }
      );
    }

    // Queue share for batch processing (non-blocking)
    const sourceIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    const countryHeader = request.headers.get('cf-ipcountry') || request.headers.get('x-vercel-ip-country') || request.headers.get('x-country-code');
    const country = countryHeader || resolveCountryCodeFromIp(sourceIp);
    void recordConnectionObservation({
      source: 'rest',
      sourceIp,
      country,
      userId,
      workerName: body.minerId,
      eventType: 'share_submit',
      at: Date.now(),
    });
    try {
      await publishShareSubmission({
        minerId: body.minerId,
        userId,
        nonce: body.nonce,
        difficulty: pow.requiredDifficulty,
        accepted: true,
        reward: 0,
        submittedAt: new Date().toISOString(),
        sourceIp,
      });
    } catch (mqError) {
      // Fallback to in-process batching when queue is temporarily unavailable.
      console.error('RabbitMQ publish failed, using local batch fallback:', mqError);
      await incCounter('share_mq_fallback', { source: 'rest' });
      await queueShare({
        minerId: body.minerId,
        userId,
        nonce: body.nonce,
        difficulty: pow.requiredDifficulty,
        accepted: true,
        reward: 0,
      });
    }

    // Update last seen (in background)
    miningPrisma.miner
      .update({
        where: { id: body.minerId },
        data: { lastSeen: new Date() },
      })
      .catch((err: unknown) => console.error('Failed to update lastSeen:', err));

    void incCounter('share_accepted', { source: 'rest' });
    void recordLatency('rest_submit_share', Date.now() - start);

    // Return immediately with accepted status
    return NextResponse.json(
      {
        accepted: true,
        achievedDifficulty: pow.achievedDifficulty,
        requiredDifficulty: pow.requiredDifficulty,
        message: 'Share accepted for async processing',
      },
      { status: 202 }
    );
  } catch (error) {
    void incCounter('share_rejected', { reason: 'internal_error', source: 'rest' });
    console.error('Submit share error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Mining endpoint is alive' });
}
