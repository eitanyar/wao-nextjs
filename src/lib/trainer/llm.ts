export let generateJson = async function(systemPrompt: string, userPrompt: string): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }
  const modelName = process.env.GEMINI_MODEL_NAME || "gemini-3.7-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const payload = {
    systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: { responseMimeType: "application/json" },
  };

  let lastError: any = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(`Gemini API error (${res.status}): ${JSON.stringify(data)}`);
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text !== "string") {
        throw new Error(`Gemini API returned unexpected shape: ${JSON.stringify(data)}`);
      }

      try {
        return JSON.parse(text);
      } catch (parseErr) {
        if (attempt === 1) {
          lastError = parseErr;
          continue;
        }
        throw new Error(`Failed to parse JSON response from Gemini after retry: ${parseErr}\nResponse text was: ${text}`);
      }
    } catch (err) {
      if (attempt === 2) {
        throw err;
      }
      lastError = err;
    }
  }

  throw lastError || new Error("Failed to generate JSON from Gemini API.");
};

export function setGenerateJsonMock(fn: typeof generateJson | null) {
  if (fn) {
    generateJson = fn;
  }
}
