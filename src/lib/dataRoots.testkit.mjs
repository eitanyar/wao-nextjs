// Loads the real src/lib/dataRoots.ts inside a sandbox so vm-based route harnesses
// can satisfy their `@/lib/dataRoots` import with the production logic, driven by a
// synthetic cwd and env (no access to the host process).
// Not a test file itself.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const file = path.resolve(import.meta.dirname, 'dataRoots.ts');

export function loadDataRoots({ cwd, env = {} }) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: name => {
      if (name === 'path') return path;
      throw new Error(`unexpected dataRoots import: ${name}`);
    },
    process: { cwd: typeof cwd === 'function' ? cwd : () => cwd, env },
  }, { filename: file });
  return exports;
}
