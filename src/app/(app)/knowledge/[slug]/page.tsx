import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KNOWLEDGE_ARTICLES, CATEGORY_LABELS, type KnowledgeCategory } from "@/data/knowledge";
import { renderMixed } from "@/lib/bidi";

const AUTHOR_IMG = "https://www.wao.co.il/eitan-yariv.avif";
const AUTHOR_SAME_AS = [
  "https://www.linkedin.com/in/eitanyariv/",
  "https://qa.askpavel.co.il/user/%D7%90%D7%99%D7%AA%D7%9F+%D7%99%D7%A8%D7%99%D7%91",
];

export const revalidate = 86400;

export function generateStaticParams() {
  return KNOWLEDGE_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = KNOWLEDGE_ARTICLES.find((a) => a.slug === slug);
  if (!article) return {};
  return {
    title: article.metaTitle
      ? { absolute: article.metaTitle }
      : article.title,
    description: article.summary,
    alternates: { canonical: `https://wao.co.il/knowledge/${slug}` },
    openGraph: {
      title: article.title,
      description: article.summary,
      url: `https://wao.co.il/knowledge/${slug}`,
      type: "article",
      publishedTime: article.updatedDate,
    },
  };
}

const CATEGORY_ICONS: Record<KnowledgeCategory, string> = {
  technical: "⚙️",
  onpage: "📝",
  content: "📖",
  algorithms: "🔄",
  ai: "🤖",
  performance: "⚡",
  links: "🔗",
  local: "📍",
  international: "🌍",
  tools: "🛠️",
};

const HEADING: React.CSSProperties = {
  fontFamily: "var(--font-rubik), sans-serif",
  color: "var(--text)",
  lineHeight: 1.3,
};

const BODY: React.CSSProperties = {
  fontFamily: "var(--font-body), sans-serif",
  color: "var(--text)",
  lineHeight: 1.75,
};

// Wrap Latin runs in <bdi dir="ltr"> so they render correctly inside an RTL paragraph.
// Core principle: isolate only the Latin sub-runs. Brackets are pulled into an LTR island
// ONLY when the whole bracket group is Hebrew-free; a bracket group that mixes Hebrew with
// Latin/digits keeps its ( ) in the RTL flow so the BiDi algorithm mirrors the pair naturally
// around the isolated Latin inside. This fixes "(Moz Spam Score 8 ומעלה)" — previously the
// opening ( was dragged into the LTR island while the ) was left behind, breaking the pair.
// Rules:
// renderMixed is now imported from @/lib/bidi

// Returns true when a paragraph (between blank lines) looks like a code sample.
function isCodeBlock(para: string): boolean {
  const t = para.trim();
  if (!t) return false;
  if (/^(const |let |var |import |export |function |class |if\s*\(|for\s*\(|return |<[a-zA-Z\/]|\{|#|\/\/|domain:|Cache-Control:|HTTP\/|@type|observer\.|document\.)/.test(t)) return true;
  const hasHebrew = /[֐-׿]/.test(t);
  if (!hasHebrew && /[;{}]/.test(t) && !t.startsWith("http")) return true;
  if (!hasHebrew && t.includes("\n")) return true;
  return false;
}

const CODE_BLOCK_STYLE: React.CSSProperties = {
  direction: "ltr",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "12px 16px",
  overflowX: "auto",
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: "0.82rem",
  lineHeight: 1.65,
  margin: 0,
  color: "var(--text)",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const INLINE_CODE_STYLE: React.CSSProperties = {
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: "0.85em",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "3px",
  padding: "1px 5px",
  direction: "ltr",
  display: "inline-block",
  maxWidth: "100%",
  wordBreak: "break-all",
  color: "var(--text)",
};

// Renders text with inline `backtick code` support, then bidi-wraps the rest.
function renderWithInlineCode(text: string): React.ReactNode {
  const segments: React.ReactNode[] = [];
  const re = /`([^`]+)`/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) segments.push(<Fragment key={key++}>{renderMixed(text.slice(last, match.index))}</Fragment>);
    segments.push(<code key={key++} style={INLINE_CODE_STYLE}>{match[1]}</code>);
    last = re.lastIndex;
  }
  if (last < text.length) segments.push(<Fragment key={key++}>{renderMixed(text.slice(last))}</Fragment>);
  return <>{segments}</>;
}

// Renders a full section content string:
// splits on blank lines → each chunk is either a code block or a prose paragraph.
function renderSectionContent(text: string, bodyStyle: React.CSSProperties): React.ReactNode {
  const chunks = text.split(/\n\n+/);
  return (
    <>
      {chunks.map((chunk, i) => {
        if (!chunk.trim()) return null;
        if (isCodeBlock(chunk)) {
          return (
            <pre key={i} style={CODE_BLOCK_STYLE}>
              <code>{chunk.trim()}</code>
            </pre>
          );
        }
        return (
          <p key={i} style={{ ...bodyStyle, margin: 0 }}>
            {renderWithInlineCode(chunk)}
          </p>
        );
      })}
    </>
  );
}

function slugifyId(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9֐-׿-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default async function KnowledgeArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = KNOWLEDGE_ARTICLES.find((a) => a.slug === slug);
  if (!article) notFound();

  const related = KNOWLEDGE_ARTICLES.filter((a) =>
    article.relatedSlugs.includes(a.slug)
  );

  const sameCat = KNOWLEDGE_ARTICLES.filter(
    (a) => a.category === article.category && a.slug !== article.slug
  ).slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.summary,
    dateModified: article.updatedDate,
    datePublished: article.updatedDate,
    url: `https://wao.co.il/knowledge/${article.slug}`,
    publisher: {
      "@type": "Organization",
      "@id": "https://www.wao.co.il/#org",
      name: "WAO",
      url: "https://www.wao.co.il",
    },
    author: {
      "@type": "Person",
      "@id": "https://www.wao.co.il/about#person",
      name: "איתן יריב",
      image: AUTHOR_IMG,
      url: "https://www.wao.co.il/about",
      sameAs: AUTHOR_SAME_AS,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://wao.co.il/knowledge/${article.slug}`,
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ראשי", item: "https://wao.co.il" },
      { "@type": "ListItem", position: 2, name: "מאגר ידע", item: "https://wao.co.il/knowledge" },
      {
        "@type": "ListItem",
        position: 3,
        name: article.titleShort,
        item: `https://wao.co.il/knowledge/${article.slug}`,
      },
    ],
  };

  const faqLd = article.faq && article.faq.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: article.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  } : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      <main
        dir="rtl"
        className="knowledge-main"
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "32px 20px 80px",
          fontFamily: "var(--font-body), sans-serif",
        }}
      >
        {/* Breadcrumb */}
        <nav
          aria-label="ניווט"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexWrap: "wrap",
            marginBottom: "28px",
            fontSize: "0.8rem",
            color: "var(--muted)",
            fontFamily: "var(--font-body), sans-serif",
          }}
        >
          <Link href="/" style={{ color: "var(--muted)", textDecoration: "none" }}>
            ראשי
          </Link>
          <span aria-hidden>›</span>
          <Link href="/knowledge" style={{ color: "var(--muted)", textDecoration: "none" }}>
            מאגר ידע
          </Link>
          <span aria-hidden>›</span>
          <Link
            href={`/knowledge#${article.category}`}
            style={{ color: "var(--muted)", textDecoration: "none" }}
          >
            {CATEGORY_ICONS[article.category]} {CATEGORY_LABELS[article.category]}
          </Link>
          <span aria-hidden>›</span>
          <span style={{ color: "var(--text)", fontWeight: 600 }}>
            {article.titleShort}
          </span>
        </nav>

        <div
          className="knowledge-layout"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr min(320px, 30%)",
            gap: "48px",
            alignItems: "start",
          }}
        >
          {/* Main content */}
          <article>
            {/* Category badge */}
            <div style={{ marginBottom: "12px" }}>
              <Link
                href={`/knowledge#${article.category}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "4px 12px",
                  borderRadius: "var(--radius-pill)",
                  background: "var(--accent-dim)",
                  border: "1px solid var(--accent-border)",
                  color: "var(--accent)",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-body), sans-serif",
                }}
              >
                <span aria-hidden>{CATEGORY_ICONS[article.category]}</span>
                {CATEGORY_LABELS[article.category]}
              </Link>
            </div>

            {/* Title */}
            <h1
              style={{
                ...HEADING,
                fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
                fontWeight: 800,
                marginBottom: "16px",
              }}
            >
              {renderMixed(article.title)}
            </h1>

            {/* Meta */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                marginBottom: "28px",
                fontSize: "0.8rem",
                color: "var(--muted)",
                fontFamily: "var(--font-body), sans-serif",
                flexWrap: "wrap",
              }}
            >
              <span>⏱ {article.readMinutes} דקות קריאה</span>
              <span>
                🗓 עודכן{" "}ב
                {new Date(article.updatedDate).toLocaleDateString("he-IL", {
                  year: "numeric",
                  month: "long",
                })}
              </span>
              <span>נכתב ע״י איתן יריב</span>
            </div>

            {/* Summary */}
            <p
              style={{
                ...BODY,
                fontSize: "1.05rem",
                color: "var(--muted)",
                padding: "16px 20px",
                borderRight: "3px solid var(--accent)",
                background: "var(--surface)",
                borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
                marginBottom: article.pillarLinks ? "20px" : "36px",
              }}
            >
              {renderMixed(article.summary)}
            </p>

            {/* Pillar links */}
            {article.pillarLinks && article.pillarLinks.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginBottom: "36px" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}>מדריכים קשורים:</span>
                {article.pillarLinks.map(({ label, href }) => (
                  <Link key={href} href={href} style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: "var(--radius-pill)", border: "1px solid var(--accent-border)", color: "var(--accent)", textDecoration: "none", fontFamily: "var(--font-body), sans-serif", background: "var(--accent-dim)" }}>
                    {label} ←
                  </Link>
                ))}
              </div>
            )}

            {/* Sections */}
            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              {article.sections.map((section, i) => {
                const sectionId = section.heading ? slugifyId(section.heading) : undefined;
                return (
                <section key={i} id={sectionId}>
                  {section.heading && (
                    <h2
                      id={sectionId}
                      style={{
                        ...HEADING,
                        fontSize: "1.2rem",
                        fontWeight: 700,
                        marginBottom: "12px",
                        scrollMarginTop: "80px",
                      }}
                    >
                      {renderMixed(section.heading)}
                    </h2>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {renderSectionContent(section.content, { ...BODY, fontSize: "0.97rem" })}
                  </div>
                </section>
                );
              })}
            </div>

            {/* FAQ */}
            {article.faq && article.faq.length > 0 && (
              <div style={{ marginTop: "48px" }}>
                <h2 style={{ ...HEADING, fontSize: "1.1rem", fontWeight: 700, marginBottom: "20px", paddingBottom: "10px", borderBottom: "2px solid var(--border)" }}>
                  שאלות נפוצות
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {article.faq.map((item, i) => (
                    <details key={i} style={{ background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                      <summary style={{ padding: "14px 18px", cursor: "pointer", fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "var(--text)", listStyle: "none", userSelect: "none" }}>
                        {renderMixed(item.q)}
                      </summary>
                      <div style={{ padding: "0 18px 16px", borderTop: "1px solid var(--border)" }}>
                        <p style={{ ...BODY, fontSize: "0.9rem", color: "var(--muted)", margin: 0, paddingTop: "12px" }}>
                          {renderMixed(item.a)}
                        </p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {/* Author bio */}
            <section style={{ marginTop: "48px" }} aria-label="הסמכות המקצועית">
              <div className="author-bio" itemScope itemType="https://schema.org/Person">
                <meta itemProp="image" content={AUTHOR_IMG} />
                <div className="author-avatar" role="img" aria-label="איתן יריב" />
                <div className="author-meta">
                  <div className="author-name" itemProp="name">איתן יריב</div>
                  <div className="author-title" itemProp="jobTitle">
                {renderMixed("מייסד WAO | מומחה SEO ושיווק דיגיטלי מאז 2006")}
              </div>
                  <p className="author-text" itemProp="description">
                    כל תכני מאגר הידע נכתבים ונערכים על ידי איתן יריב — מייסד WAO ויועץ SEO
                    בכיר. איתן מלווה עסקים ישראלים בקידום אורגני מאז 2006, ומבסס כל מדריך ומאמר
                    על ניסיון מעשי בשטח — לא על תיאוריות יבשות.
                  </p>
                  <div style={{ display: "flex", gap: "14px", marginTop: "12px", flexWrap: "wrap" }}>
                    <a href={AUTHOR_SAME_AS[0]} target="_blank" rel="noopener noreferrer" itemProp="sameAs"
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "var(--muted)", fontFamily: "var(--font-body),sans-serif" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                      LinkedIn
                    </a>
                    <a href={AUTHOR_SAME_AS[1]} target="_blank" rel="noopener noreferrer" itemProp="sameAs"
                      style={{ fontSize: "0.82rem", color: "var(--muted)", fontFamily: "var(--font-body),sans-serif" }}>
                      AskPavel
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* Related Articles */}
            {related.length > 0 && (
              <div style={{ marginTop: "48px" }}>
                <h2
                  style={{
                    ...HEADING,
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    marginBottom: "16px",
                    paddingBottom: "10px",
                    borderBottom: "2px solid var(--border)",
                  }}
                >
                  מדריכים קשורים
                </h2>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: "10px",
                  }}
                >
                  {related.map((rel) => (
                    <Link
                      key={rel.slug}
                      href={`/knowledge/${rel.slug}`}
                      className="knowledge-card"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        padding: "12px 14px",
                        background: "var(--elevated)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border)",
                        textDecoration: "none",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--text)",
                          fontFamily: "var(--font-body), sans-serif",
                        }}
                      >
                        {rel.titleShort}
                      </span>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--muted)",
                          fontFamily: "var(--font-body), sans-serif",
                        }}
                      >
                        {CATEGORY_ICONS[rel.category]} {CATEGORY_LABELS[rel.category]}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            {(() => {
              const cta =
                article.category === "ai"
                  ? {
                      headline: "הבינה המלאכותית עונה לגולשים. שהיא תצטט אותך.",
                      body: "GEO Bot מטייב את התוכן שלך, כדי שהתשובות של Google יפנו אליך. הכול אוטומטי, ב-₪199 בחודש.",
                      buttonText: "רוצה שיצטטו אותי",
                      href: "/geo",
                    }
                  : article.category === "local"
                  ? {
                      headline: "הלקוחות מחפשים לידך. תהיה מי שקופץ ראשון.",
                      body: "GMB Bot מנהל לך את הפרופיל העסקי בגוגל. פוסטים, ביקורות ותובנות, אוטומטית, ב-₪149 בחודש.",
                      buttonText: "לשלוט בפרופיל שלי",
                      href: "/google-business",
                    }
                  : {
                      headline: "רוצים יישום מקצועי?",
                      body: "המדריכים שלנו הם הבסיס — WAO מיישמת עבורכם.",
                      buttonText: "ייעוץ SEO ←",
                      href: "/seo/consulting",
                    };
              return (
                <div
                  style={{
                    marginTop: "48px",
                    padding: "24px",
                    background: "var(--surface)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    gap: "20px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <p
                      style={{
                        ...HEADING,
                        fontSize: "1rem",
                        fontWeight: 700,
                        marginBottom: "4px",
                      }}
                    >
                      {renderMixed(cta.headline)}
                    </p>
                    <p style={{ ...BODY, fontSize: "0.85rem", color: "var(--muted)" }}>
                      {renderMixed(cta.body)}
                    </p>
                  </div>
                  <Link
                    href={cta.href}
                    style={{
                      display: "inline-block",
                      padding: "10px 22px",
                      borderRadius: "var(--radius-pill)",
                      background: "var(--accent)",
                      color: "var(--bg)",
                      fontWeight: 700,
                      textDecoration: "none",
                      fontSize: "0.88rem",
                      fontFamily: "var(--font-body), sans-serif",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cta.buttonText}
                  </Link>
                </div>
              );
            })()}
          </article>

          {/* Sidebar */}
          <aside
            className="knowledge-sidebar"
            style={{
              position: "sticky",
              top: "80px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {/* TOC */}
            {article.sections.some((s) => s.heading) && (
              <div
                style={{
                  padding: "20px",
                  background: "var(--surface)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                }}
              >
                <p
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    fontFamily: "var(--font-body), sans-serif",
                    marginBottom: "12px",
                  }}
                >
                  תוכן העניינים
                </p>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {article.sections
                    .filter((s) => s.heading)
                    .map((s, i) => (
                      <li key={i}>
                        <a
                          href={`#${slugifyId(s.heading!)}`}
                          style={{
                            fontSize: "0.82rem",
                            color: "var(--muted)",
                            fontFamily: "var(--font-body), sans-serif",
                            lineHeight: 1.4,
                            textDecoration: "none",
                            display: "block",
                            padding: "2px 0",
                          }}
                        >
                          {renderMixed(s.heading!)}
                        </a>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* Same category articles */}
            {sameCat.length > 0 && (
              <div
                style={{
                  padding: "20px",
                  background: "var(--surface)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                }}
              >
                <p
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    fontFamily: "var(--font-body), sans-serif",
                    marginBottom: "12px",
                  }}
                >
                  {CATEGORY_ICONS[article.category]} עוד ב{CATEGORY_LABELS[article.category]}
                </p>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {sameCat.map((a) => (
                    <li key={a.slug}>
                      <Link
                        href={`/knowledge/${a.slug}`}
                        style={{
                          fontSize: "0.83rem",
                          color: "var(--text)",
                          textDecoration: "none",
                          fontFamily: "var(--font-body), sans-serif",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span>{a.titleShort}</span>
                        <span style={{ color: "var(--muted)", fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                          {a.readMinutes} דק׳
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/knowledge#${article.category}`}
                  style={{
                    display: "inline-block",
                    marginTop: "12px",
                    fontSize: "0.75rem",
                    color: "var(--accent)",
                    textDecoration: "none",
                    fontFamily: "var(--font-body), sans-serif",
                    fontWeight: 600,
                  }}
                >
                  כל המדריכים ←
                </Link>
              </div>
            )}

            {/* Back to index */}
            <Link
              href="/knowledge"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "12px 16px",
                background: "var(--elevated)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                color: "var(--muted)",
                textDecoration: "none",
                fontSize: "0.82rem",
                fontFamily: "var(--font-body), sans-serif",
                fontWeight: 600,
              }}
            >
              ← מאגר הידע
            </Link>
          </aside>
        </div>
      </main>
    </>
  );
}
