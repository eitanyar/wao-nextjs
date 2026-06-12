import type { Metadata } from "next";
import Link from "next/link";
import GT from "@/components/GlossaryTerm";

const CANONICAL = "https://www.wao.co.il/build";

export const metadata: Metadata = {
  title: "בניית אתרי Next.js — מהיר, מאובטח ו-SEO מובנה",
  description:
    "בניית אתרי Next.js עם Core Web Vitals ירוקים ו-SEO מובנה. מיגרציה מ-WordPress, חבילות לאתר חדש. WAO — 20+ שנות ניסיון. מחירים ברורים בשקלים.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "בניית אתרי Next.js — מהיר, מאובטח ו-SEO מובנה | WAO",
    description: "אתרי Next.js עם Core Web Vitals ירוקים ו-SEO מובנה. מיגרציה מ-WordPress. WAO מאז 2006.",
    url: CANONICAL,
    type: "website",
  },
};

const PACKAGES = [
  {
    id: "vitrina",
    name: "ויטרינה",
    nameEn: "Showcase Website",
    price: 2490,
    tag: "לעסקים שמתחילים",
    desc: "אתר מקצועי, מהיר ומדורג — עד 12 עמודים",
    items: [
      "עד 12 עמודים (בית, אודות, שירותים, בלוג, צור קשר ועוד)",
      "Core Web Vitals ירוקים — 95+ בכל מדד",
      "SEO בסיסי: metadata, sitemap, Schema.org",
      "רספונסיב + RTL מושלם",
      "הגדרת Google Search Console ו-Analytics",
      "טפסי יצירת קשר + WhatsApp לייב צ׳אט",
      "30 יום תמיכה לאחר השקה",
    ],
    highlight: false,
  },
  {
    id: "business",
    name: "עסקי",
    nameEn: "Business Website",
    price: 14450,
    tag: "הנפוץ ביותר",
    desc: "פלטפורמה שלמה עם ידע, תוכן וסמכות",
    items: [
      "עד 30 עמודים + מדור ידע/בלוג",
      "הכל מ׳ויטרינה׳ +",
      "מבנה Topical Authority — גוגל יזהה אתכם כסמכות",
      "אופטימיזציה לסיכומי AI Overviews",
      "E-E-A-T signaling מלא",
      "CMS לעריכה עצמית של תוכן",
      "60 יום תמיכה + דוח ביצועים לאחר שנה",
    ],
    highlight: true,
  },
];

const MIGRATION_PACKAGES = [
  {
    id: "migration-standard",
    name: "מיגרציה — סטנדרט",
    nameEn: "WordPress Migration Standard",
    price: 7650,
    tag: "עד 50 עמודים",
    desc: "העברה מלאה מ-WordPress ל-Next.js",
    items: [
      "העברת כל התוכן (עמודים, פוסטים, תמונות)",
      "שמירת URLs קיימים + הפניות 301",
      "אודיט SEO מלא במהלך ההגירה",
      "אופטימיזציית ביצועים — 3x-5x מהר יותר",
      "90 יום ניטור לאחר השקה",
      "העברת Analytics ו-Search Console",
    ],
    highlight: false,
  },
  {
    id: "migration-large",
    name: "מיגרציה — גדול",
    nameEn: "WordPress Migration Large",
    price: null,
    tag: "50+ עמודים",
    desc: "לאתרים גדולים עם היסטוריית SEO עשירה",
    items: [
      "הכל מ׳מיגרציה סטנדרט׳ +",
      "העברת 50-500 עמודים + ארכיון",
      "מיפוי מלא של redirects ואיתור שגיאות",
      "ניקוי Indexing Bloat לפני ואחרי",
      "תכנון Content Silos מחדש",
      "ייעוץ SEO מלא לאורך הפרויקט",
    ],
    highlight: false,
  },
];

const INCLUDED = [
  { icon: "⚡", title: "100/100 Core Web Vitals", desc: "כל אתר שאנחנו בונים מגיע עם ציון ירוק ב-Google PageSpeed. לא 80 ולא 90 — 95 ומעלה. זה הסטנדרט שלנו." },
  { icon: "🔐", title: "אבטחה ללא פלאגינים", desc: "WordPress צריך 30 פלאגינים ועדכונים שבועיים. Next.js לא צריך כלום. אין גרסאות לעדכן, אין חורי אבטחה מפלאגינים." },
  { icon: "📱", title: "Mobile-First בDNA", desc: "גוגל אינדקס לפי גרסת המובייל. האתר שלכם נבנה ממובייל לדסקטופ — לא ההפך. כל פיקסל מחושב לאצבע." },
  { icon: "🤖", title: "Schema.org מובנה", desc: "כל עמוד כולל Structured Data שגוגל קורא: ארגון, שירות, שאלות נפוצות, breadcrumbs. מה שמגדיל נוכחות ב-SERP וב-AI." },
  { icon: "🔗", title: "SEO מובנה מהיסוד", desc: "metadata דינמי, sitemap אוטומטי, canonical tags, hreflang לפי הצורך. לא תוסף — קוד אמיתי שמובנה בארכיטקטורה." },
  { icon: "🚀", title: "CDN גלובלי", desc: "האתר מוגש מ-edge nodes ברחבי העולם. גולש מתל אביב, חיפה או ניו יורק — קבלת תגובה ב-50ms." },
];

const SEO_ADDONS = [
  { label: "ניטור SEO חודשי", price: "1,500 ₪/חודש", desc: "מעקב דירוגים, דוח Search Console, התראות על בעיות טכניות.", href: "/seo" },
  { label: "ניהול SEO מלא", price: "מ-2,500 ₪/חודש", desc: "אסטרטגיה, אופטימיזציה שוטפת, בניית Topical Authority.", href: "/seo" },
  { label: "שיווק תוכן", price: "מ-3,500 ₪/חודש", desc: "מחקר, כתיבה ואופטימיזציה של מאמרים שמביאים תנועה אורגנית.", href: "/content" },
];

const FAQS = [
  {
    q: "למה Next.js ולא WordPress?",
    a: "WordPress הוא מערכת מ-2003 שנבנתה לבלוגים. היום היא מריצה 40% מהאינטרנט — והאטיות שלה ניכרת. Next.js הוא פריימוורק מ-2016 שנבנה לביצועים מהיום הראשון. אתר Next.js טוען 3-5x מהר יותר, מאובטח יותר, ומקבל דירוג גבוה יותר בגוגל — כי גוגל מעריך מהירות ו-Core Web Vitals.",
  },
  {
    q: "האם מיגרציה מ-WordPress תפגע ב-SEO שלי?",
    a: "לא — אם עושים את זה נכון. אנחנו שומרים על כל ה-URLs הקיימים (או בונים הפניות 301 לכל URL שמשתנה), מעבירים את כל ה-metadata, ומוסיפים Structured Data שלא היה לכם קודם. לרוב הלקוחות שלנו, המיגרציה שיפרה את ה-SEO — לא פגעה.",
  },
  {
    q: "כמה זמן לוקח לבנות אתר?",
    a: "ויטרינה: 3-4 שבועות. עסקי: 5-7 שבועות. מיגרציה: 4-6 שבועות בהתאם לגודל האתר. אנחנו עובדים עם כלי AI מתקדמים שמקצרים זמן פיתוח — הזמן שנחסך הולך לאיכות ה-SEO, לא לכיס שלנו.",
  },
  {
    q: "האם אוכל לערוך תוכן לבד?",
    a: "בחבילה העסקית — כן. מספקים CMS (מערכת ניהול תוכן) שמאפשרת לערוך טקסטים, להוסיף פוסטים ולעדכן תמונות בלי לגעת בקוד. בחבילת הויטרינה — עדכונים מינוריים דרכנו, שינויים גדולים בדיסקאונט ללקוחות חוזרים.",
  },
  {
    q: "מה ההבדל בין ה-SEO המובנה לחבילות ה-SEO החודשיות?",
    a: "האתר שאנחנו בונים כבר מגיע עם יתרון SEO טכני של פי 2 לעומת WordPress ממוצע: Core Web Vitals ירוקים, Structured Data, מהירות, מבנה נכון. אבל SEO הוא מרתון — דירוגים שמגיעים מאסטרטגיית תוכן ו-Topical Authority לוקחים 3-12 חודשים. חבילות ה-SEO החודשיות הן השלב הבא, לא הבסיס.",
  },
];

const schemas = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${CANONICAL}#webpage`,
    url: CANONICAL,
    name: "בניית אתרי Next.js — WAO",
    description: "בניית אתרי Next.js עם Core Web Vitals ירוקים ו-SEO מובנה. מיגרציה מ-WordPress.",
    isPartOf: { "@type": "WebSite", "@id": "https://www.wao.co.il/#website" },
  },
  ...PACKAGES.map((p) => ({
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${CANONICAL}#${p.id}`,
    name: p.nameEn,
    description: p.desc,
    url: CANONICAL,
    brand: { "@type": "Brand", name: "WAO" },
    offers: {
      "@type": "Offer",
      price: p.price.toString(),
      priceCurrency: "ILS",
      availability: "https://schema.org/InStock",
      url: CANONICAL,
      seller: { "@type": "Organization", "@id": "https://www.wao.co.il/#org" },
    },
  })),
  ...MIGRATION_PACKAGES.filter((p) => p.price !== null).map((p) => ({
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${CANONICAL}#${p.id}`,
    name: p.nameEn,
    description: p.desc,
    url: CANONICAL,
    brand: { "@type": "Brand", name: "WAO" },
    offers: {
      "@type": "Offer",
      price: (p.price as number).toString(),
      priceCurrency: "ILS",
      availability: "https://schema.org/InStock",
      url: CANONICAL,
      seller: { "@type": "Organization", "@id": "https://www.wao.co.il/#org" },
    },
  })),
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: "https://www.wao.co.il" },
      { "@type": "ListItem", position: 2, name: "בניית אתרים", item: CANONICAL },
    ],
  },
];

export default function BuildPage() {
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
        <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "880px" }}>
          <div className="badge" style={{ marginBottom: "28px" }}>
            <span className="badge-dot" />
            בניית אתרים — WAO מאז 2006
          </div>
          <h1 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(2.4rem,5.5vw,4.2rem)", lineHeight: 1.08, letterSpacing: "-0.025em", marginBottom: "24px" }}>
            הוורדפרס שלכם עולה לכם כסף —{" "}
            <span className="text-gradient">כל יום</span>
          </h1>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.2rem)", marginBottom: "20px", maxWidth: "660px" }}>
            כל שנייה שהאתר שלכם מתעכב בטעינה חותכת 7% מההמרות בשטח. בזמן שאתר וורדפרס ישראלי טיפוסי נגרר על פני 4–7 שניות, אתר <GT term="Next.js">Next.js</GT> שאנחנו בונים לכם טס בפחות משנייה אחת.
          </p>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.15rem)", marginBottom: "40px", maxWidth: "660px" }}>
            אנחנו לא סתם כותבים קוד, אלא מזריקים לתוכו 20+ שנות ניסיון ב-SEO טכני. האתר שלכם ייוולד עם מדדי חוויית משתמש (<GT term="Core Web Vitals">Core Web Vitals</GT>) ירוקים בוהקים וארכיטקטורה שמנועי ה-AI ו<GT term="AI Overviews">גוגל</GT> פשוט אוהבים לרוץ עליה.
          </p>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <a href="#packages" className="btn-primary" style={{ fontSize: "1.05rem", padding: "15px 36px" }}>
              ראו חבילות ומחירים
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <a href="tel:0526148860" className="btn-outline" style={{ fontSize: "1rem" }}>
              📞 שיחה ללא עלות
            </a>
          </div>

          <div style={{ marginTop: "56px", paddingTop: "40px", borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "28px" }}>
            {[
              { n: "95+", l: "PageSpeed Score" },
              { n: "3x-5x", l: "מהיר מ-WordPress" },
              { n: "20+", l: "שנות ניסיון SEO" },
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

      {/* ── The real cost of WordPress ── */}
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <div className="eyebrow">הבעיה האמיתית</div>
          <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
            WordPress — הבחירה של{" "}
            <span className="text-gradient">2010, לא 2026</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px", marginTop: "36px" }}>
            {[
              {
                icon: "🐢",
                title: "איטיות שעולה לקוחות",
                body: (
                  <>
                    גוגל מעניש אתרים איטיים ומוריד אותם בדירוג. כשגולש נתקע ומחכה 5 שניות ל<GT term="LCP">טעינה</GT> – 70% מהאנשים פשוט יברחו למתחרים שלכם בלי לקרוא מילה.
                  </>
                ),
              },
              {
                icon: "🔧",
                title: "תחזוקה שמבזבזת זמן",
                body: "וורדפרס מאלץ אתכם להתעסק עם עדכוני אבטחה שבועיים, פלאגינים שפתאום מתנגשים וסיוטי גיבוי. רוב העסקים מגיעים אלינו אחרי שהאתר שלהם קרס או נפרץ. ב-Next.js אין פלאגינים שבירים – ואין סיוטים.",
              },
              {
                icon: "📉",
                title: "SEO שמתחיל במגרעת",
                body: (
                  <>
                    מערכות וורדפרס מייצרות קוד כבד, גוררות <GT term="Indexing">אינדוקס</GT> של עמודי זבל וסובלות מסכמות שבורות. Next.js נותן לכם נקודת זינוק מטורפת קדימה, עוד לפני שהעלתם את פוסט התוכן הראשון שלכם.
                  </>
                ),
              },
            ].map((item) => (
              <div key={item.title} style={{ ...glass, padding: "clamp(22px,3vw,30px)" }}>
                <div style={{ fontSize: "1.8rem", marginBottom: "14px", lineHeight: 1 }}>{item.icon}</div>
                <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1.05rem", marginBottom: "10px", color: "var(--text)" }}>{item.title}</h3>
                <p style={{ ...bodyStyle, fontSize: "0.92rem" }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What makes WAO builds different ── */}
      <section className="wao-section">
        <div className="wao-container" style={{ maxWidth: "880px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(32px,5vw,64px)", alignItems: "center" }}>
            <div>
              <div className="eyebrow">הגישה שלנו</div>
              <h2 style={{ ...h2Style, fontSize: "clamp(1.5rem,2.8vw,2.2rem)" }}>
                Next.js + SEO עמוק = משהו שקשה למצוא
              </h2>
              <p style={{ ...bodyStyle, marginBottom: "20px" }}>
                מתכנתים רגילים יודעים לבנות אתרים יפים. אנשי SEO מבינים מה האלגוריתם מחפש. WAO עושים את שניהם במקביל – וזה בדיוק ההבדל שעושה את ההבדל.
              </p>
              <p style={{ ...bodyStyle, marginBottom: "20px" }}>
                אנחנו עובדים עם כלי AI מתקדמים שמאפשרים פיתוח מהיר בלי לוותר על האיכות. פרויקט שבעבר נמרח על פני 3 חודשים נסגר אצלנו תוך 4–6 שבועות. את הזמן היקר שנחסך אנחנו משקיעים במקומות שאין בהם קיצורי דרך: מחקר עומק, הנדסת סמכות נושאית (Topical Authority) ו<GT term="E-E-A-T">אותות אמינות</GT> לרובוטים של גוגל.
              </p>
              <p style={{ ...bodyStyle }}>
                לכל אתר שאנחנו בונים יש ארכיטקטורת מידע שתומכת בצמיחה ארוכת טווח — לא רק עמוד בית יפה.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "Core Web Vitals ירוקים", sub: "95+ PageSpeed מהיום הראשון", icon: "⚡" },
                { label: "SEO מובנה בקוד", sub: "לא פלאגין — ארכיטקטורה אמיתית", icon: "🏗️" },
                { label: "Structured Data לכל עמוד", sub: "גוגל וסיכומי AI קוראים אתכם", icon: "🤖" },
                { label: "Mobile-First בDNA", sub: "גוגל אינדקס לפי המובייל שלכם", icon: "📱" },
                { label: "פיתוח AI-assisted", sub: "מהיר יותר, עם איכות SEO גבוהה יותר", icon: "🧠" },
              ].map((item) => (
                <div key={item.label} style={{ ...glass, padding: "14px 18px", display: "flex", gap: "14px", alignItems: "center" }}>
                  <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>{item.label}</div>
                    <div style={{ fontFamily: "var(--font-body), sans-serif", fontSize: "0.8rem", color: "var(--muted)" }}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── In every build ── */}
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container">
          <div style={{ marginBottom: "48px" }}>
            <div className="eyebrow">בכל אתר שאנחנו בונים</div>
            <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
              הבסיס שלא מתפשרים עליו
            </h2>
            <p style={{ ...bodyStyle, maxWidth: "560px", marginTop: "12px" }}>
              לא משנה איזו חבילה תבחרו — כל אתר יוצא עם הסטנדרטים האלה. אין גרסת "מינימום", יש רק "נכון".
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1px", background: "var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border)" }}>
            {INCLUDED.map((item) => (
              <div key={item.title} className="why-cell">
                <div style={{ fontSize: "1.8rem", marginBottom: "12px", lineHeight: 1 }}>{item.icon}</div>
                <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1rem", marginBottom: "8px" }}>{item.title}</h3>
                <p style={{ ...bodyStyle, fontSize: "0.88rem" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Packages ── */}
      <section id="packages" className="wao-section">
        <div className="wao-container">
          {/* New sites */}
          <div style={{ marginBottom: "72px" }}>
            <div className="eyebrow">אתרים חדשים</div>
            <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)", marginBottom: "8px" }}>
              בחרו את החבילה{" "}
              <span className="text-gradient">שמתאימה לכם</span>
            </h2>
            <p style={{ ...bodyStyle, marginBottom: "40px", maxWidth: "540px" }}>
              כל חבילה כוללת תשלום חד-פעמי — ללא דמי תחזוקה כפויים, ללא נעילת ספק. הבעלות על הקוד שלכם.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
              {PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  style={{
                    ...glass,
                    padding: "clamp(28px,3.5vw,40px)",
                    position: "relative",
                    border: pkg.highlight ? "1px solid rgba(74,227,181,0.4)" : "1px solid var(--border)",
                  }}
                >
                  {pkg.highlight && (
                    <div style={{ position: "absolute", top: "-13px", right: "24px", background: "var(--accent)", color: "#000", fontSize: "0.75rem", fontWeight: 800, padding: "3px 12px", borderRadius: "var(--radius-pill)", fontFamily: "var(--font-rubik), sans-serif" }}>
                      {pkg.tag}
                    </div>
                  )}
                  {!pkg.highlight && (
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "8px" }}>{pkg.tag}</div>
                  )}
                  <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "1.5rem", color: "var(--text)", marginBottom: "4px" }}>{pkg.name}</h3>
                  <p style={{ ...bodyStyle, fontSize: "0.9rem", marginBottom: "20px" }}>{pkg.desc}</p>
                  <div style={{ marginBottom: "24px" }}>
                    <span style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "2.4rem", color: "var(--text)", lineHeight: 1 }}>
                      {pkg.price.toLocaleString("he-IL")} ₪
                    </span>
                    <span style={{ fontFamily: "var(--font-body), sans-serif", fontSize: "0.82rem", color: "var(--muted)", marginRight: "6px" }}>חד-פעמי + מע"מ</span>
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "9px", marginBottom: "28px" }}>
                    {pkg.items.map((item) => (
                      <li key={item} style={{ fontFamily: "var(--font-body), sans-serif", fontSize: "0.88rem", color: "var(--muted)", display: "flex", alignItems: "flex-start", gap: "8px", lineHeight: 1.5 }}>
                        <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: "2px", fontSize: "0.75rem" }}>✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="tel:0526148860"
                    className={pkg.highlight ? "btn-primary" : "btn-outline"}
                    style={{ display: "block", textAlign: "center", fontSize: "0.95rem", padding: "12px 24px" }}
                  >
                    צרו קשר לפרטים
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* WordPress migrations */}
          <div>
            <div className="eyebrow">מיגרציה מ-WordPress</div>
            <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)", marginBottom: "8px" }}>
              יש לכם אתר WordPress קיים?{" "}
              <span className="text-gradient">אנחנו ממירים אותו</span>
            </h2>
            <p style={{ ...bodyStyle, marginBottom: "36px", maxWidth: "560px" }}>
              שומרים את כל ה-SEO שצברתם. משפרים את מה שהיה חלש. יוצאים עם אתר מהיר פי כמה — בלי להתחיל מאפס.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
              {MIGRATION_PACKAGES.map((pkg) => (
                <div key={pkg.id} style={{ ...glass, padding: "clamp(28px,3.5vw,40px)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "8px" }}>{pkg.tag}</div>
                  <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "1.4rem", color: "var(--text)", marginBottom: "4px" }}>{pkg.name}</h3>
                  <p style={{ ...bodyStyle, fontSize: "0.9rem", marginBottom: "20px" }}>{pkg.desc}</p>
                  <div style={{ marginBottom: "24px" }}>
                    {pkg.price ? (
                      <>
                        <span style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "2.4rem", color: "var(--text)", lineHeight: 1 }}>
                          {pkg.price.toLocaleString("he-IL")} ₪
                        </span>
                        <span style={{ fontFamily: "var(--font-body), sans-serif", fontSize: "0.82rem", color: "var(--muted)", marginRight: "6px" }}>חד-פעמי + מע"מ</span>
                      </>
                    ) : (
                      <span style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "1.8rem", color: "var(--text)", lineHeight: 1 }}>
                        מחיר לפי היקף
                      </span>
                    )}
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "9px", marginBottom: "28px" }}>
                    {pkg.items.map((item) => (
                      <li key={item} style={{ fontFamily: "var(--font-body), sans-serif", fontSize: "0.88rem", color: "var(--muted)", display: "flex", alignItems: "flex-start", gap: "8px", lineHeight: 1.5 }}>
                        <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: "2px", fontSize: "0.75rem" }}>✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <a href="tel:0526148860" className="btn-outline" style={{ display: "block", textAlign: "center", fontSize: "0.95rem", padding: "12px 24px" }}>
                    {pkg.price ? "צרו קשר לפרטים" : "קבלו הצעת מחיר"}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SEO Add-ons ── */}
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <div className="eyebrow">תוספות חודשיות — אופציונלי</div>
          <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)", marginBottom: "12px" }}>
            האתר כבר נותן לכם יתרון SEO של פי 2 —{" "}
            <span className="text-gradient">אלה ה-Superchargers</span>
          </h2>
          <p style={{ ...bodyStyle, marginBottom: "36px", maxWidth: "620px" }}>
            האתר שבנינו כבר מתחיל ממקום טוב בהרבה מהמתחרים — Core Web Vitals, מבנה, Structured Data. אבל דירוגים נבנים גם מתוכן ואסטרטגיה שוטפת. החבילות האלה הן הצעד הבא, לא תנאי לבסיס.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
            {SEO_ADDONS.map((addon) => (
              <Link key={addon.label} href={addon.href} style={{ textDecoration: "none" }}>
                <div style={{ ...glass, padding: "24px 26px", height: "100%", transition: "border-color 0.2s", cursor: "pointer" }}>
                  <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1rem", color: "var(--text)", marginBottom: "4px" }}>{addon.label}</div>
                  <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "1.1rem", color: "var(--accent)", marginBottom: "10px" }}>{addon.price}</div>
                  <p style={{ ...bodyStyle, fontSize: "0.88rem" }}>{addon.desc}</p>
                  <div style={{ marginTop: "14px", fontSize: "0.82rem", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif" }}>פרטים נוספים ←</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="wao-section">
        <div className="wao-container" style={{ maxWidth: "800px" }}>
          <div className="eyebrow">שאלות נפוצות</div>
          <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)", marginBottom: "48px" }}>
            כל מה שרציתם לדעת{" "}
            <span className="text-gradient">על בניית אתרים</span>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {FAQS.map((faq) => (
              <details key={faq.q} style={{ ...glass }}>
                <summary style={{ padding: "22px 24px", cursor: "pointer", fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1.02rem", lineHeight: 1.4, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                  {faq.q}
                  <span style={{ fontSize: "1.2rem", color: "var(--accent)", flexShrink: 0 }}>+</span>
                </summary>
                <div style={{ padding: "0 24px 22px", ...bodyStyle, lineHeight: 1.85 }}>{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Related ── */}
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container">
          <div className="eyebrow">קראו עוד</div>
          <h2 style={{ ...h2Style, fontSize: "clamp(1.4rem,2.5vw,2rem)", marginBottom: "28px" }}>
            מאמרים קשורים ושירותים משלימים
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "14px" }}>
            {[
              { href: "/knowledge/core-web-vitals", label: "מה זה Core Web Vitals ולמה זה חשוב?" },
              { href: "/knowledge/javascript-seo", label: "JavaScript SEO — איך גוגל קורא קוד?" },
              { href: "/knowledge/page-speed-optimization", label: "אופטימיזציית מהירות אתר — מדריך" },
              { href: "/knowledge/structured-data", label: "Structured Data — איך גוגל קורא אתכם" },
              { href: "/seo", label: "שירות קידום אתרים (SEO) — WAO" },
              { href: "/seo/topical-authority", label: "Topical Authority — להפוך למומחים בנישה" },
            ].map((link) => (
              <Link key={link.href} href={link.href} style={{ display: "block", padding: "16px 18px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--surface)", fontFamily: "var(--font-body), sans-serif", fontSize: "0.9rem", color: "var(--text)", textDecoration: "none" }}>
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
              <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem,3.5vw,2.6rem)", lineHeight: 1.15, marginBottom: "16px" }}>
                שיחה אחת — ותדעו בדיוק{" "}
                <span className="text-gradient">מה האתר שלכם צריך</span>
              </h2>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "32px", maxWidth: "460px", margin: "0 auto 32px", lineHeight: 1.75 }}>
                נבדוק את האתר הנוכחי שלכם, נגיד לכם בדיוק מה חוסם את ה-SEO, ונציג הצעה מדויקת — ללא התחייבות.
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
                ✓ בדיקת אתר חינם · ✓ ללא חוזה · ✓ מענה תוך 24 שעות
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
