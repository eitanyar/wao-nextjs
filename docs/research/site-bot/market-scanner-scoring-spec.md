# Site-Bot Market Scanner — Scoring Spec (M1)

Owner: Yonatan (seo-strategist) · Written 2026-11-07 · Mission: `docs/missions/site-bot-market-scanner-2026-11-07.md`
Implementer: nextjs-engineer (M2–M4) · Verifier: Roni.
Status: **spec, no paid call made.** Every price / endpoint claim below was web-checked on 2026-11-07 (sources in §9).
Items marked **[CALIBRATE]** are starting constants that M3 (pilot) can change, with the reason written down.

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
