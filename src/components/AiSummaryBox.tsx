export default function AiSummaryBox({ summary }: { summary: string }) {
  return (
    <div className="wao-container" style={{ paddingTop: "28px", paddingBottom: "0" }}>
      <div
        role="note"
        aria-label="סיכום AI — בקצרה"
        data-ai-summary="true"
        style={{
          background: "var(--accent-dim)",
          border: "1px solid var(--accent-border)",
          borderInlineStart: "4px solid var(--accent)",
          borderRadius: "var(--radius-md)",
          padding: "20px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "10px",
          }}
        >
          <span aria-hidden style={{ fontSize: "1rem" }}>🤖</span>
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--accent)",
              fontFamily: "var(--font-body), sans-serif",
            }}
          >
            בקצרה — סיכום ל-AI ולקורא הממהר
          </span>
        </div>
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "0.97rem",
            lineHeight: 1.75,
            color: "var(--text)",
            margin: 0,
          }}
        >
          {summary}
        </p>
      </div>
    </div>
  );
}
