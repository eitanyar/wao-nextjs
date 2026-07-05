---
marp: true
theme: wao-rtl
module: 6
lesson: 1
title: "לעדכן את האתר בשיחה — כמו לשלוח הודעה לעובד"
lang: he
dir: rtl
status: draft-for-noa
author: Gil (instructional-designer)
source-brief: "orchestrator brief — Module 6 curriculum map (docs/course-marketing/curriculum-map-modules-3-6.md), lesson 6.1. No Yonatan dependency: reuses Module 2's AI-conversation workflow and Module 5's Cloudflare drag-and-drop redeploy mechanics only — no new domain facts introduced."
runtime-target: "5–6 דקות (~600 מילות קריינות)"
pipeline: "Noa (proof + TTS polish) → marp --html preview → Eitan-Dev (render: TTS → Marp → ffmpeg)"
---

<!--
  ============================================================
  LEARNING OBJECTIVE
  ============================================================
  By the end of this lesson the student will:
  1. Understand that updating a live site reuses the exact same
     AI-conversation workflow from Module 2 — no new tool, no new skill
  2. Know the 3-step update loop: describe the change in plain Hebrew →
     AI edits the file → redeploy via the same Cloudflare drag-and-drop
     from Module 5 (5.2)
  3. Know the phrasing formula for a clean, contained edit vs. a vague
     prompt that risks breaking the layout
  4. Have executed one real update end-to-end on his own live site:
     prompt → edit → redeploy → verified live

  ============================================================
  CONTINUITY
  ============================================================
  - Module 2 (L2-1–L2-4): the AI conversation that built the 5-page site,
    and the "AI is a new employee you brief once" analogy from L2-1
  - Module 5 (5.2): Cloudflare Pages drag-and-drop deploy mechanics
  - Recurring example: אבי — plumber from Holon, old apartments,
    hidden leaks without breaking walls, arrives within an hour

  ============================================================
  OUT OF SCOPE FOR THIS LESSON
  ============================================================
  - Monthly maintenance / GSC checklist (L6-2)
  - The DIY-vs-handoff decision (L6-3 — course CTA)
  - Any tool-specific UI beyond what's already taught (dynamic resource
    list only, no new click-path scripted here)
  ============================================================
-->

<!-- SLIDE 1 — TITLE + HOOK -->

# לעדכן את האתר בשיחה
## כמו לשלוח הודעה לעובד שכבר מכיר את העסק

**קורס בניה + קידום אתרים בעידן ה-AI**
#### WAO · מודול 6 | שיעור 1

<!--
האתר שלך באוויר, ואתה עסוק בניהול העסק.
ואז המחיר משתנה, או שעות הפעילות מתעדכנות.
מה עושים? קוראים למתכנת? פותחים קוד?
לא. פשוט פותחים שיחה, בדיוק כמו במודול שתיים.
בשיעור הזה תעדכן דבר אמיתי באתר החי שלך.
-->

---

<!-- SLIDE 2 — THE ANALOGY REVISITED -->

## תזכורת: ה-AI כבר מכיר את העסק שלך

- במודול 2 תיארת לו את העסק, פעם אחת
- הוא זוכר את התיאור, ואת כל השיחה איתך
- עדכון הוא לא פרויקט חדש. זאת הודעה קצרה

<!--
תזכור את השיחה שפתחת במודול שתיים.
שם תיארת ל-AI מי אתה, וּמה אתה עושה.
השיחה הזאת עדיין שם, וזוכרת הכול.
אז עדכון היום הוא לא פרויקט חדש.
זה בדיוק כמו הודעה קצרה לעובד וותיק שכבר מכיר הכול.
-->

---

<!-- SLIDE 3 — THE 3-STEP LOOP -->

## הלולאה: מתארים, עורכים, מעלים

1. אתה מתאר את השינוי, בעברית פשוטה
2. ה-AI עורך את הקובץ בשבילך
3. אתה מעלה מחדש. אותה גרירה ממודול 5

<!--
לעדכון יש שלושה שלבים בלבד.
שלב ראשון, אתה מתאר את השינוי בעברית פשוטה.
שלב שני, ה-AI עורך את הקובץ בשבילך.
שלב שלישי, אתה מעלה אותו מחדש לאוויר.
זאת אותה גרירה בדיוק שלמדת במודול חמש.
שום כלי חדש. שום למידה נוספת.
-->

---

<!-- SLIDE 4 — THE PROMPT FORMULA: CONTAINED VS. RISKY -->

## השורה שתכתוב, וזו שתימנע ממנה

**תעדכן ככה:**
> "תעדכן רק את [הפרט] בעמוד [שם העמוד]. אל תשנה שום דבר אחר."

**לא ככה:**
> "תשפר את העמוד" — פתוח מדי, עלול לשנות את כל העיצוב

<!--
עכשיו לשורה שתכתוב בפועל.
תעדכן רק את הפרט הזה בעמוד הזה.
ותוסיף משפט אחד: אל תשנה שום דבר אחר.
המשפט הזה שומר על שאר העמוד בדיוק כמו שהיה.
לעומת זאת, תשפר את העמוד היא בקשה פתוחה מדי.
ה-AI עלול לשנות עיצוב, סדר, וּמה שכבר עבד טוב.
-->

---

<!-- SLIDE 5 — EXAMPLE: AVI UPDATES THREE THINGS -->

## אבי מעדכן שלושה דברים באתר שלו

| העדכון | השורה שכתב |
|---|---|
| מחיר קריאת חירום עלה | "תעדכן רק את המחיר בעמוד שירותים, ל-180 ש״ח. אל תשנה שום דבר אחר." |
| שעות שישי חדשות | "תוסיף שעת פתיחה בימי שישי, 8 עד 12, בעמוד צור קשר בלבד." |
| המלצה חדשה מלקוח | "תוסיף את ההמלצה הזאת לעמוד עלינו, בלי לגעת בשאר הטקסט." |

<!--
בוא נראה את זה אצל אָבִי.
המחיר לקריאת חירום עלה, אז הוא כתב שורה ברורה.
תעדכן רק את המחיר בעמוד שירותים, למאה שמונים שקל.
הוא הוסיף גם שעת פתיחה חדשה בימי שישי.
וכשקיבל המלצה חדשה מלקוח, הוא ביקש להוסיף רק אותה.
בכל שלוש הפעמים, אותו עיקרון בדיוק. עדכון אחד, בלי לגעת בשאר.
-->

---

<!-- SLIDE 6 — PAUSE & ACT -->

## ⏸️ עצור עכשיו — תעדכן דבר אמיתי אחד

1. תבחר עדכון אמיתי שהאתר שלך צריך עכשיו
2. תכתוב שורה אחת, לפי הנוסחה
3. תשלח ל-AI, ותבדוק שהעדכון נכנס נכון
4. תעלה מחדש. אותה גרירה ממודול 5
5. **תבדוק באתר החי** שהשינוי אכן מופיע

<!--
תעצור את הסרטון עכשיו.
תבחר עדכון אמיתי אחד, שהאתר שלך צריך.
מחיר, שעות, או המלצה חדשה. זה לא משנה מה.
תכתוב שורה אחת, לפי הנוסחה שלמדת.
תשלח, ותבדוק שהעדכון נכנס נכון.
תעלה מחדש, בדיוק כמו במודול חמש.
ותבדוק באתר החי, שהשינוי באמת שם.
-->

---

<!-- SLIDE 7 — SUMMARY + BRIDGE -->

## מה לוקחים מהשיעור הזה

- עדכון הוא הודעה קצרה, לא פרויקט חדש
- הנוסחה: מה לעדכן, איפה, ואל תיגע בשאר
- הלולאה תמיד זהה: לתאר, לערוך, להעלות
- **בשיעור הבא:** רבע שעה בחודש ששומרת על המקום שלך בגוגל

<!--
בוא נסכם.
עדכון הוא הודעה קצרה, לא פרויקט חדש.
הנוסחה: מה לעדכן, איפה, ואל תיגע בשאר.
הלולאה תמיד זהה. לתאר, לערוך, להעלות.
בשיעור הבא נדבר על רבע שעה בחודש.
זמן קצר ששומר על המקום שלך בגוגל.
נתראה שם.
-->
</content>
</invoke>
