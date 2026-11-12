import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import SiloNav from "@/components/SiloNav";
import { HOW_IT_WORKS_COPY as COPY } from "@/lib/google-ads/howItWorksCopy";
import { GOOGLE_ADS_DEMO_HREF } from "@/lib/google-ads/links";

// HEBREW-SAFETY: zero Hebrew bytes in this file. All copy (Noa-approved r3, 2026-11-12) is generated from docs/copy
// by scripts/build-how-it-works-copy.mjs; never type it here.

const SITE = "https://www.wao.co.il";
const PATH = "/google-ads/how-it-works";
const CANONICAL = `${SITE}${PATH}`;

// Plain string title: the (app) layout's "%s‏ | WAO" template adds the RLM-anchored brand once.
export const metadata: Metadata = {
  title: COPY.title,
  description: COPY.description,
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: COPY.title,
    description: COPY.description,
    url: CANONICAL,
    type: "website",
  },
};

const abs = (path: string) => (path === "/" ? SITE : `${SITE}${path}`);

// Ruled schema only: WebPage about the hub Service + BreadcrumbList. No HowTo, FAQPage or Offer.
const schemas = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${CANONICAL}#webpage`,
    url: CANONICAL,
    name: COPY.webpage_name,
    description: COPY.description,
    about: { "@id": `${SITE}/google-ads#service` },
    isPartOf: { "@type": "WebSite", "@id": `${SITE}/#website` },
    inLanguage: "he-IL",
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: COPY.breadcrumb.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: abs(c.path) })),
  },
];

// Latin runs (e.g. a brand followed by its parenthesised English name) render as ONE LTR isolate, so the
// parentheses stay with their Latin text inside an RTL paragraph instead of splitting into separate islands.
const LATIN_RUN = /[A-Za-z][A-Za-z0-9]*(?:\s*\([A-Za-z0-9 ]+\)|\s+[A-Za-z][A-Za-z0-9]*)*/g;

function renderLatin(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(LATIN_RUN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(<Fragment key={`${keyBase}-t${i++}`}>{text.slice(last, at)}</Fragment>);
    out.push(<bdi key={`${keyBase}-b${i++}`} dir="ltr">{m[0]}</bdi>);
    last = at + m[0].length;
  }
  if (last < text.length) out.push(<Fragment key={`${keyBase}-t${i++}`}>{text.slice(last)}</Fragment>);
  return out;
}

const LINK_STYLE: React.CSSProperties = { color: "var(--accent)", fontWeight: 700, textDecoration: "underline" };

/** One paragraph: [label](/path) markdown links become <Link>, the rest gets Latin-run isolation. */
function renderInline(text: string): React.ReactNode {
  const out: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\((\/[^)]+)\)/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0;
    if (at > last) out.push(...renderLatin(text.slice(last, at), `s${i++}`));
    out.push(<Link key={`l${i++}`} href={m[2]} style={LINK_STYLE}>{m[1]}</Link>);
    last = at + m[0].length;
  }
  if (last < text.length) out.push(...renderLatin(text.slice(last), `s${i++}`));
  return <>{out}</>;
}

function paragraphs(text: string, style: React.CSSProperties): React.ReactNode {
  return text.split(/\n\n+/).map((p, i) => (
    <p key={i} style={{ ...style, marginBottom: "14px" }}>{renderInline(p)}</p>
  ));
}

export default function GoogleAdsHowItWorksPage() {
  const glass: React.CSSProperties = {
    background: "rgba(13,15,21,0.72)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
  };

  const bodyStyle: React.CSSProperties = {
    fontFamily: "var(--font-body), sans-serif",
    lineHeight: 1.8,
    color: "var(--muted)",
    fontSize: "1rem",
    margin: 0,
  };

  const leadStyle: React.CSSProperties = { ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.12rem)", color: "var(--text)" };

  const crumbs = COPY.breadcrumb;

  return (
    <>
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s).replace(/</g, "\\u003c") }} />
      ))}

      {/* -- Hero -- */}
      <section style={{ paddingTop: "clamp(110px,14vw,160px)", paddingBottom: "clamp(48px,6vw,72px)", position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(74,227,181,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="hero-grid" />
        <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "860px" }}>
          <nav aria-label="breadcrumb" className="breadcrumb">
            {crumbs.map((c, i) =>
              i < crumbs.length - 1 ? (
                <Fragment key={c.path}>
                  <Link href={c.path}>{c.name}</Link>
                  <span className="breadcrumb-sep" aria-hidden>›</span>
                </Fragment>
              ) : (
                <span key={c.path} aria-current="page">{c.name}</span>
              )
            )}
          </nav>
          <SiloNav currentPath={PATH} />
          <h1
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 900,
              fontSize: "clamp(2.2rem,5vw,3.8rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              marginTop: "20px",
              marginBottom: "24px",
            }}
          >
            {COPY.h1}
          </h1>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.2rem)", color: "var(--text)", maxWidth: "680px" }}>
            {renderInline(COPY.answer_block)}
          </p>
        </div>
      </section>

      {/* -- Intro -- */}
      <section style={{ background: "var(--surface)", paddingBlock: "clamp(48px,6vw,72px)" }}>
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          {paragraphs(COPY.intro, leadStyle)}
        </div>
      </section>

      {/* -- Eight steps (one card per step the copy source holds) -- */}
      <section className="wao-section">
        <div className="wao-container" style={{ maxWidth: "960px" }}>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "20px" }}>
            {COPY.steps.map((step, i) => (
              <li
                key={step.h2}
                className="process-step"
                style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "clamp(16px,4vw,40px)", alignItems: "start", ...glass, padding: "clamp(24px,3vw,36px)" }}
              >
                <div style={{ paddingTop: "4px" }}>
                  <span className="process-number" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "clamp(1.15rem,2vw,1.4rem)", lineHeight: 1.3, marginTop: 0, marginBottom: "14px", color: "var(--text)" }}>
                    {renderInline(step.h2)}
                  </h2>
                  <p style={{ ...bodyStyle, color: "var(--text)", fontStyle: "italic", marginBottom: "16px" }}>{renderInline(step.analogy)}</p>
                  {paragraphs(step.body, bodyStyle)}
                  <div
                    className="rounded-xl p-4 sm:p-5"
                    style={{
                      background: "var(--accent-dim)",
                      border: "1px solid var(--accent-border)",
                      borderInlineStartWidth: "4px",
                      borderInlineStartColor: "var(--accent)",
                      marginTop: "6px",
                    }}
                  >
                    <p style={{ ...bodyStyle, color: "var(--text)" }}>{renderInline(step.you_see)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* -- Close -- */}
      <section className="wao-section" style={{ paddingTop: 0 }}>
        <div className="wao-container">
          <div className="cta-banner" style={{ padding: "clamp(48px,8vw,80px) clamp(24px,6vw,64px)", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div aria-hidden style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "60%", height: "100%", background: "radial-gradient(ellipse at center, rgba(74,227,181,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem,3.5vw,2.6rem)", lineHeight: 1.15, marginTop: 0, marginBottom: "16px" }}>
                {renderInline(COPY.closing.h2)}
              </h2>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", maxWidth: "620px", margin: "0 auto 32px", lineHeight: 1.75 }}>
                {renderInline(COPY.closing.body)}
              </p>
              <Link href={GOOGLE_ADS_DEMO_HREF} className="btn-primary" style={{ fontSize: "1.05rem", padding: "16px 40px" }}>
                {COPY.closing.cta}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
