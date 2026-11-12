# Revision round 2: ads-bot-nurture-sequence (2026-11-12)

You wrote round 1; it's pasted below under "ROUND 1 OUTPUT". The original brief is docs/copy/briefs/ads-bot-nurture-sequence-2026-11-12.md, and its rules still bind (the "less words, more punch" founder rule for anything voiced).

Reviews are pasted below:
- Dror's fact-check: binding on FACTS.
- Noa's language QA: binding on Hebrew correctness; her YELLOW, AI and SALE items are your call.
- Yonatan's SEO review: binding on anchors, titles and structure.
- For the nurture sequence: Amit's compliance review (binding).

Adam's rulings at the top of each review override everything else. Apply only this file's items, and keep passing lines byte-for-byte. Where a review gives an exact replacement, use it unless you have a better line with the same truth (then say why). Where Yonatan asks for new elements (answer block, "בקצרה" box, Google's official terms, links), write them.

Return the COMPLETE revised output in the same JSON shape as round 1 (plus any new fields Yonatan's conditions need), plus "changes": [{"id": "...", "why": "..."}].

## ROUND 1 OUTPUT
{
  "angle": "The arc follows his shekel from a stranger's click to an enquiry he marked real: blocked words, demand check, quality pricing, budget ceiling, then what actually counts as a result. He is problem-aware and funnel-allergic, so each text teaches one waste-or-protection lesson he can use without buying, and the last one walks him back to the demo.",
  "opt_out": "לא רוצה עוד הודעות? תכתוב ״די״ ונפסיק.",
  "messages": [
    {
      "n": 1,
      "day": 0,
      "fact_used": "From day one, 10–15 words are blocked (job seekers, free, courses, how-to, second-hand, what he does not do); Google does not block look-alike words by itself.",
      "text": "קליק של מחפש עבודה עולה לך כמו קליק של לקוח אמיתי. ״קורס תיקון מזגנים״, ״מזגן יד שנייה״, ״איך לתקן לבד״ — כל אלה יכולים ללחוץ על המודעה שלך, ואתה משלם. גוגל לא חוסמת לבד את המילים הדומות האלה. בוט מודעות חוסם מהיום הראשון 10–15 מילים: דרושים, חינם, קורסים, יד שנייה, ומה שאתה לא עושה. הדמו פתוח. תציץ שוב: {{demo_link}}",
      "link": "{{demo_link}}"
    },
    {
      "n": 2,
      "day": 3,
      "fact_used": "Before a live campaign is created, real search-volume and click-price data for his service is checked; if the numbers cannot work for his job value, it is not created.",
      "text": "יש שירותים שאנשים כמעט לא מחפשים, וקליק בהם עולה יותר ממה שהעבודה שווה. את זה אתה יכול לבדוק גם לבד, לפני שאתה מוציא שקל. בוט מודעות בודק לפני כל קמפיין חי כמה אנשים באמת מחפשים את השירות שלך ומה עולה קליק. אם המספרים לא מסתדרים עם שווי העבודה אצלך, אנחנו לא מקימים קמפיין. בלי הימורים. שאלה על השירות שלך? תכתוב כאן, תקבל תשובה בכתב.",
      "link": null
    },
    {
      "n": 3,
      "day": 6,
      "fact_used": "The landing page must carry the exact service name searched; Google rates ad and page quality and says higher quality ads can often lead to lower click prices.",
      "text": "גוגל עצמה אומרת שמודעה ודף איכותיים יותר יכולים להוזיל את הקליק. מה מרכיב את האיכות? בין השאר, הדף שהמודעה מובילה אליו. הוא חייב לשאת את שם השירות המדויק שהלקוח חיפש, לא כותרת כללית. בוט מודעות כותב את הדף סביב הביטויים האמיתיים שאנשים מקלידים. אותה שפה, מודעה ודף. גם בלי בוט מודעות, שווה לבדוק את זה בדף שלך. איך זה עובד אצלנו, צעד אחרי צעד: {{how_it_works_link}}",
      "link": "{{how_it_works_link}}"
    },
    {
      "n": 4,
      "day": 10,
      "fact_used": "At the start there is a ₪15 ceiling on the price of a click, and the bot never raises his daily budget above what he set.",
      "text": "התקציב היומי שלך הוא תקרה, לא הצעה. בוט מודעות אף פעם לא מעלה אותו מעל מה שאתה קבעת. בתחילת הדרך, אף קליק לא עולה יותר מ־15 ₪. גם אם תנהל לבד, תקרת מחיר קליק ותקציב יומי קבוע הם הבלמים שלך. הכסף שלך, הקצב שלך. משהו לא ברור? תכתוב כאן, תקבל תשובה בכתב.",
      "link": null
    },
    {
      "n": 5,
      "day": 14,
      "fact_used": "Every enquiry lands in one list; one tap marks it real or junk; each one marked real goes back to Google from day one and is the only thing the account counts as a result.",
      "text": "קליקים הם לא תוצאה. פניות אמיתיות הן תוצאה. כל פנייה נוחתת ברשימה אחת, ולחיצה אחת מסמנת אותה כאמיתית או כזבל. כל פנייה שסימנת כאמיתית חוזרת לגוגל מהיום הראשון, וזה הדבר היחיד שהחשבון סופר כתוצאה. בלי ניחושים. אתה סופר פניות שאישרת בעצמך. גם בלי בוט מודעות, שווה לסמן כל פנייה שנכנסה ולספור רק את האמיתיות. הדמו של WAO עדיין פתוח עם עסק לדוגמה, תציץ שוב: {{demo_link}}",
      "link": "{{demo_link}}"
    }
  ],
  "flags": [
    "Skipped the click-mode to enquiry-mode auto-switch fact: approved design, not live, and its conditions would break the 70-word ceiling and the no-implied-switch rule.",
    "Skipped the Google ₪1,500 credit and the ₪249 fee: neither is a waste-or-protection lesson, and the credit's eligibility caveats would read as funnel; the how-it-works page should carry both.",
    "Message 5 states the day-one feedback to Google but stops before saying Google optimizes on his marks, to respect the stage-one bidding limit.",
    "Message 2 tells him to check demand himself without naming a tool; if the step-by-step page has no DIY demand check, add one there.",
    "Word counts (52–67) exclude the appended opt_out line; no demo contents are asserted, links only invite a second look.",
    "Handoffs: Noa proofs the Hebrew, Dror checks the facts, Amit clears consent wording, opt-out and WhatsApp template category before anything is sent."
  ]
}

## DROR
# Dror: PPC fact-check of waocopy batch B (2026-11-12)

Saved by Adam from Dror's hand-back. Google Help was re-read on 2026-11-12. Batch A rulings carry over (docs/copy/reviews/dror-batch-a-factcheck-2026-11-12.md).

## Adam's rulings (new)
- **Situation shorts, first person:** the pain beats stay first person; the SOLUTION beats move to the product as subject ("בבוט מודעות…"). In an ad, "I mark, my list" reads as a client testimonial, and we have none. That avoids needing a "dramatisation" label. Amit confirms whether any label is still needed.
- **"Your daily budget is a ceiling" is FALSE.** Google may spend up to 2× the average daily budget on a given day; the monthly cap is 30.4×. Intent: "your daily budget is an average Google works to over the month; the bot never raises it above what you set."
- **"Usually two to three months" → "we estimate two to three months for a typical trade at the minimum budget"**, because nobody has made the switch yet.
- **The "חינם" negative (product):** move from the bare word to free-intent PHRASES (free download, free course…), so "free quote" buyers aren't blocked. The phrase list comes from Tamar and Dror, then the engineer changes prompts.ts. Queued after the current Ads Bot fixes.
- **HOLD:** price in paid shorts; the stop switch / activity log; "a failed send is saved and retried" (until Roni verifies step 0's persisted outcomes on deploy).

## FIX rows (English intent; Tamar writes the Hebrew)
**Situation shorts**
- S1-04: use the alt line ("גם מה שאני לא עושה — חסום מראש"), which passes.
- S2-04: no "every". Intent: "the headlines are reasons to choose me."
- S3-02: "today the enquiries from my page sit in one list on my phone" (then the product-as-subject ruling).
- Price lines S1-05 / S2-05 / S3-05: HOLD for paid.

**How-it-works page**
- Meta 2 and 6 ¶1: no "15 ₪". Intent: "a ceiling on one click's price, set for your trade."
- 1 ¶1: "Google's estimates" of searches and click cost.
- 1 ¶3: "the first month is a learning month, not a profit month", not "roughly breaks even".
- 2 ¶2: phrase match means the MEANING of the service (as batch A E2-04).
- 3 ¶3: "a text ad in search results, no banners on websites" (Search Partners is on).
- 4 ¶3 (optional): new accounts often aren't eligible for image assets in the first weeks.
- 5 ¶2: "each form, call tap or WhatsApp tap on the page is recorded with the click that brought it."
- 5 ¶4: "steps 2–5 are built around these three parts."
- 6 ¶1: lead with Google's invalid-click filtering (42995), then "our page runs its own filter"; no "daily".
- 6 ¶2: imply no daily cap (2× rule).
- 7 ¶1: "the enquiries from your page sit in one list."
- 7 ¶2: no "every"; tied to its click; removable behind GA1.
- 7 ¶3: with one-time approval; ≥5 clicks; above the bar; no real enquiry; that search wording only; drop "never on too little data".
- 7 ¶4: promotion is conditional (≥2 real enquiries within the limit, after the first two weeks).
- 8 (h2, ¶1, ¶2, ¶3, you_see): "designed to" (מתוכנן); "we estimate two to three months"; no area; never attribute the 15 to Google.

**Nurture**
- Msg 1: "Google won't block these searches for you. A blocked word also doesn't cover its look-alikes (plural, singular, synonyms), so the list is built on purpose."
- Msg 2: "Google's estimates."
- Msg 3: "a good page opens on the exact service; in our build the page headline carries your service's name"; "written around your service's search phrases."
- Msg 4: the daily-budget fix (above); no "15 ₪".
- Msg 5: "enquiries from your page land in one list"; no "every"; tied to its click; removable behind GA1.
- opt_out: Amit.

**Quality Score article**
- Meta 1: "the reason isn't ONLY who pays more."
- S1 ¶3: "a lower BID can still show above a higher one when the ad and page are better, because the bid is only one of the factors." Say bid, not pay.
- S3 "one of six": the bid still counts.
- S3 two-plumbers close: "same search, the price per click can differ" (an illustration).
- S5 b1: "some of the headlines repeat the words people type" (no fixed main headline). Add: he must add the negative variants himself.
- FAQ 3: "—" means not enough searches yet to get a score.
- FAQ 5: a blocked word stops the ad on every search containing it, including good ones (Google warns about over-blocking).
- FAQ 6: one campaign can hold several services, each in its own keyword group with its own ad and page; what hurts is mixing them in one group.
- Re-read every Google statement on the day of publishing (Dror).

Sources: Google Help 6167118, 1722122, 9921843, 2453972, 7684791, 2375423 (+ batch A list), all read 2026-11-12.

## NOA
# Noa: language QA on waocopy batch B (2026-11-12)

Saved by Adam from Noa's hand-back. Replacement strings are copied verbatim. The batch A rulings apply throughout (docs/copy/reviews/noa-batch-a-2026-11-12.md), and Dror's facts in docs/copy/reviews/dror-batch-b-factcheck-2026-11-12.md win.

## Adam's rulings
- **Situation shorts:** option A. The pain beats stay first person; the solution beats switch to second person ("אתה מסמן", "החשבון על שמך") or the product as subject. No client-testimonial framing.
- **Closed jobs:** batch A's ruling overrides the how-it-works brief. Write "ולפחות שתי עבודות שנסגרו" as the second condition, never as the only trigger.
- **The WhatsApp nurture sequence is PARKED** (Amit, docs/copy/reviews/amit-nurture-compliance-2026-11-12.md). Still fix its copy so it's ready: add the "פרסומת" opening and the sender footer per Amit.
- **Product name** is "בוט מודעות" everywhere, never "בוט הפרסום" or "Ads Bot" in Hebrew copy.
- **Call button:** use one term site-wide: "כפתור חיוג".

## 1. Situation shorts
- **S1-03:** `אני מסמן זבל — זה יורד מהרשימה.` is false (the label only flips). True version, in second person per option A: voice and display "אתה מסמן לא אמיתית, והיא לא נספרת." (Noa's first-person base: `אני מסמן לא אמיתית, והיא לא נספרת.`). Caption: `זבל יורד מהרשימה` → `לא אמיתית? לא נספרת`
- **Closing line, voice only:** `[excited] WAO. בוט מודעות: 249 ₪ + מע״מ לחודש.` → `[excited] WAO. בוט מודעות, מאתיים ארבעים ותשעה שקל פלוס מע״מ לחודש.` The WAO tag waits on Eitan's tone test. Price lines are HOLD for paid media.
- **S1-04 alt:** `גם מה שאני לא עושה — חסום מראש.` → `גם מה שאני לא עושה, חָסוּם מראש.`; display `גם מה שאני לא עושה, חסום מראש`
- **S2-04:** `כל כותרת — סיבה אחרת לבחור בי.` → `כל כותרת במודעה היא סיבה אחרת לבחור בי.` (Dror: drop "כל"; Tamar to reconcile)
- **S2-01:** `ראיתי מחיר בעיר. סגרתי את הטלפון.` → `ראיתי מחיר שאין לי איך להתחרות בו. הטלפון חזר לכיס.`
- **S2-03:** `הבוט שואל על אחריות, רישיון, ותק.` → `הבוט שואל אותי על אחריות, רישיון, וּכמה שנים אני בתחום.` Option A: use אותך / אתה.
- **S3-02:** `היום כל פנייה ברשימה בטלפון שלי.` → `עכשיו הפניות מהדף יושבות ברשימה אחת בטלפון שלי.` Caption: `כל פנייה ברשימה` → `הכול ברשימה אחת`
- **S3-03:** `בחשבון, רק מה שאני מסמן אמיתי נחשב תוצאה.` → `רק פנייה שסימנתי כאמיתית נספרת בחשבון כתוצאה.` (Option A: שסימנת)
- **S1-04 claim:** direction `וחיפוש ששורף כסף ולא מביא כלום? הבוט חוסם אותו, באישור שלי.` Or use the alt.
- **S1-02:** direction `עכשיו? דרושים, חינם וקורס חסומים מראש.` Note: per the product ruling, "חינם" moves to free-intent phrases, so don't feature "חינם" as a blocked word.
- **Pronunciation additions:** מע״מ; מאתיים ארבעים ותשעה שקל; חָסוּם; וּכמה; שֶׁסִּימַּנְתִּי; כַּאֲמִיתִית; נִסְפֶּרֶת; הַדּוּחַ; מְחַפֵּשׂ עבודה; לא אמיתית; avoid וותק in voice; הטלפון חזר לכיס.

## 2. How-it-works page
- **Product name** (Yonatan has the final say): H1 1 `איך בוט הפרסום עובד:` → `איך בוט מודעות עובד:`; Title 1 `איך בוט הפרסום עובד —` → `איך בוט מודעות עובד —`; Meta 1 `ככה בוט הפרסום עובד.` → `ככה בוט מודעות עובד.`
- **Meta 2:** `נשרפת כבר על קליקים? הנה התוכנית המלאה: בדיקת ביקוש לפני הפרסום, תקרה של 15 ₪ לקליק, וסינון זבל בלחיצה. כל צעד מוסבר.` → `כבר נכווית מקליקים? הנה התוכנית המלאה: בדיקת ביקוש לפני הפרסום, תקרה על מחיר הקליק, וסימון פניות בלחיצה אחת. כל צעד מוסבר.`
- **Title 2 (YELLOW):** `איך כל שקל מקבל גבול` → direction `איך שומרים על כל שקל`
- **Intro:** `והחשבון סופר רק פניות אמיתיות — לא קליקים.` → `והחשבון סופר רק פניות שסימנת כאמיתיות, לא קליקים.`
- **Step 1:**
  - `הוא הדבר הכי יקר שתקנה.` → `הוא הדבר הכי יקר שתשכור.`
  - `פנייה יכולה לעלות עד 30% משווי העבודה אצלך, כפול אחוז הסגירה שלך — והתקרה הזאת לא יורדת מתחת ל־45 ₪.` → `התקרה לפנייה היא 30% משווי העבודה אצלך, כפול אחוז הסגירה שלך, ולא פחות מ־45 ₪.`
  - The first-month line: Dror's version wins ("a learning month, not a profit month").
  - `והבוט יוצר את הקמפיין מושהה.` → `הקמפיין נוצר כבוי, ושום שקל לא זז עד שאתה מחליט.` (replaces both sentences)
- **Step 2:**
  - `המודעה יוצאת על חיפושים שמכילים את השירות עצמו — לא על כל חיפוש שנראה דומה.` → `המודעה יוצאת על חיפושים שהמשמעות שלהם כוללת את השירות, לא על כל חיפוש שקשור אליו מרחוק.`
  - Cut `מכאן מתחילים לבנות את השאר.`
  - Analogy direction: `…אתה מדלג. שלט שמדבר בדיוק על הבעיה שלך, ואתה מתקשר.`
  - `קבוצה אחת` means nothing to the owner.
- **Step 3:**
  - `וכאן חשוב לדייק, כי ככה עובד הכלל של גוגל: מילה חסומה` → `לפי הכלל של גוגל, מילה חסומה`
  - `והמודעות רצות בחיפוש של גוגל בלבד — בלי באנרים.` → `המודעות מופיעות רק בתוצאות חיפוש, לא כבאנרים באתרים.`
- **Step 4:**
  - `גוגל מרכיבה מהם צירופים ובודקת אותם זה מול זה.` → `גוגל מערבב אותם ובודק את הצירופים זה מול זה.`
  - `גוגל בוחרת מה להציג בכל חיפוש.` → `גוגל בוחר מה להציג בכל חיפוש.`
- **Step 5:**
  - `עמוד שלא תואם למודעה` → `עמוד שלא מתאים למודעה`
  - `העמוד רושם כל פנייה יחד עם הקליק שהביא אותה, כדי שתדע מאיפה היא הגיעה.` → `פנייה שנכנסת דרך העמוד נרשמת יחד עם הקליק שהביא אותה, כדי שתדע מאיפה היא הגיעה.`
  - `גוגל מתמצתת את זה בציון איכות מ־1 עד 10 לכל מילת מפתח: צפי הקלקה,` → `גוגל מתמצת את זה בציון איכות מ־1 עד 10 לכל מילת מפתח: שיעור הקליקים הצפוי,`
  - `ושלושת המרכיבים שלו הם בדיוק שלבים 2–5 כאן, בנויים בכוונה, אחד אחד.` → `ושלושת המרכיבים שלו מטופלים כאן בכוונה, בשלבים 2 עד 5.`
- **Step 6:**
  - `בשלב הראשון הקמפיין קונה קליקים, עם תקרה של 15 ₪ לקליק.` → `בשלב הראשון הקמפיין קונה קליקים, עם תקרה על המחיר של כל קליק.`
  - `על העמוד יושב מסנן קליקים מזויפים, והוא עובר בדיקה מדי יום.` → `על העמוד יושב מסנן קליקים מזויפים.` Dror adds Google's invalid-click fact first.
- **Step 7:**
  - **RED:** `ואף פעם בחסימה גורפת.` → `ואף פעם לא בחסימה גורפת.`
  - `כל הפניות יושבות ברשימה אחת.` → `הפניות מהעמוד יושבות ברשימה אחת.`
  - `ליד כל פנייה — לחיצה אחת: אמיתית או זבל.` → `ליד כל פנייה, לחיצה אחת: אמיתית או לא.`
  - `כל פנייה שסימנת כאמיתית, הבוט שולח בחזרה לגוגל — מהיום הראשון, קשורה לקליק שהביא אותה. זה הדבר היחיד שהחשבון סופר כתוצאה.` → `הפניות שסימנת כאמיתיות חוזרות לגוגל מהיום הראשון, כל אחת עם הקליק שהביא אותה. רק הן נספרות בחשבון כתוצאה.`
  - `חיפוש שצבר לפחות חמישה קליקים, עלה מעל הרף שנקבע ולא הביא כלום — הבוט חוסם אותו.` → `חיפוש שקיבל לפחות חמישה קליקים, עבר את הרף שלך ולא הביא אף פנייה אמיתית, הבוט חוסם אותו באישור שלך.`
- **Step 8:**
  - H2 `בנוי לעבור מקליקים לפניות — ורק כשהנתונים מרשים` → `מתוכנן לעבור מקליקים לפניות, רק כשהנתונים מאפשרים`
  - `הבוט בנוי להעביר את הקמפיין` → `הבוט מתוכנן להעביר את הקמפיין`
  - `לא כל מקצוע ואזור מגיעים לזה בתקציב המינימום — ואז הקמפיין נשאר במצב קליקים, ואתה רואה איזה תקציב היה פותח את המעבר.` → `לא כל מקצוע מגיע לזה בתקציב הזה. אז הקמפיין נשאר במצב קליקים, ואתה רואה איזה תקציב כן יפתח את המעבר.`
  - `ואם מצב הפניות מציג ביצועים פחות טובים — הקמפיין חוזר לבד למצב קליקים.` → `ואם מצב הפניות עובד פחות טוב, הקמפיין מתוכנן לחזור לבד למצב קליקים.`
  - `חודשיים־שלושה` → `חודשיים עד שלושה`
  - Dror: "we estimate two to three months".
- **Closing:**
  - `במילים אחרות — רוב הכסף` → `רוב הכסף`
  - H2 `לפני שאתה מתחייב` clashes with `בלי התחייבות` (YELLOW)
  - Call button term: `כפתור חיוג`

## 3. Nurture sequence (PARKED; fix the copy only)
- **M1:**
  - `״קורס תיקון מזגנים״, ״מזגן יד שנייה״, ״איך לתקן לבד״ — כל אלה יכולים ללחוץ על המודעה שלך, ואתה משלם.` → `מי שמחפש ״קורס תיקון מזגנים״, ״מזגן יד שנייה״ או ״איך לתקן לבד״ יכול להקליק על המודעה שלך, ואתה משלם.`
  - `גוגל לא חוסמת לבד את המילים הדומות האלה.` → `גוגל לא יחסום אותם בשבילך.` Dror adds the look-alikes point.
  - The examples are AC-trade only (YELLOW).
- **M2:**
  - `וקליק בהם עולה יותר ממה שהעבודה שווה.` → `ופנייה דרכם עולה יותר ממה שהעבודה מצדיקה.`
  - Name the DIY tool (SALE; Dror confirms).
  - Cut `בלי הימורים.`
- **M3:**
  - `גוגל עצמה אומרת` → `גוגל עצמו אומר`
  - `הוא חייב לשאת את שם השירות המדויק שהלקוח חיפש, לא כותרת כללית.` → `כדאי שהכותרת שלו תהיה בדיוק השירות שהלקוח חיפש, לא כותרת כללית.`
  - `אותה שפה, מודעה ודף.` → `אותן מילים במודעה ובדף.`
- **M4:**
  - Cut `התקציב היומי שלך הוא תקרה, לא הצעה.` (false)
  - `בתחילת הדרך, אף קליק לא עולה יותר מ־15 ₪.` → `בתחילת הדרך יש תקרה על המחיר של כל קליק.`
  - Cut `הכסף שלך, הקצב שלך.`
  - `מעל מה שאתה קבעת` → `מעל מה שקבעת`
- **M5:**
  - `כל פנייה נוחתת ברשימה אחת, ולחיצה אחת מסמנת אותה כאמיתית או כזבל. כל פנייה שסימנת כאמיתית חוזרת לגוגל מהיום הראשון, וזה הדבר היחיד שהחשבון סופר כתוצאה.` → `הפניות מהדף נוחתות ברשימה אחת, ובלחיצה אחת אתה מסמן: אמיתית או לא. פנייה שסימנת כאמיתית חוזרת לגוגל מהיום הראשון, ורק היא נספרת בחשבון כתוצאה.`
  - Cut `בלי ניחושים.`
  - `הדמו של WAO עדיין פתוח עם עסק לדוגמה, תציץ שוב:` → `הדמו של WAO על העסק לדוגמה עדיין פתוח. תציץ שוב:`
- **Structure (AI):** M3–M5 all close the same way; vary the closing move.
- **Amit's additions:** the "פרסומת" opening, the sender footer and the opt-out line.

## 4. Quality Score article
- **Google is masculine:**
  - `כך גוגל מחליטה` → `כך גוגל מחליט`
  - `מה שגוגל בודקת` → `מה שגוגל בודק`
  - `גוגל לא מוכרת את המקום הראשון` → `גוגל לא מוכר את המקום הראשון`
  - `בכל חיפוש היא עורכת מכרז` → `בכל חיפוש הוא עורך מכרז`
  - `בכל חיפוש היא בוחנת` → `בכל חיפוש הוא בוחן`
  - `ככה בדיוק גוגל מגדירה` → `ככה בדיוק גוגל מגדיר`
  - `עד כמה גוגל מעריכה` → `עד כמה גוגל מעריך`
  - `שלפיו גוגל מחליטה` → `שלפיו גוגל מחליט`
  - `גוגל מרכיבה מהם צירופים שונים, מציגה אותם בחיפושים, ולומדת` → `גוגל מרכיב מהם צירופים שונים, מציג אותם בחיפושים, ולומד`
  - `גוגל שוקלת גם` → `גוגל שוקל גם`
- **Section 2:** `עד כמה הדף שאחרי הקליק נותן לו את מה שחיפש.` → `עד כמה הדף שאחרי הקליק נותן למחפש את מה שחיפש.`; YELLOW: `הוצגו על אותו חיפוש` → `הוצגו באותו חיפוש`
- **Section 3:** `שים לב איפה הצעת המחיר ברשימה: גורם אחד מתוך שישה.` → `שים לב: הצעת המחיר היא גורם אחד מתוך שישה.`; `כמה המודעה שלו ראויה לו.` → `כמה המודעה שלו מתאימה למי שחיפש.`
- **Section 4:** `ועד 4 תיאורים בני 90 תווים.` → `ועד 4 תיאורים, עד 90 תווים כל אחד.`; `אבל זה לא ציון שמשלם פחות.` → `אבל הוא לא נכנס למכרז.`
- **Section 5:**
  - `אז אם יש לך פרטים שמוכרים — אזור שירות, שעות פעילות, ותק — תן להם מקום.` → `אז אם יש לך פרטים שעוזרים לך למכור, כמו אחריות, שעות פעילות או ותק, תן להם מקום.`
  - YELLOW: `חסום את ״קנייה״, ״לקנות״ ו״מבצע״.`
  - YELLOW: the count promises three items but four bullets follow; add a bridge.
- **FAQ:** a1 `בלי לזוז במקום` → `בלי לזוז מהמקום`; a3 `כל מילה מקבלת ציון מ-1 עד 10 משלה` → `כל מילה מקבלת ציון משלה, מ-1 עד 10`; q6 should align campaign vs group (Dror's intent).
- **wao_passage:** `Ads Bot בנוי מהיסוד לפי העקרונות האלה:` → `בוט מודעות של WAO בנוי מהיסוד לפי העקרונות האלה:`; `[בעמוד גוגל אדס](/google-ads)` → `[בעמוד של בוט מודעות](/google-ads)` (Yonatan owns the anchor)
- **SERP (Yonatan):** title 1 runs about 67 characters before the suffix, so it's too long. Choose between גוגל אדס and Google Ads.

## 5. Mark labels: PASS. Final values are in docs/copy/leads-mark-labels-real-FINAL-2026-11-12.json.

## Live /google-ads issues (Adam → Tamar/engineer)
- **landingCopy line 48**, the weekly "three numbers" report: claims ledger A14 says it's NEEDS-PROOF (staff send it manually, with different numbers). Plan: the engineer makes the digest carry exactly those three numbers and staff send it weekly; otherwise the copy changes.
- **landingCopy line 27:** `מה שסימנת כאמיתית חוזר לגוגל` mixes genders. → `פנייה שסימנת כאמיתית חוזרת לגוגל` (Tamar/Noa patch, then Yonatan isn't needed: not an anchor)

## Writing upgrades (proposed)
1. A count announced in the text matches the number of items that follow.
2. What the voice says happens on screen must match what the screen really does.
3. Don't end a paragraph or message on a slogan fragment.
4. In a series, vary the closing move.
5. Give a voiced passive participle niqqud, or rephrase it.
6. A first-person narrator in an ad doesn't describe using the product unless he's a real, cited customer.

## YONATAN
# Yonatan: SEO/GEO review of how-it-works page + Quality Score article (2026-11-12)

Saved by Adam from Yonatan's hand-back (web checked 2026-11-12).

## Adam's rulings
- **Product name:** "בוט מודעות" (Noa; it's the entity used in voice, on the hub and in ads). Yonatan's signed H1/title use "בוט הפרסום". Ruling: H1 `איך בוט מודעות עובד: שמונה צעדים מהחיפוש ועד הפנייה`; title `איך בוט מודעות עובד: 8 צעדים מהחיפוש בגוגל ועד הפנייה`. Yonatan to confirm the swap in his next pass. Bind the Latin "Ads Bot" once in the answer block.
- **Hub consistency** (condition 5): the live /google-ads mechanism moment 3 uses the present tense ("עובר לבד", "מכוונת"). Patch it to the "designed to" frame, together with the line-27 gender fix, in a hub patch round. The weekly-report line 48 waits on the engineer making the digest match. The hub's Eitan mention is the pre-sale "talk to Eitan" funnel (product decision 2026-11-06); the no-founder-name rule is for ads, so it's unchanged.
- **Closed jobs:** "ולפחות שתי עבודות שנסגרו" is the second condition, never the trigger alone (Dror).

## How-it-works page: CONDITIONS
- Own URL `/google-ads/how-it-works`, canonical and indexed. Title: see the ruling above, rendering `…ועד הפנייה‏ | WAO`. Meta: option 1. REJECTED: H1/title option 2 ("ניהול קמפיינים בגוגל" is the hub's) and title option 3 (DIY intent, would collide with the course).
- The page never uses "פרסום בגוגל" or "ניהול קמפיינים בגוגל" in its title, H1 or H2s.
- **Condition 1:** a 2-sentence answer block above the story intro, entity first (what WAO's בוט מודעות (Ads Bot) is, plus the core principle).
- **Condition 2:** links. Hub mechanism block → this page (anchor `איך בוט מודעות עובד`); this page → hub (anchor exactly `פרסום בגוגל`, once, in the closing); step 5 → the article (anchor `ציון איכות`); closing button → the hub demo (DEMO_HREF); no link to the DIY course.
- **Condition 3:** schema. Breadcrumb דף הבית › פרסום בגוגל › איך זה עובד; WebPage about the hub #service; no HowTo, no FAQPage, no Offer; video markup per step later; add to the sitemap.
- **Condition 4:** a SiloNav "פרסום בגוגל" silo (hub plus the two spokes).

## Quality Score article: CONDITIONS (B5 blocks shipping)
- Slug `google-ads-quality-score`.
- H1 `ציון איכות ודירוג מודעה: למה שני אינסטלטורים משלמים אחרת על אותו קליק`.
- metaTitle `ציון איכות בגוגל אדס: למה המתחרה משלם פחות על אותו קליק‏ | WAO`.
- titleShort `ציון איכות ודירוג מודעה`.
- summary = meta option 2, plus "בגוגל אדס" after "ציון האיכות".
- **B1:** a new KnowledgeCategory `ppc`, label `גוגל אדס` (engineer).
- **B2:** a `ppc` CTA branch → /google-ads (engineer + Tamar), no price.
- **B3:** Google's official Hebrew terms, once each: ערכי הסף לדירוג המודעה; חוויית המשתמש בדף הנחיתה; נכסי מודעה (שפעם נקראו תוספים), then נכסים.
- **B4:** (i) a "בקצרה" box comparing Quality Score / Ad Rank / Ad Strength (what it is, its scale, whether it's in the auction); (ii) Google: the actual price per click is often lower than the bid; (iii) Quality Score vs Optimization Score ("ציון אופטימיזציה"), with Dror sourcing it; (iv) a visible "עודכן: נובמבר 2026" plus a sources line (needs renderer support for external links, engineer).
- **B5, BLOCKING:** src/data/glossary.ts:334 (Ad Rank = Bid × QS), :304 (+$0.01 CPC formula) and :329 ("saves money on every click") contradict Google. Fix them (Dror facts → Tamar → engineer), or leave glossaryTerms off the article. Also course page google-ads-course/page.tsx:980 ("LCP over 3 seconds = low QS").
- **B6:** the WAO passage anchor is exactly `פרסום בגוגל` → /google-ads. pillarLinks: hub plus how-it-works. Inline links: /knowledge/core-web-vitals, /knowledge/search-intent, /training/google-ads-course/negetive-term-keywords, /training/google-ads-course/google-ads-landing-pages, /training/google-ads-course/google-ads-extensions-call-button. relatedSlugs: core-web-vitals, search-intent, google-my-business.
- **B7:** Article + Breadcrumb + FAQPage (6 pairs); updatedDate = publish day after Dror's re-check.
- **B8 (should):** a DataForSEO volume and AIO check on ציון איכות / quality score / דירוג מודעה / ad rank / עלות לקליק גוגל.

Sources: Google Help 6167118 and 1722122 (en + iw); FAQPage changelog (rich results ended 2026-05-07); arXiv 2605.14021; Digital Applied AIO citation study.

## AMIT
# Amit: WhatsApp nurture sequence, compliance and channel review (2026-11-12)

Saved by Adam from Amit's hand-back (sources read 2026-11-12). **Verdict: unacceptable as things stand. Nothing can be sent.** The copy is mostly fine; the infrastructure is missing.

## Blockers (code)
1. The demo collects no phone number and no consent: onboarding/page.tsx:166-170 uses DEMO_PROFILE, and every input is disabled in demo mode. /google-ads has only a tel: link.
2. No inbound WhatsApp webhook (no hub.challenge handler in src/), so opt-out replies reach nobody.
3. The only sending number (WHATSAPP_CLOUD_PHONE_NUMBER_ID) also sends the product's lead first-responses (lead-response.ts). Marketing on it endangers the product channel.

## Required before any send
- Every message STARTS with "פרסומת" (§30A(e)).
- Sender identification in every message: WAO + postal address + contact.
- Opt-out line: "Want to stop? Reply 'stop' (or just 'די')…", plus Meta's "Stop promotions" button. Code treats di / hasser / stop / the button as opt-out and halts immediately.
- All five are pre-approved MARKETING templates. Never Utility: Meta re-categorises, and repeat misuse can flip our utility templates, which would hit lead first-response. Links are URL buttons with fixed domains.
- A dedicated WAO marketing number.
- Consent: a separate, unticked checkbox next to a new mobile field after the demo. English intent: "I agree to receive marketing messages from WAO (WAO Digital Marketing Ltd.) on WhatsApp to this number: tips and updates about Ads Bot, up to about five messages over the next few weeks. I can stop at any time by replying 'stop'. Details per the privacy policy." Store the timestamp, wording version, source page and number. Not bundled with PrivacyConsent.tsx.
- Privacy (Amendment 13, in force 14.8.2025): collect the mobile only; add a privacy-policy section naming Meta/WhatsApp as a service provider (data abroad); delete the nurture record about 90 days after the last message; keep a minimal opt-out list. Lawyer: check whether the direct-mail section (17F) adds per-message requirements.
- Cadence: days 0, 4, 9, 15, 22; Sun–Thu 07:00–08:00 or 19:30–21:00; never Friday afternoon, Shabbat or holidays. Stop on opt-out or signup; pause on any reply and hand to support; drop messages 4–5 if 1–3 got no engagement. Handle Meta per-user cap error 131049 (no retry loop).
- Copy truth fixes: msg 4, no "₪15" (per-trade ceiling); msg 5, no "every enquiry" (enquiries from your page; a real enquiry you mark goes back tied to its click).

## Build vs buy
Build (sendWhatsAppTemplate exists): consent form + proof, inbound webhook + opt-out handling, opt-out list check, scheduler with stop rules and quiet hours, 131049 handling, second number ID. About 2 engineer days.

## Adam's recommendation (pending Eitan)
Park the WhatsApp nurture programme until after the 29.11 launch. Tamar fixes msgs 4–5 and adds the "פרסומת" opening, sender footer and opt-out line, so the copy is ready. Consider email first through the existing exit opt-in (needs its own check).

Sources: Communications Law §30A (Wikisource); Chen v. Rosental 2025; Leibin v. Bezeq Nov 2025; Shreiber v. Hot Mobile 2026; WhatsApp Business Messaging Policy (23 Sep 2026); Meta opt-in, template categories, pricing (1 Oct 2026 changes) and per-user limits (17 Jun 2026); Amendment 13 (Vixio, Chambers 2026, PPA minimisation opinion).
