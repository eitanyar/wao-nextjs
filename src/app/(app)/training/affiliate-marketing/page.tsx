import type { Metadata } from "next";
import Link from "next/link";
import GT from "@/components/GlossaryTerm";
import LessonGrid from "@/components/LessonGrid";

export const metadata: Metadata = {
  title: "מדריך שיווק שותפים המלא 2026 — מאפס לעסק דיגיטלי",
  description:
    "המדריך המקיף לשיווק שותפים בישראל: תוכניות BOX, Amazon, Booking ו-KSP, אסטרטגיות תנועה, כלים חיוניים ואיך לגדול מהכנסה פסיבית לעסק דיגיטלי אמיתי.",
  alternates: { canonical: "https://www.wao.co.il/training/affiliate-marketing" },
  openGraph: {
    title: "מדריך שיווק שותפים המלא 2026 | WAO",
    description: "22 פרקים: תוכניות שותפים, קידום, כלים, אסטרטגיה וסקייל — מהשטח.",
    url: "https://www.wao.co.il/training/affiliate-marketing",
    type: "article",
    locale: "he_IL",
  },
};

const SAME_AS = [
  "https://www.linkedin.com/in/eitan-yariv",
  "https://qa.askpavel.co.il/user/איתן+יריב",
];

const canonical = "https://www.wao.co.il/training/affiliate-marketing";

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  "@id": `${canonical}#article`,
  headline: "מדריך שיווק שותפים המלא 2026 — מאפס לעסק דיגיטלי",
  description: "המדריך המקיף לשיווק שותפים: תוכניות, קידום, כלים וסקייל.",
  url: canonical,
  inLanguage: "he",
  datePublished: "2018-11-12",
  dateModified: "2026-01-01",
  author: { "@type": "Person", "@id": "https://www.wao.co.il/about#person", name: "איתן יריב", sameAs: SAME_AS },
  publisher: { "@type": "Organization", "@id": "https://www.wao.co.il/#org", name: "WAO" },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "דף הבית", item: "https://www.wao.co.il" },
    { "@type": "ListItem", position: 2, name: "הכשרות", item: "https://www.wao.co.il/training" },
    { "@type": "ListItem", position: 3, name: "מדריך שיווק שותפים", item: canonical },
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "כמה זמן לוקח להרוויח כסף משיווק שותפים?",
      acceptedAnswer: { "@type": "Answer", text: "בממוצע 6–12 חודשים עד לראיית הכנסה משמעותית. השיטות המהירות יותר (ביטויי זנב ארוך, תנועה ממדיה חברתית) יכולות להביא תוצאות ב-2–3 חודשים, אבל הכנסה יציבה מצריכה בניית נכס — תוכן, רשימת אימייל, או קהל ממוקד." },
    },
    {
      "@type": "Question",
      name: "מה התוכניות הטובות ביותר לשיווק שותפים בישראל?",
      acceptedAnswer: { "@type": "Answer", text: "BOX.co.il (עמלות גבוהות על אלקטרוניקה), Booking.com (עד 40% מעמלת המלון), Amazon Israel, KSP ו-iHerb הן הבולטות. בינלאומית — Clickbank, ShareASale ו-Commission Junction לנישות ספציפיות." },
    },
    {
      "@type": "Question",
      name: "האם שיווק שותפים עדיין כדאי ב-2026?",
      acceptedAnswer: { "@type": "Answer", text: "כן, אבל הנוף השתנה. AI מייצר תוכן גנרי בקנה מידה, מה שהופך מומחיות אמיתית, ניסיון אישי ותוכן שמבוסס על קהל מסוים — לנכס יקר יותר מתמיד. שיווק שותפים שמבוסס על authority ו-trust — לא רק SEO גנרי — הוא הדרך קדימה." },
    },
  ],
};

const PROGRAMS = [
  { name: "BOX.co.il", cat: "אלקטרוניקה", commission: "3–7%", cookie: "30 יום", note: "שוק ישראלי, המרה גבוהה, יש וידאו הדרכה", video: "https://www.youtube.com/watch?v=aUSjBj-v98M", highlight: true },
  { name: "Booking.com", cat: "תיירות", commission: "עד 40% מהעמלה", cookie: "שהייה", note: "עמלה גבוהה במיוחד, ביקוש שוטף" },
  { name: "Amazon (ישראל + גלובלי)", cat: "כל תחום", commission: "1–10%", cookie: "24 שעות", note: "אמינות גבוהה, המרה טובה, עמלה נמוכה יחסית" },
  { name: "KSP", cat: "מחשבים ואלקטרוניקה", commission: "עד 5%", cookie: "30 יום", note: "קהל ישראלי טכנולוגי, תחרות נמוכה יחסית" },
  { name: "iHerb", cat: "בריאות ותוספים", commission: "5%", cookie: "30 יום", note: "נישה עם קהל נאמן, תוכן ביקורת מניב טוב" },
  { name: "Fiverr Affiliates", cat: "פרילנסרים", commission: "$15–150 לרכישה", cookie: "30 יום", note: "CPA גבוה, מתאים לקהלי עסקים קטנים" },
];

const TOOLS = [
  { name: "Pretty Links / ThirstyAffiliates", desc: "קיצור וניהול קישורי שותפים — חיוני לאמינות ולמעקב" },
  { name: "Google Analytics 4", desc: "מעקב אחר מקורות תנועה ונתיבי המרה לקישורי השותפים" },
  { name: "Ahrefs / SEMrush", desc: "מחקר מילות מפתח לנישה ולניתוח מתחרים" },
  { name: "ConvertKit / Mailchimp", desc: "בניית רשימת אימייל — הנכס היחיד שאינו תלוי באלגוריתם" },
  { name: "Canva", desc: "יצירת תמונות, אינפוגרפיקות ותוכן ויזואלי לבלוג ולסושיאל" },
  { name: "Lasso", desc: "טבלאות השוואה ותיבות מוצר לשיפור CTR על קישורי שותפים" },
];

const MYTHS = [
  { myth: "\"שיווק שותפים = הכנסה פסיבית מיידית\"", truth: "ה-6 חודשים הראשונים הם עבודה אקטיבית מרובה. ההכנסה הפסיבית מגיעה לאחר שהנכס (בלוג, ערוץ, רשימה) הגיע לבשלות." },
  { myth: "\"אין צורך במומחיות — רק קישורים\"", truth: "Google ו-AI Overviews מדלגים על תוכן גנרי. מי שמרוויח ב-2026 הוא מי שיש לו ניסיון אישי במוצר, קהל נאמן, ונקודת מבט ייחודית." },
  { myth: "\"כמה שיותר תוכניות — יותר כסף\"", truth: "הכנסה בינוני מ-10 תוכניות < הכנסה גבוהה מ-2–3 תוכניות שמתאימות לקהל שלך. Niche focus עדיף על פיזור." },
  { myth: "\"אפשר לעשות זאת בלי תקציב\"", truth: "אפשר — אבל לאט. תוכן ממוקד + SEO + אימייל לוקחים זמן. תנועה ממומנת (ועל זה WAO יכולה לעזור) מקצרת את העקומה משמעותית." },
];

const TRAITS = [
  { icon: "🎯", title: "בחירת נישה ספציפית", body: "הטעות הנפוצה ביותר: ניסיון לדבר לכולם. המשווקים המצליחים בוחרים קהל מוגדר מאוד — ולהם יש הרבה מה להגיד." },
  { icon: "📊", title: "עבודה עם נתונים", body: "מעקב קפדני אחרי CTR, Conversion Rate ו-EPC לכל תוכנית. מה שלא נמדד — לא משתפר." },
  { icon: "🔄", title: "סבלנות + עקביות", body: "פרסום מאמר בשבוע הוא 52 מאמרים בשנה. רוב המשווקים מוותרים ב-3 חודשים הראשונים — שם מסתיים התחרות." },
  { icon: "🤝", title: "מערכת יחסים עם Affiliate Manager", body: "מנהל תוכנית שותפים שמכיר אתכם = גישה לעמלות מיוחדות, הצעות בלעדיות, ומידע על מוצרים חדשים לפני כולם." },
  { icon: "📧", title: "בניית רשימת אימייל", body: "המשווקים שלא מושפעים מ-Google Algorithm Updates הם אלה עם רשימת אימייל. זה הנכס שלך — לא של גוגל." },
];

export default function AffiliateMarketingGuide() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: "clamp(110px,14vw,160px)", paddingBottom: "clamp(56px,7vw,88px)", position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "90vw", height: "65vh", background: "radial-gradient(ellipse at center, rgba(74,227,181,0.07) 0%, transparent 68%)", pointerEvents: "none" }} />
        <div className="hero-grid" />
        <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "820px" }}>
          <nav aria-label="breadcrumb" className="breadcrumb">
            <Link href="/">דף הבית</Link>
            <span className="breadcrumb-sep" aria-hidden>›</span>
            <Link href="/training">הכשרות</Link>
            <span className="breadcrumb-sep" aria-hidden>›</span>
            <span aria-current="page">מדריך שיווק שותפים</span>
          </nav>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "24px", marginTop: "16px" }}>
            <span className="badge"><span className="badge-dot" />מדריך מקיף</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "var(--radius-pill)", fontSize: "0.78rem", fontWeight: 600, background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)", fontFamily: "var(--font-body), sans-serif" }}>
              Affiliate Marketing
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "var(--radius-pill)", fontSize: "0.78rem", fontWeight: 600, background: "rgba(74,227,181,0.1)", color: "var(--accent)", border: "1px solid rgba(74,227,181,0.2)", fontFamily: "var(--font-body), sans-serif" }}>
              עדכון 2026
            </span>
          </div>

          <h1 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(2rem,4.5vw,3.2rem)", lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "0" }}>
            מדריך שיווק שותפים{" "}
            <span className="text-gradient">המלא לישראלים</span>
            <br />
            <span style={{ fontSize: "clamp(1.1rem,2.2vw,1.6rem)", fontWeight: 700, color: "var(--muted)" }}>
              מאפס לעסק דיגיטלי אמיתי — ב-2026
            </span>
          </h1>

          {/* AI Summary */}
          <div role="note" aria-label="בקצרה" style={{ marginTop: "32px", marginBottom: "36px", padding: "24px 28px", borderRadius: "16px", background: "rgba(255,255,255,0.03)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(74,227,181,0.2)", boxShadow: "0 0 40px rgba(74,227,181,0.05), inset 0 1px 0 rgba(255,255,255,0.06)", position: "relative", overflow: "hidden" }}>
            <div aria-hidden style={{ position: "absolute", top: 0, right: 0, width: "200px", height: "200px", background: "radial-gradient(ellipse at top right, rgba(74,227,181,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <span style={{ fontSize: "1rem" }}>✦</span>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif" }}>
                בקצרה — שיווק שותפים ב-2026
              </span>
            </div>
            <p style={{ color: "var(--text)", lineHeight: 1.75, fontSize: "0.95rem", fontFamily: "var(--font-body), sans-serif", margin: 0 }}>
              שיווק שותפים הוא מודל עסקי לגיטימי שבו אתם מרוויחים עמלה על הפניית לקוחות למוצרים ושירותים. ב-2026 השוק שינה כיוון:{" "}
              <strong style={{ color: "var(--accent)" }}>תוכן גנרי מת — authority, ניסיון אישי ומיומנויות שיווק דיגיטל הם מה שמבדיל בין מי שמרוויח מי שלא.</strong>{" "}
              המדריך הזה מכסה הכל: בחירת תוכניות, בניית תנועה, כלים וסקייל — כולל מה שרוב המדריכים מסתירים.
            </p>
          </div>

          <nav aria-label="תוכן המדריך" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {["#what-is", "#programs", "#traffic", "#tools", "#scale"].map((href, i) => (
              <a key={href} href={href} style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.78rem", fontWeight: 600, padding: "5px 12px", borderRadius: "var(--radius-pill)", background: "var(--elevated)", color: "var(--muted)", border: "1px solid var(--border)", fontFamily: "var(--font-body), sans-serif", textDecoration: "none" }}>
                {["מה זה", "תוכניות", "תנועה", "כלים", "סקייל"][i]}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(32px,4vw,48px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="wao-container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "24px", textAlign: "center" }}>
            {[
              { val: "$17B", label: "שוק האפיליאיט העולמי ב-2024" },
              { val: "6–12", label: "חודשים עד הכנסה יציבה" },
              { val: "40%", label: "עמלת ה-Booking.com מהמלון" },
              { val: "22", label: "מאמרים מהשטח במדריך זה" },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem,2.5vw,2.2rem)", color: "var(--accent)", lineHeight: 1 }}>{s.val}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: "6px", fontFamily: "var(--font-body), sans-serif" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 1: What Is ───────────────────────────────────────────────── */}
      <section id="what-is" style={{ padding: "clamp(64px,8vw,96px) 0" }}>
        <div className="wao-container" style={{ maxWidth: "820px" }}>
          <p style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif", marginBottom: "10px" }}>פרק 1</p>
          <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.5rem,2.8vw,2.1rem)", letterSpacing: "-0.02em", marginBottom: "24px" }}>
            מה זה שיווק שותפים —{" "}
            <span className="text-gradient">המיתוסים מול המציאות</span>
          </h2>

          <p style={{ color: "var(--muted)", lineHeight: 1.82, fontSize: "1rem", fontFamily: "var(--font-body), sans-serif", marginBottom: "20px" }}>
            שיווק שותפים (Affiliate Marketing) הוא מודל עסקי שבו אתם מפנים לקוחות למוצרים ושירותים של אחרים, ובתמורה מקבלים עמלה על כל מכירה, הרשמה או פעולה שהושלמה. הצד שמוכר מרוויח לקוח, אתם מרוויחים עמלה — הדדית ברורה.
          </p>

          <p style={{ color: "var(--muted)", lineHeight: 1.82, fontSize: "1rem", fontFamily: "var(--font-body), sans-serif", marginBottom: "32px" }}>
            מה שמאפשר לשיווק שותפים להיות עסק אמיתי הוא שאתם לא מחזיקים מלאי, לא מתעסקים עם שירות לקוחות, ולא צריכים ליצור מוצר. אתם מרכיב ה-Marketing — והוא המשמעותי ביותר בשרשרת.
          </p>

          {/* Myths */}
          <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 800, fontSize: "1.2rem", marginBottom: "16px", color: "var(--text)" }}>
            4 מיתוסים שמרחיקים אנשים מההצלחה — ו-4 אמיתות
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
            {MYTHS.map((m, i) => (
              <div key={i} style={{ background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px" }}>
                <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.92rem", color: "#f59e0b", marginBottom: "6px" }}>
                  ❌ מיתוס: {m.myth}
                </div>
                <div style={{ color: "var(--muted)", fontSize: "0.88rem", lineHeight: 1.7, fontFamily: "var(--font-body), sans-serif" }}>
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>✓ המציאות:</span> {m.truth}
                </div>
              </div>
            ))}
          </div>

          {/* Traits of successful affiliates */}
          <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 800, fontSize: "1.2rem", marginBottom: "16px", color: "var(--text)" }}>
            5 תכונות של משווקי שותפים מצליחים
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
            {TRAITS.map((t, i) => (
              <div key={i} style={{ background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 20px" }}>
                <div style={{ fontSize: "1.4rem", marginBottom: "8px" }}>{t.icon}</div>
                <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "var(--text)", marginBottom: "6px" }}>{t.title}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.83rem", lineHeight: 1.65, fontFamily: "var(--font-body), sans-serif" }}>{t.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 2: Programs ──────────────────────────────────────────────── */}
      <section id="programs" style={{ padding: "clamp(64px,8vw,96px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)" }}>
        <div className="wao-container" style={{ maxWidth: "900px" }}>
          <p style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif", marginBottom: "10px" }}>פרק 2</p>
          <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.5rem,2.8vw,2.1rem)", letterSpacing: "-0.02em", marginBottom: "12px" }}>
            תוכניות שיווק שותפים —{" "}
            <span className="text-gradient">ישראל ובינלאומי</span>
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.75, fontFamily: "var(--font-body), sans-serif", marginBottom: "32px", maxWidth: "680px" }}>
            הכלל: בחרו תחילה קהל, אחר כך תוכנית — לא ההפך. תוכנית עם עמלה גבוהה שלא מתאימה לקהל שלכם תניב אפס.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "40px" }}>
            {PROGRAMS.map((p) => (
              <div key={p.name} style={{ background: "var(--surface)", border: `1px solid ${p.highlight ? "rgba(74,227,181,0.3)" : "var(--border)"}`, borderRadius: "var(--radius)", padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr auto", gap: "16px", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
                    <span style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.97rem", color: "var(--text)" }}>{p.name}</span>
                    <span style={{ fontSize: "0.68rem", padding: "2px 8px", borderRadius: "var(--radius-pill)", background: "var(--elevated)", color: "var(--muted)", border: "1px solid var(--border)", fontFamily: "var(--font-body), sans-serif" }}>{p.cat}</span>
                    {p.highlight && <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: "var(--radius-pill)", background: "rgba(74,227,181,0.12)", color: "var(--accent)", border: "1px solid rgba(74,227,181,0.25)", fontFamily: "var(--font-body), sans-serif", fontWeight: 700 }}>+ וידאו הדרכה</span>}
                  </div>
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "6px" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>💰 עמלה: <strong style={{ color: "var(--text)" }}>{p.commission}</strong></span>
                    {p.cookie && <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>🍪 Cookie: <strong style={{ color: "var(--text)" }}>{p.cookie}</strong></span>}
                  </div>
                  <p style={{ color: "var(--muted)", fontSize: "0.82rem", lineHeight: 1.6, fontFamily: "var(--font-body), sans-serif", margin: 0 }}>{p.note}</p>
                </div>
                {p.video && (
                  <a href={p.video} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.72rem", fontWeight: 600, padding: "6px 14px", borderRadius: "var(--radius-pill)", background: "rgba(74,227,181,0.1)", color: "var(--accent)", border: "1px solid rgba(74,227,181,0.25)", fontFamily: "var(--font-body), sans-serif", textDecoration: "none", whiteSpace: "nowrap" }}>
                    ▶ הדרכה
                  </a>
                )}
              </div>
            ))}
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 24px" }}>
            <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1rem", marginBottom: "10px", color: "var(--text)" }}>
              10 התוכניות הבינלאומיות המובילות לניש ספציפיים
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "8px" }}>
              {[
                { name: "Clickbank", cat: "מוצרים דיגיטליים — עמלה 50–75%" },
                { name: "ShareASale", cat: "e-Commerce — אלפי מותגים" },
                { name: "Commission Junction (CJ)", cat: "אגרגטור — רשתות גדולות" },
                { name: "Rakuten", cat: "מותגי Premium גלובליים" },
                { name: "Impact Radius", cat: "SaaS, Tech, Fintech" },
                { name: "PartnerStack", cat: "תוכנות B2B — עמלה חוזרת" },
                { name: "Awin", cat: "אירופה — תיירות ופאשן" },
                { name: "Etsy Affiliates", cat: "מוצרי ה-Handmade" },
                { name: "Canva Affiliates", cat: "$36 לרישום Pro" },
                { name: "Bluehost / Kinsta", cat: "Hosting — $65–150 לרכישה" },
              ].map(t => (
                <div key={t.name} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                  <span style={{ color: "var(--accent)", flexShrink: 0, fontSize: "0.75rem", marginTop: "3px" }}>→</span>
                  <div>
                    <span style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 600, fontSize: "0.82rem", color: "var(--text)" }}>{t.name}</span>
                    <span style={{ color: "var(--muted)", fontSize: "0.78rem", fontFamily: "var(--font-body), sans-serif" }}> — {t.cat}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Traffic ───────────────────────────────────────────────── */}
      <section id="traffic" style={{ padding: "clamp(64px,8vw,96px) 0" }}>
        <div className="wao-container" style={{ maxWidth: "820px" }}>
          <p style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif", marginBottom: "10px" }}>פרק 3</p>
          <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.5rem,2.8vw,2.1rem)", letterSpacing: "-0.02em", marginBottom: "24px" }}>
            איך מביאים תנועה —{" "}
            <span className="text-gradient">האסטרטגיות שעובדות</span>
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            {[
              {
                icon: "🔍",
                color: "#4ae3b5",
                title: "SEO ותוכן לבלוג",
                subtitle: "תנועה אורגנית — איטי אבל חזק",
                body: <>ביטויי זנב ארוך (&quot;ביקורת X&quot;, &quot;השוואה בין X ל-Y&quot;, &quot;הכי טוב ל-Z&quot;) הם מנוע האפיליאיט. ה-<GT term="Search Intent">Search Intent</GT> ברור: מישהו שמחפש &quot;BOX.co.il קוד קופון&quot; כבר עם ארנק פתוח. בניית תוכן מסביב לביטויים האלה + <GT term="Internal Linking">Internal Linking</GT> טוב = נכס SEO שמרוויח 24/7. חשוב: <GT term="E-E-A-T">E-E-A-T</GT> עם <GT term="AI Overviews">AI Overviews</GT> — גוגל מפנה לתוכן עם ניסיון אישי אמיתי.</>,
              },
              {
                icon: "📸",
                color: "#a78bfa",
                title: "אינסטגרם ושיווק שותפים",
                subtitle: "קהל חם + Stories + Swipe Up",
                body: <>שיווק שותפים באינסטגרם עובד הכי טוב כשיש קהל בנישה ספציפית (אוכל, אופנה, פיטנס, טק). Stories עם Swipe Up קישור שותפים ישיר הם ה-<GT term="CTA">CTA</GT> הגבוה ביותר. גילוי נאות (&quot;קישור שותפים&quot;) הוא חובה ח.ו. — וגם מגביר אמון. מינימום 10K followers להשפעה משמעותית.</>,
              },
              {
                icon: "🎵",
                color: "#f59e0b",
                title: "TikTok ושיווק שותפים",
                subtitle: "נוכחים חזקים בטיקטוק? עשו מזה כסף",
                body: "TikTok Shop ו-TikTok Creator Marketplace פתחו אפשרויות חדשות. הפורמט: וידאו קצר שמדגים מוצר + link in bio + ביקורת כנה. התנועה ב-TikTok מהירה הרבה יותר מ-SEO — אבל גם לא יציבה. השילוב המנצח: TikTok לחשיפה, אימייל/בלוג לאסוף.",
              },
              {
                icon: "📧",
                color: "#10b981",
                title: "Email Marketing",
                subtitle: "הנכס היחיד שלא תלוי באלגוריתם",
                body: <>רשימת אימייל היא הנכס האחד שגוגל ו-Meta לא יכולים לקחת. <GT term="Lead Generation">Lead magnet</GT> (מדריך חינמי, רשימת כלים, קופון) → רצף אוטומטי → המלצות עם קישורי שותפים. שיעורי פתיחה ב-Email הם 15–25% לעומת 1–3% ב-Feed. זה ה-<GT term="ROI">ROI</GT> הגבוה ביותר לאורך זמן.</>,
              },
            ].map(c => (
              <div key={c.title} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "20px", alignItems: "start" }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: `${c.color}14`, border: `1px solid ${c.color}28`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0 }}>
                  {c.icon}
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 800, fontSize: "1.05rem", color: "var(--text)", marginBottom: "2px" }}>{c.title}</div>
                  <div style={{ fontSize: "0.78rem", color: c.color, fontFamily: "var(--font-body), sans-serif", fontWeight: 600, marginBottom: "10px" }}>{c.subtitle}</div>
                  <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.75, fontFamily: "var(--font-body), sans-serif", margin: 0 }}>{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: Tools ─────────────────────────────────────────────────── */}
      <section id="tools" style={{ padding: "clamp(64px,8vw,96px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)" }}>
        <div className="wao-container" style={{ maxWidth: "820px" }}>
          <p style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", fontFamily: "var(--font-body), sans-serif", marginBottom: "10px" }}>פרק 4</p>
          <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.5rem,2.8vw,2.1rem)", letterSpacing: "-0.02em", marginBottom: "24px" }}>
            כלים חיוניים —{" "}
            <span className="text-gradient">הסטאק של 2026</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
            {TOOLS.map(t => (
              <div key={t.name} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 20px" }}>
                <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "var(--text)", marginBottom: "6px" }}>{t.name}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.83rem", lineHeight: 1.65, fontFamily: "var(--font-body), sans-serif" }}>{t.desc}</div>
              </div>
            ))}
          </div>

          {/* Affiliate Manager section */}
          <div style={{ marginTop: "40px", background: "var(--surface)", border: "1px solid rgba(74,227,181,0.2)", borderRadius: "var(--radius)", padding: "24px 28px" }}>
            <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 800, fontSize: "1.05rem", marginBottom: "12px", color: "var(--text)" }}>
              הקלף הנסתר: מערכת יחסים עם Affiliate Manager
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.75, fontFamily: "var(--font-body), sans-serif", marginBottom: "14px" }}>
              מנהל תוכנית שיווק השותפים הוא האיש שקובע אם תקבלו עמלה מיוחדת, גישה מוקדמת למוצרים חדשים, ו-Promotional Material בלעדי. רוב המשווקים לא מדברים עם ה-Manager לעולם — ושוכחים מאות שקלים בחודש.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
              {[
                "שלחו אימייל היכרות עם נתוני הביצועים שלכם",
                "בקשו לדעת על מבצעים לפני שהם יוצאים לאוויר",
                "שאלו מה ה-Creatives הכי מניבים — הם יודעים",
                "בקשו Bumped Commission אחרי שהוכחתם ביצועים",
              ].map((tip, i) => (
                <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                  <span style={{ color: "var(--accent)", flexShrink: 0, fontWeight: 700 }}>✓</span>
                  <span style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.65, fontFamily: "var(--font-body), sans-serif" }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Scale ─────────────────────────────────────────────────── */}
      <section id="scale" style={{ padding: "clamp(64px,8vw,96px) 0" }}>
        <div className="wao-container" style={{ maxWidth: "820px" }}>
          <p style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#10b981", fontFamily: "var(--font-body), sans-serif", marginBottom: "10px" }}>פרק 5 — סקייל</p>
          <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.5rem,2.8vw,2.1rem)", letterSpacing: "-0.02em", marginBottom: "24px" }}>
            מאפיליאיט לעסק אמיתי —{" "}
            <span className="text-gradient">מה מפריד בין הטובים לגדולים</span>
          </h2>

          <p style={{ color: "var(--muted)", lineHeight: 1.82, fontSize: "1rem", fontFamily: "var(--font-body), sans-serif", marginBottom: "28px" }}>
            הנישות החמות ב-2026: פיננסים וכרטיסי אשראי, תוכנות SaaS, בריאות ותוספים, מוצרי בית חכם ו-AI Tools. אבל יותר חשוב מהנישה — זה מה שאתם עושים עם התנועה שיש לכם.
          </p>

          {/* Scale callout */}
          <div style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "16px", padding: "28px 32px", marginBottom: "32px" }}>
            <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 800, fontSize: "1.1rem", marginBottom: "14px", color: "var(--text)" }}>
              הקפיצה: מ-SEO אורגני לתנועה ממומנת
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "0.92rem", lineHeight: 1.78, fontFamily: "var(--font-body), sans-serif", marginBottom: "16px" }}>
              משווק שותפים שמרוויח 5,000 ₪/חודש מ-SEO אורגני יכול להכפיל את ההכנסה שלו באמצעות Google Ads ממוקד לדפי ה-Best Performing שלו. זו לא הוצאה — זו השקעה מוגדרת ומדידה: אם העמלה הממוצעת היא 200 ₪ ו-<GT term="CPA">CPA</GT> ב-Ads הוא 80 ₪ — זה עסק.
            </p>
            <p style={{ color: "#10b981", fontSize: "0.88rem", lineHeight: 1.7, fontFamily: "var(--font-body), sans-serif", fontWeight: 600, margin: 0 }}>
              זה בדיוק שם שהניסיון שלנו ב-Google Ads וב-SEO יכול לקחת את הנכס שלכם לשלב הבא.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
            {[
              { title: "נישות חמות ב-2026", items: ["AI Tools ותוכנות", "כרטיסי אשראי ופיננסים", "בריאות ותוספים", "מוצרי בית חכם", "קורסים ולמידה מקוונת"] },
              { title: "Challenge נפוצים + פתרונות", items: ["תחרות גבוהה → Long-tail + authority", "המרות נמוכות → A/B ל-CTA ולקישורים", "Algorithm Update → פיזור מקורות תנועה", "Burnout → אוטומציה + צוות מוקדם", "Cookie Expiry → שיפור Funnel ו-Email"] },
            ].map(s => (
              <div key={s.title} style={{ background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 22px" }}>
                <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.92rem", color: "var(--text)", marginBottom: "12px" }}>{s.title}</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {s.items.map((item, i) => (
                    <li key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "7px" }}>
                      <span style={{ color: "var(--accent)", flexShrink: 0, fontSize: "0.75rem", marginTop: "3px" }}>→</span>
                      <span style={{ color: "var(--muted)", fontSize: "0.84rem", lineHeight: 1.6, fontFamily: "var(--font-body), sans-serif" }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(56px,7vw,80px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)" }}>
        <div className="wao-container" style={{ maxWidth: "760px" }}>
          <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.4rem,2.5vw,1.9rem)", letterSpacing: "-0.02em", marginBottom: "28px" }}>
            שאלות נפוצות
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {faqSchema.mainEntity.map((q, i) => (
              <details key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px" }}>
                <summary style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", color: "var(--text)" }}>
                  {q.name}
                </summary>
                <p style={{ color: "var(--muted)", fontSize: "0.88rem", lineHeight: 1.75, fontFamily: "var(--font-body), sans-serif", marginTop: "12px", marginBottom: 0 }}>
                  {q.acceptedAnswer.text}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <LessonGrid courseKey="/training/affiliate-marketing" courseSlug="affiliate-marketing" heading="כל השיעורים במדריך שיווק שותפים" />

      {/* ── Author ───────────────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(56px,7vw,80px) 0" }} aria-labelledby="aff-author">
        <div className="wao-container" style={{ maxWidth: "760px" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "20px" }} id="aff-author">
            הסמכות המקצועית
          </div>
          <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div aria-hidden style={{ width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "1.4rem", color: "var(--bg)", flexShrink: 0, border: "2px solid var(--accent-border)" }}>א.י</div>
            <div style={{ flex: 1, minWidth: "220px" }}>
              <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 800, fontSize: "1.1rem", marginBottom: "4px" }}>איתן יריב</div>
              <div style={{ color: "var(--muted)", fontSize: "0.83rem", fontFamily: "var(--font-body), sans-serif", marginBottom: "10px" }}>מומחה שיווק דיגיטלי | מייסד WAO | 20+ שנות ניסיון</div>
              <p style={{ color: "var(--muted)", lineHeight: 1.75, fontSize: "0.9rem", fontFamily: "var(--font-body), sans-serif", marginBottom: "14px" }}>
                עוסק בשיווק דיגיטלי מ-2007. ניהלתי קמפיינים שמשלבים SEO אורגני עם תנועה ממומנת לאתרי שותפים — ויכולתי לראות מקרוב מי מצליח ולמה. המדריך הזה הוא תמצות של מה שעובד בשטח הישראלי.
              </p>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <a href="https://www.linkedin.com/in/eitan-yariv" target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.82rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>LinkedIn</a>
                <Link href="/about" style={{ fontSize: "0.82rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>קראו עוד →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(64px,8vw,96px) 0", background: "var(--elevated)", borderTop: "1px solid var(--border)" }}>
        <div className="wao-container" style={{ maxWidth: "680px" }}>
          <div style={{ borderRadius: "20px", padding: "clamp(32px,4vw,48px)", background: "rgba(255,255,255,0.02)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(74,227,181,0.25)", boxShadow: "0 0 60px rgba(74,227,181,0.07), inset 0 1px 0 rgba(255,255,255,0.05)", position: "relative", overflow: "hidden", textAlign: "center" }}>
            <div aria-hidden style={{ position: "absolute", top: "-40px", left: "50%", transform: "translateX(-50%)", width: "300px", height: "300px", background: "radial-gradient(ellipse, rgba(74,227,181,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "16px" }}>🚀</div>
              <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.4rem,2.5vw,2rem)", letterSpacing: "-0.02em", marginBottom: "12px" }}>
                יש לכם נכס אפיליאיט —{" "}
                <span className="text-gradient">בואו נסייל אותו</span>
              </h2>
              <p style={{ color: "var(--muted)", lineHeight: 1.75, fontSize: "0.92rem", fontFamily: "var(--font-body), sans-serif", marginBottom: "24px" }}>
                אם יש לכם בלוג, ערוץ, או קהל שמניב עמלות — נשמח לבדוק יחד איך Google Ads ו-SEO יכולים להכפיל את ה-Revenue בלי להכפיל את עומס התוכן.
              </p>
              <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
                <a href="tel:0526148860" className="btn-primary">📞 שיחת היכרות ללא עלות</a>
                <Link href="/seo/consulting" className="btn-outline">ייעוץ SEO לאפיליאיט</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
