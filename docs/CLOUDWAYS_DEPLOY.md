# Cloudways Deployment

This project is ready to deploy on Cloudways as a Node.js application.

For mining-specific operating steps after deployment, see [MINING_PRODUCTION_RUNBOOK.md](MINING_PRODUCTION_RUNBOOK.md).

## 1. Before Uploading

Run these commands locally:

```bash
npm run lint
npm run build
```

If you already have production values prepared, also run:

```bash
npm run verify:prod-env
npm run verify:smtp
```

## 2. Environment Variables on Cloudways

Use [\.env.production.example](../.env.production.example) as the source template.

Minimum required values:

- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_KEY`
- `NEXT_PUBLIC_URL`
- `EMAIL_FROM`

Required for SMTP mail delivery:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

Required if Stripe is enabled:

- `ENABLE_STRIPE_CHECKOUT=true`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Required if NOWPayments is enabled:

- `ENABLE_NOWPAYMENTS_CHECKOUT=true`
- `NOWPAYMENTS_API_KEY`
- `NOWPAYMENTS_IPN_SECRET`

## 3. Build and Start Commands on Cloudways

Recommended application commands:

- Install command: `npm install`
- Build command: `npm run prisma:generate && npm run build`
- Start command: `npm start`

If Cloudways lets you run a post-deploy command, use:

```bash
npm run prisma:migrate:deploy
```

## 4. Database

This app uses PostgreSQL through Prisma.

Before going live:

```bash
npm run prisma:generate
npm run prisma:migrate:deploy
```

Make sure `DATABASE_URL` points to the production PostgreSQL instance, not localhost.

## 5. Webhooks

After your Cloudways domain is live, configure these webhook endpoints:

- Stripe: `/api/stripe/webhook`
- NOWPayments: `/api/nowpayments/webhook`

Use the final public HTTPS domain in the provider dashboards.

For NOWPayments, make sure your firewall or Cloudflare rules allow their webhook IPs and that the endpoint responds in under 3 seconds.

## 6. Final Smoke Test

After deployment and after environment variables are set, verify these flows on the live domain:

- Register
- Login
- Forgot password
- Verify email
- Email 2FA
- Checkout
- Dashboard overview
- Support ticket

If you can SSH into the Cloudways app container and want command-based checks, use:

```bash
npm run verify:prod-env
npm run verify:smtp
BASE_URL="https://your-domain.example" ADMIN_KEY="your-admin-key" npm run e2e:mining:cashout
```

## 7. Notes for This Project

- `NEXT_PUBLIC_URL` must be the final HTTPS domain.
- `EMAIL_TRANSPORT` should stay `smtp` in production.
- `NODE_ENV` should be `production`.
- If local file uploads are expected to persist long-term, review whether Cloudways local disk behavior matches your retention requirements.