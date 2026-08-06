"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const nav = [
  { label: "קידום אתרים", href: "/seo" },
  { label: "GEO", href: "/geo" },
  { label: "פרסום בגוגל", href: "/google-ads" },
  { label: "הכשרות", href: "/training" },
  { label: "יועץ שיווקי", href: "/consulting" },
  { label: "בלוג", href: "/blog" },
  { label: "אודות", href: "/about" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      style={{
        position: "fixed",
        inset: "0 0 auto 0",
        zIndex: 200,
        transition: "background 0.35s ease, border-color 0.35s ease, backdrop-filter 0.35s ease",
        backgroundColor: (scrolled || open) ? "rgba(6,7,9,0.97)" : "transparent",
        backdropFilter: (scrolled || open) ? "blur(16px)" : "none",
        WebkitBackdropFilter: (scrolled || open) ? "blur(16px)" : "none",
        borderBottom: `1px solid ${(scrolled || open) ? "var(--border)" : "transparent"}`,
      }}
    >
      <div className="wao-container">
        <div
          className="wao-header-inner"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <Link href="/" aria-label="WAO - דף הבית">
            <span
              style={{
                fontFamily: "var(--font-rubik), sans-serif",
                fontWeight: 900,
                fontSize: "1.85rem",
                letterSpacing: "-0.03em",
                background: "linear-gradient(135deg, #4AE3B5 0%, #00C3FF 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              WAO
            </span>
          </Link>

          {/* Desktop nav */}
          <nav
            aria-label="ניווט ראשי"
            style={{ alignItems: "center", gap: "4px" }}
            className="hidden md:flex"
          >
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="nav-link">
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <a
              href="tel:0526148860"
              style={{
                fontSize: "0.88rem",
                color: "var(--muted)",
                fontFamily: "var(--font-body), sans-serif",
                direction: "ltr",
              }}
              className="hidden lg:block"
            >
              052-614-8860
            </a>

            <Link
              href="/site-bot"
              className="btn-primary wao-cta-desktop-only"
              style={{ fontSize: "0.9rem", padding: "10px 22px" }}
            >
              התחל ב-₪9.90
            </Link>

            {/* Hamburger */}
            <button
              onClick={() => setOpen(!open)}
              aria-label={open ? "סגור תפריט" : "פתח תפריט"}
              aria-expanded={open}
              aria-controls="mobile-nav-menu"
              style={{ cursor: "pointer", padding: "6px", background: "none", border: "none" }}
              className="md:hidden"
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    display: "block",
                    width: "22px",
                    height: "2px",
                    background: "var(--text)",
                    borderRadius: "2px",
                    transition: "all 0.3s ease",
                    transformOrigin: "center",
                    transform:
                      open
                        ? i === 0
                          ? "rotate(45deg) translate(5px, 5px)"
                          : i === 2
                          ? "rotate(-45deg) translate(5px, -5px)"
                          : "scaleX(0)"
                        : "none",
                    opacity: open && i === 1 ? 0 : 1,
                  }}
                />
              ))}
              </div>
            </button>

            {/* Mobile-only quick actions */}
            <div className="md:hidden" style={{ display: "flex", flexDirection: "row", gap: "8px" }}>
              <a
                href="/contact#contact-form"
                aria-label="צור קשר בטופס"
                className="wao-mobile-action-btn"
              >
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
                  <path d="M3 6.5l9 6.5 9-6.5" />
                </svg>
              </a>
              <a
                href="https://wa.me/972526148860"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="שלח הודעת וואטסאפ (נפתח בחלון חדש)"
                className="wao-mobile-action-btn"
              >
                <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.79.47 3.47 1.29 4.94L2 22l5.29-1.39a9.87 9.87 0 0 0 4.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2Zm0 18.05h-.01a8.15 8.15 0 0 1-4.15-1.14l-.3-.18-3.14.82.84-3.06-.19-.32a8.13 8.13 0 0 1-1.25-4.35c0-4.5 3.66-8.16 8.17-8.16 2.18 0 4.23.85 5.77 2.4a8.11 8.11 0 0 1 2.39 5.77c0 4.5-3.67 8.22-8.13 8.22Zm4.47-6.13c-.24-.12-1.44-.71-1.67-.79-.22-.08-.39-.12-.55.12-.16.24-.63.79-.78.95-.14.16-.28.18-.53.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.42-.55-.42-.14 0-.3-.02-.46-.02-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          id="mobile-nav-menu"
          style={{
            overflow: "hidden",
            // Generous cap for transition purposes only, not a real item-count limit.
            // height: auto can't animate with CSS transitions, so we cap high enough
            // to comfortably fit ~15 nav items + CTA before it'd look visually awkward.
            // Not tied to the current 6-item + CTA count — safe for future nav additions.
            maxHeight: open ? "1000px" : "0",
            transition: "max-height 0.35s ease",
          }}
          className="md:hidden"
        >
          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: "12px",
              paddingBottom: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                style={{
                  display: "block",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--muted)",
                  fontFamily: "var(--font-body), sans-serif",
                  fontSize: "1rem",
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--text)";
                  (e.currentTarget as HTMLElement).style.background = "var(--surface)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--muted)";
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                {item.label}
              </Link>
            ))}
            <div style={{ paddingTop: "8px", paddingInline: "16px" }}>
              <Link href="/site-bot" className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                התחל ב-₪9.90
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
