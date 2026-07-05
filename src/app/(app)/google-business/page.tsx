import type { Metadata } from "next";
import Link from "next/link";
import { renderMixed } from "@/lib/bidi";

const CANONICAL = "https://www.wao.co.il/google-business";

export const metadata: Metadata = {
  // title.absolute bypasses the root "%s‏ | WAO" template — this string already
  // ends in the RLM-anchored "‏ | WAO" suffix, so the template must not append a second one.
  title: {
    absolute: "בוט לניהול גוגל לעסק שלי — פוסטים, ביקורות ותובנות‏ | WAO",
  },
  description:
    "GMB Bot מנהל את הפרופיל גוגל עסקי שלך במקומך — פוסטים, תגובות לביקורות ותובנות. הכול לאישורך בוואטסאפ. ₪149 לחודש.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "בוט לניהול גוגל לעסק שלי — פוסטים, ביקורות ותובנות",
    description:
      "GMB Bot מנהל את הפרופיל גוגל עסקי שלך במקומך — פוסטים, תגובות לביקורות ותובנות. הכול לאישורך בוואטסאפ.",
    url: CANONICAL,
    type: "website",
  },
};

const schemas = [
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${CANONICAL}#service`,
    name: "GMB Bot — ניהול Google Business Profile",
    provider: {
      "@type": "Organization",
      name: "WAO",
      url: "https://wao.co.il",
    },
    areaServed: "IL",
    offers: {
      "@type": "Offer",
      price: "149",
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
    mainEntity: [
      {
        "@type": "Question",
        name: "האם אפשר להפוך תגובות לביקורות גוגל לאוטומטיות?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "כן. הבוט מנסח תשובה לכל ביקורת חדשה שנכנסת. אתה מקבל אותה בוואטסאפ, מאשר או עורך — והיא מתפרסמת. אתה שולט, הבוט עושה את העבודה.",
        },
      },
      {
        "@type": "Question",
        name: "כמה פוסטים צריך בפרופיל גוגל בחודש?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "גוגל מעניש פרופילים לא פעילים — אם לא עדכנת שלושים יום, החשיפה שלך יורדת. עדכון קבוע, פעם בשבוע, שומר על הפרופיל שלך חי בעיני גוגל.",
        },
      },
      {
        "@type": "Question",
        name: "מה זה GBP Insights ולמה זה חשוב?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "GBP Insights הוא דוח חודשי מגוגל על הפרופיל שלך. הוא מראה כמה חיפשו אותך, כמה התקשרו, וכמה ביקשו הכוונה במפות. מהנתונים האלה אתה מבין מה עובד, ומחליט איפה להשקיע.",
        },
      },
    ],
  },
];

const BENEFITS = [
  "יותר שיחות מגיעות אליך ישר מתיבת המפה.",
  "כל ביקורת מקבלת תשובה — גם הפחות נעימות.",
  "העסק שלך נראה חי ופעיל, לא נטוש.",
];

const FAQS = [
  {
    q: "האם אפשר להפוך תגובות לביקורות גוגל לאוטומטיות?",
    a: "כן. הבוט מנסח תשובה לכל ביקורת חדשה שנכנסת. אתה מקבל אותה בוואטסאפ, מאשר או עורך — והיא מתפרסמת. אתה שולט, הבוט עושה את העבודה.",
  },
  {
    q: "כמה פוסטים צריך בפרופיל גוגל בחודש?",
    a: "גוגל מעניש פרופילים לא פעילים — אם לא עדכנת שלושים יום, החשיפה שלך יורדת. עדכון קבוע, פעם בשבוע, שומר על הפרופיל שלך ״חי״ בעיני גוגל.",
  },
  {
    q: "מה זה GBP Insights ולמה זה חשוב?",
    a: "GBP Insights הוא דוח חודשי מגוגל על הפרופיל שלך. הוא מראה כמה חיפשו אותך, כמה התקשרו, וכמה ביקשו הכוונה במפות. מהנתונים האלה אתה מבין מה עובד, ומחליט איפה להשקיע.",
  },
];

export default function GoogleBusinessPage() {
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
          <p className="badge" style={{ marginBottom: "28px" }}>
            <span className="badge-dot" />
            ניהול גוגל לעסק שלי, על אוטומט
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
            כל יום שהפרופיל שלך בגוגל שקט, לקוח בוחר במתחרה.
          </h1>

          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.2rem)", marginBottom: "24px", maxWidth: "640px" }}>
            לקוח מחפש עסק כמו שלך בגוגל מפות. הוא רואה מתחרה עם ביקורות טריות ותגובות מהירות. אצלך — שקט. הוא מתקשר אליו, לא אליך.
          </p>

          <p style={{ ...bodyStyle, marginBottom: "32px", maxWidth: "640px" }}>
            הבוט מנהל את הפרופיל העסקי שלך בגוגל במקומך. הוא כותב פוסטים ומנסח תשובות לביקורות, ושולח לך הכול לאישור בוואטסאפ. אתה מאשר בלחיצה — והבוט מפרסם. בלי מסכים, בלי סיסמאות, בלי כאב ראש.
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

          <p
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 700,
              fontSize: "1.15rem",
              marginBottom: "24px",
              color: "var(--text)",
            }}
          >
            ניהול גוגל מלא לעסק שלך — <span className="text-gradient">₪149 לחודש</span>.
          </p>

          <a
            href="tel:0526148860"
            className="btn-primary w-full sm:w-auto justify-center"
            style={{ fontSize: "1.05rem", padding: "16px 40px" }}
          >
            הפוך את הפרופיל שלך בגוגל למגנט לקוחות.
          </a>

          <p style={{ marginTop: "18px", fontSize: "0.85rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
            שום דבר לא עולה לאוויר בלי האישור שלך בוואטסאפ.
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
              {renderMixed("מה זה ניהול Google Business Profile")}
            </h2>
            <p style={bodyStyle}>
              {renderMixed(
                "ניהול Google Business Profile הוא הטיפול השוטף בכרטיס העסק שלך בגוגל ובמפות. זה כולל פרסום פוסטים, מענה לביקורות גוגל, עדכון פרטים ושעות, ומעקב אחרי תובנות. פרופיל מעודכן ופעיל מופיע גבוה יותר בתיבת המפה, ומביא יותר פניות מלקוחות מקומיים."
              )}
            </p>
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
          <Link
            href="/geo"
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
            {renderMixed("יש לך תוכן עשיר שחורג מהפרופיל בגוגל? תן ל-AI לצטט אותו.")}
          </Link>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="wao-section">
        <div className="wao-container">
          <div className="cta-banner" style={{ padding: "clamp(48px,8vw,80px) clamp(24px,6vw,64px)", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div aria-hidden style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "60%", height: "100%", background: "radial-gradient(ellipse at center, rgba(74,227,181,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <p style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem,3.5vw,2.6rem)", lineHeight: 1.15, marginBottom: "16px", color: "var(--text)" }}>
                ניהול גוגל מלא לעסק שלך — <span className="text-gradient">₪149 לחודש</span>
              </p>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "32px", maxWidth: "480px", margin: "0 auto 32px", lineHeight: 1.75 }}>
                שום דבר לא עולה לאוויר בלי האישור שלך בוואטסאפ.
              </p>
              <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                <a
                  href="tel:0526148860"
                  className="btn-primary w-full sm:w-auto justify-center"
                  style={{ fontSize: "1.05rem", padding: "16px 40px" }}
                >
                  הפוך את הפרופיל שלך בגוגל למגנט לקוחות.
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
