import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

import * as scriptProvider from '../../../scripts/lib/llm-provider.mjs';

// 1) src/lib/ai/llmProvider.ts and scripts/lib/llm-provider.mjs must behave identically.
// 2) Boundary: no production file reads QWEN_API_KEY / QWEN_BASE_URL except the two provider modules.

const root = process.cwd();
const requireModule = createRequire(path.join(root, 'package.json'));
const ts = requireModule('typescript');

function loadTsProvider() {
  const source = fs.readFileSync(path.join(root, 'src/lib/ai/llmProvider.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', 'process', compiled)(() => { throw new Error('llmProvider.ts must have no imports'); }, mod, mod.exports, process);
  return mod.exports;
}
const tsProvider = loadTsProvider();

const TOKEN_PLAN = 'https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1';
const METERED = 'https://metered.example.test/v1';

test('tables match', () => {
  assert.deepEqual([...tsProvider.LLM_WORKLOADS], [...scriptProvider.LLM_WORKLOADS]);
  assert.deepEqual([...tsProvider.LLM_PROVIDERS], [...scriptProvider.LLM_PROVIDERS]);
  assert.deepEqual({ ...tsProvider.LLM_WORKLOAD_ENV }, { ...scriptProvider.LLM_WORKLOAD_ENV });
  assert.deepEqual({ ...tsProvider.LLM_WORKLOAD_DEFAULT }, { ...scriptProvider.LLM_WORKLOAD_DEFAULT });
});

function outcome(provider, fn) {
  provider.resetTokenPlanRefusalLog();
  try { return { ok: fn(provider) }; } catch (error) { return { error: error.name, message: error.message }; }
}

test('selection, endpoint resolution and the production guard agree over an env matrix', () => {
  const values = [undefined, '', 'gemini', 'qwen-metered', 'qwen-token-plan', 'QWEN-TOKEN-PLAN', 'bogus'];
  const nodeEnvs = [undefined, 'development', 'production'];
  const meteredUrls = [METERED, TOKEN_PLAN, undefined];
  let cases = 0;
  for (const workload of scriptProvider.LLM_WORKLOADS) {
    const envVar = scriptProvider.LLM_WORKLOAD_ENV[workload];
    for (const value of values) for (const NODE_ENV of nodeEnvs) for (const meteredUrl of meteredUrls) {
      const env = { QWEN_API_KEY: 'tp', QWEN_BASE_URL: TOKEN_PLAN, QWEN_METERED_API_KEY: 'm', QWEN_METERED_BASE_URL: meteredUrl, NODE_ENV, [envVar]: value };
      const fns = [
        p => { const warned = []; return { selection: p.selectLlmProvider(workload, env, m => warned.push(m)), warned }; },
        p => { const warned = []; return { endpoint: p.resolveQwenEndpoint(workload, env, m => warned.push(m)), warned }; },
        p => p.assertTokenPlanAllowed(workload, TOKEN_PLAN, env, () => {}) ?? 'allowed',
      ];
      for (const fn of fns) {
        assert.deepEqual(outcome(tsProvider, fn), outcome(scriptProvider, fn), `${workload} ${envVar}=${value} NODE_ENV=${NODE_ENV} metered=${meteredUrl}`);
        cases++;
      }
      // D3b invariant: in production no workload ever resolves to a token-plan endpoint, whatever its env var says.
      if (NODE_ENV === 'production') {
        for (const provider of [tsProvider, scriptProvider]) {
          const result = outcome(provider, p => p.resolveQwenEndpoint(workload, env, () => {}));
          assert.ok(result.error !== undefined || result.ok === null || !provider.isTokenPlanUrl(result.ok.baseUrl),
            `${workload} ${envVar}=${value}: production reached the token plan`);
          if (result.ok) assert.equal(result.ok.provider, 'qwen-metered');
        }
      }
    }
  }
  assert.ok(cases > 300);
});

// ── Boundary ────────────────────────────────────────────────────────────────
const PROVIDER_MODULES = new Set(['src/lib/ai/llmProvider.ts', 'scripts/lib/llm-provider.mjs']);
// Interactive / dev-only tools that stay on the token plan by decision D3 (not production paths).
const NON_PRODUCTION = new Set([
  'scripts/waocopy.mjs',
  'scripts/dev-env-check.mjs',
  'scripts/site-bot-rehearsal-dev.sh',
  'scripts/site-bot-research-to-site.mjs',
]);
const CODE_READ = /(process\.env\.|process\.env\[['"]|envVal\(['"]|env\.|\$\{?)QWEN_(API_KEY|BASE_URL)\b/;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name !== 'node_modules') walk(rel, out); continue; }
    if (/\.(ts|tsx|mjs|js|cjs|sh)$/.test(entry.name) && !/\.test\.(ts|tsx|mjs|js)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

test('no production file reads QWEN_API_KEY / QWEN_BASE_URL outside the provider modules', () => {
  const offenders = [];
  for (const file of [...walk('src'), ...walk('scripts')]) {
    if (PROVIDER_MODULES.has(file) || NON_PRODUCTION.has(file)) continue;
    const lines = fs.readFileSync(path.join(root, file), 'utf8').split('\n');
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (/^(\/\/|\*|\/\*|#)/.test(trimmed)) return; // comments
      if (CODE_READ.test(line)) offenders.push(`${file}:${i + 1}: ${trimmed}`);
    });
  }
  assert.deepEqual(offenders, []);
});

test('switched callers route through the provider switch', () => {
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  assert.match(read('src/lib/lp/coreThirtyCopy.ts'), /callSiteCopyJSON\(/);
  assert.doesNotMatch(read('src/lib/lp/coreThirtyCopy.ts'), /callQwenJSON\(/);
  assert.match(read('src/lib/lp/researchPageCopy.ts'), /dependencies\.callJson \?\? callSiteCopyJSON/);
  assert.match(read('src/lib/geo/critic.ts'), /callWorkloadJSON\('geo'/);
  const geo = read('scripts/geo-generate-content.mjs');
  assert.match(geo, /selectLlmProvider\('geo'/);
  assert.match(geo, /if \(GEO_PROVIDER\.provider === 'gemini'\) throw geminiErr;/, 'gemini default has no Qwen fallback');
  assert.match(read('scripts/lib/fact-extractor.mjs'), /resolveQwenEndpoint\('site_copy'/);
  assert.match(read('scripts/review-poll.mjs'), /createGbpReplyDrafter\(\)/);
});
