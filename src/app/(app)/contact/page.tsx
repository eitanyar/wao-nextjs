import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

const CANONICAL = "https://www.wao.co.il/contact";

export const metadata: Metadata = {
  title: "צור קשר — ייעוץ ראשון ללא עלות",
  description:
    "צרו קשר עם WAO לייעוץ שיווק דיגיטלי ראשון ללא עלות. מגיבים תוך 24 שעות. טלפון: 052-614-8860. מתמחים בעסקי B2C בלבד.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "צור קשר — ייעוץ ראשון ללא עלות | WAO",
    description: "ייעוץ שיווק דיגיטלי ראשון ללא עלות. מגיבים תוך 24 שעות.",
    url: CANONICAL,
    type: "website",
  },
};

const schemas = [
  {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "@id": `${CANONICAL}#webpage`,
    url: CANONICAL,
    name: "צור קשר — WAO",
    isPartOf: { "@type": "WebSite", "@id": "https://www.wao.co.il/#website" },
  },
  {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://www.wao.co.il/#org",
    name: "WAO",
    telephone: "+972526148860",
    email: "dina@wao.co.il",
    address: {
      "@type": "PostalAddress",
      addressLocality: "ראשון לציון",
      addressCountry: "IL",
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
      opens: "09:00",
      closes: "18:00",
    },
    url: "https://www.wao.co.il",
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: "https://www.wao.co.il" },
      { "@type": "ListItem", position: 2, name: "צור קשר", item: CANONICAL },
    ],
  },
];

const STEPS = [
  {
    n: "01",
    title: "שיחת גילוי — 20 דקות",
    desc: "מבינים את העסק שלך, האתגרים, המטרות, מה ניסית ומה עבד. ללא מכירה, ללא לחץ.",
    tags: ["Discovery", "Goals", "No-pressure"],
  },
  {
    n: "02",
    title: "מחזירים עם הצעה מותאמת",
    desc: "בתוך 24–48 שעות שולחים תכנית עבודה ראשונית עם ערוצים, עלויות ויעדי KPI.",
    tags: ["Proposal", "KPI", "Timeline"],
  },
  {
    n: "03",
    title: "מתחילים — ורק אז משלמים",
    desc: "גובים תשלום רק בסוף החודש הראשון. בדקו אותנו בלי להתחייב.",
    tags: ["No-risk", "Pay-after", "Monthly"],
  },
];

const FAQS = [
  {
    q: "כמה עולה הייעוץ הראשון?",
    a: "הייעוץ הראשון הוא ללא עלות לגמרי — שיחה של 20–30 דקות שבה מבינים את העסק שלך ומציעים כיוון. רק אם החלטתם להתקדם ביחד מגיע לדיון מחיר.",
  },
  {
    q: "כמה זמן לוקח לקבל מענה?",
    a: "מגיבים לכל פנייה תוך 24 שעות בימי עסקים. לפניות דחופות יותר — תמיד אפשר להתקשר ישירות ל-052-614-8860.",
  },
  {
    q: "האם WAO עובדת עם כל סוג עסק?",
    a: "לא. מתמחים בעסקי B2C בלבד. אם אתה עסק B2B טהור — נגיד לך זאת ישר ולא נקח את הכסף שלך.",
  },
  {
    q: "האם יש חוזה ארוך טווח?",
    a: "ממש לא. עובדים חודש-חודש. גובים תשלום רק בסוף החודש — אחרי שראיתם תוצאות.",
  },
];

export default function ContactPage() {
  const glass: React.CSSProperties = {
    background: "rgba(13,15,21,0.72)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
  };

  const h2Style: React.CSSProperties = {
    fontFamily: "var(--font-rubik), sans-serif",
    fontWeight: 800,
    fontSize: "clamp(1.5rem,2.5vw,2rem)",
    lineHeight: 1.2,
    marginBottom: "1rem",
    color: "var(--text)",
    marginTop: 0,
  };

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
      <section style={{ paddingTop: "clamp(110px,14vw,160px)", paddingBottom: "clamp(48px,6vw,72px)", position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(74,227,181,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="hero-grid" />
        <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "860px" }}>
          <div className="badge" style={{ marginBottom: "28px" }}>
            <span className="badge-dot" />
            ייעוץ ראשון ללא עלות וללא התחייבות
          </div>
          <h1
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 900,
              fontSize: "clamp(2.4rem,5.5vw,4.2rem)",
              lineHeight: 1.08,
              letterSpacing: "-0.025em",
              marginBottom: "24px",
            }}
          >
            בואו נדבר —{" "}
            <span className="text-gradient">שיחה קצרה שיכולה</span>
            <br className="hidden md:block" />
            {" "}לשנות את כיוון העסק שלך
          </h1>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.2rem)", maxWidth: "580px" }}>
            לא טפסים שנעלמים לשום מקום. לא מכירה בלחץ. שיחה אמיתית עם איתן — שמבין את האתגרים שלך ומציע כיוון.
          </p>
        </div>
      </section>

      {/* ── Contact form + info ── */}
      <section className="wao-section" style={{ paddingTop: "clamp(32px,4vw,56px)" }}>
        <div className="wao-container">
          <div className="content-2col" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "64px", alignItems: "start" }}>
            {/* Form */}
            <div>
              <h2 style={{ ...h2Style, marginBottom: "28px" }}>שלח פנייה</h2>
              <ContactForm source="contact-page" />
            </div>

            {/* Contact info */}
            <div>
              <h2 style={{ ...h2Style, marginBottom: "28px" }}>פרטי יצירת קשר</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {[
                  { icon: "📞", label: "טלפון", value: "052-614-8860", href: "tel:0526148860" },
                  { icon: "✉️", label: "אימייל", value: "dina@wao.co.il", href: "mailto:dina@wao.co.il" },
                  { icon: "📍", label: "כתובת", value: "ראשון לציון", href: null },
                  { icon: "🕒", label: "שעות פעילות", value: "ראשון–חמישי 9:00–18:00", href: null },
                ].map((c) => (
                  <div key={c.label} style={{ ...glass, padding: "18px 20px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{c.icon}</span>
                    <div>
                      <div style={{ fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "4px" }}>{c.label}</div>
                      {c.href ? (
                        <a href={c.href} style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 600, fontSize: "1rem", color: "var(--text)" }} dir={c.label === "טלפון" ? "ltr" : undefined}>
                          {c.value}
                        </a>
                      ) : (
                        <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 600, fontSize: "1rem" }}>{c.value}</div>
                      )}
                    </div>
                  </div>
                ))}

                {/* LinkedIn */}
                <div style={{ ...glass, padding: "18px 20px", display: "flex", gap: "16px", alignItems: "center" }}>
                  <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>🔗</span>
                  <div>
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "4px" }}>LinkedIn</div>
                    <a href="https://www.linkedin.com/in/eitanyariv/" target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 600, fontSize: "0.95rem", color: "var(--accent)" }}>
                      איתן יריב — LinkedIn
                    </a>
                  </div>
                </div>
              </div>

              {/* Process mini */}
              <div style={{ marginTop: "40px" }}>
                <div className="eyebrow" style={{ marginBottom: "20px" }}>מה קורה אחרי שפונים</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {STEPS.map((step) => (
                    <div key={step.n} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                      <span style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "var(--accent)", flexShrink: 0, lineHeight: 1.4 }}>{step.n}</span>
                      <div>
                        <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "0.97rem", marginBottom: "4px" }}>{step.title}</div>
                        <p style={{ ...bodyStyle, fontSize: "0.88rem" }}>{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container" style={{ maxWidth: "800px" }}>
          <div className="eyebrow">שאלות נפוצות</div>
          <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)", marginBottom: "48px" }}>
            כל מה שרציתם לדעת{" "}
            <span className="text-gradient">לפני שפונים</span>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {FAQS.map((faq) => (
              <details key={faq.q} style={{ ...glass, padding: "0" }}>
                <summary style={{ padding: "22px 24px", cursor: "pointer", fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1.02rem", lineHeight: 1.4, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                  {faq.q}
                  <span style={{ fontSize: "1.2rem", color: "var(--accent)", flexShrink: 0 }}>+</span>
                </summary>
                <div style={{ padding: "0 24px 22px", ...bodyStyle }}>{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
