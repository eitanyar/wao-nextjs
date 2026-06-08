import Link from "next/link";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = { data?: any };

const DEFAULT_POSTS = [
  { category: "SEO", title: "איך לבחור מילות מפתח שמביאות לקוחות — לא רק תנועה", excerpt: "המדריך המעשי לבחירת מילות מפתח שממירות: כוונת חיפוש, נפח, תחרות — ואיך AI משנה את הכללים.", date: "20 מרץ 2026", readTime: "8 דק׳ קריאה", href: "/blog/keyword-research-guide" },
  { category: "Google Ads", title: "5 טעויות בניהול Google Ads שעולות לך כסף כל יום", excerpt: "מניסיון של מאות קמפיינים — אלה הטעויות שאנחנו רואים שוב ושוב, ואיך לתקן אותן תוך שעה.", date: "12 מרץ 2026", readTime: "6 דק׳ קריאה", href: "/blog/google-ads-mistakes" },
  { category: "שיווק תוכן", title: "תוכן שגוגל AI אוהב ב-2026: מה השתנה ומה נשאר", excerpt: "AI Overviews שינו את חוקי המשחק. הנה איך לכתוב תוכן שמופיע בתוצאות ה-AI ומביא תנועה אורגנית.", date: "5 מרץ 2026", readTime: "10 דק׳ קריאה", href: "/blog/content-google-ai-2026" },
];

export default function BlogPreview({ data }: Props) {
  const eyebrow = data?.eyebrow ?? "הבלוג שלנו";
  const titlePre = data?.titlePre ?? "ידע שמביא";
  const titleAccent = data?.titleAccent ?? "תוצאות";
  const posts = (data?.posts?.length ? data.posts : DEFAULT_POSTS) as { category?: string | null; title?: string | null; excerpt?: string | null; date?: string | null; readTime?: string | null; href?: string | null }[];

  return (
    <section className="wao-section" style={{ background: "var(--surface)" }} aria-label="מאמרים אחרונים">
      <div className="wao-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "52px", gap: "24px", flexWrap: "wrap" }}>
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <h2 className="section-title">
              {titlePre} <span className="text-gradient">{titleAccent}</span>
            </h2>
          </div>
          <Link href="/blog" className="btn-outline" style={{ flexShrink: 0 }}>
            כל המאמרים
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {posts.map((post, i) => (
            <Link key={i} href={post.href ?? "/blog"} className="blog-card">
              <div style={{ padding: "16px 24px 0" }}>
                <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: "var(--radius-pill)", background: "var(--accent-dim)", border: "1px solid var(--accent-border)", fontSize: "0.75rem", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}>
                  {post.category}
                </span>
              </div>
              <div style={{ padding: "20px 24px 28px", flex: 1, display: "flex", flexDirection: "column" }}>
                <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1.08rem", lineHeight: 1.4, marginBottom: "12px", color: "var(--text)" }}>{post.title}</h3>
                <p style={{ fontSize: "0.9rem", color: "var(--muted)", lineHeight: 1.7, flex: 1, marginBottom: "20px" }}>{post.excerpt}</p>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                  <span>{post.date}</span>
                  <span>{post.readTime}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
