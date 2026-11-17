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

### LLM provider switches (one env line per workload)

Founder-seat decisions D3/D3b (2026-11-15): nothing in production calls the Qwen token plan, not even
when a workload's variable explicitly asks for it. Module: `src/lib/ai/llmProvider.ts` (scripts and crons use the
mirror `scripts/lib/llm-provider.mjs`). Values: `gemini` | `qwen-metered` | `qwen-token-plan`.

| Workload | Variable | Default | Callers |
|---|---|---|---|
| Chat bot | `LLM_PROVIDER_CHAT` | `gemini` | `src/app/api/bot/route.ts` |
| Panel copy rewrite | `LLM_PROVIDER_PANEL_REWRITE` | `gemini` | `src/lib/operators/hebrew-rewriter.ts` |
| GBP review replies | `LLM_PROVIDER_GBP_REPLY` | `gemini` | `src/lib/gbp/reviewResponder.ts` (`createGbpReplyDrafter`) |
| GEO (critic + generator fallback) | `LLM_PROVIDER_GEO` | `gemini` (no Qwen fallback) | `src/lib/geo/critic.ts`, `scripts/geo-generate-content.mjs`, `scripts/cron/regenerate-geo.sh` |
| Site Bot staff draft replies (support queue) | `LLM_PROVIDER_SUPPORT_REPLY` | `gemini` | `src/lib/site-bot/supportDraft.ts` |
| Site Bot site copy | `LLM_PROVIDER_SITE_COPY` | `gemini` (D3b blind test, 2026-11-15) | `src/lib/lp/researchPageCopy.ts`, `src/lib/lp/coreThirtyCopy.ts`, `scripts/lib/fact-extractor.mjs` |

Provider credentials:

| Provider | Variables |
|---|---|
| `gemini` | `GEMINI_API_KEY`, optional `GEMINI_MODEL_NAME` |
| `qwen-metered` | `QWEN_METERED_API_KEY`, `QWEN_METERED_BASE_URL` (DashScope pay-as-you-go, OpenAI-compatible, expected form `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`; no default, unset = unavailable) |
| `qwen-token-plan` | `QWEN_API_KEY`, `QWEN_BASE_URL` (interactive tools such as `scripts/waocopy.mjs` keep using these directly) |

Production guard (`NODE_ENV=production`), for every workload:
- A variable set to `qwen-token-plan` is served by `gemini`, with one console warning per workload per process.
  `qwen-metered` stays allowed.
- Any Qwen call whose base-URL host contains `token-plan` throws `TokenPlanRefusedError` (logged once per
  workload), so a `qwen-metered` switch pointed at the token-plan URL is refused too.

`qwen-token-plan` therefore works only locally (staff tools such as `scripts/waocopy.mjs` and
`scripts/site-bot-research-to-site.mjs`, which needs `LLM_PROVIDER_SITE_COPY=qwen-token-plan`). The chat bot falls
back to Gemini when its Qwen endpoint is missing or refused. `scripts/cron/qwen-health-check.sh` probes only the
Qwen endpoints the switches select, logs `outcome=SKIPPED` when every workload is on Gemini, and raises a
`REFUSED` alert for any workload still set to `qwen-token-plan` in production.

### Site Bot paid-journey rehearsals

`scripts/site-bot-rehearsal-dev.sh [port] [dist-dir] [data-dir]` starts an isolated dev server with the
paid flow open (`SITE_BOT_PAID_FLOW=1`, non-production only), zero-network research fixtures
(`SITE_BOT_RESEARCH_PROVIDERS=fixture`), mock payments, blanked side-effect credentials, the Qwen trap
unset, and `WAO_CLIENTS_DIR` / `WAO_SITES_DIR` / `WAO_SITE_RESEARCH_DIR` pointed outside `data/`
(defaults stay `data/clients`, `data/sites`, `data/site-research`).

### Site Bot client message box (support queue)

Paying Site Bot clients write one message from the account page; staff work it at `/admin/site-bot-help`
and answer by email (spec: `docs/specs/site-bot-support-message-box-fable52-2026-11-13.md`). Messages live in
the billing SQLite DB (`BILLING_DB_PATH`), table `site_bot_client_messages`.

| Variable | Meaning |
|---|---|
| `SITE_BOT_CLIENT_MESSAGES_ENABLED` | `'true'` turns on the box, the endpoints, the cancel hook and the daily reminder. Anything else: box hidden, endpoints 503. |
| `SITE_BOT_SUPPORT_ALERT_EMAIL` | Where staff alerts and the daily reminder go: `eitan@wao.co.il` (founder decision, 2026-11-13). Falls back to `BILLING_ADMIN_ALERT_EMAIL`, then the code default `eitan@wao.co.il`. |
| `SITE_BOT_SUPPORT_FROM_EMAIL` | Sender and reply-to of the client confirmation (and the address in terms §16): `eitan@wao.co.il` (founder decision, 2026-11-13; code default `SITE_BOT_SUPPORT_ADDRESS`). Must stay a real, monitored mailbox on the Resend-verified `wao.co.il` domain. |
| `SITE_BOT_EMAIL_OUTBOX_PATH` | Optional absolute path for the dev outbox used when `RESEND_API_KEY` is unset (default `data/payments/email-outbox.jsonl`). |

The box also stays hidden while `SITE_BOT_CLIENT_MESSAGE_COPY_PENDING` is true in
`src/lib/site-bot/clientMessageCopy.ts` (Hebrew copy from Tamar -> Noa, applied by byte-exact patch; approved and
applied 2026-11-13, so the flag is false).

Production `.env.production` lines:

    SITE_BOT_SUPPORT_FROM_EMAIL=eitan@wao.co.il
    SITE_BOT_SUPPORT_ALERT_EMAIL=eitan@wao.co.il

`SITE_BOT_CLIENT_MESSAGES_ENABLED=true` is added only once terms §16 is patched (the box must not go live while §16
still describes the old support channel).

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

### Adding a showcase business (homepage hero loop)

The homepage hero window plays one or more showcase businesses: three taps in the intake chat, the Google results
page with its ad, then its landing page. Entries are data in `src/content/hero-showcases.json`, typed and validated by
`src/lib/home/heroShowcases.ts` (the build fails on an invalid entry). With one entry the hero plays once and rests;
with two or more it loops (rest 4 s, cross-fade, next), pausing out of view or in a hidden tab.

1. **Consent recorded.** A real client needs written consent to be shown; record where it is
   (`consent: { "type": "client", "reference": "<where the consent lives>" }`). Fictional entries use `"fictional"`.
2. **Site live on our Worker.** The landing page must be live at `https://<slug>.wao.co.il/...` on the wao-sites
   Worker (`landingPage: { "source": "live-url", "url": ... }`). It is fetched once at build time; any other host is
   rejected. Every page passes the same guards as the stored one: noindex, no scripts / canonical / OG, phone digits
   and `tel:` stripped, cut above the contact form (header, hero and the product's sections below it stay), and the
   build fails if a rating, review markup, phone digits, a test/demo domain or an image not flagged by the entry
   reaches the window.
   **No AI-made owner photo** (Fable 5.2, 2026-11-16): without a photo the hero text takes the full width. A real
   owner photo (`ownerPhoto: { avif, webp, width, height, "aiGenerated": false }`) needs a consented client entry; an
   AI-flagged or unflagged photo fails the build, and the window guard rejects known AI photo files.
   **Hero photo + logo of a stored record** (Eitan 2026-11-17): the product's own look (approved hero photo backdrop and
   generated logo), applied with the staff CLI into the tracked look dir `data/video/demo/site-proof/<slug>/`:
   `WAO_SITE_PROOF_DIR=data/video/demo/site-proof node scripts/site-bot-look.mjs --slug demo-plumber --by <name>
   --site-record data/video/demo/stand-in/site-record.json --add-photo <file> --approve-hero <photos/...> [--approve-logo icon]`.
   The entry must flag the photo: `heroPhoto: { "kind": "atmosphere", "aiGenerated": true|false, "people": false,
   "work": false, "approval": "<who, when>" }` (an AI atmosphere photo only: no people, no job shown). An approved photo
   without the flag, a flag without a photo, or any other AI flag fails the build. Images are served from
   `/hero-window/img/<file>`. The window drops the record's rating (no rating, review count or result is shown).
   After a photo or logo change, re-measure (step 4).
3. **Strings from waocopy, never typed.** Needed per entry: `answers.trade`, `answers.area`, `answers.service` (the
   tapped chips; add `chips` lists if the global ones do not hold them), `ad.headlines` (3, <= 30 chars),
   `ad.description` (<= 90 chars), `ad.displayHost`, `tabTitle` (live-url). The results-page query is built as
   service + " " + area. Apply them into the JSON by script, byte-exact. **Before the second entry ships:**
   `pause_label` and `play_label` in `src/content/hero-motion-strings-2026-11-15.json` (validation enforces this), and a
   `sr_description` that fits every entry (today's one describes the plumber).
4. **Add the entry**, then measure its geometry with the app running:
   `node scripts/measure-hero-showcase.mjs http://127.0.0.1:<port> <id>` and paste the printed `geometry`.
   Regenerate the CSS (per-entry pointer paths): `node scripts/build-hero-motion-css.mjs`.
5. **Run** `npm run test` and `npm run build -- --webpack`.
6. **Roni check:** record the loop at 1440 and 390 (pointer never over text, headlines held, no rating / phone /
   demo text in the window, CLS 0, LCP still the H1, pause/play and Esc work, reduced motion = first entry at rest).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
