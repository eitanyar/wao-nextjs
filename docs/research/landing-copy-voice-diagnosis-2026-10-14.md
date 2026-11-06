# Landing-copy voice diagnosis — October 14, 2026

Strategy task: t_1867caa3. Read-only diagnosis plus a draft-only repair contract. No application, runtime test, publication, commit, push or deployment performed.

## Diagnosis

This is primarily a failed editorial acceptance/workflow, with brief enforcement and generation quality contributing. There is no evidence that replacing Qwen with GPT alone fixes it: Eitan rejected GPT wording on September 28 (t_54ad6d30, then t_2952011d explicitly called this a writing/style problem). The newest homepage repeats the rejected patterns despite an October 12 brief explicitly banning repeated negatives. Strategist acceptance was too generous; responsibility is not assigned to the model or reviewer alone.

## Actual homepage authorship

- t_803fa27a run1581 started on Qwen but was reclaimed after prolonged latency without a saved artifact; the card's recorded recovery authorized same-card GPT failover. Run1583, gpt-6-sol/openai-codex, saved v1. v1 Markdown:3 corroborates that provenance.
- t_1b1184ab run1587, qwen3.8-max/alibaba, authored v2 as a three-gap completeness correction. Contract011:25-40 prohibited a full rewrite; v2 Markdown:3 and JSON:7,91 explicitly preserve the rest of v1. Calling the page entirely Qwen-written is misleading. The core narrative is the GPT v1 carry-forward; Qwen corrected parity, experience placement and one FAQ topic.
- Current hashes independently match the recorded v1/v2 pins: v1 MD189b0a440da65c0aaa2ecb652ae27cdbe3a71e873c3761a0b5e131a5e0cd6d13; v1 JSON813dd1d278ed0fef8e32c2ae6d24f23bec533558f2d0bd9ee30c3f3665542f9f; v2 MD53acb0da3cf893a79a671ae444d6e232d24553f13c91f4c07a37c9068934e2f6; v2 JSON47e66dadb1e3722ef6e2658bc5a334046f2f62f8f85169ffa0737e6bcbdabe81.

## Why the miss survived

1. Owner feedback was already explicit. t_a27bd3d3 requested warm conversational ordinary-owner language; t_54ad6d30 rejected repeated frames; t_2952011d specifically banned not-this-but-that and reassure-then-explain. t_01bf4831 repeated the same negative-dominant finding for Site-Bot on October 7. These are binding voice evidence, not a new preference discovered today.
2. Contract008:30-36 requested benefit-first, native believable copy and kept evidence/terms in an English ledger rather than repeated disclaimers. But it left formula selection open and did not operationalize a whole-page rhetorical recurrence rejection. The generated homepage violated the brief: v2 MD:41 advertises absence of invented success stories; :77 contrasts tailored action with a generic package; :125 contrasts the conversation with selling another task; :132 contrasts online presence with after-hours work. The advertising/contact activation boundary recurs at :55,101,105,109,113,117. These are semantic/rhetorical repetitions even when strings differ.
3. Contract011 was expressly completeness-only. It required preservation outside three gaps and restored another activation boundary, so Qwen was not tasked or permitted to repair the established voice failure.
4. The fresh review contract012:34 requested material naturalness but :62 warned against style nits. Its report:11,21 classified the entire draft natural and found no material issue. The report contains no cross-section rhetorical-pattern audit. Correct grammar, singular-male register, short sentences, claim limits and trust preservation did not establish authentic voice.
5. The strategist comment on t_b5608e7b accepted the complete candidate and said no new material rewrite was justified before founder feedback. That commercial judgment missed the owner's already-recorded bar. Historical internal PASS remains valid only as its actual recorded judgment; it is not founder approval, and the candidate fails the new owner voice gate.

## Other artifacts and page state

### Previously applied local landing-page copy — not merely drafts

- October 2 bundles: docs/copy/site-bot-page-copy-2026-10-02.json and docs/copy/google-ads-page-copy-2026-10-02.json.
- t_7aa8a3c8 prepared the bundles. Independent t_8615efdd found full-package/trial 24-hour conflation and unclear 8:1 ROAS attribution. The correction/re-QA chain is recorded in local commit8ab1de6b108d0ab0ee796bd03e741a42b74f723d; final acceptance is not inferred from the initial FAIL.
- Engineer t_8ceb4d0d is formally DONE and reports mechanical application, tests/build/local smoke and screenshots, explicitly no commit/push/deploy in that engineer run. A subsequent local commit8ab1de6 records both page rewrites and the QA chain; its message says no deploy, push deferred. This distinction preserves the engineer's actual scope.
- Independently observed current Google Ads page SHA2ac114c9f289ab36a9ead483a4fdaf9882ea89c9d2839036bb14efd887e418af and Site-Bot SHA3d278c141c77f9f16ac2232eaf47c58cd376ee66bb3bfddbffd897c2da9e7e80 match the page baseline pins in later draft artifacts. Current /google-ads/page.tsx has no working-tree delta. Current /site-bot/page.tsx has only a contact href delta versus HEAD, not the later free-audit redraft. No fresh runtime checks were run; historical test/smoke PASS remains engineer self-report here.

### Newer drafts — not applied

- Homepage October 12 v1/v2 MD+JSON: draft-only. HomePage imports the two src/content JSON files; AstraHome:3-4 imports source, not docs/copy. Homepage/source/header/footer copy paths show no current copy delta from this task.
- Site-Bot/contact October 7 redraft and October 8/v2 successor: draft-only, separate from the applied October 2 bundles. v2 changed three match-selection cells; t_d6b82377 reports49 other cells preserved. Its exact text still repeats direct agreement/terms framing in FAQs, steps, price and comparison (v2:97-102,118,129,136,142,157,229-243). Claim-only corrections did not fix that voice pattern. Do not expand the immediate homepage correction into a second page; calibrate one whole page first.
- Assisted pilot microcopy October 11: draft-only. Its source/proposed/manual classification is useful internal evidence, but customer-facing content still exposes implementation language and disclaimer stacks at :192-195,275-277,369-372,397-410,459-463. A language/claim PASS is not founder-voice approval. No matching source application is established.
- Google Ads October 5 trust-flow and October 6 protected-anchors, uncertain-sections, FAQ5/demo, proof-slot, whole-page-flow and SEO-candidate-delta: separate unapplied candidate packet. All exact artifacts were inspected. They propose commercial/question/SEO corrections, not evidence that production adopted them. Several contain binary contrasts and repeated buyer-diligence framing; the immediate repair remains homepage-only.
- Quick contact and Site-Bot contact bridge drafts are also listed as untracked. ContactForm's current diff changes consent/acknowledgement handling, not visible copy. /contact/page.tsx has no current delta. Do not describe backend transport correction as applying contact copy.

### Current local route changes — separate from writing

- Google Ads onboarding now replaces the price comparison with the October 5 payment-unavailable notice; current diff confirms the exact notice at page.tsx:557 and removal of payment/launch controls. This wording change is applied locally.
- /site-bot and /site-bot/audit current diffs only change contact destinations to attributed contact-form links; visible labels/copy remain unchanged in those hunks.
- /site-bot/start and /site-bot/fix/[auditId] now call notFound: route hiding, not a new copy version. /site-bot/pay diff removes a response field, not visible wording.
- Live/published status: no inspected new draft is independently confirmed live. Local files, local commits and past localhost smoke are not serving-build evidence. This task intentionally performed no live/runtime test; it does not claim the October 2 baseline is absent from the public site either.

## One practical repair

One immutable homepage v3, grounded in a busy owner's believable working day, under the approved headline and truthful offer. Each section answers a different buyer question; no canned binary contrasts; no repetition of reassurance or the contact/activation disclaimer. Required limits appear once per distinct decision fact in their relevant location. Claim evidence stays in a non-rendered English ledger. Preserve proof, helpful FAQ substance and exact source anchors/assets without inventing outcomes or deleting limits to sound persuasive.

One fresh independent exact-v3 review reads all visible copy in order, including buttons, FAQs and footer. It reports rhetorical frames across sections by exact key/line, and separate voice, claims, trust/topic preservation and MD/JSON parity verdicts. Repeat use of a semantic frame fails even if words differ. Owner-rejected not-X-but-Y persuasion is a material failure, not a polish preference. PASS requires credible daily scenarios and a clear benefit/action without jargon or implementation language. Eitan's full-page voice approval remains required before application; internal PASS cannot substitute for it.

Prepared contract: handoff/pending/2026-10-14_001_waocopy_homepage-voice-repair.md. Homepage only; two new immutable draft files; embedded exact-version reviewer contract, no source application. No writer or reviewer card created in this run.

## Dispatch preflight and actual blocker

Execution mode reads hermes. Real profiles exist: waocopy=qwen3.8-max/alibaba with .env present; waohebrewqa=gpt-6-luna/openai-codex with .env present. AGENTS gives1M context; expected writer/reviewer payload below80k. Read-only auth status alibaba reports logged in. This is local authentication state, not a fresh successful model call or an assurance of quota/latency. Current copy policy requires Qwen; the proposed change is the editorial process, not an unexplained model switch or another identical Qwen prompt. No provider request/configuration change performed.

The mandatory full-board duplicate/status scan could not run: native hermes kanban list --archived --sort created-desc was refused with 'delegate_task child contexts cannot mutate Kanban tasks or boards', despite being a read-only inventory request. Related cards were inspected individually through kanban_show, but that is not a full-board inventory. Arbitrary execute_code was separately refused in unattended mode; no bypass or alternate database transport attempted. Dispatch remains prohibited until a normal strategist/orchestrator context supplies the current native board scan and confirms one canonical correction writer, then verifies actual writer capability. Resume this same strategy task; do not create another strategy diagnosis or duplicate content worker.
