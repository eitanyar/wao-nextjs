import type { Metadata } from "next";
import Link from "next/link";
import { GLOSSARY, CATEGORY_LABELS, CATEGORY_COLORS, type GlossaryCategory } from "@/data/glossary";

export const metadata: Metadata = {
  title: "מילון מונחי שיווק דיגיטלי",
  description:
    "מילון מקיף של מונחי SEO, Google Ads, Analytics וטכנולוגיה — הסברים קצרים וברורים בעברית לבעלי עסקים ואנשי שיווק.",
  alternates: { canonical: "https://www.wao.co.il/glossary" },
  openGraph: {
    title: "מילון מונחי שיווק דיגיטלי | WAO",
    description: "90+ מונחים: SEO, PPC, Analytics, Tech — הסברים ברורים בעברית.",
    url: "https://www.wao.co.il/glossary",
    type: "website",
    locale: "he_IL",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "דף הבית", item: "https://www.wao.co.il" },
    { "@type": "ListItem", position: 2, name: "מילון מונחים", item: "https://www.wao.co.il/glossary" },
  ],
};

const definedTermSchema = {
  "@context": "https://schema.org",
  "@type": "DefinedTermSet",
  name: "מילון מונחי שיווק דיגיטלי WAO",
  url: "https://www.wao.co.il/glossary",
  hasDefinedTerm: Object.entries(GLOSSARY).map(([term, entry]) => ({
    "@type": "DefinedTerm",
    name: term,
    description: entry.body,
    inDefinedTermSet: "https://www.wao.co.il/glossary",
  })),
};

const CATEGORY_ORDER: GlossaryCategory[] = ["seo", "ppc", "analytics", "tech", "marketing"];

const CATEGORY_ICONS: Record<GlossaryCategory, string> = {
  seo: "🔍",
  ppc: "🎯",
  analytics: "📊",
  tech: "⚙️",
  marketing: "📢",
};

export default function GlossaryPage() {
  // Group terms by category, sorted alphabetically within each
  const byCategory = CATEGORY_ORDER.reduce<Record<GlossaryCategory, [string, typeof GLOSSARY[string]][]>>(
    (acc, cat) => {
      acc[cat] = Object.entries(GLOSSARY)
        .filter(([, e]) => e.category === cat)
        .sort(([a], [b]) => a.localeCompare(b, "en"));
      return acc;
    },
    {} as Record<GlossaryCategory, [string, typeof GLOSSARY[string]][]>
  );

  const totalTerms = Object.keys(GLOSSARY).length;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermSchema) }} />

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: "clamp(100px,14vw,160px)", paddingBottom: "clamp(48px,6vw,72px)", position: "relative" }}>
        <div aria-hidden style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "70vw", height: "50vh", background: "radial-gradient(ellipse at center, rgba(74,227,181,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="hero-grid" />
        <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "900px" }}>
          <nav aria-label="breadcrumb" className="breadcrumb" style={{ marginBottom: "28px" }}>
            <Link href="/">דף הבית</Link>
            <span className="breadcrumb-sep" aria-hidden>›</span>
            <span aria-current="page">מילון מונחים</span>
          </nav>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
            <span className="badge"><span className="badge-dot" />{totalTerms} מונחים</span>
            {CATEGORY_ORDER.map(cat => (
              <a key={cat} href={`#${cat}`} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 12px", borderRadius: "var(--radius-pill)", fontSize: "0.75rem", fontWeight: 600, background: `${CATEGORY_COLORS[cat]}12`, color: CATEGORY_COLORS[cat], border: `1px solid ${CATEGORY_COLORS[cat]}28`, fontFamily: "var(--font-body), sans-serif", textDecoration: "none" }}>
                {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
              </a>
            ))}
          </div>

          <h1 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(2rem,4vw,3rem)", lineHeight: 1.1, letterSpacing: "-0.025em", marginBottom: "16px" }}>
            מילון מונחי <span className="text-gradient">שיווק דיגיטלי</span>
          </h1>
          <p style={{ fontSize: "clamp(0.95rem,1.6vw,1.05rem)", color: "var(--muted)", maxWidth: "600px", lineHeight: 1.75, fontFamily: "var(--font-body), sans-serif" }}>
            המונחים שפוגשים בכל שיחה עם מומחה שיווק — מוסברים בעברית פשוטה לבעלי עסקים. לחצו על מונח כלשהו לפתיחת ההסבר המלא.
          </p>
        </div>
      </section>

      {/* ── Category sections ──────────────────────────────────────────────── */}
      {CATEGORY_ORDER.map((cat, ci) => (
        <section
          key={cat}
          id={cat}
          style={{ padding: "clamp(56px,7vw,80px) 0", background: ci % 2 === 0 ? "var(--surface)" : "var(--elevated)", borderTop: "1px solid var(--border)" }}
        >
          <div className="wao-container" style={{ maxWidth: "1000px" }}>
            {/* Category header */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "36px", paddingBottom: "20px", borderBottom: `2px solid ${CATEGORY_COLORS[cat]}25` }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: `${CATEGORY_COLORS[cat]}14`, border: `1px solid ${CATEGORY_COLORS[cat]}28`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0 }}>
                {CATEGORY_ICONS[cat]}
              </div>
              <div>
                <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.2rem,2.2vw,1.7rem)", color: "var(--text)", letterSpacing: "-0.02em" }}>
                  {CATEGORY_LABELS[cat]}
                </h2>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginTop: "2px" }}>
                  {byCategory[cat].length} מונחים
                </div>
              </div>
            </div>

            {/* Terms grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
              {byCategory[cat].map(([term, entry]) => (
                <details key={term} style={{ background: "var(--elevated)", border: `1px solid ${CATEGORY_COLORS[cat]}15`, borderRadius: "var(--radius)", overflow: "hidden" }}>
                  <summary style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "16px 18px", cursor: "pointer", listStyle: "none", userSelect: "none" }}>
                    <span style={{ display: "flex", flexDirection: "column", flex: 1, gap: "2px", minWidth: 0 }}>
                      <span style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.92rem", color: "var(--text)", direction: "ltr", textAlign: "right", unicode: "plaintext" } as React.CSSProperties}>
                        {term}
                      </span>
                      <span style={{ fontSize: "0.78rem", color: CATEGORY_COLORS[cat], fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}>
                        {entry.short}
                      </span>
                    </span>
                    <span aria-hidden style={{ color: CATEGORY_COLORS[cat], fontSize: "0.8rem", flexShrink: 0, marginTop: "2px" }}>▾</span>
                  </summary>
                  <div style={{ padding: "0 18px 16px", borderTop: `1px solid ${CATEGORY_COLORS[cat]}15` }}>
                    <p style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.78, fontFamily: "var(--font-body), sans-serif", margin: 0, paddingTop: "12px" }}>
                      {entry.body}
                    </p>
                    {entry.knowledgeSlug && (
                      <Link
                        href={`/knowledge/${entry.knowledgeSlug}`}
                        style={{
                          display: "inline-block",
                          marginTop: "10px",
                          fontSize: "0.78rem",
                          color: CATEGORY_COLORS[cat],
                          textDecoration: "none",
                          fontFamily: "var(--font-body), sans-serif",
                          fontWeight: 600,
                        }}
                      >
                        קרא עוד ←
                      </Link>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(56px,7vw,80px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)" }}>
        <div className="wao-container" style={{ textAlign: "center", maxWidth: "560px" }}>
          <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.4rem,2.5vw,1.9rem)", letterSpacing: "-0.02em", marginBottom: "12px" }}>
            יש מונח שחסר? —{" "}
            <span className="text-gradient">נוסיף אותו</span>
          </h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.75, fontFamily: "var(--font-body), sans-serif", marginBottom: "28px" }}>
            רוצים שנסביר מונח ספציפי שפגשתם? שלחו לנו ונוסיף למילון.
          </p>
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="tel:0526148860" className="btn-primary">📞 052-614-8860</a>
            <Link href="/contact" className="btn-outline">שלחו מונח</Link>
          </div>
        </div>
      </section>
    </>
  );
}
