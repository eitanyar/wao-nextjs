# Noa: language QA on waocopy batch A, Ads Bot (2026-11-12)

Saved by Adam from Noa's hand-back. The replacement strings below are copied verbatim from her report. Severity: RED = breaks meaning or the pipeline; ORANGE = objective language, typography or TTS error; YELLOW = style note for Tamar; AI = AI tell; SALE = weakens the sale; CLAIM = route to Dror or Adam. Apply each fix to both voice and display unless it says "voice only".

## Adam's rulings
- **CLAIM items:** Dror's fact-check (docs/copy/reviews/dror-batch-a-factcheck-2026-11-12.md) wins on facts. Where Noa's and Dror's wording differ, take Dror's truth and Noa's Hebrew form.
- **Closed jobs:** "plus" vs "including". The spec says 15 verified leads in 60 days PLUS at least 2 closed jobs, so write "ולפחות שתי עבודות שנסגרו" everywhere.
- **Google's grammatical gender:** masculine site-wide (גוגל מכוון, חוסם). The FAQ becomes masculine too.
- **"Name the product first":** for the 30s ad, name it early in the turn (R02 option "עם בוט מודעות, האגודל שלך סלקטור." is Tamar's call). The joke opening may come first.
- **The automatic switch and rollback:** "designed to" (מתוכנן ל…) until phase 2 is live and verified (Dror). Noa's "בנוי ל…" fixes become "מתוכנן ל…".
- **The footage leads screen** will show the new "אמיתית / לא אמיתית" labels once the leads-mark-labels brief ships.

## Cross-file rules
- **Click vs tap:** a click on the ad = קליק; a tap on a page button = לחיצה.
- **Google is masculine everywhere.**

## 1. Pronunciation test (ads-bot-voice-pron-test)
- **#2:** `בְּגּוּגְל` → `בְּגוּגֶל`
- **#3/#4:** add a variant `גוגל אֶדְס` (low priority)
- **#14:** `תאר לעצמך 15 פניות אמיתיות בשבוע.` → `התנאי הוא כ־15 פניות אמיתיות ב־60 יום.`
- **#15:** `אני נותן לזה לפחות 60 ימים.` → `התנאי הוא בערך חמש עשרה פניות אמיתיות בשישים יום.`
- **#16:** `אני מחכה חודשיים עד שלושה חודשים.` → `בדרך כלל זה לוקח חודשיים עד שלושה.`
- **Add to the test:** לפניות; סָגוּר; מְכַוֵּן; שֶׁסָּגַרְתָּ; numbers as words (בערך חמש עשרה, בשישים יום, פחות מחמישים פעם, חמישה עשר שקל לקליק); חד פעמי; טאפ; סלקטור; האגודל; תיירים; דמו; מייחד; מתג; יומן; להוזיל; דולק; spoken gershayim quotes (״שירות מקצועי, מחיר הוגן״); tags [dry] vs [deadpan]; [excited] WAO mid-line vs on its own line.

## 2. Explainer A
- **RED:** `[excited]WAO` → `[excited] WAO` (all 4 places)
- **E1-01:** `שילמת על לחיצות, והטלפון שתק.` → `שילמת על קליקים, והטלפון שתק.`
- **E1-05:** `וכמה עולה שם לחיצה אחת על המודעה.` → `וכמה עולה קליק אחד על המודעה.`
- **E1-08:** `גם כשכן, הבוט משאיר את הפרסום כבוי עד שאתה רואה את התוכנית.` → `וגם כשהמספרים מסתדרים, הפרסום נשאר כבוי עד שראית את התוכנית.`
- **E2-05 (RED):** `ומיום ראשון יש רשימת חסימות:` → `ומהיום הראשון יש רשימת חסימות:`
- **E2-06:** `שאמרת לו` → `שאמרת לבוט`
- **E2-07 (SALE):** say in the same line that the list is therefore built deliberately, word by word.
- **E2-08 (CLAIM):** per Dror: `המודעות מופיעות רק בתוצאות חיפוש, לא כבאנרים באתרים.`
- **E3-07:** `גוגל יוצר מהכותרות צירופים, ומחליט בכל חיפוש מה להציג.` → `גוגל מערבב את הכותרות, ומחליט בכל חיפוש מה להציג.`
- **E4-02:** `לכל פרסום` is vague (Tamar)
- **E4-05:** `מחיר הלחיצה` → `מחיר הקליק`; option `יכולה להוזיל` → `מוזילה לא פעם`
- **E4-06:** `טופס, חיוג ווואטסאפ.` → `טופס, חיוג או וואטסאפ.`
- **E4-07 (RED):** `כל הפניות האמיתיות נוחתות` → `כל הפניות נוחתות`. Combine with Dror: not "all". Enquiries from the page.
- **E4-08:** `ואתה רואה מאיזו מודעה הגיע כל מי שלחץ.` → `ולכל פנייה רשום הקליק שהביא אותה.`
- **Tag placement (option):** split `בוט מודעות של [excited] WAO.` onto its own line.

## 3. Explainer B (E5 is 81 words, over the cap; E5-04, E5-05, E7-02 and E7-05 are over the punch limit)
- **E8-04:** voice `גוגל מְכַוֶּנֶת לפנייות אמיתיות בלבד.` → `גוגל מְכַוֵּן לפניות אמיתיות בלבד.`; display `גוגל מכוונת לפנייות` → `גוגל מכוון לפניות`
- **E7-05 (RED):** `הופך למילה שהקמפיין מחפש בכוונה.` → `הופך למילה שהקמפיין רודף אחריה בכוונה.`
- **E8-08:** use the designed-to frame (Adam's ruling) instead of `בנוי לחזור`
- **E5-04:** `הוא לא מבקש עוד תקציב כשפנייה אמיתית עולה יותר מהגבול שחושב משווי העבודה שלך.` → `כשפנייה אמיתית עולה יותר ממה שהעבודה שלך מצדיקה, הוא לא מבקש עוד תקציב.`
- **E7-02:** `הוא חוסם חיפוש שצבר חמש לחיצות, עלה מעל רף שחושב מהעסק שלך, ולא הביא כלום.` → `הוא חוסם חיפוש שקיבל לפחות חמישה קליקים, עבר את הרף שלך ולא הביא כלום.` Add Dror's conditions: with approval, and no real enquiry.
- **E7-03 (voice):** `פחות מ־50 פעם` → `פחות מחמישים פעם`
- **E5-06 and E7-07 (voice):** `חד־פעמי` → `חד פעמי`
- **E8-05 (voice):** `התנאי הוא כ־15 פניות אמיתיות ב־60 יום, כולל שתי עבודות שֶׁסָּגַרְתָּ.` → `התנאי הוא בערך חמש עשרה פניות אמיתיות בשישים יום, ולפחות שתי עבודות שֶׁסָּגַרְתָּ.`; display `כולל שתי עבודות שסגרת` → `ולפחות שתי עבודות שסגרת`
- **E8-06 (voice):** `חודשיים־שלושה` → `חודשיים עד שלושה`
- **Clicks:** E5-02 `15 ₪ ללחיצה על המודעה.` → `15 ₪ לקליק.` (then Adam's per-trade cap ruling: no number); E8-02 `15 ₪ ללחיצה.` → `15 ₪ לקליק.` (same); E6-05 `לחיצות לא נספרות.` → `קליקים לא נספרים.`; E6-06 `מחוברת ללחיצה שהביאה אותה.` → `מחוברת לקליק שהביא אותה.`; E8-03 `מחוברת ללחיצה.` → `מחוברת לקליק.`
- **E6-01:** `לא מנחש אילו פניות אמיתיות.` → `לא מנחש איזו פנייה אמיתית.`
- **E6-06 alt:** drop the beat if removed; otherwise `הסימונים שלך הם הבסיס לשלב הבא.`
- **E5-05 (punch):** direction `על הדף יושב מסנן קליקים מזויפים, והבוט בודק כל יום שהוא דולק.` (Dror: drop "every day" until the crontab is confirmed)
- **E8-07/E8-08 (AI):** two "אם" openings in a row

## 4. 30s / 15s / 6s
- **ad_30 R04:** `כל סימון אמיתי חוזר לגוגל.` → `כל פנייה שסימנת אמיתית חוזרת לגוגל.` (Dror: drop "every"); caption `סימון אמיתי חוזר לגוגל` → `הסימון חוזר לגוגל`
- **ad_15 R02:** voice `טאפ: אמיתי או זֶבֶל.` → `טאפ: אמיתית או זֶבֶל.`; display and caption `טאפ: אמיתי או זבל` → `טאפ: אמיתית או זבל`; direction `כל פנייה, טאפ אחד: אמיתית או זֶבֶל.`
- **ad_30 R03:** `כל פנייה נוחתת בטלפון` → `כל פנייה מהדף נוחתת בטלפון.`
- **R02 option:** `עם בוט מודעות, האגודל שלך סלקטור.`
- **R01 / ad_6:** תיירים is Eitan's ear call; fallback סקרנים. [dry] isn't proven on v4, so use [deadpan] unless the test proves [dry]. טאפ is Tamar's call.

## 5. FAQ (not voiced)
- **q12 q (RED):** `מה אני צריך לעשות בעצמך,` → `מה אני צריך לעשות בעצמי,`; SALE: give a time (one tap per enquiry, seconds)
- **q01:** `שלושה דברים. אנחנו בודקים` → `אנחנו בודקים`; `החשבון סופר פניות — לא קליקים.` → `החשבון סופר רק פניות שסימנת כאמיתיות, לא קליקים.`
- **q04:** `חדש בשמך` → `חדש על שמך`; proven version `אנחנו פותחים חשבון Google Ads חדש על שמך, ובונים אותו מאפס.` (HOLD the "you see every click" part)
- **q03:** `בחשבון שלך` → `בחשבון שנפתח על שמך`
- **q06:** `לפני שנפתח קמפיין חי` → `לפני שהקמפיין עולה לאוויר`; `או שהפנייה צפויה לעלות יותר ממה שעבודה שלך שווה` → `או שפנייה צפויה לעלות יותר ממה שהעבודה שלך מצדיקה`
- **q08:** `עד 15 כותרות, ארבעה תיאורים וכפתור חיוג. מתחתיה, לפי הפרטים שמסרת, מופיעים גם רשימת השירותים, קישורים והתמונות שלך.` → `עד 15 כותרות וארבעה תיאורים. מתחתיה, לפי הפרטים שמסרת, יכולים להופיע גם כפתור חיוג, רשימת השירותים, קישורים והתמונות שלך.`
- **q09:** `חיפושים שלקחו לפחות חמישה קליקים` → `חיפושים שקיבלו לפחות חמישה קליקים`; `הבוט חוסם לבד` → `באישור שלך, הבוט חוסם לבד`
- **q13:** `ולא מתקדם למצב פניות` → `ולא יכול לעבור למצב פניות`
- **q14:** `ושתי עבודות שנסגרו` → `ולפחות שתי עבודות שנסגרו`; `לא כל מקצוע ואזור מגיעים לזה בתקציב המינימלי, ואז אנחנו מראים לך איזה תקציב כן יגיע.` → `לא כל מקצוע מגיע לזה בתקציב הזה, ואז אנחנו מראים לך איזה תקציב כן יביא אותך לשם.`; `הקמפיין חוזר לבד למצב קליקים.` → designed-to frame
- **q15:** per Dror: the demo shows a sample business
- **q17:** `בגוגל Ads` → `ב־Google Ads`; date it: `נכון לנובמבר 2026,`
- **YELLOW:** תקציב המדיה → תקציב הפרסום; וקבוצה אחת (q07) means nothing to the owner; מתחת לתקרה → עד התקרה (q10); q11 leads with Google's invalid-click fact (Dror)

## Writing upgrades proposed (Adam to accept into writing-upgrades.md)
1. Use one Hebrew word per concept across a series (ad click = קליק, page-button tap = לחיצה).
2. In voiced lines, write numbers, ranges and prefixed numbers as words, with no maqaf; digits only in display.
3. Don't use a homograph verb in a voiced relative clause.
4. An ordinal day phrase carries the article (מהיום הראשון).
5. Every sentence about a not-yet-built stage carries the built-to/designed-to frame.
6. An audio tag is followed by a space.
7. A line that states a platform limitation also says what the product does about it.
8. In Q&A, the question is in the reader's first person and the answer in the second; check pronouns on both sides.
