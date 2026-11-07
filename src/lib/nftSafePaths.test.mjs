// Build-trace safety (P0 2026-11-08): two guards against whole-cwd file tracing.
// 1. Source rule: never `path.resolve(base, <dynamic>...)` in server code. nft treats an
//    unknown later path.resolve argument as possibly absolute and re-roots the glob to the
//    whole project (every *.json under cwd -> 108k traced files, prod build OOM).
//    Use `path.join(path.resolve(base), <dynamic>...)` instead.
// 2. The post-build checker (scripts/check-nft-traces.mjs) flags junk and oversize traces.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkNftTraces } from '../../scripts/check-nft-traces.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

function sourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry.name) && !/\.test\.|\.d\.ts$/.test(entry.name)) out.push(full);
  }
  return out;
}

// path.resolve(<first>, <later args>) where a later argument is not a plain string literal
// or an ALL_CAPS constant. Single-argument path.resolve(x) is fine.
function topLevelArgs(text, open) {
  const args = [];
  let depth = 0;
  let quote = null;
  let start = open + 1;
  for (let i = open + 1; i < text.length; i++) {
    const ch = text[i];
    if (quote) { if (ch === '\\') i++; else if (ch === quote) quote = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') {
      if (depth === 0) { args.push(text.slice(start, i).trim()); return { args, end: i }; }
      depth--;
    } else if (ch === ',' && depth === 0) { args.push(text.slice(start, i).trim()); start = i + 1; }
  }
  return { args, end: text.length };
}

export function dynamicResolveCalls(text) {
  const hits = [];
  let index = text.indexOf('path.resolve(');
  while (index >= 0) {
    const open = index + 'path.resolve'.length;
    const { args, end } = topLevelArgs(text, open);
    const tail = args.slice(1).filter(Boolean);
    if (tail.some(arg => !/^(['"])[^'"]*\1$/.test(arg) && !/^[A-Z][A-Z0-9_]*$/.test(arg))) hits.push(text.slice(index, end + 1));
    index = text.indexOf('path.resolve(', open);
  }
  return hits;
}

test('rule self-check: the dangerous shape is caught, the safe shapes are not', () => {
  assert.equal(dynamicResolveCalls('path.resolve(baseDir, `${auditId}.json`)').length, 1);
  assert.equal(dynamicResolveCalls("path.resolve(root, clientId, 'client.json')").length, 1);
  assert.equal(dynamicResolveCalls('path.join(path.resolve(baseDir), `${auditId}.json`)').length, 0);
  assert.equal(dynamicResolveCalls('path.resolve(process.cwd(), AUDITS_BASE_DIR)').length, 0);
  assert.equal(dynamicResolveCalls("path.resolve(process.cwd(), 'data', 'x')").length, 0);
  assert.equal(dynamicResolveCalls('path.resolve(customRoot)').length, 0);
});

test('no server source uses path.resolve(base, <dynamic>) (whole-cwd nft trace)', () => {
  const offenders = [];
  for (const file of [...sourceFiles(path.join(ROOT, 'src/lib')), ...sourceFiles(path.join(ROOT, 'src/app'))]) {
    for (const hit of dynamicResolveCalls(fs.readFileSync(file, 'utf8'))) offenders.push(`${path.relative(ROOT, file)}: ${hit}`);
  }
  assert.deepEqual(offenders, []);
});

test('post-build checker flags project-root junk and oversize traces, ignores the active dist dir', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nft-check-'));
  const routeDir = path.join(root, '.next-cur', 'server', 'app', 'api', 'x');
  fs.mkdirSync(routeDir, { recursive: true });
  const rel = target => path.relative(routeDir, path.join(root, target));
  fs.writeFileSync(path.join(routeDir, 'route.js.nft.json'), JSON.stringify({ files: [rel('.next-cur/server/chunks/1.js'), rel('node_modules/a/index.js')] }));
  assert.deepEqual(checkNftTraces('.next-cur', { projectRoot: root }).problems, []);
  fs.writeFileSync(path.join(routeDir, 'route.js.nft.json'), JSON.stringify({ files: [rel('.next-old/standalone/x.json'), rel('releases/release-1/a.json'), rel('scratch/a.json')] }));
  const { problems } = checkNftTraces('.next-cur', { projectRoot: root });
  assert.equal(problems.length, 3, problems.join('\n'));
  fs.writeFileSync(path.join(routeDir, 'route.js.nft.json'), JSON.stringify({ files: Array.from({ length: 11 }, (_, i) => rel(`node_modules/p/${i}.js`)) }));
  assert.match(checkNftTraces('.next-cur', { projectRoot: root, maxFiles: 10 }).problems[0], /11 traced files/);
});
