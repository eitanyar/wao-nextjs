// node --test scripts/voice/lexicon.test.mjs
// No Hebrew literals: real voice lines are loaded from the r3 script JSON and
// expected strings come from the lexicon file; single prefix letters use \u escapes.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { applyLexicon, lintVoiceLine, loadLexicon, stripNiqqud, findMatches } from "./lexicon.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const R3 = JSON.parse(readFileSync(path.join(ROOT, "docs/copy/video-dash-scripts-r3-2026-11-12.json"), "utf8"));
const LEX = loadLexicon();
const E = Object.fromEntries(LEX.entries.map((e) => [e.id, e]));
const ep = R3.episodes;
const MEM = "\u05DE";
const HE = "\u05D4";
const VAV = "\u05D5";

const withoutIds = (...ids) => ({ ...LEX, entries: LEX.entries.filter((e) => !ids.includes(e.id)) });
const count = (s, sub) => s.split(sub).length - 1;

test("lexicon shape", () => {
  assert.deepEqual(LEX.defaultVoice, { voice: "Nimrod", voiceId: "ZiofZHcEBTn5sRySe5h8", model: "eleven_v4" });
  assert.ok(Array.isArray(LEX.homographs));
  for (const e of LEX.entries) {
    for (const k of ["id", "clean", "tts", "reading", "meaning", "status", "verifiedOn", "date", "note"]) assert.ok(k in e, `${e.id}.${k}`);
    assert.ok(["approved", "pending"].includes(e.status));
    assert.deepEqual(e.verifiedOn, LEX.defaultVoice);
  }
  for (const id of ["bot-modaot", "modaot", "me-klikim", "meapniyot", "site-bot", "brand-wao"]) assert.equal(E[id].status, "approved");
});

test("ads-bot line: bot-modaot, meapniyot, me-klikim applied; [tag] preserved", () => {
  const line = ep.A1.script_30[4].voice;
  const { tts, applied } = applyLexicon(line, LEX);
  assert.deepEqual(applied, ["bot-modaot", "meapniyot", "me-klikim"]);
  assert.ok(tts.startsWith("[calm] "));
  assert.ok(tts.includes(E["bot-modaot"].tts));
  assert.ok(tts.includes(E["meapniyot"].tts));
  assert.ok(tts.includes(E["me-klikim"].tts));
  assert.ok(!tts.includes(E["meapniyot"].clean));
  // Clean text recoverable: stripping niqqud + the hyphen gives back the clean line.
  assert.equal(stripNiqqud(tts).replace("-", ""), line);
});

test("modaot word entry applies inside a real line when the phrase entry is absent", () => {
  const line = ep.A1.script_30[4].voice;
  const { tts, applied } = applyLexicon(line, withoutIds("bot-modaot"));
  assert.ok(applied.includes("modaot"));
  assert.ok(tts.includes(E.modaot.tts));
});

test("site-bot: vocalized r3 form -> Latin 'Site Bot', tags and punctuation kept", () => {
  const line = ep.S1.eitan_close.voice;
  const { tts, applied } = applyLexicon(line, LEX);
  assert.ok(applied.includes("site-bot"));
  assert.ok(tts.includes("Site Bot:"));
  assert.ok(tts.startsWith("[calm] "));
  const plain = applyLexicon(stripNiqqud(line), LEX);
  assert.ok(plain.applied.includes("site-bot"), "plain spelling also matches");
});

test("prefix handling for modaot (allowPrefixes)", () => {
  const lex = withoutIds("bot-modaot");
  for (const p of [HE, VAV + HE, MEM + HE, "\u05DC", "\u05D1"]) {
    const { tts, applied } = applyLexicon(`[calm] ${p}${E.modaot.clean}.`, lex);
    assert.deepEqual(applied, ["modaot"], p);
    assert.equal(tts, `[calm] ${p}${E.modaot.tts}.`, "prefix kept byte-exact");
  }
  // Not a prefix: an extra letter that isn't in the prefix set must not match.
  const { applied } = applyLexicon(`\u05D0${E.modaot.clean}`, lex);
  assert.deepEqual(applied, []);
});

test("exact-token entries do not take extra prefixes", () => {
  const { applied } = applyLexicon(`${VAV}${E["me-klikim"].clean}`, LEX);
  assert.deepEqual(applied, []);
});

test("brand: vocalized mem-prefixed form keeps prefix; WAO and mem-hyphen-WAO handled", () => {
  const line = ep.A1.eitan_close.voice;
  const { tts, applied } = applyLexicon(line, LEX);
  assert.ok(applied.includes("brand-wao"));
  const brand = E["brand-wao"];
  const vocal = brand.match.find((m) => m !== "WAO");
  const vocalWithPrefix = line.split(" ")[2].replace(/\.$/u, "");
  assert.ok(vocalWithPrefix.endsWith(vocal));
  const prefix = vocalWithPrefix.slice(0, vocalWithPrefix.length - vocal.length);
  assert.ok(tts.includes(prefix + brand.tts + "."));
  assert.equal(applyLexicon(`${MEM}-WAO`, LEX).tts, `${MEM}-${brand.tts}`);
  assert.equal(applyLexicon("WAO", LEX).tts, brand.tts);
});

test("approved brand is resolved, not flagged", () => {
  const items = lintVoiceLine(ep.A1.eitan_close.voice, LEX);
  assert.ok(!items.some((f) => f.level === "flag" && f.id === "brand-wao"));
  assert.ok(items.some((f) => f.level === "info" && f.id === "brand-wao"));
});

test("pending entries still apply but are flagged as pending approval", () => {
  const lex = { ...LEX, entries: LEX.entries.map((e) => (e.id === "brand-wao" ? { ...e, status: "pending" } : e)) };
  assert.ok(applyLexicon(ep.A1.eitan_close.voice, lex).applied.includes("brand-wao"));
  const flags = lintVoiceLine(ep.A1.eitan_close.voice, lex).filter((f) => f.level === "flag");
  assert.ok(flags.some((f) => f.id === "brand-wao" && /pending approval/.test(f.reason)));
});

test("idempotent: applying to an already-TTS string is a no-op", () => {
  const lines = [ep.A1.script_30[4].voice, ep.A1.eitan_close.voice, ep.S1.eitan_close.voice, ep.A3.script_30[4].voice];
  for (const line of lines) {
    const once = applyLexicon(line, LEX).tts;
    const twice = applyLexicon(once, LEX);
    assert.equal(twice.tts, once);
    assert.deepEqual(twice.applied, []);
    assert.equal(count(twice.tts, E["me-klikim"].tts), count(once, E["me-klikim"].tts), "no double vowelization");
  }
});

test("audio tags are never matched or altered", () => {
  const line = `[WAO] ${ep.A1.script_30[4].voice}`;
  const { tts } = applyLexicon(line, LEX);
  assert.ok(tts.startsWith("[WAO] [calm] "));
  const lint = lintVoiceLine("[sighs] [short pause] ok", LEX);
  assert.deepEqual(lint.map((f) => f.token), ["ok"]);
});

test("lint: latin, digits, symbols, gershayim flagged; vowelized is info", () => {
  const display = ep.A1.script_30[5].display; // has WAO, 249, shekel sign, gershayim abbreviation
  const items = lintVoiceLine(display, LEX);
  const flags = items.filter((f) => f.level === "flag").map((f) => f.reason);
  assert.ok(flags.some((r) => r.startsWith("digits")));
  assert.ok(flags.some((r) => r.startsWith("symbol")));
  assert.ok(flags.some((r) => r.startsWith("abbreviation")));
  assert.ok(flags.some((r) => r.startsWith("latin")) === false, "WAO is covered by the lexicon");
  const voiceItems = lintVoiceLine(ep.A1.script_30[5].voice, LEX);
  assert.ok(voiceItems.some((f) => f.level === "info" && f.reason === "author-vowelized"));
  assert.ok(lintVoiceLine("Hello", LEX).some((f) => f.reason.startsWith("latin")));
});

test("findMatches spans line up with the source text", () => {
  const line = ep.S2.script_15[3].voice;
  for (const h of findMatches(line, LEX)) assert.equal(line.slice(h.start, h.end), h.original);
});
