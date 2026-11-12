// node --test scripts/voice/voice-check.test.mjs
// No Hebrew literals: lines come from the r3 script JSON and the lexicon; network is mocked.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { applyLexicon, loadLexicon, stripNiqqud } from "./lexicon.mjs";
import {
  collectLines,
  diffTranscript,
  normKey,
  cropWindow,
  pickTake,
  filterReport,
  scribeWords,
  unitTimeSpan,
  lineTargets,
  slugId,
} from "./lib/core.mjs";
import { sanitizeEarResult, buildJudgeQuestion, interpretJudge, judgeOrder, buildEarCheckPayload } from "./lib/llm-checks.mjs";
import { geminiJSON, elevenScribe, parseJsonLoose } from "./lib/io.mjs";
import { renderReviewHtml } from "./lib/review-html.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const R3 = JSON.parse(readFileSync(path.join(ROOT, "docs/copy/video-dash-scripts-r3-2026-11-12.json"), "utf8"));
const LEX = loadLexicon();
const MIS = JSON.parse(readFileSync(path.join(ROOT, "scripts/voice/lib/misreadings.json"), "utf8"));
const A1 = R3.episodes.A1.script_30;
const noTags = (s) => s.replace(/\[[^\]]*\]\s*/g, "");
const words = (s) => noTags(s).split(/\s+/u).filter(Boolean);
const scribeOf = (text, step = 0.5) => ({
  words: text.split(" ").flatMap((t, i) => [
    ...(i ? [{ text: " ", type: "spacing", start: i * step, end: i * step }] : []),
    { text: t, type: "word", start: i * step, end: i * step + step * 0.8 },
  ]),
});

// ---------------------------------------------------------------- selection

test("collectLines: episode/section filter, ids, screen field", () => {
  const all = collectLines(R3, { episode: "A1" });
  const s30 = collectLines(R3, { episode: "A1", section: "script_30" });
  assert.equal(s30.length, A1.length);
  assert.ok(all.length > s30.length);
  assert.equal(s30[1].id, "A1.script_30[1]");
  assert.equal(s30[1].screen, A1[1].screen);
  assert.ok(all.some((l) => l.id === "A1.eitan_close" && l.screen === null));
  assert.equal(slugId("A1.script_30[1]"), "A1-script-30-1");
});

// ---------------------------------------------------------------- transcript diff

test("diff is niqqud-insensitive: vowelized TTS vs plain transcript = no issues", () => {
  const { tts } = applyLexicon(A1[4].voice, LEX);
  assert.notEqual(tts, A1[4].voice);
  for (const heard of [noTags(A1[4].voice), stripNiqqud(noTags(tts)), noTags(tts).replace(/[.,]/g, "")]) {
    const { issues } = diffTranscript(tts, heard, { lexicon: LEX });
    assert.deepEqual(issues, [], heard);
  }
});

test("diff: final-letter and hyphen variants compare equal", () => {
  const w = words(A1[0].voice);
  const last = w[w.length - 1].replace(/\.$/u, "");
  assert.equal(normKey(last), normKey(last + "-"));
  // A word ending in a final letter compared with its regular-letter spelling.
  const finalWord = words(A1[1].voice).find((x) => /[\u05DA\u05DD\u05DF\u05E3\u05E5][.]?$/u.test(x)).replace(/\.$/u, "");
  const regular = finalWord.slice(0, -1) + String.fromCodePoint(finalWord.codePointAt(finalWord.length - 1) + 1);
  assert.equal(normKey(finalWord), normKey(regular));
});

test("diff: lexicon spellings are equivalent (Latin Site Bot vs Hebrew spelling)", () => {
  const line = R3.episodes.S1.eitan_close.voice;
  const { tts } = applyLexicon(line, LEX);
  assert.ok(tts.includes("Site Bot"));
  const { issues } = diffTranscript(tts, stripNiqqud(noTags(line)), { lexicon: LEX });
  assert.deepEqual(issues.filter((i) => i.severity === "major"), []);
});

test("diff: dropped, added, garbled, tag read aloud, number format", () => {
  const line = A1[0].voice;
  const w = words(line);
  const dropped = diffTranscript(line, [w[0], ...w.slice(2)].join(" "));
  assert.deepEqual(dropped.issues.map((i) => i.kind), ["dropped"]);
  assert.equal(dropped.issues[0].expected, w[1]);

  const extra = words(A1[3].voice)[0];
  const added = diffTranscript(line, [...w.slice(0, 3), extra, ...w.slice(3)].join(" "));
  assert.deepEqual(added.issues.map((i) => [i.kind, i.severity]), [["added", "major"]]);

  const garbled = diffTranscript(line, [w[0], words(A1[3].voice)[2], ...w.slice(2)].join(" "));
  assert.equal(garbled.issues[0].kind, "garbled");
  assert.deepEqual(garbled.map.get(1), [1], "substitution still maps to its position");

  const tag = diffTranscript(line, ["sighs", ...w].join(" "));
  assert.deepEqual(tag.issues.map((i) => i.kind), ["tag-read-aloud"]);

  const price = A1[5].voice;
  const pw = words(price);
  const numHeard = [...pw.slice(0, 4), "249", ...pw.slice(7)].join(" ");
  const num = diffTranscript(price, numHeard);
  assert.deepEqual(num.issues.map((i) => [i.kind, i.severity]), [["number-format", "minor"]]);
});

test("diff: one-letter change in a short word is garbled; plene/defective and split/joined are spelling", () => {
  const line = A1[0].voice;
  const w = words(line);
  const meter = w[0];
  const swapped = meter.slice(0, -1) + "\u05E2"; // last letter -> ayin
  const g = diffTranscript(line, [swapped, ...w.slice(1)].join(" "));
  assert.deepEqual(g.issues.map((i) => [i.kind, i.severity]), [["garbled", "major"]]);
  const plene = meter.slice(0, 1) + "\u05D5" + meter.slice(1); // extra vav
  assert.deepEqual(diffTranscript(line, [plene, ...w.slice(1)].join(" ")).issues.map((i) => i.kind), ["spelling"]);
  const split = [w[0], w[1].slice(0, 1), w[1].slice(1), ...w.slice(2)].join(" ");
  assert.deepEqual(diffTranscript(line, split).issues.map((i) => [i.kind, i.severity]), [["spelling", "minor"]]);
  // Lexicon phrase heard as one joined word (Hebrew Site Bot spelling, no space).
  const sb = LEX.entries.find((e) => e.id === "site-bot").clean.replace(" ", "");
  const tts = applyLexicon(R3.episodes.S1.eitan_close.voice, LEX).tts;
  const heard = stripNiqqud(noTags(R3.episodes.S1.eitan_close.voice)).replace(LEX.entries.find((e) => e.id === "site-bot").clean, sb);
  assert.ok(heard.includes(sb));
  assert.deepEqual(diffTranscript(tts, heard, { lexicon: LEX }).issues.filter((i) => i.severity === "major"), []);
});

test("scribeWords + unitTimeSpan locate a unit's audio", () => {
  const heard = noTags(A1[0].voice);
  const sw = scribeWords(scribeOf(heard));
  assert.equal(sw.text, heard);
  assert.equal(sw.words.length, words(heard).length);
  const diff = diffTranscript(A1[0].voice, sw.text);
  const span = unitTimeSpan(diff.heardUnits, diff.map.get(2), sw.words);
  assert.deepEqual(span, { start: 1, end: 1.4 });
  const ev = scribeWords({ words: [{ type: "audio_event", text: "(sighs)", start: 0, end: 1 }] });
  assert.deepEqual(ev.words, []);
  assert.equal(ev.events.length, 1);
});

// ---------------------------------------------------------------- crop math

test("cropWindow: +-200ms, clamped to file bounds", () => {
  assert.deepEqual(cropWindow(1.0, 1.5), { from: 0.8, to: 1.7, dur: 0.9 });
  assert.deepEqual(cropWindow(0.1, 0.4), { from: 0, to: 0.6, dur: 0.6 });
  assert.deepEqual(cropWindow(9.7, 9.95, { duration: 10 }), { from: 9.5, to: 10, dur: 0.5 });
  assert.deepEqual(cropWindow(2, 3, { pad: 0.5 }), { from: 1.5, to: 3.5, dur: 2 });
  assert.throws(() => cropWindow(2, 1));
  assert.throws(() => cropWindow(undefined, 1));
});

// ---------------------------------------------------------------- targets

test("lineTargets: lexicon words with known misreadings + stage-1 ambiguous words", () => {
  const { tts } = applyLexicon(A1[4].voice, LEX);
  const t = lineTargets(tts, LEX, [], MIS);
  assert.deepEqual(t.map((x) => x.source), ["lexicon:bot-modaot", "lexicon:meapniyot", "lexicon:me-klikim"]);
  assert.ok(t.every((x) => x.wrong.length && x.intended));
  const meter = words(A1[0].voice)[0];
  const amb = [{ word: meter, intended: { translit: "mo-NE" }, wrong: [{ translit: "mu-NA" }] }];
  const t0 = lineTargets(A1[0].voice, LEX, amb, MIS);
  assert.deepEqual(t0.map((x) => [x.unitIdx, x.intended, x.wrong[0]]), [[0, "mo-NE", "mu-NA"]]);
});

// ---------------------------------------------------------------- take picking

const take = (n, { major = 0, minor = 0, judge = [], missing = 0 } = {}) => ({
  take: n,
  sttIssues: [...Array(major).fill({ severity: "major" }), ...Array(minor).fill({ severity: "minor" })],
  judgments: judge.map(([verdict, confidence]) => ({ verdict, confidence })),
  missingTargets: missing,
});

test("pickTake: first clean take wins", () => {
  const r = pickTake([take(1, { major: 1 }), take(2), take(3)]);
  assert.equal(r.picked, 2);
  assert.equal(r.needsHuman, false);
  assert.match(r.reasons[1][0], /STT/);
});

test("pickTake: judge blocks only in gate mode", () => {
  const takes = [take(1, { judge: [["wrong", 0.9]] }), take(2, { judge: [["intended", 0.9]] })];
  assert.equal(pickTake(takes, { judgeMode: "advisory" }).picked, 1);
  assert.equal(pickTake(takes, { judgeMode: "gate" }).picked, 2);
  // Low confidence counts as a fail.
  assert.equal(pickTake([take(1, { judge: [["intended", 0.4]] }), take(2, { judge: [["intended", 0.7]] })], { judgeMode: "gate" }).picked, 2);
});

test("pickTake: none passes -> needsHuman, least-bad take kept", () => {
  const r = pickTake([take(1, { major: 2 }), take(2, { major: 1, minor: 3 }), take(3, { missing: 1, major: 1 })]);
  assert.equal(r.needsHuman, true);
  assert.equal(r.picked, 2);
});

// ---------------------------------------------------------------- report filtering

test("filterReport: only flagged lines are shown", () => {
  const lines = [
    { id: "clean", lint: [{ level: "info" }], ambiguous: [], eyesClosed: { pass: true }, oddWording: [] },
    { id: "lint", lint: [{ level: "flag" }], ambiguous: [], eyesClosed: { pass: true }, oddWording: [] },
    { id: "amb", lint: [], ambiguous: [{ word: "x" }], eyesClosed: { pass: true }, oddWording: [] },
    { id: "ear", lint: [], ambiguous: [], eyesClosed: { pass: false, reason: "visual" }, oddWording: [] },
    { id: "odd", lint: [], ambiguous: [], eyesClosed: { pass: true }, oddWording: [{ phrase: "x" }] },
    { id: "audio-ok", lint: [], ambiguous: [], eyesClosed: { pass: true }, oddWording: [], audio: { needsHuman: false, flags: [] } },
    { id: "audio-bad", lint: [], ambiguous: [], eyesClosed: { pass: true }, oddWording: [], audio: { needsHuman: true, flags: [] } },
  ];
  assert.deepEqual(filterReport(lines).map((l) => l.id), ["lint", "amb", "ear", "odd", "audio-bad"]);
});

test("review.html lists only flagged lines", () => {
  const base = { lint: [], ambiguous: [], eyesClosed: { pass: true }, oddWording: [] };
  const audio = (flags, needsHuman = false) => ({ offset: 2, picked: 1, needsHuman, reasons: { 1: [] }, flags, takes: [{ take: 1, judgments: [] }] });
  const html = renderReviewHtml({
    title: "t",
    episodeFile: "ep.mp3",
    total: 10,
    outDir: "/x",
    judgeMode: "advisory",
    lines: [
      { ...base, id: "L-clean", voice: "a", audio: audio([]) },
      { ...base, id: "L-flag", voice: "b", audio: audio([{ type: "pronunciation", label: "w", verdict: "wrong", confidence: 0.9, span: { start: 0.5 }, clip: "/x/clips/c.mp3", intended: "i" }]) },
    ],
  });
  assert.ok(html.includes("L-flag"));
  assert.ok(!html.includes("L-clean"));
  assert.ok(html.includes('src="clips/c.mp3"'));
  assert.ok(html.includes("currentTime=2.50"));
});

// ---------------------------------------------------------------- stage-1 sanitize

test("sanitizeEarResult drops words not in the line or resolved by the lexicon; niqqud is UNVERIFIED", () => {
  const line = { voice: A1[4].voice, tts: applyLexicon(A1[4].voice, LEX).tts };
  const w = words(A1[4].voice);
  const raw = {
    ambiguous_words: [
      { word: w[1], intended: { translit: "a" }, wrong: [{ translit: "b" }], candidate_niqqud: "x" }, // lexicon word
      { word: words(A1[0].voice)[0], intended: { translit: "a" }, wrong: [], candidate_niqqud: "" }, // not in line
      { word: w[5].replace(/,$/u, ""), intended: { translit: "she-sa-GAR-ta" }, wrong: [{ translit: "she-sa-GART" }], candidate_niqqud: "cand" },
    ],
    eyes_closed: { pass: true, reason: "ok" },
    odd_wording: [],
  };
  const r = sanitizeEarResult(raw, line, LEX);
  assert.equal(r.ambiguous.length, 1);
  assert.deepEqual(r.ambiguous[0].candidate_niqqud, { value: "cand", status: "UNVERIFIED" });
  assert.equal(r.droppedAmbiguous.length, 2);
  const p = buildEarCheckPayload([{ id: "x", section: "s", screen: "sc", tts: line.tts, resolved: ["r"] }]);
  assert.deepEqual(p.lines[0], { id: "x", section: "s", screen: "sc", line: line.tts, resolved: ["r"] });
});

// ---------------------------------------------------------------- judge mapping

test("judge question maps A/B back to intended/wrong in both orders", () => {
  for (const order of ["intended-first", "wrong-first"]) {
    const q = buildJudgeQuestion({ intended: "mo-NE", wrong: ["mu-NA"], order });
    const intendedLetter = Object.entries(q.map).find(([, v]) => v === "intended")[0];
    assert.ok(q.text.includes(`${intendedLetter}: "mo-NE"`));
    assert.equal(interpretJudge({ choice: intendedLetter, confidence: 0.8, heard: "mone" }, q.map).verdict, "intended");
    assert.equal(interpretJudge({ choice: "neither", confidence: 2 }, q.map).confidence, 1);
  }
  assert.equal(judgeOrder("abc"), judgeOrder("abc"));
});

// ---------------------------------------------------------------- mocked network

test("geminiJSON: request shape, key header, JSON parse, thought parts skipped", async () => {
  let req;
  const fetch = async (url, init) => {
    req = { url, init };
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ thought: true, text: "hmm" }, { text: '{"ok":1} trailing' }] } }], usageMetadata: { totalTokenCount: 5 } }), { status: 200 });
  };
  const r = await geminiJSON({ system: "s", parts: [{ text: "u" }], schema: { type: "object" }, apiKey: "K", fetch });
  assert.deepEqual(r.json, { ok: 1 });
  assert.match(req.url, /gemini-3\.8-flash:generateContent$/);
  assert.equal(req.init.headers["x-goog-api-key"], "K");
  const body = JSON.parse(req.init.body);
  assert.deepEqual(body.generationConfig.responseJsonSchema, { type: "object" });
  assert.equal(body.generationConfig.responseMimeType, "application/json");
});

test("geminiJSON: non-retryable error surfaces without leaking the key", async () => {
  const fetch = async () => new Response("bad", { status: 400 });
  await assert.rejects(geminiJSON({ system: "s", parts: [], apiKey: "SECRET", fetch }), (e) => !e.message.includes("SECRET") && /400/.test(e.message));
});

test("elevenScribe: multipart fields for Hebrew word timestamps", async () => {
  let fd;
  const fetch = async (url, init) => {
    fd = init.body;
    assert.equal(url, "https://api.elevenlabs.io/v1/speech-to-text");
    assert.equal(init.headers["xi-api-key"], "K");
    return new Response(JSON.stringify({ text: "x", words: [] }), { status: 200 });
  };
  const r = await elevenScribe({ audio: Buffer.from("abc"), apiKey: "K", fetch });
  assert.deepEqual(r, { text: "x", words: [] });
  assert.equal(fd.get("timestamps_granularity"), "word");
  assert.equal(fd.get("language_code"), "heb");
  assert.ok(fd.get("model_id").startsWith("scribe"));
});

test("parseJsonLoose tolerates fences and trailing junk", () => {
  assert.deepEqual(parseJsonLoose('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJsonLoose('{"a":1} extra'), { a: 1 });
});

test("cachedTranscribe: auto falls back to local on missing STT permission; cache keyed by provider", async () => {
  const { mkdtempSync, writeFileSync: wf, readdirSync } = await import("node:fs");
  const os = await import("node:os");
  const { cachedTranscribe, sha } = await import("./lib/io.mjs");
  const dir = mkdtempSync(path.join(os.tmpdir(), "vc-"));
  const audio = path.join(dir, "a.mp3");
  wf(audio, "fake-audio");
  const h = sha(readFileSync(audio));
  wf(path.join(dir, `a.local-${h}.json`), JSON.stringify({ words: [], text: "local" }));
  let calls = 0;
  const deny = async () => {
    calls++;
    return new Response(JSON.stringify({ detail: { status: "missing_permissions", message: "missing the permission speech_to_text" } }), { status: 401 });
  };
  const state = {};
  const r1 = await cachedTranscribe({ dir, base: "a", file: audio, apiKey: () => "K", state, fetch: deny });
  assert.deepEqual([r1.provider, r1.cached, r1.resp.text], ["local", true, "local"]);
  assert.equal(state.scribeBlocked, true);
  await cachedTranscribe({ dir, base: "a", file: audio, apiKey: () => "K", state, fetch: deny });
  assert.equal(calls, 1, "blocked Scribe is not retried within a run");
  // Once Scribe works it wins and is cached separately.
  const ok = async () => new Response(JSON.stringify({ words: [], text: "scribe" }), { status: 200 });
  const r2 = await cachedTranscribe({ dir, base: "a", file: audio, apiKey: () => "K", state: {}, fetch: ok });
  assert.deepEqual([r2.provider, r2.cached], ["scribe", false]);
  assert.ok(readdirSync(dir).some((f) => f.startsWith("a.scribe-")));
  await assert.rejects(cachedTranscribe({ dir, base: "b", file: audio, provider: "scribe", apiKey: () => "K", state: {}, fetch: deny }), /401/);
});
