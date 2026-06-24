import type { Metadata } from "next";
import Link from "next/link";
import { renderMixed } from "@/lib/bidi";
import { WEBSITE_COURSE_MODULES } from "@/data/website-course-data";

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

const totalLessons = WEBSITE_COURSE_MODULES.reduce((n, m) => n + m.lessons.length, 0);

export default function WebsiteCoursePage() {
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

          {/* Badge */}
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

      {/* ── Modules ── */}
      <section style={{ paddingBottom: "clamp(56px,7vw,80px)", background: "var(--surface)" }}>
        <div className="wao-container" style={{ maxWidth: "820px" }}>
          {WEBSITE_COURSE_MODULES.map((module) => (
            <div key={module.num} style={{ marginBottom: "3rem" }}>
              {/* Module header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  marginBottom: "1.5rem",
                  paddingBottom: "1rem",
                  borderBottom: `2px solid ${module.color}22`,
                }}
              >
                <span style={{ fontSize: "1.8rem" }}>{module.icon}</span>
                <div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      color: module.color,
                      textTransform: "uppercase",
                      fontFamily: "var(--font-body), sans-serif",
                      marginBottom: "2px",
                    }}
                  >
                    מודול {module.num} — {module.subtitle}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-rubik), sans-serif",
                      fontWeight: 700,
                      fontSize: "1.15rem",
                    }}
                  >
                    {renderMixed(module.title)}
                  </div>
                </div>
              </div>

              {/* Lessons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {module.lessons.map((lesson, idx) => (
                  <Link
                    key={lesson.slug}
                    href={`/training/website-course/${lesson.slug}`}
                    style={{ textDecoration: "none" }}
                  >
                    <div
                      style={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        padding: "20px 24px",
                        display: "flex",
                        gap: "20px",
                        alignItems: "center",
                        transition: "border-color 0.2s, box-shadow 0.2s",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = module.color + "88";
                        (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 24px ${module.color}15`;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                        (e.currentTarget as HTMLElement).style.boxShadow = "none";
                      }}
                    >
                      {/* Thumbnail */}
                      <div
                        style={{
                          flexShrink: 0,
                          width: "120px",
                          height: "68px",
                          borderRadius: "var(--radius-sm)",
                          overflow: "hidden",
                          background: "#0b0f19",
                          position: "relative",
                        }}
                      >
                        <img
                          src={lesson.thumbnail}
                          alt={lesson.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "rgba(0,0,0,0.25)",
                          }}
                        >
                          <span style={{ fontSize: "1.4rem" }}>▶</span>
                        </div>
                      </div>

                      {/* Text */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: module.color,
                            fontWeight: 600,
                            marginBottom: "4px",
                            fontFamily: "var(--font-body), sans-serif",
                          }}
                        >
                          שיעור {idx + 1} · {lesson.duration}
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-rubik), sans-serif",
                            fontWeight: 700,
                            fontSize: "1rem",
                            marginBottom: "6px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {renderMixed(lesson.title)}
                        </div>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--muted)",
                            fontFamily: "var(--font-body), sans-serif",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {renderMixed(lesson.description)}
                        </div>
                      </div>

                      {/* Arrow */}
                      <span
                        style={{ color: "var(--muted)", fontSize: "1.2rem", flexShrink: 0 }}
                        aria-hidden
                      >
                        ‹
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
