import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const root = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ts = require('typescript');
const picomatch = require('next/dist/compiled/picomatch');

// Execute the real TypeScript config without starting Next or reading runtime data.
const source = fs.readFileSync(path.join(root, 'next.config.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const exports = {};
vm.runInNewContext(compiled, {
  exports,
  require: (id) => {
    assert.equal(id, 'path');
    return require(id);
  },
  __dirname: root,
  process: { env: {} },
}, { filename: 'next.config.ts' });
const config = exports.default;

function excluded(route, file) {
  return Object.entries(config.outputFileTracingExcludes).some(([routeGlob, files]) =>
    picomatch(routeGlob, { dot: true, contains: true })(route) &&
    files.some((glob) => picomatch(path.join(root, glob), { dot: true, contains: true })(path.join(root, file))));
}

test('standalone route and shared-server traces exclude repo-root runtime data', () => {
  assert.equal(config.output, 'standalone');
  assert.deepEqual(Object.keys(config.outputFileTracingExcludes), ['/*', '/']);
  const excludes = Array.from(config.outputFileTracingExcludes['/*']);
  assert.ok(excludes.includes('venv/**/*'));
  assert.ok(excludes.includes('data/**/*'));

  for (const route of ['/', '/api/site-bot/research/gates', '/client/login']) {
    for (const file of ['data/clients/sentinel.json', 'data/sites/nested/sentinel.json', 'data/site-research/sentinel.json']) {
      assert.equal(excluded(route, file), true, `${route}: ${file} must be excluded`);
    }
    for (const file of ['src/data/sentinel.ts', 'public/sentinel.svg', 'src/app/api/site-bot/route.ts']) {
      assert.equal(excluded(route, file), false, `${route}: ${file} must remain eligible`);
    }
  }
  assert.equal(excluded('/api/site-bot/research/gates', 'venv/bin/python3'), true);
});

// Mirrors collect-build-traces.js makeIgnoreFn: next-server excludes are matched
// against root-RELATIVE paths with contains:true (not root-joined like routes).
test('shared next-server trace keeps Next runtime internals (e.g. lib/metadata)', () => {
  const globs = Object.keys(config.outputFileTracingExcludes)
    .filter((key) => picomatch(key)('next-server'))
    .flatMap((key) => config.outputFileTracingExcludes[key]);
  const isMatch = globs.length ? picomatch(globs, { contains: true, dot: true }) : () => false;
  for (const file of [
    'node_modules/next/dist/lib/metadata/get-metadata-route.js',
    'node_modules/next/dist/server/lib/router-utils/filesystem.js',
  ]) assert.equal(isMatch(file), false, `next-server trace must keep ${file}`);
});
