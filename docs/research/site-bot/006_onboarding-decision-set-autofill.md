# 006 — Site Bot Onboarding: Decision-Set & Autofill Audit

- Task: 2026-08-24_006 (read-only research; report is the only artifact)
- Scope: `src/app/(app)/site-bot/start/page.tsx` (the full onboarding chat), `src/app/api/site-bot/generate/route.ts` (field consumption), `src/lib/gbp/*` + `src/app/api/gbp/*` + `src/app/api/gmb/pull/route.ts` (GBP data availability)
- Hebrew-safety: all Hebrew UI strings are referenced by `file:line` only; zero Hebrew bytes in this report.
- Escalation: None — read-only analysis.

---

## 1. Flow architecture (what the onboarding actually is)

The entire Site Bot onboarding is a single self-contained client component:
`src/app/(app)/site-bot/start/page.tsx`. There are no sub-step components — the
`STEPS` array defined inline at `start/page.tsx:66-165` is the complete decision
set. Mechanics:

- One question per screen; single shared text input (`start/page.tsx:331-346`).
- Sequential advance with skip support: `start/page.tsx:225-226` (steps whose
  `skip()` returns true are bypassed).
- Anti-generic one-shot probes: if a step defines `detectGeneric` and the answer
  looks generic, one follow-up probe fires, at most once per field
  (`start/page.tsx:210-217`; combine logic `start/page.tsx:219`). Probes are
  re-asks of the SAME decision, not new decisions.
- Progress bar counts visible steps (`start/page.tsx:243-245, 264`).
- On completion the collected object POSTs to `/api/site-bot/checkout/init`
  (`start/page.tsx:185-200`), which requires only `businessNiche`
  (`checkout/init/route.ts:21-23`), persists the data
  (`checkout/init/route.ts:26-31`) and opens the payment session
  (`checkout/init/route.ts:34-40`). Payment card fields live on the pay page
  (`src/app/(product)/site-bot/pay/[sessionId]/page.tsx:52-55`) — post-chat
  billing, not onboarding decisions.
- Generation consumes the persisted object in
  `src/app/api/site-bot/generate/route.ts`: hard requirement is `businessNiche`
  only (`generate/route.ts:120-122`); everything else is optional.

Note: the marketing FAQ claims the owner answers "15 questions"
(`src/app/(app)/site-bot/page.tsx:37`), but the actual `STEPS` count is 14.

## 2. Decision-set catalog (in rendered order)

All steps in `src/app/(app)/site-bot/start/page.tsx`. "Sets" = `CollectedData`
fields written by the step's `apply` (schema: `src/lib/bot/prompts.ts:6-92`).

| # | key | step def | question line | Sets | Conditional / probe notes |
|---|-----|----------|---------------|------|---------------------------|
| 1 | businessName | :67-71 | :69 | businessName | — |
| 2 | businessNiche | :72-76 | :74 | businessNiche, primaryService | — |
| 3 | serviceModel | :77-89 | :79 | serviceModel | free text → enum via regex classifier :80-88 |
| 4 | streetAddress | :90-95 | :92 | streetAddress | SKIPPED unless serviceModel is location/mixed (:93) |
| 5 | targetLocation | :96-100 | :98 | targetLocation, specificCities | — |
| 6 | ownerName | :101-105 | :103 | ownerName | — |
| 7 | usp | :106-114 | :108 | usp | anti-generic probe :110-113 |
| 8 | idealClientFear | :115-123 | :117 | idealClientFear | anti-generic probe :119-122 |
| 9 | yearsAndGuarantee | :124-128 | :126 | yearsInField, guarantee | one question, two fields |
| 10 | services | :129-133 | :131 | secondaryServices | — |
| 11 | reviewQuote | :134-146 | :136 | reviewQuote, starRating (parsed :139-140) | honest "none" path skips field (:138); probe :142-145 |
| 12 | contact | :147-154 | :149 | contactMethod, phone, whatsappNumber (:150-153) | one question, three fields |
| 13 | businessHours | :155-159 | :157 | businessHours | "no fixed hours" answer skips field (:158) |
| 14 | preferredSlug | :160-164 | :162 | preferredSlug | built-in skip word drops the field (:163) |

**Total: 14 questions.** Step 4 is skipped for field/remote service models, so
an owner sees 13 or 14 screens; up to 3 one-shot probes (steps 7, 8, 11) can add
a follow-up without adding a decision.

### Consumed-but-never-asked fields (not onboarding decisions)

`buildLpCopyPrompt` interpolates several `CollectedData` fields the Site Bot
chat never collects: license (`src/lib/lp/lpCopyPrompt.ts:175`), faqQuestions
(:177), urgencyLevel (:178), responseTime (:179), revenueModel (:180),
pricingNotes (:181), exclusions (:182), capacityUnit (:185). These arrive only
from the Ads Bot onboarding path; in Site Bot they render empty/default
(e.g. `generate/route.ts:103`). vatStatus and license were deliberately dropped
from the paid path (`start/page.tsx:12-13`); vatStatus is merely timestamped if
present (`generate/route.ts:194-196`). None of these count toward the decision
set.

## 3. Classification per input

Classes per spec: (a) auto-fillable from a GBP/Places lookup keyed on business
name + phone; (b) safe smart-default the owner can edit later; (c) genuinely
must-ask.

| # | key | Class | One-line reason |
|---|-----|-------|-----------------|
| 1 | businessName | (a) | Doubles as the lookup key — owner types it once to find the profile, then confirms the canonical name from the matched listing instead of composing it. |
| 2 | businessNiche | (a) | GBP `categories` is already in the location read mask (`src/lib/gbp/client.ts:89`) — map category to niche, owner confirms. |
| 3 | serviceModel | (b) | Inferable from the GBP category (plumber→field, clinic→location); a regex classifier already exists (`start/page.tsx:80-88`) — default it, let the owner correct. |
| 4 | streetAddress | (a) | GBP `storefrontAddress` is already in the read mask (`client.ts:89`); feeds LocalBusiness schema (`src/lib/lp/renderSitePages.ts:131-134`). |
| 5 | targetLocation | (b) | GBP gives the home-base city from the address, but the full service-area city list is owner knowledge — default from address city, owner edits; feeds core-30 cities (`src/lib/lp/coreThirty.ts:94`). |
| 6 | ownerName | (c) | The owner's personal first name is not in GBP location data; the about blurb is built on it (`lpCopyPrompt.ts:51, 144`). One word, but irreducible. |
| 7 | usp | (c) | Differentiation exists only in the owner's head; the anti-generic probe machinery (`start/page.tsx:45-50, 110-113`) exists precisely because this cannot be templated or looked up. |
| 8 | idealClientFear | (c) | Customer-psychology insight; a lookup or per-niche default would manufacture exactly the generic copy the probe system fights (`start/page.tsx:52-57`). |
| 9 | yearsAndGuarantee | (c) | Tenure and guarantee terms are the owner's own facts/promises; GBP carries neither reliably. |
| 10 | services | (b) | Seed the list from GBP categories + confirmed niche; owner edits. Core-30 requires an explicit service list (`coreThirty.ts:88-92`), so a confirmed default is enough. |
| 11 | reviewQuote | (a) | `listReviews` already fetches review text + star ratings (`client.ts:93-95`) — surface the best real review, owner picks/confirms; keeps the honest "none" exit. |
| 12 | contact | (a) | The number comes from GBP `phoneNumbers` (`client.ts:89`); the channel preference (phone/WhatsApp/both) is a trivial sub-decision safely defaulted to "both" (`start/page.tsx:150-153` already writes both fields from one number). |
| 13 | businessHours | (a)* | The GBP Business Information API exposes `regularHours`, but the current read mask (`client.ts:89`) omits it — same `getLocation` call, mask needs one added field. |
| 14 | preferredSlug | (b) | Already optional today: skip word (`start/page.tsx:163`) and deterministic slug generation both exist (`generate/route.ts:59-70, 124-127`). Pure default, zero decisions. |

## 4. GBP data availability — what we can pull TODAY vs. new work

### Already available behind the existing integration

All gated by `isGbpLive()` = credentials AND `GBP_INTEGRATION_ENABLED=true`
(`client.ts:35-52`):

- `getLocation` (`client.ts:88-91`) read mask at `client.ts:89` returns:
  `name, title, phoneNumbers, storefrontAddress, categories, websiteUri`.
  Covers: businessName, businessNiche (via categories), streetAddress,
  contact phone. `websiteUri` is available but has no corresponding Site Bot
  input today.
- `listReviews` (`client.ts:93-95`) returns review text and star ratings.
  Covers: reviewQuote + starRating.
- `listAccounts` (`client.ts:84-86`) exists for account enumeration.

### Requires new work

- **businessHours**: add `regularHours` (optionally `specialHours`) to the read
  mask at `client.ts:89` — no new endpoint, one-line mask change.
- **photos**: no media API is wrapped anywhere; the client wraps only Account
  Management, Business Information, and legacy v4 reviews/posts
  (`client.ts:19-24`). Photos need a new media endpoint or the Places API.
- **Account/location resolution for self-serve prospects**: today GBP ids come
  from `client.json` per existing client (`src/app/api/gbp/review-reply/route.ts:60`);
  the pull route explicitly flags that accountId resolution is not built
  (`src/app/api/gmb/pull/route.ts:60-64`). A prospect walking into Site Bot has
  no `gbpAccountId`/`gbpLocationId` on file — a claim/verify + account-match
  step would be required to use this path.
- **Unclaimed-profile lookup (the big gap)**: there is NO Places API
  integration in the repo (zero matches for `places.googleapis`, `PLACES_API`,
  `placesApi` across `src/`). The current GBP path only works for owners whose
  listing is already claimed/verified AND OAuth-connected to WAO. A public
  Places lookup keyed on name + phone (working for any publicly listed
  business, no OAuth, no claim required) would be a brand-new integration —
  and it is the only variant that serves the typical unverified Site Bot
  prospect without a Google OAuth detour mid-onboarding.

## 5. Decision-reduction summary

- **Current inputs: 14** sequential questions (13 rendered for field/remote
  owners; +up to 3 one-shot anti-generic probes, which are re-asks, not new
  decisions).
- **Class (a) auto-fillable: 6** — businessName, businessNiche, streetAddress,
  reviewQuote, contact, businessHours (last one pending the read-mask addition,
  `client.ts:89`).
- **Class (b) smart-defaultable: 4** — serviceModel, targetLocation, services,
  preferredSlug.
- **Class (c) must-ask: 4** — ownerName, usp, idealClientFear,
  yearsAndGuarantee.
- **Irreducible decision count: 4.** If every class-(a) field is auto-filled
  (owner confirms a pre-populated card) and every class-(b) field ships as an
  editable default, the onboarding floor is four owner-composed answers — the
  differentiation/psychology facts no lookup can supply — plus the lookup keys
  (business name, phone) which double as the answers themselves and therefore
  add no net-new decisions.
- **Headline reduction: 14 → 4 composed decisions (~71% fewer decisions);**
  the other 10 become confirm/adjust interactions on prefilled data.

### Caveats on the floor

1. The (a) class via the CURRENT GBP integration presupposes a claimed,
   verified, OAuth-connected profile; for unclaimed prospects only a new
   Places-API lookup (not yet in the codebase) delivers the same autofill.
2. businessHours autofill needs the `regularHours` read-mask addition
   (`client.ts:89`) — trivial, but not in place today.
3. The anti-generic probes on usp/idealClientFear/reviewQuote
   (`start/page.tsx:210-217`) must survive any autofill redesign — they are the
   guard against the generic-first-site failure mode and apply to the
   irreducible four exactly.

---

Verification gate: read-only task — `npm run build` N/A, `npm run test` N/A.
`git status --porcelain` shows exactly one new untracked file (this report).
