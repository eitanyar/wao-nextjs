# Video scripts — Dash, round 4: the eyes-closed pass (2026-11-12)

The round 3 scripts are pasted below. The founder listened to the A1 voice sample and stopped at lines he could not understand by ear:
- the "meter" line (the voice read the word for meter as "muna"; and even said right, "the click meter started" means nothing without seeing the taxi-meter on screen);
- "three clicks, three coins": nobody thinks of a click costing a few to tens of shekels as "coins". Without the picture it is nonsense.

The cause: the voice lines were written picture-first. Below are ONLY the spoken parts of the round 3 scripts (hooks, script_30, script_15, eitan_close). Return the same JSON shape with the same keys and the same number of lines per section, with this change:

1. **Eyes-closed rule (NEW, every `voice` line).** A busy Israeli tradesman hears the line with the screen off. He must understand it on the first hearing. No line may depend on the cartoon to make sense.
   - No visual metaphors in the voice: no meter, coins, jar, flies, confetti, or anything that only exists in the drawing. The `screen` field may keep them. The voice says the plain thing they stand for, in the money and work words a business owner actually uses.
   - Prefer words with one obvious reading when read without vowels. Avoid words a Hebrew text-to-speech voice could read two ways. When you can't avoid one, add niqqud on that word only.
   - Keep the deadpan humour and the per-line audio tag (`tag_why` too). The joke must come from the situation, not from the picture.
2. `display` follows the new `voice` (same words, no niqqud, WAO in Latin).
3. Do not change: `screen`, the closing line structure (Eitan from WAO, product name, price with "a month"), or the round 3 constraints (no results, no call counts, no credit amount, no real clients, no notification-lookalike banners; Site Bot is not a website builder; reviews: we only help customers leave one).
4. The voice spellings below are already approved by ear. Keep the plain-text forms in `voice`; a script swaps in the TTS spelling automatically: the ads-bot product name, "from clicks", "from the leads", the Site Bot name, and the brand.
5. Add a top-level `changes` list: for each changed line, give the episode, the field path, and in English why the old line failed with eyes closed.

Return one JSON object, no markdown.

## Round 3 spoken parts
{
 "episodes": {
  "A1": {
   "title": "The meter",
   "hooks": [
    {
     "voice": "[sighs] מונה הקליקים התחיל. אף אחד לא מתקשר.",
     "display": "מונה הקליקים התחיל. אף אחד לא מתקשר.",
     "tag_why": "sad fact performed with a sigh"
    },
    {
     "voice": "[deadpan] כל קליק לוקח מטבע. הטלפון שותק.",
     "display": "כל קליק לוקח מטבע. הטלפון שותק.",
     "tag_why": "deadpan on money bleeding"
    },
    {
     "voice": "[sarcastic] המונה דופק. שיחה? לא נרשמה.",
     "display": "המונה דופק. שיחה? לא נרשמה.",
     "tag_why": "flat disappointment"
    }
   ],
   "script_30": [
    {
     "screen": "The screen of דַּשׁוֹנִי is a taxi meter; each click adds shekels; brand mark in corner from first frame.",
     "voice": "[sighs] מונה הקליקים התחיל. אף אחד לא מתקשר.",
     "display": "מונה הקליקים התחיל. אף אחד לא מתקשר.",
     "tag_why": "opening sad fact"
    },
    {
     "screen": "Three cursor-clicks appear, look around, leave; coins drift out of the jar.",
     "voice": "[tired] שלושה קליקים. שלושה מטבעות. אף צלצול.",
     "display": "שלושה קליקים. שלושה מטבעות. אף צלצול.",
     "tag_why": "weariness at silent phone"
    },
    {
     "screen": "Owner's hand picks up דַּשׁוֹנִי, checks missed enquiries; empty list.",
     "voice": "[short pause] בדקת. אין פניות. כולם לחצו.",
     "display": "בדקת. אין פניות. כולם לחצו.",
     "tag_why": "blunt check, no enquiries"
    },
    {
     "screen": "Meter keeps running; no call; דַּשׁוֹנִי stares deadpan.",
     "voice": "[deadpan] הקליקים באים. הטלפון שותק.",
     "display": "הקליקים באים. הטלפון שותק.",
     "tag_why": "dry punchline"
    },
    {
     "screen": "Real product screen; owner's thumb marks a lead as real; weekly cost line visible.",
     "voice": "[calm] בוט מודעות לומד מהפניות שסגרת, לא מקליקים.",
     "display": "בוט מודעות לומד מהפניות שסגרת, לא מקליקים.",
     "tag_why": "confident mechanism contrast"
    },
    {
     "screen": "End card with price, account in his name, and CTA.",
     "voice": "[calm] איתן מִוָואוּ. בוט מודעות: מָאתַיִם אַרְבָּעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש.",
     "display": "איתן מ-WAO. בוט מודעות: 249 ₪ + מע״מ לחודש.",
     "tag_why": "straight monthly price"
    }
   ],
   "script_15": [
    {
     "screen": "The screen of דַּשׁוֹנִי is a taxi meter; each click adds shekels; brand mark in corner.",
     "voice": "[sighs] מונה הקליקים התחיל. אף אחד לא מתקשר.",
     "display": "מונה הקליקים התחיל. אף אחד לא מתקשר.",
     "tag_why": "opening sad fact"
    },
    {
     "screen": "Meter speeds up; coins leave the jar by themselves.",
     "voice": "[sarcastic] המונה רץ. המטבעות עפים.",
     "display": "המונה רץ. המטבעות עפים.",
     "tag_why": "dry observation of money leaving"
    },
    {
     "screen": "Owner's hand checks דַּשׁוֹנִי; no missed enquiries.",
     "voice": "[deadpan] כולם לחצו. הטלפון שותק.",
     "display": "כולם לחצו. הטלפון שותק.",
     "tag_why": "blunt letdown"
    },
    {
     "screen": "Real product screen; lead marked real; end card with price and CTA.",
     "voice": "[calm] בוט מודעות לומד מהפניות שסגרת, לא מקליקים. מָאתַיִם אַרְבָּעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש.",
     "display": "בוט מודעות לומד מהפניות שסגרת, לא מקליקים. 249 ₪ + מע״מ לחודש.",
     "tag_why": "mechanism then monthly price"
    }
   ],
   "eitan_close": {
    "voice": "[calm] איתן מִוָואוּ. בוט מודעות: מָאתַיִם אַרְבָּעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש.",
    "display": "איתן מ-WAO. בוט מודעות: 249 ₪ + מע״מ לחודש.",
    "tag_why": "simple closing monthly price"
   }
  },
  "A2": {
   "title": "Click-flies",
   "hooks": [
    {
     "voice": "[deadpan] זבובי קליקים שוב ליד הצנצנת.",
     "display": "זבובי קליקים שוב ליד הצנצנת.",
     "tag_why": "dry pest image"
    },
    {
     "voice": "[deadpan] הם נראים תמימים. הם אוכלים מטבעות.",
     "display": "הם נראים תמימים. הם אוכלים מטבעות.",
     "tag_why": "flat contrast"
    },
    {
     "voice": "[deadpan] שמעתי זמזום. זה התקציב שלך.",
     "display": "שמעתי זמזום. זה התקציב שלך.",
     "tag_why": "funniest dry realization"
    }
   ],
   "script_30": [
    {
     "screen": "A cloud of cursor-shaped flies circles the coin jar; דַּשׁוֹנִי swats one with its charging cable; brand mark in corner.",
     "voice": "[deadpan] זבובי קליקים שוב ליד הצנצנת.",
     "display": "זבובי קליקים שוב ליד הצנצנת.",
     "tag_why": "dry pest image"
    },
    {
     "screen": "The swarm grows; owner sprays; flies return.",
     "voice": "[tired] הריסוס לא עוזר. הם חוזרים.",
     "display": "הריסוס לא עוזר. הם חוזרים.",
     "tag_why": "weary repetition"
    },
    {
     "screen": "One fly stops, looks like it might call, then leaves.",
     "voice": "[deadpan] כמעט מתקשר. בעצם לא.",
     "display": "כמעט מתקשר. בעצם לא.",
     "tag_why": "deadpan near-miss"
    },
    {
     "screen": "Flies keep circling; jar lighter; דַּשׁוֹנִי looks tired.",
     "voice": "[sighs] הרבה קליקים. בלי לקוחות.",
     "display": "הרבה קליקים. בלי לקוחות.",
     "tag_why": "sad fact"
    },
    {
     "screen": "Real product screen; owner marks which enquiries were real jobs.",
     "voice": "[calm] אתה מסמן עבודה אמיתית. הבוט לומד מזה.",
     "display": "אתה מסמן עבודה אמיתית. הבוט לומד מזה.",
     "tag_why": "mechanism in his action"
    },
    {
     "screen": "End card with price, account in his name, and CTA.",
     "voice": "[calm] איתן מִוָואוּ. בוט מודעות: מָאתַיִם אַרְבָּעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש.",
     "display": "איתן מ-WAO. בוט מודעות: 249 ₪ + מע״מ לחודש.",
     "tag_why": "straight monthly price"
    }
   ],
   "script_15": [
    {
     "screen": "Cursor-flies circle the coin jar; דַּשׁוֹנִי swats one with its cable; brand mark in corner.",
     "voice": "[deadpan] זבובי קליקים שוב ליד הצנצנת.",
     "display": "זבובי קליקים שוב ליד הצנצנת.",
     "tag_why": "dry pest image"
    },
    {
     "screen": "Every fly takes a coin and leaves; דַּשׁוֹנִי counts, bored.",
     "voice": "[tired] אחד, שניים, שלושה. אף צלצול.",
     "display": "אחד, שניים, שלושה. אף צלצול.",
     "tag_why": "counting nothing"
    },
    {
     "screen": "Empty jar; דַּשׁוֹנִי stares at camera.",
     "voice": "[sighs] הרבה קליקים. בלי לקוחות.",
     "display": "הרבה קליקים. בלי לקוחות.",
     "tag_why": "sad fact"
    },
    {
     "screen": "Real product screen; owner marks real jobs; end card with price and CTA.",
     "voice": "[calm] תסמן עבודות אמיתיות. הבוט לומד מזה. מָאתַיִם אַרְבָּעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש.",
     "display": "תסמן עבודות אמיתיות. הבוט לומד מזה. 249 ₪ + מע״מ לחודש.",
     "tag_why": "clear action then monthly price"
    }
   ],
   "eitan_close": {
    "voice": "[calm] איתן מִוָואוּ. בוט מודעות: מָאתַיִם אַרְבָּעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש.",
    "display": "איתן מ-WAO. בוט מודעות: 249 ₪ + מע״מ לחודש.",
    "tag_why": "simple closing monthly price"
   }
  },
  "A3": {
   "title": "The report",
   "hooks": [
    {
     "voice": "[deadpan] דוח מבריק. לקוח? אין.",
     "display": "דוח מבריק. לקוח? אין.",
     "tag_why": "dry missing customer"
    },
    {
     "voice": "[tired] עוד דוח יפה. העסק עדיין מחכה.",
     "display": "עוד דוח יפה. העסק עדיין מחכה.",
     "tag_why": "weary repetition"
    },
    {
     "voice": "[deadpan] גרפים עולים. לקוחות לא.",
     "display": "גרפים עולים. לקוחות לא.",
     "tag_why": "clear contrast, no confusion"
    }
   ],
   "script_30": [
    {
     "screen": "A glossy report slaps onto the windscreen from outside; big green arrows; דַּשׁוֹנִי reads it upside down; brand mark in corner.",
     "voice": "[deadpan] דוח מבריק. לקוח? אין.",
     "display": "דוח מבריק. לקוח? אין.",
     "tag_why": "dry missing customer"
    },
    {
     "screen": "Three reports pile up, each shinier; confetti for clicks and impressions.",
     "voice": "[sarcastic] קונפטי לקליקים. איפה הלקוח?",
     "display": "קונפטי לקליקים. איפה הלקוח?",
     "tag_why": "dry question"
    },
    {
     "screen": "Owner's hand taps the report; silence; one cricket.",
     "voice": "[deadpan] שאלת על לקוחות? שקט.",
     "display": "שאלת על לקוחות? שקט.",
     "tag_why": "blunt silence"
    },
    {
     "screen": "Confetti stops in mid-air; דַּשׁוֹנִי looks at camera.",
     "voice": "[sighs] הדוחות יפים. הטלפון שקט.",
     "display": "הדוחות יפים. הטלפון שקט.",
     "tag_why": "sad fact"
    },
    {
     "screen": "Real product screen; lead marked real; weekly cost line visible.",
     "voice": "[calm] בוט מודעות לומד מהפניות שסגרת, לא מקליקים.",
     "display": "בוט מודעות לומד מהפניות שסגרת, לא מקליקים.",
     "tag_why": "confident mechanism contrast"
    },
    {
     "screen": "End card with price, account in his name, and CTA.",
     "voice": "[calm] איתן מִוָואוּ. בוט מודעות, בלי דוחות יפים. מָאתַיִם אַרְבָּעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש.",
     "display": "איתן מ-WAO. בוט מודעות, בלי דוחות יפים. 249 ₪ + מע״מ לחודש.",
     "tag_why": "closing promise and monthly price"
    }
   ],
   "script_15": [
    {
     "screen": "Glossy report slaps onto windscreen; דַּשׁוֹנִי reads it upside down; brand mark in corner.",
     "voice": "[deadpan] דוח מבריק. לקוח? אין.",
     "display": "דוח מבריק. לקוח? אין.",
     "tag_why": "dry missing customer"
    },
    {
     "screen": "Confetti for clicks and impressions; דַּשׁוֹנִי asks which line is a customer; confetti stops.",
     "voice": "[curious] איזו שורה היא לקוח?",
     "display": "איזו שורה היא לקוח?",
     "tag_why": "simple pointed question"
    },
    {
     "screen": "Reports pile up; silent dashboard.",
     "voice": "[tired] דוחות יפים. טלפון שקט.",
     "display": "דוחות יפים. טלפון שקט.",
     "tag_why": "weary contrast"
    },
    {
     "screen": "Real product screen; lead marked real; end card with price and CTA.",
     "voice": "[calm] בוט מודעות לומד מהפניות שסגרת, לא מקליקים. מָאתַיִם אַרְבָּעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש.",
     "display": "בוט מודעות לומד מהפניות שסגרת, לא מקליקים. 249 ₪ + מע״מ לחודש.",
     "tag_why": "mechanism then monthly price"
    }
   ],
   "eitan_close": {
    "voice": "[calm] איתן מִוָואוּ. בוט מודעות, בלי דוחות יפים. מָאתַיִם אַרְבָּעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש.",
    "display": "איתן מ-WAO. בוט מודעות, בלי דוחות יפים. 249 ₪ + מע״מ לחודש.",
    "tag_why": "closing promise and monthly price"
   }
  },
  "S1": {
   "title": "Ghost van",
   "hooks": [
    {
     "voice": "[whispers] היא חיפשה אינסטלטור. עברה דרכנו.",
     "display": "היא חיפשה אינסטלטור. עברה דרכנו.",
     "tag_why": "hushed loss"
    },
    {
     "voice": "[tired] הטנדר כאן. גוגל לא רואה.",
     "display": "הטנדר כאן. גוגל לא רואה.",
     "tag_why": "weary invisibility"
    },
    {
     "voice": "[sighs] עוד לקוחה עברה דרכנו. שוב.",
     "display": "עוד לקוחה עברה דרכנו. שוב.",
     "tag_why": "resigned repetition"
    }
   ],
   "script_30": [
    {
     "screen": "A woman on the pavement searches on her phone and walks straight through the see-through van; דַּשׁוֹנִי watches her pass; brand mark in corner.",
     "voice": "[whispers] היא חיפשה אינסטלטור. עברה דרכנו.",
     "display": "היא חיפשה אינסטלטור. עברה דרכנו.",
     "tag_why": "hushed loss"
    },
    {
     "screen": "Two more people walk through; one puts a coffee down on the bonnet and it falls.",
     "voice": "[sighs] שָׂמוּ קפה על מִכְסֵה המנוע. הוא נפל.",
     "display": "שמו קפה על מכסה המנוע. הוא נפל.",
     "tag_why": "sad physical gag"
    },
    {
     "screen": "Owner waves; nobody reacts; someone two streets away gets the job.",
     "voice": "[deadpan] מישהו בשכונה הבאה קיבל את העבודה.",
     "display": "מישהו בשכונה הבאה קיבל את העבודה.",
     "tag_why": "blunt lost job"
    },
    {
     "screen": "דַּשׁוֹנִי looks through the windscreen at passing searchers.",
     "voice": "[tired] שנים של עבודה טובה. ואנחנו שקופים.",
     "display": "שנים של עבודה טובה. ואנחנו שקופים.",
     "tag_why": "years of unseen work"
    },
    {
     "screen": "Real screens: service-led site next to the business profile, saying the same thing.",
     "voice": "[calm] אתר על כל השירותים שלך, ופרופיל גוגל באותו קו.",
     "display": "אתר על כל השירותים שלך, ופרופיל גוגל באותו קו.",
     "tag_why": "plain aligned presence"
    },
    {
     "screen": "End card with price and free check CTA.",
     "voice": "[calm] איתן מִוָואוּ. סַיְיט בּוֹט: מֵאָה תִּשְׁעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש.",
     "display": "איתן מ-WAO. סייט בוט: 199 ₪ + מע״מ לחודש.",
     "tag_why": "straight monthly price"
    }
   ],
   "script_15": [
    {
     "screen": "Woman searches on phone and walks through the see-through van; brand mark in corner.",
     "voice": "[whispers] היא חיפשה אינסטלטור. עברה דרכנו.",
     "display": "היא חיפשה אינסטלטור. עברה דרכנו.",
     "tag_why": "hushed loss"
    },
    {
     "screen": "More walk-throughs; coffee falls.",
     "voice": "[sighs] הם עוברים דרכנו. הקפה נפל.",
     "display": "הם עוברים דרכנו. הקפה נפל.",
     "tag_why": "sad physical gag"
    },
    {
     "screen": "דַּשׁוֹנִי watches the pavement; owner unseen, still working.",
     "voice": "[tired] שנים של עבודה טובה. ואנחנו שקופים.",
     "display": "שנים של עבודה טובה. ואנחנו שקופים.",
     "tag_why": "years of unseen work"
    },
    {
     "screen": "Real screens: site and profile aligned; end card with price and free check CTA.",
     "voice": "[calm] סַיְיט בּוֹט: אתר ופרופיל באותו קו. מֵאָה תִּשְׁעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש.",
     "display": "סייט בוט: אתר ופרופיל באותו קו. 199 ₪ + מע״מ לחודש.",
     "tag_why": "product then monthly price"
    }
   ],
   "eitan_close": {
    "voice": "[calm] איתן מִוָואוּ. סַיְיט בּוֹט: מֵאָה תִּשְׁעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש.",
    "display": "איתן מ-WAO. סייט בוט: 199 ₪ + מע״מ לחודש.",
    "tag_why": "simple closing monthly price"
   }
  },
  "S2": {
   "title": "The jar of stars",
   "hooks": [
    {
     "voice": "[deadpan] יש לנו צנצנת מחמאות. לגוגל אין אוזניים.",
     "display": "יש לנו צנצנת מחמאות. לגוגל אין אוזניים.",
     "tag_why": "dry ears joke"
    },
    {
     "voice": "[whispers] הלקוחה אמרה תודה. זה נגמר שם.",
     "display": "הלקוחה אמרה תודה. זה נגמר שם.",
     "tag_why": "quiet dead end"
    },
    {
     "voice": "[sighs] כל הכוכבים אצלנו. אף אחד לא רואה.",
     "display": "כל הכוכבים אצלנו. אף אחד לא רואה.",
     "tag_why": "sad hidden praise"
    }
   ],
   "script_30": [
    {
     "screen": "Glovebox opens; a jar of glowing stars rolls out; cartoon banner about compliments received in person; brand mark in corner.",
     "voice": "[sighs] כל הכוכבים אצלנו. אף אחד לא רואה.",
     "display": "כל הכוכבים אצלנו. אף אחד לא רואה.",
     "tag_why": "sad hidden praise"
    },
    {
     "screen": "Each star replays a silent thank-you at the door as a speech bubble; owner adds another star after a job.",
     "voice": "[calm] עוד תודה. עוד כוכב בצנצנת.",
     "display": "עוד תודה. עוד כוכב בצנצנת.",
     "tag_why": "soft private thank-you"
    },
    {
     "screen": "דַּשׁוֹנִי holds the jar up to the windscreen; passers-by cannot see it.",
     "voice": "[tired] אנחנו רואים. הם לא.",
     "display": "אנחנו רואים. הם לא.",
     "tag_why": "blunt invisibility"
    },
    {
     "screen": "Jar glows quietly; profile card stays empty.",
     "voice": "[deadpan] לגוגל אין אוזניים.",
     "display": "לגוגל אין אוזניים.",
     "tag_why": "dry core joke"
    },
    {
     "screen": "Real screen: simple flow that helps a customer leave a review.",
     "voice": "[calm] אנחנו עוזרים ללקוחות שלך להשאיר ביקורת.",
     "display": "אנחנו עוזרים ללקוחות שלך להשאיר ביקורת.",
     "tag_why": "help, not steering"
    },
    {
     "screen": "End card with price and free check CTA.",
     "voice": "[calm] איתן מִוָואוּ. סַיְיט בּוֹט: מֵאָה תִּשְׁעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש.",
     "display": "איתן מ-WAO. סייט בוט: 199 ₪ + מע״מ לחודש.",
     "tag_why": "straight monthly price"
    }
   ],
   "script_15": [
    {
     "screen": "Glovebox opens; jar of glowing stars rolls out; brand mark in corner.",
     "voice": "[sighs] כל הכוכבים אצלנו. אף אחד לא רואה.",
     "display": "כל הכוכבים אצלנו. אף אחד לא רואה.",
     "tag_why": "sad hidden praise"
    },
    {
     "screen": "Silent thank-you speech bubbles turn into stars.",
     "voice": "[whispers] תודה שקטה. כוכב שקט.",
     "display": "תודה שקטה. כוכב שקט.",
     "tag_why": "quiet private praise"
    },
    {
     "screen": "Jar held to windscreen; invisible to passers-by.",
     "voice": "[deadpan] לגוגל אין אוזניים.",
     "display": "לגוגל אין אוזניים.",
     "tag_why": "dry core joke"
    },
    {
     "screen": "Real screen: review flow; end card with price and free check CTA.",
     "voice": "[calm] סַיְיט בּוֹט עוזר ללקוחות שלך להשאיר ביקורת. מֵאָה תִּשְׁעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש.",
     "display": "סייט בוט עוזר ללקוחות שלך להשאיר ביקורת. 199 ₪ + מע״מ לחודש.",
     "tag_why": "help then monthly price"
    }
   ],
   "eitan_close": {
    "voice": "[calm] איתן מִוָואוּ. סַיְיט בּוֹט: מֵאָה תִּשְׁעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש.",
    "display": "איתן מ-WAO. סייט בוט: 199 ₪ + מע״מ לחודש.",
    "tag_why": "simple closing monthly price"
   }
  },
  "S3": {
   "title": "The level",
   "hooks": [
    {
     "voice": "[deadpan] הפלס עקום. הסיפורים לא מתיישרים.",
     "display": "הפלס עקום. הסיפורים לא מתיישרים.",
     "tag_why": "dry crooked level"
    },
    {
     "voice": "[deadpan] אתר אומר דבר אחד. פרופיל אחר.",
     "display": "אתר אומר דבר אחד. פרופיל אחר.",
     "tag_why": "flat mismatch"
    },
    {
     "voice": "[sighs] הלקוח מתאר מקצוע שלישי. אוי.",
     "display": "הלקוח מתאר מקצוע שלישי. אוי.",
     "tag_why": "sigh at confusion"
    }
   ],
   "script_30": [
    {
     "screen": "Spirit level on dashboard, bubble jammed to one side; דַּשׁוֹנִי shows three labels for the same business; brand mark in corner.",
     "voice": "[deadpan] הפלס עקום. הסיפורים לא מתיישרים.",
     "display": "הפלס עקום. הסיפורים לא מתיישרים.",
     "tag_why": "dry crooked level"
    },
    {
     "screen": "Three mismatches appear one by one; bubble slides further each time.",
     "voice": "[tired] אתר חשמלאי. פרופיל אינסטלטור. לקוח מיזוג.",
     "display": "אתר חשמלאי. פרופיל אינסטלטור. לקוח מיזוג.",
     "tag_why": "blunt mismatch list"
    },
    {
     "screen": "Owner straightens a shelf by instinct but cannot straighten this.",
     "voice": "[sighs] אתה מיישר מדף. את זה לא.",
     "display": "אתה מיישר מדף. את זה לא.",
     "tag_why": "wry tradesman truth"
    },
    {
     "screen": "Three labels float around the van; bubble still off-centre.",
     "voice": "[deadpan] שלושה סיפורים? גוגל לא מאמין.",
     "display": "שלושה סיפורים? גוגל לא מאמין.",
     "tag_why": "deadpan consequence"
    },
    {
     "screen": "Real screens: one service story; site and profile aligned; bubble centres.",
     "voice": "[calm] אתר ופרופיל מְסַפְּרִים אותו סיפור.",
     "display": "אתר ופרופיל מספרים אותו סיפור.",
     "tag_why": "simple alignment"
    },
    {
     "screen": "End card with price and free check CTA.",
     "voice": "[calm] איתן מִוָואוּ. סַיְיט בּוֹט: מֵאָה תִּשְׁעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש.",
     "display": "איתן מ-WAO. סייט בוט: 199 ₪ + מע״מ לחודש.",
     "tag_why": "straight monthly price"
    }
   ],
   "script_15": [
    {
     "screen": "Spirit level bubble jammed; three mismatched labels; brand mark in corner.",
     "voice": "[deadpan] הפלס עקום. הסיפורים לא מתיישרים.",
     "display": "הפלס עקום. הסיפורים לא מתיישרים.",
     "tag_why": "dry crooked level"
    },
    {
     "screen": "Labels mismatch one by one; bubble slides further.",
     "voice": "[tired] שלוש גרסאות. הבועה נלחצת.",
     "display": "שלוש גרסאות. הבועה נלחצת.",
     "tag_why": "weary confusion"
    },
    {
     "screen": "Owner tries to straighten the shelf; cannot straighten the story.",
     "voice": "[sighs] שלושה סיפורים. בלי אמון.",
     "display": "שלושה סיפורים. בלי אמון.",
     "tag_why": "sad consequence"
    },
    {
     "screen": "Real screens: one service story, site and profile aligned; bubble centres; end card.",
     "voice": "[calm] סַיְיט בּוֹט: אתר ופרופיל באותו סיפור. מֵאָה תִּשְׁעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש.",
     "display": "סייט בוט: אתר ופרופיל באותו סיפור. 199 ₪ + מע״מ לחודש.",
     "tag_why": "product then monthly price"
    }
   ],
   "eitan_close": {
    "voice": "[calm] איתן מִוָואוּ. סַיְיט בּוֹט: מֵאָה תִּשְׁעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש.",
    "display": "איתן מ-WAO. סייט בוט: 199 ₪ + מע״מ לחודש.",
    "tag_why": "simple closing monthly price"
   }
  }
 }
}