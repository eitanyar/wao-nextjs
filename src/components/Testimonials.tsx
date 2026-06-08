// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = { data?: any };

const DEFAULT_ITEMS = [
  { quote: "תוך 4 חודשים הכפלנו את התנועה האורגנית ל-18,000 כניסות בחודש. WAO הבינו את העסק שלנו לגמרי.", name: "דנה כהן", role: 'מנכ"לית, חברת B2B טכנולוגיה', initials: "ד.כ" },
  { quote: "ניהלנו קמפיינים בגוגל לבד שנים ואיבדנו כסף. מאז שWAO לקחו על זה — עלות ההמרה ירדה ב-60%.", name: "יוסי לוי", role: "בעלים, רשת חנויות רהיטים", initials: "י.ל" },
  { quote: "ההכשרה שעשינו עם WAO שינתה לגמרי איך הצוות שלנו מסתכל על שיווק. ROI מדיד כבר מהחודש הראשון.", name: "מיכל ברק", role: 'סמנכ"לית שיווק, סטארטאפ פינטק', initials: "מ.ב" },
];

export default function Testimonials({ data }: Props) {
  const eyebrow = data?.eyebrow ?? "לקוחות מספרים";
  const titlePre = data?.titlePre ?? "תוצאות";
  const titleAccent = data?.titleAccent ?? "אמיתיות";
  const titlePost = data?.titlePost ?? "מלקוחות אמיתיים";
  const items = (data?.items?.length ? data.items : DEFAULT_ITEMS) as { quote?: string | null; name?: string | null; role?: string | null; initials?: string | null }[];

  return (
    <section className="wao-section" aria-label="המלצות לקוחות">
      <div className="wao-container">
        <div style={{ marginBottom: "56px", textAlign: "center" }}>
          <div className="eyebrow" style={{ justifyContent: "center" }}>{eyebrow}</div>
          <h2 className="section-title">
            {titlePre} <span className="text-gradient">{titleAccent}</span> {titlePost}
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {items.map((t, i) => (
            <figure key={i} className="testimonial-card" style={{ margin: 0 }}>
              <span className="testimonial-quote" aria-hidden>&ldquo;</span>
              <blockquote style={{ fontSize: "1.02rem", lineHeight: 1.75, color: "var(--text)", fontFamily: "var(--font-body), sans-serif", marginBottom: "28px", fontStyle: "normal" }}>
                {t.quote}
              </blockquote>
              <figcaption style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div aria-hidden style={{ width: "44px", height: "44px", borderRadius: "50%", background: "linear-gradient(135deg, #4AE3B5, #00C3FF)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.8rem", color: "var(--bg)", flexShrink: 0 }}>
                  {t.initials}
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 600, fontSize: "0.95rem" }}>{t.name}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
