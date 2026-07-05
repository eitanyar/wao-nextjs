---
marp: true
theme: wao-rtl
paginate: true
direction: rtl
module: 5
lesson: 5
title: "גוגל עוד לא יודע שאתה קיים. ככה מזרזים אותו"
lang: he
dir: rtl
status: draft-for-proof
author: Gil (instructional-designer)
source-brief: "orchestrator brief, Module 5 curriculum map (docs/course-marketing/curriculum-map-modules-3-6.md, lesson 5.5) — LIGHT Yonatan dependency: sitemap/indexing-request mechanics and realistic timelines are time-sensitive and need a dated confirmation before this renders. Flagged inline below — do NOT send to TTS until confirmed."
runtime-target: "5 דקות (~500 מילות קריינות)"
pipeline: "Noa (proof + TTS polish) → Yonatan (dated sitemap/indexing currency check) → marp --html preview → Eitan-Dev (render: TTS → Marp → ffmpeg)"
---

<!--
  ============================================================
  LEARNING OBJECTIVE
  ============================================================
  By the end of this lesson the student will:
  1. Understand a new site is not automatically crawled — submitting
     a sitemap + requesting indexing is "raising your hand," not magic
  2. Understand the honest limit: this speeds up discovery, it does
     NOT guarantee ranking or same-day AI-citation
  3. Submit his sitemap URL in Search Console
  4. Use URL Inspection to request indexing for his homepage

  ============================================================
  CONTINUITY
  ============================================================
  - L5-1 through L5-4: domain purchased, site deployed, domain
    connected, Search Console verified and read
  - This is the Module 5 closing lesson — bridges into Module 6
    (maintenance)
  - Recurring example: אבי — שרברב מחולון (not force-fed into this
    lesson — pure mechanics, same as the rest of the module)

  ============================================================
  FACT-CHECK FLAG — LIGHT YONATAN DEPENDENCY
  ============================================================
  Per curriculum map: "sitemap/indexing-request mechanics and realistic
  timelines are time-sensitive; needs current confirmation before
  scripting." This script deliberately does NOT name the exact tab/button
  path for submitting a sitemap or requesting indexing — it stays at the
  concept level ("תשלח את כתובת מפת האתר", "תבקש עבורו אינדוקס") and
  points to Search Console's own current instructions. Still needs
  Yonatan's dated sign-off that: (a) sitemap submission and URL Inspection
  / request-indexing are still both live GSC features, (b) the "speeds
  up discovery, does not guarantee ranking or same-day AI-citation"
  framing is still the honest, current claim. See inline VERIFY comment
  at Slide 5.

  ============================================================
  PIPELINE
  ============================================================
  Gil (instructional-designer) →
  Noa (noa-voice-director, proof + TTS polish) →
  Yonatan (seo-strategist, dated currency check on sitemap/indexing mechanics) →
  Eitan-Dev (nextjs-engineer, render: TTS → Marp → ffmpeg → embed)

  ============================================================
  OUT OF SCOPE FOR THIS LESSON
  ============================================================
  - Domain / deploy / DNS / GSC verification (L5-1 through L5-4 — already done)
  - Ongoing SEO substance (headings, FAQ) — Modules 3 and 4
  - Exact Search Console UI screens — abstracted to a resource link only
  - No CTA slide in this lesson per brief (module CTA already placed at L5-3)
  ============================================================
-->

<!-- SLIDE 1 — TITLE + HOOK -->

# גוגל עוד לא יודע שאתה קיים
## ככה מזרזים אותו

**קורס בניה + קידום אתרים בעידן ה-AI**
#### WAO · מודול 5 | שיעור 5

<!--
האתר שלך חי. הדומיין מחובר. Search Console מאושר.
אבל יש עובדה חשובה שכדאי שתדע.
גוגל לא סורק את האתר שלך אוטומטית, כשהוא עולה.
הוא צריך למצוא אותו קודם.
בשיעור הזה תלמד איך לזרז את זה.
-->

---

<!-- SLIDE 2 — ANALOGY: NEW STORE ON A SIDE STREET -->

## כמו חנות חדשה ברחוב צדדי

- פתחת חנות. אבל אף אחד לא מסתובב שם במקרה
- אם לא תודיע לאף אחד, אנשים פשוט לא ידעו שהיא קיימת
- אותו דבר עם אתר חדש. אין לו תנועה טבעית, בהתחלה

<!--
תחשוב על זה כמו על חנות חדשה, ברחוב צדדי.
פתחת אותה. אבל אף אחד לא מסתובב שם במקרה.
אם לא תודיע לאף אחד שהיא קיימת, אנשים פשוט לא ידעו.
אותו דבר קורה עם אתר חדש באינטרנט.
אין לו תנועה טבעית אליו, בהתחלה.
-->

---

<!-- SLIDE 3 — RAISING YOUR HAND -->

## מרימים יד מול גוגל

- **מפת אתר** — רשימה של כל הדפים שלך, שאתה מוסר ישירות לגוגל
- **בקשת אינדוקס** — אתה מבקש מגוגל אישית: "תבוא תסתכל עכשיו"
- שני אלה הם הדרך שלך "להרים יד" מול גוגל

<!--
אז מה עושים? מרימים יד מול גוגל.
יש לזה שני כלים.
ראשון, מפת אתר. רשימה של כל הדפים שלך, שאתה מוסר ישירות לגוגל.
שני, בקשת אינדוקס.
זה הרגע שבו אתה מבקש מגוגל אישית, תבוא תסתכל על הדף הזה עכשיו.
שני הכלים האלה הם הדרך שלך להרים יד מול גוגל.
-->

---

<!-- SLIDE 4 — HONEST LIMITS -->

## מה זה כן עושה, ומה זה לא עושה

- ✅ מזרז את הגילוי. גוגל מוצא אותך מהר יותר
- ❌ לא מבטיח דירוג גבוה
- ❌ לא מבטיח שמנועי AI יצטטו אותך כבר מחר

<!--
עכשיו חשוב שתבין בדיוק מה זה נותן.
זה מזרז את הגילוי. גוגל מוצא אותך מהר יותר.
אבל זה לא מבטיח דירוג גבוה.
וזה בטח לא מבטיח שמנועי AI יצטטו אותך כבר מחר.
זו התחלה, לא קיצור דרך לפסגה.
-->

---

<!-- SLIDE 5 — PAUSE & ACT -->

## ⏸️ עצור עכשיו — תרים יד מול גוגל

1. תיכנס ל-Search Console
2. תשלח את כתובת מפת האתר שלך, בלשונית המתאימה
3. תיכנס ל"בדיקת כתובת URL"
4. תבדוק את עמוד הבית שלך, ותבקש עבורו אינדוקס

<!-- VERIFIED 2026-07-04 by Yonatan (seo-strategist): Sitemap submission via Sitemaps report unchanged. URL Inspection → Request Indexing fully live, rate-limited ~10-12/day. "Speeds discovery, no ranking guarantee" framing confirmed current. Gate 0 signed off. -->

<!--
עכשיו תעצור, ותרים יד בעצמך.
תיכנס ל-Search Console.
תשלח את כתובת מפת האתר שלך, בלשונית המתאימה.
אחר כך תיכנס לבדיקת כתובת URL.
תבדוק את עמוד הבית שלך, ותבקש עבורו אינדוקס.
-->

---

<!-- SLIDE 6 — DOWNLOADABLE CHECKLIST -->

## להוריד: "השבוע הראשון באוויר"

- ✅ מפת אתר נשלחה
- ✅ עמוד הבית נבדק
- ✅ אינדוקס התבקש
- 📎 קישור למדריך העדכני בקישורי השיעור

<!--
בקישורי השיעור מחכה לך צ'קליסט, השבוע הראשון באוויר.
מפת אתר נשלחה, עמוד הבית נבדק, ואינדוקס התבקש.
שלושה סימונים, וגמרת את השבוע הראשון שלך כמו שצריך.
שם תמצא גם קישור למדריך העדכני, לכל מקרה שהמסכים ישתנו.
-->

---

<!-- SLIDE 7 — SUMMARY + MODULE CLOSE -->

## מה לוקחים מהשיעור הזה, ומהמודול כולו

- הרמת יד מול גוגל. מפת אתר ואינדוקס, נשלחו
- דומיין, אחסון, ו-Search Console, כל אלה כבר מאחוריך
- **המודול הבא:** תחזוקה. איך שומרים על אתר חי, חודש אחרי חודש

<!--
בוא נסכם, גם את השיעור וגם את המודול כולו.
הרמת יד מול גוגל. מפת אתר נשלחה, ואינדוקס התבקש.
דומיין, אחסון, ו-Search Console. כל אלה כבר מאחוריך.
האתר שלך לא רק בנוי. הוא חי, וּמחובר לעולם.
במודול הבא נדבר על תחזוקה.
איך שומרים על אתר חי, חודש אחרי חודש.
נתראה שם.
-->

---

<!--
  ============================================================
  DEPLOYMENT CHECKLIST — קורס בניית אתרים (מודול 5, שיעור 5)
  ============================================================

  GATE 0 — STRATEGIST CURRENCY CHECK (Yonatan — seo-strategist) — ✅ SIGNED OFF 2026-07-04
  [x] Yonatan: Sitemap submission via Sitemaps report unchanged — CONFIRMED
  [x] Yonatan: URL Inspection → Request Indexing fully live, ~10-12/day rate limit — CONFIRMED
  [x] Yonatan: "Speeds discovery, no ranking/AI-citation guarantee" framing still current — CONFIRMED
  [x] Gate 0 cleared — TTS may proceed once Gate 2 (Noa) is also complete

  GATE 1 — CONTENT REVIEW (Eitan, before any agent work)
  [ ] narration never names an exact tab/button path for sitemap submission
      or indexing requests — stays abstract per the fact-check flag above
  [ ] this is the Module 5 closing lesson — bridge line into Module 6 present

  GATE 2 — NARRATION QA (Noa — noa-voice-director) — MANDATORY, no self-QA
  [ ] Noa: proof narration blocks — Sabra tone, singular male (אתה), TTS polish, nikud
  [ ] Noa: sentence-length <= 15 words, no em-dashes (— or -), future-form imperatives
  [ ] Noa: ו"ו החיבור בשורוק לפני בומ"פ / שווא (וּמחובר) איפה שרלוונטי
  [ ] Noa: בדיקת הומוגרפים — כל פועל ציווי בצורת עתיד (תיכנס, תשלח, תבדוק, תבקש)

  GATE 3 — TTS (Eitan-Dev)
  [ ] spike test: 1–2 משפטים בלבד לפני הרצת השיעור המלא (חוק הגנת קרדיטים)
  [ ] full TTS render לאחר אישור Noa וגם Gate 0 בלבד

  GATE 4 — SLIDES (Eitan-Dev)
  [ ] marp --no-stdin --html --allow-local-files --theme-set docs/scripts/website-course/wao-rtl.css
      -o output/lesson-5-5/slides/ -- docs/scripts/website-course/L5-5-indexing.md

  GATE 5 — VIDEO (Eitan-Dev)
  [ ] ffmpeg concat demuxer → MP4 (לא MoviePy)
  [ ] embed MP4 בדף השיעור (website-course/lesson/5-5)

  GATE 6 — COURSE DATA (Eitan-Dev)
  [ ] הוספת מודול 5 + שיעור 5 ל-src/data/website-course-data.ts
      activeTask מוצע: "תשלח מפת אתר ב-Search Console. תבקש אינדוקס לעמוד הבית שלך."
      downloadable asset: "השבוע הראשון באוויר" checklist + קישור למדריך sitemap עדכני
      זהו שיעור הסיום של מודול 5 — לוודא שהקישור למודול 6 מוגדר ב-course data

  GATE 7 — THUMBNAIL (Eitan-Dev)
  [ ] output/lesson-5-5/thumbnail.jpg → public/media/thumbnails/website-lesson-N.png

  GATE 8 — QA (Roni — verifier)
  [ ] MP4 plays with synced audio on localhost:3000
  [ ] thumbnail מופיע בדף השיעור
  ============================================================
-->
