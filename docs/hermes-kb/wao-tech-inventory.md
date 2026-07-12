# WAO Technical Inventory — Live Architecture (2026-07-11)

## Stack
- Next.js 16 (App Router, Turbopack), React 19, TypeScript. Hebrew RTL marketing site + client tools, wao.co.il.
- Hosting: VPS with PM2 process manager; deploy = git pull + build + PM2 restart via deploy.sh over SSH.
- ~97 knowledge articles live under /knowledge/[slug]. Article copy lives in src/data/knowledge.ts — SACRED FILE: edited only via surgical Python string replacement by the cloud tier, never drafted locally.

## Client portal & auth
- Client login: /client/login with per-client 4-digit PIN → HMAC-signed cookie → /client/dashboard.
- Master admin: /admin/login → client dropdown → enter any client portal without their PIN.
- Route protection: src/proxy.ts (Next.js middleware) covers /client, /admin/clients, /geo/action, /geo/dashboard; API routes return 401 JSON, pages redirect.
- 4 live clients, each a folder data/clients/{id}/ with client.json (site URL, niche, USP, contact, PIN, entitlements[]). Entitlement strings gate which dashboard tools a client sees.
- Clients: retter (NLP training institute), ajudaica (Judaica e-commerce, English), aasada (budget catering, aaasada.com), merlo (prestige catering).

## Bot tool scripts (Node .mjs, in scripts/)
All read Google Search Console via OAuth (shared Google Cloud credentials + refresh token). All write JSON into data/clients/{id}/, which the client dashboard renders. All are suggest-only (read-only); any write-action requires a graduation process.
- gsc-pareto.mjs — top queries/pages pareto analysis → pareto.json
- ads-overlap.mjs — organic top-3 keywords worth paid ads (thresholds: position ≤3, impressions ≥100, clicks ≥5, 90 days) + inline draft ad → ads-overlap.json
- anomaly-check.mjs — traffic anomaly detection → anomalies.json; gsc-history.jsonl is the time series
- title-bot.mjs — meta-title improvement suggestions → title-suggestions.json
- crawl-check.mjs — crawl/indexation checks
- whatsapp-digest.mjs — client-facing WhatsApp summary message generator
- batch-generate-verticals.mjs — landing-page generation for 60 niches (checkpointed, resumable)

## GEO Bot pipeline
- /geo LP, /geo/scan (public scan form, SSRF-protected API at /api/geo/scan), /geo/dashboard (internal), /geo/action/[actionId] (client-facing action pages).
- Content actions generated from GSC data with vocabulary grounding (page-lexicon) and cannibalization checks.

## Site Bot (in progress)
- 15-turn onboarding chat defined in TWO places that must stay in sync: src/app/api/bot/route.ts (TURN_QUESTIONS) and src/lib/bot/prompts.ts (system prompt T-sequence).
- renderStaticHtml outputs 1 page today; MVP target is 5 linked pages deployed to {slug}.wao.co.il via Cloudflare Pages (deploy script exists).

## G-Ads automation assets already made
- Static LP infrastructure: /lp/[slug] dynamic route + batch vertical generation (60 niches), templates with Hebrew copy authored by the copywriting pipeline.
- Ads Overlap tool (above) supplies keyword candidates + draft ads.
- Google Ads API compliance application in progress; no write access yet.

## Hard rules for any code drafting
- Hebrew is NEVER drafted locally — cloud (Claude) tier only. Local drafts use English placeholders.
- src/data/knowledge.ts, SEO titles/H1/keyword anchors: cloud tier only.
- next.config.ts changes require dev-server restart; corrupt .next cache after hard kill causes route 404s (fix: delete .next, restart).
- Compilation/lint/typecheck are shell tasks (tsc, next build, eslint), never LLM tasks.
