// Hebrew TTS pronunciation layer.
//
// A voice line has two forms:
//   clean - the copy spelling (captions, QA, copy files)
//   tts   - clean + lexicon substitutions, the exact string sent to TTS
// Voice spellings live only in data/voice/pronunciation-lexicon.json and are
// never written back into copy files.
//
// No Hebrew literals in this file: Hebrew letters are referenced by code point.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const DEFAULT_LEXICON_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../data/voice/pronunciation-lexicon.json",
);

// Hebrew cantillation + niqqud, U+0591..U+05C7, minus maqaf U+05BE.
const NIQQUD_RE = /[\u0591-\u05BD\u05BF-\u05C7]/u;
const NIQQUD_RE_G = /[\u0591-\u05BD\u05BF-\u05C7]/gu;
// Joiners that are ignored when comparing (but preserved in output).
const JOINER_RE = /[-\u05BE]/u;

const VAV = "\u05D5";
const HE = "\u05D4";
const BET = "\u05D1";
const LAMED = "\u05DC";
const KAF = "\u05DB";
const MEM = "\u05DE";
const SHIN = "\u05E9";
const GERSHAYIM = "\u05F4";

// Attached one-letter prefixes: (vav)(shin)(bet|lamed|kaf|mem)(he), plus kaf+shin / mem+shin.
export const HEBREW_PREFIXES = (() => {
  const set = new Set();
  for (const v of ["", VAV])
    for (const s of ["", SHIN])
      for (const p of ["", BET, LAMED, KAF, MEM])
        for (const h of ["", HE]) {
          const combo = v + s + p + h;
          if (combo) set.add(combo);
        }
  for (const v of ["", VAV]) {
    set.add(v + KAF + SHIN);
    set.add(v + MEM + SHIN);
  }
  return set;
})();

// Prefix clusters that make an unvowelized word ambiguous for TTS
// (mem / mem+he / vav+mem / vav+mem+he). Longest first.
const RISKY_PREFIXES = [VAV + MEM + HE, VAV + MEM, MEM + HE, MEM];
const RISKY_MIN_REST = 4;

// Words: letters/marks/digits, optionally joined by hyphen, maqaf, geresh, gershayim, quotes.
const TOKEN_RE = /[\p{L}\p{M}\p{N}]+(?:[-\u05BE\u05F3\u05F4"'][\p{L}\p{M}\p{N}]+)*/gu;
const TAG_RE = /\[[^\]]*\]/g;

export function stripNiqqud(s) {
  return s.replace(NIQQUD_RE_G, "");
}

export function hasNiqqud(s) {
  return NIQQUD_RE.test(s);
}

export function loadLexicon(file = DEFAULT_LEXICON_PATH) {
  return JSON.parse(readFileSync(file, "utf8"));
}

/** Comparison key + map from key index to original index. */
function normalize(s) {
  let norm = "";
  const map = [];
  for (let i = 0; i < s.length; ) {
    const cp = s.codePointAt(i);
    const ch = String.fromCodePoint(cp);
    if (!NIQQUD_RE.test(ch) && !JOINER_RE.test(ch)) {
      const low = ch.toLowerCase();
      for (let k = 0; k < low.length; k++) map.push(i);
      norm += low;
    }
    i += ch.length;
  }
  map.push(s.length);
  return { norm, map };
}

function tagSpans(text) {
  const spans = [];
  for (const m of text.matchAll(TAG_RE)) spans.push([m.index, m.index + m[0].length]);
  return spans;
}

function inSpans(pos, spans) {
  return spans.some(([a, b]) => pos >= a && pos < b);
}

function tokenize(text) {
  const tags = tagSpans(text);
  const out = [];
  for (const m of text.matchAll(TOKEN_RE)) {
    if (inSpans(m.index, tags)) continue;
    const { norm, map } = normalize(m[0]);
    out.push({ text: m[0], start: m.index, end: m.index + m[0].length, norm, map });
  }
  return { tokens: out, tags };
}

function compilePatterns(lexicon) {
  const pats = [];
  for (const entry of lexicon.entries ?? []) {
    const forms = new Set([entry.clean, ...(entry.match ?? [])].filter(Boolean));
    for (const form of forms) {
      const parts = form
        .split(/\s+/u)
        .filter(Boolean)
        .map((p) => normalize(p).norm);
      if (parts.length) pats.push({ entry, parts, size: parts.join(" ").length });
    }
  }
  // Longest phrase first, then longest text.
  pats.sort((a, b) => b.parts.length - a.parts.length || b.size - a.size);
  return pats;
}

function tryMatch(text, tokens, i, pat) {
  const k = pat.parts.length;
  if (i + k > tokens.length) return null;
  const first = tokens[i];
  let prefixLen = 0;
  if (first.norm !== pat.parts[0]) {
    if (!pat.entry.allowPrefixes) return null;
    if (!first.norm.endsWith(pat.parts[0])) return null;
    const prefix = first.norm.slice(0, first.norm.length - pat.parts[0].length);
    if (!HEBREW_PREFIXES.has(prefix)) return null;
    prefixLen = prefix.length;
  }
  for (let j = 1; j < k; j++) {
    const prev = tokens[i + j - 1];
    const cur = tokens[i + j];
    if (!/^\s+$/u.test(text.slice(prev.end, cur.start))) return null;
    if (cur.norm !== pat.parts[j]) return null;
  }
  const start = first.start + first.map[prefixLen];
  const end = tokens[i + k - 1].end;
  return { start, end, prefix: text.slice(first.start, start), k };
}

/** All lexicon hits in a line, non-overlapping, left to right. */
export function findMatches(text, lexicon) {
  const { tokens } = tokenize(text);
  const pats = compilePatterns(lexicon);
  const hits = [];
  for (let i = 0; i < tokens.length; ) {
    let hit = null;
    for (const pat of pats) {
      const m = tryMatch(text, tokens, i, pat);
      if (m) {
        hit = { ...m, entry: pat.entry };
        break;
      }
    }
    if (hit) {
      const original = text.slice(hit.start, hit.end);
      hits.push({
        id: hit.entry.id,
        status: hit.entry.status,
        start: hit.start,
        end: hit.end,
        prefix: hit.prefix,
        original,
        tts: hit.entry.tts,
        alreadyTts: original === hit.entry.tts,
        tokens: tokens.slice(i, i + hit.k).map((t) => t.text),
      });
      i += hit.k;
    } else i += 1;
  }
  return hits;
}

/**
 * clean text -> { tts, applied }. Everything outside the matched spans
 * (audio tags, punctuation, attached prefixes) is preserved byte-exactly.
 * Idempotent: spans already equal to their tts are left alone and not reported.
 */
export function applyLexicon(cleanText, lexicon) {
  const hits = findMatches(cleanText, lexicon);
  let out = "";
  let pos = 0;
  const applied = [];
  for (const h of hits) {
    if (h.alreadyTts) continue;
    out += cleanText.slice(pos, h.start) + h.tts;
    pos = h.end;
    applied.push(h.id);
  }
  out += cleanText.slice(pos);
  return { tts: out, applied };
}

function riskyPrefix(norm) {
  for (const p of RISKY_PREFIXES) {
    if (norm.startsWith(p) && [...norm.slice(p.length)].filter((c) => /\p{L}/u.test(c)).length >= RISKY_MIN_REST)
      return p;
  }
  return null;
}

/**
 * Flags pronunciation risks not covered by the lexicon. Flags only; fixes nothing.
 * Returns [{ token, reason, level: "flag" | "info", id? }]. Only level "flag" is unresolved.
 */
export function lintVoiceLine(cleanText, lexicon) {
  const out = [];
  const hits = findMatches(cleanText, lexicon);
  const covered = (pos) => hits.some((h) => pos >= h.start - h.prefix.length && pos < h.end);
  for (const h of hits) {
    if (h.status !== "approved")
      out.push({ token: h.prefix + h.original, reason: `pending approval (${h.id})`, level: "flag", id: h.id });
    else out.push({ token: h.prefix + h.original, reason: `resolved via lexicon (${h.id})`, level: "info", id: h.id });
  }

  const homographs = new Set(
    (lexicon.homographs ?? []).map((h) => normalize(typeof h === "string" ? h : h.clean ?? "").norm).filter(Boolean),
  );
  const { tokens, tags } = tokenize(cleanText);
  for (const t of tokens) {
    if (covered(t.start)) continue;
    const vowelized = hasNiqqud(t.text);
    if (/\p{Script=Latin}/u.test(t.text)) {
      out.push({ token: t.text, reason: "latin token not in lexicon", level: "flag" });
      continue;
    }
    if (/\p{N}/u.test(t.text)) {
      out.push({ token: t.text, reason: "digits (spell out or add to lexicon)", level: "flag" });
      continue;
    }
    if (t.text.includes(GERSHAYIM) || t.text.includes('"')) {
      out.push({ token: t.text, reason: "abbreviation with gershayim", level: "flag" });
      continue;
    }
    if (homographs.has(t.norm)) {
      out.push({ token: t.text, reason: "known homograph", level: "flag" });
      continue;
    }
    if (vowelized) {
      out.push({ token: t.text, reason: "author-vowelized", level: "info" });
      continue;
    }
    const p = riskyPrefix(t.norm);
    if (p) out.push({ token: t.text, reason: "unvowelized prefix cluster (mem/mem-he/vav-mem)", level: "flag" });
  }
  // Symbols outside word tokens.
  for (const m of cleanText.matchAll(/[\u20AA%]/gu)) {
    if (inSpans(m.index, tags) || covered(m.index)) continue;
    out.push({ token: m[0], reason: "symbol (spell out)", level: "flag" });
  }
  return out;
}
