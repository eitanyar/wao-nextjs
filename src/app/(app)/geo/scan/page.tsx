import type { Metadata } from "next";
import { renderMixed } from "@/lib/bidi";
import SiloNav from "@/components/SiloNav";
import ScanForm from "@/components/geo/ScanForm";

const CANONICAL = "https://www.wao.co.il/geo/scan";

export const metadata: Metadata = {
  title: {
    absolute: "בדיקת מוכנות ל-AI Search — סריקה מיידית וחינמית‏ | WAO",
  },
  description:
    "בודקים אם התוכן באתר שלך בנוי בצורה שמנועי ה-AI יכולים לצטט. סריקה מיידית של עד 10 עמודים, בלי הרשמה ובלי להתחבר לשום דבר — ציון מוכנות תוך שניות. זה בודק סימני מוכנות מבניים, לא דירוג.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "האתר שלך מוכן לחיפוש בעידן ה-AI?",
    description:
      "סריקה חינמית ומיידית שבודקת אם התוכן שלך בנוי כך שמנועי AI יכולים לחלץ ולצטט אותו. בלי הרשמה, בלי התחברות — ציון מוכנות תוך שניות.",
    url: CANONICAL,
    type: "website",
  },
};

const schemas = [
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${CANONICAL}#service`,
    name: "בדיקת מוכנות ל-AI Search",
    provider: {
      "@type": "Organization",
      name: "WAO",
      url: "https://wao.co.il",
    },
    areaServed: "IL",
    description:
      "בדיקה חינמית ומיידית: סורקים עד 10 עמודים ציבוריים באתר שלך ובודקים סימני מוכנות מובנית מול חיפוש מבוסס AI — בלי התחברות, בלי גישה לנתונים שלך.",
  },
];

export default function GeoScanPage() {
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

      <section style={{ paddingTop: "clamp(110px,14vw,160px)", paddingBottom: "clamp(64px,8vw,96px)", position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(74,227,181,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="hero-grid" />
        <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "860px" }}>
          <SiloNav currentPath="/geo/scan" />

          <p className="badge" style={{ marginBottom: "28px" }}>
            <span className="badge-dot" />
            {renderMixed("GEO · סריקה מיידית וחינמית")}
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
            האתר שלך מוכן לחיפוש בעידן ה-AI?
          </h1>

          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.2rem)", marginBottom: "32px", maxWidth: "640px" }}>
            {renderMixed(
              "מזינים כתובת, ותוך שניות מקבלים ציון מוכנות שבודק אם התוכן שלך בנוי בצורה שמנועי AI יכולים לחלץ ולצטט. בלי הרשמה, בלי התחברות, בלי התחייבות. זה מדד מוכנות מבני — לא תחזית דירוג."
            )}
          </p>

          <ScanForm />

          <p style={{ marginTop: "18px", fontSize: "0.85rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
            {renderMixed(
              "אנחנו קוראים רק עמודים ציבוריים באתר שלך (עד 10), בלי להתחבר לשום חשבון ובלי לגעת בנתונים שלך. אין צורך בהרשאות."
            )}
          </p>
        </div>
      </section>

      {/* ── What this checks ── */}
      <section className="wao-section" style={{ paddingTop: 0 }}>
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div className="eyebrow" style={{ marginInline: "auto" }}>מה נבדק</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px" }}>
            {[
              { n: "1", title: "מבנה שאלה-תשובה גלוי", body: "האם יש כותרות בסגנון שאלה עם תשובה ישירה וקצרה מיד אחריהן." },
              { n: "2", title: "בהירות מבנה כותרות", body: "כותרת H1 אחת, היררכיה הגיונית, בלי כותרות ריקות." },
              { n: "3", title: "יכולת סריקה בסיסית", body: "robots.txt ותגי noindex — חסימה כאן מגבילה את הציון הכולל." },
              { n: "4", title: "מפת אתר", body: "קיום sitemap.xml תקין עם רשומות URL." },
              { n: "5", title: "סכימת מבנה (Schema)", body: "תגיות FAQPage / Article / Organization ב-JSON-LD." },
            ].map((step) => (
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

      {/* ── Honesty boundary note ── */}
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
                "זו בדיקת סימני מוכנות מבנית בלבד — היא לא חוזה אם דף יופיע ב-AI Overviews, ולא משווה אותך לאתרים אחרים. לניתוח אמיתי מול נתוני החיפוש שלך, יש את "
              )}
              <a href="/geo/audit" style={{ color: "var(--accent)" }}>
                {renderMixed("בדיקת נראות ב-AI Overviews")}
              </a>
              {renderMixed(".")}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
