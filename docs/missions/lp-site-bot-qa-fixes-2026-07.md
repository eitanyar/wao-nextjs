# Mission: LP / Site Bot — QA Fixes from Dry Test (test-plumber-tlv)
*Owner: Lior (Strategist) → Eitan-Dev (Engineer) | Filed: 23.7.2026*

## Context
Dry test of `/lp/test-plumber-tlv` (generated via `scripts/test-site-bot.mjs` →
`/api/site-bot/generate` → same rendering path as every real client LP —
**this is the production pipeline, not a sample/demo theme**) surfaced 3 bugs
and 1 piece of dead code. Root-caused against source, not just the rendered
page. Confirmed non-fluke by cross-checking other generated fixtures in
`data/lps/`.

No production code has been touched. This is a spec for `waoengineer` to
implement; Strategist does not edit `knowledge.ts` or write final code.

---

## BUG 1 — Internal capacity data leaking into public "scarcity" copy
**Priority: HIGH — data leak, client-facing**

**Where:**
- `src/lib/lp/lpCopyPrompt.ts:96` — `Capacity Unit: ${data.capacityUnit}` is
  handed to Tamar with no usage restriction.
- Rendered live at `src/components/lp/LandingPage.tsx:76-79`
  (`copy.scarcityLine`).

**Evidence:**
`data/lps/test-plumber-tlv.json` — `capacityUnit: "10 פניות בשבוע"` (an
internal ops-load answer collected at bot Turn 23 for campaign
budget-pacing purposes only) was written verbatim into
`scarcityLine: "זמין לעד 10 פניות חדשות בשבוע"` and shown publicly under the
hero. A client's real customers should never see "we can only handle 10
requests before we're overloaded."

**Existing intent, never enforced downstream:**
- `src/lib/bot/prompts.ts:212` — "X תאריכים פנויים = scarcity trigger for LP
  (photographers, event services)" implies scarcityLine is meant to be
  vertical-gated and phrased as *availability*, not raw ops capacity.
- `docs/missions/lp-generation.md:116` — "scarcityLine — from capacityUnit
  if event-based, else null" states the same rule; it was never wired into
  `lpCopyPrompt.ts`.

**Fix logic (not a one-line patch — apply to both real and fallback paths):**
1. Pass the detected `VerticalKey` (or an explicit `allowScarcityLine:
   boolean` derived from it) into `buildLpCopyPrompt` / `buildSiteCopyPrompt`.
2. Instruct Tamar: output `scarcityLine: null` unless vertical is in an
   explicit allow-list (start with `events-creative`; consider
   `beauty-grooming` / `fitness-wellness` for booking-slot scarcity later).
3. Even when allowed, scarcityLine must be an *availability* phrase ("נותרו X
   תאריכים פנויים החודש") — never a literal echo of the ops-capacity answer
   ("יכול לקבל רק N פניות").
4. Apply the same gate to the non-LLM simulation fallbacks so the leak can't
   happen with `AZURE_OPENAI_KEY` unset:
   - `src/app/api/lp-generate/route.ts:96` (`generateFallbackCopy`)
   - `src/app/api/site-bot/generate/route.ts:97` (`generateFallbackCopy`)
5. Documentation note: rename or comment `capacityAvailable` /
   `capacityUnit` in `CollectedData` (`src/lib/bot/prompts.ts:58-59`) as
   "INTERNAL ONLY — do not surface verbatim in client-facing copy" so future
   fields aren't wired the same way by accident.

**Verification:** regenerate a fixture with `capacityUnit` set and confirm
`scarcityLine` is `null` for a non-allow-listed vertical (plumber), and — if
you implement the events-creative allow-list — confirm it produces an
availability-style phrase for a photographer fixture, not a raw capacity
number.

---

## BUG 2 — Phone CTA button mislabeled "שלח וואטסאפ" instead of "התקשר עכשיו"
**Priority: HIGH — conversion-damaging, duplicated in 3 files**

**Where (identical logic, 3 places):**
- `src/lib/lp/lpCopyPrompt.ts:39-43`
- `src/app/api/lp-generate/route.ts:73` (fallback)
- `src/app/api/site-bot/generate/route.ts:72` (fallback)

**Root cause:** `contactLabel` resolution checks
`contactMethod?.includes('וואטסאפ')` first, without checking whether phone is
*also* offered. When a client answers Turn 24 with "טלפון או וואטסאפ" — a
common real answer, not an edge case — the resulting label "שלח וואטסאפ" gets
applied as `copy.heroCta`, which is rendered on the **phone** button
(`LandingPage.tsx:65-67`, `📞 {copy.heroCta}`). The separate WhatsApp button
next to it already has its own hardcoded "💬 וואטסאפ" label
(`LandingPage.tsx:71`). Net effect: both buttons read "WhatsApp," one under a
phone icon — exactly what showed up on `/lp/test-plumber-tlv`.

**Confirmed reproducible pattern:** only fixtures where `contactMethod`
contains both terms trigger it (`test-plumber-tlv`). Single-channel fixtures
(`יוסי-שיפוצים`, `wao-client-4567` — both `"טלפון"` only) render correctly,
which is why this slipped through prior review.

**Fix logic — channel detection, not first-substring-wins:**
```
hasPhone    = method.includes('טלפון') || method.includes('להתקשר')
hasWhatsapp = method.includes('וואטסאפ')
hasForm     = method.includes('טופס')

heroCta =
  hasPhone    ? 'התקשר עכשיו' :
  hasWhatsapp ? 'שלח וואטסאפ' :
  hasForm     ? 'השאר פרטים'  :
                'התקשר עכשיו'   // default
```
Rule of thumb: whenever phone is one of the offered channels, the phone
button must say "call now" regardless of what else was offered — the
dedicated WhatsApp button already carries its own correct label
independently and doesn't need `heroCta` at all.

Apply identically in all 3 locations above so they don't re-diverge on the
next edit.

**Verification:** add/regenerate a fixture with
`contactMethod: "טלפון או וואטסאפ"` and confirm the phone button (📞 icon)
reads "התקשר עכשיו" while the WhatsApp button (💬 icon) independently reads
"וואטסאפ". Re-run against existing single-channel fixtures to confirm no
regression.

---

## BUG 3 — Hero image not relevant to vertical
**Priority: MEDIUM — trust/credibility, not functional**

**Where:** `src/lib/lp/verticalAssets.ts:35`,
`emergency-trades.heroImages[0]` (Unsplash photo
`1581578731548-c64695cc6952`).

**Finding:** visually inspected the actual image — it's a generic
handyman/exterior shot with no pipes, wrench, sink, or water context. For a
niche this specific (`אינסטלטור` = plumber), a non-specific trades photo
undercuts the "specialist who handles exactly this problem" trust signal the
copy is selling.

**Related dead code:** `LPPage`
(`src/app/(standalone)/lp/[slug]/page.tsx:57`) only ever reads
`heroImages[0]`. The 2nd/3rd curated images per vertical are never rendered
or rotated anywhere, despite the type comment in `verticalAssets.ts:10`
("3 options so the LP can rotate or A/B test"). Either wire up
selection/rotation logic or trim the manifest to 1 image per vertical — as
committed today it's misleading dead weight.

**Fix logic:**
1. Re-source `emergency-trades.heroImages[0]` with an unambiguous
   plumbing/pipe-repair/water-emergency image.
2. Spot-check the other 7 verticals' `[0]` entries the same way before next
   client onboarding — I visually confirmed `medical-aesthetics[0]` and
   `legal-financial[0]` are acceptable but did not clear all 24 images in
   the manifest; no captioning/relevance validation step currently exists
   in the pipeline for unattended Unsplash picks.
3. Decide and implement (or explicitly defer) whether `heroImages[1]` /
   `[2]` should ever be used — if deferred, note it in this doc so it isn't
   silently rediscovered as a "bug" later.

**Verification:** visual review of `/lp/test-plumber-tlv` hero after image
swap; no code logic change required beyond the URL(s) in the manifest.

---

## Scoping note — no other internal-field leaks found
Checked `LandingPage.tsx`, `renderStaticHtml.ts`, and `renderSitePages.ts`
for any other internal-only `CollectedData` fields (`avgJobValue`,
`closeRate`, `monthlyBudget`, `exclusions`) being surfaced client-side —
none are referenced. Capacity (Bug 1) was the only leak found in this pass.

---

## Suggested handoff order
1. **Bugs 1 + 2 together** — both live in the same 3 files / prompt
   construction layer (`lpCopyPrompt.ts` + the two `generateFallbackCopy`
   functions). Fix in one pass, verify against `scripts/test-site-bot.mjs`
   plus a second fixture with `contactMethod: "טלפון או וואטסאפ"`, then
   regenerate `test-plumber-tlv` to confirm both resolved.
2. **Bug 3** — independent, asset-manifest-only change. Can be done in
   parallel or after.

## Acceptance criteria (roll-up)
- [x] `scarcityLine` is `null` for non-allow-listed verticals regardless of
      `capacityUnit` value, in both LLM and fallback paths. **PASS, but by a
      different mechanism than specified** — see re-audit note below.
- [x] `capacityUnit`/`capacityAvailable` never appear verbatim in any
      client-facing copy field. **PASS** — closed for the `copy` object
      (BUG 1) and now also for the full `CollectedData` object shipped via
      client-component props (BUG 4, fixed 2026-07-24). See BUG 4 fix note
      below.
- [x] Phone CTA reads "התקשר עכשיו" whenever phone is an offered contact
      channel, independent of whether WhatsApp is also offered. **PASS** —
      verified live on regenerated `test-plumber-tlv`
      (`contactMethod: "טלפון או וואטסאפ"`): phone button renders
      "📞 התקשר עכשיו".
- [x] WhatsApp button retains its own correct "וואטסאפ" label in all cases
      (no regression). **PASS** — same page renders "💬 וואטסאפ"
      independently; all other fixtures (`יוסי-שיפוצים`, `wao-client-4567`,
      `test-plumber-roni`, etc.) still resolve correctly.
- [x] `emergency-trades` hero image is a recognizable plumbing/pipe visual.
      **PASS** — `heroImages[0]` is now
      `photo-1584622650111-993a426fbf0a`, alt "תיקון צנרת ונזילות מקצועי",
      confirmed live in the rendered page's background-image.
- [ ] Decision recorded (fix or explicit defer) on unused
      `heroImages[1]`/`[2]` rotation. **NOT DONE** — no rotation logic was
      added and no defer decision was written anywhere. Still open.

---

## Re-audit — 2026-07-24 (source + runtime verification of the fix above)

**Method:** read the 5 changed files against the checklist, restarted the dev
server (`.next` cache was corrupt from a prior hard kill — cleared and
restarted per the standard runbook), regenerated `test-plumber-tlv` via
`scripts/test-site-bot.mjs` (its fixture already carries
`contactMethod: "טלפון או וואטסאפ"`, so it doubles as the Bug 2 dual-channel
case), fetched the live rendered page, and diffed all 8 fixtures in
`data/lps/` for regression.

**Bug 1 — implemented differently than the spec, functionally closes the leak
it was scoped to, but doesn't do what it says:**
`buildLpCopyPrompt` / `buildSiteCopyPrompt` (`src/lib/lp/lpCopyPrompt.ts`)
were never given a `VerticalKey` or `allowScarcityLine` param — the fix step
this doc asked for (step 1) wasn't done. Instead, `scarcityLine` is hardcoded
to `"scarcityLine": null,` directly in the JSON output template
(`lpCopyPrompt.ts:124`), and the three fallback generators
(`lp-generate/route.ts:99`, `site-bot/generate/route.ts:100`, plus the LLM
path) all hardcode it to `null` unconditionally. The prompt's *rule text*
still tells the model "unless vertical is events-creative" — but the model
has no vertical information to act on, so that clause is dead instruction
text. Net effect: `scarcityLine` is `null` for every vertical, always — the
leak is closed, but the events-creative availability-phrase allow-list this
doc specified was never built. Not a regression risk, but worth a decision:
either implement the allow-list properly (pass `VerticalKey` in) or delete
the now-misleading "unless events-creative" language from the prompt.

**Bug 2 — fully fixed, verified live.** Confirmed above.

**Bug 3 — fixed and verified live.** Confirmed above.

**BUG 4 (new) — full `CollectedData` object, not just `scarcityLine`, ships
to the browser via client-component props.**
`LandingPage.tsx` is `'use client'` and receives `data={collectedData}`
(the *entire* raw `CollectedData` record) from the server component
`app/(standalone)/lp/[slug]/page.tsx:64` — but only reads 5 fields from it
(`phone`, `whatsappNumber`, `businessName`, `businessNiche`, `ownerName`;
grep confirms no other `data.*` reference in the file). Because it's a
client component, Next.js serializes the *whole* prop into the page's flight
data. Confirmed live: `curl http://localhost:3000/lp/test-plumber-tlv` —
`capacityUnit":"10 פניות בשבוע"` is present in the HTML source, fully
readable via view-source, alongside every other internal field this doc's
original "Scoping note" said was checked and clean (`avgJobValue`,
`closeRate`, `pricingNotes`, `exclusions`, etc. — all present in the same
payload). The original scoping note only checked whether these fields were
*rendered into visible JSX*, not whether the object passed to a client
component leaks wholesale into page source regardless of what's rendered.
This is a broader version of the same class of bug as Bug 1, on the same
severity tier (internal ops/pricing data exposed to anyone who views page
source), and needs its own fix: pass `LandingPage` only the 5 fields it
actually uses, not the full `CollectedData` object.

**Priority:** HIGH — same class as Bug 1 (client-facing data exposure), and
strictly broader in scope (every internal field, not just capacity).

---

## BUG 4 fix — 2026-07-24 (Eitan-Dev)

**Fix applied:**
- `src/components/lp/LandingPage.tsx` — replaced the `data: CollectedData`
  prop with a new narrow `LandingPagePublicData` interface (`phone`,
  `whatsappNumber`, `businessName`, `businessNiche`, `ownerName` — the only 5
  fields the component ever reads), with a comment explaining why nothing
  else may be added to it. Dropped the `CollectedData` import entirely.
- `src/app/(standalone)/lp/[slug]/page.tsx` — instead of passing
  `data={collectedData}` (the full record), the server component now builds
  a plain `publicData` object literal with just those 5 fields and passes
  that. `collectedData` itself is still used server-side for
  `detectVertical()` and `generateMetadata()`, which is safe (runs on the
  server, never serialized to the client).

**Also fixed in the same pass — BUG 1 cleanup (prompt dead text):**
`src/lib/lp/lpCopyPrompt.ts` — removed the dead "unless the vertical is
events-creative or explicitly about booking slots" carve-out from both the
prompt instruction text (was line 61) and the `LPCopy.scarcityLine`
doc-comment (was line 25). Both now state plainly that `scarcityLine` is
always `null` for now, matching what the code actually does. No
`VerticalKey`-gated allow-list was built (explicitly out of scope for this
pass).

**Verification:**
- Confirmed `.next` dev cache was healthy (`curl localhost:3000` → 200); no
  restart/cache-clear was needed this time.
- Regenerated `test-plumber-tlv` via `node scripts/test-site-bot.mjs`
  (site-bot pipeline — regenerates `data/lps/test-plumber-tlv.json` through
  the same `/api/site-bot/generate` → render path as the original repro).
- `curl http://localhost:3000/lp/test-plumber-tlv` and grepped the full HTML
  source for `capacityUnit`, `avgJobValue`, `closeRate`, `pricingNotes`,
  `exclusions` — **0 matches for all 5**, previously present per the re-audit
  evidence above.
- Confirmed the page still renders correctly: hero headline/subheadline
  present, `heroCta` "התקשר עכשיו", phone button `tel:050...`, WhatsApp
  button `wa.me/972501234567`, business name/owner-name-derived avatar
  initial all present in source — no visual/functional regression from
  narrowing the prop.
- `npx tsc --noEmit` — no errors on either changed file; confirmed no other
  caller of `LandingPage` exists in the codebase (grep) and no other
  `'use client'` component in `src/components/lp/` or
  `src/app/(standalone)/lp/` references `collectedData`.
- `copy.scarcityLine` confirmed still `null` in the regenerated fixture (no
  regression from the prompt-text cleanup, since the JSON template still
  hardcodes `null` unconditionally — only the instructional text changed).
