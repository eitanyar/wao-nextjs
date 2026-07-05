import { NextResponse } from 'next/server';
import { GEO_ADAM_SYSTEM_PROMPT, GeoCollectedData } from '@/lib/geo/prompts';
import { checkAioPresence } from '@/lib/geo/dataForSeo';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface RequestData {
  messages: Message[];
  currentState: 'COLLECTING' | 'RECOMMENDING' | 'COMPLETED';
  collectedData: GeoCollectedData;
  simulate?: boolean;
}

// ── Simulation path — pre-written turn questions ──────────────────────────────
// Dual-path rule: any change here must also update GEO_ADAM_SYSTEM_PROMPT T-sequence.
const TURN_QUESTIONS: Record<number, string> = {
  0: 'יאללה, מתחילים — ספר לי על העסק שלך. מה אתה עושה, ומה השירות שהכי מכניס לך כסף?',
  1: 'מה כתובת האתר שלך? ועל מה הוא בנוי — וורדפרס, וויקס, משהו אחר — או שאתה לא בטוח?',
  2: 'יש לך גישה ל-Google Search Console? זה כלי חינמי של גוגל שמראה על מה מחפשים אותך. אם אתה לא בטוח — פשוט תגיד, זה בסדר גמור.',
  3: 'מי מטפל היום בתוכן באתר שלך — אתה, מישהו בצוות, ספק חיצוני, או שאף אחד לא נגע בו כבר כמה זמן?',
  4: 'באילו ערים ואזורים אתה עובד? ככל שתפרט יותר — כך נוכל לכוון את התוכן בדיוק לאנשים הנכונים.',
  5: 'מה 3-4 השאלות שלקוחות הכי שואלים אותך בטלפון? אלה בדיוק הדברים שגוגל ו-ChatGPT רוצים לענות עליהם.',
  6: 'יש סוגי פניות שאתה מעדיף לא לקבל? שירות שאתה לא מציע, או אזור שאתה לא מגיע אליו?',
  7: 'שמעת על זה שגוגל מציג היום תשובות AI בראש חיפוש, לפני כל התוצאות הרגילות? ראית את זה קורה בתחום שלך?',
  8: 'ולגבי אישורים — מי מאשר תוכן לפני שהוא עולה לאתר? אתה מהנייד, או מישהו אחר? ומה מספר הוואטסאפ שלו?',
  9: 'ולסיום — למה שיבחרו דווקא בך? תן לי את המשפט שאתה אומר ללקוח שמתלבט בין כמה אפשרויות.',
  10: 'מה המייל שלך? נשלח לך את תוכנית העבודה הראשונה שלנו ואת הדוח החודשי.',
};

function callAzure(systemPrompt: string, messages: Message[]): Promise<Response> {
  const apiKey  = process.env.AZURE_OPENAI_KEY!;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT!;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME!;
  const url = `${endpoint}/chat/completions?api-version=2024-05-01-preview`;

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      model: deployment,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      response_format: { type: 'json_object' },
      max_completion_tokens: 1000,
      temperature: 0.7,
    }),
  });
}

export async function POST(req: Request) {
  try {
    const body: RequestData = await req.json();
    const { messages, currentState, collectedData, simulate } = body;

    // ── Simulation mode ───────────────────────────────────────────────────────
    if (simulate) {
      const turn = collectedData.turnIndex ?? 0;
      const question = TURN_QUESTIONS[turn] ?? '✅ כל המידע שצריך — תודה!';
      const nextTurn = turn + 1;
      const isComplete = nextTurn > Object.keys(TURN_QUESTIONS).length;

      return NextResponse.json({
        response: question,
        currentState: isComplete ? 'COMPLETED' : 'COLLECTING',
        collectedData: { ...collectedData, turnIndex: nextTurn },
        awaitingAioCheck: false,
      });
    }

    // ── Live Azure mode ───────────────────────────────────────────────────────
    const turn = collectedData.turnIndex ?? 0;
    let systemPrompt = GEO_ADAM_SYSTEM_PROMPT;

    // Turn 7 AIO check — inject DataForSEO result before the model responds
    if (turn === 7 && collectedData.businessNiche && !collectedData.aioDetected !== undefined) {
      try {
        const niche = collectedData.topService || collectedData.businessNiche || '';
        const loc   = collectedData.targetLocation || '';
        const aio   = await checkAioPresence(niche, loc);

        systemPrompt += `\n\n[AIO_CHECK] found=${aio.found} query="${aio.query}"`;

        // Persist to collectedData for the model
        collectedData.aioDetected = aio.found;
        collectedData.aioQuery    = aio.query;
      } catch {
        // Non-fatal — bot continues without AIO context
      }
    }

    const azureRes = await callAzure(systemPrompt, messages);
    const azureData = await azureRes.json();

    if (!azureRes.ok) {
      throw new Error(`Azure error: ${JSON.stringify(azureData?.error)}`);
    }

    const raw = azureData.choices?.[0]?.message?.content ?? '{}';
    let parsed: { response?: string; currentState?: string; collectedData?: GeoCollectedData } = {};

    try { parsed = JSON.parse(raw); } catch { parsed = { response: raw }; }

    // Merge collected data and advance turn
    const merged: GeoCollectedData = {
      ...collectedData,
      ...(parsed.collectedData ?? {}),
      turnIndex: turn + 1,
    };

    return NextResponse.json({
      response:     parsed.response ?? '',
      currentState: parsed.currentState ?? currentState,
      collectedData: merged,
      awaitingAioCheck: false,
    });

  } catch (err: unknown) {
    console.error('[geo-bot] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
