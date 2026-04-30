import { PrismaClient } from "@prisma/client";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run dev flag helper in production.");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  await prisma.$executeRaw`
    ALTER TABLE "miner_profiles"
      ADD COLUMN IF NOT EXISTS "total_shares" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "accepted_shares" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "rejected_shares" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "reject_rate" DECIMAL NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "shares_per_minute" DECIMAL NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "share_window_started_at" TIMESTAMPTZ(6),
      ADD COLUMN IF NOT EXISTS "share_window_count" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "is_flagged" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "flag_reason" TEXT,
      ADD COLUMN IF NOT EXISTS "flagged_at" TIMESTAMPTZ(6)
  `;

  const user = await prisma.user.findFirst({
    where: { miners: { some: {} } },
    select: {
      id: true,
      name: true,
      email: true,
      miners: {
        select: { id: true, minerName: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!user) {
    throw new Error("No user with miners found in the local database.");
  }

  const beforeFinancialRows = await prisma.$queryRaw`
    SELECT
      "pending_balance" AS "pendingBalance",
      "reward_flow" AS "rewardFlow"
    FROM "miner_profiles"
    WHERE "user_id" = ${user.id}
  `;

  await prisma.$executeRaw`
    INSERT INTO "miner_profiles" (
      "user_id",
      "is_flagged",
      "flag_reason",
      "flagged_at",
      "updated_at"
    )
    VALUES (${user.id}, true, 'high_reject_rate', NOW(), NOW())
    ON CONFLICT ("user_id") DO UPDATE SET
      "is_flagged" = true,
      "flag_reason" = 'high_reject_rate',
      "flagged_at" = NOW(),
      "updated_at" = NOW()
  `;

  const afterRows = await prisma.$queryRaw`
    SELECT
      "user_id" AS "userId",
      "is_flagged" AS "isFlagged",
      "flag_reason" AS "flagReason",
      "flagged_at" AS "flaggedAt",
      "pending_balance" AS "pendingBalance",
      "reward_flow" AS "rewardFlow"
    FROM "miner_profiles"
    WHERE "user_id" = ${user.id}
  `;

  const beforeFinancial = beforeFinancialRows[0] ?? null;
  const after = afterRows[0] ?? null;

  console.log(JSON.stringify({
    user,
    beforeFinancial,
    after,
    financialFieldsUnchanged: beforeFinancial
      ? String(beforeFinancial.pendingBalance) === String(after?.pendingBalance)
        && String(beforeFinancial.rewardFlow) === String(after?.rewardFlow)
      : true,
  }, null, 2));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
