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
  /**
   * Display name used in owner/customer-facing copy (e.g. review-flywheel WhatsApp
   * templates). Already present as hand-maintained data in several client.json files
   * (e.g. data/clients/aasada/client.json) but was untyped here until now -- added
   * alongside reviewLink/reviewFlywheelEnabled since buildReviewRequestOwnerNotification
   * requires it. See handoff/completed/2026-08-22_007_nextjs-engineer_review-flywheel-trigger-wiring.md.
   */
  brandName?: string;
  /**
   * Review-generation flywheel (handoff/completed/2026-08-22_007_*.md) -- both fields are
   * manually entered per client, optional, and default to disabled/undefined. No client
   * should receive the review-request nudge unannounced.
   */
  reviewLink?: string;
  reviewFlywheelEnabled?: boolean;
  /**
   * GBP review-polling sensor (handoff/pending/2026-08-23_002_*.md) -- manually entered per
   * client, optional, same posture as reviewLink. Required by pollClientReviews() to know
   * which GBP account/location to poll; absent for clients not yet wired to the reputation
   * loop's read side.
   */
  gbpAccountId?: string;
  gbpLocationId?: string;
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
