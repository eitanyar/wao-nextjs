/**
 * Repairs Gemini JSON-mode output that is well-formed up to some point and
 * then has trailing garbage (a stray duplicated fragment, markdown fence, or
 * — the case that motivated this — leaked "thinking" commentary appended
 * after the last field's string closes, leaving the outer object/array
 * unclosed). Observed 2026-08-09 during the Azure→Gemini GEO Bot migration,
 * even with generationConfig.responseMimeType: 'application/json'.
 *
 * Strategy: fast-path a full JSON.parse; if that fails, scan the text
 * tracking bracket depth + string/escape state, recording every point where
 * truncating and closing the remaining open brackets would be syntactically
 * plausible. Try those checkpoints from most-content-preserved backward and
 * return the first one that actually parses. Falls back to naive last-brace
 * matching, then the raw trimmed text, if no checkpoint works.
 */
export function extractJsonSpan(text) {
  const trimmed = text.trim();
  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {
    // fall through to repair
  }

  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');
  let start;
  if (firstBrace === -1) start = firstBracket;
  else if (firstBracket === -1) start = firstBrace;
  else start = Math.min(firstBrace, firstBracket);
  if (start === -1) return trimmed;

  const stack = [];
  let inString = false;
  let escapeNext = false;
  const checkpoints = [];

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
