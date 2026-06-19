import type { Metadata } from "next";
import Link from "next/link";
import GT from "@/components/GlossaryTerm";
import LessonGrid from "@/components/LessonGrid";

export const metadata: Metadata = {
  title: "40 דרכים להרוויח כסף מהבית — מה באמת עובד ב-2026",
  description:
    "מדריך ישיר על הדרכים הנפוצות להרוויח כסף מהאינטרנט — מסקרים בתשלום ועד עסק דיגיטלי אמיתי. ללא מכירת חלומות, עם מפת הדרכים האמיתית.",
  alternates: { canonical: "https://www.wao.co.il/training/make-money-online" },
  openGraph: {
    title: "40 דרכים להרוויח כסף מהבית | WAO",
    description: "מסקרים בתשלום ועד שיווק שותפים — האמת על מה עובד ב-2026.",
    url: "https://www.wao.co.il/training/make-money-online",
    type: "article",
    locale: "he_IL",
  },
};

const canonical = "https://www.wao.co.il/training/make-money-online";

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "דף הבית", item: "https://www.wao.co.il" },
    { "@type": "ListItem", position: 2, name: "הכשרות", item: "https://www.wao.co.il/training" },
    { "@type": "ListItem", position: 3, name: "הכנסה מהאינטרנט", item: canonical },
  ],
};

const TIERS = [
  {
    id: "tier-1",
    tier: "🟡 רמה 1",
    label: "כסף קטן — הכנסה צדדית",
    color: "#f59e0b",
    desc: "שיטות אלה עובדות — אבל לא תוכלו להתפרנס מהן. כסף קטן אמיתי, לא רמאות. מצוינות למי שרוצה להתחיל ולהבין איך הכסף עובד באינטרנט.",
    bridge: "הבינות בשיא: מילוי סקרים יגרוף לך 50–200 ₪ בחודש. לקדם את הסקר לאחרים עם קישור שותפים של חברת הסקרים — יכול לגרוף 10×.",
    bridgeCta: "/training/affiliate-marketing",
    bridgeCtaLabel: "מדריך שיווק שותפים →",
    items: [
      { name: "מילוי סקרים בתשלום", effort: "נמוך", earning: "50–200 ₪/חודש", note: "Toluna, Panel4all, Opinion Way — אמיתי, מוגבל" },
      { name: "צפייה בפרסומות", effort: "נמוך", earning: "10–50 ₪/חודש", note: "CapitalAds, Swagbucks — זמן לא שווה הכסף ברוב המקרים" },
      { name: "הורדת אפליקציות בתשלום", effort: "נמוך", earning: "20–80 ₪/חודש", note: "TaskBucks וכדומה — מועט, לשם ניסיון בלבד" },
      { name: "קריאת מיילים בתשלום", effort: "נמוך", earning: "10–40 ₪/חודש", note: "כמעט נכחד, אבל עדיין קיים" },
      { name: "משחקים בתשלום", effort: "בינוני", earning: "100–500 ₪/חודש", note: "Play-to-Earn — שוק הצטמצם ב-2022, ממשיך לרדת" },
      { name: "מבקר אתרים (User Testing)", effort: "נמוך–בינוני", earning: "200–600 ₪/חודש", note: "UserTesting, TryMyUI — 10$+ לסשן, עבודה מהנה" },
    ],
  },
  {
    id: "tier-2",
    tier: "🟠 רמה 2",
    label: "הכנסה גיג — אפשר להתפרנס",
    color: "#f97316",
    desc: "כאן יש פוטנציאל אמיתי. נדרשת מיומנות, אבל מי שמתאמץ מגיע ל-5,000–15,000 ₪ בחודש. הצד הפחות מדובר: כולן דורשות שיווק. מי שלא מקדם את עצמו — לא מוצאים אותו.",
    bridge: "Fiverr Seller שיודע לקדם את הפרופיל שלו עם Google Ads + SEO מרוויח 3–5× מהממוצע. זה לא קסם — זה שיווק.",
    bridgeCta: "/training/google-ads-course",
    bridgeCtaLabel: "קורס Google Ads →",
    items: [
      { name: "Fiverr ו-Freelancer", effort: "בינוני", earning: "2,000–15,000 ₪/חודש", note: "שוק גדול, תחרות קשה — פרופיל מקצועי + ביקורות = מפתח" },
      { name: "עוזר וירטואלי", effort: "בינוני", earning: "3,000–10,000 ₪/חודש", note: "ביקוש גדל, אנגלית חיונית. Upwork, VA Networks" },
      { name: "כתיבת תוכן", effort: "בינוני", earning: "3,000–12,000 ₪/חודש", note: "AI לא הרג כתיבה — הוא הרג כתיבה גנרית. מומחיות שווה יותר" },
      { name: "עריכת וידאו", effort: "גבוה", earning: "4,000–20,000 ₪/חודש", note: "ביקוש עולה עם הצמיחה בוידאו. Premiere, DaVinci" },
      { name: "מורה מקוון / הדרכה", effort: "בינוני", earning: "3,000–20,000 ₪/חודש", note: "Zoom, Teachable, Udemy — מומחיות אמיתית חיונית" },
      { name: "עריכת תמונות (Photoshop / Canva)", effort: "בינוני", earning: "2,000–8,000 ₪/חודש", note: "ביקוש יציב, שוק תחרותי — נישה + מהירות = הכנסה" },
      { name: "פיתוח אתרים", effort: "גבוה", earning: "5,000–25,000 ₪/חודש", note: "ביקוש גבוה, פוטנציאל גבוה. No-code מוריד את הסף" },
      { name: "דוגסיטר / שמירה על חיות", effort: "בינוני", earning: "2,000–8,000 ₪/חודש", note: "Wag, Rover ישראל — עסק אמיתי לאוהבי בעלי חיים" },
    ],
  },
  {
    id: "tier-3",
    tier: "🟢 רמה 3",
    label: "עסק דיגיטלי — מה שמתרחב",
    color: "#10b981",
    desc: "כאן הכסף מתרחב. לא כי קל יותר — כי יש לכם נכס שגדל עם הזמן ולא מוגבל בשעות עבודה. שיווק דיגיטלי הוא מה שמפריד בין מי שגדל למי שתקוע.",
    bridge: null,
    bridgeCta: null,
    bridgeCtaLabel: null,
    items: [
      { name: "שיווק שותפים (Affiliate)", effort: "גבוה בהתחלה", earning: "פוטנציאל ללא תקרה", note: "הכי ניתן לסקייל. דורש SEO / תנועה + authority בנישה" },
      { name: "ערוץ YouTube", effort: "גבוה", earning: "5,000–50,000+ ₪/חודש", note: "AdSense + שיווק שותפים + ספונסרים. עובד לאורך זמן" },
      { name: "TikTok Creator Fund / TikTok Shop", effort: "בינוני–גבוה", earning: "1,000–20,000 ₪/חודש", note: "תנועה מהירה, פחות יציבה. שילוב עם אפיליאיט = חזק" },
      { name: "מכירת מוצרים דיגיטליים", effort: "גבוה בהתחלה", earning: "פוטנציאל ללא תקרה", note: "קורס, Ebook, Template — פעם אחת, מכירות שוטפות" },
      { name: "חנות Online (Drop Shipping / Shopify)", effort: "גבוה", earning: "5,000–100,000+ ₪/חודש", note: "פוטנציאל גבוה, Paid Ads חיוניים לגדול" },
      { name: "שיווק רב שכבתי (MLM) — ⚠️ זהירות", effort: "גבוה", earning: "משתנה מאוד", note: "99% לא מרוויחים. בדקו Income Disclosure Statement לפני הכל" },
    ],
  },
];

export default function MakeMoneyOnline() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: "clamp(110px,14vw,160px)", paddingBottom: "clamp(56px,7vw,88px)", position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "90vw", height: "65vh", background: "radial-gradient(ellipse at center, rgba(245,158,11,0.06) 0%, transparent 68%)", pointerEvents: "none" }} />
        <div className="hero-grid" />
        <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "800px" }}>
          <nav aria-label="breadcrumb" className="breadcrumb">
            <Link href="/">דף הבית</Link>
            <span className="breadcrumb-sep" aria-hidden>›</span>
            <Link href="/training">הכשרות</Link>
            <span className="breadcrumb-sep" aria-hidden>›</span>
            <span aria-current="page">הכנסה מהאינטרנט</span>
          </nav>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "24px", marginTop: "16px" }}>
            <span className="badge"><span className="badge-dot" />מדריך ישיר</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "var(--radius-pill)", fontSize: "0.78rem", fontWeight: 600, background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)", fontFamily: "var(--font-body), sans-serif" }}>
              ללא מכירת חלומות
            </span>
          </div>

          <h1 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.9rem,4vw,3rem)", lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "0" }}>
            40 דרכים להרוויח כסף מהבית
            <br />
            <span style={{ fontSize: "clamp(1rem,2vw,1.5rem)", fontWeight: 700, color: "var(--muted)" }}>
              ומה <span className="text-gradient">באמת עובד</span> ב-2026
            </span>
          </h1>

          <div style={{ marginTop: "28px", marginBottom: "32px", padding: "20px 24px", borderRadius: "12px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <p style={{ color: "var(--text)", lineHeight: 1.78, fontSize: "0.95rem", fontFamily: "var(--font-body), sans-serif", margin: 0 }}>
              <strong style={{ color: "#f59e0b" }}>גילוי נאות ראשון:</strong> רוב המדריכים על &quot;הרוויח כסף מהבית&quot; מרוויחים כסף ממכירת הקורסים שלהם — לא מהשיטות שהם מלמדים.
              המדריך הזה נכתב מ-17 שנות שיווק דיגיטלי — לא כדי למכור לכם כלום, אלא כדי שתדעו{" "}
              <strong style={{ color: "var(--text)" }}>מה לבחור ולמה.</strong>
            </p>
          </div>

          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <a href="#tier-1" className="btn-primary">📋 לרשימה המלאה</a>
            <Link href="/training/affiliate-marketing" className="btn-outline">מדריך שיווק שותפים →</Link>
          </div>
        </div>
      </section>

      {/* ── Bridge Insight ───────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(48px,6vw,72px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="wao-container" style={{ maxWidth: "800px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "28px", alignItems: "start" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "rgba(74,227,181,0.1)", border: "1px solid rgba(74,227,181,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", flexShrink: 0 }}>
              💡
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif", marginBottom: "10px" }}>
                התובנה שרוב האנשים מפספסים
              </div>
              <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.2rem,2.2vw,1.7rem)", lineHeight: 1.2, marginBottom: "14px" }}>
                השיטה לא קובעת — השיווק קובע
              </h2>
              <p style={{ color: "var(--muted)", lineHeight: 1.82, fontSize: "0.95rem", fontFamily: "var(--font-body), sans-serif", marginBottom: "14px" }}>
                מישהו שממלא סקרים מרוויח 100 ₪ בחודש. מישהו שמקדם את הסקרים עם קישור שותפים מרוויח 10× יותר — ולא ממלא סקרים.
                מישהו שמציע שירות ב-Fiverr מרוויח 2,000 ₪. מי שמריץ Google Ads לפרופיל ה-Fiverr שלו מרוויח 10,000 ₪.
              </p>
              <p style={{ color: "var(--muted)", lineHeight: 1.82, fontSize: "0.95rem", fontFamily: "var(--font-body), sans-serif", margin: 0 }}>
                <strong style={{ color: "var(--text)" }}>מיומנויות שיווק דיגיטל — SEO, Google Ads, <GT term="Email Marketing">Email Marketing</GT></strong> — הן המנוע שמכפיל כל שיטה אחרת. זה בדיוק מה שאנחנו מלמדים.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tiers ────────────────────────────────────────────────────────────── */}
      {TIERS.map((tier, ti) => (
        <section key={tier.id} id={tier.id} style={{ padding: "clamp(64px,8vw,96px) 0", background: ti % 2 === 1 ? "var(--elevated)" : "var(--surface)", borderTop: "1px solid var(--border)" }}>
          <div className="wao-container" style={{ maxWidth: "900px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "12px", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "1.1rem" }}>{tier.tier}</span>
              <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.3rem,2.5vw,1.9rem)", letterSpacing: "-0.02em", margin: 0, color: tier.color }}>
                {tier.label}
              </h2>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.75, fontFamily: "var(--font-body), sans-serif", marginBottom: "28px", maxWidth: "680px" }}>
              {tier.desc}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px", marginBottom: "28px" }}>
              {tier.items.map((item, i) => (
                <div key={i} style={{ background: "var(--elevated)", border: `1px solid ${tier.color}18`, borderRadius: "var(--radius)", padding: "16px 20px" }}>
                  <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "var(--text)", marginBottom: "4px" }}>{item.name}</div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>מאמץ: <span style={{ color: tier.color, fontWeight: 600 }}>{item.effort}</span></span>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>פוטנציאל: <span style={{ color: "var(--text)", fontWeight: 600 }}>{item.earning}</span></span>
                  </div>
                  <p style={{ color: "var(--muted)", fontSize: "0.8rem", lineHeight: 1.6, fontFamily: "var(--font-body), sans-serif", margin: 0 }}>{item.note}</p>
                </div>
              ))}
            </div>

            {tier.bridge && (
              <div style={{ background: `${tier.color}08`, border: `1px solid ${tier.color}25`, borderRadius: "12px", padding: "18px 22px", display: "flex", alignItems: "flex-start", gap: "14px" }}>
                <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>⚡</span>
                <div>
                  <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.88rem", color: tier.color, marginBottom: "6px" }}>הדרך לכפל הכנסה</div>
                  <p style={{ color: "var(--muted)", fontSize: "0.86rem", lineHeight: 1.7, fontFamily: "var(--font-body), sans-serif", margin: 0, marginBottom: "10px" }}>{tier.bridge}</p>
                  <Link href={tier.bridgeCta!} style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.78rem", fontWeight: 700, color: tier.color, fontFamily: "var(--font-body), sans-serif", textDecoration: "none" }}>
                    {tier.bridgeCtaLabel}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      ))}

      <LessonGrid courseKey="/training/make-money-online" courseSlug="make-money-online" heading="כל הדרכים להכנסה דיגיטלית — שיעור שיעור" />

      {/* ── Path CTA ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(64px,8vw,96px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)" }}>
        <div className="wao-container" style={{ maxWidth: "760px", textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.5rem,2.8vw,2.1rem)", letterSpacing: "-0.02em", marginBottom: "16px" }}>
            בחרתם בדרך? —{" "}
            <span className="text-gradient">נלמד יחד לשווק אותה</span>
          </h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.75, fontFamily: "var(--font-body), sans-serif", marginBottom: "32px" }}>
            הקורסים שלנו חינמיים ומכסים את הכלים שיקפיצו כל שיטת הכנסה שבחרתם.
          </p>
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/training/affiliate-marketing" className="btn-primary">🤝 מדריך שיווק שותפים</Link>
            <Link href="/training/google-ads-course" className="btn-outline">🎯 קורס Google Ads</Link>
            <Link href="/training" className="btn-outline">כל הקורסים</Link>
          </div>
        </div>
      </section>
    </>
  );
}
