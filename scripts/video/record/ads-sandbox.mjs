#!/usr/bin/env node
// Prepare the Ads Bot leads sandbox for a recording (shot AL1).
//
// node scripts/video/record/ads-sandbox.mjs --seed <seed.json> --dir <scratch/... sandbox dir>
//
// Writes the fictional client + leads into <dir> and prints the env the LOCAL
// dev server must be started with. The dev server then reads the sandbox, never
// data/clients. Then record with:
//   node scripts/video/record/record.mjs --shots AL1 --sets dash --base-url http://127.0.0.1:<port> --ads-sandbox <dir>
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes.

import { readFileSync } from "node:fs";
import path from "node:path";
import { ROOT } from "../../voice/lib/io.mjs";
import { envLine, materializeAdsSandbox } from "./lib/adsSandbox.mjs";
import { seedPathProblem } from "./lib/demo.mjs";

const args = process.argv.slice(2);
const get = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const seedFile = get("--seed");
const dir = get("--dir");
if (!seedFile || !dir) {
  console.error("usage: ads-sandbox.mjs --seed <seed.json> --dir <sandbox dir>");
  process.exit(2);
}
const p = seedPathProblem(seedFile, ROOT);
if (p) throw new Error(p);
const seed = JSON.parse(readFileSync(path.resolve(ROOT, seedFile), "utf8"));
const s = materializeAdsSandbox(seed, dir, { root: ROOT });
console.log(`sandbox: ${path.relative(ROOT, s.dir)}  client ${s.clientId}  ${s.leads.length} leads`);
console.log(`start the dev server with:\n  ${envLine(s.env)}`);
