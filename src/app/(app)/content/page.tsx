import type { Metadata } from "next";
import Link from "next/link";
import GT from "@/components/GlossaryTerm";

const CANONICAL = "https://www.wao.co.il/content";

export const metadata: Metadata = {
  title: "שיווק תוכן מקצועי — תוכן שמביא לקוחות | WAO",
  description:
    "שיווק תוכן שמביא לקוחות אורגניים: מחקר, כתיבה מקצועית ואופטימיזציה לגוגל ולסיכומי AI. WAO — 20+ שנות ניסיון בשיווק תוכן בישראל.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "שיווק תוכן מקצועי — תוכן שמביא לקוחות | WAO",
    description:
      "שיווק תוכן שמביא לקוחות אורגניים: מחקר, כתיבה ואופטימיזציה לגוגל. WAO מאז 2006.",
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
    name: "שיווק תוכן מקצועי — WAO",
    description: "שירות שיווק תוכן מקצועי: מחקר, כתיבה ואופטימיזציה לגוגל ולסיכומי AI",
    isPartOf: { "@type": "WebSite", "@id": "https://www.wao.co.il/#website" },
  },
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${CANONICAL}#service`,
    serviceType: "Content Marketing",
    name: "שיווק תוכן",
    description:
      "שירות שיווק תוכן מלא: מחקר קהל יעד, לוח תוכן, כתיבה מקצועית ואופטימיזציה לסיכומי AI. ניהול חודשי מ-3,500 ₪.",
    url: CANONICAL,
    provider: { "@type": "Organization", "@id": "https://www.wao.co.il/#org" },
    areaServed: { "@type": "Country", name: "Israel" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "ILS",
      lowPrice: "3500",
      offerCount: "3",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "מה ההבדל בין שיווק תוכן לקידום אתרים?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "שיווק תוכן יוצר את החומר — מאמרים, מדריכים, תשובות לשאלות הלקוחות. קידום אתרים מוודא שגוגל יכול למצוא, להבין ולהציג אותם. ביחד הם בונים נוכחות אורגנית שמביאה לקוחות לאורך שנים.",
        },
      },
      {
        "@type": "Question",
        name: "כמה זמן עד שרואים תוצאות משיווק תוכן?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "שיפור ראשוני בדירוגים ותנועה — תוך 3-4 חודשים. עלייה משמעותית בפניות ולידים — לאחר 6-12 חודשים. תוכן שנכתב היום ימשיך להביא לקוחות שנים קדימה.",
        },
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: "https://www.wao.co.il" },
      { "@type": "ListItem", position: 2, name: "שיווק תוכן", item: CANONICAL },
    ],
  },
];

const STEPS = [
  {
    n: "01",
    title: "מחקר — מה הלקוחות שלכם מחפשים?",
    desc: "לפני שכותבים מילה אחת, לומדים את הלקוח שלכם לעומק. אילו שאלות הם שואלים בגוגל? אילו בעיות הם מנסים לפתור? מה המתחרים עונים — ואיפה הם מפספסים? התשובות לשאלות האלה קובעות את כל תוכנית התוכן.",
    tags: ["מחקר קהל יעד", "ניתוח מתחרים", "מיפוי שאלות"],
  },
  {
    n: "02",
    title: "מבנה — לבנות סמכות, לא רק לכתוב מאמרים",
    desc: "תוכן מפוזר לא בונה מוניטין. בונים מבנה: נושא מרכזי אחד עם מאמרים שמכסים כל שאלה רלוונטית מכל זווית. כשגוגל רואה אתר שעונה לעומק על נושא שלם — הוא מתחיל לדרג אותו גבוה על כל שאלה קשורה.",
    tags: ["מבנה תוכן", "נושא מרכזי", "תת-נושאים", "לוח תוכן"],
  },
  {
    n: "03",
    title: "כתיבה — תוכן שאנשים רוצים לקרוא",
    desc: "תוכן שמניח בסיס לדירוג בגוגל — אבל קודם כל מעניין לקוראים. כל מאמר עונה על שאלה אמיתית בצורה ברורה, מוסיף את נקודת המבט הייחודית שלכם, ומנחה את הקורא לצעד הבא. גוגל מזהה היטב תוכן שנכתב לאנשים לעומת תוכן שנכתב לאלגוריתם.",
    tags: ["כתיבה מקצועית", "נקודת מבט ייחודית", "קריאה לפעולה"],
  },
  {
    n: "04",
    title: "אופטימיזציה — שגוגל ייראה אתכם",
    desc: "אחרי הכתיבה — מוודאים שגוגל יכול לסרוק, להבין ולדרג. כותרות נכונות, מבנה פנימי, קישורים לדפים קשורים, מהירות טעינה. בנוסף — מבנה תוכן ייעודי שמגדיל את הסיכוי שגוגל יציג את התוכן שלכם בסיכומי ה-AI.",
    tags: ["SEO On-Page", "מהירות", "קישורים פנימיים", "AI Overviews"],
  },
  {
    n: "05",
    title: "מדידה — מה מביא לקוחות, מה מביא רק תנועה",
    desc: "לא כל תנועה שווה. מנטרים מה הגיע, מאיזה חיפוש, ומה עשה אחר כך — האם קרא, פנה, רכש. כל חודש מקבלים דוח ברור שמסביר מה קרה ומה עושים אחרת. עם הזמן, יודעים בדיוק אילו נושאים מביאים לקוחות משלמים.",
    tags: ["אנליטיקס", "מעקב המרות", "דיווח חודשי"],
  },
];

const INCLUDED = [
  {
    icon: "🗺️",
    title: "מיפוי מה הלקוחות מחפשים",
    desc: "ניתוח מעמיק של כל השאלות, הבעיות והביטויים שקהל היעד שלכם מחפש בגוגל. הבסיס לכל תוכנית תוכן שעובדת.",
  },
  {
    icon: "📅",
    title: "לוח תוכן חודשי",
    desc: "תכנון מסודר: אילו נושאים לכסות, באיזה סדר, ומה המטרה של כל מאמר — לידע, לשכנע או להניע לפעולה.",
  },
  {
    icon: "✍️",
    title: "כתיבה מקצועית ועריכה",
    desc: "מאמרים ומדריכים בעברית צחה ומקצועית. כל מאמר עובר בדיקת עובדות, עריכה לשונית ועדכון לפי משוב.",
  },
  {
    icon: "🤖",
    title: "אופטימיזציה לסיכומי AI של גוגל",
    desc: "מבנה תוכן שמגדיל את הסיכוי שגוגל יציג אתכם בסיכומי ה-AI — אחת ההזדמנויות הגדולות ב-2026 לחשיפת מותג בלי תשלום.",
  },
  {
    icon: "🔗",
    title: "קישורים חכמים בין המאמרים",
    desc: "כל מאמר מקושר למאמרים הקשורים שלכם — מה שעוזר לגוגל להבין שהאתר שלכם הוא מקור סמכות, ומניע קוראים להמשיך לקרוא.",
  },
  {
    icon: "📊",
    title: "דיווח חודשי עם תובנות",
    desc: "דוח ברור ללא ז׳רגון: כמה תנועה, מה הצמיח, מה מתוכנן לחודש הבא. רק נתונים שעוזרים לקבל החלטות.",
  },
];

const FAQS = [
  {
    q: "מה ההבדל בין שיווק תוכן לקידום אתרים?",
    a: "שיווק תוכן הוא הדלק; קידום אתרים הוא המנוע. שיווק תוכן יוצר את החומר — מאמרים, מדריכים, תשובות לשאלות הלקוחות. קידום אתרים (SEO) מוודא שגוגל יכול למצוא, להבין ולהציג אותם. ביחד הם בונים נוכחות אורגנית שמביאה לקוחות לאורך שנים — בלי לשלם על כל קליק.",
  },
  {
    q: "מי כותב את התוכן — WAO או אנחנו?",
    a: "WAO כותב את הכל. מתחילים עם ראיון קצר שבו אתם חולקים את הידע המקצועי שלכם — ואנחנו הופכים אותו לתוכן כתוב. אם יש לכם כותב פנים-ארגוני, אפשר לחלק: לנו האסטרטגיה, המחקר והעריכה — לכם חלק מהכתיבה.",
  },
  {
    q: "כמה זמן עד שרואים תוצאות?",
    a: "שיפור ראשוני — עלייה בדירוגים ותנועה — מגיע בדרך כלל תוך 3-4 חודשים. עלייה משמעותית בפניות ולידים — לאחר 6-12 חודשים. חשוב להבין: תוכן שכתבנו לפני שנה ממשיך להביא לקוחות גם היום. זו השקעה שצוברת ערך עם הזמן.",
  },
  {
    q: "כמה מאמרים בחודש?",
    a: "מינימום 2-3 מאמרים לחודש כדי לבנות תנופה; אידיאלי 4-6. בניגוד לפרסום ממומן, כתיבת מאמר היא השקעה חד-פעמית — מאמר שמדורג ימשיך להביא תנועה שנים קדימה.",
  },
  {
    q: "האם שיווק תוכן עובד בכל ענף?",
    a: "כן — בכל ענף שבו הלקוח מחפש מידע לפני שהוא קונה. שירותים מקצועיים, נדל\"ן, בריאות, פיננסים, חינוך, טכנולוגיה. בענפים שבהם הרכישה ספונטנית לחלוטין בלי מחקר מוקדם — פרסום ממומן עובד מהר יותר. ב-90% מהמקרים — שניהם יחד הם הגישה הנכונה.",
  },
];

export default function ContentPage() {
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
            שיווק תוכן — WAO מאז 2006
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
            תוכן שמביא לקוחות —{" "}
            <span className="text-gradient">בלי לשלם על כל קליק</span>
          </h1>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.2rem)", marginBottom: "20px", maxWidth: "640px" }}>
            כל יום, הלקוחות שלכם מחפשים בגוגל תשובות לשאלות שאתם יכולים לענות עליהן. אם אין לכם תוכן שעונה — הם מוצאים את המתחרים שלכם.
          </p>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.15rem)", marginBottom: "40px", maxWidth: "640px" }}>
            שיווק תוכן הוא הדרך להיות שם — לא דרך פרסום שנעצר ברגע שמפסיקים לשלם, אלא דרך ידע שמביא אנשים אליכם חודש אחרי חודש. בעידן שבו גוגל מציג <GT term="AI Overviews">סיכומי AI</GT> לפני כל תוצאה, עסקים שיש להם תוכן מוסמך ועמוק — מופיעים ראשונים.
          </p>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <a href="tel:0526148860" className="btn-primary" style={{ fontSize: "1.05rem", padding: "15px 36px" }}>
              קבל אסטרטגיית תוכן חינם
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <Link href="/seo/guide" className="btn-outline" style={{ fontSize: "1rem" }}>
              מדריך SEO מלא ←
            </Link>
          </div>

          <div style={{ marginTop: "64px", paddingTop: "40px", borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "32px" }}>
            {[
              { n: "20+", l: "שנות ניסיון" },
              { n: "3–4", l: "חודשים לתוצאות ראשונות" },
              { n: "300%+", l: "עלייה ממוצעת בתנועה" },
              { n: "ללא", l: "חוזה ארוך טווח" },
            ].map((s) => (
              <div key={s.n}>
                <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "2.2rem", lineHeight: 1, color: "var(--text)", marginBottom: "6px" }}>{s.n}</div>
                <div style={{ fontSize: "0.85rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why content marketing ── */}
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <div className="eyebrow">למה שיווק תוכן עובד?</div>
          <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
            כשהלקוח מחפש — אתם{" "}
            <span className="text-gradient">כבר שם</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "32px", marginTop: "40px" }}>
            {[
              {
                icon: "🔍",
                title: "פרסום אורגני שלא נעצר",
                body: "בניגוד לפרסום ממומן, תוכן שנכתב ומדורג ממשיך להביא תנועה חודשים ושנים אחרי שנכתב — בלי לשלם שקל נוסף. אתר עם 50 מאמרים מדורגים הוא כמו 50 אנשי מכירות שעובדים בשבילכם 24/7.",
              },
              {
                icon: "🤝",
                title: "אמון לפני הרכישה",
                body: "כשמישהו קורא מאמר שלכם שפתר לו בעיה — הוא מגיע לשיחת המכירה כשהוא כבר מאמין לכם. לקוחות שהגיעו דרך תוכן מחפשים פחות, מתמקחים פחות, ומרוצים יותר.",
              },
              {
                icon: "🤖",
                title: "חשיפה בסיכומי ה-AI של גוגל",
                body: "ב-2026, גוגל מציג תשובות מסיכום AI לפני כל קישור. רק עסקים עם תוכן מוסמך, מעמיק ומובנה נכון מופיעים שם. זה לא הגדרה טכנית — זה ציון אמינות שגוגל נותן לתוכן שלכם.",
              },
            ].map((item) => (
              <div key={item.title} style={{ ...glass, padding: "clamp(24px,3vw,32px)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "16px", lineHeight: 1 }}>{item.icon}</div>
                <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1.1rem", marginBottom: "10px", color: "var(--text)" }}>{item.title}</h3>
                <p style={{ ...bodyStyle, fontSize: "0.92rem" }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── E-E-A-T explainer ── */}
      <section className="wao-section">
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(32px,5vw,64px)", alignItems: "center" }}>
            <div>
              <div className="eyebrow">גוגל שואל שאלה אחת</div>
              <h2 style={{ ...h2Style, fontSize: "clamp(1.5rem,2.8vw,2.2rem)" }}>
                האם זה מומחה אמיתי?
              </h2>
              <p style={{ ...bodyStyle, marginBottom: "20px" }}>
                מ-2022 גוגל מעריך תוכן לפי ארבעה פרמטרים שהוא מכנה <GT term="E-E-A-T">ניסיון, מומחיות, סמכות ואמינות</GT>. תוכן שנכתב על ידי מישהו עם ניסיון אמיתי בתחום — ומציג את הניסיון הזה בצורה ברורה — מדורג גבוה יותר מתוכן גנרי.
              </p>
              <p style={{ ...bodyStyle, marginBottom: "20px" }}>
                זה אומר שהידע הפנימי שלכם — מה שלמדתם מ-20 שנה בתעשייה — הוא היתרון התחרותי שלכם בתוכן. אנחנו עוזרים לכם להוציא אותו החוצה בצורה שגוגל ולקוחות מבינים ומעריכים.
              </p>
              <p style={{ ...bodyStyle }}>
                ב-WAO לא כותבים תוכן גנרי. כל מאמר מבוסס על שיחה עם המומחים שלכם, כולל דוגמאות מהשטח ונקודות מבט שאף אחד אחר לא יכול לתת.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[
                { letter: "E", label: "ניסיון (Experience)", desc: "האם מי שכתב את זה עשה את זה בעצמו?" },
                { letter: "E", label: "מומחיות (Expertise)", desc: "האם הכותב מבין את התחום לעומק?" },
                { letter: "A", label: "סמכות (Authoritativeness)", desc: "האם אחרים מצטטים ומקשרים לתוכן הזה?" },
                { letter: "T", label: "אמינות (Trustworthiness)", desc: "האם האתר והמותג מעוררים אמון?" },
              ].map((item) => (
                <div key={item.label} style={{ ...glass, padding: "16px 20px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(74,227,181,0.15)", border: "1px solid rgba(74,227,181,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "1.1rem", color: "var(--accent)" }}>{item.letter}</div>
                  <div>
                    <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "var(--text)", marginBottom: "4px" }}>{item.label}</div>
                    <div style={{ fontFamily: "var(--font-body), sans-serif", fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Methodology ── */}
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container">
          <div style={{ marginBottom: "60px" }}>
            <div className="eyebrow">שיטת WAO לשיווק תוכן</div>
            <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
              5 שלבים מהאסטרטגיה{" "}
              <span className="text-gradient">עד לתוצאה</span>
            </h2>
            <p style={{ ...bodyStyle, marginTop: "12px", maxWidth: "580px" }}>
              שיווק תוכן שעובד הוא לא שאלה של כמה תכתבו — אלא של מה, למי ואיך. כל שלב מהאסטרטגיה ועד למדידה קיים כדי שכל מאמר יעשה את עבודתו.
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
                  <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1.2rem", marginBottom: "10px" }}>{step.title}</h3>
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
              שיווק תוכן מלא —{" "}
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

      {/* ── AI Overviews explainer ── */}
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container" style={{ maxWidth: "800px" }}>
          <div className="eyebrow">ההזדמנות הגדולה של 2026</div>
          <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
            גוגל מצטטת עסקים —{" "}
            <span className="text-gradient">האם הם יצטטו אתכם?</span>
          </h2>
          <div style={{ ...glass, padding: "clamp(28px,4vw,40px)", marginTop: "32px" }}>
            <p style={{ ...bodyStyle, marginBottom: "20px", fontSize: "1.05rem" }}>
              כשמישהו מחפש בגוגל שאלה שקשורה לתחום שלכם, גוגל מציגה בראש הדף סיכום <GT term="AI Overviews">AI</GT> — תשובה שנכתבה על ידי AI של גוגל, המבוססת על מקורות שגוגל סומכת עליהם.
            </p>
            <p style={{ ...bodyStyle, marginBottom: "20px" }}>
              עסקים שמצוטטים בסיכומים האלה מקבלים חשיפת מותג גם אצל אנשים שלא לחצו על שום קישור. לפי נתוני גוגל — בכ-63% מהחיפושים ב-2026 מוצג סיכום כזה.
            </p>
            <p style={{ ...bodyStyle, marginBottom: "24px" }}>
              כדי להיות מצוטטים, התוכן שלכם צריך לענות על שאלות בצורה ישירה וברורה, להיות מובנה נכון, ולהגיע ממקור שגוגל כבר מזהה כאמין. זה בדיוק מה שבונים עם אסטרטגיית תוכן נכונה.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              {[
                { stat: "63%", label: "מהחיפושים בגוגל מציגים סיכום AI" },
                { stat: "40%+", label: "עלייה ב-CTR לאתרים שמצוטטים" },
                { stat: "0 ₪", label: "עלות לקליק מסיכום AI" },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center", padding: "20px", borderRadius: "var(--radius)", background: "rgba(74,227,181,0.05)", border: "1px solid rgba(74,227,181,0.15)" }}>
                  <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "2rem", color: "var(--accent)", lineHeight: 1, marginBottom: "8px" }}>{s.stat}</div>
                  <div style={{ fontFamily: "var(--font-body), sans-serif", fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.5 }}>{s.label}</div>
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
            כל מה שרציתם לדעת על{" "}
            <span className="text-gradient">שיווק תוכן</span>
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
                <div style={{ padding: "0 24px 22px", ...bodyStyle, lineHeight: 1.85 }}>{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Related services ── */}
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container">
          <div className="eyebrow">שירותים משלימים</div>
          <h2 style={{ ...h2Style, fontSize: "clamp(1.4rem,2.5vw,2rem)", marginBottom: "32px" }}>
            שיווק תוכן עובד טוב יותר עם
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px" }}>
            {[
              { href: "/seo", label: "קידום אתרים (SEO) — הבסיס שמגדיל את התוכן" },
              { href: "/google-ads", label: "פרסום בגוגל — להגיע לתוצאות מהיום הראשון" },
              { href: "/seo/topical-authority", label: "Topical Authority — הפכו למומחים בנישה" },
              { href: "/seo/keyword-research", label: "מחקר מילות מפתח — מה הלקוחות מחפשים?" },
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
      <section className="wao-section">
        <div className="wao-container">
          <div className="cta-banner" style={{ padding: "clamp(48px,8vw,80px) clamp(24px,6vw,64px)", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div aria-hidden style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "60%", height: "100%", background: "radial-gradient(ellipse at center, rgba(74,227,181,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div className="eyebrow" style={{ justifyContent: "center" }}>מתחילים?</div>
              <h2
                style={{
                  fontFamily: "var(--font-rubik), sans-serif",
                  fontWeight: 900,
                  fontSize: "clamp(1.6rem,3.5vw,2.6rem)",
                  lineHeight: 1.15,
                  marginBottom: "16px",
                }}
              >
                בואו נבנה את אסטרטגיית התוכן{" "}
                <span className="text-gradient">שלכם</span>
              </h2>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "32px", maxWidth: "480px", margin: "0 auto 32px", lineHeight: 1.75 }}>
                שיחה ראשונה ללא עלות — נבחן מה הלקוחות שלכם מחפשים ומה המתחרים עושים, ונגיד לכם בדיוק מה חסר.
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
