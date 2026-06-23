import type { Metadata } from "next";
import Link from "next/link";
import GT from "@/components/GlossaryTerm";

const CANONICAL = "https://www.wao.co.il/about";

export const metadata: Metadata = {
  title: "אודות WAO — סוכנות שיווק דיגיטלי B2C מאז 2006 | הצוות שלנו",
  description:
    "WAO — סוכנות בוטיק B2C מאז 2006. איתן יריב + צוות מומחים. 500+ לקוחות מרוצים, 20+ שנות ניסיון, 4× ROI ממוצע. הכירו את הצוות שמאחורי התוצאות.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "אודות WAO — סוכנות שיווק דיגיטלי B2C מאז 2006",
    description: "WAO — סוכנות בוטיק B2C מאז 2006. 500+ לקוחות, 20+ שנות ניסיון, 4× ROI.",
    url: CANONICAL,
    type: "website",
  },
};

const schemas = [
  {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${CANONICAL}#webpage`,
    url: CANONICAL,
    name: "אודות WAO",
    isPartOf: { "@type": "WebSite", "@id": "https://www.wao.co.il/#website" },
    about: { "@type": "Organization", "@id": "https://www.wao.co.il/#org" },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://www.wao.co.il/#org",
    name: "WAO",
    url: "https://www.wao.co.il",
    foundingDate: "2006",
    description: "סוכנות שיווק דיגיטלי בוטיק B2C — SEO, Google Ads, ייעוץ שיווקי",
    areaServed: { "@type": "Country", name: "Israel" },
    founder: {
      "@type": "Person",
      "@id": `${CANONICAL}#eitan`,
      name: "איתן יריב",
      jobTitle: "מייסד ומנכ\"ל",
      sameAs: ["https://www.linkedin.com/in/eitanyariv/"],
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: "https://www.wao.co.il" },
      { "@type": "ListItem", position: 2, name: "אודות", item: CANONICAL },
    ],
  },
];

const VALUES = [
  { n: "01", icon: "🎯", title: "פשטות — 20% שמביאים 80%", desc: "לא משקיעים בקישוטים וכל המסביב. תמיד מתמקדים ב-20% מהעבודה שמביאים 80% מהתוצאות.", tags: ["Focus", "80/20", "ROI"] },
  { n: "02", icon: "📊", title: "תוצאות מדידות בכל רגע", desc: "שיווק דיגיטלי = נתונים. בכל רגע ניתן לחשב כמה שווה לך כל שקל שיווקי. שקיפות מלאה.", tags: ["Data", "Analytics", "Transparency"] },
  { n: "03", icon: "📚", title: "ללמוד ולהשתכלל תמיד", desc: "משקיעים הרבה בלמידה מתמדת — כולל AI, כלים חדשים ושינויי גוגל — כדי שתהיו צעד לפני המתחרים.", tags: ["Learning", "AI", "Innovation"] },
  { n: "04", icon: "🧪", title: "להתנסות בעצמנו קודם", desc: "כל פיצ'ר, כלי AI או טכנולוגיה — מנסים על עצמנו לפני שמציעים ללקוחות. רק מה שעובד מגיע לשולחן.", tags: ["Testing", "Validation", "Integrity"] },
  { n: "05", icon: "🤝", title: "לחשוב יחד — כל הצוות", desc: "איתן הוא יועץ שיווק מנוסה, אבל לא רק. כל הצוות שותף בחשיבה אסטרטגית על האתגרים שלך.", tags: ["Teamwork", "Strategy", "Collaboration"] },
  { n: "06", icon: "🛡️", title: "לשמור עליך מפני מתחרים", desc: "פרסום בגוגל, SEO ושיווק יכולים להיות מנוצלים ע\"י מתחרים כדי לפגוע בך. אנחנו תמיד לצידך.", tags: ["Protection", "Loyalty", "Vigilance"] },
];

const STATS = [
  { n: "2006", l: "שנת הקמה" },
  { n: "20+", l: "שנות ניסיון" },
  { n: "500+", l: "לקוחות שקיבלו תוצאות" },
  { n: "4×", l: "ROI ממוצע ללקוח WAO" },
];

const TEAM = [
  {
    name: "איתן יריב",
    role: "מייסד ומנכ\"ל WAO",
    initials: "א.י",
    bio: "עשרים שנות ניסיון. כבר בשנה הראשונה קידם בגוגל את בנק לאומי, דפי זהב (היום זאפ) ופורטלים בחו\"ל. מאות לקוחות, תקציבי פרסום בסדרי גודל של מיליונים. היום, מעדיף לעזור דווקא לאלו שיש להם הרבה מאוד לאן לגדול.",

    linkedin: "https://www.linkedin.com/in/eitanyariv/",
  },
  {
    name: "דינה יריב שטיינברג",
    role: "אחראית קשרי לקוחות ושותפה",
    initials: "ד.י",
    bio: "מעל 8 שנות ניסיון במדיה ושיווק ברשתות החברתיות. מומחית בחיבור בין מותגים ולקוחות — מביאה סדר, חשיבה יצירתית ואנרגיה מיוחדת שמחברת את כולנו.",
    linkedin: null,
  },
];

const PARTNERS = [
  { icon: "💻", name: "ניצ'ש ארנולד", role: "פיתוח WordPress ו-Full Stack" },
  { icon: "✍️", name: "אביעד רבינוביץ'", role: "מדיה חברתית וקופירייטינג" },
  { icon: "🎨", name: "רויטל מור חיים", role: "עיצוב גרפי — Studio Zikit" },
  { icon: "📝", name: "יועבי שני", role: "קופירייטר" },
];

const FAQS = [
  {
    q: "מי הלקוח האידיאלי של WAO?",
    a: "עסקי B2C (שיווק לצרכן סופי) עם תקציב שיווקי של 10,000 ₪+ בחודש שרוצים צמיחה מדידה. נדל\"ן, שירותים מקצועיים, מסחר קמעונאי, מוצרים.",
  },
  {
    q: "האם WAO עובדת עם עסקים בתחילת הדרך?",
    a: "כן, בתנאי שהם מבינים מה הבידול המשמעותי שלהם וקהל היעד האידיאלי שלהם. בלי זה לא ניתן לבנות שיווק שעובד.",
  },
  {
    q: "האם WAO עובדת עם עסקי B2B?",
    a: "לא. מתמחים ב-B2C בלבד. אם אתה עסק B2B טהור — נגיד לך זאת ישר ולא נקח את הכסף שלך.",
  },
  {
    q: "כמה עולה לעבוד עם WAO?",
    a: "ניהול שוטף מתחיל מ-3,500 ₪ לחודש בתוספת תקציב מדיה. גובים תשלום רק בסוף החודש — אחרי שראיתם תוצאות.",
  },
];

export default function AboutPage() {
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
            סוכנות בוטיק <GT term="B2C">B2C</GT> מאז 2006
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
            הנוסחה: יותר פניות ומכירות{" "}
            <span className="text-gradient">בפחות כסף</span>
          </h1>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.2rem)", marginBottom: "40px", maxWidth: "620px" }}>
            כדי לגרום לך לומר וואו, זה עובד! מאז 2006, אנחנו בונים שיווק דיגיטלי שמביא לקוחות מוכנים לרכישה — לא סתם תנועה ולייקים.
          </p>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <a href="tel:0526148860" className="btn-primary" style={{ fontSize: "1.05rem", padding: "15px 36px" }}>
              בדקו אם זה מתאים לכם
            </a>
            <Link href="/consulting" className="btn-outline" style={{ fontSize: "1rem" }}>
              השירותים שלנו
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ background: "var(--surface)", paddingBlock: "clamp(48px,6vw,72px)" }}>
        <div className="wao-container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "24px" }}>
            {STATS.map((s) => (
              <div key={s.n} style={{ ...glass, padding: "28px 20px", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(2rem,3.5vw,2.8rem)", lineHeight: 1, background: "linear-gradient(135deg,#4AE3B5,#00C3FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: "8px" }}>{s.n}</div>
                <div style={{ fontFamily: "var(--font-body), sans-serif", fontSize: "0.9rem", color: "var(--muted)" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="wao-section">
        <div className="wao-container">
          <div style={{ marginBottom: "60px" }}>
            <div className="eyebrow">הערכים שלנו</div>
            <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
              זה מה שמנחה אותנו{" "}
              <span className="text-gradient">בכל פרויקט</span>
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {VALUES.map((v) => (
              <div
                key={v.n}
                className="process-step"
                style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "32px", alignItems: "start", ...glass, padding: "clamp(20px,3vw,32px)" }}
              >
                <div style={{ fontSize: "2rem", lineHeight: 1, paddingTop: "2px" }}>{v.icon}</div>
                <div>
                  <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1.15rem", marginBottom: "8px" }}>{v.title}</h3>
                  <p style={{ ...bodyStyle, marginBottom: "12px" }}>{v.desc}</p>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {v.tags.map((tag) => (
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

      {/* ── Team ── */}
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container">
          <div style={{ marginBottom: "56px" }}>
            <div className="eyebrow">הצוות</div>
            <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
              האנשים שרוצים{" "}
              <span className="text-gradient">להקפיץ אותך לרמה הבאה</span>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px", marginBottom: "48px" }}>
            {TEAM.map((m) => (
              <div key={m.name} style={{ ...glass, padding: "32px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
                  <div aria-hidden style={{ width: "56px", height: "56px", borderRadius: "50%", background: "linear-gradient(135deg,#4AE3B5,#00C3FF)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "var(--bg)", flexShrink: 0 }}>
                    {m.initials}
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1.1rem", marginBottom: "2px" }}>{m.name}</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif" }}>{m.role}</div>
                  </div>
                </div>
                <p style={{ ...bodyStyle, fontSize: "0.92rem" }}>{m.bio}</p>
                {m.linkedin && (
                  <a href={m.linkedin} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "16px", fontSize: "0.82rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                    LinkedIn →
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Extended team / partners */}
          <div>
            <div className="eyebrow" style={{ marginBottom: "28px" }}>שותפים לדרך — הצוות המורחב</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
              {PARTNERS.map((p) => (
                <div key={p.name} style={{ ...glass, padding: "20px 22px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>{p.icon}</span>
                  <div>
                    <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.95rem", marginBottom: "4px" }}>{p.name}</div>
                    <div style={{ fontSize: "0.83rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>{p.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="wao-section">
        <div className="wao-container" style={{ maxWidth: "800px" }}>
          <div className="eyebrow">שאלות נפוצות</div>
          <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)", marginBottom: "48px" }}>
            כל מה שרציתם לדעת{" "}
            <span className="text-gradient">על WAO</span>
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
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container">
          <div className="cta-banner" style={{ padding: "clamp(48px,8vw,80px) clamp(24px,6vw,64px)", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div aria-hidden style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "60%", height: "100%", background: "radial-gradient(ellipse at center, rgba(74,227,181,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div className="eyebrow" style={{ justifyContent: "center" }}>בדקו אם זה מתאים לכם</div>
              <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem,3.5vw,2.6rem)", lineHeight: 1.15, marginBottom: "16px" }}>
                שיחה קצרה שיכולה לשנות{" "}
                <span className="text-gradient">את כיוון העסק שלך</span>
              </h2>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "32px", maxWidth: "480px", margin: "0 auto 32px", lineHeight: 1.75 }}>
                ייעוץ ראשון ללא עלות וללא התחייבות. נבין את האתגרים שלך ונספר לך בדיוק מה אפשר לעשות.
              </p>
              <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                <a href="tel:0526148860" className="btn-primary" style={{ fontSize: "1.05rem", padding: "16px 40px" }}>
                  📞 052-614-8860
                </a>
                <Link href="/contact" className="btn-outline" style={{ fontSize: "1rem" }}>
                  שלח פנייה
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
