"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const nav = [
  { label: "קידום אתרים", href: "/seo" },
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
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "70px",
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

            <Link href="/contact" className="btn-primary" style={{ fontSize: "0.9rem", padding: "10px 22px" }}>
              ייעוץ חינם
            </Link>

            {/* Hamburger */}
            <button
              onClick={() => setOpen(!open)}
              aria-label={open ? "סגור תפריט" : "פתח תפריט"}
              aria-expanded={open}
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
          </div>
        </div>

        {/* Mobile menu */}
        <div
          style={{
            overflow: "hidden",
            maxHeight: open ? "360px" : "0",
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
              <Link href="/contact" className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                ייעוץ חינם
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
