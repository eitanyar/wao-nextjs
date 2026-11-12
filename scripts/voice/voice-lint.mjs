#!/usr/bin/env node
// Usage: node scripts/voice/voice-lint.mjs <scripts.json> [--lexicon <file>] [--warn-only] [--flags-only]
// Every string under a key named "voice" (anywhere in the JSON) is a voice line.
// Prints clean text, TTS text, applied lexicon ids and flags per line, then a summary.
// Exits 1 when unresolved flags remain, unless --warn-only.

import { readFileSync } from "node:fs";
import { applyLexicon, lintVoiceLine, loadLexicon, DEFAULT_LEXICON_PATH } from "./lexicon.mjs";

function parseArgs(argv) {
  const opts = { file: null, lexicon: DEFAULT_LEXICON_PATH, warnOnly: false, flagsOnly: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--warn-only") opts.warnOnly = true;
    else if (a === "--flags-only") opts.flagsOnly = true;
    else if (a === "--lexicon") opts.lexicon = argv[++i];
    else if (!opts.file) opts.file = a;
    else throw new Error(`unexpected argument: ${a}`);
  }
  if (!opts.file) {
    console.error("usage: node scripts/voice/voice-lint.mjs <scripts.json> [--lexicon <file>] [--warn-only] [--flags-only]");
    process.exit(2);
  }
  return opts;
}

function collectVoiceLines(node, p = "$", out = []) {
  if (Array.isArray(node)) node.forEach((v, i) => collectVoiceLines(v, `${p}[${i}]`, out));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (k === "voice" && typeof v === "string") out.push({ path: `${p}.${k}`, text: v });
      else collectVoiceLines(v, `${p}.${k}`, out);
    }
  }
  return out;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const lexicon = loadLexicon(opts.lexicon);
  const lines = collectVoiceLines(JSON.parse(readFileSync(opts.file, "utf8")));

  const appliedCount = {};
  const flagReasons = {};
  const flagTokens = new Map();
  let flagTotal = 0;
  let infoTotal = 0;
  let changed = 0;

  for (const { path, text } of lines) {
    const { tts, applied } = applyLexicon(text, lexicon);
    const items = lintVoiceLine(text, lexicon);
    const flags = items.filter((f) => f.level === "flag");
    const info = items.filter((f) => f.level === "info");
    if (tts !== text) changed++;
    for (const id of applied) appliedCount[id] = (appliedCount[id] ?? 0) + 1;
    for (const f of flags) {
      flagTotal++;
      flagReasons[f.reason] = (flagReasons[f.reason] ?? 0) + 1;
      const key = `${f.token}\t${f.reason}`;
      flagTokens.set(key, (flagTokens.get(key) ?? 0) + 1);
    }
    infoTotal += info.length;

    if (opts.flagsOnly && !flags.length) continue;
    console.log(path);
    console.log(`  clean:   ${text}`);
    console.log(`  tts:     ${tts}`);
    console.log(`  applied: ${applied.length ? applied.join(", ") : "-"}`);
    for (const f of flags) console.log(`  FLAG  ${f.token}  (${f.reason})`);
    for (const f of info) console.log(`  info  ${f.token}  (${f.reason})`);
  }

  console.log("\n=== voice-lint summary ===");
  console.log(`file:           ${opts.file}`);
  console.log(`voice lines:    ${lines.length}`);
  console.log(`lines changed:  ${changed}`);
  console.log(`applied:        ${Object.entries(appliedCount).map(([k, v]) => `${k}=${v}`).join(", ") || "none"}`);
  console.log(`info items:     ${infoTotal}`);
  console.log(`flags:          ${flagTotal} (${flagTokens.size} unique token/reason pairs)`);
  for (const [r, n] of Object.entries(flagReasons)) console.log(`  ${n}\t${r}`);
  if (flagTokens.size) {
    console.log("unique flagged tokens (count, token, reason):");
    for (const [key, n] of [...flagTokens].sort((a, b) => b[1] - a[1])) {
      const [token, reason] = key.split("\t");
      console.log(`  ${n}x\t${token}\t${reason}`);
    }
  }
  if (flagTotal && !opts.warnOnly) process.exit(1);
}

main();
