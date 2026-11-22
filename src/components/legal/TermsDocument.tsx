import { Fragment } from "react";
import { renderMixed } from "@/lib/bidi";
import type { LegalBlock, LegalDoc, LegalInline } from "@/lib/legal/legalDoc";
import styles from "./terms.module.css";
import { renderHeading, renderTermsText } from "./termsText";

// Renders a generated legal document (LegalDoc) as a terms page: numbered sections, bold runs, lists and scrollable
// tables. Shared by /site-bot/terms and /google-ads/terms (extracted from the Site-Bot page 2026-11-23, markup
// unchanged). HEBREW-SAFETY: zero Hebrew bytes; every rendered string comes from the LegalDoc it is given.

const SECTION: React.CSSProperties = { marginBottom: "44px", scrollMarginTop: "100px" };
const H2: React.CSSProperties = {
  fontFamily: "var(--font-rubik), sans-serif",
  fontWeight: 800,
  fontSize: "1.2rem",
  marginBottom: "12px",
  color: "var(--text)",
};
const P: React.CSSProperties = {
  color: "var(--muted)",
  fontFamily: "var(--font-body), sans-serif",
  lineHeight: 1.85,
  fontSize: "0.97rem",
  marginBottom: "10px",
};
const LI: React.CSSProperties = { ...P, marginBottom: "6px" };
const CELL: React.CSSProperties = {
  ...P,
  margin: 0,
  padding: "10px 12px",
  borderBottom: "1px solid var(--border)",
  textAlign: "start",
  verticalAlign: "top",
  fontSize: "0.9rem",
  lineHeight: 1.6,
};

function Inlines({ inlines }: { inlines: LegalInline[] }) {
  return (
    <>
      {inlines.map((run, i) =>
        run.bold ? (
          <strong key={i} style={{ color: "var(--text)" }}>{renderTermsText(run.text)}</strong>
        ) : (
          <Fragment key={i}>{renderTermsText(run.text)}</Fragment>
        ),
      )}
    </>
  );
}

/** `label`: the section heading (existing source text) naming the table's scroll region; omitted when there is none. */
function Block({ block, label }: { block: LegalBlock; label?: string }) {
  if (block.type === "p") {
    return <p style={P}><Inlines inlines={block.inlines} /></p>;
  }
  if (block.type === "ul") {
    return (
      <ul style={{ paddingInlineStart: "20px", margin: "0 0 16px" }}>
        {block.items.map((item, i) => <li key={i} style={LI}><Inlines inlines={item} /></li>)}
      </ul>
    );
  }
  // Keyboard-scrollable region (tabIndex) with an edge fade on the side that still hides columns (terms.module.css).
  const region = label ? { role: "region", "aria-label": label } : {};
  return (
    <div className={styles.tableFrame} data-terms-table="">
      <div className={styles.tableScroll} tabIndex={0} {...region}>
        <table className={styles.table} style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {block.header.map((cell, i) => (
                <th key={i} scope="col" style={{ ...CELL, color: "var(--text)", fontWeight: 700 }}><Inlines inlines={cell} /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => <td key={c} style={CELL}><Inlines inlines={cell} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <span aria-hidden="true" className={`${styles.fade} ${styles.fadeStart}`} />
      <span aria-hidden="true" className={`${styles.fade} ${styles.fadeEnd}`} />
    </div>
  );
}

export function TermsDocument({ doc, docId }: { doc: LegalDoc; docId: string }) {
  return (
    <section style={{ paddingTop: "clamp(100px,14vw,140px)", paddingBottom: "clamp(64px,8vw,96px)" }}>
      <div className="wao-container" style={{ maxWidth: "760px" }} data-legal-doc={docId}>
        <h1 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.9rem,4vw,2.8rem)", letterSpacing: "-0.02em", marginBottom: "12px" }}>
          {renderMixed(doc.title)}
        </h1>
        <div style={{ marginBottom: "48px" }}>
          {doc.intro.map((block, i) =>
            block.type === "p" ? (
              <p key={i} style={{ ...P, fontSize: "0.85rem" }}><Inlines inlines={block.inlines} /></p>
            ) : (
              <Block key={i} block={block} />
            ),
          )}
        </div>

        {doc.sections.map((section) => (
          <div key={section.id} id={section.id} style={SECTION}>
            <h2 style={H2}>{renderHeading(section.heading)}</h2>
            {section.blocks.map((block, i) => <Block key={i} block={block} label={section.heading} />)}
          </div>
        ))}
      </div>
    </section>
  );
}
