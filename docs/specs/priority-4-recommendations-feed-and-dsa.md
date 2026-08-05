# Strategic Spec — Recommendations Feed (type allowlist) + DSA Search-Term Corollary

Author: Dror (PPC Strategist)
Owner for implementation: Eitan-Dev (Next.js Engineer)
Verification owner: Roni (Verifier)
Companion to `docs/specs/priority-3-search-term-cleanup-scoring.md` (read that first — this
doc reuses its risk convention, its `operator.ts`/`executor.ts` task model, and its per-client
(Retter, AAAsada) constraints without repeating them in full).
Status: Ready for implementation, in two independently-shippable parts (§1 does not block §2).

**Governing constraint, stated explicitly by Eitan and binding on both parts of this spec:**
retainer goal is **more leads within a fixed budget** — lower cost-per-lead, not spend growth.
Per priority-3 §6, **neither Retter nor AAAsada has a closed-loop revenue/ROI signal wired in
yet** — proxy-signal stage-gate only (`DEFAULT_STAGE_GATE = 'proxy-signal'` in `operator.ts`).
Any recommendation whose mechanism is "spend more, maybe get more" is unverifiable against that
goal right now and must not surface. This is not a general PPC-best-practice judgment call —
it is Eitan's explicit standing instruction for these two accounts.

**Pre-existing code finding, relevant to both parts:** `executor.ts`'s `budget_tune` case
already auto-executes an unconditional **+15% daily-budget increase** whenever a
`budget_tune`-kind task is approved (`executor.ts:21-56`), with no efficiency check attached.
That task kind predates this spec and is out of scope to fix here, but **flag it to Eitan-Dev
explicitly**: whatever executor path is added for the Allow-listed recommendation types below
must not fall through into `budget_tune`'s existing unconditional-increase branch, and the
`budget_tune` kind itself should not be the container `kind` any Recommendations-feed task
maps into (needs its own `kind`, e.g. `recommendation_review` — see §1.5).

---

## §1 — Recommendations-feed type allowlist + risk mapping

### 1.0 Source and version

`recommendation.type` (`RecommendationTypeEnum.RecommendationType`) — verified against the
Google Ads API v24 proto (current major release as of Aug 2026; v25 shipped July 2026 per
Google's monthly-release cadence announced Jan 2026 — confirm which is live when Eitan-Dev
builds this, don't trust this table's version pin as permanent). Source:
[`recommendation_type.proto`, googleapis/googleapis, `google/ads/googleads/v24/enums/`](https://github.com/googleapis/googleapis/blob/master/google/ads/googleads/v24/enums/recommendation_type.proto),
cross-referenced against
[`RecommendationTypeEnum.RecommendationType` (v24 reference)](https://developers.google.com/google-ads/api/reference/rpc/v24/RecommendationTypeEnum.RecommendationType)
and [`RecommendationService` / `ApplyRecommendationOperation`](https://developers.google.com/google-ads/api/reference/rpc/v24/RecommendationService) for the `apply_parameters` oneof
(which type-specific override messages exist — `recommendation_service.proto`, same repo/path).
**Re-verify this enum list before shipping** — it changes with most monthly releases (per
[Google's 2026 release-cadence post](https://ads-developers.googleblog.com/2024/11/google-ads-api-2025-release-and-sunset.html)),
and the `google-ads-api` npm package's pinned version (see priority-3 §1) governs which of these
are actually reachable from this codebase.

### 1.1 Execution model, once, so it isn't repeated per row

`RecommendationService.ApplyRecommendationOperation` is **type-agnostic** — it takes the
recommendation's `resource_name` plus an *optional* type-specific `apply_parameters` override
(only ~22 of the ~58 types have an override message at all; the rest apply with Google's
computed default, no override). That means, mechanically, **every** Allow/Conditional type below
*can* be executed directly through `ApplyRecommendationOperation` — the open question per row is
never "can the API do it" but:
- **Does the recommendation carry text/copy** (RSA headlines, callouts, sitelinks, lead-form
  copy)? If yes → the exact proposed text must be pulled into the review card and **routed
  through language-qa (Noa)/copywriter (Tamar) before Eitan ever sees an Approve button** —
  same principle as priority-3 §5's `whyNeeded` composition, but here the "data" itself is
  Google-authored ad copy, not just numbers.
- **Does it touch tracking/measurement** (`IMPROVE_GOOGLE_TAG_COVERAGE`) or **conversion
  destination** (`LEAD_FORM_ASSET`)? If yes → this is not a Google Ads mutation at all in
  substance, route it as a `tracking_audit`-kind task (existing kind) to nextjs-engineer, not
  an `ApplyRecommendationOperation` call.
- **Everything else Allow-listed** → call `ApplyRecommendationOperation` directly with no
  override object. Do **not** reimplement Google's computed change (e.g. don't hand-build a new
  `ad_group_criterion` for a `KEYWORD` recommendation) — the whole value of using the
  Recommendations API is that Google has already computed the exact operation; reimplementing it
  independently is duplicate surface area for bugs with no benefit.

### 1.1a — CPL ceiling: a cross-cutting hard gate, evaluated before the table below (added
2026-08-04; **revised same day — ceiling is now per-campaign-type, see priority-3 §4A.0**)

Priority-3 §4A defines a hard, **per-(client, campaign-type)** ceiling —
`CPL_CEILING_ILS_BY_CLIENT_AND_TYPE[clientId].nonBrand` (Retter ₪130, AAAsada ₪80, both real
Eitan-confirmed numbers, not placeholders) — **not** a flat per-client number as originally
drafted here; same constant, same source of truth — **do not redefine it here, and do not
reference the old flat `CPL_CEILING_ILS[clientId]` form, it no longer exists.** Brand campaigns
do **not** resolve to a `CPL_CEILING_ILS` entry at all — per priority-3 §4A.0.1's explicit
decision, brand campaigns are protected by a baseline-degradation check
(`BRAND_CPL_BASELINE_WATCH`, priority-3 §4A.0.2), not a hard ceiling, because "already cheap and
should stay that way" is a drift/protection concern, not an absolute-price concern. That ceiling
(for non-brand) gates this allowlist too, and it is evaluated **before** §1.2/§1.3/§1.4's
classification, not as a fourth bucket alongside them:

> **Every recommendation is first classified by which campaign it touches (`campaignType`, per
> priority-3 §4A.0, off `campaign.name`). For a `'non-brand'`-classified campaign: any
> recommendation whose `recommendation.impact` projection (base vs. potential
> `metrics.cost_micros`/`metrics.conversions`) implies a projected CPL — `projected_cost /
> projected_conversions` — above `CPL_CEILING_ILS_BY_CLIENT_AND_TYPE[clientId].nonBrand` for the
> scope it touches (search-term/keyword, ad group, or campaign) must never be presented as Allow,
> regardless of its Google-assigned type or which row of §1.3/§1.4 it would otherwise land in.**
> **For a `'brand'`-classified campaign: there is no absolute-ceiling gate to check here — instead,
> apply priority-3 §4A.0.2's baseline test to the recommendation's projected CPL (does it push the
> campaign's CPL past `1.5x` its own trailing baseline?); if so, treat identically to a ceiling
> breach for gating purposes (never Allow), otherwise the ceiling gate is simply not a blocker for
> that recommendation.** This is a hard gate, not an input to the Conditional bucket's "show both
> numbers" framing — per Eitan's instruction, a confirmed breach (non-brand ceiling or brand
> baseline) routes straight to reject-equivalent treatment, the same way `CPL_CEILING_BREACH` in
> priority-3 §5 routes straight to CUT rather than softening to WATCH.

This matters most for the two §1.4 Conditional rows that already touch spend/CPL directly:

- **`KEYWORD`** — §1.4 already gates this on cross-matching an existing converting search term.
  Add the ceiling check on top, campaign-type-aware: for a non-brand ad group, if
  `recommendation.impact` projects a CPL above `.nonBrand` for the new keyword even *with* the
  cross-match, it still fails — a term that converts today doesn't guarantee it converts at an
  acceptable price once it's bidding as an owned keyword instead of riding broad-match spillover
  economics. For a brand ad group, apply the baseline test instead of the flat ceiling.
- **`MOVE_UNUSED_BUDGET`** — §1.4 already says "only worth approving if the receiving campaign's
  CPL is verifiably lower than the donor's." Make that check absolute where the receiver is
  non-brand: the receiving campaign's **trailing CPL must itself be under
  `CPL_CEILING_ILS_BY_CLIENT_AND_TYPE[clientId].nonBrand`**, not merely lower than the donor's. A
  donor campaign at ₪500/lead and a non-brand receiver at ₪300/lead is a relative improvement but
  still a hard-fail if the client's non-brand ceiling is ₪130 (Retter) or ₪80 (AAAsada). If the
  receiving campaign is brand-classified, apply the baseline test instead — shifting budget into a
  brand campaign that's already degrading past its own baseline is the same failure mode as
  shifting it into an over-ceiling non-brand campaign, just measured relatively rather than
  absolutely.

Any type in §1.3 (Allow) that has no `recommendation.impact` projection available (e.g.
`OPTIMIZE_AD_ROTATION`, most `SHOPPING_ADD_*` feed-hygiene fixes) has no spend/CPL mechanism to
project in the first place — this gate is a no-op for those, not a blocker; only apply it where
the recommendation actually carries a cost/conversion forecast.

### 1.2 Reject outright — never surface, never propose

Primary mechanism is spend growth, target-loosening, or targeting/inventory expansion. Per
Eitan's explicit instruction, these do not get a review card at all — not even a "conditional"
one — because there is no current mechanism to verify they'd actually lower cost-per-lead.

| Type | Mechanism | Why rejected |
|---|---|---|
| `CAMPAIGN_BUDGET` | Raise daily budget on a budget-constrained campaign | Direct spend increase |
| `FORECASTING_CAMPAIGN_BUDGET` | Raise budget, forecast-backed | Still a spend increase; forecast confidence doesn't substitute for a real ROI loop |
| `MARGINAL_ROI_CAMPAIGN_BUDGET` | Raise budget where marginal ROI is predicted positive | Same — "predicted" is Google's proxy-conversion model, not Eitan's real lead economics |
| `TARGET_CPA_OPT_IN`, `TARGET_ROAS_OPT_IN`, `MAXIMIZE_CONVERSIONS_OPT_IN`, `MAXIMIZE_CONVERSION_VALUE_OPT_IN` | Switch to automated bidding optimizing for volume/value | Named explicitly in Eitan's brief; automated bidding without a verified conversion-value signal (priority-3 §6 gap) will chase Google's proxy signal, not real leads |
| `MAXIMIZE_CLICKS_OPT_IN` | Switch to volume-maximizing bidding, no CPA ceiling | Named explicitly — no cost control at all |
| `ENHANCED_CPC_OPT_IN` | Automated bid adjustment layered on manual CPC | Bidding automation without a verified conversion signal — same underlying objection as the OPT_IN row above, even though the mechanism is milder |
| `RAISE_TARGET_CPA_BID_TOO_LOW`, `RAISE_TARGET_CPA`, `FORECASTING_SET_TARGET_CPA` | Raise the tCPA ceiling | Named explicitly ("target-CPA/ROAS loosening") |
| `LOWER_TARGET_ROAS`, `FORECASTING_SET_TARGET_ROAS` | Loosen the tROAS floor | Same — loosening a ROAS target is spend-growth-by-definition |
| `SET_TARGET_CPA`, `SET_TARGET_ROAS` | Set/adjust a bid-strategy target value | Same family as the OPT_IN rows |
| `SEARCH_PARTNERS_OPT_IN` | Expand delivery to Search Partner network | Inventory expansion, historically lower-quality traffic, no way to isolate its CPL yet |
| `DISPLAY_EXPANSION_OPT_IN` | Expand a Search campaign onto the Display Network | Inventory/targeting expansion, different intent entirely |
| `KEYWORD_MATCH_TYPE`, `USE_BROAD_MATCH_KEYWORD` | Broaden an existing keyword's match type | Named explicitly ("broad-match... expansion") |
| `CUSTOM_AUDIENCE_OPT_IN` | Create a new custom (in-market-like) audience for targeting | Audience expansion |
| `SHOPPING_TARGET_ALL_OFFERS` | Remove Shopping campaign product filters | Targeting expansion (N/A today — neither client runs Shopping) |
| `PERFORMANCE_MAX_OPT_IN` | Migrate/create a Performance Max campaign | Structural migration to a less-controllable inventory mix; also simply out of scope for an auto-proposed feed item — if ever pursued, needs its own dedicated spec and a human-led rebuild, not a one-click apply |

**No exceptions granted in this row-set.** I looked for a genuinely waste-reducing type inside
this bucket per the brief's instruction to justify any exception explicitly — none of the above
qualifies: every one either raises a budget/target ceiling or expands where/how broadly the
account bids. (`ENHANCED_CPC_OPT_IN` and `RAISE_TARGET_CPA_BID_TOO_LOW` were the closest calls —
both are argued internally by Google as "fixing an inefficiency," but both still resolve to
*more* spend as the mechanism, which fails the verification test given the missing ROI loop.)

### 1.3 Allow — propose to Eitan (still human-approved, per the existing task model)

Risk convention matches priority-3 §5 (`low` / `medium` / `high`, same blast-radius logic).
"Execution path" states whether to call `ApplyRecommendationOperation` directly (§1.1) or route
to an existing/new mutation function.

| Type | Mechanism | Risk | Execution path | Notes |
|---|---|---|---|---|
| `OPTIMIZE_AD_ROTATION` | Switch ad-group ad rotation from "even" to "optimize for conversions" | Low | `ApplyRecommendationOperation` direct, no override | Pure efficiency lever — shows the better-performing ad more often within the *same* ad set and budget. No copy, no spend change. |
| `CALLOUT_ASSET`, `SITELINK_ASSET`, `CALL_ASSET` | Add missing ad extensions (callouts/sitelinks/call) | Medium | `ApplyRecommendationOperation`, override params available (`CalloutAssetParameters` etc.) if Eitan wants to edit text before applying | Extensions raise Ad Rank/CTR without bidding more; genuinely efficiency-positive. **Carries visible ad copy (callout/sitelink text) → must pass through Tamar/Noa before the Approve click**, same as any other copy surface. |
| `RESPONSIVE_SEARCH_AD_ASSET`, `RESPONSIVE_SEARCH_AD`, `RESPONSIVE_SEARCH_AD_IMPROVE_AD_STRENGTH` | Add/improve RSA headlines & descriptions | Medium | `ApplyRecommendationOperation`, override via `ResponsiveSearchAdAssetParameters`/`ResponsiveSearchAdParameters` | Ad-strength/CTR improvement, not a spend lever. **Google-authored Hebrew copy — hard-gate through language-qa before applying; never auto-apply even at "low risk."** |
| `IMPROVE_PERFORMANCE_MAX_AD_STRENGTH`, `IMPROVE_DEMAND_GEN_AD_STRENGTH` | Same idea for PMax asset groups / Demand Gen ads | Medium | Same as above | **N/A today** — neither client runs PMax or Demand Gen (priority-3 §0 scope note). List for completeness; skip scoring these types entirely until a client actually has a live campaign of that type. |
| `TEXT_AD` | Suggests a new Expanded Text Ad | Low, but likely dead | `ApplyRecommendationOperation` if it still returns | ETAs have been non-creatable in the UI since 2022 — **verify this type is still actually emitted by the API before building against it**; may be a vestigial enum value. Don't spend build time here without confirming live occurrence first. |
| `SHOPPING_ADD_AGE_GROUP`, `SHOPPING_ADD_COLOR`, `SHOPPING_ADD_GENDER`, `SHOPPING_ADD_GTIN`, `SHOPPING_ADD_MORE_IDENTIFIERS`, `SHOPPING_ADD_SIZE` | Fill missing Merchant Center product attributes | Low | `ApplyRecommendationOperation` direct | Pure feed-hygiene/eligibility fixes, no spend mechanism. **N/A today** (no Shopping campaigns) — list for when/if a client adds one. |
| `SHOPPING_FIX_DISAPPROVED_PRODUCTS`, `SHOPPING_FIX_SUSPENDED_MERCHANT_CENTER_ACCOUNT`, `SHOPPING_FIX_MERCHANT_CENTER_ACCOUNT_SUSPENSION_WARNING` | Alerts for broken/suspended Merchant Center state | Low (but urgent) | **Not an `ApplyRecommendationOperation` target** — these are informational; the fix happens in Merchant Center, not via an Ads API mutation. Route as an alert-style task (mirrors `tracking_audit`'s pattern: "something is broken, go look"), not a one-click apply. | A suspended Merchant Center account means **zero delivery** — if this ever fires, treat as highest-urgency regardless of the "low" spend-risk label. N/A today (no Shopping). |
| `REFRESH_CUSTOMER_MATCH_LIST` | Re-upload/refresh an existing Customer Match audience list | Low | `ApplyRecommendationOperation` direct | Keeps an *existing* list current — doesn't create new targeting, doesn't expand reach beyond what's already opted into. **N/A today** — verify neither client has a Customer Match list before building. |
| `IMPROVE_GOOGLE_TAG_COVERAGE` | Flags pages/conversion actions missing the Google tag | Medium | **Not a Google Ads mutation at all** — generate a `tracking_audit`-kind task (existing `operator.ts` kind) pointed at nextjs-engineer, not an Ads API call | Directly serves Eitan's stated priority: this is literally "close the measurement gap" that priority-3 §6 flagged as blocking. **Treat this as the highest-priority Allow type to wire up first** — it's the one recommendation type whose entire function is enabling the ROI loop Eitan is waiting on, not spending against it. |

### 1.4 Conditional — needs explicit dual-number framing in the review card

Ambiguous mechanism: could reduce waste in one direction and grow spend in another, or the net
effect depends on account state this scorer can't infer from the recommendation object alone.
**Do not auto-classify these as Allow or Reject — the review card must show both numbers and let
Eitan decide, per his brief's own instruction for this bucket.**

| Type | Mechanism | Card must show | Risk |
|---|---|---|---|
| `MOVE_UNUSED_BUDGET` | Shifts already-committed budget from an underspending campaign to an overspending one | Net account spend is unchanged — but the *receiving* campaign's spend rises. Show both campaigns' trailing cost-per-lead side by side; only worth approving if the receiving campaign's CPL is verifiably lower than the donor's. **Likely N/A today** — needs 2+ live campaigns per client; confirm before building. | Medium |
| `KEYWORD` | Suggests adding a new keyword (Google's own gap-detection, typically sourced from search-term/query data) | This is a targeting-expansion mechanism by definition, but *can* be waste-reducing if the suggested keyword is a term **already appearing as a converting search term with zero current keyword coverage** — i.e. traffic already exists and converts, this just gives it an owned keyword/bid instead of relying on broad-match spillover. **Gate:** only surface a `KEYWORD` recommendation if the suggested term cross-matches a term the priority-3 pipeline already flagged as a "keeper" (converting, not proposed for cut). Otherwise suppress it — an unvalidated new keyword is pure expansion. | Medium |
| `DYNAMIC_IMAGE_EXTENSION_OPT_IN` | Adds AI-generated images to search ads (image extensions) | No spend mechanism, but the images are AI-generated and unreviewed — show the actual generated image preview in the card (available on the recommendation object) so Eitan/Maya can veto anything off-brand before it goes live, same instinct as gating copy through Tamar. | Medium |
| `LEAD_FORM_ASSET` | Adds a Google-native lead form as an ad extension, capturing the lead inside Google's UI instead of sending the click to the landing page | Changes **where the conversion event fires** — bypasses whatever GA4/GTM tracking nextjs-engineer has built on the landing page, and changes what data reaches the CRM. This is a measurement-architecture decision, not a PPC-efficiency one. Route to nextjs-engineer for a tracking-impact assessment before it's ever presented as approvable. | High |
| `UPGRADE_SMART_SHOPPING_CAMPAIGN_TO_PERFORMANCE_MAX`, `UPGRADE_LOCAL_CAMPAIGN_TO_PERFORMANCE_MAX`, `MIGRATE_DYNAMIC_SEARCH_ADS_CAMPAIGN_TO_PERFORMANCE_MAX`, `SHOPPING_MIGRATE_REGULAR_SHOPPING_CAMPAIGN_OFFERS_TO_PERFORMANCE_MAX` | Forced/soft-forced structural migration off a deprecated or sunsetting campaign type | These often aren't optional forever (Google has sunset Smart Shopping already, for example) — if one of these fires, the card must state whether the *source* campaign type has a hard deprecation deadline (verify at the time, don't guess) versus being merely "recommended." If deadline-driven, this becomes its own project with its own spec, not a routine feed item — never bundle into the same review card as an efficiency task. **N/A today** — neither client runs Smart Shopping, Local, or DSA-as-PMax-candidate campaigns yet; DSA is directly relevant once §2 ships. | High |
| `PERFORMANCE_MAX_FINAL_URL_OPT_IN` | Expands which final URLs a PMax campaign is allowed to send traffic to | Inventory/destination expansion within an existing campaign, not a budget change — show which URLs would newly become eligible. **N/A today** (no PMax). | Medium |

### 1.5 Wiring note for Eitan-Dev

- New `GoogleAdsOperatorTask['kind']`: add `'recommendation_review'` (do **not** reuse
  `budget_tune` or `search_term_cleanup` — see the pre-existing-code finding above). Same
  `risk`/`whyNeeded`/`recommendedAction` shape as every other kind in `operator.ts`.
- Pull live recommendations via a `recommendation` GAQL query (`SELECT recommendation.type,
  recommendation.resource_name, recommendation.impact, recommendation.<type>_recommendation.*
  FROM recommendation WHERE ...`) — **verify the exact field path per type against the Query
  Builder before implementing**, the sub-message field name differs per type (e.g.
  `recommendation.callout_asset_recommendation`, `recommendation.responsive_search_ad_asset_recommendation`).
- Filter to §1.3's Allow set (and §1.4's Conditional set, dual-numbered) in code — never pass an
  unfiltered `recommendation.type` straight into a task; the Reject set (§1.2) must never reach
  `buildGoogleAdsOperatorTasks` even transiently.
- Any type carrying copy/creative (RSA assets, callouts, sitelinks, images, lead forms) needs its
  proposed content surfaced verbatim in `whyNeeded`/a new task field so language-qa/Tamar can
  review it as part of the same approval flow — don't let `ApplyRecommendationOperation` fire on
  Approve before that review has happened operationally (process gate, since the codebase itself
  has no separate "copy review" task state today — flag to Adam if a new intermediate status is
  needed).
- `DismissRecommendation` should back a "Reject" decision the same way `search_term_cleanup`
  rejections work today (log-only, per `operator-task/route.ts`'s reject branch) — so a rejected
  recommendation doesn't keep resurfacing every digest cycle.

---

## §2 — DSA / dynamic-intent search-term corollary

### 2.1 What carries over unchanged from priority-3

**§2 (eligibility gate + CTR-low flag) — fully reusable, mechanism-for-mechanism.**
`dynamic_search_ads_search_term_view` is metrics-segmentable the same way `search_term_view` is
(standard `metrics.impressions/clicks/cost_micros/conversions/ctr` + `segments.date`), and DSA
ad groups still roll up under `ad_group`/`campaign` the same way, so query (B)'s ad-group
baseline-CTR join is untouched. The `impressions >= 20` eligibility floor, the
20–49/`>=50` confidence banding, and the `0.40 * baselineCtr` + `0.03` absolute-backstop CTR_LOW
formula (priority-3 §2) apply with **zero changes** — just point query (A) at
`dynamic_search_ads_search_term_view` instead of `search_term_view`. One correction to make on
both queries while touching this: priority-3 §1's query (A) doesn't filter out
`search_term_view.status = 'EXCLUDED'` rows before scoring — do that for both resources now
(`WHERE search_term_view.status != 'EXCLUDED'` / no DSA-view equivalent status field exists, see
§2.3 below for how DSA signals "already excluded" differently).

**§4 (wasted-spend-with-zero-conversions) — fully reusable, mechanism-for-mechanism.** The
`clicks >= 3` floor, the `clicks >= 5 AND conversions == 0 AND cost >= max(2x avg CPL, 0.15x
avgJobValue)` CUT bar, the WATCH half-bar, and the per-client window overrides (Retter's 7-day
conversion-lag buffer, AAAsada's 60–90-day low-volume window and stricter 2-flag bar) are about
sales-cycle and client economics, not about *how* the search term was matched. No DSA-specific
adjustment needed here.

**§4A (hard CPL ceiling, added 2026-08-04; per-campaign-type as of priority-3 §4A.0) — fully
reusable, mechanism-for-mechanism, including the brand/non-brand split.** Same point as §4:
`CPL_CEILING_BREACH`/`CPL_CEILING_WATCH` and the `conversions == 1` vs. `>= 2` confidence banding
are about the client's non-brand price ceiling and sample-size confidence, not about DSA vs.
keyword targeting. Compute `CPL(scope, window)` off `dynamic_search_ads_search_term_view`'s
cost/conversions the same way as `search_term_view`'s. **First classify the DSA ad group's parent
campaign as `'brand'`/`'non-brand'` per priority-3 §4A.0** (DSA campaigns are Search campaigns and
`campaign.name` is equally available here) — non-brand DSA terms gate against
`CPL_CEILING_ILS_BY_CLIENT_AND_TYPE[clientId].nonBrand` with the same CUT-not-WATCH treatment when
high-confidence; brand DSA terms (if any client ever runs DSA on a brand campaign, which is
unusual but not impossible) run `BRAND_CPL_BASELINE_WATCH` instead, same as priority-3 §4A.0.2.
This closes the same gap here that it closes in priority-3: a DSA-served query on a non-brand
campaign that *is* converting but above that campaign type's ceiling must be cut, not just left
alone because it isn't zero-conversion waste.

**Card cap (15/cycle, highest-cost-first), match-type-on-negative-add default override, and
`risk: 'low'` convention (priority-3 §5)** — all carry over unchanged once §2.4's negative
mechanism below is picked correctly.

### 2.2 What must change — the intent-mismatch anchor

Priority-3 §3's heuristic anchors token-overlap against **the ad group's positive keyword
list** (`ad_group_criterion.keyword.text`, `negative = false`). **DSA ad groups have no such
list** — DSA doesn't target keywords; it auto-targets off the account's domain plus either a
page feed or `webpage` criteria (URL-contains / URL-equals / page-title-contains / custom-label
rules), i.e. Google's own crawl of the site decides what to match against, not a curated keyword
theme. Query (C) from priority-3 §1 returns nothing meaningful for a DSA ad group and must be
replaced:

```sql
-- (C-DSA) Webpage targeting rules per DSA ad group — the anchor-equivalent for §2's heuristic
SELECT
  ad_group.id,
  ad_group_criterion.webpage.criterion_name,   -- the DSA "category" label, hand-set at setup
  ad_group_criterion.webpage.conditions        -- URL_CONTAINS / URL_EQUALS / PAGE_TITLE / CUSTOM_LABEL rules
FROM ad_group_criterion
WHERE ad_group_criterion.type = 'WEBPAGE'
  AND campaign.advertising_channel_type = 'SEARCH'
  AND campaign.dynamic_search_ads_setting.domain_name IS NOT NULL
```

**Revised heuristic** (`INTENT_MISMATCH_DSA`), replacing priority-3 §3's three-part test:

```
INTENT_MISMATCH_DSA = true when ALL of:
  1. token-overlap(searchTerm, urlPathTokens(dynamicSearchAdsSearchTermView.page_url)) == 0
     — tokenize the served page's URL path segments/slugs the same way §3.1 tokenizes keywords
       (lowercase, strip punctuation, drop stopwords, stem/lemmatize); this replaces
       "ad group's positive keywords" as the on-theme anchor, since the page actually served
       IS the DSA equivalent of "what this ad group is about."
  2. searchTerm does not contain the ad group's webpage-criterion category label
     (`ad_group_criterion.webpage.criterion_name`) tokens
     — this is a genuine improvement over priority-3's fully-hand-curated anchor list: DSA
       ad groups are conventionally already organized by page-feed category/URL-group at
       setup time, so this label doubles as the anchor with less new hand-curation than the
       keyword-based version needed. Still verify it's populated and meaningful per client
       before relying on it — if a client's DSA ad group is a single catch-all "everything"
       group with a generic label, this sub-check degrades to a no-op and the heuristic falls
       back to URL-token overlap alone.
  3. searchTerm matches the client's curated negative-intent dictionary (priority-3 §3, item 3)
     — fully reusable as-is, this dictionary is generic per-client vocabulary, not tied to
       how the term was matched.
```

**Severity weighting changes.** Priority-3 §3 weights by triggering match type
(BROAD/PHRASE/EXACT) — DSA has no keyword match type to key off. Replace with
`dynamic_search_ads_search_term_view.has_matching_keyword`:
- `has_matching_keyword = false` → **higher severity**. DSA is the *sole* source of this query's
  coverage — nothing else in the account is catching it, so a mismatch here is fully DSA's
  auto-targeting drifting, the closest analog to a BROAD-triggered mismatch in priority-3's
  weighting.
- `has_matching_keyword = true` → **lower severity, flag for manual review only, don't
  auto-propose a cut** — the query is already also covered by an explicit keyword elsewhere in
  the account; a mismatch here more likely means the *keyword* targeting needs a look, mirroring
  priority-3's EXACT-match treatment ("usually means the account's keyword taxonomy itself needs
  a look, not just a negative").

**Precondition, same shape as priority-3 §3's "ad groups need to be reasonably single-themed"
warning:** this heuristic needs the DSA ad group's page-feed/URL-group scope to be reasonably
coherent (one category per ad group). A DSA ad group auto-targeting the entire site with no
category/URL segmentation will under- or over-flag the same way a mixed-theme keyword ad group
would — flag to Eitan-Dev as an account-architecture precondition to check once either client's
DSA setup (if any) is inspected, not a scoring-code bug.

### 2.3 `has_negative_keyword` / `has_negative_url` — gating, not scoring

Confirming the field research referenced in the brief:
`dynamic_search_ads_search_term_view.has_negative_keyword` (bool, true if the query already
matches an existing DSA-level negative keyword) and its sibling `has_negative_url` (bool, true if
the query already matches an existing negative-URL exclusion) are **eligibility-gate filters,
not scoring inputs** — mirroring what `search_term_view.status != 'EXCLUDED'` should be doing on
the keyword side (§2.1's correction above). Add to query (A-DSA)'s `WHERE`:

```sql
AND dynamic_search_ads_search_term_view.has_negative_keyword = false
AND dynamic_search_ads_search_term_view.has_negative_url = false
```

Any row where either is `true` is **already excluded from serving** — scoring it would either
(a) propose a redundant negative Google already effectively has in place, or (b) waste a card
slot in the 15-per-cycle cap on a term that isn't actually spending anymore. Filter before
scoring, don't flag-and-suppress after.

`has_matching_keyword` (§2.2) is the one field from this trio that **does** feed scoring
(severity weight) rather than eligibility — it doesn't mean "already excluded," it means
"already also covered by a keyword elsewhere," which is a different signal.

### 2.4 Negative mechanism — two mutation paths, not one

Priority-3 §5 always writes a keyword negative via `addNegativeKeywords`
(`mutations.ts:120-159`) onto the specific ad group. For DSA, that same function still applies
for a **term-level** cut (add the search term itself as a negative keyword on the DSA ad group —
`addNegativeKeywords` doesn't care that the ad group is DSA-typed, the mutation shape is
identical). Match-type-on-negative-add logic (single-word → EXACT, multi-word → PHRASE) carries
over unchanged.

**New case DSA introduces that keyword-Search doesn't have:** when many flagged search terms
cluster on the same `page_url`, the higher-leverage fix is excluding the *page*, not each term
individually — a **negative URL** (`webpage` negative criterion on the DSA ad group), which stops
DSA from ever auto-targeting that page again regardless of what query reaches it. This has no
existing function in `mutations.ts` — **Eitan-Dev needs a new `addNegativeWebpageCriterion`
mutation** (shape: `ad_group_criterion.create` with `negative: true`, `webpage.conditions:
[{ operand: URL, operator: EQUALS, argument: <page_url> }]`, verify exact operand/operator enum
values against the Query Builder before implementing). Trigger rule for the scorer: if **3 or
more** flagged terms (CUT or WATCH) in one digest cycle share the same `page_url`, propose the
page-level negative-URL cut instead of 3+ separate term-level cards — same "don't ask Eitan to
approve a pile of near-duplicate line items" instinct as priority-3 §5's card cap.

### 2.5 Scope correction to priority-3 §0

Priority-3 §0 scoped DSA out entirely ("PMax/Demand Gen search-term surfacing is explicitly out
of scope... flag as a separate future spec"), but DSA was bucketed there alongside PMax somewhat
loosely — DSA is in fact a **Search**-channel campaign type
(`campaign.advertising_channel_type = 'SEARCH'` with `dynamic_search_ads_setting` populated), not
a PMax-style black-box. This spec (§2) brings DSA in as a first-class corollary; **PMax/Demand
Gen search-term surfacing remains out of scope** — those still use a fundamentally different
report (`campaign_search_term_insight` / PMax's own "search terms insights," no per-term negative
mechanism the same way) and still warrant their own future spec if either client ever runs PMax.

### 2.6 Per-client status

**Neither client's account has been inspected for DSA usage as of this spec.** Before any of §2
runs: confirm whether Retter or AAAsada have a DSA campaign/ad group at all
(`campaign.dynamic_search_ads_setting.domain_name IS NOT NULL`). If neither does, §2 is a
build-once-run-later mechanism, same status as §1's PMax/Shopping/Demand Gen rows — built
generically now, exercised whenever a client actually has that campaign type live.

---

## §3 — Definition of done (both parts)

- §1: `'recommendation_review'` task kind added; Reject-set (§1.2) types never reach
  `buildGoogleAdsOperatorTasks`, even transiently, verified by a unit test that asserts the
  allowlist is a strict filter, not a denylist (fail closed on any *new*, unclassified
  `recommendation.type` value showing up in a future API version — treat unknown types as
  Reject by default until this doc is updated, never Allow-by-default).
- §1: any task carrying proposed ad copy/creative blocks on language-qa/copywriter review before
  the Approve action is allowed to fire `ApplyRecommendationOperation`.
- §1: `IMPROVE_GOOGLE_TAG_COVERAGE` wired first, routed to nextjs-engineer as a `tracking_audit`
  task — this is the one type that directly unblocks the missing ROI-loop gap from priority-3 §6.
- §1.1a: `recommendation.impact`-carrying types (notably `KEYWORD`, `MOVE_UNUSED_BUDGET`) are
  first classified by campaign type (brand/non-brand, priority-3 §4A.0) off `campaign.name`, then
  checked against `CPL_CEILING_ILS_BY_CLIENT_AND_TYPE[clientId].nonBrand` for non-brand campaigns
  or `BRAND_CPL_BASELINE_WATCH` for brand campaigns (priority-3 §4A) before ever reaching Allow —
  verified by a test asserting a projected-CPL-over-ceiling (non-brand) or
  over-baseline-degradation (brand) recommendation never appears in
  `buildGoogleAdsOperatorTasks`'s output, mirroring priority-3's "fail closed" test for §1.2.
- §2: `CPL_CEILING_BREACH`/`WATCH` computed identically off `dynamic_search_ads_search_term_view`
  as off `search_term_view`, same per-campaign-type resolution and ceiling constant, same
  CUT-not-WATCH treatment (§2.1's new CPL-ceiling paragraph above).
- §2: query (A-DSA) filters `has_negative_keyword = false AND has_negative_url = false` before
  scoring; `has_matching_keyword` feeds severity weight only, never eligibility.
- §2: anchor logic uses `page_url` token-overlap + `webpage.criterion_name`, never references
  `ad_group_criterion.keyword.text` for a DSA ad group (that field is structurally absent there).
- §2: page-level negative-URL path (`addNegativeWebpageCriterion`, net-new function) exists and
  is chosen over 3+ redundant term-level cards sharing one `page_url`.
- Both: field names/enum values in this doc re-verified against the live Query Builder /
  `RecommendationTypeEnum` at build time — this doc's v24 pin is a snapshot, not a guarantee.
- Roni verifies against the sandbox account only, same gate as priority-3 §7 — no live run
  against Retter/AAAsada until each client's relevant campaign type (Recommendations feed is
  universal; DSA is conditional per §2.6) is confirmed present and onboarded.
