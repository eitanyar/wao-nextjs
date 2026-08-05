# Strategic Spec — Search-Term Cleanup Scoring Rubric (closes `search_term_cleanup` in `executor.ts`)

Author: Dror (PPC Strategist)
Owner for implementation: Eitan-Dev (Next.js Engineer)
Verification owner: Roni (Verifier)
Scope: **Search campaigns only.** PMax/Demand Gen search-term surfacing is explicitly out of
scope — flag as a separate future spec (different negative-keyword mechanism: campaign/account-level
brand exclusions, not `ad_group_criterion`, and PMax's own "search terms insights" report has
different reliability characteristics).
Status: Ready for implementation. **Blocked on client onboarding** — see §5.

---

## 0. What this replaces

`src/lib/google-ads/executor.ts`'s `search_term_cleanup` case currently hard-fails with "not yet
built." This spec defines the **read → score → propose** layer that turns a live GAQL
search-term pull into a bounded, explainable negative-keyword proposal, using the existing
write path (`addNegativeKeywords` in `mutations.ts`) and the existing human-review surface
(`operator.ts` task/approval system, `/admin/review/[clientId]`). **Nothing here auto-executes.**
Every proposal still lands as a `GoogleAdsOperatorTask` of `kind: 'search_term_cleanup'` that
Eitan approves or rejects exactly like today's other task kinds.

This is a scoring **rubric**, not a finished algorithm spec with full code — the thresholds
below are strategist judgment calls Eitan-Dev should implement as named, tunable constants (not
inline magic numbers), so a future retune doesn't require re-reading this doc to find them.

---

## 1. GAQL read layer

Three queries, all scoped to Search only as a hard safety filter (`campaign.advertising_channel_type = 'SEARCH'`)
even though `search_term_view` is a Search-only resource today — this guards against future
account changes, not a current bug.

```sql
-- (A) Search-term performance, trailing window (see §3 for window-length rule)
SELECT
  search_term_view.search_term,
  search_term_view.status,
  segments.search_term_match_type,
  segments.date,
  campaign.id, campaign.name, campaign.advertising_channel_type,
  ad_group.id, ad_group.name,
  metrics.impressions, metrics.clicks, metrics.cost_micros,
  metrics.conversions, metrics.ctr
FROM search_term_view
WHERE campaign.advertising_channel_type = 'SEARCH'
  AND segments.date DURING LAST_30_DAYS
ORDER BY metrics.cost_micros DESC

-- (B) Ad-group baseline CTR, same window — needed for the relative CTR floor (§2)
SELECT ad_group.id, metrics.ctr, metrics.impressions, metrics.clicks
FROM ad_group
WHERE campaign.advertising_channel_type = 'SEARCH'
  AND segments.date DURING LAST_30_DAYS

-- (C) Positive keywords per ad group — needed for the token-overlap test (§2)
SELECT ad_group.id, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type
FROM ad_group_criterion
WHERE ad_group_criterion.type = 'KEYWORD'
  AND ad_group_criterion.negative = false
  AND campaign.advertising_channel_type = 'SEARCH'
```

**Verify field names/casing before shipping.** `search_term_view` and its fields exist as of
API v22 (current, per Google Ads Developer Blog, Oct 2025 announcement) — v21 sunsets **this
month** (Aug 2026), v22 sunsets Oct 2026 (source: Google Ads Developer Blog "Announcing v22",
and `developers.google.com/google-ads/api/docs/sunset-dates`). The `google-ads-api` npm package
is pinned at `^24.1.0` in `package.json` — confirm which Ads API version that SDK version targets
against the [Query Builder](https://developers.google.com/google-ads/api/docs/developer-toolkit/gaa-query-builder)
before finalizing the query strings above; don't trust this doc's field list as byte-exact forever.

---

## 2. Eligibility gate + CTR-low flag

**Never judge on a low sample.** A search term is only eligible for a CTR-based flag if:
- `impressions >= 20` in the lookback window (below ~20 impressions, a single click swings CTR
  by 5+ points — it's noise, not signal).
- Confidence banding on top of that floor: `20–49 impressions` = **low-confidence** (CTR signal
  alone cannot drive a CUT this cycle, only a WATCH — see §4); `>= 50 impressions` = **high-confidence**
  (CTR signal is usable on its own weight in the CUT decision).

**CTR floor is relative to the ad group's own baseline, not a fixed industry number.** "Good CTR"
varies 3–5x between an education/coaching intent query (Retter) and a local emergency-service
query — a single hardcoded percentage (e.g. "2%") would be arbitrary and indefensible in the
review card. Rule:

```
CTR_LOW = true when:
  impressions >= 20
  AND term.ctr <= 0.40 * adGroup.baselineCtr   // term underperforms its own ad group by 60%+
  AND term.ctr < 0.03                          // absolute backstop: never flag a term that already
                                                // clears 3% CTR, even if below ad-group average —
                                                // that's "underperforming but fine," not cut material
```

The `0.03` absolute backstop exists only to prevent flagging a genuinely fine term in an
unusually high-performing ad group. It is a floor, not the primary signal — the relative
comparison is.

**CTR_LOW alone is never sufficient to propose a CUT** (see §4 combination logic) — it must
co-occur with an intent-mismatch or wasted-spend flag. A term can have a low click-through rate
and still be the exact term that converts on its rare click; CTR is a weak standalone relevance
signal.

---

## 3. Intent-mismatch heuristic (rules-based, no LLM)

No semantic scoring exists in this pipeline. This must be lexical/rules-based using only
GAQL-available fields plus one piece of hand-curated, per-client setup data (below).

```
INTENT_MISMATCH = true when ALL of:
  1. token-overlap(searchTerm, adGroupPositiveKeywordTokens) == 0
     — tokenize both (lowercase, strip punctuation/niqqud, drop a Hebrew+English stopword list),
       compare stems/lemmas, not exact strings.
  2. searchTerm does not contain the ad group's pinned "anchor token(s)"
     — a short, hand-authored per-ad-group list (e.g. Retter's NLP ad group: ["nlp", "פרקטישנר",
       "מאסטר"]). This is NOT auto-derivable from GAQL — it's the one piece of strategist
       judgment this heuristic needs per client, see §5.
  3. searchTerm matches >= 1 entry in the client's curated negative-intent dictionary
     (e.g. generic low-intent modifiers: "חינם", "עבודה", "משרה", "מדריך pdf", "מתכון",
      "וידאו יוטיוב" — vertical-specific, also hand-curated per client, see §5)
     OR searchTerm's tokens overlap with a different, adjacent-service theme file entirely
     (only relevant for clients running multiple distinct-service ad groups).
```

**Severity weight by triggering match type** (`segments.search_term_match_type`): weight the
proposal higher when the term was surfaced off a **BROAD**-match keyword (Google's own query
expansion is the dominant source of intent drift), lower off **PHRASE**, and treat an
**EXACT**-triggered mismatch as "flag for manual review, don't auto-propose a cut" — an exact
keyword producing an off-intent search term usually means the account's keyword taxonomy itself
needs a look, not just a negative.

**Precondition this heuristic depends on:** ad groups need to be reasonably single-themed for
token-overlap to mean anything. If an ad group mixes multiple service themes, this heuristic will
under- or over-flag. This isn't something the scorer can fix — flag it to Eitan-Dev as an
account-architecture precondition, not a bug in the scoring code, if either client's ad groups
turn out to be broad/mixed-theme once onboarded.

---

## 4. Wasted-spend-with-zero-conversions threshold

**Window:** default 30 days, aligned to the existing digest cadence — but see the per-client
overrides in §5 (Retter's longer sales cycle, AAAsada's thin volume both push this window out).

**Never flag on cost alone below a click floor.** A single ₪200 click on a genuinely relevant
term with zero conversions isn't waste, it's "hasn't converted yet." Require `clicks >= 3` before
any zero-conversion economics flag fires, regardless of cost.

**CUT threshold** (propose removal):
```
clicks >= 5
AND conversions == 0 (in-window)
AND cost >= max(
      2 * account_trailing_90d_avg_CPL,     // burned 2x a "normal" lead's cost with zero return
      0.15 * campaignConfig.avgJobValue      // backstop for accounts too new/thin to have a
    )                                        // reliable realized CPL yet
```
`0.15 * avgJobValue` is the judgment call: roughly one-seventh of a single won job's value spent
for zero signal of life is a defensible "cut" bar to explain to Eitan in the review card, and it
scales proportionately between a low-ticket local-service client and a high-ticket course client
using the same formula rather than a flat ₪ number.

**WATCH threshold** (surface as informational only, do not propose a mutation this cycle):
```
clicks >= 3
AND conversions == 0
AND cost >= 0.5 * <the CUT cost bar above>
```
Roll WATCH terms into next week's digest to accumulate more data before re-scoring.

**Wasted-spend CUT is an independent trigger** — a term that clears this bar alone (even if it's
otherwise on-theme and EXACT-triggered) is proposed for cut on economics alone, per Eitan's
explicit brief. CTR-low and intent-mismatch are the two signals that require co-occurrence with
something else (§2); wasted-spend does not.

---

## 4A. Hard CPL ceiling — a second, independent CUT trigger (added 2026-08-04, per Eitan;
**revised 2026-08-04, same day, to per-campaign-type — see §4A.0**)

**This is a different test from §4.** §4 catches waste that produced **zero** conversions. It
says nothing about a term that *is* converting but at an unacceptable price — e.g. converting at
₪400/lead against a ₪130/lead ceiling. Eitan's own words: "a main principle is to avoid waste and
drive the budget to where it genuinely creates leads at a fixed price (or less than a given
price)." That's a **hard ceiling**, not a relative-waste heuristic, and it must catch converting
terms too. §4 and §4A are complementary and mutually exclusive by construction: §4 owns
`conversions == 0`, §4A owns `conversions >= 1`. Every clicked search term above the click floor
falls into exactly one of the two.

### 4A.0 Correction — the ceiling is per (client, campaign type), not flat per-client (Eitan, 2026-08-04)

Eitan's direct correction, verbatim: *"it depends on the search campaign. As you can see in
Retter (and maybe also AAAsada) brand campaign drive very cheap leads and it should stay that
way. Overall if it's not branded than 80 ILS for AAAsada and 130 ILS for Retter."*

This changes the model in two ways, both binding on everything below in §4A:

1. **A single `CPL_CEILING_ILS[clientId]` number is wrong.** Brand and non-brand search campaigns
   have structurally different economics — brand captures users who already know the business and
   converts far more cheaply by nature, not because it's being managed better. Holding both to the
   same ₪ ceiling either sets the bar too loose for non-brand (masking real waste) or too tight for
   brand (constantly false-flagging a campaign that's working exactly as intended). The ceiling
   must be resolved per `(clientId, campaignType)`, `campaignType ∈ {'brand', 'non-brand'}`.
2. **Brand campaigns don't get the same hard-ceiling *gate* at all** — see §4A.0.1 for the
   full reasoning and the replacement mechanism.

**Campaign classification — derived from existing GAQL data, not a new taxonomy field.**
`campaign.name` is already selected in queries (A) and (B) (§1) — no schema change, no new field
on `CampaignConfig` needed to classify a campaign. Classify by substring match against a small,
named, per-client keyword list:

```
BRAND_CAMPAIGN_NAME_PATTERNS: Record<clientId, string[]>
  // case-insensitive substring match against campaign.name, Hebrew + English variants
  retter: ['ברנד', 'brand']   // PLACEHOLDER pattern list — Retter's actual campaign naming was
                               // not confirmed this session; verify against the live account
                               // before this classifier runs (see flag below).
  aasada: ['ברנד', 'brand']   // CONFIRMED this session: AAAsada's account has a campaign literally
                               // named "ברנד" (Hebrew: "Brand"). Use this pattern with confidence
                               // for AAAsada; Retter needs the same live check before shipping.
```

`campaignType(campaignName, clientId) = 'brand'` if any pattern matches (case-insensitive), else
`'non-brand'`. **Default-to-non-brand on no match** — if a campaign's name doesn't clearly signal
brand, treat it as non-brand (the stricter, ceiling-enforced path). An unclassified campaign
silently skipping the ceiling gate is the wrong failure mode; an unclassified campaign being
held to the stricter ceiling is the safe one, and Eitan can always relax it once the account is
inspected.

**Flag to Eitan-Dev:** before this classifier governs live scoring for either client, confirm the
actual campaign names in both live accounts (Retter's included — only AAAsada's "ברנד" campaign
name was directly observed this session) and update `BRAND_CAMPAIGN_NAME_PATTERNS` to match
reality rather than shipping against a guessed pattern list. This is a five-minute GAQL check
(`SELECT campaign.name FROM campaign WHERE campaign.advertising_channel_type = 'SEARCH'` per
customer), not a blocking research task.

**Multi-campaign consequence for §4A.4's "campaign scope."** The earlier draft of this section
assumed "Retter/AAAsada's single bound campaign" for campaign-scope CPL aggregation. That
assumption no longer holds — AAAsada already has at least two Search campaigns (brand + at least
one non-brand), and Retter likely does too once inspected. §4A.4 below aggregates **per
campaign**, then buckets each campaign's CPL by its classified type — it does not roll every
Search campaign into one blended per-client number.

#### 4A.0.1 Brand-campaign treatment — decision and reasoning

Eitan's framing — brand is already cheap and "it should stay that way" — is a **protection**
instinct, not a **price-ceiling** instinct. Three options were considered:

- **(a) No CPL check at all for brand.** Rejected. "It should stay that way" is an explicit
  instruction to *watch* for degradation, not a license to stop watching entirely. Brand
  efficiency can genuinely erode (a competitor starts bidding on the business's own name, Quality
  Score drifts, a landing-page regression tanks conversion rate) and this would miss it.
- **(b) A much higher/looser absolute ceiling as a safety net.** Rejected as the primary
  mechanism. Any single ₪ number for brand is arbitrary in the same way the old flat model was —
  brand CPL should be near-zero for a well-known local business and meaningfully higher for one
  with weaker brand recognition; there's no principled way to set one absolute number that means
  "still fine" across both without either being too loose to catch real degradation or requiring
  the same guesswork §4A.2/§4A.3 already had to caveat heavily for non-brand.
- **(c) Baseline-degradation check — chosen.** "Stay that way" is literally a request to protect
  *current* performance, which is a relative, self-referential test: compare a brand campaign's
  CPL against **its own trailing history**, not against an absolute number picked in advance. This
  matches the actual risk brand campaigns carry (drift/degradation) rather than the risk non-brand
  campaigns carry (spend growing into low-quality traffic that was never efficient to begin with).

**Decision: brand campaigns get no §4A hard-ceiling CUT/WATCH gate. They get a separate,
lower-severity baseline-degradation WATCH — informational only, never a CUT trigger** — defined in
§4A.0.2. Brand campaigns remain fully subject to §2 (CTR-low), §3 (intent-mismatch), and §4
(zero-conversion waste) — those are waste-detection mechanisms, not price-ceiling mechanisms, and
nothing about brand's different economics exempts a brand search term from generating clicks with
zero conversions or a badly off-intent match.

#### 4A.0.2 `BRAND_CPL_BASELINE_WATCH` — the brand-campaign replacement mechanism

```
BRAND_CPL_BASELINE_WATCH = true when:
  campaignType == 'brand'
  AND conversions(current window) >= 2                          // same high-confidence floor as
                                                                  // §4A.4's non-brand banding —
                                                                  // don't fire off a 1-lead sample
  AND baselineCpl(campaign) is defined                           // see bootstrap rule below
  AND CPL(campaign, current window) > BRAND_BASELINE_DEGRADATION_MULTIPLIER * baselineCpl(campaign)

BRAND_BASELINE_DEGRADATION_MULTIPLIER = 1.5   // named, tunable constant. 50%+ worse than the
                                               // campaign's own recent normal is a real "something
                                               // changed" signal without being noise-prone on
                                               // ordinary week-to-week variance.
```

- `baselineCpl(campaign)` = `CPL(campaign, window)` (§4A.4's formula) computed over a **trailing
  reference period prior to and excluding the current scoring window** — e.g. the 90 days before
  the current 30-day window, rolling forward each cycle. This needs a small persisted value per
  `(clientId, campaignId)` — nothing in the codebase stores a rolling historical baseline today.
  **Flag to Eitan-Dev:** this is new state, not a derived-on-the-fly number; a lightweight
  per-campaign baseline record (could live alongside `CampaignConfig` or as its own small JSON
  store) needs to exist before this check can run.
- **Bootstrap rule:** on the first cycle a brand campaign is scored (no prior baseline recorded
  yet), compute and persist the observed CPL as the seed baseline but **do not fire
  `BRAND_CPL_BASELINE_WATCH` on that first cycle** — there is nothing to compare against yet, and
  firing on a freshly-seeded baseline would be comparing a number to itself.
- **Always WATCH, never CUT, and never feeds `search_term_cleanup`'s negative-keyword mutation
  path.** A brand-term negative-add is uniquely high-risk — brand search terms are frequently the
  business's own name plus a modifier ("retter ביקורות", "retter מחיר"), and a false-positive
  negative here can block a customer who already searched for the business by name, the single
  most valuable click type in the account. `BRAND_CPL_BASELINE_WATCH` surfaces as an informational
  task (same `general_review`-or-new-dedicated-kind treatment as §4A.4's ad-group-scope signal) —
  Eitan investigates and decides manually, this scorer never proposes a mutation off this signal.

**What "lead" means here.** Per `operator.ts`'s `DEFAULT_STAGE_GATE = 'proxy-signal'`, neither
client has a `crm-revenue` stage-gate active yet — so every CPL figure in this section is **cost
per verified lead** ("ליד מאומת"), not cost per closed sale. If/when a client's stage-gate
transitions to `crm-revenue`, its ceiling needs to be re-set against closed-deal economics, not
just re-labeled — a verified-lead ceiling and a closed-deal ceiling are different numbers by
definition (a closed deal is worth far more than a verified lead, so its defensible CPL ceiling
is correspondingly higher). Flag this transition as a required manual re-tune, not something the
scorer can infer on its own.

### 4A.1 The ceiling constant

`CPL_CEILING_ILS` is now resolved per **`(clientId, campaignType)`**, `campaignType` classified
per §4A.0. Non-brand ceilings are stored as a real, Eitan-confirmed map (§4A.2/§4A.3 below) — not
derived. Brand campaigns do not get an entry in this map at all; they run §4A.0.2's baseline check
instead of a `CPL_CEILING_ILS` lookup. Structurally:

```
CPL_CEILING_ILS_BY_CLIENT_AND_TYPE: Record<clientId, { nonBrand: number }>
  retter: { nonBrand: 130 }   // Eitan, 2026-08-04 — real number, not derived
  aasada: { nonBrand: 80 }    // Eitan, 2026-08-04 — real number, not derived
  // no `brand` key by design — see §4A.0.1/§4A.0.2
```

Storage location: same place `avgJobValue`/`closeRateEstimate` already live conceptually
(`CampaignConfig`-adjacent), but keyed by client + campaign type rather than a single scalar field
on `CampaignConfig` — a bare `cplCeilingIls?: number` field on `CampaignConfig` (as currently
exists on the type, and as the old flat model used) **can no longer represent this correctly**,
since one client can now resolve to two different ceilings depending on which campaign a term
belongs to. See §4A.1 code-flag below.

**The old derivation formula (`round(avgJobValue * closeRateEstimate * 0.3)`, floored at ₪45,
from `intelligence.ts`'s `estimateWeeklyLeadTarget()`) is superseded for Retter's and AAAsada's
non-brand ceilings** — those are real Eitan-confirmed numbers now (§4A.2/§4A.3), not to be
re-derived or overridden by the formula. The formula still has two legitimate remaining uses,
both non-blocking for Retter/AAAsada:

1. **Sanity-check cross-reference.** Retter's old placeholder derivation landed at ₪180 against a
   real confirmed ₪130 non-brand ceiling — the formula overshoots by ~38% here, informative for
   calibrating how much to trust it elsewhere, not alarming on its own (a placeholder was always
   expected to be off).
2. **Fallback for future clients without direct guidance from Eitan.** `resolveCplCeilingIls()`
   in `cpl-ceiling.ts` already implements exactly this fallback order (named ceiling → derived
   from `campaignConfig` → `undefined`) — keep that resolution order, just update what "named"
   resolves against (see code-flag below). A brand-new client with no CPL number from Eitan yet
   should still fall back to the formula rather than having no gate at all, same reasoning as
   today.

### 4A.2 Retter — real non-brand ceiling, confirmed by Eitan

**`nonBrand` ceiling = ₪130 / verified lead.** This is Eitan's direct figure (2026-08-04
correction), not derived from `avgJobValue`/`closeRateEstimate` — those two inputs are still
unknown for Retter (no bound `CampaignConfig`, same gap §6 flags) and are no longer needed to set
the ceiling itself. They may still matter for *other* parts of this pipeline that do use them
(e.g. §4's `0.15 * avgJobValue` wasted-spend backstop) — that's a separate open item, still
blocked on real numbers from Retter, and out of scope for the ceiling fix here.

**Brand campaign(s):** no `CPL_CEILING_ILS` entry — governed by §4A.0.2's baseline-degradation
WATCH instead. **Not yet confirmed which of Retter's live campaigns is the brand one** — §4A.0
flags this as a required live-account check before the classifier ships (only AAAsada's "ברנד"
campaign was directly observed this session).

**Still open, independent of the ceiling number itself:** (1) whether Retter's practitioner vs.
master-tier tuition needs two separate non-brand ceilings rather than one blended ₪130 (Eitan's
call — the ₪130 figure as given doesn't distinguish tiers), and (2) whether the ₪130 target should
be uniform across Retter's three physical locations (Petah Tikva/Kiryat Bialik/Ness Ziona) +
online or vary by location/funnel. Flag both to Eitan if/when Retter's campaign structure turns
out to actually split along those lines.

### 4A.3 AAAsada (טעם מהודר קייטרינג) — real non-brand ceiling, confirmed by Eitan, held stricter than Retter's

**`nonBrand` ceiling = ₪80 / verified lead.** Also Eitan's direct figure (2026-08-04), not
derived. Notably still the *stricter* of the two clients even as a confirmed number, consistent
with §6's existing note on this client — the "financial difficulty, low order volume" framing
means a false-positive cut still risks removing a rare-but-real converting term for a client who
can't absorb lost volume, so the tighter number is doing real protective work here, not just
guesswork-in-the-conservative-direction the way the old placeholder was.

**Brand campaign(s):** AAAsada's "ברנד" campaign (confirmed to exist this session) gets no
`CPL_CEILING_ILS` entry — governed by §4A.0.2's baseline-degradation WATCH, same as Retter's
brand campaign(s) once identified. All of AAAsada's *other* Search campaigns default to
`'non-brand'` under §4A.0's classifier and are held to the ₪80 ceiling.

**Still open, independent of the ceiling number itself:** actual average order value/range
(needed for §4's `0.15 * avgJobValue` wasted-spend backstop, not for the CPL ceiling anymore),
and whether "small events" vs. "large events" need separate economics treatment given AAAsada's
stated volume mix is unclear.

### 4A.4 Computing "current CPL" per scope

All three scopes share one formula — only the aggregation grain and window change:

```
CPL(scope, window) = SUM(cost_micros) / SUM(conversions)   over the window
                      — undefined when SUM(conversions) == 0; that case belongs to §4, not here.
```

**Search-term scope** (feeds §5's per-term CUT/WATCH decision):
- **Every search term's campaign is first classified `'brand'`/`'non-brand'` per §4A.0.** Only
  `'non-brand'` terms run `CPL_CEILING_BREACH`/`CPL_CEILING_WATCH` below. Terms belonging to a
  `'brand'` campaign are exempt from these two flags entirely and instead feed §4A.0.2's
  `BRAND_CPL_BASELINE_WATCH` at the campaign level (not scored per-term — see that section).
- Window: same as §4's per-client window (30d default; Retter excludes the trailing 7 days per
  §6's conversion-lag buffer; AAAsada uses 60-90 days per §6's low-volume override).
- Confidence banding on `SUM(conversions)`, same spirit as §2's impression banding:
  - `conversions == 1` → **low-confidence**. A single realized lead's CPL is exactly as noisy as
    CTR below the 20-impression floor in §2 — one more lead at the same spend halves it, one
    fewer (impossible, it already happened) would double it. Eligible for **WATCH only**.
  - `conversions >= 2` → **high-confidence**. Eligible for **CUT** directly.
- Also reuse §4's `clicks >= 5` floor — a term with 2 conversions off only 4 clicks is already
  excluded by that floor regardless of CPL, consistent with not judging low-sample terms.

```
CPL_CEILING_BREACH = true when:
  campaignType(term.campaignName, clientId) == 'non-brand'        // §4A.0 gate — brand terms
                                                                    // never evaluate this flag
  AND clicks >= 5
  AND conversions >= 2
  AND (cost / conversions) > CPL_CEILING_ILS_BY_CLIENT_AND_TYPE[clientId].nonBrand

CPL_CEILING_WATCH = true when:
  campaignType(term.campaignName, clientId) == 'non-brand'
  AND conversions == 1
  AND cost > CPL_CEILING_ILS_BY_CLIENT_AND_TYPE[clientId].nonBrand   // that single lead alone
                                                                       // already cleared the ceiling
```

**Ad-group scope** (systemic signal — a non-brand ad group can clear the ceiling in aggregate even
after every individual term-level cut has been applied, e.g. broad structural mismatch, not a
handful of bad terms). Same formula, aggregated at `ad_group.id`, same window, **same
brand/non-brand gate as search-term scope** (classify by the ad group's parent `campaign.name`).
No mutation exists for this yet (there's no "pause/restructure ad group" function in
`mutations.ts`) — surface as an informational task (`general_review` kind is the closest existing
fit, or Eitan-Dev may want a dedicated `cpl_ceiling_review` kind — Adam's call) rather than
inventing a mutation path here.

**Campaign scope** (gates `budget_tune` — see §4A.5). Same formula, but **aggregated per
individual campaign, then routed by that campaign's classified type** — not blended into one
per-client number. This is a correction from the original draft, which assumed a single bound
campaign per client; §4A.0 already established that's no longer a safe assumption (AAAsada has at
least a brand + non-brand split). A `'non-brand'` campaign's CPL is checked against
`CPL_CEILING_ILS_BY_CLIENT_AND_TYPE[clientId].nonBrand` (§4A.5). A `'brand'` campaign's CPL feeds
§4A.0.2's baseline check instead, applied per campaign, not blended with any other campaign.

### 4A.5 Interaction with the `budget_tune` bug — in scope, not deferred

`executor.ts`'s `budget_tune` case (`executor.ts:21-56`) currently applies an unconditional
**+15% daily-budget increase** with no efficiency check at all whenever a `budget_tune` task is
approved, and does so against a single flat per-client CPL number regardless of which campaign is
being tuned. **This is now explicitly in scope to fix, not a separate future fix** — it is the
textbook case of exactly what Eitan's principle forbids: a spend increase with no verification
that it keeps CPL at or under the ceiling. Required change, **now branching by the target
campaign's classified type (§4A.0)**:

- Before `setCampaignDailyBudget` fires, classify the target campaign (`campaignType`, §4A.0) and
  compute its own campaign-scope CPL (§4A.4) over the trailing window — **per-campaign, not the
  client's blended `digest.totals.cpl`** (the current implementation's mistake, see code-flag
  below).
  - **Non-brand campaign:** if trailing CPL is already
    `>= CPL_CEILING_ILS_BY_CLIENT_AND_TYPE[clientId].nonBrand`, **block the budget increase** —
    return a failure result (`{ success: false, error: '...CPL already at or above ceiling...' }`)
    rather than applying it, and the task should not have been offered as a `budget_tune` in the
    first place (see next point).
  - **Brand campaign:** no absolute-ceiling block (§4A.0.1's decision applies here too — there is
    no absolute number to gate against). Instead, block the increase **only if
    `BRAND_CPL_BASELINE_WATCH` (§4A.0.2) is currently true for that campaign** — i.e. its CPL has
    already degraded 1.5x past its own baseline. This preserves "it should stay that way": don't
    pour more budget into a brand campaign whose efficiency has already visibly slipped, but don't
    block a brand campaign that's performing normally just because it lacks a fixed ceiling.
- `operator.ts`'s existing `budget_pacing` alert handler (`operator.ts:204-220`) already branches
  between `search_term_cleanup` and `budget_tune` kinds based on `digest.pacing.status`. Extend
  that same branch: even when pacing is *not* `'over'` (the current condition that currently
  picks `budget_tune`), also require the target campaign's own gate above (ceiling-for-non-brand /
  baseline-for-brand) to pass before choosing `budget_tune`. If the campaign's gate fails
  regardless of pacing status, route to `search_term_cleanup` (or the new ad-group-scope task from
  §4A.4) instead for non-brand, or the informational `BRAND_CPL_BASELINE_WATCH` task for brand —
  the account needs cleanup (non-brand) or investigation (brand) before it earns a budget
  increase, full stop.
- This does not require a new mutation function — `setCampaignDailyBudget` itself is fine; the
  gate belongs in `executor.ts`'s `budget_tune` case and in `operator.ts`'s task-generation
  branch, both already identified above.

**Flag to Eitan-Dev — the code does not match this model yet.** As of this session,
`src/lib/google-ads/cpl-ceiling.ts` (`CPL_CEILING_ILS_BY_CLIENT`, `resolveCplCeilingIls`,
`isCplCeilingBreached`), and the call sites in `src/lib/google-ads/operator.ts` (lines ~174-225,
~318) and `src/lib/google-ads/executor.ts` (lines ~68-72) all implement the **old flat
per-client** model: one `CPL_CEILING_ILS_BY_CLIENT[clientId]` number gated against
`digest.totals.cpl` / `cplDigest.totals.cpl` with no campaign-type awareness at all. None of that
code distinguishes brand from non-brand, none of it reads `campaign.name`, and there is no
baseline-persistence mechanism for §4A.0.2. This is a real follow-up engineering task, not
something this spec update fixes by itself — concretely, it needs:
1. `CPL_CEILING_ILS_BY_CLIENT` → `CPL_CEILING_ILS_BY_CLIENT_AND_TYPE: Record<clientId, { nonBrand: number }>`,
   with Retter/AAAsada's real numbers (§4A.2/§4A.3).
2. A `campaignType(campaignName, clientId)` classifier per §4A.0's `BRAND_CAMPAIGN_NAME_PATTERNS`.
3. `resolveCplCeilingIls()`/`isCplCeilingBreached()` calls threaded through with per-campaign CPL
   (not the blended `digest.totals.cpl`) and a campaign-type argument, short-circuiting to
   `undefined`/no-gate for `'brand'` campaigns rather than comparing against a ceiling that no
   longer exists for that type.
4. New: a `BRAND_CPL_BASELINE_WATCH` implementation, including the small persisted
   per-`(clientId, campaignId)` baseline store §4A.0.2 flags as new state.
This spec is the unambiguous source of truth for that follow-up task; the code itself should not
be treated as reflecting current strategy until it's updated to match.

---

## 5. Combination logic → task generation

Score each eligible search term on three independent flags: `CTR_LOW` (high-confidence only),
`INTENT_MISMATCH`, `WASTED_SPEND_CUT`.

```
propose CUT  if: WASTED_SPEND_CUT == true
              OR CPL_CEILING_BREACH == true                                       // §4A, NEW —
                 // unconditional CUT trigger, same standing as WASTED_SPEND_CUT. A term that
                 // clears the CPL ceiling with high confidence (>=2 conversions) is cut on
                 // economics alone, even though it converts — per Eitan's explicit instruction
                 // (2026-08-04) this must never soften to WATCH just because it has conversions.
              OR (flag_count >= 2 among {CTR_LOW, INTENT_MISMATCH, WASTED_SPEND_CUT})
propose WATCH if: exactly 1 of {CTR_LOW, INTENT_MISMATCH} fires alone (no cut trigger),
               OR the WASTED_SPEND_CUT WATCH-band condition (§4) fires,
               OR CPL_CEILING_WATCH == true                                       // §4A, NEW —
                 // low-confidence only (exactly 1 conversion whose realized cost already clears
                 // the ceiling) — WATCH here is a data-confidence limitation, not a policy
                 // softening; roll into next cycle to see if a 2nd conversion confirms the CPL.
otherwise: no task, no card noise
```

**CPL_CEILING_BREACH and WASTED_SPEND_CUT are the two independent, unconditional CUT triggers.**
CTR_LOW and INTENT_MISMATCH remain co-occurrence-only signals (§2/§3) — a term can have a
mediocre CTR or a loose keyword match and still be fine on its own; it cannot, however, be fine
while confidently converting above the client's hard non-brand price ceiling. That asymmetry is
intentional and matches Eitan's framing: waste and overpriced leads are hard stops, weak
secondary signals are not. **This CUT/WATCH table applies to non-brand search terms.** Per §4A.0,
a brand-campaign term never evaluates `CPL_CEILING_BREACH`/`CPL_CEILING_WATCH` (those flags are
gated `campaignType == 'non-brand'` at the source) — it can still be proposed for CUT via
`WASTED_SPEND_CUT` or the `flag_count >= 2` path (CTR-low/intent-mismatch still apply to brand
terms, per §4A.0.1), just never via the price-ceiling flags. `BRAND_CPL_BASELINE_WATCH`
(§4A.0.2) is a separate, campaign-level, WATCH-only signal that does not enter this per-term
CUT/WATCH table at all.

**Card size cap:** batch at most **15 search terms** per `search_term_cleanup` task/negative-add
call, highest-cost-first if more clear the CUT bar in one pass. Roll the remainder into the next
digest cycle. This keeps the review card scannable — don't ask Eitan to approve 80 keywords in
one click.

**Match type on the actual negative add — override the `mutations.ts` default.**
`addNegativeKeywords` defaults `matchType` to `'BROAD'` when unspecified
(`src/lib/google-ads/mutations.ts:129-134`). **This scorer must never rely on that default** —
BROAD negatives cast the widest, least-reviewed net. Pass explicitly:
```
matchType = (term.split(' ').length === 1) ? 'EXACT' : 'PHRASE'
```
Single-word terms get EXACT (a broad/phrase negative on one generic word risks blocking
legitimate multi-word queries containing it); multi-word terms get PHRASE.

**Task/risk fields:** keep `risk: 'low'` for `search_term_cleanup`, matching the existing
convention in `operator.ts` — a well-evidenced, capped-at-15, PHRASE/EXACT negative add is
low-blast-radius per term. `whyNeeded` on the generated task should state which flags fired and
their raw numbers (impressions/clicks/cost/conversions) per term so the card is self-explaining —
that's data composition, not final copy; hand the exact Hebrew phrasing to Tamar.

---

## 6. Per-client nuance (Retter, AAAsada) — and a blocking gap

**Neither client is onboarded into this pipeline yet.** As of this analysis, `data/clients/retter/`
and `data/clients/aasada/` have no `google-ads.json` binding, and `data/campaigns/` contains only
sandbox/test `CampaignConfig` records (`skilled-trades-*`, `emergency-trades-*`,
`stellas-beauty-salon`, all `clientId: "google-ads-sandbox"`). **This scoring logic cannot run
against either real client until they're bound** (real `customerId`, `adGroupResourceName`,
`avgJobValue`, `closeRateEstimate` on disk). Flag this to Eitan as a prerequisite, not an
oversight in this spec — build the mechanism generically now; onboarding is a separate,
blocking task.

**Retter** (`data/clients/retter/client.json`) — NLP/coaching course training, higher-ticket,
multi-step consideration funnel (inquiry → consult → enrollment), targets Petah Tikva/Kiryat
Bialik/Ness Ziona + online.
- Has enough in `client.json` (businessNiche, topService, usp) that Dror can author the
  anchor-token and negative-intent dictionary (§3) now, as a follow-up deliverable — not
  blocking the mechanism build.
- **Conversion-lag buffer required:** a course-inquiry sales cycle plausibly runs longer than
  7 days. Exclude the trailing 7 days of clicks from the WASTED_SPEND_CUT calculation entirely
  (only count clicks 7+ days old) so in-flight leads aren't misread as waste.

**AAAsada** (`data/clients/aasada/client.json`) — catering, small business, explicitly noted
"financial difficulty, low order volume," `businessNiche`/`topService`/`usp` all marked
**"unknown — to be assessed."**
- **Intent-mismatch (§3) cannot run for this client yet** — it needs the anchor-token/negative-intent
  dictionary, which needs an actual service-scope assessment first. Until that onboarding pass
  happens, only run CTR-low (§2) and wasted-spend (§4) for AAAsada — not intent-mismatch.
- **Low-volume account — extend the window.** Expect most search terms under the 20-impression
  eligibility floor on a 30-day window. Use 60–90 days before proposing any CUT for this client;
  never propose on a 7–30 day window alone here.
- **Higher scrutiny bar, given the "financial difficulty" note.** A false-positive cut risks
  removing a rare-but-real converting term for a client who can't absorb lost volume. Recommend
  Eitan set a stricter materiality bar for AAAsada specifically (e.g. require 2+ flags at
  high-confidence before even surfacing a card, rather than the general 1-flag WATCH /
  2-flag-or-waste CUT logic in §5) — this is a per-client dial, not a code change, so keep the
  threshold constants configurable per client rather than hardcoded globally.

---

## 7. Definition of done

- Named, tunable constants for every threshold in §2–§4A (no inline magic numbers), including
  `CPL_CEILING_ILS_BY_CLIENT_AND_TYPE` (per §4A.0/§4A.1 — **not** a flat per-client field) and
  `BRAND_CAMPAIGN_NAME_PATTERNS`/`BRAND_BASELINE_DEGRADATION_MULTIPLIER` (§4A.0).
- Every campaign is classified `'brand'`/`'non-brand'` (§4A.0) off `campaign.name` before any
  §4A flag is evaluated — no scoring path compares a term's CPL to a ceiling without first
  resolving which type its campaign is.
- `CPL_CEILING_BREACH`/`CPL_CEILING_WATCH` (§4A) apply **only to non-brand campaigns** and are
  implemented as CUT/WATCH triggers with the same standing as `WASTED_SPEND_CUT` for those
  terms — never demoted to WATCH when `conversions >= 2`, per §5's combination logic.
- `BRAND_CPL_BASELINE_WATCH` (§4A.0.2) implemented for brand campaigns: informational-only,
  never a CUT trigger, never feeds a negative-keyword mutation, requires the new per-campaign
  baseline persistence flagged in §4A.0.2/§4A.5.
- `budget_tune`'s executor path (§4A.5) branches by target-campaign type: blocks the
  budget-increase mutation for non-brand campaigns when trailing campaign-scope CPL is already
  at/over `CPL_CEILING_ILS_BY_CLIENT_AND_TYPE[clientId].nonBrand`, and for brand campaigns when
  `BRAND_CPL_BASELINE_WATCH` is currently true; `operator.ts`'s `budget_pacing` branch stops
  offering `budget_tune` as a task kind under the matching condition for that campaign's type.
- Retter's and AAAsada's non-brand `CPL_CEILING_ILS_BY_CLIENT_AND_TYPE` values (§4A.2/§4A.3,
  ₪130/₪80) are real Eitan-confirmed numbers already, not placeholders — they may run as-is.
  What's still blocking is confirming each client's live brand-campaign name(s) against
  `BRAND_CAMPAIGN_NAME_PATTERNS` (only AAAsada's "ברנד" campaign was directly observed this
  session; Retter's needs the same live check) before the classifier governs real scoring.
- The code in `cpl-ceiling.ts`/`operator.ts`/`executor.ts` is updated to match this per-campaign-type
  model per §4A.5's explicit code-flag — the old flat `CPL_CEILING_ILS_BY_CLIENT` model currently
  shipped there is superseded and must not be treated as correct until updated.
- Query (A)/(B)/(C) field names re-verified against the current Query Builder before merge.
- Query (A)/(B)/(C) field names re-verified against the current Query Builder before merge.
- `addNegativeKeywords` calls from this scorer never omit `matchType` (never fall through to the
  BROAD default).
- Card cap of 15 terms enforced.
- Explicit block/gate in the executor: if `campaignConfig.clientId` is `retter` or `aasada` and
  no anchor-token/negative-intent theme file exists yet, skip `INTENT_MISMATCH` scoring for that
  client rather than erroring or guessing.
- Roni verifies against the sandbox account only, per the existing `resolveGoogleAdsMutationAccess`
  gate — no scoring run against Retter/AAAsada live data until §6's onboarding gap is closed.

---

## 8. Campaign-enumeration fix + seasonal-remarketing CPL typing (added 2026-08-05, per Lior's
mission-planner review — **BLOCKING, freezes further rollout of this spec and priority-4 until
done**)

### 8.0 What this fixes

Confirmed, quantified bug, distinct from and upstream of everything in §1–§7 above: the
client→campaign binding layer resolves to **exactly one `primaryCampaignId` per client**,
chosen at onboarding time by "highest spend," and every downstream consumer of that binding
(`buildGoogleAdsOperatorTasks`, `buildWeeklyDigest`, the §4A CPL-ceiling gate, pacing, the admin
review page, budget/negative-keyword mutation routes) reads only that one campaign. It has never
enumerated "every enabled campaign under this client's `customerId`," even though §4A's
per-(client, campaign-type) ceiling logic was already built expecting multiple campaigns per
client — it just never receives more than one.

**AAAsada** (customer `4553722804`) has 5 enabled campaigns; the system was bound to "אירועים,"
its single worst-converting one (₪230/lead), while 4 others — including a ₪5.46/lead brand
campaign — were invisible to it. True blended CPL across all 5 is ₪77.41/lead, which reconciles
with the founder's real observed ~₪70/lead:

| Campaign | Spend (₪) | Conversions | CPL |
|---|---|---|---|
| ערים קרובות (evergreen local prospecting) | 1,094.48 | 17.75 | ₪61.66 |
| אירועים (general events — currently the sole bound campaign) | 2,348.90 | 10.20 | ₪230.19 |
| ברנד (brand) | 24.57 | 4.50–6.50 | ₪5.46 |
| אזכרות - שבעה - דינאמי (mourning/shiva, dynamic) | 2,555.57 | 39.33–40.33 | ₪64.98 |
| שבת חתן - דינאמי (wedding-eve, dynamic) | 1,429.62 | 24.50 | ₪58.35 |

**Retter** (customer `8344335641`) has the same flaw, inverted: its bound campaign is its cheap
**brand** campaign, so Retter's reported numbers have likely been *understating* true cost the
same way AAAsada's were overstating it. Everything in this section applies to both clients
equally — the worked numbers above are AAAsada-specific because that's the account audited this
session.

**The fix is not "blend all campaigns into one number."** A flat blend launders a genuinely
broken campaign (אירועים, ₪230/lead) inside a healthy average — exactly the waste this system
exists to catch, and exactly the failure mode ruled out by mission-planner review. The correct
fix, below: enumerate every enabled campaign, classify each one by type (extending §4A.0's
existing brand/non-brand classifier with one more type), and gate **per campaign, per type**.

### 8.1 Decision — how to account for the two seasonal-dynamic campaigns

**The open question:** should "אזכרות - שבעה - דינאמי" (₪64.98/lead) and "שבת חתן - דינאמי"
(₪58.35/lead) be **(a)** folded into the existing non-brand bucket alongside "ערים קרובות" and
held to the flat ₪80 ceiling, **(b)** given their own third campaign-type bucket, or **(c)**
something else.

**Decision: (b) — a new third `CampaignType`, `'seasonal-remarketing'`, with its own ceiling,
computed but not exempted.**

Reasoning, grounded in how these campaigns actually acquire traffic, not just their current
numbers:

1. **This is not the same acquisition mechanism as "ערים קרובות."** "ערים קרובות" is evergreen
   local-intent prospecting — cold search traffic, no pre-existing signal about the searcher
   beyond a catering-adjacent query near the business. The two "-דינאמי" campaigns are named
   after specific Jewish life-events (shiva, wedding-eve) and are almost certainly **audience-
   or page-content-triggered** — either literal Dynamic Search Ads (auto-targeting off the
   site's own event-specific pages) or dynamic remarketing/RLSA-style audiences built around
   people who already showed event-specific intent. Either way, this traffic is **structurally
   warmer** than "ערים קרובות" — the same underlying reason brand campaigns convert cheaply
   (pre-qualified intent), just via a different qualification mechanism (event-specific
   content/audience signal instead of the business's own name).
2. **Cheaper CPL here is presumably a structural property of the traffic source, not evidence
   of better management** — the same logic §4A.0 already applies to brand ("brand captures
   users who already know the business... not because it's being managed better"). Holding
   these to the identical ₪80 ceiling built for cold local-intent prospecting would, right now,
   pass them fine (58–65 < 80) — but that's coincidental, not structurally justified, and
   coincidence is not something to build a gate on.
3. **Unlike brand, these are NOT structurally floor-near-zero, and they CAN waste money in the
   classic sense** — a DSA/remarketing campaign can still drift onto badly-targeted pages, a
   page-feed category can go stale, an audience pool can be poorly excluded. That is a
   materially different risk profile than brand's "drift/degradation of an inherently-cheap
   channel" (§4A.0.1). So **exempting them via a baseline-only WATCH like brand would be
   wrong** — they need a real, enforceable ceiling capable of a CUT, the same standing as
   non-brand's `CPL_CEILING_BREACH`, not an informational-only signal.
4. **Folding them into the flat non-brand ₪80 bucket under-protects, for a different reason than
   brand-blending would over-protect.** If the seasonal audience pool for shiva or wedding-eve
   catering naturally shrinks in a given month (fewer qualifying life-events, not a management
   failure), CPL could rise for structural, non-actionable reasons. Blended into the same ₪80
   test as "ערים קרובות," that would either (i) trigger a CUT/negative-keyword proposal against
   a DSA/remarketing campaign where "add a negative keyword" may not even be the right
   corrective mechanism (§8.1's mechanism note below), or (ii) get masked by "ערים קרובות" still
   running fine, hiding this campaign's real drift inside a blended non-brand number — the
   identical laundering failure mode flagged for the client-wide blend, one level down at the
   bucket level.
5. **A third bucket is honest about a genuinely open question I could not resolve this
   session:** whether these are literal DSA campaigns (page-feed/webpage-criteria targeted, per
   priority-4 §2's DSA corollary) or Display/PMax-style dynamic remarketing (audience-criteria
   targeted, no page-feed at all) is **not yet confirmed** — I did not have live GAQL access to
   check `campaign.advertising_channel_type` / `campaign.dynamic_search_ads_setting.domain_name`
   for these two campaigns. The two mechanisms have different negative/exclusion tooling
   (negative keywords/webpage criteria vs. negative audiences) and different
   `advertising_channel_type`s entirely — which matters for which spec (this doc, priority-4
   §2, or a not-yet-written PMax/Display spec) governs their search-term/query-level scoring.
   **A dedicated bucket holds this ambiguity open rather than silently forcing it into
   "non-brand" and inheriting a keyword-negative mutation path that may not even apply to the
   underlying campaign type.**

**Ceiling for the new bucket:** no Eitan-confirmed number exists for this type yet (unlike the
₪80/₪130 non-brand ceilings, which are his direct figures). Rather than invent an arbitrary
number, anchor it to the number that is confirmed: **`seasonalRemarketing` ceiling = 1.25 × the
client's confirmed non-brand ceiling** — AAAsada: 1.25 × ₪80 = **₪100/lead**; Retter: 1.25 ×
₪130 = **₪162.50/lead**, once Retter's equivalent campaigns, if any, are identified. Rationale
for 1.25×: these campaigns should structurally run *at or below* general non-brand cost (warmer
traffic), so a ceiling meaningfully *above* non-brand would be indefensible — but a small
allowance is warranted because DSA/remarketing inventory has its own click-cost dynamics and a
genuinely finite, sometimes-thin audience pool, which the flat non-brand number was never
calibrated to absorb. **This is a placeholder anchored in real client economics, not a guess —
same convention as §4A.1's fallback-formula path — and should be replaced with Eitan's own
number the moment he has a view on it**, the same way ₪80/₪130 superseded the original derived-
formula placeholders. Observed AAAsada data (58.35–64.98) sits comfortably under this ₪100
anchor today, so it does not immediately flag either seasonal campaign — it exists to catch
*future* drift, which is the point.

**Flag to Eitan-Dev, blocking before this bucket governs live scoring:** confirm via GAQL
whether "אזכרות - שבעה - דינאמי" and "שבת חתן - דינאמי" are DSA (`SEARCH` channel type,
`dynamic_search_ads_setting.domain_name` populated) or Display/PMax dynamic remarketing
(different channel type, audience-criteria based). This determines which existing mechanism
(§3's keyword-anchor heuristic, priority-4 §2's DSA corollary, or neither — flag a future
PMax/Display spec) applies to their search-term/query-level cleanup. **The CPL-ceiling gate in
§8.2 below does not depend on this answer** (cost/conversions aggregate identically regardless
of channel type) and can ship first; the search-term-level cleanup mechanism for these two
campaigns is correctly blocked on this confirmation.

### 8.2 Classification — extend `CampaignType` in `cpl-ceiling.ts`

```ts
export type CampaignType = 'brand' | 'non-brand' | 'seasonal-remarketing';
```

Extend the existing `BRAND_CAMPAIGN_NAME_PATTERNS` classifier (`campaignType()`) with a new,
per-client pattern list, checked **before** the non-brand fallback (brand still wins on
conflict — a hypothetical "ברנד - דינאמי" campaign resolves to `'brand'`):

```ts
export const SEASONAL_REMARKETING_CAMPAIGN_NAME_PATTERNS: Record<string, string[]> = {
  aasada: ['דינאמי', 'dynamic'], // CONFIRMED this session: "אזכרות - שבעה - דינאמי" and
                                   // "שבת חתן - דינאמי" both contain "דינאמי".
  // retter: not yet confirmed — Retter's live campaign names for any equivalent
  // remarketing/DSA campaign are unknown as of this spec update. Do not assume Retter has
  // none; confirm via the same live GAQL check §4A.2 already flags for Retter's brand name.
};
```

**Named risk, explicitly, since this pattern is broader than the brand one:** matching on the
generic word "דינאמי"/"dynamic" is a weaker signal than matching "ברנד" — a future non-brand
prospecting campaign could plausibly be named with "dynamic" in an unrelated sense (e.g. a
Dynamic Search Ads experiment that is NOT event-triggered remarketing). Unlike the brand
classifier's safe default (§4A.0's "default to non-brand on no match" is the stricter path),
here the risk runs the other way: a false-positive match into `'seasonal-remarketing'` would
route a genuinely broken non-brand campaign into the looser 1.25× ceiling instead of the
stricter ₪80 one. **Mitigation:** until AAAsada's account has more than these two confirmed
campaigns matching this pattern, implement this bucket via **exact campaign-name/ID matching**
for AAAsada's two confirmed campaigns specifically, not a generic substring rule — the pattern
sketch above names the *concept*; the *implementation* should prefer exact-name/ID matching,
precisely because a false-positive here is a real safety risk. Only broaden to a generic
substring match once a client has enough of this campaign type that name-listing individually
becomes unwieldy. Flag this nuance explicitly in the PR description so Roni checks it in review.

**Ceiling resolution** (extend `CPL_CEILING_ILS_BY_CLIENT_AND_TYPE` and `resolveCplCeilingIls`):

```ts
export const CPL_CEILING_ILS_BY_CLIENT_AND_TYPE: Record<string, { nonBrand: number; seasonalRemarketing?: number }> = {
  retter: { nonBrand: 130 },                          // seasonalRemarketing: TBD once/if confirmed
  aasada: { nonBrand: 80, seasonalRemarketing: 100 }, // 1.25× nonBrand, per §8.1's placeholder
};
```

`resolveCplCeilingIls({ type: 'seasonal-remarketing', ... })` returns
`CPL_CEILING_ILS_BY_CLIENT_AND_TYPE[clientId]?.seasonalRemarketing`, following the exact same
resolution-order convention already documented in the function (named map → derived fallback →
`undefined`) — no new resolution logic needed, just a branch mirroring the existing non-brand
one. `isCplCeilingBreached()` is reused unchanged — already type-agnostic.

**CUT/WATCH mechanics:** identical to §4A.4's non-brand `CPL_CEILING_BREACH`/
`CPL_CEILING_WATCH` (`conversions >= 2` high-confidence CUT-eligible, `conversions == 1`
WATCH-only), just resolved against the `seasonalRemarketing` ceiling instead of `nonBrand` when
`campaignType(...) === 'seasonal-remarketing'`. No new formula — reuse §4A.4's `CPL(scope,
window)` computation and confidence banding verbatim.

### 8.3 Enumeration fix — replace single-`primaryCampaignId` binding with all-enabled-campaigns

**Why `GoogleAdsClientIndex.campaigns[]` (`intelligence.ts`) is the wrong mechanism to extend:**
it already exists but means something different from what this fix needs — it's populated one
entry at a time by `bindCampaignToClient()`, called whenever WAO creates a **new landing-page
campaign** with its own `CampaignConfig`/slug. It is a list of *WAO-originated campaigns with a
bound landing page*, not an enumeration of *every campaign that exists under the client's
`customerId` in the live Ads account*. AAAsada's 5 live campaigns are pre-existing, founder-
managed campaigns — none necessarily has a WAO `CampaignConfig`/slug at all. A genuinely new,
separate enumeration step is required; `campaigns[]` keeps its existing meaning unchanged.

**New enumeration query**, keyed by `customerId` (not slug), run at digest-build time, same
fail-soft try/catch convention as today's per-campaign pulls (an Ads API error here degrades to
"skip this client's per-campaign gating this cycle," never crashes the digest):

```sql
SELECT
  campaign.id,
  campaign.name,
  campaign.status,
  campaign.advertising_channel_type,
  campaign.dynamic_search_ads_setting.domain_name,
  metrics.cost_micros,
  metrics.all_conversions          -- see §8.4 — NOT metrics.conversions
FROM campaign
WHERE campaign.status = 'ENABLED'
  AND segments.date DURING LAST_30_DAYS
```

One call per `customerId`, not per campaign — replaces today's per-campaign query pattern in
`weekly-digest-batch.ts`/`operator-task/route.ts`'s `fetchLivePerformance`/`executor.ts`'s
`fetchTrailingCampaignSpendAndName` with a single enumeration call returning every enabled
campaign's name, type, and trailing spend/conversions in one round trip. **Verify field
names/casing against the current Query Builder before shipping**, per §1's standing caveat —
`campaign.dynamic_search_ads_setting.domain_name` in particular should be reconfirmed as a valid
field, not assumed from this doc.

**New shape** (additive — does not replace `GoogleAdsClientIndex`/`campaigns[]`; computed live,
not persisted as client config):

```ts
interface EnumeratedCampaign {
  campaignId: string;
  campaignName: string;
  advertisingChannelType: string;
  isDsaSetting: boolean;              // dynamic_search_ads_setting.domain_name present
  type: CampaignType;                 // classified per §8.2
  spendIls: number;
  conversions: number;                // from metrics.all_conversions, §8.4
  cpl: number | undefined;            // spend / conversions, undefined if conversions === 0
}

function enumerateEnabledCampaigns(customerId: string): Promise<EnumeratedCampaign[]>
```

**Every consumer that currently reads `index.primaryCampaignId` must instead call
`enumerateEnabledCampaigns(index.primaryCustomerId)` and iterate:**

1. **`buildGoogleAdsOperatorTasks`** (`operator.ts`) — already designed for this (its
   `campaignId`/`campaignName` params are documented today as "single-campaign-per-call by
   design," with an explicit note that the caller must loop and merge — see its doc comment,
   `operator.ts:200-211`). **No change needed to this function itself** — the fix is entirely in
   its callers, below.
2. **`operator-task/route.ts`'s approval handler** — currently resolves one
   `index.primaryCampaignId`, builds one task list, looks up the approved `taskId` in it.
   Change: enumerate all campaigns, call `buildGoogleAdsOperatorTasks` once per campaign, merge
   the resulting task arrays (`dedupe()` in `operator.ts` is keyed on `kind|title` — verify this
   still produces distinct keys across campaigns with different names; if not, extend the key to
   include `campaignId`), then look up `taskId` in the merged list. The **mutation execution
   step** (currently hardcoded to `index.primaryCampaignId`, `operator-task/route.ts:185`) must
   instead resolve the specific `campaignId` the *found task* belongs to — add that field to
   `GoogleAdsOperatorTask`/`GoogleAdsOperatorApproval` if it doesn't already flow through
   `buildApprovalRecord`; check before assuming it's missing.
3. **`weekly-digest-batch.ts`** — same pattern: enumerate, build one `WeeklyDigest` per
   campaign (not one per client), expose both the per-campaign digests **and** a labeled
   client-level roll-up (§8.5 below) rather than a single client digest.
4. **`admin/review/[clientId]/page.tsx`** — same enumerate-and-merge pattern as #2, since it
   duplicates that route's task-building logic for the review-card UI.
5. **`negative-keywords/route.ts`, `budget/route.ts`, `campaign-status/route.ts`,
   `sandbox-verify/route.ts`** — each currently reads `index.primaryCampaignId` to resolve
   *which* campaign a specific mutation/status-check targets. These are typically driven by an
   explicit user action, not a background digest scan — the fix here is to accept an explicit
   `campaignId` in the request/route rather than defaulting to `primaryCampaignId` at all. Flag
   to Eitan-Dev: audit each of these four routes for whether the caller already has a specific
   campaign in mind and just isn't passing it, versus genuinely needing "pick one" — the fix
   differs (thread the param vs. no default at all, require explicit selection).

### 8.4 Conversion-action undercount — `metrics.all_conversions`, not `metrics.conversions`

**Secondary finding, folded in per the brief:** AAAsada's account has 2 enabled conversion
actions (a form-submit, a phone-call tracking action sourced from "What Converts") marked
`primary_for_goal = false`. `metrics.conversions` only sums conversions from the account's/
campaign's designated primary conversion goal — these two actions are silently excluded, an
estimated ~3% undercount that compounds the campaign-binding bug in the same direction
(understating true lead volume, therefore overstating true CPL).

**Fix:** every GAQL query in this pipeline that currently selects `metrics.conversions` should
select **`metrics.all_conversions`** instead (sums every enabled conversion action attributed to
the campaign, regardless of `primary_for_goal`). Update: §8.3's new enumeration query (already
written with `metrics.all_conversions` above); `weekly-digest-batch.ts:57`;
`operator-task/route.ts:37`'s `fetchLivePerformance` query; `executor.ts:43`'s
`fetchTrailingCampaignSpendAndName` query; and any other live-pull site not enumerated here —
grep `metrics.conversions` across `src/lib/google-ads/` and `src/app/api/google-ads/` before
merging and convert every hit unless it has an explicit, documented reason to want primary-only
(none identified this session).

**Named trade-off, flagged rather than silently accepted:** `metrics.all_conversions` is a
strictly broader net — if either client ever has an enabled conversion action that should *not*
count as a "lead" (e.g. a page-view engagement action, a newsletter-signup micro-conversion
enabled later), blanket `all_conversions` would start counting it as a verified lead and
silently inflate lead count / deflate CPL in the opposite direction from today's bug.
**Mitigation for now:** confirm, per client, that every currently-enabled conversion action
really is a lead-equivalent signal (form-submit, phone call, WhatsApp click, etc.) before
flipping the field — a five-minute GAQL check (`SELECT conversion_action.name,
conversion_action.category, conversion_action.status, conversion_action.primary_for_goal FROM
conversion_action WHERE conversion_action.status = 'ENABLED'` per customer) both clients need
anyway as part of this fix. If a client later adds a genuinely non-lead conversion action, this
becomes a v2 concern requiring an explicit include/exclude list per client rather than blanket
`all_conversions` — flag as a known future edge case, not a blocker today (neither client has
one currently).

### 8.5 Blended figures are display-only, never gating

A true blended CPL is trivially computable from §8.3's enumeration output
(`SUM(all campaigns' spendIls) / SUM(all campaigns' conversions)`, e.g. AAAsada's ₪77.41) — that
number is **useful and should be surfaced**, just never as a gating input:

- **Allowed use:** a client-level "total spend / total leads / blended CPL" summary line, shown
  alongside (never instead of) the per-campaign breakdown, for founder-facing visibility
  (reconciling against what the founder observes in their own Ads UI, e.g. AAAsada's ~₪70/lead).
  Label it explicitly as a roll-up, not a health metric — e.g. "סה״כ ₪77.41/ליד (ראה פילוח לפי
  קמפיין למטה)" rather than presenting it as *the* number.
- **Forbidden use:** `CPL_CEILING_BREACH`/`WATCH`, `BRAND_CPL_BASELINE_WATCH`, `budget_tune`
  gating, and pacing-status alerts must all evaluate **per campaign, per its own classified
  type**, never against this blended figure. `digest.totals.cpl` as currently computed (one
  number per client) must not survive past this fix as the input to any §4A gate — replace every
  such call site with the per-campaign digest it was actually supposed to represent.
- **Pacing** (`digest.pacing.status`) has the same problem today — one pacing verdict per
  client, computed off one campaign's spend trajectory. Per-campaign pacing doesn't
  automatically make sense for every type (a seasonal-remarketing campaign's "expected weekly
  leads" is inherently lumpier/event-driven than an evergreen prospecting campaign's) — **flag
  as an open sub-problem, not silently solved here:** compute pacing per-campaign for
  `'brand'`/`'non-brand'` (same mechanism as today, just scoped down), and treat
  `'seasonal-remarketing'` campaigns as **pacing-exempt** for now (no `budget_pacing` alert
  fires off them) until there's a real basis for what "on pace" means for event-triggered
  traffic — an under-informed pacing alert here is worse than no alert at all.

### 8.6 One-time reconciliation pass — required before this spec's live rollout or priority-4 resume

Per mission-planner review, freeze `search_term_cleanup`'s live rollout (§1–§7 above) and
priority-4's Recommendations-feed/DSA work until:

1. §8.2–§8.4's classification, enumeration, and `all_conversions` fixes are implemented.
2. **AAAsada**: re-run the digest/CPL computation across all 5 enumerated campaigns, confirm
   the blended figure lands near the founder's observed ~₪70/lead (§8.5's roll-up), and confirm
   each campaign's individual classification and gate status looks sane against the table in
   §8.0.
3. **Retter**: run the same enumeration pass — confirm which campaign is bound today (expected:
   the brand one, per §8.0's inverted-case flag), enumerate the rest, and confirm the true
   blended CPL is **higher**, not lower, than whatever number Retter's dashboard has been
   showing under the old single-campaign binding.
4. Both reconciliations reviewed and signed off by Eitan before `search_term_cleanup` is allowed
   to execute a live mutation (add negative keywords) against either client, and before
   priority-4's Recommendations-feed work resumes.

### 8.7 Definition of done (§8 specifically)

- `CampaignType` extended to `'brand' | 'non-brand' | 'seasonal-remarketing'`; `campaignType()`
  resolution order is brand → seasonal-remarketing → non-brand default, implemented via
  **exact campaign-name/ID matching** for the seasonal-remarketing bucket specifically (§8.2's
  named risk), not a loose substring rule.
- `CPL_CEILING_ILS_BY_CLIENT_AND_TYPE` extended with an optional `seasonalRemarketing` key;
  AAAsada's set to ₪100 (1.25× its confirmed ₪80 non-brand ceiling) as a placeholder pending
  Eitan's own figure, per §8.1.
- `resolveCplCeilingIls`/`isCplCeilingBreached` handle the new type with the same CUT/WATCH
  confidence-banding mechanics as non-brand (§4A.4), reused not reimplemented.
- `enumerateEnabledCampaigns(customerId)` exists, queried per §8.3, returning every `ENABLED`
  campaign under a customer with its classified type, trailing spend, and `all_conversions`-
  based conversion count.
- Every consumer listed in §8.3 (operator-task route, weekly-digest-batch, admin review page,
  and the four campaign-scoped mutation routes) enumerates and iterates rather than reading
  `index.primaryCampaignId` as the sole campaign — or, for the four mutation routes, requires an
  explicit `campaignId` param rather than silently defaulting.
- No `CPL_CEILING_BREACH`/`WATCH`, `BRAND_CPL_BASELINE_WATCH`, or `budget_tune`/pacing gate
  evaluates against a blended client-level CPL after this fix ships — every gate takes a single
  campaign's own CPL and its own classified type as input. Verified by a test asserting that
  feeding a multi-campaign client (one broken non-brand campaign + one healthy brand campaign)
  produces a CUT/breach signal on the broken campaign specifically, not a passing blended
  average that hides it.
- A client-level blended-CPL roll-up is computed and surfaced (§8.5) but is provably never
  passed into any gating function.
- `metrics.conversions` replaced with `metrics.all_conversions` across every live GAQL pull
  site listed in §8.4, after confirming per-client that no enabled conversion action is a
  non-lead signal that shouldn't count.
- Seasonal-remarketing campaigns are pacing-exempt (§8.5) until a real "expected weekly leads"
  basis exists for event-triggered traffic.
- Before this classifier/enumeration governs live scoring: confirm via GAQL whether AAAsada's
  two "-דינאמי" campaigns are DSA or Display/PMax dynamic remarketing (§8.1's blocking flag) —
  this gates which search-term/query-level cleanup mechanism applies to them; it does not block
  the CPL-ceiling gate itself, which can ship first.
- §8.6's reconciliation pass completed and signed off by Eitan for both AAAsada and Retter
  before this spec's `search_term_cleanup` live execution or priority-4's Recommendations-feed
  work resumes.
- Field names in §8.3's enumeration query (especially
  `campaign.dynamic_search_ads_setting.domain_name`) re-verified against the current Query
  Builder before merge, per §1's standing caveat.
