import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { provisionClientAuth, readClientAuthRecord } from './client-auth-store';
import { verifyClientPin } from './client-pin';
import { completeClientPinRecovery, requestClientPinRecovery } from './client-pin-recovery';
import type { SendWhatsAppTemplateInput } from './notifications/whatsapp-cloud';

function fixtureRoot(): string { return fs.mkdtempSync(path.join(os.tmpdir(), 'wao-client-recovery-')); }
function writeClient(root: string, clientId: string, recovery?: unknown, extras: Record<string, unknown> = {}): void {
  const directory = path.join(root, clientId);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'client.json'), JSON.stringify({ clientId, ...extras, ...(recovery === undefined ? {} : { clientPinRecovery: recovery }) }), 'utf8');
}

function dependencies(root: string, sent: SendWhatsAppTemplateInput[] = []) {
  let now = new Date('2026-09-16T12:00:00.000Z');
  return {
    clientsRoot: root,
    now: () => now,
    randomCode: () => '48295173',
    recoverySecret: 'synthetic-recovery-secret',
    templateName: 'recovery_template',
    templateLanguage: 'en',
    rateLimit: () => true,
    sendTemplate: async (input: SendWhatsAppTemplateInput) => { sent.push(input); return { messageId: 'synthetic-message-id' }; },
    advance: (milliseconds: number) => { now = new Date(now.getTime() + milliseconds); },
  };
}

const enrolled = { whatsappE164: '972501234567', verifiedAt: '2026-09-01T00:00:00.000Z', enabled: true };

test('recovery normalizes local and international mobile forms to one unique enrolled account', async (t) => {
  const root = fixtureRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const sent: SendWhatsAppTemplateInput[] = [];
  const deps = dependencies(root, sent);
  writeClient(root, 'enrolled-client', enrolled);
  await provisionClientAuth('enrolled-client', '482951', root);

  assert.deepEqual(await requestClientPinRecovery({ whatsappMobile: '050-123-4567', source: 'source-a' }, deps), { status: 'accepted' });
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0], { to: '972501234567', templateName: 'recovery_template', templateLanguage: 'en', bodyParameters: ['48295173', '10'] });
  assert.deepEqual(await completeClientPinRecovery({ whatsappMobile: '+972 50 123 4567', code: '48295173', newPin: '759284', confirmPin: '759284', source: 'source-a' }, deps), { status: 'complete' });
  const record = readClientAuthRecord('enrolled-client', root);
  assert.equal(record?.sessionVersion, 2);
  assert.equal(record?.mustChangePin, false);
  assert.equal(await verifyClientPin('759284', record?.pinHash ?? ''), true);
});

test('recovery fails closed for malformed, unknown, legacy-only, approval-only, and duplicate enrolled mobiles', async (t) => {
  const root = fixtureRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const sent: SendWhatsAppTemplateInput[] = [];
  const deps = dependencies(root, sent);
  writeClient(root, 'approval-only', undefined, { approvalWhatsapp: '972501234567' });
  writeClient(root, 'legacy-only', enrolled);
  writeClient(root, 'first-client', enrolled);
  writeClient(root, 'last-client', enrolled);
  await provisionClientAuth('approval-only', '482951', root);
  await provisionClientAuth('first-client', '482951', root);
  await provisionClientAuth('last-client', '482951', root);

  for (const whatsappMobile of ['invalid', '050-765-4321', '050-123-4567']) {
    assert.deepEqual(await requestClientPinRecovery({ whatsappMobile, source: 'source-b' }, deps), { status: 'accepted' });
  }
  assert.equal(sent.length, 0);
});

test('completion is bound to the requested mobile and rejects reassignment, removal, and a later collision', async (t) => {
  const root = fixtureRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const sent: SendWhatsAppTemplateInput[] = [];
  const deps = dependencies(root, sent);
  writeClient(root, 'enrolled-client', enrolled);
  await provisionClientAuth('enrolled-client', '482951', root);
  await requestClientPinRecovery({ whatsappMobile: '0501234567', source: 'source-c' }, deps);
  writeClient(root, 'collision-client', enrolled);
  await provisionClientAuth('collision-client', '482951', root);

  assert.deepEqual(await completeClientPinRecovery({ whatsappMobile: '0501234567', code: '48295173', newPin: '759284', confirmPin: '759284', source: 'source-c' }, deps), { status: 'invalid-or-expired' });
  assert.equal(readClientAuthRecord('enrolled-client', root)?.sessionVersion, 1);
  assert.equal(await verifyClientPin('482951', readClientAuthRecord('enrolled-client', root)?.pinHash ?? ''), true);
});

test('recovery challenges expire, exhaust attempts, supersede, and are single-use concurrently', async (t) => {
  const root = fixtureRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const deps = dependencies(root);
  writeClient(root, 'enrolled-client', enrolled);
  await provisionClientAuth('enrolled-client', '482951', root);
  await requestClientPinRecovery({ whatsappMobile: '0501234567', source: 'source-d' }, deps);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.deepEqual(await completeClientPinRecovery({ whatsappMobile: '0501234567', code: '00000000', newPin: '759284', confirmPin: '759284', source: 'source-d' }, deps), { status: 'invalid-or-expired' });
  }
  assert.deepEqual(await completeClientPinRecovery({ whatsappMobile: '0501234567', code: '48295173', newPin: '759284', confirmPin: '759284', source: 'source-d' }, deps), { status: 'invalid-or-expired' });
  deps.advance(61_000);
  await requestClientPinRecovery({ whatsappMobile: '0501234567', source: 'source-d' }, deps);
  const [first, second] = await Promise.all([
    completeClientPinRecovery({ whatsappMobile: '0501234567', code: '48295173', newPin: '759284', confirmPin: '759284', source: 'source-d' }, deps),
    completeClientPinRecovery({ whatsappMobile: '0501234567', code: '48295173', newPin: '759284', confirmPin: '759284', source: 'source-d' }, deps),
  ]);
  assert.equal([first.status, second.status].filter(status => status === 'complete').length, 1);
});