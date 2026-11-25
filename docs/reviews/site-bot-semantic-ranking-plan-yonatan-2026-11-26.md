# Site Bot: a site that can rank semantically. Yonatan, 2026-11-26

I edited no files. Adam saves this as `/home/eitanya/wao/docs/reviews/site-bot-semantic-ranking-plan-yonatan-2026-11-26.md`.

## 0. Verdict in five lines
1. **Adam's thesis is right.** The ranking advantage comes from three things: facts only this business has, the right page tree built from real query data, and a real domain that collects links and citations. The trade library is the floor. It doesn't make the site different from competitors.
2. **Five of the 11 ideas are "can't rank without".** Topical map (1), depth interview (3), own domain (8), job log (4) and the Search Console loop (11). Links and citations (9) are close behind: every winner I measured on 11-11 had age and links.
3. **Three ideas need changing:**
   - **Semantic gate (2):** score against the competitor median as a warning only. Block only on missing sub-intents and a term-coverage floor. The evidence that content scores predict rankings is weak.
   - **Entity layer (7):** the GBP-to-site match is what matters. The schema itself is close to zero value for ranking.
   - **Anti-footprint (10):** keep the similarity gate. Cut "vary the section order"; it's cosmetic.
4. **One correction to my earlier work.** On 11-11 and earlier today I wrote that "a subdomain cannot rank on its own". That overstated it. Google's documented position is that it has no preference between subdomains and subfolders for ranking. Own domain is still a must, but for different reasons (section 2, item 8). I'm correcting the rationale, not the decision.
5. **The AI-answer picture as of Aug–Sep 2026 (US studies):**
   - For "[trade] in [city]", Google's AI Mode mostly cites the Google Business Profile, not websites.
   - Websites get cited on informational and price questions.
   - So the site's GEO job is price and problem answers carrying his own numbers. It is not the head term.

## 1. Evidence checked today (dated)

| Claim | Source, date | Confidence |
|---|---|---|
| No special optimization or schema is needed for AI Overviews or AI Mode. Both use "query fan-out" across subtopics. Fundamentals are crawlability, internal links, text content, an up-to-date Business Profile and Search Console | [Google Search Central, AI features](https://developers.google.com/search/docs/appearance/ai-features), fetched 2026-11-26, no page date | High |
| Google asks whether content offers "original information, reporting, research, or analysis", "information beyond the obvious" and "first-hand expertise". It has no preferred word count | [Creating helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), fetched 2026-11-26 | High. This is the policy basis for the information-gain thesis |
| LocalBusiness markup powers knowledge-panel and carousel display. Required: name and address. `areaServed` and `hasOfferCatalog` are not mentioned. Nothing says it affects ranking | [LocalBusiness structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business), fetched 2026-11-26 | High |
| AI Mode, local-intent queries: 79.8% of citations go to Google Maps/GBP, 12.8% to business websites. Informational queries: websites get 42.3%. AI Overviews showed on 21.8% of local queries vs 75.8% of informational. Cited AIO pages had schema, a phone number and concrete numbers slightly more often (correlation only) | [Steady Demand](https://www.steadydemand.com/ai-overviews-and-ai-mode-both-cite-local-businesses-in-almost-opposite-ways-ai-optimization-is-different-for-each/), 2026-08-22, revised 2026-09-09. ~8,000 US queries | Medium. US data, vendor study |
| GBP is 28.5% of all citations and the top source for AI Mode and AI Overviews. ChatGPT relies more on Yelp and **Bing**. ChatGPT's fan-out has started using `site:` searches on business websites | [BrightLocal local AI visibility study](https://www.brightlocal.com/research/local-ai-visibility-study/), 2026-09-16. ~200k prompts | Medium. US data |
| AI Overviews on 15% of local-intent queries vs Local Pack on 93%. In the 2026 factor weights, website on-page signals are ahead of GBP for AI visibility (secondary write-up) | [Whitespark 2026 LSRF](https://whitespark.ca/local-search-ranking-factors/), 2025-11-06. [Reputation.com summary](https://reputation.com/resources/articles/whitespark-2026-three-insights-every-brand-should-know) | Medium. Expert survey |
| Content-score tools show only weak correlation with rank. NeuronWriter scored best of the five tools tested | [Ahrefs content-score study](https://ahrefs.com/blog/seo-content-score-study/), updated May 2025. No 2026 study found | Medium |
| Google: no ranking preference between subdomain and subfolder | Search Central, via [SEJ](https://www.searchenginejournal.com/google-treats-subdomains-subdirectories-john-mueller-says/254687/). No new 2026 statement found | Medium-high |
| Site reputation policy update: enforcement now hits "the portion of the site affected" (different rules inside the EEA). It targets third-party content on a trusted host | [Google Search Central blog](https://developers.google.com/search/blog/2026/08/update-site-reputation-policy), 2026-08-28 | High. Relevant because client sites sit under wao.co.il |
| AI Mode is live in Israel and in Hebrew | [Google blog, languages expansion](https://blog.google/products/search/ai-mode-expands-languages-locations/), [SER](https://www.seroundtable.com/google-ai-mode-expands-40232.html), [Calcalist](https://www.calcalist.co.il/article/r1a3bocqlg) | Medium. I didn't find an official Israel-specific date |
| Israeli data we already hold: AIO on 54% of bare trade terms at city coordinates (2026-11-10). Local Pack on 99%. Page 1 held by directories. Single-city small sites in at most 8 of 591 top-3 slots | Repo, 2026-11-07/10/11 | High for the bare term. The exact "X ב-city" phrasing is still unverified |

**What this means for the design:**
- On the head term, the site's job is ranking in the blue links and feeding the Local Pack.
- In AI Mode, the GBP is the citation. GBP-to-site coherence is how the site helps there.
- Website citations happen on cost and problem questions. Those pages need concrete numbers from the owner.

## 2. Adam's 11 ideas: verdicts

★ marks "can't rank without it".

| # | Idea | Verdict | How it helps ranking | Evidence | Pipeline cost | Risk |
|---|---|---|---|---|---|---|
| 1 ★ | Topical map per trade from real queries | **KEEP, change scope.** One map per trade, refreshed quarterly. Per launch city, only a cheap SERP check. Don't build a map per client | Gives the right page tree: each page owns one intent cluster, with no cannibalization. Matches Google's query fan-out: the map's sub-questions are the sub-queries AI Mode issues. It also tells the interview which questions to ask | Google AI-features doc (fan-out). Our 11-11 page-type data. Today the only real question pool is one NeuronWriter query | Low. DataForSEO keyword ideas, related searches, PAA and autocomplete for ~40 seeds × 5 cities: single-digit dollars per trade (check on our account). ~1 engineer day to build the graph and classifier. My clustering rules | Fixture question pools leak into production (they're in all 26 dossiers today). Gate: real pool or no pages |
| 2 | Semantic coverage gate | **CHANGE.** Use it to find gaps and as a floor, not as a median-score block | Catches missing sub-topics a searcher expects (price drivers, process, area). Missing terms become questions for the owner, never filler | Ahrefs 2025: weak correlation, NeuronWriter best. Google: no preferred word count. Blocking at the competitor median score pushes keyword-stuffing into the library | Low. The NeuronWriter evaluate endpoint is already integrated (`neuronWriter.ts` parses `score` and `content_score`) | Goodhart: optimizing the score instead of the reader. Hence warn, not block |
| 3 ★ | Depth interview per service | **KEEP. This is the core of the design.** It must be bot-run by voice, not a call with Eitan (11-25: launch on paid ads, no pilot). Eitan handles only exceptions | Information gain: 20–40 facts nobody else has. These feed the "beyond the obvious" content Google asks for. They also give the price numbers AI answers cite, and cover NeuronWriter terms honestly | Google helpful-content questions. Steady Demand (concrete numbers correlate with AIO citations) | **High.** `voiceNote.ts` lists three blockers: a private, session-bound upload route; Hebrew speech-to-text; labels for the record controls. Plus a fact extractor, an owner read-back confirm step, and the question copy (Tamar → Noa) | Transcription errors become false claims. Owner read-back and confirm is mandatory. Privacy: never store customer names or addresses |
| 4 ★ (growth) | Job log as content | **KEEP.** Job entries render inside the service and area pages, plus one `/work` hub. No URL per job at first | Unique, fresh, local and dated. Supplies the evidence that unlocks area pages and "recent work" proof. Feeds GBP posts | 11-11 model (~50 city-tagged facts by month 6). Ranking small sites show field photos | Medium. WhatsApp intake, photo pipeline (strip EXIF and faces, blur plates), structured job record | One thin URL per job becomes scaled thin content. Customer privacy |
| 5 | Reviews as page content | **KEEP**, under today's rules: 30-day re-read, verbatim, purge on disconnect, no review markup | Adds unique, local, service-phrased text and trust that converts | Whitespark (review signals). GBP API policies (my 11-26 terms check) | Low-medium. A review→page router (service keywords, city mentions) | Policy gap on display (on the lawyer list). Reviews can't count toward the unique-fact floor on their own (they can disappear) |
| 6 | Problem pages + pricing page | **SPLIT.** The pricing page moves into the top 5 and launches whenever he gives ranges. Problem pages: month 2–3, only when the map shows volume and he has added ≥3 comment facts | The pricing page owns the cost intent ("כמה עולה…"). Cost queries trigger AIOs, and websites get cited on informational queries (42.3%). Problem pages capture symptom searches | Steady Demand. Our AIO memory (cost queries trigger AIOs) | Pricing: low (one page type plus a price-range chip). Problem pages: medium | Price numbers he didn't give: forbidden. Problem pages that are only library text are thin. Gate them |
| 7 | Entity layer | **CHANGE.** The GBP↔site match is the real work (worth something). Schema is cheap hygiene (near zero for ranking) | Byte-equal NAP. GBP services and categories mirror the site's service pages 1:1. The GBP website link goes to home, and the site links to the Maps URL (`sameAs`). This helps Google resolve one entity, which is what Local Pack relevance and AI Mode lean on | Google: LocalBusiness markup is for display, and no special schema is needed for AI. Whitespark: primary category and website content signals | Low. Schema already exists in gate 9. Mirroring GBP services needs the GBP API write after sign-in | Measure the GBP side, not the schema: brand query shows the knowledge panel linking to the site, and GBP website clicks are logged |
| 8 ★ | Own domain by default | **KEEP, with corrected reasons.** A .co.il in the client's name for every client, subdomain as noindexed staging only | (a) Links and citations build up on an asset the client owns and that leaves with him. (b) A Search Console domain property and Bing verification via DNS. (c) An exact-match name and a cleaner entity. (d) No fleet of client sites under wao.co.il, where a site-reputation action could hit "the portion of the site affected" | Google: no subdomain preference (so not a ranking penalty in itself). Site reputation update 2026-08-28 | Medium. The claims ledger says own-domain attach is NOT built. Registration is roughly ₪70–100 a year (verify registrar), ≤3 business days (11-12 decision) | Registration paperwork for a no-website owner. Decide who pays the domain (folding it into ₪199 is my recommendation, for Adam/Eitan) |
| 9 | Citations: b144, d.co.il, Midrag, easy, GBP link | **KEEP**, mechanical, before day 30. Owner: Amit | NAP consistency and link signals. **And** directories already hold page 1, so his listing there is his presence on the SERP itself | Whitespark (citations ~13% of AI-visibility weight, secondary). Our SERPs: midrag on 39/39 plumber cells | Low per client, but some directories are paid lead markets. Amit checks the free tier of each | Listing NAP must match GBP to the byte |
| 10 | Anti-footprint across the fleet | **KEEP the gate, CUT the shuffling** | Prevents a "scaled content / multiple sites" pattern across clients | Google spam policies (quoted 11-26) | Low. `ngramJaccard` exists but is offline. Turn it on with library text masked | Varying the section order is cosmetic, the same reasoning by which Fable rejected per-client rewriting. The real defence is the unique-fact floor |
| 11 ★ (month 3+) | Monthly Search Console growth loop | **KEEP.** Add Bing Webmaster data. Start the loop at day 60, not day 90 | Deepen pages at positions 8–30, build pages for impressions with no page, fold pages with no impressions | 11-11 model. VISION's month-4 GEO upgrade depends on GSC data | Low-medium. `gsc-pareto.mjs` exists, plus Search Console OAuth at go-live | Folding too early. Keep the 90-day minimum before any fold |

## 3. My own additions that beat several of the above

| # | Idea | Why it beats the list | Owner |
|---|---|---|---|
| A ★ | **SERP winnability classifier** per (page, city), using DataForSEO top 10 classed as directory / regional / small site | Decides which pages get built first and what we promise. If no small site holds the top 10, the page exists for converting visitors, with no ranking promise. This keeps the monthly report honest | Eitan-Dev. Rules mine (11-11 build item 7) |
| B ★ | **"The three questions callers ask you", in his voice** | The single highest information-gain Q&A source. It matches PAA, it's first-hand, and no competitor can copy it. Later, Phone Bot logs feed it | Interview question: Tamar → Noa |
| C | **Price ranges as a required post-pay field** ("from ₪X", "depends on Y"). Feeds the pricing page and the "what affects the price" section | Concrete numbers are what AI answers lift (correlation, Steady Demand). It's what liquidity.co.il ranks with. Ours would be true | Eitan-Dev (chip). Copy by Tamar |
| D | **Bing Webmaster Tools + IndexNow + Bing Places** at go-live | ChatGPT draws on Bing (BrightLocal, 2026-09-16). Near-zero cost, and nobody in Israeli trades does it | Eitan-Dev |
| E | **Hebrew synonym coverage in the map:** אינסטלטור/שרברב, פתיחת סתימות/פותח סתימות/ביובית, חשמלאי/חשמלאי מוסמך | The searcher's word varies. The H1 anchor stays fixed, and the variants go in H2s, body and the GBP description. This is entity clarity in Hebrew morphology | My map rules. Tamar's copy |
| F | **Electrician licence verification** against the public licensed-electrician lookup, shown as a verifiable fact | A trust fact that is true and checkable, and a strong first-hand signal. **To verify:** the current gov.il lookup URL and its terms (I didn't fetch it today) | Yonatan verifies the source. Eitan-Dev builds |
| G | **Owner phone video, 30–60 s per service**, on a YouTube channel in his name, embedded on the service page | Real, unique and multimodal. Fits the "real/human" direction. Ranking Israeli small sites carry field video (guy-plumber). Optional, from month 2 | Eitan-Dev (pipeline). Not a launch requirement |
| H | **Local link floor** beyond directories: suppliers' "installers" pages, the municipal business index, a local association, plus one normal portfolio link from the wao.co.il showcase (with consent) | The 11-11 winners had age plus links. Content alone climbs slowly | Amit |
| I | **GBP posts from job-log entries**, linking to the matching service page | Ties the GBP and the site to the same fresh fact. AI Mode reads the GBP | Eitan-Dev, via the GBP API after sign-in |

**Cut, explicitly:**
- `llms.txt` and AI-specific files. Google says they aren't needed (AI-features doc). ChatGPT uses Bing and the open web.
- FAQPage markup: no rich result since 2026-05-07.
- Per-client paraphrase of library text.
- One URL per job.
- Service × city pages at launch.

## 4. Ranked list (top 5 first)

1. ★ **Depth interview per service + caller questions + price ranges** (3 + B + C). The information-gain source.
2. ★ **Topical map per trade + SERP winnability classifier** (1 + A). The right tree and honest priorities.
3. ★ **Own domain by default, with Search Console and Bing verified by DNS at go-live** (8 + D).
4. ★ **Job log rendered into service and area pages** (4). It unlocks area pages and freshness.
5. **Pricing page** whenever he gives ranges (from 6). Owns the cost intent and is the most likely AI citation.
6. **GBP↔site coherence** (7, the GBP part) + **citations** (9) + **local link floor** (H).
7. ★ (month 3+) **Search Console + Bing growth loop** (11).
8. **Reviews routed to pages** (5).
9. **Coverage gate, warn-only on score** (2).
10. **Cross-client similarity gate, library masked** (10).
11. **Problem pages** (6) and **owner video** (G), months 2–3.

## 5. Target anatomy: one plumber, base Ra'anana, serves Kfar Saba and Herzliya

**Title formula unchanged and signed off:** `{service} ב{city}‏ | {brand}`. The H1 matches the title anchor. No Latin in either. Home holds the only trade + base-city anchor.

### At launch: 6–9 indexable pages, 3,500–5,500 content words

| URL | Owns | Floor (words / unique owner facts) | Content |
|---|---|---|---|
| `/` | "אינסטלטור ברעננה" + שרברב variants | 600–900 / ≥8 | Hero (6a). Service cards. How I work (his process facts). His 1-line price rule → /prices. Caller-question Q&A ×3–5. Areas, one true line each. About teaser with his quote. 3+ photos. Reviews after sign-in |
| `/services/{x}` ×3–5 (only services that cleared the interview) e.g. איתור נזילות, פתיחת סתימות, ניאגרה/אסלה, דוד | "[service] ברעננה" + its problem phrasings | 450–800 / ≥5 | When to call (library ≤30%). His typical job, what he checks first, included/excluded. Price drivers with his range on top. Q&A ×3–5 with his answers. Matching reviews. 1+ real photo. Links to 2 sibling services and home |
| `/prices` (only if he gave ranges) | "מחירון אינסטלטור" / "כמה עולה אינסטלטור" + city | 400–700 / ≥6 price facts | His ranges by job type, what changes the price, what's included. Never a number he didn't give, never a directory range presented as his |
| `/areas/{city}` 0–1 | "אינסטלטור ב[city 2]" | 350–600 / ≥2 city evidence | Only under the 2-evidence rule. Otherwise the city stays in home's areas section |
| `/about` | Brand, trust | 250+ | Years, licence (electrician: verified), photos, his own words |
| contact, legal | — | noindex | — |

Plus at go-live: GBP services mirrored 1:1, GBP website link to home, schema (LocalBusiness subtype + Service + BreadcrumbList, no AggregateRating), Search Console + Bing verified, sitemap = the indexable set.

### At month 3: ~14–20 indexable pages, 8,000–11,000 words
- Services deepened to 5–6, using Search Console queries at positions 8–30 and new job facts.
- `/areas/` ×2–3, from the job log (jobs and reviews naming the city).
- **Problem pages** ×2–4, chosen by the map plus his commentary (≥3 facts each). Examples: "ריח ביוב במקלחת", "נזילה מהתקרה", "חשבון מים גבוה". Question-form titles, with no trade+city head term.
- `/work` hub: 12+ dated job entries with photos, each also rendered on its service and area pages.
- Reviews on every page that has matching ones. GBP posts mirror the job entries.
- Citations live (≥4). 1–3 local links beyond directories.
- First Search Console loop run at day 60: one page built for impressions with no page, two pages deepened.

## 6. Data we must collect, and when

| When | What | How | Why |
|---|---|---|---|
| **Pre-pay** (sells the preview, ≤5 min, taps) | GBP link (Place ID). Services confirmed from GBP categories plus the map's checklist. Base and served cities. One price-rule chip. The caller-question answer. One recent job line | Existing intake | Enough for an honest home preview. Nothing that needs storage of Places content |
| **Post-pay, before go-live** (required, ~10–15 min voice, bot-run) | Per service (max 5): a typical job, what customers get wrong, what he checks first, included/excluded, price range or logic. The 3 questions callers ask + his answers. Years in the trade. Licence number (electrician). Equipment confirm card (taps). Neighbourhoods he works in most. ≥3 photos (him or his van, two jobs). GBP sign-in. Domain confirmed. Search Console/Bing via our DNS | Voice → speech-to-text → fact extractor → **owner read-back and confirm** → fact ledger | Information gain. Service pages are built only for services that clear ≥5 facts |
| **Weekly, after launch** | Job log: photo + one line (service, neighbourhood, what was found, what was done) | WhatsApp, one nudge a week | Freshness, area evidence, GBP posts |
| **Monthly** | A 2-minute voice note: "what was different this month". Answers to new questions raised by the Search Console loop | WhatsApp voice | Deepens the pages at positions 8–30 |
| **Never** | Customer names or addresses, prices he didn't say, response-time promises, equipment he didn't confirm | — | Truth and privacy |

## 7. Acceptance test: "this site can rank"

### Before publish (all BLOCK unless marked WARN)
1. **Domain:** own domain, HTTPS. Search Console + Bing verified. Sitemap = the indexable set. Self-canonicals. No fixture or demo strings.
2. **Tree:** every service he confirmed that has a map cluster has exactly one owning page. Zero anchor collisions. Title and H1 Hebrew-only with the RLM brand.
3. **Information gain:**
   - Home ≥8 and each service page ≥5 owner facts that appear on no other client site (fact-trace count).
   - Owner-fact share of body words ≥50% on service pages. Library ≤30%.
4. **Coverage:**
   - Every required sub-intent from the map is present (when to call, process, price, area, Q&A ≥3).
   - Word count ≥0.8× the NeuronWriter target for the page's query.
   - NeuronWriter basic-term coverage ≥60%.
   - Content score below the competitor median = **WARN**, and the missing terms are routed to the owner as questions.
5. **Similarity:** same-site ≤0.35. Cross-client same trade ≤0.25 overall and ≤0.10 with library text masked.
6. **Entity:**
   - NAP byte-equal to GBP. GBP website link goes to home.
   - GBP services ↔ service pages 1:1 (WARN until the GBP write is built).
   - Schema has 0 validator errors, with no AggregateRating or Review markup.
7. **Proof:** ≥3 real photos site-wide, and no library image repeated for a same-trade client in the region.
8. **Performance:** mobile lab LCP <2.5 s, CLS <0.1.
9. **No invented claims:** every rendered owner-voice sentence traces to a confirmed fact.

### After publish
These are my judgment thresholds, calibrated to the 11-11 data. Track them by DataForSEO rank checks at city coordinates plus Search Console.
- **Day 14:**
  - ≥80% of indexable pages indexed.
  - A brand query returns the site at #1.
- **Day 30:**
  - ≥90% indexed.
  - Impressions on ≥60% of money pages.
  - ≥4 citations live with matching NAP.
  - GBP website clicks >0.
- **Day 60:**
  - Impressions for every money page's target query.
  - ≥5 non-brand queries at positions ≤30.
  - ≥1 service or problem query in the top 20.
  - ≥4 job entries published.
  - First Search Console loop run.
- **Day 90 (pass):**
  - ≥1 "[service] ב[base city]" in the top 10, **or** ≥3 in the top 20.
  - Home head term inside the top 30.
  - Non-brand clicks >0.
- **Day 90 (fail), diagnosed in order:**
  1. Indexing.
  2. Coverage against the map.
  3. Authority. Escalate the link floor before writing more pages.
- Tel Aviv-class cities: no positional pass target. Track only.

## 8. The first two experiments

**E1: information gain beats the library, offline, ~2 days, before building the interview.**
- Take one real plumber (Eitan's network, with consent) in a city the classifier marks winnable (Holon, Bat Yam or Rehovot class).
- Run the five interview questions by hand once, by voice.
- Build "איתור נזילות ב[city]" three ways:
  - (a) today's pipeline;
  - (b) + library;
  - (c) + interview facts + his price range.
- Score each in NeuronWriter against the live top 10. Measure words, basic-term coverage, unique facts and cross-client similarity.
- **Pass:** (c) reaches at least the competitor median content score, with ≥50% owner-fact words, ≥5 unique facts, zero invented claims and ≤0.10 masked similarity to a second synthetic plumber.
- If (c) can't reach the median honestly, the interview questions are wrong. Fix them before building the voice pipeline.
- Cost: one or two NeuronWriter queries plus one call.

**E2: a real site against a ranking competitor, 90 days.**
- Publish that plumber's site on his own .co.il, under section 7.
- Track ~15 target queries weekly (service, head term, problem, price) by DataForSEO at city coordinates, plus a Local Pack grid and an AIO/AI Mode presence check on the same queries.
- Benchmark against the best small-business competitor for each query: the NeuronWriter score and position deltas.
- This is the only thing that turns section 7's thresholds from judgment into data. Its day-90 result goes into the next decision on the promise.

**Prerequisite, not an experiment:** the DataForSEO pull for plumber (keyword ideas, PAA, autocomplete, related searches) to build the first real map. It replaces the fixture pools now in all 26 dossiers.

## Sign-off and handoffs
- **Anchor and title formula:** signed off as in section 5.
  - The pricing page anchor "מחירון / כמה עולה אינסטלטור ב[city]" is a distinct cost intent, so it is not cannibalization. Home keeps only a one-line price rule linking to it.
  - Problem pages take question-form titles with no trade+city head term.
- **Fable 5.2:** decide the ranked list (section 4), the own-domain default and who pays for it, and whether the interview is required before go-live.
- **Eitan-Dev:**
  - DataForSEO map pull and classifier;
  - the voice interview's three blockers (`/home/eitanya/wao/src/lib/site-bot/voiceNote.ts`) plus the fact extractor and read-back;
  - own-domain attach;
  - Bing/IndexNow;
  - the cross-client gate, turned on;
  - the section 7 gates in `/home/eitanya/wao/src/lib/site-bot/reviewPreflight.ts`.
- **Tamar → Noa:** the interview questions (five per service plus caller questions, voiced) and the price-range chip copy.
- **Amit:** citations and the local link floor playbook.
- **Roni:** the section 7 pre-publish gates on E2's site.
- **Yonatan (me):** map clustering rules, verifying the electrician licence lookup, and running E1's scoring.
- **Adam:** run E1 first. Also fix VISION.md line 35, which still says "service × city".

**Files:**
- `/home/eitanya/wao/docs/reviews/site-bot-ranking-content-yonatan-2026-11-26.md`
- `/home/eitanya/wao/docs/reviews/site-bot-trade-library-spec-yonatan-2026-11-26.md`
- `/home/eitanya/wao/docs/reviews/organic-ranking-site-size-yonatan-fable52-2026-11-11.md`
- `/home/eitanya/wao/src/lib/site-bot/research/neuronWriter.ts`
- `/home/eitanya/wao/VISION.md`

**Next prompt to paste after /clear:** "Fable 5.2: decide on Yonatan's 2026-11-26 semantic-ranking plan. Ranked top 5: depth interview + caller questions + price ranges; topical map + winnability classifier; own domain by default with Search Console and Bing via DNS; job log; pricing page. Approve E1 (one real plumber, three page builds scored in NeuronWriter) before building the voice interview, and decide who pays for the client's domain."

## Sources
- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features), fetched 2026-11-26
- [Google: Creating helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), fetched 2026-11-26
- [Google: LocalBusiness structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business), fetched 2026-11-26
- [Google: Update to the site reputation policy](https://developers.google.com/search/blog/2026/08/update-site-reputation-policy), 2026-08-28
- [Steady Demand: AI Overviews vs AI Mode local citations](https://www.steadydemand.com/ai-overviews-and-ai-mode-both-cite-local-businesses-in-almost-opposite-ways-ai-optimization-is-different-for-each/), 2026-08-22, revised 2026-09-09
- [BrightLocal: Local AI visibility study](https://www.brightlocal.com/research/local-ai-visibility-study/), 2026-09-16
- [BrightLocal: ChatGPT search sources](https://www.brightlocal.com/learn/local-seo/uncovering-chatgpt-search-sources/)
- [Whitespark 2026 Local Search Ranking Factors](https://whitespark.ca/local-search-ranking-factors/), 2025-11-06; [Reputation.com summary](https://reputation.com/resources/articles/whitespark-2026-three-insights-every-brand-should-know)
- [Ahrefs: content score study](https://ahrefs.com/blog/seo-content-score-study/), updated May 2025
- [SEJ: Google on subdomains vs subdirectories](https://www.searchenginejournal.com/google-treats-subdomains-subdirectories-john-mueller-says/254687/)
- AI Mode in Hebrew/Israel: [Google blog](https://blog.google/products/search/ai-mode-expands-languages-locations/), [SER](https://www.seroundtable.com/google-ai-mode-expands-40232.html), [Calcalist](https://www.calcalist.co.il/article/r1a3bocqlg)
- Other AI-local studies seen, not relied on: [PinMeTo/Gemini](https://www.pinmeto.com/news/gemini-local-ai-citations-business-websites-study-2026/), [Whito UK trades](https://whito.co.uk/research/ai-recommendation-lottery-study/), [Ryan Doser field test](https://ryandoser.com/research/does-chatgpt-recommend-local-businesses/)
