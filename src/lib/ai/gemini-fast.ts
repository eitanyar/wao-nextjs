// Shared single-turn JSON-mode Gemini caller — used by any route that needs
// one system+user prompt in, one JSON string out (no multi-turn history).
// Multi-turn conversation callers (e.g. /api/bot's handleGemini) build their
// own `contents[]` array and should not use this.

// Even with responseMimeType: 'application/json', Gemini occasionally emits
// a valid JSON value followed by trailing junk (a duplicated/truncated
// fragment, or a stray markdown fence) — this produced "Unexpected
// non-whitespace character after JSON at position N" on JSON.parse further
// downstream (2026-08-01 diagnosis, Adam's bug report). Extract the first
// balanced {...}/[...] span instead of trusting the raw string verbatim —
// this is a more durable fix than retry-count whack-a-mole and helps every
// caller of callGeminiJSON, not just one prompt.
function extractJsonSpan(text: string): string {
  const trimmed = text.trim();
  // Fast path — already parses cleanly, no extraction needed.
  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {
    // fall through to bracket-matching extraction
  }
  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');
  let start: number;
  if (firstBrace === -1) start = firstBracket;
  else if (firstBracket === -1) start = firstBrace;
  else start = Math.min(firstBrace, firstBracket);
  if (start === -1) return trimmed;
  const closeChar = trimmed[start] === '{' ? '}' : ']';
  const lastClose = trimmed.lastIndexOf(closeChar);
  if (lastClose === -1 || lastClose <= start) return trimmed;
  return trimmed.slice(start, lastClose + 1);
}

export async function callGeminiJSON(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini not configured');

  const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-3.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini API error (${res.status}): ${JSON.stringify(data)}`);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string') throw new Error(`Gemini API returned unexpected shape: ${JSON.stringify(data)}`);
  return extractJsonSpan(text);
}
