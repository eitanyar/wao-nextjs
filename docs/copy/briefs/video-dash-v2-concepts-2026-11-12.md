# Dash v2: story concepts (2026-11-12)

The founder approved the v1 scripts (below) as a usable fallback but said: "It's like chunks of sentences, not connected." He wants better humour and a fluent story. In 30 seconds you can't sell value, only the pain point and the solution, with humour.

**This round is CONCEPTS ONLY, not scripts.** For each of the six episodes, give 3 different story concepts, so he can pick one per episode before anyone writes full scripts.

Each concept:
- `logline_en`: one English sentence.
- `story_he`: 2–3 Hebrew sentences telling the whole story arc:
  - one character (or Dash, the deadpan phone on the van's dashboard, as narrator) in one concrete everyday situation of an Israeli tradesman;
  - it escalates;
  - a twist or punchline;
  - then the product as the way out.
- `joke_en`: in English, where the laugh is and why it works by ear.
- `callback_en`: the line or image from the opening that pays off at the end.
- `why_this_lands_en`: one line on why this would make a busy tradesman smile and recognise himself.

Rules for the stories you're pitching:
- **One story, not a list of jokes.** Each beat causes the next ("and then… so… until…"). Use a callback at the end.
- **Eyes-closed:** it must work by ear with the screen off. The cartoon can illustrate, but never carries the meaning.
- **Pain and solution only.** No price, no results promised, no call counts, no real clients. Site Bot is not a website builder. Reviews: we only help his customers leave one; we never steer what they write.
- **No founder name.** The voice ends on the brand said upbeat: `[excited] WAO!` plus the product name. The price lives only on the last screen, so don't mention it.
- **Product truths to stay inside:**
  - A-episodes are the Ads Bot: it runs his Google Ads and learns from the leads he marks as real closed jobs, not from clicks.
  - S-episodes are Site Bot: a site covering all his services, his Google Business Profile telling the same story, and help getting reviews from his customers.
- **Make the three concepts per episode genuinely different** in situation and kind of joke: irony, escalation, absurd comparison, role reversal. Native spoken Israeli Hebrew, male singular.

Return one JSON object: `{ "episodes": { "A1": { "pain": "<the pain in English>", "concepts": [ … 3 … ] }, … } }`.

## v1 (approved fallback), for the pain and product of each episode
{
 "A1": {
  "title": "The meter",
  "v1_script_30_voice": [
   "[sighs] כל קליק עוֹלֶה כסף. אף אחד לא מתקשר.",
   "[tired] שילמת על הרבה קליקים. אף צלצול.",
   "[short pause] בדקת. אין פניות. רק חיובים.",
   "[deadpan] הקליקים באים. הטלפון שותק.",
   "[calm] בוט מודעות לומד מהפניות שסגרת, לא מקליקים.",
   "[excited] WAO! [calm] בוט מודעות."
  ],
  "v1_screens": [
   "The screen of דַּשׁוֹנִי is a taxi meter; each click adds shekels; brand mark in corner from first frame.",
   "Three cursor-clicks appear, look around, leave; coins drift out of the jar.",
   "Owner's hand picks up דַּשׁוֹנִי, checks missed enquiries; empty list.",
   "Meter keeps running; no call; דַּשׁוֹנִי stares deadpan.",
   "Real product screen; owner's thumb marks a lead as real; weekly cost line visible.",
   "End card with price, account in his name, and CTA."
  ]
 },
 "A2": {
  "title": "Click-flies",
  "v1_script_30_voice": [
   "[deadpan] עוד קליקים, עוד כסף. אף לקוח.",
   "[tired] התקציב נגמר. שוב.",
   "[deadpan] הגיעו לאתר. לא התקשרו.",
   "[sighs] הרבה קליקים. בלי לקוחות.",
   "[calm] אתה מסמן עבודה אמיתית. הבוט לומד מזה.",
   "[excited] WAO! [calm] בוט מודעות."
  ],
  "v1_screens": [
   "A cloud of cursor-shaped flies circles the coin jar; דַּשׁוֹנִי swats one with its charging cable; brand mark in corner.",
   "The swarm grows; owner sprays; flies return.",
   "One fly stops, looks like it might call, then leaves.",
   "Flies keep circling; jar lighter; דַּשׁוֹנִי looks tired.",
   "Real product screen; owner marks which enquiries were real jobs.",
   "End card with price, account in his name, and CTA."
  ]
 },
 "A3": {
  "title": "The report",
  "v1_script_30_voice": [
   "[deadpan] דוח מבריק. לקוח? אין.",
   "[sarcastic] חגיגה על קליקים. איפה הלקוח?",
   "[deadpan] שאלת על לקוחות? שקט.",
   "[sighs] הדוחות יפים. הטלפון שותק.",
   "[calm] בוט מודעות לומד מהפניות שסגרת, לא מקליקים.",
   "[excited] WAO! [calm] בוט מודעות, בלי דוחות יפים."
  ],
  "v1_screens": [
   "A glossy report slaps onto the windscreen from outside; big green arrows; דַּשׁוֹנִי reads it upside down; brand mark in corner.",
   "Three reports pile up, each shinier; confetti for clicks and impressions.",
   "Owner's hand taps the report; silence; one cricket.",
   "Confetti stops in mid-air; דַּשׁוֹנִי looks at camera.",
   "Real product screen; lead marked real; weekly cost line visible.",
   "End card with price, account in his name, and CTA."
  ]
 },
 "S1": {
  "title": "Ghost van",
  "v1_script_30_voice": [
   "[whispers] היא חיפשה אינסטלטור. לא מצאה אוֹתְךָ.",
   "[sighs] אנשים עוברים לְיָדְךָ. הולכים למתחרה.",
   "[deadpan] מישהו בשכונה הבאה קיבל את העבודה.",
   "[tired] שנים של עבודה טובה. אף אחד לא רואה.",
   "[calm] האתר שֶׁלְּךָ והפרופיל בגוגל אומרים אותו דבר על כל השירותים.",
   "[excited] WAO! [calm] סייט בוט."
  ],
  "v1_screens": [
   "A woman on the pavement searches on her phone and walks straight through the see-through van; דַּשׁוֹנִי watches her pass; brand mark in corner.",
   "Two more people walk through; one puts a coffee down on the bonnet and it falls.",
   "Owner waves; nobody reacts; someone two streets away gets the job.",
   "דַּשׁוֹנִי looks through the windscreen at passing searchers.",
   "Real screens: service-led site next to the business profile, saying the same thing.",
   "End card with price and free check CTA."
  ]
 },
 "S2": {
  "title": "The jar of stars",
  "v1_script_30_voice": [
   "[sighs] כולם מרוצים. בגוגל אין ביקורות.",
   "[calm] עוד עבודה טובה. עוד תודה בסוף.",
   "[tired] אתה שומע תודה. גוגל לא.",
   "[deadpan] לגוגל אין אוזניים.",
   "[calm] אנחנו עוזרים ללקוחות שֶׁלְּךָ להשאיר ביקורת.",
   "[excited] WAO! [calm] סייט בוט."
  ],
  "v1_screens": [
   "Glovebox opens; a jar of glowing stars rolls out; cartoon banner about compliments received in person; brand mark in corner.",
   "Each star replays a silent thank-you at the door as a speech bubble; owner adds another star after a job.",
   "דַּשׁוֹנִי holds the jar up to the windscreen; passers-by cannot see it.",
   "Jar glows quietly; profile card stays empty.",
   "Real screen: simple flow that helps a customer leave a review.",
   "End card with price and free check CTA."
  ]
 },
 "S3": {
  "title": "The level",
  "v1_script_30_voice": [
   "[deadpan] כל מקום אומר מקצוע אחר.",
   "[tired] אתר חשמלאי. פרופיל אינסטלטור. לקוח מיזוג.",
   "[sighs] בעבודה אתה מדויק. ברשת, פחות.",
   "[deadpan] שלושה סיפורים? גוגל לא מאמין.",
   "[calm] אתר ופרופיל מְסַפְּרִים אותו סיפור.",
   "[excited] WAO! [calm] סייט בוט."
  ],
  "v1_screens": [
   "Spirit level on dashboard, bubble jammed to one side; דַּשׁוֹנִי shows three labels for the same business; brand mark in corner.",
   "Three mismatches appear one by one; bubble slides further each time.",
   "Owner straightens a shelf by instinct but cannot straighten this.",
   "Three labels float around the van; bubble still off-centre.",
   "Real screens: one service story; site and profile aligned; bubble centres.",
   "End card with price and free check CTA."
  ]
 }
}