# /google-ads: be transparent about the optimisation phases (2026-11-12)

Owner direction (Eitan): the cost-per-enquiry cap is a real part of how we work, but only in the right phase. We should be openly transparent about how the bot makes it work, across all the optimisation phases. Rewrite `does.items[1].desc` to describe the phases truthfully and briefly, in the card's style. Also propose an OPTIONAL short block `phases` (an h2 plus three one-line steps) that the page could carry. Both go through Noa.

The facts (do not go beyond them):
- **Phase 1, learning (new account, no data yet):** the bot caps the price per click; blocks searches that burn money without bringing enquiries; won't add budget while the cost per enquiry is above the target set for his business; fake-click filtering is on. He marks each enquiry as a real closed job or not.
- **Phase 2, optimising for enquiries:** after enough marked closed jobs (about 15–30), bidding moves to a target cost per enquiry, so Google aims at the price per enquiry that fits his business. This is a judged step taken when the data is there, not a fixed date.
- **Throughout:** he sees every enquiry and every shekel in his own account.
- **Never:** results promises, a guaranteed cost per lead, "stops overspend", or dates.

Return patches (old → new, with why) for `does.items[1].desc`, plus a `phases` proposal as new fields (`phases.h2`, `phases.items[0..2]`). Keep it short; this page sells to a busy tradesman.

## Current page fields (context)
hero.h1 :: פרסום בגוגל שלומד מהעבודות שאתה סוגר, לא מקליקים
hero.subhead :: הכסף יצא, הקליקים הגיעו, והטלפון שתק. כאן הקמפיין לומד מהפניות שאתה מסמן, ואתה רואה כל פנייה וכל שקל. במקום ריטיינר של משרד — 249 ₪ + מע״מ בחודש.
hero.badge :: חשבון על השם שלך
hero.cta_primary :: שיחה של 30 דקות עם איתן — חינם
hero.cta_secondary :: לראות דמו חינם
hero.cta_note :: בלי התחייבות, עם הסכם כתוב
does.h2 :: הבוט עושה את העבודה השחורה. אתה מסמן.
does.items[0].title :: חשבון חדש, מאפס
does.items[0].desc :: אנחנו פותחים חשבון Google Ads על השם שלך ובונים קמפיינים, מודעות ודפי נחיתה לשירות המרכזי שלך.
does.items[1].title :: שומר תקציב
does.items[1].desc :: הבוט חוסם חיפושים ששורפים כסף בלי פניות, תקרת עלות לפנייה עוצרת חריגה, וסינון קליקים מזויפים כלול.
does.items[2].title :: דוח שבועי בשקלים
does.items[2].desc :: בסוף כל שבוע אתה מקבל שלושה מספרים: פניות שנכנסו, פניות שסימנת כאמיתיות והעלות של כל אחת בשקלים.
does.items[3].title :: איתן, לא מספר חסוי
does.items[3].desc :: אם משהו דחוף, אתה מדבר עם איתן. לא מוקד, לא שלוחה, לא מישהו שמעביר הלאה.
offer.h2 :: 1,500 ₪ — תקציב הפרסום שלך. 249 ₪ — דמי הניהול שלנו.
offer.body :: דמי הניהול שלנו הם 249 ₪ + מע״מ בחודש. תקציב הפרסום המינימלי הוא 1,500 ₪ בחודש — בערך 50 ₪ ביום. זה הכסף שלך: הוא קונה את המודעות שלך, יורד ישירות לגוגל מהחשבון שלך, ושום חלק ממנו לא מגיע אלינו.
offer.anchor :: ניהול במשרד מתחיל בדרך כלל בערך ב־1,500 ₪ + מע״מ בחודש, עוד לפני התקציב — בערך פי שישה מאיתנו, ושם זה רק מתחיל.
offer.bonus :: אם העסק שלך מעולם לא פרסם ב־Google Ads, אנחנו מגישים בשבילך בקשה לקרדיט פרסום בחשבון החדש — אפשרות שרוב בעלי העסקים בכלל לא שומעים עליה. גוגל מחליטה אם לאשר.
offer.refund :: אנחנו עומדים מאחורי זה: אם אחרי 30 הימים הראשונים לא תרצה להמשיך, נחזיר לך את דמי הניהול בלי סיבה. אם המודעה בכלל לא עולה, ההחזר מגיע לך בלי שתבקש.
offer.refund_terms :: ההחזר מותנה בתקציב של לפחות 1,500 ₪ בחודש, בבקשה עד 7 ימים מסוף 30 הימים הראשונים ובלי החזר קודם.
offer.policy_line :: החשבון על השם שלך ומקושר לחשבון הניהול שלנו, אתה רואה קליקים ועלות בכל רגע, ויש הסכם כתוב.
