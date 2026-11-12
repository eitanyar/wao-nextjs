// Stage 2: one audio take per beat, built on scripts/voice.
// Order: (1) a take voice-check already picked for this exact TTS text,
// (2) a take this pipeline generated earlier (cache keyed by text + voice),
// (3) a new ElevenLabs take - only with allowTts, then a local STT diff.
// Takes are matched by TEXT, never by line index, so an edited line can never
// reuse audio recorded for its old wording.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { diffTranscript, pickTake, scribeWords } from "../../voice/lib/core.mjs";
import { cachedTranscribe, elevenTTS, sha } from "../../voice/lib/io.mjs";

/** Word-timestamp JSON voice-check stored beside a take (<base>.<provider>-<audiohash>.json), or null. */
export function loadTakeStt(file) {
  if (!existsSync(file)) return null;
  const base = path.join(path.dirname(file), path.basename(file, ".mp3"));
  const h = sha(readFileSync(file));
  for (const p of ["scribe", "local"]) {
    const f = `${base}.${p}-${h}.json`;
    if (existsSync(f)) return JSON.parse(readFileSync(f, "utf8"));
  }
  return null;
}

/**
 * The take voice-check picked for exactly this TTS text, from <dir>/lines.json.
 * Skips lines that still need a human. Returns null when nothing matches.
 */
export function findPickedTake(ttsText, takesDirs, { root }) {
  for (const d of takesDirs ?? []) {
    const linesFile = path.resolve(root, d, "lines.json");
    if (!existsSync(linesFile)) continue;
    for (const l of JSON.parse(readFileSync(linesFile, "utf8"))) {
      if (l.tts !== ttsText || !l.audio || l.audio.needsHuman) continue;
      const take = (l.audio.takes ?? []).find((t) => t.take === l.audio.picked);
      const file = take && path.resolve(root, take.file);
      if (!file || !existsSync(file)) continue;
      return {
        source: "voice-check-picked",
        file,
        take: take.take,
        lineId: l.id,
        takesDir: d,
        needsHuman: false,
        flags: (l.audio.flags ?? []).map((f) => ({ type: f.type, kind: f.kind ?? null, label: f.label ?? f.expected ?? null, verdict: f.verdict ?? null, confidence: f.confidence ?? null, heard: f.heard ?? null })),
        stt: loadTakeStt(file),
      };
    }
  }
  return null;
}

const localStt = async (file, dir) => (await cachedTranscribe({ dir, base: path.basename(file, ".mp3"), file, provider: "local" })).resp;

/**
 * Cached or new take for a beat with no picked take. Spends credits only when the
 * cache has no file for this text + voice, and only when allowTts is set.
 * A second take is generated only if the first fails the STT diff.
 */
export async function generateTake(ttsText, { voice, cacheDir, allowTts = false, apiKey, lexicon = null, maxTakes = 2, tts = elevenTTS, stt = localStt, fetch = globalThis.fetch }) {
  mkdirSync(cacheDir, { recursive: true });
  const key = sha({ tts: ttsText, voiceId: voice.voiceId, model: voice.model });
  const spent = { requests: 0, chars: 0 };
  const takes = [];
  for (let k = 1; k <= maxTakes; k++) {
    const file = path.join(cacheDir, `${key}-t${k}.mp3`);
    if (!existsSync(file)) {
      if (!allowTts) {
        if (takes.length) break;
        throw new Error("no take exists for this line and --allow-tts was not given");
      }
      writeFileSync(file, await tts({ text: ttsText, voiceId: voice.voiceId, model: voice.model, apiKey: apiKey(), fetch }));
      spent.requests++;
      spent.chars += ttsText.length;
    }
    let resp = null;
    let sttIssues = [];
    let sttError = null;
    try {
      resp = await stt(file, cacheDir);
      sttIssues = diffTranscript(ttsText, scribeWords(resp).text, { lexicon }).issues.map((i) => ({ kind: i.kind, severity: i.severity, expected: i.expected, heard: i.heard }));
    } catch (e) {
      sttError = e.message;
    }
    takes.push({ take: k, file, stt: resp, sttIssues, sttError, judgments: [], missingTargets: 0 });
    if (!sttError && !sttIssues.some((i) => i.severity === "major")) break;
  }
  const pick = pickTake(takes);
  const t = takes.find((x) => x.take === pick.picked);
  return {
    source: spent.requests ? "generated" : "pipeline-cache",
    file: t.file,
    take: t.take,
    lineId: null,
    needsHuman: pick.needsHuman || Boolean(t.sttError),
    check: t.sttError ? `none (STT unavailable: ${t.sttError})` : "stt-diff only; no pronunciation judge, not heard by a human",
    flags: t.sttIssues.filter((i) => i.severity === "major").map((i) => ({ type: "stt", kind: i.kind, label: i.expected, heard: i.heard, verdict: null, confidence: null })),
    stt: t.stt,
    spent,
  };
}

/** Stage 2 for one beat. Returns the take record (see findPickedTake / generateTake). */
export async function resolveTake(ttsText, { takesDirs, root, ...gen }) {
  const picked = findPickedTake(ttsText, takesDirs, { root });
  if (picked) return { ...picked, check: "voice-check (STT diff + audio judge)", spent: { requests: 0, chars: 0 } };
  return generateTake(ttsText, gen);
}
