#!/usr/bin/env node
/**
 * Live sandbox verification for the Priority 4 Data Manager API migration
 * (docs/specs/priority-4-data-manager-api-migration.md §6.5). Calls
 * `uploadLeadConversion()` directly (not via HTTP — this function has no
 * session/HTTP coupling by design, see conversion-upload.ts's own header
 * comment) against a synthetic lead attributed to the real sandbox campaign
 * (`data/campaigns/emergency-trades-4567.json`, customer_id 1725891566 —
 * the exact account today's empirical failure of the classic API was
 * reproduced against, per spec §0). Prints the full `UploadResult` and, on
 * success, the `datamanager.googleapis.com` `requestId`.
 *
 * NOT a `node --test` file — run manually:
 *   node scripts/verify-datamanager-conversion-upload.mjs
 *
 * Why this script compiles conversion-upload.ts on the fly instead of
 * importing it directly: this Node build has no TypeScript type-stripping
 * support (`node --experimental-strip-types` → `ERR_NO_TYPESCRIPT`), so a
 * `.ts` file can't be `import`ed by plain Node. This script uses the
 * `typescript` package (already a devDependency) to compile
 * `conversion-upload.ts` + its two CRM dependencies to a scratch CommonJS
 * build, then patches `Module._resolveFilename` so the compiled output's
 * `@/lib/crm/...` require()s (an alias `tsc` deliberately doesn't rewrite on
 * emit — it's compile-time-only for typechecking) resolve into that same
 * scratch build. No source file is modified; nothing is written under the
 * repo itself — the scratch build lives under the OS temp directory.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import Module from 'node:module';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const repoRoot = process.cwd();

// ── Load .env.local (same manual parser as scripts/get-datamanager-token.mjs) ──
function loadEnvLocal() {
  const envPath = path.join(repoRoot, '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnvLocal();

const requiredEnv = [
  'GOOGLE_DATAMANAGER_CLIENT_ID',
  'GOOGLE_DATAMANAGER_CLIENT_SECRET',
  'GOOGLE_DATAMANAGER_REFRESH_TOKEN',
  'GOOGLE_ADS_TEST_MCC_CUSTOMER_ID',
];
const missing = requiredEnv.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required env var(s) in .env.local: ${missing.join(', ')}`);
  process.exit(1);
}

// ── Compile conversion-upload.ts + its CRM deps to a scratch CommonJS build ──
const scratchDist = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-dm-verify-'));
const tempTsconfigPath = path.join(scratchDist, 'tsconfig.verify.json');

const tempTsconfig = {
  extends: path.join(repoRoot, 'tsconfig.json'),
  compilerOptions: {
    target: 'ES2017',
    module: 'commonjs',
    moduleResolution: 'node',
    esModuleInterop: true,
    resolveJsonModule: true,
    allowJs: true,
    skipLibCheck: true,
    strict: false,
    noEmit: false,
    noEmitOnError: false,
    incremental: false,
    declaration: false,
    outDir: scratchDist,
    rootDir: path.join(repoRoot, 'src'),
    typeRoots: [path.join(repoRoot, 'node_modules/@types')],
  },
  include: [
    path.join(repoRoot, 'src/lib/google-ads/conversion-upload.ts'),
    path.join(repoRoot, 'src/lib/google-ads/data-manager-events.js'),
    path.join(repoRoot, 'src/lib/crm/leadsStore.ts'),
    path.join(repoRoot, 'src/lib/crm/intelligence.ts'),
    path.join(repoRoot, 'src/lib/crm/ownership.js'),
  ],
};
fs.writeFileSync(tempTsconfigPath, JSON.stringify(tempTsconfig, null, 2));

console.log(`Compiling conversion-upload.ts + CRM deps to scratch build: ${scratchDist}`);
try {
  execFileSync(require.resolve('typescript/bin/tsc'), ['--project', tempTsconfigPath], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
} catch (err) {
  // `noEmitOnError: false` means tsc still writes output despite type
  // errors (it exits non-zero either way) — proceed only if the expected
  // entry point actually got emitted; otherwise this is a real compile
  // failure, not just type-checking noise.
  const expectedEntry = path.join(scratchDist, 'lib', 'google-ads', 'conversion-upload.js');
  if (!fs.existsSync(expectedEntry)) {
    console.error('tsc failed to emit the expected output — this is a real compile failure, not just type-checking noise.');
    throw err;
  }
  console.warn('tsc reported type errors above but emitted output anyway (noEmitOnError: false) — proceeding with the scratch build.');
}

// ── Patch require() to resolve the `@/...` alias into the scratch build ──
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function patchedResolveFilename(request, ...rest) {
  if (request.startsWith('@/')) {
    request = path.join(scratchDist, request.slice(2));
  }
  return originalResolveFilename.call(this, request, ...rest);
};

const { uploadLeadConversion } = require(path.join(scratchDist, 'lib', 'google-ads', 'conversion-upload.js'));

// ── Real sandbox campaign config (read directly from disk — no leadsStore/ ──
// intelligence side effects needed since we inject both via deps below).
const campaignConfigPath = path.join(repoRoot, 'data', 'campaigns', 'emergency-trades-4567.json');
const campaignConfig = JSON.parse(fs.readFileSync(campaignConfigPath, 'utf8'));

if (campaignConfig.mode !== 'test') {
  console.error(`Expected data/campaigns/emergency-trades-4567.json mode: "test", got "${campaignConfig.mode}" — refusing to risk a live-mode upload.`);
  process.exit(1);
}

// Synthetic lead, attributed to the sandbox campaign via a gclid. This is a
// well-formed but not-a-real-click gclid (the sandbox account has no real
// ad clicks to attribute to) — if Google's events:ingest rejects it on
// semantic grounds (not found / not attributable) rather than an
// auth/request-shape ground, that is itself useful, honest signal to report,
// not a script bug.
const syntheticLead = {
  id: 999999,
  orderId: `dm-verify-${Date.now()}`,
  slug: campaignConfig.slug,
  gclid: 'Cj0KCQjw_verification_synthetic_gclid_priority4',
  date: new Date().toISOString(),
  revenue: 650,
  closedAt: new Date().toISOString(),
};

const conversionType = process.argv.includes('--closed-deal') ? 'closed-deal' : 'verified-lead';

console.log(`\nCalling uploadLeadConversion({ leadId: ${syntheticLead.id}, type: '${conversionType}' })`);
console.log(`Sandbox account: customer_id ${campaignConfig.customerId}, slug "${campaignConfig.slug}"\n`);

const result = await uploadLeadConversion(
  { leadId: syntheticLead.id, type: conversionType },
  {
    readLeadsImpl: async () => [syntheticLead],
    findLeadByIdImpl: (leads, id) => leads.find((l) => l.id === id),
    loadCampaignConfigBySlugImpl: (slug) => (slug === campaignConfig.slug ? campaignConfig : null),
  }
);

console.log('UploadResult:', JSON.stringify(result, null, 2));

if ('success' in result && result.success) {
  console.log('\n✅ Data Manager API upload succeeded.');
  process.exit(0);
} else {
  console.log('\n❌ Data Manager API upload did not succeed — see UploadResult above for the exact error/status.');
  process.exit(1);
}
