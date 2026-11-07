This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

### Local env trap: stale shell `QWEN_*` beats `.env.local`

`next dev` loads `.env.local` through `@next/env`, which **never overrides a variable already set in
your shell**. Older shells export `QWEN_BASE_URL` / `QWEN_API_KEY` for the retired `dashscope-intl`
endpoint; with those set, every local Qwen call silently goes to the wrong host and fails. `npm run dev`
prints a warning when it sees any `QWEN_*` in the shell (`scripts/dev-env-check.mjs`). Fix:

```bash
unset QWEN_BASE_URL QWEN_API_KEY QWEN_CHAT_MODEL   # or: env -u QWEN_BASE_URL -u QWEN_API_KEY npm run dev
```

Production is not affected (the server reads `.env.production`).

### Site Bot paid-journey rehearsals

`scripts/site-bot-rehearsal-dev.sh [port] [dist-dir] [data-dir]` starts an isolated dev server with the
paid flow open (`SITE_BOT_PAID_FLOW=1`, non-production only), zero-network research fixtures
(`SITE_BOT_RESEARCH_PROVIDERS=fixture`), mock payments, blanked side-effect credentials, the Qwen trap
unset, and `WAO_CLIENTS_DIR` / `WAO_SITES_DIR` / `WAO_SITE_RESEARCH_DIR` pointed outside `data/`
(defaults stay `data/clients`, `data/sites`, `data/site-research`).

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
