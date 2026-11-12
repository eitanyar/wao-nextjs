# Final round 3: ads-bot-explainer-b-running (2026-11-12)

This is the last polish. Your round-2 output is pasted below. Apply ONLY the remaining items that concern THIS file, from:
- Noa's final pass (exact replacements; binding on Hebrew)
- Dror's round-2 re-check (binding on facts)
- Yonatan's round-2 sign-off (binding on anchors and terms)

All three are pasted below, and Adam's rulings at the top of each override everything else. YELLOW items are your call. Keep every other line byte-for-byte. Return the COMPLETE output in the same JSON shape, plus "changes": [{"id": "...", "why": "..."}].

## ROUND 2 OUTPUT
Angle: running explainer B for a problem-aware, trust-burned owner — each episode sells a visible control (per-trade cap, his mark, precise block, designed-to switch), never a result promise; HOLD lines are out of the voiced cuts, so every episode now closes on its strongest verified control.

```json
{
  "angle": "Through-line: 'your money is guarded, and your only job is one tap' — each episode hands a problem-aware, trust-burned owner a visible control (per-trade cap, his mark, precise block, designed-to switch) instead of a result promise. I open each with the guardrail or the one-second action in his working day, then the mechanism, because he is solution-aware enough to want the how but allergic to 'leave it to us'. HOLD lines are cut from the voiced cuts, so each episode closes on the strongest verified control it has left.",
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
          "voice": "בוט מודעות של [excited] WAO מתחיל עם תקרה למחיר הקליק, לפי המקצוע שלך.",
          "display": "בוט מודעות של WAO מתחיל עם תקרה למחיר הקליק, לפי המקצוע שלך.",
          "screen": "WAO campaign settings for the demo plumber: maximum cost-per-click field set to the ceiling for his trade, no number shown.",
          "tag_why": "Names product and brand once; per-trade click ceiling with no number, per Adam's CPC ruling. קליק, not לחיצה.",
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
          "voice": "כשפנייה אמיתית עולה יותר ממה שהעבודה שלך מצדיקה, הוא לא מבקש עוד תקציב.",
          "display": "כשפנייה אמיתית עולה יותר ממה שהעבודה שלך מצדיקה, הוא לא מבקש עוד תקציב.",
          "screen": "WAO dashboard card: cost per real enquiry beside the limit computed from the plumber's job value; no budget-increase prompt shown.",
          "tag_why": "Second money guard: no push for more budget while a real enquiry costs above his job-value limit. States the bot's behavior, not a cost cap.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E5-06",
          "voice": "הוא פועל לבד רק אחרי אישור חד פעמי שלך, בגבולות שאתה רואה.",
          "display": "הוא פועל לבד רק אחרי אישור חד־פעמי שלך, בגבולות שאתה רואה.",
          "screen": "WAO autonomy consent screen: one-time approval toggle and the visible limits it authorizes.",
          "tag_why": "Autonomy is conditional on his one-time approval inside visible limits — answers 'leave it to us' distrust. Now the episode's closing control beat.",
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
          "voice": "בוט מודעות של [excited] WAO לא מנחש איזו פנייה אמיתית. אתה אומר לו.",
          "display": "בוט מודעות של WAO לא מנחש איזו פנייה אמיתית. אתה אומר לו.",
          "screen": "WAO Ads Bot leads screen for the demo plumber, first enquiries arriving.",
          "tag_why": "Hook + brand: the bot does not guess quality; the owner is the authority. Sets up his one-second job.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E6-02",
          "voice": "פניות מהדף שלך נוחתות ברשימה אחת: טופס, לחיצה על כפתור החיוג, או וואטסאפ.",
          "display": "פניות מהדף שלך נוחתות ברשימה אחת: טופס, לחיצה על כפתור החיוג, או וואטסאפ.",
          "screen": "WAO leads list: one form lead, one call-button tap, one WhatsApp tap in a single table.",
          "tag_why": "Scoped to page enquiries per Dror (ad call-button calls skip the list) and Adam's no-every ruling. לחיצה stays a tap on a page button.",
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
          "voice": "בחשבון המודעות, רק פנייה שסימנת כאמיתית היא תוצאה. קליקים לא נספרים.",
          "display": "בחשבון המודעות, רק פנייה שסימנת כאמיתית היא תוצאה. קליקים לא נספרים.",
          "screen": "WAO campaign goals view: only 'real enquiry' is the goal; clicks shown as recorded, not as goals.",
          "tag_why": "The core rule: only his real-marked enquiry counts as a result, not clicks. קליקים per the click/tap rule.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E6-07",
          "voice": "בלי הסימונים שלך, לקמפיין אין על מה להיבנות.",
          "display": "בלי הסימונים שלך, לקמפיין אין על מה להיבנות.",
          "screen": "Plain card over the leads list: 'הסימונים שלך = הדלק של הקמפיין'.",
          "tag_why": "The fuel line: without his marks there is nothing to build on. Carries the episode close now that the send-back beat is HOLD.",
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
          "voice": "בוט מודעות של [excited] WAO רואה בדיווח של גוגל איזה חיפוש הביא כל קליק.",
          "display": "בוט מודעות של WAO רואה בדיווח של גוגל איזה חיפוש הביא כל קליק.",
          "screen": "WAO search-terms report for the demo plumber: the searches Google reports behind each click.",
          "tag_why": "Hook + brand: reads the searches Google reports behind each click, per Dror — not a claim about literal typed queries.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E7-02",
          "voice": "באישור חד פעמי שלך, הבוט יכול לחסום חיפוש בזבזני. התנאי: לפחות חמישה קליקים, עלות מעל הרף שלך, ובלי פנייה שסימנת כאמיתית.",
          "display": "באישור חד־פעמי שלך, הבוט יכול לחסום חיפוש בזבזני. התנאי: לפחות 5 קליקים, עלות מעל הרף שלך, ובלי פנייה שסימנת כאמיתית.",
          "screen": "WAO search-terms scoring: a query with 5+ clicks, cost above the computed bar, zero real-marked enquiries, marked blocked under the owner's one-time approval.",
          "tag_why": "Block rule with Dror's consent and no-real-enquiry conditions. Split into action + condition list so each sentence stays under the punch cap; numbers as words in voice, digits in display.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E7-03",
          "voice": "חיפוש שהמודעה הופיעה בו פחות מחמישים פעם לא נחסם אף פעם.",
          "display": "חיפוש שהמודעה הופיעה בו פחות מ־50 פעם לא נחסם אף פעם.",
          "screen": "WAO search-terms screen: a query under 50 showings marked 'watch only', not blocked.",
          "tag_why": "Thin-data guard: under 50 showings it is never blocked (the 20-showing ignore rule is subsumed).",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E7-04",
          "voice": "הוא חוסם רק את הניסוח הזה — לא נושא שלם ולא מילה בודדת.",
          "display": "הוא חוסם רק את הניסוח הזה — לא נושא שלם ולא מילה בודדת.",
          "screen": "WAO negative-keyword screen: the exact search wording blocked; no topic block and no single-word block applied.",
          "tag_why": "Precise block per Dror: only that search wording, never a whole topic or a single loose word that could hide good searches.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E7-05",
          "voice": "שתי פניות אמיתיות במחיר שבגבול שלך, והחיפוש הופך למילה שהקמפיין רודף אחריה בכוונה.",
          "display": "שתי פניות אמיתיות במחיר שבגבול שלך, והחיפוש הופך למילה שהקמפיין רודף אחריה בכוונה.",
          "screen": "WAO search-terms screen: a query with 2 real enquiries within the limit promoted to its own keyword.",
          "tag_why": "The other direction: a proven search is promoted so the campaign goes after it on purpose. Noa's verb kept verbatim; front restructured to fit the punch cap.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E7-06",
          "voice": "זה מתחיל רק אחרי השבועיים הראשונים של הקמפיין.",
          "display": "זה מתחיל רק אחרי השבועיים הראשונים של הקמפיין.",
          "screen": "Plain card over the campaign timeline: 'מתחיל אחרי השבועיים הראשונים'.",
          "tag_why": "Timing guard: promotion starts only after the first two weeks. Now the episode's closing guard.",
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
          "voice": "בהתחלה הקמפיין במצב קליקים, עם תקרה למחיר הקליק לפי המקצוע שלך.",
          "display": "בהתחלה הקמפיין במצב קליקים, עם תקרה למחיר הקליק לפי המקצוע שלך.",
          "screen": "WAO campaign screen: mode 'מצב קליקים', max cost-per-click set to the trade ceiling, no number shown.",
          "tag_why": "Stage one stated plainly: click mode under the per-trade ceiling, no number per Adam. Approved term מצב קליקים kept.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E8-04",
          "voice": "הקמפיין מתוכנן לעבור לבד למצב פניות, שבו גוגל מְכַוֵּן לפניות אמיתיות בלבד.",
          "display": "הקמפיין מתוכנן לעבור לבד למצב פניות, שבו גוגל מכוון לפניות אמיתיות בלבד.",
          "screen": "Plain card: 'מצב קליקים → מצב פניות', labelled 'מתוכנן לעבור לבד'.",
          "tag_why": "The designed-to switch per Adam until phase 2 is live and Roni-verified; enquiry mode aims at real enquiries only. Google masculine, niqqud on מְכַוֵּן so it is heard as active 'aims'.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E8-05",
          "voice": "התנאי הוא בערך חמש עשרה פניות אמיתיות בשישים יום, ולפחות שתי עבודות שנסגרו.",
          "display": "התנאי הוא כ־15 פניות אמיתיות ב־60 יום, ולפחות שתי עבודות שנסגרו.",
          "screen": "Plain card: 'כ־15 פניות אמיתיות ב־60 יום, ולפחות 2 עבודות שנסגרו'.",
          "tag_why": "The design condition: ~15 real enquiries in 60 days PLUS at least two closed jobs, per Adam's wording everywhere. Not attributed to Google, not a closed-jobs-only trigger. שנסגרו also removes the homograph/niqqud dependency.",
          "removable": false,
          "alt": null
        },
        {
          "beat": "E8-06",
          "voice": "בתקציב המינימום זה בדרך כלל חודשיים עד שלושה, ולא כל עסק מגיע לזה.",
          "display": "בתקציב המינימום זה בדרך כלל חודשיים־שלושה, ולא כל עסק מגיע לזה.",
          "screen": "Plain card: 'בתקציב המינימום: בדרך כלל חודשיים־שלושה'.",
          "tag_why": "Honest timeline at minimum budget, and the honest caveat that not every trade gets there. No area talk.",
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
          "voice": "הקמפיין מתוכנן לחזור לבד למצב קליקים אם מצב פניות עובד פחות טוב.",
          "display": "הקמפיין מתוכנן לחזור לבד למצב קליקים אם מצב פניות עובד פחות טוב.",
          "screen": "Plain card: 'מצב פניות עובד פחות טוב → הקמפיין מתוכנן לחזור לבד למצב קליקים'.",
          "tag_why": "Safety net in the designed-to frame per Adam. Restructured so E8-07 and E8-08 no longer open with two אם in a row. Closes on control.",
          "removable": false,
          "alt": null
        }
      ]
    }
  },
  "flags": [
    "Wanted Google-learning and budget-shift language in stage one; the brief fixes stage one as click-buying, so all aiming language sits inside the designed-to enquiry mode in E8-04.",
    "Wanted a concrete cost guard; Adam removed the ₪15 number, so only the per-trade click ceiling appears (E5-02, E8-02). No enquiry-cost promise anywhere.",
    "Switch and rollback are מתוכנן per Adam until phase 2 is live and Roni-verified. Condition: ~15 real enquiries in 60 days plus at least two closed jobs; minimum-budget timeline חודשיים עד שלושה; not every trade gets there. No area talk.",
    "HOLD cuts per Adam: E5-05 (fake-click filter), E5-07 (stop switch + log), E7-07 (approval/once-a-day), E6-06 (send-back) are out of the voiced cuts until their gates pass. E5 now closes on approval/limits, E7 on the two-week timing guard. Restore them the moment the gates pass — they are the strongest control closers.",
    "E8-03 (send-back) was dropped to hold E8 at the 80-word cap after the designed-to and closed-jobs fixes lengthened it; Dror marks it removable behind GA1. The Google send-back fact now appears nowhere in B's voiced cuts — restore E8-03 or E6-06 as soon as GA1 passes; it is the mechanism that makes the designed-to switch believable.",
    "If any E8 cut runs as paid media: the designed-to switch/rollback lines stay out until phase 2 is live and the landing page discloses the condition (Dror's paid-media policy). No price appears in this file, so the price block is clean.",
    "Wanted to close E8 with the monthly budget that would open the switch as a concrete next step; supported but cut for the founder word budget — restore in a longer cut.",
    "Cap taken as 80 voiced words per episode, inferred from Noa's E5=81 flag (round 1 E7 sat at 80 unflagged). E8 lands exactly at 80; if the brief's cap is lower, flag it — I did not cut passing or mandated content to guess."
  ],
  "changes": [
    {"id": "E5-02", "why": "Adam/Dror CPC ruling: per-trade ceiling, no ₪15 number; קליק not לחיצה; screen no longer shows 15 ₪."},
    {"id": "E5-04", "why": "Noa exact replacement; 13 words, under the punch cap."},
    {"id": "E5-05", "why": "HOLD per Adam — cut from voiced cuts until the daily-check gate passes."},
    {"id": "E5-06", "why": "Noa voice-only: חד פעמי without maqaf for TTS; display keeps חד־פעמי."},
    {"id": "E5-07", "why": "HOLD per Adam — stop switch + log cut until the gate passes; E5 closes on E5-06."},
    {"id": "E6-01", "why": "Noa: singular איזו פנייה אמיתית."},
    {"id": "E6-02", "why": "Adam's no-every ruling + Dror's E4-07 intent: scoped to page enquiries, since ad call-button calls skip the list; dropped כל. Kept לחיצה על כפתור החיוג as a tap."},
    {"id": "E6-05", "why": "Noa click/tap rule: קליקים לא נספרים."},
    {"id": "E6-06", "why": "HOLD per Adam (voiced send-back behind GA1); beat dropped and Noa's alt dropped with it, per her instruction. E6-07 carries the fuel point."},
    {"id": "E7-01", "why": "Dror: reads the searches Google reports behind each click, not literal typed queries; screen updated to match."},
    {"id": "E7-02", "why": "Noa's base line plus Dror's consent and no-real-enquiry conditions could not fit one sentence under the punch cap, so I split it into action + condition list, each sentence ≤13. Numbers as words in voice, digits in display; consent now lives here since E7-07 is HOLD."},
    {"id": "E7-03", "why": "Noa voice-only: מחמישים as words; display keeps מ־50."},
    {"id": "E7-04", "why": "Dror: blocks only that search wording, never a whole topic or a single loose word."},
    {"id": "E7-05", "why": "Noa's RED verb רודף אחריה בכוונה kept verbatim; front restructured to 13 words, and במחיר שבגבול שלך avoids בגבול שלך being heard as a geographic border."},
    {"id": "E7-07", "why": "HOLD per Adam — approval/once-a-day cut; the consent condition moved into E7-02."},
    {"id": "E8-02", "why": "Adam/Dror CPC ruling: per-trade ceiling, no number; screen updated."},
    {"id": "E8-03", "why": "Dror marks it removable behind GA1; dropped to hold E8 at the 80-word cap after the mandated fixes lengthened it. Flagged for restoration — Adam did not HOLD it, so this is a cap-driven removal, not a fact veto."},
    {"id": "E8-04", "why": "Adam: מתוכנן until phase 2 is live and Roni-verified; Noa: Google masculine מְכַוֵּן/מכוון + לפניות; screen label updated."},
    {"id": "E8-05", "why": "Noa voice numbers-as-words; Adam's ruling overrides Noa's שסגרת with ולפחות שתי עבודות שנסגרו everywhere, which also removes the homograph/niqqud dependency. Display and screen updated to ולפחות."},
    {"id": "E8-06", "why": "Noa voice-only: חודשיים עד שלושה; display keeps the maqaf range; tag_why no longer mentions area."},
    {"id": "E8-08", "why": "Adam/Dror designed-to rollback; restructured so E8-07/E8-08 no longer open with two אם in a row (Noa AI tell)."},
    {"id": "angle", "why": "built-to → designed-to; HOLD cuts reflected in the through-line."},
    {"id": "word-counts", "why": "Re-counted voiced words: E5=57, E6=62, E7=78, E8=80, against the inferred 80-word episode cap; every sentence ≤13. Passing lines (E5-01, E5-03, E6-03, E6-04, E6-07, E7-06, E8-01, E8-07) kept byte-for-byte."}
  ]
}
```

→ Noa to proof the revised strings, especially E7-02's condition list and E8-05's שנסגרו; → Eitan-Dev to apply in the explainer B copy file and update the screens noted above.

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
