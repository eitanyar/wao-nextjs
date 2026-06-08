// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = { data?: any };

const DEFAULT_STEPS = [
  { n: "01", title: "הבנת הצרכים שלך", desc: "מתחילים בשיחת ייעוץ מעמיקה. מבינים את העסק, הלקוחות, המטרות והמתחרים — ויוצרים תמונה מלאה לפני שכותבים שורת אסטרטגיה אחת.", tags: "אבחון SEO, ניתוח מתחרים, הגדרת יעדים" },
  { n: "02", title: "בניית אסטרטגיה מותאמת", desc: "מפתחים תכנית עבודה מפורטת עם ערוצים, תקציב, יעדי KPI וציר זמן ברור — אסטרטגיה שמותאמת לעסק שלך, לא תבנית מוכנה.", tags: "תכנית 90 יום, KPI ברורים, ערוצים מדויקים" },
  { n: "03", title: "ביצוע, מדידה ואופטימיזציה", desc: "מיישמים, מודדים ומשפרים ברציפות. דוחות שקופים, שיחות עדכון שבועיות, וגמישות מלאה להיגוי מחדש בהתאם לתוצאות.", tags: "דיווח שקוף, שיפור מתמיד, גמישות מלאה" },
];

export default function Process({ data }: Props) {
  const eyebrow = data?.eyebrow ?? "איך אנחנו עובדים";
  const titlePre = data?.titlePre ?? "שיטת עבודה שמניעה";
  const titleAccent = data?.titleAccent ?? "תוצאות מוכחות";
  const subtitle = data?.subtitle ?? "17 שנה בתחום לימדו אותנו שתהליך נכון שווה יותר מכל טכנולוגיה או טרנד.";
  const steps = (data?.steps?.length ? data.steps : DEFAULT_STEPS) as { n?: string | null; title?: string | null; desc?: string | null; tags?: string | null }[];

  return (
    <section className="wao-section" aria-label="תהליך עבודה">
      <div className="wao-container">
        <div style={{ marginBottom: "64px", maxWidth: "640px" }}>
          <div className="eyebrow">{eyebrow}</div>
          <h2 className="section-title">
            {titlePre}{" "}<span className="text-gradient">{titleAccent}</span>
          </h2>
          <p className="section-sub" style={{ marginTop: "16px" }}>{subtitle}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {steps.map((step, i) => (
            <div key={i} className="process-step" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "40px", alignItems: "start" }}>
              <div style={{ paddingTop: "8px" }}>
                <span className="process-number">{step.n}</span>
              </div>
              <div>
                <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1.35rem", marginBottom: "12px" }}>{step.title}</h3>
                <p style={{ fontSize: "1rem", color: "var(--muted)", lineHeight: 1.75, marginBottom: "20px", maxWidth: "600px" }}>{step.desc}</p>
                {step.tags && (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {step.tags.split(",").map((tag) => (
                      <span key={tag} style={{ padding: "4px 14px", borderRadius: "var(--radius-pill)", background: "var(--elevated)", border: "1px solid var(--border)", fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
