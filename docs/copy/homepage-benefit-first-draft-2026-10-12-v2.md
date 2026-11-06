# Homepage — complete benefit-first draft v2 (NOT APPLIED)

Authorship: waocopy profile, task t_1b1184ab (Contract011, `handoff/pending/2026-10-12_011_waocopy_homepage-benefit-first-completeness-correction.md`), model `qwen3.8-max` / `alibaba` on the authenticated waocopy profile route — no fallback and no provider switch. This is the narrow v2 correction of the v1 draft produced under t_803fa27a (`docs/copy/homepage-benefit-first-draft-2026-10-12.md` and `.json`); v1, its companion JSON and the v1 QA report (`docs/research/homepage-benefit-first-language-review-2026-10-12.md`) remain byte-identical and untouched, with the contract-pinned SHA-256 values recorded in the companion JSON `docs/copy/homepage-benefit-first-draft-2026-10-12-v2.json`. Only the three completeness gaps recorded in Contract011 are corrected here; every other customer-visible Hebrew string is a byte-identical carry-forward from v1. This remains a proposed complete reading-order page for internal review: NOT applied, not a runtime preview, not language-QA accepted (the v1 PASS is historical for v1 and does not cover v2), not founder-approved, not a release authorization. Link targets are proposals subject to the destination checks in the companion JSON.

Rendering convention [EN | NOT RENDERED]: every English line, section header, parenthetical and tag in this Markdown is authoring apparatus for reviewers/implementers and is never rendered to customers. Customer-visible copy consists only of the Hebrew lines (plus existing source asset URLs/labels referenced inline). Draft notes carry the tag [EN|NOT RENDERED].

## v2 correction log [EN | NOT RENDERED]

1. Gap 1 — visible Markdown/JSON parity (Google Ads): v1's Google Ads paragraph fused `paths.google_ads.description` with the first sentence of `paths.google_ads.demo_status` and omitted demo_status's second sentence (`פנייה מהעמוד הזה היא בקשה לשיחה; היא לא מפעילה פרסום בגוגל.`). v2 renders the complete description as the body paragraph and the complete demo_status — both sentences, including the status/activation boundary — exactly once as the visible card note, byte-matching the keyed JSON and the real render seams (`AstraHome.tsx:88` body `<p>`, `AstraHome.tsx:89` `<p className="astra-card-note">`). Neither mapped value changed from the v1 JSON; this is a parity repair, not a copy change.
2. Gap 2 — founder experience proof: the selected source renders `astra-homepage-copy.json#/people/intro` (`מאחורי המערכת יש אנשים אמיתיים, עם ניסיון בשיווק דיגיטלי מאז 2006.`) in the footer brand seam `Footer.tsx:108`. v1's blurb replacement removed that proof while the v1 inventory claimed no trust element was removed. v2 preserves the statement byte-exact as a visible experience line in the founder block (proposed new seam: a `<p>` after `founder_authority.accountability_line`, near `AstraHome.tsx:128`) and maps both its current and proposed render locations in the companion JSON. v1's footer blurb replacement stays (text unchanged), so the experience point renders exactly once page-wide. Treated as source-observed: fresh founder confirmation of the since-2006 experience claim is required before publication; no years, credentials, outcomes, customers or metrics were invented or amplified.
3. Gap 3 — FAQ topic preservation: the original FAQ's no-marketing-experience concern (source `astra-homepage-copy.json#/faq/items[2]`) is restored as a proposed seventh entry (array index 6), while v1's items stay byte-identical — existing-site (0), service area (1), preparation (2), payment separation (3), timing (4) and the proposed terms item (5). The restored answer keeps the source answer's core byte-exact and adds only the draft's existing agreement/activation-gate boundary. It implies no guaranteed service, immediate human follow-up or result from a contact request.

## Proposed page metadata

- Title: **UNCHANGED, SEO-protected:** `שיווק דיגיטלי ש-AI מריץ — טוב יותר מסוכנות פרסום | WAO` (current source value; recommend a later separately approved owner-benefit title review, not an edit here).
- Meta description, proposed: `פרסום בגוגל ואתר לעסק של בעל מקצוע שנותן שירות בבית הלקוח. WAO עוזרת לך לפנות יותר מקום לעבודה ולהוריד שיווק מהראש — עם דרך ברורה להתחיל.`
- H1 and hero eyebrow: **UNCHANGED byte-exact** below. No canonical, schema, OG or title implementation proposed here.

## Header (desktop and mobile)

- Logo: `WAO` → `/` (unchanged).
- Navigation: `פרסום בגוגל` → `/google-ads`; `אתר ונוכחות מקומית` → `/site-bot`; `מי אנחנו` → `/about` (labels and targets unchanged; two service pages require destination/offer alignment before public use).
- Help: `יש שאלה? דבר איתנו` → `/contact#contact-form` (unchanged).
- Primary header CTA: `בוא נדבר על עוד עבודה` → `/contact#contact-form` (proposed replacement; same label/target on mobile).

## Hero

Eyebrow: **שיווק בגוגל לבעלי מקצוע ונותני שירות** (UNCHANGED)

# יותר לקוחות מגוגל.
# פחות שיווק על הראש.

אתה עובד אצל לקוחות, סוגר קריאות, ובין לבין צריך לדאוג גם לעבודה הבאה. כשמישהו באזור שלך מחפש איש מקצוע, העסק שלך צריך לתת לו סיבה לפנות. ב-WAO עוזרים לך לבנות דרך ברורה לפניות: פרסום בגוגל ואתר שמציג אותך כמו שצריך. אתה מתרכז בעבודה שלך, ואנחנו עוזרים לעשות סדר במה שקורה מסביבה.

Primary button: **בוא נדבר על עוד עבודה** → `/contact#contact-form` [EN|NOT RENDERED] (opens the existing contact form; submitting is a request, not an assured response or live Ads activation).

## Real customer-video proof

## רוצה לשמוע ממי שכבר עבד איתנו?

לפני שאתה מחליט עם מי לדבר, אפשר לשמוע לקוחות של WAO בקולם. הסרטון כאן כדי שתוכל להתרשם בעצמך, בלי סיפור הצלחה שהמצאנו בשבילך.

Existing video iframe, title `סרטון המלצות לקוחות WAO ביוטיוב`: `https://www.youtube-nocookie.com/embed/zrgqx7OOtcc`. Direct fallback: **לצפות בסרטון ביוטיוב** → `https://www.youtube.com/watch?v=zrgqx7OOtcc`. Keep the exact existing asset and fallback; no quotation, identity, result or specific video-content paraphrase is authored here.

## Two ways to bring the next job closer

## מאיפה תגיע העבודה הבאה?

אם המלצות מביאות חלק מהעבודה, מצוין — בוא נבנה להן עוד דרך להכיר אותך. אפשר להתחיל מפרסום למי שכבר מחפש שירות, או מאתר שמסביר למה לפנות אליך. לא צריך לבחור הכול בבת אחת; מתחילים במה שמתאים לעסק שלך עכשיו.

### פרסום בגוגל — לפגוש לקוח כשהוא מחפש בעל מקצוע

נניח שמישהו מחפש חשמלאי באזור שלך, והטלפון שלך פנוי לעבודה הבאה. מודעת חיפוש יכולה להציג את השירות שלך מול חיפוש רלוונטי, באזור שבחרת. דף נחיתה מסביר מה אתה עושה ומקל על מי שמתאים לו ליצור קשר. WAO מטפלת בתכנון ובהקמה לפי מה שתסכמו, ואתה נשאר בעניינים לפני כל הפעלה.

Card note (visible status line): המטרה היא פניות שמתאימות לעבודה שלך, בלי שתצטרך ללמוד לנהל קמפיין בערב. פנייה מהעמוד הזה היא בקשה לשיחה; היא לא מפעילה פרסום בגוגל.

[EN|NOT RENDERED] Gap 1 repair: the paragraph above the card note is the complete visible text of `paths.google_ads.description` (render seam `AstraHome.tsx:88`); the card note is the complete visible text of `paths.google_ads.demo_status`, including the activation-boundary sentence (render seam `AstraHome.tsx:89`, `astra-card-note`). Each appears exactly once in reading order and is byte-identical to the companion JSON. v1 fused the two and omitted demo_status's second sentence.

Button: **בוא נדבר על פניות מגוגל** → `/contact#contact-form`. Supporting link: **איך עובד פרסום בגוגל?** → `/google-ads` [EN|NOT RENDERED] (destination terms and legacy pricing need separate alignment).

### אתר לעסק — לתת להמלצה מקום שאפשר לשלוח אליו

גם מי שקיבל את המספר שלך מחבר רוצה לבדוק מי מגיע אליו הביתה. אתר ברור מציג את השירותים, אזור העבודה והדרך ליצור איתך קשר. כך מי ששמע עליך יכול להבין אם אתה מתאים לו, גם כשאתה באמצע קריאה. אפשר לחשוב יחד גם על הפרטים המקומיים שכדאי להציג ליד העסק בגוגל. ניהול שוטף של הפרופיל העסקי בגוגל הוא שירות נפרד, ולא חלק אוטומטי מהאתר.

Button: **בוא נדבר על האתר שלי** → `/contact#contact-form`. Supporting link: **איך מתחילים עם האתר?** → `/site-bot` [EN|NOT RENDERED] (existing page currently carries superseded payment/time claims; do not promote until aligned).

### לא בטוח מה קודם?

ספר לנו איזה שירות אתה נותן, איפה אתה עובד ואיפה חסרות לך פניות. נוכל לבחון איתך מה כדאי לסדר קודם, בלי להעמיס עליך עוד משימות.

Button: **בוא נדבר על העסק שלי** → `/contact#contact-form`.

## Who owns the work / existing Partner reference

## יש עם מי לדבר על השיווק שלך

איתן יריב, מייסד WAO, עומד מאחורי הכיוון המקצועי של העבודה כאן. זה לא מצריך ממך להפוך לאיש שיווק אחרי יום עבודה ארוך. כדאי שנכיר את השירות, האזור והלקוחות שאתה רוצה לקבל מהם פניות. משם אפשר לדבר על דרך פעולה שמתאימה לעסק שלך, ולא על חבילה גנרית.

מאחורי המערכת יש אנשים אמיתיים, עם ניסיון בשיווק דיגיטלי מאז 2006.

[EN|NOT RENDERED] Gap 2 repair: the Hebrew line immediately above preserves byte-exact the source-backed experience statement `src/content/astra-homepage-copy.json#/people/intro`, which the selected source currently renders in the footer brand seam `src/components/Footer.tsx:108` (concatenated with `low_price.lines[0]` and `low_price.lines[1]`). Proposed v2 render location: the founder block, a new `<p>` after `founder_authority.accountability_line` (near `src/components/home/AstraHome.tsx:128`); mapped in the companion JSON under `proposed_additions["founder_authority.experience_line"]` with both the current and proposed seams. Source-observed only — fresh founder confirmation of the since-2006 experience claim is required before publication; no years, credentials, outcomes, customers or metrics are invented or amplified. It renders exactly once page-wide because the footer blurb replacement below removes the `Footer.tsx:108` concatenation.

Founder image: `/eitan-yariv.avif`; alt: `איתן יריב, מייסד WAO`. Name: `איתן יריב`. Role: `מייסד WAO, יועץ שיווק ופרסום בגוגל`. Button: **להכיר את איתן** → `/about`.

Partner proof block (existing reference, **publication conditional on fresh directory/status/badge verification**): heading `WAO היא Google Partner`; badge `/google-partner-badge.svg`, alt `תג Google Partner של WAO`; status line `WAO רשומה בספריית השותפים של גוגל כ-Google Partner, עם הסמכות Search ו-Display.`; link **לבדוק בספריית השותפים** → `https://partnersdirectory.withgoogle.com/partners/7030100386`. No endorsement or performance claim is inferred from this reference. If current status cannot be verified, retain the founder/about proof and the directory reference for review rather than presenting an unverified live credential.

## Questions you might ask before reaching out

## שאלות שכדאי לסגור לפני שמתחילים

**כבר יש לי אתר. מה עוד צריך?**

אם האתר שלך מציג נכון את השירות ומאפשר פנייה נוחה, אפשר לבחון פרסום אליו. אם יש פער בין החיפוש של הלקוח למה שהוא רואה באתר, נשקול דף ממוקד. ההחלטה תלויה בעסק שלך ובמה שכבר עובד, לא בחובה לבנות הכול מחדש.

**אני עובד רק באזור מסוים. זה מתאים לי?**

כן, חשוב להתחיל מהיישובים שבהם באמת נוח לך לקחת עבודה ולתת שירות. בפרסום בגוגל מתכננים את אזור הפעילות והמסר סביב השירותים שאתה רוצה לקבל. באתר מציגים את אזור השירות, כדי שלקוח יבין אם אתה מגיע אליו.

**מה אתה צריך ממני כדי להתחיל לדבר?**

ספר לנו מה אתה עושה, איפה אתה עובד ואילו עבודות היית רוצה לקבל. כדאי לספר גם מה מגיע מהמלצות ומה ניסית עד היום בגוגל. זו נקודת פתיחה לשיחה, לא התחייבות להשקיע בתקציב או להתחיל קמפיין.

**הכסף של הפרסום עובר דרך WAO?**

אם תבחר לפרסם, התקציב למדיה בגוגל נפרד מהתשלום על העבודה של WAO. פרטי החשבון, ההרשאות והתנאים צריכים להיות ברורים ומוסכמים לפני פעילות חיה. שיחה או פנייה מהעמוד הזה לא מפעילות פרסום ולא מאשרות חיוב.

**מתי יגיעו פניות?**

זה משתנה לפי השירות, אזור העבודה, התחרות, התקציב ומה שהלקוח רואה בדרך. פרסום יכול להביא תנועה רק אחרי שמחליטים יחד על התנאים ומפעילים אותו. אתר מסודר עוזר ללקוח להבין אותך, אבל לא מבטיח מספר פניות או מועד.

**יש התחייבות או מחיר קבוע?**

כדאי לעבור על היקף העבודה, מחיר השירות ותקציב הפרסום בנפרד לפני החלטה. התנאים תלויים במסלול שתבחר ובהסכמה מפורשת על מה שעושים בפועל. אפשר להתחיל מפנייה על העסק, בלי לייחס לטופס עסקה או תוצאה מובטחת.

**אין לי רקע בשיווק. זה בעיה?**

להפך — בשביל זה אנחנו כאן. אתה איש המקצוע, ואנחנו מטפלים בצד השיווקי. אתה לא צריך ללמוד מקצוע נוסף. בכל מסלול, מה שעושים מסכמים יחד, ואתה נשאר בעניינים לפני כל הפעלה.

[EN|NOT RENDERED] Gap 3 repair: the item immediately above is the proposed new FAQ entry (array index 6) restoring the source topic `src/content/astra-homepage-copy.json#/faq/items[2]`; the question is byte-identical to the source, and the answer keeps the source answer's core byte-exact (`להפך — בשביל זה אנחנו כאן. אתה איש המקצוע, ואנחנו מטפלים בצד השיווקי. אתה לא צריך ללמוד מקצוע נוסף.`), adding only the draft's existing agreement/activation-gate boundary (`בכל מסלול, מה שעושים מסכמים יחד, ואתה נשאר בעניינים לפני כל הפעלה.`). The six items above it are byte-identical v1 carry-forwards preserving the existing-site, service-area, preparation, payment-separation, timing and commitment/terms topics. No guaranteed service, immediate human follow-up or result is implied by a contact request. Implementation is an explicit array addition; `AstraHome.tsx:149-154` maps over the items array, so the entry renders without a renderer change.

## Final conversion

## בוא נדאג שלעבודה הבאה יהיה איך להגיע אליך

ספר לנו איזה בעל מקצוע אתה, איפה אתה עובד ואיזו עבודה תרצה לקבל יותר. נתחיל משיחה על העסק ועל הדרך המתאימה לו, בלי למכור לך עוד משימה.

Primary button: **בוא נדבר על עוד עבודה** → `/contact#contact-form`. The target is an existing contact form, not a booking, live Ads launch or assured human follow-up; real submission/delivery is not verified in this draft.

## Footer conversion and helpful navigation

- Brand `WAO` → `/`; existing phone-reveal control, location `ראשון לציון, ישראל`, privacy `/privacy`, accessibility `/accessibility` and copyright remain, with location/contact accuracy requiring ordinary publication checks.
- Brand blurb, replacing the inherited AI/low-price/experience concatenation at `Footer.tsx:108` (v1 text, byte-identical carry-forward): `בעל מקצוע טוב צריך מקום ברור ברשת, לא עוד עבודה אחרי שעות העבודה. WAO עוזרת לך לחשוב על פרסום בגוגל, אתר לעסק והדרך לפניות שמתאימות לך.` [EN|NOT RENDERED] The `people.intro` experience statement that v1's replacement dropped from this seam is preserved in v2 at its new founder-block location above, so no trust element is removed.
- Services: preserve `קידום אתרים (SEO)` → `/seo`, `פרסום בגוגל` → `/google-ads`, `שיווק תוכן` → `/content`, `יועץ שיווקי` → `/consulting`, `בוט גוגל לעסק שלי` → `/google-business`; replace the dynamic local-detail label with **איך מתחילים עם האתר?** → `/site-bot`; replace the dynamic header CTA label with **בוא נדבר על עוד עבודה** → `/contact#contact-form`.
- Company: preserve `אודות WAO` → `/about`, `הבלוג שלנו` → `/blog`, `צור קשר` → `/contact`.
- Other services: preserve `מערכת "מה עובד" (CRM)` → `/maoved`, `בניית אתרים ו-LP` → `/build`, `מדיה חברתית` → `/social`, `הכשרות שיווק` → `/training` (no automatic CRM/GBP inclusion implied).
- Guides: preserve `מדריך קידום אתרים` → `/seo/guide`, `מדריך שיווק שותפים` → `/training/affiliate-marketing`, `מילון מונחים` → `/glossary`, `כל הקורסים` → `/training`. This draft does not change the general SEO guide's title, H1, canonical, authorship, citations, search intent or educational depth.

## Draft boundary

The new primary action is an invitation to contact, not a promise that the current form, human follow-up, advertising or website production is operational. The current Site-Bot runtime report documents broken static assets, absent audit entry and unverified contact delivery; nothing in this draft represents those pages or any preview as functioning. The two service supporting pages and exact current Partner status require separate verification before an authorized application. Independent material Hebrew/claim review of the exact v2 bytes, strategist whole-page marketing judgment, founder voice approval (including confirmation of the source-observed since-2006 experience line) and later rendered/runtime acceptance remain pending.
