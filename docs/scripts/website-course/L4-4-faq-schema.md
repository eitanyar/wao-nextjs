---
marp: true
theme: wao-rtl
paginate: true
direction: rtl
module: 4
lesson: 4
title: "המתחרה שלך כבר מצוטט ב-AI. בוא נעקוף אותו"
lang: he
dir: rtl
status: draft-pending-noa
author: Gil (instructional-designer)
source-brief: "Yonatan (seo-strategist) verified brief, 2026-07-03 — FAQPage rich-result deprecation confirmed May 7, 2026 (no visible SERP feature since); FAQPage JSON-LD remains valid markup with no penalty and functions as a structural signal for AI Overviews/AI Mode/ChatGPT Search/Perplexity; freshness — content updated within 30 days cited ~3.2x more (Ahrefs, July 2026)."
runtime-target: "5–6 דקות (~590 מילות קריינות)"
pipeline: "Noa (proof + TTS polish) → marp --html preview → Eitan-Dev (render: TTS → Marp → ffmpeg)"
---

<!--
  ============================================================
  LEARNING OBJECTIVE
  ============================================================
  By the end of this lesson the student will:
  1. Add his 3 finished FAQ question+answer pairs to his page
  2. Understand what FAQPage JSON-LD schema does (a structural
     signal that helps AI engines read the block correctly) and
     does NOT do (it will not produce a visible accordion in
     Google search results — that feature was deprecated)
  3. Know, in one plain sentence, that FAQPage rich results were
     deprecated by Google on May 7, 2026
  4. Have asked his AI builder to add FAQPage schema to the FAQ
     block, and validated it with an external schema-validator
     tool
  5. Understand the visible content (from L4-2/L4-3) is still the
     real lever — schema is bookkeeping, not the sale

  ============================================================
  CONTINUITY
  ============================================================
  - L4-1: learner saved one real customer question.
  - L4-2: learner turned it into 3 customer-phrased FAQ questions.
  - L4-3: learner wrote direct 2–3 sentence answers to all 3.
  - This lesson is the module's closing lesson — it also recaps
    Module 4 and bridges into Module 5 (going live).
  - Recurring example: אבי — plumber from Holon, old apartments,
    hidden leaks without breaking walls, arrives within an hour.

  ============================================================
  CRITICAL CONSTRAINT — MUST NOT VIOLATE
  ============================================================
  FAQPage rich results were deprecated by Google on May 7, 2026.
  This lesson must NEVER imply "Google will show your FAQ as an
  accordion in search results." Framed strictly as AEO/GEO —
  being cited in AI Overviews, AI Mode, ChatGPT Search,
  Perplexity — never as a rich-snippet play. The deprecation is
  acknowledged in one plain sentence on Slide 4 and the lesson
  moves on. See docs/scripts/website-course/module-4-5-narration-
  constraints.md, Fix 1.

  ============================================================
  NET-NEW / FACT-CHECK FLAGS (for strategist verification)
  ============================================================
  - May 7, 2026 deprecation date and "no penalty, still valid
    markup" framing are stated exactly as given in Yonatan's
    brief — already fact-checked. No further verification needed
    unless this lesson renders long after 2026-07-03.
  - The 30-day / 3.2x freshness statistic is stated exactly as
    given in Yonatan's brief, sourced (Ahrefs, July 2026). Re-
    verify if this lesson renders more than ~60 days later.
  - The "label on a filing cabinet" analogy is a pedagogical
    device (Gil's), not a domain claim — no fact-check needed.

  ============================================================
  OUT OF SCOPE FOR THIS LESSON
  ============================================================
  - Writing the questions/answers themselves (already done,
    L4-2/L4-3)
  - Any AI-tool or validator-tool UI walkthrough (resource list
    only — exact click-path lives on the lesson page, not here)
  - Domain/hosting/deployment mechanics (Module 5)
  ============================================================
-->

<!-- SLIDE 1 — TITLE + HOOK -->

# המתחרה שלך כבר מצוטט ב-AI
## בוא נעקוף אותו

**קורס בניה + קידום אתרים בעידן ה-AI**
#### WAO · מודול 4 | שיעור 4

<!--
יש לך עכשיו בלוק שלם, שאלות ותשובות שנשמעות כמוך.
אבל המתחרה שלך אולי כבר מצוטט ב-AI, ואתה עדיין לא.
היום נוסיף שכבה אחת אחרונה, שעוזרת למכונות להבין את הבלוק שלך נכון.
זה השלב האחרון במודול, וגם הקל ביותר.
-->

---

<!-- SLIDE 2 — RECAP: WHAT YOU ALREADY HAVE -->

## מה כבר יש לך ביד

- שלוש שאלות, בדיוק כמו שהלקוח שואל
- שלוש תשובות, לפי הנוסחה, בלי היסוס וּבלי הקדמות
- בלוק מלא, מוכן להיכנס לדף השירות שלך

<!--
בוא נזכיר מה כבר יש לך ביד.
שלוש שאלות, בדיוק כמו שהלקוח שלך שואל אותן.
שלוש תשובות, לפי הנוסחה, בלי היסוס וּבלי הקדמות.
זה בלוק שלם, מוכן להיכנס לדף השירות שלך.
נשאר רק דבר אחד.
-->

---

<!-- SLIDE 3 — WHAT FAQPAGE SCHEMA IS -->

## תווית על ארון תיוק, שרק מחשב קורא

- הלקוח שלך לא רואה את הסימון הזה בכלל
- זה קוד קצר שאומר למכונה: כאן שאלה, כאן תשובה
- כמו תווית על ארון תיוק — בני אדם לא צריכים אותה, מחשב כן

<!--
עכשיו נדבר על משהו שנקרא FAQPage schema.
תשכח לרגע מהשם המסובך.
תחשוב על תווית על ארון תיוק במשרד.
בן אדם שנכנס לחדר, בכלל לא שם לב אליה.
אבל מחשב שסורק את הארון, קורא אותה, ויודע מה בפנים.
הסימון הזה עושה בדיוק את זה, לבלוק השאלות שלך.
-->

---

<!-- SLIDE 4 — THE DEPRECATION, ONE SENTENCE, AND WHAT IT DOES NOW -->

## מה זה כן עושה, ומה זה כבר לא עושה

- עד מאי 2026 סימון כזה גם גרם לשאלות להופיע כתפריט נפתח בגוגל
- גוגל הפסיקה את זה. זה כבר לא קורה לאף אחד, גם לא למתחרים שלך
- **מה שהוא כן עושה:** עוזר ל-AI Overviews, ל-AI Mode ול-ChatGPT Search לקרוא נכון את מבנה הדף שלך

<!--
חשוב שתדע דבר אחד, לפני שממשיכים.
עד מאי אלפיים עשרים ושש, סימון כזה גם גרם לשאלות להופיע כתפריט נפתח בגוגל.
גוגל הפסיקה את זה. זה כבר לא קורה לאף אחד, גם לא למתחרים שלך.
אבל התפקיד האמיתי שלו נשאר בדיוק כמו שהיה.
הוא עוזר ל-AI Overviews, ל-AI Mode, וּל-ChatGPT Search לקרוא נכון את מבנה הדף שלך.
-->

---

<!-- SLIDE 5 — THE REAL LEVER IS STILL VISIBLE CONTENT -->

## הסימון הוא הנהלת חשבונות. התוכן הוא המכירה

- הסימון לא יגרום ל-AI לצטט תוכן חלש או כללי
- התוכן שכתבת בשיעורים הקודמים, זה מה שבאמת גורם לציטוט
- הסימון רק מוודא שהמכונה קוראת אותו נכון

<!--
תזכור נקודה אחת, וזאת הכי חשובה.
הסימון לא יגרום ל-AI לצטט תוכן חלש או כללי.
התוכן שכתבת בשיעורים הקודמים, זה מה שבאמת גורם לציטוט.
הסימון רק מוודא שהמכונה קוראת אותו נכון.
תחשוב עליו כמו הנהלת חשבונות, לא כמו מכירה.
-->

---

<!-- SLIDE 6 — THE PROMPT: ADD SCHEMA + VALIDATE -->

## הפרומפט שמוסיף את הסימון בשבילך

```
תוסיף סימון FAQPage schema, בפורמט JSON-LD,
לבלוק השאלות והתשובות הזה בדף.
תשתמש במבנה הרשמי של schema.org.
```

- אחרי שה-AI מוסיף את הקוד, תבדוק אותו **בכלי אימות סכמה חיצוני**
- קישור לכלי בקישור השיעור

<!--
הנה הפרומפט, שתדביק ל-AI שבנה לך את האתר.
תוסיף סימון FAQPage schema, בפורמט JSON-LD, לבלוק הזה.
ה-AI כבר יודע לכתוב את הקוד הזה בעצמו.
אחרי שהוא סיים, תבדוק את הקוד בכלי אימות סכמה חיצוני.
קישור לכלי כזה מחכה לך בעמוד השיעור.
-->

---

<!-- SLIDE 7 — PAUSE & ACT -->

## ⏸️ עצור עכשיו — תוסיף ותאמת

1. תדביק ל-AI את הפרומפט, עם בלוק השאלות והתשובות שלך
2. תוודא שהקוד נכנס לדף הנכון
3. **תבדוק אותו** בכלי אימות סכמה חיצוני
4. יש שגיאה? תעתיק אותה חזרה ל-AI, וּתבקש תיקון

<!--
תעצור את הסרטון עכשיו.
תדביק ל-AI את הפרומפט, עם בלוק השאלות והתשובות שלך.
תוודא שהקוד נכנס לדף הנכון באתר.
תבדוק אותו בכלי אימות סכמה חיצוני.
יש שגיאה? תעתיק אותה חזרה ל-AI, וּתבקש שיתקן.
-->

---

<!-- SLIDE 8 — RECAP OF MODULE 4 + BRIDGE TO MODULE 5 -->

## מה לוקחים מהמודול הזה

- שאלה אמיתית, בניסוח לקוח. תשובה ישירה, לפי הנוסחה
- סימון שעוזר למכונות לקרוא את זה נכון
- **בונוס:** תוכן שמתעדכן מצוטט הרבה יותר. לקוח שאל שאלה חדשה? תוסיף אותה
- **בשיעור הבא:** עולים לאוויר, עם דומיין משלך

<!--
בוא נסכם את כל המודול.
מצאת שאלה אמיתית, בניסוח של הלקוח.
כתבת תשובה ישירה, לפי הנוסחה.
והוספת סימון, שעוזר למכונות לקרוא את זה נכון.
דבר אחד אחרון. תוכן שמתעדכן מצוטט הרבה יותר.
לקוח שאל שאלה חדשה? תוסיף אותה לבלוק.
במודול הבא עולים לאוויר, עם דומיין משלך.
נתראה שם.
-->
