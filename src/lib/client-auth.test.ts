import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createSessionToken, verifyClientSession, verifySessionToken } from './client-auth';
import { changeClientPin, provisionClientAuth, resetClientPin } from './client-auth-store';

function root(): string { return fs.mkdtempSync(path.join(os.tmpdir(), 'wao-client-session-')); }

test('client sessions reject tampering and expiry', async (t) => {
  const authRoot = root();
  t.after(() => fs.rmSync(authRoot, { recursive: true, force: true }));
  const record = await provisionClientAuth('session-client', '482951', authRoot);
  const options = { root: authRoot, secret: 'synthetic-secret' };
  const valid = await createSessionToken('session-client', { sessionVersion: record.sessionVersion, secret: 'synthetic-secret' });
  assert.equal((await verifyClientSession(valid, options))?.clientId, 'session-client');
  assert.equal(await verifyClientSession(`${valid}x`, options), null);
  const expired = await createSessionToken('session-client', { sessionVersion: record.sessionVersion, expiry: Date.now() - 1, secret: 'synthetic-secret' });
  assert.equal(await verifyClientSession(expired, options), null);
});

test('forced-change and versioned sessions isolate and revoke access', async (t) => {
  const authRoot = root();
  t.after(() => fs.rmSync(authRoot, { recursive: true, force: true }));
  const record = await provisionClientAuth('scope-client', '482951', authRoot, { mustChangePin: true });
  const options = { root: authRoot, secret: 'synthetic-secret' };
  const forced = await createSessionToken('scope-client', { sessionVersion: record.sessionVersion, scope: 'change-pin', secret: 'synthetic-secret' });
  const full = await createSessionToken('scope-client', { sessionVersion: record.sessionVersion, scope: 'full', secret: 'synthetic-secret' });
  const impersonation = await createSessionToken('scope-client', { sessionVersion: record.sessionVersion, scope: 'admin-impersonation', secret: 'synthetic-secret' });
  assert.equal((await verifyClientSession(forced, options))?.scope, 'change-pin');
  assert.equal(await verifyClientSession(full, options), null);
  assert.equal(await verifyClientSession(impersonation, options), null);
  const changed = await changeClientPin('scope-client', '759284', authRoot);
  assert.equal(changed?.sessionVersion, 2);
  assert.equal(await verifyClientSession(forced, options), null);
  const currentImpersonation = await createSessionToken('scope-client', { sessionVersion: changed!.sessionVersion, scope: 'admin-impersonation', secret: 'synthetic-secret' });
  assert.equal((await verifyClientSession(currentImpersonation, options))?.scope, 'admin-impersonation');
  await resetClientPin('scope-client', '849275', { mustChangePin: true }, authRoot);
  assert.equal(await verifyClientSession(currentImpersonation, options), null);
  assert.equal(await verifySessionToken(currentImpersonation), null);
});
