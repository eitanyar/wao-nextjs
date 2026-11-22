import assert from 'node:assert/strict';
import fs     from 'node:fs';
import path   from 'node:path';
import test   from 'node:test';
import { fileURLToPath } from 'node:url';

// This suite reads the source of action.ts / page.tsx as text rather than
// importing them, because both depend on next/headers' cookies() (request-
// scoped AsyncLocalStorage) and next/navigation's redirect(), which are not
// callable outside a real Next.js request — same constraint that shapes
// src/app/api/google-ads/production-access-guards.test.mjs. Genuine
// behavioral coverage of the parsing/validation logic lives in
// ./live-readiness-form.test.mjs, which imports real code, not text.

const dir        = path.dirname(fileURLToPath(import.meta.url));
const actionSrc  = fs.readFileSync(path.join(dir, 'action.ts'), 'utf8');
const pageSrc    = fs.readFileSync(path.join(dir, 'page.tsx'), 'utf8');

test('action.ts uses the wao-admin gate (verifyAdminToken), not the client session', () => {
  assert.match(actionSrc, /import\s*\{\s*ADMIN_COOKIE_NAME,\s*verifyAdminToken\s*\}\s*from\s*'@\/lib\/admin-auth'/);
  assert.doesNotMatch(actionSrc, /verifySessionToken/);
  assert.doesNotMatch(actionSrc, /from ['"]@\/lib\/client-auth['"]/);
});

test('page.tsx uses the wao-admin gate (verifyAdminToken), not the client session', () => {
  assert.match(pageSrc, /import\s*\{\s*ADMIN_COOKIE_NAME,\s*verifyAdminToken\s*\}\s*from\s*'@\/lib\/admin-auth'/);
  assert.doesNotMatch(pageSrc, /verifySessionToken/);
  assert.doesNotMatch(pageSrc, /from ['"]@\/lib\/client-auth['"]/);
});

test('every exported action runs the admin gate first, before any form parsing, poll or filesystem access', () => {
  const gate = actionSrc.slice(actionSrc.indexOf('async function requireAdmin()'), actionSrc.indexOf('function writeKeys('));
  assert.ok(gate.indexOf('verifyAdminToken(') < gate.indexOf('if (!isAdmin)'));
  assert.ok(gate.indexOf('if (!isAdmin)') < gate.indexOf("redirect('/admin/login"));
  const exported = [...actionSrc.matchAll(/export async function (\w+)\(/g)].map(m => m[1]);
  assert.deepEqual(exported, ['updateLiveReadinessAction', 'overrideLiveReadinessAction', 'pollNowAction']);
  for (const name of exported) {
    const body = actionSrc.slice(actionSrc.indexOf(`export async function ${name}(`));
    const gateIdx = body.indexOf('await requireAdmin();');
    assert.notEqual(gateIdx, -1, name);
    for (const later of ['parseAdminSaveSubmission(', 'parseLiveReadinessSubmission(', 'writeKeys(', 'pollClientOwnership(']) {
      const idx = body.indexOf(later);
      if (idx !== -1) assert.ok(gateIdx < idx, `${name}: admin gate before ${later}`);
    }
  }
  const writer = actionSrc.slice(actionSrc.indexOf('function writeKeys('), actionSrc.indexOf('export async function updateLiveReadinessAction'));
  assert.ok(writer.indexOf('fs.existsSync(clientDir)') < writer.indexOf('loadRecord(recordPath)'), 'client dir existence is confirmed before the record is read');
});
test('page.tsx verifies the admin token before loading any client data', () => {
  const adminCallIdx  = pageSrc.indexOf('verifyAdminToken(');
  const redirectIdx   = pageSrc.indexOf("redirect('/admin/login");
  // Search for the *call* site (`= loadClients()`), not `function loadClients()`'s
  // own empty-parameter-list declaration, which contains the substring "loadClients()"
  // too and sits (harmlessly) above the gate as a plain function definition.
  const loadClientsCallIdx = pageSrc.indexOf('= loadClients()');

  assert.notEqual(adminCallIdx, -1);
  assert.notEqual(redirectIdx, -1);
  assert.notEqual(loadClientsCallIdx, -1);
  assert.ok(adminCallIdx < redirectIdx, 'verifyAdminToken must run before the login redirect is defined');
  assert.ok(redirectIdx < loadClientsCallIdx, 'the admin gate must precede loading client data');
});

test('an invalid/unrecognized submission redirects without writing (the ok-guard precedes every write)', () => {
  for (const [name, parser] of [['updateLiveReadinessAction', 'parseAdminSaveSubmission('], ['overrideLiveReadinessAction', 'parseLiveReadinessSubmission(']]) {
    const body = actionSrc.slice(actionSrc.indexOf(`export async function ${name}(`));
    assert.ok(body.indexOf(parser) < body.indexOf('if (!parsed.ok)'), name);
    assert.ok(body.indexOf('if (!parsed.ok)') < body.indexOf('writeKeys('), name);
  }
  assert.match(actionSrc, /atomicWriteJson\(recordPath, nextRecord\)/);
});
test('§1.2 — this UI never touches live-mode flags or any mutation/executor route', () => {
  for (const src of [actionSrc, pageSrc]) {
    assert.doesNotMatch(src, /from ['"].*google-ads\/executor['"]/);
    assert.doesNotMatch(src, /from ['"].*google-ads\/mutations['"]/);
    assert.doesNotMatch(src, /google-ads-api/);
  }
  // action.ts (the write path) must not even read the live-mode flag — it
  // has no legitimate reason to (a doc-comment *mentioning* the flag name to
  // document that it's untouched is fine and expected; reading it from
  // process.env is not). page.tsx may read it (=== comparison) to display
  // the current state, but must never assign/flip it.
  assert.doesNotMatch(actionSrc, /process\.env\.GOOGLE_ADS_ENABLE_LIVE_MODE/);
  assert.doesNotMatch(pageSrc, /GOOGLE_ADS_ENABLE_LIVE_MODE\s*=\s*[^=]/); // no assignment, only `=== `
  assert.match(pageSrc, /GOOGLE_ADS_ENABLE_LIVE_MODE\s*===/); // confirms it's a read-only comparison
});

test('D2 — invalid verification status / terms consent overrides redirect before any write', () => {
  const body = actionSrc.slice(actionSrc.indexOf('export async function overrideLiveReadinessAction('));
  const invalidIdx = body.indexOf("parsed.error === 'invalid-verification-status' || parsed.error === 'invalid-terms-consent'");
  assert.notEqual(invalidIdx, -1);
  assert.ok(invalidIdx < body.indexOf('writeKeys('));
});
test('the normal save writes only ADMIN_SAVE_KEYS (source admin-ui); only the override writes every key (source admin-manual-override)', () => {
  const save = actionSrc.slice(actionSrc.indexOf('export async function updateLiveReadinessAction('), actionSrc.indexOf('export async function overrideLiveReadinessAction('));
  assert.match(save, /writeKeys\(parsed\.clientId, ADMIN_SAVE_KEYS, [^)]*'admin-ui'\)/);
  assert.doesNotMatch(save, /READINESS_KEYS/);
  const override = actionSrc.slice(actionSrc.indexOf('export async function overrideLiveReadinessAction('), actionSrc.indexOf('export async function pollNowAction('));
  assert.match(override, /writeKeys\(parsed\.clientId, READINESS_KEYS, [^)]*'admin-manual-override'\)/);
  assert.match(actionSrc, /mergeReadinessPatch\(existing, patch, keys\)/);
});
test('writes are atomic (temp file + rename) and the audit log is append-only', () => {
  assert.match(actionSrc, /\.tmp`/);
  assert.match(actionSrc, /fs\.renameSync\(tmpPath, filePath\)/);
  assert.match(actionSrc, /fs\.appendFileSync\(auditPath/);
  assert.match(actionSrc, /live-readiness\.audit\.jsonl/);
});

test('page.tsx never indexes the admin route and reuses assessLiveReadiness rather than re-deriving it', () => {
  assert.match(pageSrc, /robots:\s*\{\s*index:\s*false\s*\}/);
  assert.match(pageSrc, /import\s*\{\s*assessLiveReadiness\b[^}]*\}\s*from\s*'@\/lib\/google-ads\/live-readiness'/);
});
