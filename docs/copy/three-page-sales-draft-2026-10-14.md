# Three-Page Sales Draft — Homepage, /site-bot, /google-ads

- Task: t_11ffeb47 (run 1600), Contract 2026-10-14_002 (`handoff/pending/2026-10-14_002_waocopy_three-page-sales-draft.md`)
- Author: waocopy (Tamar), qwen3.8-max via alibaba. Draft only — nothing applied, nothing published.
- Language: Hebrew (he-IL), singular male, native Sabra register. Sentences target 12–15 words; headings/buttons exempt.
- Status gates: independent full-page review PENDING; founder review PENDING; SEO gate PENDING for every title/H1 proposal marked below.

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

## 1.2 Header (site-wide; desktop + mobile)

- Logo: `WAO` → `/` (aria-label: `WAO`)
- Primary nav links:
  - `פרסום בגוגל` → `/google-ads`
  - `אתר ונוכחות מקומית` → `/site-bot`
  - `מי אנחנו` → `/about`
- Help link (desktop lg+): `יש שאלה? דבר איתנו` → `/contact#contact-form`
- Header primary CTA (button): `לדוח הנוכחות שלי — חינם` → `/site-bot/start`
- Mobile menu: same three nav links, then help link, then CTA button. Menu button aria-label: `Menu`.

## 1.3 Hero

- Eyebrow (PROTECTED — byte-exact from source): `שיווק בגוגל לבעלי מקצוע ונותני שירות`
- H1 (PROTECTED — byte-exact, two visual lines):
  - line 1: `יותר לקוחות מגוגל.`
  - line 2: `פחות שיווק על הראש.`
- Body (NEW):
  > יש לך עסק טוב, והלקוחות הכי טובים שלך מגיעים מהמלצות. רק שהמלצות לא תלויות בך. כשמישהו מחפש את השירות שלך באזור שלך, הוא צריך למצוא אותך בגוגל — ולהעדיף אותך. WAO מסדרת את זה: נוכחות מקומית חזקה, או מודעות שמביאות פניות שמתאימות לך. היום שלך חוזר אליך, והשיווק יורד ממך.
- Primary CTA (button): `קבל את הדוח שלי — חינם` → `/site-bot/start`
- Supporting line (under CTA): `דוח נוכחות בגוגל לעסק שלך, עם התיקונים שאפשר לעשות לבד היום.`
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
- Intro: `שתי דרכים להתחיל, ואפשר לבחור רק אחת. הראשונה מסדרת לעסק נוכחות קבועה בגוגל. השנייה מביאה פניות מאנשים שמחפשים אותך עכשיו.`

- Card A — local presence (featured first, matches free-report front door):
  - Eyebrow: `אתר ונוכחות מקומית`
  - Heading: `שמי שמחפש בעל מקצוע באזור — ימצא אותך`
  - Description: `פרופיל עסקי מסודר בגוגל ואתר ברור עושים את ההבדל בין "מצאתי מישהו" ל"מצאתי אותו". מתחילים בדוח חינם שבודק איך העסק שלך נראה היום בגוגל, וממשיכים בקצב שלך.`
  - Primary CTA: `קבל את הדוח חינם` → `/site-bot/start`
  - Supporting link: `כל הפרטים על המסלול` → `/site-bot`

- Card B — Google Ads:
  - Eyebrow: `פרסום בגוגל`
  - Heading: `להגיע למי שמחפש את השירות שלך היום`
  - Description: `מודעה מדויקת שמה אותך מול הלקוח ברגע החיפוש. הוא נכנס לדף נחיתה ברור, מבין מה אתה מציע — ומשאיר פנייה. כל פנייה מקושרת למודעה שהביאה אותה.`
  - Demo status note: `רוצה לראות מודעה לעסק שלך לפני שמחליטים? ההדגמה פועלת במצב הדגמה — בלי פרסום חי ובלי חיוב.`
  - Primary CTA: `תראה לי מודעה לעסק שלי` → `/google-ads/onboarding`
  - Supporting link: `עוד על ניהול פרסום` → `/google-ads`

- Choosing help:
  - Line: `מתלבט במה להתחיל? ספר לנו על העסק שלך, ונבחר יחד כיוון.`
  - Link: `נדבר על העסק שלי` → `/contact#contact-form`

## 1.6 Lead handling

- Section heading: `ומה קורה כשהטלפון מתחיל לצלצל?`
- Lines:
  - `הפניות מגיעות אליך ישירות — לטלפון, לוואטסאפ או לטופס.`
  - `רוצה לדעת איזו מודעה הביאה כל שיחה? יש לנו הרחבה מתאימה.`
  - `מעקב שיחות וניהול לידים פשוט — הרחבות לפי המסלול, בתשלום נפרד.`
  - `מערכת הלידים שלנו, "מה עובד", מתחילה מ-₪160 לחודש.`
- CTA (link): `פרטים על מערכת הלידים` → `/maoved`
- Asset rule: only real product UI or explicitly labelled demo data; no CRM implied in any entry price.

## 1.7 Method and price logic

- Section heading: `איך זה עובד במחיר שמתאים לעסק קטן?`
- Lines:
  - `את השיטה מובילים אנשי השיווק של WAO, עם ניסיון אמיתי בשטח.`
  - `כלי אוטומציה מתקדמים מבצעים חלק גדול מהמחקר, מהכתיבה ומההקמה.`
  - `ככה מתאפשר מחיר כניסה נמוך, בלי לוותר על המקצועיות.`
- Human seam line (single plain disclosure): `התוצאה עוברת בדיקה אנושית לפני שאתה רואה אותה, וצוות WAO זמין בשאלות. חשוב שתדע: זה לא מנהל שיווק אישי צמוד.`
- Note: zero AI-themed positioning; mechanism explained once, as capability and affordability only.

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
     A: `בהחלט. דוח הנוכחות בודק את כל התמונה בגוגל, כולל האתר שיש לך. ומסלול הפרסום מביא פניות ישירות לאתר שלך, או לדף נחיתה ממוקד.`
  2. Q: `מה צריך להכין לפני שמתחילים?`
     A: `לדוח מספיק שם העסק והעיר. את השאר נשלים יחד, בקצב שלך ובלי מונחים מקצועיים.`
  3. Q: `אין לי רקע בשיווק. זה בעיה?`
     A: `להפך — בשביל זה אנחנו כאן. אתה איש המקצוע, ואנחנו מטפלים בצד השיווקי. אתה לא צריך ללמוד מקצוע נוסף.`
  4. Q: `מתי יתחילו להגיע פניות?`
     A: `זה תלוי בביקוש, בתחרות, בתקציב ובהצעה שלך. במודעות — הקצב תלוי בחשיפה. בנוכחות אורגנית — זה גדל בהדרגה, לא בן לילה. אף אחד לא יכול להבטיח לך מספר פניות מראש, ואנחנו לא מבטיחים.`
  5. Q: `יש התחייבות או חוזה ארוך טווח?`
     A: `התנאים המעודכנים מופיעים בדף כל שירות ובתנאי השימוש. כדאי לקרוא אותם לפני שאתה מאשר תשלום, ושאלות תמיד אפשר לשאול אותנו ישירות.`

## 1.10 Final CTA

- Heading: `בוא נראה איך העסק שלך נראה בגוגל היום.`
- Body: `מתחילים בדוח חינם, ורואים בדיוק איפה אתה עומד ומה כדאי לסדר קודם. משם ממשיכים רק למה שמתאים לך — נוכחות מקומית, פרסום, או שניהם.`
- Primary CTA: `קבל את הדוח חינם` → `/site-bot/start`
- Secondary CTA: `מעדיף לדבר עם בן אדם?` → `/contact#contact-form`

## 1.11 Footer (site-wide, all three pages render it identically)

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

- Title tag (PROPOSAL, non-AI): `אתר לעסק קטן ונוכחות מקומית בגוגל — מתחילים בדוח חינם | WAO`
  - Bidi note: RLM-anchored `‏ | WAO` suffix per template rule.
- Meta description (PROPOSAL): `דוח נוכחות חינם בגוגל לעסק שלך, עם תיקונים שאפשר לעשות לבד היום. המשך: אתר לעסק קטן ופרופיל עסקי מטופל ב-₪199 לחודש.`
- Open Graph title (PROPOSAL): `אתר לעסק קטן ונוכחות מקומית בגוגל — מתחילים בדוח חינם`
- Open Graph description (PROPOSAL): `דוח חינם על איך העסק שלך נראה בגוגל, תיקונים לעשות לבד, ומסלול מלא של אתר ונוכחות מקומית ב-₪199 לחודש.`
- Canonical: `https://www.wao.co.il/site-bot` (existing).

## 2.2 Header

Identical site-wide header (see 1.2 — renders the same on this page).

## 2.3 Hero

- Badge: `דוח נוכחות מקומית בגוגל — חינם`
- H1 (PROPOSAL, SEO-gated): `העסק שלך טוב. הגיע הזמן שגוגל יראה את זה.`
- Body:
  > כשלקוח מחפש בעל מקצוע באזור שלך, הוא בוחר לפי מה שגוגל מראה לו. הדוח שלנו בודק מה גוגל מראה עליך היום, ונותן לך לתקן לבד — חינם — את כל מה שאפשר. בלי הרשמה מורכבת: מספיק שם העסק.
- Primary CTA (button): `קבל את הדוח שלי — חינם` → `/site-bot/start`
- Supporting line: `הדוח חינם ונשאר שלך, עם התיקונים שאפשר לעשות לבד. בלי חיוב ובלי התחייבות.`

## 2.4 What the report checks (six dimensions)

- Section heading: `מה בודקים בדוח?`
- Intro: `שש נקודות, בדיוק מה שהלקוח שלך רואה כשהוא מחפש אותך בגוגל:`
- Items:
  1. `קטגוריות` — `האם העסק שלך משויך לתחומים הנכונים, כך שחיפוש רלוונטי באמת ימצא אותך.`
  2. `שעות פתיחה` — `האם הלקוחות רואים מתי אתה באמת זמין — ולא מגיעים לדלת סגורה.`
  3. `תמונות` — `האם יש לעסק שלך פנים: העבודות שלך, התוצאות שלך, אתה.`
  4. `טלפון ואתר` — `האם אפשר להגיע אליך בלחיצה אחת, בלי לחפש מספר או לנחש כתובת.`
  5. `ביקורות` — `מה לקוחות אומרים עליך, וכמה מהם בכלל טרחו לכתוב.`
  6. `תיאור העסק` — `האם גוגל מבין מה אתה עושה, ובאיזה אזור אתה עובד.`
- Honesty line (once, plain): `הדוח מתבסס על מידע גלוי בלבד. מה שאי אפשר לראות מבחוץ — מסומן ככזה, ולא מומצא.`
- Boundary honored: no rank-map, no competitor benchmark, no automatic-fix claims from this check.

## 2.5 Free DIY fixes

- Section heading: `מה מתקנים לבד — עוד היום`
- Body:
  > על כל דבר שאפשר לתקן לבד תקבל הסבר ברור, צעד אחרי צעד: קטגוריות, שעות פתיחה ותמונות. בלי לשלם, בלי לחכות לאף אחד ובלי ידע קודם. את זה אנחנו נותנים חינם, כי עסק שמסודר בגוגל הוא עסק שממליצים עליו — וממליצים זה הכי טוב שיש.
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
  - `דוח חודשי אחד בשפה פשוטה: מי התקשר, מאיפה הגיעו הפניות, ומה חדש באתר.`
- Price line: `₪199 לחודש. מחיר אחד, הכול כלול.`

## 2.7 Build slot — the ₪9.90 commitment

- Section heading: `איך מתחילים, בלי לקפוץ למים`
- Body:
  > אחרי שקיבלת את הדוח ודיברנו, שומרים לך מקום בנייה ב-₪9.90. עם המקום אתה מקבל אב טיפוס של האתר שלך: השם שלך, התמונות שלך, השירותים שלך. אתה רואה בדיוק לאן הולכים, על החומרים שלך — ואז מחליט. ה-₪9.90 נזקפים לזכות החודש הראשון במסלול המלא.
- Framing rule honored: this is a build-slot deposit credited to month 1, with a personalized mockup — never sold as paying for a preview.

## 2.8 Steps

- Block heading: `אתה מספר על העסק. אנחנו בונים איתך.`
- Steps:
  1. `מקבלים את הדוח החינמי ורואים איפה העסק שלך עומד בגוגל היום.`
  2. `מתקנים לבד מה שאפשר — עם ההסברים הברורים שבדוח.`
  3. `רוצים יותר? מדברים איתנו ושומרים מקום בנייה ב-₪9.90.`
  4. `האתר שלך קם לתחייה, והמסלול החודשי ממשיך לטפל בנוכחות שלך.`
- Note: no launch-time promises (no "24 hours"); timelines deliberately unstated (see ledger).

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
     A: `חינם, בלי אותיות קטנות. תקבל גם את התיקונים שאפשר לעשות לבד. שום דבר לא נעלם אם לא תמשיך איתנו לשלב הבא.`
  2. Q: `מה צריך כדי לקבל את הדוח?`
     A: `את שם העסק. אם יש כמה עסקים דומים באזור שלך, נבקש ממך לבחור את שלך מתוך רשימה. זה הכול.`
  3. Q: `מה זה ₪9.90 ולמה צריך אותו?`
     A: `זה מקום בנייה. הוא שומר לך תור ומתחיל עבודה על אב טיפוס של האתר שלך — עם השם, התמונות והשירותים שלך. הסכום נזקף לזכות החודש הראשון במסלול של ₪199 לחודש.`
  4. Q: `מה מקבלים ב-₪199 לחודש?`
     A: `אתר לעסק, טיפול שוטף בפרופיל העסקי בגוגל, חידוש ותוספת תוכן כל חודש, הזמנת ביקורות מלקוחות מרוצים, ודוח חודשי פשוט על פניות ועל מה חדש באתר.`
  5. Q: `יש לי כבר אתר. זה רלוונטי אליי?`
     A: `כן. הדוח בודק את כל הנוכחות שלך בגוגל, לא רק את האתר. ואם חשוב לך להגיע למי שמחפש אותך עכשיו — יש גם מסלול פרסום בגוגל.` (link in answer: `ראה את מסלול הפרסום` → `/google-ads`)
  6. Q: `ואם ארצה לעצור — מה קורה לאתר?`
     A: `תנאי ההמשך והיציאה מופיעים בתנאי השימוש. אנחנו מעדיפים שתקרא אותם לפני שמתחילים, וכל שאלה אפשר לשאול אותנו ישירות לפני החלטה.`

## 2.11 Cross-link to Ads

- Block (card link): `רוצה להגיע למי שמחפש את השירות שלך בגוגל כבר עכשיו? ראה את מסלול הפרסום.` → `/google-ads`

## 2.12 Final CTA

- Heading: `בוא נראה מה גוגל אומר עליך היום.`
- Body: `הדוח חינם, לוקח כמה דקות, ונותן לך תמונה ברורה — כולל מה שאפשר לתקן לבד עוד היום. משם תחליט אתה איך ממשיכים.`
- Primary CTA (button): `קבל את הדוח חינם` → `/site-bot/start`
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
- Open Graph description (PROPOSAL): `מודעות מדויקות, דף נחיתה ברור ומדידת פניות אמיתית. דמי ניהול ₪249 לחודש, תקציב המדיה שלך נפרד.`
- Canonical: `https://www.wao.co.il/google-ads` (existing).

## 3.2 Header

Identical site-wide header (see 1.2 — renders the same on this page).

## 3.3 Hero

- Badge: `החשבון שלך. התקציב שלך. הניהול שלנו.`
- H1 (PROPOSAL, SEO-gated): `פרסום בגוגל שמביא פניות ששווה לך לענות עליהן`
- Body:
  > כל יום מישהו באזור שלך מחפש בגוגל את השירות שלך. השאלה היא אם הוא מוצא אותך — ומה הוא מבין כשהוא נכנס. אנחנו בונים מודעה מדויקת ודף נחיתה ברור, ומודדים כל פנייה מול מה ששילמת. חשבון הפרסום ופרופיל התשלומים נשארים שלך, לאורך כל הדרך.
- Primary CTA: PhoneReveal button — pre-reveal label: `דבר איתנו — 30 דקות על העסק שלך, בלי עלות`; revealed: `052-614-8860` (tel: `0526148860`); mobile: plain tel link. (source: `google-ads-hero`)
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
- Section heading: `חמישה צעדים לפניות שרואים בטלפון, לא להבטחות`
- Steps:
  1. Number `01` — Title: `מתחילים מהחשבון, לא מהתקציב`
     Desc: `אם כבר שילמת על קליקים, קודם בודקים לאן הכסף הלך. מגדירים מה נחשב פנייה אמיתית בשבילך — שיחה, וואטסאפ או טופס — ורק אז מחליטים איפה נכון לפרסם.`
  2. Number `02` — Title: `מפרסמים במקום שבו הלקוח מחפש`
     Desc: `מודעת חיפוש פוגשת את הלקוח ברגע שהוא מחפש את השירות שלך. רק כשזה מתאים לעסק ולתקציב, בוחנים גם ערוצים נוספים של גוגל.`
  3. Number `03` — Title: `מודדים כל פנייה`
     Desc: `מחברים מעקב המרות עם GA4 ו-Google Tag Manager. כך רואים בדיוק איזו מודעה הביאה כל שיחה, ומה עלה לך להשיג אותה.`
  4. Number `04` — Title: `משפרים לפי פניות, לא לפי קליקים`
     Desc: `בודקים איזה ניסוח מדבר ללקוחות שלך ומביא פניות אמיתיות. את ההחלטות מקבלים מהנתונים של החשבון שלך, לא מתחושת בטן.`
  5. Number `05` — Title: `אתה רואה הכול, תמיד`
     Desc: `החשבון רשום על שמך — אתה יכול להיכנס ולראות הוצאה וביצועים בכל רגע. אנחנו מנהלים דרך MCC: הרשאת ניהול, לא בעלות.`
- Note: legacy English jargon tag chips (ROAS/CPA/Smart Bidding etc.) intentionally dropped; entities kept in plain Hebrew.

## 3.6 What you actually get

- Eyebrow: `מה עושים בפועל`
- Section heading: `ניהול קמפיינים בגוגל — בחשבון שלך`
- Items (benefit-led titles):
  1. `🔬 בדיקת חשבון לפני שקל ראשון` — `בודקים את מבנה הקמפיינים ואת מדידת ההמרות לפני כל החלטה על תקציב. יש גם הגנה מפני הונאת קליקים.`
  2. `🎯 קמפיינים לפי העסק שלך` — `מתאימים את סוג הקמפיין לחיפוש, למטרה ולתקציב שלך. לא מפעילים הכול אוטומטית ולא מבטיחים מה שלא בדקנו.`
  3. `✍️ מודעות שמדברות ללקוח הנכון` — `כל מודעה עונה על מה שהלקוח חיפש באותו רגע, ובוחנים ניסוחים לפי הפניות שהם מביאים.`
  4. `📊 מעקב פניות עם GA4 ו-GTM` — `רואים פניות והמרות לצד ההוצאה — איזו מודעה הביאה שיחה, כמה היא עלתה ומה כדאי לשפר.`
  5. `📈 תמונת מצב חודשית בשפה פשוטה` — `מה הוצאנו, כמה פניות הגיעו ואיך הן חולקו. בלי מצגות ובלי מונחים שצריך לתרגם.`
  6. `🔑 הבעלות נשארת אצלך` — `חשבון Google Ads ופרופיל התשלומים רשומים על שמך. תמיד תוכל לראות הכול בעצמך.`

## 3.7 Pricing

- Section heading: `כמה זה עולה, ובדיוק על מה משלמים`
- Lines:
  - `דמי ניהול: ₪249 לחודש. זה כל מה שמשלמים לנו.`
  - `תקציב הפרסום: משולם ישירות לגוגל, בנפרד מדמי הניהול. אתה מחליט כמה להשקיע כל חודש.`
  - `החשבון ופרופיל התשלומים רשומים על שמך — ההוצאה על מודעות שקופה לך בזמן אמת.`
- Note: no VAT treatment, no cancellation/exit terms, no free-month, no guarantee — deliberately unstated (see ledger).

## 3.8 Who this fits

- Section heading: `למי זה מתאים?`
- Body:
  > אתה בעל מקצוע עצמאי. העבודה מגיעה בעיקר מהמלצות, וזה טוב — אבל זה לא תלוי בך. אולי ניסית לפרסם לבד, והפניות לא הצדיקו את ההוצאה. זה בדרך כלל עניין של דיוק ומדידה. כשהמודעה מדויקת ורואים לאן כל שקל הולך, הפרסום בגוגל עובד בשביל עסק כמו שלך.
- CTA (link): `דבר איתנו על העסק שלך` → `/contact#contact-form`

## 3.9 FAQ

- Eyebrow: `שאלות נפוצות`
- Section heading: `כל מה שכדאי לדעת על פרסום בגוגל`
- Items:
  1. Q: `כמה עולה ניהול קמפיינים בגוגל, ומי משלם על המודעות?`
     A: `דמי הניהול הם ₪249 לחודש. תקציב המדיה נפרד ומשולם ישירות לגוגל, על ידך. חשבון Google Ads ופרופיל התשלומים בבעלותך, ו-WAO מנהלת דרך MCC.`
  2. Q: `מה ההבדל בין פרסום בגוגל לבין קידום אורגני?`
     A: `בפרסום ממומן אתה משלם על תנועה מהמודעות, והיא תלויה בתקציב. קידום אורגני לא מחייב תשלום על קליק, אבל גדל בהדרגה ודורש סבלנות. בוחרים ערוץ לפי העסק שלך, לא לפי הבטחות.`
  3. Q: `איך יודעים אם הפרסום בגוגל מביא פניות אמיתיות?`
     A: `מחברים מעקב המרות עם GA4 ו-Google Tag Manager, ואז בודקים פניות מול ההוצאה. אין תאריך קבוע לתוצאות ואין מספר פניות שאפשר להבטיח מראש — יש מדידה שקופה של מה שבאמת קרה.`
  4. Q: `האם ההדגמה מפרסמת את העסק שלי בפועל?`
     A: `לא. ההדגמה פועלת במצב הדגמה: אתה רואה מודעה ודף נחיתה לעסק שלך, בלי פרסום חי ובלי חיוב. פרסום אמיתי יוצא לדרך רק כשתחליט, אחרי הקמה מלאה של מעקב וקמפיין.`
  5. Q: `איך זה עובד מול גוגל מבחינת בעלות?`
     A: `חשבון Google Ads ופרופיל התשלומים נשארים בבעלותך; WAO פועלת דרך MCC — הרשאת ניהול, לא בעלות. תקציב הפרסום משולם ישירות לגוגל, בנפרד מדמי הניהול. תנאי השירות המלאים מופיעים בתנאי השימוש.`

## 3.10 Final CTA

- Eyebrow: `משלם על קליקים, בלי לראות כמה פניות הגיעו?`
- Heading: `30 דקות שיחה — ונראה יחד לאן התקציב הולך`
- Body: `בשיחה חינמית של 30 דקות נבחן את מה שיש לך היום ואת מדידת הפניות. תצא עם כיוון ברור, גם אם נחליט יחד שהפרסום עדיין לא הצעד הבא שלך.`
- Primary CTA: PhoneReveal button (source `google-ads-bottom-cta`) — pre-reveal label: `הצג מספר טלפון`; revealed: `052-614-8860` (tel: `0526148860`); mobile: plain tel link.
- Secondary CTA (outline): `מעדיף לראות קודם הדגמה?` → `/google-ads/onboarding`
- Trust microcopy line: `✓ שיחת ייעוץ חינם, 30 דקות · ✓ החשבון שלך נשאר שלך · ✓ דמי ניהול ₪249 לחודש, בלי הפתעות`

## 3.11 Footer

Identical site-wide footer (see 1.11 — renders the same on this page).

---

# ENGLISH LEDGER — claims, sources, gates

## L1. Provenance

- Authored by waocopy (Qwen 3.8 Max via alibaba provider), kanban task t_11ffeb47, run 1600, 2026-10-14, under contract `handoff/pending/2026-10-14_002_waocopy_three-page-sales-draft.md`. No model fallback used. Single Markdown packet; no JSON duplicate produced (requirement removed by amended contract).

## L2. Sources read (anchors)

- `VISION.md:6-69` (North Star, bot table, ₪199 retainer lock 2026-08-21, ₪249 Ads, Purple-Cow amendments), `VISION.md:169-195` (Ads monetization stages, client-pays-Google rule, ₪199 lock restated).
- `docs/missions/site-bot-single-segment-pivot-2026-08-21.md:164-186` (₪199 ladder; ₪9.90 = build-slot deposit credited to month 1, personalized mockup framing, never "pay for a preview"; cancellation-policy open item deliberately parked).
- `docs/research/site-bot/010_audit-first-wedge-build-plan.md:6-10, 65-98` (free ungated scorecard lead magnet; six dimensions; unknown-as-first-class; free DIY fixes for categories/hours/photos; share loop; no price on free surface; no timeline/stat inventions).
- Renderers/content: `src/components/home/AstraHome.tsx`, `src/components/home/AstraProofVideo.tsx`, `src/content/astra-homepage-copy.json`, `src/content/astra-authority-first-homepage-copy.json` (proof assets, destinations, FAQ topics, trust constraints), `src/app/(app)/site-bot/page.tsx`, `src/app/(app)/google-ads/page.tsx`, `src/components/Header.tsx`, `src/components/Footer.tsx`, `src/components/PhoneReveal.tsx`. Plus `AGENTS.md`, `CLAUDE.md`, `CLAUDE_TO_HERMES_HANDOFF.md`.
- Historical draft packets NOT read (prohibited by contract).

## L3. Protected keys (byte-exact in draft)

- Homepage hero eyebrow: `שיווק בגוגל לבעלי מקצוע ונותני שירות` — from `astra-homepage-copy.json#/hero/eyebrow`.
- Homepage H1 line 1: `יותר לקוחות מגוגל.` / line 2: `פחות שיווק על הראש.` — from `astra-homepage-copy.json#/hero/h1_line1,h1_line2`.
- Current AI-themed homepage title was NOT carried over (per strategist comment: not protected). All new titles/H1s for the three pages are PROPOSALS, explicitly SEO-gated.

## L4. Target approved offer vs actual present operation

| Item | Target offer (draft copy) | Actual present operation (source evidence) |
|---|---|---|
| Site Bot pricing | ₪199/month retainer, all-inclusive bundle | Live `/site-bot` page currently sells ₪1,490 one-time + ₪9.90 "trial live homepage"; 1490 package EXCLUDED from draft per contract; live page not yet updated |
| ₪9.90 | Build-slot deposit, credited toward month 1, personalized mockup of the client's own site | Live page frames ₪9.90 as paid trial of a live homepage on WAO subdomain — framing superseded by pivot:173-180 |
| Free report/DIY funnel | Free ungated six-dimension report + free DIY fixes as front door | Audit-first plan is a v0 build plan (`010_audit-first-wedge-build-plan.md`); whether the free-report flow is live in production is UNVERIFIED — copy assumes the approved funnel design; engineering must confirm `/site-bot/start` serves report-first intake |
| Retainer bundle | Site growth, GBP upkeep, review invitations, monthly digest denominated in calls/jobs | Purple-Cow bundle (VISION:46-60) is design-stage; recurring delivery NOT independently verified live. Ledger-level caveat only; no per-section caveats added |
| Ads pricing | ₪249/month management; media client-paid direct to Google | Live `/google-ads` page currently advertises "from ₪1,500/month"; VISION Ads monetization table also documents ₪9.90 setup + free management month 1 — NOT included in draft (contract forbids inventing free-month); conflict unresolved |
| Ads execution | Live advertising after full setup | Ads onboarding preview runs in DEMO/sandbox mode (live locked) per `astra-homepage-copy.json` truth_constraints; draft labels demo visibly, never implies live activation |
| Free 30-min consultation | Offered as primary Ads CTA | Present on live `/google-ads` page (tel:0526148860) — real current operation |

## L5. Proof assets retained (all source-backed)

- Customer recommendations video (YouTube `zrgqx7OOtcc`, nocookie embed + direct link); no content characterization.
- Founder: Eitan Yariv, approved photo `/eitan-yariv.avif` only; role and accountability line limited to professional direction (no personal-oversight-of-every-job claim).
- "Experience since 2006" — from `astra-homepage-copy.json#/people/intro`; requires publication revalidation per strategist comment.
- Google Partner directory listing + Search/Display certifications — directory observation only; badge `/google-partner-badge.svg`; requires publication revalidation.
- Maoved CRM "from ₪160/month" as optional paid extension (homepage lead-handling only).
- Phone `052-614-8860` via PhoneReveal; location Rishon LeZion.

## L6. Removed / not carried over (deliberate)

- STATS block (200–400% ROI, 60% CPA drop, 8:1 ROAS) — omitted per strategist watcher comment: ungrounded numbers even though attributed in source.
- Legacy ₪1,490 package, "24-hour launch", "chat editing forever", "no long-term contract" Ads assurance (watcher correction: old source text is not sufficient grounds for exit-term claims), domain/Cloudflare/GitHub-registered-in-your-name claims — tied to excluded package or unverifiable terms/timelines.
- AI-themed elements: current homepage title, hero `mechanism_line` ("מנהל שיווק מבוסס AI"), the `ai_search` section, and any AI word in metadata/OG/footer. Method section explains affordability via WAO people + "automation tools" once, without AI positioning.
- Three-way COMPARE framework (build-yourself/developer/Wix) — comparison-framework risk under prohibited patterns; replaced by desire-led narrative.
- English jargon tag chips on Ads steps (ROAS, Smart Bidding, RSA, Demand Gen…).
- Google Business ₪149/month extension mention — conflicts with retainer-includes-GBP-upkeep target offer; relationship unresolved (L7).

## L7. Unknown commercial facts (NOT invented in copy)

- VAT treatment of ₪199/₪249/₪9.90; cancellation/exit terms — including any "no long-term contract" assurance for Ads (old source FAQ said it; per Requirement 7 and the watcher correction it was REMOVED from copy and left unknown here) — and what happens to the client's site on cancel (parked open item, pivot:182-186); delivery or inquiry timing claims (none made; no supported timeline exists); first-month terms for Ads (VISION documents ₪0 management month 1 — excluded pending confirmation); whether the free-report flow and audit intake are live at `/site-bot/start`; current availability of online checkout; relationship between the standalone ₪149 Google Business service and GBP upkeep inside the ₪199 retainer; weekly map-position scoreboard inclusion (Local-Pack Sports Score) — kept out of copy; OG share image asset; Fraud/click-protection tooling ("הגנה מפני הונאת קליקים" kept generic — the Fraud Blocker vendor claim needs revalidation).

## L8. CTA destination flags for engineering (internal, do not render)

- `/site-bot/start` — draft promises a FREE name-only report first; current intake is the legacy ₪9.90 trial flow. Destination must match promised action before publication (audit-first wedge build).
- `/google-ads/onboarding` — demo-mode preview; draft labels it as demo everywhere it appears; live activation is locked.
- Homepage header/nav primary CTA changed from `תראה לי את המודעה שלי` → free report (`/site-bot/start`) to match the report-first acquisition funnel; Header/Footer components read these labels from `astra-homepage-copy.json`, so applying this draft requires coordinated content-file changes (engineer scope, not this draft).
- `/contact?ref=site-bot-offer#contact-form` retained from live page for the Site Bot secondary CTA.

## L9. Pending gates

- Independent full-page voice/claim review (waohebrewqa) — NOT done; this draft is authoring-complete only.
- Founder review with full copy in chat — pending.
- SEO gate on every title/H1 proposal marked above — pending.
- Publication revalidation of years-since-2006 and Google Partner/certification claims — pending.
- Nothing in this packet was applied to source, published, committed or deployed.
