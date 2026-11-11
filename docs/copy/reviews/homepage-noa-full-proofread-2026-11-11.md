# Homepage full proofread — Noa (language-qa), 2026-11-11

First test of Noa's expanded role (full proofread + AI-signature removal + writing upgrades). Review only; nothing edited.
Tags: [RED] breaks meaning, [ORANGE] objective error, [YELLOW] style, [AI] AI tell.

## 1. Verdict
About 60% human. The h1, the card CTA "תראה לי מודעה לעסק שלי" and FAQ Q2 sound like a person. Everything else reads like copy written to fill section roles: abstract nouns (כיוון, נוכחות, מקום ברור ברשת), "מי שמחפש אותך / צריך למצוא אותך" four times, reveal colons and dashes, and no scene a plumber would recognise. No corruptions, no [RED].

Worst three:
1. `founder_authority.accountability_line` — repeats the name and role printed right above it; the rest is empty corporate talk.
2. FAQ Q5 answer — dodges the question; an ROI-minded owner reads that as hiding something.
3. `final_cta.body` — "כיוון ברור לצעד הבא" is generic and promises something the button doesn't deliver (it goes to an ad + landing-page demo).

## 2. Per section (render order)

**Header / nav**
- [YELLOW] One destination, four CTA labels: "תראה לי את המודעה שלי" (nav), "אני רוצה לראות הדגמה" (hero), "תראה לי מודעה לעסק שלי" (card), "קדימה, להדגמה" (final). Pick one or two; concrete מודעה beats abstract הדגמה.

**Hero**
- eyebrow + h1: SEO anchors, untouched. The h1 is the most human line on the page.
- [ORANGE] `hero.body`: en-dash "–" where house style is em-dash "—". Same in 5 more in `paths.*` (lines 88, 89, 90 ×2, 102) — 6 total, all in astra-authority-first-homepage-copy.json.
- [AI] `hero.body`: logic skips a step; "ב-WAO תראה הדגמה:" is a stiff reveal colon.
  - old: "אתה כל היום בעבודה – מי שמחפש שירות כמו שלך צריך למצוא אותך. ב-WAO תראה הדגמה: מודעה ודף נחיתה לעסק שלך."
  - suggested: "אתה כל היום אצל לקוחות, אין לך זמן לשווק. מי שמחפש עכשיו את השירות שלך בגוגל צריך להגיע אליך, לא למתחרה. תראה איך ייראו המודעה ודף הנחיתה שלך, לפני שמשלמים שקל."
  - why: names the missing link (no time) and the stake (competitor); "before paying" backed by the old supporting_line and demo_note.

**Proof (#proof)**
- [AI] `video_proof.heading` "סרטון ההמלצות של לקוחות WAO" describes the widget → "לקוחות WAO, במילים שלהם" (check against claim_boundaries, which forbid characterising the video).
- [YELLOW] `context_line` is "" and renders an empty `<p>` — engineer layout matter.
- [YELLOW] CTA grammar mixed across the page (infinitive / imperative / first person). One form per role.

**Paths (#paths)**
- [AI] Cut `paths.intro` entirely (repeats card headings, buzzword "נוכחות קבועה ברשת", repeats "לסדר").
- [ORANGE] `google_ads.heading`: "פרסום בגוגל – להגיע" → "פרסום בגוגל — להגיע". Keep "פרסום בגוגל" as head term.
- [AI] `google_ads.description`: "מודעה מדויקת שמה אותך מולו" is a calque; reveal-dash; generic funnel.
  - suggested: "מישהו באזור שלך מחפש עכשיו בגוגל את מה שאתה עושה. המודעה שלך מופיעה לו, הוא נכנס לדף שלך ומתקשר או משאיר פרטים."
- [ORANGE]+[AI] `demo_status`: two en-dashes; "יוצא לדרך" ceremonial, "מלחיצה" vague, "מקושרת למודעה" jargon.
  - suggested: "שום מודעה לא עולה לאוויר בלי האישור שלך. ותדע איזו מודעה הביאה כל פנייה, מטופס או משיחה."
  - **Fact flag:** older copy says call tracking is a paid add-on ("הרחבה… בתשלום נפרד"); this line suggests it's included. Confirm (Dror/Adam).
- [ORANGE]+[AI] `business_website.description`: en-dash between subject and predicate; "נותנים לעסק שלך מקום ברור ברשת:" abstract + reveal colon.
  - suggested: "שכן המליץ עליך, והלקוח בודק את השם שלך בגוגל. לא מצא אתר, טלפון ושעות? הוא מתקשר למישהו אחר."
- [YELLOW] Website card CTA goes to the free Google-profile check — make the bridge explicit. "עוד על האתר לעסק" → "עוד על אתר לעסק".
- [AI] `choosing_help.line`: "ונבחר יחד כיוון" consultant talk.
  - suggested: "לא בטוח מה מתאים לך? ספר לנו מה אתה עושה ואיפה, ונגיד לך מאיפה שווה להתחיל."

**People (#people)**
- [AI] `accountability_line`: deletion-only fix — cut "איתן יריב, מייסד WAO, ". Full rewrite needs facts:
  - old: "…עומד מאחורי הכיוון המקצועי של כל עבודה כאן."
  - suggested: "כל קמפיין ודף שיוצאים מ-WAO עוברים תחת העיניים שלי. אני בשיווק דיגיטלי מאז 2006." — only if Eitan confirms both facts ("2006" already live in the footer).
- [AI] `partner_proof.status_line` repeats the heading; "Search ו-Display" jargon.
  - suggested: "רשומים בספריית השותפים של גוגל, עם הסמכות לפרסום בחיפוש ולמודעות תצוגה."

**FAQ**
- [YELLOW] "זה בעיה?" vs normative "זו בעיה?" — colloquial acceptable in a question; Tamar's call.
- [AI] Q3: "בשביל זה אנחנו כאן" is the agency boast the exemplar lists under "do not imitate"; cut "אתה לא צריך ללמוד מקצוע נוסף." → "להפך. אתה איש המקצוע, אנחנו מטפלים בשיווק."
- [AI] Q1: stock opener "בהחלט", reveal-dash; "מסלול המודעות" appears nowhere else. → "כן. המודעות יכולות להביא לקוחות לאתר הקיים שלך, או לדף נחיתה חדש וממוקד יותר."
- [AI] Q4: five-item hedge list, "תלוי" twice, "נוכחות אורגנית" jargon. → "במודעות, פניות יכולות להגיע כבר מהיום שהקמפיין עולה. כמה, תלוי בביקוש באזור, בתחרות ובתקציב. אתר ונוכחות מקומית בונים לקוחות לאט, לאורך חודשים." (Dror + Yonatan verify timing.)
- [ORANGE] Q5 question: "חוזה ארוך טווח" → "חוזה לטווח ארוך".
- [AI] Q5 answer is a non-answer; Tamar needs the real terms from Adam. Don't invent.

**Final CTA**
- [AI] `final_cta.body` → "ספר לנו מה אתה עושה ובאיזה אזור. תקבל מודעה ודף נחיתה לעסק שלך, לראות לפני שמחליטים."
- [YELLOW] heading "איך זה ייראה אצלך?" — "זה" refers to nothing; CTA "קדימה, להדגמה" stiff.

**Footer**
- [AI] Blurb (joins `low_price.lines[0]`, `[1]`, `people.intro`): "אמיתי" ×2, "ניסיון" ×2, sentence 3 restates 1, "המערכת" refers to nothing.
  - suggested: "אנשי השיווק של WAO, בשיווק דיגיטלי מאז 2006, מובילים את העבודה. סוכני AI עושים חלק גדול מהמחקר, מהכתיבה ומההקמה."
- [YELLOW] "מה מקבלים ואיך ממשיכים?" and "תראה לי את המודעה שלי" sit in a list of service names, out of context.
- [ORANGE] Footer.tsx hard-coded `'מערכת "מה עובד" (CRM)'` ASCII quotes → `'מערכת ״מה עובד״ (CRM)'`.

**SEO anchors (flag only):** eyebrow, h1, title untouched. Title ends in Hebrew (bidi-safe), ~55 chars.

## 3. Proposed writing upgrades for waocopy (await approval)
1. Never restate in body text what a heading, label or the neighbouring element already says.
2. Don't reuse the same key phrase more than twice per page. Vary it or cut it.
3. Replace abstract nouns (direction, presence, place online) with a concrete moment the reader has lived.
4. Every promise must match what the linked button actually delivers.
5. Use colons and dashes only for real lists or asides, not to set up a reveal, and at most once per section.
6. An FAQ answer opens with the direct answer (yes, no, a number, a time), then one reason. No stock openers, and no "it depends on X, Y, Z" lists.
7. Never answer a question about terms or price by sending the reader elsewhere. State the term, or ask for it in the brief.
8. One verb form per CTA role across a page. Prefer concrete nouns over category words in button labels.
9. No reassurance words like "real/genuine" unless a specific fact follows.
10. Translate English idioms of position or motion into how an Israeli tradesman would say it aloud.

## 4. Brief for Tamar
Rewrite the rendered homepage strings in both JSON files (keys above), plus the footer blurb's three source lines. Voice: the /site-bot/audit exemplar — short bad news, then the consequence, then the next step, plus one "you were there" scene per path card. Cut `paths.intro`; replace the name/role echo in the founder line; give FAQ Q5 a real answer (terms from Adam); align `final_cta.body` with the ad + landing-page demo; reduce the four CTA labels to one or two; replace the six en-dashes; remove repeated "מי שמחפש אותך" and "כיוון". Keep h1, eyebrow, title (SEO anchors), "פרסום בגוגל" as card head term, every claim boundary (no invented results, rankings, quotes or video characterisation), singular masculine, FAQ Q2 and the card CTA. Open facts first: call/lead attribution included in `demo_status`? (Dror/Adam); FAQ Q4 timing (Dror/Yonatan); founder-line facts (Eitan). After the rewrite → Noa correctness pass → contract test + approved-copy record updated.

Files: src/content/astra-authority-first-homepage-copy.json, src/content/astra-homepage-copy.json, src/components/Footer.tsx.
