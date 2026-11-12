# Noa: /google-ads "clicks to real leads" + Dash v2 voice rounds 1–2 (2026-11-12)

Saved by Adam from Noa's hand-back (her tools can't create files). Replacements below are copied verbatim from her report.

## Adam's rulings on open points
- **H1:** Yonatan owns anchors and picked option 1, "פרסום בגוגל שבנוי לעבור מקליקים לפניות אמיתיות", because option 2 (and Noa's third option) would be false in stage 1 and for owners who never reach the switch. Option 1 stands.
- **mechanism.intro and close.body:** these are in Tamar's /google-ads round 2 (docs/copy/briefs/google-ads-clicks-to-leads-r2-2026-11-12.md).
- **End card:** replace all 6 "[excited] WAO! סייט בוט." with "[excited] WAO! Site Bot.".
- **Sibling sweep, the A3 "closed jobs" line, A1 hooks[0], S3 strengthening and screen notes:** these go to voice round 3.

## 1. /google-ads, verdict SHIP WITH FIXES
Apply to docs/copy/google-ads-clicks-to-leads-2026-11-12.waocopy.json before the page patch.

- mechanism.moments[1].desc
  `אתה מסמן אמיתית או לא, נסגרה או לא. כל פנייה שסימנת כאמיתית חוזרת לגוגל מהיום הראשון. הסימונים האלה בונים את המעבר האוטומטי למצב פניות.`
  → `אתה מסמן כל פנייה: אמיתית או לא, נסגרה או לא. מה שסימנת כאמיתית חוזר לגוגל מהיום הראשון, וכל סימון מקרב את המעבר האוטומטי למצב פניות.`
- faq[7].a, second sentence. Adam's ruling: use the safe minimum fix (her alternative is true only in stage 2).
  `כאן כל סימון של פנייה אמיתית חוזר לגוגל ובונה את המעבר האוטומטי למצב פניות.`
  → `כאן כל סימון של פנייה אמיתית חוזר לגוגל.`
- phases_items[0]: `נשלחת לגוגל.` → `חוזרת לגוגל.`
- phases_items[1]
  `כשמצטברות בערך 15 פניות אמיתיות בתוך 60 יום, המערכת עוברת לבד למצב פניות — הקמפיין רודף אחרי פניות אמיתיות, לא אחרי קליקים.`
  → `כשמצטברות בערך 15 פניות אמיתיות בתוך 60 ימים, הקמפיין עובר לבד למצב פניות ורודף אחרי פניות אמיתיות, לא אחרי קליקים.`
  (the rest of the item is unchanged)
- phases_items[2]: `אם זה המצב אצלך,` → `אם זה קורה אצלך,`
- phases_items[3]: `המערכת חוזרת לבד למצב קליקים.` → `הקמפיין חוזר לבד למצב קליקים.`
- Engineer: confirm that the client UI mark button really says "אמיתית" (Tamar's note 5).

## 2. Dash v2 round 1 (docs/copy/video-dash-v2-flagged-lines-fix-2026-11-12.waocopy.json)
- **A1.script_30[0] FIX:** `[deadpan] אתה סוֹפֵר קליקים כמו מונה של מונית, וכל קליק הוא עוד נוסע שעולה.` (display without niqqud: `אתה סופר קליקים כמו מונה של מונית, וכל קליק הוא עוד נוסע שעולה.`)
- **A1.script_30[4]:** replaced by round 2.
- **A2 (both cuts):** PASS. Put the niqqud הקוּפה in the voice string.
- **A3 (both cuts):** PASS.
- **S2.script_15[2] FIX:** `[calm] עכשיו אתה מבין את הלקוחות שלך. Site Bot מביא לך עוד ביקורות בגוגל, לפני ש׳אחר כך׳ הופך ל׳אף פעם׳.`

## 3. Dash v2 round 2 (docs/copy/video-dash-v2-round2-2026-11-12.waocopy.json)
- **A1.script_30[4] FIX** (byte-exact old, including the tag):
  old `[calm] בוט מודעות מביא לך נוסעים שמשלמים. אתה מסמן מה נסגר, וזה בונה את השלב הבא.`
  → new `[calm] עם בוט מודעות, כל פנייה אמיתית שאתה מסמן חוזרת לגוגל. כשיש מספיק כאלה, המודעות עוברות לבד לנוסעים שמשלמים, לא לשואלים.`
  - Note: the scripts file still holds the ORIGINAL A1[4] (`[calm] בוט מודעות מביא לך נוסעים שמשלמים, כי הוא לומד רק מעבודות שסגרת.`). Replace that original directly with the new line.
- **S3.script_15[2] FIX:** `[calm] Site Bot מביא עוד ביקורות בגוגל, ומציג את כל השירותים שלך גם באתר וגם בפרופיל. והפעם ׳כן׳ זו תשובה.`
  - Noa's stronger version, Tamar's call in round 3: `[calm] Site Bot מציג את כל השירותים שלך, גם באתר וגם בפרופיל בגוגל. והפעם ׳כן׳ זו תשובה.`
- **End card (all 6):** `[excited] WAO! סייט בוט.` → `[excited] WAO! Site Bot.`

## Pronunciation test additions
סוֹפֵר, הקוּפה, and "Site Bot" in Latin inside a Hebrew line, on Nimrod.

## Writing upgrades proposed by Noa (pending Adam's acceptance into docs/copy/writing-upgrades.md)
1. Extend the craft rule "One name per product…" with: "…and one subject for whatever acts in the mechanism (the bot, the campaign or the system), held across the section."
2. New voiced-line rule: "In a voiced line, name the product before telling the listener what he does in it. Use no dashes. Replace any word that can be read two ways where it sits." In exchange, retire the meta-description length rule, which the SERP gate enforces.
3. For waocopy's patch-mode instructions: "An `old` string is byte-exact, including its audio tag. When you fix one instance of a defect, list every sibling line that carries the same defect."
