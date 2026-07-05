---
marp: true
theme: wao-rtl
paginate: true
direction: rtl
module: 5
lesson: 1
title: "דומיין במאה שקל: כתובת שהיא שלך לכל החיים"
lang: he
dir: rtl
status: draft-for-proof
author: Gil (instructional-designer)
source-brief: "orchestrator brief, Module 5 curriculum map (docs/course-marketing/curriculum-map-modules-3-6.md, lesson 5.1) — no strategist (Yonatan) dependency for this lesson per the map"
runtime-target: "4–5 דקות (~550 מילות קריינות)"
pipeline: "Noa (proof + TTS polish) → marp --html preview → Eitan-Dev (render: TTS → Marp → ffmpeg)"
---

<!--
  ============================================================
  MODULE 5 INTRO CALLOUT — PAGE-LEVEL UI, NOT NARRATION
  ============================================================
  Eitan-Dev: render this as a static callout box on the Lesson 5.1 course
  page (above or beside the video), NOT inside the video/TTS narration:

  "לפני שמתחילים במודול הזה — תפתח שני חשבונות חינמיים: GitHub ו-Cloudflare.
  זה לוקח כמה דקות ונעשה פעם אחת."

  This keeps the module from turning into a signup tutorial inside the
  video itself. Do not add this line to any narration comment block below.
  ============================================================

  LEARNING OBJECTIVE
  ============================================================
  By the end of this lesson the student will:
  1. Understand that the domain NAME decision already happened in Module 1 —
     this lesson is the transaction, not another decision
  2. Know the 3-step purchase flow: choose a registrar, pay, confirm ownership
  3. Understand why the ownership/registrant confirmation email matters
     (ties back directly to the "lost domain" story from Lesson 1.1)
  4. Complete the actual purchase and confirm the ownership email arrived
  5. Apply the "before you buy" checklist: correct ownership email,
     auto-renew on, no unnecessary add-ons

  ============================================================
  CONTINUITY
  ============================================================
  - L1-1: domain vs. website distinction + the "lost domain because it
    wasn't registered in the client's name" story — referenced again here
  - L1-2: 5-criteria naming method + AI prompt → student already holds
    3 shortlisted, available candidate names going into this lesson
  - Recurring example: אבי — plumber from Holon, old apartments, hidden
    leaks without breaking walls, arrives within an hour

  ============================================================
  PIPELINE
  ============================================================
  Gil (instructional-designer) →
  Noa (noa-voice-director, proof + TTS polish) →
  Eitan-Dev (nextjs-engineer, render: TTS → Marp → ffmpeg → embed)

  ============================================================
  OUT OF SCOPE FOR THIS LESSON
  ============================================================
  - Choosing the name itself (Module 1 — already decided)
  - Deploying the site (Lesson 5.2)
  - DNS / nameserver connection (Lesson 5.3)
  - No CTA slide in this lesson per brief
  ============================================================
-->

<!-- SLIDE 1 — TITLE + HOOK -->

# דומיין במאה שקל
## כתובת שהיא שלך, לכל החיים

**קורס בניה + קידום אתרים בעידן ה-AI**
#### WAO · מודול 5 | שיעור 1

<!--
תדמיין שכבר בחרת דירה.
עברת על כמה אפשרויות, השווית, קיבלת החלטה.
נשאר רק דבר אחד. לחתום על החוזה, ולשלם.
בדיוק ככה זה עכשיו עם הדומיין שלך.
במודול הראשון כבר בחרת שם.
היום תעשה את הצעד האחרון. תקנה אותו, ותוודא שהוא רשום על שמך.
-->

---

<!-- SLIDE 2 — RECAP: THE DECISION ALREADY HAPPENED -->

## ההחלטה כבר מאחוריך

- **במודול 1** עברת חמישה קריטריונים, ובחרת שם
- השיעור הזה הוא לא עוד החלטה. הוא **ביצוע**
- נשאר רק לשלם, ולוודא שהדומיין באמת שלך

<!--
בוא נזכיר את מה שכבר קרה.
במודול הראשון עברת חמישה קריטריונים, ובחרת שם.
זה היה השלב הקשה, וכבר מאחוריך.
היום אין עוד החלטות לקבל.
יש רק פעולה אחת. לשלם, ולוודא שהדומיין באמת שלך.
-->

---

<!-- SLIDE 3 — THE THREE-STEP TRANSACTION -->

## שלושה צעדים, וזהו

1. **בוחרים חברת רישום** — GoDaddy, Namecheap, או box.co.il
2. **משלמים** על השם שכבר בחרת במודול 1
3. **מוודאים** שהדומיין רשום על שמך, לא על שם מישהו אחר

<!--
התהליך כולו מתפרק לשלושה צעדים.
ראשון, תבחר חברת רישום. GoDaddy, Namecheap, או box.co.il, כמו שראית בשיעור הראשון.
שני, תשלם על השם שכבר בחרת.
שלישי, וזה החשוב מכולם, תוודא שהדומיין רשום על שמך.
לא על שם המעצב. לא על שם חברת השיווק. עליך.
-->

---

<!-- SLIDE 4 — WHY THE OWNERSHIP EMAIL MATTERS -->

## המייל שחייב להגיע אליך

- אחרי התשלום מגיע **מייל אישור בעלות** (registrant email)
- הוא ההוכחה שהדומיין הזה רשום על שמך
- תזכור את הסיפור משיעור 1: לקוח שאיבד דומיין כי הוא לא היה רשום על שמו

<!--
אחרי התשלום יגיע אליך מייל אישור בעלות.
תשמור עליו. הוא ההוכחה שהדומיין הזה שלך.
תזכור את הסיפור משיעור אחד. לקוח שאיבד את כל האתר שלו.
זה קרה כי הדומיין לא היה רשום על שמו.
המייל הזה מונע בדיוק את התרחיש הזה.
-->

---

<!-- SLIDE 5 — CHECKLIST BEFORE BUYING -->

## לפני שקונים: הבדיקה שלוקחת שתי דקות

- **שם הבעלים** בטופס הרישום — אתה, או העסק שלך
- **חידוש אוטומטי** — מסומן ומופעל
- **הוספות מיותרות** (אחסון, מייל עסקי, הגנה נוספת) — לרוב אפשר לוותר

<!--
לפני שאתה מאשר תשלום, תעבור על שלוש נקודות.
ראשון, שם הבעלים בטופס. זה אתה, או שם העסק שלך.
שני, חידוש אוטומטי. תוודא שהוא מסומן וּמופעל.
שלישי, תסתכל על ההוספות שמציעים לך בקופה.
אחסון, מייל עסקי, הגנה נוספת. לרוב זה מיותר בשלב הזה.
תוריד את כל מה שאתה לא צריך עכשיו.
-->

---

<!-- SLIDE 6 — PAUSE & ACT -->

## ⏸️ עצור עכשיו — תשלים את הרכישה

1. תיכנס לחברת הרישום שבחרת
2. תרכוש את השם שבחרת במודול 1
3. תעבור שוב על שלוש הבדיקות משקופית קודמת
4. **תוודא שקיבלת** את מייל אישור הבעלות, ותשמור אותו

<!--
תעצור את הסרטון עכשיו.
תיכנס לחברת הרישום שבחרת, ותרכוש את השם שלך.
לפני שאתה מאשר, תעבור שוב על שלוש הבדיקות.
בעלות, חידוש אוטומטי, בלי הוספות מיותרות.
אחרי התשלום, תחפש את מייל אישור הבעלות בתיבת הדואר.
תשמור אותו במקום בטוח. תצטרך אותו בהמשך.
-->

---

<!-- SLIDE 7 — SUMMARY -->

## מה לוקחים מהשיעור הזה

- הדומיין שלך רשום, ומתחדש לבד כל שנה
- מייל אישור הבעלות שמור אצלך
- זו עדיין רק כתובת. עכשיו צריך לבנות עליה

<!--
יש לך עכשיו כתובת דיגיטלית שהיא ממש שלך.
היא מתחדשת לבד כל שנה, וּמייל הבעלות שמור אצלך.
אבל כתובת בלי בניין היא רק שלט ריק.
בשיעור הבא תעלה את האתר שבנית לאוויר.
תוך עשר דקות, בלי לשלם על אחסון. נתראה שם.
-->

---

<!--
  ============================================================
  DEPLOYMENT CHECKLIST — קורס בניית אתרים (מודול 5, שיעור 1)
  ============================================================

  GATE 1 — CONTENT REVIEW (Eitan, before any agent work)
  [ ] אין כאן טענות זמן-רגיש (מחירי דומיין, UI רישום ספציפי) שדורשות אימות —
      הוסבר כללית ("כמאה שקל", "חברת רישום") ולא נצמד למחיר/UI מדויק
  [ ] MODULE 5 INTRO CALLOUT מוצג כ-callout בעמוד השיעור, לא בקריינות

  GATE 2 — NARRATION QA (Noa — noa-voice-director) — MANDATORY, no self-QA
  [ ] Noa: proof narration blocks — Sabra tone, singular male (אתה), TTS polish, nikud
  [ ] Noa: sentence-length <= 15 words, no em-dashes (— or -), future-form imperatives
  [ ] Noa: ו"ו החיבור בשורוק לפני בומ"פ / שווא (וּמופעל, וּמייל) איפה שרלוונטי
  [ ] Noa: בדיקת הומוגרפים — כל פועל ציווי בצורת עתיד (תיכנס, תרכוש, תשמור, תעבור)

  GATE 3 — TTS (Eitan-Dev)
  [ ] spike test: 1–2 משפטים בלבד לפני הרצת השיעור המלא (חוק הגנת קרדיטים)
  [ ] full TTS render לאחר אישור Noa בלבד

  GATE 4 — SLIDES (Eitan-Dev)
  [ ] marp --no-stdin --html --allow-local-files --theme-set docs/scripts/website-course/wao-rtl.css
      -o output/lesson-5-1/slides/ -- docs/scripts/website-course/L5-1-domain.md

  GATE 5 — VIDEO (Eitan-Dev)
  [ ] ffmpeg concat demuxer → MP4 (לא MoviePy)
  [ ] embed MP4 בדף השיעור (website-course/lesson/5-1)
  [ ] Eitan-Dev: implement the MODULE 5 INTRO CALLOUT as a static page element
      above/beside the video, sourced from the comment block at the top of this file

  GATE 6 — COURSE DATA (Eitan-Dev)
  [ ] הוספת מודול 5 + שיעור 1 ל-src/data/website-course-data.ts
      activeTask מוצע: "תרכוש את הדומיין שבחרת במודול 1. תוודא שקיבלת מייל אישור בעלות, ותשמור אותו."
      downloadable asset: "לפני שקונים" checklist (בעלות / חידוש אוטומטי / הוספות מיותרות)

  GATE 7 — THUMBNAIL (Eitan-Dev)
  [ ] output/lesson-5-1/thumbnail.jpg → public/media/thumbnails/website-lesson-N.png

  GATE 8 — QA (Roni — verifier)
  [ ] MP4 plays with synced audio on localhost:3000
  [ ] thumbnail מופיע בדף השיעור
  [ ] MODULE 5 INTRO CALLOUT מופיע בעמוד ולא בקריינות
  ============================================================
-->
</content>
</invoke>
