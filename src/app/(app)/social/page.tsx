import type { Metadata } from "next";
import Link from "next/link";
import GT from "@/components/GlossaryTerm";

const CANONICAL = "https://www.wao.co.il/social";

export const metadata: Metadata = {
  title: "ניהול מדיה חברתית מקצועי — תוצאות, לא רק לייקים",
  description:
    "ניהול מדיה חברתית מקצועי: אסטרטגיה, יצירת תוכן, קמפיינים ממומנים וניהול קהילה. Meta, TikTok, LinkedIn. WAO — 20+ שנות ניסיון.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "ניהול מדיה חברתית — תוצאות, לא רק לייקים | WAO",
    description:
      "ניהול מדיה חברתית מלא: אסטרטגיה, תוכן, קמפיינים ממומנים. WAO מאז 2006.",
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
    name: "ניהול מדיה חברתית מקצועי — WAO",
    description: "שירות ניהול מדיה חברתית מלא: אסטרטגיה, יצירת תוכן, קמפיינים ממומנים וניהול קהילה",
    isPartOf: { "@type": "WebSite", "@id": "https://www.wao.co.il/#website" },
  },
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${CANONICAL}#service`,
    serviceType: "Social Media Management",
    name: "ניהול מדיה חברתית",
    description:
      "שירות ניהול מדיה חברתית מלא: אסטרטגיה, יצירת תוכן, קמפיינים ממומנים, ניהול קהילה ודיווח חודשי. ניהול חודשי מ-3,500 ₪.",
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
        name: "אילו פלטפורמות מדיה חברתית מתאימות לעסק שלי?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "לרוב עסקי B2C בישראל — Meta (פייסבוק ואינסטגרם) הוא הבסיס. TikTok מתאים לקהל צעיר ולעסקים שמוכנים להשקיע בוידאו. LinkedIn לעסקי B2B ושירותים מקצועיים. בייעוץ הראשוני אנחנו ממפים יחד.",
        },
      },
      {
        "@type": "Question",
        name: "כמה זמן עד שרואים לידים ממדיה חברתית?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "ניהול אורגני לבד לוקח 3-6 חודשים לבנות מאסה. שילוב עם קמפיינים ממומנים מקצר את הזמן משמעותית — לידים ראשונים תוך 30-60 יום.",
        },
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: "https://www.wao.co.il" },
      { "@type": "ListItem", position: 2, name: "מדיה חברתית", item: CANONICAL },
    ],
  },
];

const STEPS = [
  {
    n: "01",
    title: "אסטרטגיה — איפה הלקוחות שלכם ומה הם רוצים לראות?",
    desc: "לא כל עסק צריך להיות בכל פלטפורמה. בשלב הראשון מנתחים את קהל היעד שלכם — גיל, תחומי עניין, הרגלי גלישה — ומחליטים יחד איפה להשקיע ואיפה לא. כל פלטפורמה דורשת גישה שונה: מה שעובד באינסטגרם לא עובד בלינקדאין.",
    tags: ["Meta", "TikTok", "LinkedIn", "קהל יעד", "בחירת פלטפורמה"],
  },
  {
    n: "02",
    title: "תוכן — שיגרום לאנשים לעצור ולהסתכל",
    desc: "התוכן הכי טוב ברשתות חברתיות הוא לא פרסומת — הוא משהו שאנשים רוצים לצרוך. וידאו קצר שמלמד משהו. פוסט שנוגע בנקודת כאב. תמונה שמספרת סיפור. אנחנו מתכננים, מעצבים וכותבים את כל התוכן בהתאם לקול המותג שלכם.",
    tags: ["עיצוב", "קופי", "וידאו", "Reels", "Stories"],
  },
  {
    n: "03",
    title: "ניהול קהילה — לבנות קשר אמיתי עם הקהל",
    desc: "תגובות, הודעות פרטיות, ביקורות — מי עונה? אנחנו. ניהול קהילה מקצועי אומר שכל שאלה, ביקורת ותגובה מקבלת מענה מהיר ומכבד בשם המותג שלכם. זה מה שהופך עוקבים ללקוחות, ולקוחות לשגרירים.",
    tags: ["ניהול קהילה", "מענה מהיר", "מוניטין", "שימור לקוחות"],
  },
  {
    n: "04",
    title: "קמפיינים ממומנים — להגיע לאנשים שעדיין לא מכירים אתכם",
    tags: ["Meta Ads", "קהלים מותאמים", "Remarketing", "תקציב מדיה"],
  },
  {
    n: "05",
    title: "מדידה — מה עבד, מה לא, ומה עושים בחודש הבא",
    desc: "כל חודש מקבלים דוח ברור: כמה אנשים נחשפו לתוכן, כמה עסקו איתו, כמה הגיעו לאתר, כמה פנו. מבוסס על נתונים אמיתיים — לא על תחושות. ממה שעובד עושים יותר, ומה שלא — משנים.",
    tags: ["Meta Insights", "Analytics", "KPI", "דיווח חודשי"],
  },
];

const INCLUDED = [
  {
    icon: "🗺️",
    title: "אסטרטגיית פלטפורמות",
    desc: "החלטה מבוססת-נתונים איפה להיות ואיפה לא. פרופיל מקצועי, הגדרת קהל יעד ואסטרטגיית תוכן מותאמת לכל ערוץ.",
  },
  {
    icon: "📅",
    title: "לוח תוכן חודשי",
    desc: "תכנון מסודר של כל הפוסטים, הסטוריז, ה-Reels והקמפיינים לחודש הבא — כדי שלא תמצאו עצמכם בלחץ שצריך לעלות משהו עכשיו.",
  },
  {
    icon: "🎨",
    title: "עיצוב ויצירת תוכן",
    desc: "גרפיקה, וידאו קצר, Reels, Stories — כל התוכן הויזואלי שמשקף את המותג שלכם בצורה מקצועית ועקבית לאורך זמן.",
  },
  {
    icon: "💬",
    title: "ניהול קהילה ומענה",
    desc: "תגובות, הודעות פרטיות, ביקורות — מענה מהיר ומקצועי בשם המותג שלכם. הצד שרוב הסוכנויות מזניחות, ואחד החשובים ביותר לאמון.",
  },
  {
    icon: "📣",
    title: "קמפיינים ממומנים",
    desc: "קמפיינים ממוקדים ב-Meta ו-TikTok להגעה לקהלים חדשים, ו-Remarketing לאנשים שכבר נחשפו למותג שלכם.",
  },
  {
    icon: "📊",
    title: "דיווח חודשי",
    desc: "דוח ברור בלי ז׳רגון: כמה אנשים ראו, עסקו, הגיעו לאתר ופנו. עם תובנות ותכנון לחודש הבא.",
  },
];

const FAQS = [
  {
    q: "אילו פלטפורמות מתאימות לעסק שלי?",
    a: "תלוי בקהל ובתחום. לרוב עסקי B2C בישראל — Meta (פייסבוק ואינסטגרם) הוא הבסיס. TikTok מתאים לקהל צעיר יותר ולעסקים שמוכנים להשקיע בוידאו קצר. LinkedIn לעסקי B2B ושירותים מקצועיים. YouTube לתוכן ארוך ומעמיק. בייעוץ הראשוני אנחנו ממפים יחד ומחליטים.",
  },
  {
    q: "מה ההבדל בין ניהול מדיה חברתית לפרסום בגוגל?",
    a: "גוגל מגיע לאנשים שכבר מחפשים מה שאתם מציעים — כוונת קנייה גבוהה, תוצאות מהירות יחסית. מדיה חברתית מגיע לאנשים בזמן הפנאי שלהם, לפני שהם בכלל יודעים שהם צריכים אתכם — בונה מודעות, אמון ורצון. השניים משלימים זה את זה בצורה הטובה ביותר.",
  },
  {
    q: "כמה פוסטים בשבוע?",
    a: "עקביות חשובה יותר מתדירות. 3-5 פוסטים שבועיים עם תוכן איכותי עדיפים בהרבה על 10 פוסטים שממלאים מקום. המינימום שלנו לתוצאות: 3-4 פוסטים שבועיים בפיד + Stories יומיות.",
  },
  {
    q: "כמה זמן עד שרואים לידים?",
    a: "ניהול אורגני לבד לוקח 3-6 חודשים לבנות מאסה קריטית של עוקבים מעורבים. שילוב עם קמפיינים ממומנים מקצר את הזמן משמעותית: לידים ראשונים תוך 30-60 יום מקמפיין, תנועה אורגנית גדלה תוך 3 חודשים.",
  },
  {
    q: "האם אנחנו צריכים לצלם תוכן בעצמנו?",
    a: "לא חובה, אבל וידאו אותנטי שמציג את האנשים מאחורי העסק — מביא ביצועים גבוהים יותר. אנחנו יכולים לעבוד עם מה שיש: תמונות מוצרים, תמונות מהעסק. אם אתם מוכנים לצלם — נדריך ונערוך. אם לא — נצור הכל מהצד שלנו.",
  },
];

export default function SocialPage() {
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
            מדיה חברתית — WAO מאז 2006
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
            מדיה חברתית שמביאה{" "}
            <span className="text-gradient">לקוחות — לא רק לייקים</span>
          </h1>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.2rem)", marginBottom: "20px", maxWidth: "640px" }}>
            רוב העסקים מפרסמים ברשתות החברתיות ולא רואים תוצאות. לא כי המוצר שלהם לא טוב — אלא כי הם מעלים תוכן בלי אסטרטגיה, בלי עקביות, ובלי לדעת מה עובד.
          </p>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.15rem)", marginBottom: "40px", maxWidth: "640px" }}>
            מדיה חברתית שעובדת משלבת שלושה דברים: תוכן שאנשים רוצים לצרוך, קמפיינים שמגיעים לקהל הנכון, וניהול קהילה שבונה אמון אמיתי. WAO עושה את כל השלושה — כדי שאתם תתפנו לנהל את העסק.
          </p>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <a href="tel:0526148860" className="btn-primary" style={{ fontSize: "1.05rem", padding: "15px 36px" }}>
              קבל אסטרטגיה חינם
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <Link href="/google-ads" className="btn-outline" style={{ fontSize: "1rem" }}>
              פרסום בגוגל ←
            </Link>
          </div>

          <div style={{ marginTop: "64px", paddingTop: "40px", borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "32px" }}>
            {[
              { n: "20+", l: "שנות ניסיון" },
              { n: "Meta", l: "פרטנר רשמי" },
              { n: "30-60", l: "ימים ללידים ראשונים" },
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

      {/* ── Why social works ── */}
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <div className="eyebrow">למה מדיה חברתית עובדת?</div>
          <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
            הלקוחות שלכם שם{" "}
            <span className="text-gradient">4 שעות ביום</span>
          </h2>
          <p style={{ ...bodyStyle, marginTop: "16px", maxWidth: "620px", fontSize: "1.05rem" }}>
            ישראלים מבלים בממוצע יותר מ-4 שעות ביום בפלטפורמות חברתיות. זה החלון שבו מותגים נכנסים לחייהם — לפני שהם בכלל יודעים שהם צריכים את מה שאתם מוכרים.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", marginTop: "40px" }}>
            {[
              {
                icon: "👁️",
                title: "חשיפה לקהלים חדשים",
                body: "פרסום ממומן ב-Meta ו-TikTok מאפשר להגיע לאנשים לפי גיל, מיקום, תחומי עניין, התנהגות קנייה — ברמת דיוק שלא קיימת בשום ערוץ אחר.",
              },
              {
                icon: "🔄",
                title: "שמירה על אנשים שכבר הכירו אתכם",
                body: null,
              },
              {
                icon: "❤️",
                title: "בניית אמון לאורך זמן",
                body: "לקוח שעוקב אחריכם חודשים, רואה את הידע שלכם, קורא ביקורות ורואה תגובות מהירות — מגיע לשיחת המכירה כשהוא כמעט מכור. זה ערך שלא ניתן לקנות בפרסומת חד-פעמית.",
              },
            ].map((item) => (
              <div key={item.title} style={{ ...glass, padding: "clamp(24px,3vw,32px)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "16px", lineHeight: 1 }}>{item.icon}</div>
                <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1.1rem", marginBottom: "10px", color: "var(--text)" }}>{item.title}</h3>
                {item.body === null ? (
                  <p style={{ ...bodyStyle, fontSize: "0.92rem" }}>
                    מישהו ביקר באתר שלכם אבל לא פנה? קמפיין <GT term="Remarketing">Remarketing</GT> מציג לו את המותג שלכם שוב עד שהוא מוכן לפעול. לרוב זהו ה-<GT term="ROI">ROI</GT> הגבוה ביותר בין כל ערוצי הפרסום הדיגיטלי.
                  </p>
                ) : (
                  <p style={{ ...bodyStyle, fontSize: "0.92rem" }}>{item.body}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Organic + Paid explainer ── */}
      <section className="wao-section">
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(32px,5vw,64px)", alignItems: "center" }}>
            <div>
              <div className="eyebrow">אורגני + ממומן</div>
              <h2 style={{ ...h2Style, fontSize: "clamp(1.5rem,2.8vw,2.2rem)" }}>
                שניים ביחד עובדים פי כמה
              </h2>
              <p style={{ ...bodyStyle, marginBottom: "20px" }}>
                תוכן אורגני לבד מגיע היום לפחות מ-5% מהעוקבים שלכם — כך עובד האלגוריתם. זה לא אומר שתוכן אורגני לא שווה, אלא שהוא שונה: הוא בונה אמון, אמינות ומחויבות לאורך זמן.
              </p>
              <p style={{ ...bodyStyle, marginBottom: "20px" }}>
                קמפיינים ממומנים מביאים טווח הגעה מהיר לקהלים שעדיין לא מכירים אתכם. כשאדם רואה פרסומת — ואז נכנס לעמוד שלכם ורואה עשרות פוסטים עם תוכן איכותי — ההחלטה הרבה יותר קלה.
              </p>
              <p style={{ ...bodyStyle }}>
                WAO מנהל את שני הצדדים כי כך מקבלים את התמונה המלאה: מה התוכן האורגני מייצר, מה הקמפיינים מוסיפים, ואיך לחבר ביניהם לתוצאה מיטבית.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[
                {
                  label: "תוכן אורגני",
                  icon: "🌱",
                  items: ["בניית אמון לאורך זמן", "עלות נמוכה אחרי היצירה", "מייצר קהל מחויב", "משפר ביצועי קמפיינים"],
                },
                {
                  label: "קמפיינים ממומנים",
                  icon: "🚀",
                  items: ["הגעה מהירה לקהלים חדשים", "דיוק לפי תחום עניין", "Remarketing לאנשים שנחשפו", "ROI מדיד ברמת ריאל-טיים"],
                },
              ].map((box) => (
                <div key={box.label} style={{ ...glass, padding: "20px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                    <span style={{ fontSize: "1.4rem" }}>{box.icon}</span>
                    <span style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1rem", color: "var(--text)" }}>{box.label}</span>
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "7px" }}>
                    {box.items.map((item) => (
                      <li key={item} style={{ fontFamily: "var(--font-body), sans-serif", fontSize: "0.88rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ color: "var(--accent)", fontSize: "0.7rem" }}>✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
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
            <div className="eyebrow">שיטת WAO למדיה חברתית</div>
            <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
              5 שלבים מהאסטרטגיה{" "}
              <span className="text-gradient">עד לתוצאה</span>
            </h2>
            <p style={{ ...bodyStyle, marginTop: "12px", maxWidth: "580px" }}>
              ניהול מדיה חברתית שעובד הוא לא רק "לעלות פוסטים". הוא תהליך שמתחיל בהבנת הקהל ומסתיים בלקוחות שפונים.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {STEPS.map((step, idx) => (
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
                  {idx === 3 ? (
                    <p style={{ ...bodyStyle, marginBottom: "16px" }}>
                      תוכן אורגני עוזר לאנשים שכבר עוקבים אחריכם. קמפיינים ממומנים מרחיבים את ההגעה לקהלים חדשים — ומביאים בחזרה אנשים שכבר ביקרו באתר שלכם אבל עדיין לא פנו. זה נקרא <GT term="Remarketing">Remarketing</GT>, ולרוב הוא ה-<GT term="ROI">ROI</GT> הגבוה ביותר בין כל ערוצי הפרסום הדיגיטלי.
                    </p>
                  ) : (
                    <p style={{ ...bodyStyle, marginBottom: "16px" }}>{step.desc}</p>
                  )}
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
              ניהול מדיה חברתית מלא —{" "}
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

      {/* ── Platform guide ── */}
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <div className="eyebrow">איזו פלטפורמה מתאימה לכם?</div>
          <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)", marginBottom: "40px" }}>
            מדריך מהיר לבחירת{" "}
            <span className="text-gradient">הפלטפורמה הנכונה</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px" }}>
            {[
              {
                name: "Instagram & Facebook",
                logo: "📘",
                best: "מרבית עסקי B2C",
                why: "הפלטפורמה עם הקהל הרחב ביותר בישראל. ממיר מצוין למוצרים, שירותים, אוכל, אופנה, נדל\"ן ואירועים. פרסום ממומן עם דיוק גבוה.",
                strength: "✓ טווח הגעה רחב  ✓ פרסום ממוקד  ✓ מגוון פורמטים",
              },
              {
                name: "TikTok",
                logo: "🎵",
                best: "קהל 18-40, מוצרי צריכה",
                why: "הצמיחה המהירה ביותר. וידאו קצר אותנטי מגיע לקהלים אורגנית גם בלי תקציב. מתאים לעסקים שמוכנים להשקיע בוידאו.",
                strength: "✓ חשיפה אורגנית גבוהה  ✓ קהל צעיר  ✓ פוטנציאל ויראלי",
              },
              {
                name: "LinkedIn",
                logo: "💼",
                best: "שירותים לעסקים (B2B)",
                why: "הפלטפורמה לקהלי מקצוענים. מנהלים, בעלי תפקידים. מתאים לשירותים מקצועיים, פינטק, HR ותוכנה.",
                strength: "✓ קהל מקצועי  ✓ אמינות גבוהה  ✓ לידים עסקיים",
              },
              {
                name: "YouTube",
                logo: "▶️",
                best: "תוכן מעמיק ולימודי",
                why: "הפלטפורמה לתוכן ארוך שבונה סמכות לאורך זמן. מדריכים, ביקורות, הדגמות מוצר. אנשים מחפשים ב-YouTube כמו שמחפשים בגוגל.",
                strength: "✓ SEO ממשי  ✓ אמינות גבוהה  ✓ תנועה לאורך זמן",
              },
            ].map((p) => (
              <div key={p.name} style={{ ...glass, padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "1.6rem" }}>{p.logo}</span>
                  <div>
                    <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1rem", color: "var(--text)" }}>{p.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif" }}>מתאים ל: {p.best}</div>
                  </div>
                </div>
                <p style={{ ...bodyStyle, fontSize: "0.86rem", marginBottom: "12px" }}>{p.why}</p>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", lineHeight: 1.8 }}>{p.strength}</div>
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
            <span className="text-gradient">ניהול מדיה חברתית</span>
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
            מדיה חברתית עובדת טוב יותר עם
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px" }}>
            {[
              { href: "/google-ads", label: "פרסום בגוגל — להגיע לאנשים שכבר מחפשים" },
              { href: "/content", label: "שיווק תוכן — תוכן שמביא תנועה אורגנית" },
              { href: "/seo", label: "קידום אתרים (SEO) — להיות ראשון בגוגל" },
              { href: "/seo/consulting", label: "ייעוץ שיווק דיגיטלי — אסטרטגיה שלמה" },
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
                בואו נבנה את הנוכחות החברתית{" "}
                <span className="text-gradient">שלכם</span>
              </h2>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "32px", maxWidth: "480px", margin: "0 auto 32px", lineHeight: 1.75 }}>
                שיחה ראשונה ללא עלות — נבחן את הנוכחות הנוכחית שלכם ברשתות, נגיד מה חסר ומה אפשר לעשות אחרת.
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
