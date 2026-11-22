/**
 * Ads Bot account ownership (mission 2026-11-22 item 4, Decision D2): WAO creates the client's Google Ads account under
 * its MCC and invites the CLIENT as ADMIN; this module records that and polls Google for what follows.
 *
 *   data/clients/{clientId}/google-ads/ownership.json   the account + invitation + poll state (this module)
 *   data/clients/{clientId}/live-readiness.json          the gate keys, written ONLY via live-readiness-store.ts
 *
 * Polled readiness keys: clientAdminInviteAccepted, billingApproved, verificationStatus. accountCreatedWithClientAdmin
 * is set once by create-campaign (recordAccountCreation). firstImpressionAt (the 30-day money-back clock) is recorded
 * ONCE in ownership.json and never overwritten. Google is reached only through ownership-client.ts.
 * Zero Hebrew in this module.
 */
import fs from 'fs';
import path from 'path';
import { clientsDir } from '../dataRoots';
import { israelDate } from '../site-bot/offlineDate';
import { updateLiveReadinessRecord, type VerificationStatus } from './live-readiness-store';
import { createGoogleOwnershipClient, type InvitationState, type OwnershipClient } from './ownership-client';

const CLIENT_ID = /^[a-z0-9-]+$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Identity verification is cached this long between polls (the cron runs far more often than this changes). */
export const VERIFICATION_CACHE_MS = 6 * 60 * 60 * 1000;
/** Even a forced "Poll now" re-uses a verification result younger than this (rate limit). */
export const VERIFICATION_MIN_INTERVAL_MS = 60 * 1000;
/** Day-14 warning: Google's own checks still open this many days after account creation / fee paid. */
export const OWNERSHIP_WARNING_DAYS = 14;

export interface OwnershipRecord {
  clientId: string;
  customerId: string;
  mode: 'test' | 'live';
  invitedEmail: string;
  accessRole: 'ADMIN';
  /** CreateCustomerClientResponse.invitation_link, when Google returns one. */
  invitationLink: string | null;
  accountCreatedAt: string;
  lastPolledAt?: string;
  /** Per-check error message of the last poll; empty when everything answered. */
  lastPollErrors?: Record<string, string>;
  /** Status of the open invitation for invitedEmail at the last poll ('ACCEPTED' once the user has access). */
  inviteStatus?: InvitationState | 'ACCEPTED' | 'NOT_FOUND';
  verification?: { status: VerificationStatus; checkedAt: string };
  /** First day with impressions > 0 (YYYY-MM-DD). Recorded once, never overwritten. */
  firstImpressionAt?: string;
}

// ── store ──────────────────────────────────────────────────────────────────────────────────────────────────────────

function ownershipPath(clientId: string): string {
  return path.join(clientsDir(), clientId, 'google-ads', 'ownership.json');
}

export function loadOwnershipRecord(clientId: string): OwnershipRecord | null {
  if (!CLIENT_ID.test(clientId ?? '')) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(ownershipPath(clientId), 'utf8')) as OwnershipRecord;
    return parsed && typeof parsed === 'object' && typeof parsed.customerId === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function saveOwnershipRecord(record: OwnershipRecord): void {
  const file = ownershipPath(record.clientId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = path.join(path.dirname(file), `.ownership.json.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmp, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, file);
}

/** Client ids that have an ownership record (the cron's work list). */
export function listOwnershipClientIds(): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(clientsDir(), { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter(entry => entry.isDirectory() && CLIENT_ID.test(entry.name) && fs.existsSync(ownershipPath(entry.name)))
    .map(entry => entry.name)
    .sort();
}

// ── account creation (create-campaign) ─────────────────────────────────────────────────────────────────────────────

/**
 * The email the ADMIN invitation goes to: an explicit admin-provided `clientEmail` in the create-campaign body first,
 * then the owner's own email from intake, then the business email. Null when none is a valid address.
 */
export function resolveClientInviteEmail(explicit: unknown, collected: { ownerContact?: { email?: string } | null; email?: string } | null | undefined): string | null {
  for (const candidate of [explicit, collected?.ownerContact?.email, collected?.email]) {
    if (typeof candidate === 'string' && EMAIL.test(candidate.trim())) return candidate.trim();
  }
  return null;
}

/**
 * The CreateCustomerClientRequest body: the new account plus the client invited as ADMIN
 * (CreateCustomerClientRequest.email_address / access_role, google-ads-node 24.1.0 protos.d.ts).
 * `adminRole` is enums.AccessRole.ADMIN (2), passed in so this stays free of google-ads-api.
 */
export function buildCreateCustomerClientRequest(params: { mccId: string; businessName: string; email: string; adminRole: number }) {
  return {
    customer_id: params.mccId,
    customer_client: {
      descriptive_name: params.businessName,
      currency_code: 'ILS',
      time_zone: 'Asia/Jerusalem',
    },
    email_address: params.email,
    access_role: params.adminRole,
  };
}

/** Records the new account + invitation and sets readiness accountCreatedWithClientAdmin (system-set, once). */
export function recordAccountCreation(params: {
  clientId: string;
  customerId: string;
  mode: 'test' | 'live';
  email: string;
  invitationLink?: string | null;
  now?: Date;
}): boolean {
  if (!CLIENT_ID.test(params.clientId) || !/^\d+$/.test(params.customerId)) return false;
  const now = params.now ?? new Date();
  saveOwnershipRecord({
    clientId: params.clientId,
    customerId: params.customerId,
    mode: params.mode,
    invitedEmail: params.email,
    accessRole: 'ADMIN',
    invitationLink: params.invitationLink ?? null,
    accountCreatedAt: now.toISOString(),
  });
  return updateLiveReadinessRecord(params.clientId, { accountCreatedWithClientAdmin: true }, { source: 'create-campaign', now });
}

// ── poll ───────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Identity verification -> our readiness value. Empty = no mandatory verification. Every program must be SUCCESS to
 * count as verified; any FAILURE wins; any pending state is pending; anything else is unknown (fails closed).
 */
export function verificationFromPrograms(programs: Array<{ status: string }>): VerificationStatus {
  if (programs.length === 0) return 'not-required';
  if (programs.some(p => p.status === 'FAILURE')) return 'failed';
  if (programs.every(p => p.status === 'SUCCESS')) return 'verified';
  if (programs.some(p => p.status === 'PENDING_USER_ACTION' || p.status === 'PENDING_REVIEW')) return 'pending';
  return 'unknown';
}

export interface PolledPatch {
  clientAdminInviteAccepted?: boolean;
  billingApproved?: boolean;
  verificationStatus?: VerificationStatus;
}

export type PollResult =
  | { ok: true; patch: PolledPatch; ownership: OwnershipRecord; errors: Record<string, string> }
  | { ok: false; error: 'invalid_client' | 'no_account' };

const message = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 300);

/**
 * Reads the client's account state from Google and writes the polled readiness keys (source 'ownership-poll').
 * A failed invite or billing read leaves that key as it was (and records the error); a failed verification read
 * fails closed to 'unknown'. Never writes approvalContactConfirmed, feePaid or termsConsent.
 */
export async function pollClientOwnership(
  clientId: string,
  options: { client?: OwnershipClient; now?: Date; forceVerification?: boolean } = {},
): Promise<PollResult> {
  if (!CLIENT_ID.test(clientId ?? '')) return { ok: false, error: 'invalid_client' };
  const ownership = loadOwnershipRecord(clientId);
  if (!ownership) return { ok: false, error: 'no_account' };
  const now = options.now ?? new Date();
  const google = options.client ?? createGoogleOwnershipClient(ownership.mode);
  const customerId = ownership.customerId;
  const email = ownership.invitedEmail.toLowerCase();
  const errors: Record<string, string> = {};
  const patch: PolledPatch = {};
  const next: OwnershipRecord = { ...ownership };

  // Invite: accepted = the invited email has ADMIN access on the account.
  try {
    const access = await google.listUserAccess(customerId);
    const accepted = access.some(user => user.email.toLowerCase() === email && user.role === 'ADMIN');
    patch.clientAdminInviteAccepted = accepted;
    if (accepted) {
      next.inviteStatus = 'ACCEPTED';
    } else {
      const invites = await google.listInvitations(customerId);
      next.inviteStatus = invites.find(invite => invite.email.toLowerCase() === email)?.status ?? 'NOT_FOUND';
    }
  } catch (err) {
    errors.invite = message(err);
  }

  // Billing: the client added his own payment method and Google approved it. This is also the FALLBACK signal for
  // payments-profile verification: whether GetIdentityVerification reflects payments-profile checks is unproven, and a
  // payments profile that fails its checks does not reach an APPROVED billing setup (mission Decision D2).
  try {
    const setups = await google.listBillingSetups(customerId);
    patch.billingApproved = setups.some(setup => setup.status === 'APPROVED');
  } catch (err) {
    errors.billing = message(err);
  }

  // Verification: cached (VERIFICATION_CACHE_MS) and rate-limited (VERIFICATION_MIN_INTERVAL_MS even when forced).
  const cached = ownership.verification;
  const age = cached ? now.getTime() - Date.parse(cached.checkedAt) : Number.POSITIVE_INFINITY;
  const fresh = age < (options.forceVerification ? VERIFICATION_MIN_INTERVAL_MS : VERIFICATION_CACHE_MS);
  if (cached && fresh) {
    patch.verificationStatus = cached.status;
  } else {
    let status: VerificationStatus;
    try {
      status = verificationFromPrograms(await google.getIdentityVerification(customerId));
    } catch (err) {
      errors.verification = message(err);
      status = 'unknown';
    }
    patch.verificationStatus = status;
    next.verification = { status, checkedAt: now.toISOString() };
  }

  // First impression: recorded once.
  if (!ownership.firstImpressionAt) {
    try {
      const day = await google.firstImpressionDay(customerId, israelDate(ownership.accountCreatedAt), israelDate(now));
      if (day) next.firstImpressionAt = day;
    } catch (err) {
      errors.firstImpression = message(err);
    }
  }

  next.lastPolledAt = now.toISOString();
  next.lastPollErrors = errors;
  saveOwnershipRecord(next);
  updateLiveReadinessRecord(clientId, patch, { source: 'ownership-poll', now });
  return { ok: true, patch, ownership: next, errors };
}

// ── day-14 warning ─────────────────────────────────────────────────────────────────────────────────────────────────

export interface OwnershipWarning {
  /** Whole days since the earlier of account creation and fee paid; null when neither happened. */
  days: number | null;
  /** Google-side checks still open (invite / billing / verification). */
  openChecks: Array<'invite' | 'billing' | 'verification'>;
  warn: boolean;
}

export function ownershipWarning(params: {
  now: Date;
  accountCreatedAt?: string | null;
  feePaidAt?: string | null;
  record: { clientAdminInviteAccepted?: boolean; billingApproved?: boolean; verificationStatus?: string } | null;
}): OwnershipWarning {
  const starts = [params.accountCreatedAt, params.feePaidAt].map(value => (value ? Date.parse(value) : NaN)).filter(Number.isFinite);
  const days = starts.length ? Math.floor((params.now.getTime() - Math.min(...starts)) / (24 * 60 * 60 * 1000)) : null;
  const record = params.record ?? {};
  const openChecks: OwnershipWarning['openChecks'] = [];
  if (record.clientAdminInviteAccepted !== true) openChecks.push('invite');
  if (record.billingApproved !== true) openChecks.push('billing');
  if (record.verificationStatus !== 'not-required' && record.verificationStatus !== 'verified') openChecks.push('verification');
  return { days, openChecks, warn: days !== null && days >= OWNERSHIP_WARNING_DAYS && openChecks.length > 0 };
}
