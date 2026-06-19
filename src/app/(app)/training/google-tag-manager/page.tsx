import type { Metadata } from "next";
import { renderMixed } from "@/lib/bidi";
import Link from "next/link";
import GT from "@/components/GlossaryTerm";
import LessonGrid from "@/components/LessonGrid";

export const metadata: Metadata = {
  title: "קורס Google Tag Manager חינם — לפרסומאים ב-2026",
  description:
    "11 שיעורי וידאו חינמיים: Conversion Tracking, מעקב קליקי טלפון, Exit Intent, Scroll Tracking, Cookie ו-Dynamic Content — ללא קוד. GTM לפרסומאים.",
  alternates: { canonical: "https://www.wao.co.il/training/google-tag-manager" },
  openGraph: {
    title: "קורס Google Tag Manager חינם | WAO",
    description: "11 שיעורים — Tracking, DOM Manipulation, Triggers ו-Cookies. GTM לפרסומאים.",
    url: "https://www.wao.co.il/training/google-tag-manager",
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
  num: number; icon: string; title: string; subtitle: string; color: string; lessons: Lesson[];
}[] = [
  {
    num: 1,
    icon: "🏷️",
    title: "מעקב וניתוח",
    subtitle: "Tracking & Analytics",
    color: "#4ae3b5",
    lessons: [
      {
        num: 1,
        title: "מעקב קליקים על טלפון",
        desc: "הגדרת Tag למעקב על כל קליק על מספר טלפון באתר — Track Phone Clicks with GTM. הבסיס לכל חשבון Google Ads שרוצה למדוד שיחות.",
        duration: "15 דקות",
        links: [{ label: "▶ מעקב קליקי טלפון", href: "https://www.youtube.com/watch?v=BwqdsliRxf4" }],
      },
      {
        num: 2,
        title: "מעקב גלילה (Scroll Tracking)",
        desc: "יצירת Scroll Depth trigger שמאפשר לדעת כמה אחוז מהדף הגולש גלל — ומה הוא ראה לפני שעזב. מפתח לאופטימיזציה של Landing Pages.",
        duration: "18 דקות",
        links: [{ label: "▶ Scroll Tracking", href: "https://www.youtube.com/watch?v=G0OLVjwlDKI" }],
      },
      {
        num: 3,
        title: "זיהוי Exit Intent",
        desc: "זיהוי גולש שעומד לעזוב את הדף לפני שהוא עושה זאת. הבסיס לפופ-אפ חכם של \"רגע לפני שאתה הולך\" — לא מציק, אפקטיבי.",
        duration: "14 דקות",
        links: [{ label: "▶ Exit Intent", href: "https://www.youtube.com/watch?v=BI_QdOzk4Cw" }],
      },
    ],
  },
  {
    num: 2,
    icon: "⚡",
    title: "שינוי תוכן דינמי",
    subtitle: "Dynamic DOM Manipulation",
    color: "#a78bfa",
    lessons: [
      {
        num: 4,
        title: "החלפת H1 לפי מילת מפתח",
        desc: "שינוי כותרת H1 בדף בהתאם למילת המפתח שהגולש הגיע ממנה מ-Google Ads — Message Match מושלם שמשפר Quality Score ואחוזי המרה.",
        duration: "20 דקות",
        links: [{ label: "▶ H1 דינמי", href: "https://www.youtube.com/watch?v=PgEUnSSUoBE" }],
      },
      {
        num: 5,
        title: "החלפת טקסט כללי באתר",
        desc: "שינוי כל טקסט באתר דינמית מ-GTM — CTA, כותרות משנה ותוכן לפי פרמטרי URL. ללא קוד, ללא מפתח.",
        duration: "16 דקות",
        links: [{ label: "▶ החלפת טקסט", href: "https://www.youtube.com/watch?v=T3KkOP8T4P0" }],
      },
      {
        num: 6,
        title: "שינוי ערכי שדות חבויים בטפסים",
        desc: "הטמעת ערכים נסתרים בטפסי יצירת קשר לפי מקור תנועה — ידיעת מאיזה קמפיין/מילת מפתח הגיע כל ליד, ישירות ב-CRM.",
        duration: "22 דקות",
        links: [{ label: "▶ שדות חבויים", href: "https://www.youtube.com/watch?v=BpBuIk0g-cU" }],
      },
    ],
  },
  {
    num: 3,
    icon: "⚙️",
    title: "טריגרים, משתנים ו-Cookies",
    subtitle: "Triggers, Variables & Cookies",
    color: "#f59e0b",
    lessons: [
      {
        num: 7,
        title: "טריגר לפי שעות היום",
        desc: "Trigger שמפעיל תג רק בשעות פעילות העסק — לדוגמה הצגת מספר טלפון רק כשיש מי שיענה. Custom JavaScript Variable.",
        duration: "19 דקות",
        links: [{ label: "▶ טריגר לפי שעות", href: "https://www.youtube.com/watch?v=XEjBShqGU0w" }],
      },
      {
        num: 8,
        title: "יצירת Cookie עם GTM",
        desc: "שמירת מקור תנועה בין דפים, זיהוי Returning Visitors ושמירת פרמטרים — ללא קוד, ללא מפתח. Cookie פשוט מ-GTM.",
        duration: "25 דקות",
        links: [{ label: "▶ Cookie ב-GTM", href: "https://www.youtube.com/watch?v=gcCPpuqWQno" }],
      },
    ],
  },
  {
    num: 4,
    icon: "🛡️",
    title: "UX והגנה",
    subtitle: "UX Enhancement & Protection",
    color: "#10b981",
    lessons: [
      {
        num: 9,
        title: "כפתור Click-to-Call",
        desc: "הוספת כפתור התקשרות לאתר באמצעות GTM — בלי לגעת בקוד. מומלץ לכל עסק שמקבל פניות בטלפון.",
        duration: "17 דקות",
        links: [{ label: "▶ Click-to-Call", href: "https://www.youtube.com/watch?v=kmN6PEBG9iQ" }],
      },
      {
        num: 10,
        title: "הסתרת אלמנטים בדף",
        desc: "הסתרת חלקים מהדף עם GTM — לדוגמה הסתרת כפתור \"התקשרו\" מחוץ לשעות הפעילות, או הסתרת בנרים למשתמשים מסוגים מסוימים.",
        duration: "15 דקות",
        links: [{ label: "▶ הסתרת אלמנטים", href: "https://www.youtube.com/watch?v=zXrwVYsR9bk" }],
      },
      {
        num: 11,
        title: "מניעת העתקת תוכן",
        desc: "חסימת Copy-Paste מהאתר באמצעות GTM — בלי פלאגין, בלי קוד. מגן על תוכן מקורי שהשקעתם בכתיבתו.",
        duration: "13 דקות",
        links: [{ label: "▶ מניעת העתקה", href: "https://www.youtube.com/watch?v=mstTYu094iM" }],
      },
    ],
  },
];

export default function GTMCourse() {
  const canonical    = "https://www.wao.co.il/training/google-tag-manager";
  const totalLessons = CHAPTERS.flatMap((c) => c.lessons).length;

  const personNode = {
    "@type": "Person", "@id": "https://www.wao.co.il/about#person",
    name: "איתן יריב", jobTitle: "מומחה Google Ads ו-GTM",
    url: "https://www.wao.co.il/about", sameAs: SAME_AS,
    worksFor: { "@type": "Organization", "@id": "https://www.wao.co.il/#org" },
  };

  const videoObjects = CHAPTERS.flatMap((ch) =>
    ch.lessons.flatMap((lesson) =>
      lesson.links.map((link, li) => ({
        "@context": "https://schema.org", "@type": "VideoObject",
        "@id": `${canonical}#lesson-${lesson.num}-v${li + 1}`,
        name: `שיעור ${lesson.num}: ${lesson.title}`,
        description: lesson.desc,
        thumbnailUrl: "https://www.wao.co.il/og-gtm.jpg",
        uploadDate: "2019-01-01",
        url: link.href,
        embedUrl: link.href.replace("watch?v=", "embed/"),
        isPartOf: { "@id": `${canonical}#course` },
        inLanguage: "he",
      }))
    )
  );

  const courseSchema = {
    "@context": "https://schema.org", "@type": "Course",
    "@id": `${canonical}#course`,
    name: "קורס Google Tag Manager — לפרסומאים ב-2026",
    description: "11 שיעורי וידאו חינמיים: Conversion Tracking, מעקב גלילה, Exit Intent, Dynamic Content ו-Cookies — ללא קוד.",
    url: canonical, inLanguage: "he", isAccessibleForFree: true,
    provider: { "@type": "Organization", "@id": "https://www.wao.co.il/#org", name: "WAO" },
    instructor: personNode, numberOfCredits: totalLessons,
    hasCourseInstance: { "@type": "CourseInstance", courseMode: "online", instructor: personNode },
    educationalLevel: "Beginner to Intermediate",
    teaches: ["Google Tag Manager", "Conversion Tracking", "Scroll Tracking", "Exit Intent", "Dynamic Content"],
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית",   item: "https://www.wao.co.il" },
      { "@type": "ListItem", position: 2, name: "הכשרות",     item: "https://www.wao.co.il/training" },
      { "@type": "ListItem", position: 3, name: "קורס GTM",   item: canonical },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {videoObjects.map((vo) => (
        <script key={vo["@id"]} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(vo) }} />
      ))}

      <StaticCourse totalLessons={totalLessons} />
    </>
  );
}

function LessonCard({ lesson, chColor }: { lesson: Lesson; chColor: string }) {
  return (
    <div style={{ background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 22px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
      <div style={{ flexShrink: 0, width: "36px", height: "36px", borderRadius: "10px", background: `${chColor}12`, border: `1px solid ${chColor}25`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-rubik), sans-serif", fontWeight: 800, fontSize: "0.8rem", color: chColor }}>
        {lesson.num}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "var(--text)", marginBottom: "5px", lineHeight: 1.3 }}>{lesson.title}</div>
        <div style={{ color: "var(--muted)", fontSize: "0.82rem", lineHeight: 1.6, fontFamily: "var(--font-body), sans-serif", marginBottom: "12px" }}>{lesson.desc}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", display: "flex", alignItems: "center", gap: "4px" }}>
            <span aria-hidden>⏱</span> {lesson.duration}
          </span>
          {lesson.links.map((link) => (
            <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.72rem", fontWeight: 600, padding: "3px 10px", borderRadius: "var(--radius-pill)", background: "rgba(74,227,181,0.1)", color: "var(--accent)", border: "1px solid rgba(74,227,181,0.25)", fontFamily: "var(--font-body), sans-serif", textDecoration: "none" }}>
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function StaticCourse({ totalLessons }: { totalLessons: number }) {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: "clamp(110px,14vw,160px)", paddingBottom: "clamp(56px,7vw,88px)", position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "90vw", height: "65vh", background: "radial-gradient(ellipse at center, rgba(74,227,181,0.07) 0%, transparent 68%)", pointerEvents: "none" }} />
        <div className="hero-grid" />
        <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "800px" }}>
          <nav aria-label="breadcrumb" className="breadcrumb">
            <Link href="/">דף הבית</Link><span className="breadcrumb-sep" aria-hidden>›</span>
            <Link href="/training">הכשרות</Link><span className="breadcrumb-sep" aria-hidden>›</span>
            <span aria-current="page">קורס Google Tag Manager</span>
          </nav>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "24px", marginTop: "16px" }}>
            <span className="badge"><span className="badge-dot" />חינם · {totalLessons} שיעורים עם וידאו</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "var(--radius-pill)", fontSize: "0.78rem", fontWeight: 600, background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)", fontFamily: "var(--font-body), sans-serif" }}>ללא קוד</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(2rem,4.5vw,3.2rem)", lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "0" }}>
            קורס <span className="text-gradient">Google Tag Manager</span>
            <br />
            <span style={{ fontSize: "clamp(1.2rem,2.5vw,1.8rem)", fontWeight: 700, color: "var(--muted)" }}>לפרסומאים — ללא קוד, ללא מפתח</span>
          </h1>

          <div role="note" aria-label="ב-קצרה" data-ai-summary="true" style={{ marginTop: "32px", marginBottom: "36px", padding: "24px 28px", borderRadius: "16px", background: "rgba(255,255,255,0.03)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(74,227,181,0.2)", boxShadow: "0 0 40px rgba(74,227,181,0.05), inset 0 1px 0 rgba(255,255,255,0.06)", position: "relative" }}>
            <div aria-hidden style={{ position: "absolute", top: 0, right: 0, width: "200px", height: "200px", background: "radial-gradient(ellipse at top right, rgba(74,227,181,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <span>✦</span>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif" }}>בקצרה</span>
            </div>
            <p style={{ color: "var(--text)", lineHeight: 1.75, fontSize: "0.95rem", fontFamily: "var(--font-body), sans-serif", margin: 0 }}>
              Google Tag Manager מאפשר לפרסומאים להטמיע Tracking, לשנות תוכן דינמי ולבנות אוטומציות בלי לגעת בקוד.{" "}
              <strong style={{ color: "var(--accent)" }}>לפני שמוציאים שקל ב-Google Ads — GTM הוא הכלי שמבטיח שתדעו מה עובד ומה לא.</strong>
            </p>
          </div>

          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <a href="#curriculum" className="btn-primary">📚 לתוכנית הלימודים</a>
            <Link href="/training/google-ads-course" className="btn-outline">← קורס Google Ads</Link>
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(40px,5vw,56px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="wao-container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "28px", textAlign: "center" }}>
            {[{ val: String(totalLessons), label: "שיעורים עם וידאו" }, { val: "4", label: "פרקים" }, { val: "ללא קוד", label: "נדרש" }, { val: "חינם", label: "לצפייה" }].map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.8rem,3vw,2.4rem)", color: "var(--accent)", lineHeight: 1 }}>{s.val}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "6px", fontFamily: "var(--font-body), sans-serif" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why GTM first ─────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(56px,7vw,80px) 0" }}>
        <div className="wao-container" style={{ maxWidth: "760px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "28px", alignItems: "start" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "18px", background: "rgba(74,227,181,0.08)", border: "1px solid rgba(74,227,181,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", flexShrink: 0 }}>🏷️</div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif", marginBottom: "10px" }}>למה GTM קודם ל-Google Ads?</div>
              <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.3rem,2.5vw,1.8rem)", lineHeight: 1.2, marginBottom: "16px" }}>
                בלי Tracking מדויק — אתם מנהלים קמפיינים בעיוורון
              </h2>
              <p style={{ color: "var(--muted)", lineHeight: 1.8, fontSize: "0.95rem", fontFamily: "var(--font-body), sans-serif", margin: 0 }}>
                <GT term="Smart Bidding">Smart Bidding</GT>, <GT term="CPA">Target CPA</GT> ו-<GT term="ROAS">Target ROAS</GT> מסתמכים על נתוני המרות. אם ה-<GT term="Conversion Tracking">Conversion Tracking</GT> לא מוגדר נכון —
                Google Ads לומד מנתונים שגויים ומוציא תקציב לכיוונים הלא-נכונים.{" "}
                <strong style={{ color: "var(--text)" }}><GT term="GTM">GTM</GT> הוא הכלי שמחבר בין Ads לבין מה שקורה באמת באתר — בלי מפתח, בפחות מ-2 שעות.</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Curriculum ────────────────────────────────────────────────── */}
      <section id="curriculum" style={{ padding: "clamp(64px,8vw,96px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)" }}>
        <div className="wao-container">
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif", marginBottom: "12px" }}>תוכנית הלימודים</p>
            <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.7rem,3.2vw,2.5rem)", letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: "14px" }}>
              4 פרקים · {totalLessons} שיעורים ·{" "}
              <span className="text-gradient">כולם עם וידאו</span>
            </h2>
          </div>

          {CHAPTERS.map((ch) => (
            <div key={ch.num} style={{ marginBottom: "52px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "22px", paddingBottom: "18px", borderBottom: `2px solid ${ch.color}30`, flexWrap: "wrap" }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: `${ch.color}15`, border: `1px solid ${ch.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0 }}>{ch.icon}</div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", color: ch.color, fontFamily: "var(--font-body), sans-serif" }}>פרק {ch.num}</span>
                    <span style={{ fontSize: "0.65rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>{ch.subtitle}</span>
                  </div>
                  <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 800, fontSize: "clamp(1.1rem,2vw,1.4rem)", color: "var(--text)", margin: 0 }}>{ch.title}</h3>
                </div>
                <span style={{ marginRight: "auto", fontSize: "0.72rem", padding: "4px 10px", borderRadius: "var(--radius-pill)", background: `${ch.color}15`, color: ch.color, border: `1px solid ${ch.color}30`, fontWeight: 600, fontFamily: "var(--font-body), sans-serif", whiteSpace: "nowrap" }}>
                  {ch.lessons.length} שיעורים
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "14px" }}>
                {ch.lessons.map((lesson) => <LessonCard key={lesson.num} lesson={lesson} chColor={ch.color} />)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Companion link ────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(40px,5vw,56px) 0", borderTop: "1px solid var(--border)" }}>
        <div className="wao-container" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.8, fontFamily: "var(--font-body), sans-serif", marginBottom: "18px" }}>
            קורס GTM הוא הקדמה מומלצת לקורס Google Ads.
          </p>
          <Link href="/training/google-ads-course" className="btn-primary" style={{ display: "inline-flex" }}>🎯 לקורס Google Ads ←</Link>
        </div>
      </section>

      <LessonGrid courseKey="/training/google-tag-manager" courseSlug="google-tag-manager" heading="כל השיעורים בקורס Google Tag Manager" />

      {/* ── Author bio ────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(56px,7vw,72px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)" }} itemScope itemType="https://schema.org/Person">
        <div className="wao-container" style={{ maxWidth: "760px" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "20px" }}>הסמכות המקצועית</div>
          <div className="author-bio">
            <meta itemProp="image" content="https://www.wao.co.il/eitan-yariv.avif" />
            <div className="author-avatar" role="img" aria-label="איתן יריב" />
            <div className="author-meta">
              <div className="author-name" itemProp="name">איתן יריב</div>
              <div className="author-title" itemProp="jobTitle">
                {renderMixed("מומחה Google Ads ו-GTM | מייסד WAO | 20+ שנות ניסיון")}
              </div>
              <p className="author-text" itemProp="description">
                פיתחתי את שיטות ה-GTM האלה תוך כדי ניהול קמפיינים אמיתיים — כשגיליתי שרוב הבעיות בביצועי Google Ads נובעות מ-Tracking שגוי, לא מהמודעות עצמן.
              </p>
              <div style={{ display: "flex", gap: "14px", marginTop: "12px", flexWrap: "wrap" }}>
                <a href="https://www.linkedin.com/in/eitanyariv/" target="_blank" rel="noopener noreferrer" itemProp="sameAs" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                  LinkedIn
                </a>
                <a href="https://qa.askpavel.co.il/user/%D7%90%D7%99%D7%AA%D7%9F+%D7%99%D7%A8%D7%99%D7%91" target="_blank" rel="noopener noreferrer" itemProp="sameAs" style={{ fontSize: "0.82rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                  AskPavel
                </a>
                <Link href="/about" style={{ fontSize: "0.82rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>קראו עוד →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(56px,7vw,80px) 0" }}>
        <div className="wao-container" style={{ textAlign: "center", maxWidth: "520px" }}>
          <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.5rem,2.8vw,2rem)", letterSpacing: "-0.02em", marginBottom: "14px" }}>רוצים ליווי אישי?</h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.75, fontFamily: "var(--font-body), sans-serif", marginBottom: "26px" }}>
            מנטורינג 1-על-1 עם איתן יריב — 950 ₪/חודש + מע&quot;מ, ערבות תוצאות 150 יום.
          </p>
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="tel:0526148860" className="btn-primary">📞 שיחת היכרות</a>
            <Link href="/contact" className="btn-outline">השאירו פרטים</Link>
          </div>
        </div>
      </section>
    </>
  );
}
