"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renderMixed } from "@/lib/bidi";

// Dashboard eligibility card for the month-4 self-serve GEO Bot upgrade
// (docs/missions/site-bot-single-segment-pivot-2026-08-21.md, Spec B).
// Rendered only when the server component's own checkGeoUpgradeEligibility
// check on the record is eligible:true — this component takes no props and
// reads its own clientId server-side via /api/geo/upgrade/init's session
// cookie, so it never needs to know the clientId itself.
export default function GeoUpgradeCard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/geo/upgrade/init", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.sessionId) throw new Error(json.error || "משהו השתבש");
      router.push(`/geo/upgrade/pay/${json.sessionId}`);
    } catch (e: any) {
      setError(e.message || "משהו השתבש");
      setLoading(false);
    }
  }

  return (
    <div className="mb-8" dir="rtl">
      <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-4">
        <p className="font-semibold">{renderMixed("האתר שלך בשל לשדרוג — GEO Bot")}</p>
        <p className="text-[var(--muted)] text-xs mt-0.5">
          {renderMixed(
            "כבר שלושה חודשים שנתוני חיפוש אמיתיים זורמים אליך. GEO Bot משתמש בהם כדי שגם ChatGPT, ‏Gemini וסקירות ה-AI יצטטו אותך בתשובות — לא רק שתופיע בקישורים הכחולים."
          )}
        </p>
        <button
          onClick={startUpgrade}
          disabled={loading}
          className="mt-3 rounded-lg bg-[var(--accent)] text-black font-semibold px-4 py-2 text-sm disabled:opacity-60"
        >
          {renderMixed("שדרג ל-GEO Bot — ₪299 לחודש")}
        </button>
        {error && <p className="text-[#e05555] text-xs mt-2">{renderMixed(error)}</p>}
      </div>
    </div>
  );
}
