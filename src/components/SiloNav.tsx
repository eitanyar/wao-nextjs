import Link from "next/link";

interface SiloItem {
  label: string;
  href: string;
  icon: string;
  badge?: string;
}

interface Silo {
  label: string;
  hub: SiloItem;
  spokes: SiloItem[];
}

export const SILOS: Record<string, Silo> = {
  "/seo": {
    label: "סדרת קידום אתרים",
    hub: { label: "קידום אתרים", href: "/seo", icon: "🔍" },
    spokes: [
      { label: "מדריך SEO 2026",       href: "/seo/guide",              icon: "📖", badge: "מדריך" },
      { label: "מחקר מילות מפתח",      href: "/seo/keyword-research",   icon: "🔍", badge: "מדריך" },
      { label: "Topical Authority",    href: "/seo/topical-authority",  icon: "🏛️", badge: "מדריך" },
      { label: "SEO בינלאומי",         href: "/seo/international",      icon: "🌍", badge: "שירות" },
      { label: "יועץ SEO",             href: "/seo/consulting",         icon: "🎯", badge: "ייעוץ"  },
    ],
  },
  "/geo": {
    label: "סדרת GEO",
    hub: { label: "GEO", href: "/geo", icon: "🤖" },
    spokes: [
      { label: "בדיקת נראות ב-AI", href: "/geo/audit", icon: "🔎", badge: "בדיקה חינם" },
      { label: "סריקה מיידית", href: "/geo/scan", icon: "⚡", badge: "מיידי" },
    ],
  },
};

function getSilo(currentPath: string): { silo: Silo; isHub: boolean } | null {
  if (SILOS[currentPath]) return { silo: SILOS[currentPath], isHub: true };
  for (const silo of Object.values(SILOS)) {
    if (silo.spokes.some((s) => s.href === currentPath)) return { silo, isHub: false };
  }
  return null;
}

export default function SiloNav({ currentPath }: { currentPath: string }) {
  const found = getSilo(currentPath);
  if (!found) return null;
  const { silo, isHub } = found;

  const pill = (item: SiloItem, isCurrent: boolean) => (
    <Link
      key={item.href}
      href={item.href}
      aria-current={isCurrent ? "page" : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "5px 13px",
        borderRadius: "var(--radius-pill)",
        fontSize: "0.8rem",
        fontFamily: "var(--font-body), sans-serif",
        fontWeight: isCurrent ? 700 : 500,
        textDecoration: "none",
        transition: "all 0.18s ease",
        background: isCurrent ? "var(--accent)" : "var(--elevated)",
        color: isCurrent ? "var(--bg)" : "var(--muted)",
        border: isCurrent ? "1px solid transparent" : "1px solid var(--border)",
        pointerEvents: isCurrent ? "none" : "auto",
      }}
    >
      <span aria-hidden>{item.icon}</span>
      {item.label}
      {item.badge && !isCurrent && (
        <span
          style={{
            fontSize: "0.68rem",
            padding: "1px 6px",
            borderRadius: "var(--radius-pill)",
            background: "var(--accent-dim)",
            color: "var(--accent)",
            border: "1px solid var(--accent-border)",
            fontWeight: 600,
          }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );

  const hubIsCurrent = isHub;
  const hubPill = pill(silo.hub, hubIsCurrent);

  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .silo-nav {
            flex-wrap: nowrap !important;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            padding-bottom: 6px;
            padding-inline-end: 24px;
            width: 100%;
          }
          .silo-nav::-webkit-scrollbar { display: none; }
          .silo-nav-wrap {
            position: relative;
          }
          .silo-nav-wrap::before {
            content: '';
            position: absolute;
            top: 0; bottom: 0;
            /* RTL page: inline-end is the physical left edge, where the
               scrollable list overflows (padding-inline-end above) — this
               is intentionally the same physical side, not a blind mirror. */
            inset-inline-end: 0;
            width: 40px;
            background: linear-gradient(to right, var(--bg, #060709) 30%, transparent 100%);
            pointer-events: none;
            z-index: 1;
          }
        }
      `}</style>
      <div className="silo-nav-wrap">
        <nav
          className="silo-nav"
          aria-label={silo.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            padding: "10px 0",
            marginBottom: "8px",
          }}
        >
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--muted)",
              fontFamily: "var(--font-body), sans-serif",
              flexShrink: 0,
            }}
          >
            בסדרה:
          </span>
          {hubPill}
          {silo.spokes.length > 0 && (
            <span aria-hidden style={{ color: "var(--border)", fontSize: "1rem", lineHeight: 1 }}>›</span>
          )}
          {silo.spokes.map((spoke) => pill(spoke, spoke.href === currentPath))}
        </nav>
      </div>
    </>
  );
}
