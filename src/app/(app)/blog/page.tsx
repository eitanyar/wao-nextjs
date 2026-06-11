import type { Metadata } from "next";
import Link from "next/link";
import { readFileSync } from "fs";
import { join } from "path";

export const metadata: Metadata = {
  title: "בלוג שיווק דיגיטלי",
  description: "מאמרים מקצועיים על SEO, Google Ads, שיווק תוכן, פרנסה דיגיטלית וניהול כסף — מ-17 שנות ניסיון ישיר בשטח.",
  alternates: { canonical: "https://www.wao.co.il/blog" },
  openGraph: {
    title: "בלוג שיווק דיגיטלי | WAO",
    description: "SEO, Google Ads, שיווק שותפים, ניהול כסף — מאמרים מקצועיים מהשטח.",
    url: "https://www.wao.co.il/blog",
    type: "website",
    locale: "he_IL",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "דף הבית", item: "https://www.wao.co.il" },
    { "@type": "ListItem", position: 2, name: "בלוג", item: "https://www.wao.co.il/blog" },
  ],
};

interface StaticPost {
  title: string; slug: string; date: string;
  categories: string[]; wordCount: number; hasVideo: boolean;
  originalUrl: string; excerpt: string;
}

function getStaticPosts(): StaticPost[] {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "content-migration/blog-posts.json"), "utf8"));
  } catch { return []; }
}

function decodeTitle(t: string): string {
  return t.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
          .replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#8211;/g, "–");
}

function cleanExcerpt(excerpt: string): string {
  return excerpt.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/\[[^\]]+\]/g, "").replace(/&amp;/g, "&").slice(0, 170);
}

type PostCard = {
  slug: string; href: string; title: string; excerpt: string;
  date: string; wordCount: number;
};

function slugToHref(slug: string): string {
  return `/blog/${slug}`;
}

// ── Static post classification ─────────────────────────────────────────────
const DIGITAL_SLUGS = new Set([
  "find-duplicates-in-search-console-disavow-list",
  "taboola-outbrain-native-advertising",
  "purchase-a-domain",
  "how-to-add-srt-subtitles-to-video",
  "instagram-vs-facebook",
]);

const FINANCE_SLUGS = new Set([
  "profit-or-loss-in-stock-market",
  "savings-plan-for-every-child",
  "save-money-30-day-method",
  "save-money-for-a-house",
  "save-money-50-30-20",
  "smart-financial-management",
  "how-to-save-money",
  "how-to-get-out-of-debt-100-days",
]);

function PostCard({ post, accentColor }: { post: PostCard; accentColor: string }) {
  return (
    <Link
      href={post.href}
      style={{
        display: "flex", flexDirection: "column",
        background: "var(--elevated)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", textDecoration: "none",
        transition: "border-color 0.15s ease", overflow: "hidden",
      }}
    >
      <div style={{ padding: "16px 20px 14px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.97rem", lineHeight: 1.45, marginBottom: "8px", color: "var(--text)" }}>
          {post.title}
        </h3>
        {post.excerpt && (
          <p style={{ fontSize: "0.83rem", color: "var(--muted)", lineHeight: 1.68, flex: 1, marginBottom: "14px", fontFamily: "var(--font-body), sans-serif" }}>
            {post.excerpt.length > 140 ? post.excerpt.slice(0, 140) + "..." : post.excerpt}
          </p>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
          <time dateTime={post.date}>
            {new Date(post.date).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" })}
          </time>
          <span style={{ color: accentColor, fontWeight: 600 }}>{Math.ceil(post.wordCount / 200)} דקות קריאה</span>
        </div>
      </div>
    </Link>
  );
}

export default async function BlogPage() {
  const staticPosts = getStaticPosts();

  const toCard = (p: StaticPost): PostCard => ({
    slug: decodeURIComponent(p.slug),
    href: slugToHref(p.slug),
    title: decodeTitle(p.title),
    excerpt: cleanExcerpt(p.excerpt),
    date: p.date,
    wordCount: p.wordCount,
  });

  const digitalPosts = staticPosts.filter(p => DIGITAL_SLUGS.has(p.slug)).map(toCard);
  const financePosts = staticPosts.filter(p => FINANCE_SLUGS.has(p.slug)).map(toCard);
  const allDigital = [...digitalPosts];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section aria-label="בלוג" style={{ paddingTop: "clamp(100px,14vw,160px)", paddingBottom: "clamp(48px,6vw,80px)", position: "relative" }}>
        <div aria-hidden style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "70vw", height: "50vh", background: "radial-gradient(ellipse at center, rgba(74,227,181,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="hero-grid" />
        <div className="wao-container" style={{ position: "relative", zIndex: 1 }}>
          <nav aria-label="breadcrumb" className="breadcrumb" style={{ marginBottom: "28px" }}>
            <Link href="/">דף הבית</Link>
            <span className="breadcrumb-sep" aria-hidden>›</span>
            <span aria-current="page">בלוג</span>
          </nav>
          <h1 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(2.2rem,5vw,3.6rem)", lineHeight: 1.1, letterSpacing: "-0.025em", marginBottom: "16px" }}>
            הבלוג של <span className="text-gradient">WAO</span>
          </h1>
          <p style={{ fontSize: "clamp(1rem,1.8vw,1.1rem)", color: "var(--muted)", maxWidth: "600px", lineHeight: 1.75, fontFamily: "var(--font-body), sans-serif" }}>
            3 נושאים, כוונה אחת: לתת לכם את הידע שמחבר בין פרנסה דיגיטלית לשיווק מקצועי לניהול כסף נכון.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          SECTION 1: שיווק דיגיטלי — הליבה
          ════════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: "clamp(56px,7vw,80px) 0", background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
        <div className="wao-container">
          <div style={{ display: "flex", alignItems: "flex-start", gap: "20px", marginBottom: "32px", flexWrap: "wrap" }}>
            <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "rgba(74,227,181,0.12)", border: "1px solid rgba(74,227,181,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>🔍</div>
            <div style={{ flex: 1, minWidth: "220px" }}>
              <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.3rem,2.5vw,1.8rem)", letterSpacing: "-0.02em", marginBottom: "6px" }}>
                שיווק דיגיטלי — <span style={{ color: "var(--accent)" }}>הליבה המקצועית</span>
              </h2>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.7, fontFamily: "var(--font-body), sans-serif", margin: 0 }}>
                SEO, Google Ads, GTM, מדיה חברתית וכלים מקצועיים — מהצוות שעושה את זה כל יום.
              </p>
            </div>
            <Link href="/seo/guide" style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.78rem", fontWeight: 600, color: "var(--accent)", fontFamily: "var(--font-body), sans-serif", textDecoration: "none", whiteSpace: "nowrap" }}>
              מדריך SEO המלא →
            </Link>
          </div>

          {allDigital.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
              {allDigital.map(post => <PostCard key={post.slug} post={post} accentColor="var(--accent)" />)}
            </div>
          ) : (
            <div style={{ padding: "40px 0", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", fontSize: "0.95rem" }}>
              מאמרים נוספים בדרך —{" "}
              <Link href="/seo/guide" style={{ color: "var(--accent)" }}>ראו את המדריך המלא של SEO שלנו</Link>
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          SECTION 2: פרנסה דיגיטלית — גשר
          ════════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: "clamp(56px,7vw,80px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)" }}>
        <div className="wao-container">
          <div style={{ display: "flex", alignItems: "flex-start", gap: "20px", marginBottom: "20px", flexWrap: "wrap" }}>
            <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>🤝</div>
            <div style={{ flex: 1, minWidth: "220px" }}>
              <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.3rem,2.5vw,1.8rem)", letterSpacing: "-0.02em", marginBottom: "6px" }}>
                פרנסה דיגיטלית — <span style={{ color: "#a78bfa" }}>גשר לעסק אמיתי</span>
              </h2>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.7, fontFamily: "var(--font-body), sans-serif", margin: 0 }}>
                שיווק שותפים, הכנסה מהאינטרנט ועצמאות כלכלית — עם המפה שמחברת בין המטרה לכלים שמגיעים לשם.
              </p>
            </div>
          </div>

          {/* Bridge insight banner */}
          <div style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: "12px", padding: "16px 22px", marginBottom: "28px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
            <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>💡</span>
            <div>
              <strong style={{ fontFamily: "var(--font-rubik), sans-serif", fontSize: "0.88rem", color: "#a78bfa" }}>המחשבה שמשנה:</strong>
              <span style={{ color: "var(--muted)", fontSize: "0.86rem", fontFamily: "var(--font-body), sans-serif", lineHeight: 1.7 }}>
                {" "}כל דרך הכנסה — מסקרים ועד שיווק שותפים — גדלה פי 3–10 כשמוסיפים שיווק דיגיטלי.{" "}
                <Link href="/training/affiliate-marketing" style={{ color: "#a78bfa", fontWeight: 600 }}>מדריך שיווק שותפים →</Link>
                {" "}|{" "}
                <Link href="/training/make-money-online" style={{ color: "#a78bfa", fontWeight: 600 }}>40 דרכים להרוויח מהבית →</Link>
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
            {[
              { title: "מדריך שיווק שותפים המלא 2026", href: "/training/affiliate-marketing", excerpt: "מה זה שיווק שותפים, אילו תוכניות לבחור בישראל ובחו\"ל, איך להביא תנועה ואיך לסקייל לעסק אמיתי.", date: "2026-01-01", wordCount: 2800 },
              { title: "40 דרכים להרוויח כסף מהבית — מה באמת עובד ב-2026", href: "/training/make-money-online", excerpt: "מסקרים בתשלום ועד עסק דיגיטלי — הדירוג הישיר ללא מכירת חלומות.", date: "2026-01-01", wordCount: 2200 },
            ].map(p => (
              <Link key={p.href} href={p.href} style={{ display: "flex", flexDirection: "column", background: "var(--surface)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: "var(--radius)", textDecoration: "none", overflow: "hidden" }}>
                <div style={{ padding: "16px 20px 14px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <span style={{ display: "inline-block", fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: "var(--radius-pill)", background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)", fontFamily: "var(--font-body), sans-serif", marginBottom: "8px" }}>מדריך מקיף</span>
                  <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.97rem", lineHeight: 1.45, marginBottom: "8px", color: "var(--text)" }}>{p.title}</h3>
                  <p style={{ fontSize: "0.83rem", color: "var(--muted)", lineHeight: 1.68, flex: 1, marginBottom: "14px", fontFamily: "var(--font-body), sans-serif" }}>{p.excerpt}</p>
                  <span style={{ fontSize: "0.75rem", color: "#a78bfa", fontWeight: 600, fontFamily: "var(--font-body), sans-serif" }}>קראו עוד ←</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          SECTION 3: ניהול כסף — השלמת התמונה
          ════════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: "clamp(56px,7vw,80px) 0", background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
        <div className="wao-container">
          <div style={{ display: "flex", alignItems: "flex-start", gap: "20px", marginBottom: "20px", flexWrap: "wrap" }}>
            <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>💰</div>
            <div style={{ flex: 1, minWidth: "220px" }}>
              <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.3rem,2.5vw,1.8rem)", letterSpacing: "-0.02em", marginBottom: "6px" }}>
                ניהול כסף — <span style={{ color: "#10b981" }}>השלמת התמונה</span>
              </h2>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.7, fontFamily: "var(--font-body), sans-serif", margin: 0 }}>
                חיסכון, הכנסה פסיבית ותכנון פיננסי — כי אנחנו רוצים שתצליחו בכל הצירים, לא רק בשיווק.
              </p>
            </div>
          </div>

          {/* Finance bridge */}
          <div style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: "12px", padding: "16px 22px", marginBottom: "28px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
            <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>⚡</span>
            <p style={{ color: "var(--muted)", fontSize: "0.86rem", fontFamily: "var(--font-body), sans-serif", lineHeight: 1.7, margin: 0 }}>
              <strong style={{ color: "#10b981" }}>התובנה:</strong> החיסכון הגדול ביותר הוא הגדלת ההכנסה — לא קיצוץ בהוצאות.
              אם אתם עוסקים בניהול כסף, שיווק שותפים ו-Google Ads הם הכלים שמגדילים הכנסה בצד.
            </p>
          </div>

          {financePosts.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
              {financePosts.map(post => <PostCard key={post.slug} post={post} accentColor="#10b981" />)}
            </div>
          ) : (
            <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", fontSize: "0.9rem" }}>מאמרים בדרך.</p>
          )}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(56px,7vw,80px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)" }}>
        <div className="wao-container" style={{ textAlign: "center", maxWidth: "560px" }}>
          <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.4rem,2.5vw,2rem)", letterSpacing: "-0.02em", marginBottom: "12px" }}>
            רוצים שנעשה את זה{" "}
            <span className="text-gradient">בשבילכם?</span>
          </h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.75, fontFamily: "var(--font-body), sans-serif", marginBottom: "28px" }}>
            מ-SEO ועד Google Ads — ייעוץ ראשון ללא עלות.
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
