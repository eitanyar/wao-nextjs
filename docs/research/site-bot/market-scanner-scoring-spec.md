# Site-Bot Market Scanner — Scoring Spec (M1)

Owner: Yonatan (seo-strategist) · Written 2026-11-07 · Mission: `docs/missions/site-bot-market-scanner-2026-11-07.md`
Implementer: nextjs-engineer (M2–M4) · Verifier: Roni.
Status: **spec, no paid call made.** Every price / endpoint claim below was web-checked on 2026-11-07 (sources in §9).
Items marked **[CALIBRATE]** are starting constants that M3 (pilot) can change, with the reason written down.
**Superseded in part by "Revision 2026-11-07 (post-M2)" at the end of this file** — where the two disagree, the
revision wins. §1–§10 below are kept unchanged for history.

---

## 0. Design in one paragraph

A *cell* = profession × city. Stage 1 measures **how many people in the area search for the trade** (Google Ads volume,
geo-targeted by where the searcher is, *not* by putting the city name in the keyword) and **what one click costs**
(CPC, our ticket proxy), plus whether Google even shows a map pack for that trade. Stage 2 pulls the **Google Maps list
for the city** and scores how strong the top 3 are and how weak the rest are. Stage 3 counts **reachable weak
businesses**. Stage 4 = `monthly lead value × (1 − top-3 strength)² × prospect factor`. Saturated cells die at a hard
S3 threshold, so roofing-in-Petah-Tikva gets ruled out for well under a cent.

---

## 1. Profession universe (17)

Keyword-selection rule (deterministic, applied once, result frozen in `config/market-scanner/professions.json`):
1. From `data/batch/<slug>/keywords.json → primaryKeywords`, keep generic head terms only. Drop any term that contains a
   city name, an urgency modifier (`דחוף`, `עכשיו`, `24 שעות`, `חירום`, `קרוב`, `בשבת`), a room-count/sub-symptom
   long tail, or belongs to another profession's head term (e.g. `איתור נזילה` = plumber, not roofing).
2. Order: `volume:"high"` before `"medium"`. Keep 2–4.
3. Add a proposed term (marked *P*) only where the pack misses the bare trade noun or the pack doesn't exist.
4. Terms are **research inputs, not copy**. Frozen once M2 runs; changing one = new run id.

| # | slug | Trade | Head terms (2–4) | Source | Kit | Note |
|---|---|---|---|---|---|---|
| 1 | plumber | אינסטלטור | `אינסטלטור` · `פתיחת סתימה` · `איתור נזילה` | pack | 1 | emergency, high frequency |
| 2 | electrician | חשמלאי | `חשמלאי` · `חשמלאי מוסמך` | pack | 1 | |
| 3 | ac-repair | מזגנים | `טכנאי מזגנים` · `תיקון מזגנים` · `תיקון מזגן` | pack | 1 | strong seasonality; last two may be grouped by Google (see §3.3) |
| 4 | locksmith | מנעולן | `מנעולן` · `פריצת דלת` | pack | 1 | known lead-gen/spam listings → name-stuffing signal matters |
| 5 | pest-control | הדברה | `הדברה` · `מדביר` · `חברת הדברה` | pack | 1 | |
| 6 | movers | הובלות | `הובלות` *P* · `הובלות דירה` · `חברת הובלות` | pack+P | 1 | aggregator-heavy; test it, don't assume |
| 7 | roofing | איטום גגות | `איטום גגות` · `קבלן איטום גגות` · `גגן` | pack | **2** | has fictional rooftop demo site |
| 8 | carpenter | נגר | `נגר` · `נגר בהתאמה אישית` · `נגר לארונות` | pack | 1 | |
| 9 | painter | צבעי | `צבעי` *P* · `צבעי בניין` · `צביעת דירה` | pack+P | 1 | lower ticket — CPC will tell |
| 10 | tiling | ריצוף | `רצף` *P* · `קבלן ריצוף` · `ריצוף` *P* | pack (partial)+P | 1 | `tiler` pack is mostly marble countertops; only `קבלן ריצוף` reused |
| 11 | car-body-repair | פחחות | `פחחות רכב` · `פחח רכב` · `מוסך פחחות וצבע` | pack | 1 | insurer-network risk (§8) |
| 12 | solar | סולארי | `מערכת סולארית` · `התקנת מערכת סולארית` · `פאנלים סולאריים` | P | 0 | very high ticket, low frequency |
| 13 | pergolas | פרגולות | `פרגולות` · `פרגולה מאלומיניום` · `פרגולה מעץ` | P | 0 | |
| 14 | aluminum | אלומיניום | `חלונות אלומיניום` · `עבודות אלומיניום` · `תריס חשמלי` | P | 0 | bare `אלומיניום` excluded — material ambiguity |
| 15 | kitchens | מטבחים | `מטבחים` · `מטבחים בהתאמה אישית` | P | 0 | showroom chains risk — chain filter (§4.4) |
| 16 | renovation | שיפוצים | `קבלן שיפוצים` · `שיפוצים` · `שיפוץ דירה` · `שיפוץ אמבטיה` | P | 0 | |
| 17 | gates-fencing | מסגרות/שערים | `מסגר` · `שער חשמלי` · `גדרות` | P | 0 | |

Kit level (tiebreaker only, never a filter): 2 = demo site exists · 1 = `data/batch/<slug>` pack exists · 0 = none.
(The `emergency-trades` / `skilled-trades` visual themes cover all 17, so themes don't discriminate.)

**Excluded from the 44, with reason**

| Excluded | Reason |
|---|---|
| accountant, insurance/mortgage/pension advisors, translator, web-designer, social-media-manager | knowledge workers / not map-driven — outside the August persona |
| physiotherapist, psychologist, nutritionist, aesthetic-doctor, laser, veterinarian, yoga | clinics / therapists — excluded by brief |
| tutors, driving/swimming instructor, personal-trainer, babysitter, elderly-caretaker, personal-organizer | individuals, often no GBP, low ticket, word-of-mouth driven |
| photographer, florist, event-mc, caterer, private-chef | event/Instagram-driven, weak map intent |
| house-cleaning, gardener, dog-groomer, dog-trainer, phone-repair | low ticket; phone-repair dominated by mall chains |
| mechanic | dense supply, brand/insurer networks; car-body covers the auto slot. Re-add if car-body ranks well |
| parquet (proposed flooring) | different trade from tiling, showroom-led; revisit if tiling ranks top-5 |

---

## 2. Areas — 10 regions, 71 cities

`core` = the anchor city/cities. `ring2` = adjacent smaller towns — the **second-ring hypothesis** (weaker packs,
enough demand) is *tested* by comparing core vs ring2 S3 inside the same region, never assumed.

| Region | core | ring2 |
|---|---|---|
| R1 Gush Dan | תל אביב-יפו, רמת גן, גבעתיים, בני ברק†, חולון, בת ים, פתח תקווה | קריית אונו, אור יהודה, יהוד-מונוסון, ראש העין, גבעת שמואל |
| R2 Sharon | נתניה, הרצליה, רעננה, כפר סבא, הוד השרון, רמת השרון | אבן יהודה, קדימה-צורן, כפר יונה, תל מונד |
| R3 Shfela & Modiin | ראשון לציון, רחובות, נס ציונה, יבנה, לוד, רמלה, מודיעין-מכבים-רעות | גדרה, מזכרת בתיה, באר יעקב, גן יבנה, שוהם |
| R4 Jerusalem | ירושלים | מבשרת ציון, בית שמש†, מעלה אדומים |
| R5 Haifa & Krayot | חיפה | קריית אתא, קריית ביאליק, קריית מוצקין, קריית ים, נשר, טירת כרמל |
| R6 Hadera–Zichron | חדרה | פרדס חנה-כרכור, זכרון יעקב, בנימינה-גבעת עדה, אור עקיבא |
| R7 Jezreel & Lower Galilee | עפולה, נוף הגליל | יקנעם עילית, מגדל העמק, טבריה |
| R8 Western Galilee | כרמיאל, נהריה, עכו | מעלות-תרשיחא, קריית שמונה |
| R9 South coast | אשדוד, אשקלון | קריית מלאכי, קריית גת, שדרות |
| R10 Negev | באר שבע | עומר, אופקים, דימונה, להבים, נתיבות |

† `haredi_majority` flag (Bnei Brak; Beit Shemesh mixed): measured, but excluded from the final top-5 by default —
low Google usage would make packs *look* weak for the wrong reason. Arab-majority towns are out of scope (Hebrew-only).

Config per city (frozen in `config/market-scanner/areas.json`): `region, ring, he_name, ads_location_code,
lat, lng, population, flags`. Population = latest CBS localities file (engineer cites the file + year in the config);
lat/lng = one-time geocode via the existing Places client, cached. A city whose name has **no** Google Ads location
code (checked against the free locations list, §3.1) stays in the matrix with `V_source = imputed`.

---

## 3. Stage 1 — demand & value (whole matrix)

### 3.1 Endpoints

| Purpose | Endpoint | Params | Calls |
|---|---|---|---|
| Location codes (free) | `GET /v3/keywords_data/google_ads/locations/il` | — | 1, cached forever |
| Volume + CPC | `POST /v3/keywords_data/google_ads/search_volume/live` (or `task_post` standard) | `keywords`: all ~50 terms in one task · `location_code`: city code (+1 task at country `2376`) · `language_code: "he"` | 71 + 1 = 72 tasks |
| Map-intent check | `POST /v3/serp/google/organic/live/advanced` (or standard) | first head term · `location_coordinate`: region's first core city `lat,lng` · `language_code: "he"` · `depth: 10` | 17 × 10 = 170 |

- Hebrew SERP `language_code`: docs say ISO 639-1 (→ `he`, as already used in `dataForSeoResearch.ts`), but the CSV
  wasn't visible. **M2 step 0: confirm `he` on the free `/v3/serp/google/languages` endpoint.**
- `location_coordinate` on search_volume only resolves to the *country* (per docs) — city volume **must** use city
  `location_code`s.
- Live Google Ads endpoints: max 12 requests/min/account → 72 tasks ≈ 6 min. Standard queue is cheaper and fine (1–3 h).

### 3.2 Per-cell and per-region volume

```
V_city(p, c)   = Σ over deduped terms t of p: search_volume(t, c)       // null → 0
V_region(p, r) = Σ_c∈r V_city(p, c)
```
`search_volume` is the 12-month average, so seasonality (AC, roofing) is already smoothed. Monthly series is stored
for the output only.

### 3.3 Grouped-volume dedupe (Google Ads behaviour, per DataForSEO docs)
Google Ads returns *combined* volume for near-identical keywords. Rule: within one profession × location, if two terms
return identical `search_volume` **and** identical `monthly_searches` arrays, count that volume **once** (keep the term
that comes first in the config).

### 3.4 Near-zero city volume
```
if V_city_measured(p, c) ≥ 50 → V_cell = measured,             V_source = "measured"
else                          → V_cell = V_region(p, r) × pop(c) / pop(r),  V_source = "imputed"
```
`pop(r)` = sum of the region's city populations. If **> 50 %** of cities return null for all terms, Stage 1 fails
loudly (spec revision: fall back to Google Ads *district* codes as the region unit).

### 3.5 Ticket proxy (CPC)
From the **country-level** task (most stable signal):
```
T_p = Σ_t cpc(t) × sv(t) / Σ_t sv(t)        over terms with non-null cpc
      fallback per term: cpc null → high_top_of_page_bid; both null → term excluded from T_p
```
USD as returned. Regional CPC is stored for display, not used in scoring (too thin).

### 3.6 Map-intent factor
`M(p, r) = 1.0` if the organic SERP contains an item of `type: "local_pack"`, else `0.4`. (No pack = Maps fixes
pay off less.)

### 3.7 Value and pass rule
```
Value_region(p, r) = V_region × T_p × M          // "monthly search-value pool", USD
Value_cell(p, c)   = V_cell   × T_p × M
```
**Stage 1 pass (region level):** `V_region ≥ 150` **and** `Value_region` in the top 50 % of all 170 profession ×
region pairs. Hard cap: at most 40 pairs advance (highest Value first). [CALIBRATE] after the M2 run shows the real
distribution — percentiles are used precisely because we don't know the absolute scale of Israeli CPCs yet.

---

## 4. Stage 2 — competition (survivors; pilot = 3 cells)

### 4.1 Endpoint (verified 2026-11-07 on DataForSEO docs)
`POST /v3/serp/google/maps/live/advanced` (standard: `task_post`/`task_get`).
- `keyword` = head term; run **term 1 and term 2** of the profession; a business's rank = its best rank across both.
- `location_coordinate` = `"lat,lng,13z"` (city centroid) — [CALIBRATE]: pilot also runs `15z`.
- `language_code: "he"`, `depth: 100`. **Billing is per 100 results**, so depth 100 costs the same as depth 20 — we
  score ranks 1–20 but keep 1–100 for Stage 3 at no extra cost. Never exceed 100.
- `search_places`: default (`true`); pilot logs both for one cell to check for difference.

**Fields this endpoint returns (and we use):** `rank_group`, `cid`, `place_id`, `title`, `domain`, `url`,
`rating.value`, `rating.votes_count`, `rating_distribution`, `category`, `additional_categories`, `category_ids`,
`total_photos`, `work_hours`, `is_claimed`, `phone`, `address_info.city`, `latitude`, `longitude`,
`is_directory_item`, `local_justifications`.

**Audit dimensions NOT available from this endpoint:** review recency/velocity, owner reply rate, GBP posts, Q&A,
business description, services/products lists, attributes, photo recency/owner-vs-customer photos, booking setup,
NAP consistency across directories, website quality/speed/schema, grid rank across the city, review authenticity.
(Recency and replies are available later from Business Data → Google Reviews, only for final prospects — M4 option.)

### 4.2 Relevance filter
An item counts only if `category_ids` ∩ profession allowlist ≠ ∅ and `is_directory_item ≠ true`. Allowlist per
profession lives in `professions.json`; **M3 fills it from the pilot responses** (judgment step, written down), e.g.
`roofing_contractor` for roofing. Non-relevant items are skipped and ranks re-numbered.

### 4.3 Shared helpers
```
real_site(b)  = domain present AND domain ∉ NOT_A_SITE
NOT_A_SITE    = facebook.com, instagram.com, wa.me, api.whatsapp.com, linktr.ee, tiktok.com,
                easy.co.il, b144.co.il, d.co.il, midrag.co.il, zap.co.il, yad2.co.il, google.com, sites.google.com
                (list in config; append, never edit silently)
stuffed(b)    = title contains a profession head term OR the cell's city name   // agency/keyword-stuffed name signal
```

### 4.4 Top-3 strength S3 ∈ [0,1]
Per business b in relevant ranks 1–3:
```
s_b = 0.40 × min(1, log10(1+votes) / log10(1+150))       // review mass, saturates at 150 [CALIBRATE]
    + 0.15 × clamp((rating − 3.5) / 1.5, 0, 1)           // 0 if votes < 5
    + 0.20 × real_site(b)
    + 0.10 × min(1, total_photos / 50)                   // [CALIBRATE]
    + 0.15 × stuffed(b)
S3 = (s_1 + s_2 + s_3) / 3        // an empty slot (< 3 relevant results) counts as 0
```
**Kill rule:** `S3 ≥ 0.70` → cell `saturated`, scored 0, no further work. `S3 ≤ 0.40` = `open`.

Multi-location operator: a `domain` that appears in relevant top-20 of ≥ 3 cells in ≥ 2 regions → flag `chain`.
Chains count fully toward S3 (they're the strong incumbents) but are never prospects.

### 4.5 Pack weakness W ∈ [0,1]
Per relevant business in ranks 1–20, gap count `g_b` (0–6):

| Gap | Condition (only fields the endpoint returns) |
|---|---|
| no website | `real_site(b) = false` |
| single category | `additional_categories` empty/null |
| few photos | `total_photos < 10` |
| missing hours | `work_hours` null or empty timetable |
| unclaimed | `is_claimed = false` |
| few reviews | `votes_count < 10` |

`W = mean over ranks 1–20 of min(g_b, 4) / 4`. Shown in the output; feeds the pitch; not in the score directly (P carries it).

---

## 5. Stage 3 — prospects, and Stage 4 — composite

### 5.1 Prospect rule
A business is a prospect for cell (p, c) if **all** hold:
relevant · `phone` present · not `chain` · not directory · `g_b ≥ 2` · alive (`votes ≥ 1` OR `is_claimed`) ·
inside the cell (`address_info.city` = city OR haversine(lat,lng → centroid) ≤ 6 km [CALIBRATE]) · rank ≤ 100.
Each `cid` is assigned to **one** cell only (nearest centroid) so totals never double-count.

`P = prospect count`. **Pass: P ≥ 15.** Ring2 towns with P < 15 may be pooled into one `R<n>-ring2` cluster cell
(sum P, population-weighted S3, summed Value) — outreach to adjacent towns is one campaign. Core cities are never pooled.

### 5.2 Composite score
```
Score = Value_cell × (1 − S3)² × min(1, P / 15)          // "winnable monthly search-value", USD-like
Kill (Score = 0, reason logged): S3 ≥ 0.70 · P < 8 after pooling · haredi_majority (unless --include-flagged) ·
                                 Stage-1 fail
```
Squared discount = a strong top 3 is punished hard (S3 0.8 → ×0.04), which is the cheap rule-out Eitan asked for.

### 5.3 Ordering and tie-breaker (fully deterministic)
Sort by `Score` desc; when two adjacent scores are within 5 % → `kit_level` desc → `P` desc → `S3` asc →
`slug` asc → `city` asc. All floats rounded to 4 dp before sorting.

### 5.4 Output table (committed, aggregates only)
`rank · slug · trade_he · region · city · ring · V_region · V_cell · V_source · T_p_usd · M · value_usd · S3 ·
S3_band · W · P · pooled · kit_level · score · kill_reason · flags · run_id · cache_hits`

Business-level rows (`cid, title, phone, domain, votes, rating, gaps`) go **only** to a gitignored private dir
(e.g. `data/private/market-scan/`, never `data/clients/`), minimal fields.

### 5.5 Engine rules (for Roni)
Cache key = sha256(endpoint + canonical JSON params); cached cell → zero network calls. Hard USD cap per run checked
**before** each call using the price table in §7 (reuse the `maxUsdPerRun` pattern in `dataForSeoResearch.ts`).
Same cache + same config → byte-identical output.

---

## 6. Pilot (M3) — 3 contrasting cells

| Cell | Expectation | Why chosen |
|---|---|---|
| A · roofing × פתח תקווה (R1 core) | **saturated** — S3 ≥ 0.70 | Eitan's own example: crowded, lucrative, big city |
| B · roofing × ראש העין (R1 ring2) | **middle** — S3 0.40–0.70 | same trade, same region, second ring → tests the ring2 hypothesis in isolation |
| C · pergolas × כרמיאל (R8 core) | **weak** — S3 ≤ 0.40 | high ticket, periphery, no batch kit — the opposite profile |

Pilot runs all three regardless of Stage 1 outcome (it validates the method, not the cells).

**Pass criteria for the method:**
1. `S3(A) > S3(B) > S3(C)`.
2. `Score(A)` is the lowest of the three (or A is killed as saturated).
3. Maps top-3 vs Local Finder top-3 overlap ≥ 2 of 3 in each cell (sanity check that Maps ≈ the real pack).
4. Eitan glances at the actual top-3 profiles of A and C and agrees with the band.

If 1–2 fail but Eitan's glance agrees with the data (not the expectation), the expectation was wrong, not the
formula — record it. If his glance disagrees with S3, re-weight §4.4 with the reason written in this file.

Pilot extras (cheap): both zooms (13z / 15z); `search_places` true/false on cell A; one Local Finder call
(`/v3/serp/google/local_finder/live/advanced`, depth 10) and one organic SERP per cell.

---

## 7. Cost (prices read 2026-11-07; the pages carry no "last updated" date — re-check on the day of the paid run)

| Endpoint | Standard | Live | Billing unit |
|---|---|---|---|
| Google Ads search_volume | $0.06 / task | $0.09 / task | 1 task = 1 location × up to 1,000 keywords |
| Google Maps SERP | $0.0006 | $0.002 | per SERP of up to 100 results (depth rounds up to 100s; unreturned depth refunded) |
| Google Organic SERP | $0.0006 | $0.002 | per 10 results |
| Local Finder | — (assume organic rates) | $0.002 assumed | per 10 results — **price not confirmed on a pricing page; treat as ≤ organic until checked** |
| Locations / languages lists | free | free | — |
| (M4 option) Business Info | $0.0015 / profile | $0.0054 | per profile |

**Estimates**

| Run | Calls | Live USD | Standard USD | Proposed hard cap |
|---|---|---|---|---|
| Stage 1, full matrix | 72 volume tasks + 170 organic SERPs | 6.48 + 0.34 = **≈ $6.82** | 4.32 + 0.10 = **≈ $4.42** | **$10** |
| Stage 2 pilot, 3 cells | 3 × 2 terms × 2 zooms = 12 Maps + 1 extra (`search_places`) + 3 Local Finder + 3 organic | **≈ $0.04** | ≈ $0.01 | **$1** |
| (projection) Stage 2 full, ~40 pairs ≈ 200 cells × 2 terms | 400 Maps | ≈ $0.80 | ≈ $0.24 | $3 |

Whole mission, all stages: **under $15.** Note DataForSEO's minimum top-up was cited as $50 (third-party/product
page, not re-verified) — if the account balance is below the cap, that's the real spend decision.

---

## 8. Risks / unknowns → what would change the plan

| Risk | Detection | Plan change |
|---|---|---|
| Israeli towns missing from Google Ads location list, or nulls for small towns | free locations call (M2 step 0); null rate | > 50 % nulls → switch Stage 1 unit to Google Ads districts; impute cities by population |
| Grouped/rounded Ads volumes understate niches (solar, pergolas) | §3.3 dedupe log | accept: CPC and Stage 2 dominate niche ranking |
| Maps-at-centroid ≠ what a phone user sees (proximity dominates in dense cities) | pilot overlap check, two zooms | big cities (> ~150k): add 3 coordinates and average S3 |
| `category_ids` noisy for Hebrew listings | pilot relevance review | fall back to `category` text match on a Hebrew allowlist |
| High CPC partly *is* the saturation signal (agencies bid) | correlation of T_p vs S3 in M2/M3 | none needed — S3² discount already offsets; watch it |
| Review count ≠ review velocity; a strong-looking top 3 may be stale | not visible in Maps | M4: Reviews API on top-3 of final 5 cells only (cents) |
| Insurer-network trades (car-body) / showroom chains (kitchens) | chain flag, Eitan glance | drop the profession, not the method |
| Haredi / mixed markets look falsely weak | flags | excluded by default from top-5 |
| Prices page undated | re-check on run day | update §7 before first paid call |
| Lead-gen spam listings (locksmith, plumber) inflate or deflate S3 | `stuffed` + chain flags | if pilot shows it, add a "same phone across many listings" rule |

---

## 9. Sources (all accessed 2026-11-07)

- Maps SERP pricing: https://dataforseo.com/pricing/serp/google-maps-serp-api
- Maps endpoint fields/params: https://docs.dataforseo.com/v3/serp/google/maps/live/advanced/
- Organic SERP pricing: https://dataforseo.com/pricing/serp/google-organic-serp-api
- Local Finder endpoint: https://docs.dataforseo.com/v3/serp/google/local_finder/live/advanced/
- Search volume pricing ($0.06 std / $0.09 live per task): https://dataforseo.com/keyword-planner-api
- Search volume endpoint (1,000 kw/task, 12 req/min, grouping note, coordinate = country only): https://docs.dataforseo.com/v3/keywords_data-google_ads-search_volume-live/
- Locations list (free, Google geo-target types): https://docs.dataforseo.com/v3/keywords_data/google_ads/locations/
- SERP languages (free, ISO 639-1): https://docs.dataforseo.com/v3/serp/google/languages/
- Business Info pricing (M4 option): https://dataforseo.com/google-business-profile-data-api

Not verified (deliberately left to M2 step 0, free calls): Israel city/district `location_code`s, Hebrew SERP
`language_code`, Local Finder price.

## 10. Handoffs
- **nextjs-engineer** — M2: config files (§1, §2), Stage-1 engine + fixtures, free calls first, then paid run ≤ $10
  after Eitan's OK. M3: Stage 2 pilot ≤ $1.
- **verifier (Roni)** — determinism, cap halt, zero network on cached cell, `git diff data/clients/` empty.
- **Yonatan** — reviews M2 distribution → sets the Stage-1 percentile/cap; reviews M3 → re-weights §4.4 if needed.
- **Eitan** — approve spend; glance at pilot top-3 profiles.
- No keyword anchor / title formula is touched by this mission.

---
---

# Revision 2026-11-07 (post-M2)

Owner: Yonatan · Inputs: run `745416b2b68f` (Stage 1 full matrix + Stage 2 pilot), engineer findings 1–5, Eitan's
requirements 6–9 (approved 2026-11-07). Sections R1–R10 **override** the matching original sections. Business-level
data stays in `data/market-scan/private/` — nothing below names a business.

## R0. What the M2 run taught us (one paragraph)

The original pilot "failed" for the wrong reason: Maps-at-centroid is **not** the pack a searcher sees. At 13z it
ranked a 0-review, unclaimed, keyword-named listing #1 for roofing × Petah Tikva, and Maps-vs-Local-Finder top-3
overlap was only 1/3 in A and C. Recomputed from **Local Finder top 3** (Google's own "more places" list for the
query, i.e. the expanded pack), S3 = **A 0.92 saturated · B 0.66 middle · C 0.73 saturated**. A > B holds (core vs
ring2, same trade). C was *our expectation* being wrong, not the formula: the Karmiel pergola pack is genuinely strong
(488 / 44 / 1,000 reviews, one national chain). Per §6's own rule, data beats expectation → C reclassified
**saturated**, pending Eitan's glance. Stage 1 worked (null cities 3/71 = 4 %), but 40 slots went mostly to three
urgency trades, and 68 % of cells are population-imputed.

## R1. S3 source — decision (resolves finding 1)

**Decided: S3 comes from Local Finder top 3. Maps is the prospect pool, not the strength meter.**

| Job | Endpoint | Params | Cost / cell |
|---|---|---|---|
| Top-3 strength (S3) | `/v3/serp/google/local_finder/live/advanced` | term 1 only · centroid `lat,lng,13z` (same string the pilot used) · `language_code: "he"` · `depth: 10` | $0.002 |
| Prospect pool + details | `/v3/serp/google/maps/live/advanced` | terms 1 + 2 · centroid 13z · `he` · `depth: 100` · `search_places` default | 2 × $0.002 |
| Directory share + pack cross-check | `/v3/serp/google/organic/live/advanced` | term 1 · centroid · `he` · `depth: 10` | $0.002 |

Rules:
1. **LF top 3 taken as-is** — no relevance filter, no re-numbering. Whatever Google puts in those three slots is the
   competition for the slot, relevant or not (an off-trade listing in the top 3 is weak and scores low on its own).
2. **Join by `cid`** to the Maps pool for details (`total_photos`, `additional_categories`, `is_claimed`, …). If an
   LF top-3 business is absent from the Maps pool, use the LF item's own fields; any `s_b` component whose field is
   missing is **dropped and the remaining weights renormalised** (never scored as 0 — that would fake weakness).
3. §4.4 weights and the 0.70 / 0.40 bands are **unchanged** — the recomputed pilot separates cells sensibly with them.
4. **Cross-check (logged, not scored):** overlap of LF top 3 vs the organic SERP's `local_pack` items. Expect ≥ 2/3.
5. **Two-step order (cheap rule-out first):** per cell run LF + organic ($0.004) → compute S3 → if `S3 ≥ 0.70` stop
   (saturated, Maps never bought). Only survivors buy the 2 Maps calls. This is the "rule out Petah-Tikva roofing for
   under a cent" mechanic, now actually true.

## R2. Zoom and search_places (resolves finding 5)

13z only. 15z is dropped (it returned 3–14 items per query — too tight to build a pool). `search_places`: the A check
gave 20/20 top-20 overlap → keep the default, stop logging the variant.

## R3. Language codes — §3.1 corrected (resolves finding 3)

Verified by the engineer on the free list endpoints, 2026-11-07:
- **Google Ads endpoints (`keywords_data/google_ads/*`): `language_code: "iw"`.** `he` is not in the Ads list.
- **SERP endpoints (organic, maps, local_finder): `language_code: "he"`.**
Both are config values, never hardcoded.

## R4. Relevance filter — category rules for all 17 (resolves finding 2)

Hebrew Maps items return **no `category_ids`**, only localized text, so relevance is a **text rule**, not an id list.
I **approve the engineer's roofing set** as-is and **tighten pergolas**: "aluminum supplier" and "fence contractor"
count only when the title carries a pergola term (the Karmiel evidence was the title, not the category).

Rule per item (applies to the Maps prospect pool and W only — not to LF top 3, see R1.1):
```
relevant(b) = not directory AND (
     any category ∈ exact                                   // category or additional_categories
  OR any category contains a stem in contains, and no exclude stem
  OR (primary category ∈ GENERIC OR null) AND title contains a title_terms stem
  OR any category ∈ conditional AND title contains a title_terms stem )
GENERIC = קבלן · קבלן כללי · Service establishment · שירות תחזוקה · משרדי החברה · יצרן · שירות עסק-לעסק
```
`exact` strings marked † were seen in the pilot catalog; the rest are my best reading of Google's Hebrew category
names and are **provisional** until the M3/M4 catalog shows them. The engine must write, per cell, every top-20
category text that matched nothing into diagnostics so I can extend the rules (append-only, dated).

| slug | exact | contains | conditional (needs title term) | exclude |
|---|---|---|---|---|
| plumber | שרברב† · אינסטלטור | שרברב · אינסטלצ · אינסטלטור · נזילות · סתימות · ביוב | — | חנות |
| electrician | חשמלאי† · קבלן חשמל | חשמלאי · קבלן חשמל | — | חנות · רכב · מכשירי |
| ac-repair | שירות תיקונים למזגנים† · קבלן מיזוג אוויר† | מזגנ · מיזוג אוויר | — | חנות · רכב |
| locksmith | מנעולן† | מנעולן · מנעולים | — | חנות |
| pest-control | שירות הדברה† | הדברה · מדביר | — | חנות |
| movers | חברת הובלות · מוביל | הובלות · הובלה · מובילים | שירות השכרת נגררים† | השכרת רכב · שליחויות |
| roofing | שירות איטום מפני חדירת מים† · חברת איטום† · גגן† | איטום · גגן · גגות | שיפוצניק† · קבלן בידוד† | חנות |
| carpenter | נגר† · נגרות† | נגר | בונה דקים† | חנות · רצפות |
| painter | צבע† · קבלן צבע | צביעה · צבעי | — | חנות · מוצרי · רכב · מוסך |
| tiling | קבלן ריצוף† | ריצוף · רצף | — | חנות · שיש |
| car-body-repair | מוסך פחחות | פחחות · פחח | מוסך† · תיקון ותחזוקה של כלי רכב† | זגגות · אזעקות · סטריאו · חנות |
| solar | — | סולאר · פאנלים | ספק חומרי בניין† | דוד |
| pergolas | יצרן פרגולות וגגונים לרכב† · ספק סוככים† · ספק סגירת פטיו† | פרגול | ספק אלומיניום† · קבלן גדרות† · בונה דקים† · נגרות† | — |
| aluminum | חלון אלומיניום† · ספק אלומיניום† · ספק מסגרות אלומיניום† · שירות התקנת חלונות† · ספק חלונות† | אלומיניום · חלונות · תריס | — | חנות · רכב |
| kitchens | — | מטבח | נגר† · נגרות† | כלי · ציוד · מסעד |
| renovation | שיפוצניק† · קבלן כללי† · שירות שיפוץ משרדים† | שיפוץ · שיפוצ | קבלן† · קבלן בנייה† · חברת בנייה† | חנות |
| gates-fencing | קבלן גדרות† · מפעל ברזל† · בית מלאכה למתכות† · קבלן מעקות† | מסגר · גדר · שער | — | חנות |

`title_terms` per profession = its §1 head terms + the `contains` stems (pergolas: `פרגול`; roofing: `איטום · גג`).
A business may be relevant to several professions — that's fine, the cell is profession × city.
Exclusions confirmed for roofing: general contractor, plumber, insulation contractor, building-materials stores (stay
out unless the title says roofing — see conditional).

## R5. Stage 1 cut-offs and the value formula (resolves finding 4)

Real distribution: 81 / 170 pairs passed (`V_region ≥ 150` and top 50 % by value), the cap took 40 (value ≥ $2,620),
and 21 of those 40 were three urgency trades — plumber 9, movers 6, locksmith 6 — while tiling, carpenter and solar
never entered.

Decisions:
1. **Keep the pass rule** (`V_region ≥ 150`, top 50 % → 81 pairs). The 50 % percentile is calibrated, not guessed.
2. **Keep the overall cap at 40, add a per-profession cap of 4 regions** (highest value first). Walking the real
   table with this rule advances 40 pairs across **15 of 17 professions** (all but tiling, carpenter), cut-off value
   ≈ $1,827. One trade can no longer eat the funnel; the top regions for each trade still get in.
3. **Value formula: no change, but a new flag.** Locksmith CPC ($12.17) is above roofing ($8.51), and plumber
   ($8.50) equals it, though a lockout or a blocked drain is a fraction of a roof job's ticket. That's because CPC = conversion rate × value
   per lead: emergency clicks convert almost 100 % and are bid up by lead-gen brokers. So CPC is a good **value per
   search** proxy (which is what a Maps fix sells) but a poor **ticket** proxy. I'm not damping it with an invented
   constant. Instead: (a) the per-profession cap above fixes concentration; (b) plumber, locksmith, movers get
   `urgency_lead_gen: true` → Stage 2 applies the **lead-gen phone rule** (a phone on ≥ 2 listings in a cell, or in
   ≥ 3 cells → `lead_gen`: never a prospect, counts fully toward S3); (c) Eitan sees the flag in the top-5 table.
   Revisit only if M4 shows urgency cells win on score but lose on Eitan's glance.
4. **Grouped-volume dedupe fix (§3.3):** the run flagged ~180 "grouped" terms that were simply both at Google's
   10-search floor. Apply the dedupe only when `search_volume ≥ 50`; below that, sum.
5. Imputation (68 % of cells) stays as specified; `V_source` is shown, and it can only move cells *within* a region
   by population, which is the honest fallback.

## R6. Who is a prospect — weak local ranking (Eitan requirement 6)

**The target is any real business in a winning cell that does not rank, website or not.** We rebuild the site on
their own domain, so having a site is not a disqualifier. Gaps are pitch material, not the gate.

```
weak_ranking(b) = b ∉ LF top 3 (term 1) AND best Maps rank over terms 1–2 ≥ 4
prospect(b)     = relevant · phone present · not chain · not lead_gen · not directory ·
                  alive (votes ≥ 1 OR is_claimed) · inside the cell (§5.1 radius, unchanged) · weak_ranking
w_b             = 1.25 if no real site   (bonus, as Eitan asked: "slightly higher")
                  1.10 if real site AND weak_site (R8)
                  1.00 if real site AND site OK, or site check not run
P_w             = Σ w_b over prospects;  P = plain count (displayed)
```
The old `g_b ≥ 2` gate is removed. Pass / kill now use **P_w**: pass `P_w ≥ 15`, kill `P_w < 8` (after pooling, §5.1).

## R7. Organic directory share (Eitan requirement 7)

**Why:** site-bot sells *site + GBP*. Where the organic top 10 for the head term is local business sites, a good site
can rank by itself and the pitch is strongest. Where directories own it, the GBP fix still works but the site is
weaker leverage.

**Who dominates in Israel (web-checked 2026-11-07, confidence medium):** Ahrefs' competitor page for pro.co.il lists
easy.co.il (~1.6M organic visits), d.co.il / Dapei Zahav (~563K), midrag.co.il (~549K), b144.co.il (~527K), then a long
tail of lead-gen aggregators — top-renovations.co.il, shiplus.co.il, adbarabetuha.co.il, moving-israel.co.il,
piper.co.il; pro.co.il itself ~46K (Ahrefs estimates, page undated, © 2026). Live Hebrew searches on 2026-11-07 for
roofing and renovation queries returned midrag.co.il, pro.co.il and d.co.il city pages on page one; movers queries
return portal-style aggregators and sponsored "compare movers" content (hon.co.il, kikar.co.il). Zap/yad2 did not
surface for service queries — kept in the list for safety.

**Classification of each organic result (positions 1–10, `type: "organic"` only), first match wins:**
1. `directory` — domain ∈ `organic_directories` (config, append-only).
2. `social` — facebook / instagram / youtube / tiktok / linkedin.
3. `media_info` — domain ∈ `organic_media` (news, gov, wiki, forums) or path is an article on a publisher.
4. `local_site` — domain equals the `domain` of any business in this cell's Maps pool (strongest evidence).
5. `national_brand` — domain is `chain`-flagged, or appears in the organic top 10 of the same profession in ≥ 3 regions.
6. `local_site` — anything else that looks like a business site (default).

```
L_share = local_site count / organic results counted (≤ 10)
D_share = directory count  / organic results counted        // displayed
O       = 0.80 + 0.40 × L_share                              // 0.80 (all directories) … 1.20 (all local sites)
```
O is a gentle multiplier, never a kill: a directory-owned SERP still has a map pack to win.
Also log per cell `has_ai_overview` (item `type: "ai_overview"`) — informational only; our earlier finding is that
Google AI Overviews cite publishers, not local businesses, so it doesn't move the score.

**Blocker found while reviewing the cache (engineer, M3 step 0):** in the cached organic responses
(`data/market-scan/cache/serp_google_organic_live_advanced/`) every `type: "organic"` item has
`domain: "google.com"`, while local-pack / paid items carry real domains (e.g. a site-builder domain). Either the
cache slimmer reads the wrong field or the stored item is a Google redirect. Directory share can't be computed until
organic items keep real `domain`, `url`, `title`. Fix the slimmer; re-fetch only if the raw response is gone
($0.002 per SERP).

## R8. Homepage-quality check (Eitan requirement 8)

Free — our own HTTP fetch, **homepage only**, for prospects with a real site, plus the LF top 3 (for the pitch's
"what the winners do" line).

**Fetch rules:** GET `https://<domain>/`, ≤ 5 redirects, 10 s timeout, read ≤ 1.5 MB, honest user agent
(`WAO-MarketScan/1.0 (+https://www.wao.co.il)`), 1 request per host, concurrency 2. Check `robots.txt` first; if `/`
is disallowed for `*`, skip (`site_check: "skipped_robots"`, w_b = 1.00). If HTTPS fails, retry once over `http://`.
Cache derived fields only (never raw HTML), same cache-key rule, 30-day retention like the audit reports.

| Field | Rule |
|---|---|
| `fetch_ok` | final status 2xx and HTML; parked page (≤ 2 KB with no `<h1>`, or "domain for sale"-type title) = false |
| `https` | final URL is `https://` with a valid certificate |
| `viewport` | `<meta name="viewport">` content contains `width=device-width` |
| `city_hit` | `<title>` or first `<h1>` contains the cell's `he_name` (or an alias from `areas.json`) |
| `service_hit` | `<title>` or first `<h1>` contains any profession `title_terms` stem |
| `multi_page` | ≥ 3 distinct same-host internal paths in `<a href>` (ignore `/`, `#…`, `tel:`, `mailto:`, WhatsApp, query-only) |
| `fetch_ms` | total time to last byte of the HTML (rough — measured from our server, not a phone; label it that way) |
| `platform` | generator meta / asset host hints: wix · wordpress · elementor · b144websites · google-sites · other (feeds the hosting pitch) |

**Weak-site rule:**
```
hard = NOT fetch_ok OR NOT https OR NOT viewport
soft = NOT service_hit + NOT city_hit + NOT multi_page + (fetch_ms > 3000)
weak_site = hard OR soft ≥ 2
```
(Rationale: a site with no city and no service in its title/H1 is invisible for "<service> in <city>", and a
single-page site has nowhere to rank for anything else. Either one alone is common and fixable; two together = we
rebuild.) Optional later, final prospects only: Google's free PageSpeed Insights API for real mobile field data.

## R9. Hosting-price check for "hosting + domain included" (Eitan requirement 9)

Read 2026-11-07. USD→ILS at ≈ ₪3.0 per $ (mid-2026 press puts the dollar at ₪2.9–3.1; today's Bank of Israel rate
not confirmed). Confidence: medium — public list prices, not what each business actually negotiated.

| What a small business pays for | Typical monthly price | Source (accessed 2026-11-07) |
|---|---|---|
| Website builder (Wix Light / Core / Business, annual billing) | $17.77 / $29.77 / $39.77 ≈ ₪53 / ₪89 / ₪119; free domain for **year 1 only** (voucher, not renewals) | wix.com/upgrade/website |
| Cheap shared hosting (Hostinger IL Premium / Unlimited) | ₪7.99–8.99 intro on a 48-month prepay, **renews at ₪40.99–49.99**; domain free year 1 | hostinger.com/il/pricing |
| Israeli shared hosting, small site (guide range) | ₪25–56 | b144.co.il magazine, hosting guide (undated) |
| Israeli managed WordPress hosting (uPress) | ₪47.91 / ₪79.85 / ₪159.70 + VAT | upress.co.il |
| Agency WordPress maintenance (hosting **not** included) | from ₪300 + VAT | savvy.co.il/wordpress-maintanence |

**Pitch read:** a DIY owner already pays roughly ₪40–120/mo for platform + hosting, and the domain is "free" only
the first year. An owner with a freelancer/agency typically pays ₪300+ for upkeep *on top of* hosting. So
"hosting + domain included" is worth stating in shekels (≈ ₪50–150/mo avoided, more vs agency upkeep) — Tamar frames
it, Noa gates it. The `platform` field from R8 lets the personal report say which bill they'd drop.

## R10. Composite score (overrides §5.2)

```
Score = Value_cell × (1 − S3)² × min(1, P_w / 15) × O
Kill:   S3 ≥ 0.70 · P_w < 8 after pooling · haredi_majority (unless --include-flagged) · Stage-1 fail
```
Tie-break (§5.3) unchanged, with `P_w` in place of `P`.

## R11. M3 re-run

**Cells (6).** Keep A/B/C (all inputs cached except a possible organic re-fetch, see R7 blocker) and add three
high-ticket cells from the Stage-1 top list in R3 (Shfela & Modiin), where roofing is #8 and renovation #24:

| Cell | Expected S3 band | Why |
|---|---|---|
| A · roofing × פתח תקווה (R1 core) | saturated (recomputed 0.92) | control — must die at step 1, before Maps is bought |
| B · roofing × ראש העין (R1 ring2) | middle (0.66) | control — ring2 vs A |
| C · pergolas × כרמיאל (R8 core) | saturated (0.73) — expectation revised | control — Eitan's glance confirms or overturns |
| D · roofing × רחובות (R3 core) | middle | high CPC trade, mid-size core city outside Gush Dan |
| E · roofing × גדרה (R3 ring2) | open or middle | second test of the ring2 hypothesis, in a second region |
| F · renovation × ראשון לציון (R3 core, big city) | saturated or high-middle, low L_share | directory-heavy trade — tests R7 at the extreme |

**Expected ordering.** S3: A > C > F ≥ B ≈ D > E. Score: A and C killed; E or D first, B close; F last of survivors
(low O).

**Method pass criteria (M3):**
1. A killed at step 1 (S3 ≥ 0.70) without buying Maps calls.
2. Ring2 hypothesis: S3(A) > S3(B) **and** S3(D) > S3(E). Both true → hypothesis supported; one → inconclusive, M4
   keeps ring2 measured as normal; neither → drop ring2 pooling preference.
3. LF top 3 vs organic `local_pack` overlap ≥ 2/3 in ≥ 5 of 6 cells.
4. F shows `D_share` > `L_share`; at least one roofing cell shows `L_share` ≥ 0.3 (otherwise R7's lists are wrong).
5. Homepage check runs on every prospect with a site with < 5 % fetch errors not explained by the site itself.
6. Eitan glances at the LF top 3 of A, C and the best-scoring cell and agrees with the band.

**Proximity probe (logged only):** for A and F (cities > 150k) run 2 extra LF calls at ≈ 3 km north/south of the
centroid; report how many of the centroid top 3 survive. If < 2/3 on average, M4 big cities use 3-point mean S3.

**Cost (live prices, unchanged since §7):**

| Item | Calls | USD |
|---|---|---|
| D, E, F — LF + organic | 6 × $0.002 | 0.012 |
| D, E, F — Maps 2 terms (survivors only; assume all 3) | 6 × $0.002 | 0.012 |
| A/B/C organic re-fetch (only if the raw response is gone) | 3 × $0.002 | 0.006 |
| Proximity probe A, F | 4 × $0.002 | 0.008 |
| Homepage checks | own HTTP | 0 |
| **Total** | | **≈ $0.04** (cap stays $1) |

**M4 projection with these rules:** the 40 advancing pairs cover ≈ 412 cells. Step 1 (LF + organic) ≈ 412 × $0.004
= $1.65; Maps for non-saturated survivors (assume half) ≈ $0.82 → **≈ $2.50**, inside the §7 $3 projection. If
fewer than ~40 % die at step 1, it nears $3.30 → needs a cap decision from Eitan before M4.

## R12. Config for the engineer (proposed — engineer applies; Yonatan does not edit `config/`)

Merge into `config/market-scanner/run-config.json` (replace `stage2.category_allowlist` with `category_rules`; drop
`zooms` 15z, `prospect_min_gaps`, `prospect_pass`, `prospect_kill_below`; keep everything not listed). Category ids
can be derived from these texts with the existing `categoryId(text)`; contains/conditional rules need a small engine
change.

```json
{
  "languages": { "ads_language_code": "iw", "serp_language_code": "he" },
  "stage1": {
    "min_city_volume_measured": 50,
    "min_region_volume": 150,
    "value_top_fraction": 0.5,
    "max_pairs_advancing": 40,
    "max_pairs_per_profession": 4,
    "grouped_dedupe_min_volume": 50,
    "urgency_lead_gen_professions": ["plumber", "locksmith", "movers"]
  },
  "stage2": {
    "zooms": ["13z"],
    "primary_zoom": "13z",
    "s3_source": "local_finder",
    "s3_terms": 1,
    "s3_relevance_filter": false,
    "s3_missing_field_policy": "renormalize",
    "local_finder_depth": 10,
    "maps_terms": 2,
    "maps_depth": 100,
    "two_step": true,
    "organic_depth_cell": 10,
    "organic_store_fields": ["type", "rank_group", "rank_absolute", "domain", "url", "title"],
    "pack_crosscheck_min_overlap": 2,
    "weak_rank_min": 4,
    "prospect_weights": { "no_site": 1.25, "weak_site": 1.10, "ok_site": 1.0, "unchecked": 1.0 },
    "prospect_pass_weighted": 15,
    "prospect_kill_below_weighted": 8,
    "lead_gen_phone_min_listings_in_cell": 2,
    "lead_gen_phone_min_cells": 3,
    "organic_factor": { "base": 0.80, "slope": 0.40 },
    "national_brand_min_regions": 3,
    "not_a_site_append": ["pro.co.il", "top-renovations.co.il", "shiplus.co.il", "adbarabetuha.co.il",
      "moving-israel.co.il", "piper.co.il", "youtube.com", "linkedin.com", "waze.com", "business.site", "g.page"],
    "organic_directories": ["easy.co.il", "d.co.il", "midrag.co.il", "b144.co.il", "pro.co.il", "zap.co.il",
      "yad2.co.il", "top-renovations.co.il", "shiplus.co.il", "adbarabetuha.co.il", "moving-israel.co.il", "piper.co.il"],
    "organic_social": ["facebook.com", "instagram.com", "youtube.com", "tiktok.com", "linkedin.com"],
    "organic_media": ["ynet.co.il", "walla.co.il", "mako.co.il", "kikar.co.il", "bhol.co.il", "calcalist.co.il",
      "themarker.com", "globes.co.il", "hon.co.il", "financa.co.il", "wikipedia.org", "gov.il"],
    "generic_categories": ["קבלן", "קבלן כללי", "Service establishment", "שירות תחזוקה", "משרדי החברה", "יצרן", "שירות עסק-לעסק"],
    "category_rules": {
      "plumber":        { "exact": ["שרברב", "אינסטלטור"], "contains": ["שרברב", "אינסטלצ", "אינסטלטור", "נזילות", "סתימות", "ביוב"], "conditional": [], "exclude": ["חנות"] },
      "electrician":    { "exact": ["חשמלאי", "קבלן חשמל"], "contains": ["חשמלאי", "קבלן חשמל"], "conditional": [], "exclude": ["חנות", "רכב", "מכשירי"] },
      "ac-repair":      { "exact": ["שירות תיקונים למזגנים", "קבלן מיזוג אוויר"], "contains": ["מזגנ", "מיזוג אוויר"], "conditional": [], "exclude": ["חנות", "רכב"] },
      "locksmith":      { "exact": ["מנעולן"], "contains": ["מנעולן", "מנעולים"], "conditional": [], "exclude": ["חנות"] },
      "pest-control":   { "exact": ["שירות הדברה"], "contains": ["הדברה", "מדביר"], "conditional": [], "exclude": ["חנות"] },
      "movers":         { "exact": ["חברת הובלות", "מוביל"], "contains": ["הובלות", "הובלה", "מובילים"], "conditional": ["שירות השכרת נגררים"], "exclude": ["השכרת רכב", "שליחויות"] },
      "roofing":        { "exact": ["שירות איטום מפני חדירת מים", "חברת איטום", "גגן"], "contains": ["איטום", "גגן", "גגות"], "conditional": ["שיפוצניק", "קבלן בידוד"], "exclude": ["חנות"] },
      "carpenter":      { "exact": ["נגר", "נגרות"], "contains": ["נגר"], "conditional": ["בונה דקים"], "exclude": ["חנות", "רצפות"] },
      "painter":        { "exact": ["צבע", "קבלן צבע"], "contains": ["צביעה", "צבעי"], "conditional": [], "exclude": ["חנות", "מוצרי", "רכב", "מוסך"] },
      "tiling":         { "exact": ["קבלן ריצוף"], "contains": ["ריצוף", "רצף"], "conditional": [], "exclude": ["חנות", "שיש"] },
      "car-body-repair":{ "exact": ["מוסך פחחות"], "contains": ["פחחות", "פחח"], "conditional": ["מוסך", "תיקון ותחזוקה של כלי רכב"], "exclude": ["זגגות", "אזעקות", "סטריאו", "חנות"] },
      "solar":          { "exact": [], "contains": ["סולאר", "פאנלים"], "conditional": ["ספק חומרי בניין"], "exclude": ["דוד"] },
      "pergolas":       { "exact": ["יצרן פרגולות וגגונים לרכב", "ספק סוככים", "ספק סגירת פטיו"], "contains": ["פרגול"], "conditional": ["ספק אלומיניום", "קבלן גדרות", "בונה דקים", "נגרות"], "exclude": [] },
      "aluminum":       { "exact": ["חלון אלומיניום", "ספק אלומיניום", "ספק מסגרות אלומיניום", "שירות התקנת חלונות", "ספק חלונות"], "contains": ["אלומיניום", "חלונות", "תריס"], "conditional": [], "exclude": ["חנות", "רכב"] },
      "kitchens":       { "exact": [], "contains": ["מטבח"], "conditional": ["נגר", "נגרות"], "exclude": ["כלי", "ציוד", "מסעד"] },
      "renovation":     { "exact": ["שיפוצניק", "קבלן כללי", "שירות שיפוץ משרדים"], "contains": ["שיפוץ", "שיפוצ"], "conditional": ["קבלן", "קבלן בנייה", "חברת בנייה"], "exclude": ["חנות"] },
      "gates-fencing":  { "exact": ["קבלן גדרות", "מפעל ברזל", "בית מלאכה למתכות", "קבלן מעקות"], "contains": ["מסגר", "גדר", "שער"], "conditional": [], "exclude": ["חנות"] }
    },
    "title_terms_extra": { "pergolas": ["פרגול"], "roofing": ["איטום", "גג"] }
  },
  "homepage_check": {
    "enabled": true,
    "scope": ["prospects_with_site", "lf_top3"],
    "user_agent": "WAO-MarketScan/1.0 (+https://www.wao.co.il)",
    "timeout_ms": 10000,
    "max_redirects": 5,
    "max_bytes": 1500000,
    "concurrency": 2,
    "respect_robots": true,
    "multi_page_min_internal_paths": 3,
    "slow_fetch_ms": 3000,
    "parked_max_bytes": 2048,
    "weak_soft_min": 2,
    "cache_retention_days": 30
  },
  "pilot": {
    "cells": [
      { "id": "A", "profession": "roofing",    "city": "petah-tikva",   "expect": "saturated", "proximity_probe": true },
      { "id": "B", "profession": "roofing",    "city": "rosh-haayin",   "expect": "middle" },
      { "id": "C", "profession": "pergolas",   "city": "karmiel",       "expect": "saturated" },
      { "id": "D", "profession": "roofing",    "city": "rehovot",       "expect": "middle" },
      { "id": "E", "profession": "roofing",    "city": "gedera",        "expect": "open" },
      { "id": "F", "profession": "renovation", "city": "rishon-lezion", "expect": "saturated", "proximity_probe": true }
    ],
    "proximity_probe_offset_km": 3,
    "search_places_check_cell": null
  }
}
```
(City slugs `rehovot`, `gedera`, `rishon-lezion` confirmed present in `areas.json`.)

## R13. Handoffs (post-M2)

- **nextjs-engineer** — M3 step 0: fix the organic cache slimmer (R7 blocker). Then apply R12, implement R1 two-step,
  R4 text rules + unmatched-category diagnostics, R6 prospect rule, R7 classifier, R8 homepage check; fixtures for each;
  run M3 within the $1 pilot cap.
- **verifier (Roni)** — determinism on cache; A stops before any Maps call; cap halt; homepage check never stores raw
  HTML; `git diff data/clients/` empty; no business names/phones in committed outputs.
- **Yonatan** — review M3 output + unmatched-category diagnostics; extend R4 rules (append-only, dated).
- **Eitan** — glance at LF top 3 for A, C and the top cell; M4 cap decision only if step-1 kill rate < ~40 %.
- **Tamar → Noa** (later, after M4) — "hosting + domain included" framing using R9 and the per-prospect `platform`.
- No keyword anchor / title formula is touched.

---
---

# Revision 2 — 2026-11-07 (post-M3)

Owner: Yonatan · Inputs: run `df19e422e595` (M3 pilot, spend $0.034), `stage2-pilot.*`,
`stage2-category-diagnostics.json`, `stage2-proximity.json`, private rows in `data/market-scan/private/` (read, nothing
business-level copied here). **Where Revision 2 disagrees with §1–§10 or R0–R13, Revision 2 wins.**

## 2.0 What M3 taught us

| Criterion (R11) | Result | Verdict |
|---|---|---|
| 1. A killed at step 1, no Maps bought | S3 0.919, 0 Maps calls | pass |
| 2. Ring2: A > B and D > E | A > B holds, D > E fails | inconclusive → ring2 measured as normal, pooling unchanged |
| 3. LF vs organic `local_pack` overlap ≥ 2/3 in ≥ 5/6 | 3/3 in 6/6 | pass — LF is the pack |
| 4. F `D_share` > `L_share`; a roofing cell `L_share` ≥ 0.3 | F 0.625 > 0.375; roofing 0.71–1.0 | pass, but `L_share` inflated (2.2) |
| 5. Homepage errors < 5 % not explained by the site | D 0/5, F 4/18 | re-judge after 2.5 (anti-bot ≠ site failure) |
| 6. Eitan glances at LF top 3 of A, C, best cell | not done yet | **open** |

Two structural findings drive most decisions below:
- **Service-area spillover.** Roofing is a service-area trade: the same strong roofers fill the LF top 3 of several
  nearby cities (one business sits in the top 3 of A, B and E; another in A and B; D's #1 is E's #1). A ring2 town next
  to a strong core inherits the core's incumbents. That is real competition, not a scoring bug. It's why B looks
  like A and why D > E failed.
- **Organic results barely change by city for roofing.** B, D, E share nearly the same organic top 7. So whether a
  host is "local" has to be proven (Maps-pool match, or not national), not assumed.

Stage-1 note: the engineer's real cut-off ($1,906) replaces my hand-walked ≈ $1,827. Same 15/17 professions advance
(tiling and carpenter are out). Accepted.

## 2.1 Step-1 S3 inflation — decision

**Diagnosis.** The inflation comes from renormalisation, not from the keyword-in-name weight. LF items never carry a
website or photo count, so dropping those fields and renormalising (÷ 0.70) treats unknown as "as strong as the
reviews". A 3-review keyword-named listing reaches 0.37 that way. A 66-review roofer with no known site reaches 0.91.
With full data the same roofer could score anywhere from 0.64 to 0.94.

**Keep keyword-in-name at 0.15.** It's a real strength signal right now: Whitespark's study (published 2026-09-08,
1.4M+ listings, 17 industries) shows exact-match names have top-3 rates several times higher than names with no
keyword in most industries (e.g. retail 15.1 % vs 3.1 %). Confidence: high on direction, medium on size for Israel.

**Rule (replaces R1.2's "renormalise" and the step-1 use of the 0.70 gate):**
```
missing component (site, photos, or any field absent after the join) → credit = 0.5 × its weight   // "neutral"
S3_step1  = S3 from LF top 3 with neutral fill                // at step 1 = 0.70 × S3_renorm + 0.15
step-1 kill   iff S3_step1 ≥ 0.75                            // ≈ renormalised 0.857 — clear saturation only
otherwise     → buy step 2 (Maps × 2 + organic), join by cid, recompute S3 (neutral fill only for unjoined items)
final kill    iff S3_joined ≥ 0.70   (bands 0.70 / 0.40 unchanged — they were calibrated on full data)
log per cell: S3_step1, S3_low (missing = 0), S3_high (missing = 1)
```
Why the 0.75 gate is safe: a wrong survival costs $0.006 (step 2), while a wrong kill throws away a cell for good.
So step 1 kills only what can't plausibly come back under 0.70.

**Pilot re-scored** (step-1 from the engineer's numbers; joined S3 for D and F is unchanged because all three LF
items joined, so neutral fill never applies):

| Cell | S3 old (renorm) | S3_step1 new | [low – high] | Step-1 outcome | Final S3 / band |
|---|---|---|---|---|---|
| A roofing × Petah Tikva | 0.919 | **0.793** | 0.64 – 0.94 | killed | saturated |
| B roofing × Rosh HaAyin | 0.734 | 0.664 | 0.51 – 0.81 | buy step 2 | pending Maps (M4 buys it) |
| C pergolas × Karmiel | 0.764 | 0.685 | 0.53 – 0.83 | buy step 2 | pending Maps (calibration buy, 2.11) |
| D roofing × Rehovot | 0.541 | 0.529 | 0.38 – 0.68 | step 2 | 0.528 middle |
| E roofing × Gedera | 0.724 | 0.657 | 0.51 – 0.81 | buy step 2 | pending Maps (M4 buys it) |
| F renovation × Rishon | 0.582 | 0.558 | 0.41 – 0.71 | step 2 | 0.613 middle |

Step-1 kill rate drops from 4/6 to 1/6. That is intended: B, C and E straddle the line, so they need data, not a verdict.

## 2.2 Organic lists and the "local by default" problem

Pilot hosts reviewed (web-checked 2026-11-07): one content site of a construction-inspection software vendor (ranks
for roofing in 4 cells across 2 regions) → media. One quote-request portal for renovation contractors → lead-gen
directory. One national DIY retail chain in the pergola SERP → chain. Two default hosts checked were single
businesses and stay local. One host returned 403 to our check and stays default (the national rule below will catch
it if it's national).

Rules:
1. **List matching is by host suffix**: host `== d` or ends with `"." + d` (so `he-il.facebook.com` → social,
   `he.wikipedia.org` → media). Applies to `not_a_site`, directories, social, media, chains.
2. **New class `chain_retail`**, checked after `media_info` and before the `local_site` rules. It counts as non-local.
3. **Unproven hosts count half.** `L_share = (local_pool + 0.5 × local_default) / counted`, where `local_pool` = host
   matched a business in this cell's Maps pool (R7 rule 4) and `local_default` = R7 rule 6. A default host is probably
   a business, but not proven local. This bounds the error inside O's ±0.20 range.
4. The engine writes every `local_default` host with its cell/region count to diagnostics, so I can extend the lists
   (append-only, dated).

Pilot effect: D `L_share` 0.714 → 0.357, O 1.086 → 0.943, **score 359 → ≈ 312**. F `L_share` 0.375 → 0.125,
`D_share` 0.75, O 0.95 → 0.85, **score 118 → ≈ 106**. Order unchanged.

## 2.3 National-brand detection — re-buy the Stage-1 organic SERPs

**Decision: re-buy the 170 Stage-1 organic SERPs in M4 ($0.34), storing real `domain` / `url` / `title`.**
They're the only uniform 17 × 10-region sample. Cell SERPs exist only for advancing pairs, and the per-profession cap
of 4 regions would leave most trades unable to reach "≥ 3 regions". The pilot shows why it matters: roofing organic
results are near-identical across regions, so without this rule regional and national sites would pass as local.
```
national_brand(host, p) = host ∉ this cell's Maps pool AND host appears in organic top 10 for profession p in ≥ 3
                          distinct regions, counting the Stage-1 re-buy ∪ all M4 cell SERPs of p
```
R7 order is unchanged: a Maps-pool match (rule 4) still wins over national_brand (rule 5).

## 2.4 "Article on publisher" path rule — dropped

Path patterns (`/blog/`, `/article`, dated URLs) can't tell a publisher's article from a local roofer's own blog
post, and the second case is exactly the local-site evidence we want. Publishers are caught by the media list plus
the national-brand rule (2.3), which is the deterministic version of the same idea.

## 2.5 Anti-bot and fetch failures

A bot wall says nothing about what a customer's phone sees. As of 2026-07/2026-09 reports, SiteGround (common in
Israeli WordPress hosting) answers suspected bots with **HTTP 202 + `sg-captcha: challenge`** and a tiny meta-refresh
body to `/.well-known/sgcaptcha/`. That matches the ≈ 169-byte 202s we saw. Sources: Sprocket Security write-up;
mySites.guru, 2026-07-14.

| Outcome | Condition | `site_check` | w_b |
|---|---|---|---|
| **not checked** | status 202, 401, 403, 429 · any status with header `sg-captcha`, `cf-mitigated`, or body ≤ 4 KB containing a challenge marker · 503 with such a header/marker · timeout twice (one retry) · robots disallow · robots 5xx/unreachable | `blocked` / `timeout` / `skipped_robots` | 1.00 |
| **weak (hard)** | DNS NXDOMAIN · connection/TLS failure on both schemes · `/` returns 404/410 · other 5xx after one retry · parked page (R8) | `failed` | 1.10 (has a domain) |
| normal | everything else → R8 rules | `ok` | per R8 |

Challenge markers (case-insensitive): `sgcaptcha`, `cf-chl`, `challenge-platform`, `just a moment`, `captcha`,
`imunify`. The parked-page rule runs only after the challenge check, so a challenge page is never "parked".
M3 criterion 5 is re-judged on `failed` only.

## 2.6 robots.txt vs "one GET" — two requests per host, approved

Order: `GET /robots.txt`, then `GET /`. HTTP fallback (R8) applies to both, so worst case is 4 requests on a host
whose HTTPS is broken. Per RFC 9309: robots 4xx → allowed; 5xx/unreachable → treat as disallow (`skipped_robots`).
Match group `WAO-MarketScan` first, else `*`. Cache the robots result for 30 days with the same key rule.
Concurrency stays at 2.

## 2.7 Storing title + first H1 text privately — approved

Tag-stripped `<title>` and first `<h1>` text, each ≤ 200 chars, stored in `data/market-scan/private/` only, 30-day
retention, used only to recompute `city_hit` / `service_hit` when term lists change. Never in committed outputs, never
raw HTML. It's public text, kept minimal, and it saves re-fetching.

## 2.8 Readings confirmed

- **Weak ranking** uses the **raw** Maps `rank_group` as returned (what the searcher sees), not re-numbered after
  the relevance filter. Best of terms 1–2.
- **One business → one cell per profession.** If a `cid` qualifies in several cells of the same profession, assign
  it to the cell whose centroid is nearest the business lat/lng (tie → city slug asc). The same `cid` may be a prospect
  in a different profession. The final outreach list dedupes by `cid`/phone across professions. LF top-3 membership
  is never "assigned": one business can count toward S3 in many cells (that's the spillover in 2.0).
- **Ring2 pooling** as in §5.1 / R6: ring2 towns with `P_w < 15` pool per region × profession; P_w summed after
  one-cell assignment, population-weighted S3, summed Value. Core cities never pool.
- **C is the control** (pergolas R8 didn't advance). It's not ranked in the M4 top 5. It gets one calibration
  step-2 buy (2.11) so the joined S3 can be compared with Eitan's glance.

## 2.9 Proximity — big-city rule for M4

Averaging across cities was the wrong test. Proximity sensitivity is a property of the cell: a service-area trade
(roofing, A 3/3) barely moves, while dense renovation (F 1/3) reshuffles within 3 km. So the rule is per cell, always on:
```
pop > 150,000 and not haredi-flagged → S3 = mean of 3 points: centroid, 3 km N, 3 km S   (step 1 and joined)
jerusalem (≈ 1.1M, large area)        → 5 points: + 3 km E, 3 km W
probe LF items join by cid to the centroid Maps pool; unjoined → neutral fill (2.1)
```
M4 big-city cells (non-flagged): Tel Aviv, Ramat Gan, Holon, Bat Yam, Petah Tikva (R1), Netanya, Rishon LeZion,
Rehovot, Jerusalem, Haifa, Ashdod, Ashkelon → 107 cells.

## 2.10 Category rules (R4 extensions, append-only)

| Profession | Category seen | Decision |
|---|---|---|
| roofing | ספק חומרי בידוד (insulation supplier) | add **conditional** (needs a roofing title term) |
| roofing | עבודות בגובה רב (high-altitude work) | add **conditional** — rope-access roofers use it |
| roofing | קבלן בנייה (construction contractor) | add **conditional** |
| roofing | תחזוקת נכסים (property maintenance) | add **conditional** |
| roofing | חנות חומרי בניין · קבלן בריכות שחייה · קבלן ריצוף · שירות גימור לריצוף | not relevant — leave unmatched |
| renovation | צבע (painter) · מעצב מטבחים מחדש (kitchen remodeler) · קבלן קירות גבס (drywall) · קבלן ריצוף (tiling) | add **conditional** (needs a renovation title term). Single trades take renovation jobs only when they say so |
| renovation | וילה | no rule — a mis-categorised listing; the title rule already caught it |

## 2.11 M4 plan and cost

**Scope:** the 40 advancing pairs (14 R1 · 10 R3 · 9 R2 · 5 R4 · 1 R5 · 1 R9) → **410 cells**. Haredi-flagged cells
(Bnei Brak × 14, Beit Shemesh × 5 = 19) run step 1 only, with no probes and no step 2, because they're killed by flag
anyway. Plus C as a calibration step-2 buy.

**Order per cell (organic moves to step 2):** step 1 = LF (+ probes if big city) → step-1 gate → step 2 = Maps × 2 +
organic → joined S3 → P_w, O → score. The LF↔pack cross-check passed 6/6, so organic for killed cells adds nothing.

| Item | Calls | Live USD |
|---|---|---|
| Stage-1 organic re-buy (2.3) | 170 | 0.34 |
| Step 1 — LF, all cells | 410 | 0.82 |
| Proximity probes (107 cells × 2, + Jerusalem 5 × 2) | 224 | 0.45 |
| Step 2 — Maps × 2 + organic, survivors (worst case: all 391 non-flagged survive) | 1,173 | 2.35 |
| C calibration step 2 | 3 | 0.01 |
| Homepage checks | own HTTP | 0 |
| **Total — worst case** | | **≈ $3.97** |
| Expected (≈ 20 % step-1 kill) | | ≈ $3.50 |

Pilot cells already cached (A, B, D, E, F step 1; D, F step 2; A, F probes) save a few cents. Not counted.
The total is **up from the ≈ $3 projection** for three reasons: step 1 now kills far fewer cells by design, there are
new proximity probes, and there's the national-brand re-buy. **Requested hard cap: $6** (≈ 50 % headroom). The balance
was $40.61 on 2026-11-07, so no top-up is needed. Prices are the 2026-11-07 account table. The engineer re-checks them
on run day (free `user_data`). The standard queue would cut this to ≈ $1.2 but takes hours. Not needed at this size.

**M4 acceptance (for Roni):** determinism on cache; cap halt before the first over-cap call; no step 2 for any cell
with `S3_step1 ≥ 0.75` or a haredi flag; 3-/5-point S3 on every big-city cell; anti-bot outcomes never `failed`;
`git diff data/clients/` empty; no names/phones/domains in committed outputs.

## 2.12 Config for the engineer (merge into `config/market-scanner/run-config.json`; Yonatan does not edit `config/`)

Replace keys that already exist (`s3_missing_field_policy`, `category_rules.roofing.conditional`,
`category_rules.renovation.conditional`). Append the `*_append` arrays to their base lists. Add everything else.
`caps_usd.stage2-full` goes in **only after Eitan approves**.

```json
{
  "caps_usd": { "stage2-full": 6 },
  "stage2": {
    "s3_missing_field_policy": "neutral",
    "s3_neutral_fill": 0.5,
    "step1_kill_s3": 0.75,
    "saturated_s3": 0.7,
    "s3_log_bounds": true,
    "organic_step": 2,
    "flagged_cells_step1_only": true,
    "proximity": {
      "enabled": true,
      "min_population": 150000,
      "offset_km": 3,
      "points": ["N", "S"],
      "extra_points_by_city": { "jerusalem": ["E", "W"] },
      "aggregate": "mean",
      "skip_flagged": true,
      "unjoined_policy": "neutral"
    },
    "list_match": "host_suffix",
    "organic_local_default_weight": 0.5,
    "organic_log_default_hosts": true,
    "organic_directories_append": ["renovations-israel.co.il"],
    "organic_media_append": ["reporto.co.il"],
    "organic_chain_retail": ["homecenter.co.il", "ace.co.il", "ikea.com", "ikea.co.il"],
    "not_a_site_append": ["renovations-israel.co.il"],
    "national_brand_min_regions": 3,
    "national_brand_sources": ["stage1_organic_rebuy", "stage2_cell_organic"],
    "media_article_path_rule": false,
    "weak_rank_source": "raw_rank_group",
    "cid_assignment": "nearest_centroid_per_profession",
    "category_rules": {
      "roofing":    { "conditional": ["שיפוצניק", "קבלן בידוד", "ספק חומרי בידוד", "עבודות בגובה רב", "קבלן בנייה", "תחזוקת נכסים"] },
      "renovation": { "conditional": ["קבלן", "קבלן בנייה", "חברת בנייה", "צבע", "מעצב מטבחים מחדש", "קבלן קירות גבס", "קבלן ריצוף"] }
    }
  },
  "stage1": {
    "organic_rebuy_m4": true,
    "organic_store_fields": ["type", "rank_group", "rank_absolute", "domain", "url", "title"]
  },
  "homepage_check": {
    "requests_per_host": 2,
    "http_fallback": true,
    "robots": { "path": "/robots.txt", "ua_token": "WAO-MarketScan", "on_4xx": "allow", "on_5xx_or_unreachable": "skip", "cache_days": 30 },
    "not_checked_statuses": [202, 401, 403, 429],
    "challenge_headers": ["sg-captcha", "cf-mitigated"],
    "challenge_markers": ["sgcaptcha", "cf-chl", "challenge-platform", "just a moment", "captcha", "imunify"],
    "challenge_max_bytes": 4096,
    "status_503_rule": "not_checked_if_challenge_else_retry_then_failed",
    "timeout_retries": 1,
    "timeout_outcome": "not_checked",
    "hard_fail": ["dns_nxdomain", "connect_or_tls_both_schemes", "status_404_410", "status_5xx_after_retry", "parked"],
    "store_text_private": { "title": true, "first_h1": true, "max_chars": 200, "dir": "data/market-scan/private/", "retention_days": 30 }
  },
  "m4": {
    "pairs": "stage1_advancing",
    "calibration_cells": [{ "id": "C", "profession": "pergolas", "city": "karmiel", "force_step2": true, "ranked": false }]
  }
}
```
ACE and IKEA in `organic_chain_retail` are household chains listed from knowledge, not seen in the pilot. They're
harmless if they never appear.

## 2.13 Handoffs (post-M3)

- **Eitan** — (1) approve the **M4 hard cap of $6** (was projected ≈ $3). (2) Glance at the LF top 3 of A, C and D
  (open M3 criterion 6). Can run in parallel with M4, since C's calibration buy lands in M4.
- **nextjs-engineer** — apply 2.12; implement neutral fill + step-1 gate (2.1), host-suffix matching + half-weight
  default + chain class (2.2), Stage-1 organic re-buy + national rule (2.3), anti-bot/robots rules (2.5–2.6), private
  text store (2.7), per-profession cid assignment (2.8), proximity points (2.9); fixtures for each; re-score the pilot
  from cache and confirm D ≈ 312, F ≈ 106 and the 2.1 step-1 table. Then run M4 within the approved cap.
- **verifier (Roni)** — the M4 acceptance list in 2.11.
- **Yonatan** — review M4 default-host and unmatched-category diagnostics; extend lists (append-only, dated); pick top 5.
- No keyword anchor / title formula is touched.

Sources (accessed 2026-11-07): Whitespark keyword-in-name study, 2026-09-08 —
https://whitespark.ca/research/how-keywords-in-business-names-currently-impact-google-local-pack-rank-and-ai-search/ ·
SiteGround 202 challenge — https://www.sprocketsecurity.com/blog/please-show-your-work-bypassing-javascript-proof-of-work-captchas
and https://mysites.guru/blog/siteground-captcha-blocking-mysites-guru/ · RFC 9309 (robots.txt) — https://www.rfc-editor.org/rfc/rfc9309 ·
pilot host checks by direct fetch of the hosts' home pages.

---
---

# Revision 3 — 2026-11-07 (post-M4 stop-and-see gate)

Owner: Yonatan · Inputs: run `73ecfd6063af` (M4, 411 cells), `m4-*.json/csv`, private rows
`data/market-scan/private/m4-businesses.json`, and the cached raw Local Finder / Maps responses in
`data/market-scan/cache/`. Nothing business-level is copied here. **Where Revision 3 disagrees with anything above,
Revision 3 wins.** (Numbered §3.x because §2.13 is already the post-M3 handoff list.)

## 3.0 What the gate found

The gate compared the score with what Google actually returned for 9 cells: the engineer's top 5, plus movers ×
Ashdod and pilots A, C and D. It also read the full counted-prospect list for each of the 5 cells that became the
final top 5. Two of the gate's findings are data bugs and two are rule gaps:

1. **LF ratings are missing, and missing was scored as zero (bug).** Google's Local Finder response carries
   `rating: null` for **171 of 177 movers top-3 slots** (and 27 more slots in other trades, 198 of 1,905 overall).
   The engine scored those businesses as 0-review listings, **even when the cid was joined to a Maps item that has
   the reviews**. Example from the cache: one Ashkelon mover has `rating: null` in 6 of 7 LF responses and 21 reviews
   at 5.0 in the Maps response. A moving-auction marketplace that sits in the LF top 3 of ~40 movers cells shows
   1,100 reviews in 2 responses and 0 in every other one. **Every movers score is inflated by this bug.** It is my
   spec's fault in part: R1.2 listed the detail fields to join, but it didn't say Maps wins for votes/rating.
2. **LF `domain` is unusable (bug).** LF items carry `domain: "google.com"` (a Google redirect) or `null`. So for an
   unjoined LF item, "no website" is *unknown*, not *known false*. This is the root of question (a).
3. **Phone-block lead-gen networks (rule gap).** Three mobile number blocks (the same first 7 digits) appear
   across many cells and trades. Their listings all follow the pattern "<trade> in <city> <first name> <trade>" and
   have 0–4 reviews. One locksmith block holds the #1 LF slot in 5 cells. Separately, two or more listings
   in one cell share one real domain (a 4-listing car-key operator; a 2-listing locksmith operator). R5.3's rule
   (exact phone on ≥ 2 listings in a cell or ≥ 3 cells) catches none of these. LF prints phones as `05X-…` and Maps
   prints them as `+9725X-…`, so exact matching may also be failing across the two sources.
4. **Off-trade and out-of-cell prospects (rule gap).** Category text passed items whose *title* says otherwise:
   car-electric garages counted as electricians, AC-accessory shops counted as AC repair, a hardware retailer and
   a car-scrap buyer counted as locksmiths, and a "nationwide" operator. A ring2 pool beside a big city also took in
   the city's own businesses: Ashdod-titled locksmiths were counted in the Gan Yavne pool.

The pilots match. In A, the three real contractors (66–88 reviews) are truly saturated. In C, there are 488, 44 and
1,000 reviews (one a national chain), and zero prospects. D has two real strong roofers plus one network listing,
and 8 real small contractors as prospects.

## 3.1 Field precedence for LF top-3 items (fixes 3.0.1, 3.0.2, question a)

```
joined (cid in this cell's Maps pool)  → every field from Maps (votes, rating, domain, photos, categories, claimed)
unjoined                               → votes/rating = best known value for this cid anywhere in the run's cache
                                          (max votes_count across all LF + Maps responses; rating from that same item)
                                          else neutral fill (2.1)
                                        → site: real domain parsed from the LF `url` redirect param if present,
                                          else neutral fill — LF `domain` null/"google.com" is NEVER "known no site"
photos / categories / claimed, unjoined → neutral fill (2.1)
```
Votes are a property of the business, not the query. So the best-known value is deterministic and honest. The engine
logs per cell how many slots used `maps`, `best_known` and `neutral`.

**Question (a):** the implemented rule gave an unjoined LF item with `domain: null` a site score of 0. That is
**not** what 2.1 meant, because LF can't tell us a business has no site. Joined items keep the Maps value (known
true/false). The D/E/F differences are small and in the safe direction (lower → fewer step-1 kills), but final S3
uses the same code on unjoined proximity-point items, so it gets fixed.

## 3.2 Lead-gen networks (fixes 3.0.3)

All phone logic runs on **E.164-normalised** numbers (`+9725XXXXXXXX`).
```
phone_block(b) = first 7 digits of the national number (e.g. 05X-XXX-X)
lead_gen_network(b) iff any of:
  (i)  ≥ 3 distinct cids share b's phone_block, across ≥ 2 cells (any profession),
       AND ≥ 2 of them are stuffed(title)            // §4.3 stuffed = head term or a city name in the title
  (ii) b's real domain (not NOT_A_SITE, after host-suffix match) is shared by ≥ 2 distinct cids in the same profession
  (iii) the existing R5.3 exact-phone rule
lead_gen_network → never a prospect; in LF top 3:  s_b = max(s_b, 0.60)  [CALIBRATE]
```
Why a 0.60 floor: a network listing ranks on its keyword name and pin location, not on profile quality. When one
is suspended, another replaces it. Our client won't keyword-stuff, so the slot is harder to win than the listing's
1–4 reviews suggest, but it's still softer than a real incumbent with 90 reviews. The 3-cid + stuffed-title
condition keeps an innocent shared block (a 1-in-1,000 coincidence) from tripping it.
`urgency_lead_gen` stays a display flag. Rule (i) applies to every profession: the AC-repair and roofing networks
prove that it isn't only an urgency-trade problem.

## 3.3 Title excludes, nationwide operators, out-of-cell titles (fixes 3.0.4)

Applies to the Maps prospect pool only (never to LF top 3, R1.1):
1. A profession's `exclude` stems are also matched against the **title**, plus these title-only stems (append-only):
   electrician `רכב · מוסך` · ac-repair `אביזרי` · locksmith `פרזול · פירוק · מכונות` · movers `השוואת מחירי`.
   Category exclude for movers adds `חנות ציוד`.
2. Global title stem `פריסה ארצית` (nationwide) → `chain`, never a prospect.
3. **Out-of-cell title:** if the title contains the `he_name` of an areas.json city that is neither the cell's city nor a
   pool member, the business is not in this cell. Assign it to that city's cell for the profession if it exists,
   else drop it. This fixes the ring2-next-to-big-city spill. The 6 km radius is otherwise unchanged.

## 3.4 Organic multiplier O — dropped from the score (question b)

1,228 organic results were classed `national_brand` and 314 local. The input barely varies: for a bare head term,
Google's organic top 10 is close to identical in every city (first seen in M3, 2.0). A higher region threshold wouldn't
help, because the same results would still repeat everywhere. **Decision: `O = 1.0` in R10 for now.** `L_share` /
`D_share` stay in the output as pitch material. If a future run wants a real local-organic signal, it should buy
one organic SERP for the *city-modified* query ("<term> ב<city>") on the final top 5 only (≈ $0.01). That's where a
local site actually ranks. Informational only, never scored.

## 3.5 Homepage outcomes — dead domains (question d)

```
site_dead  = dns_nxdomain (confirmed by a second resolver, e.g. DNS-over-HTTPS) · parked · 404/410   → w_b 1.25
failed     = connect/TLS failure on both schemes · 5xx after retry                                  → w_b 1.10
```
A dead domain on a Google listing is effectively no site, and it's worse than none because the profile's
"Website" button is broken. That makes it the strongest single pitch line, so it gets the no-site weight.
`site_dead` is a site-caused outcome. It's excluded from the fetch-error rate (M3 criterion 5 is re-judged on
`failed` only). The second-resolver confirmation exists because local WSL DNS is a known flaky resolver. An
NXDOMAIN that resolves elsewhere is re-fetched once.

## 3.6 Urgency trades (question c, R5.3 revisit)

The R5.3 revisit trigger fired: urgency trades won on score and lost on the glance. The causes are 3.0.1 (movers)
and 3.0.3 (locksmith). That's a data/rule failure, not a CPC-weighting failure, so **no damping constant is added**.
After the 3.1–3.3 re-score, any urgency cell that re-enters the top 5 is re-gated by hand before it's final.

## 3.7 Re-score (no paid calls)

Re-score M4 from cache with 3.1–3.5. Expected: every change raises or holds S3 (known votes, neutral site, network
floor), so no cell newly drops below the 0.75 step-1 gate. **No new Maps buys and $0 spend.** If any cell does
cross back under 0.75, list it and stop. Don't buy it without Adam.

## 3.8 Config for the engineer (merge; Yonatan does not edit `config/`)

```json
{
  "stage2": {
    "lf_field_precedence": "maps_if_joined_else_best_known_else_neutral",
    "lf_domain_trust": false,
    "lf_url_redirect_parse": true,
    "phone_normalize": "e164_il",
    "lead_gen_network": {
      "phone_block_digits": 7, "block_min_cids": 3, "block_min_cells": 2, "block_min_stuffed": 2,
      "shared_domain_min_cids": 2, "shared_domain_scope": "profession",
      "lf_s_b_floor": 0.60
    },
    "title_exclude": {
      "electrician": ["רכב", "מוסך"], "ac-repair": ["אביזרי"],
      "locksmith": ["פרזול", "פירוק", "מכונות"], "movers": ["השוואת מחירי"]
    },
    "category_rules": { "movers": { "exclude_append": ["חנות ציוד"] } },
    "title_chain_stems": ["פריסה ארצית"],
    "out_of_cell_title_rule": true,
    "organic_factor": { "base": 1.0, "slope": 0.0 },
    "organic_factor_note": "O disabled 2026-11-07 (Rev 3, 3.4); L_share/D_share display only"
  },
  "homepage_check": {
    "site_dead": ["dns_nxdomain_confirmed", "parked", "status_404_410"],
    "nxdomain_second_resolver": "doh",
    "weights": { "site_dead": 1.25, "failed": 1.10 }
  }
}
```

## 3.9 Final top 5 (provisional until the 3.7 re-score; then Yonatan re-gates any new entrant)

| # | Cell | M4 score | S3 | P counted → real after gate | Why winnable |
|---|---|---|---|---|---|
| 1 | locksmith × Jerusalem | 391.8 | 0.57 | 42 → ≈ 35 | top 3 = a 2-listing network + a 0-review stuffed listing; dozens of real one-man locksmiths with 10–75 reviews and no site |
| 2 | ac-repair × Petah Tikva | 230.9 | 0.37 | 38 → ≈ 31 | top 3 = three 1–2-review keyword listings (lead-gen style); real technicians below them |
| 3 | electrician × Rehovot | 234.5 | 0.62 | 27 → ≈ 21 | real owner-run top 3 (28–74 reviews), beatable with a review push + site |
| 4 | electrician × Ramla | 215.9 | 0.50 | 16 → ≈ 15 | clean owner-run pack; same kit and case study as #3 (adjacent, same region) |
| 5 | roofing × Rehovot (pilot D) | 205.3 | 0.55 | 8 → 8 | highest ticket, demo kit ready (kit 2); small list. Alternate: electrician × Holon (P 29, not yet gated) |

Held out pending re-score: all movers cells (3.0.1), locksmith × R1-ring2 (partial match: real incumbents mixed with
stuffed listings, some off-trade prospects), locksmith × R3-ring2 (mismatch: network-held top 3, prospects
spilled in from Ashdod; ≈ 9 real → likely below P_w 8–15 after 3.3).

## 3.10 Handoffs (post-M4)

- **nextjs-engineer** — implement 3.1–3.5 + 3.8, fixtures for each (include the cached Ashkelon-mover and
  marketplace cids as fixtures for 3.1, and the three phone blocks for 3.2), re-score M4 from cache at $0, and
  report the new top 15 with slot-source counts.
- **verifier (Roni)** — determinism; zero network calls during re-score; no LF item scored "known no site" from LF
  `domain`; E.164 normalisation on both sources; `git diff data/clients/` empty; no names/phones/domains committed.
- **Yonatan** — re-gate any new top-5 entrant from the private file; then the top 5 is final.
- **Eitan** — the 5th slot (roofing × Rehovot vs electrician × Holon), see the stop-and-see summary.
- No keyword anchor / title formula is touched.
