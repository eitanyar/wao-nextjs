import Link from "next/link";
import { renderMixed } from "@/lib/bidi";
import copy from "@/content/astra-homepage-copy.json";
import PhoneReveal from "./PhoneReveal";

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.56 2.81.69A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

const footerLinks = [
  {
    title: "שירותים",
    links: [
      { label: "קידום אתרים (SEO)", href: "/seo" },
      { label: "פרסום בגוגל", href: "/google-ads" },
      { label: "שיווק תוכן", href: "/content" },
      { label: "יועץ שיווקי", href: "/consulting" },
      { label: "בוט גוגל לעסק שלי", href: "/google-business" },
      { label: copy.paths.path_local.details_link.label, href: copy.paths.path_local.details_link.href },
      { label: copy.navigation.primary_cta.label, href: copy.navigation.primary_cta.href },
    ],
  },
  {
    title: "חברה",
    links: [
      { label: "אודות WAO", href: "/about" },
      { label: "הבלוג שלנו", href: "/blog" },
      { label: "צור קשר", href: "/contact" },
    ],
  },
  {
    title: "שירותים נוספים",
    links: [
      { label: 'מערכת "מה עובד" (CRM)', href: "/maoved" },
      { label: "בניית אתרים ו-LP", href: "/build" },
      { label: "מדיה חברתית", href: "/social" },
      { label: "הכשרות שיווק", href: "/training" },
    ],
  },
  {
    title: "מדריכים וכלים",
    links: [
      { label: "מדריך קידום אתרים", href: "/seo/guide" },
      { label: "מדריך שיווק שותפים", href: "/training/affiliate-marketing" },
      { label: "מילון מונחים", href: "/glossary" },
      { label: "כל הקורסים", href: "/training" },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
      <div className="wao-container">
        {/* Main footer grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr repeat(4, 1fr)",
            gap: "48px",
            paddingBlock: "64px",
          }}
          className="footer-grid"
        >
          {/* Brand col */}
          <div>
            <Link href="/" style={{ display: "inline-block", marginBottom: "20px" }}>
              <span
                style={{
                  fontFamily: "var(--font-rubik), sans-serif",
                  fontWeight: 900,
                  fontSize: "2rem",
                  letterSpacing: "-0.03em",
                  background: "linear-gradient(135deg, #4AE3B5, #00C3FF)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                WAO
              </span>
            </Link>
            <p
              style={{
                fontSize: "0.9rem",
                color: "var(--muted)",
                lineHeight: 1.75,
                marginBottom: "24px",
                maxWidth: "280px",
                fontFamily: "var(--font-body), sans-serif",
              }}
            >
              {copy.low_price.lines[0]} {copy.low_price.lines[1]} {copy.people.intro}
            </p>

            {/* Contact */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <PhoneReveal
                source="footer"
                className="footer-link"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
                icon={<PhoneIcon />}
              />
              <span
                style={{
                  fontSize: "0.9rem",
                  color: "var(--muted)",
                  fontFamily: "var(--font-body), sans-serif",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <LocationIcon />
                ראשון לציון, ישראל
              </span>
            </div>
          </div>

          {/* Link columns */}
          {footerLinks.map((col) => (
            <div key={col.title}>
              <h3
                style={{
                  fontFamily: "var(--font-rubik), sans-serif",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  color: "var(--text)",
                  marginBottom: "20px",
                  letterSpacing: "0.02em",
                }}
              >
                {col.title}
              </h3>
              <nav aria-label={col.title}>
                {col.links.map((link) => (
                  <Link key={link.href} href={link.href} className="footer-link">
                    {renderMixed(link.label)}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <hr className="footer-divider" />

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBlock: "24px",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <p
            style={{
              fontSize: "0.82rem",
              color: "var(--muted)",
              fontFamily: "var(--font-body), sans-serif",
            }}
          >
            © {year} WAO. כל הזכויות שמורות.
          </p>
          <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            <Link href="/privacy" className="footer-link" style={{ fontSize: "0.82rem" }}>
              מדיניות פרטיות
            </Link>
            <Link href="/accessibility" className="footer-link" style={{ fontSize: "0.82rem" }}>
              נגישות
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
