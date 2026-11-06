# Draft — Google Ads whole-page flow reconciliation: hero CTA, proof/steps distinctness, offer dispositions (DRAFT-ONLY)

- Status: DRAFT ONLY — UNAPPLIED. No source file, pinned draft, bundle, schema or handoff-status file was modified. This file grants no application authority, partial or full. release_health=false.
- Author: waocopy (kanban t_c8090993), Contract v3 `handoff/pending/2026-10-06_030_waocopy_reconcile-ads-page-flow.md` (SHA-256 `4ba987ee9d65efd5479280e2791655eac2598147858c3d51139a495bf045b403`, matched at preflight).
- Sole parent: t_5d1838be — formal DONE, independent substantive FAIL bounded to (a) the hero CTA free-30-minute promise lacking a replacement disposition (family D) and (b) unresolved proof-slot/steps overlap and repeated inquiry/demo offers on the combined page. Strategist source check (parent comment 645) confirms the closing `PhoneReveal` renders a generic phone-number reveal and is NOT a second consultation promise; this draft classifies it accordingly and does not propagate a false closing-component defect.
- Preflight pins (all eight matched before authoring; re-verified after write):
  - `src/app/(app)/google-ads/page.tsx` = `2ac114c9f289ab36a9ead483a4fdaf9882ea89c9d2839036bb14efd887e418af`
  - `src/components/PhoneReveal.tsx` = `c7d207d676877dc85eeee15e6b6b682d0ec447edbda723d07875dee977d0f200`
  - `docs/copy/google-ads-trust-flow-draft-2026-10-05.md` = `83999415771fa4b65f78eaf84697f33e08cdc475840a5462b2eecc252dfe5d1e`
  - `docs/copy/google-ads-protected-anchors-draft-2026-10-06.md` = `89ec7a0392de62aa5588d43be08c06868866a34e6d769895e1e29e16fcd78058`
  - `docs/copy/google-ads-uncertain-sections-draft-2026-10-06.md` = `4002eda04e20692e008ed18593c216a53ddf58203ad5b6e4d27086f7c7c114a4`
  - `docs/copy/google-ads-faq5-demo-draft-2026-10-06.md` = `351a4d4133e4de343878755c94a594ed68586469b51012a0ad483a1725f351f1`
  - `docs/copy/google-ads-proof-slot-draft-2026-10-06.md` = `67866763891521194c09a996cc30edabdfe2454213e2331cf0f773098858ee28`
  - `src/app/(app)/google-ads/onboarding/page.tsx` = `3537c8773657df9619540ea33019dee3ab8317b80d5b007ae8ee7e743af33928`
- Hebrew safety: only waocopy authored the new Hebrew below. Existing SOURCE page Hebrew (hero CTA label, closing block, eyebrows) is cited by file:line and deliberately NOT retyped. One cell is reused from the pinned Rev 3 packet (provenance cited); per the proof-slot draft's precedent (`:13`), the bytes in THIS file — not the packet — are the application source for that cell.
- Persona: skeptical Israeli small-business owner (singular male, native Sabra register) who already paid for clicks and cannot trace which inquiries arrived. The click-spend hook stays strong: hero paragraph opening (trust-flow draft `:110`, cited), steps row1 desc (uncertain-sections draft `:31`, cited) and the preserved closing eyebrow (`page.tsx:328`) all carry it.
- Offer angle: optional low-pressure inquiry and viewable Ads Bot demo — never an availability, length, price or terms promise. Only supported operational fact: `src/app/(app)/google-ads/onboarding/page.tsx:557` (demo viewable while online signup/payment unavailable). This draft does NOT extend that fact to "no charge", "no live budget", paid availability, or any signup implication anywhere — demo viewability never implies signup/payment availability.
- Entity/keyword targets carried (as buyer-diligence topics and preserved head terms): Google Ads management for small businesses; account control; conversion tracking versus clicks; management fee versus ad budget. No SEO title/H1/badge copy is proposed here; where the steps-eyebrow delta touches an SEO-coordinated seam, the choice is flagged for the SEO gate, not assumed signed off.

## 1. Delta key wholePage.hero.cta.primary — REPLACE hero CTA label at `page.tsx:212` (family D fix)

Seam: the text content of line `:212` inside the hero `<a>` (`:211-214`). PRESERVED UNCHANGED: the `href="tel:0526148860"`, `className="btn-primary"` and inline style on the opening tag (`:211`), the arrow SVG (`:213`), the closing `</a>` (`:214`) and both sibling CTAs (`:215-220`). Only the label text is replaced, byte-exactly, with:

> דבר איתנו על החשבון שלך

Provenance: reuses the already-authored unguaranteed `googleAds.hero.cta.primary` cell (trust-flow draft `:120-121`, cited by line), which passed bounded review as the single proposed label; it fits this seam with no modification, so no new label is invented and the old packet is untouched.

Claims (English): the old label (cited `:212`, not retyped) promised a free 30-minute consultation — unverified commercial terms (matrix D). The replacement is a plain conversation invitation about the reader's own account: no free term, no consultation length, no SLA, no availability, no service-scope, audit, measurement, ownership/MCC, approval or price claim. "החשבון שלך" refers to the reader's existing ads account (persona already pays for clicks); it asserts nothing about WAO's account structure. Singular male imperative ("דבר"), 5 words, TTS-safe.

Effect: after this replacement plus the already-drafted closing-block replacements (§4), NO rendered free/30-minute/consultation-terms string remains anywhere in the combined draft set. If Eitan later verifies the free 30-minute offer as a real standing term, restoring conditional language is a separate owner-gated decision on a separate card — nothing here validates it.

## 2. Closing PhoneReveal — classification: GENERIC phone reveal, PRESERVE unchanged

- `src/components/PhoneReveal.tsx:39` default pre-reveal label is a generic "show phone number" string (cited by line, not retyped); after reveal and on mobile the component displays the number only (`:92-113`). `page.tsx:337-342` passes `source`, `className`, `style` and `icon` only — NO custom `revealText` — so the closing CTA button itself promises nothing: no free consultation, no 30 minutes, no terms.
- Disposition: PhoneReveal props and default behavior PRESERVE UNCHANGED. No component-label replacement is proposed or needed. This resolves the parent review's family-D boundary item "verified closing PhoneReveal label disposition": verified generic, preserved (strategist source check, parent comment 645).
- The closing block's actual free-30-minute strings live in the H2 (`:330-331`), paragraph (`:334`) and trust line (`:348`). Their replacements remain owned solely by the pinned Rev 3 packet keys `googleAds.cta.closing` (trust-flow draft `:222` H2, `:224` paragraph, `:228` trust line — cited by line, unchanged by this draft). The closing eyebrow (`:328`) and secondary Ads Bot link (`:343-345`) stay KEEP-UNCHANGED per the same key. With those cells applied, the closing block is question-form/low-pressure only.

## 3. Proof-slot vs STEPS — distinct reader jobs, one byte-exact heading delta

Overlap compared per contract: proof-slot draft `:29-81,134-148` (three tiles: nine STATS fields + eyebrow) against uncertain-sections draft `:23-94` (five steps rows + eyebrow/H2 + optional footnote).

Decision: BOTH blocks stay, with distinct, on-page-visible reader jobs — quick trust scan versus detailed diligence guide:

| Block | Reader job | Depth | Position |
|---|---|---|---|
| Proof slot (STATS seam `:122-126`, eyebrow `:228`) | 10-second gut check: the three questions that decide whether a provider is even worth a conversation | 3-word headline question + one-line diligence sub + topic label per tile | directly under the hero |
| STEPS (seam `:80-111`, headings `:245-249`) | Conversation prep: all five questions in detail — what exactly to ask and which answers to listen for | numbered title + 2-3 sentence desc + topic chips per row | after the scan |

Why this is distinctness, not repetition: (a) no question text is duplicated — the tile headlines ("של מי החשבון?", "מה באמת מודדים?", "מי מאשר שינויים?", proof-slot draft `:34,:49,:64`, cited) and the row titles (uncertain-sections draft `:30,:37,:44,:51,:58`, cited) are deliberately different wording, already cell-by-cell verified distinct in the proof-slot draft (`:41,:56,:71`); (b) the steps descs add concrete sub-questions the tiles never state (spend-data access and export, switching providers, who writes ads and landing pages, reporting cadence, management fee versus media budget split); (c) the shared topics (account control, conversion-versus-clicks, change approval) are the page's keyword targets — they recur as scan-then-expand, a standard teaser/deep-dive pattern with real reader value, not as one repeated promise.

To make the relationship explicit on the applied page (the parent FAIL was that no draft proposed a concrete differentiating framing), ONE heading cell changes:

### Delta key wholePage.steps.eyebrow — supersedes the eyebrow cell of `uncertain.steps.heading` (uncertain-sections draft `:66`)

Seam: text content of the eyebrow div at `page.tsx:245`. Replaced byte-exactly with:

> כל שאלה בפירוט — לפני שבוחרים מנהל קמפיינים

Claims (English): positions the section as the detailed expansion of the scan above ("every question, in detail") while keeping the original cell's pre-commitment frame and its "מנהל קמפיינים" SEO token. No WAO practice, methodology, workflow, capacity or terms claim; no duplication of the proof-slot eyebrow (uncertain wording verified against proof-slot draft `:79`, cited). 7 words.

UNCHANGED by this delta (the pinned drafts remain the sole application source):
- All nine STATS fields and the proof-slot eyebrow (proof-slot draft §2, `:33-81`) — the distinctness decision does not require touching them; the scan/detail split is carried by depth, position and the steps eyebrow alone. The proof-slot draft is preserved intact as historical evidence; no replacement key map is triggered.
- The steps H2 fragment (uncertain-sections draft `:71-77`, line-for-line cells) — head term "ניהול קמפיינים בגוגל" preserved; `<h2>` wrapper/styles untouched.
- Steps rows 1-5 (uncertain-sections draft §2) and the chips/empty-array fallback (`:92`); INCLUDED stays whole-section REMOVE-GATED (`:96-111`).
- SEO note for the gate (flagged, not assumed): the eyebrow seam was already SEO-coordinated in the uncertain-sections draft (`:133`); this delta changes only the eyebrow cell's bytes within that same key, keeps the campaign-manager token, and loses no head term.

## 4. Whole-page offer dispositions — one reading order

Ordered page flow after all pinned drafts + this delta are applied (INCLUDED section removed):

| # | Placement | Offer surface | Disposition | Source |
|---|---|---|---|---|
| 1 | Hero paragraph (`:207-209`) | low-pressure inquiry + demo viewable mention | KEEP as drafted | trust-flow draft `:110` |
| 2 | Hero phone CTA (`:211-214`) | inquiry label | REPLACE label — §1 of this draft | this draft §1 (cell provenance trust-flow `:121`) |
| 3 | Hero sandbox CTA (`:215-217`) | viewable demo label | KEEP as drafted (view-only) | faq5-demo draft `:37` |
| 4 | Hero Ads Bot CTA (`:218-220`) | onboarding track link | KEEP existing source unchanged; label-similarity adjacency note stays open for the SEO gate | faq5-demo draft `:42` |
| 5 | Proof-slot footnote | none | remains OMIT — never restored | proof-slot draft `:83-89` |
| 6 | STEPS footnote (optional, seam `:274-275`) | inquiry + demo | OMIT — delta disposition below | supersedes uncertain-sections draft `:82-86` |
| 7 | FAQ5 answer (`:147`) | in-answer inquiry invitation | KEEP as drafted — contextual, inside the commitment question, adds decision-point value | faq5-demo draft `:20` |
| 8 | Closing block (`:322-353`) | inquiry H2/paragraph/trust line + PhoneReveal + Ads Bot link | KEEP as drafted (§2); PhoneReveal generic and preserved | trust-flow draft `:222,:224,:225,:228` |

### Delta key wholePage.steps.footnote — OMIT (supersedes the OPTIONAL `uncertain.steps.footnote`)

The optional steps footnote (uncertain-sections draft `:82-86`, cited) is OMITTED — no footnote of any kind is proposed for that seam. Rationale: it would be a third additive inquiry+demo offer within one page third (hero paragraph and CTAs directly above; FAQ5 invitation and the dedicated closing conversion block directly below), repeating the identical offer with no new reader information — exactly the redundancy the parent review flagged. The cell was explicitly OPTIONAL and gated, so omission costs no claim, no keyword surface and no required conversion touchpoint. Binding on any later engineer application contract: the additive `<p>` seam between the steps-list container close (`:274`) and the section container close (`:275`) must NOT be created from any draft.

Terms coherence across remaining surfaces: every kept inquiry mention is a no-terms conversation invitation ("בלי לחץ" framing per the cited drafted cells); no surface states or implies free consultation, 30 minutes, response SLA, availability, price, signup or payment. Demo mentions state viewability only, never signup/payment availability (onboarding fact `:557` not extended). The click-spend pain hook opens the hero and closes the page (preserved eyebrow `:328`), with the two question blocks as the value delivery between them — offer density is now: introduce (hero) → inform (scan + guide, zero offers) → contextual nudge (FAQ5) → convert (closing).

## 5. Changed-disposition key map (ordered) and preserved seams

Changed by THIS delta draft only (application source = the bytes in this file):

| # | Key | Seam | Disposition |
|---|---|---|---|
| 1 | wholePage.hero.cta.primary | `page.tsx:212` label text | REPLACE (byte-exact cell §1; href/SVG/classes/structure `:211,:213-214` preserved) |
| 2 | wholePage.steps.eyebrow | `page.tsx:245` eyebrow text | REPLACE (byte-exact cell §3; supersedes uncertain-sections draft `:66` cell only; H2 fragment and rows unchanged) |
| 3 | wholePage.steps.footnote | none — additive seam `:274-275` withdrawn | OMIT (supersedes uncertain-sections draft `:82-86`; must not be applied from any draft) |

Everything else is PRESERVED, governed solely by its pinned draft (cited by line, never retyped here): all `anchors.*` keys incl. synced FAQ1/FAQ2 pairs and REMOVE-GATED offers price (protected-anchors draft §1-5); all ten `proofSlot.*` cells + render guidance + footnote OMIT (proof-slot draft §2-5); `uncertain.steps.row1-5`, heading H2 fragment, chips fallback, `uncertain.included` REMOVE-GATE (uncertain-sections draft §2-3); `googleAds.faq5.answer` and `googleAds.hero.cta.sandboxLabel` (faq5-demo draft); `googleAds.hero.paragraph` and `googleAds.cta.closing` incl. PhoneReveal KEEP (trust-flow draft `:110,:220-228`); source seams untouched by any draft: canonical/robots `:16-17`, OG url/type `:21-22`, schema `@id`s/serviceType/provider/areaServed `:30,:34,:39-40,:43-45,:50`, BreadcrumbList `:70-78`, FAQ question strings `:54,:62,:130,:134,:138,:142,:146`, FAQ rows 2-3 answers `:135,:139`, hero badge/H1 seams (anchors-draft-gated), closing eyebrow `:328`, closing secondary link `:343-345`, PhoneReveal component and props `:337-342` / `PhoneReveal.tsx:39,49-59,92-113`.

## 6. A–F claim-safety check (brief) and prohibited-claim scan of delta strings

| Family | Delta impact | Verdict |
|---|---|---|
| A ownership/MCC | "על החשבון שלך" addresses the reader's account; no WAO ownership/MCC practice asserted; anchored dispositions unchanged | safe |
| B approval | untouched; approval stays buyer-question-only (proofSlot.stat3, steps row4); footnote OMIT is B-neutral | safe |
| C scope/Fraud Blocker | untouched; INCLUDED stays REMOVE-GATED; owner Fraud Blocker question stands, no public string | safe |
| D commercial terms | FIXED at draft level: hero `:212` free-30 label replaced (§1); closing PhoneReveal verified generic and preserved (§2); closing H2/paragraph/trust-line replacements confirmed still owned by trust-flow `:222,:224,:228`; no rendered free/30-minute/SLA/availability/price term remains in the combined set | resolved-draft |
| E audit/measurement | hero label promises no audit or measurement review; steps eyebrow promises no workflow; drafted buyer-question framing intact | safe |
| F numeric proof | nine STATS fields + eyebrow unchanged from proof-slot draft (all non-numeric); no figure returns anywhere | safe |

Prohibited-claim scan (the two delta strings, §1 and §3): no numeral; no free/30-minute/consultation term; no price, invoicing or media-payment mechanic; no no-contract/termination term; no ownership/MCC/payment-profile practice; no approval workflow; no GA4/GTM or audit capacity; no results, ROI/CPA/ROAS, lead-count, deadline, response-SLA or availability promise; no signup/payment implication; no market or provider-behavior characterization; no duplication of any protected anchor, FAQ answer, demo label, steps row or tile cell (wording verified distinct against every cited locus); no extension of the single supported onboarding fact.

## 7. Full-page readability rationale (brief)

One narrative arc for the persona: the hero names his pain (paid for clicks, can't trace inquiries) and offers a no-pressure call plus a viewable demo; the scan gives him the three make-or-break questions in ten seconds; the guide arms him with all five, in detail, before any provider conversation; the FAQ answers his objections honestly (no guarantees, no published terms) with one contextual invitation at the decision point; the closing mirrors the opening pain and converts. Question density tapers (3 headlines → 5 detailed → 5 FAQ), offer density tapers to a single conversion block, and no two adjacent surfaces repeat the same sentence or the same promise.

## 8. Preservation, scope and inert checks

- Exactly ONE new file created: this draft. The five accepted draft packets, `page.tsx`, `PhoneReveal.tsx`, `onboarding/page.tsx`, the copy bundle, schemas and handoff-status directories are byte-identical (eight pins re-hashed unchanged after write).
- Inert checks repeated before and after write: `sha256sum` on all eight pins; `git diff --check` clean; `git diff --cached --name-only` empty; `git diff --exit-code -- data/clients/` clean. No build/test/server/browser/provider/client/payment access; no publication/commit/deploy; no handoff file moved; no successor dispatched.

## 9. Open gates (none passed by this draft)

1. Independent read-only review of THIS delta draft (waoverifier; waostrategy dispatches with this completed card as sole parent): hero CTA resolves family D; closing PhoneReveal classification; proof/steps distinctness and offer-placement coherence; no historical draft/source edit; pins intact.
2. SEO signoff: protected-anchor/net-surface package, incl. the steps-eyebrow delta (SEO-coordinated seam — flagged, not assumed) and the two Ads Bot label adjacency note.
3. Eitan founder Hebrew/commercial spot-check (human voice gate; grammatical correctness is not voice approval) — incl. whether a verified free-30-minute offer ever returns.
4. Separate waoengineer byte-exact application contract reconciling ALL pinned drafts + this delta (coder types zero Hebrew; includes the proof-slot typography guidance), then isolated runtime/mobile-RTL visual verification.
5. Owner publication/deployment decision.

No partial application authority. release_health=false. Escalation: independent draft review; SEO/founder/application/runtime/owner gates remain open.

## 10. Self-check (waocopy, pre-completion)

- Register: singular male imperative in both delta strings ("דבר", impersonal "בוחרים" plural-general in the eyebrow frame matching the superseded cell's pattern); native Sabra phrasing; 5 and 7 words — within the 12-15 ceiling; no translated-from-English constructions.
- Typography: no ASCII quotes/apostrophes inside Hebrew strings; no double spaces; em-dash single-spaced in the eyebrow cell; no numerals in any delta string; no RLM needed (no title/metadata strings here).
- Coherence: verified zero verbatim duplication of the two delta strings against all five pinned drafts and the source page; verified the combined set renders no free/30-minute/SLA/availability term after application of all cited cells.
- Scope: one new file; eight pins matched pre- and post-write; inert checks clean; no JSX, packet, bundle, schema or handoff-status file touched; no successor dispatched.
