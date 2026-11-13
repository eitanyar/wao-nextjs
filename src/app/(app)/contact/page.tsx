import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import PhoneReveal from "@/components/PhoneReveal";

const CANONICAL = "https://www.wao.co.il/contact";

export const metadata: Metadata = {
  title: "צור קשר — שיחת התאמה קצרה ללא עלות",
  description:
    "צור קשר עם WAO לשיחת התאמה קצרה ללא עלות: נבדוק אם Site Bot או Ads Bot מתאים לעסק שלך. מגיבים תוך 24 שעות. טלפון: 052-614-8860.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "צור קשר — שיחת התאמה קצרה ללא עלות | WAO",
    description: "שיחת התאמה קצרה ללא עלות: מתאים לך Site Bot או Ads Bot? מגיבים תוך 24 שעות.",
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
    title: "שיחת התאמה קצרה",
    desc: "איתן מתקשר ושואל כמה שאלות על העסק. בשיחה הזאת לא מוכרים לך כלום.",
    tags: ["Fit-check", "Budget", "No-pressure"],
  },
  {
    n: "02",
    title: "בוחרים את הבוט שמתאים לך",
    desc: "אתה בוחר בין Site Bot ל-Ads Bot ונרשם אונליין, בלי פגישות.",
    tags: ["Site Bot", "Ads Bot", "Online"],
  },
  {
    n: "03",
    title: "הבוט יוצא לעבודה",
    desc: "מנוי חודשי פשוט: אתה משלם חודש מראש, ואנחנו מתחילים לעבוד מיד. אין חוזה ואין התחייבות.",
    tags: ["No-commitment", "Monthly", "Cancel-online"],
  },
];

const FAQS = [
  {
    q: "כמה עולה לי שיחת ההתאמה?",
    a: "כלום. זו שיחה קצרה שבה איתן בודק אם Site Bot או Ads Bot יביא לך עבודה: כמה ביקורות יש לך בגוגל ואיזה תקציב פרסום הגיוני בשבילך. יש לך שאלות על ההרשמה? זה הזמן לשאול.",
  },
  {
    q: "כמה זמן לוקח לקבל מענה?",
    a: "חוזרים לכל מי שפונה תוך 24 שעות בימי עסקים. דחוף לך? תתקשר ישר ל-052-614-8860.",
  },
  {
    q: "האם WAO עובדת עם כל סוג עסק?",
    a: "לא. אנחנו עובדים רק עם עסקים שמוכרים ללקוחות פרטיים. אם הלקוחות שלך הם עסקים אחרים, נגיד לך את זה ישר ולא ניקח ממך שקל.",
  },
  {
    q: "האם יש חוזה ארוך טווח?",
    a: "אין. זה מנוי חודשי: אתה משלם חודש מראש ומבטל אונליין מתי שבא לך. הביטול נכנס לתוקף בסוף החודש ששילמת.",
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
            שיחת התאמה קצרה, בלי עלות ובלי התחייבות
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
            בוא נדבר —{" "}
            <span className="text-gradient">שיחה קצרה אחת,</span>
            <br className="hidden md:block" />
            {" "}ותדע אם זה בשבילך
          </h1>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.2rem)", maxWidth: "580px" }}>
            משאירים פרטים, ואיתן חוזר אליך תוך יום עסקים. הוא שומע מה אתה עושה ואיפה, ואומר לך ישר אם יש בוט שיביא לך עבודה, גם אם התשובה היא ״לא אצלנו״.
          </p>
        </div>
      </section>

      {/* ── Contact form + info ── */}
      <section className="wao-section" style={{ paddingTop: "clamp(32px,4vw,56px)" }}>
        <div className="wao-container">
          <div className="content-2col" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "64px", alignItems: "start" }}>
            {/* Form */}
            <div id="contact-form" style={{ scrollMarginTop: "72px" }}>
              <h2 style={{ ...h2Style, marginBottom: "28px" }}>שלח פנייה</h2>
              <ContactForm source="contact-page" />
            </div>

            {/* Contact info */}
            <div>
              <h2 style={{ ...h2Style, marginBottom: "28px" }}>פרטי יצירת קשר</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Phone — "reveal number" click-intent tracker on desktop, plain tel: on mobile */}
                <div style={{ ...glass, padding: "18px 20px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>📞</span>
                  <div>
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "4px" }}>טלפון</div>
                    <PhoneReveal
                      source="contact-page"
                      style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 600, fontSize: "1rem", color: "var(--text)", background: "none", border: "none", padding: 0 }}
                    />
                  </div>
                </div>

                {[
                  { icon: "✉️", label: "אימייל", value: "dina@wao.co.il", href: "mailto:dina@wao.co.il" },
                  { icon: "📍", label: "כתובת", value: "ראשון לציון", href: null },
                  { icon: "🕒", label: "שעות פעילות", value: "ראשון–חמישי 9:00–18:00", href: null },
                ].map((c) => (
                  <div key={c.label} style={{ ...glass, padding: "18px 20px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{c.icon}</span>
                    <div>
                      <div style={{ fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "4px" }}>{c.label}</div>
                      {c.href ? (
                        <a href={c.href} style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 600, fontSize: "1rem", color: "var(--text)" }}>
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
            ארבע שאלות ששואלים{" "}
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
