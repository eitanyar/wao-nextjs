import { Fragment } from "react";
import { renderMixed } from "@/lib/bidi";

// Text rendering for the Site-Bot terms page (src/app/(app)/site-bot/terms/page.tsx).
// HEBREW-SAFETY: zero Hebrew bytes; it only wraps text that comes from SITE_BOT_TERMS, never changes it.

const LINK: React.CSSProperties = { color: "var(--accent)", textDecoration: "underline" };

/** Email addresses in the terms text. Local to this renderer on purpose: the global renderMixed is not changed. */
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

/**
 * Terms text -> nodes. Each email becomes one mailto link whose whole address (the "@" included) sits inside a single
 * <bdi dir="ltr">, so renderMixed never splits it at the "@"; every other run goes through renderMixed unchanged.
 */
export function renderTermsText(text: string): React.ReactNode {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(EMAIL_RE)) {
    const at = match.index ?? 0;
    if (at > last) out.push(<Fragment key={out.length}>{renderMixed(text.slice(last, at))}</Fragment>);
    out.push(
      <a key={out.length} href={`mailto:${match[0]}`} style={LINK}>
        <bdi dir="ltr">{match[0]}</bdi>
      </a>,
    );
    last = at + match[0].length;
  }
  if (!out.length) return renderMixed(text);
  if (last < text.length) out.push(<Fragment key={out.length}>{renderMixed(text.slice(last))}</Fragment>);
  return <>{out}</>;
}

/**
 * "N. rest" -> the number in an LTR inline-block (so "5." keeps its dot on the right side of the digit in RTL), a space,
 * then the rest through renderMixed. Any other heading falls back to renderMixed whole. The text itself is untouched.
 */
export function renderHeading(heading: string): React.ReactNode {
  const match = heading.match(/^(\d+)\.\s+(.*)$/);
  if (!match) return renderMixed(heading);
  return (
    <>
      <span dir="ltr" style={{ display: "inline-block" }}>{`${match[1]}.`}</span>{" "}{renderMixed(match[2])}
    </>
  );
}
