# Patch pass — /site-bot round 2 (2026-11-12)

Strategist (Fable 5.2) passed your round 2 to Noa after one short patch pass. These are its instructions, in order. Fix only what is listed; everything else on the page now works and must stay byte-exact. Your Sabra voice is the asset: a fix never becomes flatter or more formal than the line it replaces.

## Strategist's patch list
1. **`hero.h1`:** make the relative clause agree with `בנייה` per Yonatan, so it can no longer attach to "small business". Offer Yonatan two forms.
2. **`hero.subhead`:** say who this is for (the one-man business). Keep the "one voice" clause as is.
3. **`launch_stamp`:** one confident line with the date. Remove the "final build in final stages" tautology; it should sound like an opening, not a delay.
4. **`scene.body`:** name a trade and a moment in place of "a tradesman in the area". Introduce the competitor before the kept three-beat line so `אליו` has someone to point at. Replace the "taps the site" calque.
5. **`parts.site.body`:** fix the first sentence's preposition and gender. Say the site shows hours, call button, profile link and reviews (not "every page"). End on his gain.
6. **`parts.profile.h2` and `.body`:** rewrite as a moment: what a customer sees when profile and site show the same services, areas and hours. Lead with the gain. Ownership becomes one short closing clause, in her words. Lose the "synchronised" jargon in the heading.
7. **`parts.reviews.h2` and `.body`:** the heading must not imply reviews arrive by themselves. Write the moment (job done, he forwards the ready message), ending on his gain. Move "we never message your customers" to `faq[6]`.
8. **`monthly.body`:** state the report as one gain; the four items stay in `faq[7]` only. Use the correct Hebrew word for hosting.
9. **`price.body`:** rewrite the broken first sentence and carry the "one small job" comparison into the body.
10. **`proof.items[1]`:** Eitan is WAO's founder. The description should say what his being reachable means for the reader, not his start year alone.
11. **`alternatives.rows[3].what_is_missing`:** the last clause is unclear; say plainly what is absent.
12. **FAQ fixes:**
    - `faq[2].a`: delete the invented clock condition (or Adam supplies the fact).
    - `faq[5]`: ask the question the way he would type it; drop "some of them" unless Adam confirms it.
    - `faq[7].a` and `monthly.body`: use the term Google's own app shows for directions.
13. **Close:** `close.body` names the triad once. `close.cta_primary` and `close.cta_secondary` are identical to the hero's labels.

## Decisions (Adam, 2026-11-12) that override anything above
- **Price format, whole site:** number first, then the sign: `199 ₪`, `249 ₪`, `1,500 ₪`, `900 ₪`. Convert every price in your fields.
- **The enemy on /google-ads** is management that reports clicks. Never use the word "cheap" or any price word for it.
- **The demo** (/google-ads proof): it runs the bot on a sample plumber business and shows the plan it builds (area, budget, keywords, a sample ad and a landing-page preview) before he pays anything. Say only that.
- **Credit FAQ:** the answer opens "Google decides, not us", and may state that the credit is not a discount and not part of our fee. FAQ only.
- **The refund:** "no reason needed". Never tie it to "not wanting to continue".
- **/site-bot clock:** live within one business day of payment (WAO address) or three (own domain). Delete any other clock condition.
- **The /site-bot report term:** use the word Google's own Business Profile app uses for direction requests.
- **Keep** every field not named in the list byte-exact. Patch only the listed fields.

## Output
Use --patches JSON. In each patch, `file` = the field key exactly as written before " :: " in the field dump below. `old` = an exact substring of that field's current value. `new` = its replacement. One field may take several patches.

## The three heroes from round 2 (for reference; the hero in fields.hero.* is the one shipping)
[
 {
  "angle": "System promise for a one-man business: the site is not a brochure, it is one part of a Google story.",
  "h1": "בניית אתר לעסק קטן שמחובר לפרופיל גוגל ולביקורות במערכת אחת",
  "subhead": "האתר, פרופיל גוגל והביקורות מדברים בקול אחד — הלקוח מבין, בוחר ומתקשר.",
  "badge": "199 ₪ + מע״מ לחודש · בלי התחייבות",
  "cta": "בדוק את העסק שלי בחינם",
  "ctaNote": "מקלידים רק שם עסק. בלי הרשמה. התוצאה תוך שניות."
 },
 {
  "angle": "Anti-patchwork promise: stop buying disconnected pieces.",
  "h1": "בניית אתר לעסק קטן שמחבר את האתר, גוגל והביקורות",
  "subhead": "מספיק לקנות חלקים בנפרד. מערכת אחת מסדרת את האתר, הפרופיל והביקורות.",
  "badge": "פחות מעלות עבודה קטנה · בלי התחייבות",
  "cta": "תראה לי את החלקים החסרים",
  "ctaNote": "הבדיקה מראה את הפרופיל כמו שלקוח רואה אותו."
 },
 {
  "angle": "Done-for-you promise for a busy tradesman: no technical work, no upkeep burden.",
  "h1": "בניית אתר לעסק קטן שרץ בשבילך גם אחרי העלייה",
  "subhead": "אתה עונה על כמה שאלות, מאשר הודעות, והמערכת ממשיכה לעבוד כל חודש.",
  "badge": "199 ₪ + מע״מ לחודש · בלי לגעת במערכות",
  "cta": "בדוק מה הלקוח רואה עכשיו",
  "ctaNote": "רק שם העסק. התוצאה תוך שניות."
 }
]

## Current field dump (key :: value)
launch_stamp :: הבנייה הסופית בשלבים אחרונים — פותחים ב־19.11.2026.
launch_stamp_cta_note :: הבדיקה החינמית עובדת כבר עכשיו.
hero.h1 :: בניית אתר לעסק קטן שמחובר לפרופיל גוגל ולביקורות במערכת אחת
hero.subhead :: האתר, פרופיל גוגל והביקורות מדברים בקול אחד — הלקוח מבין, בוחר ומתקשר.
hero.badge :: 199 ₪ + מע״מ לחודש · בלי התחייבות
hero.cta_primary :: בדוק את העסק שלי בחינם
hero.cta_secondary :: דבר עם איתן
hero.cta_note :: מקלידים רק שם עסק. בלי הרשמה. התוצאה תוך שניות.
scene.h2 :: הלקוח כבר החליט — עוד לפני הטלפון
scene.body :: לקוח מחפש בעל מקצוע באזור. הוא רואה מפה עם כוכבים, קורא שתי ביקורות, נוגע באתר. בעשר שניות הוא מחליט. הוא מתקשר. אליו. לא אליך.
claim.h2 :: שלושה חלקים. סיפור אחד.
claim.body :: אם אמרת שאתר לא מביא עבודה, כנראה ראית אתר שעומד לבד. כאן האתר, הפרופיל והביקורות מסכימים ביניהם — ואתה נראה כמו הבחירה הבטוחה.
parts.site.h2 :: האתר שלך הוא עץ השירותים שלך
parts.site.body :: על כל עבודה שאתה עושה יש עמוד משלו: פתיחת סתימה, החלפת דוד, איתור נזילה. הכול תחת עץ שירותים אחד, שנבנה מתוך בדיקה מה מחפשים לידך. כל עמוד כתוב כמו שהלקוח מחפש, וכולל שעות פתיחה, כפתור שיחה, קישור לפרופיל גוגל וביקורות שבחרת. זה מתחיל בכמה שאלות בצ׳אט. אנחנו מושכים את הפרטים שכבר יש בגוגל, כדי שאתה לא תקליד מה שכבר כתוב.
parts.profile.h2 :: פרופיל גוגל שלך מסונכרן עם האתר
parts.profile.body :: אנחנו מתחברים כמנהלים, ואתה נשאר הבעלים. השירותים, האזורים, השעות והתיאור בפרופיל תואמים לאתר. ככה גוגל מקבל תמונה ברורה ומדויקת על העסק שלך.
parts.reviews.h2 :: הביקורות מגיעות אחרי העבודה, בלי רדיפה
parts.reviews.body :: אחרי עבודה אתה מקבל הודעה מוכנה להעביר ללקוח עם הקישור שלך. אנחנו לא פונים ללקוחות שלך. כשביקורת נכנסת, אתה מקבל טיוטת תשובה לאישור לפני שהיא מתפרסמת.
monthly.h2 :: לא פרויקט שמתחיל ולא נגמר
monthly.body :: כל חודש אתה מקבל דוח: כמה אנשים התקשרו מהפרופיל, ביקשו הכוונה ונכנסו לאתר, ואלו ביקורות חדשות הגיעו. אירוח כלול, ושינויים עוברים בהודעה אחת — בלי עורך ובלי מערכת ללמוד.
alternatives.h2 :: כל אחד נותן לך חלק אחד
alternatives.rows[0].option :: מתכנת, משרד פרסום או האחיין
alternatives.rows[0].what_he_gets :: אתר שנבנה פעם אחת, לפי מה שהם יודעים.
alternatives.rows[0].what_is_missing :: הפרופיל, הביקורות והעדכון השוטף נשארים מחוץ לעסקה.
alternatives.rows[1].option :: מערכת בנייה עצמית
alternatives.rows[1].what_he_gets :: כלים לגרור ולבנות.
alternatives.rows[1].what_is_missing :: אתה עדיין צריך לחבר את גוגל, השירותים והביקורות לבד.
alternatives.rows[2].option :: כלי בינה מלאכותית לבד
alternatives.rows[2].what_he_gets :: טקסטים מהירים.
alternatives.rows[2].what_is_missing :: אין מי שבודק את העסק שלך, את השירותים שלך ואת מה שהלקוחות מחפשים.
alternatives.rows[3].option :: רק פרופיל גוגל
alternatives.rows[3].what_he_gets :: כרטיס עסקי במפה.
alternatives.rows[3].what_is_missing :: אין אתר שמסביר, ואין ביקורות שנאספות בסדר.
alternatives.rows[4].option :: כלום
alternatives.rows[4].what_he_gets :: שקט.
alternatives.rows[4].what_is_missing :: הלקוח שמתלבט בינך לבין המתחרה בוחר במי שנראה מוכן.
alternatives.verdict :: זו הבחירה הכי טובה לעסק של אדם אחד: שלושת החלקים עובדים יחד, ואתה פנוי לעבודה.
price.h2 :: שלוש עבודות, מחיר של עבודה קטנה
price.body :: אתר, ניהול פרופיל גוגל ואיסוף ביקורות עולים בדרך כלל שלושה ספקים. כאן הם עובדים יחד ב־199 ₪ + מע״מ לחודש. אם זה לא מתאים, אתה לא תקוע.
proof.h2 :: תראה את זה על העסק שלך
proof.items[0].title :: הבדיקה החינמית
proof.items[0].desc :: אתה מקליד את שם העסק ורואה את פרופיל גוגל כמו שלקוח רואה אותו.
proof.items[1].title :: איתן, מייסד המערכת
proof.items[1].desc :: הוא עוסק בשיווק דיגיטלי מאז 2006.
proof.items[2].title :: בדיקה אנושית לפני עלייה
proof.items[2].desc :: אדם בצוות בודק כל אתר לפני שהוא עולה לאוויר.
faq[0].q :: מה אתם עושים בפועל כדי שאופיע בגוגל?
faq[0].a :: אתה מקבל שלושה חלקים שמדברים באותו קול: אתר עם עמוד לכל שירות, פרופיל גוגל מעודכן עם פרטים מלאים, וביקורות שנאספות אחרי עבודה. גוגל ממליץ על פרטים מלאים ומדויקים ועל יותר ביקורות, ועמוד לכל שירות עוזר לגוגל להבין ולהציג אותך לכל שירות.
faq[1].q :: כמה זה עולה לי, ואיך אני מבטל?
faq[1].a :: החיוב הוא 199 ₪ + מע״מ לחודש, בלי תקופת ניסיון ובלי התחייבות. אפשר לבטל אונליין בכל זמן, והביטול נכנס לתוקף בסוף החודש ששולם.
faq[2].q :: מתי האתר שלי עולה?
faq[2].a :: אם האתר על כתובת שלנו, הוא עולה תוך יום עסקים אחד אחרי התשלום. אם הוא על דומיין שלך, תוך שלושה ימי עסקים. הספירה מתחילה אחרי שהתשלום עבר והפרטים התקבלו.
faq[3].q :: הדומיין שלי נשאר שלי?
faq[3].a :: כן. הדומיין ופרופיל גוגל נשארים שלך גם אם נפרדים.
faq[4].q :: מה קורה אחרי שאני מבטל?
faq[4].a :: האתר נשאר באוויר 30 ימים. אפשר לקנות אותו, ואם שילמת 12 חודשים הוא משוחרר חינם.
faq[5].q :: האם הטקסטים שלי נכתבים בינה מלאכותית?
faq[5].a :: חלקם נעזרים בבינה מלאכותית, ואדם בודק אותם לפני פרסום. ככה זה נשמע כמוך, לא כמו תבנית.
faq[6].q :: אני צריך לעשות משהו כל חודש?
faq[6].a :: לא, חוץ משתי פעולות קטנות: להעביר הודעת ביקורת אחרי עבודה, ולאשר טיוטת תשובה כשביקורת מגיעה. אם יש שינוי, שולחים הודעה לבוט.
faq[7].q :: מה אני רואה בדוח החודשי?
faq[7].a :: הדוח מראה כמה אנשים התקשרו מפרופיל גוגל, ביקשו הכוונה, לחצו לאתר, ואלו ביקורות חדשות נכנסו. ככה אתה רואה מה קרה בלי לפתוח מערכות.
close.h2 :: שהגוגל שלך עובד בשבילך
close.body :: אתה איש מקצוע טוב. אתה לא צריך ללמוד מערכות — אתה צריך מערכת שמסדרת את האתר, הפרופיל והביקורות סביב העבודה שלך. כשהאתר, הפרופיל והביקורות משדרים אותו דבר, הלקוח לא צריך להתאמץ כדי לבחור בך.
close.cta_primary :: בדוק איך הלקוח רואה אותך
close.cta_secondary :: שאל את איתן לפני שמתחילים
seo.title :: בניית אתר לעסק קטן, פרופיל גוגל וביקורות יחד
