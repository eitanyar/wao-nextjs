import type { Metadata } from "next";
import Link from "next/link";
import { renderMixed } from "@/lib/bidi";

const CANONICAL = "https://www.wao.co.il/site-bot";

export const metadata: Metadata = {
  // title.absolute bypasses the root "%s‏ | WAO" template — this string already
  // ends in the RLM-anchored "‏ | WAO" suffix, so the template must not append a second one.
  title: {
    absolute: "בניית אתר לעסק קטן — בלי עורך, עדכונים בהודעה‏ | WAO",
  },
  description:
    "בניית אתר לעסק קטן מתחילה בשיחה עם איתן על האתר שמתאים לעסק שלך. רוצה לראות קודם איך העסק שלך נראה בגוגל? הבדיקה חינמית.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "בניית אתר לעסק קטן — בלי עורך, עדכונים בהודעה",
    description:
      "בניית אתר לעסק קטן מתחילה בשיחה עם איתן על האתר שמתאים לעסק שלך. רוצה לראות קודם איך העסק שלך נראה בגוגל? הבדיקה חינמית.",
    url: CANONICAL,
    type: "website",
  },
};

const FAQS = [
  {
    q: "כמה עולה בניית אתר לעסק קטן ב-Site Bot?",
    a: "המחיר נקבע בשיחה אישית עם איתן, לפי מה שהעסק שלך צריך. אפשר להתחיל קודם בבדיקה חינמית של העסק שלך בגוגל.",
  },
  {
    q: "מתי האתר לעסק שלך עולה לאוויר?",
    a: "המועד נקבע בשיחה עם איתן, לפי היקף האתר. אתה לא צריך להקים כלום בעצמך.",
  },
  {
    q: "צריך לדעת לבנות אתר או לעבוד עם קוד?",
    a: "לא. אתה מספר על העסק בצ׳אט; החבילה המלאה כוללת אתר בדומיין פרטי, בלי להקים אותו בעצמך.",
  },
  {
    q: "איך משנים מחיר או שירות אחרי שהאתר עלה?",
    a: "לקוח שואל על שירות חדש? אתה שולח הודעת WhatsApp, והאתר מתעדכן. העריכה בצ׳אט כלולה בחבילה המלאה לתמיד; אין צורך לגעת בקוד.",
  },
  {
    q: "למה לא לבנות לבד ב-Wix או ב-WordPress?",
    a: "ב-Wix או ב-WordPress אתה בונה ומעדכן בעצמך. בחבילה המלאה הדומיין, Cloudflare ו-GitHub רשומים על שמך. רוצה לשנות משהו? אתה שולח הודעת WhatsApp במקום לפתוח שוב את העורך.",
  },
  {
    q: "כבר למדת לבנות אתר בקורס של WAO. למה לשלם?",
    a: "אתה יכול לבנות לבד, אבל הזמן שלך לא בחינם. החבילה כוללת חמישה עמודים, דומיין פרטי ועריכה בצ׳אט לתמיד, וגם חיבור GSC, פרופיל עסקי בגוגל וטופס לידים.",
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

const STEPS = [
  "מתחיל בשיחה על העסק שלך, בלי לפתוח עורך אתרים.",
  "מספר מה אתה עושה ולמי אתה רוצה שהאתר יפנה.",
  "החבילה המלאה כוללת אתר בדומיין שרשום על שמך.",
];

const COMPARE = [
  {
    label: "לשכור מפתח או סוכנות",
    body: "אתה תלוי בתהליך ובמחיר שיסוכמו מול הספק, גם כשתרצה לעדכן.",
  },
  {
    label: "Wix או WordPress לבד",
    body: "אתה בונה בעצמך, ואז חוזר לעורך בכל פעם שמשהו בעסק משתנה.",
  },
  {
    label: "לבנות לבד בעזרת AI",
    body: "אתה יכול לבנות לבד; רק תחליט כמה זמן תרצה להקדיש לתחזוקה.",
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
            בניית אתר לעסק קטן, בלי להתעסק עם עורך
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
            בניית אתר לעסק קטן מתחילה בשיחה עם איתן, ואחר כך אתה מעדכן את האתר בהודעה.
          </h1>

          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.2rem)", marginBottom: "24px", maxWidth: "640px" }}>
            {renderMixed(
              "אתה באמצע יום עבודה וצריך לעדכן מחיר באתר? שלח הודעת WhatsApp והאתר מתעדכן. החבילה המלאה כוללת חמישה עמודים בדומיין שלך."
            )}
          </p>

          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <Link
              href="/contact?ref=site-bot-build#contact-form"
              className="btn-primary w-full sm:w-auto justify-center"
              style={{ fontSize: "1.05rem", padding: "16px 40px" }}
            >
              {renderMixed("דבר עם איתן על האתר שלך")}
            </Link>
            <Link href="/site-bot/audit" className="btn-outline w-full sm:w-auto justify-center" style={{ fontSize: "1rem" }}>
              {renderMixed("בדוק איך העסק שלך נראה בגוגל — חינם")}
            </Link>
          </div>

          <p style={{ marginTop: "18px", fontSize: "0.85rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
            {renderMixed("משאירים פרטים, ואיתן חוזר אליך לשיחה על האתר. אפשר גם להתחיל בבדיקה חינמית של העסק שלך בגוגל.")}
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
              אתה מספר על העסק. אנחנו מעלים את האתר.
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
            {renderMixed("כבר למדת לבנות אתר לבד? עכשיו תבחר איך לבזבז פחות זמן.")}
          </h2>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.12rem)", color: "var(--text)" }}>
            {renderMixed(
              "למדת בקורס של WAO לבנות אתר בעצמך? מצוין, זאת עדיין אפשרות. אבל כשלקוח מחכה לתשובה, אולי לא תרצה לפתוח עורך אתרים. בחבילה המלאה אתה שולח הודעת WhatsApp כשמשהו משתנה באתר."
            )}
          </p>
        </div>
      </section>

      {/* ── Price anchor block ── */}
      <section className="wao-section">
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.15rem)", marginBottom: "24px", color: "var(--text)" }}>
            {renderMixed(
              "כל אתר נבנה אחרי שיחה עם איתן על העסק שלך. רוצה לבדוק קודם איך העסק שלך נראה בגוגל? הבדיקה חינמית, וצריך רק את שם העסק."
            )}
          </p>

          <Link
            href="/contact?ref=site-bot-build#contact-form"
            className="btn-primary w-full sm:w-auto justify-center"
            style={{ fontSize: "1.05rem", padding: "16px 40px", marginBottom: "18px" }}
          >
            {renderMixed("דבר עם איתן על האתר שלך")}
          </Link>

          <p style={{ ...bodyStyle, fontSize: "0.95rem", color: "var(--text)", marginTop: "18px" }}>
            {renderMixed(
              "הבדיקה לא מחייבת אותך לכלום. רק אחריה תחליט אם לדבר עם איתן על האתר."
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
                "מה כוללת החבילה המלאה? חמישה עמודים, דומיין פרטי ועריכה בצ׳אט. גם GSC, הפרופיל העסקי בגוגל וטופס הלידים מחוברים לאתר."
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
            {renderMixed("לבנות לבד, לשכור מפתח, או לשלוח הודעה?")}
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
              {renderMixed("Site Bot: אתר לעסק קטן, בדומיין שלך ועם עריכה בצ׳אט.")}
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
            {renderMixed("רוצה שגם ימצאו אותך בגוגל? קרא על הפרופיל העסקי.")}
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
                {renderMixed("Site Bot")} — <span className="text-gradient">אתר לעסק</span>
              </p>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "32px", maxWidth: "480px", margin: "0 auto 32px", lineHeight: 1.75 }}>
                {renderMixed("משאירים פרטים, ואיתן חוזר אליך לשיחה על האתר. אפשר גם להתחיל בבדיקה חינמית של העסק שלך בגוגל.")}
              </p>
              <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                <Link
                  href="/contact?ref=site-bot-build#contact-form"
                  className="btn-primary w-full sm:w-auto justify-center"
                  style={{ fontSize: "1.05rem", padding: "16px 40px" }}
                >
                  {renderMixed("דבר עם איתן על האתר שלך")}
                </Link>
                <Link href="/site-bot/audit" className="btn-outline w-full sm:w-auto justify-center" style={{ fontSize: "1rem" }}>
                  {renderMixed("בדוק איך העסק שלך נראה בגוגל — חינם")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
