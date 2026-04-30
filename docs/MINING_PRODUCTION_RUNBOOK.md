# Mining Production Runbook

## Purpose

This runbook is the practical operating guide for bringing the mining stack online and validating that it stays healthy after deployment.

Use it together with [MINING_PRELAUNCH_CHECKLIST.md](MINING_PRELAUNCH_CHECKLIST.md).

If you want the shortest command-by-command version, use [MINING_SERVER_QUICKSTART.md](MINING_SERVER_QUICKSTART.md).

## Required Production Inputs

Set these values before bringing the mining stack online:

- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_KEY`
- `NEXT_PUBLIC_URL`
- `BASE_URL`
- `RABBITMQ_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `MINING_SHARE_QUEUE` if you are not using the default queue

Recommended:

- `MINING_HASHRATE_SNAPSHOT_INTERVAL_MS`
- `MINING_HASHRATE_HISTORY_RETENTION_DAYS`

## Startup Order

Bring services up in this order:

1. PostgreSQL
2. Redis
3. RabbitMQ
4. Next.js application
5. Share consumers
6. Stats writer
7. Mining gateways
8. Stratum gateways
9. Load balancer

If RabbitMQ or Redis are unavailable, do not treat the mining stack as ready even if the website itself loads.

## Minimum Health Checks

Run these checks against the deployment target:

```bash
curl -H "x-admin-key: $ADMIN_KEY" "$BASE_URL/api/mining/health"
curl -H "x-admin-key: $ADMIN_KEY" "$BASE_URL/api/mining/queue"
curl -H "x-admin-key: $ADMIN_KEY" "$BASE_URL/api/mining/hashrate-writer"
curl -H "x-admin-key: $ADMIN_KEY" "$BASE_URL/api/mining/metrics"
curl -H "x-admin-key: $ADMIN_KEY" "$BASE_URL/api/admin/cashout-review"
```

Expected:

- `/api/mining/health` returns `status: ok`
- `/api/mining/queue` returns at least one consumer
- `/api/mining/hashrate-writer` returns `status: healthy`
- `/api/mining/metrics` returns `ok: true`
- `/api/admin/cashout-review` returns pending rows or an empty valid list

## Admin Dashboard Validation

Log into `/admin/login` with `ADMIN_KEY` and verify:

- `/admin/dashboard`
- `/admin/dashboard/system-health`
- `/admin/dashboard/observability`
- `/admin/dashboard/cashout-review`

Expected:

- No redirect loop
- No unauthorized response
- System Health shows Redis and RabbitMQ up
- Hashrate writer widget shows `healthy`
- Observability loads counters
- Cashout review pages load real data

## Historical Hashrate Validation

The cashout review page depends on real persisted hashrate history.

Validate:

- `latestSnapshotAt` moves forward over time
- `snapshotsLastHour` increases while the writer is running
- `miner_hashrate_history` receives rows
- `/api/mining/hashrate/history?userId=...` returns windowed data for active miners

Example database check:

```sql
SELECT COUNT(*) FROM miner_hashrate_history;
SELECT user_id, recorded_at, hashrate
FROM miner_hashrate_history
ORDER BY recorded_at DESC
LIMIT 20;
```

## Deeper E2E Validation

Run the deeper mining and cashout validation script against the target environment:

```bash
BASE_URL="https://your-domain.example" ADMIN_KEY="your-admin-key" npm run e2e:mining:cashout
```

Expected:

- Health passes
- Queue passes
- Writer is healthy
- Metrics endpoint responds
- Cashout review data loads
- Invalid payout update returns `409`

## Common Failures

### Redis Down

Symptoms:

- `/api/mining/health` shows `redis: false`
- metrics or work issuance may fail
- stats writer may continue snapshots but observability degrades

Action:

- Restore Redis connectivity
- Re-run health and metrics checks

### RabbitMQ Down

Symptoms:

- `/api/mining/health` shows `rabbitmq: false`
- queue monitoring degrades
- share consumers and gateway publish paths fail or fall back

Action:

- Restore RabbitMQ
- Confirm queue consumer count returns
- Re-run `npm run e2e:mining:cashout`

### Hashrate Writer Stale

Symptoms:

- `/api/mining/hashrate-writer` returns `stale` or `empty`
- historical windows stop advancing

Action:

- Restart the stats writer
- Confirm Redis and database connectivity
- Confirm new rows are inserted into `miner_hashrate_history`

### Admin Cashout Review Mismatch

Symptoms:

- payout present in list but missing in detail history
- actions appear disabled unexpectedly

Action:

- Verify `payoutId` exists in `miner_payouts`
- Call `/api/mining/cashout?userId=...`
- Re-check whether the payout is still `pending`

## Release Gate

Do not treat the mining system as production-ready until all of the following are true:

- Health endpoint returns `ok`
- Queue consumer count is non-zero
- Hashrate writer is `healthy`
- Historical rows are accumulating
- Admin cashout review loads real data
- `npm run e2e:mining:cashout` passes against the target environment
