import type { Metadata } from "next";
import Link from "next/link";
import PhoneReveal from "@/components/PhoneReveal";
import SiloNav from "@/components/SiloNav";
import { renderMixed } from "@/lib/bidi";
import { ADS_BOT_MONTHLY_NET_ILS } from "@/lib/payments/plans";
import { GOOGLE_ADS_LANDING_COPY as COPY } from "@/lib/google-ads/landingCopy";
import { GOOGLE_ADS_DEMO_HREF } from "@/lib/google-ads/links";
import { HOW_IT_WORKS_COPY } from "@/lib/google-ads/howItWorksCopy";
import FounderBlock from "@/components/home/FounderBlock";
import STRINGS from "@/content/hero-product-strings-2026-11-15.json";

const CANONICAL = "https://www.wao.co.il/google-ads";

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

const NET_PRICE = String(ADS_BOT_MONTHLY_NET_ILS);

const schemas = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${CANONICAL}#webpage`,
    url: CANONICAL,
    name: "פרסום בגוגל בחשבון בבעלותך — WAO",
    description: COPY.seo.jsonld.webpage_description,
    isPartOf: { "@type": "WebSite", "@id": "https://www.wao.co.il/#website" },
  },
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${CANONICAL}#service`,
    serviceType: "Google Ads Management",
    name: "ניהול קמפיינים בגוגל בחשבון של הלקוח",
    description: COPY.seo.jsonld.service_description,
    url: CANONICAL,
    provider: { "@type": "Organization", "@id": "https://www.wao.co.il/#org" },
    areaServed: { "@type": "Country", name: "Israel" },
    offers: {
      "@type": "Offer",
      priceCurrency: "ILS",
      price: NET_PRICE,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: NET_PRICE,
        priceCurrency: "ILS",
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
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: "https://www.wao.co.il" },
      { "@type": "ListItem", position: 2, name: "פרסום בגוגל", item: CANONICAL },
    ],
  },
];

const DEMO_HREF = GOOGLE_ADS_DEMO_HREF;

export default function GoogleAdsPage() {
  // Cards on the light body: a plain bordered card (design review #8/#9; no glass blur).
  const glass: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
  };

  const h2Style: React.CSSProperties = {
    fontFamily: "var(--font-rubik), sans-serif",
    fontWeight: 700,
    fontSize: "clamp(1.6rem,3vw,2.4rem)",
    lineHeight: 1.2,
    marginBottom: "1rem",
    color: "var(--text)",
    marginTop: 0,
  };

  const bodyStyle: React.CSSProperties = {
    fontFamily: "var(--font-body), sans-serif",
    lineHeight: 1.6,
    color: "var(--muted)",
    fontSize: "1rem",
    margin: 0,
    maxWidth: "34em",
  };

  const leadStyle: React.CSSProperties = { ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.12rem)", color: "var(--text)" };

  const smallStyle: React.CSSProperties = { ...bodyStyle, fontSize: "0.88rem" };

  return (
    <>
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s).replace(/</g, "\\u003c") }} />
      ))}

      {/* -- Hero -- */}
      <section style={{ paddingTop: "clamp(110px,14vw,160px)", paddingBottom: "clamp(64px,8vw,96px)", position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(74,227,181,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="wao-container wao-hero-copy" style={{ position: "relative", zIndex: 1 }}>
          <div className="badge" style={{ marginBottom: "28px" }}>
            {renderMixed(COPY.hero.badge)}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 700,
              fontSize: "clamp(2.2rem,5vw,3.8rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              marginBottom: "24px",
            }}
          >
            {COPY.hero.h1}
          </h1>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.2rem)", marginBottom: "40px", maxWidth: "640px" }}>
            {renderMixed(COPY.hero.subhead)}
          </p>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <a href="tel:0526148860" className="btn-primary" style={{ fontSize: "1.05rem", padding: "15px 36px" }}>
              {renderMixed(COPY.hero.cta_primary)}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <Link href={DEMO_HREF} className="btn-outline" style={{ fontSize: "1rem" }}>
              {renderMixed(COPY.hero.cta_secondary)}
            </Link>
          </div>
          <p style={{ marginTop: "18px", marginBottom: 0, fontSize: "0.85rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
            {renderMixed(COPY.hero.cta_note)}
          </p>
        </div>
      </section>

      {/* Light body between the dark hero and the dark closing band (design review #8; Eitan: hero + close stay dark). */}
      <div className="wao-light">
      <div className="wao-container wao-silo-below-hero">
        <SiloNav currentPath="/google-ads" />
      </div>

      {/* -- Mechanism: three moments -- */}
      <section className="wao-section">
        <div className="wao-container">
          <div style={{ marginBottom: "32px", maxWidth: "860px" }}>
            <h2 style={h2Style}>{renderMixed(COPY.mechanism.h2)}</h2>
            <p style={leadStyle}>{renderMixed(COPY.mechanism.intro)}</p>
          </div>
          <ol className="wao-steps">
            {COPY.mechanism.moments.map((moment) => (
              <li key={moment.title}>
                <div>
                  <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1.2rem", marginTop: 0, marginBottom: "10px" }}>{renderMixed(moment.title)}</h3>
                  <p style={bodyStyle}>{renderMixed(moment.desc)}</p>
                </div>
              </li>
            ))}
          </ol>
          {/* Mechanism anchor: reserved for /google-ads/how-it-works only (Yonatan r2 sign-off). */}
          <p style={{ ...bodyStyle, marginTop: "24px" }}>
            <Link href={HOW_IT_WORKS_COPY.hub_link.href} style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "underline" }}>
              {HOW_IT_WORKS_COPY.hub_link.anchor}
            </Link>
          </p>
        </div>
      </section>

      {/* -- What the bot does -- */}
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container">
          <div style={{ marginBottom: "48px" }}>
            <h2 style={h2Style}>{renderMixed(COPY.does.h2)}</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1px", background: "var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border)" }}>
            {COPY.does.items.map((item) => (
              <div key={item.title} className="why-cell">
                <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1.05rem", marginTop: 0, marginBottom: "8px" }}>{renderMixed(item.title)}</h3>
                <p style={{ ...bodyStyle, fontSize: "0.92rem" }}>{renderMixed(item.desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- Proof -- */}
      <section className="wao-section">
        <div className="wao-container">
          <h2 style={{ ...h2Style, marginBottom: "12px" }}>{renderMixed(COPY.proof.h2)}</h2>
          {/* Bridge line, waocopy 2026-11-15 (src/content/hero-product-strings-2026-11-15.json). */}
          <p style={{ ...leadStyle, marginBottom: "32px" }}>{renderMixed(STRINGS.google_ads.proof_bridge)}</p>
        </div>
      </section>
      <section className="astra-home astra-section astra-light" style={{ paddingTop: 0 }}>
        <FounderBlock nameAs="h3" />
      </section>

      {/* -- Offer -- */}
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container wao-narrow">
          <h2 style={{ ...h2Style, marginBottom: "20px" }}>{renderMixed(COPY.offer.h2)}</h2>
          <p style={{ ...leadStyle, marginBottom: "16px" }}>{renderMixed(COPY.offer.body)}</p>
          <p style={{ ...bodyStyle, marginBottom: "24px" }}>{renderMixed(COPY.offer.anchor)}</p>
          <div
            className="rounded-xl p-4 sm:p-5"
            style={{
              background: "var(--accent-dim)",
              border: "1px solid var(--accent-border)",
              borderInlineStartWidth: "4px",
              borderInlineStartColor: "var(--accent)",
              marginBottom: "16px",
            }}
          >
            <p style={{ ...bodyStyle, color: "var(--text)" }}>{renderMixed(COPY.offer.bonus)}</p>
          </div>
          <div
            className="rounded-xl p-4 sm:p-5"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", marginBottom: "16px" }}
          >
            <p style={{ ...bodyStyle, color: "var(--text)", fontWeight: 600, marginBottom: "8px" }}>{renderMixed(COPY.offer.refund)}</p>
            <p style={smallStyle}>{renderMixed(COPY.offer.refund_terms)}</p>
          </div>
          <p style={smallStyle}>{renderMixed(COPY.offer.policy_line)}</p>
        </div>
      </section>

      {/* -- FAQ -- */}
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container wao-narrow">
          <div className="eyebrow">שאלות נפוצות</div>
          <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)", marginBottom: "48px" }}>
            מה ששואלים אותנו לפני שמתחילים עם{" "}
            Google Ads
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {COPY.faq.map((faq) => (
              <details key={faq.q} className="wao-faq" style={{ ...glass, padding: "0" }}>
                <summary style={{ padding: "22px 24px", cursor: "pointer", fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1.02rem", lineHeight: 1.4, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                  <span>{renderMixed(faq.q)}</span>
                  <span aria-hidden className="wao-faq-chevron" style={{ color: "var(--accent)" }} />
                </summary>
                <div style={{ padding: "0 24px 22px", ...bodyStyle }}>{renderMixed(faq.a)}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      </div>

      {/* -- Close -- */}
      <section className="wao-section">
        <div className="wao-container">
          <div className="cta-banner" style={{ padding: "clamp(48px,8vw,80px) clamp(24px,6vw,64px)", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div aria-hidden style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "60%", height: "100%", background: "radial-gradient(ellipse at center, rgba(74,227,181,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "clamp(1.6rem,3.5vw,2.6rem)", lineHeight: 1.15, marginTop: 0, marginBottom: "16px" }}>
                {renderMixed(COPY.close.h2)}
              </h2>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", maxWidth: "560px", margin: "0 auto 32px", lineHeight: 1.75 }}>
                {renderMixed(COPY.close.body)}
              </p>
              <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                <PhoneReveal
                  source="google-ads-bottom-cta"
                  className="btn-primary"
                  style={{ fontSize: "1.05rem", padding: "16px 40px" }}
                  revealText={COPY.close.cta_primary}
                />
                <Link href={DEMO_HREF} className="btn-outline" style={{ fontSize: "1rem" }}>
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
