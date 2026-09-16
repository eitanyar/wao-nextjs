import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { provisionClientAuth, readClientAuthRecord } from './client-auth-store';
import {
  completeClientRecoveryContactVerification,
  getClientRecoveryContactStatus,
  requestClientRecoveryContactVerification,
  revealClientRecoveryContact,
} from './client-recovery-contact';
import type { SendWhatsAppTemplateInput } from './notifications/whatsapp-cloud';

function fixtureRoot(): string { return fs.mkdtempSync(path.join(os.tmpdir(), 'wao-client-recovery-contact-')); }
function writeClient(root: string, clientId: string, recovery?: unknown, extra: Record<string, unknown> = {}): void {
  const directory = path.join(root, clientId);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'client.json'), JSON.stringify({ clientId, untouched: 'preserve-canary', ...extra, ...(recovery === undefined ? {} : { clientPinRecovery: recovery }) }), 'utf8');
}
function dependencies(root: string, sent: SendWhatsAppTemplateInput[] = []) {
  const now = new Date('2026-09-16T12:00:00.000Z');
  return {
    clientsRoot: root,
    now: () => now,
    randomCode: () => '48295173',
    recoverySecret: 'synthetic-contact-secret',
    templateName: 'contact_template',
    templateLanguage: 'en',
    source: 'synthetic-source',
    auditRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'wao-client-contact-audit-')),
    rateLimit: () => true,
    sendTemplate: async (input: SendWhatsAppTemplateInput) => { sent.push(input); return { messageId: 'synthetic-message-id' }; },
  };
}
const enrolled = { whatsappE164: '972501234567', verifiedAt: '2026-09-01T00:00:00.000Z', enabled: true };

test('recovery contact status is fail closed and masks valid enrollment', (t) => {
  const root = fixtureRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeClient(root, 'disabled-client');
  writeClient(root, 'verified-client', enrolled);
  writeClient(root, 'invalid-client', { whatsappE164: 'bad', enabled: true, verifiedAt: 'x' });
  assert.deepEqual(getClientRecoveryContactStatus('disabled-client', root), { status: 'disabled' });
  assert.deepEqual(getClientRecoveryContactStatus('verified-client', root), { status: 'verified', maskedMobile: '972******67', verifiedAt: enrolled.verifiedAt });
  assert.deepEqual(getClientRecoveryContactStatus('invalid-client', root), { status: 'invalid' });
});

test('contact verification sends only to candidate and atomically preserves unrelated data', async (t) => {
  const root = fixtureRoot();
  const sent: SendWhatsAppTemplateInput[] = [];
  const deps = dependencies(root, sent);
  t.after(() => { fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(deps.auditRoot, { recursive: true, force: true }); });
  writeClient(root, 'target-client', enrolled);
  await provisionClientAuth('target-client', '482951', root);
  assert.deepEqual(await requestClientRecoveryContactVerification({ clientId: 'target-client', whatsappMobile: '0507654321' }, deps), { status: 'sent' });
  assert.deepEqual(sent[0], { to: '972507654321', templateName: 'contact_template', templateLanguage: 'en', bodyParameters: ['48295173', '10'] });
  assert.deepEqual(await completeClientRecoveryContactVerification({ clientId: 'target-client', whatsappMobile: '+972 50 765 4321', code: '48295173' }, deps), { status: 'complete' });
  const client = JSON.parse(fs.readFileSync(path.join(root, 'target-client', 'client.json'), 'utf8'));
  assert.equal(client.untouched, 'preserve-canary');
  assert.deepEqual(client.clientPinRecovery, { whatsappE164: '972507654321', verifiedAt: '2026-09-16T12:00:00.000Z', enabled: true });
  assert.equal(readClientAuthRecord('target-client', root)?.recovery?.challenge, undefined);
  assert.equal(readClientAuthRecord('target-client', root)?.recoveryContactVerification, undefined);
});

test('contact verification rejects collision and wrong code without altering old contact', async (t) => {
  const root = fixtureRoot();
  const sent: SendWhatsAppTemplateInput[] = [];
  const deps = dependencies(root, sent);
  t.after(() => { fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(deps.auditRoot, { recursive: true, force: true }); });
  writeClient(root, 'target-client', enrolled);
  writeClient(root, 'collision-client', { whatsappE164: '972507654321', verifiedAt: enrolled.verifiedAt, enabled: true });
  await provisionClientAuth('target-client', '482951', root);
  await provisionClientAuth('collision-client', '482951', root);
  assert.deepEqual(await requestClientRecoveryContactVerification({ clientId: 'target-client', whatsappMobile: '0507654321' }, deps), { status: 'failed' });
  assert.equal(sent.length, 0);
  assert.deepEqual(getClientRecoveryContactStatus('target-client', root), { status: 'verified', maskedMobile: '972******67', verifiedAt: enrolled.verifiedAt });
  assert.equal(await revealClientRecoveryContact('target-client', deps), '972501234567');
});

test('verification state contains no plaintext mobile or code and is single use', async (t) => {
  const root = fixtureRoot();
  const deps = dependencies(root);
  t.after(() => { fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(deps.auditRoot, { recursive: true, force: true }); });
  writeClient(root, 'target-client');
  await provisionClientAuth('target-client', '482951', root);
  await requestClientRecoveryContactVerification({ clientId: 'target-client', whatsappMobile: '0507654321' }, deps);
  const before = JSON.stringify(readClientAuthRecord('target-client', root));
  assert.equal(before.includes('972507654321'), false);
  assert.equal(before.includes('48295173'), false);
  const [first, second] = await Promise.all([
    completeClientRecoveryContactVerification({ clientId: 'target-client', whatsappMobile: '0507654321', code: '48295173' }, deps),
    completeClientRecoveryContactVerification({ clientId: 'target-client', whatsappMobile: '0507654321', code: '48295173' }, deps),
  ]);
  assert.equal([first.status, second.status].filter(status => status === 'complete').length, 1);
});
