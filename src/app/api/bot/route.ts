import { NextResponse } from "next/server";
import { ADAM_SYSTEM_PROMPT, DROR_SYSTEM_PROMPT, TAMAR_SYSTEM_PROMPT, CollectedData } from "@/lib/bot/prompts";
import { getEstimatedCPC } from "@/lib/ads/keywordPlanner";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestData {
  messages: Message[];
  currentState: "DIAGNOSING" | "STRATEGIZING" | "REVIEWING" | "COMPLETED";
  collectedData: CollectedData;
}

// ── Industry cluster budgets (Dror-verified, WordStream/LocaliQ 2025-2026) ────
// CPCs: US benchmark × ~0.5 IL factor × ₪3.0/$ (USD/ILS 30 Jun 2026).
// Budgets sized for Phase 1 Maximize Clicks (~20 leads/month = meaningful signal).
// Smart Bidding optimization phase requires 3× budget (see VISION.md Option B gate).

interface VerticalBudget {
  min: number;
  recommended: number;
  aggressive: number;
  cpc: number;
  lpCvr: number;
  closeRateDefault: number;
  ltvMultiplier: number;
}

type ClusterKey =
  | "emergencyTrades" | "medicalRehab" | "wellnessTherapy" | "legal"
  | "beautyAesthetics" | "homeImprovement" | "education" | "professionalSvc";

const BUDGET_CLUSTERS: Record<ClusterKey, VerticalBudget> = {
  // cpc × 20 leads = recommended;  cpc × 10 leads = min
  emergencyTrades:  { cpc: 11, lpCvr: 0.09, min: 1500, recommended: 2500, aggressive: 5000, closeRateDefault: 0.40, ltvMultiplier: 1.3 },
  medicalRehab:     { cpc: 8,  lpCvr: 0.10, min: 1000, recommended: 2000, aggressive: 3500, closeRateDefault: 0.35, ltvMultiplier: 2.5 },
  wellnessTherapy:  { cpc: 9,  lpCvr: 0.06, min: 1500, recommended: 3000, aggressive: 6000, closeRateDefault: 0.25, ltvMultiplier: 3.0 },
  legal:            { cpc: 22, lpCvr: 0.05, min: 2500, recommended: 4000, aggressive: 8000, closeRateDefault: 0.25, ltvMultiplier: 1.8 },
  beautyAesthetics: { cpc: 8,  lpCvr: 0.08, min: 1200, recommended: 2000, aggressive: 4000, closeRateDefault: 0.30, ltvMultiplier: 3.0 },
  homeImprovement:  { cpc: 10, lpCvr: 0.06, min: 1800, recommended: 3500, aggressive: 7000, closeRateDefault: 0.20, ltvMultiplier: 2.0 },
  education:        { cpc: 7,  lpCvr: 0.10, min: 800,  recommended: 1500, aggressive: 3000, closeRateDefault: 0.35, ltvMultiplier: 3.0 },
  professionalSvc:  { cpc: 9,  lpCvr: 0.05, min: 1800, recommended: 3500, aggressive: 7000, closeRateDefault: 0.30, ltvMultiplier: 2.5 },
};

const CLUSTER_KEYWORDS: Record<ClusterKey, string[]> = {
  emergencyTrades:  ["אינסטל", "שרברב", "נזיל", "חשמלאי", "מזגן", "גז", "דוד", "גנרטור", "מדביר", "הדבר", "ג'וקים", "עכברים", "מנעולן", "מנעול", "פריצה"],
  medicalRehab:     ["פיזיות", "פיזיוט", "ריפוי בעיסוק", "קלינאי תקשורת", "אורתופד", "כירופרקט", "אוסטאו", "דיאטנ", "תזונ", "שיניים", "דנטל", "אורתודונט", "אופטומטר"],
  wellnessTherapy:  ["פסיכולוג", "קואצ'ר", "nlp", "טיפול רגשי", "טיפול נפש", "דמיון מודרך", "מדיטציה", "מיינדפולנס", "טיפול זוגי", "יעוץ נפש", "פסיכותרפ", "הדרכת הורים"],
  legal:            ["עורך דין", "עו\"ד", "משפט", "פלילי", "גירושין", "נוטריון", "בוררות", "נזיקין", "צוואה"],
  beautyAesthetics: ["קוסמט", "אסתט", "בוטוקס", "פילינג", "לייזר", "שיער", "טיפול פנים", "מניקור", "פדיקור", "ריסים", "גבות", "אפיל", "מסאז"],
  homeImprovement:  ["שיפוץ", "קבלן", "גנן", "גינ", "ניקיון", "ניקוי", "צביע", "ריצוף", "נגר", "אלומיניום", "פרקט", "גג", "חלונות", "מוסך", "רכב", "פחים"],
  education:        ["מורה פרטי", "שיעורי", "אנגלית", "מתמטיקה", "עברית", "ערבית", "פיזיקה", "בגרות", "פסיכומטר", "ייעוץ לימוד", "כושר", "פילאטיס", "יוגה", "אימון אישי"],
  professionalSvc:  ["רואה חשבון", "חשבונאי", "מס", "צלמ", "מחשב", "it", "טכנאי", "ייעוץ עסקי", "שיווק", "גרפיק", "תרגום", "ביטוח", "סוכן"],
};

function detectCluster(niche: string): ClusterKey {
  const lower = niche.toLowerCase();
  for (const [cluster, keywords] of Object.entries(CLUSTER_KEYWORDS) as [ClusterKey, string[]][]) {
    if (keywords.some(k => lower.includes(k))) return cluster;
  }
  return "professionalSvc";
}

function detectVerticalBudget(niche: string): VerticalBudget {
  return BUDGET_CLUSTERS[detectCluster(niche)];
}

function getClusterCloseRateDefault(niche: string): number {
  return BUDGET_CLUSTERS[detectCluster(niche)].closeRateDefault;
}

function parseCloseRate(text: string): number {
  const pct = text.match(/(\d+)\s*%/);
  if (pct) return parseInt(pct[1]) / 100;
  // Handle "X מתוך Y" and "X ל-Y" / "X ל Y"
  const fraction = text.match(/(\d+)\s*(?:מתוך|ל-?)\s*(\d+)/);
  if (fraction) return parseInt(fraction[1]) / parseInt(fraction[2]);
  const single = text.match(/^(\d+)$/);
  if (single) {
    const n = parseInt(single[1]);
    return n > 10 ? n / 100 : n / 10;
  }
  return 0.3;
}

function parseNumber(text: string): number | null {
  const cleaned = text.replace(/[,\s]/g, "").replace(/[^0-9]/g, "");
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : n;
}

function generateFallbackStrategyAndCopy(data: CollectedData) {
  const budget = data.monthlyBudget ?? 1000;
  const daily = Math.round(budget / 30);
  const location = Array.isArray(data.specificCities) ? data.specificCities.join(", ") : (data.specificCities ?? "ישראל");
  const niche = data.businessNiche ?? data.businessName ?? "שירות";
  return {
    strategy: {
      targetLocation: location,
      suggestedDailyBudget: daily,
      biddingStrategy: "Maximize Clicks",
      keywords: [`${niche}`, `${niche} מחיר`, `${niche} מקצועי`, `שירות ${niche}`],
      strategyRationale: `קמפיין חיפוש ממוקד בשלב איסוף נתונים (Maximize Clicks). תקציב יומי ₪${daily} בהתאם לתקציב החודשי.`,
    },
    copy: {
      headlines: [`${niche} מקצועי`, `${location} | שירות מהיר`, `התקשר עכשיו — מענה מיידי`],
      descriptions: [`שירות אמין ומקצועי בתחום ${niche}. פנה אלינו לקבלת הצעת מחיר ללא התחייבות.`, `ניסיון, מקצועיות ואמינות. ${data.usp ?? "צור קשר עוד היום."}`],
    },
  };
}

// ── Turn questions for simulation ─────────────────────────────────────────────

const TURN_QUESTIONS: Record<number, string> = {
  0: "יאללה, בוא נתחיל — ספר לי קצת על העסק שלך. ומכל מה שאתה עושה, מה הכי מכניס לך כסף?",
  1: "ואיך קוראים לעסק?\n(אם אין שם עסק — השם שלך הוא המותג)",
  2: "יש עוד שירותים שאתה נותן? לא ניגע בהם עכשיו, אבל הם מחזקים את הדף שלך ונחזור אליהם בהמשך.",
  3: "יופי. ואיך זה עובד בדרך כלל — אתה מגיע אל הלקוח, הלקוח מגיע אליך, שניהם, או מרחוק?",
  4: "באילו ערים ושכונות ספציפיות אתה נותן שירות? (ככל שתפרט יותר, כך גוגל ידרג אותך טוב יותר)",
  5: "תחשוב על לקוח טוב שפנה אליך לאחרונה — מי זה?\nומה הכי הטריד אותו רגע לפני שהרים אליך טלפון?",
  6: "מה הכי שואלים אותך ברגע שמתקשרים? תן לי 2-3 שאלות שחוזרות.",
  7: "ובכנות גמורה — למה שיבחרו דווקא בך, ולא במישהו אחר שעושה אותו דבר?",
  8: "כמה שנים אתה בתחום? ויש לך אחריות על השירות שלך — לכמה זמן, ומה קורה אם לקוח לא מרוצה?",
  9: "התחום שלך דורש רישוי רשמי כלשהו?\nלמשל רישיון ממשרד ממשלתי, חברות בלשכה מקצועית, או תעודה מוכרת?\nאם כן — מה זה ומה המספר? אם לא — פשוט תגיד ״לא״.",
  10: "יש סוגי פניות שאתה מעדיף לא לקבל?\nשירות שאתה לא מציע, סוג לקוח שאתה לא עובד איתו, או אזורים שאתה לא מגיע אליהם?",
  11: "והלקוחות שלך — רובם צריכים אותך כאן ועכשיו,\nזה משהו שהם בודקים לפני שמחליטים,\nאו שהם מתכננים מראש שבועות וחודשים קדימה?",
  12: "אתה נותן הצעת מחיר חינם לפני שמתחילים?\nיש דמי הגעה אם בסוף לא נסגרה עסקה?",
  13: "עיקר ההכנסה שלך מגיעה מ —\nשירות חד-פעמי לכל לקוח, חוזה שוטף/חוזר, או שניהם?",
  14: "שאלה על כסף, רק כדי שנשמור על התקציב שלך —\nכמה שווה לך לקוח חדש בממוצע, בפעם הראשונה שהוא משלם לך?",
  15: "יופי. עכשיו בוא נבדוק כמה קל לך לסגור אותו.\nתחשוב על עשרה אנשים שמתקשרים אליך —\nכמה מהם, בסוף, הופכים ללקוחות שמשלמים?\n(כולל כל השלבים — מהשיחה הראשונה עד סגירה בפועל)",
  16: "תגיד לי — לקוח שעשית לו עבודה טובה, בדרך כלל חוזר אליך?\nמתקשר שוב כשמתפוצץ לו משהו אחר, או שולח אליך שכנים וחברים?",
  17: "רגע לפני שנדבר על תקציב — יש לך ביקורות בגוגל?\nאם כן, כמה ביקורות יש לך ומה הדירוג? (לדוגמה: 4.9 כוכבים, 35 ביקורות)\nאם עדיין אין — פשוט תגיד ״אין״.",
  18: "__budget_recommendation__",
  19: "נשמע שאתה עושה עבודה טובה — אז בטוח יש לך לקוחות מרוצים.\nיש לך ביקורות או המלצות איפשהו?\nבגוגל, בוואטסאפ, צילומי מסך — כל דבר.\nואם יש לך גם תמונות מהעבודה — זה ממש זהב בשבילנו.",
  20: "מעולה. תביא לי ביקורת אחת או שתיים מגוגל שאתה גאה בהן —\nהעתק-הדבק בדיוק מה שהלקוח כתב.\nומה הדירוג שלך בגוגל? (לדוגמה: 4.9 כוכבים, 64 ביקורות)",
  21: "ובאמת — אם מחר יתחילו להגיע אליך עוד פניות, אתה יכול לקחת אותן עכשיו?\nכמה זה בערך — פניות בשבוע, פרויקטים בחודש, או תאריכים בשנה?",
  22: "ואחרון — איך הכי נוח לך שיתפסו אותך?\nשיתקשרו, וואטסאפ, שימלאו טופס, או שיכתבו באינסטגרם?",
  23: "מה המספר שיופיע על כפתור ״התקשר עכשיו״?\nומה מספר הוואטסאפ?\n(יכולים להיות זהים — רק תגיד לי)",
};

type InferredServiceModel = "field" | "location" | "event" | "remote" | null;

function inferServiceModel(niche: string): InferredServiceModel {
  if (["צלם", "צילום", "קייטרינג", "דיג'יי", "אירוע", "חתונ"].some(keyword => niche.includes(keyword))) return "event";
  if (["אונליין", "זום", "דיגיטל", "קידום אתרים", "seo", "שיווק דיגיטלי"].some(keyword => niche.toLowerCase().includes(keyword))) return "remote";
  if (["שיניים", "רופא", "מרפאה", "פיזיותרפ", "קוסמט", "אסתט", "תספורת", "ציפורנ", "מניקור", "פילאטיס", "יוגה"].some(keyword => niche.includes(keyword))) return "location";
  if (["אינסטל", "שרברב", "נזיל", "חשמלא", "מזגן", "הדבר", "מדביר", "מנעול", "דוד", "ביוב", "ניקוי", "טכנאי", "שיפוצ"].some(keyword => niche.includes(keyword))) return "field";
  return null;
}

// ── Simulation handler ────────────────────────────────────────────────────────

function handleSimulation(
  lastUserMessage: string,
  currentState: string,
  collectedData: CollectedData
) {
  const text = lastUserMessage.trim();
  const data: CollectedData = { ...collectedData };
  let response = "";
  let nextState = currentState;
  let strategy = null;
  let copy = null;

  if (currentState === "DIAGNOSING") {
    const turn = data.turnIndex ?? 0;

    // ── Store this turn's answer ──────────────────────────────────────────────
    switch (turn) {
      case 0:
        if (text.length < 3) {
          response = TURN_QUESTIONS[0];
          return NextResponse.json({ response, currentState: nextState, collectedData: data, isSimulation: true });
        }
        data.businessNiche = text;
        data.turnIndex = 1;
        return NextResponse.json({
          response: `יופי, ${text} — קלטתי. ${TURN_QUESTIONS[1]}`,
          currentState: nextState,
          collectedData: data,
          isSimulation: true,
        });
      case 1:
        data.businessName = text;
        break;
      case 2:
        data.secondaryServices = text;
        const inferredServiceModel = inferServiceModel(data.businessNiche || "");
        if (inferredServiceModel) {
          data.serviceModel = inferredServiceModel;
          data.turnIndex = 4;
          const nextQuestion = inferredServiceModel === "field"
            ? "מעולה. אצלך השירות הוא בבית או בעסק של הלקוח. באילו ערים ושכונות ספציפיות אתה נותן שירות?"
            : inferredServiceModel === "location"
              ? "מעולה. הלקוחות מגיעים אליך לעסק או לקליניקה. מה הכתובת המדויקת, ומאילו אזורים בדרך כלל מגיעים אליך?"
              : inferredServiceModel === "event"
                ? "מעולה. אתה מגיע לאירועים. באילו אזורים אתה עובד בדרך כלל?"
                : "מעולה. אתה עובד מרחוק. אתה פונה ללקוחות מכל הארץ, או לאזור מסוים בלבד?";
          return NextResponse.json({
            response: nextQuestion,
            currentState: nextState,
            collectedData: data,
            isSimulation: true,
          });
        }
        break;
      case 3:
        if (text.includes("מגיע") && text.includes("לקוח")) data.serviceModel = "field";
        else if (text.includes("לקוח מגיע") || text.includes("מגיע אלי")) data.serviceModel = "location";
        else if (text.includes("אירוע") || text.includes("חתונה")) data.serviceModel = "event";
        else if (text.includes("זום") || text.includes("מרחוק") || text.includes("טלפון")) data.serviceModel = "remote";
        else if (text.includes("שניהם") || text.includes("גם")) data.serviceModel = "mixed";
        else data.serviceModel = "field";
        break;
      case 4:
        data.targetLocation = text;
        data.specificCities = text;
        break;
      case 5:
        data.idealClientFear = text;
        break;
      case 6:
        data.faqQuestions = text;
        break;
      case 7:
        data.usp = text;
        break;
      case 8:
        data.yearsInField = text;
        data.guarantee = text;
        break;
      case 9:
        data.license = text.toLowerCase().includes("לא") ? undefined : text;
        break;
      case 10:
        data.exclusions = text;
        break;
      case 11:
        if (text.includes("עכשיו") || text.includes("דחוף") || text.includes("מיידי")) data.urgencyLevel = "urgent";
        else if (text.includes("מראש") || text.includes("חודש") || text.includes("שבועות")) data.urgencyLevel = "long-planning";
        else data.urgencyLevel = "deliberate";
        break;
      case 12:
        data.pricingNotes = text;
        break;
      case 13:
        if (text.includes("שוטף") || text.includes("חוזר") || text.includes("חוזה")) {
          data.revenueModel = text.includes("שניהם") || text.includes("גם") ? "both" : "recurring";
        } else {
          data.revenueModel = "one-time";
        }
        break;
      case 14: {
        const val = parseNumber(text);
        if (val) data.avgJobValue = val;
        break;
      }
      case 15:
        data.closeRate = parseCloseRate(text);
        break;
      case 16: {
        // Capture LTV / repeat-client signal
        const repeatSignals = ["כן", "חוזרים", "חוזר", "ממליצים", "מפנים", "בטח", "תמיד", "ברוב", "לרוב", "הרבה"];
        data.hasRepeatClients = repeatSignals.some(s => text.includes(s));
        break;
      }
      case 17: {
        // Capture organic presence — feeds into budget recommendation
        const reviewCountMatch = text.match(/(\d+)\s*(ביקורות?)/);
        if (reviewCountMatch) data.reviewCount = parseInt(reviewCountMatch[1]);
        const ratingMatch = text.match(/(\d[\d.]*)\s*(כוכב|★|\*)/);
        if (ratingMatch) data.starRating = ratingMatch[1];
        data.hasGoogleBusiness = !text.includes("אין") && !text.includes("לא");

        // Compute budget recommendation adjusted for organic presence
        const vb = detectVerticalBudget(data.businessNiche || "");
        let lpCvr = vb.lpCvr;
        const reviewCount16 = data.reviewCount || 0;
        const starRating16 = parseFloat(data.starRating || "0");
        if (reviewCount16 >= 50 && starRating16 >= 4.5) lpCvr = Math.min(lpCvr * 1.25, 0.12);
        else if (reviewCount16 >= 10 && starRating16 >= 4.0) lpCvr = Math.min(lpCvr * 1.10, 0.12);
        else if (reviewCount16 < 5) lpCvr = lpCvr * 0.85;

        // Locksmith redirect — Google Search PPC doesn't work for this vertical
        const isLocksmith = ["מנעולן", "מנעול", "פריצה"].some(k => (data.businessNiche || "").includes(k));
        if (isLocksmith) {
          data.turnIndex = 18;
          return NextResponse.json({
            response: `רגע, לפני שנמשיך — יש משהו חשוב שאני חייב לשתף איתך.\n\nתחום המנעולנות הוא מהאתגרים הגדולים בגוגל Search: עלות הקליק גבוהה, העבודה הממוצעת נמוכה יחסית, ורוב הלקוחות לא חוזרים. המתמטיקה לא מטיבה עם Search רגיל.\n\nמה שעובד טוב יותר למנעולן זה **Google Local Services Ads** — אתה משלם רק על שיחות אמיתיות, מופיע עם תג ״מאומת על ידי גוגל״, ועלות לפנייה נמוכה בהרבה. רוצה שנדבר על איך להקים את זה במקום?`,
            currentState,
            collectedData: data,
            isSimulation: true,
          });
        }

        const rec = vb.recommended;
        const avgJobVal = data.avgJobValue || 500;
        const closeRate = data.closeRate || getClusterCloseRateDefault(data.businessNiche || "");
        const paidCloseRate = Math.max(0.05, Math.min(closeRate * 0.8, 0.35));
        const expectedLeads = Math.max(1, Math.round((rec * lpCvr) / vb.cpc));
        const clientsPerMonth = Math.max(0.2, expectedLeads * paidCloseRate);
        const breakEvenClients = Math.ceil(rec / avgJobVal);
        const paybackMonths = Math.ceil(breakEvenClients / clientsPerMonth);

        const leadsStr = expectedLeads === 1 ? "פנייה אחת" : `${expectedLeads} פניות`;
        const closeRatioNum = Math.round(1 / closeRate);
        const clientsStr = clientsPerMonth < 1
          ? "פחות מלקוח אחד"
          : `${Math.round(clientsPerMonth * 10) / 10} לקוחות`;
        const ltvLine = data.hasRepeatClients
          ? `\n\nאבל בוא נסתכל על התמונה הגדולה — לקוח שחוזר ומפנה שווה לך פי כמה מהעבודה הראשונה, וכל חודש שאתה רץ בגוגל, עוד אנשים באזור מתחילים לזהות את השם שלך.`
          : "";

        data.turnIndex = 18;
        return NextResponse.json({
          response: `בתקציב של ₪${rec.toLocaleString()} אתה אמור לקבל בסביבות ${leadsStr} בחודש, ובשיעור סגירה של 1 ל-${closeRatioNum} — בערך ${clientsStr} חדשים. אני לא הולך למכור לך חלומות: בחודש הראשון אתה פחות או יותר מתאזן, והרווח האמיתי מתחיל מהחודש השני.${ltvLine}\n\nואגב — לחשבונות חדשים גוגל בדרך כלל נותנת קרדיט פרסום בחודשים הראשונים. כשניפתח את החשבון תראה אם יש הצעה פעילה עבורך — זה בונוס שיכול לכסות חלק מהחודש הראשון.\n\nכמה נוח לך? תגיד לי סכום — ואני אתאים את הקמפיין בהתאם.`,
          currentState,
          collectedData: data,
          isSimulation: true,
        });
      }
      case 18: {
        // Budget confirmation / adjustment — never terminate
        const vb17 = detectVerticalBudget(data.businessNiche || "");
        const isApproval = ["כן", "בסדר", "סבבה", "מסכים", "אוקיי", "בטח", "יאללה", "מעולה"].some(w => text.includes(w));
        let budget17 = parseNumber(text);

        if (!budget17 || budget17 < 100) {
          if (isApproval) {
            budget17 = vb17.recommended;
          } else {
            return NextResponse.json({
              response: `כמה בחודש אתה חושב להשקיע? (גם ₪${vb17.min.toLocaleString()} — אני אסביר מה אפשר לצפות ממנו)`,
              currentState,
              collectedData: data,
              isSimulation: true,
            });
          }
        }

        data.monthlyBudget = budget17;
        const avgJobVal17 = data.avgJobValue || 500;
        const closeRate17 = data.closeRate || 0.3;
        const paidCloseRate17 = Math.max(0.05, Math.min(closeRate17 * 0.8, 0.35));
        const expectedLeads17 = Math.max(1, Math.round((budget17 * vb17.lpCvr * 0.9) / vb17.cpc));
        const clientsPerMonth17 = Math.max(0.2, expectedLeads17 * paidCloseRate17);
        const breakEven17 = Math.ceil(budget17 / avgJobVal17);
        const paybackMonths17 = Math.ceil(breakEven17 / clientsPerMonth17);
        const paybackStr17 = paybackMonths17 === 1 ? "חודש אחד" : `${paybackMonths17} חודשים`;

        let budgetResponse: string;
        if (budget17 >= vb17.recommended) {
          data.feasibilityBranch = "A";
          budgetResponse = `מעולה — ₪${budget17.toLocaleString()} זה תקציב שעובד בתחום שלך. עם הקצב הזה, תחזיר את עלות הפרסום תוך כ-${paybackStr17} — וכל שאר הלקוחות רווח נקי.`;
        } else if (budget17 >= vb17.min) {
          data.feasibilityBranch = "B";
          budgetResponse = `אוקיי, ₪${budget17.toLocaleString()} — tight אבל אפשרי. תקבל פחות פניות, אז כל אחת חשובה. נתכנן קמפיין מאוד ממוקד.`;
        } else {
          data.feasibilityBranch = "B";
          budgetResponse = `הבנתי, ₪${budget17.toLocaleString()}. זה מתחת למינימום שאני ממליץ בתחום שלך (₪${vb17.min.toLocaleString()}), אבל בוא נצא לדרך — נתכנן קמפיין מאוד סלקטיבי ונבדוק אם זה מביא תוצאות.`;
        }

        data.turnIndex = 19;
        return NextResponse.json({
          response: `${budgetResponse}\n\n${TURN_QUESTIONS[19]}`,
          currentState,
          collectedData: data,
          isSimulation: true,
        });
      }
      case 19: {
        const hasAssets = !text.includes("אין") && !text.includes("לא") && text.length > 5;
        data.hasTrustAssets = hasAssets;
        if (!hasAssets) {
          data.turnIndex = 21; // skip review-quote question, go to capacity
          return NextResponse.json({
            response: `הבנתי — אין עדיין ביקורות. לא נורא, נבנה דף נחיתה חזק גם בלי זה, ואחרי שייצאו הלקוחות הראשונים מהקמפיין — נוסיף ביקורות ונשפר.\n\n${TURN_QUESTIONS[21]}`,
            currentState,
            collectedData: data,
            isSimulation: true,
          });
        }
        break;
      }
      case 20:
        data.reviewQuote = text;
        {
          const rating = text.match(/(\d[\d.]*)\s*(כוכב|★|\*)/);
          if (rating) data.starRating = rating[1];
        }
        break;
      case 21: {
        const booked = text.includes("עמוס") || text.includes("לא יכול") || text.includes("מלא");
        data.capacityAvailable = !booked;
        data.capacityUnit = text;
        if (booked) {
          return NextResponse.json({
            response: "מבין — אתה עמוס כרגע. זה בכלל סימן טוב.\nבוא נחזור לזה כשיש לך מקום לעוד לקוחות. אני כאן.",
            currentState: "COMPLETED",
            collectedData: data,
            isSimulation: true,
          });
        }
        break;
      }
      case 22:
        data.contactMethod = text;
        break;
      case 23: {
        data.phone = text;
        data.whatsappNumber = text;

        // All done — generate campaign
        const generated = generateMockCampaign(data);
        strategy = generated.strategy;
        copy = generated.copy;
        data.turnIndex = 24;

        return NextResponse.json({
          response: `מצוין! אספתי את כל הפרטים שצריך.\nבנינו עבורך תוכנית קמפיין מותאמת אישית — הכוללת דף נחיתה שמבוסס על כל מה שסיפרת לי.\nאתה יכול לראות את כל הפרטים בכרטיסייה.\n\nהאם הכל נראה לך טוב ואתה מאשר להמשיך לתשלום של 9.9 ש״ח?`,
          currentState: "REVIEWING",
          collectedData: data,
          strategy,
          copy,
          isSimulation: true,
        });
      }
    }

    // ── Advance to next turn ──────────────────────────────────────────────────
    const nextTurn = (data.turnIndex ?? 0) + 1;
    data.turnIndex = nextTurn;

    // Adapt location question (T4) based on service model
    if (nextTurn === 4 && data.serviceModel) {
      const locationQ: Record<string, string> = {
        field: "באילו ערים ושכונות ספציפיות אתה נותן שירות?\n(ככל שתפרט יותר, כך גוגל ידרג אותך טוב יותר)",
        location: "מה הכתובת המדויקת של העסק?",
        event: "לאילו אזורים אתה מגיע לאירועים? (לדוגמה: גוש דן, השרון)",
        remote: "אתה עובד עם לקוחות מכל הארץ, או מאזור מסוים בלבד?",
        mixed: "לאן אתה מגיע, ואיפה הסטודיו/הסדנה/המשרד שלך?",
      };
      response = locationQ[data.serviceModel] || TURN_QUESTIONS[4];
    } else {
      response = TURN_QUESTIONS[nextTurn] || "תודה! נמשיך לשלב הבא.";
    }
  } else if (currentState === "REVIEWING") {
    const approvals = ["כן", "מאשר", "סבבה", "אישור", "אוקיי", "תעלה", "יאללה", "yes", "ok", "approve"];
    const isApproved = approvals.some(w => text.toLowerCase().includes(w));

    if (isApproved) {
      nextState = "REVIEWING"; // stays REVIEWING until Ya'ad payment callback fires
      response = `מצוין — הכל נראה טוב.\n\nכדי להפעיל את הקמפיין ולהעלות את דף הנחיתה שלך, לחץ על כפתור **"🚀 לתשלום (9.9 ₪)"** שמופיע בצד ימין של המסך.\n\nזה מה שמתניע את הכל — החשבון, הקמפיין, והדף.`;
    } else {
      response = "הבנתי. אם תרצה לשנות משהו — תקציב, מיקוד, נוסח המודעה — פשוט תגיד לי. אם הכל בסדר, תגיד ״אישור״ כדי שנתקדם.";
    }
  } else if (currentState === "COMPLETED") {
    response = "הקמפיין כבר הוגדר והחשבון ממתין לך במייל. אם תרצה להקים קמפיין חדש, אני כאן.";
  }

  return NextResponse.json({
    response,
    currentState: nextState,
    collectedData: data,
    strategy,
    copy,
    isSimulation: true,
  });
}

// ── Mock campaign generator ───────────────────────────────────────────────────

function generateMockCampaign(data: CollectedData) {
  const niche = data.businessNiche || "";
  const location = data.targetLocation || "אזור המרכז";
  const budget = data.monthlyBudget || 1500;
  const dailyBudget = Math.round(budget / 30.4);
  const usp = data.usp || "";
  const urgency = data.urgencyLevel || "deliberate";

  const isPlumber = niche.includes("אינסטל") || niche.includes("שרברב") || niche.includes("נזיל");
  const isCosmetics = niche.includes("קוסמט") || niche.includes("יופי") || niche.includes("פנים");
  const isLawyer = niche.includes("עורך דין") || niche.includes("עו\"ד") || niche.includes("משפט");
  const isExterminator = niche.includes("מדביר") || niche.includes("הדבר");
  const isGardener = niche.includes("גנן") || niche.includes("גינ");
  const isTech = niche.includes("מחשב") || niche.includes("טכנאי");

  let keywords: string[] = [];
  let negativeKeywords: string[] = [];
  let headlines: string[] = [];
  let descriptions: string[] = [];
  let strategyRationale = "";
  let copywritingRationale = "";

  const genericNegatives = ["דרושים", "חינם", "קורס", "לימודים", "איך לעשות", "מדריך", "עבודה", "שכר", "יד שניה"];

  if (isPlumber) {
    keywords = ["אינסטלטור מומלץ", "תיקון נזילות", "פתיחת סתימות", "אינסטלטור 24 שעות", "מאתר נזילות"];
    negativeKeywords = [...genericNegatives, "קורס אינסטלציה", "איך לפתוח סתימה לבד", "עבודה כאינסטלטור"];
    headlines = ["אינסטלטור מוסמך 24/7", "הגעה תוך 20 דקות", "מאתר נזילות מקצועי", "תיקון סתימות במקום"];
    descriptions = [
      `צריך אינסטלטור דחוף? שירות מהיר ומקצועי 24 שעות ביממה ב${location}. התקשר עכשיו`,
      `תיקון נזילות וסתימות במחיר הוגן. ${usp || "שירות אמין ומוסמך"}. חייג כעת`,
    ];
    strategyRationale = "מיקוד בביטויי דחיפות כדי לתפוס לקוחות שצריכים עזרה מיידית. מילות שלילה מגנות על תקציב מחיפושי DIY.";
    copywritingRationale = "הקופי מדגיש מהירות הגעה ואמינות — הגורמים המכריעים בבחירת אינסטלטור.";
  } else if (isCosmetics) {
    keywords = ["טיפול פנים מקצועי", "קוסמטיקאית מומלצת", "טיפולי אקנה", "פילינג פנים", "אנטי אייג'ינג"];
    negativeKeywords = [...genericNegatives, "לימודי קוסמטיקה", "מכשיר למכירה", "מסיכה ביתית"];
    headlines = ["קוסמטיקאית מקצועית", "תוצאות מהטיפול הראשון", "פתרון לאקנה ועור בעייתי"];
    descriptions = [
      `טיפולי פנים מותאמים אישית ב${location}. ${usp || "תוצאות מוכחות"}. צרי קשר לייעוץ`,
      "קליניקה מקצועית לטיפולי אסתטיקה ויופי. שרייני תור עכשיו",
    ];
    strategyRationale = "מיקוד בטיפולים ספציפיים עם ערך גבוה. מילות שלילה מסננות שאינן לקוחות קליניקה.";
    copywritingRationale = "פנייה ממוקדת בשפה רכה ומזמינה המדגישה תוצאות.";
  } else if (isLawyer) {
    keywords = ["עורך דין מומלץ", "ייעוץ משפטי", "משרד עורכי דין", "עורך דין מקרקעין", "עורך דין משפחה"];
    negativeKeywords = [...genericNegatives, "לימודי משפטים", "סטאז'", "טופס חוזה חינם", "פסק דין לדוגמה"];
    headlines = ["משרד עורכי דין מוביל", "ייעוץ משפטי אישי", `עו\"ד מנוסה ב${location}`];
    descriptions = [
      `ניסיון רב בייצוג וליווי משפטי. ${usp || "הגנה מלאה על האינטרסים שלך"}. חייג`,
      "פגישת ייעוץ ראשונית בדיסקרטיות מלאה. צריך ליווי משפטי? אנו כאן",
    ];
    strategyRationale = "ביטויים ממוקדי כוונה גבוהה. מילות שלילה מבדלות ממחפשי פתרונות חינמיים.";
    copywritingRationale = "הקופי מקרין כוח, סמכותיות ודיסקרטיות.";
  } else if (isExterminator) {
    keywords = ["מדביר מוסמך", "הדברת עכברים", "הדברת חרקים", "הדברת ג'וקים", "מדביר מהיר"];
    negativeKeywords = [...genericNegatives, "הדברה ביתית", "איך להדביר לבד", "קורס הדברה"];
    headlines = ["מדביר מוסמך ומורשה", "הגעה תוך שעתיים", "אחריות 3 חודשים"];
    descriptions = [
      `הדברה מקצועית ב${location}. בטוח לילדים ולחיות מחמד. ${usp || "אחריות מלאה"}. התקשר`,
      "מדביר עם רישיון ממשרד החקלאות. פתרון מהיר ויעיל. חייג עכשיו",
    ];
    strategyRationale = "ביטויי בעיה ספציפיים + דחיפות. מילות שלילה מסננות DIY.";
    copywritingRationale = "הדגשת בטיחות (ילדים/חיות) ורישוי — החששות המרכזיים של הלקוח.";
  } else if (isGardener) {
    keywords = ["גנן מקצועי", "עיצוב גינה", "תכנון גינה", "גנן מומלץ", "טיפוח גינה"];
    negativeKeywords = [...genericNegatives, "לימודי גינון", "כלי גינון", "זרעים"];
    headlines = ["גנן ומעצב גינות", "תכנון וביצוע מלא", `גנן מנוסה ב${location}`];
    descriptions = [
      `עיצוב ובניית גינות חדשות מאפס. ${usp || "20 שנות ניסיון ואחריות על עבודה"}. ביקור ראשוני חינם`,
      "תחזוקה שוטפת, השקיה, גיזום ועיצוב. קבל הצעת מחיר חינם",
    ];
    strategyRationale = "ביטויי כוונה לאיכות ועיצוב. מיקוד בלקוחות שמחפשים פרויקט ולא DIY.";
    copywritingRationale = "הדגשת ותק ואחריות לשנה — חיוניים לפרויקטים יקרים.";
  } else if (isTech) {
    keywords = ["טכנאי מחשבים", "תיקון מחשב", "שחזור נתונים", "IT לעסקים", "תיקון מחשב נייד"];
    negativeKeywords = [...genericNegatives, "קורס מחשבים", "הורדת תוכנה", "מחשב יד שניה"];
    headlines = ["טכנאי מחשבים מומחה", "הגעה תוך שעה לעסקים", "שחזור נתונים מקצועי"];
    descriptions = [
      `תיקון מחשבים לעסקים ויחידים ב${location}. ${usp || "15 שנות ניסיון ואחריות 30 יום"}. חייג`,
      "שחזור נתונים, נקיית וירוסים, שדרוגים. אבחון ראשוני חינם",
    ];
    strategyRationale = "ביטויי דחיפות עסקיים. מיקוד בתיקון ושחזור ולא בלימוד.";
    copywritingRationale = "הדגשת מהירות ואחריות — חיוניים ללקוחות עסקיים.";
  } else {
    keywords = [`${niche} מומלץ`, `${niche} מקצועי`, `${niche} ב${location}`, `שירותי ${niche}`, `${niche} קרוב אלי`];
    negativeKeywords = [...genericNegatives, `לימודי ${niche}`, `קורס ${niche}`, `${niche} יד שניה`];
    headlines = [`${niche} מקצועי`, `שירות אמין ב${location}`, "הצעת מחיר חינם", `${usp ? usp.slice(0, 28) : "יחס אישי ומחיר הוגן"}`];
    descriptions = [
      `מחפש מומחה בתחום ${niche} ב${location}? שירות מקצועי ואיכותי. ${usp || ""}. התקשר עכשיו`,
      `שירותי ${niche} ברמה הגבוהה ביותר. צוות מנוסה לצידך. לפרטים לחץ כאן`,
    ];
    strategyRationale = `קמפיין ממוקד בביטויי כוונה ב${location}. מילות שלילה מגנות על התקציב מחיפושים לא רלוונטיים.`;
    copywritingRationale = "מודעות ברורות וישירות המדגישות מומחיות ואזור גיאוגרפי.";
  }

  const biddingStrategy = urgency === "urgent"
    ? "Target Impression Share (Top) — לקוחות בחירום לא גוללים מטה"
    : "tCPA — ממטב להמרות לאחר צבירת 15+ המרות";

  return {
    strategy: {
      targetLocation: location,
      suggestedDailyBudget: dailyBudget,
      keywords,
      negativeKeywords,
      biddingStrategy,
      strategyRationale,
    },
    copy: {
      headlines: headlines.slice(0, 5),
      descriptions: descriptions.slice(0, 3),
      callToAction: data.contactMethod?.includes("וואטסאפ") ? "שלח וואטסאפ" : "התקשר עכשיו",
      copywritingRationale,
    },
  };
}

// ── Azure OpenAI handler ──────────────────────────────────────────────────────

async function handleAzureOpenAI(
  messages: Message[],
  currentState: string,
  collectedData: CollectedData,
  apiKey: string,
  endpoint: string
) {
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-5.4-mini";
  const url = `${endpoint}/chat/completions?api-version=2024-05-01-preview`;

  if (currentState === "STRATEGIZING") {
    const brief = `
Business Details:
Niche: ${collectedData.businessNiche}
Business Name: ${collectedData.businessName}
Owner: ${collectedData.ownerName}
Service Model: ${collectedData.serviceModel}
Location: ${collectedData.targetLocation}
Specific Cities: ${collectedData.specificCities}
Ideal Client Fear: ${collectedData.idealClientFear}
FAQ Questions: ${collectedData.faqQuestions}
USP: ${collectedData.usp}
Years in Field: ${collectedData.yearsInField}
Guarantee: ${collectedData.guarantee}
License: ${collectedData.license}
Exclusions: ${collectedData.exclusions}
Urgency: ${collectedData.urgencyLevel}
Response Time: ${collectedData.responseTime}
Pricing Notes: ${collectedData.pricingNotes}
Revenue Model: ${collectedData.revenueModel}
Avg Job Value: ${collectedData.avgJobValue}
Close Rate: ${collectedData.closeRate}
Monthly Budget: ${collectedData.monthlyBudget}
Feasibility Branch: ${collectedData.feasibilityBranch}
No Digital Footprint: ${collectedData.noDigitalFootprint}
Has Google Business: ${collectedData.hasGoogleBusiness}
Review Quote: ${collectedData.reviewQuote}
Star Rating: ${collectedData.starRating}
Contact Method: ${collectedData.contactMethod}
Phone: ${collectedData.phone}
`;

    const [drorRes, tamarRes] = await Promise.all([
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": apiKey },
        body: JSON.stringify({
          model: deploymentName,
          messages: [{ role: "system", content: DROR_SYSTEM_PROMPT }, { role: "user", content: brief }],
          response_format: { type: "json_object" },
        }),
      }).then(r => r.json()),
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": apiKey },
        body: JSON.stringify({
          model: deploymentName,
          messages: [{ role: "system", content: TAMAR_SYSTEM_PROMPT }, { role: "user", content: brief }],
          response_format: { type: "json_object" },
        }),
      }).then(r => r.json()),
    ]);

    let drorData: Record<string, any>;
    let tamarData: Record<string, any>;
    try {
      drorData = JSON.parse(drorRes.choices[0].message.content);
      tamarData = JSON.parse(tamarRes.choices[0].message.content);
    } catch {
      const fallback = generateFallbackStrategyAndCopy(collectedData);
      drorData = fallback.strategy as unknown as Record<string, any>;
      tamarData = fallback.copy as unknown as Record<string, any>;
    }

    const presentPrompt = `
Present this Google Ads campaign plan to the business owner in warm, expert Sabra Hebrew.
The strategy panel is visible on screen — do NOT repeat every detail. Just highlight 1-2 key decisions, then confirm the campaign is ready.

Strategy: Location ${drorData.targetLocation}, daily budget ₪${drorData.suggestedDailyBudget}, bidding: ${drorData.biddingStrategy}
Keywords: ${drorData.keywords?.join(", ")}
Rationale: ${drorData.strategyRationale}

Ad Copy: ${tamarData.headlines?.join(" | ")}
Descriptions: ${tamarData.descriptions?.join(" | ")}

IMPORTANT: End your message with EXACTLY this sentence (no variation):
"אם הכל נראה טוב — כתוב ״אישור״ ואנחנו מתניעים."
`;

    const adamRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({
        model: deploymentName,
        messages: [{ role: "system", content: ADAM_SYSTEM_PROMPT }, { role: "user", content: presentPrompt }],
        response_format: { type: "json_object" },
      }),
    }).then(r => r.json());

    const adamData = JSON.parse(adamRes.choices[0].message.content);

    return NextResponse.json({
      response: adamData.response,
      currentState: "REVIEWING",
      collectedData,
      strategy: drorData,
      copy: tamarData,
      isSimulation: false,
    });
  }

  // Pre-compute budget numbers server-side so the LLM never does math.
  // Always inject once avgJobValue is known — stays in the prompt even after monthlyBudget is set
  // so the LLM can't re-derive different numbers on follow-up turns.
  let budgetHint = "";
  if (collectedData.avgJobValue) {
    const vbHint = detectVerticalBudget(collectedData.businessNiche || "");
    let lpCvrHint = vbHint.lpCvr;
    const rc = collectedData.reviewCount || 0;
    const sr = parseFloat(collectedData.starRating || "0");
    if (rc >= 50 && sr >= 4.5) lpCvrHint = Math.min(lpCvrHint * 1.25, 0.12);
    else if (rc >= 10 && sr >= 4.0) lpCvrHint = Math.min(lpCvrHint * 1.10, 0.12);
    else if (rc < 5) lpCvrHint = lpCvrHint * 0.85;

    const hintCloseRate = collectedData.closeRate || getClusterCloseRateDefault(collectedData.businessNiche || "");
    const citySeed = (collectedData.specificCities || collectedData.targetLocation || "ישראל").split(/[,،\n]/)[0].trim();
    const seedKeywords = [
      collectedData.businessNiche || "",
      citySeed ? `${collectedData.businessNiche || ""} ${citySeed}` : "",
      collectedData.idealClientFear ? `${collectedData.businessNiche || ""} ${collectedData.idealClientFear}` : "",
    ].filter(Boolean);
    const liveCpc = await getEstimatedCPC(seedKeywords, citySeed);
    const effectiveCpc = liveCpc && liveCpc > 0 ? liveCpc : vbHint.cpc;
    const cpcLabel = liveCpc
      ? `Live Keyword Planner CPC ≈ ₪${liveCpc.toFixed(2)}`
      : `Cluster CPC ≈ ₪${vbHint.cpc}`;

    const hintLeads = Math.max(1, Math.round((vbHint.recommended * lpCvrHint) / effectiveCpc));
    const hintPaidClose = Math.max(0.05, Math.min(hintCloseRate * 0.8, 0.35));
    const hintClients = Math.max(0.2, hintLeads * hintPaidClose);
    const hintBreakEven = Math.ceil(vbHint.recommended / collectedData.avgJobValue);
    const hintPayback = Math.ceil(hintBreakEven / hintClients);
    const hintRatio = Math.round(1 / hintCloseRate);

    budgetHint = `\n\n[SYSTEM PRE-COMPUTED — use these exact numbers, do not recalculate]:
Vertical: ${collectedData.businessNiche} | Recommended: ₪${vbHint.recommended} | Min: ₪${vbHint.min}
${cpcLabel}
At ₪${vbHint.recommended}/month: expectedLeads = ${hintLeads}, clientsPerMonth ≈ ${hintClients.toFixed(1)}, paybackMonths = ${hintPayback}, closeRatioDisplay = "1 ל-${hintRatio}"
Present ₪${vbHint.recommended} as: "בסביבות ${hintLeads} פניות בחודש. עם שיעור סגירה של 1 ל-${hintRatio}, זה אומר כ-${hintClients < 1 ? "פחות מלקוח אחד" : hintClients.toFixed(1) + " לקוחות"} בחודש — ותחזיר את ההשקעה תוך כ-${hintPayback === 1 ? "חודש אחד" : hintPayback + " חודשים"}. כל שאר הלקוחות — רווח נקי."`;

    // If user already chose a different budget, pre-compute their numbers too
    const chosenBudget = collectedData.monthlyBudget;
    if (chosenBudget && chosenBudget !== vbHint.recommended) {
      const chosenLeads = Math.max(1, Math.round((chosenBudget * lpCvrHint) / effectiveCpc));
      const chosenClients = Math.max(0.2, chosenLeads * hintPaidClose);
      const chosenBreakEven = Math.ceil(chosenBudget / collectedData.avgJobValue);
      const chosenPayback = Math.ceil(chosenBreakEven / chosenClients);
      budgetHint += `\nAt ₪${chosenBudget}/month (user's choice): chosenLeads = ${chosenLeads}, chosenClients ≈ ${chosenClients.toFixed(1)}, chosenPayback = ${chosenPayback} months
Present ₪${chosenBudget} as: "עם ₪${chosenBudget} תקבל בסביבות ${chosenLeads} פניות בחודש — כ-${chosenClients < 1 ? "פחות מלקוח אחד" : chosenClients.toFixed(1) + " לקוחות"} בחודש, החזר תוך כ-${chosenPayback === 1 ? "חודש אחד" : chosenPayback + " חודשים"}."`;
    }
  }

  // The opening message in page.tsx already covers T1 (business type + top earner).
  // If businessNiche isn't stored yet, extract it from the first user message so the
  // LLM doesn't re-ask T1 on the very first reply.
  const enrichedData = { ...collectedData };
  if (!enrichedData.businessNiche) {
    const firstUserMsg = messages.find(m => m.role === "user");
    if (firstUserMsg && firstUserMsg.content.length > 3) {
      enrichedData.businessNiche = firstUserMsg.content;
    }
  }
  if (!enrichedData.serviceModel && enrichedData.businessNiche) {
    const inferredServiceModel = inferServiceModel(enrichedData.businessNiche);
    if (inferredServiceModel) enrichedData.serviceModel = inferredServiceModel;
  }

  // Build a "do not re-ask" guard from whatever collectedData already has
  const alreadyCollected: string[] = [];
  if (enrichedData.businessNiche) alreadyCollected.push(`businessNiche = "${enrichedData.businessNiche}"`);
  if (enrichedData.ownerName) alreadyCollected.push(`ownerName = "${enrichedData.ownerName}"`);
  if (enrichedData.businessName) alreadyCollected.push(`businessName = "${enrichedData.businessName}"`);
  if (enrichedData.serviceModel) alreadyCollected.push(`serviceModel = "${enrichedData.serviceModel}"`);
  if (enrichedData.targetLocation) alreadyCollected.push(`targetLocation = "${enrichedData.targetLocation}"`);
  if (enrichedData.avgJobValue) alreadyCollected.push(`avgJobValue = ₪${enrichedData.avgJobValue}`);
  if (enrichedData.closeRate) alreadyCollected.push(`closeRate = ${Math.round(enrichedData.closeRate * 100)}%`);
  if (enrichedData.phone) alreadyCollected.push(`phone = "${enrichedData.phone}"`);
  if (enrichedData.starRating) alreadyCollected.push(`starRating = ${enrichedData.starRating}`);
  if (enrichedData.reviewCount) alreadyCollected.push(`reviewCount = ${enrichedData.reviewCount}`);
  if (enrichedData.monthlyBudget) alreadyCollected.push(`monthlyBudget = ₪${enrichedData.monthlyBudget}`);
  if (enrichedData.specificCities) alreadyCollected.push(`specificCities = "${enrichedData.specificCities}"`);
  if (enrichedData.usp) alreadyCollected.push(`usp = "${enrichedData.usp}"`);
  if (enrichedData.email) alreadyCollected.push(`email = "${enrichedData.email}"`);
  if (enrichedData.trustAssetUrls?.length) alreadyCollected.push(`uploadedImages = ${enrichedData.trustAssetUrls.length} images uploaded`);
  if (enrichedData.profilePhotoUrl) alreadyCollected.push(`profilePhotoUrl = uploaded`);
  const alreadyGuard = alreadyCollected.length > 0
    ? `\n\n[ALREADY COLLECTED — do NOT ask about these again: ${alreadyCollected.join(", ")}]`
    : "";

  const apiMessages = [
    { role: "system", content: ADAM_SYSTEM_PROMPT + budgetHint + alreadyGuard },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    body: JSON.stringify({ model: deploymentName, messages: apiMessages, response_format: { type: "json_object" } }),
  });

  const data = await res.json();
  const content = JSON.parse(data.choices[0].message.content);

  return NextResponse.json({ ...content, isSimulation: false });
}

// ── Main route ────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body: RequestData = await req.json();
    const { messages, currentState, collectedData } = body;
    const lastUserMessage = messages[messages.length - 1]?.content || "";

    const apiKey = process.env.AZURE_OPENAI_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;

    if (apiKey && endpoint) {
      return await handleAzureOpenAI(messages, currentState, collectedData, apiKey, endpoint);
    }

    return handleSimulation(lastUserMessage, currentState, collectedData);
  } catch (error: any) {
    console.error("Bot API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
