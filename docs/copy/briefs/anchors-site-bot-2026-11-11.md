# Brief: SEO anchors for /site-bot (2026-11-11)

**Reader:** the same hands-on Israeli tradesman as the body rewrite, singular male. Apply every approved writing rule.

**Job:** write ONLY these strings, following Yonatan's /site-bot spec exactly (head terms, character budgets, endings, facts):
- `title.absolute`
- `openGraph.title` (identical to the title, including the RLM and " | WAO")
- `description`
- `openGraph.description`
- the hero badge text
- the h1

The page body was already rewritten; the file below is the post-rewrite version. Copy each `old` byte-for-byte from it.

**Facts:** the /site-bot items in the "Facts settled by Eitan" section below. Ignore everything about Google Ads.

**Output:** JSON patches only, each with `old` and `new`. Give the character count of each title and description in your angle note.

=== YONATAN'S SPEC ===
# Anchor specs: /google-ads + /site-bot (Yonatan, 2026-11-11)

Saved by Adam from Yonatan's hand-back. Eitan confirmed the fee is ALWAYS ₪1,500 flat (overrides Facts item 3 in the Noa review).

**All titles:** keep title.absolute; the string ends in a Hebrew word + RLM + " | WAO"; ≤60 chars including the suffix; the OG title is the identical string, which also fixes the missing RLM. No other page in src/app competes for either head term.

## /google-ads (commercial intent)
- **Title:** keep "פרסום בגוגל" first, then "ניהול Google Ads". Change "מ-₪1,500" to a flat "₪1,500 לחודש". Drop "בחשבון שלך" (the h1 carries it) to get ≤60 chars. End on "לחודש".
## /site-bot (commercial intent)
- **Title:** keep "בניית אתר לעסק קטן" first. Drop "עורך". The new angle is speed + updates by message. The speed claim must be true without a footnote ("from one business day" or the three-day ceiling). No price in the title.
- **h1:** keep the head term as the opening words. Remove "מתחילה בשיחה עם איתן". Replace with: the bot builds the site with him in a chat from the start; updates go by message. Eitan is introduced in the body, not the h1. ≤90 chars; verb gender agrees with "בנייה".
- **Badge:** no "עורך". Use the price, ₪199 + VAT per month, with no commitment.
- **Meta description:** 140–155 chars. Include: the head term once, the chat build, one business day on a WAO address or three with his own domain, updates by message, ₪199 + VAT. Don't name Eitan, and don't say "לעסק שלך" twice.
- **OG title:** the title string.

## Landscape (Nov 2026, medium confidence, vendor sources)

=== FACTS ===
# Facts settled by Eitan (2026-11-11)
**/google-ads**
1. Stats (200–400% ROI, 60% CPA drop, 8:1 benchmark): **cannot be backed → remove the whole stats block.** No performance numbers anywhere on the page.
2. Commitment: month to month, **no minimum and no notice period**; billing is at the beginning of the month.
3. What raises the fee above ₪1,500: unclear to Eitan → don't explain it; keep the existing "from ₪1,500" wording as is, add nothing about tiers.
4. Fraud Blocker: **included** in the management fee.
5. The free 30-minute call **does include** a look at the client's account.
**/site-bot**
6. Chat editing after cancellation: **no** → never "forever"; editing is part of an active subscription.
7. Price: **show it** — ₪199 + VAT per month, monthly, no commitment, cancel online any time; cancellation takes effect at the end of the paid month (docs/legal/site-bot-terms-of-use.md §7–§8).
8. Time to live: **one business day** on a WAO address; **three business days** with the client's own domain.
9. The bot runs on its own (chat) from the start; Eitan is one chat message away when needed. Don't name WhatsApp; say "a message"/"chat" consistently.
10. **One package only** → drop "החבילה המלאה".
11. Google Business Profile: we **connect an existing one** (we don't create it). First customers are found through their existing Google Maps listings.
- **Update (Eitan, later 2026-11-11):** Q3: the Google Ads management fee is **always ₪1,500/month**, flat, never "from". The /site-bot h1 changes too, since it says the build starts with a call; Yonatan specs it and Tamar writes it.
- **CORRECTION (Eitan, later 2026-11-11):** ₪1,500/month is the **minimum ad spend (paid to Google)** needed to use the Google Ads Bot, or the manual retainer. It is **not** a management fee. The manual 1:1 retainer costs more than ₪1,500 on its own and is no longer pushed; the Ads Bot is the offer. The "flat ₪1,500 fee" update above is superseded.

=== FILE: src/app/(app)/site-bot/page.tsx (post body rewrite) ===
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
    q: "כמה עולה לי אתר לעסק קטן?",
    a: "199 ₪ + מע״מ לחודש. בלי התחייבות ובלי הודעה מוקדמת. אפשר לבטל אונליין בכל עת, והביטול נכנס לתוקף בסוף החודש ששולם.",
  },
  {
    q: "מתי האתר שלי עולה לאוויר?",
    a: "תוך יום עסקים אחד בכתובת של WAO. עם דומיין שרשום על שמך, תוך שלושה ימי עסקים.",
  },
  {
    q: "אני צריך לדעת קוד כדי שיהיה לי אתר?",
    a: "לא. אתה מדבר איתנו על העסק, ואנחנו בונים ומעלים את האתר. אחר כך כל עדכון הוא הודעה.",
  },
  {
    q: "איך אני משנה מחיר או שירות אחרי שהאתר באוויר?",
    a: "בהודעה אחת, התוכן באתר משתנה. העריכה כלולה כל עוד המינוי פעיל, בלי לגעת בקוד.",
  },
  {
    q: "למה לי לא לבנות לבד ב-Wix או ב-WordPress?",
    a: "ב-Wix או ב-WordPress אתה בונה ומעדכן בעצמך. כאן הדומיין רשום על שמך, ואת כל השינויים אתה מבקש בהודעה.",
  },
  {
    q: "למדתי לבנות אתר בקורס של WAO. למה לי לשלם?",
    a: "הזמן שלך שווה כסף. אתה יכול לבנות לבד, אבל כל עדכון יחזיר אותך לעורך. כאן אתה מעביר הודעה, בלי לפתוח עורך.",
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
  "אתה מדבר עם איתן על העסק, בלי לפתוח עורך אתרים.",
  "אנחנו בונים את האתר ומעלים אותו לדומיין שרשום על שמך.",
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
              "אתה באמצע יום עבודה וצריך לעדכן מחיר? אתה שולח הודעה, והמחיר החדש כבר באתר. האתר כולל חמישה עמודים בדומיין על שמך."
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
              "אתה משלם 199 ₪ + מע״מ לחודש. בלי התחייבות ובלי הודעה מוקדמת. אפשר לבטל אונליין בכל עת, והביטול נכנס לתוקף בסוף החודש ששולם."
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
              "בלי התחייבות. עם כתובת של WAO האתר עולה תוך יום עסקים אחד."
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
                "החבילה כוללת אתר בן חמישה עמודים בדומיין על שמך ועריכה בהודעה. יש גם חיבור לפרופיל העסקי הקיים שלך בגוגל, לכלי של גוגל שמראה איך אנשים מוצאים אותך ולטופס שמעביר אליך פניות."
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
            {renderMixed("כך הפרופיל העסקי הקיים שלך בגוגל מתחבר לאתר.")}
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
                {renderMixed("אחרי הודעה אחת, השינוי כבר באוויר. בלי עורך אתרים ובלי לחכות.")}
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
