// The founder block (real photo, name, role, accountability line, /about link, Google Partner proof). Moved out of
// AstraHome so the money pages (/site-bot, /google-ads) show the same real face (design review #6, Yonatan rule 3:
// on money pages the name is an h3, never an h1/h2 competing with the page anchor). All text comes from the approved
// homepage copy JSON. HEBREW-SAFETY: this file contains ZERO Hebrew bytes.
import Image from "next/image";
import Link from "next/link";
import finalCopy from "@/content/astra-authority-first-homepage-copy.json";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="astra-icon astra-arrow">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function FounderBlock({ nameAs = "h2", photoLoading = "lazy" }: { nameAs?: "h2" | "h3"; photoLoading?: "lazy" | "eager" }) {
  const Name = nameAs;
  return (
    <div className="astra-container astra-people-grid">
      <div className="astra-person-photo">
        <Image
          src={finalCopy.metadata.exact_destinations.founder_photo}
          alt={finalCopy.founder_authority.photo_alt}
          fill
          unoptimized
          loading={photoLoading}
          sizes="(max-width: 768px) 100vw, 420px"
        />
      </div>
      <div>
        <Name className="astra-section-title">{finalCopy.founder_authority.name}</Name>
        <p className="astra-person-role">{finalCopy.founder_authority.role}</p>
        <p>{finalCopy.founder_authority.accountability_line}</p>
        <Link href={finalCopy.founder_authority.about_link.href} className="astra-button astra-button-secondary astra-button-on-light">
          {finalCopy.founder_authority.about_link.label}
          <ArrowIcon />
        </Link>
        <div className="astra-partner-proof">
          <h3>{finalCopy.partner_proof.heading}</h3>
          <a href={finalCopy.partner_proof.directory_link.href} target="_blank" rel="noopener noreferrer" className="astra-partner-badge-link">
            <Image src={finalCopy.partner_proof.badge_src} alt={finalCopy.partner_proof.badge_alt} width={152} height={146} unoptimized />
          </a>
          <p>{finalCopy.partner_proof.status_line}</p>
          <a href={finalCopy.partner_proof.directory_link.href} target="_blank" rel="noopener noreferrer" className="astra-text-link">{finalCopy.partner_proof.directory_link.label}</a>
        </div>
      </div>
    </div>
  );
}
