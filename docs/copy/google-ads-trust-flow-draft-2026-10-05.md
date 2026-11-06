# Google Ads Main Page — Trust & Decision Flow Draft Packet (Rev 2 — corrected)

- Packet: `docs/copy/google-ads-trust-flow-draft-2026-10-05.md` (DRAFT-ONLY; unapplied)
- Rev 2 contract: `handoff/pending/2026-10-05_039_waocopy_correct-google-ads-trust-claims.md` (Contract 039, kanban t_f3b279f0), routing parent t_77fe5a06
- Rev 1 lineage: Contract 037 (kanban t_61b001b3, draft-only DONE); independently reviewed by Contract 038 (kanban t_fab9b72b, formal DONE / substantive FAIL, focused_acceptance=false). Rev 1 baseline packet SHA-256 `32bf5acab03f14a9bb04718714c47f9453bd619cba96c8e32d4ec2f593e05675` — verified before this correction.
- Target page: `src/app/(app)/google-ads/page.tsx` (local applied 2026-10-02 bundle; baseline SHA-256 `2ac114c9f289ab36a9ead483a4fdaf9882ea89c9d2839036bb14efd887e418af`; bundle `docs/copy/google-ads-page-copy-2026-10-02.json` SHA-256 `ff0c881bd934b20c91f47ae903407b4cf4c285ddfc31742ab5ae608abc32ab9f` — both re-verified before Rev 2, unchanged)
- Status: draft only. No source, onboarding, bundle, Site-Bot or production file touched. No JSX/patch script included. Application requires a separate engineer contract after ALL gates below pass, and remains blocked while any unresolved claim in the release-blocker matrix stands.
- Persona: busy Israeli small-business owner (singular male, native Sabra register), previously paid for clicks without knowing which inquiries mattered, wary of agency lock-in.
- Offer angle (per Contract 039): a low-pressure contact to DISCUSS whether Google Ads management may fit — not a guaranteed service package, not a description of present WAO practice.
- AdPilot usage: structural patterns only. No AdPilot wording, claims, pricing, Meta mechanics, deadlines or founder story reproduced.
- Only supported Ads Bot operational fact: `src/app/(app)/google-ads/onboarding/page.tsx:557` — online signup and payment are currently unavailable, no charge occurs, and the demo can be viewed. This fact is NOT extended anywhere in this packet to "no live budget", "free", paid availability, or any other operational claim.

## Rev 2 correction summary (Contract 038 keyed verdicts → dispositions)
| Key | Contract 038 verdict | Rev 2 disposition |
|---|---|---|
| googleAds.stats.evidenceFlag | FAIL (numeric proof; replacement ownership/approval assertions) | CORRECTED — numeric FLAG stands; Rev 1 replacement tiles withdrawn; Rev 2 proposes generic buyer-question tiles asserting no WAO practice |
| googleAds.hero.paragraph | FAIL (ownership/payment/MCC; measurement/service assertions) | CORRECTED — Rev 1 string withdrawn; conversation invitation + questions framing + supported demo fact only |
| googleAds.hero.cta.primary | conditional PASS (unguaranteed label only; existing free-30-min terms unproved) | CORRECTED — unguaranteed label is the ONLY proposed option; existing label mapped as unverified, not deployable on this packet's authority |
| googleAds.steps | FAIL (fit/audit, proposal, approval, GA4/GTM workflow unproved) | WITHDRAWN — no safe replacement; entire section (incl. existing headings) blocked pending ops evidence |
| googleAds.included | FAIL (management, video, ad-writing, measurement, account/access; Fraud Blocker unresolved) | WITHDRAWN — no safe replacement; existing tiles blocked; Fraud Blocker owner question stands |
| googleAds.scope.new | FAIL (commercial inclusions/add-ons/media payment/invoicing) | WITHDRAWN — no safe replacement |
| googleAds.fit.new | PARTIAL (no invented minimums safe; account/approval/service criteria unvalidated) | CORRECTED — service-condition criteria removed; generic self-fit questions only |
| googleAds.approval.policy | GATED (proposed only; not current practice) | GATED — all Rev 1 public strings presenting it withdrawn/softened; remains internal owner-only condition |
| googleAds.faqs | FAIL (existing price/no-contract unverified; added scope/approval/measurement unproved; Ads Bot only narrow support) | CORRECTED — Rev 1 row-5 replacement and rows 6-7 withdrawn; Rev 2 rows are generic/educational or supported-anchor only; existing rows mapped unverified |
| googleAds.metadata.faq | conditional structural PASS (congruence only, not truth/runtime) | PLANNING NOTE — structural congruence holds; truth of mirrored rows unvalidated (matrix A/D/E) |
| googleAds.cta.closing | PARTIAL (existing 30-minute/free; new account/measurement/approval assertions unproved) | CORRECTED — audit/measurement promises withdrawn; question-form conversation copy only |
| googleAds.seo.keywords | PASS as planning intent only | PLANNING NOTE — retained, mapping updated to Rev 2 keys |
| googleAds.ownerNotes.ideas | PASS (owner-only concepts, not public claims) | RETAINED unchanged |

## Pending gates (none passed by this packet)
1. Independent structural truth/claim review of THIS Rev 2 pinned draft (waoverifier; waostrategy dispatches).
2. Independent Hebrew QA — owner-authorized latest-Terra route only, exact model/provider verified at dispatch; no Qwen/Alibaba retry. Archived t_63c5952c is NOT acceptance and is not retried here.
3. Eitan founder/commercial spot-check — including EVERY unresolved family in the release-blocker matrix below (price, no-contract, 30-minute/free terms, numeric stats provenance, ownership/MCC, approval policy, scope incl. Fraud Blocker, GA4/GTM capacity).
4. SEO-anchor signoff if any protected anchor ever changes (this packet proposes none) — and note that several PROTECTED anchors carry unverified claims (matrix), which blocks application until evidence or separately signed-off truthful revision.
5. Separate waoengineer application contract + runtime/visual verification; deployment owner gate.
release_health=false until all of the above plus authorized application/deploy.

## Untouched SEO/RTL anchors (preserved as references — no changes proposed)
- `metadata.title.absolute` incl. RLM-anchored "‏ | WAO" suffix — `page.tsx:8-13`.
- Metadata description / OG title / OG description / canonical `https://www.wao.co.il/google-ads` — `page.tsx:14-24`.
- Structured-data `@id`s, WebPage/Service/BreadcrumbList schemas — `page.tsx:26-47,70-78`.
- Hero badge head terms — `page.tsx:189-192`; H1 head terms — `page.tsx:193-206`.
- Singular-male register throughout; natural Google Ads entity terms (Search, Performance Max, YouTube Ads, GA4, Google Tag Manager, MCC, Conversion Tracking, ROAS/CPA where already present).
- Existing `tel:` href, PhoneReveal source and sandbox/onboarding Link destinations — `page.tsx:210-220,336-346` — referenced as-is, no modification proposed.
- EXPLICIT APPLICATION BLOCK: several protected anchors above (title/description/OG at `:12-20`, badge `:191`, H1 `:203-205`, Service/Offer schema `:39-47`, schema FAQ `:57`) contain account-ownership, MCC, price and no-contract claims that are UNVALIDATED (matrix families A/D). This packet does not propose silent changes to them. Until Eitan supplies operational/commercial evidence, or separately signs off a truthful anchor/schema revision, ANY application of this packet is blocked. Schema congruence is never treated as commercial truth.

---

## Release-blocker matrix (English — every unresolved family; existing wording or the 2026-10-02 bundle alone NEVER counts as proof)

A. Account / payment-profile ownership / MCC access & removal
- Existing unverified claims: title `page.tsx:12`; description `:15`; OG title/description `:19-20`; WebPage schema name/description `:32-33`; Service schema name/description `:41-42`; schema FAQ 1 answer `:57`; visible FAQ row 1 answer `:131`; visible FAQ row 5 answer `:147` (incl. MCC); hero badge `:191`; H1 `:203-205`; hero paragraph `:208`; INCLUDED tile 6 `:119`.
- Needed from owner/ops: documented proof that live client accounts and payment profiles are client-owned, that WAO manages via MCC with client authorization, and the actual MCC removal/termination mechanics. Rev 1 proposed strings asserting these are withdrawn; Rev 2 proposes none.

B. Change-approval workflow (coordination/approval before material changes)
- No existing source claim on the page; Rev 1 proposed it at hero, stats tile 3, steps 03, scope block, FAQ row 6 and closing trust line — ALL withdrawn or softened in Rev 2.
- Needed from owner/ops: a committed, operationally real approval policy before ANY public mention. Until then it exists only as the internal note at googleAds.approval.policy.

C. Included vs separate scope (management, creative/video, landing pages, Fraud Blocker, ad copy)
- Existing unverified claims: INCLUDED tiles `:113-120` — account audit + Fraud Blocker `:114`, Search/PMax management `:115`, YouTube Ads `:116`, GA4/GTM measurement `:117`, ad-copy writing `:118`, data-driven decisions/ownership `:119`; section headings `:282-286`; STEPS methodology `:80-111` with headings `:245-249`; Service schema serviceType/name/description `:40-42`.
- Owner question standing since Rev 1: is Fraud Blocker included, an add-on, or a separate product? Needed: the actual commercial service sheet (what is delivered today, by whom, at what scope). Rev 1 scope/included proposals withdrawn; Rev 2 proposes none.

D. Commercial terms (₪1,500/month management price, no-long-contract, media spend separation/invoicing, 30-minute free consultation)
- Existing unverified claims: price in title `:12`, description `:15`, OG description `:20`, Service schema description `:42` and Offer `:46`, schema FAQ 1 `:57`, visible FAQ row 1 `:130-131`; no-long-contract in OG description `:20` and visible FAQ row 5 `:146-147`; 30-minute free call in hero CTA label `:211-213`, closing H2 `:329-332`, closing paragraph `:333-335`, trust line `:348`; sandbox demo label "בלי תקציב חי" `:215-217` (not covered by the supported onboarding fact).
- Needed from owner: verified live pricing/checkout or approved rate card, actual contract/termination terms, invoicing structure, and whether a free 30-minute consultation is a real standing offer. Rev 1 proposed strings restating or extending these are withdrawn; Rev 2 proposes none.

E. GA4/GTM measurement & audit/consultation capacity
- Existing unverified claims: STEPS `:84` (account/conversion audit), `:107-109` (GA4/GTM connection); INCLUDED `:114,117`; hero paragraph `:208`; visible FAQ row 4 `:142-143` + mirrored schema FAQ 2 `:62-65`; methodology headings `:245-249`; closing paragraph `:333-335` (promises a measurement review in the call).
- Needed from owner/ops: evidence WAO actually performs account audits, GA4/GTM setup and conversion measurement for managed clients today. Rev 1 proposed strings asserting these are withdrawn; Rev 2 keeps only generic question-form/definitional mentions.

F. Numeric ROI/CPA/ROAS provenance
- Existing unverified claims: STATS `:122-126` ("200–400% ROI", "60% CPA drop" subbed "נתונים פנימיים WAO 2025"; "8:1 ROAS" subbed "Google Ads Benchmarks 2025"), rendered `:225-239` with eyebrow `:228`.
- Needed: verifiable provenance files (client records with consent, or a citable timestamped benchmark methodology). Without them no numeric proof tile may remain; the Rev 2 alternative below is deliberately non-numeric and claims nothing about WAO.

Note on kept definitional FAQ rows: rows 2-3 (`:133-139`, paid vs organic; Performance Max definition) are generic definitional content kept as-is; they are still mapped here because they are existing source claims, but residual risk is low and they assert no WAO-specific practice beyond generic channel selection advice.

---

## KEY: googleAds.stats.evidenceFlag (existing slot; FLAG + Rev 2 safe alternative)
Seam: `page.tsx:122-126` (STATS data), rendered at `:225-239`; eyebrow at `:228`.
Type: EXISTING-SLOT. Contract 038 verdict: FAIL. Disposition: CORRECTED.

FLAG (English, evidence review — UNCHANGED and still standing): the three numeric tiles are historical/benchmark figures whose underlying records and benchmark methodology are NOT established by the source strings alone (matrix family F). No client result, testimonial, timestamped benchmark, ROI/CPA/ROAS figure may remain without a verifiable provenance file. Decision owner: Eitan (commercial) + reviewer of records.

Rev 1's non-numeric replacement tiles (account ownership, self-visibility of spend, coordination-before-changes) are WITHDRAWN: they asserted operational practice with no ops evidence (matrix A/B), and marketing statements do not establish operations.

Rev 2 proposed alternative for the SAME slot (three tiles, same grid/component shape) — generic buyer-education questions that assert NOTHING about WAO practice and stay safe regardless of ops evidence:

- Eyebrow (replaces `:228`):
  HE: השאלות שכדאי לשאול לפני שנותנים אמון
- Tile 1:
  HE headline: של מי החשבון?
  HE sub: כדאי לוודא שחשבון הפרסום ופרופיל התשלומים נשארים בבעלותך
- Tile 2:
  HE headline: מה באמת מודדים?
  HE sub: קליקים הם לא תוצאה עסקית. כדאי לברר איך עוקבים אחרי פניות אמיתיות
- Tile 3:
  HE headline: מי מאשר שינויים?
  HE sub: כדאי לסכם מראש מה קורה לפני כל שינוי בתקציב או בקמפיין

Note (English): tiles are addressed to the reader as questions to ask ANY provider — they are not descriptions of WAO's account structure, measurement or approval practice, and they create no dependency on matrix families A/B/E. Existing numeric tiles remain blocked pending provenance (family F).

---

## KEY: googleAds.hero.paragraph (existing slot)
Seam: `page.tsx:207-209`. Badge (`:189-192`) and H1 (`:193-206`) stay untouched (SEO anchors; both carry unverified claims per matrix A — application block stands).
Contract 038 verdict: FAIL. Disposition: CORRECTED — Rev 1 string (ownership/payment/MCC, "full coordination", approval-before-changes, GA4/GTM starting point, "no live budget and no charge" demo framing) is WITHDRAWN in full.

Rev 2 HE (replaces current paragraph; conversation invitation + question framing + supported demo fact only):
> כבר שילמת על קליקים בגוגל, ולא ברור לך אילו פניות באמת הגיעו? אתה לא לבד בזה. אפשר להתקשר ולדבר על העסק שלך ועל הפרסום בגוגל. בשיחה אפשר לברר איך עובד ניהול קמפיינים, איך עוקבים אחרי פניות, ומה מתאים לעסק שלך. זו רק שיחה — בלי לחץ. רוצה להתרשם מהטכנולוגיה? יש הדגמה של ה-Ads Bot שאפשר לצפות בה.

Claim-safety notes (English): no audit, consultation length/price, availability, response-time, fit-decision, managed-scope, channel-selection, ownership, MCC, approval, GA4/GTM-setup, invoicing or outcome promise. Topics appear only as things the conversation can clarify ("אפשר לברר"), per Contract 039 req. 2. The demo sentence states only the supported fact (demo viewing per `onboarding/page.tsx:557`); signup/payment unavailability itself is stated on the onboarding page and is not extended here.

## KEY: googleAds.hero.cta.primary (existing slot, FLAG)
Seam: `page.tsx:211-214` (tel CTA button). Href preserved as reference; only the label is proposed to change.
Contract 038 verdict: conditional PASS for the unguaranteed label only. Disposition: CORRECTED — the unguaranteed label is now the ONLY proposed option.

FLAG (English): current label promises a free 30-minute consultation (`:212`). Those terms are unproven (matrix D) and are NOT deployable on this packet's authority; keeping them requires Eitan's commercial validation first. No "validate-and-keep" option is marked usable here.

HE (the single proposed label):
> דבר איתנו על החשבון שלך

Secondary CTAs (`:215-220`, sandbox demo + Ads Bot links): existing source, KEEP as reference. FLAG: the demo label "בלי תקציב חי" at `:216` is an existing claim NOT covered by the supported onboarding fact (matrix D); owner validation or truthful revision required before application. Reality anchor: online registration/payment unavailable per `src/app/(app)/google-ads/onboarding/page.tsx:557`; the Ads Bot sandbox is a separate demonstration, never a paid signup path.

---

## KEY: googleAds.steps (existing slot)
Seam: `page.tsx:80-111` (STEPS data), rendered at `:241-276`; section eyebrow/H2 at `:245-249`.
Contract 038 verdict: FAIL. Disposition: WITHDRAWN — NO SAFE REPLACEMENT.

Reason (English): Rev 1's five-step route (fit + account/tracking review → proposal → approval before material changes → GA4/GTM measurement → measured review) described an operational workflow with no ops evidence (matrix B/C/D/E). A withdrawn block stays keyed with a reason rather than forced replacement text. The EXISTING steps content and headings (`:80-111,245-249`) are themselves unverified page claims (audit capacity, measurement workflow, methodology headings — matrix C/E) and block application of this section until Eitan supplies operational evidence or separately signs off a truthful revision. If owner evidence later defines the real workflow, a follow-up draft may encode it; nothing in this packet may be read as that workflow.

---

## KEY: googleAds.included (existing slot)
Seam: `page.tsx:113-120` (INCLUDED data), rendered at `:278-298`; section eyebrow/H2 at `:282-286`.
Contract 038 verdict: FAIL. Disposition: WITHDRAWN — NO SAFE REPLACEMENT.

Reason (English): every Rev 1 tile asserted delivered scope (audit, Search/PMax management, YouTube consideration, GA4/GTM connection, ad writing, account ownership/transparency) with no commercial or ops evidence (matrix A/C/E). The EXISTING tiles (`:113-120`) are equally unverified and block application of this section. Standing owner question from Rev 1, still open: is Fraud Blocker (`:114`) included in the base service, an add-on, or a separate product? No public string in this packet mentions Fraud Blocker.

---

## KEY: googleAds.scope.new (NEW BLOCK proposal)
Seam: was proposed between INCLUDED (`page.tsx:278-298`) and FAQ (`:300-320`).
Contract 038 verdict: FAIL. Disposition: WITHDRAWN — block abandoned, no replacement.

Reason (English): the included/separate columns asserted commercial scope, add-on pricing structure, media-payment mechanics and invoicing terms ("בלי הפתעות בחשבונית") with no evidence (matrix C/D). A public included/not-included list may only be drafted from Eitan's actual commercial service sheet.

---

## KEY: googleAds.fit.new (NEW BLOCK proposal — requires later engineering)
Seam: proposed new section after STATS (`page.tsx:225-239`) or before closing CTA (`:322-353`); placement is an engineering/SEO decision. Content only.
Contract 038 verdict: PARTIAL (avoiding invented minimums safe; account/approval/service criteria unvalidated). Disposition: CORRECTED.

Rev 1 criteria that referenced unvalidated service conditions ("החשבון יישאר בבעלותך", "אישור לפני כל שינוי מהותי", "תקציב מדיה נפרד") are removed. Rev 2 keeps only generic self-fit questions that promise nothing about WAO's terms:

- HE section eyebrow: בדיקת התאמה
- HE section title: למי זה מתאים — ולמי לא
- Fits column:
  HE heading: שווה לנהל את השיחה אם
  HE items: אתה כבר משקיע בפרסום בגוגל, או שוקל להתחיל · חשוב לך לדעת לאן כל שקל של תקציב הולך · מעניין אותך איך אפשר לעקוב אחרי פניות אמיתיות · יש לך עסק פעיל, ואתה רוצה לקבל החלטות לפי נתונים
- Not-fits column:
  HE heading: זה פחות מתאים לך אם
  HE items: אתה מחפש מישהו שיבטיח לך תוצאות, תאריך או מספר פניות · אין לך כרגע תקציב לפרסום עצמו · פרסום בגוגל בכלל לא רלוונטי לעסק שלך
- HE footnote: השאלות כאן הן הכוונה כללית, לא בדיקת התאמה מקצועית. שיחה ישירה על העסק שלך יכולה לעזור לך לבדוק את ההתאמה.

Constraints honored: no invented minimum budgets, deadlines, lead counts, platform eligibility rules, vertical exclusions, ownership/approval/media-payment conditions, and no promised fit-decision deliverable (the footnote explicitly frames the checklist as general guidance, and the direct conversation as a way for the reader to explore suitability — no categorical claim that real fit is checked only in a call, and no WAO fit-decision process implied).

---

## KEY: googleAds.approval.policy (internal owner-only condition note, English — GATED)
Contract 038 verdict: GATED (proposed only; not current practice). Disposition: GATED, strengthened.
The approval-before-material-changes concept appeared in Rev 1 at hero, stats tile 3, steps 03, scope block, FAQ row 6 and the closing trust line. In Rev 2 every such public assertion is withdrawn or softened; the concept survives publicly ONLY as the generic reader-directed question in stats tile 3 ("כדאי לסכם מראש…"), which promises nothing about WAO. Internally: this remains a PROPOSED service policy requiring operational validation (owner + ops) before ANY future public mention. It must never be presented as an already-proven automation, a guaranteed service level, or a technical enforcement. If ops cannot commit, it must not return to public copy at all.

---

## KEY: googleAds.faqs (existing slot + additions)
Seam: `page.tsx:128-149` (FAQS data), rendered at `:300-320`. Section eyebrow/H2 (`:303-307`) KEEP.
Contract 038 verdict: FAIL. Disposition: CORRECTED.

Existing rows (KEEP UNCHANGED as source references; all mapped unverified in the matrix):
- FAQ row 1 (price / who pays Google): `:130-131`. UNVERIFIED: ₪1,500/month price, media-spend separation, ownership + MCC (matrix A/D). Owner commercial validation required before application.
- FAQ row 2 (paid vs organic): `:134-135`. Generic definitional content; low residual risk; kept as-is.
- FAQ row 3 (Performance Max fit): `:138-139`. Generic definitional content; low residual risk; kept as-is.
- FAQ row 4 (real inquiries): `:142-143`. UNVERIFIED in part: the no-guarantee sentence is safe, but "מחברים GA4 ו-Google Tag Manager" asserts measurement practice (matrix E); mirrored in schema FAQ 2 (`:62-65`).
- FAQ row 5 (long-term commitment): `:146-147`. UNVERIFIED: no-long-contract, ownership, MCC (matrix A/D). Rev 1's proposed replacement answer (adding MCC-removal mechanics) is WITHDRAWN — removal mechanics have no ops evidence.

Rev 1 new rows 6 (approval policy FAQ) and 7 (scope/inclusions FAQ) are WITHDRAWN — they asserted a gated policy and unproven commercial scope (matrix B/C/D).

Rev 2 proposed rows (generic/educational or supported-anchor only; optional additions — visible/schema inclusion is an SEO-signoff decision):
- NEW FAQ row 6 (buyer questions, educational):
  HE q: מה כדאי לברר לפני שנותנים למישהו לנהל את הפרסום בגוגל?
  HE a: כדאי לשאול כמה שאלות פשוטות. של מי חשבון הפרסום ופרופיל התשלומים? איך עוקבים אחרי פניות אמיתיות, ולא רק אחרי קליקים? מה קורה לפני כל שינוי בתקציב? ומה כלול בעלות הניהול? תשובות כנות וברורות — סימן טוב.
- NEW FAQ row 7 (media vs management, definitional):
  HE q: מה ההבדל בין תקציב המדיה לבין דמי הניהול?
  HE a: תקציב המדיה הוא הכסף שמשולם לגוגל על הקליקים והחשיפות. דמי הניהול הם התשלום למי שמקים ומנהל את הקמפיינים. אלה שני סכומים שונים, וכדאי לדעת בדיוק כמה אתה משלם על כל אחד.
- NEW FAQ row 8 (Ads Bot distinction — supported facts only):
  HE q: מה זה Ads Bot, ומה הקשר שלו לדף הזה?
  HE a: נכון לעכשיו, ההרשמה והתשלום המקוונים ב-Ads Bot אינם זמינים, ואפשר לצפות בהדגמה. על ניהול Google Ads אפשר לדבר איתנו ישירות — בשיחה תוכל לברר מה מוצע ואיך זה עובד.
  Reality anchor: `src/app/(app)/google-ads/onboarding/page.tsx:557` (the ONLY supported operational fact; not extended to no-charge/no-live-budget/paid availability).
- NEW FAQ row 9 (no guarantees, honest):
  HE q: האם מישהו יכול להבטיח תוצאות או מספר פניות?
  HE a: לא. בניהול קמפיינים אי אפשר להבטיח תוצאה, תאריך או מספר פניות. גם המדידה מוגבלת למה שאפשר לעקוב אחריו — פנייה שלא נרשמה בכלי מעקב עלולה לא להופיע בדוחות. לכן כדאי לקבל החלטות לפי נתונים שרואים, ולא לפי הבטחות.

Rev 2 safety notes (English): row 6 is reader-directed advice about ANY provider (no WAO practice claim); row 7 is industry-definitional (no WAO invoicing claim); row 8 states only the supported onboarding fact plus a conversation redirect (Rev 1's "שירות מלא בחשבון שבבעלותך" removed); row 9 keeps the honest no-guarantee position and removes Rev 1's "מה שכן תקבל: מדידה מסודרת ושקיפות מלאה" service promise.

## KEY: googleAds.metadata.faq (schema congruence — PLANNING NOTE, not a public promise)
Seam: `page.tsx:48-69` (FAQPage schema).
Contract 038 verdict: conditional structural PASS (congruence only, not truth or runtime). Disposition: PLANNING NOTE, unchanged stance.
Type: KEEP UNCHANGED — both schema Q/A pairs mirror visible FAQ rows 1 and 4, which this packet keeps byte-identical, so visible/schema congruence holds structurally. The TRUTH of the mirrored content (price, ownership, MCC, GA4/GTM practice) is unvalidated (matrix A/D/E) — structural congruence is never commercial truth. If the owner later changes visible rows 1/4, schema must be re-synced in the same engineer contract. No new schema rows proposed (Rev 2 visible FAQs are optional for schema; adding them is an SEO-signoff decision).

---

## KEY: googleAds.cta.closing (existing slot, FLAG)
Seam: `page.tsx:322-353`. PhoneReveal component + source string and Ads Bot link destination (`:336-346`) preserved as reference.
Contract 038 verdict: PARTIAL. Disposition: CORRECTED.

FLAG (English): current block promises a free 30-minute consultation (`:330-334`) and repeats it plus "בלי חוזה ארוך" in the trust line (`:348`) — all unverified commercial terms (matrix D), not deployable on this packet's authority. Rev 1's proposed paragraph ("נבדוק יחד את מדידת ההמרות ואת מבנה הקמפיינים… נציע כיוון פעולה") promised an audit/measurement review and is WITHDRAWN (matrix E); its trust line asserted ownership and approval practice and is WITHDRAWN (matrix A/B).

- Eyebrow (`:328`): KEEP UNCHANGED (persona pain question; asserts nothing).
- H2 (replaces `:329-332`) — kept from Rev 1 (question form, no promise):
  HE: רוצה לדעת לאן תקציב הפרסום באמת הולך?
- Paragraph (replaces `:333-335`), Rev 2:
  HE: אפשר להתקשר ולספר לנו מה קורה עם הפרסום שלך בגוגל. תוכל לברר בשיחה שאלות של ניהול, מדידה ועלויות. תוכל גם לשאול אם ניהול Google Ads רלוונטי לעסק שלך. בלי לחץ.
- Primary CTA: PhoneReveal KEEP as-is (component-owned label); no guaranteed-terms label proposed here.
- Secondary CTA (`:343-345`): KEEP UNCHANGED as reference.
- Trust line (replaces `:348`), Rev 2 (no ownership/approval/contract assertions):
  HE: ✓ שיחה בלי לחץ · ✓ בלי הבטחות ריקות · ✓ רק שאלות ותשובות כנות

---

## KEY: googleAds.seo.keywords (English planning note — no fabricated volumes/rankings)
Contract 038 verdict: PASS as planning intent only. Disposition: PLANNING NOTE, mapping updated to Rev 2 keys:
1. Google Ads advertising/management for small businesses — hero paragraph (conversation framing), closing CTA H2/paragraph.
2. Client-owned Google Ads account / agency lock-in fear — H1 (untouched anchor; unverified per matrix A), stats tile 1 (reader question), FAQ row 6 (buyer questions), fit block ("לאן כל שקל הולך").
3. Management cost versus media spend separation — FAQ row 7 (definitional), FAQ row 6, hero paragraph ("עלויות" as conversation topic). Kept existing FAQ row 1 remains flagged, not counted as safe.
4. Conversion measurement (GA4, GTM) — stats tile 2, FAQ rows 6 and 9 (measurement limits), fit block. No practice assertion anywhere.
5. Agency versus owner control, approval before changes — stats tile 3, FAQ row 6 (both reader-directed questions), approval.policy internal note only.
Entity coverage retained: Search / Performance Max / YouTube appear only in kept definitional source rows (FAQ 3) and untouched anchors — Rev 2 adds no channel-selection promise.
AIO suitability: question-formatted FAQ answers, honest no-guarantee answer, definitional media-vs-management answer; no invented numbers, no unsupported practice descriptions in any proposed string.

## KEY: googleAds.ownerNotes.ideas (English owner-approval notes only — NOT copy, NOT claims)
Contract 038 verdict: PASS (owner-only concepts). Disposition: RETAINED unchanged.
- Pilot/community idea (record only, needs explicit owner approval, never to be phrased as nonprofit/no-profit/pilot/free service without it): a "first managed accounts" story block could later replace the stats slot with genuine, consented community cases — only if real clients and documented records exist (matrix F).
- Personal low-pressure voice inspired by founder-post tone from parent card context; no founder biography, certification or personal claim appears anywhere in this packet.
- No guarantee of performance or reporting cadence is drafted; reporting-cadence wording deliberately omitted pending ops definition.

## Claim-safety summary (English, Rev 2)
Proposed public strings contain: no prices, no ROI/CPA/ROAS figures, no lead counts, no deadlines, no minimum budgets, no vertical exclusions, no free/pilot/nonprofit claims, no founder story, no certification, no testimonial, no invented form/screening/auto-response, no consultation length or terms, no audit/measurement-review promise, no ownership/payment/MCC assertion, no approval-workflow assertion, no included/separate scope assertion, no invoicing terms, no paid Ads Bot signup implication, and no extension of the single supported onboarding fact (signup/payment unavailable; demo viewable) beyond its source. Reader-directed questions and industry-definitional content are the only treatment of the sensitive topics, per Contract 039 req. 2. WITHDRAWN keys (steps, included, scope.new, Rev 1 FAQ rows 5-replacement/6/7, Rev 1 hero/stats/closing strings) leave no unsafe earlier alternative marked usable anywhere in this packet. Every existing unverified page claim, including protected anchors and schema/FAQ content, remains explicitly unvalidated and blocks application per the release-blocker matrix until Eitan supplies operational/commercial evidence or separately signs off a truthful anchor/schema revision. release_health=false.
