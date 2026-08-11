import { CollectedData } from "@/lib/bot/prompts";

interface CampaignStrategy {
  targetLocation: string;
  suggestedDailyBudget: number;
  keywords: string[];
  negativeKeywords: string[];
  strategyRationale: string;
}

interface CampaignCopy {
  headlines: string[];
  descriptions: string[];
  callToAction: string;
  copywritingRationale: string;
}

interface OnboardingSidebarProps {
  collectedData: CollectedData;
  strategy: CampaignStrategy | null;
  copy: CampaignCopy | null;
  lpUrl: string | null;
  currentState: string;
  lpGenerating: boolean;
}

export default function OnboardingSidebar({
  collectedData,
  strategy,
  copy,
  lpUrl,
  currentState,
  lpGenerating,
}: OnboardingSidebarProps) {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
      {/* Status Steps Tracker */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-4">שלבי אפיון הקמפיין</h3>
        <div className="space-y-3">
          {[
            {
              label: "פרטי העסק",
              done: !!collectedData.businessNiche,
              value: collectedData.businessName
                ? `${collectedData.businessName} (${collectedData.businessNiche})`
                : collectedData.businessNiche,
              num: 1,
            },
            {
              label: "מיקום ומודל שירות",
              done: !!collectedData.targetLocation,
              value: collectedData.targetLocation,
              num: 2,
            },
            {
              label: "פרופיל לקוח ובידול",
              done: !!collectedData.usp,
              value: collectedData.usp ? collectedData.usp.slice(0, 40) + (collectedData.usp.length > 40 ? "…" : "") : undefined,
              num: 3,
            },
            {
              label: "תקציב ופיננסים",
              done: !!collectedData.monthlyBudget,
              value: collectedData.monthlyBudget
                ? `₪${collectedData.monthlyBudget.toLocaleString()} / חודש${collectedData.feasibilityBranch ? ` (ענף ${collectedData.feasibilityBranch})` : ""}`
                : undefined,
              num: 4,
            },
            {
              label: "נכסי אמון",
              done: !!collectedData.hasTrustAssets,
              value: collectedData.starRating ? `${collectedData.starRating} כוכבים בגוגל` : collectedData.hasTrustAssets ? "יש ביקורות" : undefined,
              num: 5,
            },
            {
              label: "פרטי קשר",
              done: !!collectedData.phone,
              value: collectedData.phone,
              num: 6,
            },
          ].map(({ label, done, value, num }) => (
            <div key={num} className="flex items-start gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${done ? "bg-green-500 text-gray-900" : "bg-gray-700 text-gray-400"}`}
              >
                {done ? "✓" : num}
              </div>
              <div className="flex-1">
                <span className="block text-sm font-medium text-gray-200">{label}</span>
                {value && (
                  <span className="block text-xs text-gray-400 mt-0.5">{value}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Campaign Plan Details Panel */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-4 border-b border-gray-700 pb-2">אסטרטגיית קמפיין מוצעת (Dror & Tamar)</h3>

        {currentState === "DIAGNOSING" && (
          <div className="text-center py-6 text-gray-400">
            <div className="text-3xl mb-2">⚙️</div>
            <p className="font-semibold text-gray-200 mb-1">{`ממתין להשלמת האפיון בצ'אט`}</p>
            <p className="text-sm">ברגע שנאסוף את כל הפרטים, ה-Specialists ייצרו עבורך את הקמפיין באופן מיידי.</p>
          </div>
        )}

        {(currentState === "REVIEWING" || currentState === "COMPLETED") && (
          <div className="space-y-4">
            {/* Location & Budget Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-800/50 p-3 rounded-lg">
              <div>
                <div className="text-xs text-gray-400 mb-1">מיקוד מיקום</div>
                <div className="font-bold text-green-400">📍 {strategy?.targetLocation}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">תקציב יומי מומלץ</div>
                <div className="font-bold text-green-400">💰 ₪{strategy?.suggestedDailyBudget} / יום</div>
              </div>
            </div>

            {/* Keywords Block */}
            <div>
              <h4 className="text-sm font-bold mb-2 text-green-400">🎯 מילות מפתח ממוקדות (Search Term)</h4>
              <div className="flex flex-wrap gap-2">
                {strategy?.keywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded-full text-xs"
                  >
                    +{kw}
                  </span>
                ))}
              </div>
            </div>

            {/* Negative Keywords Block */}
            <div>
              <h4 className="text-sm font-bold mb-2 text-red-400">🚫 מילות מפתח שליליות (למניעת בזבוז כסף)</h4>
              <div className="flex flex-wrap gap-2">
                {strategy?.negativeKeywords.map((nkw, idx) => (
                  <span
                    key={idx}
                    className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-full text-xs"
                  >
                    -{nkw}
                  </span>
                ))}
              </div>
            </div>

            {/* Ad Live Preview */}
            <div>
              <h4 className="text-sm font-bold mb-2 text-blue-400">👀 תצוגה מקדימה למודעה בגוגל (Google Search)</h4>
              <div className="bg-white text-blue-900 p-4 rounded-lg border border-gray-200 font-sans text-right">
                <div className="text-xs text-gray-500 mb-1">
                  <span className="font-bold">ממומן</span> • www.{collectedData.businessNiche ? "my-business" : "yoursite"}.co.il
                </div>
                <div className="text-lg font-medium mb-1">{copy?.headlines?.[0] || "אינסטלטור תל אביב מהיר"}</div>
                <div className="text-sm text-gray-600">{copy?.descriptions?.[0] || "מחזקים את הדף שלך, מביאים לך לקוחות שמחפשים בדיוק מה שאתה נותן — בלי הסבר מיותר."}</div>
              </div>
            </div>

            {/* Landing Page Preview */}
            <div>
              <h4 className="text-sm font-bold mb-2 text-blue-400">📱 תצוגה מקדימה לדף הנחיתה</h4>
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="font-bold">{collectedData.businessNiche || "העסק שלך"}</div>
                  <div className="text-gray-400">☰</div>
                </div>
                <h2 className="text-xl font-bold mb-2 text-center">{copy?.headlines?.[0] || "הכותרת המנצחת שלך תופיע כאן"}</h2>
                <p className="text-gray-300 text-center mb-4">{copy?.descriptions?.[0] || "כאן יופיע טקסט משכנע המבוסס על ה-USP שלך"}</p>
                <button className="w-full bg-gradient-to-r from-green-500 to-cyan-400 text-gray-900 font-bold py-2 px-4 rounded-full text-sm">
                  התקשר עכשיו
                </button>
                <div className="mt-4 text-center">
                  <div className="text-xs text-gray-400 mb-2">לקוחות ממליצים בוואטסאפ:</div>
                  <div className="flex justify-center gap-2">
                    <div className="w-12 h-16 bg-gray-700/50 rounded flex items-center justify-center text-xs text-gray-400">צילום 1</div>
                    <div className="w-12 h-16 bg-gray-700/50 rounded flex items-center justify-center text-xs text-gray-400">צילום 2</div>
                    <div className="w-12 h-16 bg-gray-700/50 rounded flex items-center justify-center text-xs text-gray-400">צילום 3</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Checkout & Action CTA */}
            {currentState === "REVIEWING" && (
              <div className="bg-gray-800/50 border border-green-500/30 rounded-lg p-4 mt-4">
                <div className="text-center mb-3">
                  <div className="text-sm text-gray-400">דמי הקמה ותקופת ניסיון</div>
                  <div className="text-2xl font-extrabold text-green-400">9.90 ₪</div>
                  <div className="text-xs text-gray-400">תשלום חד-פעמי להפעלת הקמפיין ודף הנחיתה</div>
                </div>
                
                <div className="text-xs text-gray-300 text-center mb-3">
                  אני מאשר/ת את <strong>תנאי השימוש</strong> ומסכים/ה שהשירות מסופק {"As-Is"}.
                  ידוע לי שההוצאה היומית לגוגל תשולם ישירות מחשבון ה-Ads שייפתח עבורי.
                </div>
                
                <button
                  disabled
                  className="w-full bg-gradient-to-r from-green-500 to-cyan-400 text-gray-900 font-bold py-3 px-4 rounded-lg opacity-70 cursor-not-allowed"
                >
                  🚀 לתשלום (9.9 ₪) והפעלת קמפיין
                </button>
              </div>
            )}

            {currentState === "COMPLETED" && (
              <div className="space-y-3">
                {lpGenerating && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center text-green-400">
                    <div className="text-2xl mb-2">⚙️</div>
                    <div className="font-semibold">בונה את הדף שלך... זה ייקח כמה שניות</div>
                  </div>
                )}
                {lpUrl && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                    <div className="font-bold text-green-400 mb-2">🎉 הדף שלך מוכן!</div>
                    <a
                      href={lpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-green-500 text-gray-900 font-bold py-2 px-4 rounded-lg text-sm"
                    >
                      👉 צפה בדף הנחיתה שלך
                    </a>
                    <div className="text-xs text-gray-400 mt-2 break-all">{lpUrl}</div>
                  </div>
                )}
                {!lpGenerating && !lpUrl && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center text-green-400 font-bold">
                    🎉 הקמפיין באוויר! בדוק את תיבת המייל שלך לסיכום ופרטים על מה קורה עכשיו.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}