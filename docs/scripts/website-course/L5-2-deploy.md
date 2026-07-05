---
marp: true
theme: wao-rtl
paginate: true
direction: rtl
module: 5
lesson: 2
title: "האתר באוויר תוך עשר דקות — בלי לשלם על אחסון"
lang: he
dir: rtl
status: draft-for-proof
author: Gil (instructional-designer)
source-brief: "orchestrator brief, Module 5 curriculum map (docs/course-marketing/curriculum-map-modules-3-6.md, lesson 5.2) — no strategist (Yonatan) dependency; flagged for verifier to spot-check the 'free tier' claim is still current at render time"
runtime-target: "5 דקות (~500 מילות קריינות)"
pipeline: "Noa (proof + TTS polish) → marp --html preview → Eitan-Dev (render: TTS → Marp → ffmpeg)"
---

<!--
  ============================================================
  LEARNING OBJECTIVE
  ============================================================
  By the end of this lesson the student will:
  1. Understand that "deploying" means handing finished files to a
     free global host — not building any infrastructure himself
  2. Understand the 10-minute claim covers deploy mechanics ONLY —
     account creation is a pre-lesson prerequisite, not inside this clock
  3. Deploy his 5-page site (built in Module 2) to Cloudflare Pages
  4. Confirm the auto-generated URL actually loads his site

  ============================================================
  CONTINUITY
  ============================================================
  - L5-1: domain purchased and registered, ownership email confirmed
  - Module 2: the finished 5-page site file the learner is deploying now
  - Recurring example: אבי — שרברב מחולון, דירות ישנות, נזילות נסתרות
    בלי לשבור קירות (not force-fed into this lesson — pure mechanics)

  ============================================================
  LOCKED CAVEAT (module-4-5-narration-constraints.md, Fix 2)
  ============================================================
  "לפני שמתחילים. תוודא שיש לך חשבון חינמי ב-Cloudflare Pages. זה לוקח
  שלוש דקות ונעשה פעם אחת." — must appear verbatim in narration, framed
  as prep already done via the Module 5 intro callout (see L5-1 header),
  not as a new task inside this lesson's clock.

  ============================================================
  PIPELINE
  ============================================================
  Gil (instructional-designer) →
  Noa (noa-voice-director, proof + TTS polish) →
  Eitan-Dev (nextjs-engineer, render: TTS → Marp → ffmpeg → embed)

  ============================================================
  OUT OF SCOPE FOR THIS LESSON
  ============================================================
  - Domain purchase (L5-1 — already done)
  - Connecting the domain / DNS (L5-3)
  - Exact Cloudflare Pages UI screens — abstracted to a resource link only
  - No CTA slide in this lesson per brief
  ============================================================
-->

<!-- SLIDE 1 — TITLE + HOOK -->

# האתר באוויר תוך עשר דקות
## בלי לשלם על אחסון בכלל

**קורס בניה + קידום אתרים בעידן ה-AI**
#### WAO · מודול 5 | שיעור 2

<!--
יש לך היום קבצים מוכנים של אתר שלם.
חמישה דפים, שנשמעים בדיוק כמוך.
אבל קבצים על המחשב שלך הם עדיין לא אתר באוויר.
בשיעור הזה תעלה אותם לרשת, בעשר דקות בלבד.
בלי לשלם אגורה על אחסון.
-->

---

<!-- SLIDE 2 — LOCKED PREREQUISITE CAVEAT -->

## לפני שמתחילים

> לפני שמתחילים. תוודא שיש לך חשבון חינמי ב-Cloudflare Pages. זה לוקח שלוש דקות ונעשה פעם אחת.

- אם כבר פתחת אותו בתחילת המודול, תדלג לשקופית הבאה
- אם עוד לא, תפתח אותו עכשיו. זה חינמי, ולוקח דקות ספורות

<!--
לפני שמתחילים.
תוודא שיש לך חשבון חינמי ב-Cloudflare Pages.
זה לוקח שלוש דקות, ונעשה פעם אחת בלבד.
אם כבר פתחת אותו בתחילת המודול, אפשר לדלג לשקופית הבאה.
אם לא, תפתח אותו עכשיו, לפני שממשיכים.
-->

---

<!-- SLIDE 3 — THE ANALOGY -->

## כמו לשלוח חבילה בדואר

- הקבצים שלך כבר ארוזים ומוכנים
- Cloudflare Pages הוא הדואר. הוא לוקח את החבילה ומפזר אותה בעולם
- אתה לא בונה שום תשתית. אתה רק מוסר את החבילה לגורם שכבר בנה הכול

<!--
תחשוב על זה כמו על משלוח חבילה בדואר.
הקבצים שלך כבר ארוזים, וּמוכנים.
Cloudflare Pages הוא הדואר.
הוא לוקח את החבילה שלך, וּמפזר אותה בשרתים ברחבי העולם.
אתה לא בונה שום תשתית בעצמך.
אתה רק מוסר את החבילה לגורם שכבר בנה את כל זה בשבילך.
-->

---

<!-- SLIDE 4 — WHAT "DEPLOYING" REALLY MEANS -->

## מה זה בעצם "להעלות לאוויר"

- מוסרים את תיקיית הקבצים לשירות האחסון
- השירות בונה **כתובת זמנית** אוטומטית, והאתר עולה כמעט מיד
- זה כל הסוד מאחורי המילה המפחידה "דיפלוי"

<!--
מה בעצם קורה כשמעלים אתר לאוויר?
אתה מוסר את תיקיית הקבצים לשירות האחסון.
השירות בונה כתובת זמנית, באופן אוטומטי.
והאתר שלך עולה לאוויר, כמעט מיד.
זה כל הסוד מאחורי המילה המפחידה, דיפלוי.
-->

---

<!-- SLIDE 5 — PAUSE & ACT -->

## ⏸️ עצור עכשיו — תעלה את האתר

1. תיכנס לחשבון ה-Cloudflare Pages שלך
2. תגרור את תיקיית חמשת הדפים פנימה
3. תמתין לסיום ההעלאה, בדרך כלל דקה או שתיים
4. תיכנס לכתובת הזמנית שנוצרה, ותוודא שהאתר נטען

<!--
עכשיו תעצור, ותעלה את האתר בעצמך.
תיכנס לחשבון ה-Cloudflare Pages שלך.
תגרור את תיקיית חמשת הדפים פנימה.
תמתין לסיום ההעלאה. זה לוקח בדרך כלל דקה או שתיים.
תיכנס לכתובת הזמנית שנוצרה, ותוודא שהאתר באמת נטען.
-->

---

<!-- SLIDE 6 — DOWNLOADABLE CHECKLIST -->

## להוריד: צ'קליסט לפני העלאה

- ✅ כל חמשת הדפים קיימים בתיקייה
- ✅ אין קישורים פנימיים שבורים בין הדפים
- 📎 קישור למדריך המעודכן של Cloudflare Pages בקישורי השיעור

<!--
בקישורי השיעור מחכה לך צ'קליסט קצר, לפני העלאה.
תוודא שכל חמשת הדפים באמת נמצאים בתיקייה.
ותוודא שאין קישורים פנימיים שבורים בין הדפים.
שם תמצא גם קישור למדריך המעודכן של Cloudflare Pages, לכל מקרה שהמסכים ישתנו.
-->

---

<!-- SLIDE 7 — SUMMARY + BRIDGE -->

## מה לוקחים מהשיעור הזה

- האתר שלך חי, עם כתובת זמנית משלו
- זו עדיין לא הכתובת שקנית בשיעור הקודם
- **בשיעור הבא:** מחברים בין השניים. הדומיין והאתר נהיים אחד

<!--
בוא נסכם.
האתר שלך חי באוויר, עם כתובת זמנית משלו.
אבל זו עדיין לא הכתובת שקנית בשיעור הקודם.
בשיעור הבא נחבר בין שניהם.
הדומיין והאתר יהפכו לדבר אחד.
נתראה שם.
-->

---

<!--
  ============================================================
  DEPLOYMENT CHECKLIST — קורס בניית אתרים (מודול 5, שיעור 2)
  ============================================================

  GATE 1 — CONTENT REVIEW (Eitan, before any agent work)
  [ ] אין UI ספציפי מודגם בקריינות (רק "תגרור", "תיכנס" — כללי ולא צמוד למסך נתון)
  [ ] הכיתוב הנעול "לפני שמתחילים..." הופיע verbatim, ולא שונה

  GATE 2 — NARRATION QA (Noa — noa-voice-director) — MANDATORY, no self-QA
  [ ] Noa: proof narration blocks — Sabra tone, singular male (אתה), TTS polish, nikud
  [ ] Noa: sentence-length <= 15 words, no em-dashes (— or -), future-form imperatives
  [ ] Noa: ו"ו החיבור בשורוק לפני בומ"פ / שווא (וּמוכנים, וּמפזר) איפה שרלוונטי
  [ ] Noa: בדיקת הומוגרפים — כל פועל ציווי בצורת עתיד (תיכנס, תגרור, תמתין, תוודא)

  GATE 3 — TTS (Eitan-Dev)
  [ ] spike test: 1–2 משפטים בלבד לפני הרצת השיעור המלא (חוק הגנת קרדיטים)
  [ ] full TTS render לאחר אישור Noa בלבד

  GATE 4 — SLIDES (Eitan-Dev)
  [ ] marp --no-stdin --html --allow-local-files --theme-set docs/scripts/website-course/wao-rtl.css
      -o output/lesson-5-2/slides/ -- docs/scripts/website-course/L5-2-deploy.md

  GATE 5 — VIDEO (Eitan-Dev)
  [ ] ffmpeg concat demuxer → MP4 (לא MoviePy)
  [ ] embed MP4 בדף השיעור (website-course/lesson/5-2)

  GATE 6 — COURSE DATA (Eitan-Dev)
  [ ] הוספת מודול 5 + שיעור 2 ל-src/data/website-course-data.ts
      activeTask מוצע: "תגרור את תיקיית חמשת הדפים ל-Cloudflare Pages. תוודא שהכתובת הזמנית נטענת."
      downloadable asset: צ'קליסט לפני העלאה (5 דפים קיימים / אין קישורים שבורים) + קישור למדריך Cloudflare Pages
  [ ] verifier: לוודא שטענת "האחסון חינמי" עדיין נכונה בזמן ההרצה (flagged per curriculum map)

  GATE 7 — THUMBNAIL (Eitan-Dev)
  [ ] output/lesson-5-2/thumbnail.jpg → public/media/thumbnails/website-lesson-N.png

  GATE 8 — QA (Roni — verifier)
  [ ] MP4 plays with synced audio on localhost:3000
  [ ] thumbnail מופיע בדף השיעור
  ============================================================
-->
