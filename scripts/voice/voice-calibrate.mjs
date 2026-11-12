#!/usr/bin/env node
// Calibrates the Stage-2 forced-choice audio judge against Eitan's labelled clips.
// No new renders: Scribe on existing files + Gemini judge calls (all cached).
//
// node scripts/voice/voice-calibrate.mjs [--models gemini-3.8-flash,gemini-3.1-pro-preview] [--stt auto|scribe|local] [--out dir]
//
// Labels (Eitan, 2026-11-12, Nimrod files): see ITEMS. Target words are addressed by
// token index inside the numbered line, so no Hebrew lives in this file.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { units, diffTranscript, scribeWords, unitTimeSpan, cropWindow } from "./lib/core.mjs";
import { JUDGE_SYSTEM, JUDGE_SCHEMA, buildJudgeQuestion, interpretJudge } from "./lib/llm-checks.mjs";
import { ROOT, readEnvKey, sha, cachedJson, geminiJSON, cachedTranscribe, probeDuration, cropAudio } from "./lib/io.mjs";

const PT = "scratch/video-dash/pron-test";
const R2 = { audio: `${PT}/round2-nimrod.mp3`, text: `${PT}/round2-lines.txt` };
const R3 = { audio: `${PT}/round3-nimrod.mp3`, text: `${PT}/round3-lines.txt` };
const SAMPLE = { audio: "scratch/video-dash/sample/A1-30s-nimrod.mp3", text: "scratch/video-dash/sample/A1-30s-nimrod.txt" };

const BOT_MODAOT = { intended: "bot mo-da-OT (ads bot)", wrong: ["bot mu-da-UT (awareness bot)"] };
const MEAPNIYOT = { intended: "me-a-pni-YOT (from the enquiries; clear p)", wrong: ["me-haf-ni-YOT / me-ha-pni-YOT (h sounded, or p read as f)"] };
const SITE_BOT = { intended: "SAIT bot (English 'site')", wrong: ["SEIT bot (rhymes with 'eight')"] };

// line: 0-based line in the text file; tokens: [first, last] word-token index within that line.
export const ITEMS = [
  { id: "r2-1 plain ads-bot", src: R2, line: 0, tokens: [1, 2], ...BOT_MODAOT, label: "BAD", note: "likely BAD (mudaut)" },
  { id: "r2-2 vowelized ads-bot", src: R2, line: 1, tokens: [1, 2], ...BOT_MODAOT, label: "GOOD" },
  { id: "r2-3 me-klikim", src: R2, line: 2, tokens: [2, 2], intended: "mi-kli-KIM (from clicks)", wrong: ["mak-li-KIM (they click)"], label: "GOOD" },
  { id: "r2-6 mehapniyot (tsere)", src: R2, line: 5, tokens: [2, 2], ...MEAPNIYOT, label: "BAD" },
  { id: "r2-7 mehapniyot (segol)", src: R2, line: 6, tokens: [2, 2], ...MEAPNIYOT, label: "BAD" },
  { id: "r2-8 Latin Site Bot", src: R2, line: 7, tokens: [1, 2], ...SITE_BOT, label: "GOOD" },
  { id: "r2-9 Hebrew Site Bot a", src: R2, line: 8, tokens: [1, 2], ...SITE_BOT, label: "BAD", note: "likely BAD (seitbot)" },
  { id: "r2-10 Hebrew Site Bot b", src: R2, line: 9, tokens: [1, 2], ...SITE_BOT, label: "BAD", note: "likely BAD (seitbot)" },
  { id: "r3-1 me-ha-hyphen", src: R3, line: 0, tokens: [2, 2], ...MEAPNIYOT, label: "GOOD" },
  { id: "sample meter", src: SAMPLE, line: 0, tokens: [0, 0], intended: "mo-NE (meter, counter)", wrong: ["mu-NA (was appointed)"], label: "BAD" },
  // Unlabelled (reported, not scored).
  { id: "r3-2 (unknown)", src: R3, line: 1, tokens: [2, 2], ...MEAPNIYOT, label: null },
  { id: "r3-3 (unknown)", src: R3, line: 2, tokens: [2, 2], ...MEAPNIYOT, label: null },
  { id: "r3-4 (unknown)", src: R3, line: 3, tokens: [2, 2], ...MEAPNIYOT, label: null },
  { id: "r3-5 (unknown)", src: R3, line: 4, tokens: [2, 2], ...MEAPNIYOT, label: null },
];

function parseArgs(argv) {
  const o = { models: ["gemini-3.8-flash"], stt: "auto", out: path.join(ROOT, "scratch/video-dash/check/calibration") };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--models") o.models = argv[++i].split(",");
    else if (argv[i] === "--out") o.out = argv[++i];
    else if (argv[i] === "--stt") o.stt = argv[++i];
    else throw new Error(`unexpected ${argv[i]}`);
  }
  return o;
}

/** Locate [first,last] tokens of line `line` inside the transcript of the whole file. */
export function locate(lines, line, [t0, t1], diff, words) {
  let off = 0;
  for (let i = 0; i < line; i++) off += units(lines[i], null).length;
  const act = [];
  for (let t = t0; t <= t1; t++) act.push(...(diff.map.get(off + t) ?? []));
  return act.length ? unitTimeSpan(diff.heardUnits, act, words) : null;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  mkdirSync(o.out, { recursive: true });
  const ek = readEnvKey("ELEVENLABS_API_KEY");
  const gk = readEnvKey("GEMINI_API_KEY");
  const cost = { sttRequests: 0, sttSeconds: 0, geminiCalls: 0 };
  const sttState = {};
  const stt = new Map();
  for (const src of new Set(ITEMS.map((i) => i.src))) {
    const file = path.join(ROOT, src.audio);
    const { resp: value, provider, cached } = await cachedTranscribe({ dir: path.join(o.out, "cache/stt"), base: path.basename(file, ".mp3"), file, provider: o.stt, apiKey: () => ek, state: sttState });
    if (!cached && provider === "scribe") {
      cost.sttRequests++;
      cost.sttSeconds += probeDuration(file);
    }
    cost.sttProvider = provider;
    const lines = readFileSync(path.join(ROOT, src.text), "utf8").split("\n").filter((l) => l.trim());
    const sw = scribeWords(value);
    const diff = diffTranscript(lines.join(" "), sw.text, { lexicon: null });
    stt.set(src, { lines, sw, diff, file, duration: probeDuration(file) });
    console.error(`stt[${provider}] ${src.audio}: ${sw.words.length} words, ${diff.issues.length} diff hunks${cached ? " (cached)" : ""}`);
  }

  const results = [];
  for (const it of ITEMS) {
    const s = stt.get(it.src);
    const span = locate(s.lines, it.line, it.tokens, s.diff, s.sw.words);
    const row = { id: it.id, label: it.label, note: it.note ?? null, span, byModel: {} };
    if (!span) {
      row.error = "target not located in transcript";
      results.push(row);
      continue;
    }
    const win = cropWindow(span.start, span.end, { duration: s.duration });
    const clip = path.join(o.out, "clips", `${it.id.split(" ")[0]}-${win.from}-${win.to}.mp3`);
    if (!existsSync(clip)) cropAudio(s.file, clip, win);
    row.clip = path.relative(ROOT, clip);
    row.window = win;
    row.heardStt = s.diff.heardUnits.filter((u) => s.sw.words.some((w) => w.start >= span.start - 0.01 && w.end <= span.end + 0.01 && w.charStart < u.end && w.charEnd > u.start)).map((u) => u.text).join(" ");
    const b64 = readFileSync(clip).toString("base64");
    for (const model of o.models) {
      row.byModel[model] = {};
      for (const order of ["intended-first", "wrong-first"]) {
        const q = buildJudgeQuestion({ intended: it.intended, wrong: it.wrong, order });
        const key = sha({ v: 1, model, clip: sha(readFileSync(clip)), q: q.text, system: JUDGE_SYSTEM });
        const { value, cached } = await cachedJson(path.join(o.out, "cache/judge"), key, () =>
          geminiJSON({ system: JUDGE_SYSTEM, parts: [{ inlineData: { mimeType: "audio/mp3", data: b64 } }, { text: q.text }], schema: JUDGE_SCHEMA, model, thinkingLevel: "HIGH", apiKey: gk }),
        );
        if (!cached) cost.geminiCalls++;
        row.byModel[model][order] = interpretJudge(value.json, q.map);
      }
    }
    results.push(row);
  }

  const pred = (j) => (j.verdict === "intended" && j.confidence >= 0.6 ? "GOOD" : "BAD");
  const out = [];
  out.push("=== audio-judge calibration (Nimrod clips, Eitan's labels) ===");
  for (const r of results) {
    out.push(`\n${r.id}  label=${r.label ?? "unlabelled"}${r.note ? ` (${r.note})` : ""}  stt="${r.heardStt ?? ""}"  ${r.span ? `${r.span.start.toFixed(2)}-${r.span.end.toFixed(2)}s` : r.error}`);
    for (const [m, byOrder] of Object.entries(r.byModel))
      for (const [ord, j] of Object.entries(byOrder)) out.push(`  ${m} ${ord.padEnd(14)} -> ${pred(j)}  (${j.verdict}, ${j.confidence}) heard "${j.heard}"`);
  }
  const summary = {};
  for (const m of o.models) {
    for (const ord of ["intended-first", "wrong-first", "both-agree"]) {
      const c = { GOOD: { GOOD: 0, BAD: 0 }, BAD: { GOOD: 0, BAD: 0 } };
      for (const r of results.filter((x) => x.label)) {
        let p;
        if (!r.byModel[m]) p = "BAD";
        else if (ord === "both-agree") p = Object.values(r.byModel[m]).every((j) => pred(j) === "GOOD") ? "GOOD" : "BAD";
        else p = pred(r.byModel[m][ord]);
        c[r.label][p]++;
      }
      const n = c.GOOD.GOOD + c.GOOD.BAD + c.BAD.GOOD + c.BAD.BAD;
      summary[`${m} ${ord}`] = { ...c, accuracy: Math.round(((c.GOOD.GOOD + c.BAD.BAD) / n) * 100) };
    }
  }
  out.push("\n=== confusion (rows = Eitan label, cols = judge) ===");
  out.push("model / order".padEnd(44) + "GOOD->GOOD  GOOD->BAD  BAD->BAD  BAD->GOOD  accuracy");
  for (const [k, c] of Object.entries(summary))
    out.push(`${k.padEnd(44)}${String(c.GOOD.GOOD).padEnd(12)}${String(c.GOOD.BAD).padEnd(11)}${String(c.BAD.BAD).padEnd(10)}${String(c.BAD.GOOD).padEnd(11)}${c.accuracy}%`);
  out.push(`\ncost: ${JSON.stringify(cost)}`);
  const text = out.join("\n");
  writeFileSync(path.join(o.out, "calibration.txt"), text);
  writeFileSync(path.join(o.out, "calibration.json"), JSON.stringify({ results, summary, cost }, null, 2));
  console.log(text);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
