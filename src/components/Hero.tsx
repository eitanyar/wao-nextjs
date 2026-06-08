import Link from "next/link";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = { data?: any };

const DEFAULTS = {
  badge: "17 שנות ניסיון בשיווק דיגיטלי",
  headlinePre: "שיווק דיגיטלי",
  headlineAccent: "שמביא תוצאות",
  headlinePost: "משמעותיות יותר",
  subheadline: "אנחנו לא סוכנות שיווק רגילה. בוואו בונים אסטרטגיות מדויקות שמניעות צמיחה אמיתית — עם שיטות מוכחות ו-AI מתקדם, ללא התחייבות לחוזים ארוכי טווח.",
  ctaPrimary: "קבל ייעוץ חינם",
  ctaSecondary: "הכר את השירותים",
  ctaSecondaryHref: "/seo",
  phone: "0526148860",
  stats: [
    { number: "20+", label: "שנות ניסיון" },
    { number: "500+", label: "לקוחות מרוצים" },
    { number: "4X", label: "ROI ממוצע ללקוח" },
    { number: "ללא", label: "חוזה ארוך טווח" },
  ],
};

export default function Hero({ data }: Props) {
  const d = { ...DEFAULTS, ...data };
  const stats = (data?.stats?.length ? data.stats : DEFAULTS.stats) as { number?: string | null; label?: string | null }[];

  return (
    <section
      aria-label="כותרת ראשית"
      style={{ minHeight: "100vh", display: "flex", alignItems: "center", position: "relative", overflow: "hidden", paddingTop: "120px", paddingBottom: "80px" }}
    >
      <div aria-hidden style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: "80vw", height: "60vh", background: "radial-gradient(ellipse at center, rgba(74,227,181,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div aria-hidden className="hero-grid" />
      <div aria-hidden style={{ position: "absolute", top: "15%", right: "0", width: "1px", height: "40%", background: "linear-gradient(to bottom, transparent, rgba(74,227,181,0.4), transparent)" }} />

      <div className="wao-container" style={{ position: "relative", zIndex: 1, width: "100%" }}>
        <div style={{ maxWidth: "820px" }}>
          <div className="badge" style={{ marginBottom: "36px" }}>
            <span className="badge-dot" />{d.badge}
          </div>

          <h1 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(2.6rem, 6vw, 5.5rem)", lineHeight: 1.08, letterSpacing: "-0.025em", marginBottom: "28px" }}>
            {d.headlinePre}{" "}<span className="text-gradient">{d.headlineAccent}</span>
            <br />{d.headlinePost}
          </h1>

          <p style={{ fontSize: "clamp(1rem, 2vw, 1.25rem)", color: "var(--muted)", lineHeight: 1.75, marginBottom: "48px", maxWidth: "540px", fontFamily: "var(--font-body), sans-serif" }}>
            {d.subheadline}
          </p>

          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
            <a href={`tel:${d.phone}`} className="btn-primary" style={{ fontSize: "1.05rem", padding: "16px 36px" }}>
              {d.ctaPrimary}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <Link href={d.ctaSecondaryHref ?? "/seo"} className="btn-outline" style={{ fontSize: "1.05rem", padding: "16px 36px" }}>
              {d.ctaSecondary}
            </Link>
          </div>

          <div style={{ marginTop: "80px", paddingTop: "44px", borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "32px" }}>
            {stats.map((s, i) => (
              <div key={i}>
                <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "2.4rem", lineHeight: 1, color: "var(--text)", marginBottom: "6px" }}>{s.number}</div>
                <div style={{ fontSize: "0.85rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
