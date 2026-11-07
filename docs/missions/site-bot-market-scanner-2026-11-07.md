# Site-Bot Market Scanner — pick where to attack before outreach

Approved by Eitan 2026-11-07. Multi-session mission. Owner: Adam.

## Outcome
A reusable, deterministic **market scanner** that ranks Israeli *profession × area* cells by how
winnable they are for site-bot, so outreach starts where a fixed Google Business Profile can
realistically reach the map top 3. The same data then feeds the pitch (each weak business's own
gaps become the opening line) and the client's site plan (research-first dossier).

Growth loop it serves: SCAN → PROOF (3–5 free done-for-you case studies, Eitan's past providers)
→ REACH (personal call/WhatsApp with pre-run audit; FB profession groups) → CONVERT (free audit
page → talk to Eitan, live) → DELIVER (GBP fix + site) → RESULTS → REPEAT (next area, kit reused).

Layers:
- **Engine** = repo script, no LLM in the loop: fetch, cache, score, budget cap, deterministic output.
- **Playbook** = `/market-scan` skill, written only after one hand-run shows the real judgment steps.

Funnel (cheap → expensive):
1. **Stage 1 — demand & value**, whole matrix, keywords only: Hebrew search volume + CPC
   (CPC = market's own lead-value / ticket proxy). Measure at regional level (Sharon, Gush Dan,
   Shfela, North…) because city-modified Hebrew volumes collapse to ~0.
2. **Stage 2 — competition**, Stage-1 survivors only: top ~20 Maps/local results per cell →
   top-3 strength (reviews, rating, real website) and pack weakness (no website, one category,
   few photos, missing hours — our audit dimensions).
3. **Stage 3 — enough prospects**: ≥ ~15 weak, reachable businesses per cell.
4. **Stage 4 — rank → top 3–5 cells → Eitan glances at real profiles before commit.**

Pilot validates the *method*: Stage 1 on the full matrix; Stage 2 on 3 deliberately contrasting
cells (expected-saturated big-city crowded service / expected-weak / middle). Scoring must
separate them the way common sense does before running Stage 2 broadly.

## Files
- Profession seeds: `data/batch/<slug>/keywords.json` (44 packs, July 2026, GPT-generated — keywords
  reusable, copy is draft only); `docs/batch-verticals.md`.
- Visual themes: `src/lib/lp/verticalThemes.ts`, `verticalDetect.ts`, `verticalAssets.ts` (8 families).
- Waterproofing demo kit: `docs/copy/site-bot-fictional-rooftop-demo-site.json` (pending Hebrew QA).
- DataForSEO precedent (budget caps, cost accounting): `src/lib/site-bot/research/dataForSeoResearch.ts`,
  `src/lib/geo/dataForSeo.ts`. Places client: `src/lib/places/client.ts`. Disabled stub:
  `src/app/api/site-bot/grid-scan/route.ts`.
- Scoring spec (to write): `docs/research/site-bot/market-scanner-scoring-spec.md` (Yonatan).

## Constraints
- Candidate professions: shortlist from the 44 within the August segment (no lawyers / accountants /
  clinics / therapists) **plus** high-ticket services missing from it (solar, pergolas,
  aluminum/windows, kitchens, renovation contractors, flooring, gates/fencing). Existing kits are a
  **tiebreaker**, never a filter. Hebrew searches only.
- Score = ticket (CPC) × map-driven job frequency, discounted by top-3 strength — not ticket alone.
- Spend: confirm current DataForSEO pricing (dated) and state the estimate to Eitan **before** the
  first paid call; hard USD cap per run; cache everything; never re-fetch a cached cell.
- Nothing is contacted from this mission. Outreach rules (Communications Law §30A, WhatsApp ToS, live
  calls, no scraped lists as Meta custom audiences) are Amit's gate, web-verified and dated.
- No writes to `data/clients/`. Scraped business data stays private (gitignored), minimal fields.
- Second-ring towns next to big cities are a hypothesis to test, not an assumption.

## Acceptance
- M1: Yonatan's scoring spec (inputs, formulas, thresholds, regions, keyword selection rule, the 3
  pilot cells and the expected ordering).
- M2: Stage-1 engine + fixture tests; one paid run on the full matrix within the stated cap;
  ranked table output.
- M3: Stage-2 on the 3 pilot cells; ordering matches expectation (or the spec is revised with reasons).
- M4: Stage 2–4 on survivors → top 3–5 cells with prospect counts → Eitan review.
- M5: `/market-scan` skill written from the real hand-run.
- In parallel (no dependency): Eitan lists past service providers for free case studies.

## Verifier
Roni re-runs the engine against cached fixtures and confirms identical ranked output (determinism),
the budget cap halts a run, no network call happens on a cached cell, and no file under
`data/clients/` changed.
