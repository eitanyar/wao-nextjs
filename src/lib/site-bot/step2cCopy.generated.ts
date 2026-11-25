// AUTO-GENERATED (waocopy, 2026-11-25) from:
//   docs/copy/site-bot-step2c-preview-pay-2026-11-25.waocopy.json
//   docs/copy/site-bot-step2b-facts-empty-final-2026-11-25.waocopy.json
// Do not edit by hand; run `node scripts/build-site-bot-step2c-copy.mjs`.
// scripts/build-site-bot-step2c-copy.test.mjs checks it byte for byte against the source.
// The Site Bot price is the {net} token, filled from src/lib/payments/plans.ts (step2cCopy.ts payCtaSub).

export const SITE_BOT_STEP2C_COPY = {
  "GENERATING_HEAD": "אנחנו כותבים לך את דף הבית",
  "GENERATING_BODY": "את מה שסיפרת לנו אנחנו מחברים למילים שאנשים באזור שלך מקלידים בגוגל. זה לוקח כמה דקות.\nאפשר לסגור את המסך. נשלח לך מייל ברגע שהדף מוכן.",
  "GENERATING_EMAIL_SUBJECT": "דף הבית של {businessName} מוכן",
  "GENERATING_EMAIL_BODY": "היי,\nדף הבית של {businessName} מוכן. בנינו אותו מהתשובות שלך ומהפרופיל שלך בגוגל.\nכרגע רק אתה רואה אותו. תעבור עליו בשקט. משהו לא מדויק? יש לך סבב תיקון אחד.\nהמקום שלך בהשקה שמור לך.\n{previewUrl}",
  "GENERATING_EMAIL_CTA": "לראות את דף הבית שלי",
  "PREVIEW_HEAD": "זה דף הבית שלך. במילים שלך.",
  "PREVIEW_BODY": "כל שורה פה באה ממה שסיפרת לנו וממה שמופיע עליך בגוגל. ככה יראה אותך לקוח שנכנס מהטלפון בערב ומחליט למי להתקשר.\nכרגע רק אתה רואה את הדף.",
  "PREVIEW_FRAME_LABEL": "תצוגה מקדימה של דף הבית שלך",
  "PREVIEW_FIX_LINK": "משהו לא מדויק? תתקן את הפרטים ואנחנו נכתוב את הדף מחדש. יש לך סבב אחד כזה.",
  "PREVIEW_FIX_USED": "רוצה לשנות עוד משהו? אחרי התשלום תכתוב לנו מה לשנות, ואנחנו מעדכנים. את סבב התיקון כבר ניצלת.",
  "PREVIEW_NEXT_HEAD": "אחרי התשלום אתה חוזר לעבודה. אנחנו ממשיכים מכאן.",
  "PREVIEW_NEXT_LIST": "אנחנו בונים את שאר האתר: דף לכל שירות מרכזי שלך, ודפי אזור לאזורים שסיפרת שאתה עובד בהם.\nמישהו מהצוות שלנו קורא כל דף לפני שהוא עולה.\nהאתר עולה לאוויר תוך 2 ימי עסקים מהתשלום.\nאנחנו מתחברים לפרופיל שלך בגוגל כמנהלים, בהתחברות עם גוגל, ושומרים שהאתר והפרופיל מתואמים, עם דוח אליך כל חודש.",
  "PAY_CTA": "להעלות את האתר שלי לאוויר",
  "PAY_CTA_SUB": "₪{net} + מע״מ לחודש. הדומיין והפרופיל בגוגל נשארים שלך, וביטול אונליין מתי שתרצה בהודעה של 30 יום.",
  "PREVIEW_FAILED": "הכתיבה של דף הבית נתקעה אצלנו. הצוות כבר יודע ומטפל בזה.\nברגע שהדף מוכן נשלח לך מייל. המקום שלך בהשקה נשאר שמור לך.",
  "FACTS_EMPTY_FINAL": "מהתשובות עוד לא יצא פרט שאפשר לשים באתר, אז נבנה את דף הבית מהפרופיל שלך בגוגל ומהמחקר שלנו, קצר וכללי יותר. אחרי התשלום תשלח לנו מתי שתרצה דוגמאות מעבודות שעשית, ונוסיף אותן לאתר."
} as const;

export type SiteBotStep2cCopyKey = keyof typeof SITE_BOT_STEP2C_COPY;
