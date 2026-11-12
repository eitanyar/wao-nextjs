# /google-ads hub: mechanism moment 3 to the designed-to frame (2026-11-12)

Patch mode. Two live lines on the /google-ads hub (the "how marks work" mechanism block, third moment) state as fact something that isn't built yet. Rewrite ONLY these two lines. Return JSON {"patches":[{"field","old","new","why"}]} with `old` byte-exact as below.

Live:
- mechanism.moments[2].title :: הסימונים מצטברים — והקמפיין עובר לבד למצב פניות
- mechanism.moments[2].desc :: מאותו רגע גוגל מכוונת לפניות אמיתיות בלבד, לא לקליקים. בלי שיחה אלינו ובלי המתנה לאישור. אתה לא צריך לשבת על הקמפיין בלילות.

Context (the two moments before it, unchanged):
- moments[0]: a form, call or WhatsApp tap from the landing page lands in his enquiry list.
- moments[1].desc :: אתה מסמן כל פנייה: אמיתית או לא, נסגרה או לא. פנייה שסימנת כאמיתית חוזרת לגוגל מהיום הראשון, וכל סימון מקרב את המעבר האוטומטי למצב פניות.

Facts (binding, Dror):
- The automatic switch from click mode to enquiry mode is DESIGNED, not live yet: "מתוכנן לעבור לבד". Threshold about 15 real enquiries in 60 days plus at least 2 closed jobs; we estimate two to three months for a typical trade at the minimum budget; not every business gets there.
- The switch happens without a call to us, but only under the owner's one-time approval given at sign-up. So "בלי המתנה לאישור" is false: drop it. "בלי שיחה אלינו" may stay.
- Don't say Google aims at real enquiries "only" as a present fact. In enquiry mode, Google is designed to aim at enquiries like the ones he marked real.
- The approved how-it-works step 8 says it this way (stay consistent, don't copy it verbatim): H2 `מתוכנן לעבור מקליקים לפניות, רק כשהנתונים מאפשרים`; body `הבוט מתוכנן להעביר את הקמפיין לבד ממצב קליקים למצב פניות.`

Keep it short. The title is a one-line moment caption like the others ("X — Y"). The desc is 1–2 sentences, singular male, and must still sell the point: he doesn't babysit the campaign.
