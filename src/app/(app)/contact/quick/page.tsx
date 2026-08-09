import type { Metadata } from "next";
import LeadFormLight from "@/components/LeadFormLight";

const CANONICAL = "https://www.wao.co.il/contact/quick";

export const metadata: Metadata = {
  title: "השאירו פרטים — WAO",
  description: "השאירו שם ופרטי התקשרות ונחזור אליכם תוך 24 שעות.",
  alternates: { canonical: CANONICAL },
  robots: { index: false, follow: true },
};

export default function ContactQuickPage() {
  return (
    <section style={{ paddingTop: "clamp(110px,14vw,160px)", paddingBottom: "clamp(64px,8vw,96px)" }}>
      <div className="wao-container" style={{ maxWidth: "520px" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <h1
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 900,
              fontSize: "clamp(1.8rem,4vw,2.6rem)",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              marginBottom: "16px",
            }}
          >
            תשאיר פרטים ותקבל את 3 ההזדמנויות שלך
          </h1>
          <p
            style={{
              fontFamily: "var(--font-body), sans-serif",
              lineHeight: 1.75,
              color: "var(--muted)",
              fontSize: "1rem",
            }}
          >
            שם ודרך התקשרות — זהו. נחזור אליך תוך 24 שעות (בימי עסקים).
          </p>
        </div>

        <LeadFormLight source="geo-audit-light" />
      </div>
    </section>
  );
}
