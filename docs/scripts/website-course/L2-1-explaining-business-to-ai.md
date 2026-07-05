---
marp: true
theme: wao-rtl
module: 2
lesson: 1
title: "איך מתארים את העסק שלך ל-AI"
lang: he
dir: rtl
status: noa-tts-patched
author: Gil (instructional-designer)
source-brief: "direct brief from orchestrator — pedagogical technique (AI prompting for business description), no domain/SEO facts requiring strategist verification"
runtime-target: "4–6 דקות (~600 מילות קריינות)"
pipeline: "Noa (proof + TTS polish) → marp --html preview → Eitan-Dev (render: TTS → Marp → ffmpeg)"
---

<!--
  ============================================================
  LEARNING OBJECTIVE
  ============================================================
  By the end of this lesson the student will:
  1. Understand why a vague business description produces generic AI output
  2. Know the three ingredients of a strong business description:
     (a) what he does + city, (b) who he serves specifically,
     (c) what makes him different from the competition
  3. See a live bad-vs-good example (a plumber) applying the three ingredients
  4. Write his own one-paragraph business description using the fill-in template
  5. Understand this paragraph becomes the master prompt for the entire site build

  ============================================================
  PIPELINE
  ============================================================
  Gil (instructional-designer) →
  Noa (noa-voice-director, proof + TTS polish) →
  Eitan-Dev (nextjs-engineer, render: TTS → Marp → ffmpeg → embed)

  ============================================================
  OUT OF SCOPE FOR THIS LESSON
  ============================================================
  - Which AI tool to use for the actual site build (next lesson)
  - Writing website copy / page structure (later lessons, Module 2)
  - SEO keyword research (Module 3 — Yonatan's domain)
  - The exact click-path inside any AI tool's UI (dynamic resource list only)
  ============================================================
-->

<!-- SLIDE 1 — TITLE + HOOK -->

# איך מתארים את העסק שלך ל-AI
## המשפט שבונה את כל האתר שלך

**קורס בניה + קידום אתרים בעידן ה-AI**
#### WAO · מודול 2 | שיעור 1

<!--
כבר ניסית לתאר את העסק שלך ל-AI?
וקיבלת בחזרה טקסט גנרי, משעמם, כמו של כולם?
זאת לא אשמת הכלי.
הבעיה היא מה שאתה נותן לו בהתחלה.
בשיעור הזה תלמד לתאר את העסק שלך נכון.
משפט אחד טוב, וכל האתר שלך ישתנה.
-->

---

<!-- SLIDE 2 — THE ANALOGY -->

## תחשוב על AI כמו עובד חדש

- אתה שולח עובד חדש לייצג אותך מול לקוח
- תגיד לו רק "תייצג אותנו טוב"? הוא ידבר כללי
- תיתן לו תסריט מדויק? הוא יישמע בדיוק כמוך
- AI עובד בדיוק באותו האופן

<!--
תדמיין שאתה שולח עובד חדש לפגישה עם לקוח.
תגיד לו רק תייצג אותנו טוב. מה יקרה?
הוא ידבר כללי. הוא יישמע כמו כל עסק אחר.
עכשיו תדמיין שאתה נותן לו תסריט מדויק.
מי הלקוחות, מה השירות, מה מייחד אותך.
הוא יישמע בדיוק כמוך.
AI עובד בדיוק באותו האופן.
מה שאתה נותן לו בהתחלה, קובע את מה שהוא יוצר.
-->

---

<!-- SLIDE 3 — THE THREE INGREDIENTS -->

## שלושה מרכיבים למשפט טוב

1. **מה אתה עושה, ובאיזו עיר** — לא "אינסטלטור", אלא "אינסטלטור בחולון"
2. **למי בדיוק אתה עובד** — לא "כולם", אלא לקוח שאתה מכיר טוב
3. **מה מייחד אותך מ-50 המתחרים** — לא "שירות מעולה", אלא עובדה אמיתית

<!--
יש שלושה מרכיבים למשפט תיאור טוב.
ראשון, מה אתה עושה ובאיזו עיר.
לא רק אינסטלטור. אינסטלטור בחולון.
שני, למי בדיוק אתה עובד.
לא כולם. לקוח ספציפי שאתה מכיר טוב.
שלישי, מה מייחד אותך מחמישים המתחרים שלך.
לא שירות מעולה. עובדה אמיתית וקונקרטית.
שלושה משפטים קצרים. זה כל מה שצריך.
-->

---

<!-- SLIDE 4 — EXAMPLE: BAD VERSION -->

## דוגמה: אבי האינסטלטור מנסח משפט
### הגרסה הרעה

> "אני אינסטלטור עם הרבה ניסיון, נותן שירות מעולה במחירים הוגנים."

- מתאים לכל אינסטלטור בישראל
- שום פרט לא קשור באמת לאבי

<!--
בוא נראה את זה על אינסטלטור אמיתי. קוראים לו אָבִי.
הגרסה הראשונה של אָבִי נשמעת ככה.
אני אינסטלטור עם הרבה ניסיון, נותן שירות מעולה במחירים הוגנים.
תקרא את זה שוב, לאט.
המשפט הזה יכול להתאים לכל אינסטלטור בישראל.
אין פה שום דבר שקשור באמת לאָבִי.
אם AI מקבל את המשפט הזה, הוא יבנה אתר גנרי.
בדיוק כמו של המתחרים שלו.
-->

---

<!-- SLIDE 5 — EXAMPLE: GOOD VERSION -->

## הגרסה הטובה

> "אני אינסטלטור בחולון. אני עובד עם בעלי דירות ישנות שסובלים מנזילות חוזרות. אני מתמחה באיתור נזילות נסתרות בלי לשבור קירות. מה שמייחד אותי הוא שאני מגיע תוך שעה בכל קריאת חירום."

- ספציפי, חי, ואמיתי
- AI יבנה אתר שמדבר על אבי, לא על אינסטלטור סתמי

<!--
עכשיו תשמע את הגרסה השנייה של אָבִי.
אני אינסטלטור בחולון.
אני עובד עם בעלי דירות ישנות שסובלים מנְזִילוֹת חוזרות.
אני מתמחה באיתור נְזִילוֹת נסתרות בלי לשבור קירות.
מה שמייחד אותי הוא שאני מגיע תוך שעה בכל קריאת חירום.
שים לב כמה יותר ספציפי וחי המשפט הזה.
AI שיקבל את המשפט הזה יבנה אתר שמדבר על אָבִי.
לא על אינסטלטור סתמי, כמו בגרסה הראשונה.
-->

---

<!-- SLIDE 6 — THE TEMPLATE -->

## התבנית שתמלא בעצמך

```
אני [מקצוע] ב[עיר/אזור].
אני עובד עם [תיאור לקוח אידיאלי].
אני מתמחה ב[שירות ספציפי].
מה שמייחד אותי הוא [נקודת ייחוד אחת אמיתית].
```

> 💡 ארבע שורות. משפט אחד. זה כל מה שצריך.

<!--
הנה התבנית שתמלא בעצמך, עכשיו.
שורה ראשונה, המקצוע שלך והעיר שלך.
שורה שנייה, מי הלקוח האידיאלי שלך.
שורה שלישית, השירות הספציפי שאתה מתמחה בו.
שורה רביעית, מה מייחד אותך מכל השאר.
ארבע שורות בלבד. זה כל מה שצריך.
-->

---

<!-- SLIDE 7 — PAUSE & ACT -->

## ⏸️ עצור עכשיו — תכתוב את המשפט שלך

1. תוריד את התבנית מקישור השיעור
2. תמלא את ארבע השורות עם הפרטים של העסק שלך
3. תקרא את מה שכתבת בקול רם
4. **תשמור את הקובץ** — תצטרך אותו בשיעור הבא

> ⚠️ נשמע כללי מדי? תחזור ותדייק. עוד לא מוכן להמשיך.

<!--
תעצור את הסרטון עכשיו.
תוריד את התבנית מקישור השיעור.
תמלא את ארבע השורות עם הפרטים של העסק שלך.
תקרא את מה שכתבת, בקול רם.
זה נשמע כמוך, או שזה יכול להתאים לכל עסק אחר?
אם זה כללי מדי, תחזור ותדייק שוב.
תשמור את הקובץ. תצטרך אותו בשיעור הבא.
-->

---

<!-- SLIDE 8 — SUMMARY -->

## מה לוקחים מהשיעור הזה

- **שלושה מרכיבים:** מה ואיפה, למי בדיוק, מה מייחד אותך
- AI בונה בדיוק לפי מה שאתה נותן לו
- זה ה-DNA של האתר שלך. כל מה שנבנה מעכשיו יוצא מהמשפט הזה

<!--
שלושה מרכיבים. מה ואיפה, למי בדיוק, מה מייחד אותך.
AI בונה בדיוק לפי מה שאתה נותן לו.
זה ה-DNA של האתר שלך.
כל מה שנבנה מעכשיו, יוצא מהמשפט הזה.
המשפט מוכן? מצוין. שיעור הבא מחכה.
-->

---

<!--
  ============================================================
  DEPLOYMENT CHECKLIST — קורס בניית אתרים (מודול 2, שיעור 1)
  ============================================================

  GATE 1 — CONTENT REVIEW (Eitan, before any agent work)
  [ ] אין כאן טענות עובדתיות תלויות-זמן (SEO/PPC/UI) שדורשות אימות אצל אסטרטג —
      זה שיעור טכניקת-חשיבה (ניסוח פרומפט), לא עובדות שמשתנות
  [ ] כל slide עובר את המבחן "האם זה עדיין נכון?"

  GATE 2 — NARRATION QA (Noa — noa-voice-director) — MANDATORY, no self-QA
  [ ] Noa: proof narration blocks — Sabra tone, singular male (אתה), TTS polish, nikud
  [ ] Noa: sentence-length <= 12 words, no em-dashes (— or -), future-form imperatives
  [ ] Noa: ו"ו החיבור בשורוק לפני בומ"פ / שווא (וּמדויק, וּברור) איפה שרלוונטי
  [ ] Noa: בדיקת הומוגרפים — כל פועל ציווי בצורת עתיד (תוריד, תמלא, תקרא, תשמור)

  GATE 3 — TTS (Eitan-Dev)
  [ ] spike test: 1–2 משפטים בלבד לפני הרצת השיעור המלא (חוק הגנת קרדיטים)
  [ ] full TTS render לאחר אישור Noa בלבד

  GATE 4 — SLIDES (Eitan-Dev)
  [ ] marp --no-stdin --html --allow-local-files --theme-set docs/scripts/website-course/wao-rtl.css
      -o output/lesson-2-1/slides/ -- docs/scripts/website-course/L2-1-explaining-business-to-ai.md

  GATE 5 — VIDEO (Eitan-Dev)
  [ ] ffmpeg concat demuxer → MP4 (לא MoviePy)
  [ ] embed MP4 בדף השיעור (website-course/lesson/2-1)

  GATE 6 — COURSE DATA (Eitan-Dev)
  [ ] הוספת מודול 2 + שיעור 1 ל-src/data/website-course-data.ts
      (slug מוצע: website-lesson-3, המשך המספור השטוח אחרי מודול 1)
      activeTask מוצע: "תמלא את התבנית מהשיעור. תשמור את המשפט — תצטרך אותו בשיעור הבא."
      uiGuides: אין קישורי UI ספציפיים בשיעור הזה (אין כלי חיצוני נדרש עדיין)

  GATE 7 — THUMBNAIL (Eitan-Dev)
  [ ] output/lesson-2-1/thumbnail.jpg → public/media/thumbnails/website-lesson-3.png

  GATE 8 — QA (Roni — verifier)
  [ ] MP4 plays with synced audio on localhost:3000
  [ ] thumbnail מופיע בדף השיעור
  ============================================================
-->
