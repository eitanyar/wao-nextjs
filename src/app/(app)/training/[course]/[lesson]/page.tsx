import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { readFileSync } from "fs";
import { join } from "path";
import LessonDashboard from "@/components/LessonDashboard";
import { renderMixed } from "@/lib/bidi";

export const revalidate = false;

type Props = { params: Promise<{ course: string; lesson: string }> };

interface Lesson {
  title: string;
  slug: string;
  date: string;
  wordCount: number;
  hasVideo: boolean;
  hasImages: boolean;
  originalUrl: string;
  excerpt: string;
  rawHtml: string;
  videoIds?: string[];
  localVideoUrl?: string;
  links?: { label: string; href: string; isMustWatch?: boolean }[];
  prerequisites?: string[];
  activeTask?: string;
  retrievalCheck?: {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
  } | {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
  }[];
  uiNavigator?: {
    actionSequence: string[];
    hebrewGuideUrl: string;
    hebrewGuideLabel?: string;
    demoVideoUrl?: string;
    demoVideoLabel?: string;
    geminiPrompt: string;
    troubleshootingExamples: string[];
  };
}

type LessonsByCourse = Record<string, Lesson[]>;

const COURSE_LABELS: Record<string, string> = {
  "affiliate-marketing": "שיווק שותפים",
  "google-ads-course":   "קורס Google Ads",
  "google-my-business":  "Google My Business",
  "google-tag-manager":  "Google Tag Manager",
  "make-money-online":   "הכנסה דיגיטלית",
  "seo-course":          "קורס SEO",
};

function getLessons(): LessonsByCourse {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "content-migration/lessons-by-course.json"), "utf8"));
  } catch { return {}; }
}

function getVideoMap(): LessonsByCourse {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "content-migration/video-map.json"), "utf8"));
  } catch { return {}; }
}

function findLesson(
  course: string,
  lessonSlug: string
): { lesson: Lesson; lessons: Lesson[] } | null {
  const all = getLessons();
  const key = `/training/${course}`;
  const lessons = all[key];
  if (!lessons) return null;
  const decoded = decodeURIComponent(lessonSlug);
  const lesson = lessons.find((l) => decodeURIComponent(l.slug) === decoded) ?? null;
  if (!lesson) return null;

  // Merge video data from video-map if available
  const videoMap = getVideoMap();
  const videoLessons = videoMap[key] ?? [];
  const videoEntry = videoLessons.find((v) => decodeURIComponent(v.slug) === decoded);
  if (videoEntry) {
    lesson.videoIds = videoEntry.videoIds;
    lesson.localVideoUrl = videoEntry.localVideoUrl;
    lesson.links = (videoEntry.links || []).filter((l: any) => !l.href.includes("placeholder-"));
    lesson.prerequisites = videoEntry.prerequisites || [];
    lesson.activeTask = videoEntry.activeTask || "";
    lesson.retrievalCheck = videoEntry.retrievalCheck || undefined;
    lesson.uiNavigator = videoEntry.uiNavigator || undefined;
  }

  return { lesson, lessons };
}

function decodeTitle(t: string): string {
  return t
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "–")
    .replace(/&#8217;/g, "'")
    .replace(/'/g, "'");
}

function cleanWpHtml(html: string): string {
  return html
    .replace(/\[button[^\]]*\][\s\S]*?\[\/button\]/gi, "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/(<p>\s*<\/p>\s*){2,}/g, "<p>&nbsp;</p>")
    .replace(/href="https?:\/\/(?:www\.)?wao\.co\.il(\/[^"]*)"/g, 'href="$1"')
    .replace(/href='https?:\/\/(?:www\.)?wao\.co\.il(\/[^']*)'/g, "href='$1'");
}

export async function generateStaticParams() {
  const all = getLessons();
  const params: { course: string; lesson: string }[] = [];
  for (const [key, lessons] of Object.entries(all)) {
    const course = key.replace("/training/", "");
    for (const l of lessons) {
      params.push({ course, lesson: l.slug });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { course, lesson: lessonSlug } = await params;
  const result = findLesson(course, lessonSlug);
  if (!result) return {};
  const { lesson } = result;
  const title = decodeTitle(lesson.title);
  const canonical = `https://www.wao.co.il/training/${course}/${lesson.slug}`;
  const desc = lesson.excerpt
    ? lesson.excerpt.replace(/<[^>]+>/g, "").replace(/\[[^\]]+\]/g, "").slice(0, 160)
    : undefined;
  return {
    title: `${title}`,
    description: desc,
    alternates: { canonical },
    openGraph: { title, description: desc, url: canonical, type: "article" },
  };
}

export default async function LessonPage({ params }: Props) {
  const { course, lesson: lessonSlug } = await params;
  const result = findLesson(course, lessonSlug);
  if (!result) notFound();

  const { lesson, lessons } = result;
  const title = decodeTitle(lesson.title);
  const courseLabel = COURSE_LABELS[course] ?? course;
  const canonical = `https://www.wao.co.il/training/${course}/${lesson.slug}`;
  const cleanedHtml = cleanWpHtml(lesson.rawHtml ?? "");
  const readTime = lesson.wordCount > 0 ? `${Math.ceil(lesson.wordCount / 200)} דקות קריאה` : null;
  const hasValidYoutube = (lesson.videoIds ?? []).some(vid => !vid.startsWith("placeholder-"));
  const isVideoLesson = hasValidYoutube || !!lesson.localVideoUrl;

  // Up to 3 other lessons in same course
  const related = lessons
    .filter((l) => decodeURIComponent(l.slug) !== decodeURIComponent(lessonSlug))
    .slice(0, 3);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    url: canonical,
    datePublished: lesson.date,
    author: {
      "@type": "Person",
      name: "איתן יריב",
      url: "https://www.wao.co.il/about",
      sameAs: [
        "https://www.linkedin.com/in/eitanyariv/",
        "https://qa.askpavel.co.il/user/איתן+יריב",
      ],
    },
    publisher: { "@type": "Organization", name: "WAO", url: "https://www.wao.co.il" },
    inLanguage: "he",
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית",  item: "https://www.wao.co.il" },
      { "@type": "ListItem", position: 2, name: "הדרכות",   item: "https://www.wao.co.il/training" },
      { "@type": "ListItem", position: 3, name: courseLabel, item: `https://www.wao.co.il/training/${course}` },
      { "@type": "ListItem", position: 4, name: title,       item: canonical },
    ],
  };

  let graphSchema: Record<string, unknown> | null = null;
  if (course === "google-ads-course") {
    const learningResource: Record<string, unknown> = {
      "@type": "LearningResource",
      "@id": `${canonical}#resource`,
      "name": title,
      "description": lesson.excerpt ? lesson.excerpt.replace(/<[^>]+>/g, "").replace(/\[[^\]]+\]/g, "") : title,
      "isPartOf": {
        "@type": "Course",
        "@id": "https://www.wao.co.il/training/google-ads-course#course",
        "name": "קורס Google Ads חינם",
        "description": "קורס Google Ads אסטרטגי מעשי לבעלי עסקים B2C ומשווקים.",
        "coursePrerequisites": lesson.prerequisites && lesson.prerequisites.length > 0
          ? lesson.prerequisites.map(p => `https://www.wao.co.il/training/google-ads-course/${p}`)
          : []
      }
    };

    if (lesson.links && lesson.links.length > 0) {
      learningResource.mentions = lesson.links.map(l => ({
        "@type": "WebPage",
        "name": l.label,
        "url": l.href
      }));
    }

    const videoObjects = (lesson.videoIds ?? []).filter(vid => !vid.startsWith("placeholder-")).map((videoId) => ({
      "@type": "VideoObject",
      "@id": `${canonical}#video-${videoId}`,
      "name": title,
      "description": lesson.excerpt ? lesson.excerpt.replace(/<[^>]+>/g, "").replace(/\[[^\]]+\]/g, "") : title,
      "thumbnailUrl": `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      "uploadDate": lesson.date,
      "embedUrl": `https://www.youtube-nocookie.com/embed/${videoId}`,
    }));

    graphSchema = {
      "@context": "https://schema.org",
      "@graph": [
        learningResource,
        ...videoObjects
      ]
    };
  }

  return (
    <>
      {graphSchema ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graphSchema) }} />
      ) : (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* ── Hero ── */}
      <section style={{ paddingTop: "clamp(100px,14vw,160px)", paddingBottom: "clamp(48px,6vw,80px)", position: "relative" }}>
        <div aria-hidden style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "70vw", height: "50vh", background: "radial-gradient(ellipse at center, rgba(74,227,181,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="hero-grid" />
        <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "800px" }}>
          <nav aria-label="breadcrumb" className="breadcrumb" style={{ marginBottom: "28px" }}>
            <Link href="/">דף הבית</Link>
            <span className="breadcrumb-sep" aria-hidden>›</span>
            <Link href="/training">הדרכות</Link>
            <span className="breadcrumb-sep" aria-hidden>›</span>
            <Link href={`/training/${course}`}>{renderMixed(courseLabel)}</Link>
            <span className="breadcrumb-sep" aria-hidden>›</span>
            <span aria-current="page">{renderMixed(title)}</span>
          </nav>

          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "24px", flexWrap: "wrap" }}>
            <span style={{ padding: "4px 12px", borderRadius: "var(--radius-pill)", background: "var(--accent-dim)", border: "1px solid var(--accent-border)", fontSize: "0.78rem", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}>
              {renderMixed(courseLabel)}
            </span>
            <time dateTime={lesson.date} style={{ fontSize: "0.85rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
              {new Date(lesson.date).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}
            </time>
            {readTime && (
              <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                · {readTime}
              </span>
            )}
            {isVideoLesson && (
              <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                · 🎬 שיעור וידאו
              </span>
            )}
          </div>

          <h1 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.8rem,4vw,3rem)", lineHeight: 1.12, letterSpacing: "-0.02em" }}>
            {renderMixed(title)}
          </h1>
        </div>
      </section>

      {/* ── Body ── */}
      <section style={{ paddingBottom: "clamp(56px,7vw,80px)", background: "var(--surface)" }}>
        <div className="wao-container" style={{ maxWidth: "780px" }}>

          {/* Local MP4 video player */}
          {lesson.localVideoUrl && (
            <div
              style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: "var(--radius-md)", marginBottom: "2rem", background: "#000" }}
            >
              <video
                src={lesson.localVideoUrl}
                controls
                preload="metadata"
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", borderRadius: "var(--radius-md)" }}
              />
            </div>
          )}

          {/* YouTube embeds for video lessons */}
          {(lesson.videoIds ?? []).filter(vid => !vid.startsWith("placeholder-")).map((videoId) => (
            <div
              key={videoId}
              style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: "var(--radius-md)", marginBottom: "2rem" }}
            >
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
              />
            </div>
          ))}

          {/* Lesson Dashboard (Tabs: Prerequisites, Active Task, UI Guides) */}
          {course === "google-ads-course" && (
            <div style={{ marginBottom: "2.5rem" }}>
              <LessonDashboard
                key={lesson.slug}
                currentLessonSlug={lesson.slug}
                lessons={lessons.map((l) => ({ title: decodeTitle(l.title), slug: l.slug }))}
                uiGuides={lesson.links}
                activeTask={lesson.activeTask}
                retrievalCheck={lesson.retrievalCheck}
                uiNavigator={lesson.uiNavigator}
              />
            </div>
          )}

          {cleanedHtml ? (
            <div
              className="wp-post-body"
              style={{ color: "var(--text)", fontFamily: "var(--font-body), sans-serif", lineHeight: 1.88, fontSize: "1.05rem" }}
              dangerouslySetInnerHTML={{ __html: cleanedHtml }}
            />
          ) : (
            <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
              צפו בסרטון למעלה לתוכן השיעור.
            </p>
          )}
        </div>
      </section>

      {/* ── Related lessons ── */}
      {related.length > 0 && (
        <section style={{ padding: "clamp(48px,6vw,72px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)" }}>
          <div className="wao-container" style={{ maxWidth: "780px" }}>
            <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.1rem,2vw,1.4rem)", letterSpacing: "-0.02em", marginBottom: "20px" }}>
              שיעורים נוספים ב{renderMixed(courseLabel)}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px" }}>
              {related.map((l) => (
                <Link
                  key={l.slug}
                  href={`/training/${course}/${l.slug}`}
                  style={{ display: "block", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 18px", textDecoration: "none" }}
                >
                  <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.88rem", color: "var(--text)", lineHeight: 1.45, marginBottom: "6px" }}>
                    {renderMixed(decodeTitle(l.title))}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                    {l.wordCount > 0 ? `${Math.ceil(l.wordCount / 200)} דקות קריאה` : "שיעור וידאו"}
                  </div>
                </Link>
              ))}
            </div>
            <div style={{ marginTop: "24px" }}>
              <Link
                href={`/training/${course}`}
                style={{ fontSize: "0.88rem", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}
              >
                ← כל השיעורים ב{renderMixed(courseLabel)}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Author bio ── */}
      <section style={{ padding: "clamp(48px,6vw,64px) 0", borderTop: "1px solid var(--border)" }} aria-label="על הכותב" itemScope itemType="https://schema.org/Person">
        <div className="wao-container" style={{ maxWidth: "780px" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "16px" }}>
            הסמכות המקצועית
          </div>
          <div className="author-bio">
            <meta itemProp="image" content="https://www.wao.co.il/eitan-yariv.avif" />
            <div className="author-avatar" role="img" aria-label="איתן יריב" />
            <div className="author-meta">
              <div className="author-name" itemProp="name">איתן יריב</div>
              <div className="author-title" itemProp="jobTitle">
                {renderMixed("מומחה שיווק דיגיטלי | מייסד WAO | 20+ שנות ניסיון")}
              </div>
              <p className="author-text" itemProp="description">
                מלווה עסקים ישראלים בצמיחה דיגיטלית מאז ראשית ימי קידום אתרים בגוגל ישראל. מנטור ויועץ מנוסה ל-SEO ו-Google Ads.
              </p>
              <div style={{ display: "flex", gap: "14px", marginTop: "12px", flexWrap: "wrap" }}>
                <a href="https://www.linkedin.com/in/eitanyariv/" target="_blank" rel="noopener noreferrer" itemProp="sameAs" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                  LinkedIn
                </a>
                <a href="https://qa.askpavel.co.il/user/%D7%90%D7%99%D7%AA%D7%9F+%D7%99%D7%A8%D7%99%D7%91" target="_blank" rel="noopener noreferrer" itemProp="sameAs" style={{ fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                  AskPavel
                </a>
                <Link href="/about" style={{ fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>קראו עוד →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "clamp(56px,7vw,80px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)" }}>
        <div className="wao-container" style={{ textAlign: "center", maxWidth: "560px" }}>
          <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.4rem,2.5vw,2rem)", letterSpacing: "-0.02em", marginBottom: "12px" }}>
            רוצים לדעת איך זה רלוונטי{" "}
            <span className="text-gradient">לעסק שלכם?</span>
          </h2>
          <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "28px", lineHeight: 1.75 }}>
            ייעוץ ראשון ללא עלות — נבדוק ביחד את הפוטנציאל.
          </p>
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="tel:0526148860" className="btn-primary">📞 052-614-8860</a>
            <Link href="/contact" className="btn-outline">השאירו פרטים</Link>
          </div>
        </div>
      </section>
    </>
  );
}
