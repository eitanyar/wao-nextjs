import type { Metadata } from "next";
import Link from "next/link";
import GT from "@/components/GlossaryTerm";

const CANONICAL = "https://www.wao.co.il/seo";

export const metadata: Metadata = {
  title: "קידום אתרים (SEO) — שיטת WAO | Topical Authority ו-AI Overviews",
  description:
    "קידום אתרים ב-2026: Topical Authority, AI Overviews ו-Technical SEO. WAO בונים נוכחות דיגיטלית שמביאה לקוחות מוכנים לרכישה — לא רק תנועה. 20+ שנות ניסיון.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "קידום אתרים (SEO) — שיטת WAO | Topical Authority ו-AI Overviews",
    description:
      "קידום אתרים ב-2026: Topical Authority, AI Overviews ו-Technical SEO. WAO בונים נוכחות דיגיטלית שמביאה לקוחות מוכנים לרכישה — לא רק תנועה.",
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
    name: "קידום אתרים (SEO) — WAO",
    description: "שירות קידום אתרים מקצועי עם שיטת Topical Authority ואופטימיזציה ל-AI Overviews",
    isPartOf: { "@type": "WebSite", "@id": "https://www.wao.co.il/#website" },
  },
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${CANONICAL}#service`,
    serviceType: "SEO Service",
    name: "קידום אתרים (SEO)",
    description:
      "שירות SEO מקצועי: Technical SEO, Topical Authority, E-E-A-T, AI Overviews Optimization ו-Link Building. חבילות מ-2,500 ₪ לחודש.",
    url: CANONICAL,
    provider: { "@type": "Organization", "@id": "https://www.wao.co.il/#org" },
    areaServed: { "@type": "Country", name: "Israel" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "ILS",
      lowPrice: "2500",
      offerCount: "3",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "כמה זמן לוקח לראות תוצאות בקידום אתרים?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "תוצאות ראשונות מורגשות תוך 3–4 חודשים. שיפורים משמעותיים מגיעים בין 6 ל-12 חודשים.",
        },
      },
      {
        "@type": "Question",
        name: "כמה עולה קידום אתרים בישראל?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "חבילות WAO מתחילות מ-2,500 ₪ לחודש לאתרים קטנים ועד 15,000+ ₪ לפרויקטים תחרותיים.",
        },
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: "https://www.wao.co.il" },
      { "@type": "ListItem", position: 2, name: "קידום אתרים", item: CANONICAL },
    ],
  },
];

const STEPS = [
  {
    n: "01",
    title: "Technical SEO — הבסיס שלא רואים",
    desc: "Core Web Vitals, מהירות טעינה, Crawlability, Schema.org Markup ו-Mobile-First. האלגוריתם פשוט לא יספור אתר שבור. הבסיס הטכני הוא תנאי סף לפני שזזים קדימה.",
    tags: ["Core Web Vitals", "Schema.org", "Mobile-First", "Indexing"],
  },
  {
    n: "02",
    title: "Topical Authority — להיות הסמכות בנושא",
    desc: "במקום לירות מאמרים לכל עבר, אנחנו בונים מפת תוכן חכמה (Content Clusters) שמכסה כל פינה בנישה שלכם. מנועי החיפוש וה-AI מתגמלים רק מי שמפגין עומק.",
    tags: ["Content Clusters", "Pillar Pages", "Internal Linking", "Topical Map"],
  },
  {
    n: "03",
    title: "E-E-A-T — ניסיון, מומחיות, אמינות, אמון",
    desc: "גוגל מחפש בעיקר דבר אחד: להבין אם מאחורי האתר עומד מומחה בשר ודם. אנחנו מייצרים עבורכם את האותיות והסיגנלים שמוכיחים את זה: Author Bios, Citations, About Page חזק, ביקורות, Press Mentions ו-Social Proof.",
    tags: ["Author Authority", "Trust Signals", "Citations", "Reviews"],
  },
  {
    n: "04",
    title: "AI Overviews Optimization — השיטה שפיתחנו",
    desc: (
      <>
        לא מנחשים מבחוץ. אנחנו מתחברים ל-<bdi dir="ltr">Search Console</bdi> שלכם ורואים מה גוגל באמת מציג לאתר — אילו שאילתות, באילו מיקומים. על בסיס הנתונים האמיתיים האלה אנחנו בונים את התוכן שגוגל יכול לצטט ב-<bdi dir="ltr">AI Overview</bdi> — כולל ה-<bdi dir="ltr">FAQ Schema</bdi> הנכון — ולא את המתחרה.{" "}
        <Link href="/geo/audit" style={{ color: "var(--accent)", textDecoration: "underline" }}>
          בדקו את הנראות של האתר שלכם
        </Link>{" "}
        ותראו את זה על הנתונים שלכם.
      </>
    ),
    tags: ["AI Overviews", "Featured Snippets", "FAQ Schema", "Direct Answers"],
  },
  {
    n: "05",
    title: "Link Building — בניית אמינות חיצונית",
    desc: "קישורים נכנסים מאתרים רלוונטיים ומהימנים בנישה שלכם. בלי ”חבילות קישורים” תעשייתיות – אלא רק קישורים אסטרטגיים שמקפיצים את ה-Domain Authority ואת ה-Topical Relevance.",
    tags: ["Domain Authority", "Relevant Links", "Digital PR", "Guest Posts"],
  },
];

const INCLUDED = [
  { icon: "🔬", title: "SEO Audit מקיף", desc: "בדיקת 150+ נקודות: Technical, On-Page, Off-Page וניתוח מתחרים." },
  { icon: "🗺️", title: "Topical Map + Keyword Research", desc: "מיפוי מלא של הנישה שלכם, מילות מפתח ופוטנציאל תנועה." },
  { icon: "🔧", title: "תיקוני Technical SEO", desc: "יישום מלא: מהירות, Crawl, Schema, Mobile, Core Web Vitals." },
  { icon: "✍️", title: "Content Strategy & Execution", desc: "תוכן שמניע דירוג, ממיר גולשים ומיועד לציטוט ב-AI Overviews." },
  { icon: "🔗", title: "Link Building אסטרטגי", desc: "קישורים נכנסים איכותיים שמחזקים את הסמכות של הדומיין שלכם." },
  { icon: "📊", title: "דיווח חודשי + שיחת עדכון", desc: "Dashboard חי, דוח חודשי מפורט ושיחת עדכון עם המומחה שלכם." },
];

const FAQS = [
  {
    q: "כמה זמן לוקח לראות תוצאות בקידום אתרים?",
    a: "בשטח, את הניצוצות הראשונים – כמו שיפור מיקומים ותחילת עליה בתנועה – רואים כבר תוך 3–4 חודשים. שיפורים משמעותיים מגיעים בין 6 ל-12 חודשים. קידום אתרים הוא השקעה לטווח ארוך: לאחר שמגיעים למיקום גבוה, התנועה ממשיכה ללא תשלום נוסף לקליק.",
  },
  {
    q: "כמה עולה קידום אתרים בישראל?",
    a: "חבילות WAO מתחילות מ-2,500 ₪ לחודש לאתרים קטנים ועד 15,000+ ₪ לפרויקטים תחרותיים. כל הצעה כוללת יעדי KPI ברורים ופירוט מלא של הפעולות המתוכננות.",
  },
  {
    q: "האם SEO עדיין רלוונטי עם AI?",
    a: "יותר מאי פעם. AI Overviews של גוגל מגדיל את הביקוש לתוכן מוסמך ואמין. עסק עם SEO מודרני יופיע גם בתוצאות האורגניות וגם יצוטט ב-AI Overview — כפול החשיפה.",
  },
  {
    q: "מה ההבדל בין SEO ל-Google Ads?",
    a: "Google Ads = תשלום לכל קליק — ברגע שסוגרים את הברז התקציבי, התנועה נעלמת. SEO, לעומת זאת, הוא נכס נדל״ני: ברגע שכבשתם את הפסגה, הגולשים ממשיכים להגיע בחינם. הגישה האופטימלית משלבת את שניהם.",
  },
  {
    q: "האם WAO עובדת ללא חוזה ארוך טווח?",
    a: "כן. אנחנו לא מאמינים בנעילת לקוחות. אנחנו עובדים חודש-בחודשו. הלקוחות שלנו בוחרים להישאר פשוט כי הם רואים תוצאות, לא כי מישהו כובל אותם.",
  },
];

export default function SeoPage() {
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
      <section
        style={{ paddingTop: "clamp(110px,14vw,160px)", paddingBottom: "clamp(64px,8vw,96px)", position: "relative", overflow: "hidden" }}
      >
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(74,227,181,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="hero-grid" />
        <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "860px" }}>
          <div className="badge" style={{ marginBottom: "28px" }}>
            <span className="badge-dot" />
            20+ שנות ניסיון בקידום אתרים
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
            קידום אתרים שמביא{" "}
            <span className="text-gradient">לקוחות</span>
            {" "}— לא רק תנועה
          </h1>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.2rem)", marginBottom: "40px", maxWidth: "620px" }}>
            ב-2026, גוגל מציג <GT term="AI Overviews">AI Overviews</GT> לפני כל תוצאה. עסקים שלא מאמצים SEO מודרני — נעלמים. אנחנו בונים לכם את הנוכחות הדיגיטלית שמביאה לקוחות מוכנים לרכישה.
          </p>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <a href="tel:0526148860" className="btn-primary" style={{ fontSize: "1.05rem", padding: "15px 36px" }}>
              קבל ייעוץ SEO חינם
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <Link href="/seo/guide" className="btn-outline" style={{ fontSize: "1rem" }}>
              מדריך SEO מלא
            </Link>
          </div>

          <div style={{ marginTop: "64px", paddingTop: "40px", borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "32px" }}>
            {[
              { n: "20+", l: "שנות ניסיון" },
              { n: "500+", l: "לקוחות מרוצים" },
              { n: "3–4", l: "חודשים לתוצאות" },
              { n: "ללא", l: "חוזה ארוך" },
            ].map((s) => (
              <div key={s.n}>
                <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "2.2rem", lineHeight: 1, color: "var(--text)", marginBottom: "6px" }}>{s.n}</div>
                <div style={{ fontSize: "0.85rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Methodology ── */}
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container">
          <div style={{ marginBottom: "60px" }}>
            <div className="eyebrow">שיטת WAO ל-SEO</div>
            <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
              5 עמודות ה-<span className="text-gradient">Topical Authority</span>
            </h2>
            <p style={{ ...bodyStyle, marginTop: "12px", maxWidth: "580px" }}>
              לעשות היום SEO שנשען רק על מילות מפתח, זה כמו לבנות בית בלי יסודות. כל עמודה כאן קריטית.
            </p>
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
            <div className="eyebrow">מה כולל השירות</div>
            <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
              חבילת SEO מלאה —{" "}
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
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container" style={{ maxWidth: "800px" }}>
          <div className="eyebrow">שאלות נפוצות</div>
          <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)", marginBottom: "48px" }}>
            כל מה שרציתם לדעת על{" "}
            <span className="text-gradient">קידום אתרים</span>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {FAQS.map((faq) => (
              <details key={faq.q} style={{ ...glass, padding: "0" }}>
                <summary
                  style={{
                    padding: "22px 24px",
                    cursor: "pointer",
                    fontFamily: "var(--font-rubik), sans-serif",
                    fontWeight: 700,
                    fontSize: "1.02rem",
                    lineHeight: 1.4,
                    listStyle: "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "16px",
                  }}
                >
                  {faq.q}
                  <span style={{ fontSize: "1.2rem", color: "var(--accent)", flexShrink: 0 }}>+</span>
                </summary>
                <div style={{ padding: "0 24px 22px", ...bodyStyle }}>{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sub-pages navigation ── */}
      <section className="wao-section">
        <div className="wao-container">
          <div className="eyebrow">מדריכי SEO מתקדמים</div>
          <h2 style={{ ...h2Style, fontSize: "clamp(1.4rem,2.5vw,2rem)", marginBottom: "32px" }}>
            העמק את הידע שלך
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px" }}>
            {[
              { href: "/seo/topical-authority", label: "Topical Authority — המדריך המלא" },
              { href: "/seo/guide", label: "מדריך SEO מקיף — מתחילים למתקדמים" },
              { href: "/seo/keyword-research", label: "מחקר מילות מפתח" },
              { href: "/seo/international", label: "קידום אתרים בינלאומי" },
              { href: "/seo/consulting", label: "יועץ SEO אישי — 950 ₪/חודש" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: "block",
                  padding: "18px 20px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  fontFamily: "var(--font-body), sans-serif",
                  fontSize: "0.95rem",
                  color: "var(--text)",
                  transition: "border-color 0.18s ease",
                  textDecoration: "none",
                }}
              >
                {link.label} →
              </Link>
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
              <div className="eyebrow" style={{ justifyContent: "center" }}>מוכנים להתחיל?</div>
              <h2
                style={{
                  fontFamily: "var(--font-rubik), sans-serif",
                  fontWeight: 900,
                  fontSize: "clamp(1.6rem,3.5vw,2.6rem)",
                  lineHeight: 1.15,
                  marginBottom: "16px",
                }}
              >
                שיחה קצרה שיכולה לשנות{" "}
                <span className="text-gradient">את כיוון העסק שלך</span>
              </h2>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "32px", maxWidth: "480px", margin: "0 auto 32px", lineHeight: 1.75 }}>
                ייעוץ SEO ראשון ללא עלות — נבחן את המצב הקיים ונגיד לכם בדיוק מה חסר.
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
