# Video scripts — Dash, round 2 (2026-11-12)

Your round 1 scripts are in docs/copy/video-dash-scripts-r1-2026-11-12.waocopy.md (they are pasted below). Noa reviewed them; her full review is pasted below too. Return the complete revised JSON for all six episodes in the same shape, with these changes:

1. **Apply every Noa fix** (her `old → new` list), unless you have a funnier native fix that solves the same problem; say which in `angle`.
2. **Rewrite the three lines that die** (her list), and act on her style notes for S1, S2 and A1.
3. **Name:** Dash is דַּשׁוֹנִי unless you prefer her alternative; one choice, used everywhere.
4. **Every spoken price** carries its billing period ("a month").
5. **The ElevenLabs v4 audio tag per line (NEW).**
   - Every `voice` line starts with ONE English audio tag in square brackets, chosen for what that specific line says. Examples of the kind: [sighs] on a sad fact, [deadpan] on a dry punchline, [tired], [unimpressed], [short pause], [quietly].
   - Never use one tag for the whole script. The founder liked a sigh precisely because it performed the sad fact in that line.
   - Add an English field `tag_why` per line, in a few words.
6. **The brand name WAO:** write it in `voice` so Hebrew TTS says it right (the brand is said "wow"); `display` keeps WAO.
7. **Never mention:** results, a number of calls, first place, a credit amount, real clients, a ringing-off-the-hook finale, notification-lookalike banners. Never frame Site Bot as a website builder. Reviews: we help his customers leave a review; we never arrange or steer what they write.

Return one JSON object, no markdown.

## Round 1 scripts
{
  "angle": "Remarketing viewers already suspect clicks waste money; Dash turns the van dashboard into a deadpan scoreboard, then the product mechanism is stated plainly.",
  "dash_name_options": [
    {
      "name": "דַּשׁוֹנִי",
      "why": "קצר, ישראלי, ונשמע כמו כינוי של טלפון חי על הדשבורד."
    },
    {
      "name": "דַּשׁ",
      "why": "מינימלי ויבש, בדיוק כמו הדמות."
    },
    {
      "name": "פְּלָאפֹונִי",
      "why": "קצת ישן, קצת עייף, אבל מאוד ישראלי."
    }
  ],
  "dash_name_pick": "דַּשׁוֹנִי",
  "voice_description": "Male, 35-45, slightly gravelly, slow deadpan, tired but loyal, like a veteran tradesman's dispatcher.",
  "episodes": {
    "A1": {
      "title": "The meter",
      "hooks": [
        {
          "voice": "מונה הקליקים התחיל. אף אחד לא מתקשר.",
          "display": "מונה הקליקים התחיל. אף אחד לא מתקשר.",
          "banner": "קליק. עוד קליק. שקט."
        },
        {
          "voice": "כל קליק לוקח מטבע. הטלפון שותק.",
          "display": "כל קליק לוקח מטבע. הטלפון שותק.",
          "banner": "מונה רץ. כיס מדמם."
        },
        {
          "voice": "המונה דופק. שיחה? לא נרשמה.",
          "display": "המונה דופק. שיחה? לא נרשמה.",
          "banner": "עוד קליק נחת. בלי צלצול."
        }
      ],
      "script_30": [
        {
          "time": "0-3",
          "screen": "Dash's screen is a taxi meter; each click adds shekels; brand mark in corner from first frame.",
          "speaker": "Dash",
          "voice": "מונה הקליקים התחיל. אף אחד לא מתקשר.",
          "display": "מונה הקליקים התחיל. אף אחד לא מתקשר.",
          "banner": "קליק. עוד קליק. שקט."
        },
        {
          "time": "3-10",
          "screen": "Three cursor-clicks appear, look around, leave; coins drift out of the jar.",
          "speaker": "Dash",
          "voice": "שלושה קליקים. שלושה מטבעות. הטלפון שקט.",
          "display": "שלושה קליקים. שלושה מטבעות. הטלפון שקט.",
          "banner": "הקליק השלישי: הסתכל והלך."
        },
        {
          "time": "10-16",
          "screen": "Owner's hand picks Dash up, checks missed enquiries; empty list.",
          "speaker": "Dash",
          "voice": "בדקת. אין פניות. כולם לחצו.",
          "display": "בדקת. אין פניות. כולם לחצו.",
          "banner": null
        },
        {
          "time": "16-20",
          "screen": "Meter keeps running; no call; Dash stares deadpan.",
          "speaker": "Dash",
          "voice": "הקליקים באים. הטלפון שותק.",
          "display": "הקליקים באים. הטלפון שותק.",
          "banner": null
        },
        {
          "time": "20-27",
          "screen": "Dash's face switches to the real product screen; owner's thumb marks a lead as real; weekly cost line visible.",
          "speaker": "Eitan",
          "voice": "בוט מודעות לומד מלקוחות שאתה מסמן כאמיתיים.",
          "display": "בוט מודעות לומד מלקוחות שאתה מסמן כאמיתיים.",
          "banner": null
        },
        {
          "time": "27-30",
          "screen": "End card with price, account in his name, and CTA.",
          "speaker": "Eitan",
          "voice": "איתן מ-WAO. בוט מודעות: מָאתַיִם אַרְבָּעִים וָתֵשַׁע שֶׁקֶל פלוס מַעֲמ.",
          "display": "איתן מ-WAO. בוט מודעות: 249 ₪ + מע״מ.",
          "banner": null
        }
      ],
      "script_15": [
        {
          "time": "0-3",
          "screen": "Dash's screen is a taxi meter; each click adds shekels; brand mark in corner.",
          "speaker": "Dash",
          "voice": "מונה הקליקים התחיל. אף אחד לא מתקשר.",
          "display": "מונה הקליקים התחיל. אף אחד לא מתקשר.",
          "banner": "קליק. עוד קליק. שקט."
        },
        {
          "time": "3-7",
          "screen": "Meter speeds up; coins leave the jar by themselves.",
          "speaker": "Dash",
          "voice": "המונה רץ. המטבעות עפים.",
          "display": "המונה רץ. המטבעות עפים.",
          "banner": "כסף הולך. צלצול לא."
        },
        {
          "time": "7-10",
          "screen": "Owner's hand checks Dash; no missed enquiries.",
          "speaker": "Dash",
          "voice": "כולם לחצו. הטלפון שותק.",
          "display": "כולם לחצו. הטלפון שותק.",
          "banner": null
        },
        {
          "time": "10-15",
          "screen": "Real product screen; lead marked real; end card with price and CTA.",
          "speaker": "Eitan",
          "voice": "בוט מודעות לומד מלקוחות שאתה מסמן. מָאתַיִם אַרְבָּעִים וָתֵשַׁע שֶׁקֶל פלוס מַעֲמ.",
          "display": "בוט מודעות לומד מלקוחות שאתה מסמן. 249 ₪ + מע״מ.",
          "banner": null
        }
      ],
      "eitan_close": {
        "voice": "איתן מ-WAO. בוט מודעות: מָאתַיִם אַרְבָּעִים וָתֵשַׁע שֶׁקֶל פלוס מַעֲמ.",
        "display": "איתן מ-WAO. בוט מודעות: 249 ₪ + מע״מ.",
        "end_card": "בוט מודעות — 249 ₪ + מע״מ לחודש. פתח חשבון חדש על שמך."
      },
      "text_assets": {
        "headlines": [
          "מונה רץ. טלפון שקט.",
          "קליקים אוכלים את המטבעות",
          "לומדים מלקוחות, לא מקליקים"
        ],
        "long_headlines": [
          "הבוט לומד מלקוחות שאתה מסמן כעבודה אמיתית שנסגרה, לא מקליקים.",
          "חשבון מודעות חדש על שמך, עם דוח שבועי פשוט.",
          "249 ₪ + מע״מ לחודש. הבוט לומד מלקוחות שאתה מסמן."
        ],
        "descriptions": [
          "אנחנו פותחים חשבון מודעות על שמך. הבוט לומד מפניות אמיתיות שנסגרו.",
          "כל פנייה והעלות שלה מופיעות לפניך כל שבוע.",
          "סימנת עבודה אמיתית שנסגרה? הבוט מבין לאן לכוון את התקציב."
        ]
      }
    },
    "A2": {
      "title": "Click-flies",
      "hooks": [
        {
          "voice": "זבובי קליקים שוב ליד הצנצנת.",
          "display": "זבובי קליקים שוב ליד הצנצנת.",
          "banner": "כל זבוב יוצא עם שקל."
        },
        {
          "voice": "הם נראים תמימים. הם אוכלים מטבעות.",
          "display": "הם נראים תמימים. הם אוכלים מטבעות.",
          "banner": "נחיל קטן. תיאבון גדול."
        },
        {
          "voice": "שמעתי זמזום. זה התקציב שלך.",
          "display": "שמעתי זמזום. זה התקציב שלך.",
          "banner": "כניסה חופשית. יציאה עם מטבע."
        }
      ],
      "script_30": [
        {
          "time": "0-3",
          "screen": "A cloud of cursor-shaped flies circles the coin jar; Dash swats one with its charging cable; brand mark in corner.",
          "speaker": "Dash",
          "voice": "זבובי קליקים שוב ליד הצנצנת.",
          "display": "זבובי קליקים שוב ליד הצנצנת.",
          "banner": "כל זבוב יוצא עם שקל."
        },
        {
          "time": "3-9",
          "screen": "The swarm grows; owner sprays; flies return.",
          "speaker": "Dash",
          "voice": "הריסוס לא עוזר. הם חוזרים.",
          "display": "הריסוס לא עוזר. הם חוזרים.",
          "banner": "ריסוס נגד קליקים: לא עובד."
        },
        {
          "time": "9-15",
          "screen": "One fly stops, looks like it might call, then leaves.",
          "speaker": "Dash",
          "voice": "כמעט מתקשר. בעצם לא.",
          "display": "כמעט מתקשר. בעצם לא.",
          "banner": "הזבוב התחרט."
        },
        {
          "time": "15-20",
          "screen": "Flies keep circling; jar lighter; Dash looks tired.",
          "speaker": "Dash",
          "voice": "הרבה קליקים. בלי לקוחות.",
          "display": "הרבה קליקים. בלי לקוחות.",
          "banner": null
        },
        {
          "time": "20-27",
          "screen": "Real product screen; owner marks which enquiries were real jobs.",
          "speaker": "Eitan",
          "voice": "אתה מסמן עבודה אמיתית. הבוט לומד מזה.",
          "display": "אתה מסמן עבודה אמיתית. הבוט לומד מזה.",
          "banner": null
        },
        {
          "time": "27-30",
          "screen": "End card with price, account in his name, and CTA.",
          "speaker": "Eitan",
          "voice": "איתן מ-WAO. בוט מודעות: מָאתַיִם אַרְבָּעִים וָתֵשַׁע שֶׁקֶל פלוס מַעֲמ.",
          "display": "איתן מ-WAO. בוט מודעות: 249 ₪ + מע״מ.",
          "banner": null
        }
      ],
      "script_15": [
        {
          "time": "0-3",
          "screen": "Cursor-flies circle the coin jar; Dash swats one with its cable; brand mark in corner.",
          "speaker": "Dash",
          "voice": "זבובי קליקים שוב ליד הצנצנת.",
          "display": "זבובי קליקים שוב ליד הצנצנת.",
          "banner": "כל זבוב יוצא עם שקל."
        },
        {
          "time": "3-8",
          "screen": "Every fly takes a coin and leaves; Dash counts, bored.",
          "speaker": "Dash",
          "voice": "אחד, שניים, שלושה. בלי טלפון.",
          "display": "אחד, שניים, שלושה. בלי טלפון.",
          "banner": null
        },
        {
          "time": "8-10",
          "screen": "Empty jar; Dash stares at camera.",
          "speaker": "Dash",
          "voice": "הרבה קליקים. בלי לקוחות.",
          "display": "הרבה קליקים. בלי לקוחות.",
          "banner": null
        },
        {
          "time": "10-15",
          "screen": "Real product screen; owner marks real jobs; end card with price and CTA.",
          "speaker": "Eitan",
          "voice": "סמן לקוחות אמיתיים. הבוט לומד מזה. מָאתַיִם אַרְבָּעִים וָתֵשַׁע שֶׁקֶל פלוס מַעֲמ.",
          "display": "סמן לקוחות אמיתיים. הבוט לומד מזה. 249 ₪ + מע״מ.",
          "banner": null
        }
      ],
      "eitan_close": {
        "voice": "איתן מ-WAO. בוט מודעות: מָאתַיִם אַרְבָּעִים וָתֵשַׁע שֶׁקֶל פלוס מַעֲמ.",
        "display": "איתן מ-WAO. בוט מודעות: 249 ₪ + מע״מ.",
        "end_card": "בוט מודעות — 249 ₪ + מע״מ לחודש. פתח חשבון חדש על שמך."
      },
      "text_assets": {
        "headlines": [
          "זבובי קליקים אוכלים שקלים",
          "הרבה קליקים. בלי לקוחות.",
          "סמן עבודה. הבוט לומד."
        ],
        "long_headlines": [
          "הבוט לומד מהפניות שאתה מסמן כעבודה אמיתית שנסגרה, לא מכל קליק.",
          "249 ₪ + מע״מ לחודש. חשבון מודעות חדש על שמך.",
          "כל קליק יכול לאכול מטבע. הבוט מכוון ללקוחות שסימנת."
        ],
        "descriptions": [
          "אתה מסמן עבודה אמיתית. הבוט לומד מהסימון שלך.",
          "בלי קליקים ריקים: תקציב מודעות מכוון לפי לקוחות.",
          "אנחנו פותחים חשבון על שמך. כל פנייה ועלותה מופיעות שבועית."
        ]
      }
    },
    "A3": {
      "title": "The report",
      "hooks": [
        {
          "voice": "דוח מבריק. לקוח? אין.",
          "display": "דוח מבריק. לקוח? אין.",
          "banner": "חצים ירוקים. טלפון שקט."
        },
        {
          "voice": "עוד דוח יפה. העסק עדיין מחכה.",
          "display": "עוד דוח יפה. העסק עדיין מחכה.",
          "banner": "קונפטי של קליקים."
        },
        {
          "voice": "הדוח הזה הפוך. כמו המספרים?",
          "display": "הדוח הזה הפוך. כמו המספרים?",
          "banner": "גרף עולה. צלצול שקט."
        }
      ],
      "script_30": [
        {
          "time": "0-3",
          "screen": "A glossy report slaps onto the windscreen from outside; big green arrows; Dash reads it upside down; brand mark in corner.",
          "speaker": "Dash",
          "voice": "דוח מבריק. לקוח? אין.",
          "display": "דוח מבריק. לקוח? אין.",
          "banner": "חצים ירוקים. טלפון שקט."
        },
        {
          "time": "3-10",
          "screen": "Three reports pile up, each shinier; confetti for clicks and impressions.",
          "speaker": "Dash",
          "voice": "קונפטי לקליקים. איפה הלקוח?",
          "display": "קונפטי לקליקים. איפה הלקוח?",
          "banner": "חשיפות, קליקים, מצגת."
        },
        {
          "time": "10-16",
          "screen": "Owner's hand taps the report; silence; one cricket.",
          "speaker": "Dash",
          "voice": "שאלת על לקוחות? שקט.",
          "display": "שאלת על לקוחות? שקט.",
          "banner": "צרצר אחד."
        },
        {
          "time": "16-20",
          "screen": "Confetti stops in mid-air; Dash looks at camera.",
          "speaker": "Dash",
          "voice": "הדוחות יפים. הטלפון שקט.",
          "display": "הדוחות יפים. הטלפון שקט.",
          "banner": null
        },
        {
          "time": "20-27",
          "screen": "Real product screen; lead marked real; weekly cost line visible.",
          "speaker": "Eitan",
          "voice": "בוט מודעות לומד מלקוחות שאתה מסמן. מָאתַיִם אַרְבָּעִים וָתֵשַׁע שֶׁקֶל פלוס מַעֲמ.",
          "display": "בוט מודעות לומד מלקוחות שאתה מסמן. 249 ₪ + מע״מ.",
          "banner": null
        },
        {
          "time": "27-30",
          "screen": "End card with price, account in his name, and CTA.",
          "speaker": "Eitan",
          "voice": "איתן מ-WAO. בוט מודעות, בלי דוחות יפים.",
          "display": "איתן מ-WAO. בוט מודעות, בלי דוחות יפים.",
          "banner": null
        }
      ],
      "script_15": [
        {
          "time": "0-3",
          "screen": "Glossy report slaps onto windscreen; Dash reads it upside down; brand mark in corner.",
          "speaker": "Dash",
          "voice": "דוח מבריק. לקוח? אין.",
          "display": "דוח מבריק. לקוח? אין.",
          "banner": "חצים ירוקים. טלפון שקט."
        },
        {
          "time": "3-8",
          "screen": "Confetti for clicks and impressions; Dash asks which line is a customer; confetti stops.",
          "speaker": "Dash",
          "voice": "איזו שורה היא לקוח?",
          "display": "איזו שורה היא לקוח?",
          "banner": "הקונפטי נעצר."
        },
        {
          "time": "8-10",
          "screen": "Reports pile up; silent dashboard.",
          "speaker": "Dash",
          "voice": "דוחות יפים. טלפון שקט.",
          "display": "דוחות יפים. טלפון שקט.",
          "banner": null
        },
        {
          "time": "10-15",
          "screen": "Real product screen; lead marked real; end card with price and CTA.",
          "speaker": "Eitan",
          "voice": "בוט מודעות לומד מלקוחות שסומנו. מָאתַיִם אַרְבָּעִים וָתֵשַׁע שֶׁקֶל פלוס מַעֲמ.",
          "display": "בוט מודעות לומד מלקוחות שסומנו. 249 ₪ + מע״מ.",
          "banner": null
        }
      ],
      "eitan_close": {
        "voice": "איתן מ-WAO. בוט מודעות, בלי דוחות יפים.",
        "display": "איתן מ-WAO. בוט מודעות, בלי דוחות יפים.",
        "end_card": "בלי דוחות יפים — 249 ₪ + מע״מ לחודש. פתח חשבון חדש על שמך."
      },
      "text_assets": {
        "headlines": [
          "דוח יפה. אף לקוח?",
          "המספר היחיד: לקוחות",
          "בלי קונפטי. בלי הפתעות."
        ],
        "long_headlines": [
          "במקום דוחות נוצצים: פניות שאתה מסמן, ועלות לכל פנייה.",
          "בוט מודעות בגוגל לעסק שלך. 249 ₪ + מע״מ לחודש.",
          "הדוח השבועי מראה כל פנייה ואת העלות שלה. בלי קסמים."
        ],
        "descriptions": [
          "כל פנייה ועלותה מופיעות לפניך כל שבוע. פשוט וברור.",
          "הבוט לומד מלקוחות שאתה מסמן כאמיתיים שנסגרו, לא מקליקים.",
          "249 ₪ + מע״מ לחודש. חשבון מודעות חדש על שמך."
        ]
      }
    },
    "S1": {
      "title": "Ghost van",
      "hooks": [
        {
          "voice": "היא חיפשה אינסטלטור. עברה דרכנו.",
          "display": "היא חיפשה אינסטלטור. עברה דרכנו.",
          "banner": "רכב שקוף. עבודה אמיתית."
        },
        {
          "voice": "הטנדר כאן. גוגל לא רואה.",
          "display": "הטנדר כאן. גוגל לא רואה.",
          "banner": "הקפה נפל. התיאבון נשאר."
        },
        {
          "voice": "לקוחה עברה דרך הדלת. שוב.",
          "display": "לקוחה עברה דרך הדלת. שוב.",
          "banner": "אנחנו כאן. הם שם."
        }
      ],
      "script_30": [
        {
          "time": "0-3",
          "screen": "A woman on the pavement searches on her phone and walks straight through the see-through van; Dash watches her pass; brand mark in corner.",
          "speaker": "Dash",
          "voice": "היא חיפשה אינסטלטור. עברה דרכנו.",
          "display": "היא חיפשה אינסטלטור. עברה דרכנו.",
          "banner": "רכב שקוף. עבודה אמיתית."
        },
        {
          "time": "3-9",
          "screen": "Two more people walk through; one puts a coffee down on the bonnet and it falls.",
          "speaker": "Dash",
          "voice": "שמו קפה על המכסה. הוא נפל.",
          "display": "שמו קפה על המכסה. הוא נפל.",
          "banner": "הקפה נפל. התיאבון נשאר."
        },
        {
          "time": "9-15",
          "screen": "Owner waves; nobody reacts; someone two streets away gets the job.",
          "speaker": "Dash",
          "voice": "מישהו בשכונה הבאה קיבל את העבודה.",
          "display": "מישהו בשכונה הבאה קיבל את העבודה.",
          "banner": "הם מחפשים. אתה שקוף."
        },
        {
          "time": "15-20",
          "screen": "Dash looks through the windscreen at passing searchers.",
          "speaker": "Dash",
          "voice": "עבודה טובה. אבל שקוף.",
          "display": "עבודה טובה. אבל שקוף.",
          "banner": null
        },
        {
          "time": "20-27",
          "screen": "Real screens: service-tree site next to the business profile, saying the same thing.",
          "speaker": "Eitan",
          "voice": "אתר עץ שירותים, פרופיל תואם, עזרה בביקורות.",
          "display": "אתר עץ שירותים, פרופיל תואם, עזרה בביקורות.",
          "banner": null
        },
        {
          "time": "27-30",
          "screen": "End card with price and free check CTA.",
          "speaker": "Eitan",
          "voice": "איתן מ-WAO. סַיְיט בּוֹט: מֵאָה תִּשְׁעִים וָתֵשַׁע שֶׁקֶל פלוס מַעֲמ.",
          "display": "איתן מ-WAO. סייט בוט: 199 ₪ + מע״מ.",
          "banner": null
        }
      ],
      "script_15": [
        {
          "time": "0-3",
          "screen": "Woman searches on phone and walks through the see-through van; brand mark in corner.",
          "speaker": "Dash",
          "voice": "היא חיפשה אינסטלטור. עברה דרכנו.",
          "display": "היא חיפשה אינסטלטור. עברה דרכנו.",
          "banner": "רכב שקוף. עבודה אמיתית."
        },
        {
          "time": "3-8",
          "screen": "More walk-throughs; coffee falls.",
          "speaker": "Dash",
          "voice": "הם עוברים דרכנו. הקפה נפל.",
          "display": "הם עוברים דרכנו. הקפה נפל.",
          "banner": null
        },
        {
          "time": "8-10",
          "screen": "Dash watches the pavement; owner unseen, still working.",
          "speaker": "Dash",
          "voice": "עבודה טובה. אבל שקוף.",
          "display": "עבודה טובה. אבל שקוף.",
          "banner": null
        },
        {
          "time": "10-15",
          "screen": "Real screens: site and profile aligned; end card with price and free check CTA.",
          "speaker": "Eitan",
          "voice": "סַיְיט בּוֹט: אתר, פרופיל וביקורות. מֵאָה תִּשְׁעִים וָתֵשַׁע שֶׁקֶל פלוס מַעֲמ.",
          "display": "סייט בוט: אתר, פרופיל וביקורות. 199 ₪ + מע״מ.",
          "banner": null
        }
      ],
      "eitan_close": {
        "voice": "איתן מ-WAO. סַיְיט בּוֹט: מֵאָה תִּשְׁעִים וָתֵשַׁע שֶׁקֶל פלוס מַעֲמ.",
        "display": "איתן מ-WAO. סייט בוט: 199 ₪ + מע״מ.",
        "end_card": "סייט בוט — 199 ₪ + מע״מ לחודש. בדוק את העסק שלך חינם."
      },
      "text_assets": {
        "headlines": [
          "העסק שלך שקוף?",
          "עבודה טובה. אף אחד לא רואה.",
          "אתר, פרופיל וביקורות. יחד."
        ],
        "long_headlines": [
          "סייט בוט בונה נוכחות שלמה: אתר עץ שירותים ופרופיל תואם.",
          "הלקוחות מחפשים בגוגל. תן להם לראות את כל השירותים שלך.",
          "199 ₪ + מע״מ לחודש. בדוק חינם מה לקוחות רואים."
        ],
        "descriptions": [
          "אתר עם עץ השירותים שלך, פרופיל עסקי תואם, ועזרה בביקורות.",
          "בדוק חינם: הקלד את שם העסק וראה מה לקוחות רואים.",
          "המערכת מסדרת את הנוכחות שלך בגוגל, בלי עבודה כפולה."
        ]
      }
    },
    "S2": {
      "title": "The jar of stars",
      "hooks": [
        {
          "voice": "יש לנו צנצנת מחמאות. גוגל לא שומע.",
          "display": "יש לנו צנצנת מחמאות. גוגל לא שומע.",
          "banner": "מחמאה בעל פה. בלי כוכב."
        },
        {
          "voice": "הלקוחה אמרה תודה. זה נגמר שם.",
          "display": "הלקוחה אמרה תודה. זה נגמר שם.",
          "banner": "כוכב בלי בית."
        },
        {
          "voice": "כל הכוכבים אצלנו. אף אחד לא רואה.",
          "display": "כל הכוכבים אצלנו. אף אחד לא רואה.",
          "banner": "צנצנת מלאה. פרופיל ריק."
        }
      ],
      "script_30": [
        {
          "time": "0-3",
          "screen": "Glovebox opens; a jar of glowing stars rolls out; cartoon banner about compliments received in person; brand mark in corner.",
          "speaker": "Dash",
          "voice": "כל הכוכבים אצלנו. אף אחד לא רואה.",
          "display": "כל הכוכבים אצלנו. אף אחד לא רואה.",
          "banner": "צנצנת מלאה. פרופיל ריק."
        },
        {
          "time": "3-10",
          "screen": "Each star replays a silent thank-you at the door as a speech bubble; owner adds another star after a job.",
          "speaker": "Dash",
          "voice": "עוד תודה. עוד כוכב בצנצנת.",
          "display": "עוד תודה. עוד כוכב בצנצנת.",
          "banner": "בלי מיקרופון."
        },
        {
          "time": "10-16",
          "screen": "Dash holds the jar up to the windscreen; passers-by cannot see it.",
          "speaker": "Dash",
          "voice": "אנחנו רואים. הם לא.",
          "display": "אנחנו רואים. הם לא.",
          "banner": "הצנצנת לא בחיפוש."
        },
        {
          "time": "16-20",
          "screen": "Jar glows quietly; profile card stays empty.",
          "speaker": "Dash",
          "voice": "גוגל לא שומע מחמאות.",
          "display": "גוגל לא שומע מחמאות.",
          "banner": null
        },
        {
          "time": "20-27",
          "screen": "Real screen: simple flow that helps a customer write a review.",
          "speaker": "Eitan",
          "voice": "אנחנו עוזרים ללקוח לכתוב ביקורת.",
          "display": "אנחנו עוזרים ללקוח לכתוב ביקורת.",
          "banner": null
        },
        {
          "time": "27-30",
          "screen": "End card with price and free check CTA.",
          "speaker": "Eitan",
          "voice": "איתן מ-WAO. ביקורות נכתבות. מֵאָה תִּשְׁעִים וָתֵשַׁע שֶׁקֶל פלוס מַעֲמ.",
          "display": "איתן מ-WAO. ביקורות נכתבות: 199 ₪ + מע״מ.",
          "banner": null
        }
      ],
      "script_15": [
        {
          "time": "0-3",
          "screen": "Glovebox opens; jar of glowing stars rolls out; brand mark in corner.",
          "speaker": "Dash",
          "voice": "כל הכוכבים אצלנו. אף אחד לא רואה.",
          "display": "כל הכוכבים אצלנו. אף אחד לא רואה.",
          "banner": "צנצנת מלאה. פרופיל ריק."
        },
        {
          "time": "3-8",
          "screen": "Silent thank-you speech bubbles turn into stars.",
          "speaker": "Dash",
          "voice": "תודה שקטה. כוכב שקט.",
          "display": "תודה שקטה. כוכב שקט.",
          "banner": "בלי קול."
        },
        {
          "time": "8-10",
          "screen": "Jar held to windscreen; invisible to passers-by.",
          "speaker": "Dash",
          "voice": "גוגל לא שומע מחמאות.",
          "display": "גוגל לא שומע מחמאות.",
          "banner": null
        },
        {
          "time": "10-15",
          "screen": "Real screen: review flow; end card with price and free check CTA.",
          "speaker": "Eitan",
          "voice": "סַיְיט בּוֹט עוזר ללקוחות לכתוב ביקורות. מֵאָה תִּשְׁעִים וָתֵשַׁע שֶׁקֶל פלוס מַעֲמ.",
          "display": "סייט בוט עוזר ללקוחות לכתוב ביקורות. 199 ₪ + מע״מ.",
          "banner": null
        }
      ],
      "eitan_close": {
        "voice": "איתן מ-WAO. ביקורות נכתבות. מֵאָה תִּשְׁעִים וָתֵשַׁע שֶׁקֶל פלוס מַעֲמ.",
        "display": "איתן מ-WAO. ביקורות נכתבות: 199 ₪ + מע״מ.",
        "end_card": "סייט בוט — 199 ₪ + מע״מ לחודש. בדוק את העסק שלך חינם."
      },
      "text_assets": {
        "headlines": [
          "מחמאות לא כותבות ביקורת",
          "הכוכבים בצנצנת. לא בגוגל.",
          "תודה בעל פה לא מספיקה."
        ],
        "long_headlines": [
          "עוזרים ללקוחות שלך לכתוב ביקורת, במקום שבו מחפשים אותך.",
          "סייט בוט: אתר עץ שירותים, פרופיל תואם ועזרה בביקורות.",
          "199 ₪ + מע״מ לחודש. המחמאות שלך נכתבות במקום הנכון."
        ],
        "descriptions": [
          "הלקוח מסיים עבודה. אנחנו עוזרים לו לכתוב ביקורת.",
          "ביקורות כתובות עוזרות ללקוחות הבאים להבין מי אתה.",
          "בדוק חינם מה רואים עליך בגוגל, לפני הלקוח הבא."
        ]
      }
    },
    "S3": {
      "title": "The level",
      "hooks": [
        {
          "voice": "הפלס עקום. הסיפורים לא מתיישרים.",
          "display": "הפלס עקום. הסיפורים לא מתיישרים.",
          "banner": "שלוש גרסאות. בלי אמון."
        },
        {
          "voice": "אתר אומר דבר אחד. פרופיל אחר.",
          "display": "אתר אומר דבר אחד. פרופיל אחר.",
          "banner": "הבועה זזה שמאלה."
        },
        {
          "voice": "הלקוח מתאר מקצוע שלישי. אוי.",
          "display": "הלקוח מתאר מקצוע שלישי. אוי.",
          "banner": "גוגל מרים גבה."
        }
      ],
      "script_30": [
        {
          "time": "0-3",
          "screen": "Spirit level on dashboard, bubble jammed to one side; Dash shows three labels for the same business; brand mark in corner.",
          "speaker": "Dash",
          "voice": "הפלס עקום. הסיפורים לא מתיישרים.",
          "display": "הפלס עקום. הסיפורים לא מתיישרים.",
          "banner": "שלוש גרסאות. בלי אמון."
        },
        {
          "time": "3-10",
          "screen": "Three mismatches appear one by one; bubble slides further each time.",
          "speaker": "Dash",
          "voice": "אתר חשמלאי. פרופיל אינסטלטור. לקוח מיזוג.",
          "display": "אתר חשמלאי. פרופיל אינסטלטור. לקוח מיזוג.",
          "banner": "הבועה בורחת."
        },
        {
          "time": "10-16",
          "screen": "Owner straightens a shelf by instinct but cannot straighten this.",
          "speaker": "Dash",
          "voice": "אתה מיישר מדף. את זה לא.",
          "display": "אתה מיישר מדף. את זה לא.",
          "banner": "פלס לא עוזר."
        },
        {
          "time": "16-20",
          "screen": "Three labels float around the van; bubble still off-centre.",
          "speaker": "Dash",
          "voice": "שלושה סיפורים? גוגל לא מאמין.",
          "display": "שלושה סיפורים? גוגל לא מאמין.",
          "banner": null
        },
        {
          "time": "20-27",
          "screen": "Real screens: one service tree; site and profile aligned; bubble centres.",
          "speaker": "Eitan",
          "voice": "עץ שירותים אחד. אתר ופרופיל באותו קו.",
          "display": "עץ שירותים אחד. אתר ופרופיל באותו קו.",
          "banner": null
        },
        {
          "time": "27-30",
          "screen": "End card with price and free check CTA.",
          "speaker": "Eitan",
          "voice": "איתן מ-WAO. סיפור אחד. מֵאָה תִּשְׁעִים וָתֵשַׁע שֶׁקֶל פלוס מַעֲמ.",
          "display": "איתן מ-WAO. סיפור אחד: 199 ₪ + מע״מ.",
          "banner": null
        }
      ],
      "script_15": [
        {
          "time": "0-3",
          "screen": "Spirit level bubble jammed; three mismatched labels; brand mark in corner.",
          "speaker": "Dash",
          "voice": "הפלס עקום. הסיפורים לא מתיישרים.",
          "display": "הפלס עקום. הסיפורים לא מתיישרים.",
          "banner": "שלוש גרסאות. בלי אמון."
        },
        {
          "time": "3-8",
          "screen": "Labels mismatch one by one; bubble slides further.",
          "speaker": "Dash",
          "voice": "שלוש גרסאות. הבועה נלחצת.",
          "display": "שלוש גרסאות. הבועה נלחצת.",
          "banner": null
        },
        {
          "time": "8-10",
          "screen": "Owner tries to straighten the shelf; cannot straighten the story.",
          "speaker": "Dash",
          "voice": "שלושה סיפורים. בלי אמון.",
          "display": "שלושה סיפורים. בלי אמון.",
          "banner": null
        },
        {
          "time": "10-15",
          "screen": "Real screens: one service tree, site and profile aligned; bubble centres; end card.",
          "speaker": "Eitan",
          "voice": "סַיְיט בּוֹט: אתר ופרופיל באותו סיפור. מֵאָה תִּשְׁעִים וָתֵשַׁע שֶׁקֶל פלוס מַעֲמ.",
          "display": "סייט בוט: אתר ופרופיל באותו סיפור. 199 ₪ + מע״מ.",
          "banner": null
        }
      ],
      "eitan_close": {
        "voice": "איתן מ-WAO. סיפור אחד. מֵאָה תִּשְׁעִים וָתֵשַׁע שֶׁקֶל פלוס מַעֲמ.",
        "display": "איתן מ-WAO. סיפור אחד: 199 ₪ + מע״מ.",
        "end_card": "סייט בוט — 199 ₪ + מע״מ לחודש. בדוק את העסק שלך חינם."
      },
      "text_assets": {
        "headlines": [
          "שלושה סיפורים? בלי אמון.",
          "אתר ופרופיל באותו קו.",
          "הפלס של העסק שלך."
        ],
        "long_headlines": [
          "סייט בוט מסדר את הסיפור שלך: אתר, פרופיל ושירותים תואמים.",
          "כשהאתר, הפרופיל והלקוחות מספרים אותו דבר, גוגל מבין.",
          "199 ₪ + מע״מ לחודש. עץ שירותים אחד, בלי בלגן."
        ],
        "descriptions": [
          "עץ שירותים אחד באתר, פרופיל עסקי תואם, וביקורות מסודרות.",
          "בדוק חינם מה לקוחות רואים כשהם מחפשים את המקצוע שלך.",
          "המערכת שומרת על אותו סיפור באתר ובפרופיל, בלי עבודה כפולה."
        ]
      }
    }
  }
}

## Noa review
# Noa QA — Dash video scripts r1 (2026-11-12)

Source: `docs/copy/video-dash-scripts-r1-2026-11-12.waocopy.md`. Brief: `docs/copy/briefs/video-dash-scripts-r1-2026-11-12.md`. No source file edited.

## Verdicts

| Ep | Verdict | Blocking items |
|---|---|---|
| A1 | FIX | global price/VAT voice fix (G1–G3); end card says he opens the account; long headline 1 grammar |
| A2 | FIX | G1–G3; homograph imperative סמן; "בלי קליקים ריקים" promises a result; "שבועית" misuse |
| A3 | FIX | G1–G3; description 2 grammar ("customers that closed") |
| S1 | FIX | G1–G3; "אבל שקוף" agreement; "המכסה" ambiguous; hook 3 and a banner don't work |
| S2 | FIX | G1–G3; close "ביקורות נכתבות: 199 ₪" reads like a counter of 199 reviews, and promises reviews get written |
| S3 | FIX | G1–G3; "ביקורות מסודרות" reads as arranged reviews (Google review policy) |

Most of it is clean. Hooks are all 6 words or fewer (cap 8). Every Dash line is 7 words or fewer (cap 12). Address is singular male throughout. Display typography is clean: ״ in מע״מ, em-dashes have single spaces, no ASCII quotes, no double spaces. Text assets all fit: the longest headline is 27/40 ("עבודה טובה. אף אחד לא רואה."), the longest long headline is 62/90 (A2 #1), the longest description is 64/90 (A1 #1). No first place, lead counter, ringing finale, credit amount, real client or ₪1,500 comparison anywhere. No banner text copies system notification wording; whether the banner *looks* like a real notification is a design check (Maya/Dana).

## Global fixes (apply everywhere they occur)

**G1 🟠 TTS / spelling: the VAT word ends in a non-final mem, and וָ forces a formal "va-".** "מַעֲמ" ends in a regular מ, which is a spelling error and a TTS risk. "וָתֵשַׁע" with kamatz will be read "va-tesha". A Sabra says "ve-tesha".
- `מָאתַיִם אַרְבָּעִים וָתֵשַׁע שֶׁקֶל פלוס מַעֲמ` → `מָאתַיִם אַרְבָּעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש` (all 8 voice occurrences, A1–A3)
- `מֵאָה תִּשְׁעִים וָתֵשַׁע שֶׁקֶל פלוס מַעֲמ` → `מֵאָה תִּשְׁעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש` (all 8 voice occurrences, S1–S3)
- Keep "שקל", not "שקלים". It is the spoken form.

**G2 ⚖️ The price is said without "a month".** Spoken "249 שקל" sounds like a one-time price, but both bots are monthly retainers. G1 adds "לחודש" to the voice lines. The matching display fix:
- `249 ₪ + מע״מ.` → `249 ₪ + מע״מ לחודש.` (display lines only; the end cards and text assets already say לחודש and won't match)
- `199 ₪ + מע״מ.` → `199 ₪ + מע״מ לחודש.` (same)
- This puts Eitan's close at 11 words against "about 6–10". It's acceptable, and the fact matters more.

**G3 🔴 The brand token in the voice lines.** `איתן מ-WAO` is the only Latin token in the voice lines. ElevenLabs may spell it W-A-O or say "wow". Adam/Eitan: confirm how the brand is said. If it's "וואו", the voice line needs a Hebrew spelling with nikud, e.g. `איתן מִ-וָואוֹ`. That spelling is a placeholder until Eitan decides, so do a listen test before batch render. If Eitan records his close himself, this item drops.

**G4 🟡 Product name consistency (route to Adam).** The site uses Latin "Site Bot" / "Ads Bot". The scripts use "סייט בוט" / "בוט מודעות". Hebrew is right for TTS. For captions and end cards, decide whether they match the landing page. Separately, "סַיְיט בּוֹט" with a doubled yod is untested. Listen-test it against `סַייט בּוֹט` before rendering.

## Per-episode fixes (`old → new`, old is byte-exact)

### A1
- 🟠/⚖️ end card (A1 and A2): we open the account, not him. `פתח חשבון חדש על שמך.` → `נפתח לך חשבון חדש על שמך.` Tamar may want a stronger CTA verb. This fixes the fact only.
- 🟠 long headline 1: customers aren't "a job that closed"; enquiries are. `הבוט לומד מלקוחות שאתה מסמן כעבודה אמיתית שנסגרה, לא מקליקים.` → `הבוט לומד מפניות שאתה מסמן כעבודה אמיתית שנסגרה, לא מקליקים.` (62 chars)
- 🟡 Tamar: the 20–27 Eitan line drops the punch, "not from clicks". "כאמיתיים" also reads translated. `בוט מודעות לומד מלקוחות שאתה מסמן כאמיתיים.` → suggested `בוט מודעות לומד מהפניות שסגרת, לא מקליקים.` (it sells the contrast the whole episode set up)
- 🤖 "הטלפון שותק / שקט" appears 3 times in the 30s cut. The repetition reads mechanical. Tamar: vary one.
- 🟡 banner `מונה רץ. כיס מדמם.`: "a bleeding pocket" is a calque. The native idiom is "מדמם כסף".

### A2
- 🟠 TTS homograph: bare imperative סמן can be read as past tense. `סמן לקוחות אמיתיים. הבוט לומד מזה.` → `תסמן לקוחות אמיתיים. הבוט לומד מזה.` (voice and display both, to keep them identical)
- ⚖️ description 2 promises zero wasted clicks. `בלי קליקים ריקים: תקציב מודעות מכוון לפי לקוחות.` → `תקציב מודעות שמכוון לפי לקוחות, לא לפי קליקים.`
- 🟠 description 3: "שבועית" is an adjective used as an adverb. `מופיעות שבועית.` → `מופיעות כל שבוע.`
- 🟡 15s `אחד, שניים, שלושה. בלי טלפון.`: "בלי טלפון" is limp. Tamar: try "אף צלצול".

### A3
- 🟠 description 2: customers don't "close". `הבוט לומד מלקוחות שאתה מסמן כאמיתיים שנסגרו, לא מקליקים.` → `הבוט לומד מפניות שסימנת כעבודה שנסגרה, לא מקליקים.`
- 🟡 headline 1 `דוח יפה. אף לקוח?` is half a phrase. Tamar: echo the hook, `דוח יפה. לקוח? אין.` (18 chars)
- 🟡 hook 3 `הדוח הזה הפוך. כמו המספרים?` is confusing. Drop it (see "die" list).

### S1
- 🟠 agreement: "שקוף" has no subject. It can't agree with עבודה (feminine), and the scene uses "we" (עברה דרכנו). This also restores the brief's "years" beat. `עבודה טובה. אבל שקוף.` → `שנים של עבודה טובה. ואנחנו שקופים.` (30s and 15s, voice and display)
- 🟠 TTS / clarity: "המכסה" is ambiguous (mikhse/mekhase, and which lid?). `שמו קפה על המכסה. הוא נפל.` → `שמו קפה על מִכְסֵה המנוע. הוא נפל.` (display without nikud: `שמו קפה על מכסה המנוע. הוא נפל.`)
- 🟡 banner `הקפה נפל. התיאבון נשאר.` makes no sense. Tamar: suggested `אפילו הקפה עבר דרכנו.`
- 🟡 hook 3 `לקוחה עברה דרך הדלת. שוב.`: in Hebrew, walking through the door just means she came in, so the joke inverts. Suggested `עוד לקוחה עברה דרכנו. שוב.`
- 🟡 Eitan 20–27 `אתר עץ שירותים, פרופיל תואם, עזרה בביקורות.`: a reflexive list of three, and "עץ שירותים" is our jargon, not his. Tamar: say what it is in his words (a site built around every service he does, with a Google profile that matches it). Keep the positioning: never a builder, never a small site.
- 🟡 long headline 1 `סייט בוט בונה נוכחות שלמה` puts "בונה" next to the product name, which edges toward builder framing. Tamar: consider "מסדר לך".

### S2
- ⚖️/🔴 meaning: `ביקורות נכתבות: 199 ₪` reads as "reviews written: 199". That looks like a counter, it promises reviews, and it doesn't name the product. `איתן מ-WAO. ביקורות נכתבות: 199 ₪ + מע״מ.` → `איתן מ-WAO. סייט בוט: 199 ₪ + מע״מ לחודש.`. The matching voice line: `איתן מ-WAO. ביקורות נכתבות. מֵאָה תִּשְׁעִים וָתֵשַׁע שֶׁקֶל פלוס מַעֲמ.` → `איתן מ-WAO. סַיְיט בּוֹט: מֵאָה תִּשְׁעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש.` (script_30 and eitan_close)
- 🟡 turn `גוגל לא שומע מחמאות.`: the brief's intent "Google has no ears" is funnier in native Hebrew. Tamar: `לגוגל אין אוזניים.`
- 🟡 long headline 1 `במקום שבו מחפשים אותך` is formal. Spoken: `איפה שמחפשים אותך`.
- 🟡 banners `בלי מיקרופון.` / `בלי קול.` are weak and don't earn a read on mute.

### S3
- ⚖️ Google review policy: "ביקורות מסודרות" reads as arranged or managed reviews. `וביקורות מסודרות.` → `ועזרה בביקורות.`
- ⚖️ (Yonatan) long headline 2 `כשהאתר, הפרופיל והלקוחות מספרים אותו דבר, גוגל מבין.` implies we steer what customers write. Suggested `כשהאתר והפרופיל מספרים אותו סיפור, גוגל מבין.`
- 🟡 close `סיפור אחד: 199 ₪` doesn't name the product. Same fix as S2: `איתן מ-WAO. סיפור אחד: 199 ₪ + מע״מ.` → `איתן מ-WAO. סייט בוט: 199 ₪ + מע״מ לחודש.` (and the matching voice line, with G1 applied)

## Comedy

The voice is mostly native, dry and spoken. "Dash says the true thing plainly" works.

**Funniest 3**
1. A2 hook — `שמעתי זמזום. זה התקציב שלך.`
2. A2 30s — `כמעט מתקשר. בעצם לא.` + banner `הזבוב התחרט.`
3. A3 30s — `שאלת על לקוחות? שקט.` + banner `צרצר אחד.`
(Runners-up: `הקליק השלישי: הסתכל והלך.`, `אתה מיישר מדף. את זה לא.`, `גוגל מרים גבה.`)

**3 that die**
1. S1 banner `הקפה נפל. התיאבון נשאר.` — nonsense.
2. A3 hook 3 `הדוח הזה הפוך. כמו המספרים?` — the reader has to work to get it.
3. S1 hook 3 `לקוחה עברה דרך הדלת. שוב.` — the literal Hebrew means she came in.

The joke is never on the tradesman. "אתה שקוף" and "אתה מיישר מדף" are on his side, because "שקוף" as overlooked-person slang is native and sympathetic.

## Dash's Hebrew name

Of Tamar's three, **דַּשׁוֹנִי**. The -וני ending is native affectionate (חמודוני). Reject **פְּלָאפֹונִי**: it's built on Pelephone's registered brand, so it's a legal risk. Reject bare **דַּשׁ**: without nikud it reads as ד״ש. Option for Tamar: **צִלְצוּל**, a phone named "Ring" that never rings, which carries the whole concept in one word. If it stays דשוני, the display spelling is דשוני.

## Handoffs
- Tamar: all 🟡 / 🤖 items above.
- Adam/Eitan: G3 brand pronunciation; G4 product-name convention; listen test of the nikud lines (סייט בוט, מעם, מכסה) before batch render.
- Yonatan: S3 long headline 2 and the S2/S3 review wording.
- Maya/Dana: banner visual must not mimic real OS notifications.

## Writing upgrades (for waocopy, abstract)
1. A price spoken aloud always carries its billing period. (Can't make a page worse; it's a fact.)
2. In a list of benefits for a lead-learning product, the object marked is the enquiry/job, not the customer. Keep the noun the user actually acts on.
