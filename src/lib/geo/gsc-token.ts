/**
 * Per-client Google Search Console OAuth token storage — the self-serve
 * counterpart to the single, WAO-wide `GSC_REFRESH_TOKEN` env var that
 * `scripts/gsc-pareto.mjs` still uses (see VISION.md line 247, the
 * previously-unchecked "Self-serve GSC OAuth" TODO).
 *
 * Stored at data/clients/{clientId}/gsc-token.json, refresh token encrypted
 * at rest with the same AES-256-GCM helper the payment engine uses for
 * provider tokens (`src/lib/payments/crypto.ts`, `TOKEN_ENCRYPTION_KEY`).
 *
 * NOTE: `scripts/gsc-pareto.mjs` is NOT wired to read from here yet — it's
 * out of scope for this task (explicitly not to touch the scan/audit
 * pipeline). Swapping it from the single env-var token to per-client tokens
 * from this store is a follow-up.
 */

import fs from 'fs';
import path from 'path';
import { encryptToken, decryptToken } from '@/lib/payments/crypto';

export interface GscTokenRecord {
  clientId: string;
  refreshToken: string; // encrypted at rest (see crypto.ts)
  scope: string;
  connectedAt: string;
  /** GSC properties ("sc-domain:x.co.il" / "https://x.co.il/") the connected Google account can read. */
  sites: string[];
}

function tokenFile(clientId: string): string {
  return path.join(process.cwd(), 'data', 'clients', clientId, 'gsc-token.json');
}

export function saveGscToken(params: {
  clientId: string;
  refreshTokenPlain: string;
  scope: string;
  sites: string[];
}): void {
  const { clientId, refreshTokenPlain, scope, sites } = params;
  const dir = path.join(process.cwd(), 'data', 'clients', clientId);
  fs.mkdirSync(dir, { recursive: true });
  const record: GscTokenRecord = {
    clientId,
    refreshToken: encryptToken(refreshTokenPlain),
    scope,
    connectedAt: new Date().toISOString(),
    sites,
  };
  fs.writeFileSync(tokenFile(clientId), JSON.stringify(record, null, 2), 'utf8');
}

export function getGscTokenRecord(clientId: string): GscTokenRecord | null {
  const fp = tokenFile(clientId);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8')) as GscTokenRecord;
}

export function isGscConnected(clientId: string): boolean {
  return fs.existsSync(tokenFile(clientId));
}

/** Decrypts and returns the stored refresh token — server-side use only. */
export function getDecryptedGscRefreshToken(clientId: string): string | null {
  const record = getGscTokenRecord(clientId);
  if (!record) return null;
  return decryptToken(record.refreshToken);
}
