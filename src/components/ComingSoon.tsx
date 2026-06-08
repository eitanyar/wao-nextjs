import Link from "next/link";

export default function ComingSoon({ title, desc }: { title: string; desc?: string }) {
  return (
    <section
      style={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: "80px",
        textAlign: "center",
      }}
    >
      <div className="wao-container">
        <div className="badge" style={{ justifyContent: "center", marginBottom: "28px" }}>
          <span className="badge-dot" />
          בקרוב
        </div>
        <h1 className="section-title" style={{ marginBottom: "16px" }}>
          {title}
        </h1>
        <p className="section-sub" style={{ margin: "0 auto 40px" }}>
          {desc ?? "עמוד זה נמצא בשלבי בנייה. בינתיים, צרו קשר ונשמח לעזור."}
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          <a href="tel:0526148860" className="btn-primary">
            דברו איתנו
          </a>
          <Link href="/" className="btn-outline">
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    </section>
  );
}
