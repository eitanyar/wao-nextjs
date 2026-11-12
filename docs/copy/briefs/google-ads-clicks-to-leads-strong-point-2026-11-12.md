# /google-ads: make "from clicks to real leads" a strong selling point, and keep it true (2026-11-12)

Founder's ask: the progression from buying clicks to buying qualified leads is the heart of the Ads Bot offer. He wants it to be a STRONG point on the page: it shows we're building toward exactly what the business owner wants (Google sending him people who actually become jobs, not clicks). It also shows the product is advancing fast. Sell it with confidence. But two current lines are false, and every line here must be true as written.

## What is true (binding facts; from docs/specs/ads-bot-phase2-volume-reality-2026-11-12.md §1.6–1.7, founder-approved)
- **Stage 1, from day one:** the campaign buys clicks at a capped price (₪15 ceiling), so the owner doesn't overpay while it learns which searches bring real enquiries. The bot blocks searches that burn money and filters fake clicks. FROM DAY ONE, every enquiry the owner marks as real is sent back to Google as a "real lead" signal. This shipped today: it is the ONLY goal the campaign counts, and each upload's result is saved, so a failure is visible and gets retried.
- **Stage 2, automatic:** once enough real leads have built up (about 15 marked-as-real leads within 60 days, plus at least 2 closed jobs), the system switches by itself from chasing clicks to chasing leads (Google's "maximize conversions" on real leads only). At the minimum budget that's usually 2–3 months. No call to us, no team step.
- **Safety net:** if the lead mode does worse, it switches back automatically.
- **Honesty about budget:** at the minimum budget some trades and areas don't reach that point. Then the campaign stays in click mode, which keeps working, and the owner is shown the monthly budget that would unlock the switch.
- **Later, stage 3:** a target cost per lead. Only at higher volume (about 30 real leads a month). Don't promise it at the minimum budget.

## Must NOT say
- "after 15–30 closed jobs" or any number of CLOSED jobs as the trigger; "after 15 leads" as a promise; any fixed date ("after the first month").
- "Google requires X conversions"; "lower cost per lead guaranteed"; that every client reaches stage 2.
- Present tense "Google learns from your marks / moves budget to better searches" as how the account works TODAY in stage 1. In stage 1 Google bids for clicks. What you CAN say today: your marks go back to Google from day one, they build the stage-2 switch, and the bot itself already cuts the searches that waste money.
- "learns from the jobs you closed" (bidding optimises to real leads; closed jobs are a confirmation check).
- Method puffery is fine. Timing and thresholds are checkable claims, so keep them as written above ("usually", "about").

## Lines to rewrite (current live text, from docs/copy/google-ads-r2-final-candidate-2026-11-12.txt)
- hero.subhead :: הכסף יצא, הקליקים הגיעו, והטלפון שתק. כאן הקמפיין לומד מהפניות שאתה מסמן, ואתה רואה כל פנייה וכל שקל. במקום ריטיינר של משרד — 249 ₪ + מע״מ בחודש.
- mechanism.moments[1].desc :: אתה מסמן רלוונטי או לא, סגור או לא. הסימון שלך חוזר לגוגל ומלמד אותה אילו חיפושים מביאים עבודה.
- mechanism.moments[2].title :: הסימונים מצטברים — התקציב זז
- mechanism.moments[2].desc :: גוגל מזהה אילו חיפושים מביאים פניות טובות יותר ומזיזה את התקציב לשם. אתה לא צריך לשבת על הקמפיין בלילות.
- does.items[1].desc :: הבוט חוסם חיפושים ששורפים כסף בלי פניות ומסנן קליקים מזויפים. בהתחלה הוא גם שם תקרה על מחיר הקליק ולא מגדיל תקציב כל עוד פנייה עולה יותר מהיעד שלך. אחרי שסימנת מספיק עבודות שנסגרו, גוגל מכוונת ליעד עלות לפנייה.
- faq[7].a :: מודעות מביאות חשיפה מהירה יותר לחיפושים רלוונטיים, וקידום אורגני נבנה לאט יותר. כאן הסימון שלך מלמד את גוגל אילו חיפושים שווים תקציב.
- phases.h2 :: בכל שלב אתה יודע לאן הכסף הולך, והבוט מתקדם רק לפי הנתונים שלך.
- phases.items[0] :: בשלב הלמידה הבוט מגביל את מחיר הקליק, ואתה מסמן כל פנייה כעבודה שנסגרה או לא.
- phases.items[1] :: כשסימנת בערך 15–30 עבודות שנסגרו, הבוט עובר ליעד עלות לפנייה, וגוגל מכוונת למחיר שמתאים לעסק שלך.

Also, separately:
- **hero.h1 (SEO anchor, do NOT change without Yonatan):** "פרסום בגוגל שלומד מהעבודות שאתה סוגר, לא מקליקים". It says "learns from the jobs you close", which isn't how the bidding works (it's real leads). Propose 2 alternatives that keep the "פרסום בגוגל" head term and the clicks-vs-real-results contrast. Yonatan decides.
- **phases block:** it may grow to 3–4 items (stage 1, stage 2 switch, safety net/budget honesty) if that sells better. You decide the structure.
- **Chat bot:** the site's chat bot tells owners "graduate to tCPA only after 15–30 recorded conversions" and "tCPA after 15+ conversions". Give ONE short Hebrew line for the bot's bidding-strategy label that matches the true stages ("click mode with a price cap, then automatic switch to real-lead mode after about 15 real leads").

Return JSON: {"lines": {"<key>": "<new Hebrew>", ...}, "phases_items": ["...", "..."], "h1_options": ["...", "..."], "bot_bidding_label": "...", "angle": "<the angle you chose and why>", "notes": "..."}
