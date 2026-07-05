import type { Metadata } from "next";
import Link from "next/link";
import GT from "@/components/GlossaryTerm";

export const metadata: Metadata = {
  title: "קורסים חינמיים לשיווק דיגיטלי",
  description:
    "קורסי וידאו חינמיים בשיווק דיגיטלי: Google Ads, Google Tag Manager, SEO, Google My Business ושיווק שותפים — ממתחיל ועד מתקדם.",
  alternates: { canonical: "https://www.wao.co.il/training" },
  openGraph: {
    title: "קורסים חינמיים לשיווק דיגיטלי | WAO",
    description: "6 קורסי וידאו חינמיים — Google Ads, GTM, SEO, GMB ועוד.",
    url: "https://www.wao.co.il/training",
    type: "website",
    locale: "he_IL",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "דף הבית", item: "https://www.wao.co.il" },
    { "@type": "ListItem", position: 2, name: "הכשרות", item: "https://www.wao.co.il/training" },
  ],
};

const courseListSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "קורסי שיווק דיגיטלי חינמיים — WAO",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      item: {
        "@type": "Course",
        name: "קורס Google Ads — אסטרטגיה ב-2026/2027",
        url: "https://www.wao.co.il/training/google-ads-course",
        provider: { "@type": "Organization", name: "WAO", url: "https://www.wao.co.il" },
        isAccessibleForFree: true,
      },
    },
  ],
};

// ── Course data ────────────────────────────────────────────────────────────────

interface Course {
  title: string; subtitle: string; desc: string; href: string | null;
  lessons: number | null; totalLessons: number | null;
  level: string; live: boolean; icon: string; tags: string[];
  isNew?: boolean;
}
interface Track { id: string; icon: string; label: string; color: string; desc: string; courses: Course[]; }

const TRACKS: Track[] = [
  {
    id: "advertising",
    icon: "📢",
    label: "פרסום ממומן",
    color: "#4ae3b5",
    desc: "מ-Google Ads ו-YouTube ועד הגדרת מעקב המרות מדויק",
    courses: [
      {
        title: "קורס Google Ads",
        subtitle: "אסטרטגיה ב-2026/2027",
        desc: "18 שיעורי וידאו: מבנה חשבון, Smart Bidding, Performance Max, Landing Pages ואסטרטגיית Pareto. הקורס לניהול Google Ads ב-2026.",
        href: "/training/google-ads-course",
        lessons: 15,
        totalLessons: 18,
        level: "מתחיל עד מתקדם",
        live: true,
        icon: "🎯",
        tags: ["Google Ads", "PPC", "Smart Bidding"],
      },
      {
        title: "Google Tag Manager",
        subtitle: "לפרסומאים — ללא קוד",
        desc: "11 שיעורים מעשיים שילמדו אתכם איך לעקוב אחרי המרות, להתקין GA4 ולהבין מה הגולשים עושים באתר – בלי לגעת בשורת קוד אחת.",
        href: "/training/google-tag-manager",
        lessons: 11,
        totalLessons: 11,
        level: "מתחיל",
        live: true,
        icon: "🏷️",
        tags: ["GTM", "Tracking", "Analytics"],
      },
      {
        title: 'קורס "מה עובד"',
        subtitle: "מעקב המרות וניהול לידים",
        desc: "איך להטמיע את מערכת 'מה עובד', לחבר מספרים וירטואליים דינמיים, לעקוב אחר טפסים ולשדר ערך המרה אמיתי לגוגל Ads ופייסבוק.",
        href: null,
        lessons: null,
        totalLessons: null,
        level: "מתחיל",
        live: false,
        icon: "📊",
        tags: ["CRM", "Tracking", "Offline Conversions"],
        isNew: true,
      },
    ],
  },
  {
    id: "seo",
    icon: "🔍",
    label: "קידום אורגני",
    color: "#a78bfa",
    desc: "SEO מודרני, Local SEO ופיצוח AI Overviews – הדרך להביא תנועה חמה בלי לשלם על קליקים",
    courses: [
      {
        title: "קורס SEO",
        subtitle: "קידום אתרים מהיסוד",
        desc: "Technical SEO, Topical Authority, On-Page SEO ו-Link Building — קורס מלא לקידום אתרים אורגני ב-2026.",
        href: "/training/seo-course",
        lessons: null,
        totalLessons: null,
        level: "מתחיל עד מתקדם",
        live: false,
        icon: "📈",
        tags: ["SEO", "Technical SEO", "Content"],
      },
      {
        title: "Google My Business",
        subtitle: "קידום עסק מקומי",
        desc: "איך לאלף את פרופיל העסק שלכם בגוגל, לבנות אסטרטגיית ביקורות מנצחת ולהשתלט על המפה המקומית.",
        href: "/training/google-my-business",
        lessons: 14,
        totalLessons: 14,
        level: "מתחיל",
        live: true,
        icon: "📍",
        tags: ["GMB", "Local SEO", "ביקורות"],
      },
    ],
  },
  {
    id: "monetization",
    icon: "💰",
    label: "הכנסות דיגיטליות",
    color: "#f59e0b",
    desc: "שיווק שותפים, מוצרים דיגיטליים והכנסה מהאינטרנט",
    courses: [
      {
        title: "מדריך שיווק שותפים",
        subtitle: "מאפס לעסק דיגיטלי",
        desc: "22 מדריכים שנכתבו בדם מהשטח: תוכניות שותפים של אמזון, בוקינג ועד KSP, שיטות להזרמת תנועה ודרכים לעשות לזה סקייל באדס.",
        href: "/training/affiliate-marketing",
        lessons: 5,
        totalLessons: 5,
        level: "מתחיל עד מתקדם",
        live: true,
        icon: "🤝",
        tags: ["Affiliate", "Content", "SEO"],
      },
      {
        title: "40 דרכים להרוויח מהבית",
        subtitle: "מה באמת עובד ב-2026",
        desc: "מסקרים קטנים ועד הקמת אימפריה דיגיטלית – דירוג אמיתי וכנה לפי פוטנציאל הרווח בשטח.",
        href: "/training/make-money-online",
        lessons: null,
        totalLessons: null,
        level: "כל הרמות",
        live: true,
        icon: "🌐",
        tags: ["Affiliate", "Freelance", "Online Business"],
      },
    ],
  },
  {
    id: "diy-ai",
    icon: "🤖",
    label: "שיווק עצמי עם AI",
    color: "#60a5fa",
    desc: "איך לבנות את מערך השיווק של העסק שלך מאפס בעזרת כלי בינה מלאכותית בקצב ובסדר נכון",
    courses: [
      {
        title: "DIY שיווק עצמי",
        subtitle: "תוכנית מובנית לעסקים B2C",
        desc: "קורס מקיף של 4 שלבים: כתיבה שיווקית, עמודי נחיתה, קידום מפות וקמפיין ממומן בגוגל מותאם לנישה שלך בעזרת AI.",
        href: "/training/diy-ai-marketing",
        lessons: 8,
        totalLessons: 8,
        level: "מתחיל",
        live: true,
        icon: "💡",
        tags: ["AI", "DIY", "Local Marketing"],
      },
      {
        title: "בנייה ו-SEO בעידן ה-AI",
        subtitle: "מדומיין לאתר שמביא לקוחות",
        desc: "5 שיעורי וידאו: דומיין, תיאור העסק ל-AI, תוכן שגוגל אוהב ועמודי שירות שממירים. הקורס שמלמד לבנות נוכחות דיגיטלית אמיתית מאפס — בלי מתכנת.",
        href: "/training/website-course",
        lessons: 5,
        totalLessons: null,
        level: "מתחיל",
        live: true,
        icon: "🌐",
        tags: ["AI", "אתר", "SEO", "תוכן"],
        isNew: true,
      },
    ],
  },
];

const LEARNING_PATH = [
  {
    step: 1,
    icon: "🏷️",
    title: "Google Tag Manager",
    desc: "11 שיעורים — הטמעת Tracking לפני שמתחילים לפרסם",
    status: "זמין עכשיו",
    href: "/training/google-tag-manager",
    live: true,
  },
  {
    step: 2,
    icon: "🎯",
    title: "Google Ads",
    desc: "18 שיעורים — הקורס הזמין עכשיו",
    status: "זמין עכשיו",
    href: "/training/google-ads-course",
    live: true,
  },
  {
    step: 3,
    icon: "🔍",
    title: "קורס SEO",
    desc: "תנועה אורגנית שמשלימה את הפרסום",
    status: "בקרוב",
    href: "/training/seo-course",
  },
  {
    step: 4,
    icon: "📍",
    title: "Google My Business",
    desc: "לידים מקומיים ב-Local Pack",
    status: "זמין עכשיו",
    href: "/training/google-my-business",
    live: true,
  },
];

export default function TrainingHub() {
  const totalLive = TRACKS.flatMap((t) => t.courses).filter((c) => c.live).length;
  const totalCourses = TRACKS.flatMap((t) => t.courses).length;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseListSchema) }} />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: "clamp(110px,14vw,160px)",
          paddingBottom: "clamp(56px,7vw,80px)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
            width: "80vw", height: "60vh",
            background: "radial-gradient(ellipse at center, rgba(74,227,181,0.07) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div className="hero-grid" />
        <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "760px" }}>
          <nav aria-label="breadcrumb" className="breadcrumb">
            <Link href="/">דף הבית</Link>
            <span className="breadcrumb-sep" aria-hidden>›</span>
            <span aria-current="page">הכשרות</span>
          </nav>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "24px", marginTop: "16px" }}>
            <span className="badge"><span className="badge-dot" />חינם לחלוטין</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "var(--radius-pill)", fontSize: "0.78rem", fontWeight: 600, background: "rgba(74,227,181,0.1)", color: "var(--accent)", border: "1px solid rgba(74,227,181,0.2)", fontFamily: "var(--font-body), sans-serif" }}>
              {totalLive} קורסים זמינים מתוך {totalCourses}
            </span>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 900,
              fontSize: "clamp(2rem,4.5vw,3.2rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginBottom: "20px",
            }}
          >
            קורסים חינמיים{" "}
            <span className="text-gradient">לשיווק דיגיטלי</span>
          </h1>

          <p
            style={{
              fontSize: "clamp(1rem,1.6vw,1.1rem)",
              color: "var(--muted)",
              lineHeight: 1.75,
              fontFamily: "var(--font-body), sans-serif",
              marginBottom: "32px",
              maxWidth: "620px",
            }}
          >
            שיעורי וידאו מעשיים — Google Ads, Tag Manager, SEO, Google My Business ושיווק שותפים.
            הכל מבוסס על 17 שנות ניסיון מעשי בשטח, בלי תיאוריות מהספרים.
          </p>

          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <Link href="/training/google-ads-course" className="btn-primary">
              🎯 התחילו עכשיו — קורס Google Ads
            </Link>
            <a href="tel:0526148860" className="btn-outline">
              📞 ייעוץ אישי
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(32px,4vw,48px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="wao-container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "24px", textAlign: "center" }}>
            {[
              { val: "20+", label: "שיעורי וידאו זמינים" },
              { val: String(totalCourses), label: "קורסים בסך הכל" },
              { val: String(TRACKS.length), label: "מסלולי לימוד" },
              { val: "חינם", label: "לצפייה מיידית" },
            ].map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.7rem,2.8vw,2.4rem)", color: "var(--accent)", lineHeight: 1 }}>
                  {s.val}
                </div>
                <div style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "6px", fontFamily: "var(--font-body), sans-serif" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured: Google Ads ─────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(64px,8vw,96px) 0" }}>
        <div className="wao-container">
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif", marginBottom: "10px" }}>
              זמין עכשיו
            </p>
            <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem,3vw,2.3rem)", letterSpacing: "-0.02em" }}>
              החומרים כבר באוויר — <span className="text-gradient">התחילו ללמוד היום</span>
            </h2>
          </div>

          <Link
            href="/training/google-ads-course"
            style={{
              display: "block",
              maxWidth: "780px",
              margin: "0 auto",
              textDecoration: "none",
              background: "var(--elevated)",
              border: "1px solid rgba(74,227,181,0.3)",
              borderRadius: "20px",
              padding: "clamp(28px,4vw,40px)",
              position: "relative",
              overflow: "hidden",
              transition: "border-color 0.18s ease, box-shadow 0.18s ease",
            }}
          >
            <div aria-hidden style={{ position: "absolute", top: 0, right: 0, width: "300px", height: "300px", background: "radial-gradient(ellipse at top right, rgba(74,227,181,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "20px", flexWrap: "wrap" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "rgba(74,227,181,0.12)", border: "1px solid rgba(74,227,181,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", flexShrink: 0 }}>
                  🎯
                </div>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "8px" }}>
                    <span style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "1.3rem", color: "var(--text)" }}>
                      קורס Google Ads
                    </span>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "3px 10px", borderRadius: "var(--radius-pill)", background: "rgba(74,227,181,0.15)", color: "var(--accent)", border: "1px solid rgba(74,227,181,0.3)", fontFamily: "var(--font-body), sans-serif" }}>
                      ✓ זמין עכשיו
                    </span>
                  </div>
                  <p style={{ color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.7, fontFamily: "var(--font-body), sans-serif", marginBottom: "20px" }}>
                    18 שיעורי וידאו: מבנה חשבון, <GT term="Smart Bidding">Smart Bidding</GT>, <GT term="Performance Max">Performance Max</GT>, <GT term="Landing Page">Landing Pages</GT> ואסטרטגיית Pareto.
                    כל מה שצריך כדי לנהל קמפיינים בגוגל ב-2026 – 15 שיעורים ראשונים כבר מחכים לכם.
                  </p>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {["15 שיעורים זמינים", "18 שיעורים סה\"כ", "מתחיל עד מתקדם", "Google Ads"].map((tag) => (
                      <span key={tag} style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: "var(--radius-pill)", background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)", fontFamily: "var(--font-body), sans-serif" }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ flexShrink: 0, alignSelf: "center" }}>
                  <span className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.88rem", pointerEvents: "none" }}>
                    לקורס ←
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ── Course Catalog by Track ───────────────────────────────────────────── */}
      <section style={{ padding: "clamp(64px,8vw,96px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)" }}>
        <div className="wao-container">
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif", marginBottom: "10px" }}>
              קטלוג קורסים
            </p>
            <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem,3vw,2.3rem)", letterSpacing: "-0.02em" }}>
              {TRACKS.length} מסלולי לימוד ·{" "}
              <span className="text-gradient">{totalCourses} קורסים</span>
            </h2>
          </div>

          {TRACKS.map((track) => (
            <div key={track.id} style={{ marginBottom: "52px" }}>
              {/* Track header */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px", paddingBottom: "16px", borderBottom: `2px solid ${track.color}25` }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: `${track.color}14`, border: `1px solid ${track.color}28`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>
                  {track.icon}
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "var(--text)" }}>
                    {track.label}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                    {track.desc}
                  </div>
                </div>
              </div>

              {/* Course cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                {track.courses.map((course) => (
                  <Link
                    key={course.href ?? course.title}
                    href={course.href ?? "#"}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      background: "var(--surface)",
                      border: `1px solid ${course.live ? `${track.color}28` : "var(--border)"}`,
                      borderRadius: "var(--radius)",
                      padding: "22px 24px",
                      textDecoration: "none",
                      opacity: course.live ? 1 : 0.78,
                      transition: "border-color 0.16s ease, opacity 0.16s ease",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {/* New badge */}
                    {"isNew" in course && course.isNew && (
                      <span style={{ position: "absolute", top: "14px", left: "14px", fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: "var(--radius-pill)", background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)", fontFamily: "var(--font-body), sans-serif" }}>
                        חדש בקרוב
                      </span>
                    )}

                    <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "12px" }}>
                      <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: `${track.color}12`, border: `1px solid ${track.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
                        {course.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.98rem", color: "var(--text)", marginBottom: "2px" }}>
                          {course.title}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: track.color, fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}>
                          {course.subtitle}
                        </div>
                      </div>
                    </div>

                    <p style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.65, fontFamily: "var(--font-body), sans-serif", flex: 1, marginBottom: "16px" }}>
                      {course.desc}
                    </p>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.68rem", padding: "2px 8px", borderRadius: "var(--radius-pill)", background: "var(--elevated)", color: "var(--muted)", border: "1px solid var(--border)", fontFamily: "var(--font-body), sans-serif" }}>
                          {course.level}
                        </span>
                        {course.live && course.lessons != null && (
                          <span style={{ fontSize: "0.68rem", padding: "2px 8px", borderRadius: "var(--radius-pill)", background: `${track.color}12`, color: track.color, border: `1px solid ${track.color}25`, fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}>
                            {course.lessons} שיעורים זמינים
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: course.live ? track.color : "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                        {course.live ? "לקורס ←" : "בקרוב"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Recommended learning path ─────────────────────────────────────────── */}
      <section style={{ padding: "clamp(64px,8vw,96px) 0" }}>
        <div className="wao-container" style={{ maxWidth: "700px" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif", marginBottom: "10px" }}>
              המסלול המומלץ
            </p>
            <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.5rem,2.8vw,2.1rem)", letterSpacing: "-0.02em" }}>
              באיזה סדר כדאי ללמוד?
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {LEARNING_PATH.map((step, i) => (
              <div key={step.step} style={{ display: "flex", gap: "0", alignItems: "stretch" }}>
                {/* Timeline line */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "48px", flexShrink: 0 }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: step.live ? "var(--accent)" : "var(--elevated)",
                    border: `2px solid ${step.live ? "var(--accent)" : "var(--border)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                    flexShrink: 0,
                    zIndex: 1,
                  }}>
                    {step.live ? "✓" : step.icon}
                  </div>
                  {i < LEARNING_PATH.length - 1 && (
                    <div style={{ width: "2px", flex: 1, background: "var(--border)", minHeight: "32px" }} />
                  )}
                </div>

                {/* Content */}
                <Link
                  href={step.href}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "12px 16px 12px 0",
                    marginBottom: i < LEARNING_PATH.length - 1 ? "0" : "0",
                    textDecoration: "none",
                    paddingBottom: i < LEARNING_PATH.length - 1 ? "24px" : "12px",
                  }}
                >
                  <div>
                    <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.98rem", color: "var(--text)", marginBottom: "2px" }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                      {step.desc}
                    </div>
                  </div>
                  <span style={{
                    flexShrink: 0,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: "var(--radius-pill)",
                    background: step.live ? "rgba(74,227,181,0.12)" : "var(--elevated)",
                    color: step.live ? "var(--accent)" : "var(--muted)",
                    border: `1px solid ${step.live ? "rgba(74,227,181,0.25)" : "var(--border)"}`,
                    fontFamily: "var(--font-body), sans-serif",
                    whiteSpace: "nowrap",
                  }}>
                    {step.status}
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GTM + GMB callout ─────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(48px,6vw,72px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="wao-container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
            {[
              {
                icon: "🏷️",
                color: "#4ae3b5",
                title: "Google Tag Manager — 11 שיעורים זמינים",
                body: "לפני ששורפים שקל על פרסום, חייבים לוודא שהכל נמדד כמו שצריך. תג מנג'ר מאפשר לכם להרים מערך מעקב מלא (כולל פיקסלים ו-GA4) לגמרי לבד. 11 שיעורים ראשונים כבר זמינים.",
                cta: "לקורס GTM",
                href: "/training/google-tag-manager",
              },
              {
                icon: "📍",
                color: "#a78bfa",
                title: "Google My Business — 14 שיעורים זמינים",
                body: "עסקים מקומיים שמשתלטים על המפה של גוגל גורפים קרוב לחצי מהקליקים בנישה שלהם. בניית פרופיל נכון היא המפתח להחזר השקעה מהיר לעסק פיזי. 14 שיעורים כבר זמינים.",
                cta: "לקורס Google My Business",
                href: "/training/google-my-business",
              },
            ].map((item) => (
              <div key={item.title} style={{ background: "var(--surface)", border: `1px solid ${item.color}20`, borderRadius: "var(--radius)", padding: "24px 28px" }}>
                <div style={{ fontSize: "1.8rem", marginBottom: "12px" }}>{item.icon}</div>
                <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1rem", marginBottom: "10px", color: "var(--text)" }}>
                  {item.title}
                </h3>
                <p style={{ color: "var(--muted)", fontSize: "0.88rem", lineHeight: 1.72, fontFamily: "var(--font-body), sans-serif", marginBottom: "16px" }}>
                  {item.body}
                </p>
                <Link href={item.href} style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.8rem", fontWeight: 600, color: item.color, fontFamily: "var(--font-body), sans-serif", textDecoration: "none" }}>
                  {item.cta} ←
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mentorship CTA ────────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(64px,8vw,96px) 0" }}>
        <div className="wao-container" style={{ textAlign: "center", maxWidth: "560px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "16px" }}>🎓</div>
          <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.5rem,2.8vw,2.1rem)", letterSpacing: "-0.02em", marginBottom: "12px" }}>
            מעדיפים ליווי אישי?
          </h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.75, fontFamily: "var(--font-body), sans-serif", marginBottom: "8px" }}>
            קבוצת מנטורינג חיה עם איתן יריב — ניתוח חשבון, תשובות בזמן אמת, Peer Learning.
          </p>
          <p style={{ color: "var(--muted)", lineHeight: 1.75, fontFamily: "var(--font-body), sans-serif", marginBottom: "28px", fontSize: "0.9rem" }}>
            <strong style={{ color: "var(--accent)" }}>950 ₪/חודש + מע&quot;מ</strong> · ערבות תוצאות 150 יום · ביטול בכל עת
          </p>
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="tel:0526148860" className="btn-primary">📞 שיחת היכרות</a>
            <Link href="/seo/consulting" className="btn-outline">ייעוץ SEO</Link>
          </div>
        </div>
      </section>
    </>
  );
}
