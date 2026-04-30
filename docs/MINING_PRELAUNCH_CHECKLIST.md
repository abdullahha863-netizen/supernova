# Mining Prelaunch Checklist

## Core Services

- Confirm Next app is reachable on the intended base URL.
- Confirm Redis is up and `/api/mining/health` reports `redis: true`.
- Confirm RabbitMQ is up and `/api/mining/health` reports `rabbitmq: true`.
- Confirm share consumers are running and `/api/mining/queue` shows at least one consumer.
- Confirm stats writer is healthy through `/api/mining/hashrate-writer`.
- Confirm mining gateways and stratum gateways are running and listening.

## Admin Operations

- Log into `/admin/login` with the configured `ADMIN_KEY`.
- Open `/admin/dashboard` and verify no redirect loops or 401 responses.
- Open `/admin/dashboard/system-health` and verify health is `ok` or explain any degraded checks.
- Open `/admin/dashboard/observability` and confirm counters load.
- Open `/admin/dashboard/cashout-review` and confirm pending requests load.
- Open at least one detailed cashout review page and verify user, payout, uptime, fraud, and hashrate panels load.

## Cashout Review Integrity

- Verify a `payoutId` from `/api/admin/cashout-review` exists in `/api/mining/cashout?userId=...` history.
- Verify selecting a missing or non-pending `payoutId` disables cashout actions.
- Verify invalid approve/reject attempts return a non-success response.
- Verify no page claims success when no pending payout was updated.

## Historical Hashrate

- Confirm `/api/mining/hashrate-writer` returns `status: healthy`.
- Confirm `latestSnapshotAt` advances over time.
- Confirm `snapshotsLastHour` is non-zero after writer uptime.
- Confirm `miner_hashrate_history` accumulates rows in the database.
- Confirm `/api/mining/hashrate/history?userId=...` returns real windows for an active miner.

## Queue and Metrics

- Confirm `/api/mining/queue` returns queue name, message count, and consumer count.
- Confirm `/api/mining/metrics` returns counters without 503.
- Confirm observability pages still load while the writer and workers are active.

## Before Going Online

- Replace placeholder secrets in `.env.production`.
- Set a strong real `ADMIN_KEY` in production.
- Set a strong real `JWT_SECRET` in production.
- Verify production `DATABASE_URL`, `RABBITMQ_URL`, and Redis settings.
- Run `npm run verify:prod-env`.
- Run `npm run verify:smtp` if mail flows are required.
- Run `npm run build` and fix any production build issues.
- Re-run the mining cashout e2e check against the deployment target before launch.
