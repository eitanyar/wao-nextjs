import type { Metadata } from "next";
import Link from "next/link";
import GT from "@/components/GlossaryTerm";

export const metadata: Metadata = {
  title: "בניית אתרים ב-Next.js — קרוב | WAO",
  description: "בניית אתרים ב-Next.js עם Core Web Vitals ירוקים ו-SEO מובנה — WAO. בקרוב.",
  robots: { index: false, follow: true },
};

export default function BuildPage() {
  return (
    <section style={{ paddingTop: "clamp(110px,14vw,160px)", paddingBottom: "clamp(64px,8vw,96px)", position: "relative", overflow: "hidden" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(74,227,181,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div className="hero-grid" />
      <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "720px", textAlign: "center" }}>
        <div className="badge" style={{ marginBottom: "28px", justifyContent: "center" }}>
          <span className="badge-dot" />
          בניית אתרים — קרוב
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
          אתרי <GT term="Next.js">Next.js</GT> עם{" "}
          <span className="text-gradient">ביצועי SEO מושלמים</span>
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
          הדף הזה בבנייה — בינתיים אפשר לצור קשר לשמוע על שירות בניית האתרים שלנו ב-Next.js.
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
