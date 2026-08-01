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
  flow (`src/lib/bot/prompts.ts` T21/T21c), but unused by both the LP renderer
  (`src/app/(standalone)/lp/[slug]/page.tsx:56-57` hardcodes generic `VERTICAL_ASSETS` stock —
  never the client's own upload) and by `create-campaign/route.ts` (no image-asset code exists
  at all). **Correction to prior note:** Google Ads Search image assets require **1:1 only**;
  **1.91:1 is optional-but-recommended**; there is **no 4:5 requirement for Search** (4:5 is a
  PMax/Demand-Gen ratio, not applicable here) — verified against Google's own image-asset help
  doc, Aug 2026 (`support.google.com/google-ads/answer/9566341`). Minimum recommended count is
  **4 unique images**, up to 20; minimum resolution 300×300 (square) / 600×314 (landscape).
  Full recommendation below.

  **Recommendation — request real photos, keep it a phone-snapshot standard, extend (don't
  replace) the existing adaptive prompt, and add a small server-side crop step:**
  1. **Yes, request them** for local trade/field-service verticals specifically (WAO's core
     segment) — authentic "this is a real local provider" imagery is a direct answer to the
     trust objection paid search traffic carries, and it's cheap to ask for since the upload UI
     already exists. Shot types, in priority order, phone-snapshot quality (no photoshoot):
     (a) **owner/technician at work** — mid-task, tools visible — highest single trust cue;
     (b) **branded vehicle/van** (signage, logo, uniform) — the strongest "local, real,
     accountable" cue for trades, and because people shoot vehicles/storefronts holding the
     phone horizontally, this shot is naturally landscape-oriented, which is exactly the ratio
     the pipeline is short on (see below);
     (c) **before/after** — already asked at T21 for field/visual verticals, keep;
     (d) **owner headshot** — already asked at T21c, correctly skipped for
     personal-brand-irrelevant trades (locksmith, plumber, exterminator per prompts.ts:205).
  2. **Count differs by use case, but one small ask covers both.** LP hero only needs 1 (the
     renderer picks a single image). Ads image assets want 4+ for full serving eligibility. Ask
     for **3 photos total** (at-work, van/storefront, one more of before-after/team) — enough to
     mix-and-match crops into both the required square and optional landscape ratio without
     demanding a curated library. Flag explicitly: most phone photos of a *person* come out
     portrait (3:4/9:16), which crops acceptably to 1:1 (center-weighted, subject usually
     fills frame) but crops badly to 1.91:1 landscape (subject gets cut or shrunk to a sliver).
     The vehicle/storefront shot is the one likely to already be landscape and should be the
     primary 1.91:1 source — this is why shot type (b) matters, not just count.
  3. **Where to ask:** do not add a new required intake step (friction cost per VISION.md) and
     do not make it universal. The existing T21/T21c vertical-gating logic already does the
     right thing in principle (skips personal-brand asks for locksmith/plumber/exterminator,
     asks before/after only for field/visual verticals) — **extend that same gating** to add an
     explicit "van/storefront" sub-prompt at T21 for `urgent`/`field` trade verticals, since
     that shot is currently not asked for at all (T21 today only prompts for review screenshots
     or before/after, never the vehicle/branded shot) even though it's arguably the single
     highest-trust image for that segment. This is a copywriter (Tamar) prompt-wording change
     to `src/lib/bot/prompts.ts`, gated by language-qa, applied by nextjs-engineer — not a new
     architecture.
  4. **Fallback:** keep defaulting to generic vertical stock when zero usable photos are
     provided — it's the correct non-blocking default and LPs must never stall on a missing
     asset. But flag it as a real (not hypothetical) trust gap for this specific segment:
     generic stock directly undercuts the "authentic local provider" angle the whole funnel is
     built on. Recommend instrumenting a simple fallback-rate metric (% of live LPs still on
     generic stock vs. a real client photo) before investing further — if the expanded T21 ask
     converts well, the crop pipeline is worth building next; if most clients skip anyway, it's
     lower priority than Tier 1 items.

  **Net new engineering scope (beyond what Tier 2 already listed):** (i) wire
  `trustAssetUrls[0]`/`profilePhotoUrl` into the LP hero instead of always falling through to
  `VERTICAL_ASSETS` stock, with stock as the fallback only; (ii) a server-side crop/pad step
  for the Ads API `ImageAsset` upload — center-crop to 1:1 is safe for portrait photos of a
  person, but do not attempt to force-crop portrait photos to 1.91:1 (produces unusable
  landscape crops) — only submit 1.91:1 from images that are already landscape-shaped; (iii)
  the T21 prompt-wording addition described above.
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
