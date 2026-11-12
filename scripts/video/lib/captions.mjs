// Stage 4: captions from the CLEAN text only (never the TTS form, never the transcript).
// Card splitting (2-4 words), timing from word timestamps, RTL-safe HTML, SRT.
// The transcript is used for TIMES only; no transcript text ever reaches a caption.
// No Hebrew literals: Hebrew is referenced by code point / Unicode property.

import { findMatches, hasNiqqud } from "../../voice/lexicon.mjs";
import { diffTranscript, scribeWords, unitTimeSpan } from "../../voice/lib/core.mjs";

const WORDISH = /[\p{L}\p{N}]/u;
const NUMERIC = /^[^\p{L}]*\p{Nd}[^\p{L}]*$/u;
const LATIN_START = /^\p{Script=Latin}/u;
const PURE_LATIN = /^\p{Script=Latin}[\p{Script=Latin}\p{Nd}'\u2019&-]*$/u;
const CURRENCY = /^[\u20AA$\u20AC]$/u;
const JOINER = /^[+&/=\u00D7]$/u;
const SENT_END = /[.!?\u2026]$/u;
const CLAUSE_END = /[.,:;!?\u2026\u2014\u05C3]$/u;
const HEBREW = /\p{Script=Hebrew}/u;

// ---------------------------------------------------------------- text checks

/** Reasons a text may not be used as caption copy. Empty = fine. */
export function cleanTextProblems(text) {
  const out = [];
  if (hasNiqqud(text)) out.push("niqqud (vowel marks) in clean text; captions must use the copy spelling");
  if (/\[[^\]]*\]/u.test(text)) out.push("audio tag in clean text");
  if (/\p{Script=Hebrew}["']|["']\p{Script=Hebrew}/u.test(text)) out.push("ASCII quote next to Hebrew; use gershayim / geresh");
  if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Cyrillic}\p{Script=Arabic}]/u.test(text)) out.push("CJK / Cyrillic / Arabic character");
  if (/ {2}/u.test(text)) out.push("double space");
  return out;
}

// ---------------------------------------------------------------- units + cards

function tokenize(text) {
  return [...text.matchAll(/\S+/gu)].map((m) => ({ text: m[0], start: m.index, end: m.index + m[0].length }));
}

/**
 * Unbreakable caption units. A unit is one or more whitespace tokens that must stay
 * on the same card and line: a price run (number, shekel sign, "+", VAT word), a
 * multi-word Latin name, a lexicon phrase (product name), a dash with its word.
 * Returns [{ text, start, end, words }].
 */
export function captionUnits(text, lexicon = null) {
  const toks = tokenize(text);
  const glue = new Array(toks.length).fill(false); // glue[i]: token i sticks to token i+1
  toks.forEach((t, i) => {
    if (!WORDISH.test(t.text)) {
      const prevNum = i > 0 && NUMERIC.test(toks[i - 1].text);
      if (CURRENCY.test(t.text)) {
        if (prevNum) glue[i - 1] = true;
        else if (i + 1 < toks.length) glue[i] = true;
      } else if (JOINER.test(t.text)) {
        if (i > 0) glue[i - 1] = true;
        if (i + 1 < toks.length) glue[i] = true;
      } else if (i > 0) glue[i - 1] = true;
      else if (i + 1 < toks.length) glue[i] = true;
    } else if (PURE_LATIN.test(t.text) && i + 1 < toks.length && LATIN_START.test(toks[i + 1].text)) glue[i] = true;
  });
  if (lexicon)
    for (const h of findMatches(text, lexicon)) {
      const inside = toks.map((t, i) => (t.end > h.start && t.start < h.end ? i : -1)).filter((i) => i >= 0);
      for (let k = 0; k + 1 < inside.length; k++) glue[inside[k]] = true;
    }
  const units = [];
  for (let i = 0; i < toks.length; i++) {
    let j = i;
    while (j < toks.length - 1 && glue[j]) j++;
    const group = toks.slice(i, j + 1);
    units.push({ text: group.map((t) => t.text).join(" "), start: group[0].start, end: group.at(-1).end, words: group.filter((t) => WORDISH.test(t.text)).length });
    i = j;
  }
  return units;
}

/**
 * Split a clean line into caption cards of min..max words. Breaks prefer sentence
 * and clause ends; units are never split. A card may fall outside the range only
 * when nothing else is possible (a one-word line, or one oversized unit).
 * Returns [{ text, start, end, words, units }].
 */
export function splitCards(text, { lexicon = null, min = 2, max = 4 } = {}) {
  const U = captionUnits(text, lexicon);
  const n = U.length;
  if (!n) return [];
  const best = new Array(n + 1).fill(Infinity);
  const from = new Array(n + 1).fill(-1);
  best[0] = 0;
  for (let i = 1; i <= n; i++)
    for (let j = i - 1; j >= 0; j--) {
      const words = U.slice(j, i).reduce((s, u) => s + u.words, 0);
      if (words > max && i - j > 1) break;
      let cost = 0.1;
      if (words < min || words > max) cost += 50;
      if (i < n && !CLAUSE_END.test(U[i - 1].text)) cost += 3;
      for (let k = j; k < i - 1; k++) cost += SENT_END.test(U[k].text) ? 1 : CLAUSE_END.test(U[k].text) ? 0.5 : 0;
      if (best[j] + cost < best[i] - 1e-9) {
        best[i] = best[j] + cost;
        from[i] = j;
      }
    }
  const cards = [];
  for (let i = n; i > 0; i = from[i]) {
    const us = U.slice(from[i], i);
    cards.unshift({ text: us.map((u) => u.text).join(" "), start: us[0].start, end: us.at(-1).end, words: us.reduce((s, u) => s + u.words, 0), units: us });
  }
  return cards;
}

// ---------------------------------------------------------------- timing

/**
 * Start/end (seconds, relative to the take) for each card. Word times come from the
 * STT word timestamps aligned to the clean text; words the STT did not align are
 * interpolated by character position. Without STT, everything is interpolated.
 */
export function cardTimes(clean, cards, { stt = null, duration, lexicon = null }) {
  const anchors = [[0, 0]];
  if (stt) {
    const sw = scribeWords(stt);
    const diff = diffTranscript(clean, sw.text, { lexicon });
    diff.expectedUnits.forEach((u, i) => {
      const a = diff.map.get(i);
      const span = a && unitTimeSpan(diff.heardUnits, a, sw.words);
      const [lastChar, lastT] = anchors.at(-1);
      if (span && u.start > lastChar && span.start >= lastT && span.start < duration) anchors.push([u.start, span.start]);
    });
  }
  anchors.push([Math.max(clean.length, anchors.at(-1)[0] + 1), duration]);
  const timeAt = (ch) => {
    let k = 0;
    while (k < anchors.length - 2 && anchors[k + 1][0] <= ch) k++;
    const [c0, t0] = anchors[k];
    const [c1, t1] = anchors[k + 1];
    return t0 + ((t1 - t0) * (ch - c0)) / (c1 - c0);
  };
  const starts = cards.map((c, i) => (i === 0 ? 0 : round3(timeAt(c.start))));
  return cards.map((c, i) => ({ ...c, from: starts[i], to: i + 1 < cards.length ? starts[i + 1] : round3(duration), timed: stt ? "stt-words" : "interpolated" }));
}

const round3 = (x) => Math.round(x * 1000) / 1000;

// ---------------------------------------------------------------- bidi HTML

export const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// A left-to-right run: Latin letters / digits, inner joiners without spaces, a currency
// sign or % only when attached, and further Latin words after a single space ("Site Bot").
// Trailing punctuation and a detached shekel sign stay outside, in the RTL flow.
const A = "[\\p{Script=Latin}\\p{Nd}]";
const WORD = `${A}+(?:[.,'\\u2019&/:_\\-]${A}+)*`;
const LTR_RUN = new RegExp(`[\\u20AA$\\u20AC]?${WORD}[%\\u20AA]?(?:(?<=\\p{Script=Latin}) \\p{Script=Latin}${A}*(?:[.,'\\u2019&/:_\\-]${A}+)*)*`, "gu");

/** Escape a text and wrap each left-to-right run in <bdi dir="ltr"> so it cannot reorder its neighbours. */
export function isolateLtr(text) {
  let out = "";
  let pos = 0;
  for (const m of text.matchAll(LTR_RUN)) {
    out += escapeHtml(text.slice(pos, m.index)) + `<bdi dir="ltr">${escapeHtml(m[0])}</bdi>`;
    pos = m.index + m[0].length;
  }
  return out + escapeHtml(text.slice(pos));
}

/** Base direction for a text: RTL when it has any Hebrew letter, else LTR (so a lone "WAO." keeps its period on the right). */
export const baseDir = (text) => (HEBREW.test(text) ? "rtl" : "ltr");

/** Inner HTML of one caption card: each unit is a no-wrap, bidi-isolated span. */
export function cardHtml(card) {
  return card.units.map((u) => `<span class="u">${isolateLtr(u.text)}</span>`).join(" ");
}

// ---------------------------------------------------------------- SRT

function srtTime(t) {
  const ms = Math.round(t * 1000);
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
}

/** cues: [{ from, to, text }] in absolute seconds. */
export function toSrt(cues) {
  return cues.map((c, i) => `${i + 1}\n${srtTime(c.from)} --> ${srtTime(c.to)}\n${c.text}\n`).join("\n");
}
