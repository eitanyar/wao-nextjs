import type { Metadata } from "next";
import Link from "next/link";
import GT from "@/components/GlossaryTerm";
import LessonGrid from "@/components/LessonGrid";

export const metadata: Metadata = {
  title: "קורס Google My Business חינם — Local SEO 2026",
  description:
    "14 שיעורים לאופטימיזציה של פרופיל Google My Business: קטגוריה נכונה, תמונות, ביקורות, GMB Posts ו-Local Pack. קורס מעשי לעסקים מקומיים.",
  alternates: { canonical: "https://www.wao.co.il/training/google-my-business" },
  openGraph: {
    title: "קורס Google My Business חינם | WAO",
    description: "14 שיעורים — פרופיל GMB, ביקורות, Local Pack ו-NAP Consistency.",
    url: "https://www.wao.co.il/training/google-my-business",
    type: "website",
    locale: "he_IL",
  },
};

const SAME_AS = [
  "https://www.linkedin.com/in/eitan-yariv",
  "https://qa.askpavel.co.il/user/איתן+יריב",
];

interface Lesson {
  num: number;
  title: string;
  desc: string;
  duration: string;
  links: { label: string; href: string }[];
}

const CHAPTERS: {
  num: number;
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  lessons: Lesson[];
}[] = [
  {
    num: 1,
    icon: "🏗️",
    title: "יסודות ו-Setup",
    subtitle: "Foundations & Verification",
    color: "#4ae3b5",
    lessons: [
      {
        num: 1,
        title: "מה זה Google My Business ולמה זה קריטי ב-2026",
        desc: "Local Pack, חיפוש 'ליד' ו-Near Me — הסטטיסטיקות שמסבירות למה GMB הוא ה-ROI הגבוה ביותר לעסק מקומי",
        duration: "18 דקות",
        links: [],
      },
      {
        num: 2,
        title: "פתיחת פרופיל GMB ואימות עסק",
        desc: "שלבי הרישום, שיטות האימות (דואר, טלפון, וידאו) ומה לעשות כשהאימות נכשל",
        duration: "22 דקות",
        links: [
          { label: "▶ פתיחת חשבון GMB", href: "https://www.youtube.com/watch?v=wOktNtP0Rcg" },
          { label: "▶ אימות ו-Setup", href: "https://www.youtube.com/watch?v=By9rN90xkTw" },
        ],
      },
      {
        num: 3,
        title: "מילוי פרופיל מלא — כל שדה שמשפיע על דירוג",
        desc: "שם עסק, כתובת, שעות פעילות, תיאור עסק, אתר, מספר טלפון — למה כל שדה חשוב ומה גוגל עושה עם המידע",
        duration: "28 דקות",
        links: [
          { label: "▶ מילוי פרטים מלא", href: "https://www.youtube.com/watch?v=HwOXFDM6GSs" },
        ],
      },
      {
        num: 4,
        title: "בחירת קטגוריה עיקרית ומשנית — ההחלטה החשובה ביותר",
        desc: "הקטגוריה הראשית היא גורם הדירוג המשפיע ביותר ב-Local Pack. איך לבחור נכון, כמה קטגוריות משניות להוסיף ומתי לשנות",
        duration: "24 דקות",
        links: [],
      },
    ],
  },
  {
    num: 2,
    icon: "📸",
    title: "תוכן ואופטימיזציה",
    subtitle: "Content & Profile Optimization",
    color: "#a78bfa",
    lessons: [
      {
        num: 5,
        title: "תמונות וידאו — כמה, מה ומתי לעדכן",
        desc: "פרופילים עם 100+ תמונות מקבלים 520% יותר שיחות. איך לצלם, אילו תמונות לעלות ובאיזו תדירות",
        duration: "26 דקות",
        links: [],
      },
      {
        num: 6,
        title: "GMB Posts — עדכונים שגוגל אוהב לקדם",
        desc: "סוגי הפוסטים (אירועים, מבצעים, עדכונים), כיצד לכתוב, תדירות מומלצת ו-CTA שמביאים קליקים",
        duration: "21 דקות",
        links: [],
      },
      {
        num: 7,
        title: "שאלות ותשובות — Q&A Section",
        desc: "הסכנה הגדולה: מישהו אחר עונה על השאלות. איך להשתלט על ה-Q&A, לשתול שאלות נכונות ולמנוע נזק מידע שגוי",
        duration: "19 דקות",
        links: [],
      },
      {
        num: 8,
        title: "מוצרים ושירותים — הרשימות שרוב העסקים מדלגים עליהן",
        desc: "הוספת מוצרים ושירותים לפרופיל GMB מוסיפה תוכן עשיר שגוגל מציג ישירות בלוח הבקרה. 80% מהעסקים לא ממלאים אותן",
        duration: "23 דקות",
        links: [],
      },
    ],
  },
  {
    num: 3,
    icon: "⭐",
    title: "ביקורות ואמינות",
    subtitle: "Reviews & Trust Building",
    color: "#f59e0b",
    lessons: [
      {
        num: 9,
        title: "אסטרטגיית ביקורות — איך לקבל יותר ביקורות אמיתיות",
        desc: "הטקטיקות שעובדות: Timing נכון, Shortlink ישיר לביקורת, Follow-up אוטומטי — ובלי להפר את תנאי גוגל",
        duration: "31 דקות",
        links: [],
      },
      {
        num: 10,
        title: "תגובה לביקורות — חיוביות ושליליות",
        desc: "נוסחאות לתגובה שמחזקות E-E-A-T, מתי לענות, איך לשלב מילות מפתח בתגובות מבלי להיראות ספאמי",
        duration: "25 דקות",
        links: [],
      },
      {
        num: 11,
        title: "ניהול משבר — ביקורת שלילית קשה",
        desc: "ביקורת 1 כוכב, תוכן שקרי, פגיעה בתדמית — מה עושים, מה מסירים ומה לא לעשות לעולם",
        duration: "27 דקות",
        links: [],
      },
    ],
  },
  {
    num: 4,
    icon: "📊",
    title: "Local SEO ומדידה",
    subtitle: "Local Pack Ranking & Analytics",
    color: "#10b981",
    lessons: [
      {
        num: 12,
        title: "Local Pack — גורמי הדירוג ב-3-Pack של גוגל",
        desc: "Proximity, Relevance, Prominence — שלושת הגורמים שקובעים מי מופיע. מה ניתן לשפר ומה לא",
        duration: "33 דקות",
        links: [],
      },
      {
        num: 13,
        title: "NAP Consistency — עקביות שם, כתובת וטלפון",
        desc: "גוגל מאמת את פרטי העסק מעשרות מקורות ברחבי הרשת. פערים ב-NAP = ירידה בדירוג. איך לבדוק ולתקן",
        duration: "28 דקות",
        links: [],
      },
      {
        num: 14,
        title: "Google Business Insights — מדידה והחלטות",
        desc: "חיפושים ישירים vs גילוי, Calls, Direction Requests, Website Clicks — איך לקרוא את הנתונים ומה לשנות",
        duration: "22 דקות",
        links: [],
      },
    ],
  },
];

const MISTAKES = [
  {
    num: "01",
    icon: "📋",
    title: "פרופיל חלקי — רוב העסקים ממלאים פחות מ-60% מהשדות",
    body: "גוגל מדרגת פרופילים לפי שלמות. פרופיל מלא = יותר נתונים לגוגל = דירוג גבוה יותר ב-Local Pack. שעות פעילות, תיאור, מוצרים, שירותים — כל שדה ריק הוא הזדמנות שנאבדת.",
  },
  {
    num: "02",
    icon: "🏷️",
    title: "קטגוריה שגויה — הגורם הכי משפיע שרוב העסקים לא מכירים",
    body: "הקטגוריה הראשית היא גורם הדירוג המשפיע ביותר ב-Local Pack — לפני ביקורות, לפני קישורים. עסק שבחר 'שירותי שיפוץ' במקום 'קבלן שיפוצים' מפסיד מאות חיפושים בחודש.",
  },
  {
    num: "03",
    icon: "📸",
    title: "תמונות ישנות ולא מספיקות — הרושם הראשון נקבע בשנייה",
    body: "פרופילים עם 100+ תמונות מקבלים 520% יותר שיחות ממתחרים עם 10 תמונות. תמונות חיצוניות, פנימיות, צוות, מוצרים — וחייבים להוסיף חדשות באופן שוטף.",
  },
  {
    num: "04",
    icon: "💬",
    title: "לא מגיבים לביקורות — איתות שלילי לגוגל ולגולשים",
    body: "תגובה לביקורות היא גורם דירוג מאומת. עסקים שמגיבים לכל ביקורת (חיובית ושלילית) נראים אמינים יותר לגוגל ולגולשים. 80% מהעסקים לא מגיבים לביקורות חיוביות.",
  },
  {
    num: "05",
    icon: "📍",
    title: "NAP לא עקבי — גוגל לא יודע איפה אתם",
    body: "גוגל מאמת את שם העסק, כתובת ומספר הטלפון מ-Yelp, Zap, וכל ספרייה עסקית אחרת. כתובת שונה ב-Zap מה-GMB = ספק = ירידה בדירוג.",
  },
];

export default function GoogleMyBusinessCourse() {
  const canonical = "https://www.wao.co.il/training/google-my-business";
  const totalLessons = CHAPTERS.flatMap((c) => c.lessons).length;

  const personNode = {
    "@type": "Person",
    "@id": "https://www.wao.co.il/about#person",
    name: "איתן יריב",
    jobTitle: "מומחה שיווק דיגיטלי ו-Local SEO",
    url: "https://www.wao.co.il/about",
    sameAs: SAME_AS,
    worksFor: { "@type": "Organization", "@id": "https://www.wao.co.il/#org" },
  };

  const videoSchemas = [
    { id: "lesson-2-v1", name: "שיעור 2: פתיחת חשבון Google My Business", vid: "wOktNtP0Rcg" },
    { id: "lesson-2-v2", name: "שיעור 2: אימות ו-Setup", vid: "By9rN90xkTw" },
    { id: "lesson-3-v1", name: "שיעור 3: מילוי פרטי פרופיל מלא", vid: "HwOXFDM6GSs" },
  ].map((v) => ({
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "@id": `${canonical}#${v.id}`,
    name: v.name,
    description: "קורס Google My Business — Local SEO 2026 | WAO",
    thumbnailUrl: "https://www.wao.co.il/og-gmb.jpg",
    uploadDate: "2024-01-01",
    url: `https://www.youtube.com/watch?v=${v.vid}`,
    embedUrl: `https://www.youtube.com/embed/${v.vid}`,
    isPartOf: { "@id": `${canonical}#course` },
    inLanguage: "he",
  }));

  const courseSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": `${canonical}#course`,
    name: "קורס Google My Business — Local SEO 2026",
    description: "14 שיעורים לאופטימיזציה של פרופיל Google My Business: קטגוריה, תמונות, ביקורות, Posts ו-Local Pack.",
    url: canonical,
    inLanguage: "he",
    isAccessibleForFree: true,
    provider: { "@type": "Organization", "@id": "https://www.wao.co.il/#org", name: "WAO" },
    instructor: personNode,
    numberOfCredits: totalLessons,
    hasCourseInstance: { "@type": "CourseInstance", courseMode: "online", instructor: personNode },
    educationalLevel: "Beginner",
    teaches: [
      "Google My Business Profile Optimization",
      "Local Pack Ranking Factors",
      "Review Strategy",
      "NAP Consistency",
      "GMB Posts & Q&A",
      "Google Business Insights",
    ],
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: "https://www.wao.co.il" },
      { "@type": "ListItem", position: 2, name: "הכשרות", item: "https://www.wao.co.il/training" },
      { "@type": "ListItem", position: 3, name: "קורס Google My Business", item: canonical },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {videoSchemas.map((v) => (
        <script key={v["@id"]} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(v) }} />
      ))}

      <StaticCourse totalLessons={totalLessons} />
    </>
  );
}

// ── Lesson card ────────────────────────────────────────────────────────────────

function LessonCard({ lesson, chColor }: { lesson: Lesson; chColor: string }) {
  return (
    <div style={{ background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 22px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
      <div style={{ flexShrink: 0, width: "36px", height: "36px", borderRadius: "10px", background: `${chColor}12`, border: `1px solid ${chColor}25`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-rubik), sans-serif", fontWeight: 800, fontSize: "0.8rem", color: chColor }}>
        {lesson.num}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "var(--text)", marginBottom: "5px", lineHeight: 1.3 }}>
          {lesson.title}
        </div>
        <div style={{ color: "var(--muted)", fontSize: "0.82rem", lineHeight: 1.6, fontFamily: "var(--font-body), sans-serif", marginBottom: "12px" }}>
          {lesson.desc}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", display: "flex", alignItems: "center", gap: "4px" }}>
            <span aria-hidden>⏱</span> {lesson.duration}
          </span>
          {lesson.links.length > 0 ? (
            lesson.links.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.72rem", fontWeight: 600, padding: "3px 10px", borderRadius: "var(--radius-pill)", background: "rgba(74,227,181,0.1)", color: "var(--accent)", border: "1px solid rgba(74,227,181,0.25)", fontFamily: "var(--font-body), sans-serif", textDecoration: "none" }}>
                {link.label}
              </a>
            ))
          ) : (
            <span style={{ fontSize: "0.68rem", fontWeight: 600, padding: "3px 10px", borderRadius: "var(--radius-pill)", background: "rgba(255,255,255,0.04)", color: "var(--muted)", border: "1px solid var(--border)", fontFamily: "var(--font-body), sans-serif" }}>
              בקרוב
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Static fallback ────────────────────────────────────────────────────────────

function StaticCourse({ totalLessons }: { totalLessons: number }) {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: "clamp(110px,14vw,160px)", paddingBottom: "clamp(56px,7vw,88px)", position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "90vw", height: "65vh", background: "radial-gradient(ellipse at center, rgba(74,227,181,0.07) 0%, transparent 68%)", pointerEvents: "none" }} />
        <div className="hero-grid" />
        <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "800px" }}>
          <nav aria-label="breadcrumb" className="breadcrumb">
            <Link href="/">דף הבית</Link>
            <span className="breadcrumb-sep" aria-hidden>›</span>
            <Link href="/training">הכשרות</Link>
            <span className="breadcrumb-sep" aria-hidden>›</span>
            <span aria-current="page">קורס Google My Business</span>
          </nav>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "24px", marginTop: "16px" }}>
            <span className="badge"><span className="badge-dot" />3 שיעורים זמינים</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "var(--radius-pill)", fontSize: "0.78rem", fontWeight: 600, background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)", fontFamily: "var(--font-body), sans-serif" }}>
              {totalLessons} שיעורים
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "var(--radius-pill)", fontSize: "0.78rem", fontWeight: 600, background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)", fontFamily: "var(--font-body), sans-serif" }}>
              Local SEO
            </span>
          </div>

          <h1 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(2rem,4.5vw,3.2rem)", lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "0" }}>
            קורס <span className="text-gradient">Google My Business</span>
            <br />
            <span style={{ fontSize: "clamp(1.2rem,2.5vw,1.8rem)", fontWeight: 700, color: "var(--muted)" }}>
              Local SEO — לידים מקומיים בלי לשלם לגוגל
            </span>
          </h1>

          {/* Glassmorphism AI Summary */}
          <div role="note" aria-label="AI Executive Summary" data-ai-summary="true" style={{ marginTop: "32px", marginBottom: "36px", padding: "24px 28px", borderRadius: "16px", background: "rgba(255,255,255,0.03)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(74,227,181,0.2)", boxShadow: "0 0 40px rgba(74,227,181,0.05), inset 0 1px 0 rgba(255,255,255,0.06)", position: "relative", overflow: "hidden" }}>
            <div aria-hidden style={{ position: "absolute", top: 0, right: 0, width: "200px", height: "200px", background: "radial-gradient(ellipse at top right, rgba(74,227,181,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <span style={{ fontSize: "1rem" }}>✦</span>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif" }}>
                בקצרה — Local SEO ב-2026
              </span>
            </div>
            <p style={{ color: "var(--text)", lineHeight: 1.75, fontSize: "0.95rem", fontFamily: "var(--font-body), sans-serif", margin: 0 }}>
              40% מהקליקים בחיפושים מקומיים הולכים לתוצאות ה-<GT term="Local Pack">Local Pack</GT> — שלושת העסקים על המפה.{" "}
              <strong style={{ color: "var(--accent)" }}>פרופיל GMB מאופטמז הוא ה-<GT term="ROI">ROI</GT> הגבוה ביותר לעסק מקומי: ללא תשלום לגוגל על קליק, ללא תקציב פרסום.</strong>{" "}
              הקורס מכסה את 14 הפעולות שמכניסות אתכם ל-3-Pack.
            </p>
          </div>

          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <a href="#curriculum" className="btn-primary">📚 לתוכנית הלימודים</a>
            <a href="tel:0526148860" className="btn-outline">📞 ייעוץ Local SEO</a>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(40px,5vw,56px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="wao-container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "28px", textAlign: "center" }}>
            {[
              { val: String(totalLessons), label: "שיעורים" },
              { val: "4", label: "פרקים" },
              { val: "40%", label: "קליקים ל-Local Pack" },
              { val: "חינם", label: "לצפייה" },
            ].map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.8rem,3vw,2.6rem)", color: "var(--accent)", lineHeight: 1 }}>{s.val}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "6px", fontFamily: "var(--font-body), sans-serif" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5 Mistakes ───────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(64px,8vw,96px) 0" }}>
        <div className="wao-container" style={{ maxWidth: "800px" }}>
          <div style={{ marginBottom: "40px" }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#f59e0b", fontFamily: "var(--font-body), sans-serif", marginBottom: "10px" }}>
              preview — שיעורים 1–4
            </p>
            <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.5rem,2.8vw,2.1rem)", letterSpacing: "-0.02em", marginBottom: "8px" }}>
              5 טעויות GMB שגורמות ללידים{" "}
              <span className="text-gradient">ללכת למתחרה</span>
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.7, fontFamily: "var(--font-body), sans-serif" }}>
              מניסיון עם מאות עסקים ישראלים — אלה הטעויות שחוזרות שוב ושוב.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {MISTAKES.map((m) => (
              <div key={m.num} style={{ background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 24px", display: "flex", gap: "20px", alignItems: "flex-start" }}>
                <div style={{ flexShrink: 0, width: "44px", height: "44px", borderRadius: "12px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>
                  {m.icon}
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.97rem", marginBottom: "6px", color: "var(--text)" }}>
                    <span style={{ color: "#f59e0b", marginLeft: "6px" }}>#{m.num}</span>
                    {m.title}
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: "0.88rem", lineHeight: 1.7, fontFamily: "var(--font-body), sans-serif" }}>{m.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Curriculum ───────────────────────────────────────────────────── */}
      <section id="curriculum" style={{ padding: "clamp(72px,9vw,104px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)" }}>
        <div className="wao-container">
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif", marginBottom: "12px" }}>
              תוכנית הלימודים
            </p>
            <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.7rem,3.2vw,2.5rem)", letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: "16px" }}>
              4 פרקים · {totalLessons} שיעורים ·{" "}
              <span className="text-gradient">Local Pack</span>
            </h2>
          </div>

          {CHAPTERS.map((ch) => (
            <div key={ch.num} style={{ marginBottom: "56px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px", paddingBottom: "20px", borderBottom: `2px solid ${ch.color}30`, flexWrap: "wrap" }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: `${ch.color}15`, border: `1px solid ${ch.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0 }}>
                  {ch.icon}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", color: ch.color, fontFamily: "var(--font-body), sans-serif" }}>פרק {ch.num}</span>
                    <span style={{ fontSize: "0.65rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>{ch.subtitle}</span>
                  </div>
                  <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 800, fontSize: "clamp(1.1rem,2vw,1.4rem)", color: "var(--text)", margin: 0 }}>
                    {ch.title}
                  </h3>
                </div>
                <span style={{ marginRight: "auto", fontSize: "0.72rem", padding: "4px 10px", borderRadius: "var(--radius-pill)", background: `${ch.color}15`, color: ch.color, border: `1px solid ${ch.color}30`, fontWeight: 600, fontFamily: "var(--font-body), sans-serif", whiteSpace: "nowrap" }}>
                  {ch.lessons.length} שיעורים
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "14px" }}>
                {ch.lessons.map((lesson) => (
                  <LessonCard key={lesson.num} lesson={lesson} chColor={ch.color} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why Local Pack matters ────────────────────────────────────────── */}
      <section style={{ padding: "clamp(56px,7vw,80px) 0", borderTop: "1px solid var(--border)" }}>
        <div className="wao-container" style={{ maxWidth: "780px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "32px", alignItems: "start" }}>
            <div style={{ width: "80px", height: "80px", borderRadius: "20px", background: "rgba(74,227,181,0.08)", border: "1px solid rgba(74,227,181,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", flexShrink: 0 }}>
              📍
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif", marginBottom: "10px" }}>
                למה GMB זה ה-ROI הגבוה ביותר
              </div>
              <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.3rem,2.5vw,1.8rem)", lineHeight: 1.2, marginBottom: "16px" }}>
                3 תוצאות על המפה — 40% מכל הקליקים
              </h3>
              <p style={{ color: "var(--muted)", lineHeight: 1.8, fontSize: "0.95rem", fontFamily: "var(--font-body), sans-serif", margin: 0 }}>
                כשמישהו בתל אביב מחפש "שיפוצניק קרוב אליי" או "רופא שיניים בראשון לציון" — הוא לא גולל לתוצאות האורגניות.
                הוא לוחץ על אחד מ-3 העסקים ב-<GT term="Local Pack">Local Pack</GT>.{" "}
                <strong style={{ color: "var(--text)" }}>כל קליק הוא חינם.</strong>{" "}
                אין <GT term="CPC">CPC</GT>, אין תקציב יומי, אין <GT term="Smart Bidding">Smart Bidding</GT> — רק פרופיל GMB שעובד.
                הקורס הזה הוא המפת דרכים להיות אחד מ-3 העסקים האלה.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mentorship offer ─────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(64px,8vw,96px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)" }}>
        <div className="wao-container" style={{ maxWidth: "680px" }}>
          <div style={{ borderRadius: "20px", padding: "clamp(32px,4vw,48px)", background: "rgba(255,255,255,0.02)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(74,227,181,0.25)", boxShadow: "0 0 60px rgba(74,227,181,0.07), inset 0 1px 0 rgba(255,255,255,0.05)", position: "relative", overflow: "hidden", textAlign: "center" }}>
            <div aria-hidden style={{ position: "absolute", top: "-40px", left: "50%", transform: "translateX(-50%)", width: "300px", height: "300px", background: "radial-gradient(ellipse, rgba(74,227,181,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "16px" }}>🎓</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif", marginBottom: "12px" }}>
                מנטורינג אישי
              </div>
              <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.5rem,2.8vw,2.2rem)", letterSpacing: "-0.02em", marginBottom: "8px" }}>
                רוצים מישהו שיעשה את זה{" "}
                <span className="text-gradient">בשבילכם?</span>
              </h2>
              <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(2rem,4vw,2.8rem)", color: "var(--accent)", lineHeight: 1, marginBottom: "4px" }}>
                950 ₪
              </div>
              <div style={{ color: "var(--muted)", fontSize: "0.85rem", fontFamily: "var(--font-body), sans-serif", marginBottom: "20px" }}>
                לחודש + מע&quot;מ · ללא חוזה
              </div>
              <p style={{ color: "var(--muted)", lineHeight: 1.75, fontSize: "0.92rem", fontFamily: "var(--font-body), sans-serif", marginBottom: "24px" }}>
                Zoom חי עם איתן יריב — ניתוח הפרופיל שלכם, תוכנית פעולה מותאמת, מעקב חודשי.
                מתאים גם לעסקים שמשלבים GMB עם Google Ads.
              </p>
              <div style={{ background: "rgba(74,227,181,0.06)", border: "1px solid rgba(74,227,181,0.2)", borderRadius: "12px", padding: "14px 20px", marginBottom: "24px", fontSize: "0.87rem", fontFamily: "var(--font-body), sans-serif", color: "var(--text)", lineHeight: 1.65 }}>
                <strong style={{ color: "var(--accent)" }}>ערבות תוצאות 150 יום:</strong>{" "}
                שיפור מדיד ב-Local Pack — או החזר מלא.
              </div>
              <a href="tel:0526148860" className="btn-primary" style={{ display: "inline-flex", gap: "8px", alignItems: "center", justifyContent: "center", width: "100%", maxWidth: "320px" }}>
                📞 שיחת היכרות — ללא עלות
              </a>
            </div>
          </div>
        </div>
      </section>

      <LessonGrid courseKey="/training/google-my-business" courseSlug="google-my-business" heading="כל השיעורים בקורס Google My Business" />

      {/* ── Author bio ───────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(64px,8vw,80px) 0" }} aria-labelledby="author-heading" itemScope itemType="https://schema.org/Person">
        <div className="wao-container" style={{ maxWidth: "760px" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "20px" }} id="author-heading">
            הסמכות המקצועית
          </div>
          <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div aria-hidden style={{ width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "1.4rem", color: "var(--bg)", flexShrink: 0, border: "2px solid var(--accent-border)" }}>
              א.י
            </div>
            <div style={{ flex: 1, minWidth: "220px" }}>
              <div itemProp="name" style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 800, fontSize: "1.15rem", marginBottom: "4px" }}>
                איתן יריב
              </div>
              <div itemProp="jobTitle" style={{ color: "var(--muted)", fontSize: "0.85rem", fontFamily: "var(--font-body), sans-serif", marginBottom: "12px" }}>
                מומחה שיווק דיגיטלי ו-Local SEO | מייסד WAO | 20+ שנות ניסיון
              </div>
              <p itemProp="description" style={{ color: "var(--muted)", lineHeight: 1.75, fontSize: "0.93rem", fontFamily: "var(--font-body), sans-serif", marginBottom: "16px" }}>
                ליוויתי מאות עסקים מקומיים בישראל — מחנות בודדת ועד רשת סניפים — בבניית נוכחות מקומית חזקה.
                Google My Business הוא לעתים קרובות ההשקעה עם ה-<GT term="ROI">ROI</GT> הגבוה ביותר שאני רואה בשטח.
              </p>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <a href="https://www.linkedin.com/in/eitan-yariv" target="_blank" rel="noopener noreferrer" itemProp="sameAs" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn
                </a>
                <Link href="/about" style={{ fontSize: "0.82rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                  קראו עוד →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(56px,7vw,80px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)" }}>
        <div className="wao-container" style={{ textAlign: "center", maxWidth: "560px" }}>
          <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.5rem,2.8vw,2.1rem)", letterSpacing: "-0.02em", marginBottom: "16px" }}>
            רוצים להיות בשלושת הראשונים?
          </h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.75, fontFamily: "var(--font-body), sans-serif", marginBottom: "28px" }}>
            השאירו פרטים ונעדכן אתכם כשהקורס עולה — או שנדבר עכשיו על ייעוץ GMB אישי.
          </p>
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="tel:0526148860" className="btn-primary">📞 דברו איתנו</a>
            <Link href="/contact" className="btn-outline">עדכנו אותי</Link>
          </div>
        </div>
      </section>
    </>
  );
}
