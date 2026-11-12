#!/usr/bin/env node
// Whole-script Hebrew voice check. Reports only lines with problems.
//
// node scripts/voice/voice-check.mjs <scripts.json> [--episode A1] [--section script_30]
//      [--audio] [--takes 2] [--out dir] [--judge advisory|gate] [--model gemini-3.8-flash]
//      [--judge-model <model>] [--gap 0.4] [--lexicon file] [--stt auto|scribe|local]
//
// Stage 1 (default): lexicon apply + lint, then one Gemini "ear check" per episode
//   (ambiguous words, eyes-closed comprehension, odd wording). Cheap, no audio.
// Stage 2 (--audio, spends ElevenLabs credits, requires --episode): N takes per line,
//   STT diff (ElevenLabs Scribe; "auto" falls back to local faster-whisper if the key
//   lacks the speech_to_text permission), forced-choice audio judge on lexicon + ambiguous words, auto-pick,
//   episode MP3 + review.html.
//
// All Gemini/ElevenLabs results are cached under <out>/cache and takes under <out>/takes,
// so a re-run spends nothing for work already done. Model-suggested niqqud is UNVERIFIED
// data in word-cards.json and is never written to the lexicon.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { applyLexicon, loadLexicon, DEFAULT_LEXICON_PATH } from "./lexicon.mjs";
import {
  collectLines,
  slugId,
  diffTranscript,
  scribeWords,
  unitTimeSpan,
  cropWindow,
  lineTargets,
  pickTake,
  judgmentFails,
  filterReport,
  lineHasIssues,
} from "./lib/core.mjs";
import {
  EAR_SYSTEM,
  EAR_SCHEMA,
  JUDGE_SYSTEM,
  JUDGE_SCHEMA,
  buildEarCheckPayload,
  sanitizeEarResult,
  resolvedWords,
  lintFor,
  judgeOrder,
  buildJudgeQuestion,
  interpretJudge,
} from "./lib/llm-checks.mjs";
import {
  ROOT,
  DEFAULT_GEMINI_MODEL,
  readEnvKey,
  sha,
  cachedJson,
  geminiJSON,
  elevenTTS,
  cachedTranscribe,
  probeDuration,
  cropAudio,
  concatWithGaps,
} from "./lib/io.mjs";
import { renderReviewHtml } from "./lib/review-html.mjs";

const MISREADINGS = JSON.parse(readFileSync(new URL("./lib/misreadings.json", import.meta.url), "utf8"));

function parseArgs(argv) {
  const o = { file: null, episode: null, section: null, audio: false, takes: 2, out: null, judge: "advisory", model: DEFAULT_GEMINI_MODEL, judgeModel: null, stt: "auto", gap: 0.4, lexicon: DEFAULT_LEXICON_PATH };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--episode") o.episode = next();
    else if (a === "--section") o.section = next();
    else if (a === "--audio") o.audio = true;
    else if (a === "--takes") o.takes = Number(next());
    else if (a === "--out") o.out = next();
    else if (a === "--judge") o.judge = next();
    else if (a === "--model") o.model = next();
    else if (a === "--judge-model") o.judgeModel = next();
    else if (a === "--gap") o.gap = Number(next());
    else if (a === "--stt") o.stt = next();
    else if (a === "--lexicon") o.lexicon = next();
    else if (!o.file) o.file = a;
    else throw new Error(`unexpected argument: ${a}`);
  }
  if (!o.file) {
    console.error("usage: node scripts/voice/voice-check.mjs <scripts.json> [--episode A1] [--section script_30] [--audio] [--takes 2] [--out dir]");
    process.exit(2);
  }
  if (!["advisory", "gate"].includes(o.judge)) throw new Error("--judge must be advisory|gate");
  if (o.audio && !o.episode) throw new Error("--audio spends credits: pass --episode (and ideally --section)");
  if (!(o.takes >= 1 && o.takes <= 5)) throw new Error("--takes must be 1..5");
  o.judgeModel ??= o.model;
  o.out ??= path.join(ROOT, "scratch/video-dash/check", `${o.episode ?? "all"}-${o.section ?? "all"}`);
  return o;
}

// ---------------------------------------------------------------- Stage 1

async function stage1(lines, lexicon, o, ctx) {
  const byEp = new Map();
  for (const l of lines) {
    const { tts, applied } = applyLexicon(l.voice, lexicon);
    Object.assign(l, { tts, applied, resolved: resolvedWords(tts, lexicon), lint: lintFor(l, lexicon) });
    if (!byEp.has(l.episode)) byEp.set(l.episode, []);
    byEp.get(l.episode).push(l);
  }
  for (const [ep, group] of byEp) {
    const payload = buildEarCheckPayload(group);
    const key = sha({ v: 3, model: o.model, system: EAR_SYSTEM, payload });
    const { value, cached } = await cachedJson(path.join(o.out, "cache/ear"), `${ep}-${key}`, async () => {
      const r = await geminiJSON({ system: EAR_SYSTEM, parts: [{ text: JSON.stringify(payload, null, 1) }], schema: EAR_SCHEMA, model: o.model, thinkingLevel: "HIGH", apiKey: ctx.geminiKey() });
      return r;
    });
    ctx.cost.geminiCalls += cached ? 0 : 1;
    if (!cached && value.usage) ctx.cost.geminiTokens += value.usage.totalTokenCount ?? 0;
    const byId = new Map((value.json.lines ?? []).map((r) => [r.id, r]));
    for (const l of group) {
      const raw = byId.get(l.id);
      if (!raw) {
        l.stage1Error = "model returned no entry for this line";
        continue;
      }
      Object.assign(l, sanitizeEarResult(raw, l, lexicon));
    }
    console.error(`stage1 ${ep}: ${group.length} lines (${cached ? "cached" : o.model})`);
  }
  return lines;
}

// ---------------------------------------------------------------- Stage 2

async function judgeClip(clipFile, target, o, ctx) {
  const order = judgeOrder(`${target.label}|${target.intended}`);
  const q = buildJudgeQuestion({ intended: target.intended, wrong: target.wrong, order });
  const audio = readFileSync(clipFile);
  const key = sha({ v: 1, model: o.judgeModel, clip: sha(audio), q: q.text, system: JUDGE_SYSTEM });
  const { value, cached } = await cachedJson(path.join(o.out, "cache/judge"), key, () =>
    geminiJSON({
      system: JUDGE_SYSTEM,
      parts: [{ inlineData: { mimeType: "audio/mp3", data: audio.toString("base64") } }, { text: q.text }],
      schema: JUDGE_SCHEMA,
      model: o.judgeModel,
      thinkingLevel: "HIGH",
      apiKey: ctx.geminiKey(),
    }),
  );
  if (!cached) ctx.cost.geminiCalls++;
  return { ...interpretJudge(value.json, q.map), order, model: o.judgeModel };
}

/** Time span for an STT issue (dropped words fall back to the neighbouring heard word). */
function issueSpan(issue, diff, sw) {
  let span = issue.actIdx.length ? unitTimeSpan(diff.heardUnits, issue.actIdx, sw.words) : null;
  if (span) return span;
  for (let e = (issue.expIdx[0] ?? 0) - 1; e >= 0; e--) {
    const a = diff.map.get(e);
    const s = a && unitTimeSpan(diff.heardUnits, a, sw.words);
    if (s) return { start: s.end, end: s.end + 0.3 };
  }
  const first = sw.words[0];
  return first ? { start: 0, end: first.end } : null;
}

async function checkTake(line, k, targets, o, ctx, lexicon) {
  const slug = slugId(line.id);
  const takeFile = path.join(o.out, "takes", `${slug}-t${k}.mp3`);
  mkdirSync(path.dirname(takeFile), { recursive: true });
  if (!existsSync(takeFile)) {
    const buf = await elevenTTS({ text: line.tts, voiceId: ctx.voice.voiceId, model: ctx.voice.model, apiKey: ctx.elevenKey() });
    writeFileSync(takeFile, buf);
    ctx.cost.ttsRequests++;
    ctx.cost.ttsChars += line.tts.length;
  }
  const duration = probeDuration(takeFile);
  const { resp: stt, provider: sttProvider, cached } = await cachedTranscribe({ dir: path.join(o.out, "takes"), base: `${slug}-t${k}`, file: takeFile, provider: o.stt, apiKey: ctx.elevenKey, state: ctx.sttState });
  ctx.cost.sttProvider = sttProvider;
  if (!cached && sttProvider === "scribe") {
    ctx.cost.sttRequests++;
    ctx.cost.sttSeconds += duration;
  }
  const sw = scribeWords(stt);
  const diff = diffTranscript(line.tts, sw.text, { lexicon });
  const clipsDir = path.join(o.out, "clips");
  const sttIssues = diff.issues.map((iss, n) => {
    const span = issueSpan(iss, diff, sw);
    let clip = null;
    if (span) {
      const win = cropWindow(span.start, span.end, { duration });
      clip = path.join(clipsDir, `${slug}-t${k}-stt${n}-${win.from}-${win.to}.mp3`);
      if (!existsSync(clip)) cropAudio(takeFile, clip, win);
      return { ...iss, span, window: win, clip };
    }
    return { ...iss, span: null, clip };
  });
  const judgments = [];
  let missingTargets = 0;
  for (const [n, t] of targets.entries()) {
    const actIdx = diff.map.get(t.unitIdx);
    const span = actIdx ? unitTimeSpan(diff.heardUnits, actIdx, sw.words) : null;
    if (!span) {
      missingTargets++;
      judgments.push({ ...t, verdict: "missing", confidence: 0, error: "target not located in transcript" });
      continue;
    }
    const win = cropWindow(span.start, span.end, { duration });
    const clip = path.join(clipsDir, `${slug}-t${k}-w${n}-${win.from}-${win.to}.mp3`);
    if (!existsSync(clip)) cropAudio(takeFile, clip, win);
    try {
      const j = await judgeClip(clip, t, o, ctx);
      judgments.push({ ...t, ...j, span, window: win, clip });
    } catch (e) {
      judgments.push({ ...t, verdict: "error", confidence: 0, error: e.message, span, window: win, clip });
    }
  }
  return { take: k, file: takeFile, duration, sttProvider, transcript: sw.text, audioEvents: sw.events, sttIssues, judgments, missingTargets };
}

async function stage2(lines, lexicon, o, ctx) {
  for (const line of lines) {
    const targets = lineTargets(line.tts, lexicon, line.ambiguous ?? [], MISREADINGS);
    const takes = [];
    for (let k = 1; k <= o.takes; k++) {
      takes.push(await checkTake(line, k, targets, o, ctx, lexicon));
      console.error(`stage2 ${line.id} take ${k}: ${takes.at(-1).sttIssues.length} stt issue(s), ${takes.at(-1).judgments.filter(judgmentFails).length} judge flag(s)`);
    }
    const pick = pickTake(takes, { judgeMode: o.judge });
    const picked = takes.find((t) => t.take === pick.picked);
    const flags = [
      ...picked.sttIssues.filter((i) => i.severity === "major").map((i) => ({ type: "stt", ...i })),
      ...picked.judgments.filter(judgmentFails).map((j) => ({ type: "pronunciation", ...j })),
    ];
    line.audio = { targets: targets.length, takes, picked: pick.picked, needsHuman: pick.needsHuman, reasons: pick.reasons, flags };
  }
  const files = lines.map((l) => l.audio.takes.find((t) => t.take === l.audio.picked).file);
  const epFile = path.join(o.out, `${o.episode}-${o.section ?? "all"}.mp3`);
  const { offsets, total } = concatWithGaps(files, epFile, { gap: o.gap, workDir: path.join(o.out, "cache/concat") });
  lines.forEach((l, i) => (l.audio.offset = offsets[i]));
  const html = renderReviewHtml({ title: `${o.episode} ${o.section ?? ""} voice check`, episodeFile: path.basename(epFile), total, lines, outDir: o.out, judgeMode: o.judge });
  writeFileSync(path.join(o.out, "review.html"), html);
  return { epFile, total };
}

// ---------------------------------------------------------------- output

function printReport(lines, flagged, o) {
  const out = [];
  out.push(`=== voice-check: ${path.relative(ROOT, o.file)} ${o.episode ?? "all"}/${o.section ?? "all"} ===`);
  out.push(`lines checked: ${lines.length}   lines with issues: ${flagged.length}\n`);
  for (const l of flagged) {
    out.push(`${l.id}  (${l.speaker ?? "?"})`);
    out.push(`  voice: ${l.voice}`);
    if (l.tts !== l.voice) out.push(`  tts:   ${l.tts}`);
    if (l.stage1Error) out.push(`  ERROR stage1: ${l.stage1Error}`);
    for (const f of l.lint.filter((x) => x.level === "flag")) out.push(`  LINT       ${f.token}  (${f.reason})`);
    for (const a of l.ambiguous ?? [])
      out.push(
        `  AMBIGUOUS  ${a.word}: say "${a.intended?.translit}" (${a.intended?.meaning}); risk ${a.wrong.map((w) => `"${w.translit}" (${w.meaning})`).join(", ")}` +
          (a.candidate_niqqud ? `  candidate ${a.candidate_niqqud.value} [UNVERIFIED]` : ""),
      );
    if (l.eyesClosed?.pass === false) out.push(`  EYES-CLOSED FAIL: ${l.eyesClosed.reason}${l.eyesClosed.visual_dependencies?.length ? ` [leans on: ${l.eyesClosed.visual_dependencies.join("; ")}]` : ""}`);
    for (const w of l.oddWording ?? []) out.push(`  ODD        ${w.phrase}: ${w.why}`);
    if (l.audio) {
      out.push(`  AUDIO      picked take ${l.audio.picked}${l.audio.needsHuman ? "  ** NEEDS HUMAN **" : ""}`);
      for (const [t, r] of Object.entries(l.audio.reasons)) if (r.length) out.push(`    take ${t}: ${r.join("; ")}`);
      for (const f of l.audio.flags) {
        const at = f.span ? `@${(l.audio.offset + f.span.start).toFixed(2)}s` : "";
        if (f.type === "stt") out.push(`    STT ${f.kind} ${at}: expected "${f.expected}" heard "${f.heard}"`);
        else out.push(`    PRON ${at} ${f.label}: verdict=${f.verdict} conf=${f.confidence ?? "-"} heard="${f.heard ?? ""}" (want "${f.intended}")`);
      }
    }
    out.push("");
  }
  return out.join("\n");
}

function wordCards(lines) {
  return lines.flatMap((l) =>
    (l.ambiguous ?? []).map((a) => ({
      line: l.id,
      word: a.word,
      intended: a.intended,
      wrong: a.wrong,
      candidateNiqqud: a.candidate_niqqud?.value ?? null,
      status: "UNVERIFIED",
      note: "Model suggestion. Needs an ear test and Eitan's approval before it can enter data/voice/pronunciation-lexicon.json.",
    })),
  );
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  o.file = path.resolve(o.file);
  const lexicon = loadLexicon(o.lexicon);
  const doc = JSON.parse(readFileSync(o.file, "utf8"));
  const lines = collectLines(doc, { episode: o.episode, section: o.section });
  if (!lines.length) throw new Error("no voice lines matched the selection");
  mkdirSync(o.out, { recursive: true });
  let gk;
  let ek;
  const ctx = {
    voice: lexicon.defaultVoice,
    geminiKey: () => (gk ??= readEnvKey("GEMINI_API_KEY")),
    elevenKey: () => (ek ??= readEnvKey("ELEVENLABS_API_KEY")),
    sttState: {},
    cost: { geminiCalls: 0, geminiTokens: 0, ttsRequests: 0, ttsChars: 0, sttRequests: 0, sttSeconds: 0 },
  };

  await stage1(lines, lexicon, o, ctx);
  let s2 = null;
  if (o.audio) s2 = await stage2(lines, lexicon, o, ctx);

  const flagged = filterReport(lines);
  const strip = (l) => {
    const { resolved, ...rest } = l;
    void resolved;
    return rest;
  };
  writeFileSync(path.join(o.out, "lines.json"), JSON.stringify(lines.map(strip), null, 2));
  writeFileSync(path.join(o.out, "report.json"), JSON.stringify({ file: path.relative(ROOT, o.file), episode: o.episode, section: o.section, checked: lines.length, flagged: flagged.map(strip), cost: ctx.cost }, null, 2));
  writeFileSync(path.join(o.out, "word-cards.json"), JSON.stringify(wordCards(lines), null, 2));
  const text = printReport(lines, flagged, o);
  writeFileSync(path.join(o.out, "report.txt"), text);
  console.log(text);
  if (s2) {
    const needs = lines.filter((l) => l.audio.needsHuman).length;
    console.log(`episode mp3: ${path.relative(ROOT, s2.epFile)} (${s2.total.toFixed(1)}s)  review: ${path.relative(ROOT, path.join(o.out, "review.html"))}`);
    console.log(`lines needing a human: ${needs}/${lines.length}   judge mode: ${o.judge}`);
  }
  console.log(`clean lines (not shown): ${lines.filter((l) => !lineHasIssues(l)).length}`);
  console.log(`cost: ${JSON.stringify(ctx.cost)}`);
  console.log(`outputs: ${path.relative(ROOT, o.out)}/{report.txt,report.json,word-cards.json,lines.json${s2 ? ",review.html" : ""}}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
