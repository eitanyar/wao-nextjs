/**
 * The ONLY Google-facing surface of the Ads Bot ownership poll (mission item 4, Decision D2). Everything Google-shaped
 * is normalised here into plain values, so ownership.ts and its tests never see a proto.
 *
 *   OwnershipClient                the interface the poll uses (fake in tests)
 *   createGoogleOwnershipClient()  the real implementation (google-ads-api 24.1.0, via mutations.ts's client wrapper)
 *   normalise*()                   pure mappers from Google enums (number or name) to our values; unit-tested
 *
 * UNPROVEN LIVE (no test manager account / refresh token yet, P4): every GAQL query and the identity-verification call
 * below are written against the google-ads-api 24.1.0 / google-ads-node type definitions only. The field names and
 * enum values were read from node_modules/google-ads-node/build/protos/protos.d.ts; the queries were never run.
 * Zero Hebrew in this module.
 */

export type InvitationState = 'PENDING' | 'DECLINED' | 'EXPIRED' | 'UNKNOWN';
export type BillingSetupState = 'PENDING' | 'APPROVED_HELD' | 'APPROVED' | 'CANCELLED' | 'UNKNOWN';
export type VerificationProgramState = 'PENDING_USER_ACTION' | 'PENDING_REVIEW' | 'SUCCESS' | 'FAILURE' | 'UNKNOWN';
export type AccessRoleName = 'ADMIN' | 'STANDARD' | 'READ_ONLY' | 'EMAIL_ONLY' | 'UNKNOWN';

export interface OwnershipClient {
  /** Open user invitations on the client account (customer_user_access_invitation). */
  listInvitations(customerId: string): Promise<Array<{ email: string; role: AccessRoleName; status: InvitationState }>>;
  /** Users with access to the client account (customer_user_access). An accepted invitation shows up here. */
  listUserAccess(customerId: string): Promise<Array<{ email: string; role: AccessRoleName }>>;
  /** Billing setups on the client account (billing_setup). */
  listBillingSetups(customerId: string): Promise<Array<{ status: BillingSetupState }>>;
  /** IdentityVerificationService.GetIdentityVerification. An empty list = no mandatory verification. */
  getIdentityVerification(customerId: string): Promise<Array<{ status: VerificationProgramState }>>;
  /** The first day (YYYY-MM-DD, account time zone) with impressions > 0 in [sinceDay, untilDay], or null. */
  firstImpressionDay(customerId: string, sinceDay: string, untilDay: string): Promise<string | null>;
}

// ── normalisers (Google enums arrive as numbers from the API, or as names) ─────────────────────────────────────────

const INVITATION: Record<number, InvitationState> = { 2: 'PENDING', 3: 'DECLINED', 4: 'EXPIRED' };
const BILLING: Record<number, BillingSetupState> = { 2: 'PENDING', 3: 'APPROVED_HELD', 4: 'APPROVED', 5: 'CANCELLED' };
const PROGRAM: Record<number, VerificationProgramState> = { 2: 'PENDING_USER_ACTION', 3: 'PENDING_REVIEW', 4: 'SUCCESS', 5: 'FAILURE' };
const ROLE: Record<number, AccessRoleName> = { 2: 'ADMIN', 3: 'STANDARD', 4: 'READ_ONLY', 5: 'EMAIL_ONLY' };

function normalise<T extends string>(value: unknown, byNumber: Record<number, T>, fallback: T): T {
  if (typeof value === 'number') return byNumber[value] ?? fallback;
  if (typeof value === 'string') return (Object.values(byNumber) as string[]).includes(value) ? (value as T) : fallback;
  return fallback;
}

export const normaliseInvitationStatus = (value: unknown): InvitationState => normalise(value, INVITATION, 'UNKNOWN');
export const normaliseBillingSetupStatus = (value: unknown): BillingSetupState => normalise(value, BILLING, 'UNKNOWN');
export const normaliseVerificationStatus = (value: unknown): VerificationProgramState => normalise(value, PROGRAM, 'UNKNOWN');
export const normaliseAccessRole = (value: unknown): AccessRoleName => normalise(value, ROLE, 'UNKNOWN');

const DAY = /^\d{4}-\d{2}-\d{2}$/;

// ── real implementation ────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Real Google Ads reads through the repo's client wrapper (mutations.ts resolveCustomerById: WAO MCC login, refresh
 * token from env). Read-only: no mutate call exists in this object. google-ads-api is loaded lazily so importing this
 * module (and the fake path in tests) never pulls it in.
 */
export function createGoogleOwnershipClient(mode: 'test' | 'live'): OwnershipClient {
  const customerFor = async (customerId: string) => {
    if (!/^\d{6,12}$/.test(customerId)) throw new Error('invalid customer id');
    const { resolveCustomerById } = await import('./mutations');
    return resolveCustomerById(customerId, mode);
  };
  type Row = Record<string, Record<string, unknown> | undefined>;
  const query = async (customerId: string, gaql: string): Promise<Row[]> => (await (await customerFor(customerId)).query(gaql)) as Row[];

  return {
    async listInvitations(customerId) {
      const rows = await query(customerId,
        'SELECT customer_user_access_invitation.email_address, customer_user_access_invitation.access_role, customer_user_access_invitation.invitation_status FROM customer_user_access_invitation');
      return rows.map(row => ({
        email: String(row.customer_user_access_invitation?.email_address ?? ''),
        role: normaliseAccessRole(row.customer_user_access_invitation?.access_role),
        status: normaliseInvitationStatus(row.customer_user_access_invitation?.invitation_status),
      }));
    },
    async listUserAccess(customerId) {
      const rows = await query(customerId, 'SELECT customer_user_access.email_address, customer_user_access.access_role FROM customer_user_access');
      return rows.map(row => ({
        email: String(row.customer_user_access?.email_address ?? ''),
        role: normaliseAccessRole(row.customer_user_access?.access_role),
      }));
    },
    async listBillingSetups(customerId) {
      const rows = await query(customerId, 'SELECT billing_setup.status FROM billing_setup');
      return rows.map(row => ({ status: normaliseBillingSetupStatus(row.billing_setup?.status) }));
    },
    async getIdentityVerification(customerId) {
      const customer = await customerFor(customerId);
      const response = await customer.identityVerifications.getIdentityVerification({ customer_id: customerId } as never);
      const list = (response as { identity_verification?: Array<{ verification_progress?: { program_status?: unknown } }> | null }).identity_verification ?? [];
      return list.map(item => ({ status: normaliseVerificationStatus(item.verification_progress?.program_status) }));
    },
    async firstImpressionDay(customerId, sinceDay, untilDay) {
      if (!DAY.test(sinceDay) || !DAY.test(untilDay)) throw new Error('invalid day');
      const rows = await query(customerId,
        `SELECT segments.date, metrics.impressions FROM customer WHERE segments.date BETWEEN '${sinceDay}' AND '${untilDay}' AND metrics.impressions > 0 ORDER BY segments.date ASC LIMIT 1`);
      const day = rows[0]?.segments?.date;
      return typeof day === 'string' && DAY.test(day) ? day : null;
    },
  };
}
