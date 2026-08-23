import type { Metadata } from "next";
import Link from "next/link";
import { renderMixed } from "@/lib/bidi";
import SiloNav from "@/components/SiloNav";

const CANONICAL = "https://www.wao.co.il/geo";

export const metadata: Metadata = {
  // title.absolute bypasses the root "%s‏ | WAO" template — this string already
  // ends in the RLM-anchored "‏ | WAO" suffix, so the template must not append a second one.
  title: {
    absolute: "GEO Bot — להיכנס לתשובות ה-AI של גוגל‏ | WAO",
  },
  description:
    "GEO Bot עוקב אחרי נתוני החיפוש של האתר שלך, מזהה הזדמנויות בתשובות ה-AI של גוגל, וכותב תוכן מוכן לאישורך בוואטסאפ — בליווי צמוד של מומחה WAO.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "GEO Bot — להיכנס לתשובות ה-AI של גוגל",
    description:
      "GEO Bot עוקב אחרי נתוני החיפוש של האתר שלך, מזהה הזדמנויות בתשובות ה-AI של גוגל, וכותב תוכן מוכן לאישורך בוואטסאפ — בליווי צמוד של מומחה WAO.",
    url: CANONICAL,
    type: "website",
  },
};

const FAQS = [
  {
    q: "האם GEO Bot מתאים לכל עסק?",
    a: "התנאי היחיד פשוט: צריך אתר קיים עם תוכן אמיתי. GEO Bot לא בונה אתר מאפס — הוא לוקח את העמודים שכבר יש לך ומחזק אותם, כדי שהבינה של גוגל תבחר לצטט דווקא אותך. אם יש לך אתר מבוסס עם תנועה אמיתית, או שאתה כבר לקוח Site Bot עם אתר מלא — זה בדיוק בשבילך. GEO Bot לא נמכר כמנוי שמפעילים לבד. אנחנו מריצים אותו איתך, בליווי צמוד, כחלק מעבודה שוטפת מול WAO. רוצה לדעת אם האתר שלך מוכן? דבר איתנו.",
  },
  {
    q: "כמה זמן לוקח לראות תוצאות?",
    a: "GEO Bot לא עובד על מיקום בתוצאות הרגילות. הוא עובד על ההופעה בתשובות הבינה המלאכותית. הופעה ראשונה מאומתת אורכת בדרך כלל 60 עד 120 יום. בזמן הזה אתה בונה אמון מול הבינה המלאכותית. גוגל לומד לזהות אותך כמקור אמין, ואז מצטט אותך.",
  },
  {
    q: "מה אני צריך לעשות בעצמי?",
    a: "כמעט כלום. הבוט חוקר, כותב את התוכן, ומאמת שעלה לאוויר. התפקיד שלך פשוט — לאשר ולהדביק. הכול קורה בוואטסאפ, בלי ללמוד מערכת חדשה. אתה מאשר בלחיצה, מדביק באתר, וסיימת.",
  },
  {
    q: "האם זה ״תוכן AI זבל״ שיפגע באתר שלי?",
    a: "חד משמעית לא. בזכות מנגנון ה-Human-in-the-Loop, כל פלט עובר ביקורת אנושית של מומחה SEO עם 20 שנות ניסיון. אנחנו לא מפרסמים ״זבל״ — אנחנו מפרסמים תשובות מדויקות שעברו אימות.",
  },
  {
    q: "מה קורה אם הסכמה נשברת?",
    a: "בדיוק בשביל זה אתה משלם. המערכת מנטרת את הסכמות 24/7, ובמקרה של תקלה — המומחה שלנו מתקן אותה ידנית. אתה לא צריך לגעת בקוד.",
  },
  {
    q: "למה שהבינה של גוגל תצטט דווקא אותי?",
    a: "כי הבינה מחפשת מבנה. GEO Bot מספק לה בדיוק את המבנה (Schema ו-FAQ) שהיא מחפשת, בצורה נקייה וברורה יותר מהמתחרים שלך שעדיין תקועים בשיטות של 2018.",
  },
];

const schemas = [
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${CANONICAL}#service`,
    name: "GEO Bot — אופטימיזציה ל-AI Overviews",
    provider: {
      "@type": "Organization",
      name: "WAO",
      url: "https://www.wao.co.il",
    },
    areaServed: "IL",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${CANONICAL}#faq`,
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  },
];

const BENEFITS = [
  "אתה מפסיק לאבד לקוחות שקיבלו תשובה מהבינה המלאכותית ולא הגיעו.",
  "העמודים הקיימים שלך הופכים למקור שגוגל בוחר להציג.",
  "אתה לא כותב תוכן חדש — הבוט עושה את העבודה.",
];

export default function GeoPage() {
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
          <SiloNav currentPath="/geo" />

          <p className="badge" style={{ marginBottom: "28px" }}>
            <span className="badge-dot" />
            {renderMixed("GEO · אופטימיזציה ל-AI Overviews")}
          </p>

          <h1
            className="text-3xl sm:text-4xl md:text-5xl"
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              marginBottom: "16px",
            }}
          >
            הקליק הכחול מת. גוגל הפך ליעד.
          </h1>

          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.6vw,1.1rem)", fontWeight: 600, color: "var(--text)", marginBottom: "24px", maxWidth: "640px" }}>
            {renderMixed("ה-SEO הישן מת. אפילו HubSpot איבדה עד 80% מהתנועה האורגנית שלה. הגיע הזמן לעבור ל-GEO.")}
          </p>

          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.2rem)", marginBottom: "24px", maxWidth: "640px" }}>
            בראש כל חיפוש יש עכשיו תשובה של בינה מלאכותית. היא בוחרת אתר אחד ומציגה אותו כמקור. אם המקור הוא לא אתה, הלקוח קיבל תשובה ולא הגיע.
          </p>

          <p style={{ ...bodyStyle, marginBottom: "32px", maxWidth: "640px" }}>
            {renderMixed(
              "אל תילחם בבינה המלאכותית של גוגל — תהיה התשובה שהיא מצטטת. GEO Bot של WAO לא מביא לך ״קליקים״. הוא מכניס את המותג שלך לתוך התשובה שהבינה נותנת ללקוח שלך. עם אישור אנושי מלא. בלי הפתעות."
            )}
          </p>

          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 36px", display: "flex", flexDirection: "column", gap: "14px" }}>
            {BENEFITS.map((b) => (
              <li key={b} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <span
                  aria-hidden
                  style={{
                    flexShrink: 0,
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: "var(--accent-dim)",
                    border: "1px solid var(--accent-border)",
                    color: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    marginTop: "2px",
                  }}
                >
                  ✓
                </span>
                <span style={{ ...bodyStyle, color: "var(--text)" }}>{b}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/contact"
            className="btn-primary w-full sm:w-auto justify-center"
            style={{ fontSize: "1.05rem", padding: "16px 40px", whiteSpace: "normal", textAlign: "center", lineHeight: 1.4 }}
          >
            שלח פנייה
          </Link>
        </div>
      </section>

      {/* ── Problem statement ── */}
      <section className="wao-section" style={{ paddingTop: 0 }}>
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <h2
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.4rem,2.4vw,1.9rem)",
              lineHeight: 1.25,
              marginBottom: "16px",
              color: "var(--text)",
            }}
          >
            אתה לא הבעלים של התנועה שלך. אתה רק שוכר אותה.
          </h2>
          <p style={bodyStyle}>
            {renderMixed(
              "במשך שנים חשבת שאתה בונה ״נכס דיגיטלי״. האמת? שכרת קרקע מגוגל. ועכשיו בעל הבית שינה את החוקים. הנתונים מדברים: חברות ענק שמובילות את עולם ה-SEO רואות צניחה של עשרות אחוזים בתנועה האורגנית. למה? כי ה-AI Overviews של גוגל עונים על השאלה בתוך דף התוצאות — הלקוח מקבל את התשובה ולא צריך ללחוץ על הקישור שלך. ואם אתה לא שם — אתה שקוף."
            )}
          </p>
        </div>
      </section>

      {/* ── Solution (definition box) ── */}
      <section className="wao-section" style={{ paddingTop: 0 }}>
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <div
            className="rounded-xl p-4 sm:p-6"
            style={{
              background: "var(--accent-dim)",
              border: "1px solid var(--accent-border)",
              borderInlineStartWidth: "4px",
              borderInlineStartColor: "var(--accent)",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-rubik), sans-serif",
                fontWeight: 800,
                fontSize: "1.15rem",
                marginBottom: "10px",
                color: "var(--text)",
              }}
            >
              {renderMixed("Generative Engine Optimization (GEO)")}
            </h2>
            <p style={bodyStyle}>
              {renderMixed(
                "בעידן החדש, המטרה היא לא ״להיות ראשון בגוגל״. המטרה היא להיות המקור שהבינה המלאכותית בוחרת לצטט. GEO Bot שלנו סורק את העסק שלך, מזהה את השאלות שהלקוחות שלך שואלים את הבינה, ומייצר עבורך סדרות FAQ וסכמות (Schema) מדויקות — בדיוק בפורמט שהבינה המלאכותית של גוגל ״אוהבת״ להעתיק לתשובות שלה."
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ── Trust layer ── */}
      <section className="wao-section" style={{ paddingTop: 0 }}>
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <h2
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.4rem,2.4vw,1.9rem)",
              lineHeight: 1.25,
              marginBottom: "16px",
              color: "var(--text)",
            }}
          >
            {renderMixed("הבוט כותב. המומחה חותם. (Human-in-the-Loop)")}
          </h2>
          <p style={{ ...bodyStyle, marginBottom: "24px" }}>
            {renderMixed("שמעת על סוכנויות ש״מריצות אוטומציה מלאה״ והורסות ללקוחות את האתר? אצלנו זה לא יקרה.")}
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
            {[
              "כתיבה, עריכה ובקרה אנושית: כל תשובה נכתבת ונערכת בשני שלבים נפרדים ועוברת בדיקות אוטומטיות של דיוק עובדתי ומבנה — ואז אדם אמיתי ב-WAO עובר עליה ומאשר אותה ידנית, לפני שהיא מגיעה אליך בכלל.",
              "תיקון סכמות ידני: הבוט מזהה בעיות טכניות, אבל מומחה אנושי ב-WAO עובר ומתקן את הסכמה לפני שהיא עולה לאוויר.",
              "אישור הלקוח: שום דבר לא מתפרסם בלי האישור שלך בוואטסאפ.",
            ].map((b) => (
              <li key={b} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <span
                  aria-hidden
                  style={{
                    flexShrink: 0,
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: "var(--accent-dim)",
                    border: "1px solid var(--accent-border)",
                    color: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    marginTop: "2px",
                  }}
                >
                  ✓
                </span>
                <span style={{ ...bodyStyle, color: "var(--text)" }}>{renderMixed(b)}</span>
              </li>
            ))}
          </ul>
          <p style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "var(--accent)" }}>
            מהירות של בוט. אחריות של בן אדם.
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="wao-section" style={{ paddingTop: 0 }}>
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <h2
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.4rem,2.4vw,1.9rem)",
              lineHeight: 1.25,
              marginBottom: "20px",
              color: "var(--text)",
            }}
          >
            מה מקבלים?
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "14px" }}>
            {[
              "10 עמודי מפתח: אופטימיזציית GEO ל-10 העמודים החשובים ביותר באתר שלך.",
              "10 סדרות FAQ אסטרטגיות: תוכן מובנה שנועד להיתפס על ידי ה-AI Overviews.",
              "עדכון שבועי: התאמה מתמדת לשינויים באלגוריתם של גוגל.",
              "תיקון סכמות טכני: ניקוי ה״ביוב״ הטכני שמונע מגוגל להבין אותך.",
              "דוח שקיפות מלא: אתה רואה בדיוק מה הבוט כתב ומה המומחה אישר.",
            ].map((f) => (
              <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <span
                  aria-hidden
                  style={{
                    flexShrink: 0,
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: "var(--accent-dim)",
                    border: "1px solid var(--accent-border)",
                    color: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    marginTop: "2px",
                  }}
                >
                  ✓
                </span>
                <span style={{ ...bodyStyle, color: "var(--text)" }}>{renderMixed(f)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container" style={{ maxWidth: "800px" }}>
          <div className="eyebrow">שאלות נפוצות</div>
          <h2
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.5rem,2.5vw,2rem)",
              lineHeight: 1.2,
              marginBottom: "40px",
              color: "var(--text)",
            }}
          >
            שאלות נפוצות
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: 0,
                }}
              >
                <summary
                  style={{
                    padding: "22px 24px",
                    cursor: "pointer",
                    listStyle: "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "16px",
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "var(--font-rubik), sans-serif",
                      fontWeight: 700,
                      fontSize: "1.02rem",
                      lineHeight: 1.4,
                      margin: 0,
                      color: "var(--text)",
                    }}
                  >
                    {renderMixed(faq.q)}
                  </h3>
                  <span aria-hidden style={{ fontSize: "1.2rem", color: "var(--accent)", flexShrink: 0 }}>+</span>
                </summary>
                <div style={{ padding: "0 24px 22px", ...bodyStyle }}>{renderMixed(faq.a)}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cross-links ── */}
      <section className="wao-section" style={{ paddingTop: 0 }}>
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
            <Link
              href="/google-business"
              className="rounded-xl p-4 sm:p-6"
              style={{
                display: "block",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "20px",
                textDecoration: "none",
                color: "var(--text)",
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "0.95rem",
                lineHeight: 1.6,
              }}
            >
              {renderMixed("העסק שלך מקומי ובלי אתר גדול? חיזוק הפרופיל העסקי שלך בגוגל מתאים לך יותר.")}
            </Link>
            <Link
              href="/site-bot"
              className="rounded-xl p-4 sm:p-6"
              style={{
                display: "block",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "20px",
                textDecoration: "none",
                color: "var(--text)",
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "0.95rem",
                lineHeight: 1.6,
              }}
            >
              {renderMixed("עוד אין לך אתר? תתחיל ב-Site Bot, ורק אחר כך תטפל בציטוטים.")}
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="wao-section">
        <div className="wao-container">
          <div className="cta-banner" style={{ padding: "clamp(48px,8vw,80px) clamp(24px,6vw,64px)", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div aria-hidden style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "60%", height: "100%", background: "radial-gradient(ellipse at center, rgba(74,227,181,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <p style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem,3.5vw,2.6rem)", lineHeight: 1.15, marginBottom: "16px", color: "var(--text)" }}>
                {renderMixed("האתר שלך כבר קיים. הגיע הזמן שגוגל יצטט אותו.")}
              </p>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "32px", maxWidth: "480px", margin: "0 auto 32px", lineHeight: 1.75 }}>
                {renderMixed("אנחנו לא מנחשים. כל פעולה מבוססת על נתוני החיפוש של האתר שלך — ומאומתת שעלתה לאוויר.")}
              </p>
              <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                <Link
                  href="/contact"
                  className="btn-primary w-full sm:w-auto justify-center"
                  style={{ fontSize: "1.05rem", padding: "16px 40px", whiteSpace: "normal", textAlign: "center", lineHeight: 1.4 }}
                >
                  {renderMixed("בוא נבדוק אם GEO מתאים לך")}
                </Link>
                <Link href="/contact" className="btn-outline w-full sm:w-auto justify-center" style={{ fontSize: "1rem" }}>
                  שלח פנייה
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
