# Dash v2: full scripts from the picked concepts (2026-11-12)

The creative director picked one concept per episode (below, with Noa's notes). Write the full scripts. The founder's complaint about v1: "chunks of sentences, not connected". v2 must be ONE fluent, funny story per ad that a tradesman hears with eyes closed.

## Hard rules
- **One story:** setup, escalation, turn, then the product. Each sentence leads into the next, and the callback pays off at the end. No explanation line after the punchline.
- **Dash narrates in his deadpan voice.** Other characters (customer, technician) are quoted by Dash, not voiced separately.
- **Eyes-closed:** every visual beat (roof, flag, pages, the passenger) is named in the voice. The Must be connected to a terminal.
 field describes the cartoon, and the  field carries the problem on mute.
- **No founder name. No price in the voice.** The voice ends with the brand said upbeat: the last  line ends with  followed by the product name in plain text (בוט מודעות / סייט בוט).
- **Audio tags:** one English v4 tag per line, matching that line's meaning (and ). The brand always carries its own  tag.
- **Product truths:**
  - Ads Bot runs his Google Ads and learns from the leads he marks as closed jobs, not from clicks. Vary the sentence shape across A1–A3, so the three endings don't all read "learns from X, not Y".
  - Site Bot is a site covering all his services, plus a Google profile that tells the same story, plus help getting reviews from his customers. It is never a "website builder".
  - Reviews: we only help customers leave one; we never steer what they write or guarantee they will.
  - No ranking promise ("show up first"), no results, no call counts, no real clients, no ringtone or ringing-phone sounds.
- **Native spoken Israeli Hebrew, male singular,** sentences of about 12–15 words. Prefer words with one obvious reading without vowels. Plain forms only for: בוט מודעות, מקליקים, מהפניות, סייט בוט, WAO; a script converts them for the voice.
- **Length:** script_30 is 5–7 lines, about 60–75 spoken words. script_15 is 3–4 lines, about 30–38 words. Follow the creative director's 15s cut. Hooks: 3 alternative opening lines, each usable as the first line of script_30.

## Also write (once, shared by all episodes)
: the stamp text for the last screen, meaning "cancel anytime, no commitment". Base it on the terms wording: monthly, no commitment, cancel online anytime. Max 5 words. Give 3 options with your pick.

## Output
One JSON object with the same per-line shape as v1: . Each line has , Must be connected to a terminal.
, , ,  (same words as voice, no niqqud, no tags),  (or null) and . Here is the v1 shape for reference:
{"hooks": [{"voice": "[sighs] כל קליק עוֹלֶה כסף. אף אחד לא מתקשר.", "display": "כל קליק עולה כסף. אף אחד לא מתקשר.", "tag_why": "sad fact performed with a sigh"}, {"voice": "[deadpan] אתה משלם על כל קליק. הטלפון שותק.", "display": "אתה משלם על כל קליק. הטלפון שותק.", "tag_why": "deadpan on money bleeding"}, {"voice": "[sarcastic] הכסף יורד על קליקים. שיחה? לא הייתה.", "display": "הכסף יורד על קליקים. שיחה? לא הייתה.", "tag_why": "flat disappointment"}], "script_30": [{"screen": "The screen of דַּשׁוֹנִי is a taxi meter; each click adds shekels; brand mark in corner from first frame.", "voice": "[sighs] כל קליק עוֹלֶה כסף. אף אחד לא מתקשר.", "display": "כל קליק עולה כסף. אף אחד לא מתקשר.", "tag_why": "opening sad fact"}, {"screen": "Three cursor-clicks appear, look around, leave; coins drift out of the jar.", "voice": "[tired] שילמת על הרבה קליקים. אף צלצול.", "display": "שילמת על הרבה קליקים. אף צלצול.", "tag_why": "weariness at silent phone"}, {"screen": "Owner's hand picks up דַּשׁוֹנִי, checks missed enquiries; empty list.", "voice": "[short pause] בדקת. אין פניות. רק חיובים.", "display": "בדקת. אין פניות. רק חיובים.", "tag_why": "blunt check, no enquiries"}, {"screen": "Meter keeps running; no call; דַּשׁוֹנִי stares deadpan.", "voice": "[deadpan] הקליקים באים. הטלפון שותק.", "display": "הקליקים באים. הטלפון שותק.", "tag_why": "dry punchline"}, {"screen": "Real product screen; owner's thumb marks a lead as real; weekly cost line visible.", "voice": "[calm] בוט מודעות לומד מהפניות שסגרת, לא מקליקים.", "display": "בוט מודעות לומד מהפניות שסגרת, לא מקליקים.", "tag_why": "confident mechanism contrast"}, {"screen": "End card with price, account in his name, and CTA.", "voice": "[excited] WAO! [calm] בוט מודעות.", "display": "WAO. בוט מודעות: 249 ₪ + מע״מ לחודש.", "tag_why": "straight monthly price"}], "script_15": [{"screen": "The screen of דַּשׁוֹנִי is a taxi meter; each click adds shekels; brand mark in corner.", "voice": "[sighs] כל קליק עוֹלֶה כסף. אף אחד לא מתקשר.", "display": "כל קליק עולה כסף. אף אחד לא מתקשר.", "tag_why": "opening sad fact"}, {"screen": "Meter speeds up; coins leave the jar by themselves.", "voice": "[sarcastic] הכסף יורד על קליקים. שיחות? אין.", "display": "הכסף יורד על קליקים. שיחות? אין.", "tag_why": "dry observation of money leaving"}, {"screen": "Owner's hand checks דַּשׁוֹנִי; no missed enquiries.", "voice": "[deadpan] קליקים יש. הטלפון שותק.", "display": "קליקים יש. הטלפון שותק.", "tag_why": "blunt letdown"}, {"screen": "Re

## Picked concepts (with Noa's notes)
{
 "A1": {
  "pain": "Every click costs money and the phone stays silent — he pays for visitors, not jobs.",
  "concept": {
   "logline_en": "Dash explains that his campaign is a taxi where every passenger asks the price to the airport and leaves — and the driver pays for the question.",
   "story_he": "דשוני מסתכל על בעל הבית שסופר קליקים כמו מונה מונית, ומסביר לו שכל קליק הוא נוסע שנכנס, שואל ״כמה עד נתב״ג?״, שומע מחיר ויוצא — והוא משלם על השאלה. הנהג היחיד בארץ שמשלם לנוסעים. ואז דשוני מראה לו את בוט המודעות של WAO, שלומד רק מהעבודות שהוא סימן כסגורות, לא מכל מי שנכנס לשאול.",
   "joke_en": "The laugh is the inversion — 'the only driver in the country who pays the passengers' — landing right after the perfectly ordinary taxi question 'how much to Ben Gurion?', so the ear recognises the scene before the absurd verdict hits.",
   "callback_en": "The airport question from the first beat returns as the filter at the end: the bot counts only rides that reached a closed job, not every head in the door.",
   "why_this_lands_en": "Every tradesman has paid for 'interest' that never became work, and every Israeli knows the taxi price question by heart.",
   "noa": "Connected: one analogy carried through, though it explains more than it escalates. 'The only driver in the country who pays the passengers' is a native, ear-proof punchline. No rule breach. Fixed: the product line now uses a relative clause instead of a dash fragment, and the calque 'כל ראש בדלת' became the callback 'כל מי שנכנס לשאול'."
  }
 },
 "A2": {
  "pain": "The budget burns out again on clicks that land, look around and leave — traffic, never customers.",
  "concept": {
   "logline_en": "Dash compares the campaign to a shuk stall handing out free tastings: the tasters keep coming back with friends, and nobody ever buys.",
   "story_he": "דשוני מסביר לבעל הבית שהקמפיין שלו הוא דוכן טעימות בשוק: כולם טועמים, חוזרים, מביאים חברים — והקופה ריקה. הקהל השמין, הקופה לא. ואז הוא מראה לו את בוט המודעות של WAO, שלומד מהעבודות שהוא סימן כסגורות, לא ממי שרק טעם.",
   "joke_en": "The laugh is the punchline contrast 'the crowd got fat, the till didn't', built on the universally heard shuk call 'come, taste' — the ear fills in the crowd noise without any screen.",
   "callback_en": "The free tasting from the opening returns as the distinction the bot makes: it learns from buyers (closed jobs), not tasters (clicks).",
   "why_this_lands_en": "Every Israeli has watched the shuk tasting crowd eat a stall's profit, and every advertiser has fed that same crowd.",
   "noa": "Connected, very Israeli, eyes-closed safe; 'הקהל השמין, הקופה לא' is a real laugh. Product truth was drifting: 'ממי שבאמת סגר עבודה' made the customer the one who closes the job and dropped the marking. Now 'מהעבודות שהוא סימן כסגורות'. No other breach."
  }
 },
 "A3": {
  "pain": "The agency's glossy reports throw confetti for clicks and impressions while the phone stays silent.",
  "concept": {
   "logline_en": "The owner proudly reads the monthly report aloud to Dash — record clicks, green graphs — until one question, 'and customers?', turns it into a lot of pages for 'no'.",
   "story_he": "בעל הבית מקריא לדשוני את הדוח החודשי בהתלהבות — שיא בקליקים, שיא בחשיפות, גרפים ירוקים — ודשוני שואל שאלה אחת: ולקוחות? הוא מדפדף, מדפדף, עוד גרף, ודשוני מסכם — הרבה עמודים בשביל ׳אין׳. ואז הוא מראה לו את בוט המודעות של WAO, שלומד בלי חגיגות מהעבודות שהוא מסמן כסגורות.",
   "joke_en": "The laugh is the deflation — one small question against a wall of proud numbers, answered by the sound of page-flipping and the dry verdict 'a lot of pages for no', all audible.",
   "callback_en": "'And customers?' is the question the report never answers; the end is the product that starts from exactly that answer — the jobs he marks closed.",
   "why_this_lands_en": "He has sat through that exact presentation, nodded at the graphs, and gone home to a silent phone.",
   "noa": "Connected and fully audible: proud reading, one question, page-flipping, verdict. 'הרבה עמודים בשביל ׳אין׳' is native and dry. No rule breach. The only fix was the dash fragment in the product line."
  }
 },
 "S1": {
  "pain": "Customers search for his trade right next to his van and can't find him — the job goes to someone two streets away.",
  "concept": {
   "logline_en": "The owner escalates from a bigger magnetic sign to a flag to standing on the roof waving a wrench — while the searcher downstairs keeps finding the competitor on her phone.",
   "story_he": "בעל הבית מגדיל את השלט המגנטי על הרכב, מוסיף דגל, ובסוף עומד על הגג עם מפתח שוודי ומנופף — ואישה שעומדת למטה מוצאת בטלפון את המתחרה. דשוני, מהדשבורד — היא לא מחפשת ברחוב, היא מחפשת בגוגל. ואז הוא מראה לו את סייט בוט של WAO — אתר על כל השירותים ופרופיל שאומר אותו דבר, איפה שהיא באמת מחפשת.",
   "joke_en": "The escalation is pure physical comedy you can hear — sign, flag, wrench on the roof — deflated by one dry sentence, 'she's not searching the street, she's searching Google', the whole lesson in a breath.",
   "callback_en": "The waving wrench on the roof returns as the contrast at the end: stop shouting in the street, say one clear story where the search happens.",
   "why_this_lands_en": "He has invested in signs, magnets and stickers while his Google presence stayed empty — the roof is just the honest ending of that road.",
   "noa": "Connected, with real escalation (sign, flag, roof). 'היא לא מחפשת ברחוב, היא מחפשת בגוגל' is the clearest lesson in the set. The roof and wrench are visual, so narration must describe them, which it does. Fixed 'האישה' (never introduced) and 'במקום שבו' (formal). No rule breach. In the script, don't let 'where she searches' become 'you'll show up first'."
  }
 },
 "S2": {
  "pain": "Every customer thanks him at the door, but none of it reaches Google — his profile has no reviews.",
  "concept": {
   "logline_en": "His own AC breaks, the tech does great work, and the owner says 'thanks, you saved me!' and walks away — until Dash asks 'and the review?' and he hears himself say 'I'll get to it later'.",
   "story_he": "המזגן של בעל הבית מתקלקל, הטכנאי עושה עבודה מעולה, ובעל הבית אומר לו בדלת ״תודה, הצלת אותי!״ וסוגר את הדלת. דשוני שואל: וביקורת? הוא עונה ״אחר כך אני אכתוב״, ודשוני אומר — עכשיו אתה מבין את הלקוחות שלך. ואז הוא מראה לו את סייט בוט של WAO, שעוזר ללקוחות שלך להשאיר ביקורת, לפני ש׳אחר כך׳ הופך ל׳אף פעם׳.",
   "joke_en": "The laugh is the mirror — he becomes his own forgetful customer, and 'now you understand your customers' lands because the ear just heard him say the exact line he's been hearing for years.",
   "callback_en": "'I'll get to it later' is his line from the middle; the end is the product that makes sure 'later' doesn't become never, by making the review easy right after the job.",
   "why_this_lands_en": "Every tradesman has also been the customer who meant to write and didn't — hearing himself do it is the smile.",
   "noa": "Connected role reversal with the strongest insight in S2: he hears himself say the line he hates. Works by ear. Fixes: 'והולך' (he's at his own home, so he closes the door), the stiff 'אחזור לזה אחר כך' → 'אחר כך אני אכתוב', and the calque 'ש׳אחר כך׳ נהיה אף פעם' → 'הופך ל׳אף פעם׳'. No rule breach."
  }
 },
 "S3": {
  "pain": "His site says electrician, his profile says plumber, the customer wants AC — three stories, so Google and customers can't tell what he does.",
  "concept": {
   "logline_en": "A confused customer calls — the site says electrician, the profile says plumber, so what are you? — and the owner gives the most correct and worst answer: 'yes'.",
   "story_he": "לקוחה מתקשרת מבולבלת: באתר כתוב חשמלאי, בפרופיל אינסטלטור — אז אתה חשמלאי או אינסטלטור? בעל הבית נותן את התשובה הכי נכונה והכי גרועה — ״כן״. היא מנתקת, ודשוני מסביר ש׳כן׳ זה לא מקצוע — ואז מראה לו את סייט בוט של WAO: אתר ופרופיל שאומרים אותו דבר על כל שירות ושירות.",
   "joke_en": "The laugh is the classic 'yes' to an or-question — the most honest answer that explains nothing — and 'yes is not a profession' is a dry verdict that needs only the dialogue, no screen.",
   "callback_en": "'Yes' opens as the wrong answer and closes as the right one: one story on the site and the profile that says yes to every service he actually offers, in one voice.",
   "why_this_lands_en": "Every multi-service tradesman has been asked 'so what do you actually do?' — and every Israeli has answered 'yes' to a question with 'or' in it.",
   "noa": "Connected, pure dialogue, the most Israeli joke in the set. Meaning fix: the original 'אז מה אתה?' isn't an either/or question, so 'כן' made no sense and the joke died. Now 'אז אתה חשמלאי או אינסטלטור?'. No rule breach (she calls and hangs up, which is the pain, not a call promise)."
  }
 }
}

## Creative director's beat outlines and 15s cuts
 for the copywriter

**A1: taxi (inversion)**
- **Setup:** He counts clicks like a taxi meter. A passenger gets in and asks the price to the airport.
- **Escalation:** The passenger hears the price and gets out, then another, then another. Each question is billed to the driver.
- **Turn and product:** The verdict is "the only driver in the country who pays the passengers". Ads Bot learns only from the rides he marks as closed jobs.
- **Callback:** The airport question returns as the filter: it counts those who rode, not those who asked.
- **15s cut:** One passenger only, then the verdict and the product. Drop the meter-counting opening.

**A2: shuk tastings (seesaw)**
- **Setup:** His campaign is a tasting stall, and everybody tastes.
- **Escalation:** They come back, then they bring friends. Add one more step up, such as a regular who greets him like family and still buys nothing.
- **Turn and product:** "The crowd got fat, the till didn't." Ads Bot learns from the jobs he marked closed, not from tasters.
- **Callback:** Tasters versus buyers.
- **15s cut:** "Everybody tastes, they bring friends", then the verdict and the product. Drop the extra step.

**A3: the report (deflation)**
- **Setup:** He reads the monthly report aloud with pride: record clicks, record impressions, green graphs.
- **Escalation:** Dash asks one question: "and customers?" He flips a page, flips again, finds another graph.
- **Turn and product:** "A lot of pages for 'no'." Ads Bot starts from that question and learns from the jobs he marks closed, with no celebrations.
- **Callback:** "And customers?" is the question the report never answers and the product starts from.
- **15s cut:** One proud number, the question, one page flip, the verdict, the product.

**S1: the roof (physical escalation)**
- **Setup:** He makes the magnetic sign on the van bigger.
- **Escalation:** He adds a flag, then stands on the roof waving a wrench. Borrow the "I'm right here!" shout from concept 2 for the roof, so the peak is heard and not only described.
- **Turn and product:** A woman right below finds the competitor on her phone. Dash says she isn't searching the street, she's searching Google. Site Bot is a site covering all his services plus a Google profile that says the same thing, where she actually looks.
- **Callback:** Shouting in the street versus one clear story where the search happens.
- **15s cut:** Open on the roof and the shout, then the woman on her phone, Dash's line, the product. Drop the sign and flag.

**S2: his own AC (mirror)**
- **Setup:** His AC breaks, the technician does great work, and he says "thanks, you saved me!" and closes the door.
- **Escalation:** Dash asks "and the review?" He answers "I'll write it later".
- **Turn and product:** "Now you understand your customers." Site Bot helps his customers leave a review before "later" becomes "never".
- **Callback:** His own "later" returns in the product line.
- **15s cut:** Open on the thank-you at the door and drop the AC backstory. If it still runs long, fall back to concept 0's door-to-elevator line for the 15s only.

**S3: "yes" (wordplay dialogue)**
- **Setup:** A confused customer calls: the site says electrician, the profile says plumber.
- **Escalation:** She asks the either/or question, and he gives the most correct and worst answer: "yes".
- **Turn and product:** She hangs up. Dash says "yes is not a profession". Site Bot makes the site and profile say the same thing about every service.
- **Callback:** "Yes" is the wrong answer on the phone and the right one when site and profile say it in one voice.
- **15s cut:** Open directly on her either/or question, then "yes", the verdict, the product. Drop the hang-up.

## 3. Risks to fix while scripting

- **Length:** The concept paragraphs already fill most of 30 seconds. Each script needs one image per beat and no explanation line after the punchline, or it drifts back to v1 "chunks".
- **A1 and A2 are both "Dash explains an analogy":** Tell A2 as a scene that happens to him at the stall, not as a lecture, so the two don't sound like the same ad.
- **Identical A endings:** All three Ads Bot product lines are "learns from closed jobs, not X". Keep the fact, vary the sentence shape, and in A2 don't stack that contrast straight after the seesaw punchline.
- **Dialogue with one voice:** S2, S3 and A3 have other speakers. Dash should quote them in his own deadpan voice; a second synthetic voice adds cost and pronunciation risk.
- **Pronunciation:** Run the airport acronym in A1 and the trade names in S3 through the Hebrew voice test before any batch.
- **No phone sounds:** S3 must open on her voice, with no ringtone. The plan bans realistic ringtones and ringing-phone finales.
- **The joke is never on him:** S1's roof and S2's mirror come closest. Play the roof as honest effort in the wrong place, and deliver "now you understand your customers" warmly, not as a scolding.
- **No ranking or results promise:** In S1, "where she searches" must not become "you'll show up first". In S3, the hang-up is the pain, not a promise of calls.
- **Reviews rule:** In S2 the product only helps customers leave a review; it never suggests what they write or guarantees they will.
- **S1 wording:** The usual word for the owner reads as "the building's landlord" next to the building. Address him as "you".
- **Visual-only beats:** Roof, wrench, flag and page-flipping must be named in the voice. The banners must also carry the problem on mute, per the pilot pass criteria.


