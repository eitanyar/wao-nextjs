import Image from "next/image";
import Link from "next/link";
import copy from "@/content/astra-homepage-copy.json";
import finalCopy from "@/content/astra-authority-first-homepage-copy.json";
import AstraProofVideo from "./AstraProofVideo";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="astra-icon">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="astra-icon astra-icon-large">
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function SiteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="astra-icon astra-icon-large">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M7 6.5h.01M10 6.5h.01" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="astra-icon">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="astra-section-title">{children}</h2>;
}

function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="astra-text-link">
      {children}
      <ArrowIcon />
    </Link>
  );
}

export default function AstraHome() {
  return (
    <div className="astra-home">
      <section id="hero" className="astra-section astra-hero">
        <div className="astra-container astra-hero-grid">
          <div className="astra-hero-copy">
            <p className="astra-eyebrow">{copy.hero.eyebrow}</p>
            <h1>
              <span>{copy.hero.h1_line1}</span>
              <span>{copy.hero.h1_line2}</span>
            </h1>
            <p className="astra-lead">{finalCopy.hero.body}</p>
            <div className="astra-actions">
              <Link href={finalCopy.hero.primary_cta.href} className="astra-button astra-button-primary">
                {finalCopy.hero.primary_cta.label}
                <ArrowIcon />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="proof" className="astra-section astra-light">
        <div className="astra-container astra-proof-grid">
          <div className="astra-section-copy">
            <SectionHeading>{finalCopy.video_proof.heading}</SectionHeading>
            <p className="astra-proof-intro">{finalCopy.video_proof.context_line}</p>
          </div>
          <AstraProofVideo copy={finalCopy.video_proof} />
        </div>
      </section>

      <section id="paths" className="astra-section astra-light astra-paths-section">
        <div className="astra-container">
          <div className="astra-section-intro">
            <SectionHeading>{finalCopy.paths.heading}</SectionHeading>
            <p>{finalCopy.paths.intro}</p>
          </div>
          <div className="astra-paths-grid">
            <article className="astra-path-card astra-path-card-featured">
              <div className="astra-path-icon"><SearchIcon /></div>
              <h3>{finalCopy.paths.google_ads.heading}</h3>
              <p>{finalCopy.paths.google_ads.description}</p>
              <p className="astra-card-note">{finalCopy.paths.google_ads.demo_status}</p>
              <Link href={finalCopy.paths.google_ads.primary_cta.href} className="astra-button astra-button-primary">
                {finalCopy.paths.google_ads.primary_cta.label}
                <ArrowIcon />
              </Link>
              <TextLink href={finalCopy.paths.google_ads.supporting_link.href}>{finalCopy.paths.google_ads.supporting_link.label}</TextLink>
            </article>

            <article className="astra-path-card">
              <div className="astra-path-icon"><SiteIcon /></div>
              <h3>{finalCopy.paths.business_website.heading}</h3>
              <p>{finalCopy.paths.business_website.description}</p>
              <Link href={finalCopy.paths.business_website.primary_cta.href} className="astra-button astra-button-secondary astra-button-on-light">
                {finalCopy.paths.business_website.primary_cta.label}
              </Link>
              <TextLink href={finalCopy.paths.business_website.supporting_link.href}>{finalCopy.paths.business_website.supporting_link.label}</TextLink>
            </article>
          </div>
          <div className="astra-choice-help">
            <p>{finalCopy.paths.choosing_help.line}</p>
            <TextLink href={finalCopy.paths.choosing_help.link.href}>{finalCopy.paths.choosing_help.link.label}</TextLink>
          </div>
        </div>
      </section>

      <section id="low_price" className="astra-section astra-dark-card-section">
        <div className="astra-container astra-explainer-grid">
          <SectionHeading>{copy.low_price.heading}</SectionHeading>
          <div>
            <ul className="astra-check-list astra-check-list-dark">
              {copy.low_price.lines.map((line) => (
                <li key={line}>
                  <CheckIcon />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="astra-callout">{copy.low_price.human_seam_line}</p>
          </div>
        </div>
      </section>

      <section id="lead_handling" className="astra-section astra-light">
        <div className="astra-container astra-split">
          <div>
            <SectionHeading>{copy.lead_handling.heading}</SectionHeading>
            <div className="astra-line-stack">
              {copy.lead_handling.lines.map((line) => <p key={line}>{line}</p>)}
            </div>
            <p className="astra-boundary-note">{copy.lead_handling.not_included_line}</p>
            <Link href={copy.lead_handling.cta.href} className="astra-button astra-button-primary">
              {copy.lead_handling.cta.label}
              <ArrowIcon />
            </Link>
          </div>
          <div className="astra-signal-card" aria-hidden="true">
            <span className="astra-signal-ring" />
            <span className="astra-signal-ring astra-signal-ring-two" />
            <span className="astra-signal-line" />
            <span className="astra-signal-line astra-signal-line-short" />
            <span className="astra-signal-line" />
          </div>
        </div>
      </section>

      <section id="ai_search" className="astra-section astra-soft">
        <div className="astra-container astra-centered">
          <SectionHeading>{copy.ai_search.heading}</SectionHeading>
          <div className="astra-line-stack">
            {copy.ai_search.lines.map((line) => <p key={line}>{line}</p>)}
          </div>
        </div>
      </section>

      <section id="people" className="astra-section astra-light">
        <div className="astra-container astra-people-grid">
          <div className="astra-person-photo">
            <Image
              src={finalCopy.metadata.exact_destinations.founder_photo}
              alt={finalCopy.founder_authority.photo_alt}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 420px"
            />
          </div>
          <div>
            <h2 className="astra-section-title">{finalCopy.founder_authority.name}</h2>
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
      </section>

      <section id="faq" className="astra-section astra-light astra-faq-section">
        <div className="astra-container astra-faq-grid">
          <SectionHeading>{copy.faq.heading}</SectionHeading>
          <div className="astra-faq-list">
            {copy.faq.items.map((item) => (
              <details key={item.q} className="astra-faq-item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="final_cta" className="astra-section astra-final">
        <div className="astra-container astra-centered">
          <SectionHeading>{finalCopy.final_cta.heading}</SectionHeading>
          <p>{finalCopy.final_cta.body}</p>
          <div className="astra-actions astra-actions-centered">
            <Link href={finalCopy.final_cta.primary_cta.href} className="astra-button astra-button-primary">
              {finalCopy.final_cta.primary_cta.label}
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
