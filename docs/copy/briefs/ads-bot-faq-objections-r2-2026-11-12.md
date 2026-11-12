# Revision round 2: ads-bot-faq-objections (2026-11-12)

You wrote round 1: the full output is pasted below under "ROUND 1 OUTPUT". The original brief is docs/copy/briefs/ads-bot-faq-objections-2026-11-12.md (its rules still bind, including the founder rule "less words, more punch").

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
  "angle": "The reader is product-aware and burned: he already paid someone for Google ads management and is now hunting for the catch, so the bank opens with what is structurally different and what his money actually buys, then answers every suspicion with the real mechanism and its honest limit. No promise of calls, jobs or payback appears anywhere; trust is built from precision he can check himself — the demand gate before launch, the paused campaign, the 15 NIS click ceiling, his one-tap marking as the only counted result, the refund term and the free demo.",
  "faq": [
    {
      "id": "q01",
      "q": "כבר שרפתי כסף על ניהול קמפיינים בגוגל. מה אצלכם שונה?",
      "a": "שלושה דברים. אנחנו בודקים ביקוש אמיתי ומחירי קליקים לפני ההשקה, ולא משיקים אם המספרים לא מצדיקים קמפיין. הקמפיין רץ על שירות אחד עם רשימת חסימה מהיום הראשון, וכל פנייה שסימנת כאמיתית נשלחת לגוגל. החשבון סופר פניות — לא קליקים.",
      "facts_used": [
        "System checks real search volume and click prices before a live campaign is created; not created if the numbers do not justify it (demand-readiness.ts:83-109; create-campaign/route.ts:460-487)",
        "One main service, 3-5 search phrases, one group (prompts.ts:400; create-campaign/route.ts:672-686)",
        "Block-list of 10-15 words from day one (prompts.ts:402-403; create-campaign/route.ts:688-693)",
        "Each enquiry marked real goes back to Google tied to its click and is the only thing counted as a result (clientLeadsActions.js:55-82; conversion-goals.js:28-29)"
      ],
      "short": "אנחנו בודקים ביקוש ומחירי קליקים לפני ההשקה, רצים על שירות אחד, וסופרים פניות אמיתיות ולא קליקים."
    },
    {
      "id": "q02",
      "q": "כמה זה עולה לי בסך הכול, בלי הפתעות?",
      "a": "249 ₪ בתוספת מע״מ בחודש על הניהול. תקציב המדיה נפרד והוא שלך: מינימום 1,500 ₪ בחודש, שזה בערך 50 ₪ ליום. אין התחייבות, ואפשר לעצור בכל חודש.",
      "facts_used": [
        "Management fee 249 NIS + VAT per month, no commitment, can leave any month (plans.ts:59; Ads Bot terms §7)",
        "Ad budget is separate and his, minimum 1,500 NIS a month, about 50 NIS a day (Ads Bot terms §2)"
      ],
      "short": "הניהול 249 ₪ בתוספת מע״מ בחודש, ותקציב המדיה שלך בנפרד — מינימום 1,500 ₪ בחודש, בלי התחייבות."
    },
    {
      "id": "q03",
      "q": "לאן הכסף שלי הולך בפועל?",
      "a": "שני כיסים נפרדים. דמי הניהול הם מה שאתה משלם ל־WAO על בוט מודעות שמנהל את הקמפיין, ותקציב המדיה נשאר שלך ויוצא על קליקים בחשבון שלך. הבוט לא מעלה את התקציב היומי מעל הסכום שאתה קבעת.",
      "facts_used": [
        "Management fee 249 NIS + VAT (plans.ts:59); ad budget separate and his (Ads Bot terms §2)",
        "New account opened in his name (create-campaign/route.ts:498-502)",
        "The bot never raises his daily budget above what he set (autonomy-consent.ts:44)"
      ],
      "short": "דמי הניהול ל־WAO, תקציב המדיה נשאר שלך ויוצא על קליקים, והבוט לא מעלה את התקציב היומי שקבעת."
    },
    {
      "id": "q04",
      "q": "החשבון בגוגל יהיה על שם מי?",
      "a": "על שמך, לא על שמנו. אנחנו פותחים חשבון Google Ads חדש בשמך, ואתה רואה בו כל קליק וכל הוצאה. יש גם יומן פעילות שמראה מה הבוט עשה ומתי.",
      "facts_used": [
        "A new account, opened in his name, built from scratch (create-campaign/route.ts:498-502; Ads Bot terms §2)",
        "Activity log alongside the stop switch and visible limits (autonomyCopy.ts:5-8)"
      ],
      "short": "החשבון נפתח על שמך, ואתה רואה בו כל קליק, כל הוצאה וכל פעולה של הבוט."
    },
    {
      "id": "q05",
      "q": "יש לי כבר חשבון ישן בגוגל. למה לא לתקן אותו?",
      "a": "אנחנו לא מתקנים חשבון קיים — בונים חדש מאפס, על שמך. ככה הכול נבנה יחד מההתחלה: שירות אחד, רשימת חסימה, דף נחיתה תואם וספירה של פניות אמיתיות בלבד. החשבון הישן נשאר כמו שהוא, ואנחנו לא נוגעים בו.",
      "facts_used": [
        "We do not repair an existing account; a new account is opened in his name and built from scratch (create-campaign/route.ts:498-502; Ads Bot terms §2)",
        "One main service and block-list (prompts.ts:400-403), landing page headline area contains the exact service name (lpCopyPrompt.ts:191-192), real enquiries are the only counted result (conversion-goals.js:28-29)"
      ],
      "short": "אנחנו לא מתקנים חשבון ישן — בונים חדש מאפס על שמך, והישן נשאר כמו שהוא."
    },
    {
      "id": "q06",
      "q": "מאיפה אתם יודעים שבכלל יש מי שמחפש את השירות שלי?",
      "a": "אנחנו בודקים את זה לפני שנפתח קמפיין חי. המערכת מסתכלת על כמה אנשים באמת מחפשים את השירות שלך ומה עולה קליק בביטויים האלה. אם מעט מדי אנשים מחפשים, או שהפנייה צפויה לעלות יותר ממה שעבודה שלך שווה — הקמפיין לא נוצר. עדיף שתדע את זה לפני שאתה מתחיל, לא אחרי.",
      "facts_used": [
        "The system checks real search volume and click prices for his service before a live campaign is created; if too few people search or the expected cost per enquiry is more than his job value can carry, it is not created (demand-readiness.ts:83-109; create-campaign/route.ts:460-487)"
      ],
      "short": "המערכת בודקת נפח חיפוש אמיתי ומחירי קליקים לפני ההשקה, ולא פותחת קמפיין אם המספרים לא מצדיקים אותו."
    },
    {
      "id": "q07",
      "q": "אני עושה כמה דברים. המודעות יופיעו על כל השירותים?",
      "a": "הקמפיין רץ על שירות מרכזי אחד, לא על כל הרשימה. שלושה עד חמישה ביטויי חיפוש וקבוצה אחת, כך שכל שקל הולך על הדבר שאתה רוצה שיתקשרו אליך עליו. כשמפזרים תקציב על כל השירותים, אי אפשר לדעת מה הביא את הפנייה ומה שרף את הכסף.",
      "facts_used": [
        "One main service, 3-5 search phrases for it, one group (prompts.ts:400; create-campaign/route.ts:672-686)"
      ],
      "short": "הקמפיין רץ על שירות מרכזי אחד עם שלושה עד חמישה ביטויי חיפוש, כדי שתדע מה מביא פניות ומה לא."
    },
    {
      "id": "q08",
      "q": "מה המודעה שלי תגיד, ולאן מי שלוחץ מגיע?",
      "a": "אנחנו בונים את המודעה מנקודות המכירה האמיתיות שלך: עד 15 כותרות, ארבעה תיאורים וכפתור חיוג. מתחתיה, לפי הפרטים שמסרת, מופיעים גם רשימת השירותים, קישורים והתמונות שלך. מי שלוחץ מגיע לדף נחיתה שבראש שלו מופיע שם השירות שחיפש, עם טופס, כפתור חיוג וכפתור וואטסאפ. כל לחיצה שם נרשמת עם הקליק שהביא אותה, כך שאתה יודע מאיפה הגיעה כל פנייה.",
      "facts_used": [
        "An ad with up to 15 headlines and 4 descriptions built from his real selling points; call button, service list, links and his photos under it where his details allow (prompts.ts:436-443; create-campaign/route.ts:246-396, 698-721)",
        "A landing page for that service whose headline area must contain the exact service name; form, call button and WhatsApp button, each recorded with the click that brought the person (lpCopyPrompt.ts:191-192; LandingPage.tsx:64-68, 83)"
      ],
      "short": "אנחנו בונים את המודעה מנקודות המכירה שלך, ודף הנחיתה פותח בשם השירות עם טופס, חיוג ווואטסאפ — וכל לחיצה משויכת לקליק שהביא אותה."
    },
    {
      "id": "q09",
      "q": "מה אם יתקשרו אליי רק מחפשי עבודה ואנשים שרוצים חינם?",
      "a": "חסימה, מהיום הראשון. רשימה של עשר עד חמש עשרה מילים — דרושים, חינם, קורסים, איך לעשות לבד, יד שנייה ומה שאתה לא עושה — נכנסת לקמפיין לפני הקליק הראשון. אחר כך הבוט חוסם לבד חיפושים שלקחו לפחות חמישה קליקים, עלו מעל רף העלות ולא הביאו כלום. ופנייה שסימנת כזבל לא נספרת כתוצאה.",
      "facts_used": [
        "Block-list of 10-15 words from day one: job seekers, free, courses, how-to, second-hand, what he does not do (prompts.ts:402-403; create-campaign/route.ts:688-693)",
        "It blocks searches that took at least five clicks, cost more than a set bar and brought nothing (search-term-scoring.ts:44-57, 224-258)",
        "Only an enquiry marked real is counted as a result (clientLeadsActions.js:55-82; conversion-goals.js:28-29)"
      ],
      "short": "רשימת חסימה של עשר עד חמש עשרה מילים נכנסת מהיום הראשון, והבוט חוסם לבד חיפושים ששרפו קליקים ולא הביאו כלום."
    },
    {
      "id": "q10",
      "q": "מה עוצר את מחיר הקליק מלברוח לי?",
      "a": "תקרה של 15 ₪ לקליק. בשלב הראשון, מצב קליקים, הבוט קונה קליקים מתחת לתקרה ולא מעלה את התקציב היומי שקבעת. וגוגל עצמה אומרת שמודעות ודף נחיתה איכותיים יכולים להוזיל את מחיר הקליק — לכן אנחנו בונים את שניהם סביב אותו שירות.",
      "facts_used": [
        "Stage one buys clicks with a 15 NIS ceiling on the price of a click (create-campaign/route.ts:641)",
        "The bot never raises his daily budget above what he set (autonomy-consent.ts:44)",
        "Google says higher quality ads can often lead to lower click prices (Google Ads Help, support.google.com/google-ads/answer/1722122, read 2026-11-12)"
      ],
      "short": "במצב קליקים יש תקרה של 15 ₪ לקליק, והבוט לא מעלה את התקציב היומי שקבעת."
    },
    {
      "id": "q11",
      "q": "מישהו יכול ללחוץ לי על המודעה כל היום. מה עוצר את זה?",
      "a": "יש מסנן. הוא יושב על דף הנחיתה, והמערכת בודקת אותו כל יום. רק פנייה שסימנת כאמיתית נספרת כתוצאה, כך שקליק מזויף לא מזהם את הספירה. אתה רואה את הפניות עצמן, לא רק מספר לחיצות.",
      "facts_used": [
        "A fake-click filter on the landing page, checked daily (fraud-blocker/tracker.ts:5-6; autonomous-cycle.ts:248-256)",
        "Only an enquiry marked real is counted as a result (conversion-goals.js:28-29)",
        "All enquiries in one list (LeadsTable.tsx:81-117)"
      ],
      "short": "מסנן קליקים מזויפים יושב על דף הנחיתה ונבדק כל יום, ורק פניות שסימנת כאמיתיות נספרות כתוצאה."
    },
    {
      "id": "q12",
      "q": "מה אני צריך לעשות בעצמך, וכמה זמן זה ייקח לי?",
      "a": "אתה רואה את התוכנית ומאשר פעם אחת. עד הרגע הזה הקמפיין מושהה. אחר כך כל הפניות יושבות ברשימה אחת: לחיצה מסמנת פנייה כאמיתית או כזבל, ועבודה שנסגרה אתה מסמן עם הסכום. את השאר הבוט עושה לבד, והתמיכה בכתב — רוב התשובות מהמערכת, וכשצריך נכנס בן אדם.",
      "facts_used": [
        "The campaign is created paused; nothing runs before he saw the plan (create-campaign/route.ts:639)",
        "Everything runs after his one-time approval, inside visible limits (autonomyCopy.ts:5-8)",
        "All enquiries in one list; one tap marks real or junk; a closed job is marked with its amount (LeadsTable.tsx:81-117)",
        "Support is in writing; most questions are answered by the system, a person steps in when needed"
      ],
      "short": "אתה מאשר את התוכנית פעם אחת, ואחר כך רק מסמן פניות ועבודות שנסגרו — את השאר הבוט עושה."
    },
    {
      "id": "q13",
      "q": "ומה אם אני שוכח לסמן? אני בשטח כל היום.",
      "a": "הסימון שלך הוא הדבר היחיד שהחשבון סופר כתוצאה. בלי סימונים הקמפיין נשאר במצב קליקים ולא מתקדם למצב פניות, כי אין לו מה לספור. הפניות לא נעלמות — הן יושבות ברשימה ומחכות לסימון שלך.",
      "facts_used": [
        "Each enquiry marked real goes back to Google tied to its click; it is the only thing the account counts as a result (clientLeadsActions.js:55-82; conversion-goals.js:28-29)",
        "The campaign is built to move from click mode to enquiry mode after about 15 real enquiries within 60 days plus at least two closed jobs (docs/specs/ads-bot-phase2-volume-reality-2026-11-12.md §1.6)",
        "All enquiries in one list (LeadsTable.tsx:81-117)"
      ],
      "short": "רק פנייה שסימנת כאמיתית נספרת כתוצאה, ובלי סימונים הקמפיין נשאר במצב קליקים."
    },
    {
      "id": "q14",
      "q": "מתי זה מתחיל לרדוף אחרי פניות אמיתיות, ומה אם אני לא מגיע לזה?",
      "a": "הקמפיין בנוי לעבור לבד ממצב קליקים למצב פניות אחרי בערך 15 פניות אמיתיות ב־60 יום ושתי עבודות שנסגרו. בתקציב המינימלי זה בדרך כלל לוקח חודשיים עד שלושה. לא כל מקצוע ואזור מגיעים לזה בתקציב המינימלי, ואז אנחנו מראים לך איזה תקציב כן יגיע. ואם מצב פניות נותן תוצאות פחות טובות, הקמפיין חוזר לבד למצב קליקים.",
      "facts_used": [
        "Built to move by itself from click mode to enquiry mode after about 15 real enquiries within 60 days plus at least two closed jobs; at the minimum budget usually two to three months; not every trade and area gets there at the minimum budget, and then he is shown the budget that would; if enquiry mode does worse it goes back by itself (docs/specs/ads-bot-phase2-volume-reality-2026-11-12.md §1.6; built to because the automatic switch is scheduled, not live)"
      ],
      "short": "הקמפיין בנוי לעבור לבד למצב פניות אחרי כ־15 פניות אמיתיות ב־60 יום ושתי עבודות סגורות, ובתקציב המינימלי זה בדרך כלל חודשיים־שלושה."
    },
    {
      "id": "q15",
      "q": "אתם מבטיחים לי שיחות? כי כולם הבטיחו.",
      "a": "אתה רואה את התוכנית המלאה לפני שאתה משלם, ואת כל הפניות אחרי — ברשימה אחת, עם הסכום של כל עבודה שנסגרה. הבטחה על מספר שיחות אין, כי אף אחד לא שולט במי יחפש אותך מחר. מה שכן יש: החזר של דמי הניהול ב־30 הימים הראשונים לפי התנאים שבתקנון, וחופש לעצור בכל חודש.",
      "facts_used": [
        "A free demo shows the plan before he pays anything (google-ads/page.tsx:86)",
        "All enquiries in one list; a closed job is marked with its amount (LeadsTable.tsx:81-117)",
        "30-day refund of the management fee under the conditions in the terms (Ads Bot terms §7)",
        "No commitment; he can leave any month (plans.ts:59; Ads Bot terms §7)"
      ],
      "short": "אתה רואה את התוכנית לפני התשלום ואת הפניות אחרי, ויש החזר דמי ניהול ב־30 הימים הראשונים לפי התקנון — הבטחה על מספר שיחות אין."
    },
    {
      "id": "q16",
      "q": "אני יכול לעצור הכול באמצע? בלי להתחנן?",
      "a": "יש מתג עצירה, ואתה מפעיל אותו מתי שאתה רוצה. אין התחייבות, ואפשר לעצור בכל חודש. הבוט פועל רק אחרי האישור שלך, בתוך גבולות שאתה רואה, וכל פעולה שלו נרשמת.",
      "facts_used": [
        "All of this runs after his one-time approval, inside visible limits, with a stop switch and an activity log (autonomyCopy.ts:5-8)",
        "No commitment; he can leave any month (plans.ts:59; Ads Bot terms §7)"
      ],
      "short": "יש מתג עצירה, אין התחייבות, ואפשר לעצור בכל חודש."
    },
    {
      "id": "q17",
      "q": "מה זה הקרדיט הזה של גוגל ששמעתי עליו?",
      "a": "גוגל מציעה כיום למפרסמים חדשים בישראל מבצע: מוציאים 1,500 ₪ על מדיה ומקבלים 1,500 ₪ קרדיט לפרסום. זה מיועד לעסקים שמעולם לא פרסמו בגוגל Ads, וגוגל בודקת זכאות וקובעת את התנאים. היא גם יכולה לשנות או להפסיק את המבצע, אז שווה לבדוק זכאות לפני שאתה בונה על זה.",
      "facts_used": [
        "Google's new-advertiser offer in Israel as seen in our Partner account on 2026-11-12: spend 1,500 NIS, get 1,500 NIS in ad credit; for businesses that never advertised on Google Ads; Google checks eligibility, sets the terms and can change or end it (docs/specs/ads-bot-phase2-volume-reality-2026-11-12.md, update of 2026-11-12)"
      ],
      "short": "גוגל מציעה למי שמעולם לא פרסם בגוגל Ads מבצע של 1,500 ₪ קרדיט על הוצאה של 1,500 ₪, בכפוף לבדיקת זכאות ולתנאים שלה."
    },
    {
      "id": "q18",
      "q": "אני יכול לראות איך זה נראה לפני שאני משלם?",
      "a": "כן. יש דמו חינם על עסק אינסטלציה לדוגמה, שמראה לך את התוכנית המלאה לפני שאתה משלם שקל. וכשאתה מתקדם, הקמפיין שלך נוצר מושהה — שום דבר לא רץ לפני שראית אותו.",
      "facts_used": [
        "A free demo on a sample plumbing business shows the plan before he pays anything (google-ads/page.tsx:86)",
        "The campaign is created paused; nothing runs before he saw the plan (create-campaign/route.ts:639)"
      ],
      "short": "יש דמו חינם על עסק אינסטלציה לדוגמה שמראה את התוכנית המלאה לפני שאתה משלם."
    }
  ],
  "flags": [
    "What will a real enquiry cost me in my trade and my area? The readiness gate uses an expected cost per enquiry internally, but there is no per-trade or per-area range he can be shown before launch, so the honest answer stays general.",
    "Does the 15 NIS click ceiling still hold in enquiry mode? The facts define the ceiling for stage one only and state no cap for enquiry mode, which is exactly the follow-up a burned owner asks after q10.",
    "Has anyone actually reached enquiry mode, and what changed for them? The automatic switch is scheduled, not live, so there is no live case or outcome to point at — only the built-to design.",
    "What exactly do I have to do to get the 30-day refund, and what voids it? Terms §7 conditions are not spelled out in the brief, so the answer can name the term but cannot state the condition in one plain line.",
    "What happens to my campaign, my landing page and my lead list the day I leave? No exit mechanics in the facts: who owns the landing page, whether it stays live, and what stays accessible in the account.",
    "Can I add a second service or a second campaign later, and what does that cost? The facts cover one main service and one group only, with no expansion path or pricing.",
    "Who is the person that steps in when the system cannot answer, and how fast do they reply? Support facts give no role and no response time, and both a name and a response time are barred here, so this question has no honest answer yet."
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
