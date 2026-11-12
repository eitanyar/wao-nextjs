# Revision round 2: ads-bot-explainer-b-running (2026-11-12)

You wrote round 1: the full output is pasted below under "ROUND 1 OUTPUT". The original brief is docs/copy/briefs/ads-bot-explainer-b-running-2026-11-12.md (its rules still bind, including the founder rule "less words, more punch").

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
  "angle": "Through-line: 'your money is guarded, and your only job is one tap' — each episode hands a problem-aware, trust-burned owner a visible control (cap, mark, block, built-to switch) instead of a result promise. I open each with the guardrail or the one-second action in his working day, then the mechanism, because he is solution-aware enough to want the how but allergic to 'leave it to us'.",
  "episodes": {
    "E5": {
      "title": "מה שומר על הכסף שלך",
      "lines": [
        {
          "beat": "E5-01",
          "voice": "חשבון המודעות חדש, והוא עוד לא מכיר את הלקוחות שלך.",
          "display": "חשבון המודעות חדש, והוא עוד לא מכיר את הלקוחות שלך.",
          "screen": "WAO Ads Bot dashboard for the demo plumber: a brand-new campaign, empty performance history.",
          "tag_why": "Hook: the account starts blind, so the owner needs a guardrail before anything else.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E5-02",
          "voice": "בוט מודעות של [excited] WAO מתחיל בתקרה של 15 ₪ ללחיצה על המודעה.",
          "display": "בוט מודעות של WAO מתחיל בתקרה של 15 ₪ ללחיצה על המודעה.",
          "screen": "WAO campaign settings for the demo plumber: maximum cost-per-click field set to 15 ₪.",
          "tag_why": "Names product and brand once; the 15 ₪ click ceiling is the first concrete guard, and 'לחיצה על המודעה' explains 'click' plainly.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E5-03",
          "voice": "הוא אף פעם לא מעלה את התקציב היומי מעל מה שקבעת.",
          "display": "הוא אף פעם לא מעלה את התקציב היומי מעל מה שקבעת.",
          "screen": "WAO autonomy settings: daily budget locked at the amount the owner set, no auto-increase.",
          "tag_why": "The budget guard in his words: the bot never raises what he set.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E5-04",
          "voice": "הוא לא מבקש עוד תקציב כשפנייה אמיתית עולה יותר מהגבול שחושב משווי העבודה שלך.",
          "display": "הוא לא מבקש עוד תקציב כשפנייה אמיתית עולה יותר מהגבול שחושב משווי העבודה שלך.",
          "screen": "WAO dashboard card: cost per real enquiry beside the limit computed from the plumber's job value; no budget-increase prompt shown.",
          "tag_why": "Second money guard: no push for more budget while a real enquiry costs above his job-value limit. States the bot's behavior, not a cost cap.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E5-05",
          "voice": "מסנן קליקים מזויפים יושב על הדף שהמודעה מובילה אליו, והבוט בודק כל יום שהוא דולק.",
          "display": "מסנן קליקים מזויפים יושב על הדף שהמודעה מובילה אליו, והבוט בודק כל יום שהוא דולק.",
          "screen": "WAO landing-page protection status for the demo plumber: fake-click filter ON, last daily check timestamp.",
          "tag_why": "Fake-click guard; marked removable so the episode still flows from the budget guards to the approval/limits beat without it.",
          "removable": true,
          "alt": null
        },
        {
          "beat": "E5-06",
          "voice": "הוא פועל לבד רק אחרי אישור חד־פעמי שלך, בגבולות שאתה רואה.",
          "display": "הוא פועל לבד רק אחרי אישור חד־פעמי שלך, בגבולות שאתה רואה.",
          "screen": "WAO autonomy consent screen: one-time approval toggle and the visible limits it authorizes.",
          "tag_why": "Autonomy is conditional on his one-time approval inside visible limits — answers 'leave it to us' distrust.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E5-07",
          "voice": "יש מתג עצירה, וכל פעולה שלו נרשמת ביומן.",
          "display": "יש מתג עצירה, וכל פעולה שלו נרשמת ביומן.",
          "screen": "WAO activity log for the demo plumber: recent bot actions listed; stop switch visible.",
          "tag_why": "Closes on control: a stop switch and a written log, so he can check everything.",
          "removable": false,
          "alt": null
        }
      ]
    },
    "E6": {
      "title": "התפקיד שלך: אמיתית או זבל",
      "lines": [
        {
          "beat": "E6-01",
          "voice": "בוט מודעות של [excited] WAO לא מנחש אילו פניות אמיתיות. אתה אומר לו.",
          "display": "בוט מודעות של WAO לא מנחש אילו פניות אמיתיות. אתה אומר לו.",
          "screen": "WAO Ads Bot leads screen for the demo plumber, first enquiries arriving.",
          "tag_why": "Hook + brand: the bot does not guess quality; the owner is the authority. Sets up his one-second job.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E6-02",
          "voice": "כל פנייה נוחתת ברשימה אחת: טופס, לחיצה על כפתור החיוג, או וואטסאפ.",
          "display": "כל פנייה נוחתת ברשימה אחת: טופס, לחיצה על כפתור החיוג, או וואטסאפ.",
          "screen": "WAO leads list: one form lead, one call-button tap, one WhatsApp tap in a single table.",
          "tag_why": "One list for every source; 'לחיצה על כפתור החיוג' keeps it a tap, not a recorded call.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E6-03",
          "voice": "אתה מסמן כל אחת בלחיצה: אמיתית או זבל.",
          "display": "אתה מסמן כל אחת בלחיצה: אמיתית או זבל.",
          "screen": "WAO leads table row: the real / junk toggle being tapped.",
          "tag_why": "The one-second action, in his words.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E6-04",
          "voice": "כשעבודה נסגרת, אתה מסמן סָגוּר וכותב כמה היא הייתה שווה.",
          "display": "כשעבודה נסגרת, אתה מסמן סגור וכותב כמה היא הייתה שווה.",
          "screen": "WAO leads table: a lead marked closed, the job-value amount field filled.",
          "tag_why": "Closed-job marking and value; niqqud on סָגוּר so it is heard as 'closed', not the imperative 'close'.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E6-05",
          "voice": "בחשבון המודעות, רק פנייה שסימנת כאמיתית היא תוצאה. לחיצות לא נספרות.",
          "display": "בחשבון המודעות, רק פנייה שסימנת כאמיתית היא תוצאה. לחיצות לא נספרות.",
          "screen": "WAO campaign goals view: only 'real enquiry' is the goal; clicks shown as recorded, not as goals.",
          "tag_why": "The core rule: only his real-marked enquiry counts as a result, not clicks.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E6-06",
          "voice": "כל פנייה אמיתית שסימנת נשלחת לגוגל מהיום הראשון, מחוברת ללחיצה שהביאה אותה.",
          "display": "כל פנייה אמיתית שסימנת נשלחת לגוגל מהיום הראשון, מחוברת ללחיצה שהביאה אותה.",
          "screen": "WAO lead detail: status 'sent to Google, tied to the click', with timestamp.",
          "tag_why": "Send-back fact, tied to the click; removable. Alt drops Google and says only that his marks are what the next stage is built on.",
          "removable": true,
          "alt": "הסימונים שלך הם מה שהשלב הבא של הקמפיין נבנה עליו."
        },
        {
          "beat": "E6-07",
          "voice": "בלי הסימונים שלך, לקמפיין אין על מה להיבנות.",
          "display": "בלי הסימונים שלך, לקמפיין אין על מה להיבנות.",
          "screen": "Plain card over the leads list: 'הסימונים שלך = הדלק של הקמפיין'.",
          "tag_why": "The fuel line: without his marks there is nothing to build on. Keeps the episode flowing if the send-back line is removed.",
          "removable": false,
          "alt": null
        }
      ]
    },
    "E7": {
      "title": "מה נחסם ומה מקודם",
      "lines": [
        {
          "beat": "E7-01",
          "voice": "בוט מודעות של [excited] WAO קורא מה אנשים באמת הקלידו לפני שלחצו על המודעה.",
          "display": "בוט מודעות של WAO קורא מה אנשים באמת הקלידו לפני שלחצו על המודעה.",
          "screen": "WAO search-terms report for the demo plumber: the actual typed queries listed.",
          "tag_why": "Hook + brand: the bot reads real typed searches, not guesses.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E7-02",
          "voice": "הוא חוסם חיפוש שצבר חמש לחיצות, עלה מעל רף שחושב מהעסק שלך, ולא הביא כלום.",
          "display": "הוא חוסם חיפוש שצבר חמש לחיצות, עלה מעל רף שחושב מהעסק שלך, ולא הביא כלום.",
          "screen": "WAO search-terms scoring: a query with 5+ clicks, cost above the computed bar, zero enquiries, marked blocked.",
          "tag_why": "The block rule compressed to a true sentence: 5 clicks, above his business-derived bar, nothing brought.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E7-03",
          "voice": "חיפוש שהמודעה הופיעה בו פחות מ־50 פעם לא נחסם אף פעם.",
          "display": "חיפוש שהמודעה הופיעה בו פחות מ־50 פעם לא נחסם אף פעם.",
          "screen": "WAO search-terms screen: a query under 50 showings marked 'watch only', not blocked.",
          "tag_why": "Thin-data guard: under 50 showings it is never blocked (the 20-showing ignore rule is subsumed).",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E7-04",
          "voice": "הוא חוסם רק את הביטוי הזה, בלי לגעת בחיפושים טובים.",
          "display": "הוא חוסם רק את הביטוי הזה, בלי לגעת בחיפושים טובים.",
          "screen": "WAO negative-keyword screen: the exact phrase blocked; no broad block applied.",
          "tag_why": "Precise block, never a loose one that could hide good searches.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E7-05",
          "voice": "חיפוש שהביא שתי פניות אמיתיות במחיר שעומד בגבול שלך הופך למילה שהקמפיין מחפש בכוונה.",
          "display": "חיפוש שהביא שתי פניות אמיתיות במחיר שעומד בגבול שלך הופך למילה שהקמפיין מחפש בכוונה.",
          "screen": "WAO search-terms screen: a query with 2 real enquiries within the limit promoted to its own keyword.",
          "tag_why": "The other direction: a proven search is promoted so the campaign goes after it on purpose. Plain words for 'keyword'.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E7-06",
          "voice": "זה מתחיל רק אחרי השבועיים הראשונים של הקמפיין.",
          "display": "זה מתחיל רק אחרי השבועיים הראשונים של הקמפיין.",
          "screen": "Plain card over the campaign timeline: 'מתחיל אחרי השבועיים הראשונים'.",
          "tag_why": "Timing guard: promotion starts only after the first two weeks.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E7-07",
          "voice": "הכול רץ באישור חד־פעמי שלך, לכל היותר פעם ביום.",
          "display": "הכול רץ באישור חד־פעמי שלך, לכל היותר פעם ביום.",
          "screen": "WAO autonomy settings: one-time approval, frequency capped at once per day.",
          "tag_why": "Closes on control: his approval, at most once a day.",
          "removable": false,
          "alt": null
        }
      ]
    },
    "E8": {
      "title": "מקליקים לפניות אמיתיות",
      "lines": [
        {
          "beat": "E8-01",
          "voice": "קליק הוא לא עבודה. בוט מודעות של [excited] WAO יודע את זה.",
          "display": "קליק הוא לא עבודה. בוט מודעות של WAO יודע את זה.",
          "screen": "WAO Ads Bot dashboard for the demo plumber: clicks and real enquiries as two separate counters.",
          "tag_why": "Founder's headline point opened as a scene: a click is not a job. Names product and brand once.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E8-02",
          "voice": "בהתחלה הקמפיין במצב קליקים, עם תקרה של 15 ₪ ללחיצה.",
          "display": "בהתחלה הקמפיין במצב קליקים, עם תקרה של 15 ₪ ללחיצה.",
          "screen": "WAO campaign screen: mode 'מצב קליקים', max cost-per-click 15 ₪.",
          "tag_why": "Stage one stated plainly: click mode under the 15 ₪ ceiling. Approved terms kept.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E8-03",
          "voice": "כל פנייה אמיתית שסימנת חוזרת לגוגל, מחוברת ללחיצה.",
          "display": "כל פנייה אמיתית שסימנת חוזרת לגוגל, מחוברת ללחיצה.",
          "screen": "WAO lead detail: real enquiry sent to Google, tied to the click.",
          "tag_why": "The send-back, factual; no claim that Google learns or shifts budget in stage one.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E8-04",
          "voice": "הקמפיין בנוי לעבור לבד למצב פניות, שבו גוגל מְכַוֶּנֶת לפנייות אמיתיות בלבד.",
          "display": "הקמפיין בנוי לעבור לבד למצב פניות, שבו גוגל מכוונת לפנייות אמיתיות בלבד.",
          "screen": "Plain card: 'מצב קליקים → מצב פניות', labelled 'בנוי לעבור לבד'.",
          "tag_why": "The built-to switch, never 'already switches'; enquiry mode aims at real enquiries only. Niqqud on מְכַוֶּנֶת so it is heard as active 'aims'.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E8-05",
          "voice": "התנאי הוא כ־15 פניות אמיתיות ב־60 יום, כולל שתי עבודות שֶׁסָּגַרְתָּ.",
          "display": "התנאי הוא כ־15 פניות אמיתיות ב־60 יום, כולל שתי עבודות שסגרת.",
          "screen": "Plain card: 'כ־15 פניות אמיתיות ב־60 יום, כולל 2 עבודות שנסגרו'.",
          "tag_why": "The design condition: ~15 real enquiries in 60 days, two of them closed jobs. Not attributed to Google, not a closed-jobs-only trigger. Niqqud on שֶׁסָּגַרְתָּ = 'you closed'.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E8-06",
          "voice": "בתקציב המינימום זה בדרך כלל חודשיים־שלושה, ולא כל עסק מגיע לזה.",
          "display": "בתקציב המינימום זה בדרך כלל חודשיים־שלושה, ולא כל עסק מגיע לזה.",
          "screen": "Plain card: 'בתקציב המינימום: בדרך כלל חודשיים־שלושה'.",
          "tag_why": "Honest timeline at minimum budget, and the honest caveat that not every trade/area gets there.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E8-07",
          "voice": "אם לא, הוא נשאר במצב קליקים וממשיך לעבוד.",
          "display": "אם לא, הוא נשאר במצב קליקים וממשיך לעבוד.",
          "screen": "WAO campaign screen: still 'מצב קליקים', active and running.",
          "tag_why": "The honest fallback: click mode keeps working; no doom, no pressure.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E8-08",
          "voice": "אם מצב פניות עובד פחות טוב, הוא חוזר לבד למצב קליקים.",
          "display": "אם מצב פניות עובד פחות טוב, הוא חוזר לבד למצב קליקים.",
          "screen": "Plain card: 'אם מצב פניות עובד פחות טוב → חזרה אוטומטית למצב קליקים'.",
          "tag_why": "Safety net: automatic return to click mode if enquiry mode does worse. Closes on control.",
          "removable": false,
          "alt": null
        }
      ]
    }
  },
  "flags": [
    "Wanted to say Google already learns from his marks and moves budget to better searches in stage one; the brief fixes stage one as click-buying, so the send-back stays factual and all aiming language sits inside the built-to enquiry mode in E8.",
    "Wanted a cost-per-enquiry cap or a savings figure to make the guardrails tangible; only the 15 ₪ click ceiling is supported, so no enquiry-cost promise appears anywhere.",
    "Wanted to promise the switch happens for every trade/area or by a date; only 'built to' with the 15/60/two-closed-jobs condition plus the minimum-budget caveat is supported, and E8 says exactly that.",
    "Wanted to close E8 with the monthly budget that would open the switch as a concrete next step; it is supported but cut for the founder word budget — flagging so it can be restored in a longer cut."
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
