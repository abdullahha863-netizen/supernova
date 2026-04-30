-- CreateTable
CREATE TABLE IF NOT EXISTS "Referral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rewardStatus" TEXT NOT NULL DEFAULT 'pending',
    "rewardType" TEXT,
    "rewardAmount" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Miner" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "minerName" TEXT NOT NULL,
    "minerAddress" TEXT NOT NULL,
    "poolWorkerName" TEXT NOT NULL,
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Miner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "miner_workers" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "hashrate" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "last_share" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reject_rate" DECIMAL NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "miner_workers_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "miner_workers" ADD COLUMN IF NOT EXISTS "description" TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS "miner_profiles" (
    "user_id" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'Starter',
    "payout_address" TEXT NOT NULL DEFAULT '',
    "min_payout" DECIMAL NOT NULL DEFAULT 30,
    "payout_schedule" TEXT NOT NULL DEFAULT 'daily',
    "pending_balance" DECIMAL NOT NULL DEFAULT 0,
    "total_hashrate" DECIMAL NOT NULL DEFAULT 0,
    "reward_flow" DECIMAL NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "miner_profiles_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "miner_profiles" ALTER COLUMN "plan" SET DEFAULT 'Starter';

CREATE TABLE IF NOT EXISTS "miner_payouts" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "payout_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "tx" TEXT NOT NULL DEFAULT 'Processing',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "miner_payouts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "miner_hashrate_history" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "hashrate" DECIMAL NOT NULL DEFAULT 0,
    "worker_count" INTEGER NOT NULL DEFAULT 0,
    "online_workers" INTEGER NOT NULL DEFAULT 0,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "miner_hashrate_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "checkout_intents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "tier" TEXT NOT NULL,
    "amount_usd" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "provider_intent_id" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "shipping_full_name" TEXT NOT NULL DEFAULT '',
    "shipping_phone" TEXT NOT NULL DEFAULT '',
    "shipping_line1" TEXT NOT NULL DEFAULT '',
    "shipping_line2" TEXT NOT NULL DEFAULT '',
    "shipping_city" TEXT NOT NULL DEFAULT '',
    "shipping_state" TEXT NOT NULL DEFAULT '',
    "shipping_postal_code" TEXT NOT NULL DEFAULT '',
    "shipping_country" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "fulfilled_at" TIMESTAMPTZ(6),
    CONSTRAINT "checkout_intents_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "checkout_intents" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'mock';
ALTER TABLE "checkout_intents" ADD COLUMN IF NOT EXISTS "provider_intent_id" TEXT;
ALTER TABLE "checkout_intents" ADD COLUMN IF NOT EXISTS "shipping_full_name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "checkout_intents" ADD COLUMN IF NOT EXISTS "shipping_phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "checkout_intents" ADD COLUMN IF NOT EXISTS "shipping_line1" TEXT NOT NULL DEFAULT '';
ALTER TABLE "checkout_intents" ADD COLUMN IF NOT EXISTS "shipping_line2" TEXT NOT NULL DEFAULT '';
ALTER TABLE "checkout_intents" ADD COLUMN IF NOT EXISTS "shipping_city" TEXT NOT NULL DEFAULT '';
ALTER TABLE "checkout_intents" ADD COLUMN IF NOT EXISTS "shipping_state" TEXT NOT NULL DEFAULT '';
ALTER TABLE "checkout_intents" ADD COLUMN IF NOT EXISTS "shipping_postal_code" TEXT NOT NULL DEFAULT '';
ALTER TABLE "checkout_intents" ADD COLUMN IF NOT EXISTS "shipping_country" TEXT NOT NULL DEFAULT '';
ALTER TABLE "checkout_intents" ADD COLUMN IF NOT EXISTS "fulfilled_at" TIMESTAMPTZ(6);

CREATE TABLE IF NOT EXISTS "member_card_fulfillments" (
    "id" SERIAL NOT NULL,
    "checkout_intent_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "card_label" TEXT NOT NULL,
    "fulfillment_status" TEXT NOT NULL DEFAULT 'queued',
    "shipping_full_name" TEXT NOT NULL DEFAULT '',
    "shipping_email" TEXT NOT NULL DEFAULT '',
    "shipping_phone" TEXT NOT NULL DEFAULT '',
    "shipping_line1" TEXT NOT NULL DEFAULT '',
    "shipping_line2" TEXT NOT NULL DEFAULT '',
    "shipping_city" TEXT NOT NULL DEFAULT '',
    "shipping_state" TEXT NOT NULL DEFAULT '',
    "shipping_postal_code" TEXT NOT NULL DEFAULT '',
    "shipping_country" TEXT NOT NULL DEFAULT '',
    "carrier" TEXT NOT NULL DEFAULT '',
    "tracking_number" TEXT NOT NULL DEFAULT '',
    "tracking_url" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "estimated_delivery" TIMESTAMPTZ(6),
    "shipped_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "member_card_fulfillments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "member_card_fulfillments" ADD COLUMN IF NOT EXISTS "shipping_full_name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "member_card_fulfillments" ADD COLUMN IF NOT EXISTS "shipping_email" TEXT NOT NULL DEFAULT '';
ALTER TABLE "member_card_fulfillments" ADD COLUMN IF NOT EXISTS "shipping_phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "member_card_fulfillments" ADD COLUMN IF NOT EXISTS "shipping_line1" TEXT NOT NULL DEFAULT '';
ALTER TABLE "member_card_fulfillments" ADD COLUMN IF NOT EXISTS "shipping_line2" TEXT NOT NULL DEFAULT '';
ALTER TABLE "member_card_fulfillments" ADD COLUMN IF NOT EXISTS "shipping_city" TEXT NOT NULL DEFAULT '';
ALTER TABLE "member_card_fulfillments" ADD COLUMN IF NOT EXISTS "shipping_state" TEXT NOT NULL DEFAULT '';
ALTER TABLE "member_card_fulfillments" ADD COLUMN IF NOT EXISTS "shipping_postal_code" TEXT NOT NULL DEFAULT '';
ALTER TABLE "member_card_fulfillments" ADD COLUMN IF NOT EXISTS "shipping_country" TEXT NOT NULL DEFAULT '';
ALTER TABLE "member_card_fulfillments" ADD COLUMN IF NOT EXISTS "carrier" TEXT NOT NULL DEFAULT '';
ALTER TABLE "member_card_fulfillments" ADD COLUMN IF NOT EXISTS "tracking_number" TEXT NOT NULL DEFAULT '';
ALTER TABLE "member_card_fulfillments" ADD COLUMN IF NOT EXISTS "tracking_url" TEXT NOT NULL DEFAULT '';
ALTER TABLE "member_card_fulfillments" ADD COLUMN IF NOT EXISTS "notes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "member_card_fulfillments" ADD COLUMN IF NOT EXISTS "estimated_delivery" TIMESTAMPTZ(6);
ALTER TABLE "member_card_fulfillments" ADD COLUMN IF NOT EXISTS "shipped_at" TIMESTAMPTZ(6);
ALTER TABLE "member_card_fulfillments" ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMPTZ(6);

CREATE TABLE IF NOT EXISTS "user_profiles" (
    "user_id" TEXT NOT NULL,
    "avatar_url" TEXT NOT NULL DEFAULT '',
    "shipping_full_name" TEXT NOT NULL DEFAULT '',
    "shipping_phone" TEXT NOT NULL DEFAULT '',
    "shipping_line1" TEXT NOT NULL DEFAULT '',
    "shipping_line2" TEXT NOT NULL DEFAULT '',
    "shipping_city" TEXT NOT NULL DEFAULT '',
    "shipping_state" TEXT NOT NULL DEFAULT '',
    "shipping_postal_code" TEXT NOT NULL DEFAULT '',
    "shipping_country" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE IF NOT EXISTS "pending_email_changes" (
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "new_email" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pending_email_changes_pkey" PRIMARY KEY ("token")
);

CREATE TABLE IF NOT EXISTS "referral_audit" (
    "id" SERIAL NOT NULL,
    "referrer_id" TEXT NOT NULL,
    "referred_user_id" TEXT NOT NULL,
    "ip_hash" TEXT,
    "ua_hash" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "referral_audit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "emergency_security" (
    "user_id" TEXT NOT NULL,
    "pin_hash" TEXT,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "lockout_until" TIMESTAMPTZ(6),
    "emergency_locked" BOOLEAN NOT NULL DEFAULT false,
    "pin_reset_failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "pin_reset_lockout_until" TIMESTAMPTZ(6),
    "pin_reset_recovery_until" TIMESTAMPTZ(6),
    "locked_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "emergency_security_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "emergency_security" ADD COLUMN IF NOT EXISTS "pin_reset_failed_attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "emergency_security" ADD COLUMN IF NOT EXISTS "pin_reset_lockout_until" TIMESTAMPTZ(6);
ALTER TABLE "emergency_security" ADD COLUMN IF NOT EXISTS "pin_reset_recovery_until" TIMESTAMPTZ(6);

CREATE TABLE IF NOT EXISTS "security_events" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT NOT NULL DEFAULT '',
    "ip" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Share" (
    "id" TEXT NOT NULL,
    "minerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "difficulty" DOUBLE PRECISION NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT true,
    "reward" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Share_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MiningPool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxMiners" INTEGER NOT NULL DEFAULT 10000,
    "currentMiners" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MiningPool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Miner_userId_isActive_idx" ON "Miner"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "Miner_userId_lastSeen_idx" ON "Miner"("userId", "lastSeen");
CREATE INDEX IF NOT EXISTS "Miner_lastSeen_idx" ON "Miner"("lastSeen");
CREATE UNIQUE INDEX IF NOT EXISTS "Miner_userId_poolWorkerName_key" ON "Miner"("userId", "poolWorkerName");
CREATE UNIQUE INDEX IF NOT EXISTS "miner_workers_user_id_name_key" ON "miner_workers"("user_id", "name");
CREATE INDEX IF NOT EXISTS "miner_hashrate_history_user_recorded_idx" ON "miner_hashrate_history"("user_id", "recorded_at");
CREATE INDEX IF NOT EXISTS "miner_hashrate_history_recorded_idx" ON "miner_hashrate_history"("recorded_at");
CREATE INDEX IF NOT EXISTS "idx_checkout_intents_user_id" ON "checkout_intents"("user_id");
CREATE INDEX IF NOT EXISTS "idx_checkout_intents_status" ON "checkout_intents"("status");
CREATE INDEX IF NOT EXISTS "idx_checkout_intents_expires_at" ON "checkout_intents"("expires_at");
CREATE INDEX IF NOT EXISTS "idx_checkout_intents_provider_intent_id" ON "checkout_intents"("provider_intent_id");
CREATE UNIQUE INDEX IF NOT EXISTS "member_card_fulfillments_checkout_intent_id_key" ON "member_card_fulfillments"("checkout_intent_id");
CREATE INDEX IF NOT EXISTS "idx_member_card_fulfillments_user_id" ON "member_card_fulfillments"("user_id");
CREATE INDEX IF NOT EXISTS "idx_member_card_fulfillments_status" ON "member_card_fulfillments"("fulfillment_status");
CREATE UNIQUE INDEX IF NOT EXISTS "referral_audit_referred_user_id_key" ON "referral_audit"("referred_user_id");
CREATE INDEX IF NOT EXISTS "idx_referral_audit_referrer" ON "referral_audit"("referrer_id");
CREATE INDEX IF NOT EXISTS "idx_referral_audit_ip_hash" ON "referral_audit"("ip_hash");
CREATE INDEX IF NOT EXISTS "idx_referral_audit_ua_hash" ON "referral_audit"("ua_hash");
CREATE INDEX IF NOT EXISTS "Share_userId_createdAt_idx" ON "Share"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Share_minerId_createdAt_idx" ON "Share"("minerId", "createdAt");
CREATE INDEX IF NOT EXISTS "Share_createdAt_idx" ON "Share"("createdAt");
CREATE INDEX IF NOT EXISTS "Share_accepted_idx" ON "Share"("accepted");
CREATE UNIQUE INDEX IF NOT EXISTS "MiningPool_name_key" ON "MiningPool"("name");
CREATE INDEX IF NOT EXISTS "MiningPool_isActive_idx" ON "MiningPool"("isActive");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Referral_referrerId_fkey') THEN
    ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Referral_referredUserId_fkey') THEN
    ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Miner_userId_fkey') THEN
    ALTER TABLE "Miner" ADD CONSTRAINT "Miner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Share_minerId_fkey') THEN
    ALTER TABLE "Share" ADD CONSTRAINT "Share_minerId_fkey" FOREIGN KEY ("minerId") REFERENCES "Miner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Share_userId_fkey') THEN
    ALTER TABLE "Share" ADD CONSTRAINT "Share_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
