/**
 * Reads a client's live-readiness record (data/clients/{clientId}/live-readiness.json).
 * Model and completeness rules: ./live-readiness.js. Writes happen only through the
 * admin action (src/app/(product)/admin/live-readiness/action.ts) for now; the poll job
 * (mission item 4) and checkout will write the polled/system keys later.
 *
 * Fails closed: an invalid client id, a missing file or unparsable JSON returns null,
 * which the mutation gate treats as incomplete.
 */
import fs from 'fs';
import path from 'path';
import { clientsDir } from '@/lib/dataRoots';

export type VerificationStatus = 'unknown' | 'pending' | 'failed' | 'not-required' | 'verified';

export interface TermsConsentRecord {
  termsVersion: string;
  /** ISO timestamp of the consent. */
  consentedAt: string;
}

export interface LiveReadinessRecord {
  accountCreatedWithClientAdmin?: boolean;
  clientAdminInviteAccepted?: boolean;
  billingApproved?: boolean;
  verificationStatus?: VerificationStatus;
  feePaid?: boolean;
  termsConsent?: TermsConsentRecord | null;
  approvalContactConfirmed?: boolean;
}

const CLIENT_ID_PATTERN = /^[a-z0-9-]+$/i;

export function loadLiveReadinessRecord(clientId: string | null | undefined): LiveReadinessRecord | null {
  if (!clientId || !CLIENT_ID_PATTERN.test(clientId)) return null;
  const recordPath = path.join(clientsDir(), clientId, 'live-readiness.json');
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as LiveReadinessRecord) : null;
  } catch {
    return null;
  }
}
