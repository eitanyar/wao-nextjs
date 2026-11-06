# Three-Page Sales Draft v2 — Homepage, /site-bot, /google-ads

- Task: t_11ffeb47 (run 1602), correction Contract 2026-10-14_004 (`handoff/pending/2026-10-14_004_waocopy_correct-three-page-sales.md`)
- Author: waocopy (Tamar), qwen3.8-max via alibaba — same canonical writer, no model fallback. Draft only — nothing applied, nothing published.
- Supersedes: v1 `docs/copy/three-page-sales-draft-2026-10-14.md` (preserved byte-identical) after independent FAIL report `docs/research/three-page-sales-voice-review-2026-10-14.md` (preserved byte-identical).
- Language: Hebrew (he-IL), singular male, native Sabra register. Sentences target 12–15 words; headings/buttons exempt.
- Status gates: independent re-review (waohebrewqa, t_eb0e277f) PENDING; founder review PENDING; SEO gate PENDING for every title/H1 proposal marked below.

---

# PAGE 1 — HOMEPAGE (/)

## 1.1 Metadata (all proposals SEO-gated; current live title not carried over)

- Title tag (PROPOSAL, non-AI, SEO-gated): `שיווק בגוגל לבעלי מקצוע ונותני שירות — נוכחות מקומית ופרסום | WAO`
  - Bidi note: ends with the RLM-anchored `‏ | WAO` suffix per site template rule.
- Meta description (PROPOSAL): `יותר פניות מתאימות מהאזור שלך: אתר ונוכחות מקומית בגוגל, או פרסום מדויק עם מדידת פניות. מתחילים בדוח נוכחות חינם.`
- Open Graph title (PROPOSAL): `שיווק בגוגל לבעלי מקצוע ונותני שירות — WAO`
- Open Graph description (PROPOSAL): `נוכחות מקומית חזקה בגוגל ופרסום שמביא פניות ששווה לענות עליהן. דוח נוכחות ראשון — חינם.`
- Canonical: `https://www.wao.co.il/` (existing).
- OG image: UNRESOLVED — no approved social-share asset found in sources; engineering/strategist to supply (see ledger).

## 1.2 Header (site-wide; desktop + mobile; renders identically on all three pages)

- Logo: `WAO` → `/` (aria-label: `WAO`)
- Primary nav links:
  - `פרסום בגוגל` → `/google-ads`
  - `אתר ונוכחות מקומית` → `/site-bot`
  - `מי אנחנו` → `/about`
- Help link (desktop lg+): `יש שאלה? דבר איתנו` → `/contact#contact-form`
- Header primary CTA (button): `לדוח הנוכחות שלי — חינם` → `/site-bot/audit`
- Mobile menu: same three nav links, then help link, then CTA button. Menu button aria-label: `Menu`.

## 1.3 Hero

- Eyebrow (PROTECTED — byte-exact from source): `שיווק בגוגל לבעלי מקצוע ונותני שירות`
- H1 (PROTECTED — byte-exact, two visual lines):
  - line 1: `יותר לקוחות מגוגל.`
  - line 2: `פחות שיווק על הראש.`
- Body (NEW):
  > יש לך עסק טוב, והלקוחות הכי טובים שלך מגיעים מהמלצות. רק שהמלצות תלויות באחרים. כשמישהו מחפש את השירות שלך באזור שלך, הוא צריך למצוא אותך בגוגל — ולהעדיף אותך. WAO מסדרת את זה: נוכחות מקומית חזקה, או מודעות שמביאות פניות שמתאימות לך. היום שלך חוזר אליך, והשיווק יורד ממך.
- Primary CTA (button): `קבל את הדוח שלי — חינם` → `/site-bot/audit`
- Supporting line (under CTA): `דוח נוכחות בגוגל לעסק שלך, עם התיקונים שאפשר לעשות לבד.`
- Secondary CTA (link): `מעדיף להתחיל מפרסום בגוגל?` → `/google-ads`

## 1.4 Proof — customer video

- Section heading: `סרטון ההמלצות של לקוחות WAO`
- Player: non-autoplay iframe.
  - iframe title (aria): `סרטון המלצות לקוחות WAO ביוטיוב`
  - embed: `https://www.youtube-nocookie.com/embed/zrgqx7OOtcc`
- Direct link (fallback): `לצפות בסרטון ביוטיוב` → `https://www.youtube.com/watch?v=zrgqx7OOtcc` (opens new tab)
- Copy rule honored: no characterization, quotation or description of anyone in the video.

## 1.5 Two paths

- Section heading: `מאיפה יגיע הלקוח הבא שלך?`
- Intro: `שתי דרכים להתחיל. הראשונה מסדרת לעסק נוכחות קבועה בגוגל. השנייה מביאה פניות מאנשים שמחפשים אותך עכשיו. בוחרים את מה שמתאים לך — ואפשר גם את שתיהן יחד.`

- Card A — local presence (featured first, matches free-report front door):
  - Eyebrow: `אתר ונוכחות מקומית`
  - Heading: `שמי שמחפש בעל מקצוע באזור — ימצא אותך`
  - Description: `פרופיל עסקי מסודר בגוגל ואתר ברור עושים את ההבדל בין "מצאתי מישהו" ל"מצאתי אותו". מתחילים בדוח חינם שמראה אילו פרטים של העסק שלך מוצגים בגוגל, וממשיכים בקצב שלך.`
  - Primary CTA: `קבל את הדוח חינם` → `/site-bot/audit`
  - Supporting link: `כל הפרטים על המסלול` → `/site-bot`

- Card B — Google Ads:
  - Eyebrow: `פרסום בגוגל`
  - Heading: `להגיע למי שמחפש את השירות שלך היום`
  - Description: `מודעה מדויקת שמה אותך מול הלקוח ברגע החיפוש. הוא נכנס לדף נחיתה ברור, מבין מה אתה מציע — ומשאיר פנייה. מדידת ההמרות מחוברת לקמפיין, ואתה רואה כמה פניות הגיעו מהמודעות.`
  - Demo status note: `רוצה לראות מודעה לעסק שלך לפני שמחליטים? יש הדגמה — היא פועלת במצב הדגמה, בלי פרסום חי ובלי חיוב.`
  - Primary CTA: `תראה לי מודעה לעסק שלי` → `/google-ads/onboarding`
  - Supporting link: `עוד על ניהול פרסום` → `/google-ads`

- Choosing help:
  - Line: `מתלבט במה להתחיל? ספר לנו על העסק שלך, ונבחר יחד כיוון.`
  - Link: `נדבר על העסק שלי` → `/contact#contact-form`

## 1.6 Lead handling

- Section heading: `ומה עושים עם הפניות?`
- Lines:
  - `הפניות מגיעות אליך ישירות — לטלפון, לוואטסאפ או לטופס.`
  - `רוצה לדעת איזו שיחה הגיעה מאיזו מודעה? יש לנו הרחבת מעקב שיחות מתאימה, בתשלום נפרד.`
  - `ניהול לידים פשוט — הרחבות לפי המסלול, בתשלום נפרד.`
  - `מערכת הלידים שלנו, "מה עובד", מתחילה מ-₪160 לחודש.`
- CTA (link): `פרטים על מערכת הלידים` → `/maoved`
- Asset rule: only real product UI or explicitly labelled demo data; no CRM implied in any entry price.

## 1.7 Method and price logic

- Section heading: `איך זה עובד במחיר שמתאים לעסק קטן?`
- Lines:
  - `את השיטה מובילים אנשי השיווק של WAO, עם ניסיון אמיתי בשטח.`
  - `כלי אוטומציה מתקדמים מבצעים חלק גדול מהמחקר, מהכתיבה ומההקמה.`
  - `ככה מתאפשר מחיר כניסה נמוך, בלי לוותר על המקצועיות.`
- Human seam line (single plain disclosure): `וכל תוצאה עוברת בדיקה אנושית לפני שאתה רואה אותה, וצוות WAO זמין לך בשאלות.`
- Note: zero AI-themed positioning; mechanism explained once, as capability and affordability only. The "not a dedicated personal marketing manager" expectation fact lives in the English ledger (L4), not in repeated customer caveats.

## 1.8 People — founder and Partner proof

- Section heading: `מי עומד מאחורי WAO?`
- Intro: `אנשים אמיתיים, עם ניסיון בשיווק דיגיטלי מאז 2006.`
- Photo: `/eitan-yariv.avif` — alt: `איתן יריב, מייסד WAO` (the only approved real-person photo)
- Name: `איתן יריב`
- Role: `מייסד WAO, יועץ שיווק ופרסום בגוגל`
- Accountability line: `איתן עומד מאחורי הכיוון המקצועי של העבודה ב-WAO.` (no claim of personal oversight of every job)
- About link (button): `להכיר את איתן` → `/about`
- Partner proof block:
  - Heading: `WAO היא Google Partner`
  - Status line: `WAO רשומה בספריית השותפים הרשמית של גוגל כ-Google Partner, עם הסמכות Search ו-Display.`
  - Badge image: `/google-partner-badge.svg` — alt: `תג Google Partner של WAO`
  - Directory link: `לבדוק בספריית השותפים` → `https://partnersdirectory.withgoogle.com/partners/7030100386` (new tab)

## 1.9 FAQ (supporting, not main narrative)

- Section heading: `שאלות שבעלי עסקים שואלים`
- Items:
  1. Q: `יש לי כבר אתר. זה רלוונטי אליי?`
     A: `בהחלט. דוח הנוכחות בודק את ששת שדות המידע של הפרופיל העסקי שלך בגוגל, כולל קישור האתר. ומסלול הפרסום מביא פניות ישירות לאתר שלך, או לדף נחיתה ממוקד.`
  2. Q: `מה צריך להכין לפני שמתחילים?`
     A: `לדוח מספיק שם העסק. את השאר נשלים יחד, בקצב שלך ובגובה העיניים.`
  3. Q: `אין לי רקע בשיווק. זה בעיה?`
     A: `בשביל זה אנחנו כאן. אתה איש המקצוע — ואנחנו מטפלים בצד השיווקי, בשפה פשוטה ובגובה העיניים.`
  4. Q: `מתי יתחילו להגיע פניות?`
     A: `הקצב תלוי בביקוש, בתחרות, בתקציב ובהצעה שלך. אנחנו בונים מדידה שקופה מהיום הראשון, ואתה רואה את הנתונים האמיתיים לאורך כל הדרך.`
  5. Q: `יש התחייבות או חוזה ארוך טווח?`
     A: `את התשובה המלאה תקבל מאיתנו ישירות בשיחה, לפני כל תשלום. חשוב לנו שתדע הכול לפני שאתה מחליט.`

## 1.10 Final CTA

- Heading: `הלקוח הבא שלך כבר מחפש אותך בגוגל. נוודא שהוא ימצא.`
- Body: `הדוח החינמי הוא הצעד הראשון — תמונה ברורה של איך העסק שלך מוצג היום, ומה כדאי לסדר קודם. משם ממשיכים למה שמתאים לך: נוכחות מקומית, פרסום, או שניהם. והשיווק יורד ממך — אתה חוזר להתרכז בעבודה עצמה.`
- Primary CTA: `קבל את הדוח חינם` → `/site-bot/audit`
- Secondary CTA: `מעדיף לדבר עם בן אדם?` → `/contact#contact-form`

## 1.11 Footer (site-wide; renders identically on all three pages)

- Brand: `WAO` → `/`
- Brand blurb: `אנשי שיווק בגוגל לעסקים קטנים, עם ניסיון אמיתי בשטח מאז 2006.`
- Phone (PhoneReveal, source `footer`): reveal button `הצג מספר טלפון`; revealed: `052-614-8860` (tel: `0526148860`); plain tel link on mobile.
- Location: `ראשון לציון, ישראל`
- Column `שירותים`:
  - `קידום אתרים (SEO)` → `/seo`
  - `פרסום בגוגל` → `/google-ads`
  - `שיווק תוכן` → `/content`
  - `יועץ שיווקי` → `/consulting`
  - `בוט גוגל לעסק שלי` → `/google-business`
  - `מה מקבלים ואיך ממשיכים?` → `/site-bot`
  - `תראה לי מודעה לעסק שלי` → `/google-ads/onboarding`
- Column `חברה`:
  - `אודות WAO` → `/about`
  - `הבלוג שלנו` → `/blog`
  - `צור קשר` → `/contact`
- Column `שירותים נוספים`:
  - `מערכת "מה עובד" (CRM)` → `/maoved`
  - `בניית אתרים ו-LP` → `/build`
  - `מדיה חברתית` → `/social`
  - `הכשרות שיווק` → `/training`
- Column `מדריכים וכלים`:
  - `מדריך קידום אתרים` → `/seo/guide`
  - `מדריך שיווק שותפים` → `/training/affiliate-marketing`
  - `מילון מונחים` → `/glossary`
  - `כל הקורסים` → `/training`
- Bottom bar: `© {year} WAO. כל הזכויות שמורות.` + `מדיניות פרטיות` → `/privacy` + `נגישות` → `/accessibility`

---

# PAGE 2 — SITE BOT (/site-bot)

## 2.1 Metadata (proposals SEO-gated)

- Title tag (PROPOSAL, non-AI): `אתר לעסק קטן ונוכחות מקומית בגוגל — יותר פניות מהאזור שלך | WAO`
  - Bidi note: RLM-anchored `‏ | WAO` suffix per template rule.
- Meta description (PROPOSAL): `דוח נוכחות חינם בגוגל לעסק שלך, עם תיקונים שאפשר לעשות לבד. המשך: אתר לעסק קטן ופרופיל עסקי מטופל ב-₪199 לחודש.`
- Open Graph title (PROPOSAL): `אתר לעסק קטן ונוכחות מקומית בגוגל`
- Open Graph description (PROPOSAL): `דוח חינם על איך העסק שלך מוצג בגוגל, תיקונים לעשות לבד, ומסלול מלא של אתר ונוכחות מקומית ב-₪199 לחודש.`
- Canonical: `https://www.wao.co.il/site-bot` (existing).

## 2.2 Header

Identical site-wide header (see 1.2 — renders the same on this page).

## 2.3 Hero

- Badge: `דוח נוכחות מקומית בגוגל — חינם`
- H1 (PROPOSAL, SEO-gated): `העסק שלך טוב. הגיע הזמן שגוגל יראה את זה.`
- Body:
  > כשלקוח מחפש בעל מקצוע באזור שלך, גוגל מציג לו את מה שיש. הדוח שלנו מראה לך בדיוק אילו פרטים של העסק שלך מוצגים היום בגוגל, ונותן לך לתקן לבד — חינם — כל מה שאפשר. מספיק שם העסק כדי להתחיל.
- Primary CTA (button): `קבל את הדוח שלי — חינם` → `/site-bot/audit`
- Supporting line: `הדוח חינם ונשאר שלך, עם התיקונים שאפשר לעשות לבד.`

## 2.4 What the report checks (six available-information fields)

- Section heading: `מה בודקים בדוח?`
- Intro: `הדוח עובר על ששת שדות המידע הגלויים של העסק שלך בגוגל — בדיוק מה שמוצג ללקוח כשהוא מחפש אותך:`
- Items:
  1. `קטגוריות` — `לאילו תחומים העסק שלך משויך בגוגל, והאם הם באמת תואמים את השירות שאתה מציע.`
  2. `שעות פתיחה` — `אילו שעות פתיחה מוצגות ללקוחות, והאם הן מעודכנות.`
  3. `תמונות` — `אילו תמונות של העסק ושל העבודות שלך מוצגות כרגע.`
  4. `טלפון ואתר` — `האם יש פרטי התקשרות מעודכנים, שאפשר להגיע אליהם בלחיצה אחת.`
  5. `ביקורות` — `כמה ביקורות יש לעסק שלך, ומה הציון המוצג.`
  6. `תיאור העסק` — `מה כתוב בתיאור העסק, והאם הוא מספר מה אתה עושה ובאיזה אזור.`
- Honesty line (once, plain): `הדוח מתבסס על מידע גלוי בלבד. מה שאי אפשר לראות מבחוץ — מסומן כלא זמין, ולא מומצא.`
- Boundary honored: no rank-map, no competitor benchmark, no automatic-fix claims, no interpretation of Google's "understanding" or customer choice from this checklist.

## 2.5 Free DIY fixes

- Section heading: `מה מתקנים לבד`
- Body:
  > על כל דבר שאפשר לתקן לבד תקבל הסבר ברור, צעד אחרי צעד: קטגוריות, שעות פתיחה ותמונות. את זה אנחנו נותנים חינם, כי עסק מסודר בגוגל הוא עסק שממליצים עליו — והמלצות זה הכי טוב שיש.
- Note: no CTA button here on purpose; the value stands alone (share loop belongs to the report result screen).

## 2.6 The full path — personalized delivery and retainer

- Section heading: `ואם בא לך שמישהו ירים את זה איתך`
- Intro:
  > יש דברים שקשה לסדר לבד בין עבודה לעבודה: אתר שמציג אותך כמו שצריך, פרופיל עסקי שמטופל כל הזמן, ותוכן שמדבר בשפה של הלקוחות שלך. בשביל זה יש את המסלול המלא של Site Bot.
- What the ₪199/month retainer includes (target offer):
  - `אתר לעסק שלך — השירותים, אזור השירות, וכל מה שהלקוח צריך כדי לבחור בך.`
  - `הפרופיל העסקי בגוגל מטופל ומעודכן, כך שהחיפוש המקומי שלך עובד בשבילך.`
  - `האתר גדל ומתחדש כל חודש לפי העבודה שלך בשטח — עבודות חדשות, שירותים חדשים.`
  - `לקוחות מרוצים מקבלים הזמנה להשאיר ביקורת, והשם שלך מתחזק בגוגל.`
  - `דוח חודשי אחד בשפה פשוטה: אילו פניות הגיעו דרך האתר והפרופיל, ומה חדש באתר.`
- Price line: `המחיר: ₪199 לחודש.`

## 2.7 Build slot — the ₪9.90 commitment

- Section heading: `איך מתחילים בקטן`
- Body:
  > אחרי שקיבלת את הדוח ודיברנו, שומרים לך מקום בנייה ב-₪9.90. עם המקום אתה מקבל אב טיפוס של האתר שלך: השם שלך, התמונות שלך, השירותים שלך. אתה רואה בדיוק לאן הולכים, על החומרים שלך — ואז מחליט. ה-₪9.90 נזקפים לזכות החודש הראשון במסלול המלא.
- Framing rule honored: this is a build-slot deposit credited to month 1, with a personalized mockup — never sold as paying for a preview.

## 2.8 Steps

- Block heading: `אתה מספר על העסק. אנחנו בונים איתך.`
- Steps:
  1. `מקבלים את הדוח החינמי ורואים אילו פרטים של העסק שלך מוצגים בגוגל — ואיפה כדאי לשפר.`
  2. `מתקנים לבד מה שאפשר — עם ההסברים הברורים שבדוח.`
  3. `רוצים יותר? מדברים איתנו ושומרים מקום בנייה ב-₪9.90.`
  4. `האתר שלך עולה לאוויר, והמסלול החודשי ממשיך לטפל בנוכחות שלך בגוגל.`
- Note: no launch-time or duration promises anywhere (see ledger).

## 2.9 Proof

- Founder photo: `/eitan-yariv.avif` — alt: `איתן יריב, מייסד WAO`
- Lines:
  - `את השיטה מוביל איתן יריב, מייסד WAO — יועץ שיווק ופרסום בגוגל, עם ניסיון בשטח מאז 2006.`
  - `WAO רשומה בספריית השותפים הרשמית של גוגל כ-Google Partner, עם הסמכות Search ו-Display.`
- Badge image: `/google-partner-badge.svg` — alt: `תג Google Partner של WAO`
- Directory link: `לבדוק בספריית השותפים` → `https://partnersdirectory.withgoogle.com/partners/7030100386` (new tab)

## 2.10 FAQ

- Eyebrow: `שאלות נפוצות`
- Section heading: `שאלות ששואלים אותנו לפני שמתחילים`
- Items:
  1. Q: `כמה עולה הדוח?`
     A: `חינם. תקבל גם את התיקונים שאפשר לעשות לבד, והדוח נשאר שלך.`
  2. Q: `מה צריך כדי לקבל את הדוח?`
     A: `את שם העסק. אם יש כמה עסקים דומים באזור שלך, נבקש ממך לבחור את שלך מתוך רשימה. זה הכול.`
  3. Q: `מה זה ₪9.90 ולמה צריך אותו?`
     A: `זה מקום בנייה. הוא שומר לך תור ומתחיל עבודה על אב טיפוס של האתר שלך — עם השם, התמונות והשירותים שלך. הסכום נזקף לזכות החודש הראשון במסלול של ₪199 לחודש.`
  4. Q: `מה מקבלים ב-₪199 לחודש?`
     A: `אתר לעסק, טיפול שוטף בפרופיל העסקי בגוגל, חידוש ותוספת תוכן כל חודש, הזמנת ביקורות מלקוחות מרוצים, ודוח חודשי פשוט על הפניות שהגיעו דרך האתר והפרופיל ועל מה חדש באתר.`
  5. Q: `יש לי כבר אתר. זה רלוונטי אליי?`
     A: `כן. הדוח בודק את ששת שדות המידע של הפרופיל העסקי שלך בגוגל, כולל קישור האתר. ואם חשוב לך להגיע למי שמחפש אותך עכשיו — יש גם מסלול פרסום בגוגל.` (link in answer: `ראה את מסלול הפרסום` → `/google-ads`)
  6. Q: `ואם ארצה לעצור — מה קורה לאתר?`
     A: `זאת שאלה חשובה, ותשובה מלאה עליה מקבלים מאיתנו ישירות בשיחה, לפני שמתחילים. חשוב לנו שתדע הכול לפני כל החלטה.`

## 2.11 Cross-link to Ads

- Block (card link): `רוצה להגיע למי שמחפש את השירות שלך בגוגל כבר עכשיו? ראה את מסלול הפרסום.` → `/google-ads`

## 2.12 Final CTA

- Heading: `כשהעסק שלך מסודר בגוגל, הפניות מגיעות אליך`
- Body: `הדוח החינמי הוא הצעד הראשון — הוא מראה לך איפה אתה עומד ומה כדאי לסדר קודם. משם הדרך פתוחה: אתר שמציג אותך כמו שצריך, פרופיל עסקי מטופל, וראש שקט שהשיווק בידיים טובות. ואתה חוזר להתרכז בעבודה עצמה.`
- Primary CTA (button): `קבל את הדוח חינם` → `/site-bot/audit`
- Secondary CTA (outline): `יש לך שאלה? פנה אלינו` → `/contact?ref=site-bot-offer#contact-form`

## 2.13 Footer

Identical site-wide footer (see 1.11 — renders the same on this page).

---

# PAGE 3 — GOOGLE ADS (/google-ads)

## 3.1 Metadata (proposals SEO-gated; legacy ₪1,500 pricing not carried over)

- Title tag (PROPOSAL, non-AI): `ניהול פרסום בגוגל לעסק שלך — החשבון שלך, הפניות אליך | WAO`
  - Bidi note: RLM-anchored `‏ | WAO` suffix per template rule.
- Meta description (PROPOSAL): `ניהול קמפיינים בגוגל בחשבון שבבעלותך, דרך MCC. דמי ניהול ₪249 לחודש; תקציב הפרסום משולם ישירות לגוגל, בנפרד.`
- Open Graph title (PROPOSAL): `ניהול פרסום בגוגל — החשבון שלך נשאר שלך`
- Open Graph description (PROPOSAL): `מודעות מדויקות, דף נחיתה ברור ומדידת פניות. דמי ניהול ₪249 לחודש, תקציב המדיה שלך נפרד.`
- Canonical: `https://www.wao.co.il/google-ads` (existing).

## 3.2 Header

Identical site-wide header (see 1.2 — renders the same on this page).

## 3.3 Hero

- Badge: `החשבון שלך. התקציב שלך. הניהול שלנו.`
- H1 (PROPOSAL, SEO-gated): `פרסום בגוגל שמביא פניות ששווה לך לענות עליהן`
- Body:
  > כל יום מישהו באזור שלך מחפש בגוגל את השירות שלך. אנחנו בונים מודעה מדויקת ודף נחיתה ברור, ומחברים מדידת פניות עם GA4 ו-Google Tag Manager — כך שאתה רואה כמה פניות הגיעו מהמודעות ומה עלתה כל פנייה. חשבון הפרסום ופרופיל התשלומים נשארים שלך, לאורך כל הדרך.
- Primary CTA: PhoneReveal button — pre-reveal label: `דבר איתנו על העסק שלך`; revealed: `052-614-8860` (tel: `0526148860`); mobile: plain tel link. (source key: `google-ads-hero`; label is a PROPOSAL — no consultation duration or "free consultation" framing asserted)
- Secondary CTA (outline): `רוצה לראות מודעה לעסק שלך? יש הדגמה` → `/google-ads/onboarding`
- Demo note (under secondary): `ההדגמה פועלת במצב הדגמה — בלי פרסום חי ובלי חיוב.`

## 3.4 Demo proof block (supporting, below the invitation)

- Section heading: `תראה איך זה נראה על העסק שלך`
- Explain lines:
  - `מספר לנו מה אתה עושה, באיזה אזור ואיזה לקוחות אתה רוצה.`
  - `אנחנו מחדדים את ההצעה שלך ובונים מודעה ודף נחיתה תואמים.`
  - `אתה רואה את הכיוון על העסק שלך, לפני כל החלטה.`
- Demo label (visible on the demonstration asset): `הדגמה: עסק בדיוני עם מודעה ודף נחיתה תואמים. לא לקוח אמיתי ולא תוצאה אמיתית.`
- CTA (slang encouragement — the single permitted instance site-wide): `יאללה, תראה לי` → `/google-ads/onboarding`
- Asset rule: clean UI demonstration only; never fabricated screenshots, leads, rankings or results.

## 3.5 How we work — five steps

- Eyebrow: `כך ניגשים לחשבון שלך`
- Section heading: `חמישה צעדים שמביאים פניות אמיתיות לטלפון שלך`
- Steps:
  1. Number `01` — Title: `מתחילים מהכרות עם העסק`
     Desc: `לומדים מה אתה מוכר, מי הלקוחות הטובים שלך ובאיזה אזור אתה עובד. מגדירים יחד מה נחשבת פנייה אמיתית בשבילך — שיחה, וואטסאפ או טופס. אם כבר יש לך קמפיינים, לומדים גם מהם.`
  2. Number `02` — Title: `מפרסמים במקום שבו הלקוח מחפש`
     Desc: `מודעת חיפוש פוגשת את הלקוח ברגע שהוא מחפש את השירות שלך. כשזה מתאים לעסק ולתקציב, נוסיף גם ערוצים נוספים של גוגל.`
  3. Number `03` — Title: `מחברים מדידת פניות`
     Desc: `מעקב המרות עם GA4 ו-Google Tag Manager מראה כמה פניות הגיעו מהקמפיינים ומה עלתה כל פנייה. הנתונים האלה מוצגים לך בשקיפות מלאה.`
  4. Number `04` — Title: `משפרים לפי הנתונים שלך`
     Desc: `בודקים איזה ניסוח מדבר ללקוחות שלך ומביא יותר פניות, ומכוונים את הקמפיינים לפי המספרים האמיתיים של החשבון שלך.`
  5. Number `05` — Title: `הכול שקוף לך, תמיד`
     Desc: `החשבון רשום על שמך, ואתה יכול להיכנס ולראות הוצאה וביצועים בכל רגע. אנחנו מנהלים דרך MCC בהרשאת ניהול — הבעלות נשארת אצלך.`
- Note: legacy English jargon tag chips (ROAS/CPA/Smart Bidding etc.) intentionally dropped; entities kept in plain Hebrew. Every step is written affirmatively — no contrast/negation scaffolding.

## 3.6 What you actually get

- Eyebrow: `מה עושים בפועל`
- Section heading: `ניהול קמפיינים בגוגל — בחשבון שלך`
- Items (benefit-led titles):
  1. `🔬 בדיקת חשבון לפני שקל ראשון` — `בודקים את מבנה הקמפיינים ואת מדידת ההמרות לפני כל החלטה על תקציב. יש גם הגנה מפני הונאת קליקים.`
  2. `🎯 קמפיינים לפי העסק שלך` — `מתאימים את סוג הקמפיין לחיפוש, למטרה ולתקציב שלך, ומקימים כל שלב בבדיקה ובהסכמה שלך.`
  3. `✍️ מודעות שמדברות ללקוח הנכון` — `כל מודעה עונה על מה שהלקוח חיפש באותו רגע, ובוחנים ניסוחים לפי הפניות שהם מביאים.`
  4. `📊 מעקב פניות עם GA4 ו-GTM` — `אתה רואה כמה פניות הגיעו מהמודעות ומה עלתה כל פנייה, לצד ההוצאה החודשית.`
  5. `📈 תמונת מצב חודשית בשפה פשוטה` — `מה הוצאנו, כמה פניות הגיעו ואיך הן התחלקו בין הקמפיינים — הכול בשפה ברורה ובגובה העיניים.`
  6. `🔑 הבעלות נשארת אצלך` — `חשבון Google Ads ופרופיל התשלומים רשומים על שמך, ואתה יכול לראות הכול בעצמך בכל רגע. WAO מנהלת דרך MCC בהרשאת ניהול.`

## 3.7 Pricing

- Section heading: `כמה זה עולה, ובדיוק על מה משלמים`
- Lines:
  - `דמי ניהול: ₪249 לחודש.`
  - `תקציב הפרסום: משולם ישירות לגוגל, בנפרד מדמי הניהול. אתה מחליט כמה להשקיע כל חודש.`
  - `החשבון ופרופיל התשלומים רשומים על שמך — ההוצאה על מודעות שקופה לך בזמן אמת.`
- Note: no VAT treatment, no cancellation/exit terms, no free-month, no guarantee, no "all-inclusive"/"all you pay us" claim — deliberately unstated (see ledger).

## 3.8 Who this fits

- Section heading: `למי זה מתאים?`
- Body:
  > אתה בעל מקצוע עצמאי, והעבודה שלך מגיעה בעיקר מהמלצות. עכשיו אפשר להוסיף להן מקור קבוע: אנשים באזור שלך שמחפשים בגוגל את השירות שלך — ומוצאים אותך. כשהמודעה מדויקת ואתה רואה לאן כל שקל הולך, הפרסום בגוגל עובד בשביל עסק כמו שלך.
- CTA (link): `דבר איתנו על העסק שלך` → `/contact#contact-form`

## 3.9 FAQ

- Eyebrow: `שאלות נפוצות`
- Section heading: `כל מה שכדאי לדעת על פרסום בגוגל`
- Items:
  1. Q: `כמה עולה ניהול קמפיינים בגוגל, ומי משלם על המודעות?`
     A: `דמי הניהול הם ₪249 לחודש. תקציב המדיה נפרד ומשולם ישירות לגוגל, על ידך. חשבון Google Ads ופרופיל התשלומים בבעלותך, ו-WAO מנהלת דרך MCC.`
  2. Q: `מה ההבדל בין פרסום בגוגל לבין קידום אורגני?`
     A: `בפרסום ממומן אתה משלם על תנועה מהמודעות, והיא תלויה בתקציב. קידום אורגני גדל בהדרגה ומביא חשיפה לאורך זמן. בוחרים ערוץ לפי העסק שלך ומה שמתאים לו עכשיו.`
  3. Q: `איך יודעים אם הפרסום בגוגל מביא פניות אמיתיות?`
     A: `מחברים מעקב המרות עם GA4 ו-Google Tag Manager, ואתה רואה כמה פניות הגיעו מהמודעות ומה עלתה כל פנייה. המדידה שקופה ומלווה את הקמפיין מהיום הראשון.`
  4. Q: `האם ההדגמה מפרסמת את העסק שלי בפועל?`
     A: `ההדגמה פועלת במצב הדגמה: אתה רואה מודעה ודף נחיתה לעסק שלך, בלי פרסום חי ובלי חיוב. פרסום אמיתי יוצא לדרך רק כשתחליט, אחרי הקמה מלאה של מעקב וקמפיין.`
  5. Q: `איך זה עובד מול גוגל מבחינת בעלות?`
     A: `חשבון Google Ads ופרופיל התשלומים נשארים בבעלותך; WAO פועלת דרך MCC בהרשאת ניהול. תקציב הפרסום משולם ישירות לגוגל, בנפרד מדמי הניהול.`

## 3.10 Final CTA

- Eyebrow: `הצעד הבא שלך מתחיל בשיחה אחת`
- Heading: `בוא נדבר על העסק שלך — ונראה יחד לאן הפרסום יכול להגיע`
- Body: `בשיחה קצרה נכיר את העסק שלך ונבין מה חשוב לך למדוד. תצא עם כיוון ברור — גם אם נבין יחד שהפרסום עוד לא הצעד הבא שלך, תקבל תשובה כנה.`
- Primary CTA: PhoneReveal button (source key `google-ads-bottom-cta`) — pre-reveal label: `הצג מספר טלפון`; revealed: `052-614-8860` (tel: `0526148860`); mobile: plain tel link.
- Secondary CTA (outline): `מעדיף לראות קודם הדגמה?` → `/google-ads/onboarding`
- Trust microcopy line: `✓ החשבון שלך נשאר שלך · ✓ דמי ניהול ₪249 לחודש · ✓ תקציב המדיה משולם ישירות לגוגל`

## 3.11 Footer

Identical site-wide footer (see 1.11 — renders the same on this page).

---

# LINE-MAPPED RESOLUTION OF ALL 9 REVIEW FINDINGS

Source of findings: `docs/research/three-page-sales-voice-review-2026-10-14.md` (v1 line references).

| # | v1 defect (v1 lines) | v2 resolution (v2 sections) |
|---|---|---|
| F1 | Prohibited contrast/negation scaffolding on Ads page (v1:326, 328–337, 345–350, 365) + stacked reassurance "בלי/לא" (v1:96, 123, 125, 190, 210, 258) | Ads 5-steps (3.5) and get-list (3.6) fully rewritten affirmative: no "לא מהתקציב/לא לפי קליקים/לא מתחושת בטן/לא הבטחות/לא בעלות/לא מה שלא בדקנו"; ownership stated affirmatively ("בהרשאת ניהול — הבעלות נשארת אצלך"). 3.8 rewritten without "אבל זה לא תלוי בך/לא הצדיקו". Reassurance stacks removed: 1.7 human-seam line is one plain affirmative disclosure ("וצוות WAO זמין לך בשאלות", no "לא מנהל אישי צמוד" sentence); FAQ 1.9#3 answer without "אתה לא צריך ללמוד"; FAQ 1.9#4 without "אף אחד לא יכול להבטיח"; 2.3 supporting line without "בלי חיוב ובלי התחייבות"; 2.5 body without the triple "בלי" stack; 2.10#1 without "בלי אותיות קטנות". Only remaining "בלי" pair is the mandatory demo-mode disclosure (1.5 card B, 3.3, 3.9#4), which the review recorded as positive evidence. |
| F2 | Total per-inquiry/call attribution (v1:69, 307, 332–333, 348); retainer digest promising call-source reporting (v1:223, 264) vs separately priced extensions (v1:83–85) | All attribution narrowed to the established GA4+GTM conversion-tracking capability: 1.5 card B ("מדידת ההמרות מחוברת לקמפיין, ואתה רואה כמה פניות הגיעו מהמודעות"), 3.3 hero, 3.5 step 3, 3.6#4, 3.9#3 — count of inquiries from campaigns + cost per inquiry; no "every call linked to its ad" claim. Retainer digest bounded to VISION-documented content (leads + new pages): 2.6#5 and 2.10#4 ("אילו פניות הגיעו דרך האתר והפרופיל, ומה חדש באתר"). Call-level tracking kept explicitly as a separately priced extension (1.6). |
| F3 | Report described as "whole picture"/conclusive on visibility & Google's understanding (v1:119, 195–202, 266) | Report consistently described as a six available-information-fields checklist of publicly displayed data: 2.4 intro + six bounded field descriptions (what categories/hours/photos/phone+website/reviews/description are displayed), unknown-as-first-class honesty line retained (2.4), boundary note added (no rank/visibility/customer-choice interpretation). 1.9#1 and 2.10#5 answers changed from "כל התמונה בגוגל" to "ששת שדות המידע של הפרופיל העסקי, כולל קישור האתר". 2.3 hero body says "אילו פרטים... מוצגים", 2.8 step 1 says "אילו פרטים... מוצגים". |
| F4 | "הכול כלול"/"זה כל מה שמשלמים לנו" (v1:224, 356); asserting documented terms while cancellation/site-fate unresolved (v1:127, 268, 382) | 2.6 price line reduced to `המחיר: ₪199 לחודש.` — no all-inclusive claim. 3.7 states only the approved management price + media paid separately to Google; the "כל מה שמשלמים לנו" sentence removed and 3.10 trust line rebuilt from verified facts only. Terms assertions removed: 1.9#5 and 2.10#6 now promise a direct honest answer in conversation before any payment (no claim that terms-of-use already document cancellation/site-fate); 3.9#5 keeps ownership/MCC/media facts only, terms-of-use pointer dropped. |
| F5 | Unverified "free 30-minute consultation" inherited from source (v1:308, 387–391) | Removed everywhere. 3.3 primary CTA is now `דבר איתנו על העסק שלך` (phone contact only — the number is confirmed present operation). 3.10 heading/body sell an honest short conversation with a clear direction, no duration and no "ייעוץ חינם" framing; trust microcopy replaced with three verified facts (account ownership, ₪249 management, media paid to Google). |
| F6 | All free-report CTAs routed to legacy paid-trial intake `/site-bot/start` (v1:30, 41, 63, 133, 189, 278) | Every report CTA now targets `/site-bot/audit` (1.2 header, 1.3 hero, 1.5 card A, 1.10 final, 2.3 hero, 2.12 final — six destinations, all changed). Ledger L8 records that publication stays blocked until engineering confirms `/site-bot/audit` serves the free ungated report-first flow; `/site-bot/start` appears nowhere in v2 customer copy. |
| F7 | "לוקח כמה דקות" duration promise (v1:277) vs ledger's no-timeline unknown (v1:451) | Duration claim removed; 2.12 body describes the report as "הצעד הראשון" with no timing. All "עוד היום" immediacy claims also removed from report/DIY copy (1.3 supporting line, 2.1 meta description, 2.5 heading). No timing promise remains anywhere in v2. |
| F8 | Closes sold the report/check as the dream (v1:131, 276) | 1.10 heading now `הלקוח הבא שלך כבר מחפש אותך בגוגל. נוודא שהוא ימצא.` and body ends on marketing overhead lifting and returning to the work itself. 2.12 heading now `כשהעסק שלך מסודר בגוגל, הפניות מגיעות אליך` with the close anchored in a proper site, a cared-for profile, quiet headspace and worthwhile work — the report appears only as the first useful step. |
| F9 | Melodramatic "קם לתחייה" website metaphor (v1:240) | 2.8 step 4 now plain and specific: `האתר שלך עולה לאוויר, והמסלול החודשי ממשיך לטפל בנוכחות שלך בגוגל.` — no metaphor, no claim that the recurring work is already operational (ledger L4 keeps it as target offer). |

---

# ENGLISH LEDGER — claims, sources, gates (v2)

## L1. Provenance

- Authored by waocopy (Qwen 3.8 Max via alibaba provider), kanban task t_11ffeb47, run 1602, 2026-10-14, under correction contract `handoff/pending/2026-10-14_004_waocopy_correct-three-page-sales.md`. No model fallback. Single Markdown packet; no JSON produced (not requested). v1 draft and v1 review report preserved byte-identical; nothing applied to source.
- Source anchors reused from v1's collected inventory (contract forbids research rerun): `VISION.md:30-69,169-195`; `docs/missions/site-bot-single-segment-pivot-2026-08-21.md:164-186`; `docs/research/site-bot/010_audit-first-wedge-build-plan.md:65-98`; renderer/content files listed in the v1 ledger (AstraHome/AstraProofVideo/astra-homepage-copy.json/site-bot page/google-ads page/Header/Footer/PhoneReveal). No legacy draft packets read.

## L2. Protected keys (byte-exact in v2)

- Homepage hero eyebrow: `שיווק בגוגל לבעלי מקצוע ונותני שירות` — from `astra-homepage-copy.json#/hero/eyebrow`.
- Homepage H1 line 1: `יותר לקוחות מגוגל.` / line 2: `פחות שיווק על הראש.` — from `astra-homepage-copy.json#/hero/h1_line1,h1_line2`.
- All new titles/H1s across the three pages are PROPOSALS, explicitly SEO-gated. No AI-themed metadata/OG/footer/positioning anywhere; AI appears only in this English ledger.

## L3. Dream anchor per contract

- Every close sells worthwhile work, suitable inquiries, control of the day and less marketing overhead. The free report and the Ads demo are positioned strictly as entry/proof steps, never as the payoff (F8 resolution).

## L4. Target offer vs actual present operation

| Item | Target offer (v2 copy) | Actual present operation (evidence status) |
|---|---|---|
| Site Bot pricing | ₪199/month retainer (2.6, 2.10#3-4) | VISION.md:35/40 + pivot:164-167 lock ₪199 as the approved target; live `/site-bot` page still sells the excluded ₪1,490 package and has not been updated. Recurring bundle delivery (page growth, GBP upkeep, digest) is design-stage — NOT verified live. |
| Retainer digest content | Leads through site/profile + what's new on the site (2.6#5, 2.10#4) | Matches VISION.md:35 documented digest (leads + new pages). Call-source reporting is NOT claimed; call tracking stays a separately priced extension (1.6). |
| ₪9.90 | Build-slot deposit credited to month 1 + personalized mockup (2.7, 2.10#3) | Pivot:173-180 framing correction (Eitan's own catch). Live page still frames ₪9.90 as paid trial of a live homepage — superseded framing; page not yet updated. |
| Free report funnel | Free ungated six-field report at `/site-bot/audit` + free DIY fixes for categories/hours/photos | Audit-first wedge is a v0 build plan (`010_audit-first-wedge-build-plan.md`); whether `/site-bot/audit` is live and serves the report-first flow is UNVERIFIED — publication blocked until engineering confirms (L6). |
| Ads pricing | ₪249/month management; media client-paid direct to Google (3.3-3.10) | VISION.md:37/177 documents ₪249 as target (Ads Bot is product #3, deferred). VISION.md:175-176 documents ₪9.90 setup + free management month 1 — NOT included in copy (contract forbids inventing free-month; stage unconfirmed). Live `/google-ads` still advertises "from ₪1,500/month". |
| Ads tracking claim | GA4 + GTM conversion tracking: inquiry counts from campaigns and cost per inquiry (3.3, 3.5#3, 3.6#4) | Standard capability described as the setup performed for the client's account; per-call attribution explicitly sold only as a separate extension (1.6), consistent with evidence limits (F2 resolution). |
| Ads demo | Labelled demo mode at every appearance (1.5 card B, 3.3, 3.4, 3.9#4) | Onboarding preview runs in DEMO/sandbox mode (live locked) per `astra-homepage-copy.json` truth constraints; v2 labels it visibly and never implies live activation. |
| Phone consultation | Plain phone contact CTA only; no duration, no "free consultation" label (3.3, 3.10) | Phone `052-614-8860` is present current operation (PhoneReveal, live page). The inherited "free 30-minute consultation" offer was REMOVED per F5 — inherited source prose is not operational proof. |
| Expectation fact (not in copy) | — | The service is a bot-led pipeline with human review, not a dedicated personal marketing manager; stated once in the 1.7 mechanism framing (automation + human check + team availability) and recorded here instead of repeated customer caveats, per strategist instruction. |

## L5. Proof assets retained (all source-backed)

- Customer recommendations video (YouTube `zrgqx7OOtcc`, nocookie embed + direct link); no content characterization.
- Founder: Eitan Yariv, approved photo `/eitan-yariv.avif` only; accountability limited to professional direction — no personal-oversight-of-every-job claim.
- "Experience since 2006" — from `astra-homepage-copy.json#/people/intro`; publication revalidation pending.
- Google Partner directory listing + Search/Display certifications — directory observation only; badge `/google-partner-badge.svg`; publication revalidation pending.
- Maoved CRM "from ₪160/month" as optional paid extension (1.6 only).
- Phone `052-614-8860` via PhoneReveal; location Rishon LeZion.
- No new testimonial, statistic, ROI/CPA/ROAS number, or oversight claim added in v2.

## L6. CTA destination flags for engineering (internal, do not render)

- `/site-bot/audit` — ALL six free-report CTAs now point here (F6). Publication is BLOCKED until engineering confirms this route exists publicly and serves the free ungated report-first intake; v1's mismatch (`/site-bot/start` serving legacy ₪9.90 trial intake) must not resurface.
- `/google-ads/onboarding` — demo-mode preview; labelled as demo everywhere it appears; live activation locked.
- Header/Footer nav CTA labels are read from `astra-homepage-copy.json` — applying v2 requires coordinated content-file changes (engineer scope, not this draft).
- `/contact?ref=site-bot-offer#contact-form` retained from live page for the Site Bot secondary CTA.

## L7. Unknown commercial facts (NOT invented in copy; unchanged from v1 unless noted)

- VAT treatment of ₪199/₪249/₪9.90; cancellation/exit terms — including any "no long-term contract" assurance for Ads — and the client site's fate on cancel (parked open item, pivot:182-186; v2 FAQs answer in conversation instead of asserting documented terms, per F4); delivery or inquiry timing claims (none made; all duration wording removed per F7); first-month terms for Ads (VISION documents ₪0 management month 1 — excluded pending confirmation); whether the free-report flow is live at `/site-bot/audit` (L6); current availability of online checkout; relationship between the standalone ₪149 Google Business service and GBP upkeep inside the ₪199 retainer; OG share image asset; Fraud/click-protection tooling ("הגנה מפני הונאת קליקים" kept generic — vendor claim needs revalidation).

## L8. Deliberate exclusions carried from v1

- STATS block (ROI/CPA/ROAS numbers) — ungrounded even though attributed in source.
- Legacy ₪1,490 package, "24-hour launch", "chat editing forever", "no long-term contract" Ads assurance, domain/hosting-registration claims.
- All AI-themed elements (current homepage title, mechanism_line, ai_search section, any AI word in metadata/OG/footer).
- Three-way comparison framework; English jargon tag chips; ₪149 Google Business extension mention.

## L9. Pending gates

- Independent re-review of THIS exact v2 by the existing sole-parent reviewer card t_eb0e277f (waohebrewqa) — explicitly requested; NOT done. This packet is authoring-complete only.
- Founder review with full copy in chat — pending, after internal gate.
- SEO gate on every title/H1 proposal marked above — pending.
- Publication revalidation of years-since-2006 and Google Partner/certification claims — pending.
- Engineering confirmation of `/site-bot/audit` readiness — publication-blocking (L6).
- Nothing in this packet was applied to source, published, committed or deployed.
