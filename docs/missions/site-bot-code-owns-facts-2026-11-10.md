# Site-Bot copy v2 — code owns the facts (Plan agent, 2026-11-10; direction: Adam)

Inputs: m2b1i eval (Tamar-Opus NO, Noa FAIL 34 🟠). Execute slice by slice; byte-identical re-render after each.

## Plan: code owns the facts, the model writes the prose (Site-Bot research copy)

### What I found in the code (these change the plan)
1. **The credential downgrade comes from our own prompt rule.** `buildResearchCopyRules` LICENSE (researchPageCopy.ts:515) says that when the license wording is not Hebrew, the model must "say only that he is licensed". The electrician fixture is English ("Master electrician license"), so the model is following that rule. It will not go away while the model is the one writing the credential.
2. **Pattern F wiring bug (Noa was right, but it is not where she looked).** `siteGenerationContext` and `researchToSite.ts:544` do pass `siteTerms`. The eval harness `scratch/m2b1i/research-to-site-eval.mjs:184` drops it, so no eval page ever got the rule. A second gap: the rule only goes into Tamar's prompt. `buildNoaQaMessage` never sees it, so Noa's pass can swap the term back to a synonym. The code-built trust bar and proof make this moot, but fix the harness in Slice 0 anyway, so the A/B comparison is fair.
3. **Production intake no longer asks for years, guarantee or license** (StartPaidFlow.tsx:46: they come from GBP or are dropped). Only legacy chat-bot data (prompts.ts) and the fixtures carry them. So on real sites the code-built trust bar will often be just the area, the rating and the response time. That is acceptable, but Adam should know the "credential" path is mostly a fixture path today.
4. **Research sites never render `stickyBarLine`, `aboutBlurb`, `guaranteeBlock`, `responseTimeBadge` or `faqHeadline`** (researchedSite.ts:323). Item 3 (sticky-bar hooks) is therefore invisible to customers. Stop generating these fields; that shortens the prompt and removes gates.
5. **The price line and the cost FAQ are already built at render time** from `data` (`pricePromiseLine`, `costFaq`). The trust bar and the proof items are rendered from `page.copy`. **Keep the renderer untouched** (that is what keeps old records byte-identical) and write the code-built strings *into the copy at generation time*, in `withSystemFields`. Old records still carry their model-written strings and render exactly as before. researchedSite.ts gains zero Hebrew.

### Rule for owner facts that arrive as free English text
- **Numbers are parsed and rendered through a template in any language:** years (digits), response time (minutes or hours), warranty duration (a fixed set: 6 months, 1 year, 2 years, N years), prices (already structured), rating and review count.
- **Text that is not a number is rendered only if it passes `isMostlyHebrew` and the length cap:** the license wording, a warranty that cannot be parsed, the review quote (already handled by `reviewQuoteDropReason`). English text that is not a number is **neither rendered nor shown to the model as a fact** (it is never translated).
- **Fixtures:** add a Hebrew-answer electrician fixture (license in Hebrew, written by Noa) so the master tier is tested the way production would supply it. Keep the English fixture as the "drop" test.

### Build sequence (each slice ships and tests alone)
**Slice 0: harness and baseline (no paid run).** Pass `siteTerms` in research-to-site-eval.mjs. Add `scratch/m2b2/rerender.cjs`: an offline re-render of `scratch/m2b1d/eval/*/site-record.json` that compares against the stored html, byte for byte. It runs as a check after every slice.

**Slice 1: fact renderer, a new pure module `src/lib/lp/ownerFactCopy.ts`.**
- `ownerFacts(data, brief)` returns `{years?, license?, warranty?, response?, rating?, area}`, each with a slot value and a `source` (parsed or verbatim).
- `trustBarFromFacts()` (at most 3 items, B2 kind order, response time left out on install pages, area tile via the existing `buildAreaTile`).
- `proofItemsFromFacts()` returns `{text, factIds}` items, using the existing `firstPartyProof` ids so `gate_fact_trace` still passes.
- The templates come from a new `docs/copy/site-bot-fact-templates-<date>.json`, loaded the same way as `researchedPricing.ts`, with a `PENDING_COPY` flag. While pending, fall back to today's model-written path.
- Unit tests only. Nothing is wired in yet.

**Slice 2: wire the facts in (generation only).**
- `withSystemFields` overwrites `trustBarItems` and `proofItems` with the code-built ones and nulls `proofHeadline` (the existing label fallback takes over).
- Add `trustBarItems` and `proofItems` to `SYSTEM_FIELDS` and `GATE_EXEMPT_FIELDS`. Add both to the Noa "SYSTEM FIELDS, never change them" note.
- `ungeneratedFieldsFor` adds `trustBarItems`, `proofItems`, `stickyBarLine`, `aboutBlurb`, `guaranteeBlock`, `responseTimeBadge` and `faqHeadline` on research pages; `buildSiteCopyHardLimitsBlock` omits them.
- Delete the `trimGated`/`drop_gated_item` trust-bar fix path for research pages.
- Test: an old record re-renders identically, and a new copy has code strings in those fields.

**Slice 3: prompt rewrite (`buildResearchPageCopyPrompt` v2, behind `promptVersion: 'v2'` on the brief or dependencies).** The v1 code stays for one round so the A/B can run. Skeleton in the next section.

**Slice 4: fact-restatement gate plus a cheaper repair path.**
- New `gate_fact_restatement` (always blocking) on model fields. It fires on any of:
  - the owner's years, warranty, price or response digits;
  - the warranty token family (the existing claim tokens);
  - the license / `license_grade` tokens;
  - the "years in the trade" phrase tokens.
- Allowance: heroHeadline or heroSubheadline may carry **one** of them once, in the owner's exact digits, when it is part of the USP (the hebrew-plumber USP "מגיע תוך 20 דקות" is itself a fact).
- Fix order: drop the sentence (story or about body, if the minimum sentence count still holds), then one repair, then fail. For service descriptions and Q&A answers: drop the item.

**Slice 5: repetition budget (`src/lib/lp/repetitionBudget.ts`), drop rather than repair.**
- Build one ordered list of the page's rendered strings in render order, **including the code-built ones**: trust bar, proof, price promise line, cost FAQ (call `costFaq`/`pricingPromisePhrases` in generation to get their text).
- Reuse `clauseRepeatKeys` and `stemSet`. The first full statement owns a key; one later run of 3 words or fewer is the allowed short reference; anything more is over budget.
- Novelty test for depth items (`processSteps`, `qaItems`) and `serviceDetails[].description`: the item's content stems minus the stems already on the page, below 3 new stems or below 40% new. That counts as "adds nothing", so the item is **dropped**:
  - a card keeps its name and loses its description (the renderer already handles that);
  - Q&A falls back to null below the minimum (`settleDepthBlocks`).
- Prose fields (subheadline, story, about): drop the sentence while the minimum holds; otherwise the one existing repair; the story stays warn-only.
- Item 5 (story/about copying each other):
  - storyHeadline set to null when its clause keys are a subset of storyBody (the hidden `storyFallbackHeading` takes over);
  - a storyBody/aboutPageBody sentence with 5 or more shared words: drop the about sentence (about renders later).
- **Site-wide:** carry the mechanism keys the homepage owns into `ResearchedSiteGenerationContext` (a `priorMechanismKeys` field next to `siteTerms`). A later page may use a mechanism key from another page at most twice. Over that, the same drop logic applies. This is the "18 times across 4 pages" case.
- Runs as a deterministic fix after Noa, before the final gates. Cost: $0.

**Slice 6: cost Q&A out, Q&A voice fixed.**
- `buildQuestionPool` drops cost questions on pages where `costFaq` returns an answer: a price/cost predicate on the question text, kept as a Hebrew token list in config (Noa). On pages without one, also drop them; never let the model guess a price.
- `q` becomes code-owned: the pool question verbatim when Hebrew. The model writes only `a`.
- The answer voice is decided once: first person (Yonatan to confirm for AEO).
- The `qaAnswerLead` template (brand + city) is put in front of `a` by code. A new gate rejects the business name inside the model's `a` (it duplicates the lead and causes the gender drift).

**Slice 7: consistency check, deferred to warn-only.** Recommendation: do not build Hebrew NLP. Two cheap steps:
- (a) **Remove the cause.** The hero subheadline/H1 may state an *order* claim ("before") only if the owner's USP has one, and the story, about and cards must keep that order. That becomes one prompt rule (in the skeleton below).
- (b) **A warn-only Qwen judge call in the Noa stage** (`think:false`, JSON `{promise, contradictingSentences[]}` over the hero, story, about and cards). It is logged, never repaired, for one eval. Promote it to "drop the contradicting sentence" only if precision is 90% or more on Noa's read.

**Slice 8: pitch hygiene (low).** Apply the deterministic ASCII-quote-to-geresh fix to `pitch` (it is never rendered, so no Noa stage).

### New prompt skeleton (v2): about 30 rules, down from about 90
1. **ROLE AND FACTS (3):**
   - first person, singular reader;
   - only the facts in the brief, which are listed as "already on the page, do not restate": trust bar, proof, prices, promises;
   - one short reference allowed (hero only).
2. **PITCH FIRST (unchanged core: the decide-3 block, the 8-point toolkit, the process paragraph):** about 6 lines. The pitch-first rule edits (P1/R1/B1/B6) become unnecessary.
3. **FIELD JOBS (one line each, about 9):** heroHeadline (anchor rule unchanged), heroSubheadline (benefit verb sentence), storyHeadline/Body, aboutPageHeadline/Body (B5/C2 condensed), cards (B4/R5/C1), Q&A answer, formHeadline (the CTA set stays), the order-consistency rule.
4. **REPETITION (2):** the budget sentence, plus "the system drops items that add nothing new".
5. **VOICE (about 8):** P3, P4/A, P5, P6, R2, R6, C1 tool rule, and the native Hebrew patterns B, C, D, E, H as one compact line.
6. **HARD LIMITS (generated, shorter key list).**

**Rules that become unnecessary once the facts are code-owned:** LICENSE, CREDENTIAL TIER, P7, B2, C4 (warranty count and forms), C5's trust-tile note, `trustTileRule`, `PROOF_POINT_RULE` and its pitch-first variant, "use each owner fact at most twice", the B6 "check how many times years/warranty/area were used" note, USP-above-the-fold (the trust bar now carries the fact clauses), pattern F / `siteTermsRule`, the proof part of the depth section, the response-time badge, guaranteeBlock, `trustBarFillerPhrases`, the sticky / R4 lines, the PRICE and FREE rules (prices come from code), and the ABOUT_HEADLINE trust repeat.

**Rules that stay in the prompt:** hero anchor, singular address, VOICE "we", NAMES, HOURS, SERVICE AREA (one line), SAME DAY / INSTALL PAGE, AVAILABILITY, customer quote / attribution, FEAR IS NOT A GUARANTEE, LOGISTICS (folded into the order rule), FACT LEDGER (shortened to process steps and tools), cut contract.

**Rules that become gates or code:** the restatement gate (slice 4), the budget (slice 5), Q&A brand / question voice (slice 6), story headline equal to body (slice 5).

### Fixed Hebrew templates Tamar → Noa must supply (key: English meaning)
- `trustYears`: "{n} years in the trade" (the single site term; fixes pattern F)
- `trustLicense`: "{license}" verbatim slot, plus `trustLicenseNumber`: "licence no. {number}" when the owner gave only a number (the hebrew-plumber case)
- `trustWarranty`: "{duration} warranty" (bare form); `warrantyDurations`: 6 months / 1 year / 2 years / {n} years
- `trustResponse`: "arrives within {time}"; `responseUnits`: minutes / hours
- `trustRating`: "{rating} stars from {count} reviews"
- `proofYears`, `proofLicense`, `proofWarranty`, `proofResponse`: full-sentence proof forms (first person; warranty with the ל form per C4)
- `qaAnswerLead`: "At {business} in {city}: " (a lead-in with no gendered verb)
- `costQuestionTokens`: the Hebrew cost/price question tokens for the pool filter
- (optional) `stickyBarDefault`: only if the sticky bar ever renders on research sites

### Gate changes
- **Added (blocking):** `gate_fact_restatement`, `gate_qa_brand_in_answer`.
- **Added as deterministic drops (logged as fixes, never repaired):** `budget_drop_item`, `budget_drop_sentence`, `story_headline_echo`, `story_about_echo`.
- **Added (warn-only):** `gate_promise_contradiction` (the judge call).
- **Removed on research pages** (the field is system-built or no longer generated):
  - `gate_trust_bar_filler`, `gate_trust_bar_size`;
  - trust-bar `city_prefix`/`fact_repeat` hits;
  - `gate_warranty_definite_bare_duration` on the trust bar;
  - `gate_sticky_action`, `gate_sticky_naming`;
  - `gate_about_headline_trust_repeat` (the restatement gate covers it);
  - `gate_fact_trace` on `proofItems`;
  - the `fact_repeat` `fact:` digit cap (replaced by the restatement gate).
- **Changed to warn-only:**
  - `gate_phrase_repeat`/`gate_clause_repeat` become inputs to the budget drop, and warn only for whatever the drop leaves;
  - `cardPhraseEcho` stays warn-only.
- **Field lists:** `trustBarItems` and `proofItems` stay in `RESEARCHED_RENDERED_FIELDS` (rendered) but become exempt from gates; `qaItems` and the story stay in `RESEARCHED_RENDERED_WARN_ONLY_FIELDS` until the eval.

### Test plan
- **Unit:**
  - fact parsing for English and Hebrew input (digits kept, English text dropped);
  - template filling;
  - the restatement gate (true hits from the m2b1i copy.txt, and the hero allowance);
  - novelty and budget drops;
  - Q&A lead;
  - cost-question filter;
  - a prompt snapshot plus a rule-count assertion;
  - a test that researchedSite.ts contains no Hebrew bytes.
- **Free rescore:** run the new deterministic layer on the saved m2b1i and m2b1d copies. Expected: the "replaces the gasket"-type card/process items get dropped, the cost answer is gone, and the mechanism count falls below 2 per page.
- **Byte-identical check:** re-render all `scratch/m2b1d/eval/*/site-record.json` (slice 0 script) after every slice.
- **Paid A/B:** 8 runs, v1 against v2, about $1.6: electrician-2 (Hebrew and English fixtures), hebrew-plumber-1/2, plumber-1/3, split-hours-1, ac-repair-1.
  - Acceptance: 0 credential, years, warranty or price restatements; mechanism stated once in full per page; 0 Noa 🟠 on facts; repairs per run at most as many as v1.
  - Noa reads the output by eye (she counted 34 🟠 last time).

### Risks
- **Thinner pages:** dropping items can push Q&A below its minimum, or leave cards with a name only. Watch the visible word count against `lengthBand`; let the novelty threshold be tuned from the rescore.
- **USP that is itself a fact** (response time) needs the hero allowance, or the H1 loses its promise. **The anchor is untouched**, but Yonatan should still confirm that removing USP-above-the-fold does not weaken the H1.
- **Template grammar:** gender and the ל/ב prefix forms in the slots need Noa per slot. Wrong templates go out on every site, so ship them under a pending flag with a fallback.
- **Code-built strings feeding the clause gates:** the code strings now count in the clause n-gram gates, so model prose that names the area or the tool can be dropped too eagerly. Exempt place names and service labels (the existing `phraseRepeatFreeTokens` already does).
- **Judge call:** adds latency (Qwen is flat-rate, so latency only). Keep it warn-only until precision is measured.
- **Noa can still rewrite system fields** unless `buildNoaQaMessage` hides them. Hide them, the same way `pitch` is hidden today.

### Critical files for implementation
- /home/eitanya/wao/src/lib/lp/researchPageCopy.ts (`buildResearchCopyRules`, `buildResearchPageCopyPrompt`, `buildDepthSection`, `withSystemFields`, `ungeneratedFieldsFor`, `applySafeDeterministicFixes`, `buildNoaQaMessage`)
- /home/eitanya/wao/src/lib/lp/copyGates.ts (`GATE_RULES`, `ALWAYS_BLOCKING_RULES`, `clauseRepeatKeys`, `GATE_EXEMPT_FIELDS`)
- /home/eitanya/wao/src/lib/lp/researchedPricing.ts (the loading pattern for the new fact templates; `costFaq` text for the budget)
- /home/eitanya/wao/src/lib/site-bot/research/pageBrief.ts (`buildQuestionPool`: cost filter, verbatim `q`)
- /home/eitanya/wao/src/lib/site-bot/researchedSiteGeneration.ts (`siteGenerationContext`: `priorMechanismKeys`) and /home/eitanya/wao/scratch/m2b1i/research-to-site-eval.mjs:184 (the dropped `siteTerms`)
- New: /home/eitanya/wao/src/lib/lp/ownerFactCopy.ts, /home/eitanya/wao/src/lib/lp/repetitionBudget.ts, and the template JSON under /home/eitanya/wao/docs/copy/

## Intake credentials step (Eitan approved 2026-11-10)
After the 3 questions, one optional quick-tap step (skippable, ~15 s): years in the trade (number), licence (none / yes + its
type or number, free text in Hebrew), warranty (chips: none / 6 months / 1 year / 2 years / other). Answers land in the existing
CollectedData fields (yearsInField, license, guarantee) so the code-owned trust bar and proof fill on real sites. Strings via
waocopy → Noa → docs/copy; built after copy v2 slices 3–5.
