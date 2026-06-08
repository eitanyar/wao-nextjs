// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = { data?: any };

const DEFAULT_REASONS = [
  { icon: "🏆", title: "20+ שנות ניסיון מוכח", desc: "מאז 2006 אנחנו מלווים עסקים ישראלים לצמיחה דיגיטלית. הניסיון שלנו שווה לכם זמן וכסף." },
  { icon: "🤝", title: "ללא חוזה ארוך טווח", desc: "אנחנו מאמינים בתוצאות — לא בנעילת לקוחות. כל חודש אתם בוחרים להישאר כי זה עובד." },
  { icon: "🤖", title: "AI ושיטות מתקדמות", desc: "משלבים כלי AI עדכניים בכל תהליך — ניתוח נתונים, כתיבת תוכן, אופטימיזציה ותחזיות." },
  { icon: "📊", title: "שקיפות מלאה בנתונים", desc: "גישה מלאה לכל הנתונים, דוחות ברורים ושיחות עדכון שבועיות — אתם תמיד יודעים מה קורה." },
  { icon: "🎯", title: "התמחות עמוקה בישראל", desc: "הבנה מלאה של שוק הישראלי, התנהגות החיפוש העברי, והתחרות המקומית — יתרון שאין לרשתות בינלאומיות." },
  { icon: "⚡", title: "מהיר להיגוי מחדש", desc: "הדיגיטל משתנה מהר. אנחנו מגיבים מהר — מתאימים אסטרטגיות לשינויי גוגל, שוק ותחרות." },
];

export default function WhyWao({ data }: Props) {
  const eyebrow = data?.eyebrow ?? "למה לבחור בוואו";
  const titlePre = data?.titlePre ?? "לא עוד סוכנות.";
  const titleAccent = data?.titleAccent ?? "שותף אסטרטגי.";
  const subtitle = data?.subtitle ?? "ההבדל בין סוכנות שיווק רגילה לבין וואו הוא פשוט: אנחנו מודדים את עצמנו לפי התוצאות שלכם, לא לפי שעות עבודה.";
  const reasons = (data?.reasons?.length ? data.reasons : DEFAULT_REASONS) as { icon?: string | null; title?: string | null; desc?: string | null }[];

  return (
    <section className="wao-section" style={{ background: "var(--surface)" }} aria-label="למה לבחור בוואו">
      <div className="wao-container">
        <div className="why-header" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px", alignItems: "end", marginBottom: "64px" }}>
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <h2 className="section-title">
              {titlePre}{" "}<span className="text-gradient">{titleAccent}</span>
            </h2>
          </div>
          <p className="section-sub">{subtitle}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1px", background: "var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border)" }}>
          {reasons.map((r, i) => (
            <div key={i} className="why-cell">
              <div style={{ fontSize: "1.8rem", marginBottom: "16px", lineHeight: 1 }} aria-hidden>{r.icon}</div>
              <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1.1rem", marginBottom: "10px" }}>{r.title}</h3>
              <p style={{ fontSize: "0.92rem", color: "var(--muted)", lineHeight: 1.7 }}>{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
