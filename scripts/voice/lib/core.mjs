// Pure helpers for voice-check: line selection, transcript diff, crop math,
// take picking, report filtering. No network, no fs writes, no Hebrew literals
// (Hebrew letters are referenced by code point only).

import { findMatches, stripNiqqud, HEBREW_PREFIXES } from "../lexicon.mjs";

// ---------------------------------------------------------------- selection

/**
 * Voice lines of a scripts JSON ({ episodes: { A1: { hooks: [...], script_30: [...], eitan_close: {...} } } }).
 * Returns [{ id, episode, section, index, voice, screen, speaker }] in file order.
 */
export function collectLines(doc, { episode = null, section = null } = {}) {
  const out = [];
  for (const [ep, body] of Object.entries(doc.episodes ?? {})) {
    if (episode && ep !== episode) continue;
    for (const [sec, val] of Object.entries(body ?? {})) {
      if (section && sec !== section) continue;
      const items = Array.isArray(val) ? val.map((v, i) => [v, i]) : [[val, null]];
      for (const [item, i] of items) {
        if (!item || typeof item !== "object" || typeof item.voice !== "string") continue;
        out.push({
          id: i === null ? `${ep}.${sec}` : `${ep}.${sec}[${i}]`,
          episode: ep,
          section: sec,
          index: i,
          voice: item.voice,
          screen: typeof item.screen === "string" ? item.screen : null,
          speaker: typeof item.speaker === "string" ? item.speaker : null,
        });
      }
    }
  }
  return out;
}

export function slugId(id) {
  return id.replace(/[[\]]/g, "_").replace(/\./g, "-").replace(/_+$/g, "").replace(/_/g, "-");
}

// ---------------------------------------------------------------- normalization

const TAG_RE = /\[[^\]]*\]/g;
const WORD_RE = /[\p{L}\p{M}\p{N}]+(?:[-\u05BE\u05F3\u05F4"'][\p{L}\p{M}\p{N}]+)*/gu;
// Hebrew final letters -> regular forms (kaf, mem, nun, pe, tsadi).
const FINALS = { "\u05DA": "\u05DB", "\u05DD": "\u05DE", "\u05DF": "\u05E0", "\u05E3": "\u05E4", "\u05E5": "\u05E6" };

export function audioTags(text) {
  return [...text.matchAll(TAG_RE)].map((m) => m[0].slice(1, -1).trim().toLowerCase());
}

/** Niqqud-, joiner-, quote-, case- and final-letter-insensitive comparison key. */
export function normKey(s) {
  return stripNiqqud(s)
    .replace(/[-\u05BE\u05F3\u05F4"'’“”]/gu, "")
    .toLowerCase()
    .replace(/[\u05DA\u05DD\u05DF\u05E3\u05E5]/gu, (c) => FINALS[c]);
}

/** Replace audio tags by spaces (keeps offsets). */
function blankTags(text) {
  return text.replace(TAG_RE, (m) => " ".repeat(m.length));
}

/**
 * Comparison units of a text. A lexicon hit (possibly multi-word, possibly with an
 * attached prefix) becomes one unit keyed "<prefix>@<id>", so any spelling the
 * lexicon knows (clean / match / tts) compares equal. Other words are keyed by normKey.
 * Each unit: { key, text, start, end, tokens: [tokenIndex...] }.
 */
export function units(text, lexicon) {
  const clean = blankTags(text);
  const words = [...clean.matchAll(WORD_RE)].map((m, i) => ({ i, text: m[0], start: m.index, end: m.index + m[0].length }));
  const hits = lexicon ? findMatches(clean, lexicon) : [];
  const out = [];
  let w = 0;
  for (const h of hits) {
    const hs = h.start - h.prefix.length;
    while (w < words.length && words[w].end <= hs) {
      out.push(wordUnit(words[w]));
      w++;
    }
    const covered = [];
    while (w < words.length && words[w].start < h.end) covered.push(words[w++]);
    if (!covered.length) continue;
    out.push({
      key: `${normKey(h.prefix)}@${h.id}`,
      text: text.slice(covered[0].start, covered.at(-1).end),
      start: covered[0].start,
      end: covered.at(-1).end,
      tokens: covered.map((c) => c.i),
      lexiconId: h.id,
    });
  }
  while (w < words.length) out.push(wordUnit(words[w++]));
  return out;
}

function wordUnit(word) {
  return { key: normKey(word.text), text: word.text, start: word.start, end: word.end, tokens: [word.i] };
}

// ---------------------------------------------------------------- diff

export function levenshtein(a, b) {
  const A = [...a];
  const B = [...b];
  let prev = Array.from({ length: B.length + 1 }, (_, j) => j);
  for (let i = 1; i <= A.length; i++) {
    const cur = [i];
    for (let j = 1; j <= B.length; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[B.length];
}

export function similarity(a, b) {
  const n = Math.max([...a].length, [...b].length);
  return n ? 1 - levenshtein(a, b) / n : 1;
}

/** LCS alignment of two key arrays -> ops [{ op: "eq"|"del"|"ins", e?, a? }] (indices). */
export function alignKeys(exp, act) {
  const n = exp.length;
  const m = act.length;
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) L[i][j] = exp[i] === act[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (exp[i] === act[j]) ops.push({ op: "eq", e: i++, a: j++ });
    else if (L[i + 1][j] >= L[i][j + 1]) ops.push({ op: "del", e: i++ });
    else ops.push({ op: "ins", a: j++ });
  }
  while (i < n) ops.push({ op: "del", e: i++ });
  while (j < m) ops.push({ op: "ins", a: j++ });
  return ops;
}

const SIMILAR = 0.75;

/**
 * Align a mismatch region: groups of 1-1, 2-1 (two script words heard as one) or 1-2
 * substitutions, or single drops/inserts. Minimises total (1 - skeleton similarity);
 * a drop or insert costs 1. Returns [{ e: [k..], a: [k..] }] with local indices.
 */
export function alignHunk(ek, ak) {
  const n = ek.length;
  const m = ak.length;
  const sim = (x, y) => similarity(skeleton(x), skeleton(y));
  const cost = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(Infinity));
  const back = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(null));
  cost[0][0] = 0;
  const relax = (i, j, ni, nj, c) => {
    if (ni > n || nj > m) return;
    if (cost[i][j] + c < cost[ni][nj] - 1e-9) {
      cost[ni][nj] = cost[i][j] + c;
      back[ni][nj] = [i, j];
    }
  };
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= m; j++) {
      if (cost[i][j] === Infinity) continue;
      if (i < n) relax(i, j, i + 1, j, 1);
      if (j < m) relax(i, j, i, j + 1, 1);
      if (i < n && j < m) relax(i, j, i + 1, j + 1, 1 - sim(ek[i], ak[j]) + 1e-3);
      if (i + 1 < n && j < m) relax(i, j, i + 2, j + 1, 1 - sim(ek[i] + ek[i + 1], ak[j]) + 2e-3);
      if (i < n && j + 1 < m) relax(i, j, i + 1, j + 2, 1 - sim(ek[i], ak[j] + ak[j + 1]) + 2e-3);
      // STT writes spelled-out numbers as digits: one digit token may cover several words.
      if (j < m && /^[\p{N}.,]+$/u.test(ak[j]))
        for (let k = 1; k <= 6 && i + k <= n && /^\p{Script=Hebrew}+$/u.test(ek[i + k - 1]); k++) relax(i, j, i + k, j + 1, 0.5 + (k - 1) * 0.1);
    }
  const groups = [];
  for (let i = n, j = m; i || j; ) {
    const [pi, pj] = back[i][j];
    groups.push({ e: range(pi, i), a: range(pj, j) });
    [i, j] = [pi, pj];
  }
  return groups.reverse();
}

const range = (a, b) => Array.from({ length: b - a }, (_, k) => a + k);

/**
 * Diff the script line (expected, TTS form or clean) against an STT transcript.
 * Niqqud-insensitive. Returns { issues, map } where
 *  issues: [{ kind, severity: "major"|"minor", expected, heard, expIdx:[..], actIdx:[..] }]
 *    kinds: dropped | added | garbled | tag-read-aloud | spelling | number-format
 *    "spelling" (minor) = same consonant skeleton ignoring vav/yod and spaces, or another known
 *    lexicon spelling; any other substitution, even one letter in a short word, is "garbled".
 *  map: expected-unit index -> [actual-unit indices] (eq and paired substitutions).
 */
export function diffTranscript(expectedText, heardText, { lexicon = null, tags = null } = {}) {
  const E = units(expectedText, lexicon);
  const A = units(heardText, lexicon);
  const tagKeys = new Set((tags ?? audioTags(expectedText)).flatMap((t) => t.split(/\s+/u)).map(normKey).filter(Boolean));
  const ops = alignKeys(E.map((u) => u.key), A.map((u) => u.key));
  const map = new Map();
  const issues = [];
  let hunk = { e: [], a: [] };
  const flush = () => {
    if (!hunk.e.length && !hunk.a.length) return;
    // Sub-align the mismatch region so each substitution can still be located in time.
    for (const g of alignHunk(hunk.e.map((i) => E[i].key), hunk.a.map((i) => A[i].key))) {
      const grp = { e: g.e.map((k) => hunk.e[k]), a: g.a.map((k) => hunk.a[k]) };
      issues.push(...classifyHunk(grp, E, A, tagKeys, lexicon));
      if (grp.e.length && grp.a.length) for (const ei of grp.e) map.set(ei, grp.a);
    }
    hunk = { e: [], a: [] };
  };
  for (const o of ops) {
    if (o.op === "eq") {
      flush();
      map.set(o.e, [o.a]);
    } else if (o.op === "del") hunk.e.push(o.e);
    else hunk.a.push(o.a);
  }
  flush();
  return { issues, map, expectedUnits: E, heardUnits: A };
}

function classifyHunk({ e, a }, E, A, tagKeys, lexicon) {
  const exp = e.map((i) => E[i].text).join(" ");
  const heard = a.map((i) => A[i].text).join(" ");
  const base = { expected: exp, heard, expIdx: e, actIdx: a };
  if (!e.length) {
    const allTag = a.every((i) => tagKeys.has(A[i].key));
    return [{ ...base, kind: allTag ? "tag-read-aloud" : "added", severity: "major" }];
  }
  if (!a.length) return [{ ...base, kind: "dropped", severity: "major" }];
  if (a.every((i) => /^[\p{N}\p{S}.,]+$/u.test(A[i].text))) return [{ ...base, kind: "number-format", severity: "minor" }];
  const ek = e.map((i) => E[i].key).join(" ");
  const ak = a.map((i) => A[i].key).join(" ");
  const sim = round(similarity(ek, ak));
  const heardJoined = skeleton(ak.replace(/\s+/gu, ""));
  // Same consonant skeleton (plene/defective spelling, word split/join) = transcription variant.
  if (skeleton(ek.replace(/\s+/gu, "")) === heardJoined) return [{ ...base, kind: "spelling", severity: "minor", similarity: sim }];
  // A lexicon unit heard as another known spelling of the same entry, written split/joined.
  const forms = e.flatMap((i) => (E[i].lexiconId && lexicon ? lexiconForms(lexicon, E[i].lexiconId, E[i].key) : []));
  if (forms.length && e.length === 1 && forms.some((f) => skeleton(f) === heardJoined)) return [{ ...base, kind: "spelling", severity: "minor", similarity: sim }];
  // Latin-only hunks: tolerate small STT spelling noise.
  if (/^[a-z0-9 ]+$/u.test(ek + ak) && sim >= SIMILAR) return [{ ...base, kind: "spelling", severity: "minor", similarity: sim }];
  return [{ ...base, kind: "garbled", severity: "major", similarity: sim }];
}

/** Hebrew consonant skeleton: drop alef/vav/yod (vowel letters) so plene/defective spellings compare equal. */
export function skeleton(key) {
  return key.replace(/[\u05D0\u05D5\u05D9]/gu, "");
}

function lexiconForms(lexicon, id, unitKey) {
  const entry = lexicon.entries.find((x) => x.id === id);
  if (!entry) return [];
  const prefix = unitKey.slice(0, unitKey.indexOf("@"));
  return [entry.clean, entry.tts, ...(entry.match ?? [])].filter(Boolean).map((f) => prefix + normKey(f).replace(/\s+/gu, ""));
}

const round = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

/** Scribe response -> { text, words: [{ text, start, end, charStart, charEnd }] } (word items only). */
export function scribeWords(resp) {
  const words = [];
  let text = "";
  for (const w of resp?.words ?? []) {
    if (w.type !== "word") continue;
    const t = String(w.text).trim();
    if (!t) continue;
    if (text) text += " ";
    words.push({ text: t, start: w.start, end: w.end, charStart: text.length, charEnd: text.length + t.length });
    text += t;
  }
  return { text, words, events: (resp?.words ?? []).filter((w) => w.type === "audio_event").map((w) => ({ text: w.text, start: w.start, end: w.end })) };
}

/** Time span of heard units (from diff map) using the Scribe words they came from. */
export function unitTimeSpan(heardUnits, actIdx, words) {
  const ws = [];
  for (const ai of actIdx) {
    const u = heardUnits[ai];
    for (const w of words) if (w.charStart < u.end && w.charEnd > u.start) ws.push(w);
  }
  const timed = ws.filter((w) => Number.isFinite(w.start) && Number.isFinite(w.end));
  if (!timed.length) return null;
  return { start: Math.min(...timed.map((w) => w.start)), end: Math.max(...timed.map((w) => w.end)) };
}

// ---------------------------------------------------------------- crop math

/** Crop window: word span +- pad seconds, clamped to [0, duration]. */
export function cropWindow(start, end, { pad = 0.2, duration = Infinity } = {}) {
  if (!(Number.isFinite(start) && Number.isFinite(end)) || end < start) throw new Error(`bad span ${start}-${end}`);
  const from = Math.max(0, start - pad);
  const to = Math.min(duration, end + pad);
  return { from: round(from, 3), to: round(to, 3), dur: round(to - from, 3) };
}

// ---------------------------------------------------------------- targets

/**
 * Words to check by ear in a line: approved/pending lexicon hits (with known wrong
 * readings) plus Stage-1 ambiguous words. Returns [{ label, source, unitIdx, intended, wrong }]
 * where unitIdx indexes units(ttsText, lexicon).
 */
export function lineTargets(ttsText, lexicon, ambiguous = [], misreadings = {}) {
  const U = units(ttsText, lexicon);
  const out = [];
  U.forEach((u, idx) => {
    if (!u.lexiconId) return;
    const entry = lexicon.entries.find((e) => e.id === u.lexiconId);
    const wrong = misreadings[u.lexiconId];
    if (!entry || !wrong?.length) return;
    out.push({ label: u.text, source: `lexicon:${u.lexiconId}`, unitIdx: idx, intended: entry.reading, wrong });
  });
  for (const a of ambiguous) {
    const idx = findWordUnit(U, a.word);
    if (idx < 0 || U[idx].lexiconId) continue;
    const wrong = (a.wrong ?? []).map((w) => w.translit).filter(Boolean);
    if (!a.intended?.translit || !wrong.length) continue;
    out.push({ label: U[idx].text, source: "stage1", unitIdx: idx, intended: a.intended.translit, wrong });
  }
  return out;
}

/** Index of the unit equal to `word` (niqqud-insensitive), allowing an attached prefix. -1 if absent. */
export function findWordUnit(U, word) {
  const k = normKey(word.replace(TAG_RE, "").trim().replace(/^[^\p{L}]+|[^\p{L}\p{M}]+$/gu, ""));
  if (!k) return -1;
  let idx = U.findIndex((u) => u.key === k);
  if (idx >= 0) return idx;
  idx = U.findIndex((u) => u.key.endsWith(k) && HEBREW_PREFIXES.has(u.key.slice(0, u.key.length - k.length)));
  if (idx >= 0) return idx;
  return U.findIndex((u) => k.endsWith(u.key) && HEBREW_PREFIXES.has(k.slice(0, k.length - u.key.length)));
}

// ---------------------------------------------------------------- take picking

export const JUDGE_MIN_CONFIDENCE = 0.6;

/** A judgment fails when the judge picked a wrong reading / neither, or is unsure. */
export function judgmentFails(j) {
  if (!j || j.error) return true;
  return j.verdict !== "intended" || (j.confidence ?? 0) < JUDGE_MIN_CONFIDENCE;
}

/**
 * takes: [{ take, sttIssues: [{severity}], judgments: [{verdict, confidence}], missingTargets }]
 * judgeMode "gate": judge failures block a take; "advisory": they are reported only.
 * Returns { picked, needsHuman, reasons: { [take]: [..] } }. Falls back to the
 * lowest-scoring take when none passes, so the episode stays listenable.
 */
export function pickTake(takes, { judgeMode = "advisory" } = {}) {
  const reasons = {};
  let best = null;
  for (const t of takes) {
    const major = t.sttIssues.filter((i) => i.severity === "major").length;
    const minor = t.sttIssues.length - major;
    const jf = (t.judgments ?? []).filter(judgmentFails).length;
    const missing = t.missingTargets ?? 0;
    const r = [];
    if (major) r.push(`${major} STT diff issue(s)`);
    if (missing) r.push(`${missing} target word(s) not found in transcript`);
    if (jf) r.push(`${jf} pronunciation judgment(s) failed${judgeMode === "advisory" ? " (advisory)" : ""}`);
    reasons[t.take] = r;
    const blocking = major + missing + (judgeMode === "gate" ? jf : 0);
    if (!blocking) return { picked: t.take, needsHuman: false, reasons };
    const score = blocking * 10 + jf * 3 + minor;
    if (!best || score < best.score) best = { take: t.take, score };
  }
  return { picked: best ? best.take : null, needsHuman: true, reasons };
}

// ---------------------------------------------------------------- report

export function lineHasIssues(r) {
  return Boolean(
    r.lint?.some((f) => f.level === "flag") ||
      r.ambiguous?.length ||
      (r.eyesClosed && r.eyesClosed.pass === false) ||
      r.oddWording?.length ||
      r.audio?.needsHuman ||
      r.audio?.flags?.length,
  );
}

/** Only lines with something to look at. */
export function filterReport(lines) {
  return lines.filter(lineHasIssues);
}
