# Revision round 2: ads-bot-real-30s-story (2026-11-12)

You wrote round 1: the full output is pasted below under "ROUND 1 OUTPUT". The original brief is docs/copy/briefs/ads-bot-real-30s-story-2026-11-12.md (its rules still bind, including the founder rule "less words, more punch").

Two reviews came back, both pasted below:
- **Dror's PPC fact-check.** It is binding on FACTS.
- **Noa's language QA.** It is binding on Hebrew correctness; her YELLOW/SALE items are your call.

Adam's rulings at the top of each review override everything else, in particular:
- CPC cap per trade: no "₪15" number.
- "Designed to" (מתוכנן ל…) for the automatic switch and the rollback.
- No "every enquiry" claims.
- No area talk.
- Google is masculine.
- An ad click = קליק; a tap on a page button = לחיצה.
- "ולפחות שתי עבודות שנסגרו".
- HOLD lines are cut from voiced cuts. In the FAQ, keep them only with the proven wording.

Apply ONLY to this file's items. Keep every passing line byte-for-byte. Where a review gives an exact replacement, use it unless you have a better line that keeps the same truth (then say why). Re-count words per episode/cut and keep within the cap.

Return the COMPLETE revised output in the same JSON shape as round 1, plus "changes": [{"id": "...", "why": "..."}].

## ROUND 1 OUTPUT
{
  "angle": "He paid Google for clicks and got tourists — sightseers who never meant to hire — and the deadpan laugh is that he got exactly what he bought; now his thumb is the bouncer working the door on real enquiries, and the campaign is built to chase what his thumb calls real. It fits him because he already spots time-wasters on the job, so the ad hands his thumb the door and lets the real footage and short silences carry the rest.",
  "story_in_one_line": "A tradesman who paid for clicks and got tourists lets his thumb play bouncer on the enquiries list, and the campaign is built to move from clicks to the real ones he marks.",
  "ad_30": [
    {
      "beat": "R01",
      "voice": "שילמת על קליקים בגוגל. [dry] קיבלת תיירים.",
      "display": "שילמת על קליקים בגוגל. קיבלת תיירים.",
      "caption": "קיבלת תיירים",
      "shot": "B1",
      "tag_why": "Deadpan on the punchline lands the tautology joke: he got exactly what he paid for, nothing more.",
      "removable": false,
      "alt": null
    },
    {
      "beat": "R02",
      "voice": "עכשיו האגודל שלך סלקטור.",
      "display": "עכשיו האגודל שלך סלקטור.",
      "caption": "האגודל שלך סלקטור",
      "shot": "B2",
      "tag_why": "No tag; the bouncer metaphor carries the turn from pain to control on its own.",
      "removable": false,
      "alt": null
    },
    {
      "beat": "R03",
      "voice": "כל פנייה נוחתת בטלפון. טאפ: אמיתית או זֶבֶל.",
      "display": "כל פנייה נוחתת בטלפון. טאפ: אמיתית או זבל.",
      "caption": "טאפ: אמיתית או זבל",
      "shot": "B3",
      "tag_why": "No tag; a plain action beat, said flat so the tap is the hero.",
      "removable": false,
      "alt": null
    },
    {
      "beat": "R04",
      "voice": "כל סימון אמיתי חוזר לגוגל.",
      "display": "כל סימון אמיתי חוזר לגוגל.",
      "caption": "סימון אמיתי חוזר לגוגל",
      "shot": "B4",
      "tag_why": "No tag; a mechanism fact stated with quiet confidence, not hype.",
      "removable": true,
      "alt": "הסימונים שלך הם חומר הגלם."
    },
    {
      "beat": "R05",
      "voice": "הקמפיין בנוי לעבור מקליקים לפניות אמיתיות.",
      "display": "הקמפיין בנוי לעבור מקליקים לפניות אמיתיות.",
      "caption": "מקליקים לפניות אמיתיות",
      "shot": "B9",
      "tag_why": "No tag; the approved built-to claim, said like a tradesman proud of the work.",
      "removable": false,
      "alt": null
    },
    {
      "beat": "R06",
      "voice": "דמו חינם, על עסק לדוגמה.",
      "display": "דמו חינם, על עסק לדוגמה.",
      "caption": "דמו חינם",
      "shot": "B8",
      "tag_why": "No tag; a low-friction offer, said easy over coffee.",
      "removable": false,
      "alt": null
    },
    {
      "beat": "R07",
      "voice": "[excited] WAO. בוט מודעות: 249 ₪ + מע״מ לחודש.",
      "display": "WAO. בוט מודעות: 249 ₪ + מע״מ לחודש.",
      "caption": "WAO. בוט מודעות",
      "shot": "E1",
      "tag_why": "Founder rule: the brand is said upbeat, [excited] directly before WAO.",
      "removable": false,
      "alt": null
    }
  ],
  "ad_15": [
    {
      "beat": "R01",
      "voice": "שילמת על קליקים בגוגל. [dry] קיבלת תיירים.",
      "display": "שילמת על קליקים בגוגל. קיבלת תיירים.",
      "caption": "קיבלת תיירים",
      "shot": "B1",
      "tag_why": "Deadpan punchline, same joke as the 30 compressed to its setup and pay-off.",
      "removable": false,
      "alt": null
    },
    {
      "beat": "R02",
      "voice": "טאפ: אמיתי או זֶבֶל.",
      "display": "טאפ: אמיתי או זבל.",
      "caption": "טאפ: אמיתי או זבל",
      "shot": "B4",
      "tag_why": "No tag; the one-tap action is the whole solution beat at this length.",
      "removable": false,
      "alt": null
    },
    {
      "beat": "R03",
      "voice": "[excited] WAO. בוט מודעות: 249 ₪ + מע״מ לחודש.",
      "display": "WAO. בוט מודעות: 249 ₪ + מע״מ לחודש.",
      "caption": "WAO. בוט מודעות",
      "shot": "E1",
      "tag_why": "Founder rule: brand upbeat, [excited] directly before WAO; price only in this last line.",
      "removable": false,
      "alt": null
    }
  ],
  "ad_6": [
    {
      "beat": "R01",
      "voice": "קליקים? [dry] תיירים.",
      "display": "קליקים? תיירים.",
      "caption": "קליקים? תיירים",
      "shot": "B9",
      "tag_why": "Deadpan lands the two-word joke; the card carries the clicks-to-tourists idea visually.",
      "removable": false,
      "alt": null
    },
    {
      "beat": "R02",
      "voice": "[excited] WAO. בוט מודעות.",
      "display": "WAO. בוט מודעות: 249 ₪ + מע״מ לחודש.",
      "caption": "WAO. בוט מודעות",
      "shot": "E1",
      "tag_why": "Founder rule: brand upbeat; price is shown on the end screen, not spoken at this length.",
      "removable": false,
      "alt": null
    }
  ],
  "new_shots": [],
  "flags": [
    "Wanted to promise the phone fills with real jobs and that Google already learns from his marks today; the facts only support 'built to move' once enough real marks accumulate, so every line stays at 'בנוי לעבור' and no result is promised.",
    "Wanted to use the blocked-searches mechanism as a concrete savings proof; the fact supports blocking, but any savings or result framing is forbidden and the cut word budget forced the beat out, so it is omitted rather than weakened."
  ]
}

## DROR'S FACT-CHECK
# Dror: PPC fact-check of waocopy batch A (2026-11-12)

Saved by Adam from Dror's hand-back (read-only, Google Help pages fetched 2026-11-12). 81 lines checked across explainer A (32), explainer B (29), the 30s/15s/6s story (12) and the FAQ (18 pairs).

## Adam's rulings
- **CPC cap:** per-vertical (fix 4). Copy says "a ceiling on the price of one click, set for your trade", with no number. This affects E5-02, E8-02 and q10.
- **q03 billing:** the owner pays the ad budget directly to Google from his own Google Ads account (the live /google-ads FAQ says so). "Stays yours" holds.
- **The automatic switch and rollback:** anything published before phase 2 is live and Roni-verified uses "designed to" (מתוכנן), not present tense. "Built to" is OK after phase 2 ships.
- **HOLD lines** (E5-05, E5-07, E7-07, q04 "you see every click", q16 switch/log, R04 original, E6-06 voiced) are cut from voiced cuts until their gate passes.

## FIX rows for Tamar (English wording intent; Tamar writes the Hebrew)
- **E2-04:** phrase match covers searches with the MEANING of the service. Never say the words must literally appear. Intent: "ads show only for searches that mean your service, not anything loosely related."
- **E2-08:** Search Partners is on today. Intent: "your ad appears as a text ad in search results, no banners on websites." No "only Google".
- **E3-06:** headlines aren't pinned. Intent: "your main service is written into the headlines." Don't name the position.
- **E4-07:** not "all" enquiries; calls from the ad's call button skip the list. Intent: "enquiries from your page (form, call tap, WhatsApp tap) land in one list on your phone."
- **E4-08:** intent: "each enquiry in the list is tied to the ad click that brought it."
- **E6-05:** intent: "in the ad account the only thing counted as a result is an enquiry you marked real. A click is not a result."
- **E6-06 / E8-03 / q01 / R04:** drop "every". Intent: "a real enquiry you mark goes back to Google, tied to the click that brought it." Removable behind GA1.
- **E7-01:** intent: "reads the searches Google reports behind each click."
- **E7-02 / q09:** conditional, with consent. Intent: "with your one-time approval, the bot can block a search that took at least five clicks, cost above the bar set from your business, and brought no enquiry you marked real."
- **E7-04:** intent: "it blocks only that search wording, never a whole topic or a single loose word."
- **E8-08 / q14:** intent: "designed to go back to click mode by itself if enquiry mode does worse." q14: drop "area"; say "not every trade gets there at the minimum budget".
- **R03:** intent: "enquiries land in one list on your phone. Tap: real or junk." No "every".
- **q08:** intent: "…and below it, when Google chooses to show them: a call button, your services list, links and your photos."
- **q11:** lead with Google's own fact: invalid clicks are filtered out of metrics and billing (Help 42995). Then "we also run our own filter on the page". Drop "every day".
- **q15:** intent: "in the free demo you see a complete plan on a sample business before paying."
- **q05 addition:** "if your old account was suspended by Google, tell us first; opening a new one isn't allowed then" (Circumventing systems policy 15938075).
- **q17:** date the credit offer ("as of [month]"); "the spend must happen within a set window after you start".
- **Optional soft fixes:** E1-04/E1-05 "roughly" (estimates); q12 "within the limits you approved".

## Screen and recording notes
- E2-05: don't record the real negatives list until fix 3 ships, since the live list still contains מחיר. Use a demo list.
- E3-08 / q08: expect no image assets in a new account's first weeks.

## Paid-media policy (if any asset runs as an ad)
- Blocked: any asset showing the price, until checkout exists and /google-ads shows exactly ₪249 + VAT.
- R05 / any "built to move" claim stays out of paid media until phase 2 is live, and the landing page discloses the condition.

Sources: Google Help 7478529, 2453972, 6268626, 6167118, 1722122, 7684791, 9921843, 42995; ad policy 6020955, 15938075; 2393021; API MaximizeConversions v26; ppc.land search-terms 2026-05; AI Max 2026-09-01 (PPC News Feed, Common Thread); image asset eligibility 10347108.

## NOA'S LANGUAGE QA
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
