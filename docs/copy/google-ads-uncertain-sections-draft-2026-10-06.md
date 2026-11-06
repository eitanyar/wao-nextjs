# Google Ads Main Page — Uncertain Sections Dispositions: STEPS & INCLUDED (DRAFT-ONLY)

- Draft: `docs/copy/google-ads-uncertain-sections-draft-2026-10-06.md` (NEW; draft only, unapplied)
- Contract: `handoff/pending/2026-10-06_019_waocopy_draft-ads-uncertain-sections.md` (Contract v3, kanban t_c73f2eb3), SHA-256 `cfa6bfef6a1cb5cca58e8926d1bf672dd54ac17fb07740dcf61ccba72cb1f177` (verified at preflight)
- Sole parent: kanban t_a94ef395 — formal DONE, independent substantive PASS bounded to the Rev 4 FAQ1 draft delta ONLY. That PASS does not approve the whole page and is not relied on beyond that scope here.
- Companion Rev 3 packet (NOT modified, NOT superseded): `docs/copy/google-ads-trust-flow-draft-2026-10-05.md`, SHA-256 `83999415771fa4b65f78eaf84697f33e08cdc475840a5462b2eecc252dfe5d1e` (re-verified at preflight). Its keys `googleAds.steps` (:127-131) and `googleAds.included` (:135-139) withdrew replacements pending operational evidence; this draft supplies the concrete source-keyed dispositions the later coherent page decision needs. It complements, and does not supersede, that packet.
- Accepted Rev 4 protected-anchors draft (NOT modified, NOT duplicated): `docs/copy/google-ads-protected-anchors-draft-2026-10-06.md`, SHA-256 `89ec7a0392de62aa5588d43be08c06868866a34e6d769895e1e29e16fcd78058` (re-verified at preflight). Referenced by key only (`anchors.*`, §5 synced FAQ answers). This draft duplicates NO protected title/badge/H1/FAQ answer and touches NO anchor seam.
- Target page (NOT modified): `src/app/(app)/google-ads/page.tsx`, SHA-256 `2ac114c9f289ab36a9ead483a4fdaf9882ea89c9d2839036bb14efd887e418af` (re-verified at preflight; 356 lines).
- Hebrew safety: every Hebrew string below is ORIGINAL waocopy authoring. Existing page Hebrew is referenced ONLY by `file:line` + English description, never reproduced. A future engineer applies byte-exact authored cells; the coder never types Hebrew.
- Status: DRAFT ONLY. No source, packet, bundle, schema or handoff status file touched. This document does NOT authorize application, partial or full, and does NOT establish public truth. release_health=false.
- Persona: skeptical, busy Israeli small-business owner (singular male, native Sabra register) who already paid for clicks without knowing which inquiries arrived.
- Offer angle (Contract 019 req. 4): optional low-pressure inquiry and viewable Ads Bot demo. Only supported operational fact: `src/app/(app)/google-ads/onboarding/page.tsx:557` — online signup/payment currently unavailable, no charge occurs, demo viewable. Not extended anywhere in this draft (no free/no-live-budget/paid-availability inference).
- Entity/keyword treatment: Google Ads management for small businesses (head term preserved in the proposed steps H2); Search / Performance Max / YouTube as topics to ask about, never WAO inclusions; conversion tracking / GA4 / GTM as questions and topic chips, never delivered capacity; account ownership, scope boundaries and change approval as buyer questions to ANY provider.
- No-guarantee stance, pain hook and direct-response voice preserved. No promise of service availability, price, time, results or free consultation anywhere below.

## 1. Disposition summary (both sections fully disposed)

| Section | Seam (`page.tsx`) | Disposition | Why |
|---|---|---|---|
| STEPS (methodology) | data :80-111, rendered :241-276, headings :245-249 | REPLACE — buyer-education reframe: five questions to ask ANY provider; every row and heading keyed in §2 | Contract 019 req. 2 permits questions/decision criteria applicable to any provider; a coherent buyer-diligence block keeps the page's SEO head term and the existing JSX shape |
| INCLUDED (tiles) | data :113-120, rendered :278-298, headings :282-286 | REMOVE-GATED — whole section, headings included; no replacement copy | Contract 019 req. 3: six icon tiles under a "what we actually do" heading read as a WAO included-services list even with question-form text; Fraud Blocker packaging question (companion matrix C) still open — remove-gate, not euphemism |

## 2. KEY: uncertain.steps — REPLACE (buyer-education reframe)

Existing claim classes being displaced (English; strings cited by line only): a five-step WAO methodology implied by numbered rows and headings (companion matrix C/E) — step 01 pre-service account/conversion audit (:83-84), step 02 WAO channel selection across Search/PMax/YouTube (:89-90), step 03 WAO data-driven bidding decisions (:95-96), step 04 WAO ad-copy testing capacity (:101-102), step 05 WAO GA4/GTM connection before spend (:107-108); tags asserting audit/CPA/ROAS practice (:85, :97, :103, :109); eyebrow claiming WAO's approach to "your account" (:245); H2 claiming "five steps" methodology (:246-249).

Replacement frame: the section becomes five due-diligence QUESTIONS the reader should ask ANY Google Ads provider before committing. Numbers 01-05 remain as question numbering (consistent with "five questions" in the H2). No sequence, timeline, launch order, approval workflow, audit offer or delivered capacity is asserted for WAO anywhere.

### KEY uncertain.steps.row1 — replaces `page.tsx:83` (title), `:84` (desc), `:85` (tags); `n` "01" at :82 unchanged
> title: שאל איך מודדים פניות אמיתיות, לא רק קליקים
> desc: קליקים הם לא תוצאה עסקית. כדאי לשאול כל נותן שירות איך הוא עוקב אחרי פניות. ואיך תראה את הנתונים האלה לצד ההוצאה שלך.
> tags: ["Conversion Tracking", "GA4", "Google Tag Manager", "Attribution"]

Claims (English): measurement appears as a question to any provider + topic chips; displaces the source's WAO audit/measurement practice claim (matrix E). Pain hook persona-adjacent ("clicks are not a business result"). GA4/GTM are tools to ask about, not delivered capacity.

### KEY uncertain.steps.row2 — replaces `page.tsx:89` (title), `:90` (desc), `:91` (tags); `n` "02" at :88 unchanged
> title: בדוק איזה סוג קמפיין באמת מתאים לעסק שלך
> desc: Search, Performance Max ו-YouTube Ads הם כלים שונים. כדאי לשאול למה דווקא הסוג הזה מתאים לעסק. ומה במטרה ובתקציב שלך מצדיק את הבחירה.
> tags: ["Search Campaigns", "Performance Max", "YouTube Ads", "Demand Gen"]

Claims (English): Search/PMax/YouTube appear strictly as topics to ask about (keyword-target treatment), displacing the source's WAO channel-selection service claim (matrix C). No fit promise, no channel recommendation.

### KEY uncertain.steps.row3 — replaces `page.tsx:95` (title), `:96` (desc), `:97` (tags); `n` "03" at :94 unchanged
> title: ודא שחשבון הפרסום ופרופיל התשלומים נשארים שלך
> desc: זו אחת השאלות החשובות לפני כל התקשרות. כדאי לשאול מי רואה את נתוני ההוצאה שלך, ואיך מייצאים אותם. ומה קורה כשרוצים לעבור לספק אחר.
> tags: ["Account Ownership", "Payment Profile", "MCC Access", "Exit Terms"]

Claims (English): ownership framed as a universal buyer question followed by due-diligence questions only — who has access to spend data, how the data is exported, and what happens when moving to another provider. No categorical consequence of ownership is asserted (corrects t_5762129f row3 FAIL); NOT an assertion that WAO delivers client-owned accounts or manages via MCC today (companion matrix A remains unverified; no present-practice implication). MCC appears only as an access-model topic any provider can be asked about.

### KEY uncertain.steps.row4 — replaces `page.tsx:101` (title), `:102` (desc), `:103` (tags); `n` "04" at :100 unchanged
> title: ברר מה כלול בניהול, ומה דורש את האישור שלך
> desc: כדאי לדעת בדיוק על מה אתה משלם. מי כותב את המודעות, ומי מטפל בדפי הנחיתה. ואיך מתקבלות החלטות על שינויים בתקציב.
> tags: ["Scope of Work", "Change Approval", "Ad Copy", "Landing Pages"]

Claims (English): scope boundaries and change approval appear ONLY as reader-directed questions to ask any provider — consistent with the internally GATED `googleAds.approval.policy` family (companion :171-173): no WAO approval workflow, no ad-writing/video/measurement capacity, no included/separate scope assertion (matrix B/C).

### KEY uncertain.steps.row5 — replaces `page.tsx:107` (title), `:108` (desc), `:109` (tags); `n` "05" at :106 unchanged
> title: בקש תשובות כנות על מחירים, דוחות וציפיות
> desc: כדאי לשאול מה הספק יכול להבטיח, ומה הוא לא יכול. מה עולה הניהול, ומה עולה תקציב המדיה בנפרד. ואיזה דוחות תקבל, ובאיזו תדירות.
> tags: ["Management Fee", "Media Budget", "Reporting", "Realistic Expectations"]

Claims (English): the no-guarantee stance appears ONLY as a buyer-directed question about what a provider can and cannot guarantee — no universal characterization of the market or of "serious providers" is asserted (corrects t_5762129f row5 FAIL), and no WAO promise, differentiator, lead-count, deadline or outcome claim. Price appears only as something the reader should clarify with any provider — no figure, no WAO pricing/invoicing/media-payment mechanic (matrix D untouched; deliberately distinct wording from the Rev 4 `anchors.faq1` synced answer, which is NOT duplicated). Reporting cadence framed as a question, per companion owner-note constraint (:246).

### KEY uncertain.steps.heading — replaces `page.tsx:245` (eyebrow text) and the H2 text lines `:247-248` (SEO-coordinated)
Eyebrow (replaces the text content of the `eyebrow` div at :245):
> לפני שבוחרים מנהל קמפיינים

H2 fragment mapping (line-for-line; `<h2>` wrapper and styles :246/:249 untouched; engineer applies byte-exact, never types Hebrew):

Line A (replaces :247):
```
              ניהול קמפיינים בגוגל —{" "}
```
Line B (replaces :248):
```
              <span className="text-gradient">חמש שאלות ששווה לשאול</span>
```
Rendered plain text (for SEO/QA review): ניהול קמפיינים בגוגל — חמש שאלות ששווה לשאול

Claims (English): removes the "five-step data-driven methodology" and "how we approach your account" practice claims of :245-249; preserves the head term "ניהול קמפיינים בגוגל" (keyword target 1) and the gradient-span structure. This H2 also preserves the head term lost by the INCLUDED remove-gate (§3 SEO consequence).

### KEY uncertain.steps.footnote — OPTIONAL (gated; not required for section claim-safety)
Seam: a new `<p>` placed between the steps-list container close (:274) and the section container close (:275), rendered with the existing `bodyStyle` — placement/shape is a later engineer + SEO decision.
> רוצה לברר את השאלות בשיחה? אפשר לדבר איתנו על העסק שלך, בלי לחץ. ואפשר גם לצפות בהדגמה של ה-Ads Bot.

Claims (English): low-pressure inquiry + viewable-demo offer angle only (Contract 019 req. 4). The demo sentence stays within the supported fact family (demo viewable); signup/payment unavailability itself remains stated on the onboarding page (:557) and is deliberately NOT extended here — same treatment as the companion packet's hero paragraph (:110-112). No consultation length/price/free term, no service-availability promise.

### JSX shape explanation (English only — NO JSX edited by this draft)
- STEPS data shape `{ n, title, desc, tags }` is UNCHANGED: five objects, `n` stays "01".."05" (now question numbers). All replacements are string-level at :83-85, :89-91, :95-97, :101-103, :107-109.
- Heading replacements are text-level at :245 and line-for-line at :247-248 (same `{" "}` + `text-gradient` span structure as source).
- Render loop :252-273, CSS classes `process-step`/`process-number` (globals.css :314-336) and all styles remain untouched — visual only. Class-name semantics (a "process" visual now numbering questions) are acceptable; renaming is an optional later engineer decision, NOT required for claim safety.
- Tags: chips render as question topics. If the reviewer or SEO gate judges that chips in this shape read as delivered capabilities, the fallback is an empty `tags` array per row (the map at :265-269 then renders nothing; JSX shape untouched) — recorded here as the explicit alternative so no one has to invent euphemistic chips.
- Footnote (optional key above) is the only additive shape change: one new `<p>` node; nothing else moves.
- No schema/structured-data seam references STEPS or INCLUDED (schemas live at :26-78 and are owned by the Rev 4 anchors draft keys) — no parity/sync obligation is created by this section.

## 3. KEY: uncertain.included — REMOVE-GATED (whole section; no replacement)

Seam: `INCLUDED` data :113-120, rendered section :278-298 (grid :288-296), section eyebrow :282 and H2 :283-286. Disposition: the ENTIRE section — data, render block and headings — must be REMOVED in any future application contract. No replacement copy is authored or permitted here.

Per-tile mapping (why no tile can be re-copied; existing Hebrew cited by line only):
- uncertain.included.tile1 (:114) — pre-service account audit claim + Fraud Blocker click-fraud protection packaging. Matrix C/E; the standing owner question (is Fraud Blocker included, an add-on, or a separate product? companion :61, :139) is STILL OPEN. No public string in this draft mentions Fraud Blocker as copy.
- uncertain.included.tile2 (:115) — Search/PMax management as a delivered WAO service. Matrix C/E.
- uncertain.included.tile3 (:116) — YouTube Ads consideration capacity. Matrix C (video capacity unproven).
- uncertain.included.tile4 (:117) — GA4/GTM connection as delivered measurement capacity. Matrix E.
- uncertain.included.tile5 (:118) — ad-writing/message-testing capacity. Matrix C.
- uncertain.included.tile6 (:119) — client-owned account as present WAO practice + self-visibility of spend. Matrix A (ownership/MCC unverified).
- uncertain.included.headings (:282, :283-286) — eyebrow claims "what we actually do"; H2 claims campaign management "in your account" (matrix A + C practice claims). Removed with the section.

Why REMOVE-GATE instead of educational cards (Contract 019 req. 3 instruction applied): six icon tiles in a bordered "why-cell" grid, positioned directly between methodology and FAQ, read as an included-services list whatever the text says — question-form text in that shape is exactly the euphemistic-copy risk the contract forbids. The buyer-education value is already carried by the STEPS replacement (§2 covers measurement, channel choice, ownership, scope/approval, pricing honesty), so removal costs the reader no due-diligence content. A coherent buyer decision beats filling the six-tile shape at all costs.

SEO consequence (for the SEO-coordination gate, English): removal drops one H2 and six tiles of keyword surface (audit, Search/PMax, YouTube, GA4/GTM, ad-copy terms). Mitigation already embedded in this draft: the head term "ניהול קמפיינים בגוגל" survives in the proposed steps H2 (uncertain.steps.heading), and the Search/Performance Max/YouTube/GA4/GTM/Conversion-Tracking entities survive as question topics and chips in §2. The SEO gate signs off on the net surface change explicitly; structured data references neither section, so no schema sync is triggered.

## 4. Claim matrix (English, Contract 019 req. 5)

| Key | Disposition | Ownership/MCC | Price/commercial terms | GA4/GTM capacity | Methodology/workflow | Fraud Blocker | Results/SLA/guarantee | Present-WAO-practice implication |
|---|---|---|---|---|---|---|---|---|
| uncertain.steps.row1 | REPLACE | none | none | question + topic chips only | none | none | none | none |
| uncertain.steps.row2 | REPLACE | none | none | none | none (channels = topics to ask about) | none | none | none |
| uncertain.steps.row3 | REPLACE | buyer question only; diligence questions on spend-data access, export and exit | none | none | none | none | none | none |
| uncertain.steps.row4 | REPLACE | none | none | none | approval/scope = buyer questions only | none | none | none |
| uncertain.steps.row5 | REPLACE | none | price-as-question only; no figure/mechanic | none | none | none | none — guarantees appear only as a buyer question ("what can/cannot be guaranteed"); no market characterization | none |
| uncertain.steps.heading | REPLACE | none | none | none | removes five-step claim | none | none | none |
| uncertain.steps.footnote (OPTIONAL) | REPLACE (additive) | none | none | none | none | none | none | inquiry + viewable-demo invitation only, within supported fact |
| uncertain.included.tile1 | REMOVE-GATED | — | — | — | — | claim removed; owner question stands | — | — |
| uncertain.included.tile2-6 | REMOVE-GATED | claim removed (tile6) | — | claim removed (tile4) | claims removed | — | — | — |
| uncertain.included.headings | REMOVE-GATED | claim removed | — | — | claim removed | — | — | — |

Prohibited-claim scan (all proposed strings): no five-step WAO methodology, sequence, timeline or launch order; no pre-service audit offer; no GA4/GTM setup or measurement capacity; no approval-workflow practice claim; no Search/PMax/YouTube delivery or selection service; no ad-writing/video capacity; no Fraud Blocker mention in copy; no client-owned-account present practice; no price figure, invoicing or media-payment mechanic; no no-contract/free-call/30-minute term; no results, ROI/CPA/ROAS, lead-count, response-SLA or availability promise; no categorical consequence of account ownership (row3 corrected); no universal characterization of the market or of provider guarantee behavior (row5 corrected); no duplication of Rev 4 protected title/badge/H1/FAQ answers (wording deliberately distinct); no extension of the single supported onboarding fact. Reader-directed questions and topic chips are the only treatment of sensitive topics.

## 5. Application gates (none passed by this draft)

1. Independent read-only structural review of THIS pinned draft (waoverifier; waostrategy dispatches with this completed card as sole parent).
2. SEO coordination for section headings: steps eyebrow/H2 replacement (head-term preservation) and the INCLUDED H2 removal net-surface change; also the tag-chip semantics call (topics vs capacity read) with its empty-array fallback.
3. Eitan founder Hebrew spot-check (human gate; grammatical correctness is not voice approval). The separate Hebrew-QA card was waived for this mission; SEO and founder review were NOT waived.
4. Still unresolved elsewhere and NOT resolved by this draft: companion matrix families A/D/F; visible FAQ row 5 (:146-147); CTA demo label "בלי תקציב חי" (:216) validation; full-page A-F reconciliation across Rev 3 packet + Rev 4 anchors draft + this draft before ANY coherent application.
5. Separate waoengineer application contract (byte-exact Hebrew authored cells; coder types zero Hebrew), then isolated runtime/RTL/visual verification (waouxtester post-application), then owner-controlled publication/deployment gate.

No partial application is authorized by this draft. release_health=false.

## 6. Self-check (waocopy, pre-completion)

- Register: singular male throughout ("שאל", "בדוק", "ודא", "ברר", "בקש", "תראה", "תקבל", "שלך", "אתה"); native Sabra phrasing; direct-response voice; sentences kept short (5-10 words each, within the 12-15 ceiling); no translated-from-English constructions.
- Typography: em-dash single-spaced in the H2 fragment; no ASCII quotes/apostrophes inside Hebrew strings; no double spaces; Latin tokens (Search, Performance Max, YouTube Ads, GA4, Google Tag Manager, MCC, Ads Bot) follow the page's existing inline-Latin pattern — no RLM needed (no title/metadata strings in this draft).
- Scope: exactly one new file created; the three pinned files re-hashed unchanged post-write; no JSX, packet, bundle, schema or handoff status directory touched; no successor dispatched.
- Both sections fully disposed: STEPS keyed row-by-row + headings (+ optional footnote) with any-provider questions; INCLUDED whole-section REMOVE-GATED with per-tile rationale. No unsupported WAO workflow or included-service claim survives any proposed content.
