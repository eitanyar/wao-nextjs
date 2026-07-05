---
marp: true
theme: wao-rtl
paginate: true
direction: rtl
module: 5
lesson: 3
title: "לחבר את הדומיין: השלב שמפחיד את כולם ולוקח חמש דקות"
lang: he
dir: rtl
status: draft-for-proof
author: Gil (instructional-designer)
source-brief: "orchestrator brief, Module 5 curriculum map (docs/course-marketing/curriculum-map-modules-3-6.md, lesson 5.3) — no strategist (Yonatan) dependency for this lesson per the map; CTA slide content locked by Tamar (Noa-approved 2026-07-04), narration written by Gil per this task"
runtime-target: "5–6 דקות (~550 מילות קריינות)"
pipeline: "Noa (proof + TTS polish) → marp --html preview → Eitan-Dev (render: TTS → Marp → ffmpeg)"
---

<!--
  ============================================================
  LEARNING OBJECTIVE
  ============================================================
  By the end of this lesson the student will:
  1. Understand connecting a domain = a nameserver change at the
     "phone book" level of the internet — not touching the website itself
  2. Understand the click-work is 5 minutes; propagation afterward is
     outside anyone's control (minutes to hours) and that is normal
  3. Update his domain's nameservers/DNS per Cloudflare's current
     instructions, pointing the purchased domain at the live site
  4. Check the next morning that the domain resolves to his site

  ============================================================
  CONTINUITY
  ============================================================
  - L5-1: domain purchased and registered
  - L5-2: site deployed to Cloudflare Pages, live on a temporary URL
  - Recurring example: אבי — שרברב מחולון (not force-fed into this
    lesson — pure mechanics, same as L5-2)

  ============================================================
  LOCKED CAVEAT (module-4-5-narration-constraints.md, Fix 2)
  ============================================================
  "השינוי עצמו לוקח חמש דקות. אחרי זה, ממתינים. לפעמים הדומיין חי תוך
  כמה דקות, לפעמים כמה שעות. זה נורמלי לגמרי." — must appear verbatim
  in narration.

  ============================================================
  PIPELINE
  ============================================================
  Gil (instructional-designer) →
  Noa (noa-voice-director, proof + TTS polish) →
  Eitan-Dev (nextjs-engineer, render: TTS → Marp → ffmpeg → embed)

  ============================================================
  CTA SLIDE — SOURCE
  ============================================================
  Final slide's on-screen copy pasted verbatim from
  docs/scripts/website-course/cta-slide-module5-end.md (Tamar, Noa-approved
  2026-07-04). Narration for that slide was TBD in the source file — written
  here by Gil, still needs Noa's TTS/voice pass like every other narration
  block in this script.

  ============================================================
  OUT OF SCOPE FOR THIS LESSON
  ============================================================
  - Domain purchase (L5-1 — already done)
  - Deploying the site (L5-2 — already done)
  - Exact Cloudflare Pages / registrar UI screens — abstracted to a
    resource link only
  ============================================================
-->

<!-- SLIDE 1 — TITLE + HOOK -->

# לחבר את הדומיין
## השלב שמפחיד את כולם, ולוקח חמש דקות

**קורס בניה + קידום אתרים בעידן ה-AI**
#### WAO · מודול 5 | שיעור 3

<!--
יש לך דומיין. ויש לך אתר חי, בכתובת זמנית.
השיעור הזה מחבר בין השניים.
זה השלב שהכי מפחיד אנשים בקורס הזה.
וּבצדק, כי השם שלו נשמע טכני.
אבל תראה, החלק שאתה עושה לוקח חמש דקות בלבד.
-->

---

<!-- SLIDE 2 — THE ANALOGY: PHONE BOOK -->

## כמו לעדכן ספר טלפונים

- הדומיין שלך הוא שם. האתר שלך יושב בכתובת אחרת לגמרי
- מישהו צריך לחבר בין השם לכתובת. זה תפקיד "ספר הטלפונים" של האינטרנט
- כשמחליפים ספר טלפונים, לוקח זמן שכולם בעולם יעדכנו לגרסה החדשה

<!--
תחשוב על זה כמו על ספר טלפונים.
יש לך שם. יש לך אתר, שיושב בכתובת אחרת לגמרי.
מישהו צריך לחבר בין השם לבין הכתובת.
זה בדיוק תפקיד ספר הטלפונים של האינטרנט.
וכשמחליפים ספר טלפונים, לוקח זמן שכולם בעולם יעדכנו לגרסה החדשה.
-->

---

<!-- SLIDE 3 — CLICK WORK VS. THE WAIT -->

## חמש דקות קליק, ואז ממתינים

- העדכון עצמו: כמה שדות שמעתיקים מ-Cloudflare לאתר הרישום שלך
- אחרי הקליק האחרון, אתה כבר לא שולט בקצב שהעולם מתעדכן בו
- וזה בסדר גמור. זה לא תלוי בך, וזה לא סימן שמשהו נכשל

<!--
העדכון עצמו הוא קצר.
כמה שדות שאתה מעתיק מהאתר של Cloudflare, אל אתר הרישום שלך.
אבל אחרי הקליק האחרון, אתה כבר לא שולט בקצב.
העולם מתעדכן בקצב שלו.
וזה בסדר גמור. זה לא תלוי בך, וזה לא סימן שמשהו נכשל.
-->

---

<!-- SLIDE 4 — LOCKED TIMING CAVEAT (VERBATIM) -->

## כמה זמן זה באמת לוקח

> השינוי עצמו לוקח חמש דקות. אחרי זה, ממתינים. לפעמים הדומיין חי תוך כמה דקות, לפעמים כמה שעות. זה נורמלי לגמרי.

<!--
השינוי עצמו לוקח חמש דקות.
אחרי זה, ממתינים.
לפעמים הדומיין חי תוך כמה דקות, לפעמים כמה שעות.
זה נורמלי לגמרי.
-->

---

<!-- SLIDE 5 — REFRAME: DO IT BEFORE BED -->

## העצה הכי טובה: תעשה את זה לפני השינה

- תעדכן את הפרטים בערב
- תלך לישון, בלי לרענן את הדף כל חמש דקות
- תבדוק בבוקר. לרוב, הדומיין כבר יחכה לך חי

<!--
אז הנה העצה הכי טובה שיש לי בשיעור הזה.
תעשה את זה לפני השינה.
תעדכן את הפרטים בערב, ותלך לישון בלי לרענן את הדף כל חמש דקות.
תבדוק בבוקר.
לרוב, הדומיין כבר יחכה לך חי וקורא.
-->

---

<!-- SLIDE 6 — PAUSE & ACT -->

## ⏸️ עצור עכשיו — תחבר את הדומיין

1. תיכנס לפרויקט שלך ב-Cloudflare Pages
2. תעתיק משם את פרטי החיבור
3. תיכנס לאתר הרישום של הדומיין, ותעדכן שם את הפרטים
4. תסגור את המחשב, ותבדוק שוב מחר בבוקר

<!--
עכשיו תעצור, ותחבר את הדומיין בעצמך.
תיכנס לפרויקט שלך ב-Cloudflare Pages.
תעתיק משם את פרטי החיבור.
תיכנס לאתר הרישום של הדומיין, ותעדכן שם את הפרטים האלה.
בסוף, תסגור את המחשב. ותבדוק שוב מחר בבוקר.
-->

---

<!-- SLIDE 7 — DOWNLOADABLE ONE-PAGER -->

## להוריד: "מה עושים עד שזה מתעדכן"

- מה נחשב נורמלי, ומה כבר סימן שכדאי לבדוק
- מתי שווה לפנות לעזרה, ומתי פשוט לחכות עוד קצת
- 📎 קישור למדריך העדכני של Cloudflare בקישורי השיעור

<!--
בקישורי השיעור מחכה לך דף קצר, מה עושים עד שזה מתעדכן.
הוא מסביר מה נחשב נורמלי, וּמה כבר סימן שכדאי לבדוק.
וּמתי שווה לפנות לעזרה, ומתי פשוט לחכות עוד קצת.
שם תמצא גם קישור למדריך העדכני של Cloudflare, לכל מקרה שהמסכים ישתנו.
-->

---

<!-- SLIDE 8 — SUMMARY + BRIDGE -->

## מה לוקחים מהשיעור הזה

- עשית את החלק שלך. חמש דקות קליק
- ההמתנה שאחרי היא נורמלית, ולא תלויה בך
- **בשיעור הבא:** תראה מה גוגל באמת חושב על האתר שלך

<!--
בוא נסכם.
עשית את החלק שלך. חמש דקות קליק, לא יותר.
ההמתנה שאחרי היא נורמלית לגמרי, ולא תלויה בך.
בשיעור הבא תראה משהו מעניין.
מה גוגל באמת חושב על האתר שלך.
נתראה שם.
-->

---

<!-- SLIDE 9 — ₪9.90 CTA — Tamar (Noa-approved 2026-07-04); narration by Gil -->

## עשית ידנית — הבוט עושה בשיחה אחת

- דומיין, Cloudflare, GSC — כל מה שהרגע עשית ביד
- הבוט עושה את שלושתם בשיחה אחת
- עכשיו אתה יודע מה זה שווה — זה הקיצור

**ניסיון ב-₪9.90 ← [wao.co.il/site-bot](https://wao.co.il/site-bot)**

<!--
עכשיו אתה יודע בדיוק כמה עבודה יש כאן.
דומיין, Cloudflare, ו-Google Search Console.
שלושה שלבים, שעשית הרגע עם הידיים שלך.
הבוט של WAO עושה את שלושתם, בשיחה אחת בלבד.
דווקא בגלל שעשית את זה לבד, עכשיו אתה באמת יודע מה זה שווה.
זה בדיוק הקיצור שהוא נותן לך.
-->

---

<!--
  ============================================================
  DEPLOYMENT CHECKLIST — קורס בניית אתרים (מודול 5, שיעור 3)
  ============================================================

  GATE 1 — CONTENT REVIEW (Eitan, before any agent work)
  [ ] הכיתוב הנעול "השינוי עצמו לוקח חמש דקות..." הופיע verbatim, ולא שונה
  [ ] CTA slide (שקופית 9): על-המסך נעול (Tamar, Noa-approved 2026-07-04) —
      נגעתי רק בקריינות, לא בטקסט על המסך
  [ ] אין UI ספציפי מודגם בקריינות — רק "תעתיק", "תעדכן" — כללי

  GATE 2 — NARRATION QA (Noa — noa-voice-director) — MANDATORY, no self-QA
  [ ] Noa: proof narration blocks — Sabra tone, singular male (אתה), TTS polish, nikud
  [ ] Noa: sentence-length <= 15 words, no em-dashes (— or -), future-form imperatives
  [ ] Noa: ו"ו החיבור בשורוק לפני בומ"פ / שווא (וּבצדק, וּמה, וּמתי) איפה שרלוונטי
  [ ] Noa: בדיקת הומוגרפים — כל פועל ציווי בצורת עתיד (תיכנס, תעתיק, תעדכן, תסגור)
  [ ] Noa: proof the NEW CTA narration (slide 9) specifically — first time it's voiced

  GATE 3 — TTS (Eitan-Dev)
  [ ] spike test: 1–2 משפטים בלבד לפני הרצת השיעור המלא (חוק הגנת קרדיטים)
  [ ] full TTS render לאחר אישור Noa בלבד

  GATE 4 — SLIDES (Eitan-Dev)
  [ ] marp --no-stdin --html --allow-local-files --theme-set docs/scripts/website-course/wao-rtl.css
      -o output/lesson-5-3/slides/ -- docs/scripts/website-course/L5-3-connect-domain.md

  GATE 5 — VIDEO (Eitan-Dev)
  [ ] ffmpeg concat demuxer → MP4 (לא MoviePy)
  [ ] embed MP4 בדף השיעור (website-course/lesson/5-3)

  GATE 6 — COURSE DATA (Eitan-Dev)
  [ ] הוספת מודול 5 + שיעור 3 ל-src/data/website-course-data.ts
      activeTask מוצע: "תעדכן את פרטי החיבור באתר הרישום. תבדוק שוב מחר בבוקר שהדומיין חי."
      downloadable asset: "מה עושים עד שזה מתעדכן" one-pager + קישור למדריך Cloudflare
      CTA slide (₪9.90 site-bot) — לוודא שנכנס גם ל-CTA card component, לא רק לסוף הוידאו

  GATE 7 — THUMBNAIL (Eitan-Dev)
  [ ] output/lesson-5-3/thumbnail.jpg → public/media/thumbnails/website-lesson-N.png

  GATE 8 — QA (Roni — verifier)
  [ ] MP4 plays with synced audio on localhost:3000
  [ ] thumbnail מופיע בדף השיעור
  [ ] CTA link (wao.co.il/site-bot) חי ותקין
  ============================================================
-->
