import type { Metadata } from "next";
import { Fragment } from "react";
import { renderMixed } from "@/lib/bidi";
import Link from "next/link";
import SiloNav from "@/components/SiloNav";
import GT from "@/components/GlossaryTerm";
import { WithGlossaryDeep } from "@/lib/WithGlossaryDeep";
import TrackedLink from "@/components/TrackedLink";
import { KNOWLEDGE_ARTICLES } from "@/data/knowledge";
import { SEO_GUIDE_MODIFIED } from "@/data/seo-guide-meta";

const STATIC_META = {
  title: "מדריך קידום אתרים אורגני בגוגל 2026/2027 — המדריך המלא",
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
const MODIFIED    = SEO_GUIDE_MODIFIED;
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

const FAQ: { q: string; a: string }[] = [
  {
    q: "כמה זמן לוקח קידום אתרים להראות תוצאות?",
    a: "תוצאות ראשונות (שיפור מיקומים) מורגשות בדרך כלל תוך 3–4 חודשים. צמיחה משמעותית בתנועה מגיעה תוך 6–12 חודשים. תחומים תחרותיים עשויים לדרוש 12–18 חודשים. מי שמתחיל מהפרופיל העסקי בגוגל ומביטויים מקומיים מתחיל מהמקום שבו התחרות קטנה יותר.",
  },
  {
    q: "מה זה Topical Authority ולמה זה חשוב ב-2026?",
    a: "Topical Authority היא הסמכות הנושאית שגוגל מייחסת לאתר בתחום מסוים. אתר שמכסה נושא לעומק (Content Clusters, Pillar Pages) מדורג גבוה יותר מאתר עם מאמרים מפוזרים. ב-2026 זה קריטי גם לציטוט ב-AI Overviews. בפשטות: עדיף להיות המומחה של נושא אחד מאשר לכתוב קצת על הכול.",
  },
  {
    q: "האם SEO עדיין רלוונטי עם AI Overviews?",
    a: "יותר מאי פעם. AI Overviews מצטטים מקורות ספציפיים — ואתרים עם Topical Authority, E-E-A-T חזק ו-Structured Data מלא מופיעים בציטוטים. זו חשיפה כפולה: גם בתוצאה האורגנית וגם ב-AI Overview. ה-AI צריך מקורות. השאלה היחידה היא אם המקור יהיה אתה או המתחרה.",
  },
  {
    q: "אפשר לעשות קידום אתרים לבד?",
    a: "כן. בעל עסק יכול לעשות לבד את רוב מה שמשפיע: פרופיל עסקי מלא בגוגל, כותרות טובות, דפי שירות שעונים על שאלות של לקוחות, וביקורות. לחלק הטכני כדאי להיעזר במי שבנה את האתר. המחיר האמיתי הוא זמן: שעתיים בשבוע, בהתמדה.",
  },
  {
    q: "מה ההבדל בין קידום אורגני (SEO) לקידום ממומן (PPC)?",
    a: "בממומן משלמים לגוגל על כל קליק. התוצאות מיידיות, ונעלמות כשמפסיקים לשלם. באורגני לא משלמים על קליקים. התוצאות נבנות בחודשים, ונשארות. הרבה עסקים משלבים: ממומן ללקוחות של היום, אורגני ללקוחות של השנה הבאה.",
  },
  {
    q: "למה האתר שלי לא מופיע בגוגל?",
    a: "שלוש סיבות נפוצות. גוגל עדיין לא מכירה את האתר: בדוק עם site: ועם Google Search Console. הדפים חסומים לסריקה בטעות, ב-noindex או ב-robots.txt. או שהאתר מופיע, אבל בעמוד חמש, כי התוכן לא עונה על מה שאנשים מחפשים.",
  },
  {
    q: "צריך לדעת לתכנת כדי לקדם אתר?",
    a: "לא. רוב העבודה היא כתיבה, סדר והתמדה: מה לכתוב, איך לקרוא לדפים ואיך לקשר ביניהם. את הסעיפים הטכניים — מהירות, Schema, הפניות — מעבירים פעם אחת למי שבנה את האתר, עם רשימה ברורה.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
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
  { id: "faq",               label: "שאלות נפוצות" },
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

const SUNDAY: React.CSSProperties = {
  ...SURFACE,
  borderInlineStart: "4px solid var(--accent)",
  fontFamily: "var(--font-body), sans-serif",
  lineHeight: 1.8,
  fontSize: "0.97rem",
  color: "var(--text)",
};

const START_HERE: React.CSSProperties = {
  ...SURFACE,
  background: "var(--accent-dim)",
  border: "1px solid var(--accent-border)",
  marginTop: 0,
};

// Like renderMixed, but brackets stay in the RTL flow (only the Latin run inside is isolated), so a
// Latin parenthetical such as "(Name, Address, Phone)" mirrors correctly and the bidi grep stays 0.
function mixedKeepBrackets(text: string): React.ReactNode {
  return text.split(/([()])/).map((part, i) => (part === "(" || part === ")" ? part : <Fragment key={i}>{renderMixed(part)}</Fragment>));
}

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
            מדריך — עודכן נובמבר 2026
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
            כל מה שבעל עסק צריך לדעת על קידום אתרים ו-SEO בעידן של <GT term="AI Overviews">AI Overviews</GT> וסמכות נושאית (<GT term="Topical Authority">Topical Authority</GT>) — בעברית של בני אדם. כל מונח מקצועי מקבל הסבר פשוט, וכל פרק נגמר במה שעושים ביום ראשון בבוקר. מדריך פרקטי לחוקי המשחק של 2026/2027.
          </p>

          <div
            style={{
              display: "flex", gap: "12px", flexWrap: "wrap",
              fontSize: "0.82rem", color: "var(--muted)",
              fontFamily: "var(--font-body), sans-serif",
            }}
          >
            <span>
              נכתב ע״י{" "}
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
              <time dateTime={MODIFIED}>נובמבר 2026</time>
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
          {/* ── Article body ── */}
          <article itemScope itemType="https://schema.org/Article">
            <meta itemProp="datePublished" content={PUBLISHED} />
            <meta itemProp="dateModified"  content={MODIFIED} />

            {/* ── Start here (aside, no heading: H2 outline unchanged) ── */}
            <aside aria-label={"יש לך עסק קטן ורק רבע שעה? התחל כאן."} style={START_HERE}>
              <p style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 800, fontSize: "1.05rem", color: "var(--text)", marginBottom: "10px" }}>
                יש לך עסק קטן ורק רבע שעה? התחל כאן.
              </p>
              <ol style={{ ...BODY, color: "var(--text)", listStyle: "decimal", paddingInlineStart: "1.4rem", marginBottom: "12px" }}>
                <li style={{ marginBottom: "6px" }}>
                  <a href="#what-is-seo" style={{ color: "var(--text)", textDecoration: "none" }}>חפש את עצמך כמו לקוח: השירות שלך והעיר שלך. איפה אתה? (2 דקות)</a>
                </li>
                <li style={{ marginBottom: "6px" }}>
                  הקלד בגוגל site: ואת כתובת האתר. גוגל מכירה את הדפים שלך? (2 דקות){" "}
                  <a href="#technical-seo" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>← Technical SEO</a>
                </li>
                <li style={{ marginBottom: "6px" }}>
                  פתח את הפרופיל העסקי שלך בגוגל. שעות, טלפון ותמונות מעודכנים? (4 דקות){" "}
                  <a href="#local-seo" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>← קידום מקומי</a>
                </li>
                <li style={{ marginBottom: "6px" }}>
                  הרץ את דף הבית ב-PageSpeed Insights, בלשונית המובייל. (2 דקות){" "}
                  <a href="#core-web-vitals" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>← Core Web Vitals</a>
                </li>
                <li>
                  תקן את ה-Title Tag של דף הבית: שירות, עיר, שם העסק. (5 דקות){" "}
                  <a href="#on-page-seo" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>← On-Page SEO</a>
                </li>
              </ol>
              <p style={{ ...BODY, marginBottom: 0 }}>
                סיימת? עכשיו קרא את המדריך לפי הסדר. כל פרק נגמר במשימה אחת ליום ראשון בבוקר.
              </p>
            </aside>

            {/* ── 1. מה זה SEO ── */}
            <section id="what-is-seo">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                מה זה קידום אתרים (SEO)?
              </h2>
              <p style={BODY}>
                <strong style={{ color: "var(--text)" }}>קידום אתרים (SEO)</strong> הוא אוסף הפעולות שמביאות את האתר שלך לראש התוצאות האורגניות של גוגל — התוצאות הרגילות, אלה שלא משלמים עליהן. בלי לשלם אגורה על קליק.
              </p>
              <p style={BODY}>
                פרסום ממומן הוא שכירות: שילמת — אתה למעלה. הפסקת לשלם — נעלמת באותו יום. SEO הוא דירה בבעלותך, <strong style={{ color: "var(--text)" }}>נכס נדל״ני דיגיטלי</strong>. עמוד שמדורג טוב היום ימשיך להביא לך פניות גם בשנה הבאה, בלי חשבונית מגוגל על כל קליק.
              </p>
              <p style={BODY}>
                תחשוב על אינסטלטור ברעננה. בעשר בלילה מישהו עם הצפה במטבח מקליד ״אינסטלטור ברעננה״. הוא לא מדפדף. הוא מתקשר לאחד משלושת הראשונים. SEO הוא העבודה שמכניסה אותך לשלושה האלה.
              </p>
              <div style={CALLOUT}>
                <strong>📌 בקצרה:</strong> SEO = להופיע ראשון כשלקוח מחפש את מה שאתה מוכר — בלי לשלם לגוגל על כל קליק.
              </div>
              <p style={BODY}>
                ב-2026 חוקי המשחק השתנו. גוגל מפעילה את מודל ה-AI שלה (Gemini) כדי להבין מה הגולש באמת מחפש, ומציגה מעל כל התוצאות תשובה מוכנה — <strong style={{ color: "var(--text)" }}>AI Overviews</strong>. התשובה הזאת נשענת על אתרים, ומצטטת אותם. SEO של היום הוא גם לדרג גבוה וגם להיות האתר שגוגל מצטטת.
              </p>
              <div style={SUNDAY}>
                <strong>☕ ביום ראשון בבוקר:</strong>{" "}פתח חלון גלישה בסתר וחפש את השירות הראשי שלך ואת העיר שלך, כמו שלקוח היה מקליד. רשום מי מופיע בשלושת המקומות הראשונים, ואיפה אתה. זו נקודת הפתיחה שלך, ואליה תחזור בעוד שלושה חודשים.
              </div>
            </section>

            {/* ── 2. איך גוגל עובד ── */}
            <section id="how-google-works">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                איך גוגל מדרג אתרים ב-2026/2027
              </h2>
              <p style={BODY}>
                גוגל מדברת על מאות גורמי דירוג. אין לך זמן למאות, וגם לא צריך. בפועל, ב-2026/2027 הכול מתנקז ל-<strong style={{ color: "var(--text)" }}>5 מערכות ליבה</strong>. תכיר אותן, ותבין כמעט כל החלטה שגוגל מקבלת על האתר שלך:
              </p>
              <ol style={{ ...BODY, paddingInlineStart: "1.4rem", marginBottom: "1.6rem" }}>
                <li style={{ marginBottom: "12px" }}>
                  <strong style={{ color: "var(--text)" }}><GT term="RankBrain">RankBrain</GT> + <GT term="BERT">BERT</GT> + <GT term="MUM">MUM</GT></strong> — מערכות ה-AI שמבינות את <em>כוונת</em> החיפוש, לא רק את המילים. מי שמקליד ״נזילה מתחת לכיור״ מחפש אינסטלטור, גם אם לא כתב את המילה. לכן כותבים בשפה של הלקוח, לא בשפה של המקצוע.
                </li>
                <li style={{ marginBottom: "12px" }}>
                  <strong style={{ color: "var(--text)" }}><GT term="Helpful Content System">Helpful Content System</GT></strong> — גוגל מעדיפה תוכן שנכתב <em>לאנשים</em>, לא למנועי חיפוש. עמוד שנכתב רק כדי לדרג, בלי לעזור לאף אחד, יורד. זה נכון במיוחד לטקסט AI שהועלה כמו שהוא, בלי ידע אמיתי מאחוריו.
                </li>
                <li style={{ marginBottom: "12px" }}>
                  <strong style={{ color: "var(--text)" }}><GT term="E-E-A-T">E-E-A-T</GT> Signals</strong> — ניסיון, מומחיות, סמכות ואמינות. גוגל בודקת מי עומד מאחורי התוכן: אדם עם שם, ותק ולקוחות, או אתר אנונימי.
                </li>
                <li style={{ marginBottom: "12px" }}>
                  <strong style={{ color: "var(--text)" }}><bdi dir="ltr">Page Experience</bdi></strong> — <bdi dir="ltr"><GT term="Core Web Vitals">Core Web Vitals</GT></bdi>, מהירות, מובייל ו-HTTPS. בעברית: האתר נטען מהר, נוח בטלפון ומאובטח.
                </li>
                <li style={{ marginBottom: "12px" }}>
                  <strong style={{ color: "var(--text)" }}>Link Authority</strong> — קישורים נכנסים מאתרים אמינים ורלוונטיים עדיין קריטיים ב-2026. כל קישור כזה הוא המלצה: אתר אחר אומר לגוגל שאפשר לסמוך עליך.
                </li>
              </ol>
              <div style={SURFACE}>
                <h3 style={{ ...HEADING, fontSize: "1.05rem", marginTop: 0 }}>
                  שינויי האלגוריתם החשובים ב-2024–2026
                </h3>
                <ul style={{ ...BODY, paddingInlineStart: "1.4rem", marginBottom: 0 }}>
                  <li style={{ marginBottom: "8px" }}><strong style={{ color: "var(--text)" }}>AI Overviews expansion</strong> — זמין ביותר מ-200 מדינות וטריטוריות, כולל בישראל ובעברית. התשובה של גוגל מופיעה היום גם ללקוחות שלך.</li>
                  <li style={{ marginBottom: "8px" }}><strong style={{ color: "var(--text)" }}>Site Reputation Abuse</strong> — ענישה על Parasite SEO: אתרים גדולים שמשכירים את השם שלהם לתוכן של אחרים. חדשות טובות לעסק קטן שכותב על התחום שלו.</li>
                  <li style={{ marginBottom: "8px" }}><strong style={{ color: "var(--text)" }}>Helpful Content integration</strong> — המערכת נמזגה לתוך ה-Core Algorithm (מרץ 2024). איכות התוכן נבדקת כל הזמן, לא רק בעדכון מיוחד.</li>
                  <li style={{ marginBottom: "8px" }}><strong style={{ color: "var(--text)" }}>Spam policies update</strong> — ענישה על AI-generated spam ועל expired domains: תוכן בייצור המוני, ודומיינים ישנים שנקנו רק בשביל המוניטין שלהם.</li>
                  <li style={{ marginBottom: "8px" }}><strong style={{ color: "var(--text)" }}>INP replaces FID</strong> — Interaction to Next Paint הפך ל-Core Web Vital רשמי (מרץ 2024). גוגל מודדת כמה מהר האתר מגיב ללחיצה.</li>
                  <li><strong style={{ color: "var(--text)" }}>FAQ rich results</strong> — מאז מאי 2026 גוגל לא מציגה שאלות ותשובות מתחת לתוצאה. השאלות והתשובות בעמוד עצמו נשארות חשובות.</li>
                </ul>
              </div>
              <div style={SUNDAY}>
                <strong>☕ ביום ראשון בבוקר:</strong>{" "}פתח את העמוד החשוב ביותר באתר שלך ושאל חמש שאלות. הוא עונה על מה שהלקוח חיפש? רואים מי עומד מאחוריו? הוא נטען מהר בטלפון? יש אתר אחר שמקשר אליו? הוא כתוב לבני אדם? כל ״לא״ הוא משימה.
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
                בלוק ה-<strong style={{ color: "var(--text)" }}>AI Overviews</strong> כבר מזמן לא ניסוי טכנולוגי. זו התשובה המוכנה שגוגל כותבת בעצמה ומציגה מעל כל התוצאות. כמה היא נפוצה? בארה״ב היא הופיעה באמצע 2026 בכ-43% מהחיפושים בגוגל, לפי <a href="https://www.advancedwebranking.com/seo/organic-ctr" target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>Advanced Web Ranking</a> (יולי 2026). בשאלות ובחיפושים של ״איך עושים״ היא מופיעה לעתים קרובות עוד יותר.
              </p>
              <p style={BODY}>
                אל תטעה: ה-AI לא <em>הורג</em> את ה-SEO, הוא הופך אותו <strong style={{ color: "var(--text)" }}>לחשוב פי כמה</strong>. גוגל לא ממציאה תשובות. היא חייבת לבסס אותן על אתרים שהיא סומכת עליהם, ומציגה אותם כמקורות. מי שמצוטט שם מקבל את המקום הכי טוב בעמוד, בחינם. מי שלא מצוטט נדחק למטה, גם אם הוא מדורג ראשון.
              </p>
              <div style={CALLOUT}>
                <strong>🤖 איך להופיע ב-AI Overviews:</strong>
                <ul style={{ marginTop: "10px", paddingInlineStart: "1.2rem" }}>
                  <li style={{ marginBottom: "6px" }}>כתוב <strong>Direct Answers</strong>: תשובה ישירה של שניים-שלושה משפטים, מיד אחרי השאלה. בלי הקדמות.</li>
                  <li style={{ marginBottom: "6px" }}>הוסף <strong>סיכום קצר (בקצרה)</strong> בתחילת כל מאמר. ה-AI אוהב לצטט משפט שעומד בפני עצמו.</li>
                  <li style={{ marginBottom: "6px" }}>הוסף לעמוד שאלות ותשובות אמיתיות, אלה שלקוחות שואלים אותך בטלפון, וסמן אותן ב-<strong>FAQ Schema</strong>. גוגל כבר לא מציגה אותן מתחת לתוצאה, אבל הסימון עדיין עוזר לה להבין את העמוד.</li>
                  <li style={{ marginBottom: "6px" }}>בנה <strong><bdi dir="ltr">Topical Authority</bdi></strong> — ה-<bdi dir="ltr">AI</bdi> מצטט מקורות שהוא מזהה כסמכותיים בנושא, לא עמוד בודד שהצליח.</li>
                  <li>חזק <strong>E-E-A-T</strong> — מחבר מומחה עם שם ופנים, ומקור לכל מספר.</li>
                </ul>
              </div>
              <p style={BODY}>
                רוצה שהעסק שלך יופיע שם?{" "}
                <Link href="/geo" style={{ color: "var(--accent)", fontWeight: 600 }}>
                  בדוק אם GEO Bot מתאים לעסק שלך
                </Link>.
              </p>
              <p style={BODY}>
                גוגל לא לבד. מנועי AI נוספים שמשפיעים על תנועה ב-2026: <strong style={{ color: "var(--text)" }}>Perplexity AI</strong> (מצטט מקורות ישירות, מביא תנועה), <strong style={{ color: "var(--text)" }}>ChatGPT Search</strong> ו-<strong style={{ color: "var(--text)" }}>Microsoft Copilot</strong>. לקוחות כבר שואלים אותם ״מי האינסטלטור הכי טוב באזור״ ו״כמה עולה טיפול שורש״. כולם מתגמלים את אותו דבר: תוכן עם Topical Authority ו-E-E-A-T. עבודה אחת, כמה מנועים.
              </p>
              <div style={SUNDAY}>
                <strong>☕ ביום ראשון בבוקר:</strong>{" "}כתוב את חמש השאלות שלקוחות שואלים אותך הכי הרבה. חפש כל אחת בגוגל, ובדוק אם מופיעה תשובת AI ומי מצוטט בה. אחר כך כתוב באתר שלך תשובה טובה יותר לכל שאלה: שניים-שלושה משפטים ישירים, ואז הפירוט.
              </div>
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
                לפני שנוגעים במקלדת, אתה חייב לדעת מה הלקוחות שלך באמת מקלידים — ומה עובר להם בראש. אתה קורא לזה ״איטום גגות ביריעות״. הלקוח מקליד ״נזילה מהתקרה מה עושים״. <strong style={{ color: "var(--text)" }}>מחקר מילות מפתח</strong> הוא הגשר בין השירות שלך לבין המילים של הלקוח.
              </p>
              <h3 style={{ ...HEADING, fontSize: "1.2rem" }}>כוונת חיפוש — ה״למה״ שמאחורי הביטוי</h3>
              <p style={BODY}>
                <strong style={{ color: "var(--text)" }}><GT term="Search Intent">כוונת חיפוש (Search Intent)</GT></strong> היא הגורם הקריטי ביותר בבחירת מילות מפתח: מה האדם רוצה שיקרה אחרי החיפוש. מקובל לחלק חיפושים לארבעה סוגים: <strong style={{ color: "var(--text)" }}>מידעי</strong> (״למה הדוד מטפטף״), <strong style={{ color: "var(--text)" }}>ניווטי</strong> (חיפוש אתר ספציפי, כמו ״כללית זימון תורים״), <strong style={{ color: "var(--text)" }}>מסחרי</strong> (השוואה לפני רכישה, כמו ״דוד שמש או דוד חשמל״) ו<strong style={{ color: "var(--text)" }}>עסקאי</strong> (מוכן לפעול עכשיו: ״טכנאי דודים בחיפה״). תוכן שלא תואם את כוונת החיפוש לא ידורג — גם אם מילת המפתח מופיעה בו עשר פעמים. למי ששואל ״למה״ נותנים הסבר. למי שמחפש טכנאי נותנים טלפון ואזור שירות.
              </p>
              <h3 style={{ ...HEADING, fontSize: "1.2rem" }}>
                Long-Tail מול ביטויי ראש
              </h3>
              <p style={BODY}>
                ביטויי Long-Tail — ארוכים וספציפיים — מביאים פחות גולשים, אבל גולשים שקרובים הרבה יותר לקנייה. על הביטוי ״קידום אתרים״ מתחרים אלפי אתרים; על ״קידום אתרים למסעדות בתל אביב״ — הרבה פחות. אותו דבר אצלך: על ״רופא שיניים״ תתחרה מול רשתות ענק. על ״השתלת שיניים ביום אחד בנתניה״ אתה יכול לנצח. אתר חדש מתחיל ב-Long-Tail, צובר שם ניצחונות, ועולה משם בהדרגה לביטויי הראש.
              </p>
              <h3 style={{ ...HEADING, fontSize: "1.2rem" }}>Keyword Clustering — ביטויים לדפים, לא דף לכל ביטוי</h3>
              <p style={BODY}>
                Keyword Clustering — קיבוץ ביטויים לפי כוונת חיפוש משותפת — מונע <GT term="Keyword Cannibalization">קניבליזציה</GT>: מצב ששני דפים שלך מתחרים זה בזה על אותו חיפוש, ושניהם מפסידים. ״מחיר ניקוי ספות״, ״כמה עולה ניקוי ספה״ ו״ניקוי ספות מחירון״ הם אותה שאלה, ולכן דף אחד. כך נבנה דף עמוק אחד, שגוגל מעדיפה על פני שלושה דפים רדודים. הכלל הפשוט: ביטויים עם אותה כוונת חיפוש שייכים לאותו דף.
              </p>
              <div style={CALLOUT}>
                <strong>🔎 לפני כל כתיבה — נתח את ה-<GT term="SERP">SERP</GT> (עמוד התוצאות):</strong>{" "}
                חפש את הביטוי שבחרת והסתכל מה גוגל מחזירה. מאמרים? דפי שירות? מפה עם עסקים? וידאו? זו התשובה של גוגל לשאלה ״מה אנשים רוצים כאן״. אם כל העמוד מלא בדפי שירות, מאמר לא ידורג שם.
              </div>
              <div style={SUNDAY}>
                <strong>☕ ביום ראשון בבוקר:</strong>{" "}רשום עשרים שאלות ובקשות ששמעת מלקוחות החודש, במילים שלהם. הקלד כל אחת בגוגל, והסתכל על ההשלמות האוטומטיות ועל ״חיפושים קשורים״ בתחתית העמוד. סמן חמישה ביטויים ארוכים שנשמעים כמו לקוח עם יד על הארנק, ותן לכל אחד דף משלו.
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
                Topical Authority — הדרך לסמכות בנישה שלך
              </h2>
              <p style={BODY}>
                <strong style={{ color: "var(--text)" }}><GT term="Topical Authority">Topical Authority</GT></strong> היא הסמכות הנושאית שגוגל מייחסת לאתר בתחום מסוים. אתר שמכסה נושא לעומק ומכל הזוויות מדורג גבוה יותר מאתר עם מאמר יחיד על אותו נושא — גם אם המאמר היחיד ״טוב יותר״. זה כמו בחיים: למי היית מתקשר על בעיית רטיבות, לשיפוצניק שעושה הכול או למי שעושה רק איטום כבר עשרים שנה? גוגל חושבת כמוך.
              </p>
              <h3 style={{ ...HEADING, fontSize: "1.2rem" }}>Content Clusters — המבנה שגוגל מעריכה</h3>
              <p style={BODY}>
                <GT term="Content Cluster">Content Cluster</GT> = <strong style={{ color: "var(--text)" }}><GT term="Pillar Page">Pillar Page</GT> מרכזי</strong>, דף אב שמכסה את הנושא כולו במבט מלמעלה, ו-<strong style={{ color: "var(--text)" }}>Cluster Pages</strong> שמכסים כל תת-נושא לעומק. כל הדפים מקושרים זה לזה עם <GT term="Internal Linking">Internal Links</GT> (קישורים פנימיים). תחשוב על ספר: דף האב הוא תוכן העניינים, וכל דף משנה הוא פרק.
              </p>
              <div style={SURFACE}>
                <h4 style={{ ...HEADING, fontSize: "0.95rem", marginTop: 0, marginBottom: "12px" }}>
                  דוגמה — Cluster לנושא ״קידום אתרים״:
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
              <div style={SURFACE}>
                <h4 style={{ ...HEADING, fontSize: "0.95rem", marginTop: 0, marginBottom: "12px" }}>
                  דוגמה — Cluster למרפאת שיניים ברחובות:
                </h4>
                <ul style={{ ...BODY, paddingInlineStart: "1.2rem", marginBottom: 0, fontSize: "0.92rem" }}>
                  <li style={{ marginBottom: "6px" }}>🏛️ <strong style={{ color: "var(--text)" }}>Pillar:</strong> השתלות שיניים ברחובות — המדריך המלא למטופל</li>
                  <li style={{ marginBottom: "6px" }}>📄 Cluster: כמה עולה השתלת שיניים, וממה המחיר מורכב</li>
                  <li style={{ marginBottom: "6px" }}>📄 Cluster: השתלה ביום אחד — למי זה מתאים</li>
                  <li style={{ marginBottom: "6px" }}>📄 Cluster: כאבים אחרי השתלה — מה תקין ומתי מתקשרים</li>
                  <li style={{ marginBottom: "6px" }}>📄 Cluster: השתלה או גשר — איך בוחרים</li>
                  <li>📄 Cluster: כמה זמן מחזיק שתל, ואיך שומרים עליו</li>
                </ul>
              </div>
              <p style={BODY}>
                בניית Topical Authority דורשת זמן — בדרך כלל 6–12 חודשים עד שרואים השפעה משמעותית. אבל ברגע שגוגל מזהה אותך כסמכות בנישה, הדירוגים יציבים ועמידים הרבה יותר לשינויי אלגוריתם. ויש כאן יתרון לעסק קטן: אתה לא צריך להיות הסמכות של האינטרנט. מספיק להיות הסמכות של התחום שלך, בעיר שלך.
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
              <div style={SUNDAY}>
                <strong>☕ ביום ראשון בבוקר:</strong>{" "}בחר שירות אחד, זה שמביא לך הכי הרבה כסף. כתוב לו דף אב אחד, ועוד חמישה דפים קצרים שכל אחד עונה על שאלה אחת של לקוחות: כמה זה עולה, כמה זמן זה לוקח, איך בוחרים, מה יכול להשתבש, ומה עושים אחרי. קשר את כולם לדף האב, וממנו אליהם. זה ה-Cluster הראשון שלך.
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
                Technical SEO הוא כל הפעולות הטכניות שמאפשרות לגוגל לסרוק, להבין ולהציג את האתר שלך כמו שצריך. זו הצנרת בתוך הקיר: אף לקוח לא רואה אותה, אבל כשהיא סתומה שום דבר לא זורם. תוכן מעולה באתר שגוגל לא מצליחה לקרוא הוא שלט יפה בחדר נעול. רוב הסעיפים כאן הם עבודה של מי שבנה לך את האתר. התפקיד שלך הוא לדעת מה לבקש ממנו.
              </p>
              <h3 style={{ ...HEADING, fontSize: "1.2rem" }}>רשימת ה-Technical SEO החיוניים ב-2026</h3>
              <div className="content-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "1.6rem" }}>
                {[
                  ["✅ Crawlability", "robots.txt, sitemap.xml, Crawl Budget — גוגל מצליחה להיכנס לכל דף שחשוב לך"],
                  ["✅ Indexability", "Canonical, noindex, hreflang — הדפים הנכונים נכנסים לאינדקס, והמיותרים נשארים בחוץ"],
                  ["✅ Mobile-First", "Responsive design — גוגל שופטת את האתר לפי הגרסה בטלפון"],
                  ["✅ HTTPS", "SSL, Mixed Content, Redirects נכונים — מנעול ליד הכתובת, בכל דף"],
                  ["✅ Core Web Vitals", "LCP, CLS, INP — ירוק בכולם. נטען מהר, לא קופץ, מגיב מיד"],
                  ["✅ Structured Data", "Schema.org JSON-LD לכל סוג דף — תוויות שמסבירות לגוגל מה יש בעמוד"],
                  ["✅ Site Architecture", "URL Structure נקי, Internal Linking — כל דף חשוב במרחק של עד שלוש לחיצות מדף הבית"],
                  ["✅ Duplicate Content", "Canonical Tags, Parameter Handling — אותו תוכן לא מופיע בשתי כתובות"],
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
                כלים מומלצים לבדיקת Technical SEO: <GT term="Google Search Console">Google Search Console</GT> (חינם, הכי מדויק — גוגל עצמה מספרת לך מה היא רואה באתר), <strong style={{ color: "var(--text)" }}>Screaming Frog</strong> לסריקת אתר מלאה, ו-<strong style={{ color: "var(--text)" }}>PageSpeed Insights</strong> ל-Core Web Vitals. לעסק קטן, הראשון והשלישי מספיקים כדי להתחיל.
              </p>
              <div style={SUNDAY}>
                <strong>☕ ביום ראשון בבוקר:</strong>{" "}הקלד בגוגל site: ומיד אחריו את כתובת האתר שלך, בלי רווח. דפים חשובים לא מופיעים? גוגל לא מכירה אותם. אחר כך פתח Google Search Console (חינם), אמת בעלות על האתר, והגש את מפת האתר (sitemap.xml). לא יודע איך? שלח את השורות האלה למי שבנה לך את האתר.
              </div>
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
                On-Page SEO הוא כל מה שבשליטה שלך בתוך הדף עצמו: כותרות, תוכן, URL, מטא תגים ו-Schema. זה החלק הכי משתלם לבעל עסק, כי לא צריך בשבילו מתכנת, תקציב או אישור מאף אחד. רק לשבת ולתקן.
              </p>
              {[
                {
                  title: "Title Tag — הכותרת ב-Google",
                  content: "זו השורה הכחולה שהלקוח רואה בגוגל, והשלט מעל החנות שלך. עד 60 תווים בערך, אחרת גוגל חותכת. מילת המפתח הראשית בהתחלה, שם העסק בסוף. ״אינסטלטור ברעננה — זמין 24/7 | אבי אינסטלציה״ עובד. ״דף הבית״ לא. כותרת טובה מעלה את ה-CTR, שיעור ההקלקה, ומביאה יותר לקוחות מאותו מיקום.",
                },
                {
                  title: "Meta Description",
                  content: "שתי השורות האפורות מתחת לכותרת. עד 155 תווים בערך. זה לא גורם דירוג ישיר, אבל זה מה שמשכנע ללחוץ, ולכן משפיע על ה-CTR. כתוב מה הלקוח מקבל ומה הצעד הבא (CTA): ״מגיעים תוך שעה לכל השרון. מחיר סגור לפני שמתחילים. התקשר עכשיו.״ גוגל לפעמים מחליפה את התיאור בטקסט משלה — ועדיין שווה לכתוב גרסה מדויקת.",
                },
                {
                  title: "H1 — הכותרת הראשית",
                  content: "הכותרת הגדולה בראש הדף. H1 אחד בלבד לכל דף, עם מילת המפתח הראשית. H2 ו-H3 הן כותרות המשנה. המבחן פשוט: מי שקורא רק את הכותרות צריך להבין על מה הדף. אם הוא מבין, גם גוגל מבינה.",
                },
                {
                  title: "URL Structure",
                  content: "הכתובת של הדף. URL קצר, תיאורי, עם מילת המפתח. מספרים: רע (/p=123). מילים תיאוריות: טוב (/seo-guide). בלי תווים מיוחדים ובלי קיצורים שרק אתה מבין. וכלל ברזל: URL שכבר מדורג לא משנים. אם חייבים, רק עם Redirect 301.",
                },
                {
                  title: "Content Depth & Length",
                  content: "אין אורך מושלם. יש שאלה אחת: הלקוח קיבל תשובה מלאה, או שהוא צריך לחזור לגוגל? תוכן שמכסה נושא לעומק מנצח תוכן שטחי. הנוסחה פשוטה: בדוק מה יש בדפים שמדורגים מעליך, מצא מה חסר בהם, וכתוב את הדף המקיף והטוב ביותר על הנושא. יש לך יתרון שאין לאף כותב תוכן: אתה מכיר את העבודה מבפנים.",
                },
                {
                  title: "Internal Linking",
                  content: "קשר דפים רלוונטיים זה לזה עם Anchor Text תיאורי, הטקסט שעליו לוחצים: ״מחירון ניקוי ספות״ ולא ״לחץ כאן״. Internal Links מחלקים PageRank, כלומר מעבירים כוח מהדפים החזקים לחלשים. הם עוזרים לגוגל להבין את מבנה האתר, ומשאירים את הלקוח אצלך עוד דף אחד.",
                },
                {
                  title: "Image SEO — תמונות ו-Alt Text",
                  content: "גוגל לא רואה תמונות, היא קוראת עליהן. תן לקובץ שם שמתאר מה בתמונה, וכתוב Alt Text — משפט קצר שמתאר אותה: ״החלפת דוד שמש על גג בפתח תקווה״. כווץ את התמונה לפני שאתה מעלה אותה. ותמונות אמיתיות מהעבודה שלך עדיפות על תמונות מאגר.",
                },
              ].map((item) => (
                <div key={item.title} style={SURFACE}>
                  <h3 style={{ ...HEADING, fontSize: "1rem", marginTop: 0 }}>{item.title}</h3>
                  <p style={{ ...BODY, marginBottom: 0, fontSize: "0.95rem" }}>{item.content}</p>
                </div>
              ))}
              <div style={SUNDAY}>
                <strong>☕ ביום ראשון בבוקר:</strong>{" "}בחר את שלושת הדפים שמביאים לך הכי הרבה כסף. לכל אחד כתוב Title Tag חדש עם השירות ועם העיר, Meta Description עם סיבה ללחוץ, ו-H1 אחד ברור. הוסף מכל דף שני קישורים פנימיים לדפים קרובים. שעה אחת, שלושה דפים.
              </div>
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
                <strong style={{ color: "var(--text)" }}>E-E-A-T</strong> (Experience, Expertise, Authoritativeness, Trustworthiness) הוא המסגרת שגוגל משתמשת בה כדי להעריך איכות תוכן: ניסיון, מומחיות, סמכות ואמינות. במילים פשוטות, גוגל שואלת את מה שכל לקוח שואל: מי אתה, ולמה שאסמוך עליך? זה חשוב כפליים בנושאי <GT term="YMYL">YMYL</GT> (Your Money or Your Life) — בריאות, כסף, משפט ובטיחות. מרפאה, רואה חשבון וחשמלאי נמדדים כאן בסרגל מחמיר יותר מבלוג מתכונים.
              </p>
              <p style={BODY}>
                ה-E הראשונה, <strong style={{ color: "var(--text)" }}>Experience</strong> (ניסיון), נוספה ב-2022 כדי להדגיש ניסיון אישי ומעשי — לא רק מומחיות תיאורטית. גוגל מחפשת ראיות שהמחבר עשה את הדבר בעצמו, לא רק כתב עליו. וכאן בעל המקצוע מנצח כל כותב תוכן: את השיפוץ הזה אתה עשית, ויש לך תמונות.
              </p>
              <h3 style={{ ...HEADING, fontSize: "1.2rem" }}>איך בונים E-E-A-T חזק:</h3>
              <ul style={{ ...BODY, paddingInlineStart: "1.4rem" }}>
                <li style={{ marginBottom: "10px" }}><strong style={{ color: "var(--text)" }}>Author Pages:</strong> דף מחבר עם ביוגרפיה, תפקיד, ניסיון ותמונה. אצל עסק קטן זה אתה: שם מלא, ותק, רישיון או תעודה, ותמונה אמיתית שלך.</li>
                <li style={{ marginBottom: "10px" }}><strong style={{ color: "var(--text)" }}>Entity Reconciliation:</strong> sameAs links ל-LinkedIn, AskPavel, Wikipedia. בעברית: קישורים מהאתר לפרופילים שלך ברשת, כדי שגוגל תבין שכל אלה הם אותו אדם ואותו עסק.</li>
                <li style={{ marginBottom: "10px" }}><strong style={{ color: "var(--text)" }}>Citations & Sources:</strong> קישורים למקורות אמינים, מחקרים ונתונים. כתבת מספר? תראה מאיפה הוא.</li>
                <li style={{ marginBottom: "10px" }}><strong style={{ color: "var(--text)" }}>Reviews & Testimonials:</strong> Google Reviews, Trustpilot, עדויות לקוחות. ביקורות אמיתיות בגוגל הן ההוכחה הכי חזקה שיש לעסק מקומי.</li>
                <li style={{ marginBottom: "10px" }}><strong style={{ color: "var(--text)" }}>Press Mentions:</strong> ציטוטים ומאמרים בפרסומים ידועים. גם כתבה במקומון או אזכור באתר של איגוד מקצועי נחשבים.</li>
                <li><strong style={{ color: "var(--text)" }}>About Page חזק:</strong> תאריך הקמה, צוות, שליחות, כתובת, טלפון. עסק שלא מסתתר.</li>
              </ul>
              <div style={CALLOUT}>
                <strong>🔑 E-E-A-T ב-2026:</strong> כשכל אחד יכול לייצר AI Content בלחיצה, גוגל מחפשת ראיות לניסיון אנושי אמיתי. ״החלפתי 50 דודים כאלה, וזה מה שמתקלקל בהם״ חזק יותר מ״מחקרים מראים ש…״. את המשפט הראשון AI לא יכול לכתוב. אתה כן.
              </div>
              <div style={SUNDAY}>
                <strong>☕ ביום ראשון בבוקר:</strong>{" "}עדכן את דף ״אודות״: שם מלא, תמונה שלך, שנת הקמה, רישיון או הסמכה, כתובת וטלפון. הוסף לדף שירות אחד שלוש תמונות מעבודה אמיתית, עם שורה על מה שנעשה שם. ושלח לשלושה לקוחות מרוצים קישור לכתיבת ביקורת בגוגל.
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
                קישורים נכנסים (<GT term="Backlinks">Backlinks</GT>) הם עדיין אחד מגורמי הדירוג החזקים ביותר. קישור מאתר אחר הוא המלצה: מישהו אומר לגוגל ״על העסק הזה אפשר לסמוך״. וכמו בהמלצות, חשוב מי ממליץ. ב-2026, <strong style={{ color: "var(--text)" }}>איכות &gt;&gt; כמות</strong>. 10 קישורים מאתרים רלוונטיים ואמינים שווים יותר מ-1,000 קישורים מספאם. קישור אחד מאתר העירייה או מאיגוד מקצועי שווה יותר מערימת קישורים מאתרים שאף אחד לא קורא.
              </p>
              <h3 style={{ ...HEADING, fontSize: "1.2rem" }}>שיטות Link Building שעובדות ב-2026:</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "1.6rem" }}>
                {[
                  { method: "Digital PR", desc: "יצירת תוכן ראוי-ציטוט (מחקרים, סקרים, נתונים ייחודיים) שעיתונאים ומדיה מקשרים אליו. לעסק קטן: נתון שרק לך יש. מוסך שמפרסם את עשר התקלות הנפוצות שראה השנה נותן למקומון סיבה לכתוב עליו." },
                  { method: "Guest Posting אסטרטגי", desc: "מאמרי אורח באתרים מוכרים בנישה שלך — עם ביוגרפיה ו-Anchor Text נכון. פיזיותרפיסט שכותב טור באתר של מועדון ריצה מקבל גם קישור וגם מטופלים." },
                  { method: "Resource Link Building", desc: "יצירת דף משאבים שאתרים אחרים ירצו לקשר אליו: כלים, מדריכים מקיפים, סטטיסטיקות. מחשבון, מחירון שקוף או צ׳קליסט להורדה. דף כזה מושך קישורים שנים." },
                  { method: "HARO", desc: "מענה לשאלות של עיתונאים וקבלת ציטוט עם קישור מכלי תקשורת גדולים. השירות פועל בעיקר באנגלית. הגרסה הישראלית: להיות בעל המקצוע שהכתב של המקומון מתקשר אליו כשהוא צריך ציטוט." },
                  { method: "Broken Link Building", desc: "מציאת קישורים שבורים באתרי נישה והצעת תוכן חלופי לבעל האתר. אתה עוזר לו לתקן תקלה, והוא מקשר אליך." },
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
                <strong style={{ color: "var(--text)" }}>להימנע:</strong> קניית קישורים, Link Farms, <GT term="PBNs">PBNs</GT> וחילופי קישורים (Link Exchanges) מסיביים. SpamBrain, מערכת הספאם הנוכחית של גוגל, נבנתה כדי לזהות בדיוק את הדפוסים האלה — ועונש יכול למחוק שנים של עבודה. <GT term="Penguin">Penguin</GT> הוותיק? נטמע באלגוריתם הליבה כבר ב-2016. מישהו מציע לך ״חבילת 500 קישורים״ במחיר מבצע? תברח.
              </p>
              <div style={SUNDAY}>
                <strong>☕ ביום ראשון בבוקר:</strong>{" "}רשום חמישה גופים שכבר מכירים אותך: ספק, יבואן, איגוד מקצועי, לשכת המסחר, לקוח עסקי עם אתר. בקש מכל אחד קישור לאתר שלך מדף ״שותפים״, ״נותני שירות מורשים״ או ״לקוחות ממליצים״. טלפון אחד לכל אחד. אלה הקישורים הכי קלים והכי אמיתיים שתשיג.
              </div>
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
                Core Web Vitals הם מדדי חוויית המשתמש שגוגל כוללת כגורמי דירוג רשמיים. שלושה מספרים שעונים על שלוש שאלות: כמה מהר רואים את הדף, האם הוא קופץ בזמן הטעינה, וכמה מהר הוא מגיב ללחיצה. ב-2024 <strong style={{ color: "var(--text)" }}><GT term="INP">INP (Interaction to Next Paint)</GT></strong> החליף את <GT term="FID">FID</GT> כמדד השלישי. ולמה זה מעניין אותך? כי לקוח שמחכה לאתר שלך בטלפון לא מחכה הרבה. המתחרה נמצא במרחק לחיצה אחת אחורה.
              </p>
              <div className="content-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "1.6rem" }}>
                {[
                  { metric: "LCP", full: "Largest Contentful Paint", good: "≤ 2.5s", desc: "תוך כמה זמן רואים את החלק המרכזי של הדף, בדרך כלל התמונה הראשית" },
                  { metric: "CLS", full: "Cumulative Layout Shift", good: "≤ 0.1", desc: "האם הדף קופץ בזמן הטעינה? רצית ללחוץ על ״התקשר״ והכפתור ברח" },
                  { metric: "INP", full: "Interaction to Next Paint", good: "≤ 200ms", desc: "לחצת על כפתור. כמה זמן עובר עד שהאתר מגיב?" },
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
                לשיפור Core Web Vitals: אתרים שנבנו ב-<GT term="Next.js">Next.js</GT> מקבלים ציונים ירוקים כמעט מחוץ לקופסה — Image Optimization, Lazy Loading, SSG/SSR. האתר שלך על WordPress או Wix? אפשר להגיע לירוק גם שם. שני האשמים הרגילים הם תמונות כבדות ותוספים (פלאגינים) מיותרים. תמונה שצולמה בטלפון ועלתה לאתר כמו שהיא שוקלת הרבה יותר ממה שצריך.
              </p>
              <div style={SUNDAY}>
                <strong>☕ ביום ראשון בבוקר:</strong>{" "}היכנס ל-PageSpeed Insights (חינם), הדבק את כתובת דף הבית ובדוק את לשונית המובייל. אדום או כתום? צלם את המסך ושלח למי שבנה את האתר, עם שתי בקשות: לכווץ את התמונות ולהסיר תוספים שלא בשימוש. משם מתחילים.
              </div>
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
                קידום מקומי — להופיע בחיפוש ״קרוב אליי״
              </h2>
              <p style={BODY}>
                אם יש לך עסק עם כתובת או אזור שירות — מסעדה, קליניקה, חנות, נותן שירות — זה הפרק הכי חשוב במדריך. <strong style={{ color: "var(--text)" }}><GT term="Local SEO">קידום מקומי</GT></strong> (Local SEO) הוא לרוב ערוץ ה-ROI הגבוה ביותר, כלומר הכי הרבה לקוחות על כל שקל ושעה שהשקעת. חיפושים כמו ״אינסטלטור בתל אביב״ או ״טיפולי שיניים קרוב אליי״ הם עסקאיים במהותם: מי שמקליד אותם לא עושה מחקר. הוא רוצה להתקשר למישהו עכשיו. בחיפושים האלה גוגל מציגה קודם כול מפה עם שלושה עסקים, ה-Local Pack. שם אתה רוצה להיות.
              </p>
              <div className="content-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "1.6rem" }}>
                {[
                  {
                    id: "gbp",
                    title: "Google Business Profile",
                    desc: "הפרופיל העסקי שמופיע בתיבת המפה ובחיפושים מקומיים. הוא חינמי, ולעסק מקומי הוא חשוב לא פחות מהאתר. מלא אותו עד הסוף: קטגוריה ראשית מדויקת, שעות פתיחה כולל חגים, טלפון, אתר ותמונות אמיתיות מהעבודה. ובקש ביקורת מכל לקוח מרוצה, כשהעבודה עוד טרייה.",
                  },
                  {
                    id: "nap",
                    title: <><GT term="NAP">עקביות NAP</GT></>,
                    desc: "שם, כתובת וטלפון (Name, Address, Phone) חייבים להיות זהים בכל הרשת: אתר, Google Business Profile, Facebook ודפי עסקים. באתר כתוב ״אבי אינסטלציה״, בפייסבוק ״א.ב. אינסטלציה ושיפוצים״, ובאינדקס ישן מופיע טלפון שהחלפת מזמן? גוגל לא בטוחה שזה אותו עסק, והדירוג המקומי נפגע.",
                  },
                ].map((item) => (
                  <div key={item.id} style={SURFACE}>
                    <h3 style={{ ...HEADING, fontSize: "1rem", marginTop: 0 }}>{item.title}</h3>
                    <p style={{ ...BODY, marginBottom: 0, fontSize: "0.95rem" }}>{mixedKeepBrackets(item.desc)}</p>
                  </div>
                ))}
              </div>
              <div style={SUNDAY}>
                <strong>☕ ביום ראשון בבוקר:</strong>{" "}חפש את שם העסק שלך בגוגל והסתכל על הפרופיל כמו לקוח. השעות נכונות? הטלפון נכון? יש תמונות מהחודשים האחרונים? תקן מה שחסר, העלה שלוש תמונות חדשות מהטלפון, ושלח לשני לקוחות מרוצים קישור לביקורת. חצי שעה.
              </div>
              <p style={BODY}>
                רוצה לדעת מה חסר בפרופיל שלך?{" "}
                <Link href="/site-bot/audit" style={{ color: "var(--accent)", fontWeight: 600 }}>
                  הבדיקה החינמית שלנו עוברת עליו בדקה.
                </Link>
              </p>
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
                SEO בלי מדידה הוא ירייה באפלה: אתה משקיע שעות ולא יודע מה עבד. ארבעה כלים חיוניים שכל מי שעוסק ב-SEO צריך להכיר — ולעסק קטן, הראשון מספיק כדי להתחיל:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "1.6rem" }}>
                {[
                  {
                    tool: "Google Search Console",
                    desc: "הכלי הרשמי של גוגל — חינם ומדויק יותר מכל כלי אחר. הוא מראה אילו דפים מאונדקסים (נמצאים במאגר של גוגל), על אילו ביטויים אתה מופיע, מה שיעור ההקלקה (CTR) ואילו שגיאות סריקה יש. הראשון שפותחים בכל פרויקט SEO. אם תפתח רק כלי אחד, שיהיה זה.",
                  },
                  {
                    tool: "Rank Tracking",
                    desc: "מעקב אחר המיקום של מילות המפתח לאורך זמן. כלים כמו Semrush, Ahrefs ו-SERPWatch מראים את התנועה בדירוג. מודדים מגמה של שבועות, לא תנודות של יום. ירדת מקום אחד ביום שלישי? זה רעש. ירדת חמישה מקומות בחודש? זה סימן.",
                  },
                  {
                    tool: "SEO Audit",
                    desc: "ביקורת תקופתית של האתר: בעיות טכניות, פערי תוכן, קניבליזציה וקישורים שבורים. כמו טסט לרכב. עושים אחת לרבעון, ואחרי כל עדכון ליבה (Core Update) משמעותי של גוגל.",
                  },
                  {
                    tool: "Competitive Analysis",
                    desc: "ניתוח מתחרי ה-SEO שלך — לא בהכרח המתחרים העסקיים. המתחרה שלך בגוגל הוא מי שמדורג מעליך, גם אם זה אינדקס ארצי ולא העסק ממול. מה הוא כתב שאתה לא? מי מקשר אליו? התשובות הן תוכנית העבודה שלך.",
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
              <div style={SUNDAY}>
                <strong>☕ ביום ראשון בבוקר:</strong>{" "}פתח Google Search Console, לשונית ״ביצועים״, שלושה חודשים אחורה. חפש ביטויים שבהם אתה במיקום 5 עד 15 עם הרבה חשיפות. אלה הלקוחות שכמעט הגיעו אליך. חזק את הדפים האלה קודם: כותרת טובה יותר, תשובה מלאה יותר, קישור פנימי נוסף. ושים תזכורת ביומן לבדוק שוב בעוד חודש.
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
                SEO הוא <strong style={{ color: "var(--text)" }}>ריצת מרתון</strong>, לא ספרינט. מי שמבטיח לך מקום ראשון תוך חודש מוכר לך משהו אחר. אבל מי שמתמיד בונה נכס שלמתחרים קשה לקחת ממנו. אלה ציפיות ריאליות לפי שלבים:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "1.6rem" }}>
                {[
                  { period: "חודשים 1–3", label: "איסוף מידע", color: "var(--muted)", desc: "גוגל סורקת ומאנדקסת את השינויים. בחוץ עוד לא רואים כלום, וזה תקין. ייתכנו תנודות, ואתר חדש לפעמים מחכה בצד (מקדמי אתרים קוראים לזה Sandbox Effect). מתמקדים ב-Technical SEO וב-Content. בשלב הזה רוב האנשים מתייאשים. אל תהיה אחד מהם." },
                  { period: "חודשים 3–6", label: "תנועה ראשונה", color: "#f59e0b", desc: "שיפור ראשון במיקומים למילות מפתח ארוכות (Long-Tail). עלייה ב-Impressions (חשיפות) ב-Search Console. הטלפון עוד לא מצלצל יותר, אבל הגרף כבר זז." },
                  { period: "חודשים 6–12", label: "צמיחה משמעותית", color: "#10b981", desc: "עלייה ב-Organic Traffic, התנועה שמגיעה מגוגל בלי תשלום. מילות מפתח תחרותיות מתחילות לעלות. מגיעים הלידים האורגניים הראשונים: לקוח שאומר ״מצאתי אותך בגוגל״." },
                  { period: "שנה 1–2", label: "Topical Authority מלאה", color: "var(--accent)", desc: "דירוגים יציבים, תנועה צומחת, Topical Authority מוכר. ROI מלא על השקעת ה-SEO: העבודה של השנה שעברה ממשיכה להביא לקוחות." },
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
              <div style={SUNDAY}>
                <strong>☕ ביום ראשון בבוקר:</strong>{" "}קבע ביומן שעתיים קבועות בשבוע ל-SEO, ותתייחס אליהן כמו לפגישה עם לקוח. רשום היום שלושה מספרים: כמה פניות הגיעו מגוגל החודש, כמה חשיפות יש לך ב-Search Console, ובאיזה מקום אתה בביטוי הראשי שלך. בדוק אותם שוב כל חודש. בלי המספרים האלה לא תדע אם אתה מתקדם.
              </div>
            </section>

            {/* ── 11. Mistakes ── */}
            <section id="mistakes">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                10 טעויות SEO נפוצות שפוגעות בדירוג ב-2026
              </h2>
              <ol style={{ ...BODY, paddingInlineStart: "1.4rem" }}>
                {[
                  ["תוכן AI-Only ללא ניסיון אנושי", "ביקשת מ-ChatGPT עשרה מאמרים והעלית אותם כמו שהם? גוגל מורידה תוכן שטחי שנכתב רק כדי לדרג. AI + הניסיון שלך = עובד. AI בלבד = נפילה. תן ל-AI לנסח, ואת הידע תביא אתה."],
                  ["זניחת ה-Technical SEO", "תוכן מצוין באתר עם Crawl Issues (בעיות סריקה) הוא בזבוז: גוגל לא יכולה לדרג מה שהיא לא מצליחה לקרוא. Technical הוא הבסיס."],
                  ["Keyword Stuffing — עדיין קיים", "לדחוף ״אינסטלטור בחיפה״ עשרים פעמים לאותו דף לא עובד כבר שנים. זה פוגע בדירוג ומבריח את הלקוח. כתוב כמו שאתה מדבר."],
                  ["קניית קישורים", "SpamBrain, מערכת הספאם הנוכחית של גוגל, נבנתה כדי לזהות קישורים קנויים. רק קישורים אמיתיים ורלוונטיים בונים סמכות. חסכת זמן, סיכנת את האתר."],
                  ["זניחת ה-Mobile-First", "יותר מחצי מהגלישה בישראל היא מהטלפון (Statcounter, 2026). גוגל מאנדקסת Mobile-First: היא שופטת את האתר לפי הגרסה בנייד. אתר שלא נוח בטלפון מפסיד פעמיים — בדירוג ואצל הלקוח."],
                  ["חוסר ב-E-E-A-T", "תוכן בלי מחבר מזוהה, בלי ביוגרפיה ובלי מקורות = דירוג נמוך, במיוחד בנושאי YMYL. אתר בלי שם ובלי פנים נראה לגוגל כמו עסק בלי שלט."],
                  ["זניחת ה-Internal Linking", "Internal Links מחלקים PageRank ועוזרים לגוגל להבין את מבנה האתר. דף שאף דף אחר לא מקשר אליו הוא חדר בלי דלת."],
                  ["Core Web Vitals אדומים", "דף שנטען ב-5 שניות ויותר מפסיד גם דירוג וגם לקוחות. אף אחד לא מחכה לאתר של אינסטלטור כשהמים כבר על הרצפה."],
                  ["תוכן ללא עדכון", "גוגל מתגמלת תוכן עדכני. עדכן מאמרים ישנים: תאריך, נתונים, מחירים, ותשובה ישירה בראש הדף בשביל ה-AI Overviews. מחירון של 2022 באתר אומר ללקוח שאף אחד לא בבית."],
                  ["מדידת ה-KPIs הלא נכונים", "דירוג גבוה ≠ הצלחה. מקום ראשון בביטוי שאף אחד לא מחפש לא משלם משכורות. מדוד: תנועה אורגנית, לידים מ-SEO, Revenue (הכנסות) — לא רק מיקום."],
                ].map(([title, desc], i) => (
                  <li key={title} style={{ marginBottom: "14px" }}>
                    <strong style={{ color: "var(--text)" }}>{i + 1}. {title}</strong>
                    {" "}<span style={{ color: "var(--muted)", fontSize: "0.95rem" }}>{desc}</span>
                  </li>
                ))}
              </ol>
              <div style={SUNDAY}>
                <strong>☕ ביום ראשון בבוקר:</strong>{" "}עבור על הרשימה וסמן בכנות אילו טעויות קיימות אצלך. בחר שתיים בלבד, ותקן אותן החודש. שתיים שתוקנו שוות יותר מעשר שסומנו.
              </div>
            </section>

            {/* ── 15. FAQ (visible; same strings as faqSchema) ── */}
            <section id="faq">
              <h2 style={{ ...HEADING, fontSize: "clamp(1.5rem,2.5vw,2rem)" }}>
                שאלות נפוצות על קידום אתרים
              </h2>
              {FAQ.map(({ q, a }) => (
                <div key={q} style={SURFACE}>
                  <h3 style={{ ...HEADING, fontSize: "1.05rem", marginTop: 0 }}>{q}</h3>
                  <p style={{ ...BODY, marginBottom: 0, fontSize: "0.95rem" }}>{a}</p>
                </div>
              ))}
            </section>

            {/* ── Author bio ── */}
            <section
              style={{ marginTop: "3rem" }}
              aria-label="הסמכות המקצועית"
              itemScope
              itemType="https://schema.org/Person"
            >
              <div className="author-bio">
                <meta itemProp="image" content="https://www.wao.co.il/eitan-yariv.avif" />
                <div className="author-avatar" role="img" aria-label="איתן יריב" />
                <div className="author-meta">
                  <div className="author-name" itemProp="name">{AUTHOR_NAME}</div>
                  <div className="author-title" itemProp="jobTitle">
                {renderMixed("מייסד WAO | מומחה SEO ושיווק דיגיטלי מאז 2006")}
              </div>
                  <p className="author-text" itemProp="description">
                    מלווה עסקים ישראלים בצמיחה דיגיטלית מאז ראשית ימי ה-SEO בארץ.
                    מדריך זה מבוסס על 20 שנות עבודה מעשית עם 84 לקוחות, מאז 2006 —
                    מימי האינדקסים הראשונים ועד לעידן ה-AI Overviews.
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
                <time dateTime={MODIFIED}>עודכן לאחרונה: נובמבר 2026</time>
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
                  {KNOWLEDGE_ARTICLES.length} מדריכים ב<Link href="/knowledge" style={{ color: "var(--accent)", textDecoration: "none" }}>מאגר הידע</Link> שלנו
                </p>
                <p style={{ fontFamily: "var(--font-body), sans-serif", fontSize: "0.82rem", color: "var(--muted)", margin: 0 }}>
                  נתקעת על מונח? כל נושא מהמדריך — robots.txt, Core Web Vitals, E-E-A-T, hreflang ועוד — מוסבר שם לעומק, בעמוד משלו.
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
                <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.4rem,2.8vw,2.2rem)", lineHeight: 1.15, marginBottom: "12px" }}>
                  רוצה לדעת איפה אתה עומד בגוגל?
                  <br />
                  <span className="text-gradient">בדיקת נוכחות בגוגל — חינם, בערך דקה</span>
                </h2>
                <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "28px", fontSize: "0.97rem", lineHeight: 1.7 }}>
                  קראת את המדריך, ועכשיו אתה יודע מה צריך לקרות. נשאר לראות מה מזה כבר קורה אצלך. הבדיקה עוברת על פרופיל העסק שלך בגוגל ועל האתר, ומראה לך מה חסר. אין לך זמן לתקן לבד? בשביל זה יש שירות קידום אתרים.
                </p>
                <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
                  <TrackedLink href="/site-bot/audit" event="seo_guide_banner_audit_click" className="btn-primary" style={{ fontSize: "1rem" }}>
                    לבדיקה החינמית ←
                  </TrackedLink>
                  <TrackedLink href="/seo" event="seo_guide_banner_seo_click" className="btn-outline" style={{ fontSize: "1rem" }}>
                    שירות קידום אתרים ←
                  </TrackedLink>
                </div>
              </div>
            </div>
          </article>

          {/* ── Sticky TOC ── maxHeight: TOC (15 items) + CTA box is ~750px tall and overflowed a 1280x720 viewport,
              so the aside scrolls inside itself. Not tied to the item count. */}
          <aside
            style={{ position: "sticky", top: "90px", maxHeight: "calc(100vh - 106px)", overflowY: "auto" }}
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
                איפה אתה עומד בגוגל?
              </p>
              <p style={{ fontFamily: "var(--font-body), sans-serif", fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "14px" }}>
                בדיקה חינמית של פרופיל העסק והאתר. בערך דקה, ורואים מה חסר.
              </p>
              <TrackedLink href="/site-bot/audit" event="seo_guide_side_audit_click" className="btn-primary" style={{ fontSize: "0.85rem", padding: "10px 16px", width: "100%", justifyContent: "center" }}>
                בדוק עכשיו ←
              </TrackedLink>
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
