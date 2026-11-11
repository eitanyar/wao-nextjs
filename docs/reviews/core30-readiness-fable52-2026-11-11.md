# Core-30 readiness — Fable 5.2 (claude-fable-5-2), 2026-11-11

# Core-30 readiness review — on-site local ranking (2026-11-11)

## 1. Verdict

**NOT READY** to deliver a great core-30 site. What exists is ready only as a hand-held 3–4 page pilot.

- **Core-30 does not ship.** No production code calls `buildCoreThirtyNodes` or `generateCoreThirtyPageCopy`; only `scripts/compare-site-bot-architectures.mjs` does. The deploy route refuses core-30 on paid records (`deploy/route.ts:236`, `:338`).
- **What ships is 3–4 pages.** Live research creates one page per owner-named service and nothing else (`runResearch.ts:314`). The 30-page planner with city-page rules (`pagePortfolio.ts:116`, `:208`) is not wired in.
- **Service pages are near-empty and near-identical.** They hold 45–61 content words against a 250 floor (`events.json` `fact_gap`). I measured same-site pages at 0.74–0.98 text similarity.
- **The facts don't stretch to 30 pages.** An owner gives about 8 facts. Thirty truthful 250-word pages cannot come from 8 facts; the rest would be invention or template, which is what Google's doorway and scaled-content policies describe.
- **Entity plumbing is coded but dead in output.** Hours schema and the Google-profile link both exist in code and appear in zero rendered pages.

## 2. What already works (do not break)

- **Title/H1 anchors.** Service + city, with the RLM brand anchor: `<title>איתור נזילות בחולון‏ | TEST M2a Plumbing`. One H1, canonical, `lang="he" dir="rtl"`, legal pages `noindex,follow`.
- **One URL per real service** with readable slugs (`/services/leak-detection.html`). Whitespark 2026 ranks "Dedicated Page for Each Service" #1 for local organic and #2 for AI visibility.
- **Code-owned facts.** Trust bar, price promise, and the cost answer `כמה עולה איתור נזילות בחולון?` → `אצל TEST M2a Plumbing, המחיר לאיתור נזילות בחולון מתחיל מ־ 350 ₪` are byte-stable and are the best extractable block on the site.
- **Honest geography.** `areaServed` lists only owner-named cities, there are no service×other-city pages (`site-bot-content-depth-2026-11-10.md:16`), and the core-30 prompt forbids implied storefronts (`coreThirtyCopy.ts:43-56`).
- **"Never pad" rule plus `fact_gap` logging** (`pageBrief.ts:63-66`). Shipping short and logging the gap is right; keep it.
- **Link graph safety.** Orphan pages fail the render (`researchedSite.ts:690`); home ↔ service ↔ sibling links are present.

## 3. Gaps, by severity

### Blockers

| # | Gap | Evidence | Why it matters for ranking |
|---|---|---|---|
| G1 | The legacy core-30 path, if ever switched on, is a doorway set. | Flat service×city loop (`coreThirty.ts:106-116`); opaque URLs `sherut/svc0-city2.html` (`renderCoreThirtyPages.ts:60`); 500-char narrative cap (`coreThirtyCopy.ts:28`); nothing links into `sherut/` except siblings and the sitemap; duplicates are detected only inside one client (`route.ts:354`). | Google's doorway examples include city-targeted pages that funnel to one place and "substantially similar pages that are closer to search results than a clearly defined, browseable hierarchy". |
| G2 | Service pages have no body about the service. | The whole unique content of `emergency-electrician.html` is the H1 `חשמלאי חירום בראשון לציון`. Its subhead, licence line and review are identical on `ev-charger-installation.html`. The drain-cleaning description `אני מכניס ספירלה לתוך הצנרת…` renders on the homepage card but not on the drain page. | No page can rank for a service it does not describe. |
| G3 | Same-site near-duplicates ship with no gate. | Trigram Jaccard on `<main>` text: panel-upgrade vs EV-charger 0.98; drain vs leak 0.87; leak-repair vs solar 0.74. Core-30's own exclusion threshold is 0.6 (`duplicateCheck.ts:103`), but the researched path never calls it. | Google will index one and fold the others. |
| G4 | The model still turns the customer's fear into a promise. | Owner USP: `מתקן נזילות באותו יום עם בדיקת מצלמה…`. Published H1: `אינסטלטור בחולון — מאתר נזילות עם מצלמה בלי שבירה`; H2 `בלי שבירת אריחים`; body `והקיר שלך נשאר שלם`. | Trust is the top helpful-content criterion; an unowned guarantee is also the owner's legal exposure. |

### High

| # | Gap | Evidence | Why it matters |
|---|---|---|---|
| G5 | Hours never reach the pages or schema when typed in Hebrew. | The parser accepts Latin day names only (`businessHours.ts:40`). Every fixture has Hebrew hours (`א׳–ה׳ 08:00–18:00`); `openingHoursSpecification` appears 0 times in all eval HTML. | "Business is Open at Time of Search" is a top-5 Local Pack factor (Whitespark 2026). |
| G6 | No link from site to Google Business Profile. | `sameAs` is coded (`renderSitePages.ts:280,291`) but `googleMapsUrl` is "not collected yet" (`prompts.ts:92`), although intake already holds the `placeId` (`startIntake.ts:56`). No visible Maps link either. | This is the one on-site element that connects the site to the profile Google actually ranks. |
| G7 | Duplicate, short meta descriptions; `Service.description` copies them. | All three electrician service pages: `אני מסביר לך את ההצעה שורה־שורה לפני שאני מתחיל לעבוד` (53 chars). Leak page: 25 chars. Source: `researchedSite.ts:283,639`. | Duplicate snippets weaken click-through and reinforce G3. |
| G8 | No extractable answer on most pages. | Q&A dropped to 0 in all three runs (`qaItems:2->0`). The cost answer exists only where a price was given: 2 of 8 service pages. | AI answers quote direct question-and-answer text. |
| G9 | Every client site lives on `{slug}.wao.co.il`. | `route.ts:305`; a followed footer link `נבנה עם WAO` on every page (`renderSitePages.ts:183`); one Unsplash image shared by every plumber in `og:image` and schema. | See the hosting note under section 4. |
| G10 | No rule decides when a city deserves its own page. | The `qualified_service_area` class and its three tests exist (`pagePortfolio.ts:208-212`) but nothing produces candidates. | Without it, "30 pages" can only mean the G1 matrix. |

### Medium

- **G11 — Page topic contradicts the business facts.** There is a `חשמלאי חירום` page for a business whose hours are `א׳–ו׳ 07:00–17:00`, with no availability statement.
- **G12 — Schema is minimal.** No `serviceType`, no `offers` from the price the owner gave, no `BreadcrumbList`.
- **G13 — Contact page is indexable with about 57 words** and reuses the homepage description.
- **G14 — No images, so no alt text or image search presence** (0 `<img>` on all pages).

### Corrections to the Fable 5.1 report

- **Hours and `sameAs` are not unbuilt** (its 2.12, #5, #14). Both are coded; one is blocked by the Latin-only parser, the other by a field nobody fills.
- **Its "hub→service→sibling links" is not what ships.** No service hub page is emitted; the sitemap has home, services and contact only.
- **The price leak (its B3) is gone in the latest run.** The drain page now shows a table with only `דמי הגעה 150 ₪`, which is a table with nothing about the service.
- **FAQPage markup (its #14) gives no rich result.** Google ended FAQ rich results on 7 May 2026 (verified below). Keep the visible Q&A; treat the markup as optional.

## 4. Engineer-ready improvements

| ID | Title | What to build | Acceptance on a rendered page | Effort | Depends on | Owner | Fable # |
|---|---|---|---|---|---|---|---|
| E1 | Decide what "core-30" means | Retire the service×city matrix as a launch promise. Target: home + one page per real service (typically 6–12) + pricing + owner page + city pages only under E9. Update `VISION.md:35,259`. | VISION and `/site-bot` copy state the real page count. | S | — | Eitan decision, SEO | new |
| E2 | Wire the page planner | Feed `buildPageOpportunityPortfolio` from `applyGraph` (`runResearch.ts:308`). Keep `legacyCoreThirty` render test-only. | The dossier lists indexed, backlog and rejected pages with reasons; no `sherut/` URL can deploy. | M | E1 | engineer | new |
| E3 | Per-service fact card | Intake and monthly question collect, per service: what is included, typical situations, duration, price-from, what he does not do, materials or brands. Chips plus short text. Store as `serviceFacts[serviceId]` in `CollectedData`. | The site record holds ≥4 facts per service page. | M | copy for questions | engineer, copy | extends #9 |
| E4 | Service-page body blocks, code-first | In `researchedSite.ts`, render service-only blocks from E3: included / when to call / price / not included. The model writes only connective prose, with `factIds`. | Service-page median ≥250 words where facts exist; every sentence traces to a fact. | L | E3 | engineer, copy | extends #4 |
| E5 | Thin-page fold | A service with fewer than about 120 unique content words gets no URL; it renders as a homepage section and joins the backlog. | Re-running electrician-2 emits no page whose unique text is only an H1. | S | — | engineer, SEO | new |
| E6 | Similarity gate, same-site and cross-client | Run `checkNearDuplicates` on rendered `<main>` text minus shared chrome, in the eval and before deploy. Keep a fingerprint store of shipped pages per trade for the cross-client check (`depthBlocks.ts:427` is warn-only today). | No same-site pair ≥0.6; cross-client 5-gram <0.25; failures fold per E5. | M | — | engineer | new |
| E7 | Hebrew hours parse + hours block | Accept Noa's existing day-letter table (`generationData.ts` `DAY_LETTERS`) in `parseBusinessHoursSegments`. Render the hours line on every page. | `openingHoursSpecification` is present and the visible hours match it, for both fixture formats. | S | — | engineer, UX | #5 (corrected) |
| E8 | GBP link | Persist `placeId` → `googleMapsUrl` at intake. Emit `sameAs` and a visible Maps link. Footer name/phone/area identical to the profile. | `sameAs` in JSON-LD; one Maps link in the footer. | S | — | engineer | #14 (partly) |
| E9 | City-page qualification | Emit a `qualified_service_area` candidate only with city-specific owner evidence: a job done there, a review from there, or a response time for there. | A fixture with no city evidence yields 0 city pages; one with evidence yields a page whose body cites it. | M | E2, E3 | engineer, SEO | new |
| E10 | Fear → promise block | Add the plumber-3 homepage as a failing test (H1 + story H2 + story body), then gate on word roots, not surface forms. | The three quoted strings in G4 cannot pass. | M | — | engineer | #2 |
| E11 | Unique meta and `Service.description` | Code-built per-page template (service, city, one page-specific fact, phone), 120–155 chars. Assert uniqueness across the site. | No two pages share a description. | S | SEO sign-off | SEO, engineer | #13 + new assert |
| E12 | Answer-first block | A code-built opening sentence on each service page: who, what, where, price-from or pricing promise, response. Visible Q&A from E3 facts, exempt from the novelty drop. | Every service page has ≥2 question headings with a direct first-sentence answer. | M | E3 | engineer, copy | #4 |
| E13 | Topic–fact conflict gate | An "emergency / 24h" service label requires a matching availability fact; otherwise hold the page for an owner question. | electrician-2 holds the emergency page. | S | — | engineer | new |
| E14 | Schema completion | Add `serviceType`, `offers` from `startingPrices`, `BreadcrumbList`; set contact page to `noindex,follow`. | Present and valid in Rich Results Test. | S | — | engineer | extends #14 |
| E15 | Own domain, footer link, shared image | Custom domain at launch (not M4); footer link `rel="nofollow"`; drop the shared Unsplash image. | Canonical on the client's domain; no shared image URL across clients. | M | Eitan decision | Eitan, engineer | #16 (partly) |
| E16 | Rendered-page golden tests | Per fixture: word count, similarity, unique meta, hours, `sameAs`. | CI fails on any G2–G8 regression. | S | E6 | engineer | Fable 3.6 |

**A note on E15 (my judgment, not established):** hosting every client under `wao.co.il` clusters all templated sites on one domain, like many tenants sharing one street address. A spam action on the pattern could reach the agency's own site, and the business never owns its own web identity.

**The decision behind E1 (also my judgment):** the ranking evidence supports a page per real service, not a page per service×city. A plumber with 3 services and 2 cities has an honest site of roughly 8–12 pages. Promising 30 forces the generator to manufacture the difference.

## 5. Merged build order (first 12)

1. **E1** — every later item depends on what the product promises.
2. **E10 (Fable #2)** — an unowned promise in an H1 is the only gap that can hurt a client on day one.
3. **E7 + E8 (Fable #5, #14)** — two small fixes that switch on entity signals already coded.
4. **E5** — stops the worst pages shipping before better content exists.
5. **E6 + E16** — a measuring stick first, so later content work is provably distinct.
6. **E3** — the fact supply; nothing truthful gets longer without it.
7. **E4 + E12 (Fable #4)** — turns those facts into body and answers; this is where 250 words comes from.
8. **E11 (Fable #13)** — cheap once per-page facts exist.
9. **Fable #6 + #16** — sticky call/WhatsApp bar and a real owner photo; conversion on the now-substantial page.
10. **E13 + E14, with Fable #3 and #21** — small correctness fixes.
11. **E2 + E9** — only now grow past 4 pages, with the planner and city rule deciding.
12. **E15 + Fable #25** — own domain, then the monthly growth loop, each new page passing E6.

Fable #1, #7 and #8 (billing, attestation, privacy disclosure) are launch blockers outside on-site ranking and should run in parallel.

## Established vs. judgment

- **Established (checked 2026-11-11):**
  - Google's doorway and scaled-content wording, as quoted above.
  - Google states no preferred word count and names trust as most important.
  - Local ranking is relevance, distance and prominence, and the guidance says nothing about website content.
  - FAQ rich results ended 7 May 2026.
  - Spam updates ran in March, June, August and September 2026, and a core update started 10 November 2026.
  - Whitespark 2026 factor ranks (an expert survey, not Google data).
- **Not confirmed:** `VISION.md:261` says the June 2026 spam update "explicitly targets templated city/service doorway pages". The update is real, but I found no Google statement of its targets; only third-party blogs say so.
- **Not verified:** AI Overview behaviour for Hebrew or Israeli local queries; published studies range from 15% to 88% and none cover Hebrew.
- **Judgment:** the 0.6 and 0.25 thresholds, the 120-word fold, the 8–12 page estimate, and the hosting risk in E15.

Sources:
- [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies)
- [Google: creating helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Business Profile: how local results are ranked](https://support.google.com/business/answer/7091)
- [Google Search Status Dashboard — ranking history](https://status.search.google.com/products/rGHU1u87FJnkP6W2GwMi/history)
- [Google Search docs — FAQ rich result deprecation entries](https://developers.google.com/search/docs/appearance/structured-data/faqpage)
- [Whitespark 2026 Local Search Ranking Factors](https://whitespark.ca/local-search-ranking-factors/)
- [Whitespark — prevalence of AI Overviews in local search](https://whitespark.ca/blog/case-study-the-prevalence-of-ai-overviews-in-local-search/)
