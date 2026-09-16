import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  changeClientPin,
  configureClientAuthStoreForTests,
  provisionClientAuth,
  readClientAuthRecord,
  resolveConfiguredClientAuthRoot,
  resetClientPin,
  verifyClientCredentials,
} from './client-auth-store';

function fixtureRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wao-client-auth-'));
}

function writeLegacy(root: string, clientId: string, pin: string): void {
  const dir = path.join(root, clientId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'client.json'), JSON.stringify({ clientId, pin }), 'utf8');
}

test('provisioned credentials verify and reset revokes prior version', async (t) => {
  const root = fixtureRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const created = await provisionClientAuth('synthetic-client', '482951', root);
  assert.equal(created.sessionVersion, 1);
  assert.equal((await verifyClientCredentials('synthetic-client', '482951', root)).ok, true);
  const reset = await resetClientPin('synthetic-client', '759284', { mustChangePin: true }, root);
  assert.equal(reset?.sessionVersion, 2);
  assert.equal((await verifyClientCredentials('synthetic-client', '482951', root)).ok, false);
  assert.equal((await verifyClientCredentials('synthetic-client', '759284', root)).mustChangePin, true);
});

test('legacy credentials migrate only after successful verification', async (t) => {
  const root = fixtureRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeLegacy(root, 'legacy-client', '482951');
  assert.equal((await verifyClientCredentials('legacy-client', '000000', root)).ok, false);
  assert.equal(readClientAuthRecord('legacy-client', root), null);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'legacy-client', 'client.json'), 'utf8')).pin, '482951');
  const migrated = await verifyClientCredentials('legacy-client', '482951', root);
  assert.equal(migrated.ok, true);
  assert.equal(migrated.mustChangePin, true);
  assert.equal(readClientAuthRecord('legacy-client', root)?.sessionVersion, 1);
  assert.equal('pin' in JSON.parse(fs.readFileSync(path.join(root, 'legacy-client', 'client.json'), 'utf8')), false);
});

test('changing a PIN increments version and clears forced-change state', async (t) => {
  const root = fixtureRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  await provisionClientAuth('change-client', '482951', root, { mustChangePin: true });
  const changed = await changeClientPin('change-client', '759284', root);
  assert.equal(changed?.sessionVersion, 2);
  assert.equal(changed?.mustChangePin, false);
});

test('every generic denial performs one KDF-class verification, including malformed hashes', async (t) => {
  const root = fixtureRoot();
  t.after(() => { configureClientAuthStoreForTests(); fs.rmSync(root, { recursive: true, force: true }); });
  await provisionClientAuth('valid-client', '482951', root);
  const authPath = path.join(root, 'malformed-client', 'client-auth.json');
  fs.mkdirSync(path.dirname(authPath), { recursive: true });
  fs.writeFileSync(authPath, JSON.stringify({ pinHash: 'broken', sessionVersion: 1, mustChangePin: false, createdAt: 'x', updatedAt: 'x' }));
  writeLegacy(root, 'legacy-client', '482951');
  let calls = 0;
  configureClientAuthStoreForTests({ verifyPin: async () => { calls += 1; return false; } });
  for (const id of ['valid-client', 'malformed-client', 'missing-client', 'legacy-client']) {
    assert.deepEqual(await verifyClientCredentials(id, '000000', root), { ok: false });
  }
  assert.equal(calls, 4);
});

test('development fixture root is selected only for a safe opt-in temporary directory', (t) => {
  const previousEnable = process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ENABLE;
  const previousRoot = process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ROOT;
  const previousNodeEnv = process.env.NODE_ENV;
  const root = path.join(os.tmpdir(), 'wao-client-auth-ui-test-root');
  t.after(() => {
    if (previousEnable === undefined) delete process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ENABLE;
    else process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ENABLE = previousEnable;
    if (previousRoot === undefined) delete process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ROOT;
    else process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ROOT = previousRoot;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  });

  process.env.NODE_ENV = 'development';
  process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ENABLE = '1';
  process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ROOT = root;
  assert.equal(resolveConfiguredClientAuthRoot(), path.resolve(root));

  process.env.NODE_ENV = 'production';
  assert.equal(resolveConfiguredClientAuthRoot(), null);
  process.env.NODE_ENV = 'development';
  process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ROOT = path.join(os.tmpdir(), 'not-an-auth-ui-fixture');
  assert.equal(resolveConfiguredClientAuthRoot(), null);
  process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ROOT = path.join(os.tmpdir(), '..', 'wao-client-auth-ui-escape');
  assert.equal(resolveConfiguredClientAuthRoot(), null);
});
