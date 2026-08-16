// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = { data?: any };

const DEFAULTS = {
  eyebrow: "עדיין מתלבט?",
  headingPre: "אתה לא חייב",
  headingAccent: "לעשות את זה לבד.",
  subheading: "Site Bot בונה לך אתר מקצועי, GEO Bot מכניס אותך לתשובות של גוגל. Ads Bot מריץ לך קמפיין מושלם בגוגל כולל דף נחיתה. שיחה קצרה בוואטסאפ ותבין הכל.",
  phone: "052-614-8860",
  phoneHref: "0526148860",
  email: "eitan@wao.co.il",
};

export default function CtaBanner({ data }: Props) {
  const d = { ...DEFAULTS, ...data };

  return (
    <section className="wao-section" aria-label="קריאה לפעולה">
      <div className="wao-container">
        <div className="cta-banner" style={{ padding: "clamp(48px, 8vw, 96px) clamp(24px, 6vw, 80px)", position: "relative", overflow: "hidden" }}>
          <div aria-hidden style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "60%", height: "100%", background: "radial-gradient(ellipse at center, rgba(74,227,181,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div className="eyebrow" style={{ justifyContent: "center" }}>{d.eyebrow}</div>
            <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 4rem)", lineHeight: 1.1, letterSpacing: "-0.025em", marginBottom: "20px", marginTop: "8px" }}>
              {d.headingPre}{" "}<span className="text-gradient">{d.headingAccent}</span>
            </h2>
            <p style={{ fontSize: "clamp(1rem, 1.5vw, 1.2rem)", color: "var(--muted)", lineHeight: 1.7, maxWidth: "520px", margin: "0 auto 44px", fontFamily: "var(--font-body), sans-serif" }}>
              {d.subheading}
            </p>
            <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
              <a href={`tel:${d.phoneHref}`} className="btn-primary" style={{ fontSize: "1.05rem", padding: "16px 40px" }}>
                📞 {d.phone}
              </a>
              <a href="https://wa.me/972526148860" target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ fontSize: "1.05rem", padding: "16px 40px" }}>
                💬 וואטסאפ
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
