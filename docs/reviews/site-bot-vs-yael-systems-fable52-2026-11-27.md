Nothing on the hero or the four signed-off anchors changes. What the competitor page has that ours lacks is coverage of the side-questions around «קידום עסק בגוגל», and all of it fits into our FAQ and three body lines without turning the page into a guide.

I read the page as rendered text only, so its `<title>`, meta description and schema are inferred, and I did not check its rankings or authority myself. The patches below are drafts; nothing is applied.

## 1. What makes the yael.systems page rank

- **Exact-match stacking:** the head term is in the title, the H1 («קידום עסק בגוגל. בחינם, ובתשלום.»), the FAQ heading («שאלות על קידום עסק בגוגל») and the first FAQ question.
- **Answer first:** a three-sentence «התשובה הקצרה» block right under the H1 gives the whole answer (free: profile, maps, organic, reviews; paid: ads; nobody can promise first place).
- **Covers every side-question of a vague query:** cost, time to results, organic vs paid, how to appear on Google Maps, and whether it works without a website. Each is a FAQ question phrased the way people type it.
- **Full set of entities:** business profile, Google Maps, local results and Google's three ranking factors (match, distance, how well known), organic, reviews, a page per service, and ads.
- **Google as the cited source:** «לפי גוגל» appears throughout, with seven links to Google's own documentation and a visible "updated 9 November 2026" stamp.
- **Honesty as a trust signal:** a short section on what nobody can promise (first place, paying for map rank, reviews for gifts).
- **Plain and short:** about 1,100 words, glossed jargon, and links to its sibling guides (profile guide, paid guide, calculators).
- **Weak field:** at 90 searches a month with very low competition, on-page relevance and breadth are enough; authority is barely tested.

## 2. What we borrow, and how

**Borrow**

| Idea | Where on our page | Why it sells |
|---|---|---|
| Google's three local factors | `parts.profile.body`, plus a new Maps FAQ | Turns "we match your profile" into a mechanism: distance is fixed, the other two are exactly what he pays us for. |
| "One page that answers everything answers little" (our own words) | `parts.site.body` | Kills the "a one-page site is enough" alternative in one sentence, just before the page-per-service promise. |
| FAQ questions phrased as real searches | `faq_h2`, `faq[1].q`, four new FAQ items | Each is an objection he already has; the answers close it and point back to the product. |
| Free vs paid framing | `faq[1].a` and the new organic-vs-ads FAQ | "You pay Google nothing" is a selling line for a 199 ₪ product. |
| "Nobody can promise first place" | One sentence inside the new time-to-results FAQ | Used as a weapon against the SEO sharks he fears, not as a disclaimer about us. |
| Missing terms | «גוגל מפות», «פרופיל עסקי בגוגל», «קידום מקומי לעסק», «קידום לעסק בגוגל», «קידום אורגני» woven into existing lines | Coverage without adding a teaching section. |

**The one judgment call:** the "how long until results" FAQ. It brushes against "sell the dream, not constraints", but it promises nothing, quotes Google for the timing, and unanswered it is a silent objection. I decided to include it; it is the one patch to drop if you disagree.

**Reject**

- **A "short answer" block or a free/paid explainer section:** our scene and claim already do this job while selling; a definition block would turn the top of the page into an article.
- **The five-step checklist (sitemap, alt text, Search Console):** it teaches him to do it himself, which is the opposite of our offer.
- **The paid-ads section (Performance Max, budget maths):** that belongs to /google-ads; here it gets one FAQ answer.
- **A standalone "what nobody can promise" section:** safeguards stay one line, never a heading.
- **"Reply to every review" and the reviews-for-gifts warning:** review replies are off this page and its terms, and the warning is a constraint, not a benefit.
- **A sources list:** it reads like an article footer; linking our existing «גוגל כותב» phrases does the same job (section 4).
- **Any hero change:** the hero is tuned and signed off, and nothing on their page beats it for selling.

## 3. Patches

```json
{"patches":[
{"key":"claim.body","old":"אם אמרת פעם שאתר לא מביא עבודה, צדקת. אתר שעומד לבד לא מביא כלום. קידום עסק בגוגל מביא טלפונים רק כשהאתר, הפרופיל והביקורות אומרים אותו דבר. גוגל מראה אותך ליותר אנשים שמחפשים לידך, והלקוח שמשווה בינך לבין המתחרה רואה עסק מסודר ובוחר בך.","new":"אם אמרת פעם שאתר לא מביא עבודה, צדקת. אתר שעומד לבד לא מביא כלום. קידום עסק בגוגל מביא טלפונים רק כשהאתר, הפרופיל והביקורות אומרים אותו דבר. גוגל מראה אותך ליותר אנשים שמחפשים לידך, בחיפוש ובגוגל מפות, והלקוח שמשווה בינך לבין המתחרה רואה עסק מסודר ובוחר בך.","why":"Adds the Google Maps entity and the search-plus-maps scope in four words; the selling line is untouched."},
{"key":"parts.site.body","old":"הלקוח לא תמיד מקליד ״אינסטלטור״. הרבה פעמים הוא מקליד את הצרה: סתימה, דוד שלא מחמם, נזילה. לכן כל שירות שלך מקבל עמוד משלו, אחרי שבדקנו מה באמת מחפשים באזור שלך. מי שנכנס רואה שעות פתיחה וכפתור שיחה, ומתקשר בלחיצה. מהצד שלך זה כמה שאלות בצ׳אט.","new":"הלקוח לא תמיד מקליד ״אינסטלטור״. הרבה פעמים הוא מקליד את הצרה: סתימה, דוד שלא מחמם, נזילה. אתר של עמוד אחד כמעט לא מופיע בחיפושים כאלה. לכן כל שירות שלך מקבל עמוד משלו, אחרי שבדקנו מה באמת מחפשים באזור שלך. מי שנכנס רואה שעות פתיחה וכפתור שיחה, ומתקשר בלחיצה. מהצד שלך זה כמה שאלות בצ׳אט.","why":"Borrows the 'one page answers little' idea as a reason to buy the page-per-service site instead of a cheap one-pager."},
{"key":"parts.profile.h2","old":"פרופיל ואתר שמספרים אותו סיפור עולים במפה","new":"פרופיל עסקי ואתר שמספרים אותו סיפור עולים בגוגל מפות","why":"Names the two things people search for (business profile, Google Maps); same promise, three more words."},
{"key":"parts.profile.body","old":"הלקוח עובר מהמפה לאתר. כשהוא רואה את אותו עסק מסודר בשני המקומות, הוא מתקשר בלי לבדוק עוד שניים. גוגל כותב בעצמו שפרטים מלאים ומדויקים עוזרים לעסק להופיע בתוצאות המקומיות. אנחנו שומרים על ההתאמה הזאת כל חודש, והפרופיל נשאר שלך.","new":"הלקוח עובר מהמפה לאתר. כשהוא רואה את אותו עסק מסודר בשני המקומות, הוא מתקשר בלי לבדוק עוד שניים. וגוגל? הוא כותב בעצמו מה קובע מי יופיע בתוצאות המקומיות: כמה העסק מתאים לחיפוש, כמה הוא קרוב למחפש וכמה הוא מוכר. את המרחק אי אפשר להזיז. על ההתאמה ועל השם שלך אנחנו עובדים כל חודש: פרופיל עסקי בגוגל מלא ומדויק, שתואם לאתר. והפרופיל נשאר שלך.","why":"Google's three local factors become the 'how it works' line: one is fixed, the other two are what we do for him every month."},
{"key":"faq_h2","old":"מה ששואלים לפני שמתחילים","new":"שאלות על קידום עסק בגוגל, לפני שמתחילים","why":"Puts the head term in the FAQ heading, as the competitor does, and keeps our 'before you start' framing."},
{"key":"faq[0].a","old":"שלושה דברים שגוגל מתגמל, וכולם בשביל רגע אחד: שמי שמחפש לידך ימצא אותך ויתקשר. אתר עם עמוד נפרד לכל שירות, כדי שתופיע גם כשמחפשים את השירות עצמו. פרופיל גוגל מלא שתואם לאתר, כי גוגל כותב בעצמו שפרטים מלאים ומדויקים עוזרים לעסק להופיע בתוצאות המקומיות. וביקורות טריות, כי יותר ביקורות ודירוג גבוה עוזרים לעלות בתוצאות. האתר עולה ראשון, ובחודש הראשון בן אדם מהצוות שלנו מתאים ידנית את הפרופיל שלך לאתר.","new":"קידום מקומי לעסק עומד על שלושה דברים שגוגל מתגמל, וכולם בשביל רגע אחד: שמי שמחפש לידך ימצא אותך ויתקשר. אתר עם עמוד נפרד לכל שירות, כדי שתופיע גם כשמחפשים את השירות עצמו. פרופיל גוגל מלא שתואם לאתר, כי גוגל כותב בעצמו שפרטים מלאים ומדויקים עוזרים לעסק להופיע בתוצאות המקומיות. וביקורות טריות, כי יותר ביקורות ודירוג גבוה עוזרים לעלות בתוצאות. האתר עולה ראשון, ובחודש הראשון בן אדם מהצוות שלנו מתאים ידנית את הפרופיל שלך לאתר.","why":"Weaves in the related term «קידום מקומי לעסק» at the start; the rest is unchanged."},
{"key":"faq[1].q","old":"כמה זה עולה לי, ואיך אני מבטל?","new":"כמה עולה קידום לעסק בגוגל, ואיך אני מבטל?","why":"Matches the 'how much does it cost' search and carries the variant «קידום לעסק בגוגל»."},
{"key":"faq[1].a","old":"199 ₪ + מע״מ לחודש, סכום שעבודה אחת מגוגל מכסה. בלי תקופת ניסיון ובלי התחייבות. מבטלים אונליין בכל זמן, והביטול נכנס לתוקף בסוף החודש ששולם.","new":"אצלנו 199 ₪ + מע״מ לחודש, והכול בפנים: האתר, הפרופיל והביקורות. לגוגל אתה לא משלם שקל, כי אין כאן מודעות ואין תקציב פרסום. עבודה אחת מגוגל מכסה את החודש. בלי תקופת ניסיון ובלי התחייבות. מבטלים אונליין בכל זמן, והביטול נכנס לתוקף בסוף החודש ששולם.","why":"Borrows the free-vs-paid framing as a price argument: one fixed sum, no ad budget on top."},
{"key":"faq[8].q","old":null,"new":"קידום אורגני או מודעות בגוגל, מה עדיף לי?","why":"Answers the organic-vs-paid search without using the /google-ads head terms."},
{"key":"faq[8].a","old":null,"new":"מודעות מביאות פניות מהר, ונעצרות ברגע שמפסיקים לשלם על קליקים. קידום אורגני נבנה לאט יותר, אבל הוא לא נעלם כשנגמר התקציב: העמודים, הפרופיל והביקורות ממשיכים להביא טלפונים, בלי תשלום על כל קליק. לעסק שכבר יש לו פרופיל עם ביקורות, זה הבסיס שנכון להתחיל ממנו. ואם תרצה בהמשך גם מודעות, כבר יהיה להן אתר טוב לנחות עליו.","why":"Sells organic as the asset that keeps working, without bashing our own Ads Bot."},
{"key":"faq[9].q","old":null,"new":"איך עולים גבוה יותר בגוגל מפות?","why":"Captures the Google Maps search, reframed for a reader who already has a profile."},
{"key":"faq[9].a","old":null,"new":"אתה כבר במפה, כי יש לך פרופיל. השאלה היא את מי גוגל מראה כשמחפשים לידך. לפי גוגל, זה נקבע לפי ההתאמה לחיפוש, המרחק מהמחפש וכמה העסק מוכר. לשלם לגוגל על מקום טוב יותר במפה אי אפשר. מה שכן עובד: פרופיל מלא ומדויק, אתר שמגבה אותו בעמוד לכל שירות, וביקורות חדשות שממשיכות להיכנס. אלה בדיוק שלושת הדברים שאנחנו עושים בשבילך.","why":"Turns Google's own rules into a description of our product."},
{"key":"faq[10].q","old":null,"new":"אפשר לקדם עסק בגוגל בלי אתר?","why":"The exact objection of our target reader (profile with ratings, no site), phrased with the head term."},
{"key":"faq[10].a","old":null,"new":"להופיע אפשר. הפרופיל לבד מכניס אותך למפה, בעיקר כשמחפשים את המקצוע שלך. אתר עם עמוד לכל שירות מכניס אותך גם לחיפושים של הצרה עצמה, כמו ״החלפת דוד״ או ״פתיחת סתימה״. והלקוח שמשווה בינך לבין המתחרה מקבל עוד סיבה טובה לבחור בך. לכן האתר אצלנו בפנים, באותו מחיר.","why":"Concedes the profile works, then sells the site as more searches and a stronger comparison."},
{"key":"faq[11].q","old":null,"new":"כמה זמן לוקח עד שרואים תוצאות?","why":"A common search and a silent objection; answered with no promise of ours."},
{"key":"faq[11].a","old":null,"new":"האתר שלך באוויר תוך יום עסקים אחד מהתשלום. מכאן זה הקצב של גוגל: לפי גוגל עצמו, שינוי יכול להשפיע תוך שעות או אחרי כמה חודשים. מי שמבטיח לך מקום ראשון עד תאריך מסוים מבטיח משהו שלא בידיים שלו. אנחנו מבטיחים את העבודה, ובדוח החודשי אתה רואה בעצמך אם מתקשרים יותר. ואין התחייבות, אז אתה לא נעול לשום דבר.","why":"Uses 'nobody can promise first place' against competitors and leans on the report and no-commitment as proof."}
]}
```

Two things to confirm before applying:
- **Yonatan:** `parts.profile.h2` and `faq_h2` are heading changes outside the four signed-off anchors, so they need his glance.
- **Google's wording:** the three local factors and the "hours to several months" line are as the competitor page quotes them from Google; check them against Google's help pages before shipping.

## 4. Structural recommendations (need code)

- Render the new FAQ items 9, 10 and 8 (Maps, without a site, organic vs ads) directly after `faq[0]`, and item 11 after `faq[2]`, rather than at the end.
- Confirm the page emits FAQ schema and that it picks up the new items.
- Link the «גוגל כותב» / «לפי גוגל» phrases to Google's own help pages, as the competitor's sources list does.
- Link the word «מודעות» in `faq[8].a` to /google-ads.
- Add a separate guide in the knowledge section for the how-to intent (free vs paid, DIY steps), linking to /site-bot with the head-term anchor and to /google-ads; Yonatan picks its target term so it does not compete with this page.