# Dash v2 voice scripts: fix the flagged lines only (2026-11-12)

These are 15s and 30s YouTube ads for WAO's Ads Bot (A1–A3) and Site Bot (S1–S3). The automatic voice checker flagged the lines marked FIX below. Rewrite ONLY those lines. Keep every "keep" line byte-for-byte as it is, and keep each script's story, joke and running time. A fixed line should run about as long as the old one when spoken (similar syllable count).

Voice rules (binding):
- Spoken by one Hebrew voice (Nimrod). Singular male "you". 12–15 words per sentence at most.
- Eyes-closed rule: every line must make sense by ear with the screen off. No word that only works because of what's shown on screen (e.g. quoting a stamp or a sign).
- Each line starts with ONE audio tag that performs that line's meaning, e.g. [deadpan], [sighs], [sarcastic], [calm], [excited]. Keep the existing tag unless the new wording needs another.
- Brand: WAO is written "WAO" in the line (the voice step turns it into וואו) and is always said upbeat and amazed, never flat.
- Locked spellings: "Site Bot" stays in Latin letters; בּוֹט מוֹדָעוֹת; מִקְּלִיקִים; מֵהַ-פְּנִיּוֹת.
- No English idioms translated word for word (the checker flagged "the till gets fat" and "the audience got fat"). Native spoken Israeli Hebrew that a plumber would say.
- Reviews are "ביקורות בגוגל", not "מגוגל".
- Facts: never promise what the product doesn't do today. The A1 truth rule is in its issue line.

Return JSON: {"fixes": [{"id": "<id>", "old": "<exact old voice line>", "new": "<new voice line with tag>", "display": "<same line without the tag, for on-screen captions>", "tag_why": "<why this tag>", "why": "<what you fixed>"}], "notes": "..."}

### A1 30s (full script for context; fix only the lines marked FIX)

- [A1.script_30[0]] FIX
  - voice: [deadpan] אתה סופר קליקים כמו מונה של מונית, וכל קליק הוא נוסע שנכנס אליך.
  - screen: Dashoni's dashboard screen is a taxi meter; the owner's thumb taps and each tap adds a fare; WAO mark in the corner from the first frame.
  - issue: Sounds unnatural: "נוסע שנכנס אליך". Passengers enter a taxi ('נכנס למונית' or 'עולה למונית'); 'נכנס אליך' sounds like entering a person or a store, awkwardly blending the metaphor and the literal business.
- [A1.script_30[1]] keep
  - voice: [deadpan] ״כמה עד שדה התעופה?״ הוא שואל אותך, שומע את המחיר, ויוצא בלי לנסוע.
  - screen: A cartoon passenger slides into the back seat, asks, hears the fare, and steps straight out; the meter keeps ticking.
- [A1.script_30[2]] keep
  - voice: [tired] אחריו נכנס עוד אחד, ועוד אחד, ואתה משלם על כל שאלה בנפרד.
  - screen: Two more passengers hop in and out in a loop; each exit drops a coin from the driver's pocket into the fare box.
- [A1.script_30[3]] keep
  - voice: [deadpan] אתה הנהג היחיד בארץ שמשלם לנוסעים.
  - screen: Dashoni stares flat at camera; the taxi stands still, the meter spins, the driver's wallet empties into the passengers' hands.
- [A1.script_30[4]] FIX
  - voice: [calm] בוט מודעות מביא לך נוסעים שמשלמים, כי הוא לומד רק מעבודות שסגרת.
  - screen: Real Ads Bot screen; the owner's thumb marks one lead as a closed job; the learning line updates from that mark, not from the click count.
  - issue: FALSE CLAIM, must change (top priority): says the Ads Bot learns only from closed jobs. Not true today: a new account first bids for clicks, and his "relevant" marks are uploaded too. Allowed: he marks his enquiries; his marks are what the next stage is built on; after enough marked jobs the campaign moves to a target cost per enquiry, and from then Google aims at that price. Forbidden: any present-tense "Google/the bot learns from your marks / closed jobs", "learns only from closed jobs", "the bot switches automatically".
  - issue: Sounds unnatural: "נוסעים שמשלמים, כי הוא לומד רק מעבודות שסגרת". This mixes two clashing metaphors in a single sentence: taxi drivers take fares ('נסיעות'), not 'עבודות שסגרת', while service businesses do not have 'נוסעים'.
- [A1.script_30[5]] keep
  - voice: [excited] WAO! בוט מודעות.
  - screen: End card: WAO mark, the words בוט מודעות, the shared cancel-anytime stamp, one CTA button.

### A2 15s (full script for context; fix only the lines marked FIX)

- [A2.script_15[0]] keep
  - voice: [deadpan] הקמפיין שלך הוא דוכן טעימות בשוק, וכולם טועמים על חשבונך ומביאים חברים.
  - screen: Dashoni's screen is a shuk tasting stall; a crowd takes samples on the owner's account and brings friends; WAO mark in corner from first frame.
- [A2.script_15[1]] FIX
  - voice: [deadpan] הקהל השמין, הקופה לא.
  - screen: Dashoni flat to camera; the crowd is round and happy, the till drawer open and empty.
  - issue: Sounds unnatural: "הקהל השמין". In Hebrew, 'קהל' (audience/crowd) is an abstract collective noun that does not naturally collocate with the physical verb 'השמין' (gained weight).
  - issue: Sounds unnatural: "הקופה לא". Elliptically applies the verb 'להשמין' (gain weight) to a cash register ('קופה'), which is an unnatural English calque ('fattening the till') not used in Hebrew.
- [A2.script_15[2]] FIX
  - voice: [calm] בוט מודעות מביא לך קונים, לא טועמים, והקופה שלך סוף סוף משמינה.
  - screen: Real Ads Bot screen; the owner marks a lead as a closed job; the panel shows the campaign running on Google Ads.
  - issue: Sounds unnatural: "והקופה שלך סוף סוף משמינה". In Hebrew, a cash register ('קופה') does not 'משמינה' (gain weight/get fat); this is an unnatural English calque ('fattening the till') where Hebrew would naturally use verbs like filling up or swelling.
- [A2.script_15[3]] keep
  - voice: [excited] WAO! בוט מודעות.
  - screen: End card: WAO mark, בוט מודעות, the shared stamp, one CTA button.

### A2 30s (full script for context; fix only the lines marked FIX)

- [A2.script_30[0]] keep
  - voice: [deadpan] הקמפיין שלך הוא דוכן טעימות בשוק, וכל קליק הוא מישהו שבא לטעום.
  - screen: Dashoni's screen becomes a shuk tasting stall with toothpicks and little cups; the owner hands a sample to a cursor-shaped customer; WAO mark in corner from first frame.
- [A2.script_30[1]] keep
  - voice: [deadpan] הוא טועם, אומר תודה, וחוזר למחרת עם עוד שניים מהעבודה.
  - screen: The same taster is back next morning with two friends from work; all three take samples; the till drawer stays shut.
- [A2.script_30[2]] keep
  - voice: [tired] ביום השלישי הם מביאים חברים, וכולם לוקחים עוד חתיכה על חשבונך.
  - screen: A crowd forms at the stall, everyone takes another piece; the owner's coin pocket thins; the till is empty.
- [A2.script_30[3]] keep
  - voice: [sarcastic] אחד כבר קורא לך ׳אחי׳, מחבק אותך, ועדיין לא קנה ממך כלום.
  - screen: One regular hugs the owner, calls him brother, and walks off with another sample; the till stays empty.
- [A2.script_30[4]] FIX
  - voice: [deadpan] הקהל השמין, הקופה לא.
  - screen: Dashoni flat to camera; the crowd is round and happy, the till drawer is open and empty.
  - issue: Sounds unnatural: "הקהל השמין". The verb for gaining physical body fat does not naturally collocate with a collective noun for an audience or crowd, making the phrasing awkward whether taken literally or figuratively.
- [A2.script_30[5]] FIX
  - voice: [calm] בוט מודעות מביא לך קונים, לא טועמים, והקופה שלך סוף סוף משמינה.
  - screen: Real Ads Bot screen; the owner marks a lead as a closed job; the panel shows the campaign running on Google Ads.
  - issue: Sounds unnatural: "משמינה". Describing a cash register as actively gaining body fat is an unnatural calque from English idioms rather than natural financial phrasing.
- [A2.script_30[6]] keep
  - voice: [excited] WAO! בוט מודעות.
  - screen: End card: WAO mark, בוט מודעות, the shared stamp, one CTA button.

### A3 15s (full script for context; fix only the lines marked FIX)

- [A3.script_15[0]] keep
  - voice: [deadpan] אתה מקריא לי שיא בקליקים מהדוח, ואני שואל אותך: ולקוחות? אתה מדפדף הלאה.
  - screen: Dashoni's screen shows the report; the owner reads a record number, Dashoni asks one question, the owner flips a page; WAO mark in corner from first frame.
- [A3.script_15[1]] FIX
  - voice: [deadpan] הרבה עמודים בשביל ׳אין׳.
  - screen: The report fans into a thick stack; one word stamps across it: אין.
  - issue: Sounds unnatural: "בשביל ׳אין׳". Using the existential negative particle 'אין' as a noun object after 'בשביל' is ungrammatical and unnatural in Hebrew; native speakers would say 'בשביל כלום' or 'בשביל שום דבר'.
  - issue: Fails the eyes-closed test: The word 'אין' directly quotes the visual stamp appearing on the stack of pages on screen rather than functioning naturally in spoken audio.
- [A3.script_15[2]] keep
  - voice: [calm] בוט מודעות עונה לך על ׳ולקוחות?׳ בעבודות סגורות, לא בעוד גרף יפה.
  - screen: Real Ads Bot screen; the owner marks a lead as a closed job; no confetti.
- [A3.script_15[3]] keep
  - voice: [excited] WAO! בוט מודעות.
  - screen: End card: WAO mark, בוט מודעות, the shared stamp, one CTA button.

### A3 30s (full script for context; fix only the lines marked FIX)

- [A3.script_30[0]] keep
  - voice: [deadpan] אתה מקריא לי את הדוח החודשי: שיא בקליקים, שיא בחשיפות, וגרפים ירוקים.
  - screen: Dashoni's screen shows a glossy monthly report; the owner reads aloud, green graphs climb; WAO mark in corner from first frame.
- [A3.script_30[1]] keep
  - voice: [tired] אתה אומר שהסוכנות חגגה, ומחכה שאני אתלהב מהמספרים.
  - screen: A confetti icon over the agency logo; the owner waits for Dashoni to clap; Dashoni does not clap.
- [A3.script_30[2]] keep
  - voice: [deadpan] אני שואל אותך שאלה אחת: ולקוחות? אתה מדפדף לעמוד הבא, ועוד אחד.
  - screen: Dashoni asks one question; the owner flips a page, then another; every page is another green graph.
- [A3.script_30[3]] keep
  - voice: [tired] אתה מוצא גרף עוגה, אומר ״תראה איזה יפה״, ואני עדיין מחכה לתשובה.
  - screen: A pie chart fills the page; the owner points at it proudly; Dashoni's cursor blinks, waiting.
- [A3.script_30[4]] FIX
  - voice: [deadpan] הרבה עמודים בשביל ׳אין׳.
  - screen: The report fans out into a thick stack of pages; one word stamps across them: אין.
  - issue: Sounds unnatural: "בשביל ׳אין׳". Using the existential negative particle 'אין' as a substantive noun is unnatural in Hebrew and functions only as a literal reference to the visual stamp on screen.
  - issue: Fails the eyes-closed test: The quoted word refers directly to the text stamped visually across the screen rather than dialogue established in the audio.
- [A3.script_30[5]] keep
  - voice: [calm] בוט מודעות עונה לך על ׳ולקוחות?׳ בעבודות סגורות, לא בעוד גרף יפה.
  - screen: Real Ads Bot screen; the owner marks a lead as a closed job; no confetti, just the updated learning line.
- [A3.script_30[6]] keep
  - voice: [excited] WAO! בוט מודעות.
  - screen: End card: WAO mark, בוט מודעות, the shared stamp, one CTA button.

### S2 15s (full script for context; fix only the lines marked FIX)

- [S2.script_15[0]] keep
  - voice: [deadpan] אתה אומר לטכנאי ״תודה, הצלת אותי!״ וסוגר את הדלת.
  - screen: Dashoni's screen: the owner at his door thanking the technician and closing it; the technician at the elevator; WAO mark in corner from first frame.
- [S2.script_15[1]] keep
  - voice: [deadpan] אני שואל: וביקורת? אתה עונה ״אחר כך אני אכתוב״.
  - screen: Dashoni asks one question; the owner waves a hand: later.
- [S2.script_15[2]] FIX
  - voice: [calm] עכשיו אתה מבין את הלקוחות. סייט בוט מביא לך עוד ביקורות מגוגל, לפני ש׳אחר כך׳ הופך ל׳אף פעם׳.
  - screen: Dashoni warm to camera; real Site Bot screen: a review request reaches his customer, who picks the stars and the words; no suggested text.
  - issue: Sounds unnatural: "ביקורות מגוגל". In Hebrew, customer reviews on Google are called 'ביקורות בגוגל' or 'ביקורות גוגל'. Phrasing it as 'ביקורות מגוגל' sounds as though Google is providing or generating the reviews, or is an unnatural calque.
- [S2.script_15[3]] keep
  - voice: [excited] WAO! סייט בוט.
  - screen: End card: WAO mark, סייט בוט, the shared stamp, one CTA button.