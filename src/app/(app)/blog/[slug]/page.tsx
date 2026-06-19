import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { readFileSync } from "fs";
import { join } from "path";
import { BLOG_FAQS } from "@/data/blog-faqs";

type Props = { params: Promise<{ slug: string }> };

interface StaticPost {
  title: string; slug: string; date: string;
  categories: string[]; wordCount: number; hasVideo: boolean;
  originalUrl: string; excerpt: string; rawHtml: string;
}

function getStaticPosts(): StaticPost[] {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "content-migration/blog-posts.json"), "utf8"));
  } catch { return []; }
}

function findStaticPost(slug: string): StaticPost | null {
  return getStaticPosts().find(p => decodeURIComponent(p.slug) === slug) ?? null;
}

function decodeTitle(t: string): string {
  return t.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
          .replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#8211;/g, "–");
}

function cleanWpHtml(html: string): string {
  return html
    .replace(/\[button[^\]]*\][\s\S]*?\[\/button\]/gi, "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/(<p>\s*<\/p>\s*){2,}/g, "<p>&nbsp;</p>");
}

function resolveCategory(cats: string[]): string {
  const dc = cats.map(c => decodeURIComponent(c).toLowerCase());
  if (dc.some(c => /קידום|seo/.test(c))) return "קידום אתרים";
  if (dc.some(c => /אינסטגרם|פייסבוק|social/.test(c))) return "מדיה חברתית";
  if (dc.some(c => /טאבולה|אאוטבריין|שיווק/.test(c))) return "שיווק דיגיטלי";
  if (dc.some(c => /כסף|חיסכון|הון|פיננס|ילד|מינוס/.test(c))) return "פיננסי";
  return "כללי";
}

const SAME_AS = [
  "https://www.linkedin.com/in/eitan-yariv",
  "https://qa.askpavel.co.il/user/איתן+יריב",
];

export async function generateStaticParams() {
  const staticPosts = getStaticPosts();
  return staticPosts.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const staticPost = findStaticPost(decodeURIComponent(slug));
  if (!staticPost) return {};
  const title = decodeTitle(staticPost.title);
  const canonical = `https://www.wao.co.il/blog/${staticPost.slug}`;
  return {
    title: `${title}`,
    description: staticPost.excerpt.replace(/<[^>]+>/g, "").replace(/\[[^\]]+\]/g, "").slice(0, 160),
    alternates: { canonical },
    openGraph: { title, url: canonical, type: "article" },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const staticPost = findStaticPost(decodedSlug);
  if (!staticPost) notFound();

  const title = decodeTitle(staticPost.title);
  const category = resolveCategory(staticPost.categories);
  const canonical = `https://www.wao.co.il/blog/${staticPost.slug}`;
  const cleanedHtml = cleanWpHtml(staticPost.rawHtml);
  const readTime = `${Math.ceil(staticPost.wordCount / 200)} דקות קריאה`;
  const faqs = BLOG_FAQS[decodedSlug] ?? [];

  // Related posts: up to 3 other posts in same category, excluding current
  const allPosts = getStaticPosts();
  const relatedPosts = allPosts
    .filter(p => decodeURIComponent(p.slug) !== decodedSlug && resolveCategory(p.categories) === category)
    .slice(0, 3);

  const articleSchema = {
    "@context": "https://schema.org", "@type": "Article",
    headline: title, url: canonical,
    datePublished: staticPost.date,
    author: { "@type": "Person", name: "איתן יריב", url: "https://www.wao.co.il/about", sameAs: SAME_AS },
    publisher: { "@type": "Organization", name: "WAO", url: "https://www.wao.co.il" },
    inLanguage: "he",
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: "https://www.wao.co.il" },
      { "@type": "ListItem", position: 2, name: "בלוג", item: "https://www.wao.co.il/blog" },
      { "@type": "ListItem", position: 3, name: title, item: canonical },
    ],
  };
  const faqSchema = faqs.length > 0 ? {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: faqs.map(f => ({
      "@type": "Question", name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  } : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}

      {/* Hero */}
      <section style={{ paddingTop: "clamp(100px,14vw,160px)", paddingBottom: "clamp(48px,6vw,80px)", position: "relative" }}>
        <div aria-hidden style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "70vw", height: "50vh", background: "radial-gradient(ellipse at center, rgba(74,227,181,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="hero-grid" />
        <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "800px" }}>
          <nav aria-label="breadcrumb" className="breadcrumb" style={{ marginBottom: "28px" }}>
            <Link href="/">דף הבית</Link><span className="breadcrumb-sep" aria-hidden>›</span>
            <Link href="/blog">בלוג</Link><span className="breadcrumb-sep" aria-hidden>›</span>
            <span aria-current="page">{title}</span>
          </nav>

          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "24px", flexWrap: "wrap" }}>
            <span style={{ padding: "4px 12px", borderRadius: "var(--radius-pill)", background: "var(--accent-dim)", border: "1px solid var(--accent-border)", fontSize: "0.78rem", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}>
              {category}
            </span>
            <time dateTime={staticPost.date} style={{ fontSize: "0.85rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
              {new Date(staticPost.date).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}
            </time>
            <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>· {readTime}</span>
          </div>

          <h1 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.8rem,4vw,3rem)", lineHeight: 1.12, letterSpacing: "-0.02em" }}>
            {title}
          </h1>
        </div>
      </section>

      {/* Body — raw WP HTML */}
      <section style={{ paddingBottom: "clamp(56px,7vw,80px)", background: "var(--surface)" }}>
        <div className="wao-container" style={{ maxWidth: "780px" }}>
          <div
            className="wp-post-body"
            style={{ color: "var(--text)", fontFamily: "var(--font-body), sans-serif", lineHeight: 1.88, fontSize: "1.05rem" }}
            dangerouslySetInnerHTML={{ __html: cleanedHtml }}
          />
        </div>
      </section>

      {/* FAQ section */}
      {faqs.length > 0 && (
        <section style={{ padding: "clamp(48px,6vw,72px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)" }}>
          <div className="wao-container" style={{ maxWidth: "780px" }}>
            <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.3rem,2.3vw,1.7rem)", letterSpacing: "-0.02em", marginBottom: "24px" }}>
              שאלות נפוצות
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {faqs.map((faq, i) => (
                <details key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                  <summary style={{ padding: "16px 20px", cursor: "pointer", fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "var(--text)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                    <span>{faq.q}</span>
                    <span aria-hidden style={{ color: "var(--accent)", fontSize: "0.8rem", flexShrink: 0 }}>▾</span>
                  </summary>
                  <div style={{ padding: "0 20px 16px", borderTop: "1px solid var(--border)" }}>
                    <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.78, fontFamily: "var(--font-body), sans-serif", margin: 0, paddingTop: "12px" }}>{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Author bio */}
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
              <div className="author-title" itemProp="jobTitle">מומחה שיווק דיגיטלי | מייסד WAO | 20+ שנות ניסיון</div>
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

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <section style={{ padding: "clamp(48px,6vw,72px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)" }}>
          <div className="wao-container" style={{ maxWidth: "780px" }}>
            <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.1rem,2vw,1.4rem)", letterSpacing: "-0.02em", marginBottom: "20px" }}>
              מאמרים קשורים
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px" }}>
              {relatedPosts.map(rp => (
                <Link key={rp.slug} href={`/blog/${rp.slug}`} style={{ display: "block", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 18px", textDecoration: "none", transition: "border-color 0.15s ease" }}>
                  <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.88rem", color: "var(--text)", lineHeight: 1.45, marginBottom: "6px" }}>
                    {decodeTitle(rp.title)}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                    {Math.ceil(rp.wordCount / 200)} דקות קריאה
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <PostCta />
    </>
  );
}

function PostCta() {
  return (
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
  );
}
