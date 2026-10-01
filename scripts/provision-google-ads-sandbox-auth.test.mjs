import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { readClientAuthRecord, verifyClientCredentials } from '../dist/lib/client-auth-store.js';
import { verifyClientPin } from '../dist/lib/client-pin.js';
import { buildClientAuthRecord, hashPinScryptV1 } from './provision-google-ads-sandbox-auth.mjs';

const script = fileURLToPath(new URL('./provision-google-ads-sandbox-auth.mjs', import.meta.url));
function run(root, cwd, randomPin = false) {
  return spawnSync(process.execPath, [script], {
    cwd,
    env: {
      ...process.env,
      WAO_RUNTIME_DATA_DIR: root,
      GOOGLE_ADS_SANDBOX_CLIENT_ID: 'synthetic-client',
      WAO_SANDBOX_PROVISION_RANDOM_PIN: randomPin ? '1' : '0',
    },
    encoding: 'utf8',
  });
}

test('scrypt hash is compatible with canonical PIN verifier', async () => {
  const hash = await hashPinScryptV1('482951');
  assert.match(hash, /^scrypt-v1\$16384\$8\$1\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{43}$/);
  assert.equal(await verifyClientPin('482951', hash), true);
  assert.equal(await verifyClientPin('759284', hash), false);
  const record = await buildClientAuthRecord('482951');
  assert.equal(record.mustChangePin, false);
  assert.equal(record.createdAt, record.updatedAt);
});

test('entry path provisions once, preserves legacy data, and rejects invalid legacy PINs', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-sandbox-auth-'));
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-sandbox-cwd-'));
  t.after(() => { fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(cwd, { recursive: true, force: true }); });
  const dir = path.join(root, 'clients', 'synthetic-client');
  fs.mkdirSync(dir, { recursive: true });
  const clientPath = path.join(dir, 'client.json');
  const authPath = path.join(dir, 'client-auth.json');
  const legacy = JSON.stringify({ clientId: 'synthetic-client', pin: '482951' });
  fs.writeFileSync(clientPath, legacy);
  const first = run(root, cwd);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(first.stdout.trim(), 'client_auth_created');
  assert.equal(fs.readFileSync(clientPath, 'utf8'), legacy);
  const record = readClientAuthRecord('synthetic-client', path.join(root, 'clients'));
  assert.ok(record);
  assert.equal(record.sessionVersion, 1);
  assert.equal(record.mustChangePin, false);
  assert.deepEqual(await verifyClientCredentials('synthetic-client', '482951', path.join(root, 'clients')), {
    ok: true, clientId: 'synthetic-client', sessionVersion: 1, mustChangePin: false,
  });
  const bytes = fs.readFileSync(authPath);
  const second = run(root, cwd);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(second.stdout.trim(), 'client_auth_exists');
  assert.deepEqual(fs.readFileSync(authPath), bytes);
  assert.equal(fs.readFileSync(clientPath, 'utf8'), legacy);
  for (const invalid of ['111111', '12345']) {
    fs.rmSync(authPath, { force: true });
    fs.writeFileSync(clientPath, JSON.stringify({ clientId: 'synthetic-client', pin: invalid }));
    const result = run(root, cwd);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /invalid_or_missing_legacy_pin/);
    assert.equal(fs.existsSync(authPath), false);
  }
});

test('random PIN opt-in provisions invalid legacy data without exposing plaintext', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-sandbox-random-'));
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-sandbox-cwd-'));
  t.after(() => { fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(cwd, { recursive: true, force: true }); });
  const dir = path.join(root, 'clients', 'synthetic-client');
  fs.mkdirSync(dir, { recursive: true });
  const legacy = JSON.stringify({ clientId: 'synthetic-client', pin: '1111' });
  const clientPath = path.join(dir, 'client.json');
  fs.writeFileSync(clientPath, legacy);
  const denied = run(root, cwd);
  assert.equal(denied.status, 1);
  assert.match(denied.stderr, /invalid_or_missing_legacy_pin/);
  assert.equal(fs.existsSync(path.join(dir, 'client-auth.json')), false);

  const created = run(root, cwd, true);
  assert.equal(created.status, 0, created.stderr);
  assert.equal(created.stdout.trim(), 'client_auth_created');
  assert.doesNotMatch(created.stdout + created.stderr, /\d{6,12}/);
  const record = readClientAuthRecord('synthetic-client', path.join(root, 'clients'));
  assert.ok(record);
  assert.match(record.pinHash, /^scrypt-v1\$16384\$8\$1\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{43}$/);
  assert.equal(record.sessionVersion, 1);
  assert.equal(record.mustChangePin, false);
  assert.equal(await verifyClientPin('482951', record.pinHash), false);
  assert.equal(fs.readFileSync(clientPath, 'utf8'), legacy);
  const before = fs.readFileSync(path.join(dir, 'client-auth.json'));
  const again = run(root, cwd, true);
  assert.equal(again.status, 0, again.stderr);
  assert.equal(again.stdout.trim(), 'client_auth_exists');
  assert.deepEqual(fs.readFileSync(path.join(dir, 'client-auth.json')), before);
});
