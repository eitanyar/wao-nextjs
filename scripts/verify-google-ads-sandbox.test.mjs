import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createSessionToken, verifyClientSession } from '../dist/lib/client-auth.js';
import { changeClientPin, provisionClientAuth, readClientAuthRecord } from '../dist/lib/client-auth-store.js';
import { mintSandboxSessionToken } from './verify-google-ads-sandbox.mjs';

test('sandbox token matches canonical producer and consumer, and stale version is rejected', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-sandbox-token-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const clientId = 'synthetic-client';
  const secret = 'synthetic-secret-only';
  await provisionClientAuth(clientId, '482951', root);
  const sessionVersion = readClientAuthRecord(clientId, root).sessionVersion;
  const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const token = mintSandboxSessionToken({ clientId, sessionVersion, secret, expiry });
  assert.match(token, /^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/);
  const claim = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
  assert.deepEqual(Object.keys(claim), ['clientId', 'sessionVersion', 'expiry', 'scope']);
  assert.deepEqual(claim, { clientId, sessionVersion, expiry, scope: 'full' });
  assert.equal(token, await createSessionToken(clientId, { sessionVersion, expiry, secret }));
  assert.deepEqual(await verifyClientSession(token, { root, secret }), claim);
  await changeClientPin(clientId, '759284', root);
  assert.equal(await verifyClientSession(token, { root, secret }), null);
});
