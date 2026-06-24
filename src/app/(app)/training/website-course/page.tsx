import type { Metadata } from "next";
import Link from "next/link";
import { renderMixed } from "@/lib/bidi";
import { WEBSITE_COURSE_MODULES, WEBSITE_COURSE_LESSONS } from "@/data/website-course-data";
import WebsiteCourseModuleList from "@/components/WebsiteCourseModuleList";

export const metadata: Metadata = {
  title: "קורס בניית אתרים + קידום עם AI — WAO",
  description:
    "קורס חינמי לבעלי עסקים: מדומיין ראשון ועד אתר שמביא לקוחות — עם AI. שיעורי וידאו קצרים בעברית, מעשיים, ממוקדים תוצאה.",
  alternates: { canonical: "https://www.wao.co.il/training/website-course" },
  openGraph: {
    title: "קורס בניית אתרים + AI | WAO",
    description:
      "מדומיין ועד אתר שמביא לקוחות — שיעורי וידאו קצרים בעברית לבעלי עסקים קטנים.",
    url: "https://www.wao.co.il/training/website-course",
    type: "website",
    locale: "he_IL",
  },
};

export default function WebsiteCoursePage() {
  const totalLessons = WEBSITE_COURSE_LESSONS.length;

  return (
    <>
      {/* ── Hero ── */}
      <section
        style={{
          paddingTop: "clamp(100px,14vw,160px)",
          paddingBottom: "clamp(48px,6vw,80px)",
          position: "relative",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "70vw",
            height: "50vh",
            background:
              "radial-gradient(ellipse at center, rgba(74,227,181,0.07) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div className="hero-grid" />
        <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "820px" }}>
          {/* Breadcrumb */}
          <nav aria-label="breadcrumb" className="breadcrumb" style={{ marginBottom: "28px" }}>
            <Link href="/">דף הבית</Link>
            <span className="breadcrumb-sep" aria-hidden>›</span>
            <Link href="/training">הדרכות</Link>
            <span className="breadcrumb-sep" aria-hidden>›</span>
            <span aria-current="page">קורס בניית אתרים + AI</span>
          </nav>

          {/* Badges */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "24px" }}>
            <span
              style={{
                padding: "4px 14px",
                borderRadius: "var(--radius-pill)",
                background: "var(--accent-dim)",
                border: "1px solid var(--accent-border)",
                fontSize: "0.78rem",
                color: "var(--accent)",
                fontWeight: 600,
              }}
            >
              🆓 חינם לחלוטין
            </span>
            <span
              style={{
                padding: "4px 14px",
                borderRadius: "var(--radius-pill)",
                background: "rgba(255,208,0,0.08)",
                border: "1px solid rgba(255,208,0,0.2)",
                fontSize: "0.78rem",
                color: "#ffd000",
                fontWeight: 600,
              }}
            >
              {totalLessons} שיעורים · מתעדכן
            </span>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 900,
              fontSize: "clamp(2rem,4.5vw,3.2rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              marginBottom: "1.2rem",
            }}
          >
            {renderMixed("קורס בניה + קידום אתרים בעידן ה-AI")}
          </h1>

          <p
            style={{
              fontSize: "clamp(1rem,1.8vw,1.2rem)",
              color: "var(--muted)",
              lineHeight: 1.7,
              maxWidth: "640px",
              fontFamily: "var(--font-body), sans-serif",
              marginBottom: "2rem",
            }}
          >
            {renderMixed(
              "שיעורי וידאו קצרים לבעלי עסקים קטנים: מדומיין ראשון ועד אתר שמביא לקוחות — עם AI. כל שיעור מסתיים במשימה אחת ברורה."
            )}
          </p>
        </div>
      </section>

      {/* ── Modules (client component for hover effects) ── */}
      <section style={{ paddingBottom: "clamp(56px,7vw,80px)", background: "var(--surface)" }}>
        <div className="wao-container" style={{ maxWidth: "820px" }}>
          <WebsiteCourseModuleList modules={WEBSITE_COURSE_MODULES} />
        </div>
      </section>
    </>
  );
}
