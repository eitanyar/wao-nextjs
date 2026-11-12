# Ads Bot create-campaign fixes (Dror triage, 2026-11-12)

Source: Dror's read-only triage of Fable 5.2's gap list (docs/missions/video-real-and-credit-sprint-fable52-2026-11-12.md, "Gaps found while reading"), web facts read 2026-11-12. No live client is affected today: aasada and retter were bound by hand, not by this route (local data; confirm on prod). **Keep `GOOGLE_ADS_ENABLE_LIVE_MODE` off in production until fixes 1–3 pass.**

## Outcome
A campaign created by Ads Bot targets the owner's real area with Presence, counts calls from the ad, sends clean keywords, can't half-fail into an orphan account, and its bot prompt says only what the code does.

## Fix 1: location targeting (money wasted + misleading the client)
- Today `create-campaign/route.ts:665-669` creates one criterion, all of Israel (geoTargetConstants/2376), with Google's default Presence-or-interest. The owner's area is only saved (`:731`). The plan screen shows "מיקוד מיקום" = his city.
- New helper `src/lib/google-ads/geo-targeting.ts` + test, by `serviceModel`:
  - **field/mixed:** each `specificCities` entry → a Google geo target via the API's location-suggestion service (locale he, country IL)
  - **storefront:** ~10 km radius around the address
  - **event:** the named regions/cities
  - **remote:** Israel
- Set `geo_target_type_setting.positive_geo_target_type = PRESENCE` on every campaign. Save the used geo IDs and names into CampaignConfig.
- If a non-remote business matches 0 locations, BLOCK before step 1 with a 4xx. Never fall back silently to all of Israel.

## Fix 2: count calls from the ad's call button (misleading + can cut working searches)
- Today `:261` sets `call_conversion_reporting_state: DISABLED`, so ad calls never reach the CRM, CPL or digest, and search-term scoring sees calling searches as 0-conversion.
- Create a "calls from ads" conversion action: AD_CALL, about 60s minimum, SECONDARY, ₪0. Point the call asset at it with USE_RESOURCE_LEVEL_CALL_CONVERSION_ACTION. Israel is on Google's forwarding-number list.
- In `search-term-scoring.ts`, a search term with ≥1 call is never cut. `search-term-fetch.ts` pulls call counts or all-conversions per term.
- Constraint: the verified lead stays the ONLY primary goal (phase-2 spec §3 0a); the `configureVerifiedLeadOnlyGoals` read-back must stay clean. Check the exact enum and field names against the pinned API version.

## Fix 3: clean keywords + bundled one-liners (creation breaks / money wasted)
- New `src/lib/google-ads/keyword-normalize.ts` + test: `[x]` → EXACT, `"x"` → PHRASE, bare text → PHRASE (no broad match from a cold start). Strip `+` and stray symbols, trim, dedupe, reject empties.
- Validate the strategy before step 1: ≥1 keyword and a positive budget. Default negatives to `?? []`. The fallback strategy (`bot/route.ts:221-239`) has no `negativeKeywords` and crashes after the account already exists.
- `:645` `target_search_network: false` (Search Partners off).
- Remove "מחיר" from the generic negatives (`prompts.ts` ~409) and the "<niche> מחיר" fallback keyword. This only deletes Hebrew, via Python str.replace with asserted counts.

## Fix 4: prompt drift (misleading the client; before launch)
In `src/lib/bot/prompts.ts`:
- budget-table minimums must be at least ₪1,500, to match the terms and the refund condition
- delete the CPC-cap formula (~412); the code fixes ₪15. Make the cap match the vertical: lawyers ~₪28–35, locksmiths/dentists ~₪20 per the table
- delete "auto-switches" (~415): phase 2 isn't built yet
- delete "Manual CPC" (~417): the code always uses Maximize Clicks
- delete the locksmith → Local Services Ads rule (~353-357): LSA is not available in Israel (verified)
- the "🚀 לתשלום (9.9 ₪)" line (~382) points to a button that doesn't exist. Its replacement Hebrew comes from Tamar → Noa; until then delete the line.

## Later (Dror specs after launch)
- ad schedule: a default of Sun–Thu 07–20, Fri 07–14, no Shabbat, except urgent trades; then a "your hours" question
- a default negative-intent dictionary for new clients
- weekly clean-up in the first 30 days
- budget_tune becomes an owner-approved proposal
- sitelink Hebrew to Noa: singular, and no reviews sitelink without reviews
- the "+keyword" display in the onboarding plan
- confirm `GOOGLE_ADS_AUTONOMY_LEGAL_VERSION` is set in prod

## Constraints
- Sandbox/test mode only.
- No new Hebrew authored.
- `git diff` shows only the intended Hebrew deletions.
- Never touch the aasada/retter accounts.

## Acceptance
- Unit tests: geo mapping per business type, the block case and Presence; keyword normalisation; the fallback strategy passes validation; a term with calls is never cut; the goal read-back test still passes.
- `npm run test` and `npm run build -- --webpack` pass.
- A sandbox create reads back: location criteria = the named cities (not 2376) with type PRESENCE; call reporting on, the call asset pointing at the new secondary action; keywords as plain text with EXACT/PHRASE; Search Partners off.

## Verifier
Roni re-runs the sandbox read-backs, and verifies step 0 / GA1 (an uploaded verified-lead conversion accepted by Google on the sandbox).
