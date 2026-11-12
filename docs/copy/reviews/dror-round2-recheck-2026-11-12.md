# Dror: round-2 fact re-check (2026-11-12)

Saved by Adam. Verdicts: SHIP — real-30s-story, situation-shorts, nurture (still parked), voice-pron-test. FIX — explainer A, explainer B, FAQ, how-it-works page, Quality Score article, A3 ear fix.

## FIX intents (English; Tamar writes the Hebrew)
- **Explainer A, E2-05:** drop the bare חינם from the blocked list; keep job seekers, courses, second hand, and what you don't do.
- **Explainer B:**
  - E8-06: "we estimate two to three months for a typical trade at the minimum budget, and not every business gets there".
  - E7-01 (soft): "sees in Google's report which searches brought the clicks".
- **FAQ:**
  - q14: "we estimate…"; "the plan is to then show you the budget that would get you there" (phase 2, N4).
  - q01: "the only thing the account counts AS A RESULT is an enquiry you marked real" (secondary actions incl. ad calls are now recorded).
  - q06: "Google's estimate of how many people search" (fix facts_used too).
  - q09: drop bare חינם.
  - q07 (soft): "at the minimum budget, splitting it across every service leaves each too few clicks to learn what works".
- **How-it-works page:**
  - Answer block: "automatic actions run only after your one-time approval".
  - Intro: add "as a result".
  - Step 3 ¶2: "and, with your one-time approval, adds wasteful searches it finds later (step 7)".
  - Step 6: add "Google filters the invalid clicks it detects out of your reports and your bill" (42995).
  - Step 7 ¶2: "an enquiry you marked real goes back to Google, tied to the click that brought it" (no "each/every").
  - Step 8 ¶2 tail and you_see: "the plan is that you'll see the budget…" (phase 2).
  - The article_elements / glossary blocks in this file are IGNORED (Yonatan); the article file is the only source.
- **Quality Score article:**
  - Ad Strength = חוזק המודעה (Google's Hebrew term) everywhere; scale "מנמוך עד מצוין".
  - Box, Ad Rank cell: "yes, it's the value the auction compares".
  - Optimization Score note: "Optimization score (0–100%) is Google's estimate of how well the account is set up to perform, by Google's own recommendations. Applying or dismissing one changes it. Google says Quality Score doesn't use it, and it says nothing about your ad versus competitors." (closes B4(iii))
  - Sources line: 6167118, 1722122, 9921843, 9061546, 6297, 2453972, 7684791.
  - Glossary/course 980: "Google doesn't publish a number of seconds…".
- **A3 ear fix:** "the ads bot gathers the enquiries FROM YOUR PAGE into one list on your phone, and you mark what's real" (both cuts).

## Product items (→ engineer, via Adam)
- Add both spellings יד שנייה / יד שניה to the live negatives.
- Free-intent phrase negatives instead of bare חינם, incl. ב- forms: הורדה בחינם, להוריד בחינם, קורס בחינם, מדריך בחינם, תוכנה בחינם, אפליקציה בחינם (+ non-ב forms), phrase match. Never block bare חינם, הצעת מחיר (בחינם), בדיקה/ייעוץ חינם. Align intent-dictionaries.ts:30. The phrase list is Dror's; Noa proofs the spelling before the engineer applies it.
- Confirm the live negatives list is safe to record for the E2-05 screen.

Sources: Google Help 6297, 9921843, 9061546, 6167118 (en+iw), plus the batch A/B lists. Publish-day re-read of every Google statement in the page and the article.
