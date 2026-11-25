# Brief: Site Bot trade library v1 — electrician (2026-11-26)

Spec by Yonatan (seo-strategist), full source: docs/reviews/site-bot-trade-library-spec-yonatan-2026-11-26.md. Plan: docs/reviews/site-bot-ranking-launch-plan-fable52-2026-11-26.md (Fable 5.2, approved by Eitan).

Write ONLY the electrician entries. Output a JSON array, one object per entry: {"id", "kind", "serviceGroups", "question_he" (qa only), "text_he"}. Keep ids, kinds and groups exactly as in the table. Skip any entry marked HOLD. Every entry must stand alone (it is selected per client and may appear without its neighbours), and the same fixed text appears on every electrician client site, so it must never read as a claim about the specific owner.

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

