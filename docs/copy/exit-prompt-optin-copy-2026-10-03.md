# Hebrew Copy Bundle — Exit-Prompt Opt-In Variant + Checkup Email

- Author: waocopy (Tamar/Gil), authorized Hebrew author for this bundle only.
- Date: 2026-10-03
- Task: t_e854e3a7 / Contract 046 (handoff/pending/2026-10-03_046_waocopy_exit-prompt-optin-copy.md)
- Status: DRAFT ONLY — no code, no UI change, no email send.
- Gates before ship: waohebrewqa QA gate (Contract 047), owner sender-identity decision, engineer byte-exact application contract.
- Binding rules honored: singular male; Sabra register per src/lib/site-bot/researchCopy.ts; every sentence <= 15 words; zero emoji; no price mention or currency figure; no timeline promise; no live-site claim; no competing third offer; niche button labels out of scope (engineer reuses course-variant labels).
- Placeholder: the ASCII token __SENDER_IDENTITY__ in optin.email.senderNote stays verbatim until the owner picks the sender address.

## Popup — optin exit-prompt variant (service pages)

optin.popup.title: רגע לפני שאתה יוצא — בדיקת שיווק חינמית, ישר למייל

optin.popup.body: נכין לך סיכום בדיקה של עשר דקות על השיווק של העסק שלך. תקבל שלושה ממצאים אמיתיים על סוג העסק שלך, ועוד המלצה אחת לצעד הבא. זה חינם, בלי שום התחייבות.

optin.popup.emailLabel: כתובת האימייל שלך

optin.popup.consentLabel: אני מאשר לקבל את סיכום הבדיקה, ומיילים שיווקיים מדי פעם מ-WAO.

optin.popup.submit: שלח לי את סיכום הבדיקה

optin.popup.secondary: מעדיף להתחיל כבר עכשיו? אפשר להקים קמפיין בגוגל או לבנות אתר עם בוט השיווק.

optin.popup.successTitle: מעולה — סיכום הבדיקה בדרך אליך

optin.popup.successBody: סיכום בדיקת השיווק נשלח לכתובת האימייל שלך. שווה לבדוק גם את תיקיית הספאם.

optin.popup.errorEmail: צריך כתובת אימייל תקינה כדי לשלוח לך את הבדיקה.

optin.popup.errorConsent: סמן את תיבת האישור כדי שנוכל לשלוח לך את הבדיקה.

optin.popup.privacyNote: הפרטים שלך נשמרים בפרטיות ומשמשים לשליחת סיכום הבדיקה ומיילים מ-WAO. מדיניות הפרטיות.

## Email — free checkup summary

optin.email.subject: סיכום בדיקת השיווק שלך מוכן — WAO

optin.email.greeting: היי! ביקשת את סיכום בדיקת השיווק — הנה הוא לפניך.

optin.email.findings.clinic: חיפושי קליניקות יכולים להתחיל בגוגל, עם שם העיר או השכונה. פרופיל עסק בגוגל עם ביקורות עדכניות עוזר למטופלים להכיר את הקליניקה. מטופלים עשויים להשוות כמה מקומות לפני שהם מתקשרים.

optin.email.findings.lawyer: מי שמחפש עורך דין מקומי מקליד בגוגל את סוג התיק ואת העיר. לקוחות רבים בודקים את התוצאות הראשונות בגוגל לפני שהם פונים. דף נפרד לכל תחום עיסוק עוזר למצוא מידע ממוקד.

optin.email.findings.ecommerce: המיקום בגוגל יכול להשפיע על החשיפה של חנות דיגיטלית בחיפושי מוצר. קונים עשויים להגיע מדף מוצר או קטגוריה, ולא רק מדף הבית. תמונות מקוריות ותיאורי מוצר מדויקים יכולים לשפר את חוויית הקנייה.

optin.email.findings.other: עסקים קטנים מתחרים בגוגל מול רשתות גדולות, ויכולים להופיע בחיפושים מקומיים. דף שירות מדויק עוזר ללקוחות למצוא מידע רלוונטי. ביקורות של לקוחות אמיתיים יכולות לעזור בבחירה.

optin.email.nextStep.clinic: תפתח את פרופיל העסק שלך בגוגל, ותוודא שהשירותים והאזור מעודכנים.

optin.email.nextStep.lawyer: בחר שירות אחד שמכניס לך הכי הרבה, ובנה עליו דף נפרד וברור.

optin.email.nextStep.ecommerce: קח מוצר אחד שנמכר חלש, ושפר לו כותרת, תיאור ותמונה — לפני שאתה מרחיב.

optin.email.nextStep.other: תבדוק בגוגל איך העסק שלך נראה בתוצאות החיפוש — ואז תשפר דבר אחד.

optin.email.softCta: בא לך שנעשה את זה יחד? בוט השיווק של WAO בונה ומנהל לך נוכחות בגוגל.

optin.email.senderNote: המייל הזה נשלח מ-WAO כי ביקשת אותו. כתובת השולח: leads@wao.co.il. לא מעוניין יותר? לחיצה על הסרה — ונפסיק מיד.

## Engineer notes (not copy keys)

- optin.popup.secondary carries two link actions, matching the page's existing paths: "להקים קמפיין בגוגל" -> /google-ads/onboarding, "לבנות אתר עם בוט השיווק" -> /site-bot/start. No new offer.
- optin.popup.privacyNote: "מדיניות הפרטיות" is the anchor text linking to /privacy.
- Niche button labels reuse the existing course-variant labels byte-identical (out of scope here).
