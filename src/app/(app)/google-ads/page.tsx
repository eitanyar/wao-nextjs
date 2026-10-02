import type { Metadata } from "next";
import Link from "next/link";
import GT from "@/components/GlossaryTerm";
import PhoneReveal from "@/components/PhoneReveal";

const CANONICAL = "https://www.wao.co.il/google-ads";

export const metadata: Metadata = {
  title: {
    // title.absolute bypasses the root "%s‏ | WAO" template — this string
    // already ends in the RLM-anchored "‏ | WAO" suffix (same pattern as site-bot/page.tsx).
    absolute: "פרסום בגוגל בחשבון שלך — ניהול Google Ads מ-₪1,500 לחודש‏ | WAO",
  },
  description:
    "ניהול קמפיינים בגוגל בחשבון שבבעלותך, דרך MCC. דמי ניהול מ-₪1,500 לחודש; תקציב הפרסום שלך נפרד.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "פרסום בגוגל בחשבון שלך — ניהול Google Ads | WAO",
    description: "ניהול Google Ads בחשבון שלך, בלי חוזה ארוך. דמי ניהול מ-₪1,500 לחודש, תקציב המדיה נפרד.",
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
    name: "פרסום בגוגל בחשבון בבעלותך — WAO",
    description: "ניהול Google Ads דרך MCC בחשבון ובפרופיל תשלומים בבעלות הלקוח",
    isPartOf: { "@type": "WebSite", "@id": "https://www.wao.co.il/#website" },
  },
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${CANONICAL}#service`,
    serviceType: "Google Ads Management",
    name: "ניהול קמפיינים בגוגל בחשבון של הלקוח",
    description: "ניהול Google Ads בחשבון הלקוח דרך MCC, החל מ-₪1,500 לחודש; תקציב מדיה נפרד.",
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
        name: "כמה עולה ניהול קמפיינים בגוגל, ומי משלם על המודעות?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "דמי הניהול מתחילים ב-₪1,500 לחודש; תקציב המדיה נפרד ומשולם על ידך. חשבון Google Ads ופרופיל התשלומים בבעלותך, ו-WAO מנהלת דרך MCC.",
        },
      },
      {
        "@type": "Question",
        name: "איך יודעים אם הפרסום בגוגל מביא פניות אמיתיות?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "אין תאריך קבוע לתוצאות או מספר פניות שאפשר להבטיח. מחברים GA4 ו-Google Tag Manager, ואז בודקים פניות מול ההוצאה.",
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
    title: "קודם בודקים לאן הכסף הולך",
    desc: "כבר שילמת על קליקים ולא ידעת מי פנה? מתחילים בבדיקת החשבון וההמרות. מגדירים מה נחשב פנייה, ורק אז מחליטים איפה נכון לפרסם.",
    tags: ["Google Ads Audit", "CPA Target", "ROAS", "Competitor Analysis"],
  },
  {
    n: "02",
    title: "מפרסמים במקום שבו הלקוח מחפש",
    desc: "מפרידים בין חיפוש ממוקד ב-Search לבין חשיפה רחבה יותר ב-Performance Max. כשזה מתאים לעסק, בוחנים גם YouTube Ads מול המטרה והתקציב שלך.",
    tags: ["Performance Max", "Search Campaigns", "YouTube Ads", "Demand Gen"],
  },
  {
    n: "03",
    title: "מחליטים לפי נתוני העסק, לא לפי תחושת בטן",
    desc: "המערכת צריכה לדעת איזו פנייה חשובה לך, ולא רק מי לחץ. בודקים את נתוני ההמרות לפני שמשנים הצעות מחיר או מרחיבים קמפיין.",
    tags: ["Smart Bidding", "Target ROAS", "Audience Signals", "First-Party Data"],
  },
  {
    n: "04",
    title: "מודעות שמדברות ללקוח הנכון",
    desc: "המודעה שלך צריכה לענות על מה שהלקוח מחפש באותו רגע. בוחנים ניסוחים ונכסים לפי הפניות שהם מביאים, לא לפי קליקים בלבד.",
    tags: ["RSA", "PMax Assets", "Ad Copy", "A/B Testing"],
  },
  {
    n: "05",
    title: "מעקב המרות לפני עוד שקל על פרסום",
    desc: "מחברים GA4 ו-Google Tag Manager כדי למדוד מה קורה אחרי הקליק. כך אפשר לבדוק אם הקמפיין מביא פניות מול הכסף שאתה מוציא.",
    tags: ["GA4", "Conversion Tracking", "GTM", "Attribution"],
  },
];

const INCLUDED = [
  { icon: "🔬", title: "בדיקת חשבון Google Ads", desc: "בודקים את מבנה הקמפיינים ואת מדידת ההמרות לפני החלטות על התקציב. Fraud Blocker מסייע בהגנה מפני הונאת קליקים." },
  { icon: "🎯", title: "ניהול Search ו-Performance Max", desc: "מתאימים את סוג הקמפיין לחיפוש, למטרה ולתקציב שלך; לא מפעילים הכול אוטומטית." },
  { icon: "▶️", title: "YouTube Ads כשזה מתאים לעסק", desc: "בוחנים גם פרסום בווידאו כשהקהל והמטרה שלך מצדיקים את תקציב המדיה." },
  { icon: "📊", title: "מדידת המרות עם GA4 ו-GTM", desc: "מחברים GA4 ו-Google Tag Manager כדי לראות פניות והמרות לצד ההוצאה." },
  { icon: "✍️", title: "ניסוח מודעות ובדיקת מסרים", desc: "בוחנים איזה ניסוח מדבר ללקוחות שלך ומביא פניות, לא רק חשיפות." },
  { icon: "📈", title: "החלטות לפי נתונים מהחשבון שלך", desc: "חשבון Google Ads נשאר שלך; אתה יכול לראות בעצמך את ההוצאה והביצועים." },
];

const STATS = [
  { n: "200–400%", l: "ROI מדווח ללקוחות WAO", sub: "נתונים פנימיים WAO 2025" },
  { n: "60%", l: "ירידה מדווחת ב-CPA", sub: "נתונים פנימיים WAO 2025" },
  { n: "8:1", l: "ROAS לפי בנצ'מרק ענפי, לא נתון מהחשבון שלך", sub: "Google Ads Benchmarks 2025" },
];

const FAQS = [
  {
    q: "כמה עולה ניהול קמפיינים בגוגל, ומי משלם על המודעות?",
    a: "דמי הניהול מתחילים ב-₪1,500 לחודש; תקציב המדיה נפרד ומשולם על ידך. חשבון Google Ads ופרופיל התשלומים בבעלותך, ו-WAO מנהלת דרך MCC.",
  },
  {
    q: "מה ההבדל בין פרסום בגוגל לבין קידום אורגני?",
    a: "בקידום ממומן אתה משלם על תנועה מהמודעות, והיא תלויה בתקציב. קידום אורגני אינו מחייב תשלום לקליק, אבל דורש עבודה וזמן. בוחרים ערוץ לפי העסק שלך, לא לפי הבטחה לתוצאות מיידיות.",
  },
  {
    q: "מה זה Performance Max, והאם הוא מתאים לעסק שלך?",
    a: "Performance Max הוא סוג קמפיין שמציג מודעות בכמה ערוצים של Google. הוא לא מתאים אוטומטית לכל עסק; בודקים נתוני המרות, מטרה ותקציב לפני שבוחרים בו.",
  },
  {
    q: "איך יודעים אם הפרסום בגוגל מביא פניות אמיתיות?",
    a: "אין תאריך קבוע לתוצאות או מספר פניות שאפשר להבטיח. מחברים GA4 ו-Google Tag Manager, ואז בודקים פניות מול ההוצאה.",
  },
  {
    q: "האם אתה חייב להתחייב לניהול ארוך טווח?",
    a: "לא. אין חוזה ארוך טווח. חשבון Google Ads ופרופיל התשלומים נשארים בבעלותך; WAO פועלת דרך MCC. תקציב הפרסום משולם בנפרד מדמי הניהול.",
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
            החשבון שלך. התקציב שלך. אנחנו מנהלים דרך MCC.
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
            פרסום בגוגל, בחשבון{" "}
            <span className="text-gradient">שנשאר שלך</span>
            {" "}— בלי להינעל על סוכנות
          </h1>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.2rem)", marginBottom: "40px", maxWidth: "620px" }}>
            כבר שילמת על קליקים בלי לדעת כמה פניות קיבלת? החשבון ופרופיל התשלומים נשארים שלך; WAO מנהלת את הקמפיינים דרך MCC. מתחילים ממדידת המרות עם GA4 ו-Google Tag Manager. מעדיף להתחיל בעצמך? בדוק את אפשרות ה-Ads Bot.
          </p>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <a href="tel:0526148860" className="btn-primary" style={{ fontSize: "1.05rem", padding: "15px 36px" }}>
              דבר איתנו 30 דקות, בחינם
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <Link href="/google-ads/onboarding?demo=1&mode=test&clientId=google-ads-sandbox" className="btn-outline" style={{ fontSize: "1rem" }}>
              ראה הדגמת Sandbox בלי תקציב חי ←
            </Link>
            <Link href="/google-ads/onboarding" className="btn-outline" style={{ fontSize: "1rem" }}>
              בדוק את מסלול ה-Ads Bot ←
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ background: "var(--surface)", paddingBlock: "clamp(48px,6vw,72px)" }}>
        <div className="wao-container">
          <div className="eyebrow" style={{ justifyContent: "center", marginBottom: "40px" }}>נתוני עבר מדווחים — לא הבטחה לקמפיין שלך</div>
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
            <div className="eyebrow">כך ניגשים לחשבון שלך</div>
            <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
              חמישה צעדים בדרך להחלטות{" "}
              <span className="text-gradient">מבוססות נתונים</span>
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
            <div className="eyebrow">מה עושים בפועל</div>
            <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
              ניהול קמפיינים בגוגל —{" "}
              <span className="text-gradient">בחשבון שלך</span>
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
            כל מה שאתה צריך לדעת על{" "}
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
              <div className="eyebrow" style={{ justifyContent: "center" }}>משלם על קליקים, ולא יודע כמה פניות הגיעו?</div>
              <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem,3.5vw,2.6rem)", lineHeight: 1.15, marginBottom: "16px" }}>
                שיחת ייעוץ של 30 דקות —{" "}
                <span className="text-gradient">נבדוק יחד לאן התקציב הולך</span>
              </h2>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "32px", maxWidth: "480px", margin: "0 auto 32px", lineHeight: 1.75 }}>
                בשיחה חינמית של 30 דקות נבחן את החשבון ואת מדידת ההמרות. תראה מה כדאי לבדוק לפני שאתה מוסיף עוד כסף לפרסום.
              </p>
              <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                <PhoneReveal
                  source="google-ads-bottom-cta"
                  className="btn-primary"
                  style={{ fontSize: "1.05rem", padding: "16px 40px" }}
                  icon="📞 "
                />
                <Link href="/google-ads/onboarding" className="btn-outline" style={{ fontSize: "1rem" }}>
                  מעדיף להתחיל לבד? בדוק את Ads Bot ←
                </Link>
              </div>
              <p style={{ marginTop: "20px", fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                ✓ שיחת ייעוץ חינם, 30 דקות · ✓ בלי חוזה ארוך · ✓ החשבון שלך
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
