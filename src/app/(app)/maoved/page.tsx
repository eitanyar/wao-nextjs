import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "@/components/ContactForm";

const CANONICAL = "https://www.wao.co.il/maoved";

export const metadata: Metadata = {
  title: "מערכת מה עובד | CRM ומעקב המרות לעסקים קטנים",
  description:
    "מערכת CRM פשוטה ומעקב שיחות וטפסים לעסקים קטנים וסוכנויות. מזהים איזה פרסום מביא מכירות, מקליטים שיחות ומשדרים המרות לגוגל ופייסבוק Ads.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: "מערכת מה עובד | CRM ומעקב המרות לעסקים קטנים | WAO",
    description:
      "גלו מה מביא לכם לקוחות. מערכת CRM מובנית, מספרים וירטואליים דינמיים, הקלטת שיחות וסנכרון מלא לגוגל ופייסבוק Ads.",
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
    name: "מערכת מה עובד - CRM ומעקב המרות",
    description: "פתרון מעקב המרות ו-CRM לעסקים קטנים וסוכנויות פרסום",
    isPartOf: { "@type": "WebSite", "@id": "https://www.wao.co.il/#website" },
  },
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${CANONICAL}#service`,
    serviceType: "CRM and Call Tracking System",
    name: "מערכת מה עובד",
    description: "מעקב המרות טלפוניות, טפסים ומערכת ניהול לידים מובנית לעסקים קטנים",
    url: CANONICAL,
    provider: { "@type": "Organization", "@id": "https://www.wao.co.il/#org" },
    areaServed: { "@type": "Country", name: "Israel" },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "האם השירות מתאים לבעלי עסקים קטנים?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "כן, המערכת נבנתה במיוחד לעסקים קטנים ובינוניים שרוצים לדעת מאיזה ערוץ פרסום מגיעות העסקאות הסגורות שלהם, בלי להסתבך עם הגדרות טכניות מורכבות.",
        },
      },
      {
        "@type": "Question",
        name: "איך המערכת מעבירה את הנתונים לגוגל אדס?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "המערכת לוכדת את מזהה הקליק של גוגל (GCLID). כשהליד הופך למכירה ב-CRM, המערכת משדרת אוטומטית המרת אופליין לגוגל אדס עם ערך המכירה המדויק.",
        },
      },
    ],
  },
];

const VALUE_PROPS = [
  {
    icon: "💰",
    title: "השקלים הולכים למה שמייצר כסף",
    desc: "שלט רחוב, פוסט אורגני או קמפיין ממומן בגוגל – לראשונה כל שיחה ופנייה משויכת במדויק למקור הפרסום שהביא אותה, כדי שתדעו מה באמת עובד.",
  },
  {
    icon: "🚀",
    title: "יותר עסקאות, יותר רווח לעסקה",
    desc: "ברגע שמבינים בדיוק איזה מסלול עושה הלקוח עד לרגע הקנייה, קל לשכפל את מה שעובד ולחסוך תקציב פרסום מבוזבז על לידים קרים שלא סוגרים.",
  },
  {
    icon: "📞",
    title: "מעקב שיחות והקלטה מובנית",
    desc: "האזנה לשיחות נכנסות מאפשרת לבחון את איכות המענה הטלפוני, לשפר את תסריטי השיחה בעסק ולשדרג את אחוזי הסגירה של אנשי המכירות שלכם.",
  },
  {
    icon: "📋",
    title: "מערכת ניהול פניות (Mini CRM)",
    desc: "כל הפניות שלכם – משיחות טלפון, וואטסאפ ועד טפסים באתר – מתרכזות ללוח בקרה אחד פשוט ויזואלי. ניהול הלקוחות שלכם מעולם לא היה קל יותר.",
  },
  {
    icon: "⚡",
    title: "אינטגרציה קלה ללא מתכנת",
    desc: "חיבור פשוט ומהיר לאתר שלכם. המערכת מתממשקת באופן טבעי ומובנה ל-Google Ads ול-Facebook Ads כדי לשדר המרות במינימום מאמץ.",
  },
  {
    icon: "🔄",
    title: "אופטימיזציה מבוססת ROAS",
    desc: "שדרו את ערך העסקה האמיתי בחזרה לגוגל אדס. המערכת תאפשר לכם להפעיל אופטימיזציית בידינג חכמה המבוססת על החזר השקעה מיועד (tROAS).",
  },
];

const TIMELINE_STEPS = [
  {
    step: "01",
    title: "נרשמים ומגדירים",
    desc: "פותחים חשבון במערכת ומקבלים גישה ללוח הבקרה המרכזי שלכם בתוך פחות מ-24 שעות.",
  },
  {
    step: "02",
    title: "מקצים מספרי טלפון",
    desc: "מייצרים מספרי טלפון וירטואליים ייעודיים לכל ערוץ פרסום (דינמיים לאתר או קבועים לשילוט ולרשתות).",
  },
  {
    step: "03",
    title: "מטמיעים קוד באתר",
    desc: "קוד שורת פיקסל אחד מוטמע באתר (בקלות דרך Google Tag Manager) ומתחיל לנטר פניות באופן אוטומטי.",
  },
  {
    step: "04",
    title: "מגלים מה עובד ומרוויחים",
    desc: "מעדכנים סכומי מכירה ב-CRM לייט, המידע משודר לגוגל/פייסבוק, והאלגוריתם מתחיל להביא לכם לקוחות רווחיים.",
  },
];

const BENEFITS = [
  {
    title: "אפס דמי התקנה",
    desc: "אנחנו מקימים ומחברים עבורכם את המערכת מא' ועד ת' ללא עלויות תשתית או הקמה מורכבות.",
  },
  {
    title: "תמיכה אנושית בעברית",
    desc: "מענה אישי ומקצועי לכל שאלה בצ'אט, במייל או בטלפון על ידי צוות המומחים של WAO.",
  },
  {
    title: "הדרכות וידאו מקיפות",
    desc: "סדרת סרטוני הדרכה בעברית שמסבירה כל פיצ'ר במערכת – מהבסיס ועד ההגדרות המתקדמות ביותר.",
  },
  {
    title: "מיני CRM חינם",
    desc: "חוסך לכם את הצורך בתוכנות CRM יקרות ומורכבות עם דמי מנוי מנופחים ועקומת למידה קשה.",
  },
  {
    title: "העלויות המשתלמות בשוק",
    desc: "מחיר שקוף ללא אותיות קטנות או התחייבות לטווח ארוך. מתחילים קטן ומשדרגים כשהעסק גדל.",
  },
  {
    title: "דיוק מקסימלי במקורות",
    desc: "לכידת מזהה הקליק של גוגל במעקב טלפוני (Call Tracking דינמי) ברמת מילת המפתח הבודדת.",
  },
];

const PRICING_PLANS = [
  {
    name: "עסק בצמיחה",
    price: "160",
    desc: "מושלם לעסקים מקומיים ונותני שירות שרוצים להתחיל לעקוב אחרי המרות ולנהל לידים בקלות.",
    features: [
      "200 דקות שיחה בחודש במתנה",
      "כולל סט-אפ מלא של החשבון והאתר!",
      "מספר וירטואלי אחד כלול במחיר",
      "עלות כל מספר נוסף: 28 ₪ לחודש",
      "דקה נוספת מעבר למכסה: 18 אגורות",
      "מעקב מלא אחרי טפסים באתר",
      "מערכת ניהול לידים מובנית",
      "תמיכה מלאה בצ'אט ובוואטסאפ",
    ],
  },
  {
    name: "Agency",
    price: "300",
    desc: "מתאים לעסקים בתהליך צמיחה מהיר או לסוכנויות המנהלות מספר מותגים / עמודי נחיתה.",
    features: [
      "600 דקות שיחה בחודש במתנה",
      "סט-אפ מלא לעד 4 אתרים שונים",
      "מספרי וירטואליים לפי דרישה",
      "עלות מספר וירטואלי נוסף: 28 ₪",
      "דקה נוספת מעבר למכסה: 15 אגורות",
      "מעקב טפסים ושיחות מכל האתרים",
      "מערכת ניהול לידים וצפייה בהקלטות",
      "תמיכה מועדפת וליווי טכני",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "600",
    desc: "לסוכנויות גדולות או עסקים מבוססי טלפוניה ולידים עם צורך בחיבורים למערכות CRM חיצוניות.",
    features: [
      "1,000 דקות שיחה בחודש במתנה",
      "סט-אפ מלא ומותאם אישית ללא הגבלת אתרים",
      "אינטגרציה מלאה: CRM, גוגל, פייסבוק, זאפייר",
      "עלות מספר וירטואלי נוסף: 28 ₪",
      "דקה נוספת מעבר למכסה: 15 אגורות",
      "חיבור Webhooks וייצוא נתונים גולמיים",
      "הקלטת שיחות ללא הגבלת נפח",
      "תמיכה טלפונית ומנהל לקוח ייעודי",
    ],
  },
];

const FAQS = [
  {
    q: "האם המחיר להפניית השיחות לניידים זהה למחיר הפניית השיחות לטלפון קווי?",
    a: "כן, אצלנו אין הבדל במחיר הפניית השיחות בין קו נייח לקו נייד. כל הפניות מנותבות לכל מספר שתבחר באותם התנאים והתמחור של חבילת הדקות שלך.",
  },
  {
    q: "האם השירות מתאים לבעלי עסקים קטנים?",
    a: "בוודאי. המערכת תוכננה במיוחד כדי להיות פשוטה וקלה לתפעול. היא מייתרת את הצורך במערכות CRM מתוחכמות ויקרות (כמו Salesforce או HubSpot) שדורשות מומחי הטמעה בעשרות אלפי שקלים. כאן תקבל את כל מה שעסק קטן צריך כדי לעקוב ולמכור.",
  },
  {
    q: "במה המערכת מתאימה לסוכנויות שיווק ופרסום?",
    a: "סוכנויות פרסום יכולות להציג ללקוחותיהן דוחות מדויקים המראים אילו קמפיינים, מודעות ומילים הביאו עסקאות בפועל (ולא רק קליקים או לידים). השימוש במערכת משפר את שימור הלקוחות של הסוכנות ומאפשר לה לבצע אופטימיזציה אמיתית לקמפיינים לפי ערך המרה (ROAS).",
  },
  {
    q: "איך עובד נושא המספרים המתחלפים הדינמיים?",
    a: "כאשר גולש מגיע לאתר שלך, המערכת מזהה מאיזה מקור הגעת (למשל: חיפוש ממומן בגוגל, פייסבוק, או תנועה אורגנית) ומציגה לו מספר טלפון ייחודי. כאשר הגולש מתקשר למספר הזה, המערכת מקשרת את השיחה למקור ההגעה הספציפי, כולל מילות המפתח המדויקות ומזהה הקליק של גוגל (GCLID).",
  },
  {
    q: "האם יש התחייבות לטווח ארוך?",
    a: "ממש לא. השירות מבוסס על מנוי חודשי מתחדש. ניתן לבטל או לשנות מסלול בכל עת, ללא שום קנסות יציאה או דמי ביטול. אנחנו מאמינים במוצר שלנו ושומרים על הלקוחות שלנו באמצעות תוצאות וערך.",
  },
];

export default function MaovedPage() {
  const glassStyle: React.CSSProperties = {
    background: "rgba(13, 15, 21, 0.72)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontFamily: "var(--font-rubik), sans-serif",
    fontWeight: 800,
    fontSize: "clamp(1.75rem, 3vw, 2.4rem)",
    lineHeight: 1.2,
    marginBottom: "16px",
    color: "var(--text)",
  };

  const cardTitleStyle: React.CSSProperties = {
    fontFamily: "var(--font-rubik), sans-serif",
    fontWeight: 700,
    fontSize: "1.15rem",
    color: "var(--text)",
    marginBottom: "10px",
  };

  return (
    <>
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}

      {/* ── Hero Section ── */}
      <section style={{ paddingTop: "clamp(120px, 14vw, 170px)", paddingBottom: "clamp(64px, 8vw, 96px)", position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(74, 227, 181, 0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="hero-grid" />
        <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "860px", textAlign: "center" }}>
          <div className="badge" style={{ marginBottom: "28px", marginInline: "auto" }}>
            <span className="badge-dot" />
            מערכת ניהול לידים ומעקב המרות לעסקים
          </div>
          <h1
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 900,
              fontSize: "clamp(2.4rem, 5.5vw, 4.2rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              marginBottom: "24px",
            }}
          >
            העסק שלך יצליח הרבה יותר עם מערכת{" "}
            <span className="text-gradient">מה עובד</span>
          </h1>
          <p
            style={{
              fontFamily: "var(--font-body), sans-serif",
              lineHeight: 1.8,
              color: "var(--muted)",
              fontSize: "clamp(1.05rem, 1.8vw, 1.25rem)",
              marginBottom: "40px",
              maxWidth: "680px",
              marginInline: "auto",
            }}
          >
            חברו את ערוצי הפרסום לתוצאות העסקיות בקלות. מעקב שיחות וטפסים מתקדם, לוח בקרה פשוט לניהול פניות, ושידור המרות אופליין ישיר לגוגל ופייסבוק Ads.
          </p>
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#contact" className="btn-primary" style={{ fontSize: "1.05rem", padding: "15px 36px" }}>
              התחילו מעקב עכשיו
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden style={{ marginRight: "8px", transform: "scaleX(-1)" }}><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <a href="#pricing" className="btn-outline" style={{ fontSize: "1rem" }}>
              צפו בחבילות ומסלולים
            </a>
          </div>
        </div>
      </section>

      {/* ── Value Props ── */}
      <section style={{ background: "var(--surface)", paddingBlock: "clamp(64px, 8vw, 96px)" }} id="features">
        <div className="wao-container">
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <div className="eyebrow" style={{ marginInline: "auto" }}>למה לבחור ב\"מה עובד\"?</div>
            <h2 style={sectionTitleStyle}>
              השילוב המושלם בין <span className="text-gradient">מעקב המרות</span> ל-CRM פשוט
            </h2>
            <p style={{ color: "var(--muted)", maxWidth: "600px", marginInline: "auto", marginTop: "12px", fontFamily: "var(--font-body), sans-serif" }}>
              תשכחו מאינטגרציות קוד מורכבות ומדוחות פרסום לא אמינים. קבלו את כל הכלים שאתם צריכים כדי לדעת איפה להשקיע את תקציב השיווק שלכם.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
            {VALUE_PROPS.map((prop, idx) => (
              <div key={idx} style={{ ...glassStyle, padding: "32px" }}>
                <div style={{ fontSize: "2rem", marginBottom: "16px" }}>{prop.icon}</div>
                <h3 style={cardTitleStyle}>{prop.title}</h3>
                <p style={{ fontFamily: "var(--font-body), sans-serif", color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.7 }}>
                  {prop.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works (Timeline) ── */}
      <section className="wao-section">
        <div className="wao-container">
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <div className="eyebrow" style={{ marginInline: "auto" }}>איך זה עובד?</div>
            <h2 style={sectionTitleStyle}>תוך 24 שעות המערכת עובדת בשבילכם</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "32px", position: "relative" }}>
            {TIMELINE_STEPS.map((step, idx) => (
              <div key={idx} style={{ position: "relative" }}>
                <div
                  style={{
                    fontFamily: "var(--font-rubik), sans-serif",
                    fontWeight: 900,
                    fontSize: "3.5rem",
                    lineHeight: 1,
                    background: "linear-gradient(135deg, rgba(74,227,181,0.15) 0%, rgba(0,195,255,0.15) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    marginBottom: "12px",
                  }}
                >
                  {step.step}
                </div>
                <h3 style={{ ...cardTitleStyle, fontSize: "1.1rem", marginBottom: "8px" }}>{step.title}</h3>
                <p style={{ fontFamily: "var(--font-body), sans-serif", color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Additional Benefits ── */}
      <section style={{ background: "var(--surface)", paddingBlock: "clamp(64px, 8vw, 96px)" }}>
        <div className="wao-container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "32px" }}>
            {BENEFITS.map((b, idx) => (
              <div key={idx} style={{ display: "flex", gap: "16px", alignItems: "start" }}>
                <div style={{ color: "var(--accent)", fontSize: "1.25rem", fontWeight: "bold", paddingTop: "2px" }}>✓</div>
                <div>
                  <h3 style={{ ...cardTitleStyle, fontSize: "1.05rem", marginBottom: "6px" }}>{b.title}</h3>
                  <p style={{ fontFamily: "var(--font-body), sans-serif", color: "var(--muted)", fontSize: "0.92rem", lineHeight: 1.65 }}>
                    {b.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Matrix ── */}
      <section className="wao-section" id="pricing">
        <div className="wao-container">
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <div className="eyebrow" style={{ marginInline: "auto" }}>חבילות ומסלולים</div>
            <h2 style={sectionTitleStyle}>בחרו את החבילה המתאימה לעסק שלכם</h2>
            <p style={{ color: "var(--muted)", maxWidth: "550px", marginInline: "auto", marginTop: "12px", fontFamily: "var(--font-body), sans-serif" }}>
              מחירים הוגנים ושקופים, ללא דמי התקנה וללא התחייבות לטווח ארוך.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "30px", alignItems: "stretch" }}>
            {PRICING_PLANS.map((plan, idx) => {
              const borderGradient = plan.popular
                ? "2px solid var(--accent)"
                : "1px solid var(--border)";

              return (
                <div
                  key={idx}
                  style={{
                    ...glassStyle,
                    border: borderGradient,
                    padding: "40px 32px",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    transform: plan.popular ? "scale(1.02)" : "none",
                    zIndex: plan.popular ? 2 : 1,
                  }}
                >
                  {plan.popular && (
                    <span
                      style={{
                        position: "absolute",
                        top: "16px",
                        left: "16px",
                        background: "var(--accent)",
                        color: "var(--background)",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "4px 12px",
                        borderRadius: "12px",
                        fontFamily: "var(--font-rubik), sans-serif",
                      }}
                    >
                      הפופולרי ביותר
                    </span>
                  )}
                  <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "var(--text)", marginBottom: "8px" }}>{plan.name}</h3>
                  <p style={{ fontFamily: "var(--font-body), sans-serif", color: "var(--muted)", fontSize: "0.88rem", lineHeight: 1.5, minHeight: "45px", marginBottom: "24px" }}>{plan.desc}</p>
                  
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "32px" }}>
                    <span style={{ fontSize: "1.1rem", color: "var(--muted)", fontWeight: 500 }}>החל מ-</span>
                    <span style={{ fontSize: "3rem", fontWeight: 900, color: "var(--text)", fontFamily: "var(--font-rubik), sans-serif", lineHeight: 1 }}>₪{plan.price}</span>
                    <span style={{ fontSize: "0.95rem", color: "var(--muted)" }}>/ לחודש</span>
                  </div>

                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 40px 0", flex: 1, display: "flex", flexDirection: "column", gap: "14px" }}>
                    {plan.features.map((f, fIdx) => (
                      <li key={fIdx} style={{ display: "flex", gap: "10px", fontSize: "0.9rem", color: "var(--text-light)", fontFamily: "var(--font-body), sans-serif" }}>
                        <span style={{ color: "var(--accent)", fontWeight: "bold" }}>•</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <a href="#contact" className={plan.popular ? "btn-primary" : "btn-outline"} style={{ width: "100%", justifyContent: "center", textAlign: "center" }}>
                    להרשמה למסלול
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Testimonials Section ── */}
      <section style={{ background: "var(--surface)", paddingBlock: "clamp(64px, 8vw, 96px)" }}>
        <div className="wao-container">
          <div style={{ textAlign: "center", marginBottom: "50px" }}>
            <div className="eyebrow" style={{ marginInline: "auto" }}>מי כבר עובד איתנו?</div>
            <h2 style={sectionTitleStyle}>עסקים שכבר מרוויחים מ\"מה עובד\"</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", textAlign: "center" }}>
            {[
              { name: "קייטרינג מאמא", text: "״בזכות המערכת של מה עובד תקציב הפרסום שלי מנותב למקומות בהם העסק יכול להצליח הרבה יותר.״" },
              { name: "קייטרינג מרלו", text: "״השימוש במערכת שדרג לי את ההבנה שכ״כ הייתה חסרה לעסק בכדי לקבל יותר פניות איכותיות ולסגור אירועים גדולים.״" },
              { name: "פודסטפס", text: "״אחרי שהשקענו תקציב באפיקי פרסום שונים ללא בקרה, אני שמח שמצאנו את מה עובד שללא ספק עזר לשיווק שלנו לשגשג.״" },
              { name: "תרגו", text: "״מעקב המרות פשוט ומדויק שנתן לנו לראשונה שקט נפשי וידיעה ברורה של מאיפה מגיע כל שקל של הכנסה.״" },
            ].map((t, idx) => (
              <div key={idx} style={{ ...glassStyle, padding: "28px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <p style={{ fontFamily: "var(--font-body), sans-serif", fontSize: "0.93rem", color: "var(--muted)", lineHeight: 1.7, fontStyle: "italic", marginBottom: "20px" }}>
                  {t.text}
                </p>
                <h4 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.97rem", color: "var(--text)", marginTop: "auto" }}>
                  {t.name}
                </h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section className="wao-section" id="faq">
        <div className="wao-container" style={{ maxWidth: "800px" }}>
          <div style={{ textAlign: "center", marginBottom: "50px" }}>
            <div className="eyebrow" style={{ marginInline: "auto" }}>שאלות ותשובות</div>
            <h2 style={sectionTitleStyle}>כל מה שצריך לדעת על המערכת</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {FAQS.map((faq, idx) => (
              <details
                key={idx}
                style={{
                  ...glassStyle,
                  padding: "0",
                  cursor: "pointer",
                  overflow: "hidden",
                }}
                className="faq-details"
              >
                <summary
                  style={{
                    listStyle: "none",
                    padding: "20px 24px",
                    fontFamily: "var(--font-rubik), sans-serif",
                    fontWeight: 600,
                    fontSize: "1.05rem",
                    color: "var(--text)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    outline: "none",
                  }}
                >
                  <span>{faq.q}</span>
                  <span style={{ fontSize: "1.2rem", color: "var(--accent)", transition: "transform 0.2s" }} className="faq-chevron">↓</span>
                </summary>
                <div
                  style={{
                    padding: "0 24px 20px 24px",
                    fontFamily: "var(--font-body), sans-serif",
                    color: "var(--muted)",
                    fontSize: "0.95rem",
                    lineHeight: 1.7,
                    borderTop: "1px solid var(--border-light)",
                    cursor: "default",
                  }}
                >
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact Section ── */}
      <section className="wao-section" id="contact" style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
        <div className="wao-container" style={{ maxWidth: "600px" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div className="eyebrow" style={{ marginInline: "auto" }}>צרו איתנו קשר</div>
            <h2 style={{ ...sectionTitleStyle, fontSize: "2rem" }}>מוכנים להזניק את רווחיות העסק?</h2>
            <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", fontSize: "0.95rem", marginTop: "12px" }}>
              השאירו פרטים ונשמח להתאים לכם את חבילת המעקב וה-CRM המדויקת ביותר.
            </p>
          </div>

          <div style={glassStyle} className="contact-form-container">
            <div style={{ padding: "40px 32px" }}>
              <ContactForm source="maoved-landing-page" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
