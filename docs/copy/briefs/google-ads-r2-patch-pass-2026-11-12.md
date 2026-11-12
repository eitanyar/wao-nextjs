# Patch pass — /google-ads round 2 (2026-11-12)

Strategist (Fable 5.2) passed your round 2 to Noa after one short patch pass. These are its instructions, in order. Fix only what is listed; everything else on the page now works and must stay byte-exact. Your Sabra voice is the asset: a fix never becomes flatter or more formal than the line it replaces.

## Strategist's patch list
1. **`hero.badge`:** replace the repeated price with option 2's badge. **`hero.cta_note`:** facts from the sheet only; no claim about a form.
2. **`scene.body`:** do not replay the subhead's beat. Open on a new detail of that month and go straight to the "more budget or more time" line.
3. **Mechanism:**
   - `mechanism.h2` and `.intro`: return to jobs; no "clicks into enquiries" result and no "Google buys".
   - `moments[2].title`: no weekday that implies the budget moves in the first week.
   - `moments[0].desc`: drop "immediately".
4. **Proof:**
   - `proof.items[1].desc`: turn the Partner fact into pride (Google re-checks us every day), in spoken negation, with all three requirements.
   - `proof.items[0].desc`: only what Adam confirms the demo shows.
5. **`offer.h2`, `offer.body`:** one name for our fee across the page, and not the word for a commission. Answer "₪1,500 is a lot": it is his money buying his ads, and none of it is ours.
6. **`offer.bonus`:** present it as a win we bring him. Move the "most owners never hear of it" idea up from the FAQ and keep the single qualifier.
7. **`offer.refund_terms`:** one short line with the three conditions. The clock, Google's hold days and "fee only" live in `faq[3]`.
8. **`offer.policy_line`:** drop the clause that repeats `offer.body`.
9. **`start.steps[2]`:** replace marking (already moment 2) with the real third start action: the account opens in his name and the ads go live after he has seen the plan.
10. **FAQ fixes:**
    - `faq[3].a`: rewrite so a tradesman can parse it; fix the "every month within 30 days" contradiction.
    - `faq[5].a`: open with what he gets, then the no in one clause.
    - `faq[6].a`: open the way Dror specified, in active voice.
    - `faq[7].a`: delete the results claim.
    - `faq[1]`: spoken question form; do not relist the marking steps.
11. **`close.cta_primary` / `close.cta_secondary`:** identical to the hero's labels.
12. **`close.body`:** see the decision below.

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
  "angle": "Recommended: solution-aware, high sophistication; lead with the learning loop that turns his markings into better budget decisions.",
  "h1": "פרסום בגוגל שלומד מהעבודות שאתה סוגר, לא מקליקים",
  "subhead": "הכסף יצא, הקליקים הגיעו, והטלפון שתק. כאן הקמפיין לומד מהפניות שאתה מסמן, ואתה רואה כל פנייה וכל שקל. במקום ריטיינר של משרד — ₪249 + מע״מ בחודש.",
  "badge": "₪249 + מע״מ לניהול חודשי",
  "cta": "שיחה של 30 דקות עם איתן — חינם",
  "ctaNote": "בלי התחייבות ובלי טופס ארוך"
 },
 {
  "angle": "Ownership and exit safety for a burned owner who fears lock-in.",
  "h1": "פרסום בגוגל בחשבון שלך, בלי להינעל לשנה",
  "subhead": "הקמפיין והנתונים נשארים על השם שלך, אתה רואה כל שקל, ואתה יכול לעזוב כל חודש.",
  "badge": "חשבון על השם שלך",
  "cta": "דבר עם איתן 30 דקות — חינם",
  "ctaNote": "בלי הפתעות, עם הסכם כתוב"
 },
 {
  "angle": "Price and bot mechanism against an agency retainer.",
  "h1": "פרסום בגוגל ב־₪249 בחודש, בלי ריטיינר של משרד",
  "subhead": "בוט מריץ את הקמפיין, שומר על תקרת עלות לפנייה, ואתה מסמן אילו פניות שוות עבודה.",
  "badge": "₪249 + מע״מ לניהול",
  "cta": "בוא נדבר על זה — 30 דקות חינם",
  "ctaNote": "אפשר גם לראות דמו לפני כן"
 }
]

## Current field dump (key :: value)
hero.h1 :: פרסום בגוגל שלומד מהעבודות שאתה סוגר, לא מקליקים
hero.subhead :: הכסף יצא, הקליקים הגיעו, והטלפון שתק. כאן הקמפיין לומד מהפניות שאתה מסמן, ואתה רואה כל פנייה וכל שקל. במקום ריטיינר של משרד — ₪249 + מע״מ בחודש.
hero.badge :: ₪249 + מע״מ לניהול חודשי
hero.cta_primary :: שיחה של 30 דקות עם איתן — חינם
hero.cta_secondary :: לראות דמו חינם
hero.cta_note :: בלי התחייבות ובלי טופס ארוך
scene.h2 :: הקליקים הגיעו. העבודה לא.
scene.body :: בחודש שעבר המודעות עלו, התקציב ירד, והטלפון נשאר שקט. ואז אמרו לך שצריך עוד תקציב או עוד זמן. זו לא עבודה. זו שיטה שסופרת קליקים ומקווה שמישהו יתקשר.
mechanism.h2 :: שלושה רגעים שהופכים קליקים לפניות
mechanism.intro :: כל פנייה, כל סימון וכל שקל נכנסים לאותו מעגל. ככה גוגל מפסיקה לקנות תנועה ומתחילה לקנות פניות.
mechanism.moments[0].title :: יום ראשון, 08:30 — פנייה נכנסת לרשימה
mechanism.moments[0].desc :: טופס, שיחה או לחיצת וואטסאפ מדף הנחיתה מגיעים ישר לרשימת הפניות שלך. אתה רואה הכול מיד, בלי לחפש במיילים.
mechanism.moments[1].title :: יום שני, בין עבודה לעבודה — אתה מסמן
mechanism.moments[1].desc :: אתה מסמן רלוונטי או לא, סגור או לא. הסימון שלך חוזר לגוגל ומלמד אותה אילו חיפושים מביאים עבודה.
mechanism.moments[2].title :: יום חמישי, לפני סוף שבוע — התקציב זז
mechanism.moments[2].desc :: גוגל מזהה אילו חיפושים מביאים פניות טובות יותר ומזיזה את התקציב לשם. אתה לא צריך לשבת על הקמפיין בלילות.
does.h2 :: הבוט עושה את העבודה השחורה. אתה מסמן.
does.items[0].title :: חשבון חדש, מאפס
does.items[0].desc :: אנחנו פותחים חשבון Google Ads על השם שלך ובונים קמפיינים, מודעות ודפי נחיתה לשירות המרכזי שלך.
does.items[1].title :: שומר תקציב
does.items[1].desc :: הבוט חוסם חיפושים ששורפים כסף בלי פניות, תקרת עלות לפנייה עוצרת חריגה, וסינון קליקים מזויפים כלול.
does.items[2].title :: דוח שבועי בשקלים
does.items[2].desc :: בסוף כל שבוע אתה מקבל שלושה מספרים: פניות שנכנסו, פניות שסימנת כאמיתיות והעלות של כל אחת בשקלים.
does.items[3].title :: איתן, לא מספר חסוי
does.items[3].desc :: אם משהו דחוף, אתה מדבר עם איתן. לא מוקד, לא שלוחה, לא מישהו שמעביר הלאה.
proof.h2 :: אתה לא צריך להאמין לנו. אתה יכול לבדוק.
proof.items[0].title :: דמו חינם, לפני שאתה משלם
proof.items[0].desc :: אתה רואה איך נראים חשבון, מודעה ודוח פניות, עוד לפני החיוב הראשון.
proof.items[1].title :: Google Partner, עם בדיקה יומית
proof.items[1].desc :: WAO היא Google Partner. הסטטוס הזה אינו קבוע, וגוגל בודקת מדי יום שהשותפה עומדת בדרישות ביצועים ותקציב פרסום.
proof.items[2].title :: איתן, מייסד WAO
proof.items[2].desc :: איתן מוביל את השירות, והוא בשיווק דיגיטלי מאז 2006.
offer.h2 :: העמלה קטנה. התקציב שלך נשאר שלך.
offer.body :: העמלה שלנו היא ₪249 + מע״מ לניהול חודשי. תקציב הפרסום המינימלי הוא ₪1,500 בחודש — בערך ₪50 ביום — והוא יורד ישירות לגוגל מחשבון שלך, לא אלינו.
offer.anchor :: ניהול במשרד מתחיל בדרך כלל בערך ₪1,500 + מע״מ בחודש, עוד לפני התקציב — בערך פי שישה מאיתנו, ושם זה רק מתחיל.
offer.bonus :: לעסק שמעולם לא פרסם ב־Google Ads נגיש בקשה לקרדיט פרסום בחשבון החדש — גוגל מחליטה אם לאשר וקובעת את הסכום והתנאים.
offer.refund :: אנחנו עומדים מאחורי זה: אם אחרי 30 הימים הראשונים לא תרצה להמשיך, נחזיר לך את דמי הניהול בלי סיבה. אם המודעה בכלל לא עולה, ההחזר מגיע לך בלי שתבקש.
offer.refund_terms :: ההחזר בתוקף אם תקציב הפרסום היה לפחות ₪1,500 בחודש במשך 30 הימים הראשונים מיום שהמודעה הראשונה עלתה, העסק לא קיבל את ההחזר הזה קודם, והבקשה מגיעה תוך 7 ימים אחרי סוף התקופה. ימים שגוגל מעכבת את החשבון לבדיקות לא נספרים, וההחזר הוא על דמי הניהול בלבד.
offer.policy_line :: העמלה נפרדת מתקציב הפרסום, החשבון על השם שלך ומקושר לחשבון הניהול שלנו, אתה רואה קליקים ועלות בכל רגע, ויש הסכם כתוב.
yours.h2 :: החשבון שלך. נקודה.
yours.body :: הקמפיינים והנתונים נבנים על השם שלך, ואנחנו לא כובלים אותך. אם תחליט לעזוב, אתה עוזב. אנחנו צריכים להצדיק את החודש הבא — לא לנעול אותך לשנה.
start.h2 :: שלושה צעדים. בלי הפתעות.
start.steps[0].title :: שיחה עם איתן
start.steps[0].desc :: אתה מדבר עם איתן 30 דקות, חינם, ובודק אם זה מתאים לעסק שלך.
start.steps[1].title :: תוכנית לפני עלייה
start.steps[1].desc :: אתה רואה אזור, תקציב, מילות חיפוש ודוגמת מודעה, ואתה יכול לבקש שינויים לפני שהכול באוויר.
start.steps[2].title :: סימון פניות
start.steps[2].desc :: אתה מסמן כל פנייה כרלוונטית או לא וסגורה או לא, וגוגל לומדת מזה.
faq[0].q :: למי אני משלם את ה־₪249 ומה הולך לגוגל?
faq[0].a :: את ה־₪249 + מע״מ אתה משלם לנו עבור הניהול. את תקציב הפרסום, לפחות ₪1,500 בחודש, אתה משלם ישירות לגוגל מחשבון Google Ads שלך.
faq[1].q :: איך אדע שזה יביא לי עבודה?
faq[1].a :: אתה רואה את זה לפי הפניות שאתה מסמן. אתה רואה כל פנייה ברשימה, מסמן רלוונטי או לא וסגור או לא, ובדוח השבועי אתה רואה כמה פניות הגיעו, כמה מהן סימנת כאמיתיות ומה עלתה כל אחת בשקלים.
faq[2].q :: מה גוגל מבקשת ממני לפני שהמודעות עולות?
faq[2].a :: גוגל מבקשת פרטי תשלום ולפעמים תעודה מזהה, ואתה מזין אותם בעצמך בחשבון. אם הבדיקות לא מסתיימות תוך 21 ימים מתשלום, אתה יכול לבטל ולקבל החזר מלא.
faq[3].q :: מה בדיוק ההחזר שאני מקבל?
faq[3].a :: אם בתוך 30 הימים הראשונים להופעת המודעה הראשונה הוצאת לפחות ₪1,500 על תקציב פרסום בכל חודש, לא קיבלת את ההחזר הזה קודם, וביקשת תוך 7 ימים אחרי סוף התקופה — נחזיר את ה־₪249 שלנו. ימי בדיקה של גוגל לא נספרים, וזה על דמי הניהול בלבד. גם אם המודעה לא עולה, הכסף חוזר אליך בלי פנייה מצידך.
faq[4].q :: אני יכול להפסיק? מה עם דפי הנחיתה?
faq[4].a :: אתה יכול לעזוב כל חודש, כי החשבון והקמפיינים שלך. אחרי ביטול, דפי הנחיתה נשארים באוויר 30 ימים, אפשר לקנות אותם ב־₪900, והם ניתנים חינם אחרי 12 חודשי תשלום.
faq[5].q :: אתם מתקנים לי חשבון קיים?
faq[5].a :: לא. אנחנו פותחים חשבון חדש על השם שלך ובונים אותו מאפס. בשיחה החינמית אפשר להסתכל על מה שיש לך היום.
faq[6].q :: מגיע לי קרדיט מגוגל?
faq[6].a :: אתה זכאי לבקשה אם לא פרסמת עד היום ב־Google Ads. אנחנו, כ־Google Partner, מגישים בקשה לקרדיט פרסום בחשבון החדש שלך. האישור, הסכום והתנאים נקבעים על ידי גוגל, וזה כסף לפרסום בחשבון שלך, בנוסף לתקציב שלך. רוב בעלי העסקים שפותחים חשבון לבד בכלל לא שומעים על האפשרות הזאת.
faq[7].q :: מה ההבדל בין מודעות לקידום אורגני בשבילי?
faq[7].a :: מודעות מביאות חשיפה מהירה יותר לחיפושים רלוונטיים, וקידום אורגני נבנה לאט יותר. כאן המודעות מביאות פניות, והסימון שלך מלמד את גוגל אילו חיפושים שווים תקציב.
faq[8].q :: מתי אני מתחיל לשלם?
faq[8].a :: התשלום מתחיל בהרשמה. ה־₪249 + מע״מ הוא עבור הניהול, ותקציב הפרסום יורד ישירות מול גוגל לפי הקמפיין.
close.h2 :: תפסיק לקנות קליקים. תתחיל לקנות פניות.
close.body :: ניהול זול רודף אחרי קליקים. אנחנו רודפים אחרי העבודות שאתה סוגר. בוא נדבר אם אתה רוצה חשבון שלומד ממך, לא רק מוציא כסף.
close.cta_primary :: דבר עם איתן 30 דקות — חינם
close.cta_secondary :: לבדוק את הדמו חינם
