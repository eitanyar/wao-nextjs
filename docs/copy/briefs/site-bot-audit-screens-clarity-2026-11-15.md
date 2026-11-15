# Site Bot free audit: result screens in plain spoken Hebrew (2026-11-15)

**Why:** Fable 5.2's clarity review (docs/copy/reviews/fable52-hebrew-clarity-2026-11-15.md, items 8, 9, 14–23 — read them) found the audit-journey file written in a clerk's voice, two status vocabularies on one page, internal QA rules leaking to the customer, and lines that sound as if WAO fixes things for free.

**Reader:** one-man trade business owner (plumber, electrician, AC tech) who just ran the FREE check on his Google business profile. Singular male. On a phone. Plain Sabra Hebrew; the scorecard voice ("בסדר / שווה תיקון / לא ראינו") is the model.

**Decisions to follow:**
- One status set everywhere: "בסדר" / "שווה תיקון" / "לא ראינו". The journey's "מאושר / לא עבר / לא ידוע" go.
- Free check vs paid service: anything WAO would do for him is part of the paid service (199 ₪ + מע״מ לחודש); otherwise point to what he can do himself for free. Never imply a free fix.
- No internal rules to the customer ("we don't guess", "approved separately"). Keep only "we don't change anything in your profile" where needed.
- "פנייה" means a customer lead only; for us contacting him say "לא נפנה אליך…" style wording. Say "מגוגל" not "Google Places". Keep the 30-day deletion fact and the deletion-request route.
- Photo advice is for a tradesman: finished jobs, the van, him at work — not storefront/interior.
- Explain "קטגוריות" once in plain words; drop the "dilution myth" line.
- Score line must not praise a weak score.
- Keep every placeholder exactly ({business_name}, {address}, __PASSED__, __TOTAL__, anything in braces or double underscores) and every line break role (\n) where the layout needs it.

**Current values (JSON, copied byte-exact from src/lib/site-bot/auditJourneyCopy.ts and src/lib/site-bot/scorecardCopy.ts):**
```json
{
 "auditJourney": {
  "SB_PICK_PROMPT": "נמצאו כמה עסקים עם שם דומה.\nהשווה את השם ואת הכתובת של כל אפשרות.\nבחר את העסק שלך — רק אז נציג את תוצאת הבדיקה.",
  "SB_PICK_OPTION_BUTTON": "זה העסק שלי — {business_name}, {address}",
  "SB_CONFIRM_SOLEMATCH": "נמצא עסק אחד בשם הזה — וצריך לוודא שזה שלך.\nשם: {business_name}. כתובת: {address}.\nאם זה העסק שלך — ממשיכים לבדיקה.",
  "SB_CONFIRM_YES": "כן, זה העסק שלי",
  "SB_CONFIRM_NO": "לא, זה לא העסק שלי",
  "SB_SELECTED_ACK": "מעולה — ממשיכים עם {business_name}.\nהנה פרטי הפרופיל הזמינים לבדיקה, עם סימון ברור לכל סעיף.",
  "SB_NOMATCH_TITLE": "לא נמצא פרופיל עסקי בשם הזה",
  "SB_NOMATCH_BODY": "זה לא אומר שהעסק שלך לא קיים או לא מופיע בגוגל.\nיכול להיות שהשם רשום קצת אחרת, או שהמידע לא זמין לבדיקה.\nשווה לנסות שוב — עם כתיב אחר או שם מלא יותר.\nאנחנו לא מנחשים פרטים ולא ממציאים ממצאים.",
  "SB_CHECKLIST_INTRO": "הנה תמונת מצב של פרטי הפרופיל העסקי שלך בגוגל — לפי המידע שזמין לבדיקה.\nשישה סעיפים: קטגוריות, שעות פתיחה, תמונות, טלפון ואתר, ביקורות ותיאור.\nלכל סעיף יש סימון אחד משלושה: מאושר, לא עבר או לא ידוע.",
  "SB_STATUS_CONFIRMED": "מאושר ✓ — המידע הזה זמין בפרופיל, לפי הבדיקה",
  "SB_STATUS_MISSING": "לא עבר — הסעיף לא עמד בבדיקה, אבל המידע עדיין יכול להיות קיים",
  "SB_STATUS_UNKNOWN": "לא ידוע — לבדיקה הזו אין מספיק מידע על הסעיף",
  "SB_MISSING_ACTION": "סעיף סומן כ״לא עבר״? קודם בודקים מה באמת רשום אצלך בפרופיל.\nאם משהו באמת חסר בקטגוריות, בשעות או בתמונות — מחכות לך הוראות לתיקון עצמי.\nאם המידע דווקא קיים — אפשר לספר לנו דרך טופס יצירת הקשר.",
  "SB_UNKNOWN_VERIFY": "״לא ידוע״ לא אומר שמשהו מקולקל — לבדיקה פשוט אין מספיק מידע.\nרוצה לוודא? היכנס לפרופיל העסקי שלך בגוגל ובדוק בעצמך.\nכדי לסגור ״לא ידוע״ צריך ביסוס מתאים: האישור שלך, מקור שתספק או בדיקה שאושרה בנפרד.",
  "SB_CHECKLIST_CANDOR": "הבדיקה לא כותבת כלום בפרופיל שלך, וגם לא מבטיחה דירוג או חשיפה.\nהיא מראה בכנות מה זמין לבדיקה — ומה לא.",
  "SB_SELFFIX_ACCESS_NOTE": "התיקון מתבצע בידיים שלך, דרך החשבון שלך בגוגל.\nבתהליך הזה אנחנו לא נבקש ממך סיסמה או קוד אימות.\nאין לך גישה לניהול הפרופיל? התיקון פשוט ימתין — וזה בסדר.",
  "SB_FIX_CATEGORIES": "1. נכנסים לפרופיל העסקי בגוגל — דרך החיפוש או המפות.\n2. בוחרים ״עריכת פרופיל״ ואז ״קטגוריות עסקיות״.\n3. מגדירים קטגוריה ראשית שמדויקת לעסק שלך.\n4. מוסיפים קטגוריות משנה רק אם באמת צריך.\n5. שומרים את השינוי, וחוזרים לפרופיל כדי לראות שהוא מופיע.",
  "SB_FIX_HOURS": "1. נכנסים לפרופיל העסקי בגוגל.\n2. בוחרים ״עריכת פרופיל״ ואז ״שעות פתיחה״.\n3. מסמנים את ימי הפעילות ואת שעות הפתיחה המדויקות.\n4. יש חגים או שעות מיוחדות? כדאי לעדכן גם אותן.\n5. שומרים — וחוזרים לבדוק שהשינוי מופיע בפרופיל.",
  "SB_FIX_PHOTOS": "1. נכנסים לפרופיל העסקי בגוגל.\n2. בוחרים ״תמונות״ ואז ״העלאה״.\n3. מעלים תמונות אמיתיות ועדכניות — חזית העסק, פנים, מוצרים או צוות.\n4. עדיפה תמונה ברורה עם תאורה טובה, בלי עריכה כבדה.\n5. שומרים ובודקים שהכול הועלה."
 },
 "scorecard": {
  "AUDIT_DISCLOSURE": "כדי להכין את הבדיקה, אנחנו אוספים רק את שם העסק ששלחת. הבדיקה מתבססת על מידע מ-Google Places. אנחנו משתמשים במידע רק כדי להכין את דוח הבדיקה שביקשת. הוא נשמר 30 ימים ונמחק אוטומטית לאחר מכן. אפשר לבקש מחיקה גם קודם, דרך טופס יצירת הקשר. אנחנו לא משתמשים במידע לשום פנייה שלא קשורה לבדיקה.",
  "DIM_CATEGORIES_FAIL": "יש לך רק קטגוריה אחת בפרופיל. זה מצמצם את מי שמוצא אותך. השלבים לתיקון מחכים לך למטה.",
  "DIM_CATEGORIES_PASS": "יש לך כמה קטגוריות בפרופיל. בדיוק מה שגוגל אוהב.",
  "DIM_CATEGORIES_TITLE": "קטגוריות",
  "DIM_CATEGORIES_UNKNOWN": "לא הצלחנו לראות את הקטגוריות מבחוץ. זו לא תקלה — זה פשוט לא גלוי מכאן.",
  "DIM_DESCRIPTION_UNKNOWN": "לא הצלחנו לראות את התיאור מבחוץ. זו לא תקלה — זה פשוט לא גלוי מכאן.",
  "DIM_HOURS_UNKNOWN": "לא הצלחנו לראות את שעות הפתיחה מבחוץ. זו לא תקלה — זה פשוט לא גלוי מכאן.",
  "DIM_PHONE_WEBSITE_UNKNOWN": "לא הצלחנו לראות טלפון ואתר מבחוץ. זו לא תקלה — זה פשוט לא גלוי מכאן.",
  "DIM_PHOTOS_UNKNOWN": "לא הצלחנו לראות תמונות מבחוץ. זו לא תקלה — זה פשוט לא גלוי מכאן.",
  "DIM_REVIEWS_UNKNOWN": "לא הצלחנו לראות את הביקורות מבחוץ. זו לא תקלה — זה פשוט לא גלוי מכאן.",
  "DIY_CATEGORIES_STEPS": "1. היכנס לפרופיל העסקי שלך בגוגל.\n2. לחץ על ״עריכת פרופיל״ ואז על ״קטגוריות עסקיות״.\n3. בחר קטגוריה ראשית — זו שמתארת אותך הכי טוב.\n4. הוסף קטגוריות משנה לכל שירות נוסף שאתה נותן.\n5. אפשר עד עשר קטגוריות. כמה קטגוריות לא ״מדללות״ אותך — זו אגדה.",
  "DIY_PHOTOS_STEPS": "1. צלם כמה תמונות של העבודה שלך עם הטלפון.\n2. תמונות אמיתיות עובדות טוב יותר מתמונות מאגר — לקוחות רוצים לראות את הדבר האמיתי.\n3. היכנס לפרופיל העסקי שלך בגוגל.\n4. לחץ על ״הוספת תמונות״ והעלה מהטלפון.\n5. כמה תמונות מספיקות להתחלה. הוסף עוד עם הזמן.",
  "NOTFOUND_BODY": "לא מצאנו פרופיל עם השם או הטלפון שהכנסת. אולי משהו נכתב קצת אחרת, ואולי פשוט אין לך עדיין פרופיל. ככה או ככה, זו תשובה חשובה. אם אין פרופיל — אין מה לתקן — יש מה לבנות. וזו בדיוק נקודת ההתחלה הנכונה.",
  "NOTFOUND_TITLE": "לא מצאנו את העסק שלך",
  "SCORELINE": "הפרופיל שלך עבר __PASSED__ מתוך __TOTAL__ בדיקות — נקודת פתיחה טובה, וכל השאר אפשר לתקן.",
  "SEC_FOUND": "מה עובד לך",
  "SEC_MISSING": "מה חסר לך",
  "SEC_UNKNOWN": "מה לא הצלחנו לראות",
  "STATUS_FAIL": "שווה תיקון",
  "STATUS_PASS": "בסדר",
  "STATUS_UNKNOWN": "לא ראינו"
 }
}
```

**Return JSON only:** {"auditJourney":{"<KEY>":"<new value>", ...only keys you change},"scorecard":{"<KEY>":"<new value>", ...},"why":"..."}
