// Guard: no code path may edit a client's Google Business Profile business name (Eitan 2026-11-17).
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { assertNoGbpNameEdit, GBP_NAME_FIELDS, GbpNameEditBlockedError, gbpLocationPatchRequest } from './locationUpdateGuard';
import { executeGbpLocationPatch } from './executePatch';

const ROOT = path.resolve(__dirname, '../../..');
const BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';

test('runtime guard: a name field in the body is refused (title, name, locationName)', () => {
  assert.deepEqual([...GBP_NAME_FIELDS].sort(), ['locationName', 'name', 'title']);
  for (const field of GBP_NAME_FIELDS) {
    assert.throws(() => assertNoGbpNameEdit({ [field]: 'X', websiteUri: 'https://x.example' }, 'websiteUri'), GbpNameEditBlockedError, field);
    assert.throws(() => gbpLocationPatchRequest({ base: BASE, locationPath: 'locations/1', updateMask: 'websiteUri', body: { [field]: 'X' } }), GbpNameEditBlockedError, field);
  }
});

test('runtime guard: a name field (or a wildcard) in the updateMask is refused, encoded or not', () => {
  for (const mask of ['title', 'websiteUri,title', ' title ', 'name', 'locationName', 'title.text', '*', encodeURIComponent('websiteUri,title')]) {
    assert.throws(() => assertNoGbpNameEdit({ websiteUri: 'https://x.example' }, mask), GbpNameEditBlockedError, mask);
  }
});

test('runtime guard: ordinary updates pass; nested category ids named "name" are not the business name', () => {
  assert.doesNotThrow(() => assertNoGbpNameEdit({ categories: { primaryCategory: { name: 'gcid:plumber' } } }, 'categories'));
  assert.doesNotThrow(() => assertNoGbpNameEdit({ profile: { description: 'x' } }, 'profile.description'));
  assert.doesNotThrow(() => assertNoGbpNameEdit({ regularHours: {}, websiteUri: 'u' }, 'regularHours,websiteUri'));
  const request = gbpLocationPatchRequest({ base: BASE, locationPath: 'locations/9', updateMask: 'websiteUri', body: { websiteUri: 'u' }, headers: { Authorization: 'Bearer t' } });
  assert.equal(request.url, `${BASE}/locations/9?updateMask=websiteUri`);
  assert.equal(request.init.method, 'PATCH');
  assert.deepEqual(request.init.headers, { 'Content-Type': 'application/json', Authorization: 'Bearer t' });
});

test('executeGbpLocationPatch: a fix that would carry the name never reaches fetch', async () => {
  const originalFetch = globalThis.fetch;
  let called = 0;
  globalThis.fetch = (async () => { called += 1; return new Response('{}', { status: 200 }); }) as typeof fetch;
  try {
    for (const field of GBP_NAME_FIELDS) {
      const res = await executeGbpLocationPatch({
        gbpAccountId: 'accounts/1', gbpLocationId: '2', accessToken: 't',
        fixItem: { id: 'x', type: 'write_location', dimension: 'other', payload: { [field]: 'Renamed Business' } },
      });
      assert.equal(res.success, false, field);
      assert.match(res.error ?? '', /gbp_name_edit_blocked/, field);
    }
    assert.equal(called, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ── Static: every location PATCH goes through gbpLocationPatchRequest ──────────
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist']);
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.next') || SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(?:ts|tsx|mts|cts|js|mjs|cjs|py|sh)$/.test(entry.name) && !/\.test\.(?:ts|mjs|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const GBP_HOST = /mybusinessbusinessinformation|mybusiness\.googleapis\.com|businessprofile|GBP_|gbp/i;
const PATCH_VERB = /['"`]PATCH['"`]|X-HTTP-Method-Override|\.patch\(/;

test('static: no file in src/ or scripts/ sends a GBP location PATCH outside the guard', () => {
  const guard = path.join(ROOT, 'src/lib/gbp/locationUpdateGuard.ts');
  const offenders: string[] = [];
  for (const file of [...sourceFiles(path.join(ROOT, 'src')), ...sourceFiles(path.join(ROOT, 'scripts'))]) {
    if (file === guard) continue;
    const text = fs.readFileSync(file, 'utf8');
    // A PATCH verb in a file that talks to the Business Profile APIs, or builds an updateMask / a locations/ URL.
    if (PATCH_VERB.test(text) && (GBP_HOST.test(text) || /updateMask/.test(text) || /locations\/\$\{/.test(text))) offenders.push(path.relative(ROOT, file));
  }
  assert.deepEqual(offenders, [], `location PATCH outside locationUpdateGuard: ${offenders.join(', ')}`);
});

test('static: the two location-update paths import the guard', () => {
  for (const file of ['src/lib/gbp/client.ts', 'src/lib/gbp/executePatch.ts']) {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.match(text, /from '\.\/locationUpdateGuard'/, file);
    assert.match(text, /gbpLocationPatchRequest\(/, file);
  }
});

test('read-only GET of the name stays allowed (getLocation reads title)', () => {
  const text = fs.readFileSync(path.join(ROOT, 'src/lib/gbp/client.ts'), 'utf8');
  assert.match(text, /readMask =\s*'name,title,/);
});
