// Proof strip directly under the homepage hero (design review #2, Yonatan rule 3): founding year, clients served and
// the Google Partner badge linked to the public Partner directory. A sibling <section> of the hero, plain ul/li text
// (no headings), no ROI figure. Text is read from the existing sources (src/lib/waoStats.ts, the approved homepage
// copy JSON). HEBREW-SAFETY: this file contains ZERO Hebrew bytes.
import Image from "next/image";
import finalCopy from "@/content/astra-authority-first-homepage-copy.json";
import { WAO_STATS } from "@/lib/waoStats";

const SHOWN = ["2006", "84"] as const;

export default function ProofStrip() {
  const stats = SHOWN.map((n) => {
    const stat = WAO_STATS.find((s) => s.n === n);
    if (!stat) throw new Error(`proof strip: no WAO_STATS entry for ${n}`);
    return stat;
  });
  const partner = finalCopy.partner_proof;
  return (
    <section className="astra-proof-strip">
      <ul className="astra-container" role="list">
        {stats.map((s) => (
          <li key={s.n}>
            <span className="astra-proof-n">{s.n}</span>
            <span className="astra-proof-l">{s.l}</span>
          </li>
        ))}
        <li className="astra-proof-partner">
          <a href={partner.directory_link.href} className="astra-proof-badge">
            <Image src={partner.badge_src} alt={partner.badge_alt} width={52} height={50} unoptimized />
          </a>
          <span>
            <span className="astra-proof-gp">{partner.heading}</span>
            <a href={partner.directory_link.href} className="astra-proof-link">{partner.directory_link.label}</a>
          </span>
        </li>
      </ul>
    </section>
  );
}
