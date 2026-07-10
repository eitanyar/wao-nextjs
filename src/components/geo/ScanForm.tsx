"use client";

import { useState } from "react";
import Link from "next/link";
import { renderMixed } from "@/lib/bidi";

interface ScanResult {
  url: string;
  pagesScanned: number;
  grade: string;
  hardFail: boolean;
  topFixes: string[];
  categories: Record<string, { score: number; max: number; hardFail?: boolean }>;
}

const GRADE_COLORS: Record<string, string> = {
  A: "#4ae3b5",
  B: "#7fd88a",
  C: "#e8c547",
  D: "#e08a3c",
  F: "#e05353",
};

export default function ScanForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/geo/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "משהו השתבש. נסה שוב.");
      } else {
        setResult(data);
      }
    } catch {
      setError("לא הצלחנו להתחבר לשרת. נסה שוב בעוד רגע.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <input
          type="text"
          required
          placeholder="https://example.co.il"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          dir="ltr"
          style={{
            flex: "1 1 260px",
            padding: "14px 18px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            fontSize: "1rem",
            fontFamily: "var(--font-body), sans-serif",
          }}
        />
        <button
          type="submit"
          className="btn-primary w-full sm:w-auto justify-center"
          style={{ fontSize: "1.05rem", padding: "14px 32px" }}
          disabled={loading}
        >
          {loading ? renderMixed("סורק…") : renderMixed("סרוק את האתר שלי ←")}
        </button>
      </form>

      {error && (
        <p style={{ color: "#e05353", marginTop: "16px", fontFamily: "var(--font-body), sans-serif" }}>
          {renderMixed(error)}
        </p>
      )}

      {result && (
        <div
          style={{
            marginTop: "32px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "32px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "20px", flexWrap: "wrap" }}>
            <span
              aria-label={`ציון: ${result.grade}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                fontSize: "2.2rem",
                fontWeight: 900,
                fontFamily: "var(--font-rubik), sans-serif",
                color: "#0a0f0d",
                background: GRADE_COLORS[result.grade] || "#888",
                flexShrink: 0,
              }}
            >
              {result.grade}
            </span>
            <div>
              <p style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 800, fontSize: "1.1rem", margin: 0 }}>
                {renderMixed("מוכנות ל-AI Search")}
              </p>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", margin: "4px 0 0" }}>
                {renderMixed(`סרקנו ${result.pagesScanned} עמודים מתוך האתר שלך (לא את כל האתר).`)}
              </p>
            </div>
          </div>

          {result.hardFail && (
            <div
              style={{
                background: "rgba(224,83,83,0.08)",
                border: "1px solid rgba(224,83,83,0.3)",
                borderRadius: "var(--radius-md)",
                padding: "14px 18px",
                marginBottom: "20px",
              }}
            >
              <p style={{ color: "#e05353", margin: 0, fontFamily: "var(--font-body), sans-serif" }}>
                {renderMixed("נמצאה חסימת סריקה (robots.txt או noindex) — זו הבעיה הכי דחופה, ולכן הציון הכולל מוגבל.")}
              </p>
            </div>
          )}

          <p style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 800, marginBottom: "12px" }}>
            {renderMixed("3 הדברים הכי דחופים לתקן")}
          </p>
          <ul style={{ paddingInlineStart: "20px", margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
            {result.topFixes.length === 0 && (
              <li style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                {renderMixed("לא מצאנו בעיות בולטות בבדיקה השטחית הזו — סימן טוב.")}
              </li>
            )}
            {result.topFixes.map((fix, i) => (
              <li key={i} style={{ color: "var(--text)", fontFamily: "var(--font-body), sans-serif", lineHeight: 1.7 }} dir="auto">
                {fix}
              </li>
            ))}
          </ul>

          <p
            style={{
              marginTop: "24px",
              fontSize: "0.85rem",
              color: "var(--muted)",
              fontFamily: "var(--font-body), sans-serif",
              lineHeight: 1.7,
              borderTop: "1px solid var(--border)",
              paddingTop: "16px",
            }}
          >
            {renderMixed(
              "הציון הזה בודק סימנים מבניים בתוכן שמתואמים עם היכולת של מנועי AI לחלץ ולצטט אותו. זו לא תחזית לדירוג שלך ב-AI Overviews, לא הבטחה שיצטטו אותך, וגם לא מדד רשמי של גוגל. זו בדיקה שטחית ומהירה של האתר שלך בלבד — לא השוואה מול אתרים אחרים."
            )}
          </p>

          <div style={{ marginTop: "20px" }}>
            <Link
              href="/geo/audit"
              className="btn-outline w-full sm:w-auto justify-center"
              style={{ fontSize: "1rem" }}
            >
              {renderMixed("רוצה את הניתוח האמיתי? חבר את נתוני ה-Search Console שלך ←")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
