import type { Metadata } from "next";
import Link from "next/link";
import SiloNav from "@/components/SiloNav";
import GT from "@/components/GlossaryTerm";

export const revalidate = 86400;

const CANONICAL   = "https://www.wao.co.il/seo/keyword-research";
const AUTHOR_NAME = "איתן יריב";
const AUTHOR_URL  = "https://www.wao.co.il/about";
const PUBLISHED   = "2026-06-07";
const MODIFIED    = "2026-06-07";
const SAME_AS     = [
  "https://www.linkedin.com/in/eitanyariv/",
  "https://qa.askpavel.co.il/user/%D7%90%D7%99%D7%AA%D7%9F+%D7%99%D7%A8%D7%99%D7%91",
];

export const metadata: Metadata = {
  title: "מחקר מילות מפתח — המדריך המלא 2026/2027",
  description:
    'מדריך מחקר מילות מפתח מקיף ל-2026: כוונת חיפוש, כלים חינמיים (GSC, Keyword Planner, Trends) ובתשלום (Ahrefs, SEMrush), Long-Tail, ניתוח תחרותי ו-Keyword Clustering. נכתב ע"י איתן יריב — 20+ שנות ניסיון.',
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "מחקר מילות מפתח — המדריך המלא 2026/2027 | WAO",
    description:
      "מדריך מעשי ומקיף: איך לעשות מחקר מילות מפתח שבונה תנועה אורגנית אמיתית — כלים, שיטות, Long-Tail ו-Keyword Clustering.",
    url: CANONICAL,
    type: "article",
  },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  "@id": `${CANONICAL}#article`,
  headline: "מחקר מילות מפתח — המדריך המלא 2026/2027",
  description:
    "מדריך מקיף למחקר מילות מפתח: כוונת חיפוש, כלים חינמיים ובתשלום, Long-Tail, ניתוח פערים ו-Keyword Clustering.",
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
    { "@type": "ListItem", position: 3, name: "מחקר מילות מפתח", item: CANONICAL },
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "מהו מחקר מילות מפתח ב-SEO?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "מחקר מילות מפתח הוא תהליך זיהוי המונחים שהלקוחות הפוטנציאליים שלכם מחפשים בגוגל. המחקר כולל בחינת נפח חיפוש, רמת תחרות, כוונת חיפוש ורלוונטיות עסקית — ומוביל לאסטרטגיית תוכן שמביאה תנועה אורגנית אמיתית.",
      },
    },
    {
      "@type": "Question",
      name: "אילו כלים מחקר מילות מפתח הם הטובים ביותר ב-2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "לתקציב מוגבל: Google Search Console + Google Keyword Planner + Autocomplete + Trends (חינם לחלוטין). לתקציב מקצועי: Ahrefs הוא הסטנדרט הזהב לניתוח מתחרים ו-Keyword Gap. SEMrush מצטיין בניתוח Domain-wide. Ubersuggest הוא אפשרות זולה לעסקים קטנים.",
      },
    },
    {
      "@type": "Question",
      name: "מה זה מילות מפתח Long-Tail ולמה הן חשובות?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "מילות מפתח Long-Tail הן ביטויים ארוכים וספציפיים (3+ מילים) עם נפח חיפוש נמוך אך כוונת רכישה גבוהה. למשל: 'שירות קידום אתרים לעסקים קטנים בתל אביב' במקום 'SEO'. הן קלות יותר לדירוג, ממירות טוב יותר, ויוצרות ביחד מסה קריטית של תנועה.",
      },
    },
  ],
};

const TOC = [
  { id: "what-is-keyword-research", label: "מהו מחקר מילות מפתח?" },
  { id: "search-intent",            label: "כוונת חיפוש — סוד ההצלחה" },
  { id: "free-tools",               label: "כלים חינמיים למחקר" },
  { id: "paid-tools",               label: "כלים בתשלום — השוואה" },
  { id: "long-tail",                label: "מילות מפתח Long-Tail" },
  { id: "competitive-gap",          label: "ניתוח פערים תחרותי" },
  { id: "keyword-clustering",       label: "Keyword Clustering" },
  { id: "to-topical-authority",     label: "ממחקר למבנה אתר" },
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

export default function KeywordResearchPage() {
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
            <span aria-current="page">מחקר מילות מפתח</span>
          </nav>
          <SiloNav currentPath="/seo/keyword-research" />

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
            מחקר מילות מפתח —{" "}
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
            איך למצוא את מילות המפתח שהלקוחות שלכם מחפשים, לנתח כוונת חיפוש, לזהות
            פערים מול המתחרים ולבנות Keyword Clusters שמניחים את היסודות ל-<GT term="Topical Authority">Topical
            Authority</GT> אמיתי.
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
            <span>זמן קריאה: ~18 דקות</span>
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

            {/* ── 1. מהו מחקר מילות מפתח ── */}
            <section id="what-is-keyword-research">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                מהו מחקר מילות מפתח?
              </h2>
              <p style={BODY}>
                <strong style={{ color: "var(--text)" }}>מחקר מילות מפתח</strong> הוא
                הצעד הראשון — ולרוב הקריטי ביותר — בכל אסטרטגיית SEO מוצלחת. הוא
                תהליך מובנה של זיהוי, ניתוח ומיון המונחים שהלקוחות הפוטנציאליים שלכם
                מחפשים בגוגל, כדי שתוכלו ליצור תוכן שעונה בדיוק על הצרכים שלהם.
              </p>
              <p style={BODY}>
                מחקר מילות מפתח גרוע = תוכן שאף אחד לא מחפש. מחקר טוב = תנועה
                אורגנית שממירה ללידים ולקוחות. ההבדל בין שתי האפשרויות הוא לרוב
                <strong style={{ color: "var(--text)" }}> כוונת חיפוש (<GT term="Search Intent">Search Intent</GT>)</strong> —
                הסוד שנפרט בפרק הבא.
              </p>
              <div style={CALLOUT}>
                <strong>📌 מחקר מילות מפתח ב-2026 שונה:</strong> גוגל הפכה לחכמה
                הרבה יותר — היא מבינה נושאים, לא רק מילות מפתח. המחקר כיום אינו על
                מציאת "מילה אחת מנצחת" אלא על{" "}
                <strong>בניית רשת נושאית שלמה (Keyword Cluster)</strong> שמוכיחה לגוגל
                שאתם הסמכות בנישה שלכם.
              </div>
              <h3 style={{ ...HEADING, fontSize: "1.2rem" }}>
                שלושה מרכיבי הליבה של כל מילת מפתח
              </h3>
              <div className="content-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "1.6rem" }}>
                {[
                  { term: "נפח חיפוש", eng: "Search Volume", desc: "כמה פעמים בחודש מחפשים את הביטוי. אל תתעלמו ממילות Long-Tail בנפח נמוך — הן ממירות טוב יותר." },
                  { term: "קושי דירוג",  eng: "Keyword Difficulty", desc: "כמה קשה לדרג עבור הביטוי. תלוי בסמכות הדומיין שלכם ובאיכות המתחרים בעמוד 1." },
                  { term: "ערך עסקי",   eng: "Business Value",     desc: "עד כמה הביטוי רלוונטי לעסק שלכם? חיפוש עם 100 חיפושים/חודש אך כוונת רכישה גבוהה שווה יותר מ-10,000 חיפושים אינפורמטיביים." },
                ].map((c) => (
                  <div
                    key={c.eng}
                    style={{
                      background: "var(--elevated)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)", padding: "16px",
                    }}
                  >
                    <div style={{ fontFamily: "var(--font-rubik),sans-serif", fontWeight: 800, fontSize: "1rem", color: "var(--text)", marginBottom: "2px" }}>
                      {c.term}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--accent)", fontFamily: "var(--font-body),sans-serif", marginBottom: "8px" }}>
                      {c.eng}
                    </div>
                    <p style={{ ...BODY, marginBottom: 0, fontSize: "0.82rem", lineHeight: 1.6 }}>{c.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── 2. כוונת חיפוש ── */}
            <section id="search-intent">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                כוונת חיפוש — סוד ההצלחה ב-2026
              </h2>
              <p style={BODY}>
                <strong style={{ color: "var(--text)" }}><GT term="Search Intent">Search Intent</GT> (כוונת חיפוש)</strong>{" "}
                היא הסיבה שמאחורי כל שאילתת חיפוש. גוגל קוראת את הכוונה — לא רק את
                המילים — ומדרגת אתרים שעונים על הכוונה הנכונה. טעות בכוונת חיפוש היא
                הסיבה הנפוצה ביותר לכך שדפים עם תוכן מצוין לא מדורגים.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "1.6rem" }}>
                {[
                  {
                    type: "01 / אינפורמטיבית",
                    eng:  "Informational",
                    color: "#3b82f6",
                    desc: "המשתמש רוצה ללמוד. דוגמה: \"מה זה SEO\", \"איך עובד גוגל\". הפתרון: מאמרים מקיפים, מדריכים, מאגרי שאלות ותשובות.",
                    action: "פורמט: מאמר / מדריך / FAQ",
                  },
                  {
                    type: "02 / ניווטית",
                    eng:  "Navigational",
                    color: "#8b5cf6",
                    desc: "המשתמש מחפש אתר ספציפי. דוגמה: \"WAO SEO\", \"לוגין גוגל אנליטיקס\". לא ניתן לנצל בקלות — המשתמש יודע לאן הוא רוצה ללכת.",
                    action: "פורמט: דף מותג / לא רלוונטי לתחרות",
                  },
                  {
                    type: "03 / חקירה מסחרית",
                    eng:  "Commercial Investigation",
                    color: "#f59e0b",
                    desc: "המשתמש שוקל רכישה ומחפש מידע השוואתי. דוגמה: \"Ahrefs vs SEMrush\", \"שירות SEO הכי טוב לעסקים קטנים\". פוטנציאל המרה גבוה.",
                    action: "פורמט: השוואות, ביקורות, רשימות Top X",
                  },
                  {
                    type: "04 / עסקאית",
                    eng:  "Transactional",
                    color: "#10b981",
                    desc: "המשתמש מוכן לפעול — לקנות, ליצור קשר, להירשם. דוגמה: \"שירות קידום אתרים מחיר\", \"להזמין ייעוץ SEO\". הכי גבוה בערך מסחרי.",
                    action: "פורמט: דפי שירות, Landing Pages, CTA ברור",
                  },
                ].map((intent) => (
                  <div
                    key={intent.eng}
                    style={{
                      display: "flex", gap: "0", alignItems: "stretch",
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)", overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: "4px", flexShrink: 0,
                        background: intent.color,
                      }}
                    />
                    <div style={{ padding: "14px 16px", flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px", marginBottom: "6px" }}>
                        <span style={{ fontFamily: "var(--font-rubik),sans-serif", fontWeight: 800, fontSize: "0.9rem", color: "var(--text)" }}>
                          {intent.type}
                        </span>
                        <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: "var(--radius-pill)", background: "var(--elevated)", color: "var(--muted)", fontFamily: "var(--font-body),sans-serif" }}>
                          {intent.action}
                        </span>
                      </div>
                      <p style={{ ...BODY, marginBottom: 0, fontSize: "0.88rem", lineHeight: 1.65 }}>{intent.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={CALLOUT}>
                <strong>💡 איך לבדוק כוונת חיפוש:</strong> פשוט חפשו את הביטוי
                בגוגל. צפו בעמוד 1: מה סוג הדפים שמדורגים? מאמרים? דפי שירות? וידאו?
                גוגל כבר פתרה בשבילכם את שאלת הכוונה — כל שנותר הוא לכתוב דף{" "}
                <em>טוב יותר</em> מהמתחרים.
              </div>
            </section>

            {/* ── 3. כלים חינמיים ── */}
            <section id="free-tools">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                כלים חינמיים למחקר מילות מפתח
              </h2>
              <p style={BODY}>
                לפני שמשקיעים בכלים בתשלום, חמשת הכלים הבאים מספקים נתונים עצומים —
                חינם לחלוטין:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "1.6rem" }}>
                {[
                  {
                    tool: "Google Search Console",
                    badge: "חינם + הכי מדויק",
                    badgeColor: "#10b981",
                    steps: [
                      "Queries report: ראו בדיוק אילו שאילתות מביאות תנועה לאתר — ואיפה אתם ב-Position 8–20 (הזדמנויות קלות).",
                      "Pages → Queries: לכל URL ראו את מילות המפתח שמדרגות אותו. גלו כוונות שאתם לא ממיטבים עליהן.",
                      "חפשו מילות מפתח עם Impressions גבוה ו-CTR נמוך — אלו כותרות Meta שניתן לשפר מיד.",
                    ],
                  },
                  {
                    tool: "Google Keyword Planner",
                    badge: "חינם (דרך Google Ads)",
                    badgeColor: "#3b82f6",
                    steps: [
                      "Discover new keywords: הזינו נושא, URL של מתחרה, או קטגוריית מוצר — וקבלו מאות רעיונות עם נפח חיפוש.",
                      "Get search volume: בדקו נפח מדויק לרשימת מילים שכבר יש לכם.",
                      "שימו לב: Planner נותן טווחים (100–1K) לא חשבונות Ads פעילים. אם תפעילו קמפיין — תקבלו נתונים מדויקים יותר.",
                    ],
                  },
                  {
                    tool: "Google Autocomplete + People Also Ask",
                    badge: "חינם — נתון ישיר מגוגל",
                    badgeColor: "#8b5cf6",
                    steps: [
                      "הקלידו מילת מפתח ב-Google וצפו בהשלמה האוטומטית — אלו ביטויים אמיתיים שאנשים מחפשים.",
                      "ה-'People Also Ask' (שאנשים גם שואלים) מספק שאלות Long-Tail מושלמות לסעיפי FAQ ולקטעי Featured Snippet.",
                      "שיטת ה-Alphabet: הקלידו [מילת מפתח] + A, B, C... וראו כל הצעה. כלי AnswerThePublic אוטומטיזה את זה.",
                    ],
                  },
                  {
                    tool: "Google Trends",
                    badge: "חינם — לזיהוי מגמות",
                    badgeColor: "#f59e0b",
                    steps: [
                      "בדקו האם נושא הוא בצמיחה או בדעיכה לפני שמשקיעים בו תוכן.",
                      "השוו בין מספר ביטויים — איזו גרסה אנשים מחפשים יותר? (למשל: 'קידום אתרים' vs 'SEO' vs 'מחקר מילות מפתח').",
                      "זהו עונתיות: נושאים כמו 'חופשת קיץ' או 'מבצעי בלאק פריידיי' — תכננו תוכן חודשים מראש.",
                    ],
                  },
                  {
                    tool: "Ubersuggest (גרסה חינמית)",
                    badge: "חינם עם הגבלות",
                    badgeColor: "#6b7280",
                    steps: [
                      "3 חיפושים חינמיים ביום — מספיק לבדיקות מהירות.",
                      "מספק: נפח חיפוש, KD (Keyword Difficulty), CPC ורעיונות קשורים.",
                      "שימושי לניתוח מתחרה ספציפי ולראות אילו מילות מפתח מביאות לו תנועה.",
                    ],
                  },
                ].map((t) => (
                  <div key={t.tool} style={SURFACE}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
                      <h3 style={{ ...HEADING, fontSize: "1rem", marginTop: 0, marginBottom: 0 }}>{t.tool}</h3>
                      <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: "var(--radius-pill)", background: t.badgeColor + "22", color: t.badgeColor, border: `1px solid ${t.badgeColor}44`, fontFamily: "var(--font-body),sans-serif", fontWeight: 600 }}>
                        {t.badge}
                      </span>
                    </div>
                    <ol style={{ ...BODY, paddingInlineStart: "1.4rem", marginBottom: 0, fontSize: "0.9rem", lineHeight: 1.7 }}>
                      {t.steps.map((s, i) => (
                        <li key={i} style={{ marginBottom: "6px" }}>{s}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </section>

            {/* ── 4. כלים בתשלום ── */}
            <section id="paid-tools">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                כלים בתשלום — השוואה מלאה 2026
              </h2>
              <p style={BODY}>
                כשרוצים לראות את מילות המפתח של המתחרים, לנתח{" "}
                <GT term="Backlinks">Backlink Profile</GT> ולגלות
                Keyword Gap בין הדומיין שלכם לשלהם — נדרשים כלים בתשלום. אלו שלושת
                השחקנים המרכזיים:
              </p>
              <div style={{ overflowX: "auto", marginBottom: "1.6rem" }}>
                <table
                  style={{
                    width: "100%", borderCollapse: "collapse",
                    fontFamily: "var(--font-body),sans-serif", fontSize: "0.88rem",
                    border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
                    overflow: "hidden",
                  }}
                >
                  <thead>
                    <tr style={{ background: "var(--elevated)", borderBottom: "1px solid var(--border)" }}>
                      {["קריטריון", "Ahrefs", "SEMrush", "Ubersuggest Pro"].map((h) => (
                        <th key={h} style={{ padding: "12px 14px", textAlign: "right", fontFamily: "var(--font-rubik),sans-serif", fontWeight: 700, fontSize: "0.82rem", color: "var(--text)" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["מחיר (חודשי)", "$129", "$119–$249", "$29–$49"],
                      ["מסד נתונים", "35B+ מילות מפתח", "25B+ מילות מפתח", "6B+ מילות מפתח"],
                      ["Keyword Difficulty", "✅ מדויק מאוד", "✅ טוב", "⚠️ פחות מדויק"],
                      ["Site Explorer (מתחרים)", "✅ הטוב ביותר", "✅ מצוין", "⚠️ מוגבל"],
                      ["Keyword Gap", "✅ כן", "✅ כן", "⚠️ חלקי"],
                      ["Backlink Index", "✅ הגדול ביותר", "✅ גדול", "⚠️ קטן"],
                      ["Rank Tracking", "✅ כן", "✅ כן", "✅ כן"],
                      ["Content Explorer", "✅ חזק מאוד", "✅ טוב", "❌ לא"],
                      ["ממשק עברי", "❌ לא", "❌ לא", "❌ לא"],
                      ["מתאים ל...", "מקצוענים ואייגנסי", "Enterprise & Content", "עסקים קטנים"],
                    ].map(([crit, ...vals]) => (
                      <tr key={crit} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text)", background: "var(--surface)" }}>
                          {crit}
                        </td>
                        {vals.map((v, i) => (
                          <td key={i} style={{ padding: "10px 14px", color: "var(--muted)" }}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={CALLOUT}>
                <strong>🏆 המלצת WAO:</strong> התחילו עם <strong>Ahrefs</strong> אם
                אתם רציניים לגבי SEO — זהו הסטנדרט הזהב לניתוח מתחרים ו-Keyword Gap.
                לתקציב מוגבל: <strong>Ubersuggest Pro</strong> עם הכלים החינמיים מ-Google
                מספיקים לעסקים קטנים ובינוניים.
              </div>

              <h3 style={{ ...HEADING, fontSize: "1.2rem" }}>
                Keyword Gap Analysis — המכרה הזהב שרוב העסקים פספסו
              </h3>
              <p style={BODY}>
                <strong style={{ color: "var(--text)" }}>Keyword Gap</strong> הוא ניתוח
                שמגלה מילות מפתח שהמתחרים שלכם מדורגים עליהן — ואתם לא. זה
                מציאת הזדמנויות תוכן שכבר הוכיחו ביקוש בשוק.
              </p>
              <div style={SURFACE}>
                <h4 style={{ ...HEADING, fontSize: "0.95rem", marginTop: 0, marginBottom: "10px" }}>
                  כיצד לבצע Keyword Gap ב-Ahrefs (5 דקות):
                </h4>
                <ol style={{ ...BODY, paddingInlineStart: "1.4rem", marginBottom: 0, fontSize: "0.9rem", lineHeight: 1.7 }}>
                  <li style={{ marginBottom: "8px" }}>Site Explorer → הזינו את הדומיין שלכם</li>
                  <li style={{ marginBottom: "8px" }}>לחצו על <strong>Content Gap</strong> בתפריט הצדדי</li>
                  <li style={{ marginBottom: "8px" }}>הוסיפו 2–3 מתחרים מרכזיים</li>
                  <li style={{ marginBottom: "8px" }}>סננו: <strong>Mode: Show keywords that all competitors rank for but you don't</strong></li>
                  <li>מיינו לפי Volume — ואלו הן מילות המפתח שעדיפות לתוכן חדש</li>
                </ol>
              </div>
            </section>

            {/* ── 5. Long-Tail ── */}
            <section id="long-tail">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                מילות מפתח Long-Tail — אסטרטגיית ה-80%
              </h2>
              <p style={BODY}>
                <GT term="Long-Tail">Long-Tail Keywords</GT> הם
                ביטויים ארוכים וספציפיים (בדרך כלל 3+ מילים) עם נפח חיפוש נמוך יחסית —
                אך עם שני יתרונות מכריעים:
              </p>
              <div className="content-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "1.6rem" }}>
                {[
                  { icon: "🎯", title: "כוונת רכישה גבוהה", desc: "\"שירות קידום אתרים לבית מרקחת בתל אביב\" — מי שמחפש זאת רוצה לקנות, לא רק ללמוד." },
                  { icon: "🏆", title: "תחרות נמוכה", desc: "80% מחברות ה-SEO מתחרות על 20% מהביטויים הגנריים. ה-Long-Tail הוא שדה פתוח." },
                  { icon: "📈", title: "צמיחה מהירה יותר", desc: "אתר חדש יכול להתחיל לדרג עבור Long-Tail תוך שבועות, בעוד שביטויים קצרים לוקחים שנים." },
                  { icon: "🔢", title: "כוח מצטבר", desc: "1,000 מילות Long-Tail עם 50 חיפושים/חודש = 50,000 חיפושים. יחד הן ה-Long-Tail > Head." },
                ].map((b) => (
                  <div
                    key={b.title}
                    style={{
                      background: "var(--elevated)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)", padding: "16px",
                    }}
                  >
                    <div style={{ fontSize: "1.5rem", marginBottom: "8px" }}>{b.icon}</div>
                    <div style={{ fontFamily: "var(--font-rubik),sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "var(--text)", marginBottom: "6px" }}>{b.title}</div>
                    <p style={{ ...BODY, marginBottom: 0, fontSize: "0.82rem", lineHeight: 1.6 }}>{b.desc}</p>
                  </div>
                ))}
              </div>
              <div style={SURFACE}>
                <h3 style={{ ...HEADING, fontSize: "1rem", marginTop: 0 }}>
                  איך למצוא Long-Tail Keywords — 4 שיטות מהירות
                </h3>
                <ul style={{ ...BODY, paddingInlineStart: "1.4rem", marginBottom: 0, fontSize: "0.9rem", lineHeight: 1.7 }}>
                  <li style={{ marginBottom: "8px" }}>
                    <strong style={{ color: "var(--text)" }}>GSC Queries Filter:</strong>{" "}
                    בפילטר Queries כתבו את מילת הבסיס וחפשו ביטויים עם 5+ מילים שמביאים
                    Impressions — אלו Long-Tail שכבר גוגל מציג אתכם בהם.
                  </li>
                  <li style={{ marginBottom: "8px" }}>
                    <strong style={{ color: "var(--text)" }}>Ahrefs Keywords Explorer → Phrase Match:</strong>{" "}
                    הגדירו KD מקסימום 20 ו-Volume מינימום 50. סננו לביטויים של 3+ מילים.
                  </li>
                  <li style={{ marginBottom: "8px" }}>
                    <strong style={{ color: "var(--text)" }}>Reddit + Quora + Forum Mining:</strong>{" "}
                    חפשו שאלות שאנשים שואלים בפורומים בתחום שלכם — אלו Long-Tail נצחיות
                    עם כוונה אמיתית.
                  </li>
                  <li>
                    <strong style={{ color: "var(--text)" }}>Google Autocomplete + People Also Ask:</strong>{" "}
                    כפי שתואר בסעיף הכלים החינמיים — זה המקור הטוב ביותר ל-Long-Tail
                    אותנטי.
                  </li>
                </ul>
              </div>
            </section>

            {/* ── 6. ניתוח פערים ── */}
            <section id="competitive-gap">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                ניתוח פערים תחרותי — כיצד לנצח את המתחרים
              </h2>
              <p style={BODY}>
                ניתוח תחרותי אינו רק על מילות מפתח — הוא הבנת מה גורם לאתרי המתחרים
                לדרג גבוה, ואיך לבנות אסטרטגיה שמנצחת אותם באופן שיטתי.
              </p>
              <h3 style={{ ...HEADING, fontSize: "1.2rem" }}>5 דברים לנתח על כל מתחרה</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "1.6rem" }}>
                {[
                  { num: "01", title: "מבנה תוכן", desc: "אילו עמודים מביאים להם הכי הרבה תנועה? מה הכותרות שלהם? כמה מילים בדפים המובילים? (Ahrefs: Top Pages)" },
                  { num: "02", title: "Backlink Profile", desc: "מאיפה הם מקבלים קישורים? האם ניתן לקבל קישורים מאותם מקורות? (Ahrefs: Backlinks → Referring Domains)" },
                  { num: "03", title: "מילות מפתח ייחודיות", desc: "אילו מילות מפתח הם מדורגים עליהן שאתם לא? זה הבסיס ל-Content Gap Analysis שתיארנו לעיל." },
                  { num: "04", title: "מהירות ו-Core Web Vitals", desc: "אם האתר שלכם מהיר יותר — זהו יתרון דירוג. בדקו ב-PageSpeed Insights את הדפים המתחרים." },
                  { num: "05", title: "E-E-A-T ו-Schema", desc: "האם יש להם Author Pages, Reviews, FAQ Schema? E-E-A-T חלש אצל מתחרה = הזדמנות לעקוף אותם." },
                ].map((item) => (
                  <div
                    key={item.num}
                    style={{
                      display: "flex", gap: "16px", alignItems: "flex-start",
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)", padding: "14px 16px",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-rubik),sans-serif", fontWeight: 900, fontSize: "1.2rem", color: "var(--accent)", flexShrink: 0, lineHeight: 1 }}>
                      {item.num}
                    </span>
                    <div>
                      <div style={{ fontFamily: "var(--font-rubik),sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "var(--text)", marginBottom: "4px" }}>
                        {item.title}
                      </div>
                      <p style={{ ...BODY, marginBottom: 0, fontSize: "0.88rem", lineHeight: 1.65 }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── 7. Keyword Clustering ── */}
            <section id="keyword-clustering">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                Keyword Clustering — מארגנים את המחקר לאסטרטגיית תוכן
              </h2>
              <p style={BODY}>
                לאחר שאספתם מאות (או אלפי) מילות מפתח — השלב הבא הוא לארגן אותן
                ל-<strong style={{ color: "var(--text)" }}>Clusters</strong>: קבוצות
                נושאיות שכל אחת מהן תתורגם לדף תוכן ספציפי. זה המקום שבו מחקר
                מילות מפתח הופך לאסטרטגיית SEO מלאה.
              </p>
              <div style={CALLOUT}>
                <strong>🗂️ כלל הזהב של Clustering:</strong> אם שתי מילות מפתח מביאות
                לאותה <em>כוונת חיפוש</em> ואמורות לדרג את אותו דף — הן באותו Cluster.
                אם הכוונה שונה — הן צריכות דפים נפרדים.
              </div>
              <h3 style={{ ...HEADING, fontSize: "1.2rem" }}>
                שיטת ה-4 שלבים ל-Keyword Clustering
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "1.6rem" }}>
                {[
                  { step: "שלב 1: איסוף", desc: "אספו כל מילות המפתח הרלוונטיות לתחום (מ-GSC, Ahrefs, Ubersuggest, Autocomplete) לגיליון Excel או Notion." },
                  { step: "שלב 2: גיבוש לפי נושא", desc: "קבצו מילות מפתח שמדברות על אותו נושא. לדוגמה: [מחקר מילות מפתח, keyword research, איך לעשות מחקר מילות מפתח] = Cluster אחד." },
                  { step: "שלב 3: סיווג לפי כוונה", desc: "לכל Cluster — קבעו את כוונת החיפוש הדומיננטית. אינפורמטיבית → מאמר. עסקאית → דף שירות. השוואתית → Roundup." },
                  { step: "שלב 4: מיפוי לדפים", desc: "כל Cluster = דף אחד. הגדירו: מה ה-Primary Keyword? אילו Secondary Keywords צריך לכלול? מה ה-URL? מה ה-Title Tag?" },
                ].map((s) => (
                  <div
                    key={s.step}
                    style={{
                      display: "flex", gap: "0", alignItems: "stretch",
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)", overflow: "hidden",
                    }}
                  >
                    <div style={{ background: "var(--elevated)", padding: "12px 16px", minWidth: "100px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontFamily: "var(--font-rubik),sans-serif", fontWeight: 800, fontSize: "0.82rem", color: "var(--accent)", textAlign: "center" }}>
                        {s.step}
                      </span>
                    </div>
                    <div style={{ padding: "12px 16px", flex: 1 }}>
                      <p style={{ ...BODY, marginBottom: 0, fontSize: "0.9rem", lineHeight: 1.65 }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={SURFACE}>
                <h4 style={{ ...HEADING, fontSize: "0.95rem", marginTop: 0, marginBottom: "10px" }}>
                  דוגמה — Clusters לעסק ייעוץ SEO:
                </h4>
                <div className="content-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {[
                    { cluster: "קידום אתרים כללי", kws: "מה זה SEO, איך לקדם אתר, קידום אתרים 2026", page: "/seo/guide", type: "מדריך" },
                    { cluster: "מחקר מילות מפתח", kws: "מחקר מילות מפתח, keyword research, כלי SEO", page: "/seo/keyword-research", type: "מדריך" },
                    { cluster: "Topical Authority", kws: "topical authority, מבנה אתר SEO, content clusters", page: "/seo/topical-authority", type: "מדריך" },
                    { cluster: "שירות SEO", kws: "שירות קידום אתרים, חברת SEO, מחיר קידום אתרים", page: "/seo", type: "דף שירות" },
                  ].map((c) => (
                    <div
                      key={c.cluster}
                      style={{
                        background: "var(--elevated)", borderRadius: "var(--radius-sm)",
                        padding: "12px", border: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ fontFamily: "var(--font-rubik),sans-serif", fontWeight: 700, fontSize: "0.82rem", color: "var(--text)", marginBottom: "4px" }}>
                        {c.cluster}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-body),sans-serif", marginBottom: "6px", lineHeight: 1.5 }}>
                        {c.kws}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.68rem", color: "var(--accent)", fontFamily: "var(--font-rubik),sans-serif" }}>{c.page}</span>
                        <span style={{ fontSize: "0.65rem", padding: "1px 6px", borderRadius: "var(--radius-pill)", background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-border)" }}>{c.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── 8. ממחקר למבנה ── */}
            <section id="to-topical-authority">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                ממחקר מילות מפתח למבנה אתר — הצעד הבא
              </h2>
              <p style={BODY}>
                מחקר מילות מפתח מוצלח + Keyword Clustering מושלם = מפת תוכן מלאה.
                הצעד הבא הוא לתרגם את המפה הזו לארכיטקטורת אתר שבונה{" "}
                <GT term="Topical Authority">Topical Authority</GT> —
                הסמכות הנושאית שגוגל מתגמלת בדירוגים יציבים.
              </p>
              <p style={BODY}>
                ארכיטקטורת Topical Authority כוללת: Pillar Pages (דפי עמוד) שמכסים
                נושאים ברמה גבוהה, Cluster Pages שמעמיקים בכל תת-נושא, ו-Internal
                Links שמחברים הכל לרשת נושאית מגובשת.
              </p>
              <div
                style={{
                  background: "var(--elevated)",
                  border: "1px solid var(--accent-border)",
                  borderRadius: "var(--radius-md)",
                  padding: "24px 28px",
                  marginBottom: "1.6rem",
                }}
              >
                <p style={{ fontFamily: "var(--font-rubik),sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "var(--text)", marginBottom: "14px" }}>
                  המדריך הבא בסדרה:
                </p>
                <Link
                  href="/seo/topical-authority"
                  style={{
                    display: "flex", gap: "16px", alignItems: "center",
                    textDecoration: "none", color: "inherit",
                  }}
                >
                  <div style={{ fontSize: "2rem", flexShrink: 0 }}>🏛️</div>
                  <div>
                    <div style={{ fontFamily: "var(--font-rubik),sans-serif", fontWeight: 800, fontSize: "1.05rem", color: "var(--accent)", marginBottom: "4px" }}>
                      Topical Authority ומבנה אתר SEO — המדריך המלא
                    </div>
                    <p style={{ ...BODY, marginBottom: 0, fontSize: "0.88rem", lineHeight: 1.6 }}>
                      איך להפוך את Keyword Clusters שלכם לארכיטקטורת אתר שגוגל מכירה
                      כסמכות — Hub &amp; Spoke Model, Content Silos, URL Structure ו-Internal
                      Linking אסטרטגי.
                    </p>
                  </div>
                </Link>
              </div>
              <p style={BODY}>
                וכמובן — כל זה צריך להתחבר ל-
                <Link href="/seo/guide" style={{ color: "var(--accent)", fontWeight: 600 }}>
                  מדריך ה-SEO המלא
                </Link>{" "}
                שלנו, שמכסה את כל יתר מרכיבי הקידום:{" "}
                <GT term="Technical SEO">Technical SEO</GT>, <GT term="E-E-A-T">E-E-A-T</GT>,{" "}
                Link Building ו-<GT term="Core Web Vitals">Core Web Vitals</GT>.
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
                    מחקר מילות מפתח הוא הבסיס לכל פרויקט SEO שאני מוביל — מ-2006 ועד היום.
                    המדריך הזה מבוסס על מאות מחקרים שביצעתי לעסקים ישראלים בתחומים
                    מגוונים: רפואה, פיננסים, טכנולוגיה ומסחר אלקטרוני.
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
                <div className="eyebrow" style={{ justifyContent: "center" }}>רוצים שמישהו יעשה את זה בשבילכם?</div>
                <h2 style={{ fontFamily: "var(--font-rubik),sans-serif", fontWeight: 900, fontSize: "clamp(1.4rem,2.8vw,2.2rem)", lineHeight: 1.15, marginBottom: "12px" }}>
                  מחקר מילות מפתח מקצועי לעסק שלכם —{" "}
                  <span className="text-gradient">ייעוץ ראשון חינם</span>
                </h2>
                <p style={{ color: "var(--muted)", fontFamily: "var(--font-body),sans-serif", marginBottom: "28px", fontSize: "0.97rem", lineHeight: 1.7 }}>
                  WAO מבצעת מחקר מילות מפתח מלא, ניתוח תחרותי ובניית מפת תוכן SEO — כבסיס
                  לאסטרטגיית קידום אתרים שמביאה תוצאות.
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
                <Link href="/seo/topical-authority" style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body),sans-serif", textDecoration: "none" }}>
                  <span style={{ color: "var(--accent)" }}>🏛️</span>
                  Topical Authority ומבנה אתר
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
