# Ads Bot — Search Campaign Asset Completeness

**Status:** Two items shipped 2026-08-01 (see below). Remaining items scoped, not built —
this is a spec for the next implementation pass against `src/app/api/google-ads/create-campaign/route.ts`.

Origin: Eitan asked how to get a new client's Search campaign close to 100/100 Ad Strength.
Dror (ppc-strategist) audited the gap; findings below are his, verified against Google's own
Ad Strength / assets docs (Aug 2026).

## Shipped 2026-08-01

1. **LP copy-generation pipeline fix** (`src/app/api/lp-generate/route.ts`) — was running on a
   dead Azure OpenAI key (`AZURE_OPENAI_KEY` unset in `.env`), silently falling back to
   template-string copy for every live LP. Confirmed via `data/lps/wao-client-1.json`, whose
   `heroHeadline` was the literal fallback template string, not AI copy. Migrated to Gemini,
   same fix pattern already applied to `site-bot/generate/route.ts` (fail-soft Noa QA pass,
   JSON-structural-quote guardrail).
2. **RSA headline/description count widened** (`src/lib/bot/prompts.ts`, `TAMAR_SYSTEM_PROMPT`)
   — prompt was instructing 3–5 headlines / 2–3 descriptions; Google's ceiling is 15/4, and
   `create-campaign/route.ts` was already sliced to `.slice(0, 15)` / `.slice(0, 4)` — the
   prompt was the only bottleneck. Also added an explicit "distinct angle per headline"
   instruction since Ad Strength penalizes low diversity, not just low count.

## Remaining — asset types not yet built (verified: zero sitelink/callout/structured-snippet/
call/image/message asset code exists anywhere in the repo; every other hit was UI copy)

Ranked by (impact on Ad Strength/performance) ÷ (engineering effort):

### Tier 1 — next up, no new intake needed
- **Call assets** — `CollectedData.phone` already collected. Highest-leverage single addition
  for phone-first leadgen. Needs: Google Ads API `CallAsset` creation + link to campaign/ad
  group, mirroring the pattern in `src/lib/google-ads/mutations.ts`.
- **Callout assets** — map `guarantee` / `yearsInField` / `license` / `starRating` /
  `responseTime` / `pricingNotes` → short (≤25 char) trust-signal phrases. Needs a small new
  Tamar prompt (route through Noa per CLAUDE.md's copy gate) + `CalloutAsset` API wiring.
- **Structured snippets** — map `secondaryServices` → Google's fixed header list (e.g.
  "Service catalog"). Needs `StructuredSnippetAsset` API wiring, values from existing data.

### Tier 2 — real payoff, needs a design decision first
- **Sitelinks (6+, explicitly named by Google as an Ad Strength factor)** — blocked on an
  architecture decision, not copy: Site Bot's LP is single-page, so sitelinks need stable
  in-page anchors (services/reviews/FAQ/contact) to link to. **Needs a decision with
  nextjs-engineer on what anchors the LP template exposes before Tamar can write sitelink
  label/description copy against them.**
- **Image assets** — `trustAssetUrls`/`profilePhotoUrl` already collected via the bot upload
  flow. Needs a crop/spec-compliance pipeline (Google requires 1:1, 1.91:1, 4:5 aspect ratios).
- **WhatsApp message assets** — `whatsappNumber` already collected, strong fit for Israeli
  buyers, but the asset type is in beta as of July 2026. Build the mapping now, gate rollout
  on GA availability.

### Tier 3 — defer
- **Lead form assets** — good fit only for `remote`/`deliberate` service models (coach,
  accountant), wrong fit for `urgent`/`field` niches (plumber) where call-intent should win.
  Check whether a privacy-policy-URL asset already exists via
  `docs/specs/client-site-privacy-accessibility-minimal.md` before treating as new work.
- **Business logo asset** — no `logoUrl` field exists. Not an Ad Strength factor for Search;
  becomes relevant only if/when Performance Max enters the roadmap.
- **Price assets** — poor fit for this segment (most quote per-job via free-text
  `pricingNotes`, not fixed pricing). Only worth it for niches with genuinely fixed unit
  pricing, and needs a new structured field, not `pricingNotes`.

**Skip entirely:** app assets (no apps), promotion assets (no promo mechanism in the current
model).

## Build order for the next pass
1. Call assets (data ready, simplest API wiring)
2. Callout assets (one new prompt + API wiring)
3. Structured snippets (one new mapping + API wiring)
4. Sitelink anchor architecture decision (nextjs-engineer) → sitelink copy + API wiring
5. Image crop/spec pipeline
6. WhatsApp message-asset mapping (gated on GA)
7. Lead form assets (situational, defer until 1–6 ship)
8. Logo intake + asset (defer until PMax is scoped)
9. Price assets (defer — poor segment fit as currently modeled)

Owner for all API-wiring items: nextjs-engineer. Owner for any new copy: copywriter, gated by
language-qa per CLAUDE.md.
