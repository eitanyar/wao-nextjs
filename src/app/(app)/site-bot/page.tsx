import type { Metadata } from "next";
import Link from "next/link";
import { renderMixed } from "@/lib/bidi";
import { SITE_BOT_PLAN } from "@/lib/payments/plans";
import { SITE_BOT_LANDING_COPY as COPY } from "@/lib/site-bot/landingCopy";

const CANONICAL = "https://www.wao.co.il/site-bot";

// title.absolute bypasses the root "%s\u200F | WAO" template, so the RLM-anchored brand suffix is added here, once.
// The copy (approved r2, 2026-11-12) is generated from docs/copy by scripts/build-landing-copy.mjs; never type it here.
const TITLE = `${COPY.seo.title}\u200F | WAO`;

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: COPY.seo.description,
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: COPY.seo.description,
    url: CANONICAL,
    type: "website",
  },
};

const NET_PRICE = String(SITE_BOT_PLAN.netAmount);

const schemas = [
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${CANONICAL}#service`,
    name: "Site Bot — בניית אתר לעסק קטן",
    serviceType: "בניית אתר לעסק קטן",
    description: COPY.hero.h1,
    provider: {
      "@type": "Organization",
      name: "WAO",
      url: "https://www.wao.co.il",
    },
    areaServed: "IL",
    offers: {
      "@type": "Offer",
      priceCurrency: SITE_BOT_PLAN.currency,
      price: NET_PRICE,
      description: COPY.hero.badge,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: NET_PRICE,
        priceCurrency: SITE_BOT_PLAN.currency,
        valueAddedTaxIncluded: false,
        unitCode: "MON",
        billingDuration: "P1M",
      },
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${CANONICAL}#faq`,
    mainEntity: COPY.faq.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  },
];

const PARTS = [COPY.parts.site, COPY.parts.profile, COPY.parts.reviews];

export default function SiteBotPage() {
  const bodyStyle: React.CSSProperties = {
    fontFamily: "var(--font-body), sans-serif",
    lineHeight: 1.8,
    color: "var(--muted)",
    fontSize: "1rem",
    margin: 0,
  };

  const h2Style: React.CSSProperties = {
    fontFamily: "var(--font-rubik), sans-serif",
    fontWeight: 800,
    fontSize: "clamp(1.5rem,2.5vw,2rem)",
    lineHeight: 1.2,
    marginTop: 0,
    marginBottom: "16px",
    color: "var(--text)",
  };

  const noteStyle: React.CSSProperties = {
    marginTop: "14px",
    marginBottom: 0,
    fontSize: "0.85rem",
    color: "var(--muted)",
    fontFamily: "var(--font-body), sans-serif",
  };

  return (
    <>
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s).replace(/</g, "\\u003c") }} />
      ))}

      {/* -- Hero (with the launch stamp at the top of the page) -- */}
      <section style={{ paddingTop: "clamp(110px,14vw,160px)", paddingBottom: "clamp(64px,8vw,96px)", position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(74,227,181,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="hero-grid" />
        <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "860px" }}>
          <p
            data-launch-stamp
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 700,
              fontSize: "0.95rem",
              color: "var(--accent)",
              margin: "0 0 16px",
            }}
          >
            {renderMixed(COPY.launch_stamp)}
          </p>

          <p className="badge" style={{ marginBottom: "28px" }}>
            <span className="badge-dot" />
            {renderMixed(COPY.hero.badge)}
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
            {COPY.hero.h1}
          </h1>

          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.2rem)", marginBottom: "32px", maxWidth: "640px" }}>
            {renderMixed(COPY.hero.subhead)}
          </p>

          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <Link href="/site-bot/audit" className="btn-primary w-full sm:w-auto justify-center" style={{ fontSize: "1.05rem", padding: "16px 40px" }}>
              {renderMixed(COPY.hero.cta_primary)}
            </Link>
            <Link href="/contact?ref=site-bot-build#contact-form" className="btn-outline w-full sm:w-auto justify-center" style={{ fontSize: "1rem" }}>
              {renderMixed(COPY.hero.cta_secondary)}
            </Link>
          </div>

          <p style={{ ...noteStyle, marginTop: "18px" }}>{renderMixed(COPY.launch_stamp_cta_note)}</p>
          <p style={{ ...noteStyle, marginTop: "6px" }}>{renderMixed(COPY.hero.cta_note)}</p>
        </div>
      </section>

      {/* -- Scene: the customer's ten seconds -- */}
      <section className="wao-section" style={{ paddingTop: 0 }}>
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <h2 style={h2Style}>{renderMixed(COPY.scene.h2)}</h2>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.12rem)", color: "var(--text)" }}>{renderMixed(COPY.scene.body)}</p>
        </div>
      </section>

      {/* -- Claim: three parts, one story (the biggest type on the page after the h1) -- */}
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <h2 style={{ ...h2Style, fontWeight: 900, fontSize: "clamp(1.9rem,4.2vw,3rem)", lineHeight: 1.12, marginBottom: "20px" }}>
            <span className="text-gradient">{renderMixed(COPY.claim.h2)}</span>
          </h2>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.15rem)", color: "var(--text)" }}>{renderMixed(COPY.claim.body)}</p>
        </div>
      </section>

      {/* -- The three parts: site, Google profile, reviews -- */}
      <section className="wao-section">
        <div className="wao-container" style={{ maxWidth: "860px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {PARTS.map((part, i) => (
            <div
              key={part.h2}
              className="rounded-xl p-4 sm:p-6"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderInlineStartWidth: "4px",
                borderInlineStartColor: "var(--accent)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <span
                  aria-hidden
                  style={{
                    flexShrink: 0,
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    background: "var(--accent-dim)",
                    border: "1px solid var(--accent-border)",
                    color: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    marginTop: "4px",
                  }}
                >
                  {i + 1}
                </span>
                <div>
                  <h2 style={{ ...h2Style, fontSize: "clamp(1.15rem,2vw,1.4rem)", marginBottom: "10px" }}>{renderMixed(part.h2)}</h2>
                  <p style={bodyStyle}>{renderMixed(part.body)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* -- Every month -- */}
      <section className="wao-section" style={{ paddingTop: 0 }}>
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <h2 style={h2Style}>{renderMixed(COPY.monthly.h2)}</h2>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.12rem)", color: "var(--text)" }}>{renderMixed(COPY.monthly.body)}</p>
        </div>
      </section>

      {/* -- Alternatives: each gives one piece -- */}
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <h2 style={{ ...h2Style, marginBottom: "24px" }}>{renderMixed(COPY.alternatives.h2)}</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
            {COPY.alternatives.rows.map((row) => (
              <div key={row.option} className="rounded-xl p-4 sm:p-5" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <h3
                  style={{
                    fontFamily: "var(--font-rubik), sans-serif",
                    fontWeight: 700,
                    fontSize: "1rem",
                    margin: "0 0 8px",
                    color: "var(--text)",
                  }}
                >
                  {renderMixed(row.option)}
                </h3>
                <p style={{ ...bodyStyle, display: "flex", gap: "8px", alignItems: "baseline", margin: "0 0 4px" }}>
                  <span aria-hidden style={{ color: "var(--accent)", flexShrink: 0 }}>{"\u2713"}</span>
                  <span>{renderMixed(row.what_he_gets)}</span>
                </p>
                <p style={{ ...bodyStyle, display: "flex", gap: "8px", alignItems: "baseline" }}>
                  <span aria-hidden style={{ color: "var(--muted)", flexShrink: 0 }}>{"\u2715"}</span>
                  <span>{renderMixed(row.what_is_missing)}</span>
                </p>
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
            <p style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 800, fontSize: "1.05rem", margin: 0, color: "var(--text)" }}>
              {renderMixed(COPY.alternatives.verdict)}
            </p>
          </div>
        </div>
      </section>

      {/* -- Price -- */}
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
            <h2 style={h2Style}>{renderMixed(COPY.price.h2)}</h2>
            <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.12rem)", color: "var(--text)" }}>{renderMixed(COPY.price.body)}</p>
          </div>
        </div>
      </section>

      {/* -- Proof -- */}
      <section className="wao-section" style={{ paddingTop: 0 }}>
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <h2 style={{ ...h2Style, marginBottom: "24px" }}>{renderMixed(COPY.proof.h2)}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
            {COPY.proof.items.map((item) => (
              <div key={item.title} className="rounded-xl p-4 sm:p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1rem", margin: "0 0 8px", color: "var(--text)" }}>
                  {renderMixed(item.title)}
                </h3>
                <p style={bodyStyle}>{renderMixed(item.desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- FAQ -- */}
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
            {COPY.faq.map((faq) => (
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

      {/* -- Close -- */}
      <section className="wao-section">
        <div className="wao-container">
          <div className="cta-banner" style={{ padding: "clamp(48px,8vw,80px) clamp(24px,6vw,64px)", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div aria-hidden style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "60%", height: "100%", background: "radial-gradient(ellipse at center, rgba(74,227,181,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem,3.5vw,2.6rem)", lineHeight: 1.15, margin: "0 0 16px", color: "var(--text)" }}>
                {renderMixed(COPY.close.h2)}
              </h2>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", maxWidth: "560px", margin: "0 auto 32px", lineHeight: 1.75 }}>
                {renderMixed(COPY.close.body)}
              </p>
              <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                <Link href="/site-bot/audit" className="btn-primary w-full sm:w-auto justify-center" style={{ fontSize: "1.05rem", padding: "16px 40px" }}>
                  {renderMixed(COPY.close.cta_primary)}
                </Link>
                <Link href="/contact?ref=site-bot-build#contact-form" className="btn-outline w-full sm:w-auto justify-center" style={{ fontSize: "1rem" }}>
                  {renderMixed(COPY.close.cta_secondary)}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
