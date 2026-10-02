import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { provisionClientAuth, readClientAuthRecord } from './client-auth-store';
import { verifyClientPin } from './client-pin';
import { canonicalizeRecoveryEmail, completeClientPinRecovery, requestClientPinRecovery, resolveUniqueRecoveryEnrollmentByEmail } from './client-pin-recovery';

function testContext(t: test.TestContext) {
  const clientsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-email-recovery-clients-'));
  const auditRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-email-recovery-audit-'));
  t.after(() => {
    fs.rmSync(clientsRoot, { recursive: true, force: true });
    fs.rmSync(auditRoot, { recursive: true, force: true });
  });
  return { clientsRoot, auditRoot };
}
function writeClient(root: string, clientId: string, email?: unknown, extra: Record<string, unknown> = {}): void { const directory = path.join(root, clientId); fs.mkdirSync(directory, { recursive: true }); fs.writeFileSync(path.join(directory, 'client.json'), JSON.stringify({ clientId, ...extra, ...(email === undefined ? {} : { clientPinRecoveryEmail: email }) }), 'utf8'); }
function dependencies(context: { clientsRoot: string; auditRoot: string }, sent: unknown[] = []) { return { ...context, now: () => new Date('2026-09-16T12:00:00.000Z'), randomCode: () => '48295173', recoverySecret: 'synthetic-recovery-secret', enabled: true, sender: 'WAO <no-reply@example.com>', rateLimit: () => true, sendEmail: async (input: unknown) => { sent.push(input); return { messageId: 'synthetic-message-id' }; } }; }
const enrolled = { emailCanonical: 'person@example.com', verifiedAt: '2026-09-01T00:00:00.000Z', enabled: true };

test('canonicalizes valid email and rejects invalid candidates', () => { assert.equal(canonicalizeRecoveryEmail(' Person@Example.COM '), 'person@example.com'); for (const value of ['', 'person', 'person@example', 'a@@example.com', 'a @example.com']) assert.equal(canonicalizeRecoveryEmail(value), null); });
test('resolves only one valid email enrollment and never legacy contact data', (t) => { const { clientsRoot } = testContext(t); writeClient(clientsRoot, 'legacy', undefined, { clientPinRecovery: { whatsappE164: '972501234567', verifiedAt: enrolled.verifiedAt, enabled: true }, approvalContact: 'person@example.com' }); writeClient(clientsRoot, 'email', enrolled); assert.deepEqual(resolveUniqueRecoveryEnrollmentByEmail('person@example.com', clientsRoot), { clientId: 'email', emailCanonical: 'person@example.com' }); writeClient(clientsRoot, 'duplicate', enrolled); assert.equal(resolveUniqueRecoveryEnrollmentByEmail('person@example.com', clientsRoot), null); });
test('recovery sends only through injected email seam and binds reset to enrolled email', async (t) => { const context = testContext(t); const sent: unknown[] = []; const deps = dependencies(context, sent); writeClient(context.clientsRoot, 'email-client', enrolled); await provisionClientAuth('email-client', '482951', context.clientsRoot); assert.deepEqual(await requestClientPinRecovery({ email: 'person@example.com', source: 'source-a' }, deps), { status: 'accepted' }); assert.equal(sent.length, 1); assert.deepEqual(await completeClientPinRecovery({ email: 'person@example.com', code: '48295173', newPin: '759284', confirmPin: '759284', source: 'source-a' }, deps), { status: 'complete' }); const record = readClientAuthRecord('email-client', context.clientsRoot); assert.equal(record?.sessionVersion, 2); assert.equal(await verifyClientPin('759284', record?.pinHash ?? ''), true); assert.equal(fs.existsSync(path.resolve('data/client-security-audit')), false); });
test('feature and sender configuration fail closed without sending', async (t) => { const context = testContext(t); const sent: unknown[] = []; writeClient(context.clientsRoot, 'email-client', enrolled); await provisionClientAuth('email-client', '482951', context.clientsRoot); await requestClientPinRecovery({ email: 'person@example.com', source: 'source-a' }, { ...dependencies(context, sent), enabled: false }); await requestClientPinRecovery({ email: 'person@example.com', source: 'source-a' }, { ...dependencies(context, sent), sender: '' }); assert.equal(sent.length, 0); });
