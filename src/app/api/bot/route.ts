import { NextResponse } from "next/server";
import { ADAM_SYSTEM_PROMPT, DROR_SYSTEM_PROMPT, TAMAR_SYSTEM_PROMPT, CollectedData } from "@/lib/bot/prompts";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestData {
  messages: Message[];
  currentState: "DIAGNOSING" | "STRATEGIZING" | "REVIEWING" | "COMPLETED";
  collectedData: CollectedData;
}

// ── CPC lookup ────────────────────────────────────────────────────────────────

const VERTICAL_CPC: Array<{ keywords: string[]; cpc: number }> = [
  { keywords: ["עורך דין נזיקין", "נזיקין"], cpc: 35 },
  { keywords: ["עורך דין", "עו\"ד", "משפט"], cpc: 28 },
  { keywords: ["רופא שיניים", "שיניים", "אורתודונט"], cpc: 20 },
  { keywords: ["צלם", "צלמת", "צילום"], cpc: 20 },
  { keywords: ["מנעולן", "מנעול"], cpc: 20 },
  { keywords: ["אינסטלטור", "שרברב", "נזיל"], cpc: 15 },
  { keywords: ["קוסמטיק", "אסתטיק"], cpc: 14 },
  { keywords: ["חשמלאי", "חשמל"], cpc: 14 },
  { keywords: ["גנן", "גינה", "גינון"], cpc: 12 },
  { keywords: ["שיפוצניק", "שיפוץ"], cpc: 11 },
  { keywords: ["מדביר", "הדבר", "מזיק"], cpc: 10 },
  { keywords: ["מכונאי", "מוסך", "רכב תיקון"], cpc: 10 },
  { keywords: ["פסיכולוג", "קואצ'ר", "טיפול נפש"], cpc: 13 },
  { keywords: ["רואה חשבון", "חשבונאי", "ביקורת"], cpc: 15 },
  { keywords: ["מורה פרטי", "שיעורים פרטי", "מורה"], cpc: 8 },
  { keywords: ["מאמן כושר", "כושר", "אישי"], cpc: 8 },
  { keywords: ["טכנאי מחשב", "מחשב", "IT"], cpc: 9 },
];

function detectCPC(niche: string): number {
  const lower = niche.toLowerCase();
  for (const entry of VERTICAL_CPC) {
    if (entry.keywords.some(k => lower.includes(k))) return entry.cpc;
  }
  return 15;
}

function parseCloseRate(text: string): number {
  // "3 מתוך 10" or "30%" or "שלושה"
  const pct = text.match(/(\d+)\s*%/);
  if (pct) return parseInt(pct[1]) / 100;
  const fraction = text.match(/(\d+)\s*מתוך\s*(\d+)/);
  if (fraction) return parseInt(fraction[1]) / parseInt(fraction[2]);
  const single = text.match(/^(\d+)$/);
  if (single) {
    const n = parseInt(single[1]);
    return n > 10 ? n / 100 : n / 10;
  }
  return 0.3; // fallback
}

function parseNumber(text: string): number | null {
  const cleaned = text.replace(/[,\s]/g, "").replace(/[^0-9]/g, "");
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : n;
}

function computeExpectedClients(budget: number, closeRate: number, cpc: number): number {
  return (budget * 0.10 * closeRate) / cpc;
}

// ── Turn questions for simulation ─────────────────────────────────────────────

const TURN_QUESTIONS: Record<number, string> = {
  0: "יאללה, בוא נתחיל — ספר לי קצת על העסק שלך. ומכל מה שאתה עושה, מה הכי מכניס לך כסף?",
  1: "ואיך קוראים לעסק? ומה שמך הפרטי?\n(אם אין שם עסק — השם שלך הוא המותג)",
  2: "ומלבד השירות הראשי — מה עוד אתה מציע? תן לי 3-5 שירותים נוספים שלקוחות פונים אליך בשבילם.",
  3: "יופי. ואיך זה עובד בדרך כלל — אתה מגיע אל הלקוח, הלקוח מגיע אליך, שניהם, או שאתה עובד על אירועים / מרחוק?",
  4: "לאילו ערים ושכונות ספציפיות אתה מגיע? (ככל שתפרט יותר, כך גוגל ידרג אותך טוב יותר)",
  5: "תחשוב על לקוח טוב שפנה אליך לאחרונה — מי זה?\nומה הכי הטריד אותו רגע לפני שהרים אליך טלפון?",
  6: "מה הם שואלים אותך הכי הרבה ברגע שמתקשרים? תן לי 2-3 שאלות שחוזרות.",
  7: "ובכנות גמורה — למה שיבחרו דווקא בך, ולא במישהו אחר שעושה אותו דבר?",
  8: "כמה שנים אתה בתחום? ויש לך אחריות על העבודה — לכמה זמן, ומה קורה אם לקוח לא מרוצה?",
  9: "התחום שלך דורש רישוי רשמי כלשהו?\nלמשל רישיון ממשרד ממשלתי, חברות בלשכה מקצועית, או תעודה מוכרת?\nאם כן — מה זה ומה המספר? אם לא — פשוט תגיד ״לא״.",
  10: "יש סוגי פניות שאתה מעדיף לא לקבל?\nשירות שאתה לא מציע, סוג לקוח שאתה לא עובד איתו, או אזורים שאתה לא מגיע אליהם?",
  11: "והלקוחות שלך — רובם צריכים אותך כאן ועכשיו,\nזה משהו שהם בודקים לפני שמחליטים,\nאו שהם מתכננים מראש שבועות וחודשים קדימה?",
  12: "אתה נותן הצעת מחיר חינם לפני שמתחילים?\nיש דמי הגעה אם לא נסגרת עסקה?",
  13: "עיקר ההכנסה שלך מגיעה מ —\nעבודה חד-פעמית לכל לקוח, חוזה שוטף/חוזר, או שניהם?",
  14: "שאלה על כסף, רק כדי שנשמור על התקציב שלך —\nכמה שווה לך לקוח אחד בממוצע בעבודה הראשונה, בגדול?",
  15: "יופי. עכשיו בוא נבדוק כמה קל לך לסגור אותו.\nתחשוב על עשרה אנשים שמתקשרים אליך —\nכמה מהם, בסוף, הופכים ללקוחות שמשלמים?\n(כולל כל השלבים — מהשיחה הראשונה עד סגירה בפועל)",
  16: "וכמה חשבת לשים על פרסום בחודש?",
  17: "ורגע אחורה — הלקוחות שמגיעים אליך היום, מאיפה הם בעצם מגיעים?\nמהמלצות, מפה לאוזן, מגוגל, מאינסטגרם?\n\nויש לך פרופיל גוגל עסקי פעיל עם ביקורות?",
  18: "נשמע שאתה עושה עבודה טובה — אז בטוח יש לך לקוחות מרוצים.\nיש לך ביקורות או המלצות איפשהו?\nבגוגל, בוואטסאפ, צילומי מסך — כל דבר.\nואם יש לך גם תמונות מהעבודה — זה ממש זהב בשבילנו.",
  19: "מעולה. תביא לי ביקורת אחת או שתיים מגוגל שאתה גאה בהן —\nהעתק-הדבק בדיוק מה שהלקוח כתב.\nומה הדירוג שלך בגוגל? (לדוגמה: 4.9 כוכבים, 64 ביקורות)",
  20: "ובאמת — אם מחר יתחילו להגיע אליך עוד פניות, אתה יכול לקחת אותן עכשיו?\nכמה זה בערך — פניות בשבוע, פרויקטים בחודש, או תאריכים בשנה?",
  21: "ואחרון — איך הכי נוח לך שיתפסו אותך?\nשיתקשרו, וואטסאפ, שימלאו טופס, או שיכתבו באינסטגרם?",
  22: "מה המספר שיופיע על כפתור ״התקשר עכשיו״?\nומה מספר הוואטסאפ?\n(יכולים להיות זהים — רק תגיד לי)",
};

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
        break;
      case 1:
        data.businessName = text;
        break;
      case 2:
        data.secondaryServices = text;
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
        const budget = parseNumber(text);
        if (!budget || budget < 100) {
          response = "אני צריך מספר תקציב חודשי תקין (למשל: 2000). כמה חשבת לשים על פרסום בחודש?";
          return NextResponse.json({ response, currentState, collectedData: data, isSimulation: true });
        }
        data.monthlyBudget = budget;

        const cpc = detectCPC(data.businessNiche || "");
        const closeRate = data.closeRate ?? 0.3;
        const expected = computeExpectedClients(budget, closeRate, cpc);
        const avgJobValue = data.avgJobValue ?? 500;
        const closingsNeeded = Math.ceil(1 / closeRate);

        if (expected < 1) {
          data.feasibilityBranch = "C";
          data.turnIndex = 99; // mark as declined
          return NextResponse.json({
            response: `תקשיב, אני רוצה להיות איתך לגמרי ישר, כי זה מה שמגיע לך.\nעם ${budget} שקל בחודש, ובתחום שלך שבו כל קליק עולה בערך ${cpc} שקל,\nהמספרים פשוט לא מסתדרים.\nבקצב הזה, גם אם תסגור כמעט כל פנייה שנכנסת אליך,\nהתקציב לא יספיק כדי להביא לך אפילו לקוח אחד בחודש.\nואני לא מוכן לקחת ממך כסף על קמפיין שאני כבר יודע מראש שלא יחזיר לך אותו —\nזה פשוט לא הוגן כלפיך.\nאז בוא נעשה ככה: ביום שתוכל להשקיע קצת יותר, אני כאן,\nונבנה לך משהו שבאמת יעבוד.\nבינתיים — עדיף שהכסף יישאר אצלך בכיס.`,
            currentState: "COMPLETED",
            collectedData: data,
            isSimulation: true,
          });
        }

        data.feasibilityBranch = expected >= 3 ? "A" : "B";

        if (expected >= 3) {
          response = `מעולה. עם ${budget} שקל בחודש, ולקוח ששווה לך ${avgJobValue.toLocaleString()} שקל —\nמספיק שתסגור פנייה אחת מכל ${closingsNeeded} כדי להחזיר את כל עלות הפרסום.\nוזה לגמרי בהישג יד. בוא נמשיך.\n\n`;
        } else {
          response = `אוקיי, בוא נדבר רגע בכנות.\nעם ${budget} שקל בחודש, כדי שזה ישתלם לך תצטרך לסגור בערך פנייה אחת מכל ${closingsNeeded}.\nאפשרי לגמרי — אבל זה אומר שאין לך הרבה מקום לטעות, כל פנייה כאן חשובה.\n\n`;
        }

        data.turnIndex = 17;
        response += TURN_QUESTIONS[17];
        return NextResponse.json({ response, currentState, collectedData: data, isSimulation: true });
      }
      case 17: {
        const hasGoogle = text.includes("כן") || text.includes("יש") || text.includes("פרופיל");
        data.hasGoogleBusiness = hasGoogle;
        data.noDigitalFootprint = !hasGoogle;
        break;
      }
      case 18: {
        const hasAssets = !text.includes("אין") && !text.includes("לא") && text.length > 5;
        data.hasTrustAssets = hasAssets;
        if (!hasAssets) {
          return NextResponse.json({
            response: "הבנתי. בלי ביקורות ותמונות, הדף לא יהיה אפקטיבי — לקוחות ישראלים לא ממירים בלי הוכחות.\nבוא תאסוף 2-3 ביקורות מלקוחות מרוצים ותחזור אלי — אני כאן.",
            currentState: "COMPLETED",
            collectedData: data,
            isSimulation: true,
          });
        }
        break;
      }
      case 19:
        data.reviewQuote = text;
        {
          const rating = text.match(/(\d[\d.]*)\s*(כוכב|★|\*)/);
          if (rating) data.starRating = rating[1];
        }
        break;
      case 20: {
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
      case 21:
        data.contactMethod = text;
        break;
      case 22: {
        data.phone = text;
        data.whatsappNumber = text;

        // All done — generate campaign
        const generated = generateMockCampaign(data);
        strategy = generated.strategy;
        copy = generated.copy;
        data.turnIndex = 23;

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
        field: "לאילו ערים ושכונות ספציפיות אתה מגיע?\n(ככל שתפרט יותר, כך גוגל ידרג אותך טוב יותר)",
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
      nextState = "COMPLETED";
      response = `מזל טוב! הקמפיין שלך מוכן לשיגור!\n1. יצרתי עבורך חשבון מפרסם חדש ב-Google Ads המשויך ל-MCC של WAO.\n2. הגדרתי את בונוס השותפים: קבל $500 החזר מול הוצאה של $500.\n3. שלחתי לך הזמנת ניהול ישירות למייל.\n\nהקמפיין יתחיל לרוץ ברגע שתאשר את הזמנת הניהול ותגדיר אמצעי תשלום. בהצלחה!`;
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
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "o4-mini";
  const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`;

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
          messages: [{ role: "system", content: DROR_SYSTEM_PROMPT }, { role: "user", content: brief }],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
      }).then(r => r.json()),
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": apiKey },
        body: JSON.stringify({
          messages: [{ role: "system", content: TAMAR_SYSTEM_PROMPT }, { role: "user", content: brief }],
          response_format: { type: "json_object" },
          temperature: 0.5,
        }),
      }).then(r => r.json()),
    ]);

    const drorData = JSON.parse(drorRes.choices[0].message.content);
    const tamarData = JSON.parse(tamarRes.choices[0].message.content);

    const presentPrompt = `
Present this Google Ads campaign plan to the business owner in warm, expert Sabra Hebrew.
Reference what they see in the panel on screen. Ask for approval to proceed.

Strategy: Location ${drorData.targetLocation}, daily budget ₪${drorData.suggestedDailyBudget}, bidding: ${drorData.biddingStrategy}
Keywords: ${drorData.keywords?.join(", ")}
Rationale: ${drorData.strategyRationale}

Ad Copy: ${tamarData.headlines?.join(" | ")}
Descriptions: ${tamarData.descriptions?.join(" | ")}
`;

    const adamRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({
        messages: [{ role: "system", content: ADAM_SYSTEM_PROMPT }, { role: "user", content: presentPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.5,
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

  const apiMessages = [
    { role: "system", content: ADAM_SYSTEM_PROMPT },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    body: JSON.stringify({ messages: apiMessages, response_format: { type: "json_object" }, temperature: 0.7 }),
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
