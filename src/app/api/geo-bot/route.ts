import { NextResponse } from 'next/server';
import { GEO_ADAM_SYSTEM_PROMPT, GeoCollectedData } from '@/lib/geo/prompts';
import { checkAioPresence } from '@/lib/geo/dataForSeo';
import { extractJsonSpan } from '@/lib/ai/gemini-fast';

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
  0: 'יאללה, מתחילים. ספר לי — מה התחום שבו אתה הכתובת? מה השירות שלקוחות מגיעים אליך במיוחד בשבילו?',
  1: 'מה כתובת האתר שלך? ועל מה הוא בנוי — וורדפרס, וויקס, משהו אחר — או שאתה לא בטוח?',
  2: 'יש לך גישה ל-Google Search Console? זה כלי חינמי של גוגל שמראה על מה מחפשים אותך. אם אתה לא בטוח — פשוט תגיד, זה בסדר גמור.',
  3: 'מי מטפל היום בתוכן באתר שלך — אתה, מישהו בצוות, ספק חיצוני, או שאף אחד לא נגע בו כבר כמה זמן?',
  4: 'באילו ערים ואזורים אתה עובד? ככל שתפרט יותר — כך נוכל לכוון את התוכן בדיוק לאנשים הנכונים.',
  5: 'מה 3–4 השאלות שלקוחות הכי שואלים אותך בטלפון? אלה בדיוק הדברים שגוגל ו-ChatGPT רוצים לענות עליהם.',
  6: 'יש סוגי פניות שאתה מעדיף לא לקבל? שירות שאתה לא מציע, או אזור שאתה לא מגיע אליו?',
  7: 'בוא נעצור רגע לחשוב. גוגל מציג היום תשובת AI שלמה מעל תוצאות החיפוש. יצא לך לחפש את השירות שלך בגוגל ולראות מה התשובה אומרת?',
  8: 'ומי אצלך מאשר תוכן לפני שהוא עולה לאתר — אתה מהנייד, או מישהו אחר? ומה מספר הוואטסאפ שלו?',
  9: 'ולסיום — למה שיבחרו דווקא בך? תן לי את המשפט שאתה אומר ללקוח שמתלבט בין כמה אפשרויות.',
  10: 'מה המייל שלך? נשלח לך את תוכנית העבודה הראשונה שלנו ואת הדוח החודשי.',
};

// ── Gemini caller — mirrors /api/bot's callGemini (multi-turn, JSON mode) ────
const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-3.7-flash';

function toGeminiRole(role: Message['role']): 'user' | 'model' {
  return role === 'assistant' ? 'model' : 'user';
}

async function callGemini(systemPrompt: string, messages: Message[]): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent`;

  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: toGeminiRole(m.role), parts: [{ text: m.content }] }));

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'LOW' } },
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

    // ── Live Gemini mode ──────────────────────────────────────────────────────
    const turn = collectedData.turnIndex ?? 0;
    let systemPrompt = GEO_ADAM_SYSTEM_PROMPT;
    let aioCost = 0;

    // Turn 7 AIO check — inject DataForSEO result before the model responds
    if (turn === 7 && collectedData.businessNiche && !collectedData.aioDetected !== undefined) {
      try {
        const niche = collectedData.topService || collectedData.businessNiche || '';
        const loc   = collectedData.targetLocation || '';
        const aio   = await checkAioPresence(niche, loc);
        aioCost = aio.callCount * 0.002; // $0.002 per DataForSEO Live SERP call (verified 2026-08-13)

        systemPrompt += `\n\n[AIO_CHECK] found=${aio.found} query="${aio.query}"`;

        // Persist to collectedData for the model
        collectedData.aioDetected = aio.found;
        collectedData.aioQuery    = aio.query;
      } catch {
        // Non-fatal — bot continues without AIO context
      }
    }

    const geminiRes = await callGemini(systemPrompt, messages);
    const geminiData = await geminiRes.json();

    // Cost tracking — Gemini 3.5 Flash pricing verified 2026-08-13: $1.50/M input, $9.00/M output
    const GEMINI_INPUT_PER_TOKEN  = 1.50 / 1_000_000;
    const GEMINI_OUTPUT_PER_TOKEN = 9.00 / 1_000_000;
    const usageMetadata = geminiData?.usageMetadata;
    const geminiCost = usageMetadata
      ? (usageMetadata.promptTokenCount ?? 0) * GEMINI_INPUT_PER_TOKEN
        + (usageMetadata.candidatesTokenCount ?? 0) * GEMINI_OUTPUT_PER_TOKEN
      : 0;
    const updatedCost = (collectedData.costUsd ?? 0) + geminiCost + aioCost;

    if (!geminiRes.ok) {
      throw new Error(`Gemini error: ${JSON.stringify(geminiData)}`);
    }

    const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    let parsed: { response?: string; currentState?: string; collectedData?: GeoCollectedData } = {};

    // Gemini occasionally emits valid JSON followed by trailing junk (see
    // gemini-fast.ts extractJsonSpan) — extract the balanced span before parsing.
    try { parsed = JSON.parse(extractJsonSpan(raw)); } catch { parsed = { response: raw }; }

    // Merge collected data and advance turn
    const merged: GeoCollectedData = {
      ...collectedData,
      ...(parsed.collectedData ?? {}),
      turnIndex: turn + 1,
      costUsd: updatedCost,
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
