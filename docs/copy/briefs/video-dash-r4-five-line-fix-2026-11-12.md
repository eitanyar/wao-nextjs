# Dash r4: fix five eyes-closed lines (2026-11-12)

The founder approved the direction of the round 4 final candidate. Five voice lines still lean on the cartoon, and the voice checker and Noa agree on them. Rewrite ONLY these lines (their `voice` and matching `display`):

1. A1 script_30[1]: "three clicks" only makes sense because three cursors appear on screen. Three clicks is also too small a number to be a real complaint.
2. A1 script_30[2]: "everyone clicked" points at the cursor characters. With eyes closed it has no subject. The same words also appear in A1 script_15[2]; fix that one too.
3. A2 script_30[1]: "you blocked clicks, they come back" narrates the sprayed flies returning. Owners don't block "clicks", and clicks don't "come back".
4. A2 script_30[2]: "someone almost called" narrates the fly hesitating. In real life, nobody can know that someone almost called.
5. S3 script_30[2]: "you straighten a shelf, but not this" only makes sense while watching him straighten the shelf. "This" has no antecedent by ear.

Rules:
- Eyes-closed: a busy Israeli tradesman understands each line on first hearing with the screen off. Use plain money and work facts in his words.
- Keep the deadpan and the line's rhythm (short, 3–8 words). Each line must still fit its neighbours in the 30s script; the full episode context is below.
- Keep the English audio tag at the start of `voice`. Change the tag only if the new line's meaning needs a different one, and update `tag_why` if you do.
- Male singular. Prefer words with one obvious reading without vowels. Add niqqud in `voice` only on a word that truly needs it; `display` has no niqqud.
- Don't touch the `screen` field or any other line.

Return patches: byte-exact old → new for each `voice` and `display` string you change, plus `tag_why` if changed. Give a one-line English reason per line.

## Episode context
{
 "A1": {
  "title": "The meter",
  "script_30": [
   {
    "screen": "The screen of דַּשׁוֹנִי is a taxi meter; each click adds shekels; brand mark in corner from first frame.",
    "voice": "[sighs] כל קליק עוֹלֶה כסף. אף אחד לא מתקשר.",
    "display": "כל קליק עולה כסף. אף אחד לא מתקשר.",
    "tag_why": "opening sad fact"
   },
   {
    "screen": "Three cursor-clicks appear, look around, leave; coins drift out of the jar.",
    "voice": "[tired] שילמת על שלושה קליקים. אף צלצול.",
    "display": "שילמת על שלושה קליקים. אף צלצול.",
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
    "voice": "[calm] איתן מ-WAO. בוט מודעות: מָאתַיִם אַרְבָּעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש.",
    "display": "איתן מ-WAO. בוט מודעות: 249 ₪ + מע״מ לחודש.",
    "tag_why": "straight monthly price"
   }
  ],
  "script_15": [
   {
    "screen": "The screen of דַּשׁוֹנִי is a taxi meter; each click adds shekels; brand mark in corner.",
    "voice": "[sighs] כל קליק עוֹלֶה כסף. אף אחד לא מתקשר.",
    "display": "כל קליק עולה כסף. אף אחד לא מתקשר.",
    "tag_why": "opening sad fact"
   },
   {
    "screen": "Meter speeds up; coins leave the jar by themselves.",
    "voice": "[sarcastic] הכסף יורד על קליקים. שיחות? אין.",
    "display": "הכסף יורד על קליקים. שיחות? אין.",
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
  "hooks": [
   {
    "voice": "[sighs] כל קליק עוֹלֶה כסף. אף אחד לא מתקשר.",
    "display": "כל קליק עולה כסף. אף אחד לא מתקשר.",
    "tag_why": "sad fact performed with a sigh"
   },
   {
    "voice": "[deadpan] אתה משלם על כל קליק. הטלפון שותק.",
    "display": "אתה משלם על כל קליק. הטלפון שותק.",
    "tag_why": "deadpan on money bleeding"
   },
   {
    "voice": "[sarcastic] הכסף יורד על קליקים. שיחה? לא הייתה.",
    "display": "הכסף יורד על קליקים. שיחה? לא הייתה.",
    "tag_why": "flat disappointment"
   }
  ]
 },
 "A2": {
  "title": "Click-flies",
  "script_30": [
   {
    "screen": "A cloud of cursor-shaped flies circles the coin jar; דַּשׁוֹנִי swats one with its charging cable; brand mark in corner.",
    "voice": "[deadpan] עוד קליקים, עוד כסף. אף לקוח.",
    "display": "עוד קליקים, עוד כסף. אף לקוח.",
    "tag_why": "dry money drain"
   },
   {
    "screen": "The swarm grows; owner sprays; flies return.",
    "voice": "[tired] חסמת קליקים. הם חוזרים.",
    "display": "חסמת קליקים. הם חוזרים.",
    "tag_why": "weary repetition"
   },
   {
    "screen": "One fly stops, looks like it might call, then leaves.",
    "voice": "[deadpan] מישהו כמעט התקשר. בעצם לא.",
    "display": "מישהו כמעט התקשר. בעצם לא.",
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
    "voice": "[calm] איתן מ-WAO. בוט מודעות: מָאתַיִם אַרְבָּעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש.",
    "display": "איתן מ-WAO. בוט מודעות: 249 ₪ + מע״מ לחודש.",
    "tag_why": "straight monthly price"
   }
  ],
  "script_15": [
   {
    "screen": "Cursor-flies circle the coin jar; דַּשׁוֹנִי swats one with its cable; brand mark in corner.",
    "voice": "[deadpan] עוד קליקים, עוד כסף. אף לקוח.",
    "display": "עוד קליקים, עוד כסף. אף לקוח.",
    "tag_why": "dry money drain"
   },
   {
    "screen": "Every fly takes a coin and leaves; דַּשׁוֹנִי counts, bored.",
    "voice": "[tired] קליק, קליק, קליק. אף צלצול.",
    "display": "קליק, קליק, קליק. אף צלצול.",
    "tag_why": "counting clicks, no ring"
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
  "hooks": [
   {
    "voice": "[deadpan] עוד קליקים, עוד כסף. אף לקוח.",
    "display": "עוד קליקים, עוד כסף. אף לקוח.",
    "tag_why": "dry money drain"
   },
   {
    "voice": "[deadpan] קליק נראה תמים. אבל הוא עוֹלֶה כסף.",
    "display": "קליק נראה תמים. אבל הוא עולה כסף.",
    "tag_why": "flat contrast"
   },
   {
    "voice": "[deadpan] הקליקים גומרים לְךָ את התקציב.",
    "display": "הקליקים גומרים לך את התקציב.",
    "tag_why": "funniest dry realization"
   }
  ]
 },
 "S3": {
  "title": "The level",
  "script_30": [
   {
    "screen": "Spirit level on dashboard, bubble jammed to one side; דַּשׁוֹנִי shows three labels for the same business; brand mark in corner.",
    "voice": "[deadpan] כל מקום אומר מקצוע אחר.",
    "display": "כל מקום אומר מקצוע אחר.",
    "tag_why": "dry mismatch"
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
    "voice": "[calm] איתן מ-WAO. סייט בוט: מֵאָה תִּשְׁעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש.",
    "display": "איתן מ-WAO. סייט בוט: 199 ₪ + מע״מ לחודש.",
    "tag_why": "straight monthly price"
   }
  ],
  "script_15": [
   {
    "screen": "Spirit level bubble jammed; three mismatched labels; brand mark in corner.",
    "voice": "[deadpan] כל מקום אומר מקצוע אחר.",
    "display": "כל מקום אומר מקצוע אחר.",
    "tag_why": "dry mismatch"
   },
   {
    "screen": "Labels mismatch one by one; bubble slides further.",
    "voice": "[tired] שלוש גרסאות. הלקוח מתבלבל.",
    "display": "שלוש גרסאות. הלקוח מתבלבל.",
    "tag_why": "weary confusion"
   },
   {
    "screen": "Owner tries to straighten the shelf; cannot straighten the story.",
    "voice": "[sighs] שלושה סיפורים. אף אחד לא מאמין.",
    "display": "שלושה סיפורים. אף אחד לא מאמין.",
    "tag_why": "sad consequence"
   },
   {
    "screen": "Real screens: one service story, site and profile aligned; bubble centres; end card.",
    "voice": "[calm] סייט בוט: אתר ופרופיל, סיפור אחד. מֵאָה תִּשְׁעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש.",
    "display": "סייט בוט: אתר ופרופיל, סיפור אחד. 199 ₪ + מע״מ לחודש.",
    "tag_why": "product then monthly price"
   }
  ],
  "hooks": [
   {
    "voice": "[deadpan] כל מקום אומר מקצוע אחר.",
    "display": "כל מקום אומר מקצוע אחר.",
    "tag_why": "dry mismatch"
   },
   {
    "voice": "[deadpan] אתר אומר דבר אחד. פרופיל אחר.",
    "display": "אתר אומר דבר אחד. פרופיל אחר.",
    "tag_why": "flat mismatch"
   },
   {
    "voice": "[sighs] הלקוח לא מבין מה אתה עושה. אוי.",
    "display": "הלקוח לא מבין מה אתה עושה. אוי.",
    "tag_why": "sigh at confusion"
   }
  ]
 }
}