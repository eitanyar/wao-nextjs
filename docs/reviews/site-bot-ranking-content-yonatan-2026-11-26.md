# Can Site Bot sites rank? What they must contain (Yonatan, 2026-11-26)

Saved verbatim by Adam from Yonatan's hand-back (his run had no Write tool).

## 1. Verdict

1. **Eitan is right. Today's site will not rank for "[trade] in [city]", and it will hardly rank for "[service] in [city]".**
   - The live home page carries about 210 content words.
   - Pages that rank for these queries carry 1,000–1,100 words on small-business sites, measured today.
   - The SERP median was 418 words (NeuronWriter, 11-11).
   - Directories hold the rest of page 1.
2. **Length is the symptom, not the cause.** The cause is the content model:
   - Every rendered sentence must cite an owner fact.
   - The interview yields 3–5 facts (the L1 run confirmed 4).
   - So page length is capped by the number of facts we collect, not by what the searcher needs.
   - There is no layer for general trade knowledge (how leak detection works, what drives the price, what to check yourself first). Competitors fill most of their pages with exactly that.
3. **Four fixes are cheap and already half-built:**
   - **The pitch is generated and then hidden.** `researchPageCopy.ts` writes a 120–220-word first-person sales letter on every page: "The system stores it and never shows it". It has already passed the binding gates.
   - **Home Q&A is off.** `faqPolicy: "none"` on home. The Q&A block renders only on service pages, and only when owner-answer facts exist.
   - **Only one Google review renders** (`reviewFeatured`), although the profile is the richest truthful source we hold.
   - **The 250-word floor only warns.** `reviewPreflight.ts` raises a WARN; it never blocks.
4. **Recommendation: launch on 29.11 with conditions** (section 7).
   - Ship the 3-day depth lift.
   - Noindex any page below the floor until it is deepened.
   - Re-word every "organic exposure" promise so it does not imply the site will rank in weeks.
   - Build the trade-knowledge layer in December.
   - If we launch with today's depth and today's promise, we sell something we can't deliver. The ad money still buys clients; we lose them at the first monthly report.

## 2. SERP evidence

**What I could verify today.**
- Live Google positions were not retrievable. WebSearch is not Google, and I made no paid DataForSEO call (this run had no shell).
- So Local Pack and AI Overview presence for these exact five queries is **not verified today**.
- I rely instead on Google data already in the repo:
  - 197 DataForSEO Google SERPs from 2026-11-07, bare trade terms at city coordinates: Local Pack in 99% of SERPs, AI Overview in 46%.
  - AI Overviews in 54% of 280 cells (2026-11-10). In our one live test (August), they cited publishers, not local businesses.
  - One google.co.il capture of "אינסטלטור בחולון" (top 19, NeuronWriter median 418 words, the two small sites on page 2).

**Today's WebSearch index (a proxy for who holds these queries, not Google order).** "אינסטלטור ברעננה", "אינסטלטור בכפר סבא", "פתיחת סתימות ברעננה", "איתור נזילות כפר סבא" and "חשמלאי ברעננה" returned only directories in the top results: b144, d.co.il (Zap), midrag, easy, pro. Not one independent small-business site appeared. This matches the 11-11 finding that single-city small sites are nearly absent from the top 3 (at most 8 of 591 slots).

**Pages measured today (fetched 2026-11-26):**

| Page | Type | Content words | Sections | Prices | FAQ | Reviews | Local facts | Templated |
|---|---|---|---|---|---|---|---|---|
| b144 /אינסטלטורים/רעננה | Directory, city | ~450–500 editorial words, plus listings | Price list, a guide "מידע על אינסטלטורים ברעננה" with 7 question-style H3s, nearby towns | Yes: visit ₪150–300, night ₪50–400, sink ₪150–400, toilet ₪180–270 | Implicit, through the H3s | Rating sort only | City in title, filters and nearby links; text mostly generic | Yes |
| pro.co.il sewer blockage / Rehovot | Directory, service×city | ~100–120 | Price list, common jobs, nearby areas | Partial | None | 5 listings with one-line excerpts | City name only | Yes |
| guy-plumber.co.il plumber in Holon | Small business, city page | ~1,000 | 12 H2s: service in the city, "what to know in Holon", emergency, related services, field photos, field video, guides, reviews, FAQ | None ("price before work") | 4, city-phrased | 3 | Generic ("older neighbourhoods") | Partly |
| liquidity.co.il leak detection Holon | Small business, service×city | ~1,100 | Why us, 2026 price list, methods (thermal, gas, fibre, acoustic), areas, FAQ | Yes, detailed: ₪1,200–2,800 by method, ₪200–500 if no leak is found | 8 (cost, breaking walls, timing, final price, not found, repair included, insurance, weekends) | None, only an unsourced "4.9 בגוגל" | 10 Holon neighbourhoods | Heavily (~80 cities; claims contradict each other) |

**What this means:**
- Directories win by domain authority plus listings. A thin page works for them; it cannot work for a new small site.
- Small sites that rank win on depth:
  - methods (trade knowledge)
  - prices or price logic
  - 4–8 FAQ answers aimed at real objections (cost, damage, insurance, timing)
  - reviews, field photos and video
  - area lists
- Their weakness is invention and templating: contradictory claims, unsourced ratings, an address outside the city. A truthful site with a little real local detail can beat that over time. A thin one cannot.

## 3. What Google says now

- **Spam policies (fetched 2026-11-26; no "last updated" date on the page):**
  - Doorway abuse includes "pages targeted at specific regions or cities that funnel users to one page" and "substantially similar pages that are closer to search results than a clearly defined, browseable hierarchy".
  - Scaled content abuse includes "using generative AI tools… to generate many pages without adding value for users" and "creating multiple sites with the intent of hiding the scaled nature of the content". The second one is the fleet risk across our client sites.
- **AI-content guidance (fetched 2026-11-26):** AI is fine for "structure to original content". Check facts by hand before publishing, including titles, structured data and alt text.
- **November 2026 core update:** started 10 Nov and was reported complete on 24 Nov (Search Engine Roundtable). Google called it "a regular update… relevant, satisfying content". There was no local-specific statement. The August 2026 spam update covered mass-produced low-value pages.
- **FAQ rich results:** removed from Google Search for all sites on 2026-05-07 (multiple outlets citing Search Central). The markup is still valid and Google says it still uses it to understand pages. So Q&A earns intent coverage and a chance of an AI-answer citation, not a SERP feature.

**What this means for us:** an auto-generated local site is safe if each page carries facts true only of this business and this page. It is at risk if 50 client sites share the same paragraphs, or if city pages differ only by the city name.

## 4. The gap, per page type (code as of commit 432e4f4)

| Gap | Where | Effect |
|---|---|---|
| Every sentence must cite an owner fact, and there is no trade-knowledge source | `depthBlocks.ts` factIds rule; `pageBrief.ts` turns the process block on only when service facts exist (`blocksEnabled.process`) | Page length = number of facts (~5). This is the root cause |
| Pitch hidden | `researchPageCopy.ts:892` "never shows it" | 120–220 gated words wasted on every page |
| No Q&A on home; service Q&A needs at least 3 pool questions plus an owner-answer fact | `rendersDepthBlocks` = money_service only; `QA_MIN_POOL` 3 | The objection questions every ranking page answers are missing |
| One review | `reviewFeatured` only | Our best truthful, locally phrased text goes unused |
| `/services/plumber` duplicates the home head term | `planCopyReadyDossier` creates a page for the trade itself | Cannibalization: two pages competing for "אינסטלטור ברעננה" |
| No area pages | The planner emits only money_service; `qualified_service_area` is held | The second city (Kfar Saba) has no page. Home's about H2 "אינסטלטור בכפר סבא…" puts a second city head term on home |
| Floor only warns | `reviewPreflight.ts:460` | Thin pages publish |
| Latin leak risk in title and H1 | The fixture shows `plumber ב-Holon` | If the label falls back to English, the anchor breaks and bidi breaks with it |
| Subdomain sites | `domainChoice: no_domain` → `{slug}.wao.co.il` | Cannot rank on its own in any meaningful way (11-11 finding); also a fleet footprint on WAO's own domain |

## 5. Page tree

| Page | Targets | Launch rule | Avoiding doorway pages and cannibalization |
|---|---|---|---|
| `/` home | "[trade] ב[base city]" | Always | The only page with the trade + base-city anchor. Never create `/services/{trade}` |
| `/services/{service}` | "[service] ב[base city]", plus problem phrasings | One per real service the owner confirmed (3–6) | Distinct intent per service; similarity gate between pages |
| `/areas/{city}` | "[trade] ב[city 2]" | Only with at least 2 pieces of city evidence (an interview fact, a review naming the city, the GBP service area, a confirmed job). Otherwise the city lives in home's areas section | Lists all services in that city, carries city-only facts, linked from home → areas. Never service × city at launch |
| `/about` | Brand and trust | Always | Owner quote, years, licence, photos, reviews |
| `/contact`, legal | — | noindex | — |

No separate FAQ page and no blog. Q&A lives on the page whose intent it answers, so a hub FAQ page can't compete with it. **Launch: 5–9 indexable pages. Grow to ~15–30 earned pages by month 6**, as in the 11-11 model (problem pages, a pricing page if the owner gives prices, job-log proof).

## 6. Per page type: depth, sections, sources

Sources: **G** = Google profile (reviews, rating, hours, photos, categories); **I** = interview facts; **K** = intake (services, areas); **R** = research dossier (NeuronWriter questions, terms, word target); **T** = trade knowledge, which does not exist yet.

**Home: 600–900 words (launch floor 500)**
1. Hero (section 6a).
2. Services: 3–6 cards, 40–60 words each, linking to the service pages. Sources: K, I, later T.
3. "How I work": the pitch, now shown. Sources: I and K. It is already gated.
4. Reviews: 3–5 verbatim Google reviews with first name and date (G). We fill this truthfully.
5. Areas: each served city with one true line. Sources: K and I.
6. Q&A, 3–5 items:
   - Questions: R (the dossier's question pool) plus the interview's caller-question answer.
   - Answers: I (price rule, area, hours), and later T.
7. About teaser with the owner quote (Fable 11-26).

**Service page: 450–800 words (launch floor 350)**
1. H1 "[service] ב[city]" and a subheadline.
2. When to call: symptoms. Needs T.
3. How I do it: steps. Needs I (the recent job, the price rule) or T, neutral voice.
4. What affects the price: needs T plus his price rule from I. **Never a number he didn't give.**
5. Q&A, 3–5 items: R questions, answered from I and later T.
6. Reviews that mention this service: G, keyword match. Omit the section if none match.
7. One real job: I (`recentJob`).
8. Links to 2 sibling services and home.

**Area page: 350–600 words.** City-specific evidence (I, G reviews naming the city, a job there), the services offered there, how he covers the city (I), and a review from that city.

**About: 250+ words.** Owner quote, years and licence (I), photos (G), reviews (G).

**What we can fill truthfully today:** hero, services list, how-I-work (pitch), reviews, areas, the about block, one job, his price rule.
**What needs T or new interview data:** symptoms, methods, price drivers, most Q&A answers, prices.
**What is forbidden:** an equipment claim he didn't confirm ("thermal camera"), price numbers he didn't give, response-time promises, invented scenarios, a 24/7 claim. Also any directory price range written as ours (b144-style ranges are third-party).

**Trade knowledge (T), the key unlock, specified:**
- One base library per trade, written once by waocopy and reviewed by Yonatan and Noa. Launch trades only (plumber, electrician).
- Stated in neutral voice ("בדרך כלל…"), never as a claim about him.
- Capped at ~40% of a page.
- Rewritten per client, and blocked when cross-client similarity in the same trade is above 0.25.
- An owner confirm card ("I use: [method checkboxes]", "I don't do: …") turns neutral lines into first-person facts. No typing for him; one tap each.

### 6a. The home-page hero

It answers the caller's five questions:

| Question | What answers it |
|---|---|
| Does he do my job? | H1 = trade + city (anchor, formula unchanged), then a subheadline naming his top 2–3 services in plain words |
| Does he come to me? | Base city plus served cities |
| Can I trust him? | The Google rating and review count line (Fable 11-26, shown at ≥4.5 and ≥5 reviews) |
| When? | Today's hours from Google (true, from G) |
| What next? | Call, plus WhatsApp |

Optional: his price rule in plain words, if he confirmed one. Nothing about what he refuses, no story, no slogans. Service chips under the subheadline may link to the service pages. That is useful to the caller and is internal linking as well.

## 7. Ranking gate: hard minimums before publish (in `reviewPreflight.ts`, WARN → BLOCK)

Rule: a page that fails is noindexed and left out of the sitemap. The site goes live only when home passes.

| # | Check | How to test it in code |
|---|---|---|
| 1 | Words | `wordCount` on `<main>` minus nav, footer and form. Home ≥500, service ≥350, area ≥350, about ≥250 at launch. Raise to 600 / 450 / 350 / 250 once T ships |
| 2 | Facts | Each indexable page cites ≥3 distinct facts (I, G or K), and ≥1 of them used on no other page. Count distinct factIds plus review IDs |
| 3 | Q&A | ≥3 Q&A items on home and on each service page, each answer citing a fact (factIds non-empty) |
| 4 | Reviews | ≥2 verbatim Google reviews on home when the profile has ≥2 with text |
| 5 | One page per anchor | The normalized (service, city) pair from title and H1 is unique across the site. Block `/services/{slug}` when its label equals the trade |
| 6 | Anchor script | Title and H1 contain no Latin tokens on a Hebrew site (regex `[A-Za-z]` → block). The title formula holds: `{service} ב{city}‏ \| {brand}` |
| 7 | Similarity | No two pages on the site share n-gram Jaccard above 0.35 (`checkNearDuplicates`). Same-trade sites across clients ≤0.25 (`ngramJaccard`, currently offline): block |
| 8 | Links | Every indexable page has ≥2 inbound links in body text. Home links every service and area; each service page links home and 2 siblings |
| 9 | Schema | The LocalBusiness subtype on every page: name and phone byte-equal to Google, `areaServed`, `openingHours`, `sameAs` the Maps URL. `Service` plus `BreadcrumbList` on service pages. FAQPage allowed (no rich result). No AggregateRating |
| 10 | Photos | ≥1 Google profile or owner photo on home. A library image may never repeat for a same-trade client in the same region (compare file hashes) |
| 11 | Indexability | Self canonical, no stray noindex, sitemap equals the indexable set, no `fixture-` or demo strings. A subdomain site raises a WARN and the site is not submitted to Search Console |

## 8. What's realistic by 29.11 vs after

**By 29.11 (3 days; each item is a small change on code that exists). Owner: Eitan-Dev, then Roni verifies.**
1. Render the pitch on home as "how I work" (+120–220 words).
2. Render 3–5 Google reviews on home, after checking the Places review data reaches the site record (the same data-path check as the Fable 11-26 rating line).
3. Turn on the Q&A block for home. Questions come from the dossier pool and the caller question. When answer facts are missing the block drops, never pads.
4. Remove `/services/{trade}` when it duplicates home.
5. Gates 1, 5, 6 and 11 as blocks; failing service pages are noindexed, not shipped thin.
6. **Truth pass on the `/site-bot` page and the ads** (owner: Adam, wording by Tamar):
   - "Organic exposure" = Google profile plus a site built to grow on Google.
   - No promise of search rankings or of a timeframe.
   - Months 1–3 value is mostly the Local Pack, which shows on 99% of these SERPs.

**Is launching wasted ad spend?** With items 1–6, no. The ads buy owners, and the Google profile work delivers early value. With today's depth and today's wording, the spend is not wasted on acquisition. It is wasted on retention, because the first monthly report shows no search presence.

**After launch (December → January), in order:**
1. The trade-knowledge library plus the owner confirm card. Owners: waocopy, Noa, Eitan-Dev. Rules mine.
2. Price chips made required, giving the "what affects the price" section and a pricing page.
3. Area pages under the 2-evidence rule.
4. A cross-client similarity block in production.
5. Turn the voice note on, plus the WhatsApp job log (the growth engine).
6. Own domain by default (a .co.il in the client's name), the subdomain only as noindexed staging.
7. Search Console at go-live, plus the monthly loop: deepen pages at positions 8–30, build pages for impressions that have none, fold pages with no impressions after 90 days.
8. Raise the floors to the full targets.

**Before the next decision:** one cheap DataForSEO run of the 5 queries above at Ra'anana / Kfar Saba coordinates, to confirm Local Pack, AI Overview and the organic mix for these exact phrasings. Owner: Eitan-Dev.

## Sign-off and handoffs
- **Title formula and anchors:** unchanged and signed off. The H1 / title stay "[service] ב[city]". The hero changes in 6a don't touch the H1. Gate 6 protects the anchor.
- **Fable 5.2:** decide on launch-with-conditions (section 8) vs delay, and on the trade-knowledge layer (6, "T").
- **Eitan-Dev:** the 29.11 items 1–5. **Roni:** verify on a live preview with a rated, reviewed fixture. **Tamar (waocopy) and Noa:** the trade-knowledge library and the confirm-card copy after launch.
- **Adam:** promise truth pass (item 6); save this report to `/home/eitanya/wao/docs/reviews/site-bot-ranking-content-yonatan-2026-11-26.md`.

**Next prompt to paste after /clear:** "Fable 5.2: decide on Yonatan's 2026-11-26 Site Bot ranking review. Launch 29.11 with the 3-day depth lift (show the pitch, home reviews, home Q&A, drop the trade duplicate page, word/anchor/Latin gates with noindex on fail) plus the promise truth pass, or delay. Then approve or reject the trade-knowledge layer as the December priority."

## Sources
- [Google spam policies (doorway, scaled content)](https://developers.google.com/search/docs/essentials/spam-policies), fetched 2026-11-26
- [Google: using generative AI content](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content), fetched 2026-11-26
- [SER: November 2026 core update](https://www.seroundtable.com/google-november-2026-core-update-42504.html), 2026-11-10, sidebar reports completion 2026-11-24
- [SER: Google drops FAQ rich results](https://www.seroundtable.com/google-drops-faq-rich-results-41298.html); [Search Engine Land](https://searchengineland.com/google-to-no-longer-support-faq-rich-results-476957)
- Pages measured: [b144 plumbers in Ra'anana](https://www.b144.co.il/%D7%90%D7%99%D7%A0%D7%A1%D7%98%D7%9C%D7%98%D7%95%D7%A8%D7%99%D7%9D/רעננה/), [pro.co.il Rehovot](https://www.pro.co.il/plumbers/project/opening-a-blockage-in-the-sewer/rehovot), [guy-plumber Holon](https://www.guy-plumber.co.il/%D7%90%D7%99%D7%A0%D7%A1%D7%98%D7%9C%D7%98%D7%95%D7%A8-%D7%91%D7%97%D7%95%D7%9C%D7%95%D7%9F), [liquidity Holon](https://liquidity.co.il/area/holon/)
- Query results (WebSearch, not Google order): [b144 leak detection Kfar Saba](https://www.b144.co.il/%D7%90%D7%99%D7%AA%D7%95%D7%A8-%D7%A0%D7%96%D7%99%D7%9C%D7%95%D7%AA/%D7%9B%D7%A4%D7%A8-%D7%A1%D7%91%D7%90/), [b144 plumbers Kfar Saba](https://www.b144.co.il/%D7%90%D7%99%D7%A0%D7%A1%D7%98%D7%9C%D7%98%D7%95%D7%A8%D7%99%D7%9D/%D7%9B%D7%A4%D7%A8-%D7%A1%D7%91%D7%90/), [b144 electricians Ra'anana](https://www.b144.co.il/%D7%97%D7%A9%D7%9E%D7%9C%D7%90%D7%99%D7%9D/רעננה/), [d.co.il plumbers](https://www.d.co.il/h-c2550-e0-p0-l0-city8700), [midrag Ra'anana](https://www.midrag.co.il/pages/agora/Content/UrbanPortal/1149)
- Repo files:
  - `/home/eitanya/wao/docs/reviews/organic-ranking-site-size-yonatan-fable52-2026-11-11.md`
  - `/home/eitanya/wao/docs/reviews/site-bot-mvp-hard-audit-2026-11-24.md`
  - `/home/eitanya/wao/docs/reviews/site-bot-first-screen-rating-fable52-2026-11-26.md`
  - `/home/eitanya/wao/src/lib/site-bot/research/pageBrief.ts`
  - `/home/eitanya/wao/src/lib/lp/depthBlocks.ts`
  - `/home/eitanya/wao/src/lib/lp/researchPageCopy.ts`
  - `/home/eitanya/wao/src/lib/lp/researchedSite.ts`
  - `/home/eitanya/wao/src/lib/site-bot/researchToSite.ts`
  - `/home/eitanya/wao/src/lib/site-bot/reviewPreflight.ts`
  - Live preview record: `/tmp/claude-1000/-home-eitanya-wao/128d0890-f0dd-4b65-96a9-14a1690ce715/scratchpad/eitan/live/research/a8f2ed58-3488-4ef8-89ea-aa8cffc4e4ca/preview-home.json`
  - Live dossier: `/tmp/claude-1000/-home-eitanya-wao/128d0890-f0dd-4b65-96a9-14a1690ce715/scratchpad/eitan/live/research/a8f2ed58-3488-4ef8-89ea-aa8cffc4e4ca/dossier.json`
