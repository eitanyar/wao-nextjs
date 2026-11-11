# Can 8–12 pages rank organically? — Yonatan on Fable 5.2 (claude-fable-5-2), 2026-11-11

# Can an 8–12 page, ~200-word local site rank in blue links on its own? — Yonatan, 2026-11-11

## 1. Verdict

1. **Eitan is right.** An 8–12 page site at ~200 words a page will not rank on its own for "trade + city", and I found no site that small on page 1 in any data I could verify.
2. **The gap is mostly site size, less page length.** Non-directory sites that rank carry 23–380 URLs (median ~175); their ranking pages run roughly 350–1,000 content words.
3. **Fable 5.2 is right about the risk, wrong about the size.** The coded service×city matrix is a doorway set, but "8–12 pages" answers the policy question, not the ranking one.
4. **The answer is a third shape:** launch at 14–18 truthful pages, grow to ~30 in about six months, with pages earned by evidence rather than multiplied.
5. **Honest ceiling:** even a winning blue link sits under the Local Pack (99% of sampled SERPs), often an AI Overview (46%) and ads (30%). The site must be able to rank alone, but the profile will still bring most calls.

## 2. SERP evidence

**What I could and couldn't retrieve.** Live Google results for the "X ב-city" phrasings were not retrievable (Google, Startpage, DuckDuckGo and Bing all blocked or returned nothing). I made no paid calls. Verified Google data comes from two things already in the repo:

- **Set A:** 197 DataForSEO Google SERPs, 2026-11-07, top 10, bare trade term at city coordinates, five trades (`data/market-scan/cache/`).
- **Set B:** one NeuronWriter google.co.il capture of the exact query "אינסטלטור בחולון", top 19 (committed 2026-11-10; capture date not stored).

The WebSearch tool is not Google, so I used it only to find pages that target the exact queries (Set C), never for positions. I have **no verified positions** for "חשמלאי בראשון לציון", "טכנאי מזגנים ברמת גן", "פתיחת סתימות בבת ים", "מנעולן בפתח תקווה", "איתור נזילות בחולון" or "החלפת לוח חשמל".

**Set A — who holds the organic top 10 (bare term, ~40 cities per trade)**

| Trade | SERPs | Distinct domains | Directories always present | Strongest non-directory sites | Share of results from domains seen in ≤2 cities |
|---|---|---|---|---|---|
| אינסטלטור | 39 | 34 | midrag 39/39, b144 20 | jacksonplumber (18 cities, avg pos 2.1), migo-ahzakot (12, pos 1.0), plumbers-24-7 (13, pos 1.6) | 3% |
| חשמלאי | 41 | 27 | midrag 39/41, easy 18, b144 18 | hashmelai (28, pos 2.9), hashmal4u (29, pos 3.2) | 2% |
| מנעולן | 37 | 24 | d.co.il 32/37, easy 26, b144 23 | manulan-israel (19), multilocksmith (12) | 4% |
| טכנאי מזגנים | 36 | 18 | midrag 36/36, easy 33, pro 22 | mizugpro (33, pos 2.6), ronikor (23) | 1% |
| הובלות | 44 | 29 | d.co.il 36/44, midrag 30 | israelmovilim (39), moving-israel (29), snirgo (22) | 1% |

- Single-city sites are nearly absent: at most 8 of 591 top-3 slots went to a domain seen in ≤2 cities, and some of those are directories.
- The non-directory winners rank with **city pages** ("אינסטלטור בתל אביב", "אזורי שירות › …"). At Holon, Bat Yam and Rishon coordinates Google serves their Tel Aviv pages.
- The first organic result sits at absolute position 4 (median).

**Set B — "אינסטלטור בחולון", google.co.il top 19**

| Type | Positions | Detail |
|---|---|---|
| Directories / marketplaces | 2, 6, 7, 8, 9, 10, 12, 13, 16, 18 | midrag ×3, easy ×3, ofair, tzaneret, shipozimil, akablanim |
| Social | 11, 17 | a plumber's Facebook page; a Facebook group post |
| Regional businesses / lead-gen | 1, 3, 4, 5, 15 | tsuk-avodot-bagova (79 URLs, 1,055 words), sharon-mor (186 URLs, 347), migo-ahzakot (135 URLs, 479), installator-israel (120 URLs, 116 of them city pages, 441), iplumber (89 URLs, 763) |
| Small sites | 14, 19 | zahtrade (18 URLs, 73 words), agam-plumbing (22 URLs, 350 words, online since 2021) |

NeuronWriter's median content length for this SERP is **418 words**. The two small sites sit on page 2.

**Site inspection (fetched 2026-11-11; sitemaps counted, pages measured)**

| Sample | Sites | URLs in sitemap | City-targeted URLs | Words on ranking page* | Schema | First Wayback capture |
|---|---|---|---|---|---|---|
| Set A winners | 20 of 22 fetched | 23–380, median ~175 | 5–287; 17 of 20 have ≥12 | ~480–3,400, median ~1,450 | 20/20 | 2001–2024; 4 first seen in 2024 |
| Set C (pages targeting exact "X ב-city") | 15 of 17 fetched | 51–704, plus one single-page site | 13–311 | 555–2,415 | 14/15 | 2009–2025 |

\* My counts are all visible text minus header/nav/footer, so they run high. NeuronWriter's content-only counts for the same kind of page are 350–1,050.

- **Smallest site ranking in Set A:** elecfive.co.il — 23 URLs, ~850 words, first seen September 2024, present in 2 of 41 cells.
- **Fastest climbers:** jacksonplumber (first seen October 2024, 180 URLs, 64 city pages) and migo-ahzakot (February 2024, 135 URLs). Both reached top-3 across a dozen or more cells in about two years.
- **Service-specific competitors in Set C** ("איתור נזילות בחולון"): pro.co.il (~2,300 words), b144 (~1,900), liquidity.co.il (~1,200, 107 URLs), meaterms.com (~940, 202 URLs).
- **Blogs are not what wins:** most of these sites have 0–5 blog-like URLs. City and service pages do the work.
- **Not retrieved:** backlink data, so I cannot separate size from links and age. Two sites failed to fetch (403, 504).

## 3. Answer per query class

Everything in this section is my judgment, anchored to section 2.

| Class | 8–12 pages × ~200 words | Recommended model (section 4) |
|---|---|---|
| (a) "trade + city" head | No. Best case is where zahtrade and agam sit: positions ~14–19 in a mid-size city. Under 5% chance of page 1 in 12 months. | Positions 8–20 in mid-size cities (Holon, Bat Yam, Rehovot, Ramla) in 6–12 months; top 5 only with real links. Tel Aviv: don't promise. |
| (b) "service + city" | Weak. The title and H1 are right, but 45–200 words faces 900–2,300. A few low-competition services may reach page 2. | Best opportunity. 500–800 specific words: positions 5–15 in 3–9 months, and 20–40% of these keywords in the top 10 by month 9–12. |
| (c) Problem / question long-tail | Zero, because the pages don't exist. | Problem + city and niche problems are rankable. National questions belong to midrag, pro and b144, and cost questions trigger AI Overviews that cited publishers in our one live test (August). Expect impressions and relevance, few clicks. |
| (d) Neighbouring towns | Near zero. Every non-directory result I saw for an explicit city query was a dedicated city page. | One evidence-backed page per served town: positions 5–20 in small towns, harder in big ones. |

For scale, monthly searches for the bare term by searchers in the city (Google Ads via DataForSEO, 2026-11-07): "אינסטלטור" Holon 320, Bat Yam 140; "חשמלאי" Holon 90; "איתור נזילה" Holon 40. These are small pies, so no single page pays for itself; breadth does.

## 4. Minimum viable ranking site

| Page type | Launch | Month 6 | Content words | What makes it unique | Source |
|---|---|---|---|---|---|
| Home (trade + main city) | 1 | 1 | 600–900 | Who, where, licence, price promise, reviews, links to everything | Owner facts, reviews |
| Service page (one per real service) | 5–8 | 6–10 | 450–800 | What's included, when to call, process, price-from, what he doesn't do, materials, 3–5 Q&As, one real job | Per-service fact card, job log |
| City page (one per served city, listing all services there) | 1–3 | 3–5 | 350–600 | Jobs done there, a review from there, arrival time or fee for there, true local facts | Job log, reviews, owner |
| Problem page (symptom → cause → self-check → when to call → his price) | 2–3 | 8–10 | 400–700 | His own take plus trade knowledge he approved | Voice note, approved trade knowledge |
| Pricing page | 1 | 1 | 400–700 | Real price table and what changes the price | Owner prices only |
| Proof (owner page, reviews, jobs log) | 2–3 | 3 | 300+, growing | Licence number, real photos, dated jobs | Owner, GBP |
| Contact, legal | noindex | noindex | — | — | — |
| **Indexable total** | **14–18** | **~28–32** | **8–12k site-wide** | | |

**City pages without doorway risk.** Google's doorway examples include "pages targeted at specific regions or cities that funnel users to one page" and "substantially similar pages" (spam policies, read 2026-11-11). A city page is legitimate when:
- the business really works there;
- the page holds things true only of that city;
- it sits in a browsable hierarchy (home → areas → city).

Require at least two pieces of city evidence, or the page isn't built. A service×city page exists only when Search Console shows impressions for that exact pair and there is a job to cite.

**How the three tools decide.**
- **DataForSEO:** per candidate keyword, classify the top 10. If no small business appears, the page may still exist for conversion but gets no ranking promise.
- **NeuronWriter:** its word target sets the depth floor (418 for the Holon sample), capped by available facts. Missing terms become questions to the owner, never filler.
- **Search Console** (from day 60–90): queries at position 8–30 deepen that page; queries with impressions and no page become new pages; pages with no impressions after 90 days fold.

**Cadence:** 3–4 new or deepened pages a month, which VISION already promises. No general blog.

**Two preconditions.** The site must be on the client's own domain, because a `{slug}.wao.co.il` subdomain cannot "rank on its own" in any meaningful sense. It also needs a link floor: profile links from GBP, b144, easy, d.co.il and midrag, plus suppliers. Links are #3 and #5 among local organic factors in Whitespark 2026 (an expert survey, published 2025-11-06).

## 5. Where truthful content comes from

| Source | Voice it may be published in | Safe? |
|---|---|---|
| Intake facts, per-service fact card, voice note | First person | Yes |
| Job log: one WhatsApp photo and a line per job (service, city, what was found) | First person, dated | Yes, with customer details removed |
| GBP reviews and photos | Quoted, with first name | Yes |
| Licence and registry data | Stated fact | Yes, once verified |
| General trade knowledge (causes, standards, safety) | Neutral ("בדרך כלל…"), after a one-tap owner approval | Yes, capped at ~40% of a page; never prices, timings or guarantees |
| Public local facts (municipality, water corporation, neighbourhood names) | Neutral, from an official source | Yes |
| Model-written "client scenarios", stock photos as jobs, response-time promises | — | Never |

About 8 facts cannot feed 15 pages. The job log is the engine: 4–6 jobs a month yield about 50 unique, true, city-tagged facts by month 6.

## 6. Reconciliation with Fable 5.2 and core-30

- **Agree:** retire the coded matrix, per-service fact cards, similarity gate, thin-page fold, city evidence rule, hours and GBP link, own domain.
- **Refine:** 8–12 pages is the honest launch floor, not the product. The 250-word floor is too low: use 400 for home and city pages, 450–800 for service pages.
- **Overturn:** "the ranking evidence supports a page per real service" was supported by a survey and policy text, not SERPs. The SERPs show nobody ranking at that size.
- **Uncomfortable fact:** what wins Hebrew organic today is the long-page trade×city matrix on 100–700-URL sites. We still shouldn't copy it. One template across many client sites is a fleet-wide footprint, and four spam updates plus a core update (started 10 November) ran this year.
- **VISION.md:** keep "core-30" as a destination, redefined as about 30 earned pages by month 6 (services + served cities + problems + pricing + proof). Drop "service × city" at lines 35 and 259, and add blue-link ranking as a stated goal beside the Local Pack. I sign off on this change. The existing title formula (service + city, RLM-anchored brand) stays; problem pages take question-form titles.

## 7. Build list (priority order)

1. **Own domain at launch** (Fable E15, moved to first). Owner: Eitan decision, Eitan-Dev.
2. **Per-service fact card + owner approval of trade-knowledge statements** (E3, extended). Owner: Eitan-Dev; question copy by Tamar, then Noa.
3. **Code-first service-page body with the NeuronWriter depth floor** (E4, E12). Owner: Eitan-Dev.
4. **Similarity gate, same-site and cross-client, plus thin-page fold** (E5, E6). Owner: Eitan-Dev; Roni verifies.
5. **WhatsApp job log** (photo + line → structured job → feeds service, city and proof pages). Owner: Eitan-Dev.
6. **Wire the page planner with new page types** (problem, pricing, proof) and the city evidence rule (E2, E9). Owner: Eitan-Dev; rules mine.
7. **SERP winnability classifier** on the DataForSEO results already pulled, reusing the market-scan classes. Owner: Eitan-Dev.
8. **Search Console verified at launch, plus the monthly grow / deepen / fold loop.** Owner: Eitan-Dev.
9. **Citation and link floor playbook.** Owner: Amit.
10. **Hours, GBP link, schema completion** (E7, E8, E14). Owner: Eitan-Dev; Roni verifies.
11. **Rewrite VISION.md and `/site-bot` promises to match.** Owner: Adam, with my sign-off above.

## 8. Established vs judgment, and sources

**Established (dated):**
- Set A and Set B figures; site measurements of 2026-11-11.
- Google's doorway and scaled-content wording (read 2026-11-11).
- 2026 update history: spam updates in March, June, August and September; November core update started 10 November.
- Whitespark 2026 factor ranks (survey, not Google data).
- City search volumes (Google Ads via DataForSEO, 2026-11-07).

**Caveats on the evidence:**
- Set A is the bare term, not "X ב-city".
- Set B is one query.
- It was all captured before or as the November core update began, so positions may move.
- Wayback first-capture is only a proxy for site age.

**Judgment:** every position, percentage and time-to-rank in section 3; the page counts and word floors in section 4; the 40% cap; the two-evidence city rule; the fleet-footprint risk.

**Sources:**
- [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies)
- [Google Search Status Dashboard — ranking history](https://status.search.google.com/products/rGHU1u87FJnkP6W2GwMi/history)
- [Whitespark 2026 Local Search Ranking Factors](https://whitespark.ca/local-search-ranking-factors/)
- Repo: `data/market-scan/cache/serp_google_organic_live_advanced/`, `src/lib/site-bot/research/testdata/neuronwriter-get-query-he.json`, `docs/reviews/core30-readiness-fable52-2026-11-11.md`
- Competitor pages found via WebSearch (not positions): [pro.co.il Holon leak detection](https://www.pro.co.il/thermal-camera/holon), [liquidity.co.il Holon](https://liquidity.co.il/area/holon/), [guy-plumber Holon](https://www.guy-plumber.co.il/%D7%90%D7%99%D7%A0%D7%A1%D7%98%D7%9C%D7%98%D7%95%D7%A8-%D7%91%D7%97%D7%95%D7%9C%D7%95%D7%9F), [alex380volt Rishon](https://www.alex380volt.com/electrician-rishon-lezion), [biuvi Bat Yam](https://biuvi.co.il/sewer-truck-bat-yam/)

**Suggested next prompt for Adam:** "Lior: score Yonatan's 2026-11-11 site model (earned ~30 pages, own domain first, job log) against VISION.md and return PROCEED / DEFER / DROP for build items 1–8."
