"use client";
import Link from "next/link";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.83rem",
  fontWeight: 600,
  color: "var(--muted)",
  fontFamily: "var(--font-body), sans-serif",
  marginBottom: "6px",
};

/**
 * Mandatory, unchecked-by-default privacy consent checkbox — Israeli Privacy
 * Protection Law Amendment 13 compliance. Shared verbatim across every lead
 * form on the site. Do not hand-copy this markup elsewhere — import it.
 */
export default function PrivacyConsent({
  id = "cf-privacy",
  checked,
  onChange,
}: {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
      <input
        id={id}
        type="checkbox"
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: "3px", accentColor: "var(--accent)", flexShrink: 0, width: "16px", height: "16px", cursor: "pointer" }}
      />
      <label htmlFor={id} style={{ ...labelStyle, marginBottom: 0, fontWeight: 400, cursor: "pointer", lineHeight: 1.6 }}>
        קראתי ומסכים/ת ל
        <Link href="/privacy" style={{ color: "var(--accent)", fontWeight: 600 }}>מדיניות הפרטיות</Link>
        {" "}של WAO. ידוע לי שהפרטים ישמשו ליצירת קשר בלבד ולא יועברו לצד שלישי.{" "}
        <span style={{ color: "var(--accent)" }}>*</span>
      </label>
    </div>
  );
}
