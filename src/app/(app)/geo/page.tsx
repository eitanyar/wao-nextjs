import type { Metadata } from "next";
import Link from "next/link";
import { renderMixed } from "@/lib/bidi";
import SiloNav from "@/components/SiloNav";

const CANONICAL = "https://www.wao.co.il/geo";

export const metadata: Metadata = {
  // title.absolute bypasses the root "%s‏ | WAO" template — this string already
  // ends in the RLM-anchored "‏ | WAO" suffix, so the template must not append a second one.
  title: {
    absolute: "שירות GEO לעסקים — להיכנס לתשובות ה-AI של גוגל‏ | WAO",
  },
  description:
    "GEO Bot עוקב אחרי נתוני החיפוש שלך, מזהה הזדמנויות ב-AI Overviews, וכותב תוכן מוכן לאישורך בוואטסאפ. ₪199 לחודש.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "שירות GEO לעסקים — להיכנס לתשובות ה-AI של גוגל",
    description:
      "GEO Bot עוקב אחרי נתוני החיפוש שלך, מזהה הזדמנויות ב-AI Overviews, וכותב תוכן מוכן לאישורך בוואטסאפ.",
    url: CANONICAL,
    type: "website",
  },
};

const FAQS = [
  {
    q: "האם GEO Bot מתאים לכל עסק?",
    a: "לא, וזה בסדר. עסק מקומי קטן — מספרה, מוסך, בית קפה — שייך למקום אחר. הוא צריך קודם כל נוכחות במפת גוגל, לא אצלנו. GEO Bot בנוי לעסקים עם הרבה תוכן באתר. לדוגמה: רואה חשבון, מאמן, קליניקה, עורך דין, מטפל. אם יש לך 30 עמודים ומעלה — זה בשבילך.",
  },
  {
    q: "כמה זמן לוקח לראות תוצאות?",
    a: "GEO Bot לא עובד על מיקום בתוצאות הרגילות. הוא עובד על ההופעה בתשובות הבינה המלאכותית. הופעה ראשונה מאומתת אורכת בדרך כלל 60 עד 120 יום. בזמן הזה אתה בונה אמון מול הבינה המלאכותית. גוגל לומד לזהות אותך כמקור אמין, ואז מצטט אותך.",
  },
  {
    q: "מה אני צריך לעשות בעצמי?",
    a: "כמעט כלום. הבוט חוקר, כותב את התוכן, ומאמת שעלה לאוויר. התפקיד שלך פשוט — לאשר ולהדביק. הכול קורה בוואטסאפ, בלי ללמוד מערכת חדשה. אתה מאשר בלחיצה, מדביק באתר, וסיימת.",
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
      url: "https://wao.co.il",
    },
    areaServed: "IL",
    offers: {
      "@type": "Offer",
      price: "199",
      priceCurrency: "ILS",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        billingDuration: "P1M",
      },
    },
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

const PRICING_TIERS = [
  {
    name: "GEO Bot",
    price: "199",
    desc: "אתה מדביק בעצמך. אנחנו שולחים הכול מוכן, עם הוראות מדויקות.",
    popular: false,
  },
  {
    name: "Managed",
    price: "590",
    desc: "מתלבט איפה להדביק? אנחנו מלווים אותך בכל שלב.",
    popular: true,
  },
  {
    name: "Pro",
    price: "1,290",
    desc: "אין לך זמן להתעסק? אנחנו נכנסים למערכת ומבצעים במקומך.",
    popular: false,
  },
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
              marginBottom: "24px",
            }}
          >
            גוגל עונה ללקוח במקומך. ומפנה אותו לאתר אחר.
          </h1>

          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.2rem)", marginBottom: "24px", maxWidth: "640px" }}>
            בראש כל חיפוש יש עכשיו תשובה של בינה מלאכותית. היא בוחרת אתר אחד ומציגה אותו כמקור. אם המקור הוא לא אתה, הלקוח קיבל תשובה ולא הגיע.
          </p>

          <p style={{ ...bodyStyle, marginBottom: "32px", maxWidth: "640px" }}>
            {renderMixed(
              "הבוט עוקב אחרי מה שהלקוחות מחפשים בגוגל. הוא מזהה שאלות שהתשובה עליהן בורחת לבינה המלאכותית. בשבילן הוא כותב תשובה מוכנה לעמוד קיים, ושולח לך בוואטסאפ. אתה מאשר ומדביק באתר — כמו מזכיר שעונה במקומך."
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

          <a
            href="tel:0526148860"
            className="btn-primary w-full sm:w-auto justify-center"
            style={{ fontSize: "1.05rem", padding: "16px 40px" }}
          >
            {renderMixed("התחל עכשיו ב-199 ₪ לחודש — והפוך לתשובה שגוגל נותן ללקוח שלך.")}
          </a>

          <p style={{ marginTop: "18px", fontSize: "0.85rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
            {renderMixed("אנחנו לא מנחשים. כל פעולה מבוססת על נתוני החיפוש של האתר שלך — ומאומתת שעלתה לאוויר.")}
          </p>
        </div>
      </section>

      {/* ── Definition box ── */}
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
              {renderMixed("מה זה GEO")}
            </h2>
            <p style={bodyStyle}>
              {renderMixed(
                "GEO היא אופטימיזציה שמכינה את האתר שלך לתשובות הבינה המלאכותית בגוגל. במקום להופיע רק ברשימת התוצאות, האתר שלך הופך למקור שהבינה מצטטת. כך הלקוח מקבל תשובה — ומגיע דווקא אליך."
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="wao-section">
        <div className="wao-container" style={{ maxWidth: "1000px" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <div className="eyebrow" style={{ marginInline: "auto" }}>מסלולים</div>
            <h2
              style={{
                fontFamily: "var(--font-rubik), sans-serif",
                fontWeight: 800,
                fontSize: "clamp(1.5rem,2.5vw,2rem)",
                lineHeight: 1.2,
                marginTop: "12px",
                color: "var(--text)",
              }}
            >
              בחר את רמת המעורבות שמתאימה לך
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px", alignItems: "stretch" }}>
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.name}
                style={{
                  background: "var(--surface)",
                  border: tier.popular ? "2px solid var(--accent)" : "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "32px 28px",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  transform: tier.popular ? "scale(1.02)" : "none",
                }}
              >
                {tier.popular && (
                  <span
                    style={{
                      position: "absolute",
                      top: "16px",
                      insetInlineStart: "16px",
                      background: "var(--accent)",
                      color: "var(--background)",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "4px 12px",
                      borderRadius: "12px",
                      fontFamily: "var(--font-rubik), sans-serif",
                    }}
                  >
                    הכי נבחר
                  </span>
                )}
                <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 800, fontSize: "1.2rem", color: "var(--text)", marginBottom: "12px" }}>
                  {renderMixed(tier.name)}
                </h3>
                <div style={{ marginBottom: "16px" }}>
                  <span className="text-gradient" style={{ fontSize: "2.2rem", fontWeight: 900, fontFamily: "var(--font-rubik), sans-serif" }}>
                    ₪{tier.price}
                  </span>
                  <span style={{ fontSize: "0.95rem", color: "var(--muted)" }}> / לחודש</span>
                </div>
                <p style={{ ...bodyStyle, fontSize: "0.92rem" }}>{tier.desc}</p>
              </div>
            ))}
          </div>
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
              {renderMixed("העסק שלך מקומי ובלי אתר גדול? GMB Bot מתאים לך יותר.")}
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
                {renderMixed("GEO Bot")} — <span className="text-gradient">₪199 לחודש</span>
              </p>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "32px", maxWidth: "480px", margin: "0 auto 32px", lineHeight: 1.75 }}>
                {renderMixed("אנחנו לא מנחשים. כל פעולה מבוססת על נתוני החיפוש של האתר שלך — ומאומתת שעלתה לאוויר.")}
              </p>
              <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                <a
                  href="tel:0526148860"
                  className="btn-primary w-full sm:w-auto justify-center"
                  style={{ fontSize: "1.05rem", padding: "16px 40px" }}
                >
                  {renderMixed("התחל עכשיו ב-199 ₪ לחודש — והפוך לתשובה שגוגל נותן ללקוח שלך.")}
                </a>
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
