import type { Metadata } from "next";
import Link from "next/link";

const CANONICAL = "https://www.wao.co.il/consulting";

export const metadata: Metadata = {
  title: "יועץ שיווק דיגיטלי — WAO עושים ולא רק מספרים | WAO מאז 2006",
  description:
    "יועצי שיווק דיגיטלי שגם עושים את זה. אסטרטגיה + ביצוע בשירות אחד. ייעוץ ראשון ללא עלות. WAO — סוכנות בוטיק B2C מאז 2006.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "יועץ שיווק דיגיטלי — WAO עושים ולא רק מספרים",
    description: "יועצי שיווק דיגיטלי שגם עושים את זה. אסטרטגיה + ביצוע. ייעוץ ראשון ללא עלות.",
    url: CANONICAL,
    type: "website",
  },
};

const schemas = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${CANONICAL}#webpage`,
    url: CANONICAL,
    name: "יועץ שיווק דיגיטלי — WAO",
    description: "ייעוץ שיווק דיגיטלי עם אחריות לתוצאות — ל-B2C",
    isPartOf: { "@type": "WebSite", "@id": "https://www.wao.co.il/#website" },
  },
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${CANONICAL}#service`,
    serviceType: "Digital Marketing Consulting",
    name: "ייעוץ שיווק דיגיטלי",
    description: "ייעוץ שיווקי אסטרטגי + ביצוע בפועל ל-B2C. ניהול חודשי מ-3,500 ₪.",
    url: CANONICAL,
    provider: { "@type": "Organization", "@id": "https://www.wao.co.il/#org" },
    areaServed: { "@type": "Country", name: "Israel" },
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: "https://www.wao.co.il" },
      { "@type": "ListItem", position: 2, name: "ייעוץ שיווקי", item: CANONICAL },
    ],
  },
];

const STEPS = [
  {
    n: "01",
    title: "תהליך גילוי — לפני שמדברים על כסף",
    desc: "מעבירים לך שאלונים ממוקדים שעוזרים לנו (ולך) לחדד שני דברים: מי הלקוח האידיאלי שלך באמת, ומה הבידול והיתרון היחסי שלך בשוק. רק אחרי שיש לנו תמונה מלאה — נושבים יחד לתכנן.",
    tags: ["שאלוני גילוי", "לקוח אידיאלי", "בידול", "יתרון יחסי"],
  },
  {
    n: "02",
    title: "שיחת אסטרטגיה — עד 30 דקות, ללא עלות",
    desc: "לאחר שמילאת את שאלוני הגילוי, אנחנו בוחנים את הנכסים הדיגיטליים שלך — אתר, דפי נחיתה ופרופילי הרשת החברתית. משם קובעים שיחה ממוקדת של עד 30 דקות להצגת כיוון אסטרטגי רלוונטי לעסק שלך.",
    tags: ["אבחון דיגיטלי", "נכסים דיגיטליים", "30 דקות", "כיוון אסטרטגי"],
  },
  {
    n: "03",
    title: "ביצוע — אנחנו עושים, לא רק ממליצים",
    desc: "אם החלטת להתקדם איתנו — בונים את המשפך השיווקי ועולים לאוויר. SEO, Google Ads, תוכן, מדיה חברתית — בשילוב שמתאים לעסק שלך ולתקציב שהגדרת. בעידן ה-AI של 2026 אנחנו משלבים כלים חכמים שמאיצים תוצאות.",
    tags: ["ביצוע", "Google Ads", "SEO", "שיווק תוכן", "AI כלים"],
  },
  {
    n: "04",
    title: "מדידה, שיפור — ותשלום רק בסוף החודש",
    desc: "כל חודש בוחנים את התוצאות יחד. מה עבד, מה לשפר, ולאן ממשיכים. גובים תשלום רק בסוף החודש — ואז אתה מחליט אם להמשיך. אין אצלנו אותיות קטנות, כוונות נסתרות, או חוזים שמשאירים אותך בכוח.",
    tags: ["מדידה", "ROI", "דיווח שקוף", "חודש-חודש"],
  },
];

const INCLUDED = [
  { icon: "🎯", title: "אסטרטגיית שיווק מותאמת אישית", desc: "לא תבנית מוכנה. תכנית עבודה שנבנית לפי העסק שלך, הלקוחות שלך, התקציב שלך." },
  { icon: "🔍", title: "אבחון דיגיטלי מקיף", desc: "בדיקת כל הנכסים הדיגיטליים: אתר, SEO, קמפיינים, מדיה חברתית — מה עובד ומה מבזבז תקציב." },
  { icon: "📖", title: "הגדרת לקוח אידיאלי ובידול", desc: "מי הלקוח שבשבילו כיף לקום בבוקר? מה הסיפור שלך שמבדל אותך מהמתחרים? זה הבסיס לכל השיווק." },
  { icon: "⚙️", title: "בניית משפך שיווקי ותוכן", desc: "מהחשיפה הראשונה ועד הרכישה — בונים מסע לקוח שמניע להמרות, כולל תוכן שמותאם לעידן ה-AI Overviews." },
  { icon: "📊", title: "KPI Dashboard ודיווח שקוף", desc: "גישה מלאה לנתונים. דוח חודשי ברור. אתם תמיד יודעים מה קורה עם הכסף שלכם." },
  { icon: "🤝", title: "ליווי צמוד — חודש בחודשו", desc: "שיחת עדכון שבועית, מענה מהיר לשאלות, והתאמת האסטרטגיה כשהשוק משתנה. בלי חוזה. בלי הפתעות." },
];

const FAQS = [
  {
    q: "למה WAO שונים מיועצי שיווק אחרים?",
    a: "רוב היועצים מספקים מצגת ואסטרטגיה — ואז אתה לבד עם הביצוע. אנחנו אנשי ביצוע: מגדירים את האסטרטגיה ביחד ואז מוציאים אותה לפועל. לוקחים אחריות לתוצאות מדידות, לא רק למסמכים יפים. ואנחנו מאמינים שחוזה ארוך שלא מחויב לתוצאות — גורם לכל יועץ לשים את השיווק על טייס אוטומטי.",
  },
  {
    q: "האם ייעוץ ה-WAO מתאים לי?",
    a: "WAO מתמחה בעסקי B2C — עסקים שמשווקים ישירות לצרכן הסופי. נדל\"ן, שירותים מקצועיים, מסחר קמעונאי, מוצרים. אם אתה עסק B2B — אנחנו לא הגוף הנכון עבורך ונגיד לך את זה ישר. אם אתה B2C עם תקציב שיווקי ריאלי ורצון לצמוח — כנראה שנסתדר.",
  },
  {
    q: "מה זה 'אסטרטגיית שיווק במתנה' שאתם מציעים?",
    a: "שלושה שלבים פשוטים, ללא עלות: ממלאים שאלון קצר על ה-USP והבידול שלך — אנחנו בוחנים את הנכסים הדיגיטליים שלך (אתר, דפי נחיתה, פרופילי רשת) — ומקבעים שיחה של עד 30 דקות לדיון בכיוון אסטרטגי רלוונטי. ללא התחייבות.",
  },
  {
    q: "כמה עולה הייעוץ וניהול השיווק?",
    a: "מחיר הניהול תלוי בהיקף הפעילות: ניהול חודשי שוטף מתחיל מ-3,500 ₪ לחודש בתוספת תקציב ל-Media. אנחנו גובים מעל ממוצע השוק — כי לתוצאות חזקות, אחריות ו-20+ שנות ניסיון יש מחיר מתאים. ואנחנו שקופים לגמרי לגבי מה אתה מקבל בכל שקל.",
  },
  {
    q: "האם יש חוזה ארוך טווח?",
    a: "ממש לא. עובדים חודש-חודש. גובים תשלום רק בסוף החודש — אחרי שראית תוצאות. בכל חודש אתה מחליט מחדש אם להמשיך איתנו. אנחנו לא מאמינים בחתונה קתולית עם לקוחות. הסיבה היחידה שלקוחות שלנו עובדים איתנו שנים — היא שהם רואים תוצאות.",
  },
];

export default function ConsultingPage() {
  const glass: React.CSSProperties = {
    background: "rgba(13,15,21,0.72)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
  };

  const h2Style: React.CSSProperties = {
    fontFamily: "var(--font-rubik), sans-serif",
    fontWeight: 800,
    fontSize: "clamp(1.5rem,2.5vw,2rem)",
    lineHeight: 1.2,
    marginBottom: "1rem",
    color: "var(--text)",
    marginTop: 0,
  };

  const bodyStyle: React.CSSProperties = {
    fontFamily: "var(--font-body), sans-serif",
    lineHeight: 1.8,
    color: "var(--muted)",
    fontSize: "1rem",
    margin: 0,
  };

  return (
    <>
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}

      {/* ── Hero ── */}
      <section style={{ paddingTop: "clamp(110px,14vw,160px)", paddingBottom: "clamp(64px,8vw,96px)", position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(74,227,181,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="hero-grid" />
        <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "860px" }}>
          <div className="badge" style={{ marginBottom: "28px" }}>
            <span className="badge-dot" />
            יועצי שיווק דיגיטלי מאז 2006 — עם אחריות לתוצאות
          </div>
          <h1
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 900,
              fontSize: "clamp(2.4rem,5.5vw,4.2rem)",
              lineHeight: 1.08,
              letterSpacing: "-0.025em",
              marginBottom: "24px",
            }}
          >
            יועצי שיווק שגם{" "}
            <span className="text-gradient">עושים את זה</span>
            <br className="hidden md:block" />
            {" "}— ולא רק מספרים
          </h1>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.2rem)", marginBottom: "40px", maxWidth: "620px" }}>
            רוב היועצים מגיעים עם מצגת ונעלמים. אנחנו מגיעים עם אסטרטגיה, מוציאים אותה לפועל, ומדידים תוצאות בכל שלב. ללא חוזה, תשלום רק בסוף החודש.
          </p>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <a href="tel:0526148860" className="btn-primary" style={{ fontSize: "1.05rem", padding: "15px 36px" }}>
              קבל אסטרטגיית שיווק במתנה
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <Link href="/about" className="btn-outline" style={{ fontSize: "1rem" }}>
              הכר את הצוות
            </Link>
          </div>
        </div>
      </section>

      {/* ── Process ── */}
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container">
          <div style={{ marginBottom: "60px" }}>
            <div className="eyebrow">איך זה עובד אצלנו</div>
            <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
              תהליך שמתחיל ב
              <span className="text-gradient">הקשבה</span>
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="process-step"
                style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "40px", alignItems: "start", ...glass, padding: "clamp(24px,3vw,36px)" }}
              >
                <div style={{ paddingTop: "4px" }}>
                  <span className="process-number">{step.n}</span>
                </div>
                <div>
                  <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1.25rem", marginBottom: "10px" }}>{step.title}</h3>
                  <p style={{ ...bodyStyle, marginBottom: "16px" }}>{step.desc}</p>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {step.tags.map((tag) => (
                      <span key={tag} style={{ padding: "3px 12px", borderRadius: "var(--radius-pill)", background: "var(--elevated)", border: "1px solid var(--border)", fontSize: "0.78rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What's included ── */}
      <section className="wao-section">
        <div className="wao-container">
          <div style={{ marginBottom: "56px" }}>
            <div className="eyebrow">מה מקבלים מ-WAO</div>
            <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
              שירות מלא —{" "}
              <span className="text-gradient">מאסטרטגיה לביצוע</span>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1px", background: "var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border)" }}>
            {INCLUDED.map((item) => (
              <div key={item.title} className="why-cell">
                <div style={{ fontSize: "1.8rem", marginBottom: "14px", lineHeight: 1 }}>{item.icon}</div>
                <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1.05rem", marginBottom: "8px" }}>{item.title}</h3>
                <p style={{ ...bodyStyle, fontSize: "0.9rem" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container" style={{ maxWidth: "800px" }}>
          <div className="eyebrow">שאלות נפוצות</div>
          <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)", marginBottom: "48px" }}>
            כל מה שרציתם לדעת על{" "}
            <span className="text-gradient">ייעוץ שיווקי</span>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {FAQS.map((faq) => (
              <details key={faq.q} style={{ ...glass, padding: "0" }}>
                <summary style={{ padding: "22px 24px", cursor: "pointer", fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1.02rem", lineHeight: 1.4, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                  {faq.q}
                  <span style={{ fontSize: "1.2rem", color: "var(--accent)", flexShrink: 0 }}>+</span>
                </summary>
                <div style={{ padding: "0 24px 22px", ...bodyStyle }}>{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="wao-section">
        <div className="wao-container">
          <div className="cta-banner" style={{ padding: "clamp(48px,8vw,80px) clamp(24px,6vw,64px)", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div aria-hidden style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "60%", height: "100%", background: "radial-gradient(ellipse at center, rgba(74,227,181,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div className="eyebrow" style={{ justifyContent: "center" }}>מוכנים לשמוע אמת על השיווק שלכם?</div>
              <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem,3.5vw,2.6rem)", lineHeight: 1.15, marginBottom: "16px" }}>
                כיוון שיווקי מותאם לעסק שלכם —{" "}
                <span className="text-gradient">ללא עלות</span>
              </h2>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "32px", maxWidth: "480px", margin: "0 auto 32px", lineHeight: 1.75 }}>
                מלאו שאלון קצר על ה-USP והבידול שלכם, אנחנו בוחנים את הנכסים הדיגיטליים — ומקבעים שיחה של עד 30 דקות.
              </p>
              <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                <a href="tel:0526148860" className="btn-primary" style={{ fontSize: "1.05rem", padding: "16px 40px" }}>
                  📞 052-614-8860
                </a>
                <Link href="/contact" className="btn-outline" style={{ fontSize: "1rem" }}>
                  שלח פנייה
                </Link>
              </div>
              <p style={{ marginTop: "20px", fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                ✓ ייעוץ ראשון חינם · ✓ ללא חוזה · ✓ תשלום רק בסוף החודש
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
