/**
 * Reads a client's live-readiness record (data/clients/{clientId}/live-readiness.json).
 * Model and completeness rules: ./live-readiness.js. Staff write through the admin action
 * (src/app/(product)/admin/live-readiness/action.ts); the system-set keys (feePaid, termsConsent)
 * are written by the Ads Bot billing flow through updateLiveReadinessRecord() below, same file,
 * same atomic write and same audit log. The poll job (mission item 4) will use it too.
 *
 * Fails closed: an invalid client id, a missing file or unparsable JSON returns null,
 * which the mutation gate treats as incomplete.
 */
import fs from 'fs';
import path from 'path';
import { clientsDir } from '../dataRoots';

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

export type SystemReadinessKey = 'feePaid' | 'termsConsent';

/**
 * Sets system-owned readiness keys for `clientId` and appends one audit line
 * (live-readiness.audit.jsonl, same format as the admin action). Atomic write (temp file + rename).
 * Creates the client directory when missing (pilot clients are provisioned by hand). Returns false on
 * an invalid client id; throws on an I/O failure so the caller can decide.
 */
export function updateLiveReadinessRecord(
  clientId: string,
  patch: Partial<Pick<LiveReadinessRecord, SystemReadinessKey>>,
  options: { source: string; now?: Date },
): boolean {
  if (!clientId || !CLIENT_ID_PATTERN.test(clientId)) return false;
  const clientDir = path.join(clientsDir(), clientId);
  fs.mkdirSync(clientDir, { recursive: true });
  const recordPath = path.join(clientDir, 'live-readiness.json');
  const existing = (loadLiveReadinessRecord(clientId) ?? {}) as Record<string, unknown>;
  const next: Record<string, unknown> = { ...existing };
  const changes: Array<{ key: string; from: unknown; to: unknown }> = [];
  for (const [key, value] of Object.entries(patch)) {
    const before = existing[key] ?? null;
    const after = value ?? null;
    if (JSON.stringify(before) !== JSON.stringify(after)) changes.push({ key, from: before, to: after });
    next[key] = after;
  }
  const tmpPath = path.join(clientDir, `.live-readiness.json.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmpPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  fs.renameSync(tmpPath, recordPath);
  if (changes.length > 0) {
    fs.appendFileSync(
      path.join(clientDir, 'live-readiness.audit.jsonl'),
      `${JSON.stringify({ timestamp: (options.now ?? new Date()).toISOString(), source: options.source, clientId, changes })}\n`,
      'utf8',
    );
  }
  return true;
}
