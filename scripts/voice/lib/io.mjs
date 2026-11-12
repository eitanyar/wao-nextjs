// Network + ffmpeg + cache helpers for voice-check. Every network call takes an
// injectable fetch so tests can mock it. Keys are read from .env.local and never logged.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

// AGENTS.md: GEO/text work defaults to gemini-3.8-flash. GEMINI_MODEL_NAME in .env.local
// is not honoured here on purpose (it has been stale before).
export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
export const SCRIBE_MODEL = "scribe_v2";

export function readEnvKey(name, file = path.join(ROOT, ".env.local")) {
  let v;
  if (existsSync(file)) {
    const m = readFileSync(file, "utf8").match(new RegExp(`^${name}=(.*)$`, "m"));
    if (m) v = m[1].trim().replace(/^["']|["']$/g, "");
  }
  v = v || process.env[name];
  if (!v) throw new Error(`${name} missing (.env.local)`);
  return v;
}

export const sha = (x) => createHash("sha256").update(typeof x === "string" || Buffer.isBuffer(x) ? x : JSON.stringify(x)).digest("hex").slice(0, 16);

/** JSON cache in dir/<key>.json; fn runs only on miss. */
export async function cachedJson(dir, key, fn) {
  mkdirSync(dir, { recursive: true });
  const f = path.join(dir, `${key}.json`);
  if (existsSync(f)) return { value: JSON.parse(readFileSync(f, "utf8")), cached: true };
  const value = await fn();
  writeFileSync(f, JSON.stringify(value, null, 2));
  return { value, cached: false };
}

async function withRetry(fn, { tries = 4, label = "request" } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!e.retryable || i === tries - 1) break;
      await new Promise((r) => setTimeout(r, 1500 * 2 ** i));
    }
  }
  throw new Error(`${label} failed: ${last?.message}`);
}

function httpError(status, body) {
  const e = new Error(`HTTP ${status}: ${String(body).slice(0, 300)}`);
  e.retryable = status === 429 || status >= 500;
  return e;
}

/** Parse a JSON reply, tolerating trailing junk (same idea as src/lib/ai/gemini-fast.ts). */
export function parseJsonLoose(text) {
  const t = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  try {
    return JSON.parse(t);
  } catch {
    const s = t.indexOf("{");
    const e = t.lastIndexOf("}");
    if (s >= 0 && e > s) return JSON.parse(t.slice(s, e + 1));
    throw new Error("unparseable JSON from model");
  }
}

/**
 * Gemini generateContent, JSON mode. parts: [{ text } | { inlineData: { mimeType, data } }].
 * Returns { json, usage }.
 */
export async function geminiJSON({ system, parts, schema, model = DEFAULT_GEMINI_MODEL, thinkingLevel = "LOW", apiKey, fetch = globalThis.fetch }) {
  return withRetry(
    async () => {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { role: "system", parts: [{ text: system }] },
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0,
            thinkingConfig: { thinkingLevel },
            ...(schema ? { responseJsonSchema: schema } : {}),
          },
        }),
      });
      const raw = await res.text();
      if (!res.ok) throw httpError(res.status, raw);
      const data = JSON.parse(raw);
      const text = (data?.candidates?.[0]?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? "").join("");
      if (!text) {
        const e = new Error(`Gemini empty reply (${data?.candidates?.[0]?.finishReason ?? "?"})`);
        e.retryable = true;
        throw e;
      }
      return { json: parseJsonLoose(text), usage: data.usageMetadata ?? null, model };
    },
    { label: `gemini ${model}` },
  );
}

/** ElevenLabs TTS (same request shape as the A1 sample). Returns Buffer. */
export async function elevenTTS({ text, voiceId, model, apiKey, fetch = globalThis.fetch }) {
  return withRetry(
    async () => {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ text, model_id: model }),
      });
      if (!res.ok) throw httpError(res.status, await res.text());
      return Buffer.from(await res.arrayBuffer());
    },
    { label: "elevenlabs tts" },
  );
}

/** ElevenLabs Scribe STT, Hebrew, word timestamps. Returns the raw response JSON. */
export async function elevenScribe({ audio, filename = "audio.mp3", apiKey, fetch = globalThis.fetch, languageCode = "heb" }) {
  return withRetry(
    async () => {
      const fd = new FormData();
      fd.append("model_id", SCRIBE_MODEL);
      fd.append("language_code", languageCode);
      fd.append("timestamps_granularity", "word");
      fd.append("tag_audio_events", "true");
      fd.append("file", new Blob([audio], { type: "audio/mpeg" }), filename);
      const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": apiKey }, body: fd });
      const raw = await res.text();
      if (!res.ok) throw httpError(res.status, raw);
      return JSON.parse(raw);
    },
    { label: "elevenlabs scribe" },
  );
}

// ---------------------------------------------------------------- ffmpeg

export function probeDuration(file) {
  return Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" }).trim());
}

export function probeAudio(file) {
  const out = execFileSync("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=sample_rate,channels", "-of", "csv=p=0", file], { encoding: "utf8" }).trim();
  const [sampleRate, channels] = out.split(",").map(Number);
  return { sampleRate, channels };
}

export function cropAudio(input, output, { from, to }) {
  mkdirSync(path.dirname(output), { recursive: true });
  execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", String(from), "-to", String(to), "-i", input, "-c:a", "libmp3lame", "-b:a", "128k", output]);
}

/** ffmpeg concat demuxer with a silence gap between files. Re-encodes once at the end. */
export function concatWithGaps(files, output, { gap = 0.4, workDir }) {
  mkdirSync(workDir, { recursive: true });
  const { sampleRate, channels } = probeAudio(files[0]);
  const sil = path.join(workDir, `silence-${gap}s-${sampleRate}-${channels}.mp3`);
  if (!existsSync(sil))
    execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", `anullsrc=r=${sampleRate}:cl=${channels === 1 ? "mono" : "stereo"}`, "-t", String(gap), "-c:a", "libmp3lame", "-b:a", "128k", sil]);
  const list = path.join(workDir, "concat.txt");
  const rows = [];
  files.forEach((f, i) => {
    if (i) rows.push(`file '${path.resolve(sil)}'`);
    rows.push(`file '${path.resolve(f)}'`);
  });
  writeFileSync(list, rows.join("\n") + "\n");
  execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-c:a", "libmp3lame", "-b:a", "128k", output]);
  // Line start offsets inside the episode file.
  const offsets = [];
  let t = 0;
  const silDur = probeDuration(sil);
  files.forEach((f, i) => {
    if (i) t += silDur;
    offsets.push(Math.round(t * 1000) / 1000);
    t += probeDuration(f);
  });
  return { offsets, total: probeDuration(output) };
}

// ---------------------------------------------------------------- STT provider

export const WHISPER_PY = path.join(ROOT, "scratch/voice-venv/bin/python");
export const WHISPER_SCRIPT = path.join(ROOT, "scripts/voice/lib/whisper_stt.py");

/** Local faster-whisper (Hebrew fine-tune), Scribe-shaped output. Zero cost. */
export function localWhisper(file) {
  if (!existsSync(WHISPER_PY)) throw new Error("local STT needs scratch/voice-venv (python3 -m venv scratch/voice-venv && scratch/voice-venv/bin/pip install faster-whisper)");
  const out = execFileSync(WHISPER_PY, ["-I", WHISPER_SCRIPT, path.resolve(file)], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  return JSON.parse(out);
}

/**
 * provider: "scribe" (ElevenLabs, per spec), "local" (faster-whisper), or "auto"
 * (Scribe, falling back to local when the key lacks the speech_to_text permission).
 * Returns { resp, provider }. state.scribeBlocked remembers a permission failure for the run.
 */
export async function transcribe({ file, provider = "auto", apiKey, state = {}, fetch }) {
  if (provider === "local" || (provider === "auto" && state.scribeBlocked)) return { resp: localWhisper(file), provider: "local" };
  try {
    const resp = await elevenScribe({ audio: readFileSync(file), filename: path.basename(file), apiKey: apiKey(), fetch });
    return { resp, provider: "scribe" };
  } catch (e) {
    if (provider === "auto" && /missing_permissions|speech_to_text|HTTP 401/.test(e.message)) {
      if (!state.scribeBlocked) console.error("WARNING: ElevenLabs key lacks speech_to_text permission; falling back to local faster-whisper STT.");
      state.scribeBlocked = true;
      return { resp: localWhisper(file), provider: "local" };
    }
    throw e;
  }
}

/** Cached transcribe: dir/<base>.<provider>-<audiohash>.json. Returns { resp, provider, cached }. */
export async function cachedTranscribe({ dir, base, file, provider = "auto", apiKey, state = {}, fetch }) {
  mkdirSync(dir, { recursive: true });
  const h = sha(readFileSync(file));
  const f = (p) => path.join(dir, `${base}.${p}-${h}.json`);
  const read = (p) => ({ resp: JSON.parse(readFileSync(f(p), "utf8")), provider: p, cached: true });
  const store = (p, resp) => {
    writeFileSync(f(p), JSON.stringify(resp, null, 2));
    return { resp, provider: p, cached: false };
  };
  if (provider !== "local" && existsSync(f("scribe"))) return read("scribe");
  if (provider === "scribe" || (provider === "auto" && !state.scribeBlocked)) {
    const r = await transcribe({ file, provider: "scribe", apiKey, state, fetch }).catch((e) => {
      if (provider === "auto" && /missing_permissions|speech_to_text|HTTP 401/.test(e.message)) {
        if (!state.scribeBlocked) console.error("WARNING: ElevenLabs key lacks speech_to_text permission; falling back to local faster-whisper STT.");
        state.scribeBlocked = true;
        return null;
      }
      throw e;
    });
    if (r) return store("scribe", r.resp);
  }
  if (existsSync(f("local"))) return read("local");
  return store("local", localWhisper(file));
}
