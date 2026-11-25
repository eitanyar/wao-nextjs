## Yonatan: trade library spec (plumber + electrician) and Places/GBP terms check, 2026-11-26

Adam, I edited no files. Four things you should know before the brief:

1. **The repo's question pools are mostly not real.** All 26 dossiers under `data/site-research/*/dossier.json` and the scratchpad dossier `/tmp/claude-1000/-home-eitanya-wao/128d0890-f0dd-4b65-96a9-14a1690ce715/scratchpad/eitan/live/research/a8f2ed58-3488-4ef8-89ea-aa8cffc4e4ca/dossier.json` hold fixture placeholders ("leak detection paa question?"). The only real NeuronWriter pool is `/home/eitanya/wao/src/lib/site-bot/research/testdata/neuronwriter-get-query-he.json`: one keyword, plumber in Holon, with 10 topic_matrix questions and 31 content_questions.
2. **There is no real electrician pool at all.** Electrician entries rest only on the ranking pages below.
3. **I could not pull People Also Ask.** WebSearch does not return it. A DataForSEO SERP pull for אינסטלטור and חשמלאי would fill that gap.
4. **Some evidence is snippet-level.** midrag.co.il returns 403 to direct fetch, so midrag rows come from search snippets. Where an entry has only one strong source, the row says so.

---

## A. waocopy brief: trade library v1 (plumber, electrician)

**Persona:** an Israeli homeowner looking at a local tradesman's home page, either mid-problem or about to call.

**Where it goes:** three labelled home-page blocks:
- "when to call" (kind `symptom`)
- "what affects the price" (kind `price_driver`)
- "common questions" (kind `qa`)

The same fixed text appears on every client site of that trade. waocopy decides wording and length. A soft guide: symptom and price-driver entries are about one sentence; Q&A answers are two or three.

**Output:** JSON array with fields `{id, kind, serviceGroups, question_he (qa only), text_he}`. Keep the ids below unchanged.

### Hard rules for every entry
- **Voice:** neutral and impersonal. No first person and no "we".
- **Nothing about the owner:** no availability, speed, warranty, quote-by-phone or licence claims for him.
- **No digits anywhere:** no prices, durations, ages, amperages or intervals.
- **No methods or equipment.** No camera, spiral, thermal, megger, liner, chemicals, product names or brands.
- **No do-it-yourself steps.** The only exception is the safety lines listed below.
- **Out of scope:** regulations, laws, insurance, utility-company procedures, health or drinkability claims.
- **No city names and no trade-plus-city head terms.** Entries must not carry the head term (my anchor rule).
- **Electrical: prohibitions only, never actions.** Allowed: "don't touch", "don't keep resetting", "keep away from water near sockets", "don't open the panel". Never: "switch off the circuit", "test the RCD", "reconnect appliances one by one".
- **Plumbing: one allowed safety action.** Closing the main water valve during a burst or uncontrolled flow (P-S20, P-QA16). This is my recommendation; Adam confirms.
- **Never contradict a possible owner fact.** For example, never say "plumbers usually charge extra at night".
- **Tone:** say the situation and why it matters. No sales copy and no "call us".

### Service groups for the matcher (engineer spec, no Hebrew)

Service ids are model-generated slugs: `svc-<slug>` from `siteIdentity.ts`, and owner-service ids `owner-service:<value>` from `runResearch.ts` `ownerEvidence`. So the matcher maps slug keywords to groups, the way `ELECTRIC_SLUG_KEYWORDS` does in `src/lib/lp/generationData.ts`.

- **Plumber anchor vocabulary.** The six keys in `/home/eitanya/wao/assets/photo-library/plumber/library.json`: leak-detection, leak-repair, drain-cleaning, pipe-replacement, water-heater-installation, bathroom-renovation. Live slugs also seen: drain-unclogging, drain-unblocking, toilet-cistern-repair.
- **Electrician.** The code has no fixed vocabulary. Testdata slugs: electrical-panel-upgrade, emergency-electrician, ev-charger-install.

| Trade | Group | Slug contains |
|---|---|---|
| plumber | `leak` | leak, moisture, damp |
| plumber | `drain` | drain, clog, unblock, blockage, sewer, sewage |
| plumber | `toilet` | toilet, cistern, flush |
| plumber | `pipe` | pipe, burst, repip, plumbing-line |
| plumber | `heater` | water-heater, boiler, solar-heater |
| plumber | `faucet` | faucet, tap, mixer |
| plumber | `bathroom` | bathroom, renovation |
| electrician | `fault` | fault, short, trip, outage, troubleshoot, repair, emergency |
| electrician | `panel` | panel, breaker, fuse, board, three-phase, phase, capacity |
| electrician | `outlet` | outlet, socket, point, wiring, rewir |
| electrician | `lighting` | light, lamp, fixture |
| electrician | `ev` | ev-, charger, charging |
| electrician | `heater` | water-heater, boiler |
| electrician | `renovation` | renovation, new-build |

**Selection rules:**
- `trade` entries are always eligible.
- Entries matching a confirmed service go first, in the order listed below, and fill the 30% cap.
- **Mutual exclusions** (the page-wide repeat lint would fight these):
  - P-QA02 and E-QA03 (the cost questions) are dropped whenever the price block renders.
  - P-QA20 and P-S02 never appear together.

### Plumber (48 entries)

**Evidence key** (all fetched or searched 2026-11-26):

| Code | Source |
|---|---|
| NW | NeuronWriter recorded pool (plumber, Holon); `nw:topic` = topic_matrix, `nw:cq` = content_questions |
| P1 | pro.co.il/plumbers/guide/pipeline-explosion (updated 10.10.2026, full fetch) |
| P2 | ynet.co.il/economy/article/5031629 (22.10.2017, full fetch; old) |
| P3 | pro.co.il sewer-smell and clog ask pages (search) |
| P4 | midrag price pages 630 / 28164 / 28116 and price lists 3466 (snippets) |
| P5 | pro.co.il leak-detection guides and mold ask page; mako and ynet leak articles (search) |
| P6 | midrag Content/Tip/7396 water-heater tip (snippet) |

| id | kind | groups | Searcher question or symptom (Hebrew target where verified) | Must / must not | Evidence |
|---|---|---|---|---|---|
| P-S01 | symptom | trade | Water meter keeps moving with all taps closed ("שעון המים ממשיך להסתובב") | Must: likely a leak somewhere in the line. Must not: a test procedure. | P2, P5 |
| P-S02 | symptom | leak | Water bill jumped with no change in use ("חשבון המים התנפח") | Must: a common first sign of a hidden leak. | P1, P2, P5 |
| P-S03 | symptom | leak | Damp patch, bubbling or peeling paint, mold on a wall or ceiling ("רטיבות בקיר", "עובש") | Must: water may be travelling from elsewhere. Must not: name waterproofing products. | P1, P2, P5 |
| P-S04 | symptom | leak | Musty smell in a room with no visible water | Must: can point to a hidden leak. | P5, P2 |
| P-S05 | symptom | leak, pipe | Darkened grout, water between tiles, tiles loose underfoot | | P1, P2 (shower floor) |
| P-S06 | symptom | pipe, leak | Hissing or flowing sound in a wall with taps closed | Must not: tell the reader to open the wall. | P1, P2 (cistern sounds); 1.5 sources |
| P-S07 | symptom | pipe, trade | Sudden pressure drop at one tap or the whole home ("לחץ מים נמוך") | Must: can be a leak, or the supply side. Must not: say it is always a leak. | P1, P2 |
| P-S08 | symptom | leak, pipe | Water dripping from the ceiling; may come from the flat above | Must: neutral note that the source can be upstairs. | P1 only, flagged |
| P-S09 | symptom | drain | Sink or shower drains slowly ("סתימה בכיור") | Must not: plunging, chemicals, home remedies. | nw:cq, P3, P4 |
| P-S10 | symptom | drain | Several drains blocked at once, or the toilet backs up when the shower runs | Must: points to a deeper or main line; urgent. | P3 (multiple pages) |
| P-S11 | symptom | drain | The same clog keeps coming back | Must: recurrence means the cause is not cleared. | P3, nw:cq |
| P-S12 | symptom | drain | Sewage smell from shower, sink or toilet ("ריח ביוב במקלחת") | Must: cause only. | P3 (four pro.co.il ask pages) |
| P-S13 | symptom | toilet | Toilet cistern keeps running or refilling ("ניאגרה") | Must not: repair steps. | P2, P4 |
| P-S14 | symptom | toilet, drain | Toilet overflows suddenly | Must: urgent. | P3 |
| P-S15 | symptom | heater | Wet area or drip around the water heater ("דוד") | Must not: touching the heater or its wiring. | P2, P5 |
| P-S16 | symptom | heater | No hot water | Must: the cause can be electrical; that part is a licensed electrician's. Must not: imply a plumber fixes heating elements or thermostats. | P6, P5. Show only on a confirmed heater service. |
| P-S17 | symptom | faucet | Tap still drips when closed ("ברז מטפטף") | Must: wastes water and signals a worn part. Must not: repair steps. | nw:cq, P4 |
| P-S18 | symptom | trade | Yellow, brown or cloudy water from the tap ("מים צהובים מהברז") | Must: building-wide or citywide points to the supply; only your home and persistent points to the pipes. Must not: any health or drinking claim. | nw:cq (two questions); flagged sensitive, Noa and Eitan read closely |
| P-S19 | symptom | pipe | Bursts or leaks keep recurring in old pipes | Must: old pipes tend to fail again nearby. Must not: digits for age. | P1 only, flagged |
| P-S20 | symptom | trade | Burst pipe or water that cannot be stopped is an emergency ("אינסטלטור חירום") | Must: the one allowed action is to close the main water valve; never touch sockets or appliances in a wet area. Must not: claim the owner's availability. | P1, nw:topic |
| P-PD01 | price_driver | trade | Type of fault | | P4, nw:topic ("כמה עולה") |
| P-PD02 | price_driver | trade | Access: exposed, or inside a wall or under the floor | | P1, P4 (concealed cistern costs more) |
| P-PD03 | price_driver | trade | Parts needed and their quality | Must not: say who supplies the parts. | P4 |
| P-PD04 | price_driver | pipe | Pipe material and condition | Must not: name pipe products. | P1 |
| P-PD05 | price_driver | leak, pipe | Whether a wall or floor must be opened and then closed | Must not: a no-damage promise. | P1, nw:topic |
| P-PD06 | price_driver | drain | Where the blockage sits: one fixture, or the building or main line | | P4, P3 |
| P-PD07 | price_driver | drain | Whether the line has to be checked along its length | Must not: name the camera or any equipment. | P4 |
| P-PD08 | price_driver | trade | Timing: nights, weekends, holidays | Must: general ("often affects price"). Must not: say this owner charges more. | nw:topic; single, flagged |
| P-PD09 | price_driver | toilet | Exposed or in-wall (concealed) cistern | | P4 (two pages) |
| P-PD10 | price_driver | heater | Heater type and where it is installed (roof, niche) | | P2, P6 |
| P-PD11 | price_driver | leak | One leak point, or several, and how far the damage spread | | P1, P5 |
| P-QA02 | qa | trade | "How much does a plumber cost?" ("כמה עולה להזמין אינסטלטור") | Must: depends on the fault and access. No numbers. Excluded when the price block renders. | nw:topic (9), nw:cq |
| P-QA03 | qa | trade | "How to choose a reliable plumber?" ("איך בוחרים אינסטלטור אמין") | Must: clear explanation before work starts, written invoice and work summary. Must not: licence, insurance or regulation; anything implying the owner. | nw:topic (9), P1 (invoice, report, warranty) |
| P-QA04 | qa | trade | "What counts as a plumbing emergency?" | Must not: availability claims. | nw:topic (8), nw:cq, P1 |
| P-QA05 | qa | leak | "There is a leak but I don't know the source; what now?" ("נזילה סמויה — למי פונים?") | Must: list the signs and say the source can be far from the stain. Must not: methods. | nw:topic (8), nw:cq ×2, P5 |
| P-QA06 | qa | leak | "Can a leak be found and fixed without damaging walls or floors?" | Must: sometimes; depends on location. Must not: guarantee, method names. | nw:topic (7), P1 |
| P-QA07 | qa | trade | "Can I get an estimate before the visit?" ("אפשר לדבר עם אינסטלטור לפני שהוא מגיע?") | Must: what helps an estimate (where, since when, photos). Must not: claim the owner quotes by phone. | nw:topic (7), nw:cq |
| P-QA08 | qa | trade | "How to prevent plumbing faults?" | Must: grease and wipes build up in drains; watch for early signs. Must not: maintenance procedures, chemicals. | nw:topic (5), P3 |
| P-QA09 | qa | drain | "What's the difference between a plumber and a sewage truck?" ("ההבדל בין אינסטלטור לביובית") | Must: neutral split between in-home lines and building or main line. | nw:cq, P3 |
| P-QA10 | qa | drain | "Sink clog: fix it myself or call a plumber?" | Must: answer only when to call (recurring, several drains, smell, rising water). Must not: any unclogging step or chemical. | nw:cq, P3 |
| P-QA11 | qa | faucet | "Dripping tap: worth trying myself first?" | Must: when it is worth calling. No steps. | nw:cq |
| P-QA12 | qa | trade | "Yellow water from the tap: causes, what to do?" | Same rules as P-S18; never both on one page. | nw:cq |
| P-QA13 | qa | trade | "What should I check before ordering a plumber?" ("מה כדאי לבדוק לפני שמזמינים") | Must: what to prepare. Must not: overlap P-QA03. | nw:cq |
| P-QA15 | qa | leak | "Hidden leak: plumber, leak specialist or waterproofing contractor?" | Must: neutral routing by where the water comes from. Must not: disparage other trades. | nw:cq, P5 |
| P-QA16 | qa | pipe | "What to do when a pipe bursts?" | Must: close the main valve, stay away from electricity in wet areas, call. Must not: insurance, claims process. | P1, P2 |
| P-QA17 | qa | trade | "What should I get after the job is done?" | Must: invoice, what was done. Must not: warranty length, or that the owner gives one. | P1 only, flagged |
| P-QA18 | qa | drain | "Why does the bathroom smell of sewage?" | Must: common causes (dry or faulty trap, blockage). Must not: fixing steps. Never alongside P-S12. | P3 (four pages) |
| P-QA19 | qa | heater | "Water heater not heating: who do I call?" | Must: the electrical side goes to a licensed electrician. Must not: tell the reader to test anything. | P6, P5 |
| P-QA20 | qa | leak | "Why is my water bill so high?" | Never alongside P-S02. | pro.co.il high-water-bill ask, P2 |

Dropped on purpose:
- "Which plumbing services can I get?" (nw:topic 10) and "What does the service include?" (nw:cq) are about the owner. His own service list answers them.
- Plumber licensing: sources conflict (my 2026-11-10 licensed-trades doc) and regulations are out.
- Bathroom-renovation price driver: weak evidence.

### Electrician (45 entries)

**Evidence key:**

| Code | Source |
|---|---|
| E1 | pro.co.il/electricians/guide/main-circuit-breaker-tripping-troubleshooting-solutions (updated 08.10.2024, full fetch) |
| E2 | pro.co.il/electricians/guide/when-should--electrical-panel-replaced (updated 09.01.2025, full fetch) |
| E3 | pro.co.il/electricians/guide/troubleshooting-home-electrical-problems (updated 29.10.2024, full fetch) |
| E4 | d.co.il/faq-article9925 (27.11.2018, full fetch; old) |
| E5 | midrag Expanel/Question/1163 (snippet) |
| E6 | EV-charger price pages: pro.co.il/electricians/pricing/installing-a-charging-station-for-an-electric-vehicle, midrag Price/9215, inn.co.il/news/620269 (snippets) |
| E7 | midrag Tip/7396 (snippet) |
| E8 | d.co.il/Article10874 and midrag Price/5454 (snippets) |
| E9 | pro.co.il electricians guide index and midrag Video/303 (snippets) |

| id | kind | groups | Searcher question or symptom | Must / must not | Evidence |
|---|---|---|---|---|---|
| E-S01 | symptom | trade | RCD trips and the cause isn't found ("פחת קופץ") | Must: a real shock risk; don't keep resetting; call. | E5, E1, E3 |
| E-S02 | symptom | fault, panel | Breaker trips repeatedly with no clear reason ("מפסק קופץ") | | E1, E2 |
| E-S03 | symptom | fault | Trips whenever one appliance runs | Must: the appliance or the circuit. Must not: replug-one-by-one, "throw the toaster away". | E1, E3 |
| E-S04 | symptom | trade | Burning smell from the panel, an outlet or a switch | Must: urgent; don't touch, don't open the panel, call. Must not: any action at the panel. See open decision 1. | E1, E2, E9 |
| E-S05 | symptom | outlet | Scorch marks or blackening on an outlet or switch | | E9, E2 |
| E-S06 | symptom | outlet | Outlet or plug hot to the touch | Must not: "touch it to check". | E9; snippet only, flagged |
| E-S07 | symptom | outlet | Sparks that repeat or last, or come with a smell | Must not: reassure that small sparks are fine, even though E9 says so. | E9 (two sources) |
| E-S08 | symptom | lighting, fault | Lights flicker or dim, appliances switch off | | E2, E9 |
| E-S09 | symptom | panel | Panel warm, buzzing or clicking | | E2, E9 |
| E-S10 | symptom | panel | Rust, cracks or burn marks on the panel | Must not: opening the cover. | E2 |
| E-S11 | symptom | panel | Old panel with recurring faults | No age digits (E2 says "20 years"). | E2, E8 |
| E-S12 | symptom | trade | Water or moisture near outlets, switches or the panel | Must: don't touch, keep away, call. | E1, E9 |
| E-S13 | symptom | fault | Power out in part of the home only | Must not: a reset procedure. | E3, E1 |
| E-S14 | symptom | panel | RCD does not respond to its test button | Phrase as an observation, not an instruction to test. Flagged. | E9, E3 |
| E-S15 | symptom | outlet | Loose outlet, cracked cover, plug falls out | | E3; single, flagged |
| E-S16 | symptom | trade | Tingle or shock touching an appliance or tap | **HOLD.** Not checked against two pages this session. High value, high risk. Ship only after a second source. | none yet |
| E-S17 | symptom | outlet | Stacked power strips, or many appliances on one outlet | Must: overload and fire risk. Must not: ratings. | E4, E9 |
| E-S18 | symptom | heater | Electric water heater not heating | Must: the electrical side is the electrician's; the heater unit itself may need a heater technician. | E7 |
| E-S19 | symptom | panel, renovation | Breakers trip after adding heavy appliances (AC, oven, EV) | Must: capacity may need planning. | E2, E3 |
| E-S20 | symptom | renovation | A renovation or new kitchen is the moment to check the electrics | | E2, E3 |
| E-PD01 | price_driver | trade | Type of fault, and how hard it is to trace | | E3, E1 |
| E-PD02 | price_driver | panel | Panel size, single-phase or three-phase | No amperage. | E8 (two sources) |
| E-PD03 | price_driver | panel, renovation | Part of a renovation, in-wall or surface | | E8 |
| E-PD04 | price_driver | panel | New circuits or points that must be added | | E8, E2 |
| E-PD05 | price_driver | ev | Distance from the panel to the parking spot | | E6 (three sources) |
| E-PD06 | price_driver | ev | Private house or shared building | Must not: building or committee rules (regulation). | E6 |
| E-PD07 | price_driver | ev | Whether the home's electrical capacity needs upgrading | | E6 |
| E-PD08 | price_driver | ev | Whether the charger unit itself is part of the quote | Must not: say what the owner includes. | E6 (pro.co.il) |
| E-PD09 | price_driver | outlet | Surface cable runs or in-wall | | E3, E8 |
| E-PD10 | price_driver | lighting | Number and type of fixtures, ceiling access | | general; single, flagged |
| E-PD11 | price_driver | trade | Timing: nights, weekends | Same rule as P-PD08. | general; flagged |
| E-QA01 | qa | trade | "Why does the RCD keep tripping?" ("למה הפחת קופץ") | Must: a leak of current somewhere in a circuit or appliance; can't be judged by eye; don't keep resetting. | E1, E3, E5 |
| E-QA02 | qa | trade | "What's the difference between a breaker and an RCD?" | Plain explanation; no ratings. | E4, E3 |
| E-QA03 | qa | trade | "How much does an electrician cost?" | Excluded when the price block renders. | E8, E6 |
| E-QA04 | qa | panel | "When does a panel need replacing?" ("מתי צריך להחליף לוח חשמל") | No ages. | E2, E8 |
| E-QA05 | qa | trade | "Are power strips safe?" | | E4, E9 |
| E-QA06 | qa | lighting | "Why do lights flicker?" | Never alongside E-S08. | E2, E9 |
| E-QA07 | qa | outlet | "Why is my outlet hot or sparking?" | Never alongside E-S06 or E-S07. | E9, E2 |
| E-QA08 | qa | trade | "What counts as an electrical emergency?" | Must not: availability. | E1, E2, E5 |
| E-QA09 | qa | trade | "Can I do small electrical jobs myself?" | Must: electrical work at home is a job for a licensed electrician. Safety framing; no law citation, no bulb-change carve-out. Flagged as the one entry that touches licensing. | E4, E3 |
| E-QA10 | qa | heater | "Water heater not heating: electrician or heater technician?" | Never alongside E-S18. | E7 |
| E-QA11 | qa | trade | "What is grounding and why does it matter?" | Must not: how to test it. | E4, E3 |
| E-QA12 | qa | panel | "What is three-phase power and who needs it?" | Must not: utility process, amperage. | E4, E8 |
| E-QA13 | qa | trade | "What helps an electrician give an estimate?" | Must not: instruct the reader to inspect the panel. | E3, NW (plumber analogue) |
| E-QA14 | qa | trade | "How to choose an electrician?" | Must: ask about the licence. Must not: grades, law, insurance, or anything implying the owner. | E3, E4 |
| E-QA15 | qa | renovation | "What electrical planning matters in a renovation?" | | E2, E3 |
| E-QA16 | qa | trade | "Should home electrics be checked periodically?" | No interval. | E2; single, flagged |

Dropped on purpose:
- Charger in a shared building: involves building rules.
- Required inspections: regulation.
- Any "how to find the faulty circuit" content.

### Bad or dangerous advice seen on ranking pages (never in the library)
- **E3** tells readers to switch breakers on one at a time to find the fault. That is live-panel work presented as a "basic check".
- **E1** suggests repeated resets and switching appliances back on step by step. If the fault is in the wiring, that re-energises it.
- **A midrag snippet** says "throw the toaster away, don't call an electrician", and another says a brief spark is normal. Both are reassuring advice the library must not echo.
- **P1 (pro.co.il)** tells readers to switch off the main breaker when water is near sockets. Doing that while standing in water is the hazard. The library keeps only the prohibition.
- **Chemical drain cleaners and toilet-tank DIY** are common homeowner advice. I did not verify the harm this session, so the rule is simply "never mention".
- **Every electrical entry** must pass Noa's read with one question: does any sentence tell the reader to do something at the panel, an outlet or a wire? Any yes is a fail.

### Open decisions for Adam (my recommendation in brackets)
1. **Electrical safety actions.** Allow "turn off the main switch if it is safe" on burning smell? [No. Prohibitions plus "call" only. That is the only wording that can never read as do-it-yourself.]
2. **Plumbing safety action.** Allow "close the main water valve" in P-S20 and P-QA16? [Yes. It is the universal first step on the ranking pages and touches no wiring.]
3. **E-S16 (shock or tingle).** Hold until a second source is checked. [Hold; ship without it Saturday.]

### Sign-off
- **Anchor sign-off: approved.** Library text never goes in the title, H1, hero, about block or meta. Block headings must not carry the trade-plus-city head term or any city.
- **What the library will not do.** Identical text across clients will not earn AI-answer citations; Google cites the original publishers. The library's job is page completeness and lead trust, not GEO.
- **No FAQPage markup.** Render the Q&A block as plain question heading plus answer paragraph. As of 2026-11-26, per Search Engine Roundtable and Search Engine Land (secondary coverage of Google's doc note), FAQ rich results stopped appearing on 2026-05-07, so the markup buys nothing.
- **Gate 9 stands: no AggregateRating or Review markup from Google reviews.** Google's review-snippet guidelines (fetched 2026-11-26) say "Don't aggregate reviews or ratings from other websites", and pages using LocalBusiness or Organization markup are ineligible for review stars when the business controls the reviews about itself.

---

## B. Places API and GBP API terms (web-verified 2026-11-26)

### Places API (the pre-payment preview)

The Places policies page (developers.google.com/maps/documentation/places/web-service/policies, fetched 2026-11-26) says:
- "Cache or store Google Maps Content only as expressly permitted under the Google Maps Platform Service Specific Terms."
- "Don't pre-fetch, index, store, or redistribute Google Maps Content outside the Services."

The only exemptions are Place IDs (no limit) and latitude/longitude (30 consecutive calendar days, section 15.3 per search). I could not fetch the Service Specific Terms page itself, so that comes from search results. Rating, userRatingCount and reviews are not exempt.

When Places reviews or ratings are displayed, the same policies page requires:
- crediting the review author;
- "Google Maps" attribution;
- a link to the source review via googleMapsUri;
- a notice on how reviews are ordered and filtered.

**Verdict on the `placePrefill.ts` header: correct for us, but stricter than Google's wording.**
- Google allows live display at view time with attribution. It does not allow storing the data or baking it into rendered HTML.
- Our previews and sites are rendered and persisted as HTML (renderStaticHtml), so a rating or review count in them counts as stored content. That is not allowed.
- Pre-payment preview conclusion: no rating line from Places. Fable's section-3 fallback (no proof line) applies.
- Suggested comment fix (engineer, no behaviour change): "never stored or written into rendered HTML; live view-time display with Google attribution is allowed by Places policy but not used."
- A client-side live widget would comply, but it costs per page view, exposes the API key in the browser and adds a runtime dependency. I do not recommend it for launch.

### GBP API (the live site, after the owner signs in)

The Business Profile APIs policies page (developers.google.com/my-business/content/policies, fetched 2026-11-26) says:
- "You cannot pre-fetch, cache, index, or store any content provided through the Business Profile APIs."
- The exception: "limited amounts of Content only to improve the performance of your project". It "must be stored temporarily for no more than 30 calendar days", "stored securely", and "cannot be manipulated or aggregated in any way".
- The terms page sets the order of precedence: Business Profile Terms, then API Policies, then the Google APIs ToS.
- The FAQ: you can only query profiles you have access to.
- Neither page explicitly allows or forbids showing a business's own reviews on its own website. That gap carries medium confidence.

**What this means for Fable's plan.** Reviews on the live site are allowed, provided the engineer builds to these rules:
1. Review text and rating in rendered HTML count as stored content. Re-read from the API and re-render at least every 30 days. Purge them when manager access ends or the client leaves.
2. Show the rating and count exactly as the API returns them; never compute our own average. This matches the 2026-11-16 decision that the site rating is Google's exact average.
3. Never trim or edit review text, and never merge it with other sources ("manipulated or aggregated").
4. Show the reviewer name as provided, respect anonymous reviewers, and keep any attribution "as provided".
5. Add a line to the lawyer list in the claims ledger: the "no explicit display clause" gap.

---

## Handoffs
- **Tamar (waocopy):** writes section A as `plumber` and `electrician` library JSON, using the brief in this report.
- **Noa:** one read of both libraries. Her pass/fail test: no first person, no digits, no owner claims, and no electrical action verbs.
- **Eitan:** his 15-minute read on Saturday.
- **Eitan-Dev (engineer run 2):**
  - the slug-to-group matcher, ordering and mutual-exclusion rules from section A;
  - the 30% cap and gate 12;
  - the `placePrefill.ts` comment fix from section B;
  - for publish-gate run 3: the 30-day re-read, purge-on-disconnect, verbatim-only rules for GBP reviews, and no review or rating markup.
- **Roni:** after run 2, confirm on a live preview:
  - no library text in title, H1, hero or about;
  - library share ≤30%;
  - zero digits in library text;
  - no FAQPage, AggregateRating or Review JSON-LD.
- **Adam:**
  - settle the three open decisions;
  - optionally run NeuronWriter on חשמלאי plus two electrician services, and a DataForSEO People Also Ask pull for both trades, before Saturday to firm up the electrician evidence;
  - add the GBP display-clause gap to the lawyer list.

## Sources (fetched or searched 2026-11-26)
- [Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Maps Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms) (page not fetchable; section 15.3 via search) and [archived 2026-06-10 version](https://cloud.google.com/archive/maps-platform/terms/maps-service-terms-20260610)
- [Business Profile APIs policies](https://developers.google.com/my-business/content/policies), [terms](https://developers.google.com/my-business/content/terms), [FAQ](https://developers.google.com/my-business/content/faq)
- [GBP Additional Terms](https://support.google.com/business/answer/9292476)
- [Review snippet guidelines](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)
- FAQ rich results end: [Search Engine Roundtable](https://www.seroundtable.com/google-drops-faq-rich-results-41298.html), [Search Engine Land](https://searchengineland.com/google-to-no-longer-support-faq-rich-results-476957)
- Plumbing: [pro.co.il pipeline-explosion](https://pro.co.il/plumbers/guide/pipeline-explosion), [ynet leak signs](https://www.ynet.co.il/economy/article/5031629), [pro.co.il sewer smell](https://www.pro.co.il/sewer-cleaning/ask/how-to-deal-with-bad-smell-from-sewer), [pro.co.il shower sewage smell](https://pro.co.il/plumbers/ask/sewage-smell-in-the-shower), [pro.co.il mold/leak](https://www.pro.co.il/plumbers/ask/why-there-is-mold-in-the-living-room), [midrag price 630](https://www.midrag.co.il/Content/Price/630), [midrag price list 3466](https://www.midrag.co.il/Content/PriceList/3466), [midrag water-heater tip 7396](https://www.midrag.co.il/Content/Tip/7396)
- Electrical: [pro.co.il main breaker](https://www.pro.co.il/electricians/guide/main-circuit-breaker-tripping-troubleshooting-solutions), [pro.co.il panel replacement](https://pro.co.il/electricians/guide/when-should--electrical-panel-replaced), [pro.co.il troubleshooting](https://www.pro.co.il/electricians/guide/troubleshooting-home-electrical-problems), [d.co.il FAQ 9925](https://www.d.co.il/faq-article9925/), [midrag Q1163](https://www.midrag.co.il/Expanel/Question/1163), [d.co.il panel price](https://www.d.co.il/Article10874/), [midrag panel price 5454](https://www.midrag.co.il/Content/Price/5454), [pro.co.il EV charger price](https://www.pro.co.il/electricians/pricing/installing-a-charging-station-for-an-electric-vehicle), [midrag EV 9215](https://www.midrag.co.il/Content/Price/9215), [inn EV charger](https://www.inn.co.il/news/620269), [midrag video 303](https://www.midrag.co.il/Index/Video/303)

## Files referenced
- /home/eitanya/wao/docs/reviews/site-bot-ranking-launch-plan-fable52-2026-11-26.md
- /home/eitanya/wao/src/lib/site-bot/research/testdata/neuronwriter-get-query-he.json (the only real question pool)
- /home/eitanya/wao/assets/photo-library/plumber/library.json (plumber service vocabulary)
- /home/eitanya/wao/src/lib/site-bot/launchTrades.ts
- /home/eitanya/wao/src/lib/site-bot/placePrefill.ts (header comment to amend)
- /home/eitanya/wao/src/lib/site-bot/research/runResearch.ts (ownerEvidence service ids)
- /home/eitanya/wao/src/lib/lp/generationData.ts (ELECTRIC_SLUG_KEYWORDS, the matcher precedent)
- /home/eitanya/wao/docs/research/site-bot/licensed-trades-israel-2026-11-10.md

**Next prompt to paste after /clear:** "Adam: Yonatan's trade-library spec (plumber 48, electrician 45 entries) and Places/GBP terms verdict are in the conversation. Settle his three open decisions, run waocopy on the plumber and electrician library briefs, Noa reads, schedule Eitan's 15-minute read, then brief engineer run 2 (slug-group matcher, exclusions, 30% cap, gate 12, placePrefill comment) and add the GBP 30-day refresh and purge rules to run 3."
