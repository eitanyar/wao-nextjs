import type { Metadata } from "next";
import Link from "next/link";
import { renderMixed } from "@/lib/bidi";

const CANONICAL = "https://www.wao.co.il/site-bot";

export const metadata: Metadata = {
  // title.absolute bypasses the root "%s‏ | WAO" template — this string already
  // ends in the RLM-anchored "‏ | WAO" suffix, so the template must not append a second one.
  title: {
    absolute: "בניית אתר לעסק קטן — מהצ׳אט לאתר חי תוך 24 שעות‏ | WAO",
  },
  description:
    "אתר מקצועי לעסק שלך תוך 24 שעות — בלי מעצב, בלי טפסים. שיחה אחת בצ׳אט, מתחילים ב-₪9.90.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "בניית אתר לעסק קטן — מהצ׳אט לאתר חי תוך 24 שעות",
    description:
      "אתר מקצועי לעסק שלך תוך 24 שעות — בלי מעצב, בלי טפסים. שיחה אחת בצ׳אט, מתחילים ב-₪9.90.",
    url: CANONICAL,
    type: "website",
  },
};

const FAQS = [
  {
    q: "כמה עולה לבנות אתר לעסק קטן?",
    a: "בשוק הישראלי אתר לעסק קטן עולה בין ₪2,500 ל-₪15,000. עם Site Bot המחיר הוא ₪1,490, חד-פעמי. ומתחילים ב-₪9.90 בלבד.",
  },
  {
    q: "כמה זמן לוקח לבנות אתר לעסק?",
    a: "עם Site Bot — 24 שעות מרגע השיחה. אצל סוכנות או פרילנסר, אותו אתר לוקח שבועות, ולפעמים חודשים.",
  },
  {
    q: "צריך לדעת לבנות אתרים או לשכור מעצב?",
    a: "לא. אתה עונה על 15 שאלות בצ׳אט, כמו בוואטסאפ. הבוט בונה, ותוך 24 שעות האתר באוויר בכתובת שלך.",
  },
  {
    q: "מה קורה אחרי שהאתר עולה — האם אני צריך לנהל אותו?",
    a: "לא צריך לנהל כלום. רוצה לשנות מחיר, להוסיף שירות או להחליף תמונה? אתה שולח הודעה בצ׳אט, והבוט מעדכן את האתר. בלי לוח בקרה, בלי קוד, בלי להעלות שום דבר מחדש.",
  },
  {
    q: "איך זה שונה מ-Wix או מ-WordPress?",
    a: "שני הבדלים. הראשון הוא הבעלות: הדומיין שלך, ה-Cloudflare שלך, ה-GitHub שלך — הכול רשום על שמך. השני הוא העדכון: ב-Wix וב-WordPress אתה חייב לשבת מול המסך ולעשות את זה בעצמך, ואצלנו זו הודעה אחת שאתה שולח מכל מקום.",
  },
  {
    q: "עשיתי את הקורס של WAO ואני יודע לבנות אתר עצמאי — למה לשלם?",
    a: "הקורס לימד אותך לבנות את העמודים. הבוט חוסך לך את כל מה שבא אחריהם: חיבור הדומיין, ה-GSC, הפרופיל העסקי בגוגל, טופס הלידים — וכל עדכון עתידי. רוצה לתחזק את זה לבד? מצוין. מעדיף לשלוח הודעה ולסיים? זה בדיוק מה שאתה קונה ב-₪1,490.",
  },
];

const schemas = [
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${CANONICAL}#service`,
    name: "Site Bot — בניית אתר לעסק קטן",
    serviceType: "בניית אתר לעסק קטן",
    provider: {
      "@type": "Organization",
      name: "WAO",
      url: "https://wao.co.il",
    },
    areaServed: "IL",
    offers: [
      {
        "@type": "Offer",
        name: "Site Bot ניסיון",
        price: "9.90",
        priceCurrency: "ILS",
      },
      {
        "@type": "Offer",
        name: "Site Bot מלא",
        price: "1490",
        priceCurrency: "ILS",
      },
    ],
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

const STEPS = [
  "פותח שיחה — צ׳אט פשוט, כמו וואטסאפ.",
  "עונה על 15 שאלות על העסק שלך.",
  "תוך 24 שעות האתר באוויר, בכתובת משלך.",
];

const COMPARE = [
  {
    label: "מפתח או סוכנות",
    body: "₪2,500–₪15,000, שבועות עד חודשים, וכל שינוי קטן עולה שוב כסף.",
  },
  {
    label: "Wix ובוני אתרים",
    body: "אתה נשאר מנהל ה-CMS לנצח — כל עדכון עובר דרכם, על הפלטפורמה שלהם.",
  },
  {
    label: "בניית אתר עם AI לבד — הנתיב מהקורס",
    body: "עובד, אבל כל שינוי הוא פרומפט חדש, קוד חדש והעלאה מחדש. מתאים לטכנאים, לא לאינסטלטורים.",
  },
];

export default function SiteBotPage() {
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
            בניית אתר לעסק קטן — על אוטומט
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
            אתר מקצועי לעסק שלך תוך 24 שעות — בלי מעצב, בלי טפסים
          </h1>

          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.2rem)", marginBottom: "24px", maxWidth: "640px" }}>
            {renderMixed(
              "האתר הזה הוא לא חמישה עמודים שאתה מתחזק לבד — הוא חיבור חי לגוגל שמתעדכן בהודעה אחת בוואטסאפ, לתמיד. בלי לייצר HTML מחדש, בלי להעלות קבצים, בלי לגעת בקוד — הבוט הוא ה-CMS שלך."
            )}
          </p>

          <a
            href="tel:0526148860"
            className="btn-primary w-full sm:w-auto justify-center"
            style={{ fontSize: "1.05rem", padding: "16px 40px" }}
          >
            {renderMixed("בונים לי אתר — מתחילים ב-₪9.90")}
          </a>

          <p style={{ marginTop: "18px", fontSize: "0.85rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
            {renderMixed("שיחה אחת בצ׳אט, והאתר באוויר. מתחילים ב-₪9.90.")}
          </p>
        </div>
      </section>

      {/* ── Proof block: 3 steps ── */}
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
                marginBottom: "18px",
                color: "var(--text)",
              }}
            >
              ככה זה עובד — בלי ללמוד כלום
            </h2>
            <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "14px" }}>
              {STEPS.map((step, i) => (
                <li key={step} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
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
                    {i + 1}
                  </span>
                  <span style={{ ...bodyStyle, color: "var(--text)" }}>{renderMixed(step)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── Objection: Module-5 graduate ── */}
      <section className="wao-section" style={{ paddingTop: 0 }}>
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <h2
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.25rem,2.2vw,1.6rem)",
              lineHeight: 1.25,
              marginBottom: "16px",
              color: "var(--text)",
            }}
          >
            {renderMixed("עשית את הקורס ואתה כבר יודע לבד? כל הכבוד.")}
          </h2>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.12rem)", color: "var(--text)" }}>
            {renderMixed(
              "סיימת את הקורס של WAO, ואתה כבר יודע לגרום ל-AI לכתוב את העמודים ולהעלות אותם בחינם. אתה צודק — זה עובד. אבל העמודים אף פעם לא היו החלק הקשה: הקושי הוא כל מה שבא אחריהם, בכל פעם שאתה רוצה לשנות משהו. אצלנו, שינוי הוא הודעה אחת. אצלך — עשרים דקות של יצירה מחדש, העלאה מחדש ובדיקה מחדש, כל פעם מההתחלה."
            )}
          </p>
        </div>
      </section>

      {/* ── Price anchor block ── */}
      <section className="wao-section">
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.15rem)", marginBottom: "24px", color: "var(--text)" }}>
            {renderMixed(
              "אתר לעסק קטן עולה בישראל בין ₪2,500 ל-₪15,000. גם ״הזולים״ גובים מעל ₪1,000 — ועדיין גוררים אותך לפגישות והחלטות. אצלנו זה ₪1,490, חד-פעמי. ומתחילים בניסיון של ₪9.90."
            )}
          </p>

          <a
            href="tel:0526148860"
            className="btn-primary w-full sm:w-auto justify-center"
            style={{ fontSize: "1.05rem", padding: "16px 40px", marginBottom: "18px" }}
          >
            {renderMixed("בונים לי אתר — מתחילים ב-₪9.90")}
          </a>

          <p style={{ ...bodyStyle, fontSize: "0.95rem", color: "var(--text)", marginTop: "18px" }}>
            {renderMixed(
              "משלם ₪9.90, רואה את האתר — וממשיך רק אם אהבת. בלי מנוי, בלי חוזה, בלי אותיות קטנות."
            )}
          </p>

          <div
            className="rounded-xl p-4 sm:p-5"
            style={{
              marginTop: "20px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderInlineStartWidth: "4px",
              borderInlineStartColor: "var(--accent)",
            }}
          >
            <p style={{ ...bodyStyle, color: "var(--text)", margin: 0 }}>
              {renderMixed(
                "מה אתה מקבל ב-₪9.90? עמוד בית חי אחד, באוויר, בכתובת של WAO. אתה רואה את האתר האמיתי שלך לפני שאתה מתחייב לשקל אחד נוסף. הדומיין הפרטי שלך, חמשת העמודים והעריכה בצ׳אט נכנסים בחבילה המלאה."
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ── Three-way comparison ── */}
      <section className="wao-section">
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <h2
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.5rem,2.5vw,2rem)",
              lineHeight: 1.2,
              marginBottom: "24px",
              color: "var(--text)",
            }}
          >
            {renderMixed("אז מה עם שאר האפשרויות?")}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
            {COMPARE.map((row) => (
              <div
                key={row.label}
                className="rounded-xl p-4 sm:p-5"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-rubik), sans-serif",
                    fontWeight: 700,
                    fontSize: "1rem",
                    margin: "0 0 6px",
                    color: "var(--text)",
                  }}
                >
                  {renderMixed(row.label)}
                </p>
                <p style={{ ...bodyStyle, margin: 0 }}>{renderMixed(row.body)}</p>
              </div>
            ))}
          </div>

          <div
            className="rounded-xl p-4 sm:p-5"
            style={{
              background: "var(--accent-dim)",
              border: "1px solid var(--accent-border)",
              borderInlineStartWidth: "4px",
              borderInlineStartColor: "var(--accent)",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-rubik), sans-serif",
                fontWeight: 800,
                fontSize: "1.05rem",
                margin: 0,
                color: "var(--text)",
              }}
            >
              {renderMixed("WAO — ₪1,490 חד-פעמי, 24 שעות, ועדכון בשיחה לתמיד.")}
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
            href="/google-business"
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
            {renderMixed("האתר עלה. הצעד הבא: לחבר את הפרופיל העסקי בגוגל.")}
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
                {renderMixed("Site Bot")} — <span className="text-gradient">₪1,490</span>
              </p>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "32px", maxWidth: "480px", margin: "0 auto 32px", lineHeight: 1.75 }}>
                {renderMixed("שיחה אחת בצ׳אט, והאתר באוויר. מתחילים ב-₪9.90.")}
              </p>
              <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                <a
                  href="tel:0526148860"
                  className="btn-primary w-full sm:w-auto justify-center"
                  style={{ fontSize: "1.05rem", padding: "16px 40px" }}
                >
                  {renderMixed("בונים לי אתר — מתחילים ב-₪9.90")}
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
