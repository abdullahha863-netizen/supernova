CREATE TABLE IF NOT EXISTS "PoolBlock" (
    "id" TEXT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "height" INTEGER NOT NULL,
    "grossReward" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "foundAt" TIMESTAMP(3) NOT NULL,
    "distributedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PoolBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BlockRewardDistribution" (
    "id" TEXT NOT NULL,
    "poolBlockId" TEXT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userShareWeight" DECIMAL NOT NULL,
    "totalWindowWeight" DECIMAL NOT NULL,
    "grossReward" DECIMAL NOT NULL,
    "netReward" DECIMAL NOT NULL,
    "poolFeeAmount" DECIMAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlockRewardDistribution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PoolBlock_blockHash_key" ON "PoolBlock"("blockHash");
CREATE INDEX IF NOT EXISTS "PoolBlock_status_foundAt_idx" ON "PoolBlock"("status", "foundAt");
CREATE INDEX IF NOT EXISTS "PoolBlock_height_idx" ON "PoolBlock"("height");
CREATE UNIQUE INDEX IF NOT EXISTS "BlockRewardDistribution_poolBlockId_userId_key" ON "BlockRewardDistribution"("poolBlockId", "userId");
CREATE INDEX IF NOT EXISTS "BlockRewardDistribution_blockHash_idx" ON "BlockRewardDistribution"("blockHash");
CREATE INDEX IF NOT EXISTS "BlockRewardDistribution_userId_createdAt_idx" ON "BlockRewardDistribution"("userId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BlockRewardDistribution_poolBlockId_fkey') THEN
    ALTER TABLE "BlockRewardDistribution" ADD CONSTRAINT "BlockRewardDistribution_poolBlockId_fkey" FOREIGN KEY ("poolBlockId") REFERENCES "PoolBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BlockRewardDistribution_userId_fkey') THEN
    ALTER TABLE "BlockRewardDistribution" ADD CONSTRAINT "BlockRewardDistribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
