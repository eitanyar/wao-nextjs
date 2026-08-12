// src/data/website-course-data.ts
// Source of truth for the Website Building + AI course.
// Add new lessons here as they are produced and uploaded.

export interface WebsiteLesson {
  slug: string;
  title: string;
  description: string;
  duration: string;
  /** YouTube video ID — used when the lesson is hosted on YouTube. */
  videoId?: string;
  /** Local self-hosted video path (public/media/videos/...) — used before/instead of a YouTube upload. */
  videoSrc?: string;
  thumbnail: string;
  activeTask: string;
  uiGuides: { label: string; href: string; disclosure?: string }[];
}

export interface WebsiteModule {
  num: number;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  lessons: WebsiteLesson[];
}

export const WEBSITE_COURSE_MODULES: WebsiteModule[] = [
  {
    num: 1,
    title: "דומיין — הכתובת הדיגיטלית שלך",
    subtitle: "Domain Foundation",
    icon: "🔐",
    color: "#4ae3b5",
    lessons: [
      {
        slug: "website-lesson-1",
        title: "שיעור 1: הדומיין — הכתובת הדיגיטלית שלך",
        description: "מה זה דומיין, למה הוא לא אותו דבר כמו האתר, ואיך תוודא שהוא רשום על שמך",
        duration: "~4 דקות",
        videoId: "cLgN8iPH9-Y",
        thumbnail: "/media/thumbnails/website-lesson-1.jpg",
        activeTask:
          "תפתח את הדפדפן עכשיו. תיכנס ל-GoDaddy.com, Namecheap.com או box.co.il. תחפש את שם העסק שלך — תבדוק אם .co.il ו-.com פנויים. תרשום מה מצאת — בשיעור הבא תבחר ביניהם.",
        uiGuides: [
          { label: "▶ GoDaddy — בדיקת דומיין", href: "https://www.godaddy.com/he-il/domains" },
          { label: "▶ Namecheap — בדיקת דומיין", href: "https://www.namecheap.com" },
          {
            label: "▶ box.co.il — רישום ישראלי",
            href: "https://aff.box.co.il/YOUR_AFFILIATE_ID",
            disclosure: "קישור שותפים — אנחנו עשויים לקבל עמלה בעקבות רישום דרך קישור זה",
          },
        ],
      },
      {
        slug: "website-lesson-2",
        title: "שיעור 2: איך בוחרים שם דומיין נכון לעסק שלך",
        description:
          "5 קריטריונים לשם דומיין טוב, מבחן הרדיו, 3 טעויות נפוצות, ופרומפט AI מוכן לשימוש",
        duration: "~4 דקות",
        videoId: "s5GxdxVRv_o",
        thumbnail: "/media/thumbnails/website-lesson-2.jpg",
        activeTask:
          "תשתמש בפרומפט ה-AI. תיכנס ל-Claude או ChatGPT, תעתיק את הפרומפט מהשיעור. תחליף את [שם העסק] ו[תחום] בפרטים שלך. תקבל 10 הצעות — תסנן לפי 5 הקריטריונים. המטרה: 3 מועמדים פנויים, ברשימה כתובה.",
        uiGuides: [
          { label: "▶ Claude AI — יצירת שמות דומיין", href: "https://www.claude.ai" },
          { label: "▶ ChatGPT — יצירת שמות דומיין", href: "https://www.chatgpt.com" },
          { label: "▶ GoDaddy — בדיקת זמינות דומיין", href: "https://www.godaddy.com/he-il/domains" },
        ],
      },
    ],
  },
  {
    num: 2,
    title: "הסבירו את העסק ל-AI",
    subtitle: "Business Description for AI",
    icon: "🤖",
    color: "#60a5fa",
    lessons: [
      {
        slug: "website-lesson-3",
        title: "שיעור 1: איך מתארים את העסק שלך ל-AI",
        description:
          "שלושה מרכיבים למשפט תיאור עסק מדויק, דוגמה חיה של אינסטלטור, ותבנית מלאה לניסוח המשפט שיבנה את כל האתר שלך",
        duration: "3:11",
        videoId: "E3DTE23P7RY",
        thumbnail: "/media/thumbnails/website-lesson-3.png",
        activeTask:
          "תמלא את התבנית מהשיעור. תשמור את המשפט — תצטרך אותו בשיעור הבא.",
        uiGuides: [],
      },
      {
        slug: "website-lesson-4",
        title: "שיעור 2: הפרומפט הראשון שלך ל-AI",
        description:
          "איך להפוך את תיאור העסק שלך לפרומפט ראשון, לקבל טיוטת עמוד בית תוך שניות, ולבדוק אם היא נשמעת כמוך",
        duration: "3:52",
        videoId: "aqd8TLdFeK0",
        thumbnail: "/media/thumbnails/website-lesson-4.png",
        activeTask:
          "תדביק את המשפט שלך ל-AI ותריץ את שלוש הבדיקות. תשמור את הטיוטה — תצטרך אותה בשיעור הבא.",
        uiGuides: [],
      },
      {
        slug: "website-lesson-5",
        title: "שיעור 3: מהטיוטה הראשונה לגרסה שנשמעת כמוך",
        description:
          "שלוש שאלות לבדיקת כל טיוטה, נוסחת פרומפט תיקון, וכמה סבבים צריך עד שמגיעים לתוצאה אמיתית",
        duration: "3:41",
        videoId: "Ced8AUpk4e4",
        thumbnail: "/media/thumbnails/website-lesson-5.png",
        activeTask:
          "תעביר את הטיוטה דרך שלוש השאלות ותכתוב פרומפט תיקון אחד. תשמור את הגרסה החדשה.",
        uiGuides: [],
      },
    ],
  },
  {
    num: 3,
    title: "השפה שגוגל מבין",
    subtitle: "On-Page SEO Foundations",
    icon: "🔍",
    color: "#fbbf24",
    lessons: [
      {
        slug: "website-lesson-6",
        title: "שיעור 1: הלקוח לא מחפש אותך, הוא מחפש את הבעיה שלו",
        description:
          "הפער בין המילים שבהן אתה מתאר את העסק שלך לבין המילים שבהן הלקוח שלך מחפש בגוגל. שרברב מול אינסטלטור, ולמה שתי המילים שייכות לתוכן שלך",
        duration: "2:44",
        videoId: "ArpMeny-8D8",
        thumbnail: "/media/thumbnails/website-lesson-6.jpg",
        activeTask:
          "תוריד את דף העבודה ״מתרגם השפה״ מקישור השיעור. הדף כולל את הדוגמאות של אבי, כדי שתבין את השיטה. תמלא את שתי העמודות במילים האמיתיות של העסק שלך. תשמור את הקובץ — תצטרך אותו בשיעור הבא.",
        uiGuides: [],
      },
      {
        slug: "website-lesson-7",
        title: "שיעור 2: הכותרת שמכניסה אותך לעמוד הראשון (וזו שקוברת אותך)",
        description:
          "נוסחת כותרת התג ב-5 חלקים: מילת מפתח, עיר, יתרון אחד, שם העסק בסוף, ובין 50 ל-60 תווים. איך לכתוב אותה מחדש לדף הבית עם פרומפט AI",
        duration: "1:59",
        videoId: "B2g2xyTcD1o",
        thumbnail: "/media/thumbnails/website-lesson-7.jpg",
        activeTask:
          "תפתח את דף הבית שבנית במודול 2. תשתמש בפרומפט ותכתוב שלוש גרסאות לכותרת. תבדוק כל גרסה לפי הנוסחה: מילת מפתח ראשונה, עיר, יתרון אחד, שם העסק בסוף. תספור תווים — בין 50 ל-60. תשמור את הכותרת שבחרת.",
        uiGuides: [],
      },
      {
        slug: "website-lesson-8",
        title: "שיעור 3: גוגל קורא רק את הכותרות שלך — הנה מה לכתוב בהן",
        description:
          "היררכיית כותרות בתוך העמוד (H1/H2/H3) כתוכן עניינים לבן אדם ולגוגל. כותרת ראשית אחת שתואמת את מילת המפתח, כותרות משנה ברורות, בלי דילוג רמות ובלי מילוי מילות מפתח",
        duration: "2:35",
        videoId: "tjlxAaOP3RE",
        thumbnail: "/media/thumbnails/website-lesson-8.jpg",
        activeTask:
          "תפתח את העמוד הראשון מתוך החמישה שלך. תריץ עליו בדיקה: כותרת ראשית אחת, כותרות משנה ברורות, בלי דילוג רמות. נכשל באחד מהם? תשלח ל-AI את פרומפט התיקון. תחזור על התהליך על כל חמשת העמודים, ותשמור כל עמוד אחרי התיקון.",
        uiGuides: [],
      },
      {
        slug: "website-lesson-9",
        title: "שיעור 4: עמוד לכל שירות: הטריק שמכפיל את החשיפה שלך בגוגל",
        description:
          "מתי כדאי לפצל שירות לעמוד נפרד ומתי להשאיר אותו ממוזג: כלל ההכרעה הוא האם לקוח מחפש את השירות הזה בשמו המדויק בגוגל",
        duration: "2:56",
        videoId: "W_4nWGLRuPA",
        thumbnail: "/media/thumbnails/website-lesson-9.jpg",
        activeTask:
          "תרשום רשימה של כל השירותים שהעסק שלך נותן. ליד כל אחד תסמן ״עמוד נפרד״ או ״ממוזג״. תבחר שירות אחד שסימנת ״עמוד נפרד״ ועדיין אין לו עמוד, ותריץ עליו את פרומפט הבנייה. תשמור את הטיוטה, ותעביר עליה כותרת וכותרות משנה לפי שני השיעורים הקודמים.",
        uiGuides: [],
      },
    ],
  },
  {
    num: 4,
    title: "התשובות שה-AI מצטט",
    subtitle: "AI Answers & FAQ",
    icon: "💬",
    color: "#f472b6",
    lessons: [
      {
        slug: "website-lesson-10",
        title: "שיעור 1: הלקוח שואל, גוגל עונה — ואתה יכול להיות התשובה",
        description:
          "מה זה \"תשובת AI\" ואיך היא שונה מעמוד תוצאות עם עשרה קישורים כחולים. למה להיות המקור המצוטט חשוב היום כמו (ולפעמים יותר מ-) דירוג ראשון",
        duration: "2:39",
        videoId: "aZVkz1KdWnQ",
        thumbnail: "/media/thumbnails/website-lesson-10.jpg",
        activeTask:
          "תוריד את דף העבודה ״שאלת הלקוח שלי״ מקישור השיעור. תכתוב עליו שאלה אחת אמיתית, במילים של הלקוח ולא במילים שלך. תשמור אותו — תצטרך אותו בשיעור הבא, כשתהפוך אותו לשאלת FAQ.",
        uiGuides: [],
      },
      {
        slug: "website-lesson-11",
        title: "שיעור 2: שאלות ותשובות: הבלוק שה-AI של גוגל מצטט הכי הרבה",
        description:
          "איך לנסח שאלת FAQ במילים של הלקוח ולא בז'רגון מקצועי. שימוש בפרומפט AI שהופך תיאור עסק לשמונה עד עשר שאלות מועמדות, ובחירת שלוש מתוכן",
        duration: "3:15",
        videoSrc: "/media/videos/website-lesson-11.mp4",
        thumbnail: "/media/thumbnails/website-lesson-11.jpg",
        activeTask:
          "תריץ את הפרומפט עם תיאור העסק שלך ותקבל שמונה עד עשר שאלות מועמדות. תבחר שלוש מתוכן, כולל השאלה ששמרת בשיעור הקודם. תשמור אותן — תצטרך אותן בשיעור הבא.",
        uiGuides: [],
      },
      {
        slug: "website-lesson-12",
        title: "שיעור 3: התשובה המושלמת: שלושה משפטים שגוגל בוחר להציג",
        description:
          "נוסחת התשובה: עובדה ישירה קודם, בלי פתיח מהסס, ואז משפט תומך אחד עם פרט קונקרטי. דוגמה חיה על שאלת המחיר של אבי",
        duration: "3:02",
        videoSrc: "/media/videos/website-lesson-12.mp4",
        thumbnail: "/media/thumbnails/website-lesson-12.jpg",
        activeTask:
          "תיקח את שלוש השאלות מהשיעור הקודם. תריץ את הפרומפט על כל שאלה בנפרד. תבדוק שכל תשובה מתחילה בעובדה ולא בהיסוס. תשמור את שלושת הזוגות, שאלה ותשובה, ביחד.",
        uiGuides: [],
      },
      {
        slug: "website-lesson-13",
        title: "שיעור 4: המתחרה שלך כבר מצוטט ב-AI. בוא נעקוף אותו",
        description:
          "מה סימון FAQPage JSON-LD עושה (עוזר למנועי AI לקרוא את הבלוק נכון) ומה הוא לא עושה — הוא לא יוצר עוד תוצאת אקורדיון גלויה בגוגל, פיצ׳ר שהוצא משימוש ב-7 במאי 2026",
        duration: "3:20",
        videoSrc: "/media/videos/website-lesson-13.mp4",
        thumbnail: "/media/thumbnails/website-lesson-13.jpg",
        activeTask:
          "תדביק ל-AI את הפרומפט, עם בלוק השאלות והתשובות שלך. תוודא שהקוד נכנס לדף הנכון באתר. תבדוק אותו בכלי אימות סכמה חיצוני. יש שגיאה? תעתיק אותה חזרה ל-AI ותבקש שיתקן.",
        uiGuides: [],
      },
    ],
  },
  {
    num: 5,
    title: "האתר באוויר, ומחובר לגוגל",
    subtitle: "Domain, Deploy & Search Console",
    icon: "🚀",
    color: "#fb923c",
    lessons: [
      {
        slug: "website-lesson-14",
        title: "שיעור 1: דומיין במאה שקל: כתובת שהיא שלך לכל החיים",
        description:
          "תהליך הרכישה בפועל של הדומיין שבחרת במודול 1: כניסה לחברת הרישום, תשלום, ואימות מייל אישור הבעלות — הצעד ששומר עליך מהסיפור של \"הדומיין שאבד\" משיעור 1.1",
        duration: "2:54",
        videoSrc: "/media/videos/website-lesson-14.mp4",
        thumbnail: "/media/thumbnails/website-lesson-14.jpg",
        activeTask:
          "תיכנס לחברת הרישום שבחרת, ותרכוש את השם שבחרת במודול 1. לפני שאתה מאשר, תעבור שוב על שלוש הבדיקות: בעלות, חידוש אוטומטי, בלי הוספות מיותרות. אחרי התשלום תחפש את מייל אישור הבעלות ותשמור אותו במקום בטוח.",
        uiGuides: [],
      },
      {
        slug: "website-lesson-15",
        title: "שיעור 2: האתר באוויר תוך עשר דקות — בלי לשלם על אחסון",
        description:
          "העלאת חמשת הדפים שבנית במודול 2 לאירוח חינמי ב-Cloudflare Pages, וקבלת כתובת זמנית שהאתר שלך חי עליה. הבהרה: זו עדיין לא הכתובת שקנית בשיעור הקודם",
        duration: "2:40",
        videoSrc: "/media/videos/website-lesson-15.mp4",
        thumbnail: "/media/thumbnails/website-lesson-15.jpg",
        activeTask:
          "תיכנס לחשבון ה-Cloudflare Pages שלך ותגרור את תיקיית חמשת הדפים פנימה. תמתין לסיום ההעלאה, בדרך כלל דקה או שתיים. תיכנס לכתובת הזמנית שנוצרה, ותוודא שהאתר באמת נטען.",
        uiGuides: [
          { label: "▶ Cloudflare Pages", href: "https://pages.cloudflare.com" },
        ],
      },
      {
        slug: "website-lesson-16",
        title: "שיעור 3: לחבר את הדומיין: השלב שמפחיד את כולם ולוקח חמש דקות",
        description:
          "חיבור דומיין = עדכון נתבי שם ברמת \"ספר הטלפונים\" של האינטרנט, לא נגיעה באתר עצמו. חמש דקות קליק, ואחר כך תפוצה שיכולה לקחת מדקות עד שעות — וזה נורמלי",
        duration: "2:02",
        videoSrc: "/media/videos/website-lesson-16.mp4",
        thumbnail: "/media/thumbnails/website-lesson-16.jpg",
        activeTask:
          "תיכנס לפרויקט שלך ב-Cloudflare Pages ותעתיק משם את פרטי החיבור. תיכנס לאתר הרישום של הדומיין ותעדכן שם את הפרטים. תסגור את המחשב, ותבדוק שוב מחר בבוקר.",
        uiGuides: [
          { label: "▶ Cloudflare Pages", href: "https://pages.cloudflare.com" },
        ],
      },
      {
        slug: "website-lesson-17",
        title: "שיעור 4: המסך שמראה לך מה גוגל באמת חושב על האתר שלך",
        description:
          "אימות בעלות מיידי ב-Google Search Console, ולוח שמראה מה גוגל רואה באתר שלך. שלושה מספרים שכדאי לעקוב אחריהם: חשיפות, קליקים וכיסוי. אימות בעלות מיידי, נתוני ביצועים יכולים לקחת כמה ימים להופיע",
        duration: "2:49",
        videoSrc: "/media/videos/website-lesson-17.mp4",
        thumbnail: "/media/thumbnails/website-lesson-17.jpg",
        activeTask:
          "תיכנס ל-Google Search Console עם חשבון גוגל שלך. תוסיף את הדומיין שלך כמאגר חדש, ותבצע את שלב האימות לפי השיטה שמוצעת לך. תאתר את לשונית ״ביצועים״ ואת לשונית ״כיסוי״.",
        uiGuides: [
          { label: "▶ Google Search Console", href: "https://search.google.com/search-console" },
        ],
      },
      {
        slug: "website-lesson-18",
        title: "שיעור 5: גוגל עוד לא יודע שאתה קיים. ככה מזרזים אותו",
        description:
          "שליחת מפת אתר ובקשת אינדוקס ב-Search Console כדי לזרז את הגילוי. הבהרה חשובה: זה לא מבטיח דירוג גבוה, וזה בטח לא מבטיח שמנועי AI יצטטו אותך כבר מחר",
        duration: "2:40",
        videoSrc: "/media/videos/website-lesson-18.mp4",
        thumbnail: "/media/thumbnails/website-lesson-18.jpg",
        activeTask:
          "תיכנס ל-Search Console ותשלח את כתובת מפת האתר שלך בלשונית המתאימה. תיכנס ל״בדיקת כתובת URL״, תבדוק את עמוד הבית שלך ותבקש עבורו אינדוקס.",
        uiGuides: [
          { label: "▶ Google Search Console", href: "https://search.google.com/search-console" },
        ],
      },
    ],
  },
  {
    num: 6,
    title: "האתר חי, ואתה עסוק",
    subtitle: "Update & Maintenance",
    icon: "🔄",
    color: "#a78bfa",
    lessons: [
      {
        slug: "website-lesson-19",
        title: "שיעור 1: לעדכן את האתר בשיחה — כמו לשלוח הודעה לעובד",
        description:
          "הלולאה בת שלושה שלבים לעדכון האתר החי שלך: לתאר את השינוי בעברית פשוטה, ה-AI עורך את הקובץ, ואתה מעלה מחדש באותה גרירה ממודול 5. כולל נוסחת הניסוח שמונעת מה-AI לשנות את כל העיצוב בטעות",
        duration: "2:24",
        videoSrc: "/media/videos/website-lesson-19.mp4",
        thumbnail: "/media/thumbnails/website-lesson-19.jpg",
        activeTask:
          "תבחר עדכון אמיתי אחד שהאתר שלך צריך עכשיו. תכתוב שורה אחת לפי הנוסחה: מה לעדכן, איפה, ואל תיגע בשאר. תשלח ל-AI ותבדוק שהעדכון נכנס נכון. תעלה מחדש, באותה גרירה ממודול 5. תבדוק באתר החי שהשינוי אכן מופיע.",
        uiGuides: [],
      },
      {
        slug: "website-lesson-20",
        title: "שיעור 2: רבע שעה בחודש ששומרת על המקום שלך בגוגל",
        description:
          "צ׳ק ליסט תחזוקה בן ארבעה שלבים: בדיקת חיפושים חדשים ב-Search Console, איתור שאלה שחוזרת על עצמה, הוספת שאלה ותשובה, ומעבר מהיר על האתר. בלי כלים חדשים, רק שימוש חוזר במה שכבר למדת",
        duration: "1:57",
        videoSrc: "/media/videos/website-lesson-20.mp4",
        thumbnail: "/media/thumbnails/website-lesson-20.jpg",
        activeTask:
          "תיכנס ל-Search Console שלך ותבדוק אם יש חיפוש שחוזר על עצמו יותר מפעם אחת. אם כן, תוסיף לו שאלה ותשובה אחת עכשיו. תעבור על האתר בעין, לוודא שכלום לא שבור. תוריד את הצ׳ק ליסט מקישור השיעור — תשתמש בו שוב, כל חודש.",
        uiGuides: [],
      },
      {
        slug: "website-lesson-21",
        title: "שיעור 3: מתי כדאי להפסיק לעשות את זה לבד — והתשובה מפתיעה",
        description:
          "מסגרת הערכה עצמית בת שלוש שאלות שעוזרת להחליט אם להמשיך בעצמך או להעביר את התחזוקה הלאה. סיכום מלא של כל מה שבנית לאורך שישה מודולים, וכניסה לניסיון בבוט האתר של WAO",
        duration: "3:33",
        videoSrc: "/media/videos/website-lesson-21.mp4",
        thumbnail: "/media/thumbnails/website-lesson-21.jpg",
        activeTask:
          "תוריד את דף ההערכה העצמית מקישור השיעור. תענה על שלוש השאלות בכנות מלאה: כמה זמן פנוי יש לך בחודש, כמה בנוח לך עם הכלים, ובאיזה שלב צמיחה העסק שלך נמצא. תראה לאן התשובות שלך מובילות.",
        uiGuides: [],
      },
    ],
  },
];

/** Flat list of all lessons across all modules */
export const WEBSITE_COURSE_LESSONS: WebsiteLesson[] = WEBSITE_COURSE_MODULES.flatMap(
  (m) => m.lessons
);

/**
 * Pinned Module 0 — brand-positioning intro video.
 * NOT part of WEBSITE_COURSE_MODULES / WEBSITE_COURSE_LESSONS: it is not a numbered
 * curriculum lesson, has no prerequisites, and must never shift the module/lesson
 * numbering or the prev/next logic used across modules 1–6. It renders pinned above
 * Module 1 on the course index page and is reachable directly at its own slug.
 */
export const WEBSITE_COURSE_INTRO: WebsiteLesson = {
  slug: "website-lesson-0",
  title: "לפני שנתחיל: מי בעצם מדבר אליך",
  description:
    "לפני השיעור הראשון: היכרות קצרה עם הצוות שמלווה אותך לאורך הקורס, ועם הרעיון שעומד מאחורי WAO — לא סוכנות שיווק, אלא מערכת ההפעלה של העסק הקטן",
  duration: "1:38",
  videoId: "HKb_PIjmQ58",
  thumbnail: "/media/thumbnails/website-lesson-0.jpg",
  activeTask: "",
  uiGuides: [],
};

export function findWebsiteLesson(slug: string): WebsiteLesson | null {
  if (slug === WEBSITE_COURSE_INTRO.slug) return WEBSITE_COURSE_INTRO;
  return WEBSITE_COURSE_LESSONS.find((l) => l.slug === slug) ?? null;
}
