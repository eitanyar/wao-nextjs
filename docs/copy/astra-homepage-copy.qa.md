# Astra Homepage — Hebrew QA Report

- Source `docs/copy/astra-homepage-copy.json` SHA-256: `788cbf311bfdd5ef81eb982bd5017ad1e4622815348a911ac07bf3fbbc1b7ad8`
- Source `docs/copy/astra-homepage-recommendations.md` SHA-256: `ded1aebb878af5a61c45188e642fd476fd3c3d0296fca03568d7c55b156f8003`
- Recovery parent reviewed: `t_1b67c4df` — formally done. Historical card `t_5ec6ef7d` was inspected only as failure evidence.
- Review scope: material Israeli-Hebrew naturalness, singular-male consistency, clarity, TTS-safe sentence flow, CTA meaning, two-path consistency, and commercial claim safety.

## Coverage summary

### JSON top-level sections

- `metadata` — reviewed; no material Hebrew issue. Truth constraints correctly keep Ads pricing, live activation, Site Bot continuation terms, optional extensions, and proof limitations bounded.
- `navigation` — reviewed; labels and destinations are clear and consistent with the two-path direction.
- `hero` — reviewed; owner anchors remain intact, the demo limitation is explicit, and both conversion paths are distinguishable.
- `proof` — reviewed; the fictional demonstration is clearly labelled and makes no results claim. `יאללה` appears once in rendered copy.
- `paths` — reviewed; one material completeness claim appears in `paths.path_local.continuation_line`.
- `low_price` — reviewed; the human-review boundary and lack of a dedicated personal manager are explicit.
- `lead_handling` — reviewed; Maoved and tracking are presented as optional, separately paid extensions.
- `ai_search` — reviewed; the wording expressly avoids promising placement in any AI result.
- `people` — reviewed; the real-person asset boundary and absence of fabricated case-study proof are preserved.
- `faq` — reviewed; two material commercial-trust claims require correction. Singular-male address is otherwise consistent.
- `final_cta` — reviewed; both paths remain available without implying that both are required.

### Recommendations route and shell sections

- `/google-ads/onboarding` — reviewed; demo-only state and blocked live activation are explicit.
- `/site-bot` — reviewed; question-count correction is clear, and unresolved continuation terms remain blocked.
- `/site-bot/start` — reviewed; no fixed question count is introduced.
- `/google-business` — reviewed; optional separate-service status is clear.
- `/about` — reviewed; premium management is separated from entry offers.
- `/maoved` — reviewed; optional separate-payment status is clear.
- `Header.tsx` — reviewed; one material implementation contradiction requires correction.
- `Footer.tsx` — reviewed; one materially unclear customer-facing sentence requires correction.
- Retained destinations `/seo`, `/google-ads`, `/training`, `/consulting`, `/blog` — reviewed; SEO anchors stay unchanged, and the Ads price conflict remains blocked.

## Material corrections

### 1. Unresolved Site Bot terms are described as complete

**Location:** JSON key `paths.path_local.continuation_line`

**Old text:**

`מה מקבלים אחר כך ואיך ממשיכים? כל הפרטים בדף השירות, לפני כל תשלום.`

**Replacement text:**

`מה מקבלים אחר כך ואיך ממשיכים? בדף השירות תראה את האפשרויות הקיימות לפני שתחליט.`

**Reason:** The source itself records unresolved continuation, VAT, billing, hosting, and refund terms. Saying “all details” are available before payment is a completeness claim the current truth matrix does not support. The replacement stays useful without implying that unresolved terms are already final.

### 2. The FAQ repeats an unsupported promise of exact continuation terms

**Location:** JSON key `faq.items[4].a`

**Old text:**

`האתר מתחיל בניסיון של ₪9.90, ואת תנאי ההמשך המדויקים תראה לפני כל תשלום נוסף. במסלול המודעות, תקציב הפרסום לגוגל תמיד נפרד מדמי הניהול.`

**Replacement text:**

`האתר מתחיל בניסיון של ₪9.90. אפשרויות ההמשך מופיעות בדף השירות ואינן כלולות במחיר הניסיון. במסלול המודעות, תקציב הפרסום לגוגל נפרד מדמי הניהול.`

**Reason:** “Exact continuation terms” conflicts with the artifact’s own unresolved-terms boundary. The replacement also shortens the spoken flow and clearly separates the trial from later options.

### 3. The FAQ makes an unprovable blanket trust claim

**Location:** JSON key `faq.items[5].a`

**Old text:**

`התנאים המדויקים מוצגים בדף כל שירות, לפני כל חיוב. אין אצלנו הפתעות באותיות הקטנות.`

**Replacement text:**

`התנאים המעודכנים מופיעים בדף כל שירות. בדוק אותם לפני שאתה מאשר תשלום.`

**Reason:** “No surprises in the fine print” is an absolute commercial-trust promise, while several product terms are explicitly unresolved. The replacement gives a clear, singular-male instruction without claiming more than the current product can prove.

### 4. The Header recommendation gives the engineer two conflicting primary-CTA instructions

**Location:** Recommendations heading `## 7. src/components/Header.tsx`, paragraph `CTA destination`

**Old text:**

``**CTA destination:** primary → `/google-ads/onboarding`; header price CTA `התחל ב-₪9.90` → `/site-bot` may remain only if the Site Bot trial truth holds (it does today).``

**Replacement text:**

``**CTA destination:** primary → `/google-ads/onboarding`. Replace the existing Site Bot price CTA; do not retain a second primary CTA in the header.``

**Reason:** The same section first requires the primary Header CTA to become the Ads preview, then says the old Site Bot primary CTA may remain. That ambiguity can change the implemented conversion hierarchy and conflicts with the owner-approved single primary Header action.

### 5. The proposed Footer brand line is incomplete and unclear in Hebrew

**Location:** Recommendations heading `## 8. src/components/Footer.tsx and retained main-nav destinations`, proposed brand line

**Old text:**

`אנשי שיווק וותיקים עם סוכני AI שמבצעים. שיווק בגוגל לעסקים קטנים — מודעות, אתרים ונוכחות מקומית, מאז 2006.`

**Replacement text:**

`אנשי שיווק ותיקים מובילים את הדרך, וסוכני AI מבצעים חלק מהעבודה. שיווק בגוגל לעסקים קטנים — מודעות, אתרים ונוכחות מקומית, מאז 2006.`

**Reason:** `סוכני AI שמבצעים` leaves the verb without a clear object and sounds like a fragment rather than natural Israeli customer copy. The replacement preserves the approved human-led/AI-assisted meaning and avoids implying that AI performs everything.

## Verdict

Eitan's founder-facing human spot-check remains required before publication.

OVERALL: REVISE
