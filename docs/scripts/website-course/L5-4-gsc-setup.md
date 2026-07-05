---
marp: true
theme: wao-rtl
paginate: true
direction: rtl
module: 5
lesson: 4
title: "המסך שמראה לך מה גוגל באמת חושב על האתר שלך"
lang: he
dir: rtl
status: draft-for-proof
author: Gil (instructional-designer)
source-brief: "orchestrator brief, Module 5 curriculum map (docs/course-marketing/curriculum-map-modules-3-6.md, lesson 5.4) — LIGHT Yonatan dependency: GSC verification methods + data-lag timeline are time-sensitive and need a dated confirmation before this renders. Flagged inline below — do NOT send to TTS until confirmed."
runtime-target: "5 דקות (~500 מילות קריינות)"
pipeline: "Noa (proof + TTS polish) → Yonatan (dated GSC currency check) → marp --html preview → Eitan-Dev (render: TTS → Marp → ffmpeg)"
---

<!--
  ============================================================
  LEARNING OBJECTIVE
  ============================================================
  By the end of this lesson the student will:
  1. Understand Search Console has two jobs: proving ownership, and
     then showing a dashboard of what Google actually sees
  2. Know the honest timeline: verification is instant, meaningful
     performance data can take several days to populate
  3. Verify his domain in GSC (DNS or HTML-tag method — whichever is
     current) and locate the Performance and Coverage tabs
  4. Know the 3 numbers that matter: impressions, clicks, coverage

  ============================================================
  CONTINUITY
  ============================================================
  - L5-1: domain purchased and registered
  - L5-2: site deployed and live
  - L5-3: domain connected to the live site
  - Recurring example: אבי — שרברב מחולון (not force-fed into this
    lesson — pure mechanics, same as L5-2/L5-3)

  ============================================================
  FACT-CHECK FLAG — LIGHT YONATAN DEPENDENCY
  ============================================================
  Per curriculum map: "GSC verification methods and the data-lag
  timeline are time-sensitive; needs a dated confirmation before
  scripting." This script deliberately does NOT name a specific
  verification method (DNS record vs. HTML tag vs. any other) in
  narration — it says "לפי השיטה שמוצעת לך" and points to Search
  Console's own current instructions instead. Still needs Yonatan's
  dated sign-off that: (a) domain-level verification is still offered,
  (b) the "a few days" data-lag framing is still accurate, before this
  goes to TTS. See inline VERIFY comment at Slide 6.

  ============================================================
  PIPELINE
  ============================================================
  Gil (instructional-designer) →
  Noa (noa-voice-director, proof + TTS polish) →
  Yonatan (seo-strategist, dated currency check on GSC mechanics) →
  Eitan-Dev (nextjs-engineer, render: TTS → Marp → ffmpeg → embed)

  ============================================================
  OUT OF SCOPE FOR THIS LESSON
  ============================================================
  - Domain purchase / deploy / DNS connect (L5-1 through L5-3 — already done)
  - Sitemap submission / indexing requests (L5-5)
  - Exact Search Console UI screens — abstracted to a resource link only
  - No CTA slide in this lesson per brief
  ============================================================
-->

<!-- SLIDE 1 — TITLE + HOOK -->

# המסך שמראה לך מה גוגל באמת חושב על האתר שלך
## Google Search Console, בפשטות

**קורס בניה + קידום אתרים בעידן ה-AI**
#### WAO · מודול 5 | שיעור 4

<!--
האתר שלך חי. הדומיין מחובר.
אבל עדיין יש לך שאלה אחת פתוחה.
מה גוגל בעצם רואה, כשהוא מסתכל על האתר שלך?
יש כלי חינמי שעונה בדיוק על השאלה הזאת.
קוראים לו Google Search Console, והיום תפתח אותו.
-->

---

<!-- SLIDE 2 — ANALOGY: REPORT CARD -->

## כמו תעודת ציונים מגוגל

- לא אתה מדווח על עצמך. גוגל מדווח לך
- הדוח מראה מה הוא מצא, מה הוא הבין, ואיך אנשים מגיעים אליך
- זה ההבדל בין לנחש, לבין לדעת

<!--
תחשוב על זה כמו על תעודת ציונים.
אבל הפעם, לא אתה מדווח על עצמך.
גוגל מדווח לך.
הדוח מראה מה הוא מצא באתר שלך, ומה הוא הבין ממנו.
ואיך אנשים בעצם מגיעים אליך דרך החיפוש.
זה ההבדל בין לנחש מה קורה, לבין לדעת בוודאות.
-->

---

<!-- SLIDE 3 — TWO THINGS GSC DOES -->

## שני דברים ש-Search Console עושה

1. **אישור בעלות** — אתה מוכיח לגוגל שהאתר הזה שלך
2. **לוח מחוונים** — גוגל מראה לך מה קורה עם האתר, לאורך זמן

<!--
ל-Search Console יש שני תפקידים.
תפקיד ראשון, אישור בעלות.
אתה מוכיח לגוגל שהאתר הזה באמת שלך.
תפקיד שני, לוח מחוונים.
אחרי האישור, גוגל מראה לך מה קורה עם האתר שלך, לאורך זמן.
-->

---

<!-- SLIDE 4 — HONEST EXPECTATIONS -->

## מה קורה מיד, ומה לוקח זמן

- אישור הבעלות מיידי
- נתוני קידום יכולים לקחת כמה ימים להופיע
- זה נורמלי לגמרי, וזה לא סימן שמשהו לא עובד

<!--
עכשיו ציפייה חשובה, כדי שלא תיבהל.
אישור הבעלות מיידי.
נתוני קידום יכולים לקחת כמה ימים להופיע.
זה נורמלי לגמרי.
זה לא סימן שמשהו לא עובד. זה פשוט לוקח לגוגל כמה ימים לאסוף מידע.
-->

---

<!-- SLIDE 5 — THE 3 NUMBERS -->

## שלושה מספרים שכדאי להכיר

1. **חשיפות** — כמה פעמים האתר שלך הופיע בתוצאות חיפוש
2. **קליקים** — כמה פעמים מישהו באמת לחץ, ונכנס לאתר
3. **כיסוי** — כמה דפים מהאתר שלך גוגל בכלל מצא ואינדקס

<!--
בתוך הלוח, שלושה מספרים חשובים במיוחד.
מספר ראשון, חשיפות.
כמה פעמים האתר שלך הופיע בתוצאות חיפוש.
מספר שני, קליקים.
כמה פעמים מישהו באמת לחץ, ונכנס לאתר שלך.
מספר שלישי, כיסוי.
כמה דפים מהאתר שלך גוגל בכלל מצא, והכניס לאינדקס שלו.
-->

---

<!-- SLIDE 6 — PAUSE & ACT -->

## ⏸️ עצור עכשיו — תאשר בעלות

1. תיכנס ל-Google Search Console, עם חשבון גוגל שלך
2. תוסיף את הדומיין שלך כמאגר חדש
3. תבצע את שלב האימות, לפי השיטה שמוצעת לך
4. תאתר את לשונית "ביצועים" ואת לשונית "כיסוי"

<!-- VERIFIED 2026-07-04 by Yonatan (seo-strategist): DNS TXT, HTML meta-tag, HTML file, GA/GTM all still active. "A few days" data-lag framing confirmed current and intentionally conservative (GSC had a 50-week logging bug May 2025–Apr 2026 — framing still correct). Gate 0 signed off. -->

<!--
עכשיו תעצור, ותאשר בעלות בעצמך.
תיכנס ל-Google Search Console, עם חשבון גוגל שלך.
תוסיף את הדומיין שלך כמאגר חדש.
תבצע את שלב האימות, לפי השיטה שמוצעת לך שם.
בסוף, תאתר את לשונית ביצועים, ואת לשונית כיסוי.
שם יחכו לך שלושת המספרים.
-->

---

<!-- SLIDE 7 — DOWNLOADABLE CHECKLIST -->

## להוריד: "3 מספרים לבדוק בחודש הראשון"

- מה נחשב התחלה סבירה, ומה עוד מוקדם לדאוג ממנו
- 📎 קישור למדריך האימות העדכני של Search Console בקישורי השיעור

<!--
בקישורי השיעור מחכה לך צ'קליסט, שלושה מספרים לבדוק בחודש הראשון.
הוא מסביר מה נחשב התחלה סבירה, וּמה עוד מוקדם לדאוג ממנו.
שם תמצא גם קישור למדריך האימות העדכני של Search Console.
-->

---

<!-- SLIDE 8 — SUMMARY + BRIDGE -->

## מה לוקחים מהשיעור הזה

- Search Console מאושר. הבעלות שלך מוכחת
- שלושה מספרים לעקוב אחריהם. חשיפות, קליקים, כיסוי
- **בשיעור הבא:** גוגל עוד לא יודע שהאתר שלך קיים. נזרז אותו

<!--
בוא נסכם.
Search Console מאושר, והבעלות שלך מוכחת מול גוגל.
שלושה מספרים לעקוב אחריהם מעכשיו. חשיפות, קליקים, וכיסוי.
אבל יש בעיה קטנה שעוד לא פתרנו.
גוגל עוד לא ממש יודע שהאתר החדש שלך קיים.
בשיעור הבא נזרז אותו. נתראה שם.
-->

---

<!--
  ============================================================
  DEPLOYMENT CHECKLIST — קורס בניית אתרים (מודול 5, שיעור 4)
  ============================================================

  GATE 0 — STRATEGIST CURRENCY CHECK (Yonatan — seo-strategist) — ✅ SIGNED OFF 2026-07-04
  [x] Yonatan: DNS TXT, HTML meta-tag, HTML file, GA/GTM verification all still active — CONFIRMED
  [x] Yonatan: "a few days" data-lag framing still accurate — CONFIRMED (conservative;
      GSC had 50-week logging bug May 2025–Apr 2026; framing stands, not worth mentioning to students)
  [x] Gate 0 cleared — TTS may proceed once Gate 2 (Noa) is also complete

  GATE 1 — CONTENT REVIEW (Eitan, before any agent work)
  [ ] narration never names a specific verification method by name —
      stays abstract ("לפי השיטה שמוצעת לך") per the fact-check flag above

  GATE 2 — NARRATION QA (Noa — noa-voice-director) — MANDATORY, no self-QA
  [ ] Noa: proof narration blocks — Sabra tone, singular male (אתה), TTS polish, nikud
  [ ] Noa: sentence-length <= 15 words, no em-dashes (— or -), future-form imperatives
  [ ] Noa: ו"ו החיבור בשורוק לפני בומ"פ / שווא (וּמה) איפה שרלוונטי
  [ ] Noa: בדיקת הומוגרפים — כל פועל ציווי בצורת עתיד (תיכנס, תוסיף, תבצע, תאתר)

  GATE 3 — TTS (Eitan-Dev)
  [ ] spike test: 1–2 משפטים בלבד לפני הרצת השיעור המלא (חוק הגנת קרדיטים)
  [ ] full TTS render לאחר אישור Noa וגם Gate 0 בלבד

  GATE 4 — SLIDES (Eitan-Dev)
  [ ] marp --no-stdin --html --allow-local-files --theme-set docs/scripts/website-course/wao-rtl.css
      -o output/lesson-5-4/slides/ -- docs/scripts/website-course/L5-4-gsc-setup.md

  GATE 5 — VIDEO (Eitan-Dev)
  [ ] ffmpeg concat demuxer → MP4 (לא MoviePy)
  [ ] embed MP4 בדף השיעור (website-course/lesson/5-4)

  GATE 6 — COURSE DATA (Eitan-Dev)
  [ ] הוספת מודול 5 + שיעור 4 ל-src/data/website-course-data.ts
      activeTask מוצע: "תאשר בעלות ב-Search Console. תאתר את לשונית ביצועים ואת לשונית כיסוי."
      downloadable asset: "3 מספרים לבדוק בחודש הראשון" checklist + קישור למדריך אימות GSC

  GATE 7 — THUMBNAIL (Eitan-Dev)
  [ ] output/lesson-5-4/thumbnail.jpg → public/media/thumbnails/website-lesson-N.png

  GATE 8 — QA (Roni — verifier)
  [ ] MP4 plays with synced audio on localhost:3000
  [ ] thumbnail מופיע בדף השיעור
  ============================================================
-->
