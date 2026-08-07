import assert from 'node:assert/strict';
import fs     from 'node:fs';
import path   from 'node:path';
import test   from 'node:test';
import { fileURLToPath } from 'node:url';

// This suite reads the source of action.ts / page.tsx as text rather than
// importing them, because both depend on next/headers' cookies() (request-
// scoped AsyncLocalStorage) and next/navigation's redirect(), which are not
// callable outside a real Next.js request — same constraint documented in
// src/app/(app)/admin/live-readiness/admin-gate.security.test.mjs. Genuine
// behavioral coverage of the parsing/validation/persistence logic lives in
// ./ltpc-form.test.mjs and ./ltpc-store.test.mjs, which import real code.

const dir        = path.dirname(fileURLToPath(import.meta.url));
const actionSrc  = fs.readFileSync(path.join(dir, 'action.ts'), 'utf8');
const pageSrc    = fs.readFileSync(path.join(dir, 'page.tsx'), 'utf8');
const actionBody = actionSrc.slice(actionSrc.indexOf('export async function updateLtpcAction'));

// ── #12 — no wao-admin cookie → action rejects / page redirects ────────
test('#12 — action.ts uses the wao-admin gate (verifyAdminToken), not the client session', () => {
  assert.match(actionSrc, /import\s*\{\s*ADMIN_COOKIE_NAME,\s*verifyAdminToken\s*\}\s*from\s*'@\/lib\/admin-auth'/);
  assert.doesNotMatch(actionSrc, /verifySessionToken/);
  assert.doesNotMatch(actionSrc, /from ['"]@\/lib\/client-auth['"]/);
});

test('#12 — page.tsx uses the wao-admin gate (verifyAdminToken), not the client session', () => {
  assert.match(pageSrc, /import\s*\{\s*ADMIN_COOKIE_NAME,\s*verifyAdminToken\s*\}\s*from\s*'@\/lib\/admin-auth'/);
  assert.doesNotMatch(pageSrc, /verifySessionToken/);
  assert.doesNotMatch(pageSrc, /from ['"]@\/lib\/client-auth['"]/);
});

test('#12 — the admin check in updateLtpcAction runs before any form parsing or filesystem access', () => {
  const adminCallIdx      = actionBody.indexOf('verifyAdminToken(');
  const adminGuardIdx     = actionBody.indexOf('if (!isAdmin)');
  const redirectLoginIdx  = actionBody.indexOf("redirect('/admin/login");
  const applySubmissionIdx = actionBody.indexOf('applyLtpcSubmission(');

  for (const idx of [adminCallIdx, adminGuardIdx, redirectLoginIdx, applySubmissionIdx]) {
    assert.notEqual(idx, -1);
  }

  assert.ok(adminCallIdx < adminGuardIdx, 'verifyAdminToken must be called before the isAdmin guard');
  assert.ok(adminGuardIdx < redirectLoginIdx, 'the isAdmin guard must precede the login redirect');
  assert.ok(redirectLoginIdx < applySubmissionIdx, 'the admin gate must precede any form parsing/persistence');
});

test('#12 — page.tsx verifies the admin token before loading any client/prospect data', () => {
  const adminCallIdx  = pageSrc.indexOf('verifyAdminToken(');
  const redirectIdx   = pageSrc.indexOf("redirect('/admin/login");
  const loadClientsCallIdx = pageSrc.indexOf('= loadClients()');
  const loadProspectsCallIdx = pageSrc.indexOf('= loadProspects()');

  assert.notEqual(adminCallIdx, -1);
  assert.notEqual(redirectIdx, -1);
  assert.notEqual(loadClientsCallIdx, -1);
  assert.notEqual(loadProspectsCallIdx, -1);
  assert.ok(adminCallIdx < redirectIdx, 'verifyAdminToken must run before the login redirect is defined');
  assert.ok(redirectIdx < loadClientsCallIdx, 'the admin gate must precede loading client data');
  assert.ok(redirectIdx < loadProspectsCallIdx, 'the admin gate must precede loading prospect data');
});

// ── §5.4 / §9 posture checks ─────────────────────────────────────────────
test('an invalid/unrecognized submission redirects without a successful write (ok-guard precedes the success redirect)', () => {
  const applyIdx = actionBody.indexOf('applyLtpcSubmission(');
  const notOkGuardIdx = actionBody.indexOf('if (!result.ok)');
  const successRedirectIdx = actionBody.indexOf("redirect(`/admin/readiness-gate?success=");

  assert.ok(applyIdx < notOkGuardIdx);
  assert.ok(notOkGuardIdx < successRedirectIdx, 'the not-ok guard must precede the success redirect');
});

test('§9 — this action never IMPORTS any provisioning/billing/create-campaign route (v1 is a visible staff gate, not a code-level block; a doc-comment mentioning the name is fine, an import/call is not)', () => {
  for (const src of [actionSrc, pageSrc]) {
    assert.doesNotMatch(src, /from ['"].*create-campaign['"]/);
    assert.doesNotMatch(src, /from ['"].*google-ads\/executor['"]/);
    assert.doesNotMatch(src, /from ['"].*payments\/.*charge['"]/);
  }
});

test('page.tsx never indexes the admin route', () => {
  assert.match(pageSrc, /robots:\s*\{\s*index:\s*false\s*\}/);
});

test('persistence logic (atomic write, append-only audit) lives in the thin action wrapper, not inlined ad hoc', () => {
  assert.match(actionSrc, /\.tmp`/);
  assert.match(actionSrc, /fs\.renameSync\(tmpPath, filePath\)/);
  assert.match(actionSrc, /fs\.appendFileSync\(auditPath/);
  assert.match(actionSrc, /readiness-gate\.audit\.jsonl/);
});
