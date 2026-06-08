import Link from "next/link";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = { data?: any };

const DEFAULT_ITEMS = [
  { icon: "🔍", title: "קידום אתרים (SEO)", desc: "אסטרטגיית SEO מבוססת נתונים שמעלה אתכם לראש תוצאות גוגל ומשאירה אתכם שם.", href: "/seo" },
  { icon: "📢", title: "פרסום בגוגל", desc: "קמפיינים ממוקדים ב-Google Ads ו-YouTube שממקסמים את ה-ROI בכל שקל שיווקי.", href: "/google-ads" },
  { icon: "✍️", title: "שיווק תוכן", desc: "תוכן שמושך קוראים, בונה סמכות ומניע להמרה — מאמרים, עמודים ואינפוגרפיקות.", href: "/content" },
  { icon: "📱", title: "מדיה חברתית", desc: "נוכחות ממותגת בפייסבוק, אינסטגרם ולינקדאין שמגדילה קהל ויוצרת קשר אמיתי.", href: "/social" },
  { icon: "🎓", title: "הכשרות שיווק", desc: "ורקשופים וקורסים מעשיים לצוותים ומנהלים — שיווק דיגיטלי, SEO ו-Google Ads.", href: "/training" },
  { icon: "🧭", title: "יעוץ שיווקי", desc: "ייעוץ אסטרטגי אישי ממומחה עם 20+ שנות ניסיון — לבניית תכנית שיווק שמניעה צמיחה.", href: "/consulting" },
];

export default function Services({ data }: Props) {
  const eyebrow = data?.eyebrow ?? "השירותים שלנו";
  const titlePre = data?.titlePre ?? "כל מה שצריך כדי לצמוח";
  const titleAccent = data?.titleAccent ?? "דיגיטלית";
  const subtitle = data?.subtitle ?? "פתרונות שיווק דיגיטלי מלאים תחת קורת גג אחת. אנחנו בוחרים את שילוב הערוצים הנכון בדיוק עבורכם.";
  const items = (data?.items?.length ? data.items : DEFAULT_ITEMS) as { icon?: string | null; title?: string | null; desc?: string | null; href?: string | null }[];

  return (
    <section className="wao-section" style={{ background: "var(--surface)" }} aria-label="שירותים">
      <div className="wao-container">
        <div style={{ marginBottom: "64px" }}>
          <div className="eyebrow">{eyebrow}</div>
          <h2 className="section-title">
            {titlePre}{" "}<span className="text-gradient">{titleAccent}</span>
          </h2>
          <p className="section-sub" style={{ marginTop: "16px" }}>{subtitle}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {items.map((s, i) => (
            <Link key={i} href={s.href ?? "/"} className="service-card" style={{ display: "block" }}>
              <div className="service-icon" aria-hidden>{s.icon}</div>
              <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1.2rem", marginBottom: "12px" }}>{s.title}</h3>
              <p style={{ fontSize: "0.95rem", color: "var(--muted)", lineHeight: 1.7, marginBottom: "24px" }}>{s.desc}</p>
              <span style={{ fontSize: "0.88rem", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px" }}>
                קרא עוד
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
