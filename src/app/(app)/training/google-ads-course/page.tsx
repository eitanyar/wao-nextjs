import type { Metadata } from "next";
import Link from "next/link";
import GT from "@/components/GlossaryTerm";
import LessonGrid from "@/components/LessonGrid";
import { readFileSync } from "fs";
import { join } from "path";

export const metadata: Metadata = {
  title: "קורס Google Ads חינם — אסטרטגיה ב-2026/2027",
  description:
    "18 שיעורי וידאו חינמיים: מבנה חשבון, Smart Bidding, Performance Max ואיך להפעיל את ה-20% שלא נוגעים ל-AI. קורס מדריך Google Ads ב-2026 — ממתחיל ועד ניהול תקציבים מורכבים.",
  alternates: { canonical: "https://www.wao.co.il/training/google-ads-course" },
  openGraph: {
    title: "קורס Google Ads חינם 2026 | WAO",
    description: "18 שיעורים — מבנה חשבון, Smart Bidding, Performance Max, Landing Pages ואסטרטגיית Pareto.",
    url: "https://www.wao.co.il/training/google-ads-course",
    type: "website",
    locale: "he_IL",
  },
};

const SAME_AS = [
  "https://www.linkedin.com/in/eitan-yariv",
  "https://qa.askpavel.co.il/user/איתן+יריב",
];

interface VideoLink {
  label: string;
  href: string;
}

interface Lesson {
  num: number;
  title: string;
  desc: string;
  duration: string;
  links: VideoLink[];
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
    icon: "🛡️",
    title: "יסודות ואבטחה",
    subtitle: "Foundations & Security",
    color: "#4ae3b5",
    lessons: [
      {
        num: 1,
        title: "מבוא: איך Google Ads עובד ב-2026",
        desc: "AI, Performance Max ו-Smart Bidding — מה השתנה ומה נשאר בידיים שלך",
        duration: "18 דקות",
        links: [
          { label: "▶ הקדמה לקורס", href: "https://www.youtube.com/watch?v=QXCBu9vROHE" },
        ],
      },
      {
        num: 2,
        title: "מבנה חשבון Google Ads",
        desc: "Campaigns, Ad Groups ו-Keywords — ההיררכיה שקובעת הכל. פתיחת חשבון גוגל ומבנה הפרסום מהיסוד",
        duration: "3 שיעורים",
        links: [
          { label: "▶ פתיחת חשבון גוגל", href: "https://www.youtube.com/watch?v=R3I1wfku0qw" },
          { label: "▶ פתיחת חשבון פרסום", href: "https://www.youtube.com/watch?v=3jb_Ug2ZxNo" },
          { label: "▶ מבנה הפרסום", href: "https://www.youtube.com/watch?v=Nk728hbQiOg" },
        ],
      },
      {
        num: 3,
        title: "מחקר מילות מפתח מלא",
        desc: "מחקר מקדים לפני קמפיין, Intent, Match Types ו-Negative Keywords — הבסיס להוצאות מבוקרות",
        duration: "2 שיעורים",
        links: [
          { label: "▶ מחקר מקדים", href: "https://www.youtube.com/watch?v=vFlRN_PN-Ww" },
          { label: "▶ מילות מפתח וסוגי התאמה", href: "https://www.youtube.com/watch?v=_O-zLJG3hko" },
        ],
      },
      {
        num: 4,
        title: "החרגת ביטויים — Negative Keywords",
        desc: "ביטויים שלא נרצה שיפעילו את המודעות — איך לבנות Negative List שחוסך תקציב ומגן על המותג",
        duration: "22 דקות",
        links: [
          { label: "▶ החרגת ביטויים", href: "https://www.youtube.com/watch?v=QO8iw7sWfdo" },
        ],
      },
      {
        num: 5,
        title: "Conversion Tracking מוחלט",
        desc: "Google Tag, GA4 Enhanced Conversions ו-Offline Conversion Import",
        duration: "28 דקות",
        links: [
          { label: "▶ קוד מעקב המרות", href: "https://www.youtube.com/watch?v=1hs0dRc0zsQ" },
        ],
      },
    ],
  },
  {
    num: 2,
    icon: "📐",
    title: "Blueprint הקמפיין הבסיסי",
    subtitle: "The Core Campaign Blueprint",
    color: "#a78bfa",
    lessons: [
      {
        num: 6,
        title: "Search Campaigns — בניית קמפיין מאפס",
        desc: "בניית קמפיין וקבוצת מודעות — Single Theme Ad Groups, Launch Checklist ומבנה נכון",
        duration: "2 שיעורים",
        links: [
          { label: "▶ בניית קמפיין", href: "https://www.youtube.com/watch?v=c0ZMecSDzG4" },
          { label: "▶ בניית קבוצת מודעות", href: "https://www.youtube.com/watch?v=jxN6o4jJsu0" },
        ],
      },
      {
        num: 7,
        title: '"חשמלאי בחולון" — Call Only & Geo-Targeting',
        desc: "מודעות התקשרות בלבד לעסקים מקומיים — Geo-Targeting, Ad Scheduling ו-Call-Only Campaigns",
        duration: "24 דקות",
        links: [
          { label: "▶ מודעות Call Only", href: "https://www.youtube.com/watch?v=Gt-ddg6a-Fk" },
        ],
      },
      {
        num: 8,
        title: "Responsive Search Ads — כתיבה ובדיקה",
        desc: "15 כותרות, 4 תיאורים, Pinning ו-Ad Strength אמיתי",
        duration: "24 דקות",
        links: [],
      },
      {
        num: 9,
        title: "ניהול ואופטימיזציה שוטפת",
        desc: "תהליך קבלת ההחלטות — מתי להשהות קמפיין, קבוצת מודעות או ביטוי, ומה הסימנים שמחייבים פעולה",
        duration: "2 שיעורים",
        links: [
          { label: "▶ השהיית קמפיין / ביטוי", href: "https://www.youtube.com/watch?v=AYbPay6jhN8" },
          { label: "▶ תהליך קבלת ההחלטות", href: "https://www.youtube.com/watch?v=_1JiY9yqvNs" },
        ],
      },
    ],
  },
  {
    num: 3,
    icon: "🎯",
    title: "Asset Engineering & המרה בכוונת גבוהה",
    subtitle: "Asset Engineering & High-Intent Conversion",
    color: "#f59e0b",
    lessons: [
      {
        num: 10,
        title: "Landing Pages — 5 כללים שאין להתפשר עליהם",
        desc: "Message Match, Above-The-Fold, Form Friction, Trust Signals ו-Speed. אחד מאלה לא נמצא — אחוז ההמרה צונח.",
        duration: "38 דקות",
        links: [],
      },
      {
        num: 11,
        title: "Ad Extensions — כל התוספות",
        desc: "Sitelinks, Callouts, Structured Snippets, Call Extensions ו-Promotions — איך כל תוסף מגדיל CTR",
        duration: "3 שיעורים",
        links: [
          { label: "▶ תוסף Sitelink", href: "https://www.youtube.com/watch?v=5e11xfZrYwY" },
          { label: "▶ תוסף Callout", href: "https://www.youtube.com/watch?v=61ZN6ufnR2o" },
          { label: "▶ תוסף Call Extension", href: "https://www.youtube.com/watch?v=uyj8aYAYyzg" },
        ],
      },
      {
        num: 12,
        title: "Display, Remarketing, YouTube ו-Audience Signals",
        desc: "Customer Match, RLSA, In-Market Audiences, Remarketing Lists ומודעות YouTube שלא ניתן לדלג עליהן",
        duration: "2 שיעורים",
        links: [
          { label: "▶ YouTube Unskippable Ads", href: "https://www.youtube.com/watch?v=0WG58ecQDdk" },
        ],
      },
      {
        num: 13,
        title: "Shopping Campaigns ו-Merchant Center",
        desc: "Feed אופטימלי, Smart Shopping vs Standard, Product Segmentation",
        duration: "33 דקות",
        links: [],
      },
      {
        num: 14,
        title: "Performance Max — מה AI שולט ומה נשאר בידיים שלך",
        desc: "Asset Groups, Audience Signals, Budget Signals ו-Placement Exclusions",
        duration: "40 דקות",
        links: [],
      },
    ],
  },
  {
    num: 4,
    icon: "⚙️",
    title: "שליטה אלגוריתמית, Scripts ו-Scaling",
    subtitle: "Algorithmic Control, Scripts & Scaling",
    color: "#10b981",
    lessons: [
      {
        num: 15,
        title: "Smart Bidding Deep Dive",
        desc: "Target CPA, Target ROAS, Maximize Conversions — מתי לשנות ואיך לא לשבור את ה-Learning Period",
        duration: "27 דקות",
        links: [],
      },
      {
        num: 16,
        title: "Google Ads Scripts — אוטומציה בשיטת Pareto",
        desc: "Pause keywords by CPA, Budget pacing, Anomaly detection — בלי לאבד שליטה. כולל סקריפט למציאת מילות מפתח כפולות שמבזבזות תקציב.",
        duration: "2 שיעורים",
        links: [
          { label: "▶ סקריפט: מילות מפתח כפולות", href: "https://www.youtube.com/watch?v=YruBbHTnoRU" },
        ],
      },
      {
        num: 17,
        title: "Reporting — Looker Studio ו-KPIs שמשנים את התוצאות",
        desc: "ROAS, CPL, LTV, Impression Share ו-Dashboard לניהול שוטף",
        duration: "25 דקות",
        links: [],
      },
      {
        num: 18,
        title: "Scaling — אסטרטגיית Pareto 80/20 לצמיחה",
        desc: "ה-20% של הקמפיינים שמייצרים 80% מהתוצאות — איך למצוא, לשכפל ולהגדיל",
        duration: "30 דקות",
        links: [],
      },
    ],
  },
];

function getDynamicChapters() {
  let videoMap: Record<string, any[]> = {};
  try {
    const filePath = join(process.cwd(), "content-migration/video-map.json");
    videoMap = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (e) {
    console.error("Failed to read video-map.json", e);
  }

  const courseVideos = videoMap["/training/google-ads-course"] || [];

  return CHAPTERS.map((ch) => {
    return {
      ...ch,
      lessons: ch.lessons.map((lesson) => {
        const mapEntry = courseVideos[lesson.num - 1];
        if (mapEntry) {
          const firstVideoId = mapEntry.videoIds && mapEntry.videoIds[0];
          const hasValidYoutube = firstVideoId && !firstVideoId.startsWith("placeholder-");
          const hasLocalVideo = !!mapEntry.localVideoUrl;
          
          if (hasValidYoutube || hasLocalVideo) {
            const newLinks = [
              {
                label: "▶ צפייה בשיעור",
                href: `/training/google-ads-course/${mapEntry.slug}`,
              },
            ];
            
            if (hasValidYoutube) {
              mapEntry.videoIds.forEach((vid: string, index: number) => {
                const label = mapEntry.videoIds.length > 1 
                  ? `▶ צפייה ביוטיוב (חלק ${index + 1})`
                  : "▶ צפייה ביוטיוב";
                newLinks.push({
                  label,
                  href: `https://www.youtube.com/watch?v=${vid}`,
                });
              });
            }
            
            return {
              ...lesson,
              links: newLinks,
            };
          }
        }
        return lesson;
      }),
    };
  });
}

export default function GoogleAdsCourse() {
  const canonical = "https://www.wao.co.il/training/google-ads-course";

  const personNode = {
    "@type": "Person",
    "@id": "https://www.wao.co.il/about#person",
    name: "איתן יריב",
    jobTitle: "מומחה Google Ads ואסטרטגיה דיגיטלית",
    url: "https://www.wao.co.il/about",
    sameAs: SAME_AS,
    worksFor: { "@type": "Organization", "@id": "https://www.wao.co.il/#org" },
  };

  const dynamicChapters = getDynamicChapters();

  // Build VideoObject per linked video (not per lesson slot)
  const videoObjects = dynamicChapters.flatMap((ch) =>
    ch.lessons.flatMap((lesson) =>
      lesson.links
        .filter((link) => link.href.includes("youtube.com"))
        .map((link, li) => ({
          "@context": "https://schema.org",
          "@type": "VideoObject",
          "@id": `${canonical}#lesson-${lesson.num}-v${li + 1}`,
          name: `שיעור ${lesson.num}: ${lesson.title}${lesson.links.length > 1 ? ` — ${link.label.replace("▶ ", "")}` : ""}`,
          description: lesson.desc,
          thumbnailUrl: "https://www.wao.co.il/og-google-ads.jpg",
          uploadDate: "2024-01-01",
          url: link.href,
          embedUrl: link.href.replace("watch?v=", "embed/"),
          isPartOf: { "@id": `${canonical}#course` },
          inLanguage: "he",
        }))
    )
  );

  const courseSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": `${canonical}#course`,
    name: "קורס Google Ads — אסטרטגיה ב-2026/2027",
    description:
      "18 שיעורי וידאו חינמיים: מבנה חשבון, Smart Bidding, Performance Max, Landing Pages ואסטרטגיית Pareto. הקורס מציג את ה-20% שלא ניתן לאוטומציה.",
    url: canonical,
    inLanguage: "he",
    isAccessibleForFree: true,
    provider: {
      "@type": "Organization",
      "@id": "https://www.wao.co.il/#org",
      name: "WAO",
      url: "https://www.wao.co.il",
    },
    instructor: personNode,
    numberOfCredits: 18,
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      instructor: personNode,
    },
    educationalLevel: "Beginner to Advanced",
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: "https://www.wao.co.il" },
      { "@type": "ListItem", position: 2, name: "הכשרות", item: "https://www.wao.co.il/training" },
      { "@type": "ListItem", position: 3, name: "קורס Google Ads", item: canonical },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {videoObjects.map((vo) => (
        <script key={vo["@id"]} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(vo) }} />
      ))}

      <StaticCourse chapters={dynamicChapters} />
    </>
  );
}

// ── Static fallback ────────────────────────────────────────────────────────────

function LessonCard({ lesson, chColor }: { lesson: Lesson; chColor: string }) {
  const hasVideo = lesson.links.length > 0;

  return (
    <div
      style={{
        background: "var(--elevated)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "20px 22px",
        display: "flex",
        gap: "16px",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: "36px",
          height: "36px",
          borderRadius: "10px",
          background: `${chColor}12`,
          border: `1px solid ${chColor}25`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-rubik), sans-serif",
          fontWeight: 800,
          fontSize: "0.8rem",
          color: chColor,
        }}
      >
        {lesson.num}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-rubik), sans-serif",
            fontWeight: 700,
            fontSize: "0.95rem",
            color: "var(--text)",
            marginBottom: "5px",
            lineHeight: 1.3,
          }}
        >
          {lesson.title}
        </div>
        <div
          style={{
            color: "var(--muted)",
            fontSize: "0.82rem",
            lineHeight: 1.6,
            fontFamily: "var(--font-body), sans-serif",
            marginBottom: "12px",
          }}
        >
          {lesson.desc}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "0.72rem",
              color: "var(--muted)",
              fontFamily: "var(--font-body), sans-serif",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              marginLeft: "4px",
            }}
          >
            <span aria-hidden>⏱</span> {lesson.duration}
          </span>
          {hasVideo ? (
            lesson.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: "var(--radius-pill)",
                  background: "rgba(74,227,181,0.1)",
                  color: "var(--accent)",
                  border: "1px solid rgba(74,227,181,0.25)",
                  fontFamily: "var(--font-body), sans-serif",
                  textDecoration: "none",
                  transition: "background 0.15s ease",
                }}
              >
                {link.label}
              </a>
            ))
          ) : (
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: "var(--radius-pill)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--muted)",
                border: "1px solid var(--border)",
                fontFamily: "var(--font-body), sans-serif",
              }}
            >
              בקרוב
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StaticCourse({ chapters }: { chapters: typeof CHAPTERS }) {
  const totalVideos = chapters.flatMap((ch) => ch.lessons).reduce((n, l) => n + l.links.length, 0);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: "clamp(110px,14vw,160px)",
          paddingBottom: "clamp(56px,7vw,88px)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "90vw",
            height: "65vh",
            background: "radial-gradient(ellipse at center, rgba(74,227,181,0.08) 0%, transparent 68%)",
            pointerEvents: "none",
          }}
        />
        <div className="hero-grid" />
        <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "800px" }}>
          <nav aria-label="breadcrumb" className="breadcrumb">
            <Link href="/">דף הבית</Link>
            <span className="breadcrumb-sep" aria-hidden>›</span>
            <Link href="/training">הכשרות</Link>
            <span className="breadcrumb-sep" aria-hidden>›</span>
            <span aria-current="page">קורס Google Ads</span>
          </nav>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "24px", marginTop: "16px" }}>
            <span className="badge">
              <span className="badge-dot" />
              חינם לחלוטין
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                borderRadius: "var(--radius-pill)",
                fontSize: "0.78rem",
                fontWeight: 600,
                background: "rgba(167,139,250,0.12)",
                color: "#a78bfa",
                border: "1px solid rgba(167,139,250,0.25)",
                fontFamily: "var(--font-body), sans-serif",
              }}
            >
              {totalVideos} שיעורי וידאו זמינים
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                borderRadius: "var(--radius-pill)",
                fontSize: "0.78rem",
                fontWeight: 600,
                background: "rgba(245,158,11,0.12)",
                color: "#f59e0b",
                border: "1px solid rgba(245,158,11,0.25)",
                fontFamily: "var(--font-body), sans-serif",
              }}
            >
              4 פרקים
            </span>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 900,
              fontSize: "clamp(2rem,4.5vw,3.2rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginBottom: "0",
            }}
          >
            קורס <span className="text-gradient">Google Ads</span> חינם
            <br />
            <span style={{ fontSize: "clamp(1.2rem,2.5vw,1.8rem)", fontWeight: 700, color: "var(--muted)" }}>
              האסטרטגיה שה-AI לא יכול לעשות במקומך
            </span>
          </h1>

          {/* Glassmorphism AI Overview Box */}
          <div
            role="note"
            aria-label="AI Executive Summary"
            data-ai-summary="true"
            style={{
              marginTop: "32px",
              marginBottom: "36px",
              padding: "24px 28px",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(74,227,181,0.2)",
              boxShadow: "0 0 40px rgba(74,227,181,0.06), inset 0 1px 0 rgba(255,255,255,0.06)",
              position: "relative",
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "200px",
                height: "200px",
                background: "radial-gradient(ellipse at top right, rgba(74,227,181,0.08) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <span style={{ fontSize: "1rem" }}>✦</span>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  fontFamily: "var(--font-body), sans-serif",
                }}
              >
                סיכום מנהלים — בקצרה
              </span>
            </div>
            <p
              style={{
                color: "var(--text)",
                lineHeight: 1.75,
                fontSize: "0.95rem",
                fontFamily: "var(--font-body), sans-serif",
                margin: 0,
              }}
            >
              Google Ads ב-2026 עברה מהפכה: <GT term="Performance Max">Performance Max</GT>, Gemini Ads ו-<GT term="Smart Bidding">Smart Bidding</GT> מנהלים 80% מהאופטימיזציה
              אוטומטית.{" "}
              <strong style={{ color: "var(--accent)" }}>
                אבל ה-20% שנשאר — מבנה חשבון, מחקר מילות מפתח, <GT term="Landing Page">Landing Pages</GT> ואסטרטגיית Pareto — זה מה שמפריד בין{" "}
                <GT term="ROAS">ROAS</GT> של 2× ל-8×.
              </strong>{" "}
              הקורס הזה מכסה את ה-20% שה-AI לא יכול לעשות במקומך.
            </p>
          </div>

          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <a href="#curriculum" className="btn-primary">
              📚 לתוכנית הלימודים
            </a>
            <a href="tel:0526148860" className="btn-outline">
              📞 ייעוץ אישי — 950 ₪/חודש
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "clamp(40px,5vw,56px) 0",
          background: "var(--elevated)",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="wao-container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "28px", textAlign: "center" }}>
            {[
              { val: String(totalVideos), label: "שיעורים זמינים" },
              { val: "18", label: "שיעורים בסך הכל" },
              { val: "4", label: "פרקים" },
              { val: "חינם", label: "לצפייה ביוטיוב" },
            ].map((s) => (
              <div key={s.label}>
                <div
                  style={{
                    fontFamily: "var(--font-rubik), sans-serif",
                    fontWeight: 900,
                    fontSize: "clamp(1.8rem,3vw,2.6rem)",
                    color: "var(--accent)",
                    lineHeight: 1,
                  }}
                >
                  {s.val}
                </div>
                <div style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "6px", fontFamily: "var(--font-body), sans-serif" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Curriculum ───────────────────────────────────────────────────── */}
      <section id="curriculum" style={{ padding: "clamp(72px,9vw,104px) 0" }}>
        <div className="wao-container">
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <p
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--accent)",
                fontFamily: "var(--font-body), sans-serif",
                marginBottom: "12px",
              }}
            >
              תוכנית הלימודים
            </p>
            <h2
              style={{
                fontFamily: "var(--font-rubik), sans-serif",
                fontWeight: 900,
                fontSize: "clamp(1.7rem,3.2vw,2.5rem)",
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                marginBottom: "16px",
              }}
            >
              4 פרקים · 18 שיעורים ·{" "}
              <span className="text-gradient">שליטה מלאה</span>
            </h2>
            <p
              style={{
                color: "var(--muted)",
                fontSize: "1rem",
                lineHeight: 1.75,
                maxWidth: "580px",
                margin: "0 auto",
                fontFamily: "var(--font-body), sans-serif",
              }}
            >
              מהגדרת חשבון ראשון ועד ניהול תקציבים מורכבים. שיעורים עם{" "}
              <strong style={{ color: "var(--text)" }}>▶</strong> זמינים לצפייה עכשיו ביוטיוב.
            </p>
          </div>

          {chapters.map((ch) => (
            <div key={ch.num} style={{ marginBottom: "56px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  marginBottom: "24px",
                  paddingBottom: "20px",
                  borderBottom: `2px solid ${ch.color}30`,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "14px",
                    background: `${ch.color}15`,
                    border: `1px solid ${ch.color}30`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    flexShrink: 0,
                  }}
                >
                  {ch.icon}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        color: ch.color,
                        fontFamily: "var(--font-body), sans-serif",
                      }}
                    >
                      פרק {ch.num}
                    </span>
                    <span style={{ fontSize: "0.65rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                      {ch.subtitle}
                    </span>
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--font-rubik), sans-serif",
                      fontWeight: 800,
                      fontSize: "clamp(1.1rem,2vw,1.4rem)",
                      color: "var(--text)",
                      margin: 0,
                    }}
                  >
                    {ch.title}
                  </h3>
                </div>
                <span
                  style={{
                    marginRight: "auto",
                    fontSize: "0.72rem",
                    padding: "4px 10px",
                    borderRadius: "var(--radius-pill)",
                    background: `${ch.color}15`,
                    color: ch.color,
                    border: `1px solid ${ch.color}30`,
                    fontWeight: 600,
                    fontFamily: "var(--font-body), sans-serif",
                    whiteSpace: "nowrap",
                  }}
                >
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

      {/* ── Pareto callout ────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "clamp(56px,7vw,80px) 0",
          background: "var(--elevated)",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="wao-container" style={{ maxWidth: "780px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "32px", alignItems: "start" }}>
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "20px",
                background: "rgba(74,227,181,0.08)",
                border: "1px solid rgba(74,227,181,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2rem",
                flexShrink: 0,
              }}
            >
              🎯
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  fontFamily: "var(--font-body), sans-serif",
                  marginBottom: "10px",
                }}
              >
                עיקרון הפארטו ב-Google Ads
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-rubik), sans-serif",
                  fontWeight: 900,
                  fontSize: "clamp(1.3rem,2.5vw,1.8rem)",
                  lineHeight: 1.2,
                  marginBottom: "16px",
                }}
              >
                ה-AI מנהל 80% — אתה שולט ב-20% שקובע הכל
              </h3>
              <p style={{ color: "var(--muted)", lineHeight: 1.8, fontSize: "0.95rem", fontFamily: "var(--font-body), sans-serif", margin: 0 }}>
                <GT term="Smart Bidding">Smart Bidding</GT>, <GT term="Performance Max">Performance Max</GT> ו-Gemini Ads לוקחים על עצמם יותר ויותר החלטות תפעוליות. זה לא איום —
                זה הזדמנות. הזמן שנחסך מהאופטימיזציה היומית צריך ללכת לאיפה שה-AI עיוור:{" "}
                <strong style={{ color: "var(--text)" }}>
                  הגדרת מטרות ברורות, <GT term="Landing Page">Landing Pages</GT> שממירות, מחקר מילות מפתח שמבוסס על <GT term="Search Intent">Intent</GT> אמיתי, ואסטרטגיית Scale
                  שיודעת מתי לנתק ומתי להגביר.
                </strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Landing page rules ─────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(64px,8vw,96px) 0" }}>
        <div className="wao-container" style={{ maxWidth: "800px" }}>
          <div style={{ marginBottom: "40px" }}>
            <p
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#f59e0b",
                fontFamily: "var(--font-body), sans-serif",
                marginBottom: "10px",
              }}
            >
              שיעור 10 — preview
            </p>
            <h2
              style={{
                fontFamily: "var(--font-rubik), sans-serif",
                fontWeight: 900,
                fontSize: "clamp(1.5rem,2.8vw,2.1rem)",
                letterSpacing: "-0.02em",
                marginBottom: "8px",
              }}
            >
              5 כללי Landing Page שאין{" "}
              <span className="text-gradient">להתפשר עליהם</span>
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.7, fontFamily: "var(--font-body), sans-serif" }}>
              אחד מאלה לא נמצא — אחוז ההמרה צונח. זה לא דעה — זה נתון מ-17 שנות ניהול קמפיינים.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              {
                rule: "01",
                title: "Message Match מדויק",
                desc: <>כותרת הדף חייבת לשקף את מילת המפתח שהוביל למודעה. פער בין ה-Ad Copy לבין ה-Landing Page = ירידה חדה ב-<GT term="Quality Score">Quality Score</GT> וב-<GT term="Conversion Rate">Conversion Rate</GT>.</>,
              },
              {
                rule: "02",
                title: <>ה-<GT term="CTA">CTA</GT> מעל הקפל (<GT term="Above The Fold">Above The Fold</GT>)</>,
                desc: <>90% מהמשתמשים שלא ממירים עוזבים לפני שהם גוללים. הטלפון, הטופס, כפתור ה-<GT term="CTA">CTA</GT> — חייבים להיות גלויים ללא גלילה בכל מכשיר.</>,
              },
              {
                rule: "03",
                title: "הורדת Form Friction",
                desc: 'כל שדה נוסף בטופס מוריד המרות ב-10–15%. שם + טלפון + לחצן = הטופס המקסימלי לרוב השירותים. שדה "הודעה חופשית" הוא לרוב טעות.',
              },
              {
                rule: "04",
                title: "Trust Signals in the first 3 seconds",
                desc: "לוגו לקוח מוכר, ביקורת אמיתית עם שם, הסמכות (Google Partner ועוד) — חייבים להיות בחלק העליון. אנשים לא קוראים, הם סורקים.",
              },
              {
                rule: "05",
                title: <><GT term="Core Web Vitals">Core Web Vitals</GT>: <GT term="LCP">LCP</GT> מתחת ל-2.5 שניות</>,
                desc: <>Google מדרגת <GT term="Landing Page">Landing Pages</GT> לפי מהירות. <GT term="LCP">LCP</GT> מעל 3 שניות = <GT term="Quality Score">Quality Score</GT> נמוך, <GT term="CPC">CPC</GT> גבוה יותר, <GT term="Conversion Rate">Conversion Rate</GT> נמוך יותר. <GT term="Mobile-First">Mobile-first</GT> — לא בחירה.</>,
              },
            ].map((item) => (
              <div
                key={item.rule}
                style={{
                  background: "var(--elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "20px 24px",
                  display: "flex",
                  gap: "20px",
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-rubik), sans-serif",
                    fontWeight: 900,
                    fontSize: "1.2rem",
                    color: "#f59e0b",
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                >
                  {item.rule}
                </span>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-rubik), sans-serif",
                      fontWeight: 700,
                      fontSize: "0.98rem",
                      marginBottom: "6px",
                      color: "var(--text)",
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      color: "var(--muted)",
                      fontSize: "0.88rem",
                      lineHeight: 1.7,
                      fontFamily: "var(--font-body), sans-serif",
                    }}
                  >
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 950 NIS Mentorship ─────────────────────────────────────────────── */}
      <section
        style={{
          padding: "clamp(64px,8vw,96px) 0",
          background: "var(--elevated)",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div className="wao-container" style={{ maxWidth: "680px" }}>
          <div
            style={{
              borderRadius: "20px",
              padding: "clamp(32px,4vw,48px)",
              background: "rgba(255,255,255,0.02)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(74,227,181,0.25)",
              boxShadow: "0 0 60px rgba(74,227,181,0.07), inset 0 1px 0 rgba(255,255,255,0.05)",
              position: "relative",
              overflow: "hidden",
              textAlign: "center",
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: "-40px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "300px",
                height: "300px",
                background: "radial-gradient(ellipse, rgba(74,227,181,0.08) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "16px" }}>🎓</div>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  fontFamily: "var(--font-body), sans-serif",
                  marginBottom: "12px",
                }}
              >
                מנטורינג חי — קבוצה קטנה
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-rubik), sans-serif",
                  fontWeight: 900,
                  fontSize: "clamp(1.5rem,2.8vw,2.2rem)",
                  letterSpacing: "-0.02em",
                  marginBottom: "8px",
                }}
              >
                מעבר לקורס — ייעוץ{" "}
                <span className="text-gradient">1-על-1</span>
              </h2>
              <div
                style={{
                  fontFamily: "var(--font-rubik), sans-serif",
                  fontWeight: 900,
                  fontSize: "clamp(2.2rem,4vw,3rem)",
                  color: "var(--accent)",
                  lineHeight: 1,
                  marginBottom: "4px",
                }}
              >
                950 ₪
              </div>
              <div
                style={{
                  color: "var(--muted)",
                  fontSize: "0.85rem",
                  fontFamily: "var(--font-body), sans-serif",
                  marginBottom: "20px",
                }}
              >
                לחודש + מע&quot;מ · ללא חוזה · ביטול בכל עת
              </div>
              <p
                style={{
                  color: "var(--muted)",
                  lineHeight: 1.75,
                  fontSize: "0.92rem",
                  fontFamily: "var(--font-body), sans-serif",
                  marginBottom: "24px",
                }}
              >
                קבוצת Zoom חיה עם איתן יריב — ניתוח חשבון, תשובות לשאלות בזמן אמת, ו-Peer Learning עם מנהלי
                קמפיינים ממגוון תעשיות.
              </p>
              <div
                style={{
                  background: "rgba(74,227,181,0.06)",
                  border: "1px solid rgba(74,227,181,0.2)",
                  borderRadius: "12px",
                  padding: "14px 20px",
                  marginBottom: "24px",
                  fontSize: "0.87rem",
                  fontFamily: "var(--font-body), sans-serif",
                  color: "var(--text)",
                  lineHeight: 1.65,
                }}
              >
                <strong style={{ color: "var(--accent)" }}>ערבות תוצאות 150 יום:</strong>{" "}
                אם תיישם את המתודולוגיה במלואה ולא תראה שיפור מדיד ב-ROAS — תקבל החזר מלא. ללא שאלות.
              </div>
              <a
                href="tel:0526148860"
                className="btn-primary"
                style={{
                  display: "inline-flex",
                  gap: "8px",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  maxWidth: "320px",
                }}
              >
                📞 שיחת היכרות — ללא עלות
              </a>
            </div>
          </div>
        </div>
      </section>

      <LessonGrid courseKey="/training/google-ads-course" courseSlug="google-ads-course" heading="כל השיעורים בקורס Google Ads" />

      {/* ── Author Bio ─────────────────────────────────────────────────────── */}
      <section
        style={{ padding: "clamp(64px,8vw,80px) 0" }}
        aria-labelledby="course-author-heading"
        itemScope
        itemType="https://schema.org/Person"
      >
        <div className="wao-container" style={{ maxWidth: "760px" }}>
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--muted)",
              fontFamily: "var(--font-body), sans-serif",
              marginBottom: "20px",
            }}
            id="course-author-heading"
          >
            הסמכות המקצועית
          </div>
          <div className="author-bio">
            <meta itemProp="image" content="https://www.wao.co.il/eitan-yariv.avif" />
            <div className="author-avatar" role="img" aria-label="איתן יריב" />
            <div className="author-meta">
              <div className="author-name" itemProp="name">איתן יריב</div>
              <div className="author-title" itemProp="jobTitle">
                מומחה Google Ads ו-SEO | מייסד WAO | 20+ שנות ניסיון
              </div>
              <p className="author-text" itemProp="description">
                ניהלתי קמפיינים ב-Google Ads מאז 2007 — עוד לפני שקראו לזה Adwords. ניהלתי תקציבים של מאות אלפי
                שקלים בחודש, ב-20+ שנות עבודה עם עסקים ישראלים מכל הסקטורים. הקורס הזה הוא תמצות של מה שעובד —
                לא תיאוריה, לא טפסי Google.
              </p>
              <div style={{ display: "flex", gap: "14px", marginTop: "12px", flexWrap: "wrap" }}>
                <a
                  href="https://www.linkedin.com/in/eitanyariv/"
                  target="_blank"
                  rel="noopener noreferrer"
                  itemProp="sameAs"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.82rem",
                    color: "var(--muted)",
                    fontFamily: "var(--font-body), sans-serif",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn
                </a>
                <a
                  href="https://qa.askpavel.co.il/user/%D7%90%D7%99%D7%AA%D7%9F+%D7%99%D7%A8%D7%99%D7%91"
                  target="_blank"
                  rel="noopener noreferrer"
                  itemProp="sameAs"
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--muted)",
                    fontFamily: "var(--font-body), sans-serif",
                  }}
                >
                  AskPavel
                </a>
                <Link
                  href="/about"
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--muted)",
                    fontFamily: "var(--font-body), sans-serif",
                  }}
                >
                  קראו עוד →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "clamp(56px,7vw,80px) 0",
          background: "var(--elevated)",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div className="wao-container" style={{ textAlign: "center", maxWidth: "560px" }}>
          <h2
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 900,
              fontSize: "clamp(1.5rem,2.8vw,2.1rem)",
              letterSpacing: "-0.02em",
              marginBottom: "16px",
            }}
          >
            מוכנים להתחיל?
          </h2>
          <p
            style={{
              color: "var(--muted)",
              lineHeight: 1.75,
              fontFamily: "var(--font-body), sans-serif",
              marginBottom: "28px",
            }}
          >
            הקורס בחינם. ייעוץ אישי — 950 ₪/חודש + מע&quot;מ, ערבות תוצאות 150 יום.
          </p>
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#curriculum" className="btn-primary">
              📚 לתוכנית הלימודים
            </a>
            <Link href="/contact" className="btn-outline">
              השאירו פרטים
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
