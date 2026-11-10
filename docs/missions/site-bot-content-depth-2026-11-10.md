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

## Next: generator fixes from the M2b.1h eval (2026-11-10; run after the depth build)
Eval: 8/8 gates pass, US$1.50 (scratch/m2b1g/eval). Tamar (Opus seat): NEW BETTER but below Eitan's bar. Noa: PASS-WITH-FIXES,
0 🔴 / 40 🟠 (32 rendered, 8 pitch). Fix at generator level — rules stay abstract (no Hebrew example lines; they leak):
1. **Fact ledger before the pitch** (Tamar): every claim — tool, process step, outcome, scope, credential tier — traces to a named
   owner field; never turn the reader's fear into an absolute guarantee; never up/downgrade a credential; logistics consistent
   across fields; every clause of the USP (incl. time/availability) above the fold.
2. **Cut contract** (Tamar): story keeps the pitch's highest-tension agitation line, the mechanism once, and ends on the reader's
   outcome; hero subhead = a benefit sentence, not a noun list; story and about use different moments.
3. **Clause-level repetition budget** (Tamar): each fact one full statement + at most one short reference per page; gate shared
   clauses (≥ 4 words) across fields, not only whole blocks.
4. **Hebrew patterns** (Noa): A body sentences starting with a first-person present verb carry the subject pronoun (fragments only in
   hero subhead, badges, trust bar); B modal "shouldn't / doesn't have to" in idiomatic form with its completing verb; C fixed
   verb–noun collocations (warranty is given, a leak is the leak term, fixing closes the leak); D adverb not adjective after verbs;
   E full spelling for the "all" family; F one term per concept per site, set on the homepage and reused; G question hooks in H1
   describe a state true for the reader, tails must be backed by the body (H1 → Yonatan sign-off); H no object-less transitive verbs,
   no verbless relative clauses, Hebrew geresh not ASCII.
5. **Bug check:** owner `reviewQuote` renders on no page in the eval — find whether a gate/validator nulls it.

## Pricing input — market-driven, not a blank fact (Eitan 2026-11-10)
The owner price question is advice, not a form field. Research already pulls the top SERP for his niche + base city; add a
"pricing norm" read: share of top local competitors showing (a) a starting price / price list, (b) a pricing promise without
numbers (fixed price, free quote, no call-out fee, no hidden costs), (c) neither. The intake then adapts:
- norm (threshold set from Yonatan's 2026-11-10 pricing research) → tell him what his market does ("most leading competitors in
  your field and area show X") and offer the matching options; explain it lifts conversion;
- rare → don't ask for a number; at most offer a pricing promise.
Whatever he picks becomes an owner fact; the generator never guesses a price. Wording via waocopy → Noa.
- **Yonatan's data (2026-11-10, cached SERPs 2026-11-07, 4 trade × city SERPs, 12 business pages):** 7 promise-only, 4 show ₪
  (3 of them multi-city lead-gen networks; the only single business with ₪ sat at #7), 1 neither. A pricing promise is near
  universal; numbers are not the norm for single local businesses. Price is not a ranking factor (Google GBP help, 2026-11-10).
  Best page pattern: a number WITH its conditions (range + night surcharge + "price confirmed by phone before I leave") plus an
  FAQ "how much does <service> cost in <city>" answered in its first sentence (AIO-quotable).
- **Resulting default:** every site gets one prominent promise line in the hero beside the call button, from owner-checked
  options only (free quote / price confirmed before work or before leaving / no call-out fee / no hidden costs). Numbers are an
  optional owner input (call-out fee, "starting from" for 1–3 common jobs, night/Shabbat surcharge); when given they attach to
  B2 as a small table + one cost FAQ, never a second price block. The market-norm prompt shows the owner what his top
  competitors do (re-run per niche + city at intake; exact-query SERPs ≈ $0.002 each).

## Built 2026-11-10 (9f6f2fb, local) — follow-ups
- NeuronWriter adapter had never worked live (wrong host api. vs app.neuronwriter.com, wrong /new-query body, query-id not parsed,
  nested metrics/terms/ideas dropped). Fixed against one real Hebrew /get-query fixture (testdata/neuronwriter-get-query-he.json).
- **Research latency (must fix before M3):** research now polls each not-ready keyword up to ~3 min, sequentially (worst case
  ~30 min for 10 keywords) — breaks the 3–5 min preview promise. Fix: create all queries up front, poll in parallel with one
  overall budget, and generate without NeuronWriter data for any keyword not ready in time (fill in later in the monthly loop).
- Price-word lexicon for the term filter (Hebrew data → Tamar → Noa); per-trade service list for the unoffered-service filter.
- Voice note stays off (VOICE_NOTE_STEP_ENABLED=false) until: a private session-bound upload route (not public/uploads), Hebrew
  transcription into CollectedData.jobWalkthrough, record/stop labels (Tamar → Noa).
- Yonatan: confirm term-density scope (depth blocks only, anchors exempt) and whether topic-matrix questions count as real
  searched questions (PAA/suggested were empty in the live fixture).
- Maya: visible fallback H2s, service-page order hero → trust → B1 → B6 → B4, B6 absorbing the single review.
- Proof-point caps clash with B6 restating proof facts (warnings only on warn-only fields) — resolve with the "Next" fixes.
- Acceptance (a) median ≥ 250 words and (e) Noa PASS need the next paid eval (B1 won't fire: no walkthrough in fixtures).
- **Pricing consistency check (Adam 2026-11-10, found in the 3-run eval):** the owner's free-text pricing notes can contradict the
  structured pricing fields (eval fixture said "no call-out fee" in text while calloutFee was set — Adam's fixture error). Add a
  validation at intake/brief time: a stated call-out fee conflicts with a no-call-out-fee note or promise → ask the owner, never
  render both.
