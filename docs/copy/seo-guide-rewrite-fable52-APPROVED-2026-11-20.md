# /seo/guide rewrite: verdict, guardrails, before → after

**Not verified:** my search tool is US-only and did not surface wao.co.il, so the #1 position and the AI Overview citation are taken from you, not confirmed. Record a Search Console baseline (position, clicks, AI Overview presence for the head query) before shipping.

**Decision for you:** the CTA promises "ייעוץ ראשון חינם" by phone, which conflicts with your recorded rule that consulting is paid in advance with no pre-sale call. I rewrote only the voice around it; confirm or replace the offer.

**Voice choice:** every section ends with "☕ ביום ראשון בבוקר" rather than Monday, because the Israeli work week starts on Sunday. All copy uses singular male address.

## 1. Verdict

- **It names terms instead of explaining them.** The technical checklist is bare tokens: "Canonical, noindex, href-lang", "Schema.org JSON-LD לכל סוג דף". A plumber learns nothing from that.
- **It reads as translated from English.** Examples: "ה-Why מאחורי הביטוי", "מדידת ה-Wrong KPIs", "האדריכלות שגוגל מחשיבה", "תגובתיות לקלט משתמש".
- **No section ends in an action.** Sections state principles ("בלי בסיס טכני תקין — שאר מאמצי ה-SEO מאבדים חלק ניכר מיעילותם") and stop.
- **The register drifts and has errors.** It mixes plural ("כתבו", "בדקו") with singular ("כלול", "הוסף", "עדכן"), and slang ("חשיפת מותג מטורפת") with officialese ("יש לוודא עדכניות"). Typos: "הCore Algorithm", "שחלופי קישורים", "דחיית תוכן חלופי" (should be הצעת), "כפול חשוב", "שX". It also uses ASCII quotes and spaced en-dashes.
- **It talks to marketers and mocks the owner's tools.** "WordPress עם תמונות לא מאופטמות ו-12 פלאגינים פעילים = ציונים אדומים" insults the reader, who is on WordPress or Wix. Examples are about SEO itself ("קידום אתרים למסעדות"), not about his trade.

## 2. Ranking guardrails

### What the competition looks like

| Page | Approx. words | Visible FAQ | Visible date | Shape |
|---|---|---|---|---|
| WAO /seo/guide | ~2,050 visible | No | June 2026 | 14 topic sections |
| danielzrihen.co.il | ~2,500 | 10 questions | None | 6 steps + TL;DR |
| digitouch.co.il | ~2,000 | 4 questions | April 2023 | 7 steps, two tables |
| seolinks.co.il | ~6,000 | 4 questions | None | 7 chapters |
| galyam-studio.co.il | ~2,000 | 3 questions | May 2025 | Work plan for a business |
| amitadler.co.il | ~5,500 | No | None | 10 steps |

- **WAO's edge:** a standalone AI Overviews section, Topical Authority as a framework, current Core Web Vitals (one competitor still cites FID), a visible fresh date, and a 14-topic entity spread. The rewrite must keep all of these.
- **WAO's gaps:** no visible FAQ, no "first steps" plan (site:, Search Console, sitemap), and no image/Alt coverage. The new elements in part 4 close them.
- **All competitors address the reader in plural.** Singular אתה is a differentiator, not a risk.

### What stays fixed

| Item | Decision | Why |
|---|---|---|
| URL, canonical, section `id`s | Fixed | Anchors and inbound links depend on them |
| `<title>` and Article `headline` | Fixed, byte-exact | Carries the head term and year |
| Meta description | Fixed | No ranking gain from touching it |
| H1 | Fixed | Head term |
| 14 H2s, order and head terms | Fixed, two cosmetic tail edits | The topic outline is what Google and the AI Overview parse |
| Definition sentences | Structure kept | "קידום אתרים (SEO) הוא…", the "בקצרה" line, the 5 systems, the CWV thresholds and the 3–4 / 6–12 / 12–18 month figures are the likely cited passages |
| Every Latin term and GT wrap | Fixed; glosses added after | Entity coverage |
| All internal links, anchors, chips | Fixed | Cluster structure |
| Author block, Person/ProfilePage schema, sameAs | Fixed | E-E-A-T |
| Length | Grows, never shrinks | A word-count cut is the main risk |
| `dateModified` + four visible dates | Update to the ship month | The change is substantive, so the date is honest |

**Needs seo-strategist (Yonatan) sign-off:**
1. H2 tail "בנישה שלכם" → "בנישה שלך".
2. H2 typography: "קרוב אליי" from ASCII quotes to gershayim.
3. Three H3 tail edits and one H3 date edit (shown below).
4. A new H2, "שאלות נפוצות על קידום אתרים", plus a TOC entry.
5. Badge date (head term "מדריך" stays).
6. The "start here" box placed above the first H2.

**Ship rule:** one deploy and a Search Console annotation. Watch the head query for three weeks; if average position drops and holds for seven days, revert from git.

### Outdated or unsupported claims (checked 2026-11-20)

| Current claim | Finding | Fix |
|---|---|---|
| AI Overviews "ביותר מ-63% מהחיפושים" | No source. 2026 all-query estimates: SparkToro 20%+ (US, Jan–Apr 2026), Conductor 25%, Similarweb 43%. Higher figures come from commercial-intent samples. No Israel figure found. | Sourced range. I read these via search summaries, so confirm at the primary pages before publishing. |
| "הורחב ל-100+ מדינות" | 200+ countries and territories, 40+ languages, Hebrew and Israel listed (Google Search Help; expansion May 2025). | Updated |
| Box titled "2025–2026" | INP replaced FID and Helpful Content merged into core in March 2024 (dates from my knowledge, not re-checked today). | Retitle 2024–2026, add dates |
| "השתמשו ב-FAQ Schema" | FAQ rich results stopped showing 7 May 2026. The markup stays valid and Google still reads it. | Reworded |
| FAQ schema with no visible FAQ | The page ships FAQPage markup for three questions that are not on the page; Google's structured-data rules require marked-up content to be visible. | Add a visible FAQ |
| "HARO / Connectively" | Connectively shut down 9 Dec 2024; HARO was sold to Featured in April 2025 and relaunched. | Title → "HARO" |
| "Penguin מזהה את כולם ב-2026" | Overclaim. Penguin has been part of the core algorithm for years (from my knowledge; Yonatan to confirm). | Softened |
| "CTR גבוה = דירוג גבוה יותר" | Contested as a direct ranking factor. | "More clicks from the same position" |
| "60%+ מהגלישה היא ממובייל" | Statcounter Israel 2026 runs about 54–62% by month. | "יותר מחצי" + source |
| "AMP (אופציונלי)" | Obsolete advice (from my knowledge). | Dropped |
| "Sandbox Effect" | Google does not confirm a sandbox. | Attributed to practitioners |
| "81 מדריכים" | The project file says ~97 articles. | Engineer inserts the real count |
| "זמן קריאה: ~25 דקות" | ~2,050 words is about 10 minutes. | "~18 דקות" for the new length |
| "מאות פרויקטי קידום" in the bio | Your recorded real number is 84 clients since 2006. | Your call; I left the bio untouched |

## 3. Before → after

Text marked `|` separates a card's title from its body. Chip rows ("מאגר ידע:" plus labels) and the sidebar TOC labels are KEEP throughout.

### Hero: badge
```
BEFORE: מדריך — עודכן יוני 2026
AFTER: מדריך — עודכן נובמבר 2026
```

### Hero: H1
```
BEFORE: מדריך קידום אתרים אורגני בגוגל 2026/2027
AFTER: KEEP
```

### Hero: intro paragraph
```
BEFORE: כל מה שאתם חייבים לדעת על SEO מודרני בעידן של AI Overviews וסמכות נושאית (Topical Authority). מדריך פרקטי לחוקי המשחק החדשים ב-2026/2027.
AFTER: כל מה שבעל עסק צריך לדעת על קידום אתרים ו-SEO בעידן של AI Overviews וסמכות נושאית (Topical Authority) — בעברית של בני אדם. כל מונח מקצועי מקבל הסבר פשוט, וכל פרק נגמר במה שעושים ביום ראשון בבוקר. מדריך פרקטי לחוקי המשחק של 2026/2027.
```

### Hero: byline
```
BEFORE: נכתב ע"י איתן יריב · עודכן: יוני 2026 · זמן קריאה: ~25 דקות
AFTER: נכתב ע״י איתן יריב · עודכן: נובמבר 2026 · זמן קריאה: ~18 דקות
```

### 1. מה זה קידום אתרים (SEO)?
```
BEFORE: מה זה קידום אתרים (SEO)?
AFTER: KEEP
```
```
BEFORE: קידום אתרים (SEO) הוא אוסף המהלכים שמקפיצים את האתר שלכם לראש התוצאות האורגניות של גוגל – בלי לשלם אגורה על קליקים.
AFTER: קידום אתרים (SEO) הוא אוסף הפעולות שמביאות את האתר שלך לראש התוצאות האורגניות של גוגל — התוצאות הרגילות, אלה שלא משלמים עליהן. בלי לשלם אגורה על קליק.
```
```
BEFORE: בניגוד לממומן שמביא קליקים מהר אבל נעלם ברגע שסגרתם את הברז התקציבי, SEO בונה לכם נכס נדל״ני דיגיטלי. אתר שממוקם טוב היום ימשיך להזרים לכם לידים בחינם גם בשנה הבאה.
AFTER: פרסום ממומן הוא שכירות: שילמת — אתה למעלה. הפסקת לשלם — נעלמת באותו יום. SEO הוא דירה בבעלותך, נכס נדל״ני דיגיטלי. עמוד שמדורג טוב היום ימשיך להביא לך פניות גם בשנה הבאה, בלי חשבונית מגוגל על כל קליק.
תחשוב על אינסטלטור ברעננה. בעשר בלילה מישהו עם הצפה במטבח מקליד ״אינסטלטור ברעננה״. הוא לא מדפדף. הוא מתקשר לאחד משלושת הראשונים. SEO הוא העבודה שמכניסה אותך לשלושה האלה.
```
```
BEFORE: 📌 בקצרה: SEO = להופיע ראשון כשלקוח מחפש מה שאתם מוכרים — בלי לשלם לגוגל על כל קליק.
AFTER: 📌 בקצרה: SEO = להופיע ראשון כשלקוח מחפש את מה שאתה מוכר — בלי לשלם לגוגל על כל קליק.
```
```
BEFORE: ב-2026 חוקי המשחק השתנו. גוגל מפעילה את מודל ה-AI שלה (Gemini) כדי להבין מה הגולש באמת מחפש, ומציגה תשובות ישירות (AI Overviews) מעל הכל. SEO מודרני פשוט חייב לפצח גם את הבלוק הזה.
AFTER: ב-2026 חוקי המשחק השתנו. גוגל מפעילה את מודל ה-AI שלה (Gemini) כדי להבין מה הגולש באמת מחפש, ומציגה מעל כל התוצאות תשובה מוכנה — AI Overviews. התשובה הזאת נשענת על אתרים, ומצטטת אותם. SEO של היום הוא גם לדרג גבוה וגם להיות האתר שגוגל מצטטת.
```
```
BEFORE: (none)
AFTER: ☕ ביום ראשון בבוקר: פתח חלון גלישה בסתר וחפש את השירות הראשי שלך ואת העיר שלך, כמו שלקוח היה מקליד. רשום מי מופיע בשלושת המקומות הראשונים, ואיפה אתה. זו נקודת הפתיחה שלך, ואליה תחזור בעוד שלושה חודשים.
```

### 2. איך גוגל מדרג אתרים ב-2026/2027
```
BEFORE: איך גוגל מדרג אתרים ב-2026/2027
AFTER: KEEP
```
```
BEFORE: גוגל מצהירה על מאות גורמי דירוג, אבל בפועל, ב-2026/2027 הכל מתנקז ל-5 מערכות ליבה מרכזיות:
AFTER: גוגל מדברת על מאות גורמי דירוג. אין לך זמן למאות, וגם לא צריך. בפועל, ב-2026/2027 הכול מתנקז ל-5 מערכות ליבה. תכיר אותן, ותבין כמעט כל החלטה שגוגל מקבלת על האתר שלך:
```
```
BEFORE: RankBrain + BERT + MUM — מערכות AI שמבינות את כוונת החיפוש, לא רק את מילות המפתח.
AFTER: RankBrain + BERT + MUM — מערכות ה-AI שמבינות את כוונת החיפוש, לא רק את המילים. מי שמקליד ״נזילה מתחת לכיור״ מחפש אינסטלטור, גם אם לא כתב את המילה. לכן כותבים בשפה של הלקוח, לא בשפה של המקצוע.
```
```
BEFORE: Helpful Content System — גוגל מעדיפה תוכן שנכתב לאנשים, לא למנועי חיפוש. תוכן AI-only ללא ערך נענש.
AFTER: Helpful Content System — גוגל מעדיפה תוכן שנכתב לאנשים, לא למנועי חיפוש. עמוד שנכתב רק כדי לדרג, בלי לעזור לאף אחד, יורד. זה נכון במיוחד לטקסט AI שהועלה כמו שהוא, בלי ידע אמיתי מאחוריו.
```
```
BEFORE: E-E-A-T Signals — ניסיון, מומחיות, סמכות ואמינות. גוגל בוחנת מי כתב את התוכן ועד כמה הוא מהימן.
AFTER: E-E-A-T Signals — ניסיון, מומחיות, סמכות ואמינות. גוגל בודקת מי עומד מאחורי התוכן: אדם עם שם, ותק ולקוחות, או אתר אנונימי.
```
```
BEFORE: Page Experience — Core Web Vitals, מהירות, מובייל ו-HTTPS.
AFTER: Page Experience — Core Web Vitals, מהירות, מובייל ו-HTTPS. בעברית: האתר נטען מהר, נוח בטלפון ומאובטח.
```
```
BEFORE: Link Authority — קישורים נכנסים מאתרים אמינים ורלוונטיים עדיין קריטיים ב-2026.
AFTER: Link Authority — קישורים נכנסים מאתרים אמינים ורלוונטיים עדיין קריטיים ב-2026. כל קישור כזה הוא המלצה: אתר אחר אומר לגוגל שאפשר לסמוך עליך.
```

### 2a. H3 box: algorithm changes
```
BEFORE: שינויי האלגוריתם החשובים ב-2025–2026
AFTER: שינויי האלגוריתם החשובים ב-2024–2026
```
```
BEFORE: AI Overviews expansion — הורחב ל-100+ מדינות, עכשיו בעברית
AFTER: AI Overviews expansion — זמין ביותר מ-200 מדינות וביותר מ-40 שפות, כולל עברית. התשובה של גוגל מופיעה היום גם ללקוחות שלך.
```
```
BEFORE: Site Reputation Abuse — ענישה על Parasite SEO וספאם תוכן
AFTER: Site Reputation Abuse — ענישה על Parasite SEO: אתרים גדולים שמשכירים את השם שלהם לתוכן של אחרים. חדשות טובות לעסק קטן שכותב על התחום שלו.
```
```
BEFORE: Helpful Content integration — נמזג עם הCore Algorithm
AFTER: Helpful Content integration — המערכת נמזגה לתוך ה-Core Algorithm (מרץ 2024). איכות התוכן נבדקת כל הזמן, לא רק בעדכון מיוחד.
```
```
BEFORE: Spam policies update — AI-generated spam, expired domains
AFTER: Spam policies update — ענישה על AI-generated spam ועל expired domains: תוכן בייצור המוני, ודומיינים ישנים שנקנו רק בשביל המוניטין שלהם.
```
```
BEFORE: INP replaces FID — Interaction to Next Paint הפך ל-Core Web Vital רשמי
AFTER: INP replaces FID — Interaction to Next Paint הפך ל-Core Web Vital רשמי (מרץ 2024). גוגל מודדת כמה מהר האתר מגיב ללחיצה.
```
```
BEFORE: (none)
AFTER: FAQ rich results — מאז מאי 2026 גוגל לא מציגה שאלות ותשובות מתחת לתוצאה. השאלות והתשובות בעמוד עצמו נשארות חשובות.
```
```
BEFORE: (none)
AFTER: ☕ ביום ראשון בבוקר: פתח את העמוד החשוב ביותר באתר שלך ושאל חמש שאלות. הוא עונה על מה שהלקוח חיפש? רואים מי עומד מאחוריו? הוא נטען מהר בטלפון? יש אתר אחר שמקשר אליו? הוא כתוב לבני אדם? כל ״לא״ הוא משימה.
```

### 3. AI Overviews ו-Generative Search
```
BEFORE: AI Overviews ו-Generative Search — המהפכה של 2026
AFTER: KEEP
```
```
BEFORE: בלוק ה-AI Overviews כבר מזמן לא ניסוי טכנולוגי. ב-2026 הוא מופיע ביותר מ-63% מהחיפושים ומספק לגולשים תשובה מיידית, והמספרים האלה רק ימשיכו לצמוח.
AFTER: בלוק ה-AI Overviews כבר מזמן לא ניסוי טכנולוגי. זו התשובה המוכנה שגוגל כותבת בעצמה ומציגה מעל כל התוצאות. כמה היא נפוצה? המדידות חלוקות: SparkToro מצאה אותה ביותר מ-20% מהחיפושים בארה״ב בתחילת 2026, ו-Similarweb מדדה 43%. בשאלות של ״כמה עולה״ ו״איך בוחרים״ היא מופיעה הרבה יותר.
```
```
BEFORE: אל תטעו: ה-AI לא הורג את ה-SEO, הוא פשוט הופך אותו לחשוב פי כמה. גוגל חייבת לבסס את התשובות שלה על אתרים סמכותיים, ומי שמצוטט שם זוכה לחשיפת מותג מטורפת בחינם.
AFTER: אל תטעה: ה-AI לא הורג את ה-SEO, הוא הופך אותו לחשוב פי כמה. גוגל לא ממציאה תשובות. היא חייבת לבסס אותן על אתרים שהיא סומכת עליהם, ומציגה אותם כמקורות. מי שמצוטט שם מקבל את המקום הכי טוב בעמוד, בחינם. מי שלא מצוטט נדחק למטה, גם אם הוא מדורג ראשון.
```
```
BEFORE: 🤖 איך להופיע ב-AI Overviews:
AFTER: KEEP
```
```
BEFORE: כתבו Direct Answers ברורים לשאלות נפוצות
AFTER: כתוב Direct Answers: תשובה ישירה של שניים-שלושה משפטים, מיד אחרי השאלה. בלי הקדמות.
```
```
BEFORE: הוסיפו סיכום קצר (בקצרה) בתחילת כל מאמר
AFTER: הוסף סיכום קצר (בקצרה) בתחילת כל מאמר. ה-AI אוהב לצטט משפט שעומד בפני עצמו.
```
```
BEFORE: השתמשו ב-FAQ Schema עם שאלות ותשובות מבוססות
AFTER: הוסף לעמוד שאלות ותשובות אמיתיות, אלה שלקוחות שואלים אותך בטלפון, וסמן אותן ב-FAQ Schema. גוגל כבר לא מציגה אותן מתחת לתוצאה, אבל הסימון עדיין עוזר לה להבין את העמוד.
```
```
BEFORE: בנו Topical Authority — AI מצטט מקורות שהוא מזהה כסמכותיים
AFTER: בנה Topical Authority — ה-AI מצטט מקורות שהוא מזהה כסמכותיים בנושא, לא עמוד בודד שהצליח.
```
```
BEFORE: חזקו E-E-A-T — מחבר מומחה + מקורות ממוספרים
AFTER: חזק E-E-A-T — מחבר מומחה עם שם ופנים, ומקור לכל מספר.
```
```
BEFORE: רוצים שהעסק שלכם יופיע שם? בדקו אם GEO Bot מתאים לעסק שלכם.
AFTER: רוצה שהעסק שלך יופיע שם? בדוק אם GEO Bot מתאים לעסק שלך.
```
```
BEFORE: מנועי AI נוספים שמשפיעים על תנועה ב-2026: Perplexity AI (מצטט מקורות ישירות, מביא תנועה), ChatGPT Search, ו-Microsoft Copilot. כל אחד מהם מתגמל תוכן עם Topical Authority ו-E-E-A-T.
AFTER: גוגל לא לבד. מנועי AI נוספים שמשפיעים על תנועה ב-2026: Perplexity AI (מצטט מקורות ישירות, מביא תנועה), ChatGPT Search ו-Microsoft Copilot. לקוחות כבר שואלים אותם ״מי האינסטלטור הכי טוב באזור״ ו״כמה עולה טיפול שורש״. כולם מתגמלים את אותו דבר: תוכן עם Topical Authority ו-E-E-A-T. עבודה אחת, כמה מנועים.
```
```
BEFORE: (none)
AFTER: ☕ ביום ראשון בבוקר: כתוב את חמש השאלות שלקוחות שואלים אותך הכי הרבה. חפש כל אחת בגוגל, ובדוק אם מופיעה תשובת AI ומי מצוטט בה. אחר כך כתוב באתר שלך תשובה טובה יותר לכל שאלה: שניים-שלושה משפטים ישירים, ואז הפירוט.
```

### 4. מחקר מילות מפתח וכוונת חיפוש
```
BEFORE: מחקר מילות מפתח וכוונת חיפוש
AFTER: KEEP
```
```
BEFORE: לפני שנוגעים במקלדת, אתם חייבים לדעת מה הלקוחות שלכם באמת מקלידים – ומה עובר להם בראש. מחקר מילות מפתח הוא הגשר שמחבר בין השירות שלכם לשאלות האמיתיות של האנשים.
AFTER: לפני שנוגעים במקלדת, אתה חייב לדעת מה הלקוחות שלך באמת מקלידים — ומה עובר להם בראש. אתה קורא לזה ״איטום גגות ביריעות״. הלקוח מקליד ״נזילה מהתקרה מה עושים״. מחקר מילות מפתח הוא הגשר בין השירות שלך לבין המילים של הלקוח.
```

### 4a. H3: כוונת חיפוש
```
BEFORE: כוונת חיפוש — ה-Why מאחורי הביטוי
AFTER: כוונת חיפוש — ה״למה״ שמאחורי הביטוי
```
```
BEFORE: כוונת חיפוש (Search Intent) היא הגורם הקריטי ביותר בבחירת מילות מפתח. גוגל מסווגת חיפושים לארבעה סוגים: מידעי (מה זה X?), ניווטי (חיפוש אתר ספציפי), מסחרי (השוואת אפשרויות לפני רכישה), ועסקאי (מוכן לרכוש כעת). תוכן שאינו תואם לכוונת החיפוש לא יידרג — גם אם הוא מכיל את מילת המפתח.
AFTER: כוונת חיפוש (Search Intent) היא הגורם הקריטי ביותר בבחירת מילות מפתח: מה האדם רוצה שיקרה אחרי החיפוש. מקובל לחלק חיפושים לארבעה סוגים: מידעי (״למה הדוד מטפטף״), ניווטי (חיפוש אתר ספציפי, כמו ״כללית זימון תורים״), מסחרי (השוואה לפני רכישה, כמו ״דוד שמש או דוד חשמל״) ועסקאי (מוכן לפעול עכשיו: ״טכנאי דודים בחיפה״). תוכן שלא תואם את כוונת החיפוש לא ידורג — גם אם מילת המפתח מופיעה בו עשר פעמים. למי ששואל ״למה״ נותנים הסבר. למי שמחפש טכנאי נותנים טלפון ואזור שירות.
```

### 4b. H3: Long-Tail
```
BEFORE: Long-Tail מול ביטויי ראש
AFTER: KEEP
```
```
BEFORE: ביטויי Long-Tail — ארוכים וספציפיים — מביאים תנועה מצומצמת יותר, אך כוונת הרכישה שמאחוריהם גבוהה יותר. על הביטוי "קידום אתרים" מתחרים אלפי אתרים; על "קידום אתרים למסעדות בתל אביב" — הרבה פחות. אתרים חדשים מתחילים ב-Long-Tail ומחזקים את עמדתם לביטויים תחרותיים יותר בהדרגה.
AFTER: ביטויי Long-Tail — ארוכים וספציפיים — מביאים פחות גולשים, אבל גולשים שקרובים הרבה יותר לקנייה. על הביטוי ״קידום אתרים״ מתחרים אלפי אתרים; על ״קידום אתרים למסעדות בתל אביב״ — הרבה פחות. אותו דבר אצלך: על ״רופא שיניים״ תתחרה מול רשתות ענק. על ״השתלת שיניים ביום אחד בנתניה״ אתה יכול לנצח. אתר חדש מתחיל ב-Long-Tail, צובר שם ניצחונות, ועולה משם בהדרגה לביטויי הראש.
```

### 4c. H3: Keyword Clustering
```
BEFORE: Keyword Clustering — ביטויים לדפים, לא דף לכל ביטוי
AFTER: KEEP
```
```
BEFORE: Keyword Clustering — קיבוץ ביטויים לפי כוונת חיפוש משותפת — מונע קניבליזציה ובונה דפים עמוקים שגוגל מעדיפה על פני ריבוי דפים רדודים. הכלל הפשוט: ביטויים עם אותה כוונת חיפוש שייכים לאותו דף.
AFTER: Keyword Clustering — קיבוץ ביטויים לפי כוונת חיפוש משותפת — מונע קניבליזציה: מצב ששני דפים שלך מתחרים זה בזה על אותו חיפוש, ושניהם מפסידים. ״מחיר ניקוי ספות״, ״כמה עולה ניקוי ספה״ ו״ניקוי ספות מחירון״ הם אותה שאלה, ולכן דף אחד. כך נבנה דף עמוק אחד, שגוגל מעדיפה על פני שלושה דפים רדודים. הכלל הפשוט: ביטויים עם אותה כוונת חיפוש שייכים לאותו דף.
```
```
BEFORE: 🔎 לפני כל כתיבה — נתחו את ה-SERP: מה מדורג בראש עבור הביטוי שבחרתם? מה סוג התוכן שגוגל מחזירה — מאמרים, דפי מוצר, וידאו? התשובה חושפת את כוונת החיפוש האמיתית.
AFTER: 🔎 לפני כל כתיבה — נתח את ה-SERP (עמוד התוצאות): חפש את הביטוי שבחרת והסתכל מה גוגל מחזירה. מאמרים? דפי שירות? מפה עם עסקים? וידאו? זו התשובה של גוגל לשאלה ״מה אנשים רוצים כאן״. אם כל העמוד מלא בדפי שירות, מאמר לא ידורג שם.
```
```
BEFORE: (none)
AFTER: ☕ ביום ראשון בבוקר: רשום עשרים שאלות ובקשות ששמעת מלקוחות החודש, במילים שלהם. הקלד כל אחת בגוגל, והסתכל על ההשלמות האוטומטיות ועל ״חיפושים קשורים״ בתחתית העמוד. סמן חמישה ביטויים ארוכים שנשמעים כמו לקוח עם יד על הארנק, ותן לכל אחד דף משלו.
```

### 5. Topical Authority
```
BEFORE: Topical Authority — הדרך לסמכות בנישה שלכם
AFTER: Topical Authority — הדרך לסמכות בנישה שלך
```
```
BEFORE: Topical Authority היא הסמכות הנושאית שגוגל מייחס לאתר בתחום מסוים. אתר שמכסה נושא לעומק ומכל הזוויות — מדורג גבוה יותר מאשר אתר עם מאמר יחיד על אותו נושא, גם אם המאמר הוא "טוב יותר".
AFTER: Topical Authority היא הסמכות הנושאית שגוגל מייחסת לאתר בתחום מסוים. אתר שמכסה נושא לעומק ומכל הזוויות מדורג גבוה יותר מאתר עם מאמר יחיד על אותו נושא — גם אם המאמר היחיד ״טוב יותר״. זה כמו בחיים: למי היית מתקשר על בעיית רטיבות, לשיפוצניק שעושה הכול או למי שעושה רק איטום כבר עשרים שנה? גוגל חושבת כמוך.
```

### 5a. H3: Content Clusters
```
BEFORE: Content Clusters — האדריכלות שגוגל מחשיבה
AFTER: Content Clusters — המבנה שגוגל מעריכה
```
```
BEFORE: Content Cluster = Pillar Page מרכזי שמכסה נושא ברמה גבוהה, ו-Cluster Pages שמכסים כל תת-נושא לעומק. כל הדפים מקושרים זה לזה עם Internal Links רלוונטיים.
AFTER: Content Cluster = Pillar Page מרכזי, דף אב שמכסה את הנושא כולו במבט מלמעלה, ו-Cluster Pages שמכסים כל תת-נושא לעומק. כל הדפים מקושרים זה לזה עם Internal Links (קישורים פנימיים). תחשוב על ספר: דף האב הוא תוכן העניינים, וכל דף משנה הוא פרק.
```
```
BEFORE: דוגמה — Cluster לנושא "קידום אתרים":
AFTER: דוגמה — Cluster לנושא ״קידום אתרים״:
```
```
BEFORE: 🏛️ Pillar: מדריך קידום אתרים מקיף (דף זה) / 📄 Cluster: Technical SEO — המדריך הטכני / 📄 Cluster: מחקר מילות מפתח ב-2026 / 📄 Cluster: E-E-A-T — איך לבנות סמכות / 📄 Cluster: Link Building — המדריך המעשי / 📄 Cluster: Core Web Vitals — כל מה שצריך לדעת
AFTER: KEEP
```
```
BEFORE: בניית Topical Authority דורשת זמן — בדרך כלל 6–12 חודשים לראות השפעה משמעותית. אבל ברגע שגוגל מזהה אתכם כסמכות בנישה, הדירוגים יציבים ועמידים לשינויי אלגוריתם.
AFTER: בניית Topical Authority דורשת זמן — בדרך כלל 6–12 חודשים עד שרואים השפעה משמעותית. אבל ברגע שגוגל מזהה אותך כסמכות בנישה, הדירוגים יציבים ועמידים הרבה יותר לשינויי אלגוריתם. ויש כאן יתרון לעסק קטן: אתה לא צריך להיות הסמכות של האינטרנט. מספיק להיות הסמכות של התחום שלך, בעיר שלך.
```
```
BEFORE: 📖 מדריכים מעמיקים לבניית Topical Authority: / מחקר מילות מפתח — המדריך המלא — כלים חינמיים ובתשלום, כוונת חיפוש, Long-Tail ו-Keyword Clustering / Topical Authority ומבנה אתר SEO — המדריך המלא — Hub & Spoke, Content Silos, URL Architecture ו-Internal Linking
AFTER: KEEP
```
```
BEFORE: (none)
AFTER: ☕ ביום ראשון בבוקר: בחר שירות אחד, זה שמביא לך הכי הרבה כסף. כתוב לו דף אב אחד, ועוד חמישה דפים קצרים שכל אחד עונה על שאלה אחת של לקוחות: כמה זה עולה, כמה זמן זה לוקח, איך בוחרים, מה יכול להשתבש, ומה עושים אחרי. קשר את כולם לדף האב, וממנו אליהם. זה ה-Cluster הראשון שלך.
```

### 6. Technical SEO
```
BEFORE: Technical SEO — הבסיס שלא רואים
AFTER: KEEP
```
```
BEFORE: Technical SEO הוא כל הפעולות הטכניות שמאפשרות לגוגל לסרוק, להבין ולהציג את האתר שלכם כראוי. בלי בסיס טכני תקין — שאר מאמצי ה-SEO מאבדים חלק ניכר מיעילותם.
AFTER: Technical SEO הוא כל הפעולות הטכניות שמאפשרות לגוגל לסרוק, להבין ולהציג את האתר שלך כמו שצריך. זו הצנרת בתוך הקיר: אף לקוח לא רואה אותה, אבל כשהיא סתומה שום דבר לא זורם. תוכן מעולה באתר שגוגל לא מצליחה לקרוא הוא שלט יפה בחדר נעול. רוב הסעיפים כאן הם עבודה של מי שבנה לך את האתר. התפקיד שלך הוא לדעת מה לבקש ממנו.
```
```
BEFORE: רשימת ה-Technical SEO החיוניים ב-2026
AFTER: KEEP
```
```
BEFORE: ✅ Crawlability | robots.txt, sitemap.xml, Crawl Budget
AFTER: ✅ Crawlability | robots.txt, sitemap.xml, Crawl Budget — גוגל מצליחה להיכנס לכל דף שחשוב לך
```
```
BEFORE: ✅ Indexability | Canonical, noindex, href-lang
AFTER: ✅ Indexability | Canonical, noindex, hreflang — הדפים הנכונים נכנסים לאינדקס, והמיותרים נשארים בחוץ
```
```
BEFORE: ✅ Mobile-First | Responsive design, AMP (אופציונלי)
AFTER: ✅ Mobile-First | Responsive design — גוגל שופטת את האתר לפי הגרסה בטלפון
```
```
BEFORE: ✅ HTTPS | SSL, Mixed Content, Redirects נכונים
AFTER: ✅ HTTPS | SSL, Mixed Content, Redirects נכונים — מנעול ליד הכתובת, בכל דף
```
```
BEFORE: ✅ Core Web Vitals | LCP, CLS, INP — ירוק בכולם
AFTER: ✅ Core Web Vitals | LCP, CLS, INP — ירוק בכולם. נטען מהר, לא קופץ, מגיב מיד
```
```
BEFORE: ✅ Structured Data | Schema.org JSON-LD לכל סוג דף
AFTER: ✅ Structured Data | Schema.org JSON-LD לכל סוג דף — תוויות שמסבירות לגוגל מה יש בעמוד
```
```
BEFORE: ✅ Site Architecture | URL Structure נקי, Internal Linking
AFTER: ✅ Site Architecture | URL Structure נקי, Internal Linking — כל דף חשוב במרחק של עד שלוש לחיצות מדף הבית
```
```
BEFORE: ✅ Duplicate Content | Canonical Tags, Parameter Handling
AFTER: ✅ Duplicate Content | Canonical Tags, Parameter Handling — אותו תוכן לא מופיע בשתי כתובות
```
```
BEFORE: כלים מומלצים לבדיקת Technical SEO: Google Search Console (חינם, הכי מדויק), Screaming Frog לסריקת אתר מלאה, ו-PageSpeed Insights ל-Core Web Vitals.
AFTER: כלים מומלצים לבדיקת Technical SEO: Google Search Console (חינם, הכי מדויק — גוגל עצמה מספרת לך מה היא רואה באתר), Screaming Frog לסריקת אתר מלאה, ו-PageSpeed Insights ל-Core Web Vitals. לעסק קטן, הראשון והשלישי מספיקים כדי להתחיל.
```
```
BEFORE: (none)
AFTER: ☕ ביום ראשון בבוקר: הקלד בגוגל site: ומיד אחריו את כתובת האתר שלך, בלי רווח. דפים חשובים לא מופיעים? גוגל לא מכירה אותם. אחר כך פתח Google Search Console (חינם), אמת בעלות על האתר, והגש את מפת האתר (sitemap.xml). לא יודע איך? שלח את השורות האלה למי שבנה לך את האתר.
```

### 7. On-Page SEO
```
BEFORE: On-Page SEO — אופטימיזציה של כל דף
AFTER: KEEP
```
```
BEFORE: On-Page SEO הוא כל מה שניתן לשלוט בו ישירות בתוך הדף עצמו: כותרות, תוכן, URL, מטא תגים ו-Schema.
AFTER: On-Page SEO הוא כל מה שבשליטה שלך בתוך הדף עצמו: כותרות, תוכן, URL, מטא תגים ו-Schema. זה החלק הכי משתלם לבעל עסק, כי לא צריך בשבילו מתכנת, תקציב או אישור מאף אחד. רק לשבת ולתקן.
```
```
BEFORE: Title Tag — הכותרת ב-Google | מקסימום 60 תווים. כלול את מילת המפתח הראשית בתחילה. הוסף את שם המותג בסוף. עשה אותה אטרקטיבית — CTR גבוה = דירוג גבוה יותר.
AFTER: Title Tag — הכותרת ב-Google | זו השורה הכחולה שהלקוח רואה בגוגל, והשלט מעל החנות שלך. עד 60 תווים בערך, אחרת גוגל חותכת. מילת המפתח הראשית בהתחלה, שם העסק בסוף. ״אינסטלטור ברעננה — זמין 24/7 | אבי אינסטלציה״ עובד. ״דף הבית״ לא. כותרת טובה מעלה את ה-CTR, שיעור ההקלקה, ומביאה יותר לקוחות מאותו מיקום.
```
```
BEFORE: Meta Description | מקסימום 155 תווים. לא גורם דירוג ישיר, אבל משפיע על CTR. כלול את הערך הייחודי ו-CTA. גוגל לפעמים מחליף אותה — אבל שווה לכתוב גרסה מדויקת.
AFTER: Meta Description | שתי השורות האפורות מתחת לכותרת. עד 155 תווים בערך. זה לא גורם דירוג ישיר, אבל זה מה שמשכנע ללחוץ, ולכן משפיע על ה-CTR. כתוב מה הלקוח מקבל ומה הצעד הבא (CTA): ״מגיעים תוך שעה לכל השרון. מחיר סגור לפני שמתחילים. התקשר עכשיו.״ גוגל לפעמים מחליפה את התיאור בטקסט משלה — ועדיין שווה לכתוב גרסה מדויקת.
```
```
BEFORE: H1 — הכותרת הראשית | H1 אחד בלבד לכל דף. כלול את מילת המפתח הראשית. H2 ו-H3 לכותרות משניות — בנה היררכיה ברורה שגם גוגל וגם הקורא מבינים.
AFTER: H1 — הכותרת הראשית | הכותרת הגדולה בראש הדף. H1 אחד בלבד לכל דף, עם מילת המפתח הראשית. H2 ו-H3 הן כותרות המשנה. המבחן פשוט: מי שקורא רק את הכותרות צריך להבין על מה הדף. אם הוא מבין, גם גוגל מבינה.
```
```
BEFORE: URL Structure | URL קצר, תיאורי, עם מילת המפתח. מספרים: רע (/p=123). מילים תיאוריות: טוב (/seo-guide). ללא תווים מיוחדים. קיצור מילים מיותר: גרוע.
AFTER: URL Structure | הכתובת של הדף. URL קצר, תיאורי, עם מילת המפתח. מספרים: רע (/p=123). מילים תיאוריות: טוב (/seo-guide). בלי תווים מיוחדים ובלי קיצורים שרק אתה מבין. וכלל ברזל: URL שכבר מדורג לא משנים. אם חייבים, רק עם Redirect 301.
```
```
BEFORE: Content Depth & Length | אין אורך מושלם — אבל תוכן שמכסה נושא לעומק תמיד מדורג גבוה יותר. הנוסחה פשוטה: בדקו מה יש בדפים המתחרים, מצאו מה חסר בהם, וכתבו את הדף המקיף והטוב ביותר ברשת.
AFTER: Content Depth & Length | אין אורך מושלם. יש שאלה אחת: הלקוח קיבל תשובה מלאה, או שהוא צריך לחזור לגוגל? תוכן שמכסה נושא לעומק מנצח תוכן שטחי. הנוסחה פשוטה: בדוק מה יש בדפים שמדורגים מעליך, מצא מה חסר בהם, וכתוב את הדף המקיף והטוב ביותר על הנושא. יש לך יתרון שאין לאף כותב תוכן: אתה מכיר את העבודה מבפנים.
```
```
BEFORE: Internal Linking | קשרו דפים רלוונטיים זה לזה עם Anchor Text תיאורי. Internal Links מחלקים PageRank, עוזרים לגוגל להבין את מבנה האתר ומאריכים את זמן השהייה באתר.
AFTER: Internal Linking | קשר דפים רלוונטיים זה לזה עם Anchor Text תיאורי, הטקסט שעליו לוחצים: ״מחירון ניקוי ספות״ ולא ״לחץ כאן״. Internal Links מחלקים PageRank, כלומר מעבירים כוח מהדפים החזקים לחלשים. הם עוזרים לגוגל להבין את מבנה האתר, ומשאירים את הלקוח אצלך עוד דף אחד.
```
```
BEFORE: (none)
AFTER: ☕ ביום ראשון בבוקר: בחר את שלושת הדפים שמביאים לך הכי הרבה כסף. לכל אחד כתוב Title Tag חדש עם השירות ועם העיר, Meta Description עם סיבה ללחוץ, ו-H1 אחד ברור. הוסף מכל דף שני קישורים פנימיים לדפים קרובים. שעה אחת, שלושה דפים.
```

### 8. E-E-A-T
```
BEFORE: E-E-A-T — ניסיון, מומחיות, סמכות ואמינות
AFTER: KEEP
```
```
BEFORE: E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) הוא המסגרת שגוגל משתמשת בה כדי להעריך איכות תוכן. כפול חשוב במיוחד לנושאי YMYL (Your Money or Your Life) — בריאות, פיננסים, משפטים ועסקים.
AFTER: E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) הוא המסגרת שגוגל משתמשת בה כדי להעריך איכות תוכן: ניסיון, מומחיות, סמכות ואמינות. במילים פשוטות, גוגל שואלת את מה שכל לקוח שואל: מי אתה, ולמה שאסמוך עליך? זה חשוב כפליים בנושאי YMYL (Your Money or Your Life) — בריאות, כסף, משפט ובטיחות. מרפאה, רואה חשבון וחשמלאי נמדדים כאן בסרגל מחמיר יותר מבלוג מתכונים.
```
```
BEFORE: האות הכפול Experience (ניסיון) נוסף ב-2022 כדי להדגיש ניסיון אישי ומעשי — לא רק מומחיות תיאורטית. גוגל מחפשת ראיות שהמחבר חווה את הנושא, לא רק כותב עליו.
AFTER: ה-E הראשונה, Experience (ניסיון), נוספה ב-2022 כדי להדגיש ניסיון אישי ומעשי — לא רק מומחיות תיאורטית. גוגל מחפשת ראיות שהמחבר עשה את הדבר בעצמו, לא רק כתב עליו. וכאן בעל המקצוע מנצח כל כותב תוכן: את השיפוץ הזה אתה עשית, ויש לך תמונות.
```
```
BEFORE: כיצד לבנות E-E-A-T חזק:
AFTER: איך בונים E-E-A-T חזק:
```
```
BEFORE: Author Pages: דף מחבר עם ביוגרפיה, תפקיד, ניסיון, ותמונה
AFTER: Author Pages: דף מחבר עם ביוגרפיה, תפקיד, ניסיון ותמונה. אצל עסק קטן זה אתה: שם מלא, ותק, רישיון או תעודה, ותמונה אמיתית שלך.
```
```
BEFORE: Entity Reconciliation: sameAs links ל-LinkedIn, AskPavel, Wikipedia
AFTER: Entity Reconciliation: sameAs links ל-LinkedIn, AskPavel, Wikipedia. בעברית: קישורים מהאתר לפרופילים שלך ברשת, כדי שגוגל תבין שכל אלה הם אותו אדם ואותו עסק.
```
```
BEFORE: Citations & Sources: קישורים למקורות אמינים, מחקרים, נתונים
AFTER: Citations & Sources: קישורים למקורות אמינים, מחקרים ונתונים. כתבת מספר? תראה מאיפה הוא.
```
```
BEFORE: Reviews & Testimonials: Google Reviews, Trustpilot, עדויות לקוחות
AFTER: Reviews & Testimonials: Google Reviews, Trustpilot, עדויות לקוחות. ביקורות אמיתיות בגוגל הן ההוכחה הכי חזקה שיש לעסק מקומי.
```
```
BEFORE: Press Mentions: ציטוטים ומאמרים בפרסומים ידועים
AFTER: Press Mentions: ציטוטים ומאמרים בפרסומים ידועים. גם כתבה במקומון או אזכור באתר של איגוד מקצועי נחשבים.
```
```
BEFORE: About Page חזק: תאריך הקמה, צוות, שליחות, כתובת, טלפון
AFTER: About Page חזק: תאריך הקמה, צוות, שליחות, כתובת, טלפון. עסק שלא מסתתר.
```
```
BEFORE: 🔑 E-E-A-T ב-2026: עם עליית ה-AI Content, גוגל מחפשת ראיות לניסיון אנושי אמיתי. "ניסיתי את זה ב-50 פרויקטים" חזק יותר מ"מחקרים מראים שX".
AFTER: 🔑 E-E-A-T ב-2026: כשכל אחד יכול לייצר AI Content בלחיצה, גוגל מחפשת ראיות לניסיון אנושי אמיתי. ״החלפתי 50 דודים כאלה, וזה מה שמתקלקל בהם״ חזק יותר מ״מחקרים מראים ש…״. את המשפט הראשון AI לא יכול לכתוב. אתה כן.
```
```
BEFORE: (none)
AFTER: ☕ ביום ראשון בבוקר: עדכן את דף ״אודות״: שם מלא, תמונה שלך, שנת הקמה, רישיון או הסמכה, כתובת וטלפון. הוסף לדף שירות אחד שלוש תמונות מעבודה אמיתית, עם שורה על מה שנעשה שם. ושלח לשלושה לקוחות מרוצים קישור לכתיבת ביקורת בגוגל.
```

### 9. Link Building
```
BEFORE: Link Building — בניית קישורים נכונה ב-2026
AFTER: KEEP
```
```
BEFORE: קישורים נכנסים (Backlinks) הם עדיין אחד מגורמי הדירוג החזקים ביותר. אבל ב-2026, איכות >> כמות. 10 קישורים מאתרים רלוונטיים ואמינים שווים יותר מ-1,000 קישורים מספאם.
AFTER: קישורים נכנסים (Backlinks) הם עדיין אחד מגורמי הדירוג החזקים ביותר. קישור מאתר אחר הוא המלצה: מישהו אומר לגוגל ״על העסק הזה אפשר לסמוך״. וכמו בהמלצות, חשוב מי ממליץ. ב-2026, איכות >> כמות. 10 קישורים מאתרים רלוונטיים ואמינים שווים יותר מ-1,000 קישורים מספאם. קישור אחד מאתר העירייה או מאיגוד מקצועי שווה יותר מערימת קישורים מאתרים שאף אחד לא קורא.
```
```
BEFORE: שיטות Link Building שעובדות ב-2026:
AFTER: KEEP
```
```
BEFORE: Digital PR | יצירת תוכן ראוי-ציטוט (מחקרים, סקרים, נתונים ייחודיים) שעיתונאים ומדיה מקשרים אליו.
AFTER: Digital PR | יצירת תוכן ראוי-ציטוט (מחקרים, סקרים, נתונים ייחודיים) שעיתונאים ומדיה מקשרים אליו. לעסק קטן: נתון שרק לך יש. מוסך שמפרסם את עשר התקלות הנפוצות שראה השנה נותן למקומון סיבה לכתוב עליו.
```
```
BEFORE: Guest Posting אסטרטגי | מאמרי אורח על אתרים מוסמכים בנישה שלכם — עם ביוגרפיה ו-Anchor Text נכון.
AFTER: Guest Posting אסטרטגי | מאמרי אורח באתרים מוכרים בנישה שלך — עם ביוגרפיה ו-Anchor Text נכון. פיזיותרפיסט שכותב טור באתר של מועדון ריצה מקבל גם קישור וגם מטופלים.
```
```
BEFORE: Resource Link Building | יצירת דף משאבים שאתרים אחרים ירצו לקשר אליו: כלים, מדריכים מקיפים, סטטיסטיקות.
AFTER: Resource Link Building | יצירת דף משאבים שאתרים אחרים ירצו לקשר אליו: כלים, מדריכים מקיפים, סטטיסטיקות. מחשבון, מחירון שקוף או צ׳קליסט להורדה. דף כזה מושך קישורים שנים.
```
```
BEFORE: HARO / Connectively | מענה לשאלות עיתונאים וקבלת ציטוטים עם קישורים ממדיה גדולה.
AFTER: HARO | מענה לשאלות של עיתונאים וקבלת ציטוט עם קישור מכלי תקשורת גדולים. השירות פועל בעיקר באנגלית. הגרסה הישראלית: להיות בעל המקצוע שהכתב של המקומון מתקשר אליו כשהוא צריך ציטוט.
```
```
BEFORE: Broken Link Building | מציאת קישורים שבורים באתרי נישה ודחיית תוכן חלופי לבעל האתר.
AFTER: Broken Link Building | מציאת קישורים שבורים באתרי נישה והצעת תוכן חלופי לבעל האתר. אתה עוזר לו לתקן תקלה, והוא מקשר אליך.
```
```
BEFORE: להימנע: קניית קישורים, Link Farms, PBNs, שחלופי קישורים (Link Exchanges) מסיביים. גוגל Penguin מזהה את כולם ב-2026 — ועונש יכול למחוק שנים של עבודה.
AFTER: להימנע: קניית קישורים, Link Farms, PBNs וחילופי קישורים (Link Exchanges) מסיביים. מערכות הספאם של גוגל, ו-Penguin בראשן, נבנו כדי לזהות את הדפוסים האלה — ועונש יכול למחוק שנים של עבודה. מישהו מציע לך ״חבילת 500 קישורים״ במחיר מבצע? תברח.
```
```
BEFORE: (none)
AFTER: ☕ ביום ראשון בבוקר: רשום חמישה גופים שכבר מכירים אותך: ספק, יבואן, איגוד מקצועי, לשכת המסחר, לקוח עסקי עם אתר. בקש מכל אחד קישור לאתר שלך מדף ״שותפים״, ״נותני שירות מורשים״ או ״לקוחות ממליצים״. טלפון אחד לכל אחד. אלה הקישורים הכי קלים והכי אמיתיים שתשיג.
```

### 10. Core Web Vitals
```
BEFORE: Core Web Vitals ו-Page Experience
AFTER: KEEP
```
```
BEFORE: Core Web Vitals הם מדדי חוויית המשתמש שגוגל כולל כגורמי דירוג רשמיים. ב-2024 INP (Interaction to Next Paint) החליף את FID כמדד השלישי.
AFTER: Core Web Vitals הם מדדי חוויית המשתמש שגוגל כוללת כגורמי דירוג רשמיים. שלושה מספרים שעונים על שלוש שאלות: כמה מהר רואים את הדף, האם הוא קופץ בזמן הטעינה, וכמה מהר הוא מגיב ללחיצה. ב-2024 INP (Interaction to Next Paint) החליף את FID כמדד השלישי. ולמה זה מעניין אותך? כי לקוח שמחכה לאתר שלך בטלפון לא מחכה הרבה. המתחרה נמצא במרחק לחיצה אחת אחורה.
```
```
BEFORE: LCP | Largest Contentful Paint | טוב: ≤ 2.5s | מהירות טעינת הרכיב הגדול ביותר
AFTER: LCP | Largest Contentful Paint | טוב: ≤ 2.5s | תוך כמה זמן רואים את החלק המרכזי של הדף, בדרך כלל התמונה הראשית
```
```
BEFORE: CLS | Cumulative Layout Shift | טוב: ≤ 0.1 | יציבות ויזואלית — האם הדף קופץ?
AFTER: CLS | Cumulative Layout Shift | טוב: ≤ 0.1 | האם הדף קופץ בזמן הטעינה? רצית ללחוץ על ״התקשר״ והכפתור ברח
```
```
BEFORE: INP | Interaction to Next Paint | טוב: ≤ 200ms | תגובתיות לקלט משתמש
AFTER: INP | Interaction to Next Paint | טוב: ≤ 200ms | לחצת על כפתור. כמה זמן עובר עד שהאתר מגיב?
```
```
BEFORE: לשיפור Core Web Vitals: Next.js מספק ציוני ירוק מחוץ לקופסה — Image Optimization, Lazy Loading, SSG/SSR. WordPress עם תמונות לא מאופטמות ו-12 פלאגינים פעילים = ציונים אדומים.
AFTER: לשיפור Core Web Vitals: אתרים שנבנו ב-Next.js מקבלים ציונים ירוקים כמעט מחוץ לקופסה — Image Optimization, Lazy Loading, SSG/SSR. האתר שלך על WordPress או Wix? אפשר להגיע לירוק גם שם. שני האשמים הרגילים הם תמונות כבדות ותוספים (פלאגינים) מיותרים. תמונה שצולמה בטלפון ועלתה לאתר כמו שהיא שוקלת הרבה יותר ממה שצריך.
```
```
BEFORE: (none)
AFTER: ☕ ביום ראשון בבוקר: היכנס ל-PageSpeed Insights (חינם), הדבק את כתובת דף הבית ובדוק את לשונית המובייל. אדום או כתום? צלם את המסך ושלח למי שבנה את האתר, עם שתי בקשות: לכווץ את התמונות ולהסיר תוספים שלא בשימוש. משם מתחילים.
```

### 11. קידום מקומי
```
BEFORE: קידום מקומי — להופיע בחיפוש "קרוב אליי"
AFTER: קידום מקומי — להופיע בחיפוש ״קרוב אליי״
```
```
BEFORE: לעסקים עם פעילות פיזית — מסעדות, קליניקות, חנויות, נותני שירות — קידום מקומי הוא לרוב ערוץ ה-ROI הגבוה ביותר. חיפושים כמו "אינסטלטור בתל אביב" או "טיפולי שיניים קרוב אליי" הם עסקאיים במהותם — המחפש מוכן לפעולה.
AFTER: אם יש לך עסק עם כתובת או אזור שירות — מסעדה, קליניקה, חנות, נותן שירות — זה הפרק הכי חשוב במדריך. קידום מקומי (Local SEO) הוא לרוב ערוץ ה-ROI הגבוה ביותר, כלומר הכי הרבה לקוחות על כל שקל ושעה שהשקעת. חיפושים כמו ״אינסטלטור בתל אביב״ או ״טיפולי שיניים קרוב אליי״ הם עסקאיים במהותם: מי שמקליד אותם לא עושה מחקר. הוא רוצה להתקשר למישהו עכשיו. בחיפושים האלה גוגל מציגה קודם כול מפה עם שלושה עסקים, ה-Local Pack. שם אתה רוצה להיות.
```
```
BEFORE: Google Business Profile | הפרופיל העסקי שמופיע בתיבת המפה ובחיפושים מקומיים. יש לוודא עדכניות של שעות, כתובת, קטגוריות ותמונות — ולצבור ביקורות לקוחות אמיתיות.
AFTER: Google Business Profile | הפרופיל העסקי שמופיע בתיבת המפה ובחיפושים מקומיים. הוא חינמי, ולעסק מקומי הוא חשוב לא פחות מהאתר. מלא אותו עד הסוף: קטגוריה ראשית מדויקת, שעות פתיחה כולל חגים, טלפון, אתר ותמונות אמיתיות מהעבודה. ובקש ביקורת מכל לקוח מרוצה, כשהעבודה עוד טרייה.
```
```
BEFORE: עקביות NAP | שם, כתובת וטלפון (Name, Address, Phone) חייבים להיות זהים בכל הרשת: אתר, Google Business Profile, Facebook ודפי עסקים. חוסר עקביות מבלבל את גוגל ופוגע בדירוג המקומי.
AFTER: עקביות NAP | שם, כתובת וטלפון (Name, Address, Phone) חייבים להיות זהים בכל הרשת: אתר, Google Business Profile, Facebook ודפי עסקים. באתר כתוב ״אבי אינסטלציה״, בפייסבוק ״א.ב. אינסטלציה ושיפוצים״, ובאינדקס ישן מופיע טלפון שהחלפת מזמן? גוגל לא בטוחה שזה אותו עסק, והדירוג המקומי נפגע.
```
```
BEFORE: (none)
AFTER: ☕ ביום ראשון בבוקר: חפש את שם העסק שלך בגוגל והסתכל על הפרופיל כמו לקוח. השעות נכונות? הטלפון נכון? יש תמונות מהחודשים האחרונים? תקן מה שחסר, העלה שלוש תמונות חדשות מהטלפון, ושלח לשני לקוחות מרוצים קישור לביקורת. חצי שעה.
```

### 12. מדידה וכלים
```
BEFORE: מדידה וכלים — איך יודעים שה-SEO עובד?
AFTER: KEEP
```
```
BEFORE: לעשות SEO בלי למדוד נתונים זה פשוט לירות באפילה. ארבעה כלים חיוניים שכל מי שעוסק ב-SEO צריך להכיר:
AFTER: SEO בלי מדידה הוא ירייה באפלה: אתה משקיע שעות ולא יודע מה עבד. ארבעה כלים חיוניים שכל מי שעוסק ב-SEO צריך להכיר — ולעסק קטן, הראשון מספיק כדי להתחיל:
```
```
BEFORE: Google Search Console | הכלי הרשמי של גוגל — חינם ומדויק יותר מכל כלי אחר. מציג אילו דפים מאונדקסים, על אילו ביטויים מופיעים, מה שיעור ההקלקה (CTR) ומה שגיאות הסריקה. הראשון לפתוח בכל פרויקט SEO.
AFTER: Google Search Console | הכלי הרשמי של גוגל — חינם ומדויק יותר מכל כלי אחר. הוא מראה אילו דפים מאונדקסים (נמצאים במאגר של גוגל), על אילו ביטויים אתה מופיע, מה שיעור ההקלקה (CTR) ואילו שגיאות סריקה יש. הראשון שפותחים בכל פרויקט SEO. אם תפתח רק כלי אחד, שיהיה זה.
```
```
BEFORE: Rank Tracking | מעקב אחר מיקום מילות המפתח לאורך זמן. כלים כמו Semrush, Ahrefs ו-SERPWatch מראים תנועות דירוג. חשוב למדוד מגמות לאורך שבועות — לא תנודות יומיות.
AFTER: Rank Tracking | מעקב אחר המיקום של מילות המפתח לאורך זמן. כלים כמו Semrush, Ahrefs ו-SERPWatch מראים את התנועה בדירוג. מודדים מגמה של שבועות, לא תנודות של יום. ירדת מקום אחד ביום שלישי? זה רעש. ירדת חמישה מקומות בחודש? זה סימן.
```
```
BEFORE: SEO Audit | ביקורת תקופתית של האתר: בעיות טכניות, פערי תוכן, קניבליזציה וקישורים שבורים. מומלץ לבצע אחת לרבעון ולאחר כל עדכון ליבה משמעותי.
AFTER: SEO Audit | ביקורת תקופתית של האתר: בעיות טכניות, פערי תוכן, קניבליזציה וקישורים שבורים. כמו טסט לרכב. עושים אחת לרבעון, ואחרי כל עדכון ליבה (Core Update) משמעותי של גוגל.
```
```
BEFORE: Competitive Analysis | ניתוח מתחרי ה-SEO שלכם — לא בהכרח המתחרים העסקיים. מי מדורג מעלינו בביטויים המרכזיים? מה מבנה הקישורים שלו? מה פערי התוכן? ניתוח מתחרים מספק מפת דרכים מובנית.
AFTER: Competitive Analysis | ניתוח מתחרי ה-SEO שלך — לא בהכרח המתחרים העסקיים. המתחרה שלך בגוגל הוא מי שמדורג מעליך, גם אם זה אינדקס ארצי ולא העסק ממול. מה הוא כתב שאתה לא? מי מקשר אליו? התשובות הן תוכנית העבודה שלך.
```
```
BEFORE: (none)
AFTER: ☕ ביום ראשון בבוקר: פתח Google Search Console, לשונית ״ביצועים״, שלושה חודשים אחורה. חפש ביטויים שבהם אתה במיקום 5 עד 15 עם הרבה חשיפות. אלה הלקוחות שכמעט הגיעו אליך. חזק את הדפים האלה קודם: כותרת טובה יותר, תשובה מלאה יותר, קישור פנימי נוסף. ושים תזכורת ביומן לבדוק שוב בעוד חודש.
```

### 13. כמה זמן לוקח
```
BEFORE: כמה זמן לוקח קידום אתרים לראות תוצאות?
AFTER: KEEP
```
```
BEFORE: SEO הוא ריצת מרתון, לא ספרינט. אלה ציפיות ריאליות לפי שלבים:
AFTER: SEO הוא ריצת מרתון, לא ספרינט. מי שמבטיח לך מקום ראשון תוך חודש מוכר לך משהו אחר. אבל מי שמתמיד בונה נכס שלמתחרים קשה לקחת ממנו. אלה ציפיות ריאליות לפי שלבים:
```
```
BEFORE: חודשים 1–3 | איסוף מידע | גוגל סורק ומאנדקס את השינויים. ייתכן ירידה קלה לפני עלייה (Sandbox Effect). מתמקדים ב-Technical SEO ו-Content.
AFTER: חודשים 1–3 | איסוף מידע | גוגל סורקת ומאנדקסת את השינויים. בחוץ עוד לא רואים כלום, וזה תקין. ייתכנו תנודות, ואתר חדש לפעמים מחכה בצד (מקדמי אתרים קוראים לזה Sandbox Effect). מתמקדים ב-Technical SEO וב-Content. בשלב הזה רוב האנשים מתייאשים. אל תהיה אחד מהם.
```
```
BEFORE: חודשים 3–6 | תנועה ראשונה | שיפור ראשון במיקומים למילות מפתח ארוכות (Long-Tail). עלייה ב-Impressions ב-Search Console.
AFTER: חודשים 3–6 | תנועה ראשונה | שיפור ראשון במיקומים למילות מפתח ארוכות (Long-Tail). עלייה ב-Impressions (חשיפות) ב-Search Console. הטלפון עוד לא מצלצל יותר, אבל הגרף כבר זז.
```
```
BEFORE: חודשים 6–12 | צמיחה משמעותית | עלייה ב-Organic Traffic. מילות מפתח תחרותיות מתחילות לעלות. לידים אורגניים ראשונים.
AFTER: חודשים 6–12 | צמיחה משמעותית | עלייה ב-Organic Traffic, התנועה שמגיעה מגוגל בלי תשלום. מילות מפתח תחרותיות מתחילות לעלות. מגיעים הלידים האורגניים הראשונים: לקוח שאומר ״מצאתי אותך בגוגל״.
```
```
BEFORE: שנה 1–2 | Topical Authority מלאה | דירוגים יציבים, תנועה צומחת, Topical Authority מוכר. ROI מלא על השקעת ה-SEO.
AFTER: שנה 1–2 | Topical Authority מלאה | דירוגים יציבים, תנועה צומחת, Topical Authority מוכר. ROI מלא על השקעת ה-SEO: העבודה של השנה שעברה ממשיכה להביא לקוחות.
```
```
BEFORE: (none)
AFTER: ☕ ביום ראשון בבוקר: קבע ביומן שעתיים קבועות בשבוע ל-SEO, ותתייחס אליהן כמו לפגישה עם לקוח. רשום היום שלושה מספרים: כמה פניות הגיעו מגוגל החודש, כמה חשיפות יש לך ב-Search Console, ובאיזה מקום אתה בביטוי הראשי שלך. בדוק אותם שוב כל חודש. בלי המספרים האלה לא תדע אם אתה מתקדם.
```

### 14. 10 טעויות SEO
```
BEFORE: 10 טעויות SEO נפוצות שפוגעות בדירוג ב-2026
AFTER: KEEP
```
```
BEFORE: 1. תוכן AI-Only ללא ניסיון אנושי | גוגל מזהה ומוריד תוכן AI שטחי. AI + מומחיות אנושית = עובד. AI בלבד = ענישה.
AFTER: 1. תוכן AI-Only ללא ניסיון אנושי | ביקשת מ-ChatGPT עשרה מאמרים והעלית אותם כמו שהם? גוגל מורידה תוכן שטחי שנכתב רק כדי לדרג. AI + הניסיון שלך = עובד. AI בלבד = נפילה. תן ל-AI לנסח, ואת הידע תביא אתה.
```
```
BEFORE: 2. זניחת ה-Technical SEO | תוכן מצוין על אתר עם Crawl Issues = בזבוז. Technical הוא הבסיס.
AFTER: 2. זניחת ה-Technical SEO | תוכן מצוין באתר עם Crawl Issues (בעיות סריקה) הוא בזבוז: גוגל לא יכולה לדרג מה שהיא לא מצליחה לקרוא. Technical הוא הבסיס.
```
```
BEFORE: 3. Keyword Stuffing — עדיין קיים | שימוש מוגזם במילות מפתח פוגע בדירוג ובחוויית משתמש.
AFTER: 3. Keyword Stuffing — עדיין קיים | לדחוף ״אינסטלטור בחיפה״ עשרים פעמים לאותו דף לא עובד כבר שנים. זה פוגע בדירוג ומבריח את הלקוח. כתוב כמו שאתה מדבר.
```
```
BEFORE: 4. קניית קישורים | Penguin מזהה קישורים קנויים. רק קישורים אמיתיים ורלוונטיים בונים סמכות.
AFTER: 4. קניית קישורים | מערכות הספאם של גוגל, ו-Penguin בראשן, נבנו כדי לזהות קישורים קנויים. רק קישורים אמיתיים ורלוונטיים בונים סמכות. חסכת זמן, סיכנת את האתר.
```
```
BEFORE: 5. זניחת ה-Mobile-First | 60%+ מהגלישה היא ממובייל. גוגל מאנדקס Mobile-First. אתר לא מותאם = ענישה.
AFTER: 5. זניחת ה-Mobile-First | יותר מחצי מהגלישה בישראל היא מהטלפון (Statcounter, 2026). גוגל מאנדקסת Mobile-First: היא שופטת את האתר לפי הגרסה בנייד. אתר שלא נוח בטלפון מפסיד פעמיים — בדירוג ואצל הלקוח.
```
```
BEFORE: 6. חוסר ב-E-E-A-T | תוכן ללא מחבר מזוהה, ללא ביוגרפיה, ללא מקורות = דירוג נמוך בנושאי YMYL.
AFTER: 6. חוסר ב-E-E-A-T | תוכן בלי מחבר מזוהה, בלי ביוגרפיה ובלי מקורות = דירוג נמוך, במיוחד בנושאי YMYL. אתר בלי שם ובלי פנים נראה לגוגל כמו עסק בלי שלט.
```
```
BEFORE: 7. זניחת ה-Internal Linking | Internal Links מחלקים PageRank ועוזרים לגוגל להבין מבנה האתר.
AFTER: 7. זניחת ה-Internal Linking | Internal Links מחלקים PageRank ועוזרים לגוגל להבין את מבנה האתר. דף שאף דף אחר לא מקשר אליו הוא חדר בלי דלת.
```
```
BEFORE: 8. Core Web Vitals אדומים | דף שנטען ב-5+ שניות מפסיד דירוג ומשתמשים כאחד.
AFTER: 8. Core Web Vitals אדומים | דף שנטען ב-5 שניות ויותר מפסיד גם דירוג וגם לקוחות. אף אחד לא מחכה לאתר של אינסטלטור כשהמים כבר על הרצפה.
```
```
BEFORE: 9. תוכן ללא עדכון | גוגל מתגמלת תוכן עדכני. עדכן מאמרים ישנים — תאריך, נתונים, פנייה ל-AI Overviews.
AFTER: 9. תוכן ללא עדכון | גוגל מתגמלת תוכן עדכני. עדכן מאמרים ישנים: תאריך, נתונים, מחירים, ותשובה ישירה בראש הדף בשביל ה-AI Overviews. מחירון של 2022 באתר אומר ללקוח שאף אחד לא בבית.
```
```
BEFORE: 10. מדידת ה-Wrong KPIs | דירוג גבוה ≠ הצלחה. מדדו: תנועה אורגנית, לידים מ-SEO, Revenue — לא רק מיקום.
AFTER: 10. מדידת ה-KPIs הלא נכונים | דירוג גבוה ≠ הצלחה. מקום ראשון בביטוי שאף אחד לא מחפש לא משלם משכורות. מדוד: תנועה אורגנית, לידים מ-SEO, Revenue (הכנסות) — לא רק מיקום.
```
```
BEFORE: (none)
AFTER: ☕ ביום ראשון בבוקר: עבור על הרשימה וסמן בכנות אילו טעויות קיימות אצלך. בחר שתיים בלבד, ותקן אותן החודש. שתיים שתוקנו שוות יותר מעשר שסומנו.
```

### FAQ (today only in schema, not visible)
The three existing questions stay byte-exact. The visible answers and the schema `text` must be identical.
```
BEFORE: כמה זמן לוקח קידום אתרים להראות תוצאות? | תוצאות ראשונות (שיפור מיקומים) מורגשות בדרך כלל תוך 3–4 חודשים. צמיחה משמעותית בתנועה מגיעה תוך 6–12 חודשים. תחומים תחרותיים עשויים לדרוש 12–18 חודשים.
AFTER: כמה זמן לוקח קידום אתרים להראות תוצאות? | תוצאות ראשונות (שיפור מיקומים) מורגשות בדרך כלל תוך 3–4 חודשים. צמיחה משמעותית בתנועה מגיעה תוך 6–12 חודשים. תחומים תחרותיים עשויים לדרוש 12–18 חודשים. מי שמתחיל מהפרופיל העסקי בגוגל ומביטויים מקומיים מתחיל מהמקום שבו התחרות קטנה יותר.
```
```
BEFORE: מה זה Topical Authority ולמה זה חשוב ב-2026? | Topical Authority היא הסמכות הנושאית שגוגל מייחס לאתר בתחום מסוים. אתר שמכסה נושא לעומק (Content Clusters, Pillar Pages) מדורג גבוה יותר מאשר אתר עם מאמרים מפוזרים. ב-2026 זה קריטי גם לציטוט ב-AI Overviews.
AFTER: מה זה Topical Authority ולמה זה חשוב ב-2026? | Topical Authority היא הסמכות הנושאית שגוגל מייחסת לאתר בתחום מסוים. אתר שמכסה נושא לעומק (Content Clusters, Pillar Pages) מדורג גבוה יותר מאתר עם מאמרים מפוזרים. ב-2026 זה קריטי גם לציטוט ב-AI Overviews. בפשטות: עדיף להיות המומחה של נושא אחד מאשר לכתוב קצת על הכול.
```
```
BEFORE: האם SEO עדיין רלוונטי עם AI Overviews? | יותר מאי פעם. AI Overviews מצטטים מקורות ספציפיים — ואתרים עם Topical Authority, E-E-A-T חזק ו-Structured Data מלא מופיעים בציטוטים. זה חשיפה כפולה: גם בתוצאה האורגנית וגם ב-AI Overview.
AFTER: האם SEO עדיין רלוונטי עם AI Overviews? | יותר מאי פעם. AI Overviews מצטטים מקורות ספציפיים — ואתרים עם Topical Authority, E-E-A-T חזק ו-Structured Data מלא מופיעים בציטוטים. זו חשיפה כפולה: גם בתוצאה האורגנית וגם ב-AI Overview. ה-AI צריך מקורות. השאלה היחידה היא אם המקור יהיה אתה או המתחרה.
```

### Author bio
```
BEFORE: מייסד WAO | מומחה SEO ושיווק דיגיטלי מאז 2006
AFTER: KEEP
```
```
BEFORE: מלווה עסקים ישראלים בצמיחה דיגיטלית מאז ראשית ימי ה-SEO בארץ. מדריך זה מבוסס על ניסיון מעשי עם מאות פרויקטי קידום לאורך מעל 20 שנה — מימי האינדקסים הראשונים ועד לעידן ה-AI Overviews.
AFTER: KEEP
```
```
BEFORE: עודכן לאחרונה: יוני 2026
AFTER: עודכן לאחרונה: נובמבר 2026
```

### Knowledge hub box
```
BEFORE: 81 מדריכים במאגר הידע שלנו
AFTER: {N} מדריכים במאגר הידע שלנו
```
`{N}` is the live article count, inserted by the engineer.
```
BEFORE: כל נושא מהמדריך — robots.txt, Core Web Vitals, E-E-A-T, hreflang ועוד — מוסבר לעומק.
AFTER: נתקעת על מונח? כל נושא מהמדריך — robots.txt, Core Web Vitals, E-E-A-T, hreflang ועוד — מוסבר שם לעומק, בעמוד משלו.
```
```
BEFORE: מאגר הידע ←
AFTER: KEEP
```

### CTA banner
```
BEFORE: רוצים שמישהו יעשה את זה בשבילכם?
AFTER: רוצה שמישהו יעשה את זה בשבילך?
```
```
BEFORE: שירות ה-SEO המלא של WAO — ייעוץ ראשון חינם
AFTER: KEEP
```
Keep only if you confirm the free-consultation offer is still true.
```
BEFORE: עברתם את המדריך. עכשיו הגיע הזמן ליישם. צוות WAO יבנה לכם אסטרטגיית SEO מלאה ויוציא אותה לפועל.
AFTER: קראת את המדריך, ועכשיו אתה יודע מה צריך לקרות. אין לך שעתיים בשבוע לעשות את זה בעצמך? WAO בונה את תוכנית ה-SEO ומבצעת אותה, ואתה חוזר לעבוד.
```
```
BEFORE: 📞 052-614-8860 / שירות קידום אתרים ←
AFTER: KEEP
```

### Sidebar CTA box
```
BEFORE: רוצים שנעשה את זה בשבילכם?
AFTER: רוצה שנעשה את זה בשבילך?
```
```
BEFORE: ייעוץ SEO ראשון — חינם וללא התחייבות.
AFTER: KEEP
```
Same offer question as the banner.

## 4. New elements

### A. "Start here" box with a 15-minute checklist
Placed under the hero as an `<aside>` with no heading tag, so the H2 outline is unchanged. It gives the busy owner a win before he bounces, and its jump links add internal anchors to five sections. Competitors rank with step-by-step openers; WAO has none.
```
יש לך עסק קטן ורק רבע שעה? התחל כאן.
1. חפש את עצמך כמו לקוח: השירות שלך והעיר שלך. איפה אתה? (2 דקות)
2. הקלד בגוגל site: ואת כתובת האתר. גוגל מכירה את הדפים שלך? (2 דקות) ← Technical SEO
3. פתח את הפרופיל העסקי שלך בגוגל. שעות, טלפון ותמונות מעודכנים? (4 דקות) ← קידום מקומי
4. הרץ את דף הבית ב-PageSpeed Insights, בלשונית המובייל. (2 דקות) ← Core Web Vitals
5. תקן את ה-Title Tag של דף הבית: שירות, עיר, שם העסק. (5 דקות) ← On-Page SEO
סיימת? עכשיו קרא את המדריך לפי הסדר. כל פרק נגמר במשימה אחת ליום ראשון בבוקר.
```

### B. A second cluster example for a small business
Placed in section 5, under the existing example. The current example is about SEO itself; this one shows the reader his own case and adds local-service entities.
```
דוגמה — Cluster למרפאת שיניים ברחובות:
🏛️ Pillar: השתלות שיניים ברחובות — המדריך המלא למטופל
📄 Cluster: כמה עולה השתלת שיניים, וממה המחיר מורכב
📄 Cluster: השתלה ביום אחד — למי זה מתאים
📄 Cluster: כאבים אחרי השתלה — מה תקין ומתי מתקשרים
📄 Cluster: השתלה או גשר — איך בוחרים
📄 Cluster: כמה זמן מחזיק שתל, ואיך שומרים עליו
```

### C. Image SEO card
Added to On-Page as a seventh card. Three competitors cover images and Alt text and this page does not, although its chip row already links the Image SEO article.
```
Image SEO — תמונות ו-Alt Text | גוגל לא רואה תמונות, היא קוראת עליהן. תן לקובץ שם שמתאר מה בתמונה, וכתוב Alt Text — משפט קצר שמתאר אותה: ״החלפת דוד שמש על גג בפתח תקווה״. כווץ את התמונה לפני שאתה מעלה אותה. ותמונות אמיתיות מהעבודה שלך עדיפות על תמונות מאגר.
```

### D. Free profile check link
One line under the local section's Sunday task, linking to `/site-bot/audit`. The local section is where this reader converts, and the audit is the natural next step without a hard sell.
```
רוצה לדעת מה חסר בפרופיל שלך? הבדיקה החינמית שלנו עוברת עליו בדקה.
```

### E. Visible FAQ section
A new H2 after the mistakes section, plus a TOC entry "שאלות נפוצות". It holds the three questions above and four new ones. This fixes the markup-without-visible-content problem, gives the AI Overview extractable answers, and matches the questions competitors answer. Add all seven to the FAQ schema.
```
שאלות נפוצות על קידום אתרים

אפשר לעשות קידום אתרים לבד?
כן. בעל עסק יכול לעשות לבד את רוב מה שמשפיע: פרופיל עסקי מלא בגוגל, כותרות טובות, דפי שירות שעונים על שאלות של לקוחות, וביקורות. לחלק הטכני כדאי להיעזר במי שבנה את האתר. המחיר האמיתי הוא זמן: שעתיים בשבוע, בהתמדה.

מה ההבדל בין קידום אורגני (SEO) לקידום ממומן (PPC)?
בממומן משלמים לגוגל על כל קליק. התוצאות מיידיות, ונעלמות כשמפסיקים לשלם. באורגני לא משלמים על קליקים. התוצאות נבנות בחודשים, ונשארות. הרבה עסקים משלבים: ממומן ללקוחות של היום, אורגני ללקוחות של השנה הבאה.

למה האתר שלי לא מופיע בגוגל?
שלוש סיבות נפוצות. גוגל עדיין לא מכירה את האתר: בדוק עם site: ועם Google Search Console. הדפים חסומים לסריקה בטעות, ב-noindex או ב-robots.txt. או שהאתר מופיע, אבל בעמוד חמש, כי התוכן לא עונה על מה שאנשים מחפשים.

צריך לדעת לתכנת כדי לקדם אתר?
לא. רוב העבודה היא כתיבה, סדר והתמדה: מה לכתוב, איך לקרוא לדפים ואיך לקשר ביניהם. את הסעיפים הטכניים — מהירות, Schema, הפניות — מעבירים פעם אחת למי שבנה את האתר, עם רשימה ברורה.
```

## 5. Word count (estimated)

| | Visible words |
|---|---|
| Before (script count on the source, excluding tooltips and the sidebar) | ~2,050, of which ~1,570 Hebrew |
| After: rewritten sections | ~3,350 |
| After: new elements A–E | ~500 |
| **After, total** | **~3,850 (about +85%)** |

No section shrinks. The new length sits between the short competitors (~2,000) and the long ones (5,500–6,000).

Sources:
- [danielzrihen.co.il SEO guide](https://danielzrihen.co.il/seo-guide/)
- [digitouch.co.il SEO guide](https://digitouch.co.il/seo-guide/)
- [seolinks.co.il SEO guide](https://www.seolinks.co.il/seo-guide/)
- [galyam-studio.co.il SEO guide](https://www.galyam-studio.co.il/google-seo-guide/)
- [amitadler.co.il SEO guide](https://www.amitadler.co.il/seo-guide/)
- [Semrush: AI Overviews across commercial modifiers](https://www.semrush.com/blog/ai-overviews-commercial-modifiers-study/)
- [AI search statistics 2026, checked at source (SparkToro, Conductor, Pew)](https://www.gscwizard.com/learn/seo-fundamentals/ai-search-statistics-2026.html)
- [Similarweb 43% figure](https://www.thekeyword.co/news/google-ai-overviews-search-share)
- [Google Search Help: AI Overviews availability](https://support.google.com/websearch/answer/14901683?p=ai_overviews&rd=1)
- [Search Engine Roundtable: AI Mode expansion](https://www.seroundtable.com/google-ai-mode-expands-40232.html)
- [Search Engine Journal: Google drops FAQ rich results](https://www.searchenginejournal.com/google-drops-faq-rich-results)
- [FAQ structured data in 2026](https://seocrawl.ai/blog/faq-structured-data-google-2026)
- [Cision sells HARO to Featured](https://www.aap.com.au/aapreleases/cision20250415ae64404)
- [Statcounter: mobile vs desktop, Israel](https://gs.statcounter.com/platform-market-share/desktop-mobile/israel)