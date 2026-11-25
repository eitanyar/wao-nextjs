# Brief: Site Bot trade library v1 — plumber (2026-11-26)

Spec by Yonatan (seo-strategist), full source: docs/reviews/site-bot-trade-library-spec-yonatan-2026-11-26.md. Plan: docs/reviews/site-bot-ranking-launch-plan-fable52-2026-11-26.md (Fable 5.2, approved by Eitan).

Write ONLY the plumber entries. Output a JSON array, one object per entry: {"id", "kind", "serviceGroups", "question_he" (qa only), "text_he"}. Keep ids, kinds and groups exactly as in the table. Skip any entry marked HOLD. Every entry must stand alone (it is selected per client and may appear without its neighbours), and the same fixed text appears on every plumber client site, so it must never read as a claim about the specific owner.

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


### Adam's decisions on the open questions (2026-11-26)
1. Electrical: prohibitions plus "call" only. Never "turn off the main switch", not even "if safe".
2. Plumbing: "close the main water valve" IS allowed, only in P-S20 and P-QA16.
3. E-S16 (tingle/shock) is HELD: do not write it.

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


### Bad or dangerous advice seen on ranking pages (never in the library)
- **E3** tells readers to switch breakers on one at a time to find the fault. That is live-panel work presented as a "basic check".
- **E1** suggests repeated resets and switching appliances back on step by step. If the fault is in the wiring, that re-energises it.
- **A midrag snippet** says "throw the toaster away, don't call an electrician", and another says a brief spark is normal. Both are reassuring advice the library must not echo.
- **P1 (pro.co.il)** tells readers to switch off the main breaker when water is near sockets. Doing that while standing in water is the hazard. The library keeps only the prohibition.
- **Chemical drain cleaners and toilet-tank DIY** are common homeowner advice. I did not verify the harm this session, so the rule is simply "never mention".
- **Every electrical entry** must pass Noa's read with one question: does any sentence tell the reader to do something at the panel, an outlet or a wire? Any yes is a fail.

