import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keyLength: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;
const VERSION = 'scrypt-v1';
const N = 16_384;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;

export function validateClientPinPolicy(pin: string): boolean {
  if (!/^\d{6,12}$/.test(pin)) return false;
  if (/^(\d)\1+$/.test(pin)) return false;
  let ascending = true;
  let descending = true;
  for (let index = 1; index < pin.length; index += 1) {
    const difference = Number(pin[index]) - Number(pin[index - 1]);
    ascending &&= difference === 1;
    descending &&= difference === -1;
  }
  return !ascending && !descending;
}

export async function hashClientPin(pin: string): Promise<string> {
  if (!validateClientPinPolicy(pin)) throw new Error('invalid_client_pin');
  const salt = randomBytes(16);
  const derived = await scrypt(pin, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: 32 * 1024 * 1024 }) as Buffer;
  return [VERSION, N, R, P, salt.toString('base64url'), derived.toString('base64url')].join('$');
}

export async function verifyClientPin(pin: string, encodedHash: string): Promise<boolean> {
  try {
    const parts = encodedHash.split('$');
    if (parts.length !== 6 || parts[0] !== VERSION) return false;
    const [, nRaw, rRaw, pRaw] = parts;
    const n = Number(nRaw);
    const r = Number(rRaw);
    const p = Number(pRaw);
    if (n !== N || r !== R || p !== P) return false;
    const salt = Buffer.from(parts[4], 'base64url');
    const expected = Buffer.from(parts[5], 'base64url');
    if (salt.length !== 16 || expected.length !== KEY_LENGTH) return false;
    const derived = await scrypt(pin, salt, KEY_LENGTH, { N: n, r, p, maxmem: 32 * 1024 * 1024 }) as Buffer;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
