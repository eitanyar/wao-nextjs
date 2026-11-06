# Draft — truthful replacement for the Google Ads proof slot (STATS + eyebrow)

- Status: DRAFT ONLY — UNAPPLIED. No source file was modified; this file grants no application authority, partial or full. release_health=false.
- Author: waocopy (kanban t_64723969), Contract v3 `handoff/pending/2026-10-06_025_waocopy_draft-ads-proof-slot.md` (SHA-256 `b76b3e136c1a65a9dc842f40addbca4ade973b06f9ba2da55b96d8b6ff4465c6`, matched at preflight).
- Correction (Contract 2026-10-06_027, kanban t_08558e88, per independent reviewer t_18d851cb FAIL at `proofSlot.footnote`): the optional footnote proposal is WITHDRAWN — NOT PROPOSED / OMIT (§3). Only the footnote disposition and its dependent English guidance changed (§1, §3–§9 references reconciled); the ten required proposed cells (nine STATS fields + eyebrow) and the nonnumeric render guidance are byte-identical to the pinned pre-correction snapshot (SHA-256 `4a40492d3fb5309a23569a08f26c4d575470a6b030d34cd33ad1584ac0439936`, matched before edit). No replacement Hebrew was introduced. The final corrected digest is reported in the completion report only (no self-referential hash inside this file). release_health=false unchanged.
- Sole parent: t_667030bb — formal DONE, independent substantive PASS bounded to the FAQ5/demo two-cell draft only. Not a whole-page approval and not relied on beyond that scope. The earlier Rev 3 stats bounded PASS (t_edfd0ceb) covers the Rev 3 question angles as starting material only — it is not a source-applicable shape and not a current-hash full-page approval; it is not replayed here.
- Preflight pins (all five matched before authoring; re-verified after write):
  - `src/app/(app)/google-ads/page.tsx` = `2ac114c9f289ab36a9ead483a4fdaf9882ea89c9d2839036bb14efd887e418af`
  - `docs/copy/google-ads-trust-flow-draft-2026-10-05.md` = `83999415771fa4b65f78eaf84697f33e08cdc475840a5462b2eecc252dfe5d1e`
  - `docs/copy/google-ads-protected-anchors-draft-2026-10-06.md` = `89ec7a0392de62aa5588d43be08c06868866a34e6d769895e1e29e16fcd78058`
  - `docs/copy/google-ads-uncertain-sections-draft-2026-10-06.md` = `4002eda04e20692e008ed18593c216a53ddf58203ad5b6e4d27086f7c7c114a4`
  - `docs/copy/google-ads-faq5-demo-draft-2026-10-06.md` = `351a4d4133e4de343878755c94a594ed68586469b51012a0ad483a1725f351f1`
- Hebrew safety: only waocopy authored the new Hebrew below. Existing SOURCE page Hebrew (the numeric tiles, the old eyebrow) is cited by file:line and deliberately NOT retyped, so no stale copy of the rejected strings propagates into engineer-facing guidance. Where a proposed cell preserves wording from the Rev 3 packet (starting material per contract req. 2), the bytes below — not the packet — are the application source; provenance is noted per cell.
- Persona: skeptical Israeli small-business owner (singular male, native Sabra register) who already paid for clicks without knowing which inquiries resulted.
- Offer angle (Contract 027 reconciliation of contract req. 3): NO offer is proposed anywhere in this draft. The optional low-pressure inquiry and viewable Ads Bot demo offer — never represented as a guaranteed service — lives only in its passed-review loci: the FAQ5/demo draft (`googleAds.faq5.answer`, `googleAds.hero.cta.sandboxLabel`) and the steps optional footnote (uncertain-sections draft `:82-86`). The footnote formerly proposed here duplicated that offer and is OMITTED (§3); no replacement Hebrew is introduced, so this slot stays buyer-diligence-only. Supported-fact anchor for the demo: `src/app/(app)/google-ads/onboarding/page.tsx:557` (demo viewable while online registration/payment unavailable) — not extended anywhere in this draft.
- Entity/keyword targets (contract req. 3), all carried as buyer-diligence topics: Google Ads account control (sub1), conversion tracking versus clicks (sub2), approval of budget changes (sub3).
- No-guarantee stance: no ROI/CPA/ROAS figure, case study, benchmark, free term, response SLA, price, or results claim anywhere below. Every question applies to ANY provider; nothing implies WAO currently supplies client-owned accounts, MCC management, measurement, pre-change approvals, or a defined service package.

## 1. Disposition summary (slot fully disposed)

| Seam (`page.tsx`) | Content | Disposition | Why |
|---|---|---|---|
| STATS data `:122-126` (three objects `n`/`l`/`sub` at `:123`, `:124`, `:125`) | Numeric ROI/CPA/ROAS proof + provenance subs (matrix family F; figures cited by line only, never retyped) | REPLACE — every one of the nine object fields gets a byte-exact non-numeric buyer-question cell (§2) | Contract req. 2: coherent three-question buyer-diligence replacement from the accepted Rev 3 angles. No provenance file exists for the figures, so no numeric tile may remain; replacement displaces them rather than validating or re-asserting them |
| Eyebrow `:228` | Old "reported past data" disclaimer tied to the numbers (cited by line) | REPLACE — byte-exact cell in §2 | The disclaimer framing is meaningless without numbers, and the contract forbids a generic-disclaimer slot; the new eyebrow frames the block as questions to ask any provider |
| Render block `:225-239` | Grid + tile JSX (`key={s.n}` `:231`, big gradient number font `:232`, `l` `:233`, `sub` `:234`) | NO COPY CHANGE — render-shape guidance only (§4); no JSX edited here | Oversized multi-word Hebrew questions must not inherit the numeric font treatment at `:232`; the style decision belongs to the later engineer application contract + visual gate |

Whole-block REMOVE-GATE was considered and NOT chosen: the contract directs a coherent three-question replacement, and every field is retained with a populated non-numeric cell — so no numeric tile survives and no empty decorative tile arises (all nine fields + eyebrow carry copy; the `{s.sub}` div at `:234` is never left undefined). No field in this slot is REMOVE-GATED. The optional footnote formerly considered here is OMITTED (§3, Contract 2026-10-06_027): independent review (t_18d851cb) found it duplicated the FAQ5/demo and steps-footnote offer surface, so this slot carries no additive node at all and is fully disposed by the ten required cells alone — remaining fully claim-safe without any footnote.

## 2. Keyed byte-exact cells (STATS objects + eyebrow)

Shape preserved: `const STATS = [` `:122` and `];` `:126` untouched; three objects retained; only the string values inside `:123-125` are replaced, field by field. Object key order `{ n, l, sub }` unchanged. `key={s.n}` at `:231` stays valid — the three proposed `n` strings are unique.

### KEY proofSlot.stat1.n — replaces the `n` value at `page.tsx:123`
> של מי החשבון?

Provenance: preserves the Rev 3 tile-1 headline angle (trust-flow draft `:92`, cited by line). 3 words — shortest render-safe form for the large-font slot.

### KEY proofSlot.stat1.l — replaces the `l` value at `page.tsx:123`
> כדאי לוודא שהחשבון ופרופיל התשלומים רשומים על שמך.

Claims (English): buyer-diligence instruction applicable to ANY provider — verify registration of the ads account and payment profile. Deliberately distinct wording from the Rev 3 sub (cited: trust-flow draft `:93`) and from `uncertain.steps.row3` title (cited: uncertain-sections draft `:44`) so the same sentence does not appear twice on a fully applied page — "רשומים על שמך" (registered in your name) is a different diligence test than "stays yours", not a restatement. No assertion that WAO delivers client-owned accounts or MCC management today (matrix A untouched; no present-practice implication). No categorical claim about provider behavior, no ownership-consequence assertion. 8 words, singular male ("שמך").

### KEY proofSlot.stat1.sub — replaces the `sub` value at `page.tsx:123`
> שליטה בחשבון Google Ads

Claims (English): topic label carrying the contract entity target "Google Ads account control". Replaces the old provenance line (cited `:123`, not retyped). Reads as the tile's topic under a question headline — not a WAO service label; the block eyebrow ("every provider") frames it. Latin-token pattern matches existing page usage (e.g. INCLUDED tile1 title, `:114`, cited by line). 4 words.

### KEY proofSlot.stat2.n — replaces the `n` value at `page.tsx:124`
> מה באמת מודדים?

Provenance: preserves the Rev 3 tile-2 headline angle (trust-flow draft `:95`). 3 words.

### KEY proofSlot.stat2.l — replaces the `l` value at `page.tsx:124`
> כדאי לברר כמה פניות אמיתיות הגיעו מהקליקים ששילמת עליהם.

Claims (English): conversion-tracking-versus-clicks framed strictly as a question to ask any provider — how many real inquiries the paid clicks actually produced. Direct persona hook (paid for clicks without knowing which inquiries resulted). Deliberately distinct from the Rev 3 sub (cited: trust-flow draft `:96`) and from `uncertain.steps.row1` (cited: uncertain-sections draft `:30-31`) — the Rev 3 punch line about clicks not being a business result is left to the steps section to avoid verbatim double appearance on the applied page. No measurement-capacity claim for WAO, no GA4/GTM delivery, no lead count, no results promise (matrix E untouched). 9 words, singular male ("שילמת").

### KEY proofSlot.stat2.sub — replaces the `sub` value at `page.tsx:124`
> מדידת המרות מול קליקים

Claims (English): topic label carrying the contract entity target "conversion tracking versus clicks". Replaces the old provenance line (cited `:124`, not retyped). 4 words.

### KEY proofSlot.stat3.n — replaces the `n` value at `page.tsx:125`
> מי מאשר שינויים?

Provenance: preserves the Rev 3 tile-3 headline angle (trust-flow draft `:98`). 3 words.

### KEY proofSlot.stat3.l — replaces the `l` value at `page.tsx:125`
> כדאי לסכם מראש מה קורה לפני כל שינוי בתקציב או בקמפיין.

Provenance + claims (English): preserves the Rev 3 sub wording (starting material, trust-flow draft `:99`), which passed bounded independent review; wording is already distinct from `uncertain.steps.row4` (cited: uncertain-sections draft `:51-52`), so preservation is safe and preferred per contract Do-rule. Budget-change approval appears ONLY as something the buyer should agree in advance with ANY provider — no WAO approval workflow, no policy-as-present-practice (matrix B untouched; the internal `googleAds.approval.policy` note remains the only home for that topic). 11 words.

### KEY proofSlot.stat3.sub — replaces the `sub` value at `page.tsx:125`
> אישור שינויים בתקציב

Claims (English): topic label carrying the contract entity target "approval of budget changes". Replaces the old benchmark-provenance line (cited `:125`, not retyped). 4 words.

### KEY proofSlot.eyebrow — replaces the text content of the eyebrow div at `page.tsx:228` (div style/class attributes unchanged)
> השאלות שכדאי לשאול כל ספק לפני שמשלמים על קמפיין

Claims (English): deviation from the Rev 3 eyebrow (cited: trust-flow draft `:90`) is deliberate and documented — "נותנים אמון" reads slightly translated, and the contract req. 3 any-provider property is made explicit here once ("כל ספק"), so no tile has to repeat it. Persona framing ("before you pay for a campaign") replaces the old numeric-disclaimer eyebrow (cited `:228`, not retyped). Asserts nothing about WAO; no free term, no price, no results. Distinct from the steps eyebrow and heading (cited: uncertain-sections draft `:66`, `:78`). 9 words.

## 3. KEY proofSlot.footnote — NOT PROPOSED / OMIT (withdrawn by Contract 2026-10-06_027)

Independent review (t_18d851cb, under contract 026 req. 2 "judge the optional cell separately") FAILed the optional footnote formerly proposed here: its sentence reused the exact demo-label noun phrase from the FAQ5/demo draft (`:37`, cited by line) and repeated the inquiry-plus-viewable-demo offer already proposed in the steps footnote (uncertain-sections draft `:82-86`), contradicting this draft's own distinctness requirement.

Disposition: OMIT — no footnote of any kind is proposed for this slot, and no replacement Hebrew is introduced (contract 027 req. 2). The low-pressure inquiry/viewable-demo offer already lives in its passed-review loci — the FAQ5/demo draft and `uncertain.steps.footnote` — and duplicating it here would add no reader value and fail distinctness; this slot remains buyer-diligence-only.

Application consequence (binding on any later engineer contract): the formerly described additive seam — a new `<p>` between the grid close (`:237`) and the section container close (`:238`) — is WITHDRAWN and must not be added from any section of this draft. Application for this slot is string-level replacement of the ten keyed cells ONLY (§2, §5); zero additive nodes. The slot is fully claim-safe without a footnote.

## 4. Render-shape guidance (English only, for the later waoengineer application contract — NO JSX edited by this draft)

1. Large-font slot `:232`: the `n` div currently carries numeric typography — `fontSize: clamp(2.4rem,4vw,3.2rem)`, `fontWeight: 900`, `lineHeight: 1`, gradient background-clip with transparent text fill. The proposed `n` cells are multi-word Hebrew questions and must NOT inherit that numeric sizing. Recommended shape (final call belongs to the application contract + visual gate): reduce `fontSize` to roughly `clamp(1.25rem,2.2vw,1.6rem)` and raise `lineHeight` to ~1.3 so RTL questions wrap cleanly inside the 220px-min tiles. The gradient text-clip itself is technically safe for Hebrew text; keeping or dropping it is a design decision, not a claim-safety one. These are style-attribute changes only — no structural JSX change.
2. `key={s.n}` at `:231`: proposed `n` values are three unique strings; React key uniqueness holds with no code change.
3. `l` slot `:233` (0.95rem, weight 600): proposed cells are 8-11 words and wrap to 2-3 lines; no shape change needed.
4. `sub` slot `:234` (0.78rem muted): topic labels replace provenance lines; no shape change. All nine object fields are populated, so `{s.sub}` never renders undefined — no empty decorative tile exists after application, and no numeric or figure string survives anywhere in the section.
5. Grid `:229` (`repeat(auto-fit, minmax(220px, 1fr))`) and section `:226`: unchanged; three objects retained, so the three-tile visual rhythm survives without any number in it.
6. Eyebrow `:228`: text-content replacement only; `justifyContent: center` and margin unchanged.
7. Footnote (§3): NOT PROPOSED / OMIT — no additive node exists for this slot. Application is string-level replacement of the ten cells only; nothing is inserted between the grid close (`:237`) and the section container close (`:238`), and the slot remains fully claim-safe without a footnote.
8. RTL/BiDi: all strings begin with Hebrew; the embedded Latin token ("Google Ads" in stat1.sub) follows the page's existing inline-Latin pattern (precedents cited: `:114`, `:208`); no RLM characters needed. Centered alignment renders the question marks correctly; typography/RTL confirmation remains a visual-gate item after application.

## 5. Key-to-source mapping

| Key | Seam (`src/app/(app)/google-ads/page.tsx`) | Field | Disposition |
|---|---|---|---|
| proofSlot.stat1.n | `:123` | `n` | REPLACE (byte-exact cell §2) |
| proofSlot.stat1.l | `:123` | `l` | REPLACE (byte-exact cell §2) |
| proofSlot.stat1.sub | `:123` | `sub` | REPLACE (byte-exact cell §2) |
| proofSlot.stat2.n | `:124` | `n` | REPLACE (byte-exact cell §2) |
| proofSlot.stat2.l | `:124` | `l` | REPLACE (byte-exact cell §2) |
| proofSlot.stat2.sub | `:124` | `sub` | REPLACE (byte-exact cell §2) |
| proofSlot.stat3.n | `:125` | `n` | REPLACE (byte-exact cell §2) |
| proofSlot.stat3.l | `:125` | `l` | REPLACE (byte-exact cell §2) |
| proofSlot.stat3.sub | `:125` | `sub` | REPLACE (byte-exact cell §2) |
| proofSlot.eyebrow | `:228` | div text content | REPLACE (byte-exact cell §2) |
| proofSlot.footnote | none — no additive node; formerly described `<p>` seam withdrawn | n/a | NOT PROPOSED / OMIT (§3, Contract 027) — must not be applied from any section of this draft |
| proofSlot.render | `:225-239` (esp. `:231-232`) | styles/JSX | NO COPY — shape guidance §4 only; applied later by engineer |

Every numeric-proof seam is disposed: the three figure strings and their two provenance/benchmark subs (all cited `:123-125` by line, never retyped) are fully displaced by the cells above; the eyebrow that framed them as "reported past data" is replaced. Matrix family F (numeric provenance) is displaced by replacement for this slot, not validated — if the owner ever supplies provenance files, that is a separate decision on a separate card; nothing here re-opens it. No schema/structured-data seam references STATS or the eyebrow (schemas `:26-78` are owned by the Rev 4 anchors draft keys), so no schema sync is triggered by this slot.

## 6. Claim-safety table (English, contract req. 4)

| Key | WAO present-practice implication | Figures/results/benchmarks | Price/commercial terms | Ownership/MCC assertion | Approval-workflow assertion | Measurement-capacity assertion | Free/SLA/availability | Any-provider property |
|---|---|---|---|---|---|---|---|---|
| proofSlot.stat1.n/.l/.sub | none | none | none | diligence question only | none | none | none | applies to every provider |
| proofSlot.stat2.n/.l/.sub | none | none | none | none | none | question + topic label only | none | applies to every provider |
| proofSlot.stat3.n/.l/.sub | none | none | none | none | agree-in-advance buyer advice only | none | none | applies to every provider |
| proofSlot.eyebrow | none | none | none | none | none | none | none | explicit "every provider" frame |
| proofSlot.footnote | n/a — NOT PROPOSED / OMIT (§3); withdrawn proposal removed, no proposed string exists | none | none | none | none | none | none | n/a |
| proofSlot.render (guidance) | n/a — typography only | guarantees no figure survives in the slot | n/a | n/a | n/a | n/a | n/a | n/a |

Prohibited-claim scan (all proposed strings): no ROI/CPA/ROAS or any numeral; no case study, benchmark, or provenance claim; no price, invoicing, or media-payment mechanic; no no-contract/termination term; no ownership/MCC/payment-profile present practice; no approval-workflow practice claim; no GA4/GTM or audit capacity; no results, lead-count, deadline, response-SLA, or availability promise; no free-consultation term; no inquiry or demo offer at all (the optional footnote that carried them is OMITTED per §3); no universal characterization of the market or of provider behavior; no generic-disclaimer filler — every line is concrete buyer diligence. No duplication of Rev 4 protected anchors, FAQ5 answer, demo CTA label, steps rows, or the steps footnote: the one cell that failed the distinctness review (the optional footnote) is withdrawn (§3), and every remaining proposed string is verified distinct cell-by-cell against each cited locus. No extension of the single supported onboarding fact; after the OMIT, this draft references no demo and proposes no offer.

## 7. Preservation and scope (what this draft does NOT touch)

- One file only: `docs/copy/google-ads-proof-slot-draft-2026-10-06.md` (created under contract 025; corrected in place under Contract 2026-10-06_027 — see header). No source file, companion draft, copy bundle, schema, or handoff-status path was modified; all five pinned hashes re-verified unchanged before and after the correction.
- The Rev 3 packet is complemented, not edited or superseded: its `googleAds.stats.evidenceFlag` FLAG (trust-flow draft `:79-83`) and family-F block stand; this draft supplies the source-applicable shape the packet deliberately lacked (complete `n`/`l`/`sub` disposition + typography-safe render guidance).
- Rev 4 protected anchors, the uncertain-sections dispositions, and the FAQ5/demo cells remain governed solely by their own pinned drafts; nothing here duplicates or amends them. After the §3 OMIT, the inquiry/viewable-demo offer lives only in those drafts' loci; no offer locus remains in this draft.
- Full-page coherence flag for the reconciliation gate (English): on a fully applied page this block (three short questions + topic labels) sits above the steps section (five detailed questions, uncertain-sections draft §2). The thematic overlap is by design — the Rev 3 angles this contract directs are a subset of the steps topics — but the two blocks must be reviewed together: eyebrows/headings must not read as one repeated promise, and the gate may choose to differentiate framing further or fold one block into the other. This draft flags the interaction; it does not resolve it, and it is not a defect in either draft.

## 8. Open gates (none passed by this draft)

1. Independent read-only proof-slot draft review (waoverifier; waostrategy dispatches): the first full-draft review ran as t_18d851cb — substantive PASS on the ten required cells, FAIL on the optional footnote. Per Contract 027 escalation routing, the pending review is a read-only delta re-review of this corrected draft against the pinned pre-correction snapshot, confirming the §3 OMIT and byte-identity of the ten required cells and render guidance.
2. SEO review: eyebrow + topic-label entity surface replacing the numeric-proof strings; net keyword change for the slot; adjacency with the steps heading/eyebrow per the §7 coherence flag.
3. Eitan founder Hebrew spot-check (human voice gate; grammatical correctness is not voice approval). The separate Hebrew-QA card was waived for this mission; founder and SEO review were NOT waived.
4. Full-page A/D/F reconciliation across Rev 3 packet + Rev 4 anchors + uncertain-sections + FAQ5/demo + this draft, including the §7 two-question-blocks interaction, before ANY coherent application.
5. Separate waoengineer byte-exact application contract (coder types zero Hebrew; includes the `:232` typography adjustment per §4), then runtime/RTL/visual verification (large-font Hebrew questions and centered eyebrow are explicit visual-gate items).
6. Owner publication/deployment decision. No partial application authority; release_health=false.

## 9. Self-check (waocopy, pre-completion)

- Register: singular male where addressed ("שמך", "שילמת עליהם"); impersonal "כדאי" elsewhere, matching page style; native Sabra phrasing; parallel "כדאי לוודא / כדאי לברר / כדאי לסכם" rhythm across tiles; all sentences 3-11 words (within the 12-15 ceiling); no translated-from-English constructions.
- Typography: no ASCII quotes/apostrophes inside Hebrew strings; no double spaces; em-dash avoided in proposed cells; Latin tokens follow existing inline patterns (precedents cited `:114`, `:208`); question marks are plain "?" as in source FAQs.
- Numbers: zero numerals in every proposed cell — the count of tiles is expressed by the retained three-object array, never by a digit in copy.
- Scope: exactly one existing file edited (this draft; no new file); five reference pins re-hashed unchanged before and after the correction, and the pre-correction bytes matched the pinned snapshot before edit; inert checks repeated (`git diff --check`, staged empty, `data/clients/` clean); no JSX, packet, bundle, schema, or handoff-status file touched; no successor dispatched; no handoff file moved.
