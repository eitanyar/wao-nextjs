// Loads repo TypeScript modules from a plain Node script, without a build step: each .ts file is transpiled with the
// project's own `typescript` (CommonJS, types erased) and evaluated with a require that resolves relative and `@/` imports
// to further .ts files; anything else is a normal Node require. For staff CLIs that must run the exact production module
// (scripts/site-bot-look.mjs). Not a test file. HEBREW-SAFETY: this file contains ZERO Hebrew bytes.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const SRC = path.join(ROOT, 'src');

function resolveTs(base) {
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
    if (/\.(ts|tsx)$/.test(candidate) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

export function createTsRequire() {
  const cache = new Map();
  function load(file) {
    const cached = cache.get(file);
    if (cached) return cached.exports;
    const mod = { exports: {} };
    cache.set(file, mod);
    const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      fileName: file,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const nodeRequire = createRequire(file);
    const localRequire = specifier => {
      const base = specifier.startsWith('@/') ? path.join(SRC, specifier.slice(2))
        : specifier.startsWith('.') ? path.join(path.dirname(file), specifier) : null;
      const target = base ? resolveTs(base) : null;
      return target ? load(target) : nodeRequire(specifier);
    };
    new Function('exports', 'require', 'module', '__filename', '__dirname', output)(mod.exports, localRequire, mod, file, path.dirname(file));
    return mod.exports;
  }
  return relative => {
    const file = resolveTs(path.join(ROOT, relative));
    if (!file) throw new Error(`ts-require: no such module ${relative}`);
    return load(file);
  };
}
