This is a Next.js application for Supernova.

## Deployment

For a production deployment checklist on Cloudways, see [docs/CLOUDWAYS_DEPLOY.md](docs/CLOUDWAYS_DEPLOY.md).

For mining-specific prelaunch and operations guidance, see [docs/MINING_PRELAUNCH_CHECKLIST.md](docs/MINING_PRELAUNCH_CHECKLIST.md) and [docs/MINING_PRODUCTION_RUNBOOK.md](docs/MINING_PRODUCTION_RUNBOOK.md).

For the shortest server-side command sequence, see [docs/MINING_SERVER_QUICKSTART.md](docs/MINING_SERVER_QUICKSTART.md).

Use [\.env.production.example](.env.production.example) as the production environment template.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Production Commands

```bash
npm run verify:prod-env
npm run verify:smtp
npm run lint
npm run build
npm run prisma:migrate:deploy
```
