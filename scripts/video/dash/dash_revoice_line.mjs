#!/usr/bin/env node
// Re-voice ONE story line with the house TTS request (scripts/voice: lexicon defaultVoice + model, text =
// applyLexicon(voice), no voice_settings, mp3_44100_128: the same request shape as every voice-check take), then a
// local faster-whisper STT diff (zero cost). No Gemini call (voice-check stage 1 is skipped on purpose).
//
//   node dash_revoice_line.mjs <scripts.json> <episode> <section> <line> <outDir> [--take k] [--expect <word>]...
//
// Takes are cached by a hash of (tts text, voiceId, model) like voice-check, so a re-run spends nothing.
// --expect words are read from argv only as given by the caller (they come from the script JSON, never typed here).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { applyLexicon, loadLexicon } from "../../../scripts/voice/lexicon.mjs";
import { elevenTTS, readEnvKey, sha, localWhisper, probeDuration } from "../../../scripts/voice/lib/io.mjs";
import { scribeWords, diffTranscript } from "../../../scripts/voice/lib/core.mjs";

const a = process.argv.slice(2);
const [file, ep, section, idxS, outDir] = a;
let take = 1;
const expectIdx = [];
for (let i = 5; i < a.length; i++) {
  if (a[i] === "--take") take = Number(a[++i]);
  else if (a[i] === "--expect-word") expectIdx.push(Number(a[++i]));   // word index in the display line
}
const lex = loadLexicon();
const line = JSON.parse(readFileSync(file, "utf8")).episodes[ep][section][Number(idxS)];
const { tts } = applyLexicon(line.voice, lex);
const { voiceId, model } = lex.defaultVoice;
mkdirSync(outDir, { recursive: true });
const slug = `${ep}-${section}-${idxS}-${sha([tts, voiceId, model]).slice(0, 8)}-t${take}`;
const mp3 = path.join(outDir, `${slug}.mp3`);
let spent = 0;
if (!existsSync(mp3)) {
  const buf = await elevenTTS({ text: tts, voiceId, model, apiKey: readEnvKey("ELEVENLABS_API_KEY") });
  writeFileSync(mp3, buf);
  spent = tts.length;
}
const sttFile = mp3.replace(/\.mp3$/, ".local.json");
const stt = existsSync(sttFile) ? JSON.parse(readFileSync(sttFile, "utf8")) : localWhisper(mp3);
writeFileSync(sttFile, JSON.stringify(stt, null, 1));
const sw = scribeWords(stt);
const diff = diffTranscript(tts, sw.text, { lexicon: lex });
const clean = line.voice.replace(/^\[[^\]]+\]\s*/, "").split(" ");
const report = {
  file: mp3, voice: lex.defaultVoice, request: { text: tts, model_id: model, output_format: "mp3_44100_128", voice_settings: "none (account defaults, as voice-check)" },
  ttsCharsSpent: spent, duration: probeDuration(mp3), heard: sw.text,
  words: sw.words.map((w) => ({ text: w.text, start: w.start, end: w.end })),
  sttIssues: diff.issues.map((i) => ({ severity: i.severity, kind: i.kind, expected: i.expected, heard: i.heard })),
  expect: expectIdx.map((k) => ({ index: k, word: clean[k], heard: sw.text.includes(clean[k]) })),
};
writeFileSync(mp3.replace(/\.mp3$/, ".report.json"), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
