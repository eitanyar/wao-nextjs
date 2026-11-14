# Noa — language gate: Site Bot account page, client emails, terms §16 (2026-11-14)

Saved verbatim by Adam from Noa's hand-back (her tools cannot create files).
Inputs: `docs/copy/site-bot-account-page-hebrew-2026-11-14.waocopy.json`, `docs/copy/site-bot-terms-s16-support-2026-11-14.waocopy.json`.

**Verdict: PASS-WITH-FIXES** — 17 string fixes, 1 new string variant, 1 terms fix. Date patch passes unchanged. Typography sweep clean; placeholders intact; metadata.title ends in Hebrew.

## Fixes (byte-exact)

- `page.tsx:status.past_due`: `באיחור` → `החיוב לא עבר`
- `page.tsx:link.used`: `הקישור הזה כבר היה בשימוש. בקש קישור חדש בטופס למטה.` → `כבר השתמשת בקישור הזה. בקש קישור חדש בטופס למטה.`
- `CancelSubscriptionButton.tsx:error.invalidToken`: `הקישור הזה פג תוקף או כבר היה בשימוש. בקש קישור חדש כדי לבטל את המנוי.` → `הקישור הזה פג תוקף, או שכבר השתמשת בו. בקש קישור חדש כדי לבטל את המנוי.`
- `CardUpdateButton.tsx:error.invalidToken`: `הקישור הזה פג תוקף או כבר היה בשימוש. בקש קישור חדש כדי לעדכן את הכרטיס.` → `הקישור הזה פג תוקף, או שכבר השתמשת בו. בקש קישור חדש כדי לעדכן את הכרטיס.`
- `CancelSubscriptionButton.tsx:error.generic` (render only when `showMessageBox` is true): `משהו השתבש. נסה שוב, או כתוב לנו בתיבת ההודעות בעמוד הזה.` → `משהו השתבש. נסה שוב, או כתוב לנו בתיבה ״בקשה או שאלה?״ למעלה.`
- `CardUpdateButton.tsx:error.generic`: same old → same new (only when `showMessageBox` is true).
- NEW `error.genericNoBox` (both buttons when `showMessageBox` is false): `משהו השתבש. נסה שוב בעוד כמה דקות.`
- `RequestLinkForm.tsx:error.generic`: `משהו השתבש. נסה שוב, או כתוב לנו בתיבת ההודעות בעמוד הזה.` → `משהו השתבש ולא הצלחנו לשלוח את הקישור. נסה שוב בעוד כמה דקות.`
- `route.ts:error.server`: `לא הצלחנו לטפל בבקשה. נסה שוב מאוחר יותר.` → `לא הצלחנו לשלוח את הקישור. נסה שוב בעוד כמה דקות.`
- `route.ts:success.message`: `אם יש חשבון עם הכתובת הזאת, שלחנו אליו קישור לעמוד החשבון. שם אפשר לנהל את המנוי, לעדכן כרטיס, לכתוב לתמיכה ולבטל.` → `אם הכתובת הזאת רשומה אצלנו, שלחנו אליה קישור לעמוד החשבון. שם אפשר לנהל את המנוי, לעדכן כרטיס, לכתוב לתמיכה ולבטל.`
- `page.tsx:row.accessUntil`: `גישה עד` → `השירות פעיל עד`
- `CancelSubscriptionButton.tsx:done.accessUntil`: `גישה עד` → `השירות פעיל עד`
- `cancelConfirm.question`: `לבטל את המנוי? אחרי הביטול לא נחייב אותך יותר, והגישה שלך תימשך עד {date}.` → `לבטל את המנוי? אחרי הביטול לא נחייב אותך יותר, והשירות ימשיך לפעול עד {date}.`
- `email.ts:renewal.subject`: `WAO — קבלה על חידוש המנוי` → `WAO — אישור על חידוש המנוי`
- `email.ts:renewal.cancelLine`: `רוצה לבטל? הקישור פותח את עמוד החשבון, ושם מבטלים בלחיצה על כפתור, לא בהודעה. הוא תקף ל־30 דקות. אם פג, בקש קישור חדש בעמוד החשבון:` → `רוצה לבטל? מבטלים רק בלחיצה על כפתור בעמוד החשבון, לא בהודעה. הקישור למטה תקף ל־30 דקות, ואם התוקף שלו פג, אפשר לבקש שם קישור חדש:`
  - Variant without "button only" (use if the lawyer drops the clause): `רוצה לבטל? מבטלים בלחיצה על כפתור בעמוד החשבון. הקישור למטה תקף ל־30 דקות, ואם התוקף שלו פג, אפשר לבקש שם קישור חדש:`
- `email.ts:cardUpdateNeeded.body2`: `לא ננסה את החיוב הזה שוב אוטומטית. עדכן את הכרטיס או נהל את המנוי כאן:` → `לא ננסה לחייב את הכרטיס הזה שוב אוטומטית. עדכן את הכרטיס או נהל את המנוי כאן:`
- `email.ts:cardExpiring.subject`: `WAO — הכרטיס שלך עומד לפוג` → `WAO — תוקף הכרטיס שלך מסתיים בקרוב`
- `email.ts:cardExpiring.body1`: `שים לב: הכרטיס שלך למנוי ב־WAO, שמסתיים ב־{cardLast4}, יפוג ב־{cardExpiry}.` → `שים לב: תוקף הכרטיס שלך למנוי ב־WAO יפוג ב־{cardExpiry}. זה הכרטיס שמסתיים ב־{cardLast4}.`

## Terms §16

Patch "new" value: `תמיכה: בכתב בלבד, דרך תיבת ההודעות באזור האישי שלך באתר, או בדוא״ל לכתובת eitan@wao.co.il.`
→ `תמיכה: בכתב בלבד, באמצעות טופס הפניות בעמוד ניהול המנוי באתר WAO, או בדוא״ל לכתובת eitan@wao.co.il.`
Date patch `עודכן לאחרונה: 14.11.2026` passes.

## Suggestions for Tamar (not applied)
- `noToken.intro`: "אם הקישור אבד" → "אם אין לך אותו" reads more spoken.
- Emails say "עמוד החשבון", page title is "ניהול המנוי" — unify in a later pass.
- `cardExpiring.body2`: "בלי הפרעה" → "כדי שהמנוי לא ייפסק".
- Optional: mention the site stays up 30 more days (terms §8) in the cancel copy.

## For Adam (claims / wiring)
1. Terms §7 line 73 says failed charges retry for 7 days; `cardUpdateNeeded.body2` says a hard decline is not retried — confirm terms cover hard declines (lawyer).
2. "Cancel by button only, not by message" — Israeli consumer law may require accepting cancellation by email and other channels. Lawyer before it ships.
3. Dead ends: `cardUpdate=error` and `subscription.notFound` pages tell him to request a link but render no form → add `<RequestLinkForm />`.
4. "לכתוב לתמיכה" in success.message / magicLink.body is true only for Site Bot plans.
5. he-IL dates; `dir="ltr"` on `<main>` must become rtl.
6. Signup-landing strings (page.tsx:38-43) are English, out of this brief (legacy trial).

## Proposed waocopy writing upgrades
1. Pronouns agree with their referent, not the nearest noun.
2. A relative clause sits right after the noun it describes.
3. A UI pointer ("the box above") must be true in every state the string renders.
4. Use the Hebrew subject (תוקף expires; passives → active verbs with a person).
5. Status labels state neutral facts, never judge the reader.
