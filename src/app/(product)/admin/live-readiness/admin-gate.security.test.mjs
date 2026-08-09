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
const actionBody = actionSrc.slice(actionSrc.indexOf('export async function updateLiveReadinessAction'));

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

test('the admin check in updateLiveReadinessAction runs before any form parsing or filesystem access', () => {
  const adminCallIdx   = actionBody.indexOf('verifyAdminToken(');
  const adminGuardIdx  = actionBody.indexOf('if (!isAdmin)');
  const redirectLoginIdx = actionBody.indexOf("redirect('/admin/login");
  const parseFormIdx   = actionBody.indexOf('parseLiveReadinessSubmission(');
  const clientDirCheckIdx = actionBody.indexOf('fs.existsSync(clientDir)');
  const loadRecordCallIdx = actionBody.indexOf('loadRecord(recordPath)');

  for (const idx of [adminCallIdx, adminGuardIdx, redirectLoginIdx, parseFormIdx, clientDirCheckIdx, loadRecordCallIdx]) {
    assert.notEqual(idx, -1);
  }

  assert.ok(adminCallIdx < adminGuardIdx, 'verifyAdminToken must be called before the isAdmin guard');
  assert.ok(adminGuardIdx < redirectLoginIdx, 'the isAdmin guard must precede the login redirect');
  assert.ok(redirectLoginIdx < parseFormIdx, 'the admin gate must precede any form parsing');
  assert.ok(parseFormIdx < clientDirCheckIdx, 'form parsing (incl. clientId regex) precedes filesystem existence check');
  assert.ok(clientDirCheckIdx < loadRecordCallIdx, 'client dir existence is confirmed before the record is read');
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

test('an invalid/unrecognized submission redirects without writing (no fs write calls before the validity check)', () => {
  const parseFormIdx      = actionBody.indexOf('parseLiveReadinessSubmission(');
  const parsedOkGuardIdx  = actionBody.indexOf('if (!parsed.ok)');
  const atomicWriteCallIdx = actionBody.indexOf('atomicWriteJson(recordPath, nextRecord)');

  assert.ok(parseFormIdx < parsedOkGuardIdx);
  assert.ok(parsedOkGuardIdx < atomicWriteCallIdx, 'the ok-guard on the parsed submission must precede the write');
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

test('§1.3 — setting liveConsentRecorded=true without an evidence note is rejected before any write', () => {
  assert.match(actionSrc, /missing-consent-evidence/);
  const missingEvidenceIdx = actionBody.indexOf('missing-consent-evidence');
  const atomicWriteCallIdx = actionBody.indexOf('atomicWriteJson(recordPath, nextRecord)');
  assert.ok(missingEvidenceIdx < atomicWriteCallIdx);
});

test('the six readiness keys are the only fields ever assigned onto the persisted record', () => {
  assert.match(actionSrc, /for \(const key of READINESS_KEYS\)/);
});

test('writes are atomic (temp file + rename) and the audit log is append-only', () => {
  assert.match(actionSrc, /\.tmp`/);
  assert.match(actionSrc, /fs\.renameSync\(tmpPath, filePath\)/);
  assert.match(actionSrc, /fs\.appendFileSync\(auditPath/);
  assert.match(actionSrc, /live-readiness\.audit\.jsonl/);
});

test('page.tsx never indexes the admin route and reuses assessLiveReadiness rather than re-deriving it', () => {
  assert.match(pageSrc, /robots:\s*\{\s*index:\s*false\s*\}/);
  assert.match(pageSrc, /import\s*\{\s*assessLiveReadiness\s*\}\s*from\s*'@\/lib\/google-ads\/live-readiness'/);
});
