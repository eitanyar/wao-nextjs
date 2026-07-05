---
marp: true
theme: wao-rtl
paginate: true
direction: rtl
module: 4
lesson: 2
title: "שאלות ותשובות: הבלוק שה-AI של גוגל מצטט הכי הרבה"
lang: he
dir: rtl
status: draft-pending-noa
author: Gil (instructional-designer)
source-brief: "Yonatan (seo-strategist) verified brief, 2026-07-03 — FAQ answer formula (question → direct answer → supporting specific), Avi's 5 real customer questions, 'cited vs. ignored' pattern (clear question heading is the first condition). This lesson covers ONLY the question-phrasing half; the answer formula is L4-3."
runtime-target: "4–5 דקות (~470 מילות קריינות)"
pipeline: "Noa (proof + TTS polish) → marp --html preview → Eitan-Dev (render: TTS → Marp → ffmpeg)"
---

<!--
  ============================================================
  LEARNING OBJECTIVE
  ============================================================
  By the end of this lesson the student will:
  1. Understand that a good FAQ question mirrors the customer's
     own words, not professional/business jargon — the same
     intent-matching principle from Module 3, now applied to
     question phrasing instead of page headings
  2. See Avi's 5 real customer questions as a worked example of
     correct customer-phrased questions
  3. Have used an AI prompt template (business description in →
     8–10 candidate questions out) to generate his own candidates
  4. Have selected 3 FAQ questions in customer phrasing, including
     the question he saved in L4-1, ready to answer in L4-3

  ============================================================
  CONTINUITY
  ============================================================
  - L4-1: learner saved ONE real customer question, verbatim,
    on the "שאלת הלקוח שלי" worksheet.
  - Module 3 (Yonatan's domain): learner already matched page
    headings to search intent — this lesson reuses that exact
    principle for question phrasing.
  - Recurring example: אבי — plumber from Holon, old apartments,
    hidden leaks without breaking walls, arrives within an hour.
  - Feeds L4-3: the 3 saved questions become the input for the
    answer-writing formula.

  ============================================================
  NET-NEW / FACT-CHECK FLAGS (for strategist verification)
  ============================================================
  - Avi's 5 questions are given verbatim in the brief (not
    invented by Gil) — no fact-check needed, already Yonatan-
    sourced.
  - The AI prompt template structure (description in → 8–10
    questions out) is Gil's pedagogical device for turning the
    strategist's principle into a learner action — not a domain
    claim, no fact-check needed.

  ============================================================
  OUT OF SCOPE FOR THIS LESSON
  ============================================================
  - Writing the answers themselves (L4-3)
  - Schema markup (L4-4)
  - Any AI-tool UI walkthrough (resource list only)
  ============================================================
-->

<!-- SLIDE 1 — TITLE + HOOK -->

# שאלות ותשובות
## הבלוק שה-AI של גוגל מצטט הכי הרבה

**קורס בניה + קידום אתרים בעידן ה-AI**
#### WAO · מודול 4 | שיעור 2

<!--
בשיעור הקודם שמרת שאלה אחת, במילים של הלקוח שלך.
היום נהפוך אותה לבלוק שאלות ותשובות שלם.
זה הבלוק שה-AI הכי אוהב לצטט ממנו.
נלמד למה, ונלמד איך כותבים אותו נכון.
-->

---

<!-- SLIDE 2 — CORE PRINCIPLE: MIRROR THE CUSTOMER, NOT THE JARGON -->

## שאלה טובה נשמעת כמו הלקוח, לא כמוך

- במודול 3 למדת להתאים כותרות למה שהלקוח מחפש
- עכשיו אותו עיקרון בדיוק, אבל לניסוח שאלות
- שאלה טובה נשמעת כמו מה שהלקוח באמת אומר

<!--
במודול שלוש למדת להתאים כותרות למה שהלקוח מחפש.
עכשיו נשתמש באותו עיקרון בדיוק, לניסוח שאלות.
שאלה טובה בבלוק כזה נשמעת כמו מה שהלקוח שלך שואל.
לא כמו איך שאתה, כאיש מקצוע, היית מנסח את זה.
-->

---

<!-- SLIDE 3 — EXAMPLE: JARGON VS. CUSTOMER PHRASING -->

## דוגמה: אותה שאלה, שני ניסוחים

- ❌ "מהם פתרונות איתור נזילות מתקדמים הזמינים כיום?"
- ✅ "איך יודעים אם יש נזילה נסתרת בקיר?"

<!--
תראה את ההבדל בין שני ניסוחים לאותה שאלה.
הניסוח הראשון, מהם פתרונות איתור נְזִילוֹת מתקדמים.
זה נשמע כמו מסמך מקצועי. אף אחד לא מדבר ככה.
הניסוח השני, איך יודעים אם יש נְזִילָה נסתרת בקיר.
זה בדיוק מה שלקוח מקליד בגוגל, או שואל חבר.
-->

---

<!-- SLIDE 4 — WORKED EXAMPLE: AVI'S 5 REAL QUESTIONS -->

## חמש שאלות אמיתיות של לקוחות אבי

1. כמה עולה תיקון נזילה בדירה ישנה?
2. איך יודעים אם יש נזילה נסתרת בקיר?
3. אינסטלטור או שרברב, יש הבדל?
4. תיקון נזילה דורש לשבור קיר?
5. כמה זמן לוקח לתקן נזילה?

<!--
הנה חמש שאלות אמיתיות שהלקוחות של אָבִי שואלים.
כמה עולה תיקון נְזִילָה בדירה ישנה.
איך יודעים אם יש נְזִילָה נסתרת בקיר.
אינסטלטור או שרברב, יש הבדל.
תיקון נְזִילָה דורש לשבור קיר.
כמה זמן לוקח לתקן נְזִילָה.
שים לב, כל שאלה כתובה בדיוק כמו שלקוח שואל אותה.
-->

---

<!-- SLIDE 5 — AI PROMPT TEMPLATE -->

## הפרומפט שמוציא לך 8 עד 10 שאלות מועמדות

```
הנה תיאור העסק שלי: [תיאור מהשיעורים הקודמים]
תן לי 10 שאלות שלקוחות אמיתיים שואלים
לפני שהם פונים אליי.
תכתוב אותן בדיוק כמו שהם מדברים,
לא במונחים מקצועיים.
```

> 💡 התבנית להורדה בקישור השיעור

<!--
הנה פרומפט מוכן, שיוציא לך שאלות מועמדות.
תדביק ל-AI את תיאור העסק שלך, מהשיעורים הקודמים.
ותבקש ממנו עשר שאלות, שלקוחות אמיתיים שואלים.
תדגיש, בדיוק כמו שהם מדברים, לא במונחים מקצועיים.
תקבל רשימה ארוכה, וּמתוכה תבחר.
-->

---

<!-- SLIDE 6 — PAUSE & ACT -->

## ⏸️ עצור עכשיו — תבחר שלוש שאלות

1. תריץ את הפרומפט, עם תיאור העסק שלך
2. תקבל שמונה עד עשר שאלות מועמדות
3. תבחר שלוש, כולל השאלה ששמרת בשיעור הקודם
4. **תשמור אותן** — תצטרך אותן בשיעור הבא

<!--
תעצור את הסרטון עכשיו.
תריץ את הפרומפט, עם תיאור העסק שלך.
תקבל שמונה עד עשר שאלות מועמדות.
מתוכן תבחר שלוש, ואחת מהן השאלה ששמרת כבר.
תשמור את שלוש השאלות. תצטרך אותן בשיעור הבא.
-->

---

<!-- SLIDE 7 — RECAP + BRIDGE TO L4-3 -->

## מה לוקחים מהשיעור הזה

- שאלה טובה נשמעת כמו הלקוח, לא כמו איש מקצוע
- יש לך עכשיו שלוש שאלות FAQ, בניסוח נכון
- **בשיעור הבא:** לכתוב את התשובה שגוגל בוחר להציג

<!--
בוא נסכם.
שאלה טובה נשמעת כמו הלקוח שלך, לא כמו איש מקצוע.
יש לך עכשיו שלוש שאלות FAQ, בניסוח הנכון.
בשיעור הבא נלמד לכתוב את התשובה, שגוגל בוחר להציג.
נתראה שם.
-->
