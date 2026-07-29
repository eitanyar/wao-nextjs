// Shared single-turn JSON-mode Gemini caller — used by any route that needs
// one system+user prompt in, one JSON string out (no multi-turn history).
// Multi-turn conversation callers (e.g. /api/bot's handleGemini) build their
// own `contents[]` array and should not use this.

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
  return text;
}
