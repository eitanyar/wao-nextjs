"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const STORAGE_KEY = "wao-privacy-consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label="הודעת עוגיות ופרטיות"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "var(--elevated)",
        borderTop: "2px solid var(--border)",
        padding: "16px clamp(16px,5vw,48px)",
        display: "flex",
        alignItems: "center",
        gap: "20px",
        flexWrap: "wrap",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.35)",
      }}
    >
      <p
        style={{
          flex: 1,
          fontSize: "0.85rem",
          color: "var(--muted)",
          fontFamily: "var(--font-body), sans-serif",
          lineHeight: 1.65,
          margin: 0,
          minWidth: "240px",
        }}
      >
        אתר זה משתמש בעוגיות לניתוח תנועה (Google Analytics) ולשיפור חוויית הגלישה.
        המשך השימוש באתר מהווה הסכמה לשימוש בעוגיות ולתנאי{" "}
        <Link href="/privacy" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "underline" }}>
          מדיניות הפרטיות
        </Link>{" "}
        שלנו.
      </p>
      <div style={{ display: "flex", gap: "10px", flexShrink: 0, flexWrap: "wrap" }}>
        <Link
          href="/privacy"
          style={{
            padding: "10px 18px",
            fontSize: "0.82rem",
            color: "var(--muted)",
            fontFamily: "var(--font-body), sans-serif",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-pill)",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          פרטים נוספים
        </Link>
        <button
          onClick={dismiss}
          className="btn-primary"
          style={{ padding: "10px 24px", fontSize: "0.88rem", whiteSpace: "nowrap" }}
        >
          הבנתי ומסכים/ת
        </button>
      </div>
    </div>
  );
}
