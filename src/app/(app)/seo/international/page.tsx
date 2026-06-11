import type { Metadata } from "next";
import Link from "next/link";
import SiloNav from "@/components/SiloNav";
import GT from "@/components/GlossaryTerm";

export const metadata: Metadata = {
  title: "קידום אתרים בחו\"ל — International SEO מקצועי",
  description:
    "קידום אתרים בחו\"ל שונה לגמרי מקידום בישראל. 7 הדברים שאנשי SEO מפספסים — hreflang, מחקר מילות מפתח מקומי, מבנה URL נכון וביצועים בינלאומיים. WAO מלווה עסקים ישראלים בקידום גלובלי.",
  alternates: { canonical: "https://www.wao.co.il/seo/international" },
  openGraph: {
    title: "קידום אתרים בחו\"ל | WAO",
    description: "7 הטעויות שכל אנשי SEO עושים בקידום בינלאומי — ואיך להימנע מהן.",
    url: "https://www.wao.co.il/seo/international",
    type: "website",
    locale: "he_IL",
  },
};

const SAME_AS = [
  "https://www.linkedin.com/in/eitanyariv/",
  "https://qa.askpavel.co.il/user/איתן+יריב",
];

// Note: body fields use JSX via renderBody — see below
const MISTAKES_RAW = [
  {
    num: "01", icon: "🌐",
    title: "hreflang שגוי — הטעות הכי נפוצה",
    pill: "Technical SEO", pillColor: "var(--accent)" as string,
    bodyKey: "hreflang",
    knowledgeSlug: "hreflang-implementation",
  },
  {
    num: "02", icon: "🔍",
    title: "מחקר מילות מפתח בתרגום — לא עובד",
    pill: "Keyword Research", pillColor: "#a78bfa" as string,
    bodyKey: "keywords",
    knowledgeSlug: "search-intent",
  },
  {
    num: "03", icon: "🏗️",
    title: "בחירת מבנה URL לא נכון",
    pill: "Site Architecture", pillColor: "#f59e0b" as string,
    bodyKey: "url",
    knowledgeSlug: "cctld-vs-subfolder",
  },
  {
    num: "04", icon: "🔗",
    title: "בניית קישורים מקומית — נדרשת לכל שוק",
    pill: "Link Building", pillColor: "#ec4899" as string,
    bodyKey: "links",
    knowledgeSlug: "link-building",
  },
  {
    num: "05", icon: "🌍",
    title: "תרגום במקום לוקליזציה",
    pill: "Content Strategy", pillColor: "#06b6d4" as string,
    bodyKey: "localization",
    knowledgeSlug: "international-seo",
  },
  {
    num: "06", icon: "⚡",
    title: "Core Web Vitals שונים בשווקים שונים",
    pill: "Core Web Vitals", pillColor: "#10b981" as string,
    bodyKey: "cwv",
    knowledgeSlug: "core-web-vitals",
  },
  {
    num: "07", icon: "📊",
    title: "Google Search Console — מוגדר לאתר, לא לשוק",
    pill: "Analytics", pillColor: "#8b5cf6" as string,
    bodyKey: "gsc",
    knowledgeSlug: "google-search-console",
  },
];

function MistakeBody({ bodyKey }: { bodyKey: string }) {
  const bodyStyle: React.CSSProperties = { color: "var(--muted)", lineHeight: 1.72, fontSize: "0.93rem", fontFamily: "var(--font-body), sans-serif", margin: 0 };
  const bodies: Record<string, React.ReactNode> = {
    hreflang: <p style={bodyStyle}>רוב האתרים מיישמים <GT term="Hreflang">hreflang</GT> חלקי: שוכחים self-referencing (קישור עצמי), מגדירים קוד שפה שגוי (<span dir="ltr">he</span> במקום <span dir="ltr">he-IL</span>), או מחסירים את <span dir="ltr">x-default</span>. גוגל מתעלמת מ-hreflang שגוי ומגישה את הגרסה הלא-מתאימה לקהל הלא-נכון.</p>,
    keywords: <p style={bodyStyle}>״Digital Marketing״ באנגלית ≠ ״שיווק דיגיטלי״ בעברית מבחינת <GT term="Search Intent">כוונת חיפוש</GT>. בגרמניה מחפשים ״Online Marketing״, בצרפת ״Marketing Digital״ — כל שוק נפרד. תרגום ישיר מפספס את הביטויים שהקהל המקומי באמת מקליד.</p>,
    url: <p style={bodyStyle}><GT term="ccTLD">ccTLD</GT> (site.de) מעניק אותות גיאוגרפיים חזקים אך מצריך בניית <GT term="Domain Authority">אוטוריטי</GT> נפרד לכל דומיין. Subfolder (site.com/de/) משתמש באוטוריטי הקיים — הבחירה הנכונה לרוב העסקים. Subdomain (de.site.com) הוא האפשרות הפחות מומלצת לרוב האתרים.</p>,
    links: <p style={bodyStyle}><GT term="Domain Authority">ה-Domain Authority</GT> של האתר הישראלי לא ״עובר״ לגרמניה. גוגל בודקת <GT term="Backlinks">קישורים</GT> מאתרים גרמניים לדף גרמני. בלי <GT term="Link Equity">Link Equity</GT> מקומי — הדפים הבינלאומיים ידורגו אחרי מתחרים שבנו נוכחות מקומית במשך שנים.</p>,
    localization: <p style={bodyStyle}>Google Translate לא מגדיל מכירות. לוקליזציה אמיתית: התאמת Case Studies לשוק, שינוי מחירים למטבע מקומי, התייחסות לרגולציה המקומית, שימוש בביטויים שמשכנעים קהל מקומי. תוכן מתורגם בלבד שורד — תוכן מלוקליז מנצח.</p>,
    cwv: <p style={bodyStyle}><GT term="LCP">LCP</GT> של 2.4 שניות ממשרד בישראל הופך ל-4.8 שניות ממוניך בלי <GT term="CDN">CDN</GT> מוגדר נכון. גוגל בודקת ביצועים לפי מיקום המשתמש. CDN בינלאומי, תמונות <GT term="WebP">WebP</GT>/<GT term="AVIF">AVIF</GT>, ו-Edge Caching הם דרישת סף — לא בונוס.</p>,
    gsc: <p style={bodyStyle}>Property אחת ב-<GT term="Google Search Console">Google Search Console</GT> לכל האתר מסתירה נתונים קריטיים. נחוצות Properties נפרדות לכל שפה/מדינה, עם <GT term="Geo-Targeting">Country Targeting</GT> מוגדר, כדי לזהות שגיאות סריקה, <GT term="Impressions">Search Impressions</GT> ו-<GT term="CTR">CTR</GT> בכל שוק בנפרד.</p>,
  };
  return <>{bodies[bodyKey] ?? null}</>;
}

const INCLUDED = [
  { icon: "🗺️", title: "מחקר שוק בינלאומי", desc: "ניתוח מתחרים מקומיים, מחקר מילות מפתח בשפת היעד, הערכת רמת תחרות ופוטנציאל תנועה לכל שוק יעד." },
  { icon: "⚙️", title: "הטמעת Hreflang ומיקוד גיאוגרפי", desc: "ביקורת ותיקון של תגיות hreflang, הגדרת Properties ב-Search Console, בחינת כיסוי אינדוקס לכל שוק בנפרד." },
  { icon: "📝", title: "אסטרטגיית תוכן מקומית", desc: "לוקליזציה — לא רק תרגום. ביטויים, Case Studies ודפי נחיתה שמדברים לקהל המקומי בשפתו ובתרבותו." },
  { icon: "🔗", title: "בניית קישורים בינלאומית", desc: "Outreach לאתרים רלוונטיים בשוק היעד, Digital PR מקומי, אסטרטגיית קישורים ייחודית לכל מדינה." },
  { icon: "📈", title: "מדידה ודוחות", desc: "Search Console + Google Analytics לכל שוק בנפרד, Dashboards ב-Looker Studio, מעקב המרות לפי מדינה ושפה." },
];

const FAQS = [
  {
    q: "כמה זמן לוקח לראות תוצאות בקידום בינלאומי?",
    a: "שווקים חדשים לרוב לוקחים 4–8 חודשים לתוצאות ראשונות. אם לאתר יש כבר Domain Authority חזק, ניתן לראות תנועה משמעותית מוקדם יותר. שווקים תחרותיים כמו ארה\"ב ואנגליה לוקחים 9–18 חודשים.",
  },
  {
    q: "איזה מבנה URL מומלץ — ccTLD, subfolder או subdomain?",
    a: "לרוב העסקים הישראלים שמכוונים לשוק אחד-שניים: subfolder (/de/, /en/) הוא הבחירה הטובה ביותר. הוא משתמש באוטוריטי הקיים, קל לתחזוקה, וGoogle מפרשת אותו נכון. ccTLD מוצדק רק כשבונים מותג נפרד לחלוטין.",
  },
  {
    q: "האם אפשר להשתמש ב-AI לתרגום תוכן לקידום בינלאומי?",
    a: "AI יכול לייצר טיוטה מהירה, אבל נדרש עריכה של דובר שפת-אם מקצועי. Google מזהה תוכן מתורגם באיכות נמוכה ומדרג אותו פחות. המינימום: תרגום AI + עריכה אנושית + התאמה תרבותית.",
  },
  {
    q: "האם WAO עובדת עם לקוחות שמכוונים לשווקים ספציפיים?",
    a: "כן — העבודה שלנו כוללת שווקים כמו אנגליה, גרמניה, ארה\"ב, קנדה ואוסטרליה. אנחנו מתמחים בעסקים ישראלים שמרחיבים לחו\"ל, עם ניסיון בהטמעת hreflang, בניית תוכן מקומי וצוותי בניית קישורים לפי מדינה.",
  },
];

export default function SeoInternationalPage() {
  const canonical = "https://www.wao.co.il/seo/international";

  const personNode = {
    "@type": "Person",
    "@id": "https://www.wao.co.il/about#person",
    name: "איתן יריב",
    jobTitle: "מומחה SEO ואסטרטגיה דיגיטלית",
    url: "https://www.wao.co.il/about",
    sameAs: SAME_AS,
    worksFor: { "@type": "Organization", "@id": "https://www.wao.co.il/#org" },
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: "קידום אתרים בחו\"ל — International SEO מקצועי",
    description: "שירות וגידול לקידום אתרים בינלאומי: hreflang, מחקר מילות מפתח מקומי, מבנה URL ו-CWV עבור שווקים גלובליים.",
    isPartOf: { "@type": "WebSite", "@id": "https://www.wao.co.il/#website" },
    author: personNode,
    inLanguage: "he",
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${canonical}#service`,
    name: "קידום אתרים בחו\"ל",
    serviceType: "International SEO",
    description: "אסטרטגיית SEO לשווקים בינלאומיים — hreflang, מחקר מילות מפתח מקומי, לוקליזציה ובניית קישורים גלובלית.",
    provider: {
      "@type": "Organization",
      "@id": "https://www.wao.co.il/#org",
      name: "WAO",
      url: "https://www.wao.co.il",
    },
    areaServed: [
      { "@type": "Country", name: "Israel" },
      { "@type": "Country", name: "United States" },
      { "@type": "Country", name: "United Kingdom" },
      { "@type": "Country", name: "Germany" },
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      itemListElement: INCLUDED.map((item) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: item.title, description: item.desc },
      })),
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: "https://www.wao.co.il" },
      { "@type": "ListItem", position: 2, name: "קידום אתרים", item: "https://www.wao.co.il/seo" },
      { "@type": "ListItem", position: 3, name: "קידום אתרים בחו\"ל", item: canonical },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: "clamp(110px,14vw,160px)", paddingBottom: "clamp(64px,8vw,96px)", position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "80vw", height: "60vh", background: "radial-gradient(ellipse at center, rgba(74,227,181,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="hero-grid" />
        <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "760px" }}>
          <nav aria-label="breadcrumb" className="breadcrumb">
            <Link href="/">דף הבית</Link>
            <span className="breadcrumb-sep" aria-hidden>›</span>
            <Link href="/seo">קידום אתרים</Link>
            <span className="breadcrumb-sep" aria-hidden>›</span>
            <span aria-current="page">קידום אתרים בחו&quot;ל</span>
          </nav>
          <SiloNav currentPath="/seo/international" />

          <div className="badge" style={{ marginBottom: "24px" }}>
            <span className="badge-dot" />
            שירות + מדריך
          </div>

          <h1 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(2.1rem,4.5vw,3.2rem)", lineHeight: 1.1, letterSpacing: "-0.025em", marginBottom: "22px" }}>
            קידום אתרים{" "}
            <span className="text-gradient">בחו&quot;ל</span>
            {" "}— מה שאנשי SEO<br />מפספסים
          </h1>

          <div
            role="note"
            aria-label="סיכום מהיר"
            style={{
              background: "rgba(74,227,181,0.06)",
              border: "1px solid rgba(74,227,181,0.2)",
              borderRadius: "var(--radius)",
              padding: "18px 22px",
              marginBottom: "32px",
              fontSize: "0.95rem",
              color: "var(--muted)",
              lineHeight: 1.7,
              fontFamily: "var(--font-body), sans-serif",
            }}
          >
            <strong style={{ color: "var(--accent)", display: "block", marginBottom: "6px" }}>בקצרה — מה חשוב לדעת</strong>
            קידום אתרים בחו&quot;ל דורש יותר מתרגום תוכן. hreflang שגוי, מחקר מילות מפתח מקומי, מבנה URL נכון ו-<GT term="CDN">CDN</GT> בינלאומי הם הבסיס. בלעדיהם — Google מגישה את הדף הלא-נכון לקהל הלא-נכון.
          </div>

          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <a href="tel:0526148860" className="btn-primary">📞 שאלו על קידום בינלאומי</a>
            <Link href="/seo" className="btn-outline">← חזרה לקידום אתרים</Link>
          </div>
        </div>
      </section>

      {/* ── 7 Mistakes ─────────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(64px,8vw,96px) 0", background: "var(--elevated)" }}>
        <div className="wao-container">
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif", marginBottom: "12px" }}>
              מדריך מעשי
            </p>
            <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem,3vw,2.4rem)", letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: "16px" }}>
              7 הדברים שאנשי SEO{" "}
              <span className="text-gradient">מפספסים</span>
              {" "}בקידום בינלאומי
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "1rem", lineHeight: 1.7, maxWidth: "560px", margin: "0 auto", fontFamily: "var(--font-body), sans-serif" }}>
              אחרי 17 שנות עבודה עם עסקים ישראלים שמתרחבים לחו&quot;ל, אלה הטעויות שחוזרות שוב ושוב.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "800px", margin: "0 auto" }}>
            {MISTAKES_RAW.map((m) => (
              <article
                key={m.num}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "28px 32px",
                  display: "flex",
                  gap: "24px",
                  alignItems: "flex-start",
                  transition: "border-color 0.18s ease",
                }}
              >
                <div style={{
                  flexShrink: 0, width: "52px", height: "52px", borderRadius: "14px",
                  background: "var(--elevated)", border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem",
                }}>
                  {m.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "10px" }}>
                    <span style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "0.72rem", color: "var(--muted)", letterSpacing: "0.08em" }}>
                      #{m.num}
                    </span>
                    <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "var(--text)", margin: 0 }}>
                      {m.title}
                    </h3>
                    <span style={{
                      fontSize: "0.7rem", padding: "2px 8px", borderRadius: "var(--radius-pill)",
                      background: `${m.pillColor}18`, color: m.pillColor,
                      border: `1px solid ${m.pillColor}35`, fontWeight: 600,
                      fontFamily: "var(--font-body), sans-serif",
                    }}>
                      {m.pill}
                    </span>
                  </div>
                  <MistakeBody bodyKey={m.bodyKey} />
                  {m.knowledgeSlug && (
                    <Link
                      href={`/knowledge/${m.knowledgeSlug}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        marginTop: "12px",
                        fontSize: "0.78rem",
                        color: "var(--accent)",
                        textDecoration: "none",
                        fontFamily: "var(--font-body), sans-serif",
                        fontWeight: 600,
                      }}
                    >
                      קרא עוד במאגר הידע ←
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── What's included ─────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(64px,8vw,96px) 0" }}>
        <div className="wao-container">
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif", marginBottom: "12px" }}>
              מה כולל השירות
            </p>
            <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem,3vw,2.3rem)", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
              קידום אתרים בחו&quot;ל{" "}
              <span className="text-gradient">end-to-end</span>
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            {INCLUDED.map((item) => (
              <div
                key={item.title}
                style={{
                  background: "var(--elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "24px",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "14px" }}>{item.icon}</div>
                <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1rem", marginBottom: "8px", color: "var(--text)" }}>
                  {item.title}
                </h3>
                <p style={{ color: "var(--muted)", lineHeight: 1.7, fontSize: "0.9rem", fontFamily: "var(--font-body), sans-serif", margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stat row ────────────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(48px,6vw,72px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="wao-container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "32px", textAlign: "center" }}>
            {[
              { stat: "20+", label: "שנות ניסיון SEO" },
              { stat: "8+", label: "שווקים בינלאומיים" },
              { stat: "4–8", label: "חודשים לתוצאות ראשונות" },
              { stat: "3×", label: "ROI ממוצע בשנה 2" },
            ].map((s) => (
              <div key={s.stat}>
                <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(2rem,3.5vw,2.8rem)", color: "var(--accent)", lineHeight: 1 }}>
                  {s.stat}
                </div>
                <div style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "6px", fontFamily: "var(--font-body), sans-serif" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Knowledge strip ─────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(40px,5vw,56px) 0", borderTop: "1px solid var(--border)" }}>
        <div className="wao-container" style={{ maxWidth: "800px" }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif", marginBottom: "16px" }}>
            מאגר ידע — קידום בינלאומי
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {[
              { label: "International SEO", slug: "international-seo" },
              { label: "Hreflang", slug: "hreflang-implementation" },
              { label: "ccTLD vs Subfolder", slug: "cctld-vs-subfolder" },
              { label: "Geo-Targeting", slug: "geo-targeting" },
              { label: "Core Web Vitals", slug: "core-web-vitals" },
              { label: "Link Building", slug: "link-building" },
              { label: "Google Search Console", slug: "google-search-console" },
            ].map(({ label, slug }) => (
              <Link
                key={slug}
                href={`/knowledge/${slug}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "6px 14px",
                  borderRadius: "var(--radius-pill)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  textDecoration: "none",
                  fontSize: "0.82rem",
                  fontFamily: "var(--font-body), sans-serif",
                  fontWeight: 600,
                  background: "var(--elevated)",
                }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(64px,8vw,96px) 0" }}>
        <div className="wao-container" style={{ maxWidth: "760px" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.5rem,2.8vw,2.1rem)", letterSpacing: "-0.02em" }}>
              שאלות נפוצות —{" "}
              <span className="text-gradient">קידום בינלאומי</span>
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {FAQS.map((faq) => (
              <div
                key={faq.q}
                style={{
                  background: "var(--elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "24px 28px",
                }}
              >
                <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1rem", marginBottom: "10px", color: "var(--text)" }}>
                  {faq.q}
                </h3>
                <p style={{ color: "var(--muted)", lineHeight: 1.75, fontSize: "0.93rem", fontFamily: "var(--font-body), sans-serif", margin: 0 }}>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(64px,8vw,96px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)" }}>
        <div className="wao-container" style={{ maxWidth: "620px", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "20px" }}>🌍</div>
          <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem,3vw,2.3rem)", letterSpacing: "-0.02em", marginBottom: "16px" }}>
            מוכנים לצאת לחו&quot;ל?
          </h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.75, fontSize: "1rem", fontFamily: "var(--font-body), sans-serif", marginBottom: "32px" }}>
            נשמח לשמוע על הפרויקט — לאיזה שוק אתם מכוונים, מה קיים היום, ומה המטרה.
            שיחת ייעוץ ראשונה ללא עלות.
          </p>
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="tel:0526148860" className="btn-primary">📞 דברו איתנו</a>
            <Link href="/contact" className="btn-outline">השאירו פרטים</Link>
          </div>
        </div>
      </section>
    </>
  );
}
