import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "WAO | שיווק דיגיטלי שמביא תוצאות";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#060709",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -55%)",
            width: "700px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(ellipse at center, rgba(74,227,181,0.18) 0%, transparent 65%)",
            display: "flex",
          }}
        />

        {/* WAO wordmark */}
        <div
          style={{
            fontSize: "120px",
            fontWeight: 900,
            color: "#4AE3B5",
            letterSpacing: "-6px",
            lineHeight: 1,
            marginBottom: "20px",
            display: "flex",
          }}
        >
          WAO
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "30px",
            fontWeight: 700,
            color: "#EEE9E2",
            marginBottom: "16px",
            letterSpacing: "-0.5px",
            display: "flex",
          }}
        >
          Digital Marketing That Delivers Results
        </div>

        {/* Services pills */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "48px" }}>
          {["SEO", "Google Ads", "Content Marketing"].map((s) => (
            <div
              key={s}
              style={{
                padding: "8px 20px",
                borderRadius: "100px",
                border: "1px solid rgba(74,227,181,0.35)",
                background: "rgba(74,227,181,0.08)",
                color: "#4AE3B5",
                fontSize: "18px",
                fontWeight: 600,
                display: "flex",
              }}
            >
              {s}
            </div>
          ))}
        </div>

        {/* Domain */}
        <div
          style={{
            position: "absolute",
            bottom: "36px",
            fontSize: "20px",
            color: "#8892A4",
            letterSpacing: "0.05em",
            display: "flex",
          }}
        >
          www.wao.co.il
        </div>
      </div>
    ),
    { ...size }
  );
}
