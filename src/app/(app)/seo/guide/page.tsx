import type { Metadata } from "next";
import Link from "next/link";
import SiloNav from "@/components/SiloNav";
import GT from "@/components/GlossaryTerm";
import { WithGlossaryDeep } from "@/lib/WithGlossaryDeep";

const STATIC_META = {
  title: "מדריך קידום אתרים אורגני בגוגל 2026/2027 — המדריך המלא | WAO",
  description:
    "מדריך קידום אתרים מקיף ומעודכן ל-2026/2027: AI Overviews, Topical Authority, E-E-A-T, Technical SEO ו-Core Web Vitals. כתוב ע\"י איתן יריב — 20+ שנות ניסיון.",
};

export const metadata: Metadata = {
  title:      STATIC_META.title,
  description: STATIC_META.description,
  alternates: { canonical: "https://www.wao.co.il/seo/guide" },
  robots:     { index: true, follow: true },
  openGraph: {
    title:       STATIC_META.title,
    description: STATIC_META.description,
    url:         "https://www.wao.co.il/seo/guide",
    type:        "article",
  },
};

const PUBLISHED   = "2024-03-01";
const MODIFIED    = "2026-06-04";
const CANONICAL   = "https://www.wao.co.il/seo/guide";
const AUTHOR_NAME = "איתן יריב";
const AUTHOR_URL  = "https://www.wao.co.il/about";
const SAME_AS     = [
  "https://www.linkedin.com/in/eitanyariv/",
  "https://qa.askpavel.co.il/user/%D7%90%D7%99%D7%AA%D7%9F+%D7%99%D7%A8%D7%99%D7%91",
];

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  "@id": `${CANONICAL}#article`,
  headline: "מדריך קידום אתרים אורגני בגוגל 2026/2027",
  description:
    "מדריך SEO מקיף ומעודכן: AI Overviews, Topical Authority, E-E-A-T, Technical SEO, Core Web Vitals ו-Link Building.",
  url: CANONICAL,
  inLanguage: "he",
  datePublished: PUBLISHED,
  dateModified: MODIFIED,
  author: {
    "@type": "Person",
    "@id": `${AUTHOR_URL}#person`,
    name: AUTHOR_NAME,
    jobTitle: 'מייסד WAO ומומחה SEO',
    url: AUTHOR_URL,
    sameAs: SAME_AS,
  },
  publisher: {
    "@type": "Organization",
    "@id": "https://www.wao.co.il/#org",
    name: "WAO",
    url: "https://www.wao.co.il",
  },
  about: { "@type": "Thing", name: "קידום אתרים אורגני" },
  mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
};

const profilePageSchema = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "@id": `${AUTHOR_URL}#profilepage`,
  url: AUTHOR_URL,
  name: `${AUTHOR_NAME} — מומחה SEO ושיווק דיגיטלי`,
  mainEntity: {
    "@type": "Person",
    "@id": `${AUTHOR_URL}#person`,
    name: AUTHOR_NAME,
    jobTitle: 'מייסד WAO ומומחה SEO',
    url: AUTHOR_URL,
    worksFor: { "@type": "Organization", "@id": "https://www.wao.co.il/#org" },
    sameAs: SAME_AS,
    knowsAbout: ["SEO", "Google Ads", "Topical Authority", "AI Overviews", "Content Marketing"],
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "דף הבית",       item: "https://www.wao.co.il" },
    { "@type": "ListItem", position: 2, name: "קידום אתרים",   item: "https://www.wao.co.il/seo" },
    { "@type": "ListItem", position: 3, name: "מדריך SEO",     item: CANONICAL },
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "כמה זמן לוקח קידום אתרים להראות תוצאות?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "תוצאות ראשונות (שיפור מיקומים) מורגשות בדרך כלל תוך 3–4 חודשים. צמיחה משמעותית בתנועה מגיעה תוך 6–12 חודשים. תחומים תחרותיים עשויים לדרוש 12–18 חודשים.",
      },
    },
    {
      "@type": "Question",
      name: "מה זה Topical Authority ולמה זה חשוב ב-2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Topical Authority היא הסמכות הנושאית שגוגל מייחס לאתר בתחום מסוים. אתר שמכסה נושא לעומק (Content Clusters, Pillar Pages) מדורג גבוה יותר מאשר אתר עם מאמרים מפוזרים. ב-2026 זה קריטי גם לציטוט ב-AI Overviews.",
      },
    },
    {
      "@type": "Question",
      name: "האם SEO עדיין רלוונטי עם AI Overviews?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "יותר מאי פעם. AI Overviews מצטטים מקורות ספציפיים — ואתרים עם Topical Authority, E-E-A-T חזק ו-Structured Data מלא מופיעים בציטוטים. זה חשיפה כפולה: גם בתוצאה האורגנית וגם ב-AI Overview.",
      },
    },
  ],
};

const TOC = [
  { id: "what-is-seo",       label: "מה זה קידום אתרים?" },
  { id: "how-google-works",  label: "איך גוגל עובד ב-2026/2027" },
  { id: "ai-overviews",      label: "AI Overviews ו-Generative Search" },
  { id: "keyword-research",  label: "מחקר מילות מפתח" },
  { id: "topical-authority", label: "Topical Authority" },
  { id: "technical-seo",     label: "Technical SEO" },
  { id: "on-page-seo",       label: "On-Page SEO" },
  { id: "eeat",              label: "E-E-A-T" },
  { id: "link-building",     label: "Link Building" },
  { id: "core-web-vitals",   label: "Core Web Vitals" },
  { id: "local-seo",         label: "קידום מקומי" },
  { id: "measurement",       label: "מדידה וכלים" },
  { id: "timeline",          label: "כמה זמן לוקח?" },
  { id: "mistakes",          label: "10 טעויות נפוצות" },
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

function StaticGuide() {
  return (
    <WithGlossaryDeep>
      <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(profilePageSchema) }} />
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
            <span aria-current="page">מדריך SEO</span>
          </nav>
          <SiloNav currentPath="/seo/guide" />

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
            מדריך קידום אתרים אורגני{" "}
            <span className="text-gradient">בגוגל 2026/2027</span>
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
            כל מה שצריך לדעת על SEO מודרני: מ-Topical Authority ו-AI Overviews ועד
            Technical SEO, E-E-A-T ו-Core Web Vitals. מדריך מעשי שמתעדכן כדי לשקף
            את המציאות של החיפוש ב-2026/2027.
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
              <Link
                href="/about"
                style={{ color: "var(--accent)", fontWeight: 600 }}
                itemProp="author"
              >
                {AUTHOR_NAME}
              </Link>
            </span>
            <span aria-hidden>·</span>
            <span>
              עודכן:{" "}
              <time dateTime={MODIFIED}>יוני 2026</time>
            </span>
            <span aria-hidden>·</span>
            <span>זמן קריאה: ~25 דקות</span>
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
          {/* ── Article body ── */}
          <article itemScope itemType="https://schema.org/Article">
            <meta itemProp="datePublished" content={PUBLISHED} />
            <meta itemProp="dateModified"  content={MODIFIED} />

            {/* ── 1. מה זה SEO ── */}
            <section id="what-is-seo">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                מה זה קידום אתרים (SEO)?
              </h2>
              <p style={BODY}>
                <strong style={{ color: "var(--text)" }}>קידום אתרים (SEO — Search Engine Optimization)</strong>{" "}
                הוא מכלול הפעולות שמגדילות את הנראות של אתר אינטרנט בתוצאות החיפוש
                האורגניות של גוגל — ללא תשלום ישיר לגוגל על כל קליק.
              </p>
              <p style={BODY}>
                בניגוד ל-Google Ads שמביאה תנועה מיידית אך נעצרת ברגע שמפסיקים לשלם,
                SEO בונה <strong style={{ color: "var(--text)" }}>נכס דיגיטלי</strong> שמביא
                תנועה חינם לאורך זמן. אתר שמדורג גבוה היום ממשיך לקבל לידים גם מחר,
                בשבוע הבא, ובשנה הבאה.
              </p>
              <div style={CALLOUT}>
                <strong>📌 בקצרה:</strong> SEO = להופיע ראשון כשלקוח מחפש מה שאתם מוכרים — בלי לשלם לגוגל על כל קליק.
              </div>
              <p style={BODY}>
                ב-2026, הגדרת SEO הורחבה. גוגל משתמשת ב-AI מתקדם (Gemini) כדי להבין
                כוונת חיפוש, ומציגה <strong style={{ color: "var(--text)" }}>AI Overviews</strong>{" "}
                — תשובות AI ישירות — לפני התוצאות האורגניות. SEO מודרני חייב לכלול
                אופטימיזציה גם לתוצאות ה-AI האלה.
              </p>
            </section>

            {/* ── 2. איך גוגל עובד ── */}
            <section id="how-google-works">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                איך גוגל מדרג אתרים ב-2026/2027
              </h2>
              <p style={BODY}>
                גוגל משתמשת ביותר מ-200 גורמי דירוג. אבל ב-2026/2027 ישנן{" "}
                <strong style={{ color: "var(--text)" }}>5 מערכות ליבה</strong> שמשפיעות
                יותר מכל על הדירוג:
              </p>
              <ol style={{ ...BODY, paddingInlineStart: "1.4rem", marginBottom: "1.6rem" }}>
                <li style={{ marginBottom: "12px" }}>
                  <strong style={{ color: "var(--text)" }}><GT term="RankBrain">RankBrain</GT> + <GT term="BERT">BERT</GT> + <GT term="MUM">MUM</GT></strong> —
                  מערכות AI שמבינות את <em>כוונת</em> החיפוש, לא רק את מילות המפתח.
                </li>
                <li style={{ marginBottom: "12px" }}>
                  <strong style={{ color: "var(--text)" }}><GT term="Helpful Content System">Helpful Content System</GT></strong> —
                  גוגל מעדיפה תוכן שנכתב <em>לאנשים</em>, לא למנועי חיפוש. תוכן AI-only
                  ללא ערך נענש.
                </li>
                <li style={{ marginBottom: "12px" }}>
                  <strong style={{ color: "var(--text)" }}><GT term="E-E-A-T">E-E-A-T</GT> Signals</strong> —
                  ניסיון, מומחיות, סמכות ואמינות. גוגל בוחנת מי כתב את התוכן ועד כמה
                  הוא מהימן.
                </li>
                <li style={{ marginBottom: "12px" }}>
                  <strong style={{ color: "var(--text)" }}>Page Experience</strong> —
                  <GT term="Core Web Vitals">Core Web Vitals</GT>, מהירות, מובייל ו-HTTPS.
                </li>
                <li style={{ marginBottom: "12px" }}>
                  <strong style={{ color: "var(--text)" }}>Link Authority</strong> —
                  קישורים נכנסים מאתרים אמינים ורלוונטיים עדיין קריטיים ב-2026.
                </li>
              </ol>
              <div style={SURFACE}>
                <h3 style={{ ...HEADING, fontSize: "1.05rem", marginTop: 0 }}>
                  שינויי האלגוריתם החשובים ב-2025–2026
                </h3>
                <ul style={{ ...BODY, paddingInlineStart: "1.4rem", marginBottom: 0 }}>
                  <li style={{ marginBottom: "8px" }}><strong style={{ color: "var(--text)" }}>AI Overviews expansion</strong> — הורחב ל-100+ מדינות, עכשיו בעברית</li>
                  <li style={{ marginBottom: "8px" }}><strong style={{ color: "var(--text)" }}>Site Reputation Abuse</strong> — ענישה על Parasite SEO וספאם תוכן</li>
                  <li style={{ marginBottom: "8px" }}><strong style={{ color: "var(--text)" }}>Helpful Content integration</strong> — נמזג עם הCore Algorithm</li>
                  <li style={{ marginBottom: "8px" }}><strong style={{ color: "var(--text)" }}>Spam policies update</strong> — AI-generated spam, expired domains</li>
                  <li><strong style={{ color: "var(--text)" }}>INP replaces FID</strong> — Interaction to Next Paint הפך ל-Core Web Vital רשמי</li>
                </ul>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}>מאגר ידע:</span>
                {[
                  { label: "אלגוריתם גוגל", slug: "google-algorithm" },
                  { label: "Core Updates", slug: "core-updates" },
                  { label: "Helpful Content", slug: "helpful-content-system" },
                  { label: "Site Reputation Abuse", slug: "site-reputation-abuse" },
                ].map(({ label, slug }) => (
                  <Link key={slug} href={`/knowledge/${slug}`} style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border)", color: "var(--muted)", textDecoration: "none", fontFamily: "var(--font-body), sans-serif", background: "var(--elevated)" }}>
                    {label}
                  </Link>
                ))}
              </div>
            </section>

            {/* ── 3. AI Overviews ── */}
            <section id="ai-overviews">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                AI Overviews ו-Generative Search —{" "}
                <span className="text-gradient">המהפכה של 2026</span>
              </h2>
              <p style={BODY}>
                <strong style={{ color: "var(--text)" }}>AI Overviews</strong> (לשעבר SGE)
                הוא הבלוק של גוגל שמציג תשובות AI ישירות בראש תוצאות החיפוש. נכון ל-2026,
                הוא מוצג ב-63%+ מהחיפושים הגנריים — וצפוי להגיע ל-80%+ ב-2027.
              </p>
              <p style={BODY}>
                חשוב להבין: AI Overviews לא <em>מחליפים</em> SEO — הם{" "}
                <strong style={{ color: "var(--text)" }}>מגדילים</strong> את חשיבותו.
                גוגל מצטטת מקורות ספציפיים ב-AI Overview. אתרים שמצוטטים מקבלים
                Brand Visibility אדירה — גם ללא קליק.
              </p>
              <div style={CALLOUT}>
                <strong>🤖 איך להופיע ב-AI Overviews:</strong>
                <ul style={{ marginTop: "10px", paddingInlineStart: "1.2rem" }}>
                  <li style={{ marginBottom: "6px" }}>כתבו <strong>Direct Answers</strong> ברורים לשאלות נפוצות</li>
                  <li style={{ marginBottom: "6px" }}>הוסיפו <strong>סיכום קצר (בקצרה)</strong> בתחילת כל מאמר</li>
                  <li style={{ marginBottom: "6px" }}>השתמשו ב-<strong>FAQ Schema</strong> עם שאלות ותשובות מבוססות</li>
                  <li style={{ marginBottom: "6px" }}>בנו <strong>Topical Authority</strong> — AI מצטט מקורות שהוא מזהה כסמכותיים</li>
                  <li>חזקו <strong>E-E-A-T</strong> — מחבר מומחה + מקורות ממוספרים</li>
                </ul>
              </div>
              <p style={BODY}>
                מנועי AI נוספים שמשפיעים על תנועה ב-2026:{" "}
                <strong style={{ color: "var(--text)" }}>Perplexity AI</strong> (מצטט מקורות
                ישירות, מביא תנועה), <strong style={{ color: "var(--text)" }}>ChatGPT Search</strong>,
                ו-<strong style={{ color: "var(--text)" }}>Microsoft Copilot</strong>. כל אחד
                מהם מתגמל תוכן עם Topical Authority ו-E-E-A-T.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}>מאגר ידע:</span>
                {[
                  { label: "AI Overviews", slug: "ai-overviews" },
                  { label: "GEO", slug: "generative-engine-optimization" },
                  { label: "LLM Citations", slug: "llm-citation-seo" },
                  { label: "Zero-Click", slug: "zero-click-searches" },
                  { label: "AI Content & SEO", slug: "ai-content-seo" },
                  { label: "Entity SEO", slug: "entity-seo" },
                ].map(({ label, slug }) => (
                  <Link key={slug} href={`/knowledge/${slug}`} style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border)", color: "var(--muted)", textDecoration: "none", fontFamily: "var(--font-body), sans-serif", background: "var(--elevated)" }}>
                    {label}
                  </Link>
                ))}
              </div>
            </section>

            {/* ── 4. Keyword Research ── */}
            <section id="keyword-research">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                מחקר מילות מפתח וכוונת חיפוש
              </h2>
              <p style={BODY}>
                לפני שכותבים מילה אחת, צריך לדעת מה הלקוח הפוטנציאלי מחפש — ולמה.{" "}
                <strong style={{ color: "var(--text)" }}>מחקר מילות מפתח</strong> הוא הצעד המחבר
                בין העסק לבין שאלות אמיתיות שאנשים מקלידים בגוגל.
              </p>
              <h3 style={{ ...HEADING, fontSize: "1.2rem" }}>כוונת חיפוש — ה-Why מאחורי הביטוי</h3>
              <p style={BODY}>
                <strong style={{ color: "var(--text)" }}><GT term="Search Intent">כוונת חיפוש (Search Intent)</GT></strong>{" "}
                היא הגורם הקריטי ביותר בבחירת מילות מפתח. גוגל מסווגת חיפושים לארבעה סוגים:{" "}
                <strong style={{ color: "var(--text)" }}>מידעי</strong> (מה זה X?),{" "}
                <strong style={{ color: "var(--text)" }}>ניווטי</strong> (חיפוש אתר ספציפי),{" "}
                <strong style={{ color: "var(--text)" }}>מסחרי</strong> (השוואת אפשרויות לפני רכישה),{" "}
                ו<strong style={{ color: "var(--text)" }}>עסקאי</strong> (מוכן לרכוש כעת).
                תוכן שאינו תואם לכוונת החיפוש לא יידרג — גם אם הוא מכיל את מילת המפתח.
              </p>
              <h3 style={{ ...HEADING, fontSize: "1.2rem" }}>
                <GT term="Long-Tail">Long-Tail</GT> מול ביטויי ראש
              </h3>
              <p style={BODY}>
                ביטויי Long-Tail — ארוכים וספציפיים — מביאים תנועה מצומצמת יותר, אך כוונת
                הרכישה שמאחוריהם גבוהה יותר. על הביטוי &quot;קידום אתרים&quot; מתחרים אלפי אתרים;
                על &quot;קידום אתרים למסעדות בתל אביב&quot; — הרבה פחות. אתרים חדשים מתחילים
                ב-Long-Tail ומחזקים את עמדתם לביטויים תחרותיים יותר בהדרגה.
              </p>
              <h3 style={{ ...HEADING, fontSize: "1.2rem" }}>Keyword Clustering — ביטויים לדפים, לא דף לכל ביטוי</h3>
              <p style={BODY}>
                Keyword Clustering — קיבוץ ביטויים לפי כוונת חיפוש משותפת — מונע{" "}
                <GT term="Keyword Cannibalization">קניבליזציה</GT>{" "}
                ובונה דפים עמוקים שגוגל מעדיפה על פני ריבוי דפים רדודים.
                הכלל הפשוט: ביטויים עם אותה כוונת חיפוש שייכים לאותו דף.
              </p>
              <div style={CALLOUT}>
                <strong>🔎 לפני כל כתיבה — נתחו את ה-<GT term="SERP">SERP</GT>:</strong>{" "}
                מה מדורג בראש עבור הביטוי שבחרתם? מה סוג התוכן שגוגל מחזירה — מאמרים,
                דפי מוצר, וידאו? התשובה חושפת את כוונת החיפוש האמיתית.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}>מאגר ידע:</span>
                {[
                  { label: "Search Intent", slug: "search-intent" },
                  { label: "Long-Tail Keywords", slug: "long-tail-keywords" },
                  { label: "Keyword Clustering", slug: "keyword-clustering" },
                  { label: "Keyword Cannibalization", slug: "keyword-cannibalization" },
                  { label: "Keyword Density", slug: "keyword-density" },
                  { label: "SERP Analysis", slug: "serp-analysis" },
                  { label: "Featured Snippets", slug: "featured-snippets" },
                ].map(({ label, slug }) => (
                  <Link key={slug} href={`/knowledge/${slug}`} style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border)", color: "var(--muted)", textDecoration: "none", fontFamily: "var(--font-body), sans-serif", background: "var(--elevated)" }}>
                    {label}
                  </Link>
                ))}
              </div>
            </section>

            {/* ── 5. Topical Authority ── */}
            <section id="topical-authority">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                Topical Authority — הדרך לסמכות בנישה שלכם
              </h2>
              <p style={BODY}>
                <strong style={{ color: "var(--text)" }}><GT term="Topical Authority">Topical Authority</GT></strong> היא
                הסמכות הנושאית שגוגל מייחס לאתר בתחום מסוים. אתר שמכסה נושא לעומק
                ומכל הזוויות — מדורג גבוה יותר מאשר אתר עם מאמר יחיד על אותו נושא,
                גם אם המאמר הוא "טוב יותר".
              </p>
              <h3 style={{ ...HEADING, fontSize: "1.2rem" }}>Content Clusters — האדריכלות שגוגל מחשיבה</h3>
              <p style={BODY}>
                <GT term="Content Cluster">Content Cluster</GT> = <strong style={{ color: "var(--text)" }}><GT term="Pillar Page">Pillar Page</GT> מרכזי</strong> שמכסה
                נושא ברמה גבוהה, ו-<strong style={{ color: "var(--text)" }}>Cluster Pages</strong> שמכסים
                כל תת-נושא לעומק. כל הדפים מקושרים זה לזה עם <GT term="Internal Linking">Internal Links</GT> רלוונטיים.
              </p>
              <div style={SURFACE}>
                <h4 style={{ ...HEADING, fontSize: "0.95rem", marginTop: 0, marginBottom: "12px" }}>
                  דוגמה — Cluster לנושא &quot;קידום אתרים&quot;:
                </h4>
                <ul style={{ ...BODY, paddingInlineStart: "1.2rem", marginBottom: 0, fontSize: "0.92rem" }}>
                  <li style={{ marginBottom: "6px" }}>🏛️ <strong style={{ color: "var(--text)" }}>Pillar:</strong> מדריך קידום אתרים מקיף (דף זה)</li>
                  <li style={{ marginBottom: "6px" }}>📄 Cluster: Technical SEO — המדריך הטכני</li>
                  <li style={{ marginBottom: "6px" }}>
                    📄 Cluster:{" "}
                    <Link href="/seo/keyword-research" style={{ color: "var(--accent)", fontWeight: 600 }}>
                      מחקר מילות מפתח ב-2026
                    </Link>
                  </li>
                  <li style={{ marginBottom: "6px" }}>📄 Cluster: E-E-A-T — איך לבנות סמכות</li>
                  <li style={{ marginBottom: "6px" }}>📄 Cluster: Link Building — המדריך המעשי</li>
                  <li>📄 Cluster: Core Web Vitals — כל מה שצריך לדעת</li>
                </ul>
              </div>
              <p style={BODY}>
                בניית Topical Authority דורשת זמן — בדרך כלל 6–12 חודשים לראות השפעה
                משמעותית. אבל ברגע שגוגל מזהה אתכם כסמכות בנישה, הדירוגים יציבים ועמידים
                לשינויי אלגוריתם.
              </p>
              <div style={CALLOUT}>
                <strong>📖 מדריכים מעמיקים לבניית Topical Authority:</strong>
                <ul style={{ marginTop: "10px", paddingInlineStart: "1.2rem" }}>
                  <li style={{ marginBottom: "6px" }}>
                    <Link href="/seo/keyword-research" style={{ color: "var(--accent)", fontWeight: 600 }}>
                      מחקר מילות מפתח — המדריך המלא
                    </Link>{" "}
                    — כלים חינמיים ובתשלום, כוונת חיפוש, Long-Tail ו-Keyword Clustering
                  </li>
                  <li>
                    <Link href="/seo/topical-authority" style={{ color: "var(--accent)", fontWeight: 600 }}>
                      Topical Authority ומבנה אתר SEO — המדריך המלא
                    </Link>{" "}
                    — Hub &amp; Spoke, Content Silos, URL Architecture ו-Internal Linking
                  </li>
                </ul>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}>מאגר ידע:</span>
                {[
                  { label: "Topical Authority", slug: "topical-authority" },
                  { label: "Pillar-Cluster Model", slug: "pillar-cluster-model" },
                  { label: "Content Silos", slug: "content-silos" },
                  { label: "Helpful Content System", slug: "helpful-content-system" },
                  { label: "Content Freshness", slug: "content-freshness" },
                  { label: "Evergreen Content", slug: "evergreen-content" },
                ].map(({ label, slug }) => (
                  <Link key={slug} href={`/knowledge/${slug}`} style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border)", color: "var(--muted)", textDecoration: "none", fontFamily: "var(--font-body), sans-serif", background: "var(--elevated)" }}>
                    {label}
                  </Link>
                ))}
              </div>
            </section>

            {/* ── 6. Technical SEO ── */}
            <section id="technical-seo">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                Technical SEO — הבסיס שלא רואים
              </h2>
              <p style={BODY}>
                Technical SEO הוא כל הפעולות הטכניות שמאפשרות לגוגל לסרוק, להבין
                ולהציג את האתר שלכם כראוי. בלי בסיס טכני תקין — שאר מאמצי ה-SEO
                מאבדים חלק ניכר מיעילותם.
              </p>
              <h3 style={{ ...HEADING, fontSize: "1.2rem" }}>רשימת ה-Technical SEO החיוניים ב-2026</h3>
              <div className="content-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "1.6rem" }}>
                {[
                  ["✅ Crawlability", "robots.txt, sitemap.xml, Crawl Budget"],
                  ["✅ Indexability", "Canonical, noindex, href-lang"],
                  ["✅ Mobile-First", "Responsive design, AMP (אופציונלי)"],
                  ["✅ HTTPS", "SSL, Mixed Content, Redirects נכונים"],
                  ["✅ Core Web Vitals", "LCP, CLS, INP — ירוק בכולם"],
                  ["✅ Structured Data", "Schema.org JSON-LD לכל סוג דף"],
                  ["✅ Site Architecture", "URL Structure נקי, Internal Linking"],
                  ["✅ Duplicate Content", "Canonical Tags, Parameter Handling"],
                ].map(([title, desc]) => (
                  <div
                    key={title}
                    style={{
                      background: "var(--elevated)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      padding: "12px 14px",
                    }}
                  >
                    <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.88rem", marginBottom: "4px" }}>
                      {title}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                      {desc}
                    </div>
                  </div>
                ))}
              </div>
              <p style={BODY}>
                כלים מומלצים לבדיקת Technical SEO:{" "}
                <GT term="Google Search Console">Google Search Console</GT>{" "}
                (חינם, הכי מדויק),{" "}
                <strong style={{ color: "var(--text)" }}>Screaming Frog</strong> לסריקת אתר מלאה,
                ו-<strong style={{ color: "var(--text)" }}>PageSpeed Insights</strong> ל-Core Web Vitals.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}>מאגר ידע:</span>
                {[
                  { label: "robots.txt", slug: "robots-txt" },
                  { label: "Sitemap XML", slug: "sitemap-xml" },
                  { label: "Crawling & Indexing", slug: "crawling-indexing" },
                  { label: "Canonical Tag", slug: "canonical-tag" },
                  { label: "Redirect 301", slug: "redirect-301" },
                  { label: "Mobile-First", slug: "mobile-first-indexing" },
                  { label: "hreflang", slug: "hreflang" },
                  { label: "JavaScript SEO", slug: "javascript-seo" },
                  { label: "Structured Data", slug: "structured-data" },
                  { label: "Crawl Budget", slug: "crawl-budget" },
                ].map(({ label, slug }) => (
                  <Link key={slug} href={`/knowledge/${slug}`} style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border)", color: "var(--muted)", textDecoration: "none", fontFamily: "var(--font-body), sans-serif", background: "var(--elevated)" }}>
                    {label}
                  </Link>
                ))}
              </div>
            </section>

            {/* ── 6. On-Page SEO ── */}
            <section id="on-page-seo">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                On-Page SEO — אופטימיזציה של כל דף
              </h2>
              <p style={BODY}>
                On-Page SEO הוא כל מה שניתן לשלוט בו ישירות בתוך הדף עצמו:
                כותרות, תוכן, URL, מטא תגים ו-Schema.
              </p>
              {[
                {
                  title: "Title Tag — הכותרת ב-Google",
                  content: "מקסימום 60 תווים. כלול את מילת המפתח הראשית בתחילה. הוסף את שם המותג בסוף. עשה אותה אטרקטיבית — CTR גבוה = דירוג גבוה יותר.",
                },
                {
                  title: "Meta Description",
                  content: "מקסימום 155 תווים. לא גורם דירוג ישיר, אבל משפיע על CTR. כלול את הערך הייחודי ו-CTA. גוגל לפעמים מחליף אותה — אבל שווה לכתוב גרסה מדויקת.",
                },
                {
                  title: "H1 — הכותרת הראשית",
                  content: "H1 אחד בלבד לכל דף. כלול את מילת המפתח הראשית. H2 ו-H3 לכותרות משניות — בנה היררכיה ברורה שגם גוגל וגם הקורא מבינים.",
                },
                {
                  title: "URL Structure",
                  content: "URL קצר, תיאורי, עם מילת המפתח. מספרים: רע (/p=123). מילים תיאוריות: טוב (/seo-guide). ללא תווים מיוחדים. קיצור מילים מיותר: גרוע.",
                },
                {
                  title: "Content Depth & Length",
                  content: "אין אורך מושלם — אבל תוכן שמכסה נושא לעומק תמיד מדורג גבוה יותר. מחקרו: מה יש בדפים המתחרים? מה חסר? כתבו את הדף הטוב ביותר בנושא.",
                },
                {
                  title: "Internal Linking",
                  content: "קשרו דפים רלוונטיים זה לזה עם Anchor Text תיאורי. Internal Links מחלקים PageRank, עוזרים לגוגל להבין את מבנה האתר ומגדילים Session Duration.",
                },
              ].map((item) => (
                <div key={item.title} style={SURFACE}>
                  <h3 style={{ ...HEADING, fontSize: "1rem", marginTop: 0 }}>{item.title}</h3>
                  <p style={{ ...BODY, marginBottom: 0, fontSize: "0.95rem" }}>{item.content}</p>
                </div>
              ))}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}>מאגר ידע:</span>
                {[
                  { label: "Title Tag", slug: "title-tag" },
                  { label: "Meta Description", slug: "meta-description" },
                  { label: "H1 Headings", slug: "h1-headings" },
                  { label: "URL Structure", slug: "url-structure" },
                  { label: "Image SEO", slug: "image-seo" },
                  { label: "Internal Linking", slug: "internal-linking" },
                  { label: "Anchor Text", slug: "anchor-text" },
                ].map(({ label, slug }) => (
                  <Link key={slug} href={`/knowledge/${slug}`} style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border)", color: "var(--muted)", textDecoration: "none", fontFamily: "var(--font-body), sans-serif", background: "var(--elevated)" }}>
                    {label}
                  </Link>
                ))}
              </div>
            </section>

            {/* ── 7. E-E-A-T ── */}
            <section id="eeat">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                E-E-A-T — ניסיון, מומחיות, סמכות ואמינות
              </h2>
              <p style={BODY}>
                <strong style={{ color: "var(--text)" }}>E-E-A-T</strong> (Experience,
                Expertise, Authoritativeness, Trustworthiness) הוא המסגרת שגוגל משתמשת
                בה כדי להעריך איכות תוכן. כפול חשוב במיוחד לנושאי <GT term="YMYL">YMYL</GT>
                (Your Money or Your Life) — בריאות, פיננסים, משפטים ועסקים.
              </p>
              <p style={BODY}>
                האות הכפול <strong style={{ color: "var(--text)" }}>Experience</strong> (ניסיון)
                נוסף ב-2022 כדי להדגיש ניסיון אישי ומעשי — לא רק מומחיות תיאורטית.
                גוגל מחפשת ראיות שהמחבר <em>חווה</em> את הנושא, לא רק כותב עליו.
              </p>
              <h3 style={{ ...HEADING, fontSize: "1.2rem" }}>כיצד לבנות E-E-A-T חזק:</h3>
              <ul style={{ ...BODY, paddingInlineStart: "1.4rem" }}>
                <li style={{ marginBottom: "10px" }}><strong style={{ color: "var(--text)" }}>Author Pages:</strong> דף מחבר עם ביוגרפיה, תפקיד, ניסיון, ותמונה</li>
                <li style={{ marginBottom: "10px" }}><strong style={{ color: "var(--text)" }}>Entity Reconciliation:</strong> sameAs links ל-LinkedIn, AskPavel, Wikipedia</li>
                <li style={{ marginBottom: "10px" }}><strong style={{ color: "var(--text)" }}>Citations & Sources:</strong> קישורים למקורות אמינים, מחקרים, נתונים</li>
                <li style={{ marginBottom: "10px" }}><strong style={{ color: "var(--text)" }}>Reviews & Testimonials:</strong> Google Reviews, Trustpilot, עדויות לקוחות</li>
                <li style={{ marginBottom: "10px" }}><strong style={{ color: "var(--text)" }}>Press Mentions:</strong> ציטוטים ומאמרים בפרסומים ידועים</li>
                <li><strong style={{ color: "var(--text)" }}>About Page חזק:</strong> תאריך הקמה, צוות, שליחות, כתובת, טלפון</li>
              </ul>
              <div style={CALLOUT}>
                <strong>🔑 E-E-A-T ב-2026:</strong> עם עליית ה-AI Content, גוגל מחפשת ראיות לניסיון אנושי אמיתי. "ניסיתי את זה ב-50 פרויקטים" חזק יותר מ"מחקרים מראים שX".
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}>מאגר ידע:</span>
                {[
                  { label: "E-E-A-T", slug: "eeat" },
                  { label: "YMYL", slug: "ymyl" },
                  { label: "Helpful Content System", slug: "helpful-content-system" },
                  { label: "Helpful Content Update", slug: "helpful-content-update" },
                  { label: "Site Reputation Abuse", slug: "site-reputation-abuse" },
                ].map(({ label, slug }) => (
                  <Link key={slug} href={`/knowledge/${slug}`} style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border)", color: "var(--muted)", textDecoration: "none", fontFamily: "var(--font-body), sans-serif", background: "var(--elevated)" }}>
                    {label}
                  </Link>
                ))}
              </div>
            </section>

            {/* ── 8. Link Building ── */}
            <section id="link-building">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                Link Building — בניית קישורים נכונה ב-2026
              </h2>
              <p style={BODY}>
                קישורים נכנסים (<GT term="Backlinks">Backlinks</GT>) הם עדיין אחד מגורמי הדירוג החזקים ביותר.
                אבל ב-2026, <strong style={{ color: "var(--text)" }}>איכות &gt;&gt; כמות</strong>.
                10 קישורים מאתרים רלוונטיים ואמינים שווים יותר מ-1,000 קישורים מספאם.
              </p>
              <h3 style={{ ...HEADING, fontSize: "1.2rem" }}>שיטות Link Building שעובדות ב-2026:</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "1.6rem" }}>
                {[
                  { method: "Digital PR", desc: "יצירת תוכן ראוי-ציטוט (מחקרים, סקרים, נתונים ייחודיים) שעיתונאים ומדיה מקשרים אליו." },
                  { method: "Guest Posting אסטרטגי", desc: "מאמרי אורח על אתרים מוסמכים בנישה שלכם — עם ביוגרפיה ו-Anchor Text נכון." },
                  { method: "Resource Link Building", desc: "יצירת דף משאבים שאתרים אחרים ירצו לקשר אליו: כלים, מדריכים מקיפים, סטטיסטיקות." },
                  { method: "HARO / Connectively", desc: "מענה לשאלות עיתונאים וקבלת ציטוטים עם קישורים ממדיה גדולה." },
                  { method: "Broken Link Building", desc: "מציאת קישורים שבורים באתרי נישה ודחיית תוכן חלופי לבעל האתר." },
                ].map((s) => (
                  <div
                    key={s.method}
                    style={{
                      display: "flex", gap: "12px", alignItems: "flex-start",
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)", padding: "14px 16px",
                    }}
                  >
                    <span style={{ color: "var(--accent)", fontWeight: 700, fontFamily: "var(--font-rubik), sans-serif", fontSize: "0.9rem", flexShrink: 0, minWidth: "140px" }}>
                      {s.method}
                    </span>
                    <p style={{ ...BODY, marginBottom: 0, fontSize: "0.92rem" }}>{s.desc}</p>
                  </div>
                ))}
              </div>
              <p style={BODY}>
                <strong style={{ color: "var(--text)" }}>להימנע:</strong> קניית קישורים,
                Link Farms, <GT term="PBNs">PBNs</GT>, שחלופי קישורים (Link Exchanges) מסיביים. גוגל <GT term="Penguin">Penguin</GT>
                מזהה את כולם ב-2026 — ועונש יכול למחוק שנים של עבודה.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}>מאגר ידע:</span>
                {[
                  { label: "Link Building", slug: "link-building" },
                  { label: "Backlinks", slug: "backlinks" },
                  { label: "Digital PR", slug: "digital-pr" },
                  { label: "Toxic Links", slug: "toxic-links" },
                  { label: "Domain Authority", slug: "domain-authority" },
                ].map(({ label, slug }) => (
                  <Link key={slug} href={`/knowledge/${slug}`} style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border)", color: "var(--muted)", textDecoration: "none", fontFamily: "var(--font-body), sans-serif", background: "var(--elevated)" }}>
                    {label}
                  </Link>
                ))}
              </div>
            </section>

            {/* ── 9. Core Web Vitals ── */}
            <section id="core-web-vitals">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                Core Web Vitals ו-Page Experience
              </h2>
              <p style={BODY}>
                Core Web Vitals הם מדדי חוויית המשתמש שגוגל כולל כגורמי דירוג רשמיים.
                ב-2024 <strong style={{ color: "var(--text)" }}><GT term="INP">INP (Interaction to Next Paint)</GT></strong>{" "}
                החליף את <GT term="FID">FID</GT> כמדד השלישי.
              </p>
              <div className="content-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "1.6rem" }}>
                {[
                  { metric: "LCP", full: "Largest Contentful Paint", good: "≤ 2.5s", desc: "מהירות טעינת הרכיב הגדול ביותר" },
                  { metric: "CLS", full: "Cumulative Layout Shift", good: "≤ 0.1", desc: "יציבות ויזואלית — האם הדף קופץ?" },
                  { metric: "INP", full: "Interaction to Next Paint", good: "≤ 200ms", desc: "תגובתיות לקלט משתמש" },
                ].map((v) => (
                  <div
                    key={v.metric}
                    style={{
                      background: "var(--elevated)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)", padding: "18px 16px", textAlign: "center",
                    }}
                  >
                    <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "1.6rem", color: "var(--accent)", marginBottom: "4px" }}>
                      {v.metric}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "8px" }}>
                      {v.full}
                    </div>
                    <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "var(--text)", marginBottom: "6px" }}>
                      טוב: {v.good}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                      {v.desc}
                    </div>
                  </div>
                ))}
              </div>
              <p style={BODY}>
                לשיפור Core Web Vitals:{" "}
                <GT term="Next.js">Next.js</GT> מספק ציוני ירוק
                מחוץ לקופסה — Image Optimization, Lazy Loading, SSG/SSR. WordPress עם
                תמונות לא מאופטמות ו-12 פלאגינים פעילים = ציונים אדומים.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}>מאגר ידע:</span>
                {[
                  { label: "Core Web Vitals", slug: "core-web-vitals" },
                  { label: "LCP", slug: "lcp" },
                  { label: "CLS", slug: "cls" },
                  { label: "INP", slug: "inp" },
                  { label: "Page Speed", slug: "page-speed-optimization" },
                ].map(({ label, slug }) => (
                  <Link key={slug} href={`/knowledge/${slug}`} style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border)", color: "var(--muted)", textDecoration: "none", fontFamily: "var(--font-body), sans-serif", background: "var(--elevated)" }}>
                    {label}
                  </Link>
                ))}
              </div>
            </section>

            {/* ── 10. Local SEO ── */}
            <section id="local-seo">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                קידום מקומי — להופיע בחיפוש &quot;קרוב אליי&quot;
              </h2>
              <p style={BODY}>
                לעסקים עם פעילות פיזית — מסעדות, קליניקות, חנויות, נותני שירות —{" "}
                <strong style={{ color: "var(--text)" }}><GT term="Local SEO">קידום מקומי</GT></strong> הוא לרוב
                ערוץ ה-ROI הגבוה ביותר. חיפושים כמו &quot;אינסטלטור בתל אביב&quot; או &quot;טיפולי שיניים
                קרוב אליי&quot; הם עסקאיים במהותם — המחפש מוכן לפעולה.
              </p>
              <div className="content-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "1.6rem" }}>
                {[
                  {
                    id: "gbp",
                    title: "Google Business Profile",
                    desc: "הפרופיל העסקי שמופיע בתיבת המפה ובחיפושים מקומיים. יש לוודא עדכניות של שעות, כתובת, קטגוריות ותמונות — ולצבור ביקורות לקוחות אמיתיות.",
                  },
                  {
                    id: "nap",
                    title: <><GT term="NAP">עקביות NAP</GT></>,
                    desc: "שם, כתובת וטלפון (Name, Address, Phone) חייבים להיות זהים בכל הרשת: אתר, Google Business Profile, Facebook ודפי עסקים. חוסר עקביות מבלבל את גוגל ופוגע בדירוג המקומי.",
                  },
                ].map((item) => (
                  <div key={item.id} style={SURFACE}>
                    <h3 style={{ ...HEADING, fontSize: "1rem", marginTop: 0 }}>{item.title}</h3>
                    <p style={{ ...BODY, marginBottom: 0, fontSize: "0.95rem" }}>{item.desc}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}>מאגר ידע:</span>
                {[
                  { label: "קידום מקומי", slug: "local-seo" },
                  { label: "Google Business Profile", slug: "google-my-business" },
                  { label: "NAP Consistency", slug: "nap-consistency" },
                  { label: "Local Pack", slug: "local-pack" },
                ].map(({ label, slug }) => (
                  <Link key={slug} href={`/knowledge/${slug}`} style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border)", color: "var(--muted)", textDecoration: "none", fontFamily: "var(--font-body), sans-serif", background: "var(--elevated)" }}>
                    {label}
                  </Link>
                ))}
              </div>
            </section>

            {/* ── 11. Measurement & Tools ── */}
            <section id="measurement">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                מדידה וכלים — איך יודעים שה-SEO עובד?
              </h2>
              <p style={BODY}>
                SEO ללא מדידה הוא ניחוש. ארבעה כלים חיוניים שכל מי שעוסק ב-SEO צריך להכיר:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "1.6rem" }}>
                {[
                  {
                    tool: "Google Search Console",
                    desc: "הכלי הרשמי של גוגל — חינם ומדויק יותר מכל כלי אחר. מציג אילו דפים מאונדקסים, על אילו ביטויים מופיעים, מה שיעור ההקלקה (CTR) ומה שגיאות הסריקה. הראשון לפתוח בכל פרויקט SEO.",
                  },
                  {
                    tool: "Rank Tracking",
                    desc: "מעקב אחר מיקום מילות המפתח לאורך זמן. כלים כמו Semrush, Ahrefs ו-SERPWatch מראים תנועות דירוג. חשוב למדוד מגמות לאורך שבועות — לא תנודות יומיות.",
                  },
                  {
                    tool: "SEO Audit",
                    desc: "ביקורת תקופתית של האתר: בעיות טכניות, פערי תוכן, קניבליזציה וקישורים שבורים. מומלץ לבצע אחת לרבעון ולאחר כל עדכון ליבה משמעותי.",
                  },
                  {
                    tool: "Competitive Analysis",
                    desc: "ניתוח מתחרי ה-SEO שלכם — לא בהכרח המתחרים העסקיים. מי מדורג מעלינו בביטויים המרכזיים? מה מבנה הקישורים שלו? מה פערי התוכן? ניתוח מתחרים מספק מפת דרכים מובנית.",
                  },
                ].map((s) => (
                  <div
                    key={s.tool}
                    style={{
                      display: "flex", gap: "12px", alignItems: "flex-start",
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)", padding: "14px 16px",
                    }}
                  >
                    <span style={{ color: "var(--accent)", fontWeight: 700, fontFamily: "var(--font-rubik), sans-serif", fontSize: "0.9rem", flexShrink: 0, minWidth: "180px" }}>
                      {s.tool}
                    </span>
                    <p style={{ ...BODY, marginBottom: 0, fontSize: "0.92rem" }}>{s.desc}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}>מאגר ידע:</span>
                {[
                  { label: "Google Search Console", slug: "google-search-console" },
                  { label: "Rank Tracking", slug: "rank-tracking" },
                  { label: "SEO Audit", slug: "seo-audit" },
                  { label: "Competitive Analysis", slug: "competitive-analysis" },
                ].map(({ label, slug }) => (
                  <Link key={slug} href={`/knowledge/${slug}`} style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border)", color: "var(--muted)", textDecoration: "none", fontFamily: "var(--font-body), sans-serif", background: "var(--elevated)" }}>
                    {label}
                  </Link>
                ))}
              </div>
            </section>

            {/* ── 12. Timeline ── */}
            <section id="timeline">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                כמה זמן לוקח קידום אתרים לראות תוצאות?
              </h2>
              <p style={BODY}>
                SEO הוא <strong style={{ color: "var(--text)" }}>ריצת מרתון</strong>, לא ספרינט.
                אלה ציפיות ריאליות לפי שלבים:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "1.6rem" }}>
                {[
                  { period: "חודשים 1–3", label: "איסוף מידע", color: "var(--muted)", desc: "גוגל סורק ומאנדקס את השינויים. ייתכן ירידה קלה לפני עלייה (Sandbox Effect). מתמקדים ב-Technical SEO ו-Content." },
                  { period: "חודשים 3–6", label: "תנועה ראשונה", color: "#f59e0b", desc: "שיפור ראשון במיקומים למילות מפתח ארוכות (Long-Tail). עלייה ב-Impressions ב-Search Console." },
                  { period: "חודשים 6–12", label: "צמיחה משמעותית", color: "#10b981", desc: "עלייה ב-Organic Traffic. מילות מפתח תחרותיות מתחילות לעלות. לידים אורגניים ראשונים." },
                  { period: "שנה 1–2", label: "Topical Authority מלאה", color: "var(--accent)", desc: "דירוגים יציבים, תנועה צומחת, Topical Authority מוכר. ROI מלא על השקעת ה-SEO." },
                ].map((s) => (
                  <div
                    key={s.period}
                    style={{
                      display: "flex", gap: "0", alignItems: "stretch",
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)", overflow: "hidden",
                    }}
                  >
                    <div style={{ background: "var(--elevated)", padding: "14px 16px", minWidth: "120px", display: "flex", flexDirection: "column", justifyContent: "center", flexShrink: 0 }}>
                      <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 800, fontSize: "0.82rem", color: s.color }}>{s.period}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginTop: "2px" }}>{s.label}</div>
                    </div>
                    <div style={{ padding: "14px 16px", flex: 1 }}>
                      <p style={{ ...BODY, marginBottom: 0, fontSize: "0.9rem" }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── 11. Mistakes ── */}
            <section id="mistakes">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                10 טעויות SEO נפוצות שפוגעות בדירוג ב-2026
              </h2>
              <ol style={{ ...BODY, paddingInlineStart: "1.4rem" }}>
                {[
                  ["תוכן AI-Only ללא ניסיון אנושי", "גוגל מזהה ומוריד תוכן AI שטחי. AI + מומחיות אנושית = עובד. AI בלבד = ענישה."],
                  ["זניחת ה-Technical SEO", "תוכן מצוין על אתר עם Crawl Issues = בזבוז. Technical הוא הבסיס."],
                  ["Keyword Stuffing — עדיין קיים", "שימוש מוגזם במילות מפתח פוגע בדירוג ובחוויית משתמש."],
                  ["קניית קישורים", "Penguin מזהה קישורים קנויים. רק קישורים אמיתיים ורלוונטיים בונים סמכות."],
                  ["זניחת ה-Mobile-First", "60%+ מהגלישה היא ממובייל. גוגל מאנדקס Mobile-First. אתר לא מותאם = ענישה."],
                  ["חוסר ב-E-E-A-T", "תוכן ללא מחבר מזוהה, ללא ביוגרפיה, ללא מקורות = דירוג נמוך בנושאי YMYL."],
                  ["זניחת ה-Internal Linking", "Internal Links מחלקים PageRank ועוזרים לגוגל להבין מבנה האתר."],
                  ["Core Web Vitals אדומים", "דף שנטען ב-5+ שניות מפסיד דירוג ומשתמשים כאחד."],
                  ["תוכן ללא עדכון", "גוגל מתגמלת תוכן עדכני. עדכן מאמרים ישנים — תאריך, נתונים, פנייה ל-AI Overviews."],
                  ["מדידת ה-Wrong KPIs", "דירוג גבוה ≠ הצלחה. מדדו: תנועה אורגנית, לידים מ-SEO, Revenue — לא רק מיקום."],
                ].map(([title, desc], i) => (
                  <li key={title} style={{ marginBottom: "14px" }}>
                    <strong style={{ color: "var(--text)" }}>{i + 1}. {title}</strong>
                    {" "}<span style={{ color: "var(--muted)", fontSize: "0.95rem" }}>{desc}</span>
                  </li>
                ))}
              </ol>
            </section>

            {/* ── Author bio ── */}
            <section
              style={{ marginTop: "3rem" }}
              aria-label="הסמכות המקצועית"
              itemScope
              itemType="https://schema.org/Person"
            >
              <div className="author-bio">
                <div className="author-avatar" aria-hidden>א.י</div>
                <div className="author-meta">
                  <div className="author-name" itemProp="name">{AUTHOR_NAME}</div>
                  <div className="author-title" itemProp="jobTitle">
                    מייסד WAO | מומחה SEO ושיווק דיגיטלי מאז 2006
                  </div>
                  <p className="author-text" itemProp="description">
                    מלווה עסקים ישראלים בצמיחה דיגיטלית מאז ראשית ימי גוגל ישראל.
                    מדריך זה מבוסס על ניסיון מעשי עם מאות פרויקטי SEO ב-20+ שנה —
                    מאינדקסים ראשונים ועד AI Overviews.
                  </p>
                  <div style={{ display: "flex", gap: "14px", marginTop: "12px", flexWrap: "wrap" }}>
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
              <p style={{ marginTop: "16px", fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                <time dateTime={MODIFIED}>עודכן לאחרונה: יוני 2026</time>
              </p>
            </section>

            {/* ── Knowledge Hub ── */}
            <div
              style={{
                marginTop: "3rem",
                padding: "20px 24px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                gap: "20px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: "200px" }}>
                <p style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.95rem", marginBottom: "4px", color: "var(--text)" }}>
                  81 מדריכים ב<Link href="/knowledge" style={{ color: "var(--accent)", textDecoration: "none" }}>מאגר הידע</Link> שלנו
                </p>
                <p style={{ fontFamily: "var(--font-body), sans-serif", fontSize: "0.82rem", color: "var(--muted)", margin: 0 }}>
                  כל נושא מהמדריך — robots.txt, Core Web Vitals, E-E-A-T, hreflang ועוד — מוסבר לעומק.
                </p>
              </div>
              <Link
                href="/knowledge"
                style={{
                  display: "inline-block",
                  padding: "9px 20px",
                  borderRadius: "var(--radius-pill)",
                  border: "1px solid var(--accent-border)",
                  background: "var(--accent-dim)",
                  color: "var(--accent)",
                  fontWeight: 700,
                  textDecoration: "none",
                  fontSize: "0.85rem",
                  fontFamily: "var(--font-body), sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                מאגר הידע ←
              </Link>
            </div>

            {/* ── CTA ── */}
            <div
              className="cta-banner"
              style={{ marginTop: "3rem", padding: "clamp(32px,5vw,56px) clamp(20px,4vw,48px)", textAlign: "center", position: "relative", overflow: "hidden" }}
            >
              <div aria-hidden style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "60%", height: "100%", background: "radial-gradient(ellipse at center, rgba(74,227,181,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div className="eyebrow" style={{ justifyContent: "center" }}>רוצים שמישהו יעשה את זה בשבילכם?</div>
                <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.4rem,2.8vw,2.2rem)", lineHeight: 1.15, marginBottom: "12px" }}>
                  שירות ה-SEO המלא של WAO —{" "}
                  <span className="text-gradient">ייעוץ ראשון חינם</span>
                </h2>
                <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "28px", fontSize: "0.97rem", lineHeight: 1.7 }}>
                  עברתם את המדריך. עכשיו הגיע הזמן ליישם. צוות WAO יבנה לכם אסטרטגיית SEO מלאה ויוציא אותה לפועל.
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
          <aside
            style={{ position: "sticky", top: "90px" }}
            aria-label="תוכן עניינים"
            className="guide-toc"
          >
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "20px 20px",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-rubik), sans-serif",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  marginBottom: "14px",
                }}
              >
                תוכן עניינים
              </h2>
              <nav>
                <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                  {TOC.map((item, i) => (
                    <li key={item.id}>
                      <a href={`#${item.id}`} className="toc-link">
                        <span style={{ color: "var(--accent)", fontWeight: 700, fontFamily: "var(--font-rubik), sans-serif", fontSize: "0.75rem", flexShrink: 0 }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>

            <div
              style={{
                marginTop: "16px",
                background: "var(--accent-dim)",
                border: "1px solid var(--accent-border)",
                borderRadius: "var(--radius-md)",
                padding: "18px 20px",
              }}
            >
              <p style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.88rem", marginBottom: "8px" }}>
                רוצים שנעשה את זה בשבילכם?
              </p>
              <p style={{ fontFamily: "var(--font-body), sans-serif", fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "14px" }}>
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
    </WithGlossaryDeep>
  );
}

// ── Page component ────────────────────────────────────────────────────────────
export default function SeoGuidePage() {
  return <StaticGuide />;
}
