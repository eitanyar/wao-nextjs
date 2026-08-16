// Shared single-turn JSON-mode Gemini caller — used by any route that needs
// one system+user prompt in, one JSON string out (no multi-turn history).
// Multi-turn conversation callers (e.g. /api/bot's handleGemini) build their
// own `contents[]` array and should not use this.

// Even with responseMimeType: 'application/json', Gemini occasionally emits
// a valid JSON value followed by trailing junk (a duplicated/truncated
// fragment, a stray markdown fence, or — observed 2026-08-09 during the
// Azure→Gemini GEO Bot migration — leaked "thinking" commentary appended
// right after the last field's string closes, leaving the outer object
// unclosed) — this produced "Unexpected non-whitespace character after JSON
// at position N" / "Expected ',' or '}' after property value" on JSON.parse
// further downstream (2026-08-01 diagnosis, Adam's bug report).
//
// Strategy: fast-path a full JSON.parse; if that fails, scan the text
// tracking bracket depth + string/escape state, recording every point where
// truncating and closing the remaining open brackets would be syntactically
// plausible ("checkpoints"). Try those checkpoints from most-content-
// preserved backward and return the first one that actually parses. Falls
// back to naive last-brace matching, then the raw trimmed text, if no
// checkpoint works. This is a more durable fix than retry-count whack-a-mole
// and helps every caller of callGeminiJSON, not just one prompt.
export function extractJsonSpan(text: string): string {
  const trimmed = text.trim();
  // Fast path — already parses cleanly, no repair needed.
  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {
    // fall through to repair
  }

  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');
  let start: number;
  if (firstBrace === -1) start = firstBracket;
  else if (firstBracket === -1) start = firstBrace;
  else start = Math.min(firstBrace, firstBracket);
  if (start === -1) return trimmed;

  const stack: string[] = [];
  let inString = false;
  let escapeNext = false;
  const checkpoints: { index: number; closer: string }[] = [];

  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inString) {
      if (escapeNext) { escapeNext = false; continue; }
      if (ch === '\\') { escapeNext = true; continue; }
      if (ch === '"') {
        inString = false;
        if (stack.length) {
          checkpoints.push({ index: i + 1, closer: stack.slice().reverse().map(c => (c === '{' ? '}' : ']')).join('') });
        }
      }
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{' || ch === '[') { stack.push(ch); continue; }
    if (ch === '}' || ch === ']') {
      stack.pop();
      checkpoints.push({ index: i + 1, closer: stack.slice().reverse().map(c => (c === '{' ? '}' : ']')).join('') });
      if (stack.length === 0) break; // fully closed — stop scanning
    }
  }

  for (let j = checkpoints.length - 1; j >= 0; j--) {
    const { index, closer } = checkpoints[j];
    const candidate = trimmed.slice(start, index) + closer;
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // try an earlier (less content) checkpoint
    }
  }

  // Last resort — naive bracket matching (old behavior).
  const closeChar = trimmed[start] === '{' ? '}' : ']';
  const lastClose = trimmed.lastIndexOf(closeChar);
  if (lastClose === -1 || lastClose <= start) return trimmed.slice(start);
  return trimmed.slice(start, lastClose + 1);
}

export async function callGeminiJSON(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini not configured');

  const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-3.7-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'LOW' } },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini API error (${res.status}): ${JSON.stringify(data)}`);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string') throw new Error(`Gemini API returned unexpected shape: ${JSON.stringify(data)}`);
  return extractJsonSpan(text);
}
