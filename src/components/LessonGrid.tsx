import { readFileSync } from "fs";
import { join } from "path";
import Link from "next/link";

interface Lesson {
  title: string;
  slug: string;
  wordCount: number;
  hasVideo: boolean;
}

function getLessons(courseKey: string): Lesson[] {
  try {
    const all = JSON.parse(
      readFileSync(join(process.cwd(), "content-migration/lessons-by-course.json"), "utf8")
    );
    return all[courseKey] ?? [];
  } catch { return []; }
}

function decodeTitle(t: string): string {
  return t
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "–")
    .replace(/&#8217;/g, "'")
    .replace(/’/g, "'");
}

export default function LessonGrid({
  courseKey,
  courseSlug,
  heading = "כל השיעורים בקורס",
}: {
  courseKey: string;
  courseSlug: string;
  heading?: string;
}) {
  const lessons = getLessons(courseKey);
  if (lessons.length === 0) return null;

  return (
    <section
      style={{
        padding: "clamp(56px,7vw,80px) 0",
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
      }}
      aria-label={heading}
    >
      <div className="wao-container">
        <div style={{ marginBottom: "32px" }}>
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
            {lessons.length} שיעורים
          </div>
          <h2
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 900,
              fontSize: "clamp(1.5rem,3vw,2.2rem)",
              letterSpacing: "-0.02em",
            }}
          >
            {heading}
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "10px",
          }}
        >
          {lessons.map((lesson, i) => {
            const isVideo = lesson.hasVideo && lesson.wordCount < 150;
            const readTime = lesson.wordCount > 0
              ? `${Math.ceil(lesson.wordCount / 200)} דק׳ קריאה`
              : null;

            return (
              <Link
                key={lesson.slug}
                href={`/training/${courseSlug}/${lesson.slug}`}
                style={{
                  display: "flex",
                  gap: "14px",
                  alignItems: "flex-start",
                  background: "var(--elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "14px 16px",
                  textDecoration: "none",
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: "26px",
                    height: "26px",
                    borderRadius: "6px",
                    background: "var(--accent-dim)",
                    border: "1px solid var(--accent-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: "var(--accent)",
                    fontFamily: "var(--font-body), sans-serif",
                    marginTop: "1px",
                  }}
                >
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-rubik), sans-serif",
                      fontWeight: 700,
                      fontSize: "0.87rem",
                      color: "var(--text)",
                      lineHeight: 1.4,
                      marginBottom: "4px",
                    }}
                  >
                    {decodeTitle(lesson.title)}
                  </div>
                  <div
                    style={{
                      fontSize: "0.74rem",
                      color: "var(--muted)",
                      fontFamily: "var(--font-body), sans-serif",
                    }}
                  >
                    {isVideo ? "🎬 וידאו" : (readTime ?? "שיעור")}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
