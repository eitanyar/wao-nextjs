import type { Metadata } from "next";
import Link from "next/link";
import { renderMixed } from "@/lib/bidi";
import SiloNav from "@/components/SiloNav";

const CANONICAL = "https://www.wao.co.il/geo/audit";

export const metadata: Metadata = {
  title: {
    absolute: "בדיקת נראות ב-AI Overviews‏ | WAO",
  },
  description:
    "אתה משאיר פרטים, הצוות שלנו מריץ את הבדיקה על הנתונים האמיתיים שלך, ותוך 24 שעות אתה יודע איפה אתה כבר קרוב להופיע בתשובות ה-AI של גוגל — ומה חוסם אותך.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "בדיקת נראות ב-AI Overviews",
    description:
      "אתה משאיר פרטים, אנחנו מריצים את הבדיקה על הנתונים האמיתיים שלך, ותוך 24 שעות אתה יודע איפה אתה כבר קרוב להופיע בתשובות ה-AI של גוגל.",
    url: CANONICAL,
    type: "website",
  },
};

const STEPS = [
  {
    n: "1",
    title: "משאיר פרטים",
    body: "אתה משאיר פרטים ומספק גישה בסיסית ל-Search Console שלך. לוקח דקה.",
  },
  {
    n: "2",
    title: "אנחנו מריצים",
    body: "הצוות שלנו מריץ את הבדיקה על הנתונים האמיתיים שלך, מול השאלות שגוגל כבר עונה עליהן ב-AI.",
  },
  {
    n: "3",
    title: "מקבל 3 הזדמנויות",
    body: "תוך 24 שעות אתה מקבל 3 עמודים עם פוטנציאל אמיתי להופיע בתשובות ה-AI של גוגל.",
  },
];

const schemas = [
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${CANONICAL}#service`,
    name: "בדיקת נראות ב-AI Overviews",
    provider: {
      "@type": "Organization",
      name: "WAO",
      url: "https://wao.co.il",
    },
    areaServed: "IL",
    description:
      "בדיקה חינמית שהצוות מריץ עבורך: מצליב את נתוני Search Console שלך מול השאלות שגוגל כבר עונה עליהן ב-AI Overviews, ומחזיר 3 הזדמנויות תוך 24 שעות.",
  },
];

export default function GeoAuditPage() {
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
          <SiloNav currentPath="/geo/audit" />

          <p className="badge" style={{ marginBottom: "28px" }}>
            <span className="badge-dot" />
            {renderMixed("GEO · בדיקה חינמית")}
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
            בדיקת נראות ב-AI Overviews
          </h1>

          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.2rem)", marginBottom: "32px", maxWidth: "640px" }}>
            {renderMixed(
              "אתה משאיר פרטים, הצוות שלנו מריץ את הבדיקה על הנתונים האמיתיים שלך, ותוך 24 שעות אתה יודע איפה אתה כבר קרוב להופיע בתשובות ה-AI של גוגל — ומה חוסם אותך."
            )}
          </p>

          <a
            href="/contact?ref=geo-audit"
            className="btn-primary w-full sm:w-auto justify-center"
            style={{ fontSize: "1.05rem", padding: "16px 40px" }}
          >
            {renderMixed("תשאיר פרטים ותקבל את 3 ההזדמנויות שלך ←")}
          </a>

          <p style={{ marginTop: "14px", fontSize: "0.9rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
            {renderMixed("עוד לא בטוח? ")}
            <Link href="/geo/scan" style={{ color: "var(--accent)" }}>
              {renderMixed("תתחיל מהסריקה החינמית והמיידית — בלי להתחבר ל-Search Console ובלי למסור פרטים.")}
            </Link>
          </p>

          <p style={{ marginTop: "18px", fontSize: "0.85rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
            {renderMixed(
              "כדי להריץ את הבדיקה אנחנו צריכים גישת קריאה בלבד לנתוני Search Console שלך. אנחנו לא נוגעים באתר ולא משנים כלום — רק קוראים את הנתונים. אחרי הבדיקה הגישה נסגרת."
            )}
          </p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="wao-section" style={{ paddingTop: 0 }}>
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div className="eyebrow" style={{ marginInline: "auto" }}>איך זה עובד</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px" }}>
            {STEPS.map((step) => (
              <div
                key={step.n}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "28px 24px",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "var(--accent-dim)",
                    border: "1px solid var(--accent-border)",
                    color: "var(--accent)",
                    fontWeight: 800,
                    fontFamily: "var(--font-rubik), sans-serif",
                    marginBottom: "16px",
                  }}
                >
                  {step.n}
                </span>
                <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 800, fontSize: "1.05rem", color: "var(--text)", marginBottom: "8px" }}>
                  {renderMixed(step.title)}
                </h3>
                <p style={{ ...bodyStyle, fontSize: "0.92rem" }}>{renderMixed(step.body)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Paywall / gate note ── */}
      <section className="wao-section">
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
            <p style={bodyStyle}>
              {renderMixed(
                "זאת ההצצה שאנחנו שולחים לך. הרשימה המלאה של כל ההזדמנויות מחכה לך ב-GEO Bot, מ-₪199 לחודש."
              )}
            </p>
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
                {renderMixed("בדיקת נראות ב-AI Overviews")}
              </p>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "32px", maxWidth: "480px", margin: "0 auto 32px", lineHeight: 1.75 }}>
                {renderMixed(
                  "כדי להריץ את הבדיקה אנחנו צריכים גישת קריאה בלבד לנתוני Search Console שלך. אנחנו לא נוגעים באתר ולא משנים כלום — רק קוראים את הנתונים. אחרי הבדיקה הגישה נסגרת."
                )}
              </p>
              <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                <a
                  href="/contact?ref=geo-audit"
                  className="btn-primary w-full sm:w-auto justify-center"
                  style={{ fontSize: "1.05rem", padding: "16px 40px" }}
                >
                  {renderMixed("תשאיר פרטים ותקבל את 3 ההזדמנויות שלך ←")}
                </a>
                <Link href="/geo" className="btn-outline w-full sm:w-auto justify-center" style={{ fontSize: "1rem" }}>
                  עוד על GEO Bot
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
