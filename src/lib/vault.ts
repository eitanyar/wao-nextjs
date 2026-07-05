/**
 * Credentials vault — per-client encrypted token storage.
 *
 * Each client has one file: data/clients/{clientId}/credentials.json
 * Encrypted with AES-256-GCM using CLIENT_VAULT_KEY env var.
 *
 * Supported services: 'gsc' | 'googleAds' | 'cloudflare' | 'github' | 'resend'
 *
 * Usage:
 *   await setToken('retter', 'gsc', { access_token, refresh_token, expiry_date })
 *   const token = await getToken('retter', 'gsc')
 */

import fs      from 'fs';
import path    from 'path';
import crypto  from 'crypto';

export type VaultService = 'gsc' | 'googleAds' | 'cloudflare' | 'github' | 'resend';

const CLIENTS_DIR = path.join(process.cwd(), 'data', 'clients');
const ALGORITHM   = 'aes-256-gcm';
const KEY_LENGTH  = 32; // bytes

function getKey(): Buffer {
  const raw = process.env.CLIENT_VAULT_KEY;
  if (!raw) throw new Error('CLIENT_VAULT_KEY not set in .env.local');
  // Accept hex (64 chars) or base64 (44 chars) or raw string (padded/truncated to 32 bytes)
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, 'hex');
  if (/^[A-Za-z0-9+/]{43}=?$/.test(raw)) return Buffer.from(raw, 'base64').slice(0, KEY_LENGTH);
  return Buffer.from(raw.padEnd(KEY_LENGTH, '0').slice(0, KEY_LENGTH));
}

function vaultPath(clientId: string): string {
  const dir = path.join(CLIENTS_DIR, clientId);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'credentials.json');
}

function encrypt(plaintext: string): string {
  const iv         = crypto.randomBytes(12);
  const cipher     = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted  = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag    = cipher.getAuthTag();
  return JSON.stringify({
    iv:      iv.toString('hex'),
    tag:     authTag.toString('hex'),
    data:    encrypted.toString('hex'),
  });
}

function decrypt(blob: string): string {
  const { iv, tag, data } = JSON.parse(blob);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return decipher.update(Buffer.from(data, 'hex')) + decipher.final('utf8');
}

type VaultStore = Partial<Record<VaultService, unknown>>;

function readVault(clientId: string): VaultStore {
  const file = vaultPath(clientId);
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(decrypt(fs.readFileSync(file, 'utf8'))) as VaultStore;
  } catch {
    return {};
  }
}

function writeVault(clientId: string, store: VaultStore): void {
  fs.writeFileSync(vaultPath(clientId), encrypt(JSON.stringify(store)), 'utf8');
}

export function getToken<T = unknown>(clientId: string, service: VaultService): T | null {
  const store = readVault(clientId);
  return (store[service] as T) ?? null;
}

export function setToken(clientId: string, service: VaultService, token: unknown): void {
  const store = readVault(clientId);
  store[service] = token;
  writeVault(clientId, store);
}

export function deleteToken(clientId: string, service: VaultService): void {
  const store = readVault(clientId);
  delete store[service];
  writeVault(clientId, store);
}

export function hasToken(clientId: string, service: VaultService): boolean {
  return getToken(clientId, service) !== null;
}
