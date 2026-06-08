import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "מדיה חברתית — קרוב | WAO",
  description: "ניהול מדיה חברתית מקצועי — Meta, TikTok, Instagram. WAO. בקרוב.",
  robots: { index: false, follow: true },
};

export default function SocialPage() {
  return (
    <section style={{ paddingTop: "clamp(110px,14vw,160px)", paddingBottom: "clamp(64px,8vw,96px)", position: "relative", overflow: "hidden" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(74,227,181,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div className="hero-grid" />
      <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "720px", textAlign: "center" }}>
        <div className="badge" style={{ marginBottom: "28px", justifyContent: "center" }}>
          <span className="badge-dot" />
          מדיה חברתית — קרוב
        </div>
        <h1
          style={{
            fontFamily: "var(--font-rubik), sans-serif",
            fontWeight: 900,
            fontSize: "clamp(2rem,5vw,3.6rem)",
            lineHeight: 1.1,
            letterSpacing: "-0.025em",
            marginBottom: "20px",
          }}
        >
          מדיה חברתית שמביאה{" "}
          <span className="text-gradient">לקוחות</span>
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "1.1rem",
            color: "var(--muted)",
            lineHeight: 1.75,
            marginBottom: "40px",
          }}
        >
          הדף הזה בבנייה — בינתיים אפשר לצור קשר לשמוע על שירות ניהול המדיה החברתית שלנו.
        </p>
        <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
          <a href="tel:0526148860" className="btn-primary" style={{ fontSize: "1rem", padding: "14px 32px" }}>
            📞 052-614-8860
          </a>
          <Link href="/contact" className="btn-outline" style={{ fontSize: "1rem" }}>
            שלח פנייה
          </Link>
        </div>
      </div>
    </section>
  );
}
