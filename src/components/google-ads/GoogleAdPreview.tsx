// The Google search-ad preview card shown in the Ads Bot onboarding ("live preview") and, scaled down, in the
// homepage hero window. Moved verbatim out of src/app/(app)/google-ads/onboarding/page.tsx so both render the same card.
// Server- and client-safe (no hooks). Hebrew in this file was moved byte-for-byte from the onboarding page.

export interface GoogleAdPreviewProps {
  /** Display URL shown next to the sponsored label, e.g. "www.example.co.il". */
  displayUrl: string;
  /** Up to the first three are shown, joined by " | " (Google's headline layout). */
  headlines: readonly string[];
  descriptions: readonly string[];
}

export default function GoogleAdPreview({ displayUrl, headlines, descriptions }: GoogleAdPreviewProps) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        color: "#1A0DAB",
        padding: "16px",
        borderRadius: "8px",
        border: "1px solid #DFE1E5",
        fontFamily: "Arial, sans-serif",
        textAlign: "right",
      }}
    >
      {/* Sponsor & Domain */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "0.78rem",
          color: "#202124",
          marginBottom: "4px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <span style={{ fontWeight: "bold" }}>ממומן</span>
        <span style={{ color: "#5F6368" }}>•</span>
        <span style={{ color: "#202124" }}>
          {displayUrl}
        </span>
      </div>

      {/* Headlines */}
      <div
        style={{
          fontSize: "1.2rem",
          fontWeight: "medium",
          color: "#1a0dab",
          lineHeight: "1.3",
          marginBottom: "4px",
          cursor: "pointer",
        }}
      >
        {headlines.slice(0, 3).join(" | ")}
      </div>

      {/* Descriptions */}
      <div
        style={{
          fontSize: "0.87rem",
          color: "#4d5156",
          lineHeight: "1.5",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {descriptions.join(" ")}
      </div>
    </div>
  );
}
