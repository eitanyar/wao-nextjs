# Final round 3: ads-bot-faq-objections (2026-11-12)

This is the last polish. Your round-2 output is pasted below. Apply ONLY the remaining items that concern THIS file, from:
- Noa's final pass (exact replacements; binding on Hebrew)
- Dror's round-2 re-check (binding on facts)
- Yonatan's round-2 sign-off (binding on anchors and terms)

All three are pasted below, and Adam's rulings at the top of each override everything else. YELLOW items are your call. Keep every other line byte-for-byte. Return the COMPLETE output in the same JSON shape, plus "changes": [{"id": "...", "why": "..."}].

## ROUND 2 OUTPUT
{
  "angle": "The reader is product-aware and burned: he already paid someone for Google ads management and is now hunting for the catch, so the bank opens with what is structurally different and what his money actually buys, then answers every suspicion with the real mechanism and its honest limit. No promise of calls, jobs or payback appears anywhere; trust is built from precision he can check himself — the demand gate before launch, the paused campaign, the per-trade click ceiling, his one-tap marking as the only counted result, the refund term and the free demo.",
  "faq": [
    {
      "id": "q01",
      "q": "כבר שרפתי כסף על ניהול קמפיינים בגוגל. מה אצלכם שונה?",
      "a": "אנחנו בודקים ביקוש אמיתי ומחירי קליקים לפני ההשקה, ולא משיקים אם המספרים לא מצדיקים קמפיין. הקמפיין רץ על שירות אחד עם רשימת חסימה מהיום הראשון. פנייה שסימנת כאמיתית חוזרת לגוגל, מחוברת לקליק שהביא אותה. החשבון סופר רק פניות שסימנת כאמיתיות, לא קליקים.",
      "facts_used": [
        "System checks real search volume and click prices before a live campaign is created; not created if the numbers do not justify it (demand-readiness.ts:83-109; create-campaign/route.ts:460-487)",
        "One main service, 3-5 search phrases, one group (prompts.ts:400; create-campaign/route.ts:672-686)",
        "Block-list of 10-15 words from day one (prompts.ts:402-403; create-campaign/route.ts:688-693)",
        "Each enquiry marked real goes back to Google tied to its click and is the only thing counted as a result (clientLeadsActions.js:55-82; conversion-goals.js:28-29)"
      ],
      "short": "אנחנו בודקים ביקוש ומחירי קליקים לפני ההשקה, רצים על שירות אחד, וסופרים רק פניות שסימנת כאמיתיות — לא קליקים."
    },
    {
      "id": "q02",
      "q": "כמה זה עולה לי בסך הכול, בלי הפתעות?",
      "a": "249 ₪ בתוספת מע״מ בחודש על הניהול. תקציב הפרסום נפרד והוא שלך: מינימום 1,500 ₪ בחודש, שזה בערך 50 ₪ ליום. אין התחייבות, ואפשר לעצור בכל חודש.",
      "facts_used": [
        "Management fee 249 NIS + VAT per month, no commitment, can leave any month (plans.ts:59; Ads Bot terms §7)",
        "Ad budget is separate and his, minimum 1,500 NIS a month, about 50 NIS a day (Ads Bot terms §2)"
      ],
      "short": "הניהול 249 ₪ בתוספת מע״מ בחודש, ותקציב הפרסום שלך בנפרד — מינימום 1,500 ₪ בחודש, בלי התחייבות."
    },
    {
      "id": "q03",
      "q": "לאן הכסף שלי הולך בפועל?",
      "a": "שני כיסים נפרדים. דמי הניהול הם מה שאתה משלם ל־WAO על בוט מודעות שמנהל את הקמפיין. תקציב הפרסום נשאר שלך: אתה משלם אותו ישירות לגוגל, מחשבון Google Ads שנפתח על שמך, והוא יוצא על קליקים. הבוט לא מעלה את התקציב היומי מעל הסכום שאתה קבעת.",
      "facts_used": [
        "Management fee 249 NIS + VAT (plans.ts:59); ad budget separate and his, paid by him directly to Google (Ads Bot terms §2; live /google-ads FAQ, via Dror 2026-11-12)",
        "New account opened in his name (create-campaign/route.ts:498-502)",
        "The bot never raises his daily budget above what he set (autonomy-consent.ts:44)"
      ],
      "short": "דמי הניהול ל־WAO, את תקציב הפרסום אתה משלם ישירות לגוגל מחשבון על שמך, והבוט לא מעלה את התקציב היומי שקבעת."
    },
    {
      "id": "q04",
      "q": "החשבון בגוגל יהיה על שם מי?",
      "a": "על שמך, לא על שמנו. אנחנו פותחים חשבון Google Ads חדש על שמך, ובונים אותו מאפס.",
      "facts_used": [
        "A new account, opened in his name, built from scratch (create-campaign/route.ts:498-502; Ads Bot terms §2)"
      ],
      "short": "החשבון נפתח על שמך, ואנחנו בונים אותו מאפס."
    },
    {
      "id": "q05",
      "q": "יש לי כבר חשבון ישן בגוגל. למה לא לתקן אותו?",
      "a": "אנחנו לא מתקנים חשבון קיים — בונים חדש מאפס, על שמך. ככה הכול נבנה יחד מההתחלה: שירות אחד, רשימת חסימה, דף נחיתה תואם וספירה של פניות אמיתיות בלבד. החשבון הישן נשאר כמו שהוא, ואנחנו לא נוגעים בו. אם גוגל השעה את החשבון הישן שלך, תגיד לנו מראש — במקרה כזה אסור לפתוח חשבון חדש.",
      "facts_used": [
        "We do not repair an existing account; a new account is opened in his name and built from scratch (create-campaign/route.ts:498-502; Ads Bot terms §2)",
        "One main service and block-list (prompts.ts:400-403), landing page headline area contains the exact service name (lpCopyPrompt.ts:191-192), real enquiries are the only counted result (conversion-goals.js:28-29)",
        "If Google suspended his old account, a new one may not be opened and he must tell us first (Google Ads Circumventing systems policy 15938075, via Dror 2026-11-12)"
      ],
      "short": "אנחנו לא מתקנים חשבון ישן — בונים חדש מאפס על שמך, והישן נשאר כמו שהוא."
    },
    {
      "id": "q06",
      "q": "מאיפה אתם יודעים שבכלל יש מי שמחפש את השירות שלי?",
      "a": "אנחנו בודקים את זה לפני שהקמפיין עולה לאוויר. המערכת מסתכלת על כמה אנשים באמת מחפשים את השירות שלך ומה עולה קליק בביטויים האלה. אם מעט מדי אנשים מחפשים, או שפנייה צפויה לעלות יותר ממה שהעבודה שלך מצדיקה — הקמפיין לא נוצר. עדיף שתדע את זה לפני שאתה מתחיל, לא אחרי.",
      "facts_used": [
        "The system checks real search volume and click prices for his service before a live campaign is created; if too few people search or the expected cost per enquiry is more than his job value can carry, it is not created (demand-readiness.ts:83-109; create-campaign/route.ts:460-487)"
      ],
      "short": "המערכת בודקת נפח חיפוש אמיתי ומחירי קליקים לפני ההשקה, ולא פותחת קמפיין אם המספרים לא מצדיקים אותו."
    },
    {
      "id": "q07",
      "q": "אני עושה כמה דברים. המודעות יופיעו על כל השירותים?",
      "a": "הקמפיין רץ על שירות מרכזי אחד, לא על כל הרשימה. שלושה עד חמישה ביטויי חיפוש, כך שכל שקל הולך על הדבר שאתה רוצה שיתקשרו אליך עליו. כשמפזרים תקציב על כל השירותים, אי אפשר לדעת מה הביא את הפנייה ומה שרף את הכסף.",
      "facts_used": [
        "One main service, 3-5 search phrases for it (prompts.ts:400; create-campaign/route.ts:672-686)"
      ],
      "short": "הקמפיין רץ על שירות מרכזי אחד עם שלושה עד חמישה ביטויי חיפוש, כדי שתדע מה מביא פניות ומה לא."
    },
    {
      "id": "q08",
      "q": "מה המודעה שלי תגיד, ולאן מי שלוחץ מגיע?",
      "a": "אנחנו בונים את המודעה מנקודות המכירה האמיתיות שלך: עד 15 כותרות וארבעה תיאורים. מתחתיה, לפי הפרטים שמסרת, גוגל יכול להציג גם כפתור חיוג, רשימת השירותים, קישורים והתמונות שלך. מי שלוחץ מגיע לדף נחיתה שבראש שלו מופיע שם השירות שחיפש, עם טופס, כפתור חיוג וכפתור וואטסאפ. לכל פנייה ברשימה רשום הקליק שהביא אותה, כך שאתה יודע מאיפה היא הגיעה.",
      "facts_used": [
        "An ad with up to 15 headlines and 4 descriptions built from his real selling points; call button, service list, links and his photos below it when his details allow and Google chooses to show them (prompts.ts:436-443; create-campaign/route.ts:246-396, 698-721; Dror 2026-11-12)",
        "A landing page for that service whose headline area must contain the exact service name; form, call button and WhatsApp button, each enquiry in the list tied to the click that brought the person (lpCopyPrompt.ts:191-192; LandingPage.tsx:64-68, 83)"
      ],
      "short": "אנחנו בונים את המודעה מנקודות המכירה שלך, ודף הנחיתה פותח בשם השירות עם טופס, חיוג ווואטסאפ — ולכל פנייה ברשימה רשום הקליק שהביא אותה."
    },
    {
      "id": "q09",
      "q": "מה אם יתקשרו אליי רק מחפשי עבודה ואנשים שרוצים חינם?",
      "a": "חסימה, מהיום הראשון. רשימה של עשר עד חמש עשרה מילים — דרושים, חינם, קורסים, איך לעשות לבד, יד שנייה ומה שאתה לא עושה — נכנסת לקמפיין לפני הקליק הראשון. אחר כך, באישור החד פעמי שלך, הבוט יכול לחסום לבד חיפושים שקיבלו לפחות חמישה קליקים, עברו את רף העלות שנקבע לפי העסק שלך ולא הביאו פנייה שסימנת כאמיתית. ופנייה שסימנת כזבל לא נספרת כתוצאה.",
      "facts_used": [
        "Block-list of 10-15 words from day one: job seekers, free, courses, how-to, second-hand, what he does not do (prompts.ts:402-403; create-campaign/route.ts:688-693)",
        "With his one-time approval the bot can block searches that took at least five clicks, cost more than the bar set from his business and brought no enquiry he marked real (search-term-scoring.ts:44-57, 224-258; Dror 2026-11-12)",
        "Only an enquiry marked real is counted as a result (clientLeadsActions.js:55-82; conversion-goals.js:28-29)"
      ],
      "short": "רשימת חסימה של עשר עד חמש עשרה מילים נכנסת מהיום הראשון, ובאישור החד פעמי שלך הבוט יכול לחסום חיפושים ששרפו קליקים ולא הביאו פנייה שסימנת כאמיתית."
    },
    {
      "id": "q10",
      "q": "מה עוצר את מחיר הקליק מלברוח לי?",
      "a": "תקרה למחיר קליק, שנקבעת לפי המקצוע שלך. בשלב הראשון, מצב קליקים, הבוט קונה קליקים עד התקרה ולא מעלה את התקציב היומי שקבעת. וגוגל עצמו אומר שמודעות ודף נחיתה איכותיים יכולים להוזיל את מחיר הקליק — לכן אנחנו בונים את שניהם סביב אותו שירות.",
      "facts_used": [
        "Stage one buys clicks under a ceiling on the price of one click, set per trade; no published number (create-campaign/route.ts:641; Adam ruling 2026-11-12)",
        "The bot never raises his daily budget above what he set (autonomy-consent.ts:44)",
        "Google says higher quality ads can often lead to lower click prices (Google Ads Help, support.google.com/google-ads/answer/1722122, read 2026-11-12)"
      ],
      "short": "במצב קליקים יש תקרה למחיר קליק לפי המקצוע שלך, והבוט לא מעלה את התקציב היומי שקבעת."
    },
    {
      "id": "q11",
      "q": "מישהו יכול ללחוץ לי על המודעה כל היום. מה עוצר את זה?",
      "a": "גוגל עצמו מסנן קליקים לא חוקיים מהנתונים ומהחיוב. גם אנחנו מפעילים מסנן משלנו על דף הנחיתה. רק פנייה שסימנת כאמיתית נספרת כתוצאה, כך שקליק לא חוקי לא מזהם את הספירה. אתה רואה את הפניות עצמן, לא רק מספר קליקים.",
      "facts_used": [
        "Google filters invalid clicks out of metrics and billing (Google Ads Help 42995, via Dror 2026-11-12)",
        "A fake-click filter on the landing page (fraud-blocker/tracker.ts:5-6)",
        "Only an enquiry marked real is counted as a result (conversion-goals.js:28-29)",
        "Enquiries from the page in one list (LeadsTable.tsx:81-117)"
      ],
      "short": "גוגל מסנן קליקים לא חוקיים מהנתונים ומהחיוב, על הדף פועל גם מסנן משלנו, ורק פנייה שסימנת כאמיתית נספרת כתוצאה."
    },
    {
      "id": "q12",
      "q": "מה אני צריך לעשות בעצמי, וכמה זמן זה ייקח לי?",
      "a": "אתה רואה את התוכנית ומאשר פעם אחת. עד הרגע הזה הקמפיין מושהה. אחר כך הפניות מהדף יושבות ברשימה אחת: לחיצה אחת מסמנת פנייה כאמיתית או כזבל, ועבודה שנסגרה אתה מסמן עם הסכום. שניות לכל פנייה. את השאר הבוט עושה לבד, בתוך הגבולות שאישרת, והתמיכה בכתב — רוב התשובות מהמערכת, וכשצריך נכנס בן אדם.",
      "facts_used": [
        "The campaign is created paused; nothing runs before he saw the plan (create-campaign/route.ts:639)",
        "Everything runs after his one-time approval, inside the limits he approved (autonomyCopy.ts:5-8)",
        "Enquiries from the page in one list; one tap marks real or junk; a closed job is marked with its amount (LeadsTable.tsx:81-117)",
        "Support is in writing; most questions are answered by the system, a person steps in when needed"
      ],
      "short": "אתה מאשר את התוכנית פעם אחת, ואחר כך רק מסמן פניות ועבודות שנסגרו — את השאר הבוט עושה."
    },
    {
      "id": "q13",
      "q": "ומה אם אני שוכח לסמן? אני בשטח כל היום.",
      "a": "הסימון שלך הוא הדבר היחיד שהחשבון סופר כתוצאה. בלי סימונים הקמפיין נשאר במצב קליקים ולא יכול לעבור למצב פניות, כי אין לו מה לספור. הפניות לא נעלמות — הן יושבות ברשימה ומחכות לסימון שלך.",
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
      "a": "הקמפיין מתוכנן לעבור לבד ממצב קליקים למצב פניות אחרי בערך 15 פניות אמיתיות ב־60 יום ולפחות שתי עבודות שנסגרו. בתקציב המינימלי זה בדרך כלל לוקח חודשיים עד שלושה. לא כל מקצוע מגיע לזה בתקציב הזה, ואז אנחנו מראים לך איזה תקציב כן יביא אותך לשם. ואם מצב פניות נותן תוצאות פחות טובות, הוא מתוכנן לחזור לבד למצב קליקים.",
      "facts_used": [
        "Designed to move by itself from click mode to enquiry mode after about 15 real enquiries within 60 days plus at least two closed jobs; at the minimum budget usually two to three months; not every trade gets there at the minimum budget, and then he is shown the budget that would; designed to go back by itself if enquiry mode does worse (docs/specs/ads-bot-phase2-volume-reality-2026-11-12.md §1.6; designed-to because phase 2 is not live and verified yet)"
      ],
      "short": "הקמפיין מתוכנן לעבור לבד למצב פניות אחרי כ־15 פניות אמיתיות ב־60 יום ולפחות שתי עבודות שנסגרו, ובתקציב המינימלי זה בדרך כלל חודשיים־שלושה."
    },
    {
      "id": "q15",
      "q": "אתם מבטיחים לי שיחות? כי כולם הבטיחו.",
      "a": "בדמו החינם אתה רואה תוכנית מלאה על עסק לדוגמה, לפני שאתה משלם. אחרי ההשקה אתה רואה את הפניות מהדף — ברשימה אחת, עם הסכום של כל עבודה שנסגרה. הבטחה על מספר שיחות אין, כי אף אחד לא שולט במי יחפש אותך מחר. מה שכן יש: החזר של דמי הניהול ב־30 הימים הראשונים לפי התנאים שבתקנון, וחופש לעצור בכל חודש.",
      "facts_used": [
        "A free demo on a sample business shows a complete plan before he pays anything (google-ads/page.tsx:86)",
        "Enquiries from the page in one list; a closed job is marked with its amount (LeadsTable.tsx:81-117)",
        "30-day refund of the management fee under the conditions in the terms (Ads Bot terms §7)",
        "No commitment; he can leave any month (plans.ts:59; Ads Bot terms §7)"
      ],
      "short": "בדמו החינם אתה רואה תוכנית מלאה על עסק לדוגמה לפני התשלום, ויש החזר דמי ניהול ב־30 הימים הראשונים לפי התקנון — הבטחה על מספר שיחות אין."
    },
    {
      "id": "q16",
      "q": "אני יכול לעצור הכול באמצע? בלי להתחנן?",
      "a": "אין התחייבות, ואפשר לעצור בכל חודש. הבוט פועל רק אחרי האישור שלך, בתוך גבולות שאתה רואה.",
      "facts_used": [
        "All of this runs after his one-time approval, inside visible limits (autonomyCopy.ts:5-8)",
        "No commitment; he can leave any month (plans.ts:59; Ads Bot terms §7)"
      ],
      "short": "אין התחייבות, ואפשר לעצור בכל חודש."
    },
    {
      "id": "q17",
      "q": "מה זה הקרדיט הזה של גוגל ששמעתי עליו?",
      "a": "נכון לנובמבר 2026, גוגל מציע למפרסמים חדשים בישראל מבצע: מוציאים 1,500 ₪ על מודעות ומקבלים 1,500 ₪ קרדיט לפרסום. זה מיועד לעסקים שמעולם לא פרסמו ב־Google Ads. את הסכום צריך להוציא בתוך תקופה מוגדרת אחרי שאתה מתחיל לפרסם. גוגל בודק זכאות, קובע את התנאים ויכול גם לשנות או להפסיק את המבצע — אז שווה לבדוק זכאות לפני שאתה בונה על זה.",
      "facts_used": [
        "Google's new-advertiser offer in Israel as of November 2026, seen in our Partner account on 2026-11-12: spend 1,500 NIS within a set window after starting, get 1,500 NIS in ad credit; for businesses that never advertised on Google Ads; Google checks eligibility, sets the terms and can change or end it (docs/specs/ads-bot-phase2-volume-reality-2026-11-12.md, update of 2026-11-12; Dror 2026-11-12)"
      ],
      "short": "נכון לנובמבר 2026, גוגל מציע למי שמעולם לא פרסם ב־Google Ads מבצע של 1,500 ₪ קרדיט על הוצאה של 1,500 ₪, בכפוף לבדיקת זכאות ולתנאים שלו."
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
    "What will a real enquiry cost me in my trade? The readiness gate uses an expected cost per enquiry internally, but there is no per-trade range he can be shown before launch, so the honest answer stays general.",
    "Does the per-trade click ceiling still hold in enquiry mode? The facts define the ceiling for stage one only and state no cap for enquiry mode, which is exactly the follow-up a burned owner asks after q10.",
    "Has anyone actually reached enquiry mode, and what changed for them? The automatic switch is not live and verified yet, so there is no live case or outcome to point at — only the designed-to plan.",
    "What exactly do I have to do to get the 30-day refund, and what voids it? Terms §7 conditions are not spelled out in the brief, so the answer can name the term but cannot state the condition in one plain line.",
    "What happens to my campaign, my landing page and my lead list the day I leave? No exit mechanics in the facts: who owns the landing page, whether it stays live, and what stays accessible in the account.",
    "Can I add a second service or a second campaign later, and what does that cost? The facts cover one main service and one group only, with no expansion path or pricing.",
    "Who is the person that steps in when the system cannot answer, and how fast do they reply? Support facts give no role and no response time, and both a name and a response time are barred here, so this question has no honest answer yet.",
    "The stop switch and the activity log are on HOLD until their gate passes, so q04 and q16 run on proven wording only: the account in his name, no commitment, stop any month. Bring the switch and the log back once the gate passes.",
    "The per-trade click ceiling carries no published number (Adam ruling). q10 says it is set for his trade without a figure; if a per-trade table is ever approved, q10 can name his actual ceiling."
  ],
  "changes": [
    {
      "id": "angle",
      "why": "Removed the ₪15 figure per Adam's per-trade cap ruling; now 'the per-trade click ceiling'."
    },
    {
      "id": "q01",
      "why": "Noa: dropped 'שלושה דברים' and fixed the counting line to 'רק פניות שסימנת כאמיתיות'. Dror: dropped 'כל' from the send-back and tied it to the click that brought it. Short aligned."
    },
    {
      "id": "q02",
      "why": "Accepted Noa's YELLOW: תקציב המדיה → תקציב הפרסום, the word a tradesman actually says; applied file-wide so one concept keeps one name."
    },
    {
      "id": "q03",
      "why": "Dror's billing truth: he pays the ad budget directly to Google from the account opened in his name, in Noa's 'שנפתח על שמך' form; 'stays yours' kept. תקציב הפרסום. Short and facts aligned."
    },
    {
      "id": "q04",
      "why": "HOLD per Adam: cut 'you see every click' and the activity log; kept Noa's proven wording — new Google Ads account in his name, built from scratch. Short and facts aligned."
    },
    {
      "id": "q05",
      "why": "Added Dror's suspended-account warning (Circumventing systems policy 15938075): tell us first, a new account is not allowed then. Google masculine."
    },
    {
      "id": "q06",
      "why": "Noa's exact replacements: 'לפני שהקמפיין עולה לאוויר' and 'יותר ממה שהעבודה שלך מצדיקה'."
    },
    {
      "id": "q07",
      "why": "Accepted Noa's YELLOW: dropped 'וקבוצה אחת' — internal ad-group structure means nothing to the owner; the focus benefit carries the line."
    },
    {
      "id": "q08",
      "why": "Noa's headline/description split; Dror: extensions show when Google chooses, written active with masculine גוגל; last line scoped to enquiries in the list, no 'every' (Dror E4-08). Short aligned."
    },
    {
      "id": "q09",
      "why": "Dror E7-02: one-time approval, conditional 'יכול לחסום', the bar set from his business, and no enquiry he marked real; Noa's 'שקיבלו'. Short aligned."
    },
    {
      "id": "q10",
      "why": "Adam: per-trade ceiling, no ₪15 number. Accepted Noa's YELLOW עד התקרה. Google masculine: גוגל עצמו אומר. Short and facts aligned."
    },
    {
      "id": "q11",
      "why": "Dror: leads with Google's own invalid-click fact (Help 42995), our filter second, dropped 'every day'; ad clicks are קליקים not לחיצות per the cross-file rule. Short and facts aligned."
    },
    {
      "id": "q12",
      "why": "Noa RED: בעצמי in the question; SALE: one tap, seconds per enquiry. Dror: enquiries scoped to the page (E4-07) and 'בתוך הגבולות שאישרת' (soft fix, accepted)."
    },
    {
      "id": "q13",
      "why": "Noa's exact replacement: 'ולא יכול לעבור למצב פניות'. No switch claim, so no designed-to frame needed."
    },
    {
      "id": "q14",
      "why": "Adam: מתוכנן for the switch and the rollback, 'ולפחות שתי עבודות שנסגרו', area dropped; Noa's budget line 'איזה תקציב כן יביא אותך לשם'. Short and facts aligned."
    },
    {
      "id": "q15",
      "why": "Dror: the free demo shows a complete plan on a sample business before paying; enquiries scoped to the page, no 'all'. Short aligned."
    },
    {
      "id": "q16",
      "why": "HOLD per Adam: cut the stop switch and the activity log; kept the proven term (no commitment, stop any month) plus approval inside visible limits, which passed. Short and facts aligned."
    },
    {
      "id": "q17",
      "why": "Google masculine throughout; Noa: dated 'נכון לנובמבר 2026' and ב־Google Ads; Dror: the spend must happen within a set window after he starts; 'על מדיה' → 'על מודעות' to match the תקציב הפרסום wording. Short and facts aligned."
    },
    {
      "id": "flags",
      "why": "Removed area talk and the ₪15 figure; added the HOLD note for q04/q16 and the missing per-trade ceiling number, so nothing shrinks silently."
    }
  ]
}

## NOA FINAL
# Noa: final pass on round 2 (2026-11-12)

Saved by Adam; replacement strings are copied verbatim. All earlier RED/ORANGE items are resolved. Remaining FIXes are below.

## Adam's rulings
- **q09 "חינם":** option A. Drop `חינם, ` from the list (true now and after the phrase change).
- **A3:** use Noa's line `[calm] עם בוט מודעות, פניות נוחתות ברשימה אחת בטלפון שלך, ואתה מסמן מה אמיתי.` It also satisfies Dror's "from your page" concern, since no "all" is implied. Tamar may add "מהדף" if it still reads naturally by ear.
- **Shared elements:** the "בקצרה" box and the glossary fixes come ONLY from the article file. The how-it-works file's `article_elements` and `glossary_fixes` are discarded.
- **The A1 voice line "המודעות עוברות"** stays as approved earlier: the scripts file holds Noa's final A1 lines.
- **The how-it-works ppc_cta_branch href** goes to DEMO_HREF to match its "דמו חינם" label.

## Explainer A
- E2-05 (both): `ומהיום הראשון יש רשימת חסימות: חינם, קורסים, יד שנייה, מחפשי עבודה.` → `ומהיום הראשון יש רשימת חסימות: קורסים, יד שנייה, מחפשי עבודה.` E2-01 screen: "free" → "free download".
- E2-07 (both): `גוגל חוסם רק מילים שברשימה, לא דומות. הבוט בוחר כל מילה בכוונה.` → `גוגל חוסם רק את המילים שברשימה, לא מילים דומות. הבוט בוחר כל מילה בכוונה.`
- E4-08 (voice only): `ולכל פנייה רשום הקליק שהביא אותה.` → `ולכל פנייה רָשׁוּם הקליק שהביא אותה.`
- E3-05 (Dror, low priority): `כל כותרת מציגה יתרון אחר` makes the "every headline" claim. Soften it.

## Explainer B
- E7-04 (voice + display): `הוא חוסם רק את הניסוח הזה — לא נושא שלם ולא מילה בודדת.` → `הוא חוסם רק את הניסוח הזה, לא נושא שלם ולא מילה בודדת.`
- E8-06:
  - voice `בתקציב המינימום זה בדרך כלל חודשיים עד שלושה, ולא כל עסק מגיע לזה.` → `בתקציב המינימום אנחנו מעריכים חודשיים עד שלושה, ולא כל עסק מגיע לזה.`
  - display `בתקציב המינימום זה בדרך כלל חודשיים־שלושה, ולא כל עסק מגיע לזה.` → `בתקציב המינימום אנחנו מעריכים חודשיים־שלושה, ולא כל עסק מגיע לזה.`
  - screen card `בתקציב המינימום: בדרך כלל חודשיים־שלושה` → `הערכה: חודשיים־שלושה בתקציב המינימום`
- E8-07 (both): `אם לא, הוא נשאר במצב קליקים וממשיך לעבוד.` → `אם לא, הקמפיין נשאר במצב קליקים וממשיך לעבוד.`
- E6-03 (both): `אתה מסמן כל אחת בלחיצה: אמיתית או זבל.` → `אתה מסמן כל אחת בלחיצה: אמיתית או לא.`; title `התפקיד שלך: אמיתית או זבל` → `התפקיד שלך: אמיתית או לא`
- E6-02 (both): `טופס, לחיצה על כפתור החיוג, או וואטסאפ.` → `טופס, לחיצה על כפתור החיוג או וואטסאפ.`
- E7-01 (Dror, soft): "sees in Google's report which searches brought the clicks".

## 30s / 15s
- ad_30 R07 and ad_15 R03 (voice): `[excited] WAO. בוט מודעות: 249 ₪ + מע״מ לחודש.` → `[excited] WAO. בוט מודעות, מאתיים ארבעים ותשעה שקל פלוס מע״מ לחודש.` Display unchanged. The WAO tag waits on Eitan's tone test.
- YELLOW: "זבל" in R03 / ad_15 R02 vs the screen's "לא אמיתית" (Tamar).

## A3
See Adam's ruling (both cuts). Display: `עם בוט מודעות, פניות נוחתות ברשימה אחת בטלפון שלך, ואתה מסמן מה אמיתי.`

## Situation shorts
- S1-05 / S2-05 / S3-05 alt closings:
  - voice `[excited] WAO. בוט מודעות — הדמו פתוח על עסק לדוגמה.` → `[excited] WAO. בוט מודעות. דמו חינם, על עסק לדוגמה.`
  - display `WAO. בוט מודעות — הדמו פתוח על עסק לדוגמה` → `WAO. בוט מודעות. דמו חינם, על עסק לדוגמה`
  - caption `הדמו פתוח` → `דמו חינם`
- S1-03 (both): `אתה מסמן לא אמיתית, והיא לא נספרת.` → `אתה מסמן לא אמיתית, והפנייה לא נספרת.`
- YELLOW S1-02 direction: `דרושים וקורס? חסומים מראש.`

## FAQ
- q08 q: `מה המודעה שלי תגיד, ולאן מי שלוחץ מגיע?` → `מה המודעה שלי תגיד, ולאן מגיע מי שמקליק עליה?`
- q08 a: `מי שלוחץ מגיע לדף נחיתה` → `מי שמקליק מגיע לדף נחיתה`
- q11 q: `מישהו יכול ללחוץ לי על המודעה כל היום.` → `מישהו יכול להקליק לי על המודעה כל היום.`
- q09: `ופנייה שסימנת כזבל לא נספרת כתוצאה.` → `ופנייה שסימנת ״לא אמיתית״ לא נספרת כתוצאה.`
- q12: `לחיצה אחת מסמנת פנייה כאמיתית או כזבל,` → `לחיצה אחת מסמנת פנייה: אמיתית או לא,`
- q09 (a + short): `באישור החד פעמי שלך` → `באישור החד־פעמי שלך`
- q03: `מעל הסכום שאתה קבעת` → `מעל הסכום שקבעת`
- q14:
  - a `בתקציב המינימלי זה בדרך כלל לוקח חודשיים עד שלושה.` → `בתקציב המינימלי אנחנו מעריכים חודשיים עד שלושה.`
  - short `ובתקציב המינימלי זה בדרך כלל חודשיים־שלושה.` → `ובתקציב המינימלי אנחנו מעריכים חודשיים־שלושה.`
  - Dror: the "we then show you the budget" line is the planned frame (phase 2).
- q09: drop `חינם, ` (option A).
- q06: `המערכת מסתכלת על כמה אנשים באמת מחפשים את השירות שלך ומה עולה קליק בביטויים האלה.` → `המערכת בודקת את ההערכות של גוגל: כמה אנשים מחפשים את השירות שלך ומה עולה קליק בביטויים האלה.`; short `נפח חיפוש אמיתי` → `את הערכות החיפוש של גוגל`
- q01: `אנחנו בודקים ביקוש אמיתי ומחירי קליקים לפני ההשקה` → `אנחנו בודקים את הביקוש ואת מחירי הקליקים לפני ההשקה`. Dror: "the only thing the account counts AS A RESULT is an enquiry you marked real."
- q07 (Dror, soft): "at the minimum budget, splitting it across every service leaves each too few clicks to learn what works".

## How-it-works page
- Answer block: `העיקרון שלו: כל שקל עובד בתוך תקרה, וכל פעולה אוטומטית מחכה לאישור שלך.` → `העיקרון שלו: כל שקל עובד בתוך תקרה, והבוט פועל רק אחרי שאישרת.`
- Step 6 H2: `התקציב שלך נשמר בתקרות, וכל פעולה מחכה לאישור שלך` → `התקציב שלך נשמר בתקרות, והבוט פועל רק אחרי שאישרת`
- Step 5: `שיעור הקליקים הצפוי, התאמת המודעה, חוויית העמוד.` → `שיעור הקליקים הצפוי, רלוונטיות המודעה וחוויית המשתמש בדף הנחיתה.`
- Step 7: `החסימה היא על אותו ניסוח חיפוש בלבד, ואף פעם לא בחסימה גורפת.` → `החסימה היא רק על אותו ניסוח חיפוש, אף פעם לא על נושא שלם.`
- Dror:
  - Intro: "AS A RESULT".
  - Step 3 ¶2: "and, with your one-time approval, adds wasteful searches it finds later (step 7)".
  - Step 6: add Google's invalid-click billing fact.
  - Step 7 ¶2: no "each/every".
  - Step 8 ¶2 tail and you_see: "the plan is that you'll see the budget…".
- YELLOW: Step 5 `שלושה כפתורים: טופס` → `שלוש דרכים לפנות אליך: טופס, חיוג, וואטסאפ`; keep one "principle" line (answer block vs intro); step 7's analogy mixes "בראש" and "פנקס".

## Nurture (PARKED; copy only)
- M1: `גוגל לא יחסום אותם בשבילך.` → `גוגל לא יחסום את החיפושים האלה בשבילך.`
- M3: `יכולים להוזיל את הקליק.` → `יכולים להוזיל את מחיר הקליק.`; `ושם השירות בכותרת.` → `ושם השירות מופיע בכותרת.`
- M5: cut `אתה סופר פניות שאישרת בעצמך. `
- sender_footer: `WAO, {{company_address}}. ליצירת קשר: {{contact_link}}` → `שולח: WAO, {{company_address}}. ליצירת קשר: {{contact_link}}`
- YELLOW: M1 and M5 share an ending; M5 subject direction `אצל בוט מודעות, הפניות מהדף…`; M4 `גם אם תנהל את הקמפיין לבד`.

## Quality Score article
- Box row 2: `כן — זה המכרז` → `כן, הוא מה שמכריע`
- Row 3 and FAQ 4: `משוב על מגוון הטקסטים והקשר שלהם למילות המפתח` → `משוב על מגוון הטקסטים ועד כמה הם קשורים למילות המפתח`
- FAQ 5: `למשל ״לבד״, אם אתה לא עובד ככה.` → `למשל ״קורס״, אם אתה לא מלמד את המקצוע.`
- S5 bullet 1: `קבוצת מילות מפתח אחת לכל שירות` → `קבוצת מודעות אחת לכל שירות`; FAQ 6: `כל שירות בקבוצת מילות מפתח משלו` → `כל שירות בקבוצת מודעות משלו`
- Glossary 334: `הקשר החיפוש והנכסים.` → `הקשר החיפוש וההשפעה הצפויה של נכסי המודעה.`
- Glossary 329: `שמשווה את איכות המודעה שלך למפרסמים אחרים` → `שמשווה את איכות המודעה שלך לזו של מפרסמים אחרים`; `יכולים להוזיל קליקים` → `יכולים להוזיל את מחיר הקליק`
- Yonatan A1: Ad Strength = `חוזק המודעה` everywhere (H2 head `חוזק המודעה: …`), scale "מנמוך עד מצוין". Dror's optimization-score note and sources line. Yonatan A2: the CTA text must not be `איך בוט מודעות עובד` / `פרסום בגוגל`; use a demo-led label (href /google-ads).
- YELLOW: `במילים שלך:` → `בתכל׳ס:`; `הרחבות` means nothing to the owner.

## Pronunciation test
- Add the production lines: the price in words; `אתה מסמן לא אמיתית, והפנייה לא נספרת.`; the A3 line; הַקּוּפָּה. Swap n34 (`פניית זבל ומוחק אותה`) for the לא אמיתית line; n24 `נותן לחיצה` → `לוחץ`.
- Round-5 risk list (Noa): WAO with [excited] at line start, mid-line and on its own line; גוגל/בְּגוּגֶל; גוגל אדס/אֶדְס; Quality Score; Ad Rank; וואטסאפ; קליק; פנייה; פְּנִיּוֹת; לפניות; מצב קליקים/פניות; כפתור החיוג; כאמיתית; לא אמיתית; זֶבֶל; נִסְפֶּרֶת; הַקּוּפָּה; שָׂם; סָגוּר; חָסוּם; רָשׁוּם; מְרַכֵּז; מְכַוֵּן; שֶׁסָּגַרְתָּ; שנסגרו; מתג; מתוכנן; יומן; דולק; כבוי; מערבב; מייחד; להוזיל; חוסם; מחפשי עבודה; הַדּוּחַ; וּכמה; numbers as words (חמש עשרה, שישים, שתי, חמישים, חמישה, חודשיים עד שלושה, מאתיים ארבעים ותשעה שקל פלוס מע״מ); חד פעמי; יד שנייה; דמו חינם; spoken quotes; תיירים vs סקרנים; [dry] vs [deadpan]; avoid ותק in voice.

## Leads-page subtitles (Adam adds; Tamar → Noa)
- src/app/(app)/leads/page.tsx:30: `סמן ליד איכותי, ועדכן הכנסה כשסוגרים עסקה — זה מאמן את גוגל לשלוח לידים טובים יותר.` must use the new labels (אמיתית / לא אמיתית) and drop the false "trains Google" claim.
- src/app/(product)/client/leads/page.tsx:44: `…סמן ליד איכותי, ועדכן כשסגרת עסקה.` must use the new labels.

## Writing upgrades proposed (Adam decides)
1. After a rewrite changes a subject or number, re-check every later pronoun that referred to it.
2. In voiced lines, a pronoun's antecedent sits in the same short and is the nearest noun of matching gender.
3. After a word swap, re-read the rest of the clause.
4. In voiced lines, a verb that's also a common noun gets niqqud or is replaced (this replaces batch A #3).
5. A shared element is authored in exactly one deliverable.

## DROR ROUND 2
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

## YONATAN ROUND 2
# Yonatan: round-2 anchor sign-off (2026-11-12)

Saved by Adam from Yonatan's hand-back.

## How-it-works page: PASS
- **H1** `איך בוט מודעות עובד: שמונה צעדים מהחיפוש ועד הפנייה`; **title** `איך בוט מודעות עובד: 8 צעדים מהחיפוש בגוגל ועד הפנייה` + template `‏ | WAO`. Product-name swap confirmed.
- **Hub mechanism → page:** anchor `איך בוט מודעות עובד` (reserved for /google-ads/how-it-works only).
- **Step 5 → article:** `ציון איכות` → /knowledge/google-ads-quality-score.
- **Closing → hub:** `פרסום בגוגל` → /google-ads, once.
- **Closing button:** `דמו חינם על עסק לדוגמה` → DEMO_HREF.
- **Schema:** Breadcrumb דף הבית › פרסום בגוגל › איך זה עובד; WebPage about /google-ads#service; no HowTo, FAQPage or Offer; sitemap entry; SiloNav "פרסום בגוגל" silo (hub + 2 spokes). Meta: option 1.
- **Housekeeping:** this file's `article_elements` and `glossary_fixes` blocks are IGNORED. The article file is the only source for the article, and Noa/Dror pick ONE glossary-fix draft before the engineer applies B5.
- **Maya:** check how `WAO (Ads Bot)` renders in the answer block (.tsx, no renderMixed).

## Quality Score article: CONDITIONS
Slug, H1, metaTitle (with the literal `‏ | WAO`; page.tsx renders it as absolute), titleShort, summary, B3, B4 (i), (ii), (iv), B5 (glossaryTerms off), B6 and B7 all PASS.
- **A1:** Ad Strength's Hebrew term is `חוזק המודעה` (Google Help 9921843 iw: "מדד חוזק המודעה"; labels נמוך / ממוצע / טוב / מצוין). Replace "עוצמת מודעה" everywhere (section 4 H2 and definition, box row, FAQ 4). Approved H2 head: `חוזק המודעה: פתק מהעורך, לא ציון במכרז` (the wording after the colon may change; the head term stays). Tamar → Noa.
- **A2:** the CTA button text must NOT be `איך בוט מודעות עובד` or `פרסום בגוגל`. The href stays /google-ads. Use a demo-led label. Tamar → Noa.
- **A3:** the breadcrumb follows the template: `ראשי › מאגר ידע › ציון איכות ודירוג מודעה` (engineer; no code change).
- **A4:** the sources line must link all 4 topics. Dror adds Ad Strength (9921843) and negative keywords (2453972), and sources the Optimization Score note against Help 9061546 ("ציון האופטימיזציה", 0–100%: how well the account settings support its performance potential). Dror → Tamar if the wording changes.
- **B8** (not blocking): DataForSEO volume/AIO check later.
- **Publish day:** Dror re-reads every Google statement; updatedDate = publish day.
