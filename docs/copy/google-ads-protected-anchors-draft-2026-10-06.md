# Google Ads Main Page — Protected Anchors Truthful Alternatives (DRAFT-ONLY)

- Draft: `docs/copy/google-ads-protected-anchors-draft-2026-10-06.md` (NEW; draft only, unapplied)
- Contract: `handoff/pending/2026-10-06_015_waocopy_draft-ads-protected-anchors.md` (Contract v3, kanban t_2b85b496); sole parent t_d7d63de4 (formal DONE, substantive bounded Rev 3 PASS, release_health=false)
- Rev 4 correction (Contract 2026-10-06_017, per independent reviewer t_afbe601f FAIL at anchors.faq1): ONLY the proposed synced FAQ1 answer and its dependent English explanation/matrix/scan text were revised — the answer no longer asserts direct Google media payment or any media-payment/invoicing mechanic (matrix D unverified). All other cells are unchanged from the pinned Rev 3 draft. Final Rev 4 digest is reported in the completion report only (no self-referential hash in this file).
- Companion packet (NOT modified, NOT superseded): `docs/copy/google-ads-trust-flow-draft-2026-10-05.md` — Rev 3, SHA-256 `83999415771fa4b65f78eaf84697f33e08cdc475840a5462b2eecc252dfe5d1e` (re-verified at preflight)
- Target page (NOT modified): `src/app/(app)/google-ads/page.tsx`, SHA-256 `2ac114c9f289ab36a9ead483a4fdaf9882ea89c9d2839036bb14efd887e418af` (re-verified at preflight)
- Copy bundle (NOT modified): `docs/copy/google-ads-page-copy-2026-10-02.json`, SHA-256 `ff0c881bd934b20c91f47ae903407b4cf4c285ddfc31742ab5ae608abc32ab9f` (re-verified at preflight)
- Hebrew safety: every Hebrew string below is ORIGINAL waocopy authoring. Existing page Hebrew is referenced only by `file:line`, never reproduced here. A future engineer applies byte-exact authored cells; never types Hebrew.
- Status: DRAFT ONLY. No source, packet, bundle or production file touched. This document does NOT authorize application and does NOT establish public truth. Application requires ALL gates in §7 plus a later separate engineer contract that reconciles every remaining matrix A–F family in the companion packet.
- Persona: skeptical Israeli small-business owner (singular male, native Sabra register) who already paid for clicks and does not know which inquiries arrived.
- Offer angle (per Contract 015 req. 4): optional, low-pressure inquiry and viewable Ads Bot demo; online signup/payment unavailable. NO public claims of present ownership/MCC practice, price, no-contract/free-call terms, Fraud Blocker inclusion, audit/GA4/GTM service capacity, ROI or response SLA.
- Only supported Ads Bot operational fact: `src/app/(app)/google-ads/onboarding/page.tsx:557` — online signup and payment currently unavailable, no charge occurs, demo viewable. Not extended anywhere in this draft.
- SEO keyword targets preserved as topics/questions: Google Ads management for small businesses; account ownership as a buyer question (not a present WAO fact); ad spend versus management fee as a buyer question; conversion tracking as a topic to discuss.

## 1. Key index (old source lines → dispositions)

| Key | Old seam (`page.tsx`) | Claim classes removed | Disposition | Gate |
|---|---|---|---|---|
| anchors.title | :12 | ownership, price | REPLACE | SEO-GATED |
| anchors.description | :15 | ownership, MCC, price, media-separation terms | REPLACE | SEO-coordinated |
| anchors.og.title | :19 | ownership | REPLACE | SEO-coordinated |
| anchors.og.description | :20 | no-contract, price, media-separation terms | REPLACE | SEO-coordinated |
| anchors.webpage.name | :32 | ownership | REPLACE | SEO-coordinated |
| anchors.webpage.description | :33 | MCC, ownership of account+payment profile | REPLACE | SEO-coordinated |
| anchors.service.name | :41 | client-account ownership | REPLACE | SEO-coordinated |
| anchors.service.description | :42 | MCC, price, media-separation terms | REPLACE | SEO-coordinated |
| anchors.service.offers.price | :46 | price (₪ figure) | REMOVE-GATED (no replacement price) | SEO-coordinated |
| anchors.badge | :191 | ownership, MCC practice | REPLACE | SEO-GATED |
| anchors.h1 | :203-205 | ownership promise, anti-lock-in terms | REPLACE (JSX fragment mapping, §4) | SEO-GATED |
| anchors.faq1 | visible :130-131 + schema :54-57 | price, ownership, MCC, media-payment mechanics | REPLACE ANSWER, synced pair (§5) | SEO-coordinated |
| anchors.faq2 | visible :142-143 + schema :62-65 | GA4/GTM practice claim | REPLACE ANSWER, synced pair (§5) | SEO-coordinated |

Preserved unchanged (explicitly no proposal): canonical :16, robots :17, OG url/type :21-22, schema `@id`s :30/:39/:50, `isPartOf` :34, `serviceType` :40, `provider` :44, `areaServed` :45, `url` :43, BreadcrumbList :70-78, FAQ question strings :54/:62/:130/:142, FAQPage 2-pair semantics. FAQ semantics and `@id`/canonical/robots are preserved ONLY because visible/schema parity remains truthful under §5; if any gate rejects a synced answer, the fallback for that pair is REMOVE-GATE of BOTH the visible answer's claim content and its schema mirror together (never one side alone).

## 2. Metadata anchors (REPLACE — title SEO-GATED, rest SEO-coordinated)

### KEY anchors.title — replaces `page.tsx:12` (title.absolute) — SEO-GATED
Primary proposal (full double-quoted string value at :12 is replaced by this exact content):
> פרסום בגוגל לעסקים קטנים — ניהול Google Ads בלי הבטחות ריקות‏ | WAO

RLM preservation (byte-exact): a SINGLE U+200F RLM (UTF-8 `e2 80 8f`) is attached immediately after the final Hebrew letter ת of "ריקות", followed by ` | WAO` (space, pipe, space, W, A, O) — identical suffix byte pattern to source :12. No other RLM/LRM/ZWJ appears in any string in this draft. Root-template bypass behavior at :10-11 is unaffected (string still carries its own suffix).
Alternate (SEO-gate choice):
> ניהול Google Ads לעסקים קטנים — פרסום בגוגל שמתחיל בשאלות‏ | WAO
Claims: no price, no ownership, no MCC, no terms. Head terms "פרסום בגוגל" + "ניהול Google Ads" + small-business intent preserved; honest-differentiator stance ("בלי הבטחות ריקות") matches companion-packet reviewed positioning (:228).

### KEY anchors.description — replaces `page.tsx:15` — SEO-coordinated
> שילמת על קליקים ולא ברור כמה פניות הגיעו? ניהול Google Ads לעסקים קטנים מתחיל בשאלות — של מי החשבון ואיך עוקבים אחרי פניות. מוזמן לדבר איתנו, בלי לחץ.
Claims: pain hook (persona), ownership as a buyer question, tracking as a topic, low-pressure invitation. No price/MCC/ownership/no-contract assertion. ~150 chars.

### KEY anchors.og.title — replaces `page.tsx:19` — SEO-coordinated
> פרסום בגוגל לעסקים קטנים — ניהול Google Ads בלי הבטחות ריקות | WAO
BiDi note (English): source :19 has NO RLM and ends in a Latin token before "| WAO" — a pre-existing swap risk per the CLAUDE.md SERP bidi rule. The proposal keeps the no-RLM pattern of :19 but ends the pre-suffix token in Hebrew ("ריקות"), removing the Latin-before-brand risk. No RLM added — pattern parity with source; SEO gate may override.

### KEY anchors.og.description — replaces `page.tsx:20` — SEO-coordinated
> כמה עולה ניהול Google Ads לעסק קטן? מה ההבדל בין תקציב המדיה לדמי הניהול? ואיך יודעים שהפרסום מביא פניות אמיתיות? בוא נדבר על העסק שלך — בלי לחץ ובלי הבטחות ריקות.
Claims: spend-vs-management as buyer questions (keyword target 3), measurement as a topic, invitation only. Removes no-contract + price + media-terms assertions of source :20.

## 3. Schema anchors (REPLACE / REMOVE-GATED — all SEO-coordinated)

### KEY anchors.webpage.name — replaces `page.tsx:32`
> פרסום בגוגל וניהול Google Ads לעסקים קטנים — WAO
### KEY anchors.webpage.description — replaces `page.tsx:33`
> שאלות ותשובות על פרסום בגוגל לעסקים קטנים: בעלות על החשבון, מדידת פניות, ועלויות ניהול מול תקציב מדיה. בסיס טוב לשיחה ישירה — בלי הבטחות ריקות.
Claims: topics-as-questions only; removes MCC + client-owned account/payment-profile assertions of source :33. `@id` :30 and `isPartOf` :34 unchanged.

### KEY anchors.service.name — replaces `page.tsx:41`
> ניהול Google Ads לעסקים קטנים — WAO
### KEY anchors.service.description — replaces `page.tsx:42`
> שיחה ישירה על ניהול Google Ads לעסק קטן. נושאים לבירור: בעלות על החשבון, מדידת פניות, ודמי ניהול מול תקציב מדיה. בלי הבטחות לתוצאות.
Claims: removes MCC + "from-₪" price + media-separation terms of source :42; ownership/management-fee/measurement appear only as declared conversation topics; explicit no-guarantee. `@id` :39, `serviceType` :40, `url` :43, `provider` :44, `areaServed` :45 unchanged.

### KEY anchors.service.offers.price — `page.tsx:46` — REMOVE-GATED, NO REPLACEMENT
The `offers` object (`{ "@type": "Offer", priceCurrency: "ILS", price: "1500" }`) must be REMOVED in any future application contract. No replacement price is authored or permitted — any price requires Eitan's verified rate card (matrix D). SEO note for the gate: removal drops Offer rich-result eligibility for the Service entity; that is an accepted consequence of the unresolved price claim, and the SEO gate signs off on it explicitly. Structured data must never retain an unsupported price when visible copy changes.

## 4. Visible hero anchors (REPLACE — SEO-GATED)

### KEY anchors.badge — replaces the text line at `page.tsx:191` (inside the badge div; dot markup :190 unchanged)
Primary:
> החשבון, התקציב והפניות — מה כדאי לשאול לפני שמפרסמים בגוגל
Alternate:
> ניהול Google Ads לעסקים קטנים · בלי הבטחות ריקות
Claims: reader-directed buyer questions to ask ANY provider (companion-packet reviewed pattern :89-101); removes "your account / your budget / we manage via MCC" practice assertions of source :191. Does NOT imply WAO offers account ownership — it frames ownership as a question, per Contract 015 req. 4. Head terms (חשבון, תקציב, פניות, פרסום בגוגל / ניהול Google Ads, עסקים קטנים) preserved.

### KEY anchors.h1 — replaces the JSX text lines `page.tsx:203-205` — SEO-GATED
Complete renderable JSX fragment mapping (the three source lines :203-205 are replaced by these three lines; `<h1>` wrapper and styles :193-202/:206 untouched; engineer applies byte-exact, never types Hebrew):

Line A (replaces :203):
```
            פרסום בגוגל לעסקים קטנים —{" "}
```
Line B (replaces :204):
```
            <span className="text-gradient">ניהול Google Ads שמתחיל בשאלות</span>
```
Line C (replaces :205):
```
            {" "}ולא בהבטחות ריקות
```
Rendered plain text (for SEO/QA review): פרסום בגוגל לעסקים קטנים — ניהול Google Ads שמתחיל בשאלות ולא בהבטחות ריקות

Alternate H1 fragment (pain-hook variant; same three-line shape):
Line A: `            שילמת על קליקים, ולא ברור{" "}`
Line B: `            <span className="text-gradient">כמה פניות באמת הגיעו?</span>`
Line C: `            {" "}פרסום בגוגל לעסקים קטנים מתחיל בשאלות`
Rendered plain text: שילמת על קליקים, ולא ברור כמה פניות באמת הגיעו? פרסום בגוגל לעסקים קטנים מתחיל בשאלות

Claims: removes "the account stays yours" ownership promise and "no agency lock-in" commercial framing of source :203-205; preserves Google Ads topic + small-business intent + gradient-span structure. No price, terms, or practice assertion.

## 5. FAQ visible/schema synchronized pairs (REPLACE ANSWERS — SEO-coordinated)

Parity rule: each answer below is applied BYTE-IDENTICAL at BOTH seams of its pair. Never change one side alone. Question strings stay unchanged (safe buyer questions; strong keyword anchors). If a gate rejects an answer, the fallback is explicit REMOVE-GATE of the whole pair (visible answer claim content + its schema mirror together), never a partial edit.

### KEY anchors.faq1 — visible `page.tsx:131` (answer) + schema `page.tsx:57` (acceptedAnswer.text); questions :130/:54 unchanged
Synced answer (one string, both seams):
> קודם נסדר ציפיות: אנחנו לא מפרסמים כאן מחירון, ולא מתחייבים כאן על הסדרי תשלום. אלה בדיוק השאלות שכדאי שתשאל כל נותן שירות, לפני שאתה מתחייב: כמה עולה הניהול? איך מועבר תקציב המדיה? ועל שם מי נרשם חשבון הפרסום? על ניהול Google Ads אפשר לדבר איתנו ישירות — בשיחה תוכל לברר מה מוצע ואיך זה עובד.
Claims: no media payer, payment route, invoicing split, price figure, ownership/MCC arrangement or availability is asserted anywhere in the answer — Rev 4 removed the previous draft's direct-to-Google media-payment sentence, which matrix D (companion :63-65) lists as unverified. "We publish no price list here and commit to no payment arrangement here" is a true page-level statement, not a commercial term; cost, media-transfer and account-registration appear ONLY as reader-directed questions to ask ANY provider (companion-packet reviewed pattern :89-101, :193); closing redirect reuses the independently PASS-reviewed pattern (:199). Source price/ownership/MCC/media-payment mechanics of :131/:57 are fully displaced. No implied present WAO practice.

### KEY anchors.faq2 — visible `page.tsx:143` (answer) + schema `page.tsx:65` (acceptedAnswer.text); questions :142/:62 unchanged
Synced answer (one string, both seams):
> בניהול קמפיינים אי אפשר להבטיח תוצאה, תאריך או מספר פניות. מה שכן אפשר לעשות: לעקוב. מעקב המרות עם כלים כמו GA4 ו-Google Tag Manager הוא הדרך המקובלת לראות אילו פניות באמת הגיעו מהפרסום. רוצה לדעת איך זה יכול לעבוד עבור העסק שלך? אפשר לדבר איתנו ישירות — בשיחה תוכל לברר מה מוצע ואיך זה עובד.
Claims: no-guarantee stance matches the independently PASS-reviewed packet phrasing (:203); GA4/GTM appear as industry-standard tools ("the accepted way"), NOT as a WAO setup/service capacity (removes the practice claim of source :143/:65, matrix E); conversion tracking stays a discussion topic; redirect pattern as above. Structured data retains no unsupported GA4/GTM practice claim.

FAQPage schema semantics preserved: still exactly two Question/acceptedAnswer pairs, mirroring visible rows 1 and 4 — truthful parity holds under these replacements.

## 6. Key/claim matrix (Contract 015 req. 5)

| Key | Ownership/MCC | Price/commercial terms | GA4/GTM capacity | Performance/ROI/SLA | Present-practice implication | Verdict |
|---|---|---|---|---|---|---|
| anchors.title | none | none | none | none | none — topic + stance | claim-safe draft |
| anchors.description | question-form only | none | topic only | none | none | claim-safe draft |
| anchors.og.title | none | none | none | none | none | claim-safe draft |
| anchors.og.description | none | questions only | question only | none | none | claim-safe draft |
| anchors.webpage.name/description | topic listing only | none | topic only | explicit no-guarantee | none | claim-safe draft |
| anchors.service.name/description | topic listing only | none | topic only | explicit no-guarantee | none | claim-safe draft |
| anchors.service.offers.price | — | REMOVED, no replacement | — | — | — | remove-gated |
| anchors.badge | buyer question to any provider | none | none | none | none | claim-safe draft |
| anchors.h1 (both variants) | none | none | none | none | none | claim-safe draft |
| anchors.faq1 (synced, Rev 4) | question-form only | "no published price list / no payment-arrangement commitment here" (page-true) | none | none | none | claim-safe draft |
| anchors.faq2 (synced) | none | none | tools-as-industry-standard only | explicit no-guarantee | none | claim-safe draft |

Prohibited-claim scan (all keys): no price or number of any kind; no ownership/MCC assertion; no media payer/direct-payment/invoicing mechanic (Rev 4 FAQ1 fix); no no-contract/free-call/30-minute terms; no Fraud Blocker mention; no audit/GA4/GTM service-capacity claim; no ROI/CPA/ROAS/response-SLA; no guaranteed availability or fixed terms; no extension of the single supported onboarding fact; no commercial statement laundered into a WAO-implying question. Reader-directed questions and definitional content are the only treatment of sensitive topics (companion-packet constraint honored).

## 7. Application gates (none passed by this draft)

1. Independent structural claim review of THIS pinned draft (waoverifier; waostrategy dispatches).
2. SEO protected-anchor signoff (seo-strategist): title, badge, H1 are SEO-GATED; all metadata/schema replacements and the offers-price removal are SEO-coordinated and need the same signoff.
3. Eitan founder Hebrew spot-check (human gate; grammatical correctness is not voice approval). The separate Hebrew-QA card was waived for this mission; SEO/founder review were NOT waived.
4. A later separate waoengineer application contract must reconcile ALL remaining source matrix A–F families from the companion packet — hero paragraph :208, CTAs :211-220, STATS :122-126/:225-239, STEPS :80-111/:245-249, INCLUDED :113-120/:282-286, visible FAQ rows 2/3/5 (:134-139, :146-147), closing block :322-353 — before ANY coherent page application. This partial anchor draft alone NEVER authorizes application or public truth.
5. Post-application: separate independent runtime/RTL/visual verification and deployment owner gate.

release_health=false. Escalation: independent draft claim review and SEO/founder/full-page gates; release_health=false.

## 8. Self-check (waocopy, pre-completion)

- Register: singular male throughout ("שילמת", "מוזמן", "תוכל", "שלך", "בוא נדבר"); native Sabra phrasing; concise sentences; no translated-from-English constructions.
- Typography: em-dash single-spaced; middot separator matches existing site pattern; no ASCII quotes/apostrophes inside Hebrew strings; no double spaces; no gershayim needed in these strings.
- BiDi: exactly one RLM inside each proposed title string (primary and alternate are options for one slot; each carries a single suffix RLM matching source :12 byte-for-byte); the og.title proposal follows source :19's zero-RLM pattern but ends in Hebrew before the brand; all other strings end in Hebrew before any Latin token.
- Scope: one new file; page.tsx / packet / bundle byte-identical (hash re-verified post-write); no JSX edited; no successor dispatched; handoff status directories untouched.
