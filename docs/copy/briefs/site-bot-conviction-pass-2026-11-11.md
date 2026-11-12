# Brief: /site-bot — conviction pass (2026-11-11)

**Reader:** a hands-on Israeli one-man-show business owner (plumber, electrician, AC tech, beautician…), singular male, busy all day at clients, ROI-minded, allergic to jargon and AI-sounding copy. Voice target: the /site-bot/audit exemplar (loaded) — blunt, concrete, Sabra. Apply every approved writing-upgrade rule (loaded).

**Why this pass:** the founder (Eitan) read the rewritten page below and said it reads like we don't believe in our product. No enthusiasm. His words: we ARE the best product for the one-man show, at a competitive price, and the page must say so black on white. Right now several lines are defensive or neutral (they describe the competitor's pain politely, or explain instead of claiming). Make the page sound like someone who is proud of what he sells and knows it beats the alternatives for this reader — confident, direct, warm. Not hype: no superlatives without a reason next to them, no exclamation-mark stacking, no invented numbers.

**The argument the founder wants made, plainly:**
- For about what a site builder's own plan already costs per month, he gets the site built and kept up to date for him. And with a site builder he still pays in his own hours: learning the system, fighting the editor, every change on him.
- Here it's simple: he tells the bot about his business in a chat, the site goes live, and every change after that is one message. That's exactly what a busy one-man show needs.
- One package, one price, no commitment.

**Facts (settled — use only these and what the page already states; invent nothing):**
- ₪199 + VAT per month (write the price as the page does: "199 ₪ + מע״מ"), monthly, no commitment, cancel online any time; cancellation takes effect at the end of the paid month.
- Live within one business day on a WAO address, three business days with his own domain; the clock starts at payment. He buys his own domain; we connect it.
- Five-page site; updates by message go live right away; updates are included as long as the subscription is active (never "forever").
- The bot runs on its own from the chat; Eitan, WAO's founder, is one message away when needed.
- We connect his existing Google Business Profile (we don't create one).
- Site-builder comparison: do NOT quote any competitor's price as a number and do not name a competitor's plan. You may say a site builder's monthly plan costs about the same / not much less, plus his time. Naming Wix or WordPress is fine (the page already does).

**Hard keeps:** page `<title>`, `<h1>`, hero badge, meta/OG description strings — do not touch. Singular masculine. ״ ׳ never ASCII quotes. Em-dash — single-spaced. Don't name WhatsApp; say "הודעה"/"צ׳אט".

**Scope:** only replace existing rendered string literals / JSX text nodes in the file below (you may empty one with ""). Touch only the lines that need conviction — leave lines that already work. In your angle note, say in one line what the page now claims.

**Output:** JSON patches only. Each `old` copied byte-for-byte from the file below (the exact content of one string literal or JSX text node, without surrounding quotes), `new` = replacement. Also list any FAQ strings duplicated in a JSON-LD schema block, so the engineer keeps them in sync.

=== FILE: src/app/(app)/site-bot/page.tsx (after the approved rewrite) ===
import type { Metadata } from "next";
import Link from "next/link";
import { renderMixed } from "@/lib/bidi";

const CANONICAL = "https://www.wao.co.il/site-bot";

export const metadata: Metadata = {
  // title.absolute bypasses the root "%s‏ | WAO" template — this string already
  // ends in the RLM-anchored "‏ | WAO" suffix, so the template must not append a second one.
  title: {
    absolute: "בניית אתר לעסק קטן תוך 3 ימי עסקים, עדכון בהודעה‏ | WAO",
  },
  description:
    "בניית אתר לעסק קטן בצ׳אט. הבוט בונה איתך תוך יום עסקים בכתובת WAO או תוך שלושה ימי עסקים בדומיין שלך. עדכונים בהודעה. 199 ₪ + מע״מ לחודש, בלי התחייבות.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "בניית אתר לעסק קטן תוך 3 ימי עסקים, עדכון בהודעה‏ | WAO",
    description:
      "בניית אתר לעסק קטן בצ׳אט. הבוט בונה איתך תוך יום עסקים בכתובת WAO או תוך שלושה ימי עסקים בדומיין שלך. עדכונים בהודעה. 199 ₪ + מע״מ לחודש, בלי התחייבות.",
    url: CANONICAL,
    type: "website",
  },
};

const FAQS = [
  {
    q: "כמה עולה לי אתר לעסק קטן?",
    a: "199 ₪ + מע״מ לחודש, בלי התחייבות. אתה יכול לבטל אונליין מתי שתרצה, והביטול נכנס לתוקף בסוף החודש ששילמת עליו.",
  },
  {
    q: "מתי האתר שלי עולה לאוויר?",
    a: "תוך יום עסקים אחד בכתובת של WAO. עם דומיין שרשום על שמך, תוך שלושה ימי עסקים.",
  },
  {
    q: "אני צריך לדעת קוד כדי שיהיה לי אתר?",
    a: "לא. אתה מספר לבוט על העסק במילים שלך, והוא בונה איתך את האתר. אחר כך כל עדכון הוא הודעה.",
  },
  {
    q: "איך אני משנה מחיר או שירות אחרי שהאתר באוויר?",
    a: "אתה שולח הודעה עם השינוי, והבוט מעדכן את האתר. העדכונים כלולים במחיר כל עוד המינוי פעיל.",
  },
  {
    q: "למה שלא אבנה לבד ב-Wix או ב-WordPress?",
    a: "ב-Wix או ב-WordPress אתה בונה ומעדכן בעצמך. כאן הדומיין רשום על שמך, ואת כל השינויים אתה מבקש בהודעה.",
  },
  {
    q: "למדתי לבנות אתר בקורס של WAO. למה לי לשלם?",
    a: "הזמן שלך שווה כסף. אתה יכול לבנות לבד, אבל כל עדכון יחזיר אותך לעורך. כאן אתה שולח הודעה.",
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
  "אתה מספר לבוט על העסק בצ׳אט, בלי לפתוח עורך אתרים.",
  "הבוט בונה איתך את האתר ומעלה אותו לאוויר.",
  "כשמשהו משתנה בעסק, אתה שולח הודעה אחת והעדכון עולה לאתר.",
];

const COMPARE = [
  {
    label: "לשכור מפתח או סוכנות",
    body: "כשאתה רוצה לעדכן מחיר, אתה מחכה שמישהו אחר יתפנה לזה.",
  },
  {
    label: "Wix או WordPress לבד",
    body: "אתה בונה בעצמך, ואז חוזר לעורך בכל פעם שמשהו בעסק משתנה.",
  },
  {
    label: "לבנות לבד בעזרת AI",
    body: "אתה בונה מהר, ואז כל תיקון, כל עדכון וכל תקלה נופלים עליך.",
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
            199 ₪ + מע״מ לחודש, בלי התחייבות
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
            בניית אתר לעסק קטן מתחילה בצ׳אט — הבוט בונה איתך ואתה מעדכן את האתר בהודעה.
          </h1>

          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.2rem)", marginBottom: "24px", maxWidth: "640px" }}>
            {renderMixed(
              "אתה באמצע יום עבודה וצריך לעדכן מחיר? אתה שולח הודעה, והמחיר החדש כבר באתר."
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
            {renderMixed("תשאיר פרטים, ואיתן, מייסד WAO, יחזור אליך לשיחה על האתר.")}
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
            {renderMixed("")}
          </h2>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.12rem)", color: "var(--text)" }}>
            {renderMixed(
              ""
            )}
          </p>
        </div>
      </section>

      {/* ── Price anchor block ── */}
      <section className="wao-section">
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.15rem)", marginBottom: "24px", color: "var(--text)" }}>
            {renderMixed(
              "אתה משלם 199 ₪ + מע״מ לחודש ויכול לבטל אונליין מתי שתרצה."
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
              "עם כתובת של WAO, האתר באוויר תוך יום עסקים אחד."
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
                "החבילה כוללת אתר בן חמישה עמודים בדומיין על שמך ועדכונים בהודעה. יש גם חיבור לפרופיל העסקי הקיים שלך בגוגל, לכלי של גוגל שמראה איך אנשים מוצאים אותך ולטופס שמעביר אליך פניות."
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
            {renderMixed("לבנות לבד, לשכור מפתח או לשלוח הודעה?")}
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
              {renderMixed("Site Bot הוא אתר בן חמישה עמודים בדומיין על שמך, עם עדכונים בהודעה.")}
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
            מה חשוב לך לדעת
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
            {renderMixed("יש גם בוט שמנהל לך את הפרופיל העסקי בגוגל, עם פוסטים ותגובות לביקורות.")}
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
                {renderMixed("Site Bot")} — <span className="text-gradient">אתר שמתעדכן בהודעה</span>
              </p>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "32px", maxWidth: "480px", margin: "0 auto 32px", lineHeight: 1.75 }}>
                {renderMixed("אחרי הודעה אחת, השינוי כבר באוויר. בלי עורך אתרים.")}
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
