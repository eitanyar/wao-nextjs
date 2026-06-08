import Link from "next/link";

const footerLinks = [
  {
    title: "שירותים",
    links: [
      { label: "קידום אתרים (SEO)", href: "/seo" },
      { label: "פרסום בגוגל", href: "/google-ads" },
      { label: "שיווק תוכן", href: "/content" },
      { label: "יועץ שיווקי", href: "/consulting" },
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
              סוכנות שיווק דיגיטלי מובילה בישראל מאז 2006. עוזרים לעסקים לצמוח
              עם SEO, Google Ads ואסטרטגיית תוכן מותאמת.
            </p>

            {/* Contact */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <a
                href="tel:0526148860"
                className="footer-link"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span aria-hidden>📞</span>
                <span dir="ltr">052-614-8860</span>
              </a>
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
                <span aria-hidden>📍</span>
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
                    {link.label}
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
