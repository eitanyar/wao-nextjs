// src/data/website-course-data.ts
// Source of truth for the Website Building + AI course.
// Add new lessons here as they are produced and uploaded.

export interface WebsiteLesson {
  slug: string;
  title: string;
  description: string;
  duration: string;
  videoId: string;
  thumbnail: string;
  activeTask: string;
  uiGuides: { label: string; href: string }[];
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
          { label: "▶ box.co.il — רישום ישראלי", href: "https://www.box.co.il" },
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
];

/** Flat list of all lessons across all modules */
export const WEBSITE_COURSE_LESSONS: WebsiteLesson[] = WEBSITE_COURSE_MODULES.flatMap(
  (m) => m.lessons
);

export function findWebsiteLesson(slug: string): WebsiteLesson | null {
  return WEBSITE_COURSE_LESSONS.find((l) => l.slug === slug) ?? null;
}
