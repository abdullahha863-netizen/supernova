ALTER TABLE "miner_profiles"
ADD COLUMN IF NOT EXISTS "reserved_balance" DECIMAL NOT NULL DEFAULT 0;

ALTER TABLE "miner_payouts"
ADD COLUMN IF NOT EXISTS "tx_hash" TEXT,
ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT,
ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMPTZ(6);

CREATE INDEX IF NOT EXISTS "idx_miner_payouts_user_status"
ON "miner_payouts" ("user_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "miner_payouts_idempotency_key_key"
ON "miner_payouts" ("idempotency_key")
WHERE "idempotency_key" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "miner_payout_status_history" (
  "id" SERIAL PRIMARY KEY,
  "payout_id" INTEGER NOT NULL,
  "from_status" TEXT,
  "to_status" TEXT NOT NULL,
  "note" TEXT NOT NULL DEFAULT '',
  "tx_hash" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "miner_payout_status_history_payout_id_fkey"
    FOREIGN KEY ("payout_id") REFERENCES "miner_payouts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_miner_payout_status_history_payout_created"
ON "miner_payout_status_history" ("payout_id", "created_at");
