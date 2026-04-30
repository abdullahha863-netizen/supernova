# Mining Server Quickstart

هذا الملف هو النسخة المختصرة جدًا لتشغيل ومراجعة ستاك التعدين على السيرفر.

## 1. تأكد من متغيرات البيئة

الحد الأدنى:

```bash
DATABASE_URL=...
JWT_SECRET=...
ADMIN_KEY=...
BASE_URL=https://your-domain.example
NEXT_PUBLIC_URL=https://your-domain.example
RABBITMQ_URL=amqp://user:pass@host:5672
REDIS_HOST=host
REDIS_PORT=6379
```

## 2. شغّل التطبيق الرئيسي

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run build
npm start
```

## 3. شغّل خدمات التعدين

شغّل هذه الخدمات كعمليات مستقلة أو عبر process manager:

```bash
node services/workers/share-consumer.mjs
node services/workers/stats-aggregator.mjs
node services/mining-gateway/server.mjs
node services/stratum-gateway/server.mjs
```

## 4. افحص الصحة

```bash
curl -H "x-admin-key: $ADMIN_KEY" "$BASE_URL/api/mining/health"
curl -H "x-admin-key: $ADMIN_KEY" "$BASE_URL/api/mining/queue"
curl -H "x-admin-key: $ADMIN_KEY" "$BASE_URL/api/mining/hashrate-writer"
curl -H "x-admin-key: $ADMIN_KEY" "$BASE_URL/api/mining/metrics"
```

المطلوب:

- health = ok
- redis = true
- rabbitmq = true
- queue consumers > 0
- hashrate writer = healthy

## 5. افحص الأدمن

افتح:

- `/admin/dashboard`
- `/admin/dashboard/system-health`
- `/admin/dashboard/observability`
- `/admin/dashboard/cashout-review`

المطلوب:

- لا يوجد 401
- لا يوجد redirect loop
- System Health تظهر Redis و RabbitMQ بحالة UP
- Hashrate writer يظهر healthy

## 6. افحص E2E

```bash
BASE_URL="https://your-domain.example" ADMIN_KEY="your-admin-key" npm run e2e:mining:cashout
```

المطلوب:

- السكربت ينتهي بدون خطأ
- invalid payout action يرجع 409
- writer يبقى healthy

## 7. إذا فشل شيء

إذا Redis فشل:

```bash
curl -H "x-admin-key: $ADMIN_KEY" "$BASE_URL/api/mining/health"
```

إذا RabbitMQ فشل:

```bash
curl -H "x-admin-key: $ADMIN_KEY" "$BASE_URL/api/mining/queue"
```

إذا historical hashrate توقف:

```bash
curl -H "x-admin-key: $ADMIN_KEY" "$BASE_URL/api/mining/hashrate-writer"
```

ثم راجع:

- [MINING_PRELAUNCH_CHECKLIST.md](MINING_PRELAUNCH_CHECKLIST.md)
- [MINING_PRODUCTION_RUNBOOK.md](MINING_PRODUCTION_RUNBOOK.md)
