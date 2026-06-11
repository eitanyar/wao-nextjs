import type { Metadata } from "next";
import Link from "next/link";
import SiloNav from "@/components/SiloNav";
import GT from "@/components/GlossaryTerm";

export const revalidate = 86400;

const CANONICAL   = "https://www.wao.co.il/seo/topical-authority";
const AUTHOR_NAME = "איתן יריב";
const AUTHOR_URL  = "https://www.wao.co.il/about";
const PUBLISHED   = "2026-06-07";
const MODIFIED    = "2026-06-07";
const SAME_AS     = [
  "https://www.linkedin.com/in/eitanyariv/",
  "https://qa.askpavel.co.il/user/%D7%90%D7%99%D7%AA%D7%9F+%D7%99%D7%A8%D7%99%D7%91",
];

export const metadata: Metadata = {
  title: "Topical Authority ומבנה אתר SEO — המדריך המלא 2026/2027",
  description:
    'מדריך Topical Authority מקיף ל-2026: Hub & Spoke Model, Content Silos, מבנה URL, ה-Internal Linking האסטרטגי ומיפוי פערי תוכן. כך הופכים לסמכות נושאית שגוגל מדרגת ראשון. נכתב ע"י איתן יריב.',
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Topical Authority ומבנה אתר SEO — המדריך המלא 2026/2027 | WAO",
    description:
      "איך לבנות Topical Authority אמיתי: Pillar & Cluster, Content Silos, URL Architecture, Internal Linking — המדריך המקיף לארכיטקטורת SEO.",
    url: CANONICAL,
    type: "article",
  },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  "@id": `${CANONICAL}#article`,
  headline: "Topical Authority ומבנה אתר SEO — המדריך המלא 2026/2027",
  description:
    "מדריך מקיף ל-Topical Authority: Hub & Spoke Model, Content Silos, URL Architecture, Internal Linking ומדידת סמכות נושאית.",
  url: CANONICAL,
  inLanguage: "he",
  datePublished: PUBLISHED,
  dateModified: MODIFIED,
  author: {
    "@type": "Person",
    "@id": `${AUTHOR_URL}#person`,
    name: AUTHOR_NAME,
    url: AUTHOR_URL,
    sameAs: SAME_AS,
  },
  publisher: {
    "@type": "Organization",
    "@id": "https://www.wao.co.il/#org",
    name: "WAO",
    url: "https://www.wao.co.il",
  },
  mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "דף הבית",     item: "https://www.wao.co.il" },
    { "@type": "ListItem", position: 2, name: "קידום אתרים", item: "https://www.wao.co.il/seo" },
    { "@type": "ListItem", position: 3, name: "Topical Authority", item: CANONICAL },
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "מהי Topical Authority ולמה היא חשובה ב-2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Topical Authority היא הסמכות הנושאית שגוגל מייחס לאתר בתחום מסוים. אתר שמכסה נושא לעומק ומכל הזוויות מדורג גבוה יותר מאתר עם מאמר בודד על אותו נושא. ב-2026 זה קריטי גם לציטוט ב-AI Overviews — גוגל מצטטת מקורות שהיא מזהה כסמכותיים בנישה.",
      },
    },
    {
      "@type": "Question",
      name: "מה ההבדל בין Pillar Page ל-Cluster Page?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Pillar Page (דף עמוד) הוא דף מקיף שמכסה נושא רחב ברמה גבוהה — למשל 'מדריך SEO מלא'. Cluster Pages (דפי אשכול) הם דפים שמעמיקים בכל תת-נושא ספציפי — למשל 'מחקר מילות מפתח', 'Technical SEO', 'E-E-A-T'. הם מקושרים זה לזה ביוצרים רשת נושאית שגוגל מכירה כסמכות.",
      },
    },
    {
      "@type": "Question",
      name: "כמה זמן לוקח לבנות Topical Authority?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "בניית Topical Authority משמעותית לוקחת בדרך כלל 6–12 חודשים — בהתאם לתחרותיות הנישה, קצב יצירת התוכן ואיכות ה-Internal Linking. אתרים חדשים עלולים להיות בתקופת Sandbox של 3–6 חודשים. ברגע שגוגל מכירה באתר כסמכות — הדירוגים הופכים יציבים ועמידים לשינויי אלגוריתם.",
      },
    },
  ],
};

const TOC = [
  { id: "what-is-topical-authority", label: "מהי ה-Topical Authority?" },
  { id: "pillar-cluster",            label: "מודל ה-Pillar & Cluster" },
  { id: "hub-spoke-diagram",         label: "דיאגרמת ה-Hub & Spoke" },
  { id: "silo-architecture",         label: "Content Silos — הארכיטקטורה" },
  { id: "url-structure",             label: "מבנה URL SEO" },
  { id: "internal-linking",          label: "Internal Linking אסטרטגי" },
  { id: "content-gap",               label: "מיפוי פערי תוכן" },
  { id: "measuring-authority",       label: "כיצד למדוד סמכות נושאית" },
];

const HEADING: React.CSSProperties = {
  fontFamily: "var(--font-rubik), sans-serif",
  fontWeight: 800,
  lineHeight: 1.2,
  color: "var(--text)",
  marginTop: "2.8rem",
  marginBottom: "1rem",
};

const BODY: React.CSSProperties = {
  fontFamily: "var(--font-body), sans-serif",
  lineHeight: 1.9,
  fontSize: "1.02rem",
  color: "var(--muted)",
  marginBottom: "1.2rem",
};

const CALLOUT: React.CSSProperties = {
  background: "var(--accent-dim)",
  border: "1px solid var(--accent-border)",
  borderInlineStart: "4px solid var(--accent)",
  borderRadius: "var(--radius-md)",
  padding: "20px 24px",
  marginBlock: "1.6rem",
  fontFamily: "var(--font-body), sans-serif",
  lineHeight: 1.75,
  fontSize: "0.97rem",
  color: "var(--text)",
};

const SURFACE: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "24px 28px",
  marginBlock: "1.6rem",
};

function HubSpokeDiagram() {
  return (
    <div style={{ overflowX: "auto", marginBlock: "2rem" }}>
      <svg
        viewBox="0 0 600 420"
        style={{ width: "100%", maxWidth: "580px", display: "block", margin: "0 auto" }}
        role="img"
        aria-label="דיאגרמת Hub & Spoke — Pillar Page במרכז מחובר ל-6 Cluster Pages"
      >
        {/* Background */}
        <rect width="600" height="420" rx="12" fill="var(--surface, #0f1116)" stroke="var(--border, #23272f)" strokeWidth="1" />

        {/* Spokes / Connection lines */}
        {[
          [300, 210, 300, 70],   // top
          [300, 210, 490, 140],  // top-right
          [300, 210, 490, 290],  // bottom-right
          [300, 210, 300, 360],  // bottom
          [300, 210, 110, 290],  // bottom-left
          [300, 210, 110, 140],  // top-left
        ].map(([x1, y1, x2, y2], i) => (
          <line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="var(--accent, #4ae3b5)"
            strokeWidth="1.5"
            strokeDasharray="5 4"
            opacity="0.4"
          />
        ))}

        {/* Hub — Pillar Page */}
        <circle cx="300" cy="210" r="52" fill="var(--elevated, #161a22)" stroke="var(--accent, #4ae3b5)" strokeWidth="2" />
        <text x="300" y="203" textAnchor="middle" fill="var(--accent, #4ae3b5)" fontSize="11" fontWeight="800" fontFamily="sans-serif">PILLAR</text>
        <text x="300" y="218" textAnchor="middle" fill="var(--text, #f0f4f8)" fontSize="10" fontFamily="sans-serif">קידום אתרים</text>
        <text x="300" y="231" textAnchor="middle" fill="var(--text, #f0f4f8)" fontSize="10" fontFamily="sans-serif">מדריך מלא</text>

        {/* Cluster nodes */}
        {[
          { cx: 300, cy: 70,  label1: "מחקר",       label2: "מילות מפתח" },
          { cx: 490, cy: 140, label1: "Topical",    label2: "Authority"  },
          { cx: 490, cy: 290, label1: "Link",       label2: "Building"   },
          { cx: 300, cy: 360, label1: "Core Web",   label2: "Vitals"     },
          { cx: 110, cy: 290, label1: "Technical",  label2: "SEO"        },
          { cx: 110, cy: 140, label1: "E-E-A-T",    label2: "& On-Page"  },
        ].map((node) => (
          <g key={`${node.cx}-${node.cy}`}>
            <circle
              cx={node.cx} cy={node.cy} r="38"
              fill="var(--elevated, #161a22)"
              stroke="var(--border, #23272f)"
              strokeWidth="1.5"
            />
            <text x={node.cx} y={node.cy - 5} textAnchor="middle" fill="var(--muted, #8898aa)" fontSize="9.5" fontFamily="sans-serif">
              {node.label1}
            </text>
            <text x={node.cx} y={node.cy + 10} textAnchor="middle" fill="var(--muted, #8898aa)" fontSize="9.5" fontFamily="sans-serif">
              {node.label2}
            </text>
          </g>
        ))}

        {/* Legend */}
        <circle cx="30" cy="395" r="6" fill="var(--elevated, #161a22)" stroke="var(--accent, #4ae3b5)" strokeWidth="1.5" />
        <text x="42" y="399" fill="var(--muted, #8898aa)" fontSize="9" fontFamily="sans-serif">Pillar Page</text>
        <circle cx="120" cy="395" r="6" fill="var(--elevated, #161a22)" stroke="var(--border, #23272f)" strokeWidth="1.5" />
        <text x="132" y="399" fill="var(--muted, #8898aa)" fontSize="9" fontFamily="sans-serif">Cluster Page</text>
        <line x1="210" y1="395" x2="240" y2="395" stroke="var(--accent, #4ae3b5)" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.5" />
        <text x="248" y="399" fill="var(--muted, #8898aa)" fontSize="9" fontFamily="sans-serif">Internal Link</text>
      </svg>
    </div>
  );
}

export default function TopicalAuthorityPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* ── Hero ── */}
      <header
        style={{
          paddingTop: "clamp(110px,14vw,160px)",
          paddingBottom: "clamp(48px,6vw,72px)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
            width: "70vw", height: "60vh",
            background: "radial-gradient(ellipse at center, rgba(74,227,181,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div className="hero-grid" />
        <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "860px" }}>
          <nav aria-label="breadcrumb" className="breadcrumb">
            <Link href="/">דף הבית</Link>
            <span className="breadcrumb-sep" aria-hidden>›</span>
            <Link href="/seo">קידום אתרים</Link>
            <span className="breadcrumb-sep" aria-hidden>›</span>
            <span aria-current="page">Topical Authority</span>
          </nav>
          <SiloNav currentPath="/seo/topical-authority" />

          <div className="badge" style={{ marginBottom: "24px" }}>
            <span className="badge-dot" />
            מדריך — עודכן יוני 2026
          </div>

          <h1
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 900,
              fontSize: "clamp(2rem,4.5vw,3.4rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              marginBottom: "20px",
            }}
          >
            Topical Authority ומבנה אתר SEO —{" "}
            <span className="text-gradient">המדריך המלא 2026/2027</span>
          </h1>

          <p
            style={{
              fontSize: "clamp(1rem,1.7vw,1.15rem)",
              color: "var(--muted)",
              lineHeight: 1.75,
              fontFamily: "var(--font-body), sans-serif",
              maxWidth: "680px",
              marginBottom: "32px",
            }}
          >
            איך הופכים אתר רגיל לסמכות נושאית שגוגל מדרגת ראשון — ומצטטת ב-<GT term="AI Overviews">AI Overviews</GT>.{" "}
            Hub &amp; Spoke Model, Content Silos, URL Architecture,{" "}
            <GT term="Internal Linking">Internal Linking</GT> ומיפוי פערי תוכן: כל מה שצריך לדעת לפני שכותבים מילה אחת.
          </p>

          <div
            style={{
              display: "flex", gap: "12px", flexWrap: "wrap",
              fontSize: "0.82rem", color: "var(--muted)",
              fontFamily: "var(--font-body), sans-serif",
            }}
          >
            <span>
              נכתב ע&quot;י{" "}
              <Link href="/about" style={{ color: "var(--accent)", fontWeight: 600 }}>
                {AUTHOR_NAME}
              </Link>
            </span>
            <span aria-hidden>·</span>
            <span>
              עודכן: <time dateTime={MODIFIED}>יוני 2026</time>
            </span>
            <span aria-hidden>·</span>
            <span>זמן קריאה: ~20 דקות</span>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <div className="wao-container" style={{ maxWidth: "860px", paddingBottom: "clamp(64px,8vw,96px)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 260px",
            gap: "48px",
            alignItems: "start",
          }}
          className="guide-layout"
        >
          {/* ── Article ── */}
          <article itemScope itemType="https://schema.org/Article">
            <meta itemProp="datePublished" content={PUBLISHED} />
            <meta itemProp="dateModified"  content={MODIFIED} />

            {/* ── 1. מהי Topical Authority ── */}
            <section id="what-is-topical-authority">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                מהי Topical Authority?
              </h2>
              <p style={BODY}>
                <strong style={{ color: "var(--text)" }}><GT term="Topical Authority">Topical Authority</GT> (סמכות נושאית)</strong>{" "}
                היא רמת האמון שגוגל מייחסת לאתר בתחום נושא מסוים. אתר עם Topical
                Authority גבוהה בתחום "קידום אתרים" יקבל דירוגים גבוהים יותר עבור כל
                שאילתה בתחום — גם עבור דפים שפורסמו רק לאחרונה.
              </p>
              <p style={BODY}>
                הגיון ה-Topical Authority הוא פשוט: גוגל מעדיפה לשלוח משתמשים לאתרים
                שהוכיחו כי הם <em>מכסים נושא לעומק ומכל הזוויות</em>, ולא לאתרים עם
                מאמר מושלם אחד ושתיים-שלוש מאמרים רלוונטיים נוספים.
              </p>
              <div style={CALLOUT}>
                <strong>📌 הדוגמה הקלאסית:</strong> אם WebMD מפרסם מאמר על "כאב ראש" —
                הוא יקבל דירוג גבוה אוטומטית, גם אם המאמר בינוני. למה? כי Google יודעת
                שWebMD הוא סמכות בריאות מוכחת. בנו את אותה סמכות בנישה שלכם.
              </div>
              <h3 style={{ ...HEADING, fontSize: "1.2rem" }}>
                Topical Authority ב-2026 — למה זה קריטי יותר מאי פעם
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "1.6rem" }}>
                {[
                  {
                    icon: "🤖",
                    title: "AI Overviews מצטטות רק סמכויות",
                    desc: "גוגל בוחרת את מקורות ה-AI Overview מאתרים שהיא מכירה כסמכות בנישה. ללא Topical Authority — אתם לא בריצה.",
                  },
                  {
                    icon: "🛡️",
                    title: "עמידות לשינויי אלגוריתם",
                    desc: "אתרים עם Topical Authority עמידים הרבה יותר ל-Core Updates. גוגל לא \"מפילה\" סמכויות מוכחות בלי סיבה.",
                  },
                  {
                    icon: "⚡",
                    title: "דירוג מהיר יותר לתוכן חדש",
                    desc: "ברגע שגוגל מכירה אתכם כסמכות — מאמרים חדשים מדורגים מהר יותר. הסמכות 'מחלחלת' לכל הדפים.",
                  },
                  {
                    icon: "📊",
                    title: "Cannibalization נמוכה יותר",
                    desc: "כשיש מבנה נושאי ברור — גוגל מדרגת כל דף עבור מילות המפתח שלו, במקום ש-2 דפים יתחרו זה בזה.",
                  },
                ].map((b) => (
                  <div
                    key={b.title}
                    style={{
                      display: "flex", gap: "14px", alignItems: "flex-start",
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)", padding: "14px 16px",
                    }}
                  >
                    <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>{b.icon}</span>
                    <div>
                      <div style={{ fontFamily: "var(--font-rubik),sans-serif", fontWeight: 700, fontSize: "0.92rem", color: "var(--text)", marginBottom: "4px" }}>
                        {b.title}
                      </div>
                      <p style={{ ...BODY, marginBottom: 0, fontSize: "0.88rem", lineHeight: 1.65 }}>{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── 2. Pillar & Cluster ── */}
            <section id="pillar-cluster">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                מודל Pillar &amp; Cluster — אדריכלות התוכן של 2026
              </h2>
              <p style={BODY}>
                מודל <strong style={{ color: "var(--text)" }}>Pillar &amp; Cluster</strong>{" "}
                (ידוע גם כ-Hub &amp; Spoke) הוא אדריכלות התוכן המובילה לבניית Topical
                Authority. הרעיון: <strong style={{ color: "var(--text)" }}>דף עמוד מרכזי (Pillar)</strong>{" "}
                שמכסה נושא ברחביות, ו-<strong style={{ color: "var(--text)" }}>דפי אשכול (Clusters)</strong>{" "}
                שמעמיקים בכל תת-נושא — כולם מקושרים זה לזה.
              </p>
              <div className="content-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "1.6rem" }}>
                <div style={{ ...SURFACE, marginBlock: 0 }}>
                  <h3 style={{ ...HEADING, fontSize: "1rem", marginTop: 0, color: "var(--accent)" }}>
                    🏛️ Pillar Page
                  </h3>
                  <ul style={{ ...BODY, paddingInlineStart: "1.2rem", marginBottom: 0, fontSize: "0.88rem", lineHeight: 1.7 }}>
                    <li style={{ marginBottom: "6px" }}>מכסה נושא רחב בסקירה מקיפה</li>
                    <li style={{ marginBottom: "6px" }}>3,000–5,000 מילים בדרך כלל</li>
                    <li style={{ marginBottom: "6px" }}>Primary Keyword כללי (למשל: "קידום אתרים")</li>
                    <li style={{ marginBottom: "6px" }}>מקשר לכל ה-Cluster Pages</li>
                    <li>URL קצר ומרכזי: <code>/seo/guide</code></li>
                  </ul>
                </div>
                <div style={{ ...SURFACE, marginBlock: 0 }}>
                  <h3 style={{ ...HEADING, fontSize: "1rem", marginTop: 0, color: "var(--muted)" }}>
                    📄 Cluster Page
                  </h3>
                  <ul style={{ ...BODY, paddingInlineStart: "1.2rem", marginBottom: 0, fontSize: "0.88rem", lineHeight: 1.7 }}>
                    <li style={{ marginBottom: "6px" }}>מעמיק בתת-נושא ספציפי</li>
                    <li style={{ marginBottom: "6px" }}>1,500–3,000 מילים בדרך כלל</li>
                    <li style={{ marginBottom: "6px" }}>Primary Keyword ספציפי (למשל: "מחקר מילות מפתח")</li>
                    <li style={{ marginBottom: "6px" }}>מקשר חזרה ל-Pillar + Clusters אחרים</li>
                    <li>URL מתחת ל-Pillar: <code>/seo/keyword-research</code></li>
                  </ul>
                </div>
              </div>
              <div style={CALLOUT}>
                <strong>🔑 הכלל החשוב ביותר:</strong> כל Cluster Page מוסיף ערך ייחודי —
                הוא לא חוזר על מה שה-Pillar כיסה, אלא{" "}
                <em>מעמיק באותו תת-נושא</em> ברמה שה-Pillar לא יכול להרשות לעצמו.
                גוגל מכירה ב-Cluster כהרחבה, לא כתוכן כפול.
              </div>
            </section>

            {/* ── 3. Hub & Spoke Diagram ── */}
            <section id="hub-spoke-diagram">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                דיאגרמת Hub &amp; Spoke — ויזואליזציה
              </h2>
              <p style={BODY}>
                כך נראית ארכיטקטורת Topical Authority מלאה לנישת "קידום אתרים":
              </p>
              <HubSpokeDiagram />
              <div style={SURFACE}>
                <h3 style={{ ...HEADING, fontSize: "0.95rem", marginTop: 0, marginBottom: "10px" }}>
                  מה רואים בדיאגרמה:
                </h3>
                <ul style={{ ...BODY, paddingInlineStart: "1.4rem", marginBottom: 0, fontSize: "0.9rem", lineHeight: 1.7 }}>
                  <li style={{ marginBottom: "8px" }}>
                    <strong style={{ color: "var(--accent)" }}>מרכז (Pillar):</strong>{" "}
                    "מדריך קידום אתרים מלא" — מכסה את הנושא ברמת הגבוהה, מקשר לכל
                    Cluster.
                  </li>
                  <li style={{ marginBottom: "8px" }}>
                    <strong style={{ color: "var(--text)" }}>Clusters (6 דפים):</strong>{" "}
                    מחקר מילות מפתח, Topical Authority, <GT term="E-E-A-T">E-E-A-T</GT>,{" "}
                    <GT term="Technical SEO">Technical SEO</GT>, Link Building,{" "}
                    <GT term="Core Web Vitals">Core Web Vitals</GT> — כל אחד מקשר ל-Pillar ולחלק מה-Clusters.
                  </li>
                  <li>
                    <strong style={{ color: "var(--text)" }}>קווי הקישור:</strong>{" "}
                    כל חץ מייצג <GT term="Internal Linking">Internal Link</GT> דו-כיווני. ה-<GT term="PageRank">PageRank</GT> זורם בכל הרשת,
                    ומחזק כל דף בנפרד.
                  </li>
                </ul>
              </div>
            </section>

            {/* ── 4. Content Silos ── */}
            <section id="silo-architecture">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                Content Silos — ארכיטקטורת האתר
              </h2>
              <p style={BODY}>
                <strong style={{ color: "var(--text)" }}>Content Silo</strong> הוא
                "תיקיית נושא" באתר — קבוצת דפים שכולם עוסקים בנושא אחד, מקושרים זה
                לזה, ומבודדים מנושאים אחרים. כשגוגל רואה Silo ברור, היא מבינה שהאתר
                מתמחה בנושא — ומגדילה את ה-Topical Authority בהתאם.
              </p>
              <h3 style={{ ...HEADING, fontSize: "1.2rem" }}>
                כיצד Silo נראה ב-URL Structure
              </h3>
              <div style={{ ...SURFACE, fontFamily: "var(--font-mono, monospace)", fontSize: "0.85rem" }}>
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ color: "var(--accent)", fontWeight: 700, marginBottom: "6px" }}>
                    ✅ Silo נכון — ייררכיה ברורה:
                  </div>
                  {[
                    ["/seo",                     "Hub — דף שירות / Pillar"],
                    ["/seo/guide",               "Pillar Page — מדריך מקיף"],
                    ["/seo/keyword-research",    "Cluster — מחקר מילות מפתח"],
                    ["/seo/topical-authority",   "Cluster — Topical Authority"],
                    ["/seo/consulting",          "Spoke — דף שירות ספציפי"],
                    ["/seo/international",       "Spoke — SEO בינלאומי"],
                  ].map(([url, desc]) => (
                    <div key={url} style={{ display: "flex", gap: "16px", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ color: "var(--text)", flexShrink: 0 }}>{url}</span>
                      <span style={{ color: "var(--muted)", fontSize: "0.75rem", fontFamily: "var(--font-body),sans-serif" }}>{desc}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ color: "#ef4444", fontWeight: 700, marginBottom: "6px" }}>
                    ❌ Silo לא נכון — URL שטוח ומבולבל:
                  </div>
                  {[
                    ["/seo-guide",               "מנותק מסילו SEO"],
                    ["/keyword-research-2026",   "לא מתחת ל-/seo/"],
                    ["/blog/seo-tips",           "תוכן SEO פוגר תחת /blog/"],
                  ].map(([url, desc]) => (
                    <div key={url} style={{ display: "flex", gap: "16px", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ color: "#ef4444", flexShrink: 0 }}>{url}</span>
                      <span style={{ color: "var(--muted)", fontSize: "0.75rem", fontFamily: "var(--font-body),sans-serif" }}>{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={CALLOUT}>
                <strong>⚠️ שגיאה נפוצה:</strong> "בלוג SEO" תחת <code>/blog/</code> במקום
                תחת <code>/seo/</code>. זה מבזבז את הסמכות הנושאית — גוגל לא מבינה
                שמאמרי ה-SEO שלכם קשורים לדף שירות ה-SEO. העבירו תוכן SEO ל-Silo הנכון.
              </div>
            </section>

            {/* ── 5. URL Structure ── */}
            <section id="url-structure">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                מבנה URL לבניית Topical Authority
              </h2>
              <p style={BODY}>
                URL הוא הסמנטיקה הראשונה שגוגל קוראת — עוד לפני שהיא רואה את התוכן.
                URL נכון מספר לגוגל: "אני חלק מ-Silo X, מתחת ל-Pillar Y, ואני עוסק
                בנושא Z". זה אות חשוב לסמכות הנושאית.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "1.6rem" }}>
                {[
                  {
                    rule: "ייררכיה נושאית",
                    good: "/[silo]/[cluster]/[subcategory]",
                    desc: "כל שכבה מספרת לגוגל מה ה-Silo ומה הנושא הספציפי. מקסימום 3–4 רמות.",
                  },
                  {
                    rule: "מילות מפתח ב-URL",
                    good: "/seo/keyword-research",
                    desc: "Primary Keyword חייב להיות ב-URL. קצר, תיאורי, ללא stop words מיותרות.",
                  },
                  {
                    rule: "מקפים לא קווי תחתון",
                    good: "/keyword-research",
                    desc: 'גוגל קוראת מקפים כרווח — "keyword research". קו תחתון = "keyword_research" = מילה אחת.',
                  },
                  {
                    rule: "אנגלית לא עברית",
                    good: "/seo/keyword-research",
                    desc: "URL בעברית גורם לקידוד URL (%D7%...) שמקשה על שיתוף וקישור. אנגלית תמיד עדיפה.",
                  },
                  {
                    rule: "ללא תאריכים",
                    good: "/seo/keyword-research",
                    desc: "URL עם /2026/06/ יצטרך Redirect כשיתיישן. URL ללא תאריך = Evergreen.",
                  },
                ].map((r) => (
                  <div
                    key={r.rule}
                    style={{
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)", padding: "14px 16px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "8px" }}>
                      <span style={{ fontFamily: "var(--font-rubik),sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "var(--text)" }}>
                        {r.rule}
                      </span>
                      <code style={{ fontSize: "0.78rem", background: "var(--elevated)", padding: "2px 8px", borderRadius: "4px", color: "var(--accent)", border: "1px solid var(--border)" }}>
                        {r.good}
                      </code>
                    </div>
                    <p style={{ ...BODY, marginBottom: 0, fontSize: "0.88rem", lineHeight: 1.65 }}>{r.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── 6. Internal Linking ── */}
            <section id="internal-linking">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                Internal Linking אסטרטגי — העורקים של ה-Silo
              </h2>
              <p style={BODY}>
                אם Content Silos הם עצמות הארכיטקטורה,{" "}
                <GT term="Internal Linking">Internal Links</GT> הם העורקים שמזרימים
                <GT term="PageRank">PageRank</GT> (ערך קישור) בין הדפים. קישור פנימי נכון משרת שלוש מטרות:
                עוזר לגוגל לגלות דפים חדשים, מחלק PageRank, ומחזק את הקשר הנושאי בין
                הדפים.
              </p>
              <h3 style={{ ...HEADING, fontSize: "1.2rem" }}>
                3 כללי Internal Linking שלא ניתן לוותר עליהם
              </h3>
              <div className="content-3col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "1.6rem" }}>
                {[
                  {
                    num: "01",
                    title: "Anchor Text תיאורי",
                    desc: 'קשרו עם טקסט שמתאר את הדף המקושר: "מחקר מילות מפתח" — לא "לחצו כאן". Anchor Text הוא אות Topical לגוגל.',
                  },
                  {
                    num: "02",
                    title: "קישורים דו-כיווניים",
                    desc: "Pillar → Cluster ← → Cluster אחר. כל דף צריך לפחות 3–5 Internal Links: חלק מהם לדפים בולטים יותר, חלק לדפים פחות.",
                  },
                  {
                    num: "03",
                    title: "עומק קליק סביר",
                    desc: 'כל דף חייב להיות נגיש ב-3 קליקים מהדף הראשי. דפים ב-"Crawl Depth" גבוה לא מקבלים PageRank טוב.',
                  },
                ].map((r) => (
                  <div
                    key={r.num}
                    style={{
                      background: "var(--elevated)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)", padding: "16px",
                    }}
                  >
                    <div style={{ fontFamily: "var(--font-rubik),sans-serif", fontWeight: 900, fontSize: "1.5rem", color: "var(--accent)", marginBottom: "6px" }}>
                      {r.num}
                    </div>
                    <div style={{ fontFamily: "var(--font-rubik),sans-serif", fontWeight: 700, fontSize: "0.88rem", color: "var(--text)", marginBottom: "8px" }}>
                      {r.title}
                    </div>
                    <p style={{ ...BODY, marginBottom: 0, fontSize: "0.82rem", lineHeight: 1.6 }}>{r.desc}</p>
                  </div>
                ))}
              </div>
              <h3 style={{ ...HEADING, fontSize: "1.2rem" }}>
                איפה לשים Internal Links — סדר עדיפויות
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "1.6rem" }}>
                {[
                  { priority: "עדיפות 1", location: "בתוך גוף הטקסט", reason: "הכי חזקים — גוגל נותנת יותר משקל לקישורים שנראים ל-editorial ולא ל-navigation. כתבו תוכן שמוביל לקישור באופן טבעי." },
                  { priority: "עדיפות 2", location: "בסיום הסעיף / Callout 'מדריך הבא'", reason: "כמו הבלוק 'המדריך הבא בסדרה' שמסיים מאמר זה. גולש שגמר לקרוא = כוונה גבוהה להמשך." },
                  { priority: "עדיפות 3", location: "TOC / תפריט צד", reason: "עוזר לנווט ולגוגל להבין מבנה, אך קישורים ב-Navigation מקבלים פחות PageRank מגוף הטקסט." },
                  { priority: "עדיפות 4", location: "Footer / Breadcrumbs", reason: "קישורי Navigation שיטתיים שגוגל מזהה ובהתאם מייחסת להם פחות ערך editorial." },
                ].map((p) => (
                  <div
                    key={p.priority}
                    style={{
                      display: "flex", gap: "0", alignItems: "stretch",
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)", overflow: "hidden",
                    }}
                  >
                    <div style={{ background: "var(--elevated)", padding: "10px 14px", minWidth: "90px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontFamily: "var(--font-rubik),sans-serif", fontWeight: 800, fontSize: "0.78rem", color: "var(--accent)", textAlign: "center" }}>
                        {p.priority}
                      </span>
                    </div>
                    <div style={{ padding: "10px 14px", flex: 1 }}>
                      <div style={{ fontFamily: "var(--font-rubik),sans-serif", fontWeight: 700, fontSize: "0.88rem", color: "var(--text)", marginBottom: "4px" }}>
                        {p.location}
                      </div>
                      <p style={{ ...BODY, marginBottom: 0, fontSize: "0.85rem", lineHeight: 1.6 }}>{p.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── 7. Content Gap ── */}
            <section id="content-gap">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                מיפוי פערי תוכן — Content Gap Audit
              </h2>
              <p style={BODY}>
                לאחר שבניתם את ה-Silo הראשוני, השלב הבא הוא{" "}
                <strong style={{ color: "var(--text)" }}>Content Gap Audit</strong> —
                בחינה שיטתית של מה חסר ב-Cluster שלכם. Topical Authority אינה אחד ל-אחד:
                היא נמדדת ביחס למה שהמתחרים שלכם כיסו.
              </p>
              <h3 style={{ ...HEADING, fontSize: "1.2rem" }}>
                תהליך Content Gap Audit — 5 שלבים
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "1.6rem" }}>
                {[
                  { step: "1", title: "מיפוי מתחרים", desc: "זהו 3–5 אתרים שמדורגים עבור מילות המפתח המרכזיות שלכם. אלו ה'מתחרים הנושאיים' שלכם — לאו דווקא המתחרים העסקיים." },
                  { step: "2", title: "Keyword Gap Tool", desc: "ב-Ahrefs (Content Gap) או SEMrush (Keyword Gap) — הכניסו את המתחרים וגלו אילו מילות מפתח הם מדורגים עליהן שאתם לא." },
                  { step: "3", title: "מיפוי לנושאים", desc: "קבצו את מילות המפתח החסרות ל-Clusters נושאיים. כל Cluster = נושא פוטנציאלי לדף חדש." },
                  { step: "4", title: "תעדוף לפי כוונה+נפח", desc: "דרגו את ה-Clusters לפי: נפח חיפוש, כוונת חיפוש עסקית, ו-Keyword Difficulty. התחילו ממה שהמשתמשים הכי צריכים." },
                  { step: "5", title: "לוח זמנים לתוכן", desc: "תכננו לפחות 2–4 מאמרים/דפים חדשים בחודש. Topical Authority נבנית עם עקביות — לא עם ספרינט תוכן חד-פעמי." },
                ].map((s) => (
                  <div
                    key={s.step}
                    style={{
                      display: "flex", gap: "14px", alignItems: "flex-start",
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)", padding: "14px 16px",
                    }}
                  >
                    <div style={{
                      width: "28px", height: "28px", borderRadius: "50%",
                      background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, fontFamily: "var(--font-rubik),sans-serif", fontWeight: 900, fontSize: "0.85rem", color: "var(--bg)",
                    }}>
                      {s.step}
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--font-rubik),sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "var(--text)", marginBottom: "4px" }}>
                        {s.title}
                      </div>
                      <p style={{ ...BODY, marginBottom: 0, fontSize: "0.88rem", lineHeight: 1.65 }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={CALLOUT}>
                <strong>💡 Content Freshness:</strong> גוגל מתגמלת עדכניות. Topical
                Authority אינה "בנויה פעם ונשכחת" — עדכנו Cluster Pages קיימים עם
                נתונים חדשים, כלים מעודכנים ודוגמאות עדכניות. זה שומר על הסמכות.
              </div>
            </section>

            {/* ── 8. מדידה ── */}
            <section id="measuring-authority">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                כיצד למדוד Topical Authority
              </h2>
              <p style={BODY}>
                Topical Authority אינה מדד שגוגל חושפת ישירות — אבל ניתן למדוד אותה
                בעקיפין דרך מספר <GT term="KPI">KPIs</GT>:
              </p>
              <div className="content-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "1.6rem" }}>
                {[
                  { kpi: "Organic Traffic Growth", tool: "GSC / GA4", desc: "עלייה עקבית בתנועה האורגנית לאורך 6–12 חודש = סמכות גדלה." },
                  { kpi: "Average Position for Topic", tool: "GSC Queries", desc: "הנמיכו את ה-Average Position לכל שאילתות הנישה. מטרה: מתחת ל-20 לכל שאילתה רלוונטית." },
                  { kpi: "Branded Queries", tool: "GSC + Google Alerts", desc: "כשאנשים מחפשים '[מותג שלכם] + נושא' — גוגל מזהה אתכם כסמכות." },
                  { kpi: "AI Overview Citations", tool: "בדיקה ידנית", desc: "חפשו את מילות המפתח הראשיות שלכם בגוגל ובדקו האם אתם מוצגים ב-AI Overview." },
                  { kpi: "Topical Authority Score", tool: "Ahrefs / SEMrush", desc: "כלים כמו Ahrefs מחשבים 'Topical Trust Flow' — עקבו אחר שיפור לאורך זמן." },
                  { kpi: "New Page Indexing Speed", tool: "GSC URL Inspection", desc: "ככל שגוגל מאנדקסת דפים חדשים מהר יותר — סמכות גוגל באתר גדלה." },
                ].map((m) => (
                  <div
                    key={m.kpi}
                    style={{
                      background: "var(--elevated)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)", padding: "14px 16px",
                    }}
                  >
                    <div style={{ fontFamily: "var(--font-rubik),sans-serif", fontWeight: 700, fontSize: "0.88rem", color: "var(--text)", marginBottom: "2px" }}>
                      {m.kpi}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--accent)", fontFamily: "var(--font-body),sans-serif", marginBottom: "8px" }}>
                      כלי: {m.tool}
                    </div>
                    <p style={{ ...BODY, marginBottom: 0, fontSize: "0.8rem", lineHeight: 1.6 }}>{m.desc}</p>
                  </div>
                ))}
              </div>

              {/* Link to keyword research */}
              <div style={SURFACE}>
                <p style={{ fontFamily: "var(--font-rubik),sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "var(--text)", marginBottom: "12px" }}>
                  לפני שבונים Topical Authority — צריך מחקר מילות מפתח מעמיק:
                </p>
                <Link
                  href="/seo/keyword-research"
                  style={{
                    display: "flex", gap: "14px", alignItems: "center",
                    textDecoration: "none", color: "inherit",
                  }}
                >
                  <div style={{ fontSize: "1.8rem", flexShrink: 0 }}>🔍</div>
                  <div>
                    <div style={{ fontFamily: "var(--font-rubik),sans-serif", fontWeight: 800, fontSize: "1rem", color: "var(--accent)", marginBottom: "4px" }}>
                      מחקר מילות מפתח — המדריך המלא 2026/2027
                    </div>
                    <p style={{ ...BODY, marginBottom: 0, fontSize: "0.88rem", lineHeight: 1.6 }}>
                      כלים חינמיים ובתשלום, ניתוח כוונת חיפוש, Long-Tail Strategy,
                      Keyword Gap Analysis ו-Keyword Clustering — כל מה שצריך לדעת לפני
                      שבונים את ה-Silo.
                    </p>
                  </div>
                </Link>
              </div>
              <p style={BODY}>
                וכמובן, כל אלו הם חלק ממסגרת רחבה יותר — ה-
                <Link href="/seo/guide" style={{ color: "var(--accent)", fontWeight: 600 }}>
                  מדריך SEO המלא
                </Link>{" "}
                שלנו מכסה גם <GT term="Technical SEO">Technical SEO</GT>, <GT term="E-E-A-T">E-E-A-T</GT>,{" "}
                Link Building ו-<GT term="Core Web Vitals">Core Web Vitals</GT> לעומק.
              </p>
            </section>

            {/* ── Author bio ── */}
            <section style={{ marginTop: "3rem" }} aria-label="הסמכות המקצועית" itemScope itemType="https://schema.org/Person">
              <div className="author-bio">
                <meta itemProp="image" content="https://www.wao.co.il/eitan-yariv.avif" />
                <div className="author-avatar" role="img" aria-label="איתן יריב" />
                <div className="author-meta">
                  <div className="author-name" itemProp="name">{AUTHOR_NAME}</div>
                  <div className="author-title" itemProp="jobTitle">
                    מייסד WAO | מומחה SEO ושיווק דיגיטלי מאז 2006
                  </div>
                  <p className="author-text" itemProp="description">
                    בניתי Topical Authority לעשרות עסקים ישראלים בתחומים מגוונים.
                    המדריך הזה מסכם את השיטות שעבדו — ואת הטעויות שלמדתי לא לחזור עליהן.
                    ארכיטקטורת Content Silo היא ההשקעה הטובה ביותר ב-SEO ב-2026.
                  </p>
                  <div style={{ display: "flex", gap: "14px", marginTop: "12px", flexWrap: "wrap" }}>
                    <a href={SAME_AS[0]} target="_blank" rel="noopener noreferrer" itemProp="sameAs"
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "var(--muted)", fontFamily: "var(--font-body),sans-serif" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                      LinkedIn
                    </a>
                    <a href={SAME_AS[1]} target="_blank" rel="noopener noreferrer" itemProp="sameAs"
                      style={{ fontSize: "0.82rem", color: "var(--muted)", fontFamily: "var(--font-body),sans-serif" }}>
                      AskPavel
                    </a>
                  </div>
                </div>
              </div>
              <p style={{ marginTop: "16px", fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body),sans-serif" }}>
                <time dateTime={MODIFIED}>עודכן לאחרונה: יוני 2026</time>
              </p>
            </section>

            {/* ── CTA ── */}
            <div
              className="cta-banner"
              style={{ marginTop: "3rem", padding: "clamp(32px,5vw,56px) clamp(20px,4vw,48px)", textAlign: "center", position: "relative", overflow: "hidden" }}
            >
              <div aria-hidden style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "60%", height: "100%", background: "radial-gradient(ellipse at center, rgba(74,227,181,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div className="eyebrow" style={{ justifyContent: "center" }}>רוצים שמישהו יבנה את הסמכות הנושאית שלכם?</div>
                <h2 style={{ fontFamily: "var(--font-rubik),sans-serif", fontWeight: 900, fontSize: "clamp(1.4rem,2.8vw,2.2rem)", lineHeight: 1.15, marginBottom: "12px" }}>
                  בניית Topical Authority עם WAO —{" "}
                  <span className="text-gradient">ייעוץ ראשון חינם</span>
                </h2>
                <p style={{ color: "var(--muted)", fontFamily: "var(--font-body),sans-serif", marginBottom: "28px", fontSize: "0.97rem", lineHeight: 1.7 }}>
                  WAO תבנה לכם ארכיטקטורת Content Silo מלאה: מחקר מילות מפתח, מיפוי
                  Clusters, URL Architecture ואסטרטגיית תוכן שמביאה לתוצאות ב-6–12 חודשים.
                </p>
                <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
                  <a href="tel:0526148860" className="btn-primary" style={{ fontSize: "1rem" }}>
                    📞 052-614-8860
                  </a>
                  <Link href="/seo" className="btn-outline" style={{ fontSize: "1rem" }}>
                    שירות קידום אתרים ←
                  </Link>
                </div>
              </div>
            </div>
          </article>

          {/* ── Sticky TOC ── */}
          <aside style={{ position: "sticky", top: "90px" }} aria-label="תוכן עניינים" className="guide-toc">
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "20px 20px" }}>
              <h2 style={{ fontFamily: "var(--font-rubik),sans-serif", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "14px" }}>
                תוכן עניינים
              </h2>
              <nav>
                <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                  {TOC.map((item, i) => (
                    <li key={item.id}>
                      <a href={`#${item.id}`} className="toc-link">
                        <span style={{ color: "var(--accent)", fontWeight: 700, fontFamily: "var(--font-rubik),sans-serif", fontSize: "0.75rem", flexShrink: 0 }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>

            <div style={{ marginTop: "16px", background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "18px 20px" }}>
              <p style={{ fontFamily: "var(--font-rubik),sans-serif", fontWeight: 700, fontSize: "0.88rem", marginBottom: "8px" }}>
                מדריכים נוספים בסדרה:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <Link href="/seo/keyword-research" style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body),sans-serif", textDecoration: "none" }}>
                  <span style={{ color: "var(--accent)" }}>🔍</span>
                  מחקר מילות מפתח
                </Link>
                <Link href="/seo/guide" style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body),sans-serif", textDecoration: "none" }}>
                  <span style={{ color: "var(--accent)" }}>📖</span>
                  מדריך SEO המלא 2026
                </Link>
                <Link href="/seo/consulting" style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body),sans-serif", textDecoration: "none" }}>
                  <span style={{ color: "var(--accent)" }}>🎯</span>
                  יועץ SEO — ייעוץ אישי
                </Link>
              </div>
            </div>

            <div style={{ marginTop: "16px", background: "var(--accent-dim)", border: "1px solid var(--accent-border)", borderRadius: "var(--radius-md)", padding: "18px 20px" }}>
              <p style={{ fontFamily: "var(--font-rubik),sans-serif", fontWeight: 700, fontSize: "0.88rem", marginBottom: "8px" }}>
                רוצים שנעשה את זה בשבילכם?
              </p>
              <p style={{ fontFamily: "var(--font-body),sans-serif", fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "14px" }}>
                ייעוץ SEO ראשון — חינם וללא התחייבות.
              </p>
              <a href="tel:0526148860" className="btn-primary" style={{ fontSize: "0.85rem", padding: "10px 16px", width: "100%", justifyContent: "center" }}>
                052-614-8860
              </a>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
