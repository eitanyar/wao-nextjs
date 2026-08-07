/**
 * Shared client-record reader — generalized from the inline `loadClient`/`listClients`
 * helpers in `src/app/(app)/geo/dashboard/page.tsx` (left untouched there, zero risk).
 * Both bots read the same `data/clients/{clientId}/client.json` file; this is the
 * bot-agnostic subset of fields any per-client dashboard needs (contact/WhatsApp/site).
 * Bot-specific fields (wpConnected, platform, entitlements) stay in `src/lib/geo/client.ts`
 * for GEO and `src/lib/gmb/store.ts` for GMB — this module only owns the common read.
 */

import fs   from 'fs';
import path from 'path';

export interface SharedClientRecord {
  clientId:         string;
  siteUrl:          string;
  businessNiche?:   string;
  approvalContact?: string;
  approvalWhatsapp?: string;
  entitlements?:    string[];
}

const CLIENTS_DIR = path.join(process.cwd(), 'data', 'clients');

export function listClients(): string[] {
  if (!fs.existsSync(CLIENTS_DIR)) return [];
  return fs.readdirSync(CLIENTS_DIR).filter(d =>
    fs.statSync(path.join(CLIENTS_DIR, d)).isDirectory()
  );
}

export function loadClient(clientId: string): SharedClientRecord | null {
  const file = path.join(CLIENTS_DIR, clientId, 'client.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Clients entitled to GMB Bot (client.json `entitlements` array contains "gmb"). */
export function listGmbClients(): string[] {
  return listClients().filter(id => {
    const c = loadClient(id);
    return !!c?.entitlements?.includes('gmb');
  });
}
