#!/usr/bin/env node
import { randomBytes, randomInt, randomUUID, scrypt as scryptCallback } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

function validPin(pin) {
  if (typeof pin !== 'string' || !/^\d{6,12}$/.test(pin) || /^(\d)\1+$/.test(pin)) return false;
  let ascending = true;
  let descending = true;
  for (let index = 1; index < pin.length; index += 1) {
    const difference = Number(pin[index]) - Number(pin[index - 1]);
    ascending &&= difference === 1;
    descending &&= difference === -1;
  }
  return !ascending && !descending;
}

export async function hashPinScryptV1(pin) {
  if (!validPin(pin)) throw new Error('invalid_or_missing_legacy_pin');
  const salt = randomBytes(16);
  const derived = await scrypt(pin, salt, 32, { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 });
  return ['scrypt-v1', 16384, 8, 1, salt.toString('base64url'), derived.toString('base64url')].join('$');
}

export async function buildClientAuthRecord(pin) {
  const pinHash = await hashPinScryptV1(pin);
  const now = new Date().toISOString();
  return { pinHash, sessionVersion: 1, mustChangePin: false, createdAt: now, updatedAt: now };
}

async function main() {
  const clientId = process.env.GOOGLE_ADS_SANDBOX_CLIENT_ID || 'google-ads-sandbox';
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(clientId)) throw new Error('invalid_client_id');
  const runtimeRoot = path.resolve(process.env.WAO_RUNTIME_DATA_DIR || '/home/wao/wao-runtime-data', 'clients');
  const localRoot = path.resolve(process.cwd(), 'data', 'clients');
  const root = process.env.WAO_RUNTIME_DATA_DIR || fs.existsSync(path.join(runtimeRoot, clientId)) ? runtimeRoot : localRoot;
  const clientDir = path.resolve(root, clientId);
  const relative = path.relative(root, clientDir);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('invalid_client_id');
  const authPath = path.join(clientDir, 'client-auth.json');
  fs.mkdirSync(clientDir, { recursive: true });
  if (fs.existsSync(authPath)) {
    console.log('client_auth_exists');
    return;
  }
  let pin;
  try {
    pin = JSON.parse(fs.readFileSync(path.join(clientDir, 'client.json'), 'utf8')).pin;
  } catch {
    throw new Error('invalid_or_missing_legacy_pin');
  }
  if (!validPin(pin)) {
    if (process.env.WAO_SANDBOX_PROVISION_RANDOM_PIN !== '1') throw new Error('invalid_or_missing_legacy_pin');
    do {
      pin = String(randomInt(0, 100_000_000)).padStart(8, '0');
    } while (!validPin(pin));
  }
  const record = await buildClientAuthRecord(pin);
  const tempPath = path.join(clientDir, `.client-auth.json.${process.pid}.${Date.now()}.${randomUUID()}.tmp`);
  try {
    fs.writeFileSync(tempPath, `${JSON.stringify(record, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(tempPath, authPath);
  } finally {
    fs.rmSync(tempPath, { force: true });
  }
  console.log('client_auth_created');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
