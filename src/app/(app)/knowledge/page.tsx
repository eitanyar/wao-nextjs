import type { Metadata } from "next";
import Link from "next/link";
import { KNOWLEDGE_ARTICLES, CATEGORY_LABELS, type KnowledgeCategory } from "@/data/knowledge";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "מאגר ידע SEO — כל מה שצריך לדעת | WAO",
  description: "מדריכים קצרים ומקצועיים על כל נושאי SEO: טכני, On-Page, תוכן, אלגוריתמים, AI, ביצועים, קישורים, SEO מקומי ובינלאומי.",
  alternates: { canonical: "https://wao.co.il/knowledge" },
};

const HEADING: React.CSSProperties = {
  fontFamily: "var(--font-rubik), sans-serif",
  color: "var(--text)",
  lineHeight: 1.25,
};

const BODY: React.CSSProperties = {
  fontFamily: "var(--font-body), sans-serif",
  color: "var(--text)",
  lineHeight: 1.7,
};

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

const categories = Object.keys(CATEGORY_LABELS) as KnowledgeCategory[];

function ArticleCard({ article }: { article: (typeof KNOWLEDGE_ARTICLES)[0] }) {
  return (
    <Link
      href={`/knowledge/${article.slug}`}
      className="knowledge-article-card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        padding: "14px 16px",
        background: "var(--elevated)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        textDecoration: "none",
      }}
    >
      <span
        style={{
          ...BODY,
          fontSize: "0.9rem",
          fontWeight: 600,
          color: "var(--text)",
        }}
      >
        {article.titleShort}
      </span>
      <span
        style={{
          ...BODY,
          fontSize: "0.78rem",
          color: "var(--muted)",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {article.summary}
      </span>
      <span
        style={{
          fontSize: "0.72rem",
          color: "var(--muted)",
          fontFamily: "var(--font-body), sans-serif",
          marginTop: "2px",
        }}
      >
        {article.readMinutes} דקות קריאה
      </span>
    </Link>
  );
}

export default function KnowledgePage() {
  const byCategory = categories.map((cat) => ({
    cat,
    articles: KNOWLEDGE_ARTICLES.filter((a) => a.category === cat),
  })).filter((g) => g.articles.length > 0);

  const totalArticles = KNOWLEDGE_ARTICLES.length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "מאגר ידע SEO",
    description: "מדריכים קצרים ומקצועיים על כל נושאי SEO",
    url: "https://wao.co.il/knowledge",
    numberOfItems: totalArticles,
    publisher: {
      "@type": "Organization",
      name: "WAO Digital Marketing",
      url: "https://wao.co.il",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main
        dir="rtl"
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "40px 20px 80px",
          fontFamily: "var(--font-body), sans-serif",
        }}
      >
        {/* Hero */}
        <div style={{ marginBottom: "48px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "var(--radius-pill)",
              background: "var(--accent-dim)",
              border: "1px solid var(--accent-border)",
              color: "var(--accent)",
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: "16px",
              fontFamily: "var(--font-body), sans-serif",
            }}
          >
            {totalArticles} מדריכים
          </div>
          <h1
            style={{
              ...HEADING,
              fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
              fontWeight: 800,
              marginBottom: "16px",
            }}
          >
            מאגר ידע SEO
          </h1>
          <p
            style={{
              ...BODY,
              fontSize: "1.05rem",
              color: "var(--muted)",
              maxWidth: "620px",
              marginBottom: "24px",
            }}
          >
            מדריכים קצרים, מעמיקים ועדכניים על כל נושאי SEO — מהיסודות הטכניים
            ועד AI Overviews ו-GEO. כל מדריך נכתב עם רלוונטיות ל-2026 ומעלה.
          </p>

          {/* Category nav */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {byCategory.map(({ cat, articles }) => (
              <a
                key={cat}
                href={`#${cat}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 12px",
                  borderRadius: "var(--radius-pill)",
                  background: "var(--elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  fontFamily: "var(--font-body), sans-serif",
                }}
              >
                <span aria-hidden>{CATEGORY_ICONS[cat]}</span>
                {CATEGORY_LABELS[cat]}
                <span
                  style={{
                    fontSize: "0.68rem",
                    padding: "1px 6px",
                    borderRadius: "var(--radius-pill)",
                    background: "var(--accent-dim)",
                    color: "var(--accent)",
                    border: "1px solid var(--accent-border)",
                  }}
                >
                  {articles.length}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Categories */}
        {byCategory.map(({ cat, articles }) => (
          <section key={cat} id={cat} style={{ marginBottom: "52px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "20px",
                paddingBottom: "12px",
                borderBottom: "2px solid var(--border)",
              }}
            >
              <span aria-hidden style={{ fontSize: "1.3rem" }}>
                {CATEGORY_ICONS[cat]}
              </span>
              <h2
                style={{
                  ...HEADING,
                  fontSize: "1.35rem",
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                {CATEGORY_LABELS[cat]}
              </h2>
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "2px 8px",
                  borderRadius: "var(--radius-pill)",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                  fontFamily: "var(--font-body), sans-serif",
                  marginRight: "auto",
                }}
              >
                {articles.length} מדריכים
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "12px",
              }}
            >
              {articles.map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          </section>
        ))}

        {/* Bottom CTA */}
        <div
          style={{
            marginTop: "48px",
            padding: "28px",
            background: "var(--surface)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            textAlign: "center",
          }}
        >
          <p
            style={{
              ...BODY,
              color: "var(--muted)",
              marginBottom: "16px",
            }}
          >
            מחפשים ייעוץ SEO מקצועי מעבר לתיאוריה?
          </p>
          <Link
            href="/seo/consulting"
            style={{
              display: "inline-block",
              padding: "10px 24px",
              borderRadius: "var(--radius-pill)",
              background: "var(--accent)",
              color: "var(--bg)",
              fontWeight: 700,
              textDecoration: "none",
              fontSize: "0.9rem",
              fontFamily: "var(--font-body), sans-serif",
            }}
          >
            צרו קשר לייעוץ ←
          </Link>
        </div>
      </main>
    </>
  );
}
