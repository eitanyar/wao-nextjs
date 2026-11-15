# Site Bot: one story for domain, timing, cancel and changes (2026-11-15)

**Why:** Fable 5.2's clarity review (docs/copy/reviews/fable52-hebrew-clarity-2026-11-15.md items 3–7, 12, 13) found the same facts told three different ways. Fable then fixed the facts (founder seat, 2026-11-15). Rewrite every line below so they all tell this ONE story.

**Reader:** one-man trade business owner (plumber, electrician), busy, on a phone. Singular male. Plain Sabra Hebrew.

**The facts (state exactly these; nothing more):**
1. No domain: the site goes up within one business day of payment on "a free address from us that ends in wao.co.il". It is his for as long as he is a client. NEVER call it temporary; never say "sub-domain". He can move to his own .co.il domain whenever he wants, at his own cost, and we connect it.
2. Own domain: the site goes up on it within three business days. Instead of "access to the domain", say what he actually does: we send him a short explanation of the one setting to change at the company where he bought the domain. Buying and renewing the domain is his, at his cost (say plainly that a domain costs separately).
3. Cancel: he can cancel online. The site stays up 30 days after the end of the last paid month. Before 12 months as a client, a copy of the site costs a one-time 900 ₪ + VAT; after 12 months the copy is free.
4. What arrives when, next to the price: the site (timings above); in the first month a person from our team goes over his Google business profile by hand and aligns it with the site; reviews and the monthly report are "being added for pilot clients over the coming weeks, at the same price". No dates; never present reviews/report as already working.
5. Changes and questions: in writing only, through the message box on his account page (or email). A person from our team reads every message. No response-time promise. It is not "the bot".
6. Account page (signed out): first say what the page is for (manage or cancel your subscription), then how to get in (the link from the email; if it's lost, ask for a new one below).
7. Sign-up research question about merging/splitting pages: ask about his business, not SEO — whether two services are the same job for him or two separate jobs, with his real example placeholder kept as is.

**Current lines (copied byte-exact from the files):**
- `docs/copy/site-bot-r2-final-candidate-2026-11-12.txt` line 52:faq[2].a :: אם האתר על כתובת שלנו, הוא עולה תוך יום עסקים אחד אחרי התשלום. אם הוא על דומיין שלך, תוך שלושה ימי עסקים מרגע שקיבלנו גישה לדומיין.
- `docs/copy/site-bot-r2-final-candidate-2026-11-12.txt` line 56:faq[4].a :: האתר נשאר באוויר 30 ימים. אפשר לקנות עותק שלו, ואם שילמת 12 חודשים תקבל אותו חינם.
- `docs/copy/site-bot-r2-final-candidate-2026-11-12.txt` line 48:faq[0].a :: שלושה דברים שגוגל מתגמל. אתר עם עמוד נפרד לכל שירות, כדי שתופיע כשמחפשים את השירות עצמו. פרופיל גוגל מלא שתואם לאתר, כי גוגל כותב בעצמו שעסקים עם פרטים מלאים ומדויקים מופיעים יותר בתוצאות המקומיות. וביקורות חדשות שנכנסות כל הזמן, כי יותר ביקורות ודירוג גבוה עוזרים לך לעלות בתוצאות. האתר עולה ראשון, והפרופיל, הביקורות והדוח מצטרפים בחודשים הראשונים.
- `docs/copy/site-bot-r2-final-candidate-2026-11-12.txt` line 60:faq[6].a :: לא, חוץ משתי פעולות קטנות: להעביר הודעת ביקורת אחרי עבודה, ולאשר טיוטת תשובה כשביקורת מגיעה. אנחנו לא פונים ללקוחות שלך. אם יש שינוי, שולחים הודעה לבוט.
- `docs/copy/site-bot-r2-final-candidate-2026-11-12.txt` line 20:monthly.body :: פעם בחודש מגיע אליך דוח אחד: כמה אנשים התקשרו, ביקשו הוראות הגעה או נכנסו לאתר. אתה רואה מה הכסף שלך עשה בלי לפתוח אף מערכת. השתנו שעות, מחיר או שירות? הודעה אחת, ואנחנו מעדכנים גם באתר וגם בפרופיל. גם האחסון עלינו.
- `src/lib/site-bot/checkout/checkoutCopy.ts` line 42:  domainLine: "כבר יש לך דומיין? האתר עולה עליו מההתחלה — תוך שלושה ימי עסקים מרגע שנקבל גישה לדומיין. אין לך? הוא עולה קודם בכתובת זמנית של WAO. את הדומיין אתה קונה ומחדש בעצמך, ואנחנו נחבר אותו ונעזור אם תצטרך.",
- `src/lib/site-bot/checkout/checkoutCopy.ts` line 42:  domainLine: "כבר יש לך דומיין? האתר עולה עליו מההתחלה — תוך שלושה ימי עסקים מרגע שנקבל גישה לדומיין. אין לך? הוא עולה קודם בכתובת זמנית של WAO. את הדומיין אתה קונה ומחדש בעצמך, ואנחנו נחבר אותו ונעזור אם תצטרך.",
- `src/lib/site-bot/checkout/checkoutCopy.ts` line 42:  domainLine: "כבר יש לך דומיין? האתר עולה עליו מההתחלה — תוך שלושה ימי עסקים מרגע שנקבל גישה לדומיין. אין לך? הוא עולה קודם בכתובת זמנית של WAO. את הדומיין אתה קונה ומחדש בעצמך, ואנחנו נחבר אותו ונעזור אם תצטרך.",
- `src/lib/site-bot/intakeOwnerCopy.ts` line 25:  domainNoNote: 'אין בעיה. תקבל מאיתנו כתובת חינם שמסתיימת ב־wao.co.il. השם המדויק תלוי במה שפנוי.', // Shown after No: we give you a free address on wao.co.il
- `src/lib/site-bot/clientMessageCopy.ts` line 39:  boxIntro: 'כתוב מה תרצה לשנות באתר או בפרופיל בגוגל, או כל שאלה שיש לך. בן אדם מהצוות שלנו קורא כל הודעה.',
- `src/lib/payments/accountCopy.ts` line 16:  noTokenIntro: "העמוד הזה נפתח רק עם קישור תקף מהמייל ששלחנו לך. אם הקישור אבד, בקש קישור חדש בטופס למטה.",
- `src/lib/site-bot/researchCopy.ts` line 14:  "gate_ambiguous_intent": "כמה חיפושים יכולים להתאים לשני שירותים שונים — תגיד לי אם לחבר או לפצל לדפים.",

**Rules:** keep every placeholder/token exactly (anything in braces, `__X__`, `${...}`); keep each line's syntax around the Hebrew (quotes, keys, `::` labels) unchanged so a str.replace works; if two lines in one file overlap, keep them separate patches; no emoji; "לחודש" for monthly prices.

**Return JSON only:** {"patches":[{"file":"<path as listed>","old":"<the exact Hebrew string or full line to replace, copied byte-exact, unique in that file>","new":"...","why":"..."}]}
