# Final round 3: ads-bot-explainer-a-before-launch (2026-11-12)

This is the last polish. Your round-2 output is pasted below. Apply ONLY the remaining items that concern THIS file, from:
- Noa's final pass (exact replacements; binding on Hebrew)
- Dror's round-2 re-check (binding on facts)
- Yonatan's round-2 sign-off (binding on anchors and terms)

All three are pasted below, and Adam's rulings at the top of each override everything else. YELLOW items are your call. Keep every other line byte-for-byte. Return the COMPLETE output in the same JSON shape, plus "changes": [{"id": "...", "why": "..."}].

## ROUND 2 OUTPUT
{
  "angle": "He is product-aware and has been burned by 'leave it to us', so the through-line is 'watch every gate your money passes before it is spent': the demand math, one service with a refusal list, an ad built from his own facts, and a page that repeats his search. Each episode shows one inspectable decision on a real screen instead of a promise, in a calm voice that never sells a result.",
  "series_title": "לפני השקל הראשון",
  "episodes": {
    "E1": {
      "title": "קודם חשבון, אחר כך פרסום",
      "lines": [
        {
          "beat": "E1-01",
          "voice": "אתה מכיר את זה: שילמת על קליקים, והטלפון שתק.",
          "display": "אתה מכיר את זה: שילמת על קליקים, והטלפון שתק.",
          "screen": "Plain card: a work phone lying silent on a van dashboard, no notifications.",
          "tag_why": "No tag — the pain scene is read flat and dry."
        },
        {
          "beat": "E1-02",
          "voice": "בוט מודעות של [excited] WAO מתחיל בבדיקה, לא בפרסום.",
          "display": "בוט מודעות של WAO מתחיל בבדיקה, לא בפרסום.",
          "screen": "Plain brand card: WAO wordmark with the product name בוט מודעות, no Google logo.",
          "tag_why": "The episode's single [excited], directly before WAO, on the line that names בוט מודעות."
        },
        {
          "beat": "E1-03",
          "voice": "הוא שואל אותך כמה שווה לך עבודה וכמה פניות אתה סוגר.",
          "display": "הוא שואל אותך כמה שווה לך עבודה וכמה פניות אתה סוגר.",
          "screen": "Demo opening chat: the bot asks the plumber what a job is worth and how many enquiries he closes.",
          "tag_why": "No tag — a calm question, not a sell."
        },
        {
          "beat": "E1-04",
          "voice": "ואז הוא בודק בגוגל כמה אנשים מחפשים את השירות שלך.",
          "display": "ואז הוא בודק בגוגל כמה אנשים מחפשים את השירות שלך.",
          "screen": "Demand-readiness screen: real search volume for the plumber's main service.",
          "tag_why": "No tag — the data is stated as a fact."
        },
        {
          "beat": "E1-05",
          "voice": "וכמה עולה קליק אחד על המודעה.",
          "display": "וכמה עולה קליק אחד על המודעה.",
          "screen": "Demand-readiness screen: the expected cost-per-click line highlighted.",
          "tag_why": "No tag — short punch, kept flat."
        },
        {
          "beat": "E1-06",
          "voice": "המחיר הזה חייב להסתדר עם מה שאתה לוקח על עבודה.",
          "display": "המחיר הזה חייב להסתדר עם מה שאתה לוקח על עבודה.",
          "screen": "Demand-readiness screen: the click cost beside the plumber's average job value.",
          "tag_why": "No tag — the math is read like a tradesman's check."
        },
        {
          "beat": "E1-07",
          "voice": "אם לא, הבוט לא מפרסם.",
          "display": "אם לא, הבוט לא מפרסם.",
          "screen": "Demand-readiness verdict: the stop state, campaign not created.",
          "tag_why": "No tag — the refusal lands harder without lift."
        },
        {
          "beat": "E1-08",
          "voice": "וגם כשהמספרים מסתדרים, הפרסום נשאר כבוי עד שראית את התוכנית.",
          "display": "וגם כשהמספרים מסתדרים, הפרסום נשאר כבוי עד שראית את התוכנית.",
          "screen": "Campaign screen: the new campaign shown paused, with the full plan preview open.",
          "tag_why": "No tag — the gate is a calm promise, not excitement."
        }
      ]
    },
    "E2": {
      "title": "שירות אחד, ורשימת מילים חסומות",
      "lines": [
        {
          "beat": "E2-01",
          "voice": "לא כל מי שמקליד בגוגל הוא לקוח שלך.",
          "display": "לא כל מי שמקליד בגוגל הוא לקוח שלך.",
          "screen": "Plain card: three typed searches that are not customers — job seeker, free, DIY course.",
          "tag_why": "No tag — the hook stays dry."
        },
        {
          "beat": "E2-02",
          "voice": "בוט מודעות של [excited] WAO בוחר את השירות שהכי משתלם לך.",
          "display": "בוט מודעות של WAO בוחר את השירות שהכי משתלם לך.",
          "screen": "Demo chat: the bot confirms the plumber's one main, most profitable service.",
          "tag_why": "Single [excited] before WAO on the product-name line; the rest is calm."
        },
        {
          "beat": "E2-03",
          "voice": "רק שלוש עד חמש מילות חיפוש, כולן לאותו שירות.",
          "display": "רק שלוש עד חמש מילות חיפוש, כולן לאותו שירות.",
          "screen": "Campaign build screen: one ad group holding three to five phrases, all for that service.",
          "tag_why": "No tag — a restriction stated plainly."
        },
        {
          "beat": "E2-04",
          "voice": "המודעה מופיעה רק כשמחפשים את השירות שלך, גם במילים אחרות.",
          "display": "המודעה מופיעה רק כשמחפשים את השירות שלך, גם במילים אחרות.",
          "screen": "Campaign build screen: the phrase-match setting on the keywords.",
          "tag_why": "No tag — precision is a fact, not a boast."
        },
        {
          "beat": "E2-05",
          "voice": "ומהיום הראשון יש רשימת חסימות: חינם, קורסים, יד שנייה, מחפשי עבודה.",
          "display": "ומהיום הראשון יש רשימת חסימות: חינם, קורסים, יד שנייה, מחפשי עבודה.",
          "screen": "Campaign build screen: a demo day-one negative list — free, courses, second hand, job seekers. Not the live list until fix 3 ships (it still contains מחיר).",
          "tag_why": "No tag — the list is read like an inventory."
        },
        {
          "beat": "E2-06",
          "voice": "היא כוללת גם מה שאמרת לבוט שאתה לא עושה.",
          "display": "היא כוללת גם מה שאמרת לבוט שאתה לא עושה.",
          "screen": "Demo chat: the plumber says what he does not do; that phrase joins the block list.",
          "tag_why": "No tag — his own words, kept flat."
        },
        {
          "beat": "E2-07",
          "voice": "גוגל חוסם רק מילים שברשימה, לא דומות. הבוט בוחר כל מילה בכוונה.",
          "display": "גוגל חוסם רק מילים שברשימה, לא דומות. הבוט בוחר כל מילה בכוונה.",
          "screen": "Plain card: the block list with a note that Google blocks only the listed word itself.",
          "tag_why": "No tag — Google's rule and the deliberate build, read flat."
        },
        {
          "beat": "E2-08",
          "voice": "המודעות מופיעות רק בתוצאות חיפוש, לא כבאנרים באתרים.",
          "display": "המודעות מופיעות רק בתוצאות חיפוש, לא כבאנרים באתרים.",
          "screen": "Campaign settings card: text ads in search results only, no display banners.",
          "tag_why": "No tag — the boundary is calm."
        }
      ]
    },
    "E3": {
      "title": "המודעה נבנית מהאמת שלך",
      "lines": [
        {
          "beat": "E3-01",
          "voice": "שלוש מודעות בגוגל, וכולן אומרות ״שירות מקצועי, מחיר הוגן״.",
          "display": "שלוש מודעות בגוגל, וכולן אומרות ״שירות מקצועי, מחיר הוגן״.",
          "screen": "Plain card: three look-alike ad texts, all saying professional service and a fair price.",
          "tag_why": "No tag — the generic scene is read with a straight face."
        },
        {
          "beat": "E3-02",
          "voice": "בוט מודעות של [excited] WAO שואל אותך מה מייחד אותך.",
          "display": "בוט מודעות של WAO שואל אותך מה מייחד אותך.",
          "screen": "Demo chat: the bot asks the plumber what makes him different.",
          "tag_why": "Single [excited] before WAO on the product-name line."
        },
        {
          "beat": "E3-03",
          "voice": "אחריות, רישיון, שנות ניסיון, וכמה מהר אתה מגיע.",
          "display": "אחריות, רישיון, שנות ניסיון, וכמה מהר אתה מגיע.",
          "screen": "Demo chat: his answers — guarantee, licence, years in the trade, arrival time.",
          "tag_why": "No tag — his facts, listed calmly."
        },
        {
          "beat": "E3-04",
          "voice": "מהתשובות הוא בונה עד חמש עשרה כותרות וארבעה תיאורים.",
          "display": "מהתשובות הוא בונה עד חמש עשרה כותרות וארבעה תיאורים.",
          "screen": "Ad build screen: up to fifteen headlines and four descriptions filled for the plumber.",
          "tag_why": "No tag — the structure is a fact."
        },
        {
          "beat": "E3-05",
          "voice": "כל כותרת מציגה יתרון אחר, לא אותו משפט במילים אחרות.",
          "display": "כל כותרת מציגה יתרון אחר, לא אותו משפט במילים אחרות.",
          "screen": "Ad build screen: two headlines highlighted, each a different selling point.",
          "tag_why": "No tag — the differentiator is stated, not hyped."
        },
        {
          "beat": "E3-06",
          "voice": "השירות המרכזי שלך מופיע בכותרות.",
          "display": "השירות המרכזי שלך מופיע בכותרות.",
          "screen": "Ad build screen: the main service name written into the headlines.",
          "tag_why": "No tag — a detail, kept flat."
        },
        {
          "beat": "E3-07",
          "voice": "גוגל מערבב את הכותרות, ומחליט בכל חיפוש מה להציג.",
          "display": "גוגל מערבב את הכותרות, ומחליט בכל חיפוש מה להציג.",
          "screen": "Plain preview card: two different headline combinations of the same ad.",
          "tag_why": "No tag — Google's action, neutral."
        },
        {
          "beat": "E3-08",
          "voice": "לפעמים גוגל מוסיף מתחת למודעה כפתור חיוג או תמונות שלך.",
          "display": "לפעמים גוגל מוסיף מתחת למודעה כפתור חיוג או תמונות שלך.",
          "screen": "Ad assets screen: call asset with the plumber's number; his own photos only once the account is eligible for image assets (usually not in the first weeks).",
          "tag_why": "No tag — the hedge 'לפעמים' must stay calm and honest."
        }
      ]
    },
    "E4": {
      "title": "הדף ממשיך את החיפוש",
      "lines": [
        {
          "beat": "E4-01",
          "voice": "מישהו מחפש תיקון ברז, ומגיע לדף שמדבר על הכול.",
          "display": "מישהו מחפש תיקון ברז, ומגיע לדף שמדבר על הכול.",
          "screen": "Plain card: a tap-repair search above a generic page that talks about everything.",
          "tag_why": "No tag — the mismatch scene is dry."
        },
        {
          "beat": "E4-02",
          "voice": "בוט מודעות של [excited] WAO בונה דף שמדבר רק על השירות שלך.",
          "display": "בוט מודעות של WAO בונה דף שמדבר רק על השירות שלך.",
          "screen": "Landing-page builder: the dedicated page generated for the plumber's one service.",
          "tag_why": "Single [excited] before WAO on the product-name line."
        },
        {
          "beat": "E4-03",
          "voice": "הכותרת של הדף חייבת להכיל את שם השירות שחיפשו.",
          "display": "הכותרת של הדף חייבת להכיל את שם השירות שחיפשו.",
          "screen": "Landing page hero: the headline containing the exact searched service name.",
          "tag_why": "No tag — the hard rule is stated plainly."
        },
        {
          "beat": "E4-04",
          "voice": "גוגל בודק גם את הדף, לא רק את המודעה.",
          "display": "גוגל בודק גם את הדף, לא רק את המודעה.",
          "screen": "Plain card: two checks side by side — the ad and the landing page.",
          "tag_why": "No tag — Google's check, neutral."
        },
        {
          "beat": "E4-05",
          "voice": "לפי גוגל, איכות גבוהה יכולה להוזיל את מחיר הקליק.",
          "display": "לפי גוגל, איכות גבוהה יכולה להוזיל את מחיר הקליק.",
          "screen": "Plain quote card: Google's own help wording that higher quality can often lower click prices.",
          "tag_why": "No tag — an attributed quote must not sound like a promise."
        },
        {
          "beat": "E4-06",
          "voice": "בדף יש שלוש דרכים אליך: טופס, חיוג או וואטסאפ.",
          "display": "בדף יש שלוש דרכים אליך: טופס, חיוג או וואטסאפ.",
          "screen": "Landing page: the form, call button and WhatsApp button visible together.",
          "tag_why": "No tag — the three ways are an inventory."
        },
        {
          "beat": "E4-07",
          "voice": "הפניות מהדף נוחתות ברשימה אחת בטלפון שלך.",
          "display": "הפניות מהדף נוחתות ברשימה אחת בטלפון שלך.",
          "screen": "Client leads screen on a phone: form, call-tap and WhatsApp leads in one list; footage uses the אמיתית / לא אמיתית labels once the leads-mark-labels brief ships.",
          "tag_why": "No tag — the list is a calm gain."
        },
        {
          "beat": "E4-08",
          "voice": "ולכל פנייה רשום הקליק שהביא אותה.",
          "display": "ולכל פנייה רשום הקליק שהביא אותה.",
          "screen": "Lead detail card: the source ad click attached to the lead.",
          "tag_why": "No tag — the payoff is stated flat, like a fact."
        }
      ]
    }
  },
  "flags": [
    "Wanted to say the block list keeps updating as new waste searches appear; the brief cites Google's rule that such a list must be maintained, but no product fact commits the bot to ongoing updates, so E2 states only the day-one list.",
    "Wanted to give the pre-launch check as a concrete ceiling (a share of his average job value); saying it aloud would read as a promised cost per enquiry, so E1 keeps the math qualitative and lands only the stop decision.",
    "Wanted to close E1 with the bot's own honest line that the first month roughly breaks even; it is a real product behaviour but sits too close to the no-results rule, so I cut it rather than risk a payback promise."
  ],
  "changes": [
    {
      "id": "E1-02, E2-02, E3-02, E4-02",
      "why": "Voice only: [excited]WAO → [excited] WAO (Noa RED, all four places). Kept the tag mid-line and declined the split option — eight beats per episode stay intact and the product name still lands inside the promise."
    },
    {
      "id": "E1-01",
      "why": "שילמת על לחיצות → שילמת על קליקים (Noa exact; cross-file rule: ad click = קליק, page-button tap = לחיצה)."
    },
    {
      "id": "E1-04, E1-05",
      "why": "E1-05: וכמה עולה שם לחיצה אחת על המודעה → וכמה עולה קליק אחד על המודעה (Noa exact). Declined Dror's optional 'roughly' on both: no number is spoken, the estimate lives on the screen, and the punch stays."
    },
    {
      "id": "E1-08",
      "why": "גם כשכן, הבוט משאיר את הפרסום כבוי עד שאתה רואה את התוכנית → וגם כשהמספרים מסתדרים, הפרסום נשאר כבוי עד שראית את התוכנית (Noa exact; the gate is named concretely, 10 words instead of 12)."
    },
    {
      "id": "E2-04",
      "why": "המילים האלה חייבות להופיע במה שהלקוח מקליד → המודעה מופיעה רק כשמחפשים את השירות שלך, גם במילים אחרות (Dror binding: phrase match covers the meaning of the service, never literal words; 'גם במילים אחרות' says meaning-match in his language, 'רק' keeps loosely related searches out)."
    },
    {
      "id": "E2-05",
      "why": "ומיום ראשון → ומהיום הראשון (Noa RED: ordinal day carries the article). Screen switched to a demo negatives list — the live list still contains מחיר until fix 3 ships (Dror)."
    },
    {
      "id": "E2-06",
      "why": "שאמרת לו → שאמרת לבוט (Noa: names who he told)."
    },
    {
      "id": "E2-07",
      "why": "גוגל חוסם רק את המילה שברשימה, לא מילים דומות → גוגל חוסם רק מילים שברשימה, לא דומות. הבוט בוחר כל מילה בכוונה (Noa SALE: the deliberate word-by-word build now sits in the same line; compressed to hold 12 words, same truth, active voice with the bot as subject)."
    },
    {
      "id": "E2-08",
      "why": "הפרסום רץ רק בחיפוש בגוגל, לא באתרים אחרים → המודעות מופיעות רק בתוצאות חיפוש, לא כבאנרים באתרים (Dror binding: Search Partners is on, so no 'only Google'; Noa's exact form). Screen updated to match."
    },
    {
      "id": "E3-06",
      "why": "השירות המרכזי שלך מופיע בכותרת הראשונה → השירות המרכזי שלך מופיע בכותרות (Dror: headlines aren't pinned; position dropped from voice and screen)."
    },
    {
      "id": "E3-07",
      "why": "גוגל יוצר מהכותרות צירופים, ומחליט בכל חיפוש מה להציג → גוגל מערבב את הכותרות, ומחליט בכל חיפוש מה להציג (Noa exact; spoken form, masculine kept)."
    },
    {
      "id": "E3-08",
      "why": "Voice and display unchanged ('לפעמים' stays). Screen note added: image assets usually aren't eligible in a new account's first weeks (Dror)."
    },
    {
      "id": "E4-02",
      "why": "בונה לכל פרסום דף משלו → בונה דף שמדבר רק על השירות שלך (Noa: 'לכל פרסום' vague; the page is per service, matching E2's one-service rule, and the line now mirrors E4-01's generic page that talks about everything)."
    },
    {
      "id": "E4-05",
      "why": "מחיר הלחיצה → מחיר הקליק (Noa; cross-file rule). Declined the 'מוזילה לא פעם' option — 'יכולה להוזיל' keeps the attributed hedge this beat requires, in 9 words."
    },
    {
      "id": "E4-06",
      "why": "חיוג ווואטסאפ → חיוג או וואטסאפ (Noa exact; he picks one way in, not all three at once)."
    },
    {
      "id": "E4-07",
      "why": "כל הפניות האמיתיות נוחתות → הפניות מהדף נוחתות (Dror binding: calls from the ad's call button skip the list, so no 'all' enquiries; Noa RED combined). Screen notes the אמיתית / לא אמיתית labels once shipped (Adam)."
    },
    {
      "id": "E4-08",
      "why": "ואתה רואה מאיזו מודעה הגיע כל מי שלחץ → ולכל פנייה רשום הקליק שהביא אותה (Noa exact, Dror intent: each enquiry in the list tied to the ad click that brought it; 6 words)."
    },
    {
      "id": "word-counts",
      "why": "Voice words per episode after edits: E1 69, E2 77, E3 69, E4 67; longest single voiced line 12 words (E2-07). Every line not named above kept byte-for-byte."
    },
    {
      "id": "handoff",
      "why": "→ Noa to proof the four rewritten lines (E2-04, E2-07, E4-02, E4-07). → Eitan-Dev for the recording notes: demo negatives list, image-asset eligibility, leads-screen labels."
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
