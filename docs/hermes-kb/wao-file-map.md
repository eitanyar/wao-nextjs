# WAO File Map — for Hermes (ChatGPT agentic harness)

Read this once when starting a session. It tells you which file backs each status claim in
`docs/wao-project-status-2026-07-04.md` and `docs/hermes-kb/wao-status.md`, so you check the file
instead of guessing or re-deriving it from scratch. Paths are relative to repo root `/home/eitanya/wao/`.

## Course pipeline
- **Lesson scripts (Marp markdown)**: search for course lesson `.md` files — content lives in
  presenter-note format (narration inside Marp speaker notes, not separate slides). If you can't
  find them by path, grep for `## Slide` headers.
- **TTS/render state**: no video pipeline files exist yet as of last status — "0 in TTS, 0 rendered"
  means don't look for MP4s or ElevenLabs output, there are none.
- **Gate 0 sign-off (Yonatan/SEO currency check)**: not a file — a verbal/chat sign-off recorded only
  in status docs. If a module says "Gate 0 not cleared," treat TTS as blocked regardless of script state.

## GEO Bot
- **Pipeline scripts**: `scripts/gsc-pareto.mjs` (query/page analysis → `pareto.json`),
  `scripts/geo-generate-content.mjs`, `scripts/geo-verify.mjs` (their existence = "pipeline built").
- **Client output**: `data/clients/{id}/pareto.json` and related JSON — per-client, not shared.
- **LP + dashboard**: `/geo` (public LP), `/geo/scan` + `/api/geo/scan` (public scan form),
  `/geo/dashboard` (internal), `/geo/action/[actionId]` (client-facing action pages).
- **"Actions not yet sent to retter"**: this is a WoZ (manual, human) step Eitan does himself via
  WhatsApp — there is no send-automation script. Don't search for one.
- **GSC OAuth**: check for `src/app/api/gsc/auth` and `src/app/api/gsc/callback` — if absent, GSC
  auth is still manual per-client setup, not self-serve.

## Site Bot
- **Onboarding chat**: TWO files that must stay in sync — `src/app/api/bot/route.ts`
  (`TURN_QUESTIONS` array, simulation path) and `src/lib/bot/prompts.ts` (`ADAM_SYSTEM_PROMPT`
  T-sequence, live path). If one changed and not the other, that's a bug, not intended drift.
- **Static site render**: look for `renderStaticHtml` (function name to grep) — as of last status
  it outputs 1 page; MVP target is 5 pages. Check the actual page count in code, not the status doc,
  since this is the most actively-changing part of the codebase.
- **CF deploy**: `scripts/test-cf-deploy.mjs`.

## Ads Bot / Ads Overlap Bot
- **Ads Overlap tool** (already shipped, distinct from full Ads Bot): `scripts/ads-overlap.mjs` →
  `data/clients/{id}/ads-overlap.json`. This one already exists and produces draft ads — don't
  confuse it with the ₪249/mo Ads Bot, which is a separate, larger, not-yet-built product gated on
  the Google Ads API compliance approval AND the Retter GEO cycle closing.
- **Ads Bot LP**: `/ads-bot` route — check if it exists; status says "drafted but held."
- No `ads-pull-report`, `ads-recommend`, `ads-execute` scripts exist yet — don't search for them.

## GMB Bot
- Nothing built yet. Gated entirely on GBP API approval (external, Google's clock, not WAO's).
  If asked to build this, first check whether the API approval has actually landed — don't assume.

## Content Bot / Lead Bot
- Not started, not scoped. No files to find.

## Client data & auth (always real, always check live)
- `data/clients/{id}/client.json` — per-client config: site URL, niche, USP, contact, PIN,
  `entitlements[]` array. **Entitlements gate which dashboard tools a client sees** — if a tool
  isn't showing for a client, check their entitlements array before assuming a bug.
- `src/proxy.ts` — Next.js middleware, route protection for `/client`, `/admin/clients`,
  `/geo/action`, `/geo/dashboard`.
- Client login: `/client/login` (PIN → HMAC cookie → `/client/dashboard`).
  Admin: `/admin/login` → dropdown to enter any client's portal without their PIN.

## Sacred / hard-gated files — do not touch without escalation
- `src/data/knowledge.ts` — ~97 knowledge articles. **Never edit directly.** Only surgical Python
  `str.replace()` with asserted match counts, applied by the cloud tier (Claude), never by a local
  or lower-tier model.
- SEO keyword anchors (`<title>`, `<h1>`, hero badge terms) — cloud-tier sign-off only.
- Hebrew content of any kind — never draft locally; use `HEBREW_PLACEHOLDER: <description>` and
  escalate.

## Where "current" facts actually live (don't rely on training data or stale docs)
- `docs/hermes-kb/wao-status.md` — most current status snapshot (superset of the project-status doc).
- `docs/hermes-kb/wao-tech-inventory.md` — live architecture inventory, same date.
- `docs/hermes-kb/wao-compass.md` — Q1 gates + external clocks + distribution strategy (the
  "why" behind priorities, not file locations).
- `docs/wao-3month-foresight-2026-07-06.md` / `docs/wao-1year-foresight-2026-07-06.md` — strategic
  planning docs (Lior), not technical state — don't treat their scenario language as committed fact.
- `CLAUDE.md` / `AGENTS.md` at repo root — hard constraints and the agent roster; read before any
  multi-file task.

## General rule
If a status doc references a script, route, or file and you can't find it, **say so and ask**
rather than assuming it exists or inventing a plausible-looking substitute path.
