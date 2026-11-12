// M0.5 (B13/B14): every data root in src/ goes through src/lib/dataRoots.ts, and with no
// override every one resolves byte-identical to the historical hard-coded path.
// Enumerates the call sites so a new one (or a new hard-coded root) fails review here.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadDataRoots } from './dataRoots.testkit.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

function sourceFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.(ts|tsx|mjs|js)$/.test(entry.name) && !/\.test\.|testkit/.test(entry.name)) out.push(rel);
  }
  return out;
}

// Every module that resolves a data root, and the exact helper expressions it uses.
// Allowed forms only: the helper value itself, or path.join(<helper>, ...more segments).
const CALL_SITES = {
  'src/app/(product)/admin/clients/page.tsx': ['clientsDir()'],
  'src/app/(product)/admin/live-readiness/action.ts': ['clientsDir()'],
  'src/app/(product)/admin/live-readiness/page.tsx': ['clientsDir()'],
  'src/app/(product)/admin/readiness-gate/action.ts': ['clientsDir()'],
  'src/app/(product)/admin/readiness-gate/page.tsx': ['clientsDir()'],
  'src/app/(product)/client/dashboard/page.tsx': ['path.join(clientsDir(), …)', 'path.join(clientsDir(), …)', 'path.join(clientsDir(), …)', 'path.join(clientsDir(), …)'],
  'src/app/(product)/geo/dashboard/page.tsx': ['path.join(clientsDir(), …)', 'path.join(clientsDir(), …)', 'clientsDir()'],
  'src/app/api/gbp/review-reply/route.ts': ['path.join(clientsDir(), …)'],
  'src/app/api/google-ads/create-campaign/route.ts': ['clientsDir()'],
  'src/app/api/google-ads/live-readiness/route.ts': ['path.join(clientsDir(), …)'],
  'src/app/api/site-bot/deploy/route.ts': ["dataRoot('sites')", "dataRoot('siteResearch')"],
  'src/app/api/site-bot/generate/route.ts': ["dataRoot('siteResearch')", 'sitesDir()'],
  'src/app/api/site-bot/research/copy-review/route.ts': ["dataRoot('siteResearch')", "dataRoot('sites')"],
  'src/app/api/site-bot/research/gates/route.ts': ["dataRoot('siteResearch')"],
  'src/app/api/site-bot/research/route.ts': ["dataRoot('siteResearch')"],
  'src/app/api/site-bot/research/status/route.ts': ["dataRoot('siteResearch')"],
  'src/lib/client-auth-store.ts': ['clientsDir()'],
  'src/lib/client-pin-recovery.ts': ['clientsDir()'],
  'src/lib/client-recovery-contact.ts': ['clientsDir()', 'clientsDir()'],
  'src/lib/crm/intelligence.ts': ['clientsDir()'],
  'src/lib/crm/reviewFlywheelStore.ts': ['clientsDir()'],
  'src/lib/fraud-blocker/store.ts': ['clientsDir()'],
  'src/lib/gbp/reviewResponderStore.ts': ['clientsDir()'],
  'src/lib/gbp/reviewStore.ts': ['clientsDir()'],
  'src/lib/geo/actions.ts': ['clientsDir()'],
  'src/lib/geo/approvalLog.ts': ['path.join(clientsDir(), …)'],
  'src/lib/geo/client.ts': ['clientsDir()'],
  'src/lib/geo/gsc-token.ts': ['path.join(clientsDir(), …)', 'path.join(clientsDir(), …)'],
  'src/lib/gmb/store.ts': ['clientsDir()'],
  'src/lib/google-ads/autonomous-cycle.ts': ['clientsDir()'],
  'src/lib/google-ads/autonomy.ts': ['clientsDir()'],
  'src/lib/google-ads/cpl-ceiling.ts': ['path.join(clientsDir(), …)'],
  'src/lib/google-ads/direct-action-audit.ts': ['path.join(clientsDir(), …)'],
  'src/lib/google-ads/operator.ts': ['path.join(clientsDir(), …)', 'clientsDir()'],
  'src/lib/google-ads/weekly-digest-batch.ts': ['clientsDir()'],
  'src/lib/hybrid/planner.ts': ['clientsDir()'],
  'src/lib/hybrid/snapshotStore.ts': ['defaultClientsDir()'],
  'src/lib/shared/clients.ts': ['clientsDir()'],
  'src/lib/site-bot/research/researchStore.ts': ['siteResearchDir()'],
  'src/lib/site-bot/researchToSite.ts': ['sitesDir()'],
  'src/lib/vault.ts': ['clientsDir()'],
};

const HELPER_CALL = /\b(?:clientsDir|defaultClientsDir|sitesDir|siteResearchDir)\(\)|\bdataRoot\('(?:clients|sites|siteResearch)'\)/g;

function helperExpressions(source) {
  return [...source.matchAll(HELPER_CALL)].map(match => {
    const before = source.slice(Math.max(0, match.index - 'path.join('.length), match.index);
    const after = source.slice(match.index + match[0].length, match.index + match[0].length + 2);
    return before === 'path.join(' && after === ', ' ? 'path.join(clientsDir(), …)' : match[0];
  });
}

test('every data-root call site in src/ is enumerated, in an allowed form', () => {
  const found = {};
  for (const rel of sourceFiles('src')) {
    if (rel === path.join('src', 'lib', 'dataRoots.ts')) continue;
    const expressions = helperExpressions(read(rel));
    if (expressions.length) found[rel] = expressions;
  }
  assert.deepEqual(found, CALL_SITES);
  // path.join(helper, …) is only ever applied to clientsDir (the other roots are used whole).
  for (const [rel, expressions] of Object.entries(found)) {
    const source = read(rel);
    if (expressions.includes('path.join(clientsDir(), …)')) assert.match(source, /path\.join\(clientsDir\(\), /, rel);
    assert.match(source, /from ['"](?:@\/lib\/dataRoots|(?:\.\.?\/)+dataRoots)['"]/, `${rel} imports the shared helper`);
  }
});

test('no hard-coded data/clients, data/sites or data/site-research root remains in src/', () => {
  const hardCoded = /\bprocess\.cwd\(\)\s*,\s*['"]data['"]\s*,\s*['"](?:clients|sites|site-research)['"]|['"]data\/(?:clients|sites|site-research)['"]|path\.join\(\s*['"]data['"]\s*,\s*['"](?:clients|sites|site-research)['"]\s*\)/;
  const offenders = sourceFiles('src').filter(rel => rel !== path.join('src', 'lib', 'dataRoots.ts')
    && rel !== path.join('src', 'lib', 'site-bot', 'research', 'researchStore.ts') // exported legacy constant, unused for resolution
    && hardCoded.test(read(rel)));
  assert.deepEqual(offenders, []);
  // researchStore keeps its exported relative constant, but resolution goes through the helper.
  const store = read('src/lib/site-bot/research/researchStore.ts');
  assert.match(store, /return customBaseDir \? path\.resolve\(customBaseDir\) : siteResearchDir\(\);/);
});

test('with no override every root is byte-identical to the historical expression, for any cwd', () => {
  for (const cwd of ['/home/wao/htdocs/www.wao.co.il', '/home/eitanya/wao', '/srv/releases/release-1/x y']) {
    const roots = loadDataRoots({ cwd, env: {} });
    // Historical expressions, verbatim from the call sites before M0.5:
    assert.equal(roots.clientsDir(), path.join(cwd, 'data', 'clients'));
    assert.equal(roots.sitesDir(), path.join(cwd, 'data', 'sites'));
    assert.equal(roots.siteResearchDir(), path.resolve(cwd, path.join('data', 'site-research')));
    assert.equal(roots.dataRoot('siteResearch').dir, path.resolve(cwd, 'data', 'site-research'));
    // Symlink walks keep starting at cwd (so data/ itself is still checked).
    for (const kind of ['clients', 'sites', 'siteResearch']) assert.equal(roots.dataRoot(kind).walkBase, cwd);
    // path.join(clientsDir(), a, b) === path.join(cwd, 'data', 'clients', a, b) for every sub-path form used.
    for (const segments of [['retter', 'client.json'], ['c', 'tasks', 'geo'], ['c', 'gmb', 'queue'], ['c', 'google-ads', 'brand-cpl-baselines.json']]) {
      assert.equal(path.join(roots.clientsDir(), ...segments), path.join(cwd, 'data', 'clients', ...segments));
    }
    // The site-bot routes' old dossier-path identity check: path.resolve(cwd, 'data', 'site-research', id, 'dossier.json').
    assert.equal(path.resolve(roots.dataRoot('siteResearch').dir, 'r-1', 'dossier.json'), path.resolve(cwd, 'data', 'site-research', 'r-1', 'dossier.json'));
    assert.equal(path.join(roots.dataRoot('sites').dir, 'slug.json'), path.join(cwd, 'data', 'sites', 'slug.json'));
  }
});
