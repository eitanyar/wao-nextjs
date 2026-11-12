# Ads Bot autonomy consent: explicit bidding-strategy clause (2026-11-12)

Eitan decided: the autonomous agent may change the campaign's bidding strategy, from collecting clicks (phase 1) to bidding toward a target cost per verified lead (phase 2), and back again automatically if the new mode underperforms. This must be stated explicitly in the consent copy and the terms, not hidden under "settings".

The rules the clause must reflect:
- Phase 1 runs on clicks with a cap on the price per click.
- The switch to phase 2 happens only when there's enough data. Mainly, enough leads he marked as real. The starting target is based on his actual cost per lead and never exceeds the ceiling set for his business.
- The budget doesn't change at the switch.
- Some days may spend up to twice the daily budget, while the month stays within budget (Google's rule).
- If the new mode underperforms, the agent switches back automatically, and he's notified each time in plain words.
- He can stop autonomy at any time (the existing kill switch / mode).

Return patches (old → new, with why) to the existing consent bundle strings below. Change the scope summary so it names bidding strategy explicitly, and add or adjust whatever other bundle strings need it, e.g. the terms clause or the audit line. Keep the existing legal register and length discipline. No jargon to the owner ("tCPA", "Smart Bidding", "learning period" are banned).

## Current consent bundle
{
 "AUTONOMY_CONSENT_LABEL": "אני מאשר לסוכן האוטונומי של WAO לנהל את חשבון ה-Ads שלי באופן שוטף",
 "AUTONOMY_SCOPE_SUMMARY": "חשבון ה-Ads רשום על שמך, והתשלום לגוגל עובר ישירות ממך — WAO רק מנהלת. אחרי אישור חד-פעמי, הסוכן האוטונומי של WAO מבצע אופטימיזציה שוטפת בחשבון. הוא מטפל במילות המפתח, במונחי החיפוש, בתקציב הקמפיין ובהגדרות — בלי אישור על כל פעולה.",
 "AUTONOMY_LIMITS_SUMMARY": "הניהול האוטונומי פועל רק בתוך מסגרת תקציב יומית שהגדרת מראש בעצמך. כל שינוי תקציב מוגבל באחוזים, וכמות הפעולות בכל הרצה מוגבלת מראש. כל המגבלות גלויות לך בכל רגע, ואתה יכול לעדכן אותן מתי שתרצה.",
 "AUTONOMY_STOP_SUMMARY": "אפשר להפעיל מתג עצירה בכל רגע, והסוכן מפסיק מיד לבצע פעולות בחשבון. העצירה לא משנה את הבעלות שלך על החשבון ולא פוגעת בקמפיינים שכבר רצים.",
 "AUTONOMY_AUDIT_SUMMARY": "כל פעולה של הסוכן נרשמת ביומן פעילות מלא שפתוח לצפייה שלך בכל רגע.",
 "AUTONOMY_SHADOW_NOTICE": "במצב צל, הסוכן רק מציע פעולות ולא מבצע שום שינוי בפועל בחשבון. תראה כל הצעה עם ההסבר שלה לפני שהיא יכולה לצאת לפועל."
}