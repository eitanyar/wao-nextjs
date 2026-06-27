import { NextResponse } from "next/server";
import { ADAM_SYSTEM_PROMPT, DROR_SYSTEM_PROMPT, TAMAR_SYSTEM_PROMPT } from "@/lib/bot/prompts";

// Simple state type
interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestData {
  messages: Message[];
  currentState: "DIAGNOSING" | "STRATEGIZING" | "REVIEWING" | "COMPLETED";
  collectedData: {
    businessNiche?: string;
    targetLocation?: string;
    monthlyBudget?: number;
    usp?: string;
    hasTrustAssets?: boolean;
  };
}

export async function POST(req: Request) {
  try {
    const body: RequestData = await req.json();
    const { messages, currentState, collectedData } = body;
    const lastUserMessage = messages[messages.length - 1]?.content || "";

    const apiKey = process.env.AZURE_OPENAI_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;

    // 1. If Azure OpenAI credentials are configured, we can call Azure OpenAI
    if (apiKey && endpoint) {
      // Real API Mode
      return await handleAzureOpenAI(messages, currentState, collectedData, apiKey, endpoint);
    }

    // 2. Fallback Mode: Highly realistic Hebrew simulation
    return handleSimulation(lastUserMessage, currentState, collectedData);
  } catch (error: any) {
    console.error("Error in bot API route:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

/**
 * Handle live API calls using Azure OpenAI
 */
async function handleAzureOpenAI(
  messages: Message[],
  currentState: string,
  collectedData: any,
  apiKey: string,
  endpoint: string
) {
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "o4-mini";
  const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`;

  // We construct the prompt based on state
  let systemPrompt = ADAM_SYSTEM_PROMPT;
  let responseFormat = { type: "json_object" };

  if (currentState === "STRATEGIZING") {
    // If we need to call Dror and Tamar, we do two parallel runs
    const drorPromise = fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({
        messages: [
          { role: "system", content: DROR_SYSTEM_PROMPT },
          { role: "user", content: `Business Details:\nNiche: ${collectedData.businessNiche}\nLocation: ${collectedData.targetLocation}\nBudget Limit: ${collectedData.monthlyBudget}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      })
    }).then(res => res.json());

    const tamarPromise = fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({
        messages: [
          { role: "system", content: TAMAR_SYSTEM_PROMPT },
          { role: "user", content: `Business Details:\nNiche: ${collectedData.businessNiche}\nLocation: ${collectedData.targetLocation}\nBudget Limit: ${collectedData.monthlyBudget}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5
      })
    }).then(res => res.json());

    const [drorRes, tamarRes] = await Promise.all([drorPromise, tamarPromise]);

    const drorData = JSON.parse(drorRes.choices[0].message.content);
    const tamarData = JSON.parse(tamarRes.choices[0].message.content);

    // Now call Adam to present the strategy
    const adamReviewPrompt = `
You are Adam. Present the following Google Ads strategy and ad copy to the user in a warm, expert Sabra Hebrew message.
Refer to the ad preview and settings card they can see on the screen.
Ask for their approval to proceed with account creation and campaign setup.

### Strategy Details:
- Location: ${drorData.targetLocation}
- Daily Budget: ${drorData.suggestedDailyBudget} ILS
- Keywords: ${drorData.keywords.join(", ")}
- Negatives: ${drorData.negativeKeywords.join(", ")}
- Strategy Explanation: ${drorData.strategyRationale}

### Ad Copy:
- Headlines: ${tamarData.headlines.join(" | ")}
- Descriptions: ${tamarData.descriptions.join(" | ")}
- Copy Rationale: ${tamarData.copywritingRationale}
`;

    const adamRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({
        messages: [
          { role: "system", content: ADAM_SYSTEM_PROMPT },
          { role: "user", content: adamReviewPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5
      })
    }).then(res => res.json());

    const adamData = JSON.parse(adamRes.choices[0].message.content);

    return NextResponse.json({
      response: adamData.response,
      currentState: "REVIEWING",
      collectedData,
      strategy: drorData,
      copy: tamarData,
      isSimulation: false
    });
  }

  // General conversation flow (DIAGNOSING or COMPLETED)
  const apiMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content }))
  ];

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    body: JSON.stringify({
      messages: apiMessages,
      response_format: responseFormat,
      temperature: 0.7
    })
  });

  const data = await response.json();
  const content = JSON.parse(data.choices[0].message.content);

  return NextResponse.json({
    ...content,
    isSimulation: false
  });
}

/**
 * Handle dynamic simulation in Hebrew when no API key is set
 */
function handleSimulation(lastUserMessage: string, currentState: string, collectedData: any) {
  let response = "";
  let nextState = currentState;
  const updatedData = { ...collectedData };
  let strategy = null;
  let copy = null;

  // Normalization for simple Hebrew rule check
  const text = lastUserMessage.trim();

  if (currentState === "DIAGNOSING") {
    if (!updatedData.businessNiche) {
      if (text.length > 2) {
        updatedData.businessNiche = text;
        response = `מעולה, רשמתי לי: "${text}". עכשיו, מהו אזור השירות של העסק? למשל, האם אתה מציע שירות בכל הארץ, באזור המרכז בלבד, או ברדיוס מוגדר סביב עיר מסוימת?`;
      } else {
        response = `היי! אני אדם, מנהל ה-Google Ads הדיגיטלי שלך. בוא נבנה לך קמפיין מנצח שמביא לקוחות משלמים. בשלב ראשון, ספר לי בבקשה - מה העסק שלך או איזה שירות נרצה לקדם?`;
      }
    } else if (!updatedData.targetLocation) {
      updatedData.targetLocation = text;
      response = `הבנתי, אזור השירות הוא "${text}". כדי שנכתוב עותק מדויק: מהו הייחוד של העסק שלך? (למה שיבחרו דווקא בך? מה ה-USP?)`;
    } else if (!updatedData.usp) {
      updatedData.usp = text;
      response = `מעולה. כדי לבנות דף נחיתה שבאמת ממיר, אנחנו דורשים מראש לפחות 1-3 צילומי מסך של המלצות בוואטסאפ מלקוחות מרוצים. האם יש לך כאלה שתוכל להעלות בהמשך? (כן/לא)`;
    } else if (updatedData.hasTrustAssets === undefined) {
      if (text.includes("לא")) {
        response = `מצטער, אבל בלי הוכחות חברתיות (Trust Assets) הקמפיין פשוט לא יחזיר את ההשקעה בתחום תחרותי. ממליץ לחזור כשתאסוף כמה המלצות. (התהליך הוקפא).`;
        nextState = "COMPLETED";
      } else {
        updatedData.hasTrustAssets = true;
        response = `מצוין. שלב אחרון לאפיון: מהו התקציב החודשי המרבי שתרצה להשקיע בגוגל? (שים לב: בסיום התהליך ייגבו 9.9 ש"ח בלבד עבור פתיחת תקופת הניסיון והקמת דף הנחיתה).`;
      }
    } else if (!updatedData.monthlyBudget) {
      const budgetNum = parseInt(text.replace(/[^0-9]/g, ""), 10);
      if (isNaN(budgetNum) || budgetNum < 100) {
        response = `אני צריך מספר תקציב חודשי תקין (למשל: 3000). כמה תרצה להשקיע בחודש?`;
      } else {
        updatedData.monthlyBudget = budgetNum;
        nextState = "STRATEGIZING";
        // Immediately generate campaign components
        const generated = generateMockCampaign(updatedData.businessNiche, updatedData.targetLocation, budgetNum);
        strategy = generated.strategy;
        copy = generated.copy;
        nextState = "REVIEWING";
        response = `מצוין! אספתי את כל הפרטים. בנינו עבורך תוכנית קמפיין מותאמת אישית הכוללת גם דף נחיתה ייעודי שמבוסס על ה-USP שלך.
אתה יכול לראות את כל הפרטים – המיקום, התקציב, מילות השלילה ונוסח המודעות – בכרטיסייה על המסך.

האם הכל נראה לך ואתה מאשר להמשיך לתשלום של 9.9 ש"ח והעלאת הקמפיין לאוויר?`;
      }
    }
  } else if (currentState === "REVIEWING") {
    // Check if user approved
    const approvals = ["כן", "מאשר", "סבבה", "אישור", "אוקיי", "תעלה", "יאללה", "yes", "approve", "ok"];
    const isApproved = approvals.some(word => text.toLowerCase().includes(word));

    if (isApproved) {
      nextState = "COMPLETED";
      response = `מזל טוב! 🎉 הקמפיין שלך מוכן לשיגור!
1. יצרתי עבורך חשבון מפרסם חדש ב-Google Ads המשויך ל-MCC של WAO.
2. הגדרתי את בונוס השותפים הרשמי שלנו: קבל $500 החזר מול הוצאה של $500 (הטבה של 100% החזר תקציב).
3. שלחתי לך הזמנת ניהול ישירות למייל כדי שתהיה הבעלים המלאים של החשבון.

הקמפיין הוגדר בהצלחה ויתחיל לרוץ ברגע שתאשר את הזמנת הניהול ותגדיר אמצעי תשלום בחשבון. שיהיה המון בהצלחה!`;
    } else {
      response = `הבנתי. אם תרצה לשנות משהו (למשל להוסיף מילות שלילה, לשנות תקציב או לשנות את נוסח המודעה), פשוט תגיד לי ואשמח לעדכן עבורך. אם הכל בסדר, תגיד 'אישור' כדי שנתקדם.`;
    }
  } else if (currentState === "COMPLETED") {
    response = `הקמפיין כבר הוגדר והחשבון ממתין לך במייל. אם תרצה להקים קמפיין חדש או לשנות הגדרות בקמפיין הקיים, אני כאן תמיד לשירותך!`;
  }

  return NextResponse.json({
    response,
    currentState: nextState,
    collectedData: updatedData,
    strategy,
    copy,
    isSimulation: true
  });
}

/**
 * Generate mock strategy data based on niche, location, budget
 */
function generateMockCampaign(niche: string, location: string, monthlyBudget: number) {
  const dailyBudget = Math.round(monthlyBudget / 30.4);
  
  // Custom templates based on search query
  const isPlumber = niche.includes("אינסטל") || niche.includes("שרברב") || niche.includes("נזיל");
  const isCosmetics = niche.includes("קוסמט") || niche.includes("פנים") || niche.includes("יופי");
  const isLawyer = niche.includes("עורך דין") || niche.includes("עו\"ד") || niche.includes("משפט");
  
  let keywords: string[] = [];
  let negativeKeywords: string[] = [];
  let headlines: string[] = [];
  let descriptions: string[] = [];
  let strategyRationale = "";
  let copywritingRationale = "";

  if (isPlumber) {
    keywords = ["אינסטלטור מומלץ", "תיקון נזילות מים", "פתיחת סתימות ביוב", "אינסטלטור 24 שעות", "מאתר נזילות מוסמך"];
    negativeKeywords = ["קורס אינסטלציה", "דרושים אינסטלטור", "אינסטלטור יד שניה", "מתכון", "חינם", "עבודה בתחום", "איך לפתוח סתימה לבד"];
    headlines = ["אינסטלטור מוסמך 24/7", "הגעה תוך 20 דקות - התקשר", "מאתר נזילות במצלמה טרמית", "תיקון סתימות ונזילות במקום", "שירות אמין ומחיר הוגן"];
    descriptions = ["צריך אינסטלטור דחוף? שירות מהיר ומקצועי 24 שעות ביממה. מאתר נזילות מוסמך, התקשר עכשיו", "אל תתן לנזילה להרוס לך את הבית. תיקון סתימות ופיצוצי צנרת במחירים הוגנים. חייג כעת"];
    strategyRationale = `התמקדנו במילות מפתח שמבטאות דחיפות (כמו 24 שעות, מוסמך) כדי לתפוס לקוחות שצריכים עזרה מיידית. הוספנו מילות שלילה כמו 'איך לפתוח לבד' כדי שלא תשלם על אנשים שמחפשים מדריכי עשה-זאת-בעצמך.`;
    copywritingRationale = `הקופי מדגיש מהירות הגעה (20 דקות) ואמינות, שהם הגורמים המכריעים ביותר בבחירת אינסטלטור.`;
  } else if (isCosmetics) {
    keywords = ["טיפול פנים פרא רפואי", "קוסמטיקאית מומלצת", "אקנה טיפול פנים", "פילינג פנים", "טיפולי אנטי אייג'ינג"];
    negativeKeywords = ["לימודי קוסמטיקה", "בית ספר לקוסמטיקאיות", "מכשיר קוסמטיקה למכירה", "חינם", "שכר קוסמטיקאית", "מתכון מסיכה ביתית"];
    headlines = ["קוסמטיקאית פרא רפואית", "טיפולי פנים מתקדמים בהתאמה", "תוצאות מהטיפול הראשון", "פתרון לאקנה ואנטי אייג'ינג", "קבעי תור לטיפול פנים מפנק"];
    descriptions = ["רוצה עור פנים קורן ובריא? טיפולי פנים מותאמים אישית בקליניקה מקצועית. צרי קשר לייעוץ", "מגוון טיפולי אסתטיקה וטיפוח לעור הפנים. מוצרים איכותיים ותוצאות מוכחות. שרייני תור עכשיו"];
    strategyRationale = `התקציב ממוקד בטיפולים ספציפיים בעלי ערך גבוה (כמו אקנה, אנטי אייג'ינג). שללנו לימודים ומכירת מכשירים כדי להביא רק לקוחות לקליניקה.`;
    copywritingRationale = `פנייה ממוקדת לקהל נשי בשפה רכה ומזמינה, המדגישה תוצאות מהטיפול הראשון.`;
  } else if (isLawyer) {
    keywords = ["עורך דין מומלץ", "ייעוץ משפטי ראשוני", "עורך דין לדיני משפחה", "משרד עורכי דין", "עורך דין מקרקעין חוזה"];
    negativeKeywords = ["לימודי משפטים", "סטאז' עורך דין", "עורך דין שכר", "חינם", "ייעוץ חינם", "פסק דין לדוגמה", "טופס חוזה להורדה"];
    headlines = ["משרד עורכי דין מוביל", "ייעוץ משפטי מקצועי ואישי", "ליווי משפטי צמוד ומנוסה", "הגנה על הזכויות שלך", "עו\"ד מומחה בתחום - פנה כעת"];
    descriptions = ["משרד עורכי דין בעל ניסיון רב בייצוג וליווי משפטי. הגנה מלאה על האינטרסים שלך. חייג", "צריך ליווי משפטי מקצועי? אנו כאן כדי להילחם בשבילך. פגישת ייעוץ ראשונית בדיסקרטיות מלאה"];
    strategyRationale = `מילות מפתח ממוקדות מטרה. שללנו ביטויים כמו 'ייעוץ חינם' או 'טופס חוזה להורדה' כדי למנוע בזבוז תקציב על אנשים שמחפשים פתרונות חינמיים ללא עורך דין.`;
    copywritingRationale = `הקופי מקרין כוח, סמכותיות, הגנה ודיסקרטיות – ערכים חשובים מאוד למי שמחפש עורך דין.`;
  } else {
    // Generic fallback based on input
    keywords = [`שירותי ${niche}`, `מומחה ${niche}`, `${niche} מומלץ`, `${niche} קרוב אלי`, `${niche} טלפון`];
    negativeKeywords = ["חינם", "לימודים", "קורס", "דרושים", "עבודה", "משכורת", "שכר", "איך עושים", "מדריך", "יד שניה", "מתכון"];
    headlines = [`שירותי ${niche} מקצועיים`, `${niche} באזור ${location}`, `מומחה ${niche} - התקשר כעת`, `שירות אמין ויחס אישי`, `הצעת מחיר הוגנת ומיידית`];
    descriptions = [`מחפש מומחה בתחום ${niche}? אנו מספקים שירות מקצועי ואיכותי באזור ${location}. התקשר עכשיו`, `שירותי ${niche} ברמה הגבוהה ביותר. צוות אמין ומנוסה לצידך. לפרטים והזמנות לחץ כאן`];
    strategyRationale = `הקמפיין ממוקד במילות חיפוש ספציפיות לעסק שלך באזור ${location}. הוספנו מילות שלילה רחבות (חינם, לימודים, דרושים) כדי להבטיח שכל שקל הולך רק ללקוחות פוטנציאליים שרוצים לשלם.`;
    copywritingRationale = `המודעות מנוסחות בצורה ישירה וברורה, ומדגישות את המומחיות והאזור הגיאוגרפי שלך כדי למשוך קליקים רלוונטיים בלבד.`;
  }

  return {
    strategy: {
      targetLocation: location,
      suggestedDailyBudget: dailyBudget,
      keywords,
      negativeKeywords,
      strategyRationale
    },
    copy: {
      headlines,
      descriptions,
      callToAction: "התקשר עכשיו לייעוץ",
      copywritingRationale
    }
  };
}
