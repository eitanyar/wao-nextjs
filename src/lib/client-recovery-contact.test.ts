import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { provisionClientAuth } from './client-auth-store';
import { completeClientRecoveryContactVerification, getClientRecoveryContactStatus, requestClientRecoveryContactVerification, revealClientRecoveryContact } from './client-recovery-contact';

function testContext(t: test.TestContext) {
  const clientsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-contact-email-clients-'));
  const auditRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-contact-email-audit-'));
  t.after(() => {
    fs.rmSync(clientsRoot, { recursive: true, force: true });
    fs.rmSync(auditRoot, { recursive: true, force: true });
  });
  return { clientsRoot, auditRoot };
}
function client(dir: string, id: string, email?: unknown) { fs.mkdirSync(path.join(dir, id), { recursive: true }); fs.writeFileSync(path.join(dir, id, 'client.json'), JSON.stringify({ clientId: id, preserve: true, ...(email === undefined ? {} : { clientPinRecoveryEmail: email }) })); }
function dependencies(context: { clientsRoot: string; auditRoot: string }) { return { ...context, now: () => new Date('2026-09-16T12:00:00.000Z'), randomCode: () => '48295173', recoverySecret: 'synthetic-contact-secret', sender: 'WAO <no-reply@example.com>', source: 'synthetic-source', rateLimit: () => true, sendEmail: async () => ({ messageId: 'synthetic-id' }) }; }
const enrolled = { emailCanonical: 'person@example.com', verifiedAt: '2026-09-01T00:00:00.000Z', enabled: true };
test('email recovery contact status masks and reveals only verified email', async (t) => { const context = testContext(t); const deps = dependencies(context); client(context.clientsRoot, 'target', enrolled); assert.deepEqual(getClientRecoveryContactStatus('target', context.clientsRoot), { status: 'verified', maskedEmail: 'p****n@example.com', verifiedAt: enrolled.verifiedAt }); assert.equal(await revealClientRecoveryContact('target', deps), 'person@example.com'); });
test('admin email verification preserves unrelated data and replaces only after code delivery', async (t) => { const context = testContext(t); const deps = dependencies(context); client(context.clientsRoot, 'target', enrolled); await provisionClientAuth('target', '482951', context.clientsRoot); assert.deepEqual(await requestClientRecoveryContactVerification({ clientId: 'target', email: 'new@example.com' }, deps), { status: 'sent' }); assert.deepEqual(await completeClientRecoveryContactVerification({ clientId: 'target', email: 'new@example.com', code: '48295173' }, deps), { status: 'complete' }); const record = JSON.parse(fs.readFileSync(path.join(context.clientsRoot, 'target', 'client.json'), 'utf8')); assert.equal(record.preserve, true); assert.equal(record.clientPinRecoveryEmail.emailCanonical, 'new@example.com'); });
