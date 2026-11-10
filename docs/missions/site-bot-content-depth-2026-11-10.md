# Site-Bot content depth — service pages that answer the searcher (before-M3 part)

Approved by Eitan 2026-11-10 (before-launch part only). Spec: Yonatan, 2026-11-10. Owner: Adam.

## Outcome
Service (money) pages stop being thin (measured 2026-11-10: median 73 visible words; homepage 168) without
padding or invented facts. Length comes from owner facts + real searched questions, sized by NeuronWriter's
competitor target. NeuronWriter data — already paid for per keyword — actually reaches the generator.

Principles (Yonatan, Google sources fetched 2026-11-10):
- No fixed word count (Google: "we don't" have a preferred one). Target = clamp(NeuronWriter
  `metrics.word_count.target`, 250, 600) visible words; **never pad** — if facts run out, ship shorter and log a
  `fact_gap` (becomes a monthly owner question).
- Scaled-content risk across many client sites is the real danger: every sentence must trace to an owner fact or a
  real review. Generic filler is worse than short.
- No service × other-city pages (doorway); other cities stay in areaServed only.
- NeuronWriter terms are suggestions, never requirements; `titleTerms` / `h1Terms` never flow into title / H1 /
  hero badge (Yonatan's formula, sign-off required).

## Files
- `src/lib/site-bot/research/neuronWriter.ts` — adapter. Suspected parse bugs (doc-based, medium confidence; confirm
  against one live `/get-query` response first): `metrics.word_count.{median,target}` is nested (dropped by
  `numberRecord()`); body terms are `terms.content_basic` / `content_extended`, not `terms.body`; questions under
  `ideas.{suggest_questions, people_also_ask, content_questions}`, not `questions.*`; items are `{t}` / `{q}`;
  `usage_pc` / `sugg_usage` dropped. Tests mock the normalized shape, so they hide this.
- `src/lib/site-bot/research/runResearch.ts` — `applyNeuron()` (~168) stores only the query id; must store
  `wordTarget`, `h2Terms`, `bodyTerms[{t,min,max}]`, `entities`, `questions` per service.
- `src/lib/site-bot/research/pageBrief.ts` — service briefs gain `lengthBand {floor 250, target, ceiling 600}`,
  `suggestedTerms` (filtered: no competitor brands, other cities, unoffered services, prices), `questionPool`
  (deduped, ≤ 8), `blocksEnabled` (from which owner facts exist).
- `src/lib/lp/researchPageCopy.ts`, `copyGates.ts`, `researchedSite.ts` — new blocks, prompt rules, gates, render.
- Intake (`StartPaidFlow.tsx`, `intakeCopy.ts`) — one optional voice note: "walk me through a typical job".

## Constraints
- Before-M3 blocks only: **B1 process steps** (3–6 steps, ≤ 25 words each; from the voice note / service facts),
  **B4 Q&A** (3–6, answer ≤ 60 words, direct first sentence naming the business + base city; questions from
  NeuronWriter / PAA, answered only from owner facts — skip rather than guess), **B6 proof** (≤ 2 verbatim reviews +
  owner-stated facts). B2 price factors, B3 call-now / can-wait, B5 local detail come later, inside the ₪199/mo plan
  (one owner question a month).
- Generator returns each block with the `factIds` it used. Gates: fact-trace (hard), term density (hard: each term
  ≤ top of its `sugg_usage`, ≤ 1× on pages < 400 words, counted after Hebrew prefix stripping), cross-client
  similarity (warn), NeuronWriter `/evaluate-content` score (log only, sampled — costs quota). No regeneration to
  chase the score.
- Title, H1, hero badge byte-identical to pre-change output. New H2s must not repeat the H1 head term verbatim.
- Engineer never authors Hebrew (block headings, intake question → waocopy → Noa patches). No live paid calls
  except the one approved NeuronWriter `/get-query` to capture a real Hebrew fixture. No writes to `data/clients/`.

## Acceptance
- (a) 18-site eval: service-page median ≥ 250 visible words where facts allow; every short page logs a `fact_gap`.
- (b) 0 fact-trace failures. (c) 0 term-density violations. (d) cross-client 5-gram Jaccard < 0.25 between two
  same-niche clients' service blocks. (e) Noa PASS. (f) anchors byte-identical.
- (g) Outcome at 60 / 90 days: GSC impressions + average position for "service + base city" vs the M4 baseline.

## Verifier
Roni: (a)–(f) on the eval output plus a runtime render of a service page (desktop + mobile, RTL, no overflow, blocks
absent when their facts are missing); `git diff data/clients/` empty.
