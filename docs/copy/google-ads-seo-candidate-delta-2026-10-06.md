# Draft — Google Ads SEO-candidate delta: proof/steps coexistence + onboarding-track CTA removals (DRAFT-ONLY)

- Status: DRAFT ONLY — UNAPPLIED. No source file, pinned draft, bundle, schema or handoff-status file was modified. This file grants no application authority, partial or full, and is NOT Yonatan SEO signoff, live SEO evidence, or production truth. release_health=false.
- Author: waocopy (kanban t_32836de5), Contract v3 `handoff/pending/2026-10-06_033_waocopy_resolve-ads-seo-candidate.md` (SHA-256 `08758b818fc74f3b78f579e6ebc934fba8a6f7f9e67ec638a70ba8595649e420`, matched at preflight).
- Sole parent: t_3f83a745 — formal DONE, independent technical SEO preflight FAIL bounded to two candidate-coherence gaps: (a) `proof_steps_relationship` — whole-page draft `:42-49` asserts proof/steps distinctness while proof-slot draft `:139` records the interaction as unresolved at its time of writing; (b) `CTA_adjacency` — two adjacent hero sibling CTAs (source `page.tsx:215-220`): a demo-view route with sandbox query params (`:215`, label seam `:216`) beside a plain onboarding-track route (`:218`, label seam `:219`). The labels signal different actions and different destinations — the duplicate-CTA concern is competing adjacent routes into the same onboarding surface, not label similarity, and the onboarding-track route cannot complete online signup/payment (`onboarding/page.tsx:557`) — with the closing onboarding-track link (`:343-345`) repeating the track route at the page end. This delta makes BOTH candidate-level choices explicitly; final SEO signoff stays reserved for Yonatan (§5).
- Preflight pins (all six matched before authoring; re-verified after write):
  - `src/app/(app)/google-ads/page.tsx` = `2ac114c9f289ab36a9ead483a4fdaf9882ea89c9d2839036bb14efd887e418af`
  - `docs/copy/google-ads-protected-anchors-draft-2026-10-06.md` = `89ec7a0392de62aa5588d43be08c06868866a34e6d769895e1e29e16fcd78058`
  - `docs/copy/google-ads-uncertain-sections-draft-2026-10-06.md` = `4002eda04e20692e008ed18593c216a53ddf58203ad5b6e4d27086f7c7c114a4`
  - `docs/copy/google-ads-whole-page-flow-draft-2026-10-06.md` = `fb95eff7e5746a6aa2718a3ccda9b32da8d47b6bbad61e4055d3ba2b63b7ac45`
  - `docs/copy/google-ads-faq5-demo-draft-2026-10-06.md` = `351a4d4133e4de343878755c94a594ed68586469b51012a0ad483a1725f351f1`
  - `docs/copy/google-ads-proof-slot-draft-2026-10-06.md` = `67866763891521194c09a996cc30edabdfe2454213e2331cf0f773098858ee28`
- Hebrew safety: this delta authors ZERO new Hebrew strings. Existing SOURCE page Hebrew (CTA labels, eyebrows) is cited by `file:line` and deliberately NOT retyped. The proposed-cell Hebrew quoted in §1 is provenance-cited REFERENCE material from the pinned drafts (precedent: whole-page draft `:49`); each pinned draft — never this file — remains the sole byte-exact application source for its own cells.
- Persona: skeptical Israeli small-business owner (singular male, native Sabra register) who paid for clicks but cannot attribute which inquiries arrived.
- Offer angle: optional low-pressure inquiry and viewable Ads Bot demo — never online signup/payment. Only supported operational fact: `src/app/(app)/google-ads/onboarding/page.tsx:557` (online signup/payment currently unavailable, no charge occurs, demo viewable). Not extended anywhere in this delta: demo viewability never implies signup or payment availability.
- Entity/keyword targets carried (as topics/questions and preserved head terms, never as claims): Google Ads management for small businesses; paid Google search; account control; conversion tracking; ad budget versus management fee.

## 1. Candidate decision KEY seoDelta.proofSteps — KEEP BOTH blocks, differentiated (closes preflight FAIL item a)

Disposition: the combined candidate KEEPS BOTH the three-tile buyer-diligence scan (proof-slot draft `:29-81`, ten keyed cells over STATS seam `page.tsx:122-126` + eyebrow `:228`) AND the five-question detailed guide (uncertain-sections draft `:23-80`, rows over STEPS seam `page.tsx:80-111` + headings `:245-249`). `wholePage.steps.eyebrow` (whole-page draft `:53-65`) supersedes ONLY the older eyebrow cell of `uncertain.steps.heading` (uncertain-sections draft `:66`); the SEO-bearing H2 fragment (uncertain-sections draft `:70-78`, head term noted `:80`) is NOT superseded and stands.

Relationship to proof-slot draft `:139`: that coherence flag recorded, at its time of writing, that the two-blocks interaction was flagged but NOT resolved by that draft, and that the gate may differentiate or fold. THIS candidate decision resolves that open question in favor of keep-both-differentiated, using the concrete differentiating framing the whole-page delta supplied (eyebrow override + scan/detail split). The proof-slot file is NOT rewritten or edited — it remains intact as historical evidence; the resolution lives only here. The whole-page draft's distinctness conclusion (`:42-49`) is thus no longer contradicted by an open flag: the candidate now carries one explicit, coherent position, with layout sign-off still reserved for Yonatan (§5).

### 1a. Actual-cell comparison (tile headlines vs step titles; descs compared in English by key)

| Proof tile (scan) | Key / draft line | Headline (cited reference) | Steps row (guide) | Key / draft line | Title (cited reference) |
|---|---|---|---|---|---|
| stat1 | proofSlot.stat1.n, proof-slot `:34` | של מי החשבון? | row3 | uncertain.steps.row3, uncertain `:44` | ודא שחשבון הפרסום ופרופיל התשלומים נשארים שלך |
| stat2 | proofSlot.stat2.n, proof-slot `:49` | מה באמת מודדים? | row1 | uncertain.steps.row1, uncertain `:30` | שאל איך מודדים פניות אמיתיות, לא רק קליקים |
| stat3 | proofSlot.stat3.n, proof-slot `:64` | מי מאשר שינויים? | row4 | uncertain.steps.row4, uncertain `:51` | ברר מה כלול בניהול, ומה דורש את האישור שלך |
| — | no tile counterpart | — | row2 | uncertain.steps.row2, uncertain `:37` | בדוק איזה סוג קמפיין באמת מתאים לעסק שלך |
| — | no tile counterpart | — | row5 | uncertain.steps.row5, uncertain `:58` | בקש תשובות כנות על מחירים, דוחות וציפיות |

Distinct reader jobs and non-identical questions — verified by key, no new claim needed:
- (a) Form and wording: the three tile headlines are short interrogative scan questions (3 words each); the five row titles are imperative diligence instructions (5-8 words). No string is identical or near-identical across the two blocks; tile sub-lines were already cell-by-cell verified distinct from row titles/descs in the proof-slot draft (`:41` stat1.l vs row3; `:56` stat2.l vs row1; `:71` stat3.l vs row4).
- (b) Depth: each row desc adds concrete sub-questions its tile never states — row1 (`:31`) seeing data next to spend; row2 (`:38`) why this campaign type fits the goal/budget; row3 (`:45`) spend-data access, export, switching providers; row4 (`:52`) who writes ads and landing pages, how budget changes are approved; row5 (`:59`) what can/cannot be guaranteed, management fee versus media budget, reporting cadence. Rows 2 and 5 have NO tile counterpart at all, so the guide strictly extends the scan's coverage.
- (c) Reader job and position (whole-page `:42-49`): tiles = 10-second gut check directly under the hero (headline + one-line sub + topic label); steps = conversation prep after the scan (numbered title + 2-3 sentence desc + topic chips). Shared topics (account control, conversion-versus-clicks, change approval) are the page's keyword targets recurring as a standard scan-then-expand teaser/deep-dive pattern — not one repeated promise.
- (d) Eyebrow differentiation: the proof-slot eyebrow (proof-slot `:79`, "every provider" frame) and the superseding steps eyebrow (whole-page `:57`, "every question in detail" frame) were verified non-duplicative at whole-page `:59`; the steps eyebrow keeps the "מנהל קמפיינים" token and its SEO-coordinated seam status (uncertain `:133`).

Conclusion: distinctness holds on the actual cells WITHOUT any new commercial or operational claim — the candidate is READY on this item, not NOT READY. Both blocks remain governed solely by their pinned drafts; the only heading delta in force is `wholePage.steps.eyebrow`.

## 2. Candidate decision KEYs seoDelta.cta.heroOnboardingLink / seoDelta.cta.closingOnboardingLink — REMOVE (closes preflight FAIL item b)

These are DRAFT dispositions, not application instructions. No replacement Hebrew is needed or authored; each removal is recorded as a remove-key over an exact DOM block.

### KEY seoDelta.cta.heroOnboardingLink — REMOVE entire `<Link>` block at `src/app/(app)/google-ads/page.tsx:218-220`
The whole hero onboarding-track `<Link>` (href `:218`, label text `:219` — cited by line, not retyped; closing tag `:220`) is REMOVED from the candidate. PRESERVED: the phone CTA `<a>` `:211-214` (label replacement owned solely by `wholePage.hero.cta.primary`, whole-page `:20-30`) and the demo-view `<Link>` `:215-217` (href and structure unchanged; label owned solely by `googleAds.hero.cta.sandboxLabel`, faq5-demo `:33-43`). Result: exactly ONE hero demo destination and one inquiry CTA remain.

### KEY seoDelta.cta.closingOnboardingLink — REMOVE entire `<Link>` block at `src/app/(app)/google-ads/page.tsx:343-345`
The whole closing onboarding-track `<Link>` (href `:343`, label text `:344` — cited by line, not retyped; closing tag `:345`) is REMOVED from the candidate. PRESERVED: `PhoneReveal` `:337-342` (verified generic, preserved unchanged per whole-page `:32-36`; trust-flow `:225` KEEP stands) and all closing copy cells owned by the Rev 3 packet (`googleAds.cta.closing`: H2 trust-flow `:222`, paragraph `:224`, trust line `:228`; closing eyebrow source `:328` KEEP).

### Superseded KEEP dispositions (exactly these; nothing else in those files changes)
- whole-page draft `:76` (flow row 4: hero Ads Bot CTA KEEP-unchanged with adjacency note left open) — SUPERSEDED by seoDelta.cta.heroOnboardingLink REMOVE.
- whole-page draft `:80` (flow row 8) — SUPERSEDED ONLY as to the closing Ads Bot link portion; the row's remaining dispositions (closing copy KEEP per trust-flow `:222,:224,:228`; PhoneReveal generic/preserved per `:225`) stay in force.
- whole-page draft `:98` (preserved-seams list entries "closing secondary link `:343-345`" and the hero sibling-CTA preservation at `:22`) — SUPERSEDED for the two removed DOM blocks only; every other preserved seam listed there stands.
- trust-flow closing key CTA dispositions `:225-226`: the Secondary-CTA KEEP-UNCHANGED line (`:226`) is SUPERSEDED; the PhoneReveal KEEP (`:225`) remains in force. (Contract 033 cites this locus as `:225`; the superseded bytes are the secondary-link line at `:226` within that same closing-key block.)
- The faq5-demo adjacency flag (`:42`) and the whole-page gate note (`:125` item 2) are CLOSED by removal at candidate level; final SEO sign-off on the removals remains Yonatan's (§5).

### Rationale (English; no new marketing text)
- After the faq5-demo demo-label replacement (`:37`), the hero would render two sibling outline CTAs whose labels signal different actions and different destinations: viewing the demo (sandbox query params `:215`) versus exploring the onboarding track (plain track route `:218`). The labels are not similar, and the duplicate-CTA concern is not label similarity — it is competing adjacent routes into the same onboarding surface, and the onboarding-track route cannot complete online signup or payment (`onboarding/page.tsx:557`); the supported demo fact is viewability only, which authorizes no signup/payment inference. The closing link would add a third onboarding-track route on one page.
- Honesty: the onboarding-track destination cannot complete online signup or payment (`onboarding/page.tsx:557`); a "check the track" CTA implies an available path that is not available, while the demo-view CTA states only the supported fact (viewability). Removing the track links keeps every remaining CTA within supported reality, and no signup/payment availability is inferred from demo viewability anywhere in this delta.
- Offer-surface coherence after removal (whole-page density pattern `:86` intact): introduce (hero paragraph + phone + single demo CTA) → inform (scan + guide, zero offers; both footnotes remain OMIT — proof-slot `:83-89`, whole-page `:82-84`) → contextual nudge (FAQ5 low-pressure inquiry preserved, faq5-demo `:16-29`) → convert (closing PhoneReveal + question-form copy). No duplicate additive CTA or footnote is created; `proofSlot.footnote` and `wholePage.steps.footnote` remain OMIT.

## 3. Provisional technical SEO choices — explicitly RESERVED for Yonatan (recorded, not signed off)

No new title/H1/badge bytes are authored here; no keyword-volume, SERP/rank, or rich-result-eligibility claim is made or implied anywhere in this delta.

- Title: PRIMARY candidate = `anchors.title` primary proposal (protected-anchors draft `:40`) with its single-RLM suffix byte pattern (`:42`) under the source `title.absolute` template-bypass behavior (`page.tsx:10-12`). ALTERNATE (`:44`) remains Yonatan's discretion, as does the final title formula/length and SERP bidi interpretation.
- H1: PRIMARY candidate = `anchors.h1` three-line fragment mapping (protected-anchors draft `:88-100`). The pain-hook alternate (`:102-106`) remains Yonatan's discretion.
- Badge: PRIMARY candidate = `anchors.badge` primary (protected-anchors draft `:80`); the alternate (`:82`) is SEO's discretion.
- FAQ/schema parity: KEEP exactly two synchronized visible/schema FAQ answer pairs — `anchors.faq1` (protected-anchors `:114-117`; visible `page.tsx:131` + schema `:57`) and `anchors.faq2` (`:119-122`; visible `:143` + schema `:65`), byte-identical at both seams of each pair, question strings unchanged. Canonical/robots/OG url/type, schema `@id`s and structural links preserved (protected-anchors `:34`). FAQ5 keeps NO schema mirror (faq5-demo `:29`).
- Priced Service Offer: ACCEPT the REMOVE-GATED disposition of the `offers` object (protected-anchors `:73-74`, source seam `page.tsx:46`) rather than restoring the unsupported price claim. The loss of Offer rich-result eligibility for the Service entity is an explicit SEO choice for Yonatan to sign — not a predicted performance outcome and not an approved result.
- INCLUDED section: ACCEPT the whole-section REMOVE-GATE (uncertain-sections `:96-111`; source seams `page.tsx:113-120`, `:278-298`) rather than reviving unsupported service/inclusion claims (matrix A/C/E; Fraud Blocker owner question still open).
- Net entity retention (for Yonatan's topical-coverage call): the head term "ניהול קמפיינים בגוגל" survives in the proposed steps H2 (uncertain-sections `:72-78`, consequence noted `:80,:111`); Search / Performance Max / YouTube Ads / GA4 / Google Tag Manager / Conversion Tracking entities survive as question topics and tag chips across rows 1-2 and 4 (uncertain-sections §2); account-control and budget-change entities survive in both question blocks (§1a). Whether question/chip-form mentions preserve adequate semantic coverage versus the removed tile/section surface is an OPEN SEO question for Yonatan. The chips' empty-array fallback (uncertain-sections `:92`) would further reduce entity text — flagged as a REAL coverage tradeoff for Yonatan, not an already-approved outcome.

## 4. Precedence/key table (combined candidate — limited to these decisions)

| Seam / decision | Governing source after this delta | Note |
|---|---|---|
| Proof scan (STATS `:122-126`, eyebrow `:228`) | proof-slot draft §2 (ten cells) | KEEP; footnote OMIT (`:83-89`); render guidance `:91-100` |
| Steps rows 1-5 (STEPS `:80-111`) | uncertain-sections draft §2 rows | KEEP; chips fallback `:92` = open Yonatan tradeoff |
| Steps eyebrow (`:245`) | whole-page `:53-65` (`wholePage.steps.eyebrow`) | Supersedes uncertain `:66` cell ONLY |
| Steps H2 (`:247-248`) | uncertain-sections `:70-78` | NOT superseded; head term preserved |
| Steps footnote (additive `:274-275`) | whole-page `:82-84` | OMIT; must not be applied from any draft |
| INCLUDED (data `:113-120`, section `:278-298`) | uncertain-sections `:96-111` | REMOVE-GATED whole section |
| Hero phone CTA label (`:212`) | whole-page `:20-30` | REPLACE label; href/SVG/structure preserved |
| Hero demo `<Link>` (`:215-217`) | faq5-demo `:33-43` | Label REPLACE; sole hero demo destination |
| Hero onboarding-track `<Link>` (`:218-220`) | THIS delta §2 | REMOVE — supersedes whole-page `:76`, part of `:80`, `:98` entries |
| Closing onboarding-track `<Link>` (`:343-345`) | THIS delta §2 | REMOVE — supersedes trust-flow `:226`, whole-page `:80` (link portion), `:98` entry |
| Closing PhoneReveal (`:337-342`) | whole-page `:32-36`; trust-flow `:225` | Generic; PRESERVE unchanged |
| Closing copy (H2/paragraph/trust line `:329-335,:348`) | trust-flow `:222,:224,:228` | KEEP as drafted; eyebrow `:328` KEEP |
| FAQ5 answer (`:147`) | faq5-demo `:16-29` | KEEP; low-pressure inquiry preserved; no schema mirror |
| Metadata/schema anchors (`:8-78` incl. badge `:191`, H1 `:203-205`) | protected-anchors §§2-5 | Primaries recorded §3; Offer REMOVE-GATED `:73-74` |
| Hero paragraph (`:207-209`) | trust-flow `:110` | KEEP as drafted |
| Proof/steps coexistence | THIS delta §1 | KEEP-BOTH resolved; proof-slot `:139` flag closed at candidate level, file untouched |
| Everything else | whole-page `:98` preserved list | Unchanged; canonical/robots/OG url/type, schema IDs, BreadcrumbList, FAQ question strings, FAQ rows 2-3 answers |

## 5. Open decisions and gates (none passed by this delta)

1. Independent read-only candidate review (waoverifier; waostrategy dispatches with this card as sole parent — this delta dispatches NOTHING): reconcile the two new dispositions against the t_3f83a745 FAIL and pinned sources.
2. Yonatan SEO specialist decisions (final sign-off, all reserved): title/H1/badge formulation (primaries §3 vs alternates, RLM/title-formula/SERP interpretation); removed priced Offer and INCLUDED section net-surface implications; question/chip topical coverage incl. the empty-array fallback tradeoff; proof+guide layout coexistence; both onboarding-track CTA removals and the resulting single-demo-path surface; steps-eyebrow phrasing. This delta is NOT signoff.
3. Eitan founder Hebrew/commercial spot-check (human voice gate; grammatical correctness is not voice approval).
4. Separate waoengineer byte-exact application contract (coder types zero Hebrew; pinned drafts are the sole cell sources; includes the proof-slot render guidance and the two DOM-block removals recorded here).
5. Isolated post-application runtime/mobile-RTL visual verification.
6. Owner publication/deployment decision. release_health=false throughout; no partial application authority.

## 6. Coherence verification, claim scan, preservation and scope

- Preflight FAIL items closed at candidate level: `proof_steps_relationship` → explicit KEEP-BOTH decision with actual-cell distinctness evidence (§1), earlier file unedited; `CTA_adjacency` → both onboarding-track DOM blocks explicitly REMOVED as draft dispositions (§2), sole demo link and FAQ5 inquiry preserved. If either choice had required a new claim to hold, the candidate would have been marked NOT READY — it did not; both rest only on already-drafted, independently reviewed cells and the supported onboarding fact.
- Prohibited-claim scan (this delta): no new Hebrew marketing string; no price, ownership/MCC practice, service inclusion/Fraud Blocker, approval workflow, measurement capacity, performance proof, response-time, availability or signup claim introduced; no online signup/payment availability inferred from demo viewability (`onboarding/page.tsx:557` not extended); no duplicate additive CTA/footnote (`proofSlot.footnote`, `wholePage.steps.footnote` remain OMIT); no keyword-volume/rank/rich-result-eligibility assertion; no earlier verdict altered — superseded dispositions are named by exact file:line and remain readable in their historical files.
- Preservation: exactly ONE new file created (this delta). The six pinned files, trust-flow packet, copy bundle, `PhoneReveal.tsx`, `onboarding/page.tsx`, schemas and handoff-status directories are byte-identical (pins re-hashed unchanged after write). Inert checks repeated before and after write: `sha256sum` on all six pins; `git diff --check` clean; `git diff --cached --name-only` empty; `git diff --exit-code -- data/clients/` clean. No build/test/server/browser/provider/client/payment access; no publication/commit/deploy; no handoff file moved; no successor dispatched.
- focused_acceptance scope: can cover ONLY a coherent unapplied candidate delta; release_health=false regardless.
