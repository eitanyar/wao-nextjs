import type { Metadata } from "next";
import Link from "next/link";
import SiloNav from "@/components/SiloNav";
import GT from "@/components/GlossaryTerm";

const CANONICAL = "https://www.wao.co.il/seo/consulting";
const SAME_AS = [
  "https://www.linkedin.com/in/eitanyariv/",
  "https://qa.askpavel.co.il/user/%D7%90%D7%99%D7%AA%D7%9F+%D7%99%D7%A8%D7%99%D7%91",
];

// ── Static metadata fallback ────────────────────────────────────────────────
const STATIC_META = {
  title: "יועץ קידום אתרים מנוסה — 20+ שנות ניסיון | WAO",
  description:
    "איתן יריב — יועץ SEO עם 20+ שנות ניסיון. ייעוץ אישי ומעשי: Topical Authority, Core Web Vitals, AI Overviews ו-Technical SEO. מנטורינג חודשי ב-950 ₪ ללא חוזה.",
};

// ── Metadata ────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title:      STATIC_META.title,
  description: STATIC_META.description,
  alternates: { canonical: CANONICAL },
  robots:     { index: true, follow: true },
  openGraph: {
    title:       STATIC_META.title,
    description: STATIC_META.description,
    url:         CANONICAL,
    type:        "website",
  },
};

// ── JSON-LD ─────────────────────────────────────────────────────────────────
const webPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${CANONICAL}#webpage`,
  url: CANONICAL,
  name: STATIC_META.title,
  description: STATIC_META.description,
  isPartOf: { "@type": "WebSite", "@id": "https://www.wao.co.il/#website" },
  author: {
    "@type": "Person",
    "@id": "https://www.wao.co.il/about#person",
    name: "איתן יריב",
    sameAs: SAME_AS,
  },
};

const consultingServiceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${CANONICAL}#service`,
  serviceType: "SEO Consulting",
  name: "ייעוץ קידום אתרים אורגני",
  description:
    "ייעוץ SEO אישי ומעשי מאיתן יריב — 20+ שנות ניסיון. Technical SEO, Topical Authority, AI Overviews ו-Core Web Vitals.",
  url: CANONICAL,
  provider: {
    "@type": "Person",
    "@id": "https://www.wao.co.il/about#person",
    name: "איתן יריב",
    jobTitle: "מייסד WAO ויועץ SEO בכיר",
    url: "https://www.wao.co.il/about",
    worksFor: { "@type": "Organization", "@id": "https://www.wao.co.il/#org" },
    sameAs: SAME_AS,
  },
  areaServed: { "@type": "Country", name: "Israel" },
  offers: {
    "@type": "Offer",
    "@id": `${CANONICAL}#offer`,
    name: "מנטורינג SEO חודשי",
    price: "950",
    priceCurrency: "ILS",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: "950",
      priceCurrency: "ILS",
      unitText: "חודש",
    },
    availability: "https://schema.org/InStock",
    seller: { "@type": "Organization", "@id": "https://www.wao.co.il/#org" },
  },
};

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  "@id": `${CANONICAL}#product`,
  name: "מנטורינג SEO — 950 ₪ לחודש",
  description:
    "מנטורינג SEO אישי חודשי עם יועץ בכיר: מפגש אסטרטגיה, Roadmap עדכני, בדיקת ב-Technical SEO ומעקב KPIs. ללא חוזה.",
  brand: { "@type": "Brand", name: "WAO" },
  offers: {
    "@type": "Offer",
    price: "950",
    priceCurrency: "ILS",
    availability: "https://schema.org/InStock",
    url: CANONICAL,
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "דף הבית",     item: "https://www.wao.co.il" },
    { "@type": "ListItem", position: 2, name: "קידום אתרים", item: "https://www.wao.co.il/seo" },
    { "@type": "ListItem", position: 3, name: "יועץ SEO",    item: CANONICAL },
  ],
};

// ── Shared header (breadcrumb + SiloNav) ───────────────────────────────────
function PageHeader() {
  return (
    <div className="wao-container" style={{ paddingTop: "clamp(90px,12vw,130px)", paddingBottom: "0" }}>
      <nav aria-label="breadcrumb" className="breadcrumb">
        <Link href="/">דף הבית</Link>
        <span className="breadcrumb-sep" aria-hidden>›</span>
        <Link href="/seo">קידום אתרים</Link>
        <span className="breadcrumb-sep" aria-hidden>›</span>
        <span aria-current="page">יועץ SEO</span>
      </nav>
      <SiloNav currentPath="/seo/consulting" />
    </div>
  );
}

// ── Schemas fragment ────────────────────────────────────────────────────────
function Schemas() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(consultingServiceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}

// ── Static fallback page ───────────────────────────────────────────────────
function StaticPage() {
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
      {/* ── Hero ── */}
      <section
        style={{
          paddingTop: "clamp(60px,8vw,96px)",
          paddingBottom: "clamp(64px,8vw,96px)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(74,227,181,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div className="hero-grid" />
        <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "820px" }}>
          <div className="badge" style={{ marginBottom: "28px" }}>
            <span className="badge-dot" />
            ייעוץ SEO אישי — 20+ שנות ניסיון מוכח
          </div>

          <h1
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 900,
              fontSize: "clamp(2.2rem,5vw,3.8rem)",
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              marginBottom: "24px",
            }}
          >
            יועץ קידום אתרים{" "}
            <span className="text-gradient">מנוסה</span>
            {" "}—{" "}
            <br className="hidden md:block" />
            שיודע לסגור פערים אמיתיים בשדה
          </h1>

          <p
            style={{
              ...bodyStyle,
              fontSize: "clamp(1rem,1.8vw,1.2rem)",
              marginBottom: "40px",
              maxWidth: "640px",
            }}
          >
            לא עוד יועץ שמגיע, מציג מצגת, ונעלם. איתן יריב עובד לצדכם כשותף שטח —
            מזהה את הפערים ב-<GT term="Technical SEO">Technical SEO</GT>, מתעדף לפי{" "}
            <GT term="ROI">ROI</GT>, ומוודא שהביצוע קורה. מאז 2007
            ועד עידן <GT term="AI Overviews">AI Overviews</GT> של 2026.
          </p>

          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <a href="tel:0526148860" className="btn-primary" style={{ fontSize: "1.05rem", padding: "15px 36px" }}>
              📞 ייעוץ ראשון חינם
            </a>
            <a href="#offer" className="btn-outline" style={{ fontSize: "1rem" }}>
              ← מנטורינג 950 ₪/חודש
            </a>
          </div>
        </div>
      </section>

      {/* ── TL;DR / AI Summary ── */}
      <div className="wao-container" style={{ maxWidth: "820px", paddingBottom: "clamp(40px,5vw,64px)" }}>
        <div
          role="note"
          aria-label="סיכום AI — בקצרה"
          data-ai-summary="true"
          style={{
            background: "var(--accent-dim)",
            border: "1px solid var(--accent-border)",
            borderInlineStart: "4px solid var(--accent)",
            borderRadius: "var(--radius-md)",
            padding: "22px 28px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <span aria-hidden>🤖</span>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif" }}>
              בקצרה — סיכום ל-AI ולקורא הממהר
            </span>
          </div>
          <ul style={{ ...bodyStyle, paddingInlineStart: "1.3rem", display: "flex", flexDirection: "column", gap: "8px", margin: 0 }}>
            <li><strong style={{ color: "var(--text)" }}>יועץ SEO</strong> = שותף שטח שמגיע עם אסטרטגיה, מפקח על ביצוע, ומוביל לתוצאות מדידות — לא מסמך PDF ועדכון חודשי.</li>
            <li>איתן יריב ניהל SEO עבור מותגים גדולים בישראל ובחו״ל — דפי זהב, בנק לאומי, למטייל — ומאז 2006 מוביל לקוחות <GT term="B2C">B2C</GT> לצמיחה אורגנית.</li>
            <li><strong style={{ color: "var(--text)" }}>2026:</strong> <GT term="AI Overviews">AI Overviews</GT>, <GT term="Topical Authority">Topical Authority</GT> ו-<GT term="Core Web Vitals">Core Web Vitals</GT> הפכו לדרישת מינימום. יועץ שלא שולט בהם — מוביל אתכם לאחור.</li>
            <li><strong style={{ color: "var(--text)" }}>מנטורינג חודשי ב-950 ₪</strong> — מפגש אסטרטגיה, Roadmap עדכני, בדיקת <GT term="Technical SEO">Technical SEO</GT>. ללא חוזה, תשלום בסוף החודש.</li>
            <li>שלושה תחומי עומק: ביצועי <GT term="Next.js">Next.js</GT> ו-<GT term="Core Web Vitals">Core Web Vitals</GT>, ניקוי <GT term="Indexing Bloat">Indexing Bloat</GT> וקאניבליזציה, אופטימיזציה <GT term="Mobile-First">מובייל-ראשית</GT> לדפי נחיתה.</li>
          </ul>
        </div>
      </div>

      {/* ── Value proposition: Hands-on partnership ── */}
      <section className="wao-section" style={{ background: "var(--surface)", paddingTop: "clamp(56px,7vw,80px)" }}>
        <div className="wao-container">
          <div className="content-2col">
            <div>
              <div className="eyebrow">מה שרוב יועצי SEO לא עושים</div>
              <h2 style={h2Style}>
                שותפות מעשית —{" "}
                <span className="text-gradient">לא ייעוץ מהצד</span>
              </h2>
              <p style={{ ...bodyStyle, marginBottom: "18px" }}>
                מרבית יועצי SEO מספקים רשימת המלצות, ומשאירים אתכם לבד עם הביצוע. הצוות
                הטכני לא מבצע. ה-<GT term="KPI">KPIs</GT> לא זזים. ובסוף החודש מקבלים עוד דוח.
              </p>
              <p style={{ ...bodyStyle, marginBottom: "18px" }}>
                הגישה של איתן שונה: <strong style={{ color: "var(--text)" }}>אנחנו עובדים
                ביחד</strong> — מגדירים את הפערים, מתעדפים לפי ROI, ומוודאים שהביצוע
                קורה בפועל. בין אם הצוות הטכני שלכם, של WAO, או כלים של AI.
              </p>
              <p style={{ ...bodyStyle }}>
                לקוחות המנטורינג מקבלים גישה ישירה לאיתן — לא ל-account manager.
                שאלה דחופה? DM. שינוי אלגוריתם? עדכון מיידי. ביצוע שנתקע? פותרים.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                { icon: "🎯", title: "Prioritized Roadmap",   desc: "כל פעולה מדורגת לפי ROI צפוי — לפי עקרון פארטו: 20% הפעולות שמביאות 80% מהתוצאות." },
                { icon: "⚙️", title: "Technical SEO Hands-On", desc: "לא רק מה לתקן — גם איך. Schema Markup, Canonical tags, Crawl Budget, Core Web Vitals — עם ביצוע בפועל." },
                { icon: "🤖", title: "AI-Era Strategy",        desc: "AI Overviews, Topical Authority ו-Generative Search מוטמעים בכל תכנית עבודה מ-2025." },
                { icon: "📊", title: "KPIs שזזים",            desc: "מדידה אמיתית: תנועה אורגנית, לידים מ-SEO, הכנסה — לא מיקומי מילות מפתח בלבד." },
              ].map((item) => (
                <div key={item.title} style={{ ...glass, padding: "18px 20px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "1.3rem", flexShrink: 0, lineHeight: 1.3 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.95rem", marginBottom: "4px" }}>
                      {item.title}
                    </div>
                    <p style={{ ...bodyStyle, fontSize: "0.87rem" }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Case studies ── */}
      <section className="wao-section">
        <div className="wao-container">
          <div className="eyebrow">מקרי בוחן</div>
          <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)", marginBottom: "48px", maxWidth: "540px" }}>
            תוצאות מדידות —{" "}
            <span className="text-gradient">לא סיפורים</span>
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

            {/* Case A — Next.js Core Web Vitals */}
            <div style={{ ...glass, padding: "clamp(28px,4vw,40px)", position: "relative", overflow: "hidden" }}>
              <div aria-hidden style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: "linear-gradient(180deg, #4AE3B5, #00C3FF)" }} />
              <div style={{ paddingInlineStart: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "1.5rem" }}>⚡</span>
                  <div>
                    <span className="tag-chip" style={{ fontSize: "0.74rem" }}>Core Web Vitals</span>
                    {" "}
                    <span className="tag-chip" style={{ fontSize: "0.74rem" }}>Next.js Migration</span>
                  </div>
                </div>
                <h3 style={{ ...h2Style, fontSize: "1.2rem", marginBottom: "10px" }}>
                  Case A — האתר נטען לאט ולקוחות עזבו לפני שהדף נפתח
                </h3>
                <p style={{ ...bodyStyle, marginBottom: "14px" }}>
                  לקוח <GT term="B2C">B2C</GT> עם אתר שנטען לאט מדי — כ-7 שניות עד שהתוכן הראשי הופיע.
                  בעולם שבו רוב הגולשים עוזבים אחרי 3 שניות, זו הזדמנות אבודה לפני שהספקנו להציג את עצמנו.
                  גוגל ראה זאת בדיוק כך — ודחק את האתר לתחתית תוצאות החיפוש.
                </p>
                <p style={{ ...bodyStyle, marginBottom: "16px" }}>
                  <strong style={{ color: "var(--text)" }}>מה עשינו:</strong> עברנו לפלטפורמה
                  מהירה יותר (<GT term="Next.js">Next.js</GT>), דחסנו את כל תמונות האתר לגודל קטן פי כמה
                  ללא פגיעה בחדות, והסרנו תוספים שהאטו את הטעינה. כל שינוי נמדד לפני ואחרי —
                  ולא עברנו הלאה עד שהמספרים הוכיחו שיפור.
                </p>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  {[["LCP", "7.2s", "1.4s"], ["CLS", "0.38", "0.02"], ["INP", "580ms", "85ms"]].map(([m, before, after]) => (
                    <div key={m} style={{ background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 16px", textAlign: "center", minWidth: "90px" }}>
                      <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 800, fontSize: "0.78rem", color: "var(--accent)", marginBottom: "6px" }}>{m}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", textDecoration: "line-through" }}>{before}</div>
                      <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1rem", color: "#10b981" }}>{after}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Case B — Indexing / Canonicals */}
            <div style={{ ...glass, padding: "clamp(28px,4vw,40px)", position: "relative", overflow: "hidden" }}>
              <div aria-hidden style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: "linear-gradient(180deg, #f59e0b, #ef4444)" }} />
              <div style={{ paddingInlineStart: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "1.5rem" }}>🔬</span>
                  <div>
                    <span className="tag-chip" style={{ fontSize: "0.74rem" }}>Indexing Audit</span>
                    {" "}
                    <span className="tag-chip" style={{ fontSize: "0.74rem" }}>Canonicalization</span>
                    {" "}
                    <span className="tag-chip" style={{ fontSize: "0.74rem" }}>Link Cannibalization</span>
                  </div>
                </div>
                <h3 style={{ ...h2Style, fontSize: "1.2rem", marginBottom: "10px" }}>
                  Case B — גוגל הסתבך באתר ומאמרים ביטלו זה את זה
                </h3>
                <p style={{ ...bodyStyle, marginBottom: "14px" }}>
                  אתר e-commerce שגוגל לא ידע מה לעשות איתו — מתוך 4,200 דפים שנסרקו, למעלה
                  מ-1,800 היו דפים ריקים מתוכן ממשי (פילטרים, דפי ניווט) שבלבלו את גוגל ובזבזו
                  את תקציב הסריקה. בנוסף, 23 זוגות מאמרים תחרו ביניהם על אותו קהל —
                  ניטרלו זה את זה עד שאף אחד לא הגיע לדף הראשון.
                </p>
                <p style={{ ...bodyStyle, marginBottom: "16px" }}>
                  <strong style={{ color: "var(--text)" }}>מה עשינו:</strong> עשינו סדר —
                  הגדרנו אילו דפים גוגל יסרוק ואילו לא, איחדנו מאמרים שפנו לאותו קהל לדף
                  אחד חזק, והכנו מפת אתר נקייה. פחות בלגן — יותר מיקוד —
                  ותנועה אורגנית שחזרה לעלות.
                </p>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  {[["Indexed URLs", "4,200", "1,950"], ["Crawl Waste", "~43%", "<8%"], ["Organic", "baseline", "+68%"]].map(([m, before, after]) => (
                    <div key={m} style={{ background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 16px", textAlign: "center", minWidth: "100px" }}>
                      <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 800, fontSize: "0.78rem", color: "var(--accent)", marginBottom: "6px" }}>{m}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", textDecoration: "line-through" }}>{before}</div>
                      <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1rem", color: "#10b981" }}>{after}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Case C — Mobile rendering */}
            <div style={{ ...glass, padding: "clamp(28px,4vw,40px)", position: "relative", overflow: "hidden" }}>
              <div aria-hidden style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: "linear-gradient(180deg, #8b5cf6, #06b6d4)" }} />
              <div style={{ paddingInlineStart: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "1.5rem" }}>📲</span>
                  <div>
                    <span className="tag-chip" style={{ fontSize: "0.74rem" }}>Mobile-First</span>
                    {" "}
                    <span className="tag-chip" style={{ fontSize: "0.74rem" }}>Viewport Rendering</span>
                    {" "}
                    <span className="tag-chip" style={{ fontSize: "0.74rem" }}>LP Optimization</span>
                  </div>
                </div>
                <h3 style={{ ...h2Style, fontSize: "1.2rem", marginBottom: "10px" }}>
                  Case C — דפי הפרסום לא עבדו בסמארטפון וכל קליק עלה יותר מדי
                </h3>
                <p style={{ ...bodyStyle, marginBottom: "14px" }}>
                  <GT term="Landing Page">דפי נחיתה</GT> לקמפיינים ב-Google Ads שהתנהגו
                  כאילו נבנו לפני עידן הסמארטפון — כפתורי פעולה קטנים מדי לאצבע, טפסים
                  שקשה למלא בנייד, וטקסטים שנגזרו מחוץ למסך. גוגל ענש את הדפים בציון
                  נמוך — ובכל יום קמפיין שילמנו יותר על כל קליק ומרווחנו פחות על כל לקוח.
                </p>
                <p style={{ ...bodyStyle, marginBottom: "16px" }}>
                  <strong style={{ color: "var(--text)" }}>מה עשינו:</strong> עיצבנו מחדש
                  את כל הדפים בשביל הסמארטפון — כפתור בולט שנשאר נגיש גם בגלילה, טופס
                  נוח, ומסר שתואם בדיוק למה שנכתב במודעה. גוגל שדרג את הציון, עלות הקליק
                  ירדה, ושיעור ההמרה יותר מהוכפל.
                </p>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  {[["Quality Score", "3/10", "8/10"], ["Mobile CVR", "1.2%", "4.1%"], ["CPA", "baseline", "-58%"]].map(([m, before, after]) => (
                    <div key={m} style={{ background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 16px", textAlign: "center", minWidth: "100px" }}>
                      <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 800, fontSize: "0.78rem", color: "var(--accent)", marginBottom: "6px" }}>{m}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", textDecoration: "line-through" }}>{before}</div>
                      <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1rem", color: "#10b981" }}>{after}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mentorship offer ── */}
      <section id="offer" className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container" style={{ maxWidth: "760px" }}>
          <div className="eyebrow">ההצעה</div>
          <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)", marginBottom: "40px" }}>
            מנטורינג SEO אישי —{" "}
            <span className="text-gradient">950 ₪/חודש</span>
          </h2>

          <div
            style={{
              ...glass,
              padding: "clamp(32px,5vw,52px)",
              position: "relative",
              overflow: "hidden",
              borderColor: "var(--accent-border)",
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute", top: 0, left: 0, right: 0, height: "3px",
                background: "linear-gradient(90deg, #4AE3B5, #00C3FF)",
              }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", alignItems: "start" }} className="offer-grid">
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-rubik), sans-serif",
                    fontWeight: 900,
                    fontSize: "clamp(2.5rem,5vw,3.8rem)",
                    lineHeight: 1,
                    background: "linear-gradient(135deg, #4AE3B5 0%, #00C3FF 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    marginBottom: "4px",
                  }}
                >
                  950 ₪
                </div>
                <div style={{ fontFamily: "var(--font-body), sans-serif", fontSize: "0.88rem", color: "var(--muted)", marginBottom: "24px" }}>
                  לחודש · ללא חוזה · תשלום בסוף החודש
                </div>
                <a href="tel:0526148860" className="btn-primary" style={{ fontSize: "1rem", width: "100%", justifyContent: "center", marginBottom: "12px", display: "flex" }}>
                  📞 התחל מנטורינג
                </a>
                <a href="mailto:eitan@wao.co.il" className="btn-outline" style={{ fontSize: "0.9rem", width: "100%", justifyContent: "center", display: "flex" }}>
                  שלח מייל
                </a>
              </div>

              <div>
                <h3 style={{ ...h2Style, fontSize: "1rem", marginBottom: "14px" }}>מה כולל המנטורינג:</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    "מפגש אסטרטגיה חודשי — 60–90 דקות ב-Zoom",
                    "SEO Roadmap עדכני — פעולות ממוינות לפי ROI צפוי",
                    "ביקורת Technical SEO שוטפת + ממצאים בטיפול",
                    "מעקב KPIs אמיתיים: תנועה, לידים, Impressions",
                    "גישה ישירה לאיתן בווטסאפ לשאלות דחופות",
                    "עדכון מיידי בכל שינוי אלגוריתם משמעותי",
                  ].map((item) => (
                    <li
                      key={item}
                      style={{
                        display: "flex", gap: "10px", alignItems: "flex-start",
                        fontFamily: "var(--font-body), sans-serif",
                        fontSize: "0.9rem", color: "var(--muted)", lineHeight: 1.5,
                      }}
                    >
                      <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div
              style={{
                marginTop: "28px",
                paddingTop: "24px",
                borderTop: "1px solid var(--border)",
                fontSize: "0.82rem",
                color: "var(--muted)",
                fontFamily: "var(--font-body), sans-serif",
                lineHeight: 1.65,
              }}
            >
              ⚠️ <strong style={{ color: "var(--text)" }}>מספר מנטורינגים מוגבל:</strong>{" "}
              איתן עובד עם מקסימום 6 לקוחות מנטורינג במקביל כדי לשמור על רמת שירות גבוהה.
              אפשר להתחיל עם חודש ניסיון ללא סיכון — תשלום רק אחרי שרואים ערך.
            </div>
          </div>
        </div>
      </section>

      {/* ── Author bio ── */}
      <section className="wao-section" aria-labelledby="author-bio-h">
        <div className="wao-container" style={{ maxWidth: "800px" }}>
          <div className="eyebrow" id="author-bio-h">הסמכות המקצועית</div>
          <div className="author-bio" itemScope itemType="https://schema.org/Person">
            <div className="author-avatar" aria-hidden>א.י</div>
            <div className="author-meta">
              <div className="author-name" itemProp="name">איתן יריב</div>
              <div className="author-title" itemProp="jobTitle">
                מייסד WAO | יועץ SEO בכיר ומנחה מאז 2007
              </div>
              <p className="author-text" itemProp="description">
                מנהל SEO מאז ימי ה-PageRank הידני. ניהל פרויקטי קידום עבור דפי זהב (כיום
                זאפ), בנק לאומי, למטייל ואולסייל. מאז 2006 מוביל לקוחות B2C ישראלים
                בצמיחה אורגנית מתמשכת. ראה כל שינוי אלגוריתם מהבסיס — ומשתמש בניסיון
                הזה כדי לוודא שהלקוחות שלו תמיד צעד לפני.
              </p>
              <div style={{ display: "flex", gap: "14px", marginTop: "14px", flexWrap: "wrap" }}>
                <a href={SAME_AS[0]} target="_blank" rel="noopener noreferrer" itemProp="sameAs"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn
                </a>
                <a href={SAME_AS[1]} target="_blank" rel="noopener noreferrer" itemProp="sameAs"
                  style={{ fontSize: "0.82rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                  AskPavel
                </a>
              </div>
            </div>
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
              <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem,3.5vw,2.6rem)", lineHeight: 1.15, marginBottom: "16px" }}>
                ייעוץ SEO ראשון בחינם —{" "}
                <span className="text-gradient">נגיד לכם בדיוק מה חסר</span>
              </h2>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "32px", maxWidth: "480px", margin: "0 auto 32px", lineHeight: 1.75 }}>
                שיחה של 30 דקות עם איתן. נבחן את המצב הקיים, נזהה את הפערים המשמעותיים,
                ונחליט יחד אם מנטורינג מתאים.
              </p>
              <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                <a href="tel:0526148860" className="btn-primary" style={{ fontSize: "1.05rem", padding: "16px 40px" }}>
                  📞 052-614-8860
                </a>
                <Link href="/seo" className="btn-outline" style={{ fontSize: "1rem" }}>
                  ← שירות SEO מלא
                </Link>
              </div>
              <p style={{ marginTop: "20px", fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                ✓ ייעוץ ראשון חינם · ✓ ללא חוזה · ✓ 950 ₪/חודש מנטורינג
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// ── Page component ───────────────────────────────────────────────────────────
export default function SeoConsultingPage() {
  return (
    <>
      <Schemas />
      <PageHeader />
      <StaticPage />
    </>
  );
}
