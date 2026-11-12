// Gemini prompts for voice-check. Prompts are English; the only Hebrew sent is the
// script text itself (read from the scripts JSON / lexicon at runtime).

import { findWordUnit, units, normKey } from "./core.mjs";
import { lintVoiceLine } from "../lexicon.mjs";

// ---------------------------------------------------------------- Stage 1: ear check

export const EAR_SYSTEM = `You review Hebrew voice-over lines for short ads aimed at busy Israeli small-business owners.
The lines are synthesized by a Hebrew TTS voice (ElevenLabs) that reads mostly UNVOWELIZED Hebrew.
Bracketed tokens like [sighs] are performance directions for the voice and are not spoken.
Some words carry niqqud or a hyphen: those spellings were fixed on purpose so the voice reads them correctly.

For EVERY line return three checks:

1. ambiguous_words: words a TTS reading unvowelized text could plausibly pronounce more than one way
   (homographs such as noun vs verb vs participle, binyan ambiguity, attached prefixes like mem/he/vav/bet/lamed
   whose vowel changes the meaning, dagesh/begadkefat ambiguity such as p vs f, b vs v, k vs kh).
   Be thorough on SHORT words too (3-4 letters); they are the most common misreads.
   Only list a word when a wrong reading is genuinely likely. Do NOT list words in the line's "resolved" list
   and do NOT list words that already carry niqqud. For each word give:
     word: copied EXACTLY from the line (same letters, no niqqud added),
     intended: { translit (Latin transliteration, stressed syllable in CAPS), meaning (English) } for this context,
     wrong: [ { translit, meaning } ] the likely wrong reading(s),
     candidate_niqqud: the word with niqqud that would force the intended reading (best effort).
2. eyes_closed: the line is heard ONCE, screen OFF, no captions, by a busy owner half-listening. Lines in the same
   section are heard in sequence (earlier lines count as context); hooks are alternative openers, each heard alone.
   First fill audio_only_meaning: what that listener would actually take away from the sound alone.
   Then visual_dependencies: every word/phrase whose meaning comes from the drawing rather than the words
   (use the "screen" description to find them): objects shown on screen, counters, containers, characters'
   actions, or a figurative object standing in for an abstract business quantity that the audio never set up.
   pass=false if visual_dependencies is non-empty or audio_only_meaning misses the line's point.
   reason: one short English sentence. Be strict: if in doubt, fail it.
3. odd_wording: words or phrases a native Israeli speaker would find strange, unnatural or wrong in this context,
   including words whose literal meaning does not match the business concept they stand for, calques from English,
   and collocations a native would not use. Each: { phrase (copied exactly from the line), why (English only;
   do not propose Hebrew replacements) }. Do not rewrite the copy.

Reply with JSON only.`;

export const EAR_SCHEMA = {
  type: "object",
  properties: {
    lines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          ambiguous_words: {
            type: "array",
            items: {
              type: "object",
              properties: {
                word: { type: "string" },
                intended: { type: "object", properties: { translit: { type: "string" }, meaning: { type: "string" } }, required: ["translit", "meaning"] },
                wrong: { type: "array", items: { type: "object", properties: { translit: { type: "string" }, meaning: { type: "string" } }, required: ["translit", "meaning"] } },
                candidate_niqqud: { type: "string" },
              },
              required: ["word", "intended", "wrong", "candidate_niqqud"],
            },
          },
          eyes_closed: {
            type: "object",
            properties: {
              audio_only_meaning: { type: "string" },
              visual_dependencies: { type: "array", items: { type: "string" } },
              pass: { type: "boolean" },
              reason: { type: "string" },
            },
            required: ["audio_only_meaning", "visual_dependencies", "pass", "reason"],
          },
          odd_wording: { type: "array", items: { type: "object", properties: { phrase: { type: "string" }, why: { type: "string" } }, required: ["phrase", "why"] } },
        },
        required: ["id", "ambiguous_words", "eyes_closed", "odd_wording"],
      },
    },
  },
  required: ["lines"],
};

/** Words already resolved by the lexicon in a TTS line (their text, for the prompt). */
export function resolvedWords(ttsText, lexicon) {
  return units(ttsText, lexicon).filter((u) => u.lexiconId).map((u) => u.text);
}

export function buildEarCheckPayload(lines) {
  return {
    instructions: "Check every line. Return one entry per id, same ids.",
    lines: lines.map((l) => ({ id: l.id, section: l.section, screen: l.screen ?? null, line: l.tts, resolved: l.resolved })),
  };
}

/**
 * Validate + clean the model's per-line result against the actual line.
 * Drops ambiguous words that are not in the line or are lexicon-covered.
 * Everything Hebrew the model produced is tagged UNVERIFIED.
 */
export function sanitizeEarResult(raw, line, lexicon) {
  const U = units(line.tts, lexicon);
  const dropped = [];
  const ambiguous = [];
  for (const a of raw?.ambiguous_words ?? []) {
    const idx = findWordUnit(U, a.word ?? "");
    if (idx < 0) dropped.push({ word: a.word, why: "not found in line" });
    else if (U[idx].lexiconId) dropped.push({ word: a.word, why: `resolved by lexicon (${U[idx].lexiconId})` });
    else if (ambiguous.some((x) => normKey(x.word) === normKey(U[idx].text))) continue;
    else
      ambiguous.push({
        word: U[idx].text,
        intended: a.intended,
        wrong: a.wrong ?? [],
        candidate_niqqud: a.candidate_niqqud ? { value: a.candidate_niqqud, status: "UNVERIFIED" } : null,
      });
  }
  return {
    ambiguous,
    eyesClosed: raw?.eyes_closed ?? null,
    oddWording: (raw?.odd_wording ?? []).map((o) => ({ ...o, inLine: normKey(line.voice).includes(normKey(o.phrase ?? "")) })),
    droppedAmbiguous: dropped,
  };
}

export function lintFor(line, lexicon) {
  return lintVoiceLine(line.voice, lexicon);
}

// ---------------------------------------------------------------- Stage 2: forced-choice audio judge

export const JUDGE_SYSTEM = `You are a phonetics judge for Hebrew speech. You get a very short audio clip cut from a Hebrew
voice-over (it may include fragments of neighbouring words at the edges). One target word or short phrase is in the
middle. You are told two candidate pronunciations in Latin transliteration (stressed syllable in CAPS).
First write, in Latin letters, exactly what you hear for the target (vowels and consonants, no interpretation).
Then pick the candidate it matches. Judge sounds only (vowels, consonants like p/f, b/v, k/kh, stress), not meaning.
If it matches neither, say so. Reply with JSON only.`;

export const JUDGE_SCHEMA = {
  type: "object",
  properties: {
    heard: { type: "string" },
    choice: { type: "string", enum: ["A", "B", "neither"] },
    confidence: { type: "number" },
  },
  required: ["heard", "choice", "confidence"],
};

/** Deterministic A/B order (from a key) so re-runs hit the cache and position bias averages out. */
export function judgeOrder(key) {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 2 === 0 ? "intended-first" : "wrong-first";
}

export function buildJudgeQuestion({ intended, wrong, order }) {
  const wrongText = wrong.join(" / ");
  const [A, B] = order === "intended-first" ? [intended, wrongText] : [wrongText, intended];
  return {
    text: `Is the target pronounced\nA: "${A}"\nor\nB: "${B}"?\nReturn {"heard": "...", "choice": "A"|"B"|"neither", "confidence": 0..1}.`,
    map: order === "intended-first" ? { A: "intended", B: "wrong" } : { A: "wrong", B: "intended" },
  };
}

export function interpretJudge(json, map) {
  const verdict = json.choice === "A" || json.choice === "B" ? map[json.choice] : "neither";
  const confidence = Math.max(0, Math.min(1, Number(json.confidence) || 0));
  return { verdict, confidence, heard: json.heard ?? "" };
}
