import type { Metadata } from "next";
import Link from "next/link";

const CANONICAL = "https://www.wao.co.il/google-ads";

export const metadata: Metadata = {
  title: "פרסום בגוגל (Google Ads) — ROI מדיד | WAO מומחי Google Ads מאז 2007",
  description:
    "ניהול Google Ads מקצועי: Search, Performance Max, YouTube Ads. 200–400% ROI ממוצע. 60% הפחתה ב-CPA. WAO — מומחי Google Ads מאז 2007.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "פרסום בגוגל (Google Ads) — ROI מדיד | WAO",
    description: "ניהול Google Ads מקצועי: 200–400% ROI ממוצע, 60% הפחתה ב-CPA. WAO מאז 2007.",
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
    name: "פרסום בגוגל (Google Ads) — WAO",
    description: "שירות ניהול Google Ads מקצועי עם ROI מדיד",
    isPartOf: { "@type": "WebSite", "@id": "https://www.wao.co.il/#website" },
  },
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${CANONICAL}#service`,
    serviceType: "Google Ads Management",
    name: "ניהול פרסום בגוגל",
    description: "ניהול קמפיינים בגוגל: Search, Performance Max, YouTube Ads. דמי ניהול מ-1,500 ₪/חודש.",
    url: CANONICAL,
    provider: { "@type": "Organization", "@id": "https://www.wao.co.il/#org" },
    areaServed: { "@type": "Country", name: "Israel" },
    offers: { "@type": "Offer", priceCurrency: "ILS", price: "1500" },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "כמה עולה ניהול Google Ads?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "דמי ניהול WAO מתחילים מ-1,500 ₪ לחודש. תקציב מדיה מינימלי מומלץ: 3,000–5,000 ₪ לחודש.",
        },
      },
      {
        "@type": "Question",
        name: "כמה זמן עד שרואים תוצאות Google Ads?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "תוצאות ראשונות ב-2–4 שבועות, ביצועים מלאים ב-60–90 יום.",
        },
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: "https://www.wao.co.il" },
      { "@type": "ListItem", position: 2, name: "פרסום בגוגל", item: CANONICAL },
    ],
  },
];

const STEPS = [
  {
    n: "01",
    title: "Audit & Strategy — מבחן 50 נקודות",
    desc: "בדיקה מלאה של המצב הקיים: מבנה קמפיינים, ציוני איכות, Conversion Tracking, תחרות ורשימות מילות מפתח. מגדירים יעדי CPA ו-ROAS ריאליים לפני שמוציאים שקל.",
    tags: ["Google Ads Audit", "CPA Target", "ROAS", "Competitor Analysis"],
  },
  {
    n: "02",
    title: "Campaign Architecture — מבנה שמביא תוצאות",
    desc: "בונים היררכיה נכונה: Search Campaigns לכוונות גבוהות, Performance Max לכיסוי רחב, YouTube לבניית מותג, Demand Gen לרימרקטינג. כל קמפיין עם מבנה Ad Groups נכון ו-Negative Keywords מלאות.",
    tags: ["Performance Max", "Search Campaigns", "YouTube Ads", "Demand Gen"],
  },
  {
    n: "03",
    title: "AI Bidding & Audience Signals",
    desc: "מגדירים Target CPA/ROAS עם Audience Signals מדויקים: רשימות לקוחות קיימים, דמוגרפיה, התנהגות גלישה. ה-AI של גוגל לומד מהר יותר עם הנתונים הנכונים — אנחנו מספקים אותם.",
    tags: ["Smart Bidding", "Target ROAS", "Audience Signals", "First-Party Data"],
  },
  {
    n: "04",
    title: "Creative Workshop — מודעות שממירות",
    desc: "כותבים RSA (Responsive Search Ads) עם 15 Headlines ו-4 Descriptions מגוונים. מפיקים Assets לקמפייני Performance Max: תמונות, לוגואים, סרטונים. A/B Testing מתמיד על קריאייטיב.",
    tags: ["RSA", "PMax Assets", "Ad Copy", "A/B Testing"],
  },
  {
    n: "05",
    title: "Conversion Tracking & Attribution",
    desc: "הגדרת Conversion Tracking מדויק ב-Google Tag Manager + GA4: שיחות טלפון, טפסים, רכישות, ביקורים בחנות. Attribution Model נכון שנותן קרדיט לכל נקודת מגע במסע הלקוח.",
    tags: ["GA4", "Conversion Tracking", "GTM", "Attribution"],
  },
];

const INCLUDED = [
  { icon: "🔬", title: "Google Ads Audit מקיף", desc: "בדיקת 50+ נקודות: מבנה, ציוני איכות, Conversion Tracking וניתוח מתחרים." },
  { icon: "🎯", title: "ניהול Search + Performance Max", desc: "קמפיינים ממוקדים בכוונת רכישה גבוהה עם AI Bidding ואופטימיזציה יומיומית." },
  { icon: "▶️", title: "YouTube Ads & Demand Gen", desc: "פרסום בוידאו ו-Demand Gen לבניית מותג, רימרקטינג וחשיפה לקהל חדש." },
  { icon: "📊", title: "Conversion Tracking מלא (GA4)", desc: "מעקב מדויק על כל המרה: טפסים, שיחות, רכישות. Attribution Model נכון." },
  { icon: "✍️", title: "Creative & Copywriting", desc: "כתיבת מודעות RSA, יצירת Assets לפרסום תמונות וקריאות לפעולה שממירות." },
  { icon: "📈", title: "דיווח חודשי + שיחת עדכון", desc: "Dashboard חי עם כל המדדים, דוח חודשי מפורט ושיחת אסטרטגיה עם המומחה." },
];

const STATS = [
  { n: "200–400%", l: "ROI ממוצע ללקוחות WAO", sub: "נתונים פנימיים WAO 2025" },
  { n: "60%", l: "הפחתה ב-CPA אחרי 90 יום", sub: "נתונים פנימיים WAO 2025" },
  { n: "8:1", l: "ROAS ממוצע בקמפיינים מנוהלים", sub: "Google Ads Benchmarks 2025" },
];

const FAQS = [
  {
    q: "כמה עולה ניהול Google Ads?",
    a: "דמי ניהול WAO מתחילים מ-1,500 ₪ לחודש (לא כולל תקציב המדיה). תקציב מדיה מינימלי מומלץ: 3,000–5,000 ₪ לחודש לקמפיין Search בסיסי, 8,000+ ₪ לקמפיין Performance Max מלא. מחיר סופי לפי היקף ותחרותיות.",
  },
  {
    q: "מה ההבדל בין Google Ads ל-SEO?",
    a: "Google Ads = תוצאות מיידיות, תשלום לכל קליק. ברגע שמפסיקים לשלם — התנועה נעצרת. SEO = בניית נכס לטווח ארוך, תנועה אורגנית ללא תשלום לקליק. הגישה המנצחת: Ads לתוצאות מיידיות בזמן שה-SEO בונה.",
  },
  {
    q: "מה זה Performance Max ולמה זה חשוב?",
    a: "Performance Max (PMax) הוא פורמט הקמפיין החדש של גוגל שמפיץ מודעות על כל נכסי גוגל — Search, YouTube, Display, Gmail, Maps — באמצעות AI. כשמגדירים אותו נכון עם Audience Signals ו-Assets איכותיים, הוא מניב את ה-ROI הגבוה ביותר.",
  },
  {
    q: "כמה זמן עד שרואים תוצאות?",
    a: "השבועות הראשונים הם תקופת Learning של ה-AI — הביצועים מתייצבים. תוצאות ראשונות ב-2–4 שבועות, ביצועים מלאים ב-60–90 יום. חשוב לא לשנות קמפיינים בתקופת ה-Learning — זה מאפס את תהליך הלמידה.",
  },
  {
    q: "האם WAO עובדת ללא חוזה ארוך טווח?",
    a: "כן. עובדים בהסכמי חודש-חודש. הלקוחות שלנו נשארים כי הם רואים ROI, לא כי הם חייבים. ניהול Google Ads מצריך זמן לאופטימיזציה — מומלץ מינימום 3 חודשים לתוצאות מלאות, אבל בלי התחייבות.",
  },
];

export default function GoogleAdsPage() {
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
            מומחי Google Ads מאז 2007
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
            פרסום בגוגל שמחזיר{" "}
            <span className="text-gradient">ROI מדיד</span>
            <br className="hidden md:block" />
            {" "}— לא רק קליקים
          </h1>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.2rem)", marginBottom: "40px", maxWidth: "620px" }}>
            קמפיינים ב-Google Ads שבונים על AI ו-First-Party Data. אנחנו מנהלים את התקציב שלכם כאילו הוא שלנו — עם שקיפות מלאה ומדידה אמיתית בכל שקל.
          </p>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <a href="tel:0526148860" className="btn-primary" style={{ fontSize: "1.05rem", padding: "15px 36px" }}>
              קבל ייעוץ Google Ads חינם
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <Link href="/seo" className="btn-outline" style={{ fontSize: "1rem" }}>
              ← גם SEO? לחצו כאן
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ background: "var(--surface)", paddingBlock: "clamp(48px,6vw,72px)" }}>
        <div className="wao-container">
          <div className="eyebrow" style={{ justifyContent: "center", marginBottom: "40px" }}>בגוגל Ads ב-2026 — המספרים שחשוב לדעת</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px" }}>
            {STATS.map((s) => (
              <div key={s.n} style={{ ...glass, padding: "32px 28px", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(2.4rem,4vw,3.2rem)", lineHeight: 1, background: "linear-gradient(135deg,#4AE3B5,#00C3FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: "10px" }}>{s.n}</div>
                <div style={{ fontFamily: "var(--font-body), sans-serif", fontSize: "0.95rem", color: "var(--text)", marginBottom: "6px", fontWeight: 600 }}>{s.l}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Methodology ── */}
      <section className="wao-section">
        <div className="wao-container">
          <div style={{ marginBottom: "60px" }}>
            <div className="eyebrow">שיטת WAO ל-Google Ads</div>
            <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
              5 שכבות ניהול שמביאות{" "}
              <span className="text-gradient">תוצאות</span>
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
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container">
          <div style={{ marginBottom: "56px" }}>
            <div className="eyebrow">מה כולל הניהול</div>
            <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
              שירות Google Ads מלא —{" "}
              <span className="text-gradient">ללא הפתעות</span>
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
      <section className="wao-section">
        <div className="wao-container" style={{ maxWidth: "800px" }}>
          <div className="eyebrow">שאלות נפוצות</div>
          <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)", marginBottom: "48px" }}>
            כל מה שרציתם לדעת על{" "}
            <span className="text-gradient">Google Ads</span>
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
              <div className="eyebrow" style={{ justifyContent: "center" }}>מוכנים להפסיק לבזבז על קמפיינים שלא עובדים?</div>
              <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem,3.5vw,2.6rem)", lineHeight: 1.15, marginBottom: "16px" }}>
                ייעוץ Google Ads חינם —{" "}
                <span className="text-gradient">נגיד לכם בדיוק מה צריך לשנות</span>
              </h2>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "32px", maxWidth: "480px", margin: "0 auto 32px", lineHeight: 1.75 }}>
                שיחה של 30 דקות עם מומחה Google Ads. נבדוק את הקמפיינים הקיימים ונזהה את בזבוז התקציב.
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
                ✓ ייעוץ ראשון חינם · ✓ ללא חוזה · ✓ מענה תוך 24 שעות
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
