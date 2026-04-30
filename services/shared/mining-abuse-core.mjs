const DEFAULT_SPAM_SHARES_PER_MINUTE = 6000;
const HIGH_REJECT_RATE = 0.5;

function spamThreshold() {
  const value = Number(process.env.MINING_SPAM_SHARES_PER_MINUTE || DEFAULT_SPAM_SHARES_PER_MINUTE);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_SPAM_SHARES_PER_MINUTE;
}

function logWarn(logger, payload, message) {
  if (logger?.warn) {
    logger.warn(message, payload);
    return;
  }

  console.warn(message, payload);
}

export async function updateMiningAbuseStatsWithClient(prisma, input) {
  const userId = String(input.userId || "").trim();
  if (!userId) return null;

  const accepted = Boolean(input.accepted);
  const now = input.at ? new Date(input.at) : new Date();
  const threshold = spamThreshold();

  await prisma.$executeRaw`
    INSERT INTO "miner_profiles" ("user_id", "share_window_started_at", "updated_at")
    VALUES (${userId}, ${now}, ${now})
    ON CONFLICT ("user_id") DO NOTHING
  `;

  await prisma.$executeRaw`
    UPDATE "miner_profiles"
    SET
      "share_window_started_at" = CASE
        WHEN "share_window_started_at" IS NULL OR ${now} - "share_window_started_at" > interval '60 seconds'
          THEN ${now}
        ELSE "share_window_started_at"
      END,
      "share_window_count" = CASE
        WHEN "share_window_started_at" IS NULL OR ${now} - "share_window_started_at" > interval '60 seconds'
          THEN 1
        ELSE "share_window_count" + 1
      END,
      "total_shares" = "total_shares" + 1,
      "accepted_shares" = "accepted_shares" + ${accepted ? 1 : 0},
      "rejected_shares" = "rejected_shares" + ${accepted ? 0 : 1},
      "updated_at" = ${now}
    WHERE "user_id" = ${userId}
  `;

  await prisma.$executeRaw`
    UPDATE "miner_profiles"
    SET
      "reject_rate" = CASE
        WHEN "total_shares" > 0 THEN "rejected_shares"::DECIMAL / "total_shares"::DECIMAL
        ELSE 0
      END,
      "shares_per_minute" = CASE
        WHEN "share_window_started_at" IS NULL THEN "share_window_count"
        ELSE "share_window_count"::DECIMAL / GREATEST(EXTRACT(EPOCH FROM (${now} - "share_window_started_at")) / 60, 1.0 / 60)
      END
    WHERE "user_id" = ${userId}
  `;

  const rows = await prisma.$queryRaw`
    SELECT
      "total_shares" AS "totalShares",
      "accepted_shares" AS "acceptedShares",
      "rejected_shares" AS "rejectedShares",
      "reject_rate" AS "rejectRate",
      "shares_per_minute" AS "sharesPerMinute",
      "is_flagged" AS "isFlagged"
    FROM "miner_profiles"
    WHERE "user_id" = ${userId}
    LIMIT 1
  `;
  const stats = Array.isArray(rows) ? rows[0] : null;
  if (!stats) return null;

  const rejectRate = Number(stats.rejectRate || 0);
  const sharesPerMinute = Number(stats.sharesPerMinute || 0);
  const reason =
    rejectRate > HIGH_REJECT_RATE
      ? "high_reject_rate"
      : sharesPerMinute > threshold
        ? "spam_shares"
        : null;

  if (reason && !stats.isFlagged) {
    await prisma.$executeRaw`
      UPDATE "miner_profiles"
      SET "is_flagged" = true,
          "flag_reason" = ${reason},
          "flagged_at" = ${now},
          "updated_at" = ${now}
      WHERE "user_id" = ${userId}
    `;

    logWarn(input.logger, { userId, rejectRate, sharesPerMinute, reason }, "Miner flagged for suspicious activity");
  }

  return {
    totalShares: Number(stats.totalShares || 0),
    acceptedShares: Number(stats.acceptedShares || 0),
    rejectedShares: Number(stats.rejectedShares || 0),
    rejectRate,
    sharesPerMinute,
    isFlagged: Boolean(stats.isFlagged || reason),
    flagReason: reason,
  };
}
