import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import LessonDashboard from "@/components/LessonDashboard";
import { renderMixed } from "@/lib/bidi";
import {
  WEBSITE_COURSE_LESSONS,
  findWebsiteLesson,
} from "@/data/website-course-data";

export const revalidate = false;

type Props = { params: Promise<{ lesson: string }> };

export async function generateStaticParams() {
  return WEBSITE_COURSE_LESSONS.map((l) => ({ lesson: l.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lesson: slug } = await params;
  const lesson = findWebsiteLesson(slug);
  if (!lesson) return {};
  const canonical = `https://www.wao.co.il/training/website-course/${slug}`;
  return {
    title: `${lesson.title} | WAO`,
    description: lesson.description,
    alternates: { canonical },
    openGraph: {
      title: lesson.title,
      description: lesson.description,
      url: canonical,
      type: "article",
      locale: "he_IL",
      images: [{ url: `https://www.wao.co.il${lesson.thumbnail}`, width: 1280, height: 720 }],
    },
  };
}

export default async function WebsiteLessonPage({ params }: Props) {
  const { lesson: slug } = await params;
  const lesson = findWebsiteLesson(slug);
  if (!lesson) notFound();

  const canonical = `https://www.wao.co.il/training/website-course/${slug}`;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: "https://www.wao.co.il" },
      { "@type": "ListItem", position: 2, name: "הדרכות", item: "https://www.wao.co.il/training" },
      {
        "@type": "ListItem",
        position: 3,
        name: "קורס בניית אתרים + AI",
        item: "https://www.wao.co.il/training/website-course",
      },
      { "@type": "ListItem", position: 4, name: lesson.title, item: canonical },
    ],
  };

  const videoSchema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: lesson.title,
    description: lesson.description,
    thumbnailUrl: `https://www.wao.co.il${lesson.thumbnail}`,
    embedUrl: `https://www.youtube.com/embed/${lesson.videoId}`,
    uploadDate: new Date().toISOString().split("T")[0],
    publisher: { "@type": "Organization", name: "WAO", url: "https://www.wao.co.il" },
  };

  const lessonList = WEBSITE_COURSE_LESSONS.map((l) => ({ title: l.title, slug: l.slug }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }}
      />

      {/* ── Hero ── */}
      <section
        style={{
          paddingTop: "clamp(100px,14vw,160px)",
          paddingBottom: "clamp(32px,4vw,56px)",
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
              "radial-gradient(ellipse at center, rgba(74,227,181,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div className="hero-grid" />
        <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "800px" }}>
          {/* Breadcrumb */}
          <nav aria-label="breadcrumb" className="breadcrumb" style={{ marginBottom: "28px" }}>
            <Link href="/">דף הבית</Link>
            <span className="breadcrumb-sep" aria-hidden>›</span>
            <Link href="/training">הדרכות</Link>
            <span className="breadcrumb-sep" aria-hidden>›</span>
            <Link href="/training/website-course">
              {renderMixed("קורס בניית אתרים + AI")}
            </Link>
            <span className="breadcrumb-sep" aria-hidden>›</span>
            <span aria-current="page">{renderMixed(lesson.title)}</span>
          </nav>

          {/* Badges */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "24px", flexWrap: "wrap" }}>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: "var(--radius-pill)",
                background: "var(--accent-dim)",
                border: "1px solid var(--accent-border)",
                fontSize: "0.78rem",
                color: "var(--accent)",
                fontWeight: 600,
              }}
            >
              {renderMixed("קורס בניית אתרים + AI")}
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              · 🎬 שיעור וידאו · {lesson.duration}
            </span>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 900,
              fontSize: "clamp(1.8rem,4vw,3rem)",
              lineHeight: 1.12,
              letterSpacing: "-0.02em",
            }}
          >
            {renderMixed(lesson.title)}
          </h1>
        </div>
      </section>

      {/* ── Body ── */}
      <section style={{ paddingBottom: "clamp(56px,7vw,80px)", background: "var(--surface)" }}>
        <div className="wao-container" style={{ maxWidth: "780px" }}>

          {/* YouTube embed */}
          <div
            style={{
              position: "relative",
              paddingBottom: "56.25%",
              height: 0,
              overflow: "hidden",
              borderRadius: "var(--radius-md)",
              marginBottom: "2rem",
              background: "#0b0f19",
            }}
          >
            <iframe
              src={`https://www.youtube.com/embed/${lesson.videoId}`}
              title={lesson.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: 0,
                borderRadius: "var(--radius-md)",
              }}
            />
          </div>

          {/* LessonDashboard — Prereqs / Task / Guides tabs */}
          <div style={{ marginBottom: "2.5rem" }}>
            <LessonDashboard
              key={lesson.slug}
              currentLessonSlug={lesson.slug}
              lessons={lessonList}
              uiGuides={lesson.uiGuides}
              activeTask={lesson.activeTask}
            />
          </div>

          {/* Description */}
          <p
            style={{
              color: "var(--muted)",
              fontFamily: "var(--font-body), sans-serif",
              fontSize: "1rem",
              lineHeight: 1.8,
            }}
          >
            {renderMixed(lesson.description)}
          </p>
        </div>
      </section>

      {/* ── Next lesson CTA ── */}
      {(() => {
        const currentIdx = lessonList.findIndex((l) => l.slug === lesson.slug);
        const next = lessonList[currentIdx + 1];
        if (!next) return null;
        return (
          <section style={{ paddingBottom: "clamp(48px,6vw,72px)", background: "var(--surface)" }}>
            <div className="wao-container" style={{ maxWidth: "780px" }}>
              <Link
                href={`/training/website-course/${next.slug}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  padding: "20px 28px",
                  background: "var(--card)",
                  border: "1px solid var(--accent-border)",
                  borderRadius: "var(--radius-md)",
                  textDecoration: "none",
                  transition: "box-shadow 0.2s",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--accent)",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    השיעור הבא
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-rubik), sans-serif",
                      fontWeight: 700,
                      fontSize: "1rem",
                    }}
                  >
                    {renderMixed(next.title)}
                  </div>
                </div>
                <span style={{ color: "var(--accent)", fontSize: "1.5rem", flexShrink: 0 }}>‹</span>
              </Link>
            </div>
          </section>
        );
      })()}
    </>
  );
}
