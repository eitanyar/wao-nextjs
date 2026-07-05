/**
 * Batch generator — LP few-shot examples + keyword clusters per vertical
 *
 * Generates 2 LP examples (different client archetypes) + 1 keyword cluster
 * for each of 60 Israeli B2C service verticals using gpt-5.4-pro.
 *
 * Output: data/batch/{slug}/lp-examples.json
 *         data/batch/{slug}/keywords.json
 *
 * Checkpoint: skips any slug where both files already exist.
 * Concurrency: 2 at a time (respects Azure TPM limits).
 *
 * Usage: node scripts/batch-generate-verticals.mjs --yes
 * Dry run: node scripts/batch-generate-verticals.mjs --dry
 * Single test: node scripts/batch-generate-verticals.mjs --slug=electrician --yes
 *
 * --yes is REQUIRED for live API calls. Without it the script prints a cost
 * estimate and exits. This prevents accidental Azure charges.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

// ── Config ────────────────────────────────────────────────────────────────────
const DRY_RUN     = process.argv.includes('--dry');
const CONFIRMED   = process.argv.includes('--yes');
const SINGLE_SLUG = process.argv.find(a => a.startsWith('--slug='))?.split('=')[1];
const CONCURRENCY = 2;
const OUT_DIR     = resolve(process.cwd(), 'data', 'batch');

// ── Load .env.local ───────────────────────────────────────────────────────────
const env = {};
try {
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch { console.error('Could not read .env.local'); process.exit(1); }

// ── Vertical list — 60 Israeli B2C service professions, priority-ordered ─────
// tier A = urgent high-volume, tier B = planned high-value, tier C = niche
const VERTICALS = [
  // ── TIER A: Emergency / high-urgency ──────────────────────────────────────
  {
    slug: 'electrician', hebrewName: 'חשמלאי', cluster: 'home-emergency', tier: 'A', urgency: 'urgent',
    personaA: { ownerName: 'חזי לוי', businessName: 'חזי חשמל', location: 'תל אביב', yearsInField: '12 שנה', license: 'רישיון חשמלאי 1015694', usp: 'מגיע תוך שעה, עובד לפי התקן', guarantee: 'אחריות שנה על כל עבודה', fear: 'תקלת חשמל שמשתקת את הבית', review: 'הגיע תוך 45 דקות, מקצועי ואמין.', services: 'תיקון תקלות, לוחות חשמל, תאורה, חיווט, עמדות טעינה' },
    personaB: { ownerName: 'מיכאל אברהם', businessName: 'מיכאל חשמל בע"מ', location: 'ירושלים', yearsInField: '20 שנה', license: 'חשמלאי ראשי מורשה', usp: 'מתמחה בפרויקטים מורכבים ושיפוצים', guarantee: 'ביצוע לפי תקן ישראלי בלבד', fear: 'חיווט ישן שמהווה סכנת שריפה', review: 'עבודה יסודית ומדויקת, הסביר כל שלב.', services: 'שיפוץ חשמל מלא, לוח חשמל, מערכות ביטחון' },
  },
  {
    slug: 'plumber', hebrewName: 'אינסטלטור', cluster: 'home-emergency', tier: 'A', urgency: 'urgent',
    personaA: { ownerName: 'יוסי כהן', businessName: 'יוסי אינסטלציה', location: 'חיפה', yearsInField: '15 שנה', license: 'אינסטלטור מוסמך', usp: 'זמין 24/7, מגיע תוך חצי שעה', guarantee: 'אחריות 6 חודשים', fear: 'נזילה שמציפה את הדירה', review: 'הגיע מהר, תיקן הכל ולא השאיר בלגן.', services: 'תיקון נזילות, ברזים, סתימות, דוודים, צנרת' },
    personaB: { ownerName: 'אלי נחמני', businessName: 'א.נ. אינסטלציה', location: 'נתניה', yearsInField: '18 שנה', license: 'אינסטלטור מורשה', usp: 'מתמחה בשיפוצי אמבטיה ומטבח', guarantee: 'אחריות שנה על חומרים ועבודה', fear: 'שיפוץ אמבטיה שייצא גרוע', review: 'שיפוץ מושלם, דייקן ומקצועי.', services: 'חידוש אמבטיות, מטבחים, התקנת מקלחות' },
  },
  {
    slug: 'locksmith', hebrewName: 'מנעולן', cluster: 'home-emergency', tier: 'A', urgency: 'urgent',
    personaA: { ownerName: 'דני אלוש', businessName: 'מנעולן דני', location: 'תל אביב', yearsInField: '14 שנה', license: 'רישיון מנעולן 4821', usp: 'מגיע תוך 20 דקות, לא פגע ולא שילמת', guarantee: 'לא פתחתי — לא שילמת', fear: 'ננעלתי בחוץ בלילה עם ילדים', review: 'הגיע תוך 18 דקות בחצות. מקצועי ומחיר הוגן.', services: 'פתיחת דלתות, החלפת מנעולים, כספות, מנעולי רכב' },
    personaB: { ownerName: 'רמי שמש', businessName: 'שמש מנעולים', location: 'ראשון לציון', yearsInField: '22 שנה', license: 'מנעולן מורשה', usp: 'מתמחה בדלתות פלדה ואבטחה מתקדמת', guarantee: 'אחריות שנה על כל התקנה', fear: 'הדירה לא מאובטחת אחרי פריצה', review: 'התקין דלת פלדה מעולה, שירות מצוין.', services: 'דלתות פלדה, מנעולי אבטחה, כספות, מצלמות' },
  },
  {
    slug: 'ac-repair', hebrewName: 'מזגן — תיקון ותחזוקה', cluster: 'home-emergency', tier: 'A', urgency: 'urgent',
    personaA: { ownerName: 'אייל בן דוד', businessName: 'אייל מזגנים', location: 'תל אביב והמרכז', yearsInField: '16 שנה', license: 'טכנאי מזגנים מוסמך', usp: 'מגיע ביום הקריאה, מתקן בביקור אחד', guarantee: 'אחריות 6 חודשים על תיקון', fear: 'מזגן מקולקל בשיא הקיץ', review: 'הגיע ביום אחד ותיקן תוך שעה. מקצועי ובמחיר הוגן.', services: 'תיקון מזגנים, טעינת גז, ניקוי, התקנה' },
    personaB: { ownerName: 'שלומי מרקוס', businessName: 'קליר-טק מזגנים', location: 'ירושלים', yearsInField: '10 שנה', license: 'מורשה כל היצרניות הגדולות', usp: 'התקנות חדשות עם אחריות 3 שנים', guarantee: 'אחריות מלאה 3 שנים', fear: 'התקנה לקויה שתגרום לנזל', review: 'התקנה מסודרת ונקייה, הכל עובד מושלם.', services: 'התקנת מזגנים, מולטי, מרכזי, VRV' },
  },
  {
    slug: 'movers', hebrewName: 'הובלות ומעבר דירה', cluster: 'home-emergency', tier: 'A', urgency: 'planned',
    personaA: { ownerName: 'ששון כרמי', businessName: 'ששון הובלות', location: 'גוש דן', yearsInField: '18 שנה', license: 'רישיון הובלה', usp: 'מחיר סופי ללא הפתעות, כולל אריזה', guarantee: 'ביטוח מלא על כל הרהיטים', fear: 'רהיטים שייפגעו במעבר', review: 'הגיעו בזמן, ארזו בזהירות, לא שריטה אחת.', services: 'הובלות דירה, משרד, פירוק והרכבה, אחסון' },
    personaB: { ownerName: 'מוטי ג"פ', businessName: 'גפן הובלות', location: 'חיפה והצפון', yearsInField: '12 שנה', license: 'רישיון הובלה מלא', usp: 'מתמחה בדירות קטנות ומהיר', guarantee: 'מחיר קבוע שלא ישתנה', fear: 'הובלה שתימשך כל היום ותעלה כפול', review: 'מהיר, יעיל ובמחיר שסוכם. ממליץ בחום.', services: 'הובלות מהירות, סטודיו ו-1-2 חדרים, פינוי פסולת' },
  },
  {
    slug: 'pest-control', hebrewName: 'הדברה', cluster: 'home-emergency', tier: 'A', urgency: 'urgent',
    personaA: { ownerName: 'ניר שפירא', businessName: 'ניר הדברה', location: 'תל אביב, גבעתיים', yearsInField: '20 שנה', license: 'מדביר מורשה משרד הבריאות', usp: 'חומרים מאושרים לבית עם ילדים ובעלי חיים', guarantee: 'הדברה מובטחת — חוזר בחינם אם חזרו', fear: 'מזיקים שחוזרים אחרי הדברה', review: 'הכחיד את הבלטות לגמרי. מקצועי ונעים.', services: 'ג׳וקים, עכברים, נמלים, מאכלת, יונים, סקינקים' },
    personaB: { ownerName: 'אייל חיות', businessName: 'גרין הדברה', location: 'הרצליה, רעננה, כפר סבא', yearsInField: '8 שנה', license: 'מדביר מורשה', usp: 'הדברה ירוקה — חומרים טבעיים', guarantee: 'ביקור מעקב חינם אחרי חודש', fear: 'הדברה עם רעלים ליד ילדים', review: 'גישה טבעית, בטוח לילדים, עובד מצוין.', services: 'הדברה ירוקה, טיפול ביונים, מניעת כניסת מזיקים' },
  },

  // ── TIER A: Education ─────────────────────────────────────────────────────
  {
    slug: 'tutor-math', hebrewName: 'מורה פרטי — מתמטיקה', cluster: 'education', tier: 'A', urgency: 'planned',
    personaA: { ownerName: 'אורית שמואל', businessName: 'אורית מורה פרטית', location: 'פתח תקווה', yearsInField: '12 שנה', license: 'תואר ראשון מתמטיקה', usp: 'מתמחה בבגרות 5 יחידות, 90%+ מתלמידיי עוברים', guarantee: 'אם לא עלית ציון — השיעורים הבאים חינם', fear: 'הילד נכשל בבגרות מתמטיקה', review: 'בנו קיבל 91 בבגרות. אורית מופלאה.', services: 'מתמטיקה 3-5 יחידות, בגרות, פסיכומטרי, בית ספר יסודי' },
    personaB: { ownerName: 'רועי לוינזון', businessName: 'רועי — מורה לחשבון', location: 'נס ציונה', yearsInField: '7 שנה', license: 'הנדסאי ומורה מוסמך', usp: 'שיטה ייחודית שמסבירה דרך חיי היומיום', guarantee: 'שיעור ניסיון חינם', fear: 'הילד שונא מתמטיקה ואין לו בסיס', review: 'בת שלי עברה מ-55 ל-82 תוך 3 חודשים.', services: 'חשבון, אלגברה, גיאומטריה, טריגונומטריה' },
  },
  {
    slug: 'tutor-english', hebrewName: 'מורה פרטי — אנגלית', cluster: 'education', tier: 'A', urgency: 'planned',
    personaA: { ownerName: 'ג׳ניפר שיינר', businessName: "Jen's English", location: 'רמת גן, בני ברק', yearsInField: '11 שנה', license: 'דוברת שפת אם', usp: 'דוברת שפת אם אמריקאית, שיטת שיחה טבעית', guarantee: 'שיפור מורגש תוך 8 שיעורים או הכסף חזר', fear: 'אנגלית גרועה שמעכבת קריירה', review: 'הצלחתי בראיון עבודה בחברה בינלאומית. תודה!', services: 'שיחה, כתיבה, עסקים, בגרות, IELTS, TOEFL' },
    personaB: { ownerName: 'יעל מזרחי', businessName: 'יעל — אנגלית לילדים', location: 'הוד השרון', yearsInField: '9 שנה', license: 'מורה מוסמכת', usp: 'שיטת משחק לילדים 6-12, ריחוק מהדקדוק', guarantee: 'שיעור ניסיון חינם', fear: 'ילד שמפגר מאחור בכיתה', review: 'הבן שלי כבר קורא ספרים באנגלית. מדהים.', services: 'אנגלית לילדים, בגרות, כיתות א-ו' },
  },
  {
    slug: 'driving-instructor', hebrewName: 'מורה לנהיגה', cluster: 'education', tier: 'A', urgency: 'planned',
    personaA: { ownerName: 'יאיר אביב', businessName: 'יאיר מורה לנהיגה', location: 'תל אביב, גבעתיים', yearsInField: '14 שנה', license: 'רישיון הוראה מוסמך', usp: '90% עוברים במבחן הראשון', guarantee: 'שיעור ניסיון מוזל ב-50 ש"ח', fear: 'להיכשל בטסט שוב ושוב', review: 'עברתי בפעם הראשונה. סבלני ומקצועי.', services: 'שיעורי נהיגה, קורס מזורז, לפני טסט' },
    personaB: { ownerName: 'חני כץ', businessName: 'חני נהיגה', location: 'ירושלים', yearsInField: '17 שנה', license: 'מדריכת נהיגה מוסמכת', usp: 'מתמחה בחרדת נהיגה ובמבוגרים', guarantee: 'נהיגה בקצב שלך, אין לחץ', fear: 'פחד קיצוני מנהיגה', review: 'אחרי 3 כישלונות, עם חני עברתי!', services: 'נהיגה לחרדים, מבוגרים, רענון, לפני טסט' },
  },

  // ── TIER A: Financial & Legal ──────────────────────────────────────────────
  {
    slug: 'mortgage-advisor', hebrewName: 'יועץ משכנתאות', cluster: 'financial', tier: 'A', urgency: 'considered',
    personaA: { ownerName: 'עמית ורד', businessName: 'ורד יועצי משכנתאות', location: 'גוש דן', yearsInField: '11 שנה', license: 'רישיון יעוץ פיננסי', usp: 'ממצע ריבית נמוכה מהבנק, חוסך 150,000 ש"ח בממוצע', guarantee: 'ללא עמלה עד שמשכנתא מאושרת', fear: 'לקחת משכנתא בריבית גבוהה מדי', review: 'חסך לנו 180,000 ש"ח לאורך המשכנתא. שווה כל שקל.', services: 'יעוץ משכנתאות, מחזור, דירה ראשונה, פרויקט' },
    personaB: { ownerName: 'מיכל אפרתי', businessName: 'אפרתי — יעוץ פיננסי', location: 'ירושלים והסביבה', yearsInField: '8 שנה', license: 'מתכננת פיננסית מוסמכת', usp: 'מתמחה בזוגות צעירים ודירה ראשונה', guarantee: 'ייעוץ ראשוני חינם', fear: 'לא לדעת מה כדאי ולטעות בבחירה', review: 'הסבירה הכל בסבלנות ועזרה לנו לבחור נכון.', services: 'משכנתא לדירה ראשונה, מחיר למשתכן, פריסת הלוואה' },
  },
  {
    slug: 'accountant', hebrewName: 'רואה חשבון לעצמאים', cluster: 'financial', tier: 'A', urgency: 'considered',
    personaA: { ownerName: 'ברק לוי', businessName: 'לוי ושות׳ — רו"ח', location: 'תל אביב', yearsInField: '16 שנה', license: 'רואה חשבון מוסמך', usp: 'מתמחה בעצמאים וחברות בע"מ קטנות', guarantee: 'הגשת דוחות בזמן או הגשת תביעה שלנו', fear: 'שגיאות בדוחות שיגרמו לקנסות', review: 'מסודר, מהיר ויסביר כל שקל. מאוד מרוצה.', services: 'הנהלת חשבונות, דוחות שנתיים, ייעוץ מס, שכר' },
    personaB: { ownerName: 'נורית גולן', businessName: 'גולן חשבונאות', location: 'נתניה', yearsInField: '12 שנה', license: 'רו"ח מוסמכת', usp: 'ממשק דיגיטלי — הכל אונליין ללא ניירת', guarantee: 'זמינות מלאה בוואטסאפ', fear: 'רואה חשבון לא זמין שגורם לעיכובים', review: 'עונה תמיד, הכל ממוחשב. נוחות מקסימלית.', services: 'חשבונאות דיגיטלית, עצמאים, e-commerce, עמותות' },
  },
  {
    slug: 'insurance-agent', hebrewName: 'סוכן ביטוח', cluster: 'financial', tier: 'A', urgency: 'considered',
    personaA: { ownerName: 'אריאל שמש', businessName: 'שמש ביטוח', location: 'ראשון לציון', yearsInField: '13 שנה', license: 'סוכן ביטוח מורשה', usp: 'בודק מחירים מ-7 חברות, מוצא את הזול ביותר', guarantee: 'אם תמצא זול יותר — אחזיר את ההפרש', fear: 'לשלם יותר מדי על ביטוח שלא מכסה מספיק', review: 'הוריד לי 40% על ביטוח הרכב עם אותו כיסוי.', services: 'ביטוח רכב, דירה, חיים, עסק, בריאות' },
    personaB: { ownerName: 'יפית כהן', businessName: 'כהן ביטוחים', location: 'הרצליה', yearsInField: '9 שנה', license: 'סוכנת ביטוח מוסמכת', usp: 'מתמחה בביטוח עסקים קטנים ועצמאים', guarantee: 'ייעוץ ראשוני ללא עמלה', fear: 'עסק שלא מבוטח נכון', review: 'כיסתה את כל הסיכונים של העסק. שמחתי שיש לי אותה.', services: 'ביטוח אחריות מקצועית, עסק, עובדים, צד ג׳' },
  },

  // ── TIER A: Beauty & Wellness ─────────────────────────────────────────────
  {
    slug: 'physiotherapist', hebrewName: 'פיזיותרפיסט', cluster: 'health', tier: 'A', urgency: 'urgent',
    personaA: { ownerName: 'ד"ר נועה ברגמן', businessName: 'ברגמן פיזיותרפיה', location: 'תל אביב', yearsInField: '14 שנה', license: 'מורשית ממשרד הבריאות', usp: 'טיפולים ידניים, שיפור מ-90% מהמטופלים', guarantee: 'הערכה ראשונה כוללת תכנית טיפול', fear: 'כאב גב שלא עובר', review: 'אחרי 6 טיפולים הכאב נעלם לגמרי. נפלאה.', services: 'כאבי גב, צוואר, ברך, כתף, שיקום אחרי ניתוח' },
    personaB: { ownerName: 'אמיר נחום', businessName: 'ספורט פיזיו', location: 'רמת גן', yearsInField: '10 שנה', license: 'פיזיותרפיסט ספורטיבי מוסמך', usp: 'מתמחה בספורטאים וחזרה לפעילות', guarantee: 'חזרה לפעילות ספורטיבית מלאה', fear: 'פציעה שתמנע ממני לחזור לספורט', review: 'חזרתי לאימונים 3 שבועות אחרי הניתוח.', services: 'שיקום ספורטאים, ברך, קרסול, כתף' },
  },
  {
    slug: 'personal-trainer', hebrewName: 'מאמן כושר אישי', cluster: 'health', tier: 'A', urgency: 'planned',
    personaA: { ownerName: 'שירה מיכאלי', businessName: 'שירה פיטנס', location: 'תל אביב', yearsInField: '8 שנה', license: 'מאמנת כושר מוסמכת ותזונאית', usp: 'תכנית אישית + מעקב תזונה, תוצאות תוך 8 שבועות', guarantee: 'אם לא ראית שינוי תוך 8 שבועות — החודש הבא חינם', fear: 'להתאמן חודשים ולא לראות תוצאות', review: 'ירדתי 12 ק"ג תוך 4 חודשים. שינתה לי את החיים.', services: 'אימונים אישיים, קבוצות קטנות, אונליין, הריון' },
    personaB: { ownerName: 'גיל שדה', businessName: 'גיל — כושר לגיל 50+', location: 'הרצליה, רעננה', yearsInField: '15 שנה', license: 'מאמן כושר וסרטן-שיקום', usp: 'מתמחה בגיל 50+ ובאנשים עם הגבלות רפואיות', guarantee: 'אימון מותאם לבעיות גב, ברך ולחץ דם', fear: 'להתאמן ולהחמיר כאב', review: 'בגיל 62 אני מרגיש כמו בן 45. ממליץ בחום.', services: 'כושר גיל 50+, שמירה על משקל, חיזוק שרירים, שיקום' },
  },
  {
    slug: 'nutritionist', hebrewName: 'דיאטנית קלינית', cluster: 'health', tier: 'A', urgency: 'planned',
    personaA: { ownerName: 'ד"ר מיכל אמסלם', businessName: 'אמסלם תזונה', location: 'תל אביב', yearsInField: '12 שנה', license: 'דיאטנית קלינית מוסמכת', usp: 'גישה לא דיאטטית — שינוי אורח חיים לצמיתות', guarantee: 'ירידה של 3-5 ק"ג בחודש הראשון', fear: 'לעשות דיאטה ולחזור לאחר שנה', review: 'ירדתי 18 ק"ג ולא חזרתי אחרי שנתיים.', services: 'ירידה במשקל, סוכרת, כולסטרול, IBS, ספורטאים' },
    personaB: { ownerName: 'רחל גבע', businessName: 'גבע — תזונה לילדים', location: 'פתח תקווה', yearsInField: '9 שנה', license: 'תזונאית ילדים מוסמכת', usp: 'מתמחה בתזונת ילדים ובררנים', guarantee: 'ייעוץ ראשון כולל תפריט לשבוע חינם', fear: 'ילד שלא אוכל כלום ולא עולה במשקל', review: 'הבן שלי מגיל 3 שלא אכל, עכשיו אוכל כמעט הכל.', services: 'תזונה לילדים, בררנים, אלרגיות, עלייה במשקל' },
  },
  {
    slug: 'psychologist', hebrewName: 'פסיכולוג קליני', cluster: 'health', tier: 'A', urgency: 'considered',
    personaA: { ownerName: 'ד"ר יותם גל', businessName: 'גל פסיכולוגיה', location: 'תל אביב', yearsInField: '18 שנה', license: 'פסיכולוג קליני מומחה', usp: 'CBT וטיפול ממוקד — תוצאות תוך 12-16 מפגשים', guarantee: 'סודיות מוחלטת, שיחה ראשונה ב-50%', fear: 'לספר לאיש זר ולא להרגיש שינוי', review: 'אחרי 14 מפגשים חרדת הבמה נעלמה לחלוטין.', services: 'חרדה, דיכאון, OCD, פחדים, קשרים, ADHD' },
    personaB: { ownerName: 'ד"ר ענת ריינר', businessName: 'ריינר — טיפול זוגי', location: 'הרצליה', yearsInField: '14 שנה', license: 'פסיכולוגית קלינית, מטפלת זוגית מוסמכת', usp: 'מתמחה בזוגות, שיפור תוצאות תוך 3 חודשים', guarantee: 'שיחת אבחון ראשונה ב-200 ש"ח', fear: 'זוגיות שהולכת להתפרק', review: 'הצלנו את הנישואים. לא האמנו שאפשר.', services: 'טיפול זוגי, גירושים, בגידות, תקשורת' },
  },

  // ── TIER B: Home Services ──────────────────────────────────────────────────
  {
    slug: 'house-cleaning', hebrewName: 'ניקיון בתים', cluster: 'home-care', tier: 'B', urgency: 'planned',
    personaA: { ownerName: 'לוסיה פרנקו', businessName: 'לוסיה ניקיון', location: 'רמת גן, גבעתיים', yearsInField: '12 שנה', license: '', usp: 'ניקיון עמוק, חומרים ירוקים, אותן מנקות בכל פעם', guarantee: 'לא מרוצה — נחזור בחינם', fear: 'מנקה שלא מנקה טוב ומפחידה עם גנבה', review: 'הדירה נקייה כמו שמעולם לא ראיתי. ממליצה בחום.', services: 'ניקיון שבועי, ניקיון עמוק, לאחר שיפוץ, לפני חג' },
    personaB: { ownerName: 'מאיה חגי', businessName: 'ספארקל ניקיון', location: 'הרצליה', yearsInField: '6 שנה', license: '', usp: 'ניקיון מקצועי לבתים גדולים, צוות של 3', guarantee: 'ניקיון עמוק שיאריך פי 2 בין ניקיונות', fear: 'בית גדול שלא נוקה כמו שצריך', review: 'צוות של 3 סיים ווילה ב-4 שעות. מושלם.', services: 'ווילות, בתים גדולים, ניקיון אחרי שיפוץ, מרפסות' },
  },
  {
    slug: 'painter', hebrewName: 'צבעי בניין', cluster: 'home-renovation', tier: 'B', urgency: 'planned',
    personaA: { ownerName: 'בוריס זלמנוב', businessName: 'בוריס צבעי', location: 'תל אביב', yearsInField: '24 שנה', license: '', usp: 'עבודה נקייה, כיסוי מלא, לא משאיר כתמים', guarantee: 'אחריות שנה על הצביעה', fear: 'צבעי שמשאיר כתמים ולא מכסה', review: 'עבודה מדויקת ונקייה. הדירה נראית חדשה.', services: 'צביעת דירות, חדרי מדרגות, קצוות ולוחות' },
    personaB: { ownerName: 'אנדריי קוסטה', businessName: 'קוסטה צביעה מקצועית', location: 'פתח תקווה', yearsInField: '18 שנה', license: '', usp: 'מתמחה בדיסטרס, טפטים, ו-Microcement', guarantee: 'ייעוץ צבע חינם', fear: 'בית ש-צובע ייצא בנאלי', review: 'עשה לנו קיר מיקרוסמנט מדהים. ממליץ.', services: 'מיקרוסמנט, גבס, דיסטרס, טפטים יוקרתיים' },
  },
  {
    slug: 'carpenter', hebrewName: 'נגר', cluster: 'home-renovation', tier: 'B', urgency: 'planned',
    personaA: { ownerName: 'שמוליק כץ', businessName: 'כץ נגרות', location: 'ראשון לציון', yearsInField: '22 שנה', license: '', usp: 'מעצב ובונה לפי מידה, עץ מלא בלבד', guarantee: 'אחריות 5 שנים על נגרות מלאה', fear: 'ריהוט שייפגם אחרי שנה', review: 'ארון עד התקרה שנראה כמו מגזין. עבודה יוצאת מן הכלל.', services: 'ארונות מטבח, ספרייה, ארון בגדים, דלתות' },
    personaB: { ownerName: 'פיליפ אורלוב', businessName: 'אורלוב Design Carpentry', location: 'הרצליה', yearsInField: '15 שנה', license: '', usp: 'נגרות מעוצבת משלב תכנון, מתמחה בסגנון מודרני', guarantee: 'ייעוץ ותכנון ראשוני ב-300 ש"ח (מנוכה מהפרויקט)', fear: 'ריהוט שלא יתאים לעיצוב', review: 'תכנן ובנה מטבח פנטסטי. מקצוען אמיתי.', services: 'מטבחים, סלונים, חדרי עבודה, יחידות קיר' },
  },
  {
    slug: 'gardener', hebrewName: 'גנן', cluster: 'home-care', tier: 'B', urgency: 'planned',
    personaA: { ownerName: 'מנשה ביטון', businessName: 'ביטון גינון', location: 'כפר סבא, הוד השרון', yearsInField: '19 שנה', license: '', usp: 'שמירת גינה חודשית, תוצאות שנראות כל הזמן', guarantee: 'גינה מסודרת בכל ביקור או ביקור חינם', fear: 'גינה שמתנוונת', review: 'הגינה שלי נראית כמו גן עדן. תמיד בזמן.', services: 'שמירה חודשית, עיצוב גינות, השקיה, עצי נוי' },
    personaB: { ownerName: 'ז׳אן פייר', businessName: 'גינות יוקרה', location: 'הרצליה פיתוח, כפר שמריהו', yearsInField: '14 שנה', license: 'ארגון מוסמך', usp: 'עיצוב גינות יוקרה עם הצמחייה הנדירה ביותר', guarantee: 'פרויקט מלא כולל תכנון, ביצוע ואחריות שנה', fear: 'גינה שייצא גנרית ולא מיוחדת', review: 'עיצב לנו גינה שאנשים עוצרים לצלם.', services: 'עיצוב גינות יוקרה, בריכות, תאורה, עצי בוגנוויל' },
  },
  {
    slug: 'tiler', hebrewName: 'שיש ואריחים', cluster: 'home-renovation', tier: 'B', urgency: 'planned',
    personaA: { ownerName: 'ולדיסלב קמינסקי', businessName: 'קמינסקי ריצוף', location: 'חיפה', yearsInField: '21 שנה', license: '', usp: 'ריצוף מדויק, חיתוך נקי, עיגון חזק', guarantee: 'אחריות 3 שנים על הנחה', fear: 'ריצוף שיתרומם אחרי שנה', review: 'ריצוף מדויק כמו מדידה. לא ראיתי כזה לפני.', services: 'ריצוף דירות, אמבטיות, מרצפות, אבן טבעית' },
    personaB: { ownerName: 'חנוך שלום', businessName: 'שלום שיש ופורצלן', location: 'תל אביב', yearsInField: '16 שנה', license: '', usp: 'מתמחה בשיש טבעי ופורצלן גדול פורמט', guarantee: 'חיתוך ב-CNC, אפס פגמים', fear: 'שיש יקר שייגרד', review: 'ריצוף פורצלן 120×120 מושלם. עבודת אמן.', services: 'שיש, פורצלן גדול, מיקרוסמנט, מדרגות' },
  },

  // ── TIER B: Pet Care ──────────────────────────────────────────────────────
  {
    slug: 'dog-groomer', hebrewName: 'מספרת כלבים', cluster: 'pet-care', tier: 'B', urgency: 'planned',
    personaA: { ownerName: 'דנה שגב', businessName: 'דנה מספרת כלבים', location: 'גבעתיים', yearsInField: '10 שנה', license: '', usp: 'מגיעה אליך הביתה, ללא כלוב ובלי לחץ', guarantee: 'כלב מרוצה או החזר כסף', fear: 'כלב עצבני שיוצא נסטרס', review: 'הכלב שלי אהב אותה מהרגע הראשון. עבודה נפלאה.', services: 'טיפוח ביתי, עיצוב שיער, אמבטיה, חיתוך ציפורניים' },
    personaB: { ownerName: 'אורן כרמל', businessName: 'קרמל גרומינג', location: 'תל אביב, יפו', yearsInField: '7 שנה', license: 'מוסמך AKC', usp: 'מתמחה בגזעים, שואו-גרומינג, תחרויות', guarantee: 'גרומינג על פי הסטנדרט של הגזע', fear: 'גרומינג שיהרס את מראה הגזע', review: 'הפודל שלי חזר מתחרות עם פרס ראשון.', services: 'שואו-גרומינג, גזעי תחרות, קואסה, טיפול מיוחד' },
  },
  {
    slug: 'dog-trainer', hebrewName: 'מאמן כלבים', cluster: 'pet-care', tier: 'B', urgency: 'urgent',
    personaA: { ownerName: 'ליאור בן-שוש', businessName: 'ליאור מאמן כלבים', location: 'השרון', yearsInField: '12 שנה', license: 'KCAI מוסמך', usp: 'מתמחה בבעיות התנהגות, תוצאות תוך 3 מפגשים', guarantee: 'שיפור מורגש תוך 3 מפגשים או המפגש הרביעי חינם', fear: 'כלב תוקפני שסכנה לאחרים', review: 'הרוטווילר שלי שוב ניתן ללכת איתו לפארק. פלא.', services: 'אילוף, אגרסיביות, חרדת פרידה, ביטול קפיצות, שמירה' },
    personaB: { ownerName: 'מאיה דורון', businessName: 'מאיה — גור חדש', location: 'תל אביב', yearsInField: '8 שנה', license: '', usp: 'מתמחה בגורים, קורס הכלבלב לגיל 8-16 שבועות', guarantee: 'גור מאומן בסיסי תוך 4 מפגשים', fear: 'גור שגדל בלי אילוף ויהפוך לבעיה', review: 'הגור שלנו מציית, לא מקפץ ועושה צרכים בחוץ.', services: 'אילוף גורים, ציות בסיסי, בית ומחוצה לו' },
  },
  {
    slug: 'veterinarian', hebrewName: 'וטרינר', cluster: 'pet-care', tier: 'B', urgency: 'urgent',
    personaA: { ownerName: 'ד"ר נעמי כהן', businessName: 'מרפאת כהן', location: 'רמת גן', yearsInField: '16 שנה', license: 'ד"ר לוטרינריה', usp: 'זמינה 24/7 לחירום, מגיעה הביתה', guarantee: 'אבחון מהיר ודיוק', fear: 'חיית מחמד חולה בלילה', review: 'הגיעה ב-2 לילה לחתולה שלי. מציל חיים.', services: 'רפואה כללית, חירום ביתי, חיסונים, עיקור, שיניים' },
    personaB: { ownerName: 'ד"ר עמיר לוי', businessName: 'לוי — וטרינר הוליסטי', location: 'הרצליה', yearsInField: '11 שנה', license: 'וטרינר ורפואה משלימה', usp: 'שילוב רפואה קונבנציונלית והוליסטית', guarantee: 'ייעוץ תזונה חינם', fear: 'טיפולים כימיים לחיית מחמד', review: 'גישה מדהימה, שילב תזונה ואקופונקטורה.', services: 'רפואה הוליסטית, תזונה, אקופונקטורה, כאב כרוני' },
  },

  // ── TIER B: Automotive ────────────────────────────────────────────────────
  {
    slug: 'mechanic', hebrewName: 'מוסך — מכונאי', cluster: 'automotive', tier: 'B', urgency: 'urgent',
    personaA: { ownerName: 'שלמה אדרי', businessName: 'מוסך אדרי', location: 'נתניה', yearsInField: '28 שנה', license: 'מכונאי רכב מוסמך', usp: 'אבחון ממוחשב, לא מחליף חלקים מיותרים', guarantee: 'אחריות 6 חודשים על כל תיקון', fear: 'מוסך שמנסל ומחליף חלקים שלא צריך', review: 'כל מוסך אמר ×4,000 שקל. שלמה תיקן ב-800. ישר.', services: 'תיקון רכב, טיפול תקופתי, בלמים, מנוע, מיזוג' },
    personaB: { ownerName: 'אלכס גורביץ׳', businessName: 'טק-קאר מוסך', location: 'תל אביב', yearsInField: '14 שנה', license: 'מוסמך BMW, Mercedes', usp: 'מתמחה ברכבי יוקרה ואירופאיים', guarantee: 'אחריות שנה על עבודה', fear: 'מוסך שלא מבין רכבי יוקרה', review: 'מוסך BMW מוסמך במחיר של מוסך שכונתי.', services: 'BMW, Mercedes, Audi, Volvo, Lexus' },
  },
  {
    slug: 'car-body-repair', hebrewName: 'פחחות וצביעת רכב', cluster: 'automotive', tier: 'B', urgency: 'planned',
    personaA: { ownerName: 'ויקטור מיכאלוב', businessName: 'ויקטור פחחות', location: 'חולון', yearsInField: '26 שנה', license: '', usp: 'התאמת צבע מושלמת, לא רואים את התיקון', guarantee: 'אחריות 3 שנים על הצביעה', fear: 'תיקון שייראה כמו טלאי', review: 'נגיעת רכב נעלמה לחלוטין. מדהים.', services: 'פחחות, צביעה, שריטות, תאונות, פגוש' },
    personaB: { ownerName: 'טל אמרוסי', businessName: 'פרפקט קאר', location: 'רמת גן', yearsInField: '12 שנה', license: '', usp: 'מתמחה בשיפור ליציג ו-Detailing', guarantee: 'חוות דעת שנייה חינם לפני ביטוח', fear: 'ביטוח שיהיה יקר מהתיקון', review: 'עשה לי Detailing מלא לפני מכירה. הרכב נמכר ב-5000 יותר.', services: 'Detailing, ציפוי קרמי, ליציג, שיפוץ רכב לפני מכירה' },
  },

  // ── TIER B: Digital & Tech ────────────────────────────────────────────────
  {
    slug: 'phone-repair', hebrewName: 'תיקון טלפונים', cluster: 'tech', tier: 'B', urgency: 'urgent',
    personaA: { ownerName: 'ניק זוהר', businessName: 'ניק פיקס', location: 'תל אביב', yearsInField: '9 שנה', license: 'Apple מוסמך', usp: 'תיקון תוך שעה, חלקים מקוריים בלבד', guarantee: 'אחריות 6 חודשים', fear: 'מסך שבור שיעלה יותר מהסמארטפון', review: 'מסך iPhone תוקן תוך שעה. חלק מקורי ומחיר הגון.', services: 'מסכים, סוללות, מצלמות, שקע טעינה, iPhone, Samsung' },
    personaB: { ownerName: 'רני אביב', businessName: 'מובייל-פרו', location: 'ירושלים', yearsInField: '11 שנה', license: '', usp: 'מגיע אליך, מתקן במקום', guarantee: 'לא תוקן — לא שילמת', fear: 'לאשפז טלפון ולהישאר בלי כלום ליומיים', review: 'הגיע למשרד, תיקן תוך 45 דקות. לא הפסדתי יום עבודה.', services: 'שרות ביתי, מסכים, סוללות, נעילה, שחזור נתונים' },
  },
  {
    slug: 'photographer', hebrewName: 'צלם אירועים', cluster: 'events', tier: 'B', urgency: 'planned',
    personaA: { ownerName: 'ליאת אמיר', businessName: 'ליאת צילום', location: 'גוש דן', yearsInField: '13 שנה', license: '', usp: 'סגנון דוקומנטרי, 600+ תמונות ערוכות', guarantee: 'גלריה תוך 3 שבועות', fear: 'צלם שיתפוס רגעים פורמליים ומוסכמים', review: 'תפסה רגעים שלא ידענו שהיו. בכינו מרוב יופי.', services: 'חתונות, בר מצווה, ברית, אירועי חברה' },
    personaB: { ownerName: 'איתי שטרן', businessName: 'שטרן — צילום ווידאו', location: 'תל אביב', yearsInField: '8 שנה', license: '', usp: 'צילום + וידאו, SDE ביום האירוע', guarantee: 'SDE מוכן לפני חצות', fear: 'לא לקבל סרטון שיזכיר את האירוע', review: 'SDE שגרם לכל האורחים לבכות. מקצועי מדהים.', services: 'SDE, קליפ חתונה, ריאיינים, drone' },
  },
  {
    slug: 'web-designer', hebrewName: 'בניית אתרים לעסקים', cluster: 'tech', tier: 'B', urgency: 'planned',
    personaA: { ownerName: 'גל מורן', businessName: 'גל אתרים', location: 'ישראל (אונליין)', yearsInField: '11 שנה', license: '', usp: 'אתר ב-Wix/WordPress שמביא לידים, לא רק נראה יפה', guarantee: 'האתר חי תוך 3 שבועות', fear: 'אתר יפה שאף אחד לא מוצא בגוגל', review: 'האתר שלי מדורג ראשון בגוגל מקומי תוך 4 חודשים.', services: 'אתרי תדמית, חנויות, דפי נחיתה, SEO בסיסי' },
    personaB: { ownerName: 'קרן בר-אל', businessName: 'קרן — ברנדינג ואתרים', location: 'תל אביב', yearsInField: '9 שנה', license: '', usp: 'חבילה מלאה: לוגו + ברנד + אתר', guarantee: 'עד 3 סבבי תיקונים', fear: 'אתר שלא מייצג את הברנד', review: 'מיצוב חדש, אתר חדש, ולקוחות חדשים. שווה כל שקל.', services: 'ברנדינג, לוגו, אתר, עיצוב, גרפיקה לרשת' },
  },

  // ── TIER B: Elderly & Childcare ───────────────────────────────────────────
  {
    slug: 'elderly-caretaker', hebrewName: 'מטפל/ת בקשיש', cluster: 'home-care', tier: 'B', urgency: 'urgent',
    personaA: { ownerName: 'אירנה קוסטנקו', businessName: 'אירנה — טיפול בקשישים', location: 'תל אביב', yearsInField: '15 שנה', license: 'סיעוד מוסמך', usp: 'עברית, רוסית ורומנית, מלווה לרופא', guarantee: 'ניסיון 2 ימים לפני התחייבות', fear: 'מטפלת שהקשיש לא ייקשר אליה', review: 'סבתא אוהבת אותה כאילו היא נכדה. שלווה מלאה.', services: 'ליווי יומי, לינה, מרחץ, ליווי לרופא, מחברה' },
    personaB: { ownerName: 'פנינה גרוס', businessName: 'בית חם — שירותי קשישים', location: 'ירושלים', yearsInField: '20 שנה', license: 'גריאטרית מוסמכת', usp: 'רק מטפלות ותיקות עם אחריות חברתית', guarantee: 'החלפה תוך 48 שעות אם לא מתאים', fear: 'מטפלת שתתחלף כל חודש', review: 'אותה מטפלת כבר 4 שנים. שקט נפשי לכל המשפחה.', services: 'טיפול ביתי, פיזיותרפיה, תרופות, ליווי, לינה' },
  },
  {
    slug: 'babysitter', hebrewName: 'בייביסיטר', cluster: 'home-care', tier: 'B', urgency: 'urgent',
    personaA: { ownerName: 'ניצן אבני', businessName: 'ניצן בייביסיטינג', location: 'תל אביב, גבעתיים', yearsInField: '7 שנה', license: 'תעודת עזרה ראשונה', usp: 'מגיעה תוך שעה, זמינה גם בסופ"ש', guarantee: 'בייביסיטר מגיעה או מחפשת החלפה', fear: 'בייביסיטר שתבטל ברגע האחרון', review: 'תמיד מגיעה, הילדים מתרגשים כשהיא מגיעה.', services: 'בייביסיטינג שעתי, יומי, לילה, ערבי שישי' },
    personaB: { ownerName: 'שגית לבנה', businessName: 'שגית — עזרה עם תינוקות', location: 'רמת גן', yearsInField: '11 שנה', license: 'אחות ילדים מוסמכת', usp: 'מתמחה בתינוקות 0-12 חודשים, הדרכת שינה', guarantee: 'גם מדריכה הורים בדרך', fear: 'תינוק שלא ישן ולא אוכל', review: 'תינוקת שלנו ישנה רצוף אחרי 3 ימים. קסמים.', services: 'טיפול בתינוקות, הדרכת שינה, לילה, אחרי לידה' },
  },

  // ── TIER B: Medical Aesthetics ────────────────────────────────────────────
  {
    slug: 'laser-hair-removal', hebrewName: 'הסרת שיער בלייזר', cluster: 'aesthetics', tier: 'B', urgency: 'planned',
    personaA: { ownerName: 'ד"ר ירדן שגב', businessName: 'שגב לייזר', location: 'תל אביב', yearsInField: '10 שנה', license: 'רופאת עור מוסמכת', usp: 'מכשיר Alma Soprano, 8 טיפולים, תוצאה לצמיתות', guarantee: 'ניסיון אזור קטן ראשון ב-200 ש"ח', fear: 'כאב וכוויות', review: 'כמעט ללא כאב וללא שיקום. תוצאה מושלמת.', services: 'הסרת שיער, קרוטי-גלים, IPL, פנים' },
    personaB: { ownerName: 'מוריה דרומי', businessName: 'ביוטי-לייזר', location: 'חיפה', yearsInField: '7 שנה', license: 'קוסמטיקאית רפואית', usp: 'חבילה שנתית ג"מ ללא הגבלת טיפולים', guarantee: 'עד אפס שיער או ממשיכים חינם', fear: 'לשלם הרבה ולא לקבל תוצאה', review: 'חבילה שנתית, שיער אפס אחרי 7 טיפולים.', services: 'הסרת שיער, פגיגמנטציה, עור, וורידים' },
  },
  {
    slug: 'aesthetic-doctor', hebrewName: 'רפואה אסתטית', cluster: 'aesthetics', tier: 'B', urgency: 'planned',
    personaA: { ownerName: 'ד"ר אורן מיכאלי', businessName: 'מיכאלי אסתטיקה', location: 'תל אביב', yearsInField: '14 שנה', license: 'רופא מומחה', usp: 'גישה טבעית — לא ״ניתוח פנים ניכר״', guarantee: 'ייעוץ חינם לפני כל פרוצדורה', fear: 'להיראות מדומה לאחר טיפול', review: 'טבעי, עדין, שיפור ניכר בלי שאחד שם לב שעשיתי משהו.', services: 'בוטוקס, פילרים, חומצה היאלורונית, PRP' },
    personaB: { ownerName: 'ד"ר רוני גילאי', businessName: 'גילאי קליניק', location: 'הרצליה', yearsInField: '11 שנה', license: 'מנתח פלסטי', usp: 'מתמחה בהצערת פנים בלייזר CO2', guarantee: 'תוצאות נראות תוך 6 שבועות', fear: 'זמן שיקום ארוך', review: 'שיקום של שבוע, תוצאה שמחזירה 10 שנים.', services: 'לייזר CO2, מתיחת פנים, ניתוחי עפעפיים, חטוב גוף' },
  },

  // ── TIER B: Events ────────────────────────────────────────────────────────
  {
    slug: 'event-mc', hebrewName: 'מגיש אירועים', cluster: 'events', tier: 'B', urgency: 'planned',
    personaA: { ownerName: 'רן ברק', businessName: 'רן ברק — מגיש', location: 'גוש דן', yearsInField: '15 שנה', license: '', usp: 'מגיש 200+ אירועים בשנה, מותאם לסגנון שלכם', guarantee: 'פגישת היכרות ללא עלות', fear: 'מגיש שישעמם את האורחים', review: 'כיף, ספונטני, הכניס אנרגיה לכל הלילה.', services: 'חתונות, בר מצווה, ימי הולדת, אירועי חברה' },
    personaB: { ownerName: 'מיה כץ', businessName: 'מיה — אירועי ילדים', location: 'השרון', yearsInField: '9 שנה', license: '', usp: 'מגישה + מדריכת ריקוד לילדים עד 13', guarantee: 'ילדים רוקדים מהדקה הראשונה', fear: 'מגיש שלא ידע איך לגרום לילדים להשתתף', review: 'כל הילדים על הרחבה כל הלילה. מושלמת.', services: 'בר/בת מצווה, ימי הולדת, מסיבות ילדים' },
  },
  {
    slug: 'florist', hebrewName: 'מעצב פרחים', cluster: 'events', tier: 'B', urgency: 'planned',
    personaA: { ownerName: 'ורד שמר', businessName: 'ורד פרחים', location: 'תל אביב', yearsInField: '17 שנה', license: '', usp: 'מעצבת חתונות מ-500 שנה, פרחים מהיצרן', guarantee: 'התאמה לצבעים ולסגנון המבוקש', fear: 'פרחים שייבלו לפני הטקס', review: 'עיצוב מהמם שגרם לאורחות לצלם עם כל ארנג׳מנט.', services: 'עיצוב חתונות, פרחים שולחניים, חופה, שזירה' },
    personaB: { ownerName: 'טים לאן', businessName: 'טים — פרחים אסיאתיים', location: 'הרצליה', yearsInField: '11 שנה', license: '', usp: 'סגנון יפני-מינימליסטי, צמחייה נדירה', guarantee: 'עיצוב ייחודי שלא יחזור', fear: 'עיצוב גנרי שנראה כמו כל חתונה', review: 'חופה שאנשים מדברים עליה עד היום.', services: 'ארנג׳מנטים מינימליסטיים, סוסאי-בינה, חופות' },
  },

  // ── TIER C: Specialized ───────────────────────────────────────────────────
  {
    slug: 'private-chef', hebrewName: 'שף פרטי לאירועים', cluster: 'events', tier: 'C', urgency: 'planned',
    personaA: { ownerName: 'ז׳אן ברנאר', businessName: 'ז׳אן — שף פרטי', location: 'השרון והמרכז', yearsInField: '20 שנה', license: 'שף מוסמך', usp: 'ארוחות שף בבית שלך, מגיע עם הכל', guarantee: 'תפריט מותאם לדיאטות ולאלרגיות', fear: 'ארוחה שלא תגרום לאורחים להתלהב', review: 'האורחים לא האמינו שאוכלים בבית ולא במסעדה.', services: 'ערבי שישי, יום הולדת, ארוחות עסקיות, חברות' },
    personaB: { ownerName: 'עדי טיוני', businessName: 'עדי — בישול ים-תיכוני', location: 'ת"א', yearsInField: '8 שנה', license: '', usp: 'מתמחה בים-תיכוני, כולל מרכיבים מהשוק', guarantee: 'חוות דעת טעימות ב-300 ש"ח לזוג', fear: 'אוכל שלא יתאים לרוחות', review: 'התפריט הים-תיכוני גרם לבכי מרוב טעם. אמיתי.', services: 'ים-תיכוני, מיזרח, בריאות, vegan, גלאט' },
  },
  {
    slug: 'personal-organizer', hebrewName: 'מארגנת בית', cluster: 'home-care', tier: 'C', urgency: 'planned',
    personaA: { ownerName: 'מעין כהן', businessName: 'מעין — ארגון ומחסור', location: 'גוש דן', yearsInField: '6 שנה', license: 'KonMari מוסמכת', usp: 'שיטת KonMari, שינוי שנמשך', guarantee: 'בית מאורגן תוך 2 ימים', fear: 'בית מבולגן שחוזר לגיהנום אחרי שבוע', review: 'הציל לי שעה ביום. הכל יש לו מקום.', services: 'ארגון בית, ארונות, מטבח, ניקוי אצירה, העברה' },
    personaB: { ownerName: 'שרה גינסברג', businessName: 'שרה — ארגון משרד', location: 'תל אביב', yearsInField: '9 שנה', license: '', usp: 'מתמחה בארגון משרדים ועצמאים', guarantee: 'משרד מאורגן שמגדיל פרודוקטיביות', fear: 'לבזבז זמן על חיפוש דברים', review: 'הפסקתי לאבד מסמכים. חסכה לי שעות בשבוע.', services: 'משרד ביתי, ניהול מסמכים, מעבר, עצמאים' },
  },
  {
    slug: 'social-media-manager', hebrewName: 'מנהל/ת רשתות חברתיות', cluster: 'digital', tier: 'C', urgency: 'planned',
    personaA: { ownerName: 'אלה רון', businessName: 'אלה סושיאל', location: 'ישראל (אונליין)', yearsInField: '7 שנה', license: 'מוסמכת Meta ו-Google', usp: 'מנהלת 12 עסקים, מתמחה ב-B2C מקומי', guarantee: 'גידול עוקבים ב-20% תוך 3 חודשים', fear: 'לשלם על ניהול ולא לראות לידים', review: 'הביאה 40 לידים בחודש הראשון. שווה כל שקל.', services: 'אינסטגרם, פייסבוק, TikTok, פרסום ממומן' },
    personaB: { ownerName: 'דן קרן', businessName: 'קרן — תוכן לעסקים', location: 'חיפה', yearsInField: '5 שנה', license: '', usp: 'כותב + מצלם + מעלה — הכל אנחנו', guarantee: 'חבילה חודשית קבועה ללא הפתעות', fear: 'להסתמך על 3 ספקים שונים', review: 'הכל בבקשה אחת. תוכן, עיצוב ופרסום.', services: 'כתיבת תוכן, צילום, עריכת וידאו, ניהול' },
  },
  {
    slug: 'yoga-teacher', hebrewName: 'מורה ליוגה', cluster: 'health', tier: 'C', urgency: 'planned',
    personaA: { ownerName: 'יוגה-פרייה', businessName: 'פרייה יוגה', location: 'תל אביב', yearsInField: '14 שנה', license: 'RYT-500 מוסמכת', usp: 'שיעורים קטנים עד 6 איש, תשומת לב אישית', guarantee: 'שיעור ניסיון ראשון ב-50 ש"ח', fear: 'כיתה גדולה שבה לא רואים אותך', review: 'שינתה לי את כאבי הגב לחלוטין תוך חודש.', services: 'יוגה קלאסית, Yin, Restorative, נשים בהריון' },
    personaB: { ownerName: 'ניר שלמה', businessName: 'ניר — פאוור יוגה', location: 'נתניה', yearsInField: '8 שנה', license: 'RYT-200', usp: 'פאוור יוגה לספורטאים, מאתגר', guarantee: 'שיפור ניכר בגמישות תוך 30 ימים', fear: 'יוגה שתרגיש קלה מדי', review: 'הכי מאתגר ומרגיע בו זמנית שחוויתי.', services: 'פאוור יוגה, וינייאסה, מדיטציה, ריטריט' },
  },
  {
    slug: 'swimming-instructor', hebrewName: 'מדריך שחייה', cluster: 'education', tier: 'C', urgency: 'planned',
    personaA: { ownerName: 'מאיה דגן', businessName: 'מאיה שחייה', location: 'גוש דן', yearsInField: '12 שנה', license: 'מאמן שחייה מוסמך', usp: 'מתמחה בפחד מים, תוצאות תוך 8 שיעורים', guarantee: 'שיעור ניסיון ב-80 ש"ח', fear: 'לא ללמוד לשחות לעולם בגלל פחד', review: 'בגיל 42 לאחר 10 שיעורים שוחה 25 מטר. עלמה!', services: 'שחייה למבוגרים, ילדים, פחד מים, כרבולת' },
    personaB: { ownerName: 'עמוס כץ', businessName: 'כץ שחייה תחרותית', location: 'הרצליה', yearsInField: '18 שנה', license: 'מאמן לאומי', usp: 'מאמן גביע אולימפי, לקדם ילדים לתחרויות', guarantee: 'שיפור מדיד בזמנים', fear: 'לדשדש בלי להתקדם', review: 'הבן שלי ירד 8 שניות ב-100 מטר חתירה.', services: 'שחייה תחרותית, טכניקה, הכנה לתחרויות' },
  },
  {
    slug: 'translator', hebrewName: 'מתרגם מוסמך', cluster: 'digital', tier: 'C', urgency: 'planned',
    personaA: { ownerName: 'ד"ר אנה ריבקין', businessName: 'ריבקין תרגום', location: 'ישראל (אונליין)', yearsInField: '20 שנה', license: 'Ph.D בבלשנות', usp: 'מוסמכת שבועת אמונים, תרגום משפטי ורשמי', guarantee: 'אפוסטיל ואישור נוטריוני כלול', fear: 'מסמך שיידחה', review: 'הגשת אזרחות גרמנית עברה ללא בעיה.', services: 'תרגום רשמי, אזרחות, אפוסטיל, עסקי, שבועת אמונים' },
    personaB: { ownerName: 'אור לוין', businessName: 'לוין — תרגום עסקי', location: 'ת"א', yearsInField: '11 שנה', license: '', usp: 'תרגום עסקי ושיווקי, שומר על קול המותג', guarantee: 'זמן אספקה מובטח', fear: 'תרגום ישיר שמרגיש כמו תרגום', review: 'הסייט האנגלי שלנו נראה כתוב בידי דובר שפת אם.', services: 'תרגום שיווקי, אתרים, אנגלית-עברית, גרמנית' },
  },
  {
    slug: 'caterer', hebrewName: 'קייטרינג', cluster: 'events', tier: 'C', urgency: 'planned',
    personaA: { ownerName: 'עופר בן-הרוש', businessName: 'בן-הרוש קייטרינג', location: 'השרון', yearsInField: '22 שנה', license: 'כשר למהדרין', usp: 'בופה של 40 מנות, הגשה מלאה, ניקיון כלול', guarantee: 'מחיר ראש-לאורח קבוע ללא הפתעות', fear: 'לא מספיק אוכל באירוע', review: 'אוכל מעולה, שירות מדהים. כל האורחים שאלו מי הקייטרינג.', services: 'בר מצווה, חתונה, שבע ברכות, אירוע חברה' },
    personaB: { ownerName: 'מרים לוי', businessName: 'מרים — אוכל ביתי', location: 'ירושלים', yearsInField: '14 שנה', license: 'כשר', usp: 'אוכל ביתי ממש, לא קייטרינג תעשייתי', guarantee: 'חוות דעת טעימה לפני ההזמנה', fear: 'אוכל קייטרינג תעשייתי חסר טעם', review: 'כולם חשבו שמישהי בישלה בבית. כיף אמיתי.', services: 'ארוחות ביתיות, שבת, חגים, אירועים קטנים' },
  },
  {
    slug: 'roofing', hebrewName: 'גגן — איטום וגגות', cluster: 'home-renovation', tier: 'C', urgency: 'urgent',
    personaA: { ownerName: 'יעקב אסייג', businessName: 'אסייג גגות', location: 'גוש דן', yearsInField: '25 שנה', license: 'קבלן מורשה', usp: 'אחריות 10 שנים על כל איטום', guarantee: 'אחריות 10 שנים בכתב', fear: 'נזילה חוזרת שהרסה את הגג', review: 'אחרי 3 קבלנים שכשלו — אסייג פתר הכל לצמיתות.', services: 'איטום גגות, פוליאוריאה, זפת, גגות רעפים, פוליסטירן' },
    personaB: { ownerName: 'ח׳ליל מרעי', businessName: 'מרעי גגות', location: 'חיפה', yearsInField: '19 שנה', license: 'קבלן מורשה', usp: 'מתמחה בבתים ערביים ואבן, גגות כפריים', guarantee: 'אחריות 7 שנים', fear: 'נזילה דרך קירות האבן', review: 'הביתן הכפרי שלנו יבש לראשונה ב-20 שנה.', services: 'בתי כפר, בניה ערבית, אבן, קרמיקה' },
  },
  {
    slug: 'pension-advisor', hebrewName: 'יועץ פנסיוני', cluster: 'financial', tier: 'C', urgency: 'considered',
    personaA: { ownerName: 'מוטי שרון', businessName: 'שרון — פנסיה ותכנון', location: 'תל אביב', yearsInField: '18 שנה', license: 'יועץ פנסיוני מורשה', usp: 'מייצר בממוצע 300,000 ש"ח יותר בפנסיה', guarantee: 'ניתוח קרן קיים ב-500 ש"ח (מנוכה אם עובדים יחד)', fear: 'לגלות שפספסת מאות אלפים בפנסיה', review: 'גילה שהייתי מאבד 280,000 ש"ח. עכשיו אני בכיוון הנכון.', services: 'ייעוץ פנסיוני, קרן השתלמות, ביטוח מנהלים, שחרור' },
    personaB: { ownerName: 'לי גולדשטיין', businessName: 'גולדשטיין — עצמאים ופנסיה', location: 'רמת גן', yearsInField: '9 שנה', license: 'מורשית', usp: 'מתמחה בעצמאים שלא יודעים מה לבצע', guarantee: 'ניתוח ראשוני חינם', fear: 'עצמאי שלא מפריש לפנסיה כמו שצריך', review: 'הבינה את המצב שלי מיד ועשתה סדר בכל התיק.', services: 'עצמאים, הפרשות, קצבאות, חיסכון, גמל להשקעה' },
  },
];

// ── API caller — gpt-5.4-pro (Responses API, Bearer auth) ───────────────────
const API_KEY    = env.AZURE_GPT54PRO_KEY || env.AZURE_OPENAI_KEY;
const ENDPOINT   = env.AZURE_GPT54PRO_ENDPOINT; // https://.../openai/v1
const DEPLOYMENT = env.AZURE_GPT54PRO_DEPLOYMENT || 'gpt-5.4-pro';
const RESPONSES_URL = `${ENDPOINT}/responses`;

async function callModel(systemPrompt, userMessage, maxTokens = 16000) {
  const res = await fetch(RESPONSES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: DEPLOYMENT,
      instructions: systemPrompt,
      input: `Output valid JSON only.\n\n${userMessage}`,
      text: { format: { type: 'json_object' } },
      max_output_tokens: maxTokens,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`API error ${res.status}: ${JSON.stringify(data?.error)}`);
  if (data.status === 'incomplete') throw new Error(`Response incomplete (hit token limit). Output: ${JSON.stringify(data.output).slice(0, 300)}`);
  const msgItem = (data.output || []).find(o => o.type === 'message');
  const content = msgItem?.content?.[0]?.text;
  if (!content) throw new Error(`No content in response: ${JSON.stringify(data).slice(0, 200)}`);
  return { content, usage: data.usage || {} };
}

// ── LP copy prompt (same as buildLpCopyPrompt in lpCopyPrompt.ts) ─────────────
const TAMAR_SYSTEM = `You are Tamar, WAO's Sabra conversion copywriter.
Write LP copy for a Hebrew RTL landing page. Output ONLY valid JSON. No prose, no explanation.

HARD RULES:
- Hebrew only. Singular male address (אתה/שלך). No translated-Hebrew calques.
- Never use: על מנת, כיצד, במידה ו, עם זאת, מהו, ניתן ל (prefer: אפשר).
- Tone: warm Sabra expert talking directly to a stressed client. Not salesy. Not corporate.
- reviewFeatured: copy EXACTLY from the Review Quote field — do not rephrase a single word.

ABOUT SECTION (aboutBlurb) — most important field:
- First-person voice. Open with the owner's first name: "שמי [name]," or "אני [name],"
- 3-4 sentences. Follow this arc:
  1. Who I am + primary credential (years of experience, license if provided)
  2. How I work — one specific trait that sets me apart (NOT generic "שירות מקצועי")
  3. What the client gets when they call — a concrete, personal promise
  4. A brief human touch or closing hook
- If license is provided, embed it: "בעל רישיון מספר X"
- Max 320 chars. Zero generic filler.

HERO: heroHeadline opens with fear/problem, closes with relief. Max 68 chars.
FAQ: 4-5 real pre-call questions. Answers 1-2 sentences, max 120 chars each.`;

function buildLpUserMsg(persona, niche) {
  const contactLabel = 'התקשר עכשיו';
  const ownerFirst   = (persona.ownerName || '').split(/[\s,]/)[0];
  return `Niche: ${niche}
Business Name: ${persona.businessName}
Owner Name: ${persona.ownerName}
Location: ${persona.location}
Years in Field: ${persona.yearsInField}
License: ${persona.license || 'לא'}
USP: ${persona.usp}
Ideal Client Fear: ${persona.fear}
Guarantee: ${persona.guarantee}
Response Time: ${persona.responseTime || ''}
Review Quote: ${persona.review}
Services: ${persona.services}
Contact Method: טלפון ווצאפ
Primary CTA: "${contactLabel}"

OUTPUT JSON:
{
  "heroHeadline": "",
  "heroSubheadline": "",
  "heroCta": "${contactLabel}",
  "trustBarItems": ["", "", "", ""],
  "aboutBlurb": "",
  "servicesHeadline": "",
  "serviceItems": ["", "", ""],
  "faqHeadline": "",
  "faqItems": [{"q":"","a":""},{"q":"","a":""},{"q":"","a":""},{"q":"","a":""}],
  "guaranteeBlock": "",
  "reviewFeatured": "${persona.review}",
  "reviewContext": "5 כוכבים בגוגל",
  "responseTimeBadge": ${persona.responseTime ? `"${persona.responseTime}"` : 'null'},
  "scarcityLine": null,
  "formHeadline": "",
  "stickyBarLine": ""
}`;
}

// ── Keyword cluster prompt ────────────────────────────────────────────────────
const DROR_SYSTEM = `You are Dror, WAO's PPC strategist for Israeli B2C Google Ads.
Output ONLY valid JSON. No prose.

Generate a keyword cluster for an Israeli B2C service vertical.
All keywords must be in Hebrew (as Israelis actually search — not translated English).

Output this exact JSON structure:
{
  "primaryKeywords": [{"kw":"","intent":"urgent|research|comparison","volume":"high|medium|low"}],
  "exactMatch": [""],
  "negativeKeywords": [""],
  "bidStrategy": "tCPA|Maximize Conversions|tROAS",
  "urgencyProfile": "high|medium|low",
  "geoNote": "",
  "seasonalNote": ""
}

Rules:
- primaryKeywords: 20-25 items. Mix of [profession], [profession + city], [profession + urgency], [profession + service type]
- exactMatch: 12-15 tightly targeted phrases
- negativeKeywords: 25-30 that block irrelevant traffic (courses, jobs, DIY, prices, reviews)
- Never put a negative keyword that would block a primary keyword
- urgencyProfile: high = people call same day, low = they research weeks`;

function buildKeywordUserMsg(hebrewName, urgency) {
  return `Vertical: ${hebrewName}
Urgency level: ${urgency}
Market: Israel, Hebrew-speaking B2C clients
Generate the keyword cluster.`;
}

// ── Checkpoint helpers ────────────────────────────────────────────────────────
function isDone(slug) {
  const dir = resolve(OUT_DIR, slug);
  return existsSync(resolve(dir, 'lp-examples.json')) &&
         existsSync(resolve(dir, 'keywords.json'));
}

function saveResult(slug, filename, data) {
  const dir = resolve(OUT_DIR, slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, filename), JSON.stringify(data, null, 2));
}

// ── Process one vertical ──────────────────────────────────────────────────────
let totalTokens = { in: 0, out: 0 };

async function processVertical(v) {
  if (isDone(v.slug)) {
    console.log(`  ⏭  ${v.slug} — already done, skipping`);
    return;
  }
  console.log(`\n  🔄 ${v.slug} (${v.hebrewName}) [Tier ${v.tier}]`);

  if (DRY_RUN) {
    console.log(`     [DRY RUN — skipping API calls]`);
    return;
  }

  try {
    // Generate LP example A
    const lpA = await callModel(TAMAR_SYSTEM, buildLpUserMsg(v.personaA, v.hebrewName));
    totalTokens.in  += lpA.usage.input_tokens  || 0;
    totalTokens.out += lpA.usage.output_tokens || 0;

    // Generate LP example B
    const lpB = await callModel(TAMAR_SYSTEM, buildLpUserMsg(v.personaB, v.hebrewName));
    totalTokens.in  += lpB.usage.input_tokens  || 0;
    totalTokens.out += lpB.usage.output_tokens || 0;

    // Generate keyword cluster
    const kw = await callModel(DROR_SYSTEM, buildKeywordUserMsg(v.hebrewName, v.urgency), 8000);
    totalTokens.in  += kw.usage.input_tokens  || 0;
    totalTokens.out += kw.usage.output_tokens || 0;

    saveResult(v.slug, 'lp-examples.json', {
      vertical: v.slug,
      hebrewName: v.hebrewName,
      cluster: v.cluster,
      tier: v.tier,
      examples: [
        { archetype: 'A', persona: v.personaA.ownerName, lp: JSON.parse(lpA.content) },
        { archetype: 'B', persona: v.personaB.ownerName, lp: JSON.parse(lpB.content) },
      ],
      generatedAt: new Date().toISOString(),
    });

    saveResult(v.slug, 'keywords.json', {
      vertical: v.slug,
      hebrewName: v.hebrewName,
      ...JSON.parse(kw.content),
      generatedAt: new Date().toISOString(),
    });

    const cost = ((totalTokens.in / 1e6) * 3) + ((totalTokens.out / 1e6) * 15);
    console.log(`     ✅ saved — running cost: $${cost.toFixed(3)}`);

  } catch (err) {
    console.error(`     ❌ ${v.slug}: ${err.message}`);
    // Don't save partial — will retry next run
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
const verticals = SINGLE_SLUG
  ? VERTICALS.filter(v => v.slug === SINGLE_SLUG)
  : VERTICALS;

if (!verticals.length) {
  console.error(`No vertical found for slug: ${SINGLE_SLUG}`); process.exit(1);
}

const pending = verticals.filter(v => !isDone(v.slug));
// Pessimistic ceiling: max_output_tokens per call (16k LP × 2 + 8k kw) + generous input
const estCost = pending.length * (((13000 / 1e6) * 3) + ((40000 / 1e6) * 15));

console.log(`\n🚀 WAO Batch Generator`);
console.log(`   Model:      ${DEPLOYMENT}`);
console.log(`   Verticals:  ${verticals.length} total, ${pending.length} pending`);
console.log(`   Tasks/each: 2 LP examples + 1 keyword cluster`);
console.log(`   Mode:       ${DRY_RUN ? 'DRY RUN' : 'LIVE ⚠️'}`);
console.log(`   Output:     data/batch/{slug}/`);
if (!DRY_RUN) {
  console.log(`   Est. cost:  up to $${estCost.toFixed(2)} (ceiling — actual Azure pricing may differ)\n`);
  if (!CONFIRMED) {
    console.error(`\n🛑  STOPPED — live run requires --yes flag to prevent accidental charges.`);
    console.error(`   Run: node scripts/batch-generate-verticals.mjs --yes\n`);
    process.exit(1);
  }
} else {
  console.log();
}

// Run with bounded concurrency
for (let i = 0; i < verticals.length; i += CONCURRENCY) {
  const batch = verticals.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(processVertical));
}

const finalCost = ((totalTokens.in / 1e6) * 3) + ((totalTokens.out / 1e6) * 15);
console.log(`\n✅ Done`);
console.log(`   Tokens: ${totalTokens.in.toLocaleString()} in / ${totalTokens.out.toLocaleString()} out`);
console.log(`   Estimated cost: $${finalCost.toFixed(3)}\n`);
