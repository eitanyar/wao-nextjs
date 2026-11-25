# Brief: Site Bot promise truth pass (2026-11-26)

Findings: docs/reviews/site-bot-promise-truth-pass-yonatan-2026-11-26.md. Decision: docs/reviews/site-bot-ranking-launch-plan-fable52-2026-11-26.md (approved by Eitan). Rule: remove only claims that promise Google rankings, positions, being shown or found, jobs or calls from search, or a timeframe for them, plus the listed false facts. Everything else keeps selling ("sell the dream, not constraints"). Google's own words may be attributed ("Google says complete info helps local results"; "more reviews and good ratings can help"). Singular male. Voiced lines are for TTS: 12-15 words per sentence, about the same length as the current line.

Return plain JSON: key -> {"old": <current string exactly as given>, "new": <replacement>}.

## LANDING_CLAIM_BODY
**Where:** /site-bot landing, claim section body (reader = business owner).
**Current (byte-exact):** "אם אמרת פעם שאתר לא מביא עבודה, צדקת. אתר שעומד לבד לא מביא כלום. טלפונים מגיעים כשהאתר, פרופיל גוגל והביקורות אומרים אותו דבר. גוגל מראה אותך ליותר אנשים שמחפשים לידך, והלקוח שמשווה בינך לבין המתחרה רואה עסק מסודר ובוחר בך."
**Fix:** Over-promise: "Google shows you to more people" stated as fact. Must say: when site, profile and reviews tell one story he is doing what Google itself says helps local results, and the customer comparing him with a competitor sees an orderly business and picks him. Keep the opening "you were right, a site alone brings nothing" hook and the "calls come when..." principle.

## LANDING_SITE_H2
**Where:** /site-bot landing, H2 of the site part.
**Current (byte-exact):** "שימצאו אותך גם כשמחפשים ״החלפת דוד״"
**Fix:** Reads as a promise to rank for service searches. Must say the action: each service gets its own page written in the words people around him type (the boiler example may stay). Not an SEO anchor.

## LANDING_PROFILE_H2
**Where:** /site-bot landing, H2 of the profile part.
**Current (byte-exact):** "פרופיל ואתר שמספרים אותו סיפור עולים במפה"
**Fix:** "Rise on the map" is a flat ranking claim. Must say: profile and site tell the same story, which is what Google asks for and what lets the customer call without checking two more.

## LANDING_FAQ0_A
**Where:** /site-bot landing, FAQ answer 1. Change ONLY the ambiguous clause "האתר עולה ראשון" (can read as "ranks first"; it means the site goes live first). Return the full answer with only that clause changed.
**Current (byte-exact):** "שלושה דברים שגוגל מתגמל, וכולם בשביל רגע אחד: שמי שמחפש לידך ימצא אותך ויתקשר. אתר עם עמוד נפרד לכל שירות, כדי שתופיע גם כשמחפשים את השירות עצמו. פרופיל גוגל מלא שתואם לאתר, כי גוגל כותב בעצמו שפרטים מלאים ומדויקים עוזרים לעסק להופיע בתוצאות המקומיות. וביקורות טריות, כי יותר ביקורות ודירוג גבוה עוזרים לעלות בתוצאות. האתר עולה ראשון, ובחודש הראשון בן אדם מהצוות שלנו מתאים ידנית את הפרופיל שלך לאתר."
**Fix:** Must say: the site goes live first, then in month one a team member matches the profile to the site by hand. Rest byte-identical.

## AD_S1_VOICE
**Where:** S1 "on the roof" video ad, voiced line; the 15s and 30s versions share it.
**Current (byte-exact):** "[calm] Site Bot מביא לך עוד עבודות ועוד ביקורות בגוגל. אתה יכול לרדת מהגג."
**Fix:** "Brings you more jobs from Google" is a lead-volume promise. Must say what Site Bot does where she looks: one site with all his services, a Google profile that says the same, fresh reviews. Keep the "you can climb down off the roof" callback and the [calm] tag. Same length, to re-record one line.

## AD_S2_VOICE
**Where:** S2 video ad, voiced line.
**Current (byte-exact):** "[calm] Site Bot מביא לך עוד עבודות ועוד ביקורות בגוגל, לפני ש׳אחר כך׳ הופך ל׳אף פעם׳."
**Fix:** Same "more jobs" promise. Must say: it helps his customers leave the review before "later" becomes "never". Keep [calm].

## AD_S3_VOICE
**Where:** S3 video ad, voiced line.
**Current (byte-exact):** "[calm] Site Bot מביא לך עוד עבודות ועוד ביקורות בגוגל."
**Fix:** Same promise. Must say: all his services in one story on site and profile. Keep [calm].

## YT_S1_15_TITLE
**Where:** YouTube title of the S1-15 ad (ends with " | Site Bot").
**Current (byte-exact):** "עוד עבודות מגוגל, בלי לצעוק מהגג | Site Bot"
**Fix:** Promises more jobs from Google. Keep the roof gag and Google; sell being where she looks (a site and profile that match), not jobs.

## YT_S1_15_DESCRIPTION
**Where:** YouTube description of the S1-15 ad. Return the full description.
**Current (byte-exact):** "אתה צועק מהגג, והלקוחה שעומדת ממש מתחתיך כבר הזמינה את המתחרה. היא חיפשה בגוגל.\nSite Bot שם אותך מול מי שמחפש בגוגל ומביא לך עוד ביקורות. אתה חוזר לעבודה.\nפיילוט ראשון ל-10 עסקים בלבד, יוצא לדרך ב-29.11. בדוק את העסק שלך בחינם:\nhttps://www.wao.co.il/site-bot/audit"
**Fix:** Line 2 promises he will be shown to searchers: say Site Bot builds the site and profile she sees when she searches, plus reviews. Line 3: drop the word "פיילוט" (no longer true; launch is via ads into the automated bot with capped starts); keep the 29.11 date and the 10-business cap as a true scarcity fact. Keep the URL byte-exact.

## PREVIEW_NEXT_LIST
**Where:** Owner-facing preview screen: what happens after payment (lines separated by \n).
**Current (byte-exact):** "אנחנו בונים את שאר האתר: דף לכל שירות מרכזי שלך, ודפי אזור לאזורים שסיפרת שאתה עובד בהם.\nמישהו מהצוות שלנו קורא כל דף לפני שהוא עולה.\nהאתר עולה לאוויר תוך 2 ימי עסקים מהתשלום.\nאנחנו מתחברים לפרופיל שלך בגוגל כמנהלים, בהתחברות עם גוגל, ושומרים שהאתר והפרופיל מתואמים, עם דוח אליך כל חודש."
**Fix:** Two false facts: (1) it promises area pages, which are not built at launch; say only a page for each main service; (2) "2 business days" conflicts with checkout: the true timing is one business day on a free wao.co.il address, three business days on his own domain. Keep the other lines.

## INTAKE_CONTACT_INTRO
**Where:** Intake form, short intro line above the owner phone/email fields.
**Current (byte-exact):** "לכאן אנחנו שולחים לך קבלות, את הקישור לביטול המנוי, טיוטות תשובות לביקורות ואת הדוח החודשי. הנייד והמייל לא מופיעים באתר שלך."
**Fix:** Review-reply drafts were turned off (2026-11-24): remove them from the list. Everything else unchanged.
