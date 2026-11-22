// Ads Bot ownership (mission 2026-11-22 item 4, Decision D2): ADMIN invite payload, account record, the poll (fake
// Google client), verification cache + fail-closed, first impression once, day-14 warning. Temp WAO_CLIENTS_DIR only;
// no Google call. HEBREW-SAFETY: zero Hebrew bytes in this file.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

const clientsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-ownership-clients-'));
process.env.WAO_CLIENTS_DIR = clientsRoot;

import { enums } from 'google-ads-api';
import { loadLiveReadinessRecord, updateLiveReadinessRecord } from './live-readiness-store';
import {
  OWNERSHIP_WARNING_DAYS,
  buildCreateCustomerClientRequest,
  listOwnershipClientIds,
  loadOwnershipRecord,
  ownershipWarning,
  pollClientOwnership,
  recordAccountCreation,
  resolveClientInviteEmail,
  verificationFromPrograms,
} from './ownership';
import {
  normaliseAccessRole,
  normaliseBillingSetupStatus,
  normaliseInvitationStatus,
  normaliseVerificationStatus,
  type OwnershipClient,
} from './ownership-client';

test.after(() => fs.rmSync(clientsRoot, { recursive: true, force: true }));

const CREATED = new Date('2026-11-29T08:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const at = (ms: number) => new Date(CREATED.getTime() + ms);

type Calls = Record<keyof OwnershipClient, number>;
function fakeGoogle(state: {
  access?: Array<{ email: string; role: 'ADMIN' | 'STANDARD' }> | Error;
  invites?: Array<{ email: string; role: 'ADMIN'; status: 'PENDING' | 'DECLINED' | 'EXPIRED' }>;
  billing?: Array<{ status: 'PENDING' | 'APPROVED_HELD' | 'APPROVED' | 'CANCELLED' }> | Error;
  verification?: Array<{ status: 'PENDING_USER_ACTION' | 'PENDING_REVIEW' | 'SUCCESS' | 'FAILURE' | 'UNKNOWN' }> | Error;
  firstDay?: string | null | Error;
}): { client: OwnershipClient; calls: Calls; set: (next: typeof state) => void } {
  const calls: Calls = { listInvitations: 0, listUserAccess: 0, listBillingSetups: 0, getIdentityVerification: 0, firstImpressionDay: 0 };
  const value = <T,>(v: T | Error | undefined, fallback: T): T => { if (v instanceof Error) throw v; return v ?? fallback; };
  const client: OwnershipClient = {
    listUserAccess: async () => { calls.listUserAccess++; return value(state.access, []); },
    listInvitations: async () => { calls.listInvitations++; return value(state.invites, []); },
    listBillingSetups: async () => { calls.listBillingSetups++; return value(state.billing, []); },
    getIdentityVerification: async () => { calls.getIdentityVerification++; return value(state.verification, []); },
    firstImpressionDay: async () => { calls.firstImpressionDay++; return value(state.firstDay, null); },
  };
  return { client, calls, set: next => Object.assign(state, next) };
}

function newAccount(clientId: string, email = `${clientId}@example.com`) {
  assert.equal(recordAccountCreation({ clientId, customerId: '1234567890', mode: 'live', email, invitationLink: 'https://ads.google.com/invite/x', now: CREATED }), true);
}

// ── account creation ────────────────────────────────────────────────────────────────────────────────────────────────

test('invite payload: the new account plus the client email with access_role ADMIN', () => {
  assert.equal(enums.AccessRole.ADMIN, 2, 'google-ads-api 24.1.0: AccessRole.ADMIN');
  assert.deepEqual(buildCreateCustomerClientRequest({ mccId: '9998887777', businessName: 'Dana Plumbing', email: 'dana@example.com', adminRole: enums.AccessRole.ADMIN }), {
    customer_id: '9998887777',
    customer_client: { descriptive_name: 'Dana Plumbing', currency_code: 'ILS', time_zone: 'Asia/Jerusalem' },
    email_address: 'dana@example.com',
    access_role: 2,
  });
});

test('invite email: explicit admin field, then the owner email, then the business email; invalid = none', () => {
  assert.equal(resolveClientInviteEmail(' admin@example.com ', { ownerContact: { email: 'owner@example.com' }, email: 'biz@example.com' }), 'admin@example.com');
  assert.equal(resolveClientInviteEmail(undefined, { ownerContact: { email: 'owner@example.com' }, email: 'biz@example.com' }), 'owner@example.com');
  assert.equal(resolveClientInviteEmail('', { email: 'biz@example.com' }), 'biz@example.com');
  assert.equal(resolveClientInviteEmail('not-an-email', { ownerContact: { email: 'nope' }, email: '' }), null);
  assert.equal(resolveClientInviteEmail(null, undefined), null);
});

test('recordAccountCreation stores the account + invitation and sets accountCreatedWithClientAdmin (source create-campaign)', () => {
  newAccount('own-a');
  const ownership = loadOwnershipRecord('own-a')!;
  assert.deepEqual(ownership, {
    clientId: 'own-a', customerId: '1234567890', mode: 'live', invitedEmail: 'own-a@example.com', accessRole: 'ADMIN',
    invitationLink: 'https://ads.google.com/invite/x', accountCreatedAt: CREATED.toISOString(),
  });
  assert.ok(fs.existsSync(path.join(clientsRoot, 'own-a', 'google-ads', 'ownership.json')));
  assert.equal(loadLiveReadinessRecord('own-a')!.accountCreatedWithClientAdmin, true);
  const audit = fs.readFileSync(path.join(clientsRoot, 'own-a', 'live-readiness.audit.jsonl'), 'utf8');
  assert.match(audit, /"source":"create-campaign"/);
  assert.equal(recordAccountCreation({ clientId: '../x', customerId: '1', mode: 'live', email: 'a@b.co' }), false);
  assert.ok(listOwnershipClientIds().includes('own-a'));
});

// ── poll ────────────────────────────────────────────────────────────────────────────────────────────────────────────

test('poll: each polled key comes from the fake Google responses; nothing else is written', async () => {
  newAccount('own-b');
  updateLiveReadinessRecord('own-b', { feePaid: true }, { source: 'test' });
  const g = fakeGoogle({
    access: [{ email: 'someone@else.com', role: 'ADMIN' }],
    invites: [{ email: 'OWN-B@example.com', role: 'ADMIN', status: 'PENDING' }],
    billing: [{ status: 'PENDING' }],
    verification: [{ status: 'PENDING_USER_ACTION' }],
  });
  const first = await pollClientOwnership('own-b', { client: g.client, now: at(HOUR) });
  assert.ok(first.ok);
  if (!first.ok) return;
  assert.deepEqual(first.patch, { clientAdminInviteAccepted: false, billingApproved: false, verificationStatus: 'pending' });
  assert.equal(first.ownership.inviteStatus, 'PENDING');
  let record = loadLiveReadinessRecord('own-b')!;
  assert.equal(record.clientAdminInviteAccepted, false);
  assert.equal(record.billingApproved, false);
  assert.equal(record.verificationStatus, 'pending');
  assert.equal(record.feePaid, true, 'a system key is untouched by the poll');
  assert.equal(record.approvalContactConfirmed, undefined, 'the admin key is untouched by the poll');

  g.set({ access: [{ email: 'Own-B@Example.com', role: 'ADMIN' }], billing: [{ status: 'APPROVED_HELD' }, { status: 'APPROVED' }], verification: [{ status: 'SUCCESS' }] });
  const second = await pollClientOwnership('own-b', { client: g.client, now: at(8 * HOUR) });
  assert.ok(second.ok);
  record = loadLiveReadinessRecord('own-b')!;
  assert.equal(record.clientAdminInviteAccepted, true);
  assert.equal(record.billingApproved, true);
  assert.equal(record.verificationStatus, 'verified');
  assert.equal(loadOwnershipRecord('own-b')!.inviteStatus, 'ACCEPTED');
  assert.equal(loadOwnershipRecord('own-b')!.lastPolledAt, at(8 * HOUR).toISOString());
  const sources = fs.readFileSync(path.join(clientsRoot, 'own-b', 'live-readiness.audit.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line).source);
  assert.deepEqual(sources, ['create-campaign', 'test', 'ownership-poll', 'ownership-poll']);
  assert.equal((await pollClientOwnership('no-such-client', { client: g.client })).ok, false);
});

test('poll: billing needs APPROVED (APPROVED_HELD / PENDING / none are not approved)', async () => {
  newAccount('own-c');
  for (const [billing, expected] of [[[], false], [[{ status: 'APPROVED_HELD' }], false], [[{ status: 'CANCELLED' }, { status: 'APPROVED' }], true]] as const) {
    const g = fakeGoogle({ billing: [...billing] });
    await pollClientOwnership('own-c', { client: g.client, now: at(HOUR) });
    assert.equal(loadLiveReadinessRecord('own-c')!.billingApproved, expected, JSON.stringify(billing));
  }
});

test('poll: verification mapping; an error fails closed to unknown; an invite/billing error leaves that key as it was', async () => {
  assert.equal(verificationFromPrograms([]), 'not-required');
  assert.equal(verificationFromPrograms([{ status: 'SUCCESS' }, { status: 'SUCCESS' }]), 'verified');
  assert.equal(verificationFromPrograms([{ status: 'SUCCESS' }, { status: 'PENDING_REVIEW' }]), 'pending');
  assert.equal(verificationFromPrograms([{ status: 'SUCCESS' }, { status: 'FAILURE' }]), 'failed');
  assert.equal(verificationFromPrograms([{ status: 'UNKNOWN' }]), 'unknown');

  newAccount('own-d');
  const ok = fakeGoogle({ access: [{ email: 'own-d@example.com', role: 'ADMIN' }], billing: [{ status: 'APPROVED' }], verification: [] });
  await pollClientOwnership('own-d', { client: ok.client, now: at(HOUR) });
  assert.equal(loadLiveReadinessRecord('own-d')!.verificationStatus, 'not-required', 'empty response = no mandatory verification');

  const broken = fakeGoogle({ access: new Error('quota'), billing: new Error('permission denied'), verification: new Error('rpc failed') });
  const result = await pollClientOwnership('own-d', { client: broken.client, now: at(8 * HOUR) });
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.deepEqual(Object.keys(result.errors).sort(), ['billing', 'invite', 'verification']);
  const record = loadLiveReadinessRecord('own-d')!;
  assert.equal(record.verificationStatus, 'unknown', 'fails closed');
  assert.equal(record.clientAdminInviteAccepted, true, 'kept');
  assert.equal(record.billingApproved, true, 'kept');
  assert.match(loadOwnershipRecord('own-d')!.lastPollErrors!.billing, /permission denied/);
});

test('poll: verification is cached 6h and rate-limited to 1/min even when forced', async () => {
  newAccount('own-e');
  const g = fakeGoogle({ verification: [{ status: 'PENDING_REVIEW' }] });
  await pollClientOwnership('own-e', { client: g.client, now: at(0) });
  await pollClientOwnership('own-e', { client: g.client, now: at(5 * HOUR) });
  assert.equal(g.calls.getIdentityVerification, 1, 'cached');
  assert.equal(loadLiveReadinessRecord('own-e')!.verificationStatus, 'pending', 'the cached value is still written');
  await pollClientOwnership('own-e', { client: g.client, now: at(5 * HOUR), forceVerification: true });
  assert.equal(g.calls.getIdentityVerification, 2, 'forced');
  await pollClientOwnership('own-e', { client: g.client, now: at(5 * HOUR + 30 * 1000), forceVerification: true });
  assert.equal(g.calls.getIdentityVerification, 2, 'a forced poll within a minute re-uses the result');
  await pollClientOwnership('own-e', { client: g.client, now: at(12 * HOUR) });
  assert.equal(g.calls.getIdentityVerification, 3, 'expired cache');
});

test('poll: the first impression is recorded once and never overwritten', async () => {
  newAccount('own-f');
  const g = fakeGoogle({ firstDay: null });
  await pollClientOwnership('own-f', { client: g.client, now: at(HOUR) });
  assert.equal(loadOwnershipRecord('own-f')!.firstImpressionAt, undefined);
  g.set({ firstDay: '2026-12-02' });
  await pollClientOwnership('own-f', { client: g.client, now: at(4 * 24 * HOUR) });
  assert.equal(loadOwnershipRecord('own-f')!.firstImpressionAt, '2026-12-02');
  g.set({ firstDay: '2026-12-09' });
  await pollClientOwnership('own-f', { client: g.client, now: at(12 * 24 * HOUR) });
  assert.equal(loadOwnershipRecord('own-f')!.firstImpressionAt, '2026-12-02');
  assert.equal(g.calls.firstImpressionDay, 2, 'not even queried once recorded');
});

// ── warning + normalisers ───────────────────────────────────────────────────────────────────────────────────────────

test('day-14 warning: from the earlier of account creation / fee paid, only while a Google check is open', () => {
  const allOpen = { clientAdminInviteAccepted: false, billingApproved: false, verificationStatus: 'pending' };
  const allDone = { clientAdminInviteAccepted: true, billingApproved: true, verificationStatus: 'not-required' };
  const created = '2026-11-29T08:00:00.000Z';
  assert.deepEqual(ownershipWarning({ now: new Date('2026-12-12T08:00:00.000Z'), accountCreatedAt: created, record: allOpen }),
    { days: 13, openChecks: ['invite', 'billing', 'verification'], warn: false });
  assert.equal(ownershipWarning({ now: new Date('2026-12-13T08:00:00.000Z'), accountCreatedAt: created, record: allOpen }).warn, true);
  assert.equal(OWNERSHIP_WARNING_DAYS, 14);
  assert.deepEqual(ownershipWarning({ now: new Date('2026-12-20T08:00:00.000Z'), accountCreatedAt: created, record: allDone }), { days: 21, openChecks: [], warn: false });
  assert.deepEqual(ownershipWarning({ now: new Date('2026-12-20T08:00:00.000Z'), accountCreatedAt: created, record: { ...allDone, verificationStatus: 'unknown' } }).openChecks, ['verification']);
  assert.equal(ownershipWarning({ now: new Date('2026-12-05T08:00:00.000Z'), feePaidAt: '2026-11-20T08:00:00.000Z', accountCreatedAt: created, record: allOpen }).days, 15, 'fee paid earlier counts');
  assert.deepEqual(ownershipWarning({ now: new Date(), record: null }), { days: null, openChecks: ['invite', 'billing', 'verification'], warn: false });
});

test('normalisers map Google enum numbers and names; anything else is UNKNOWN', () => {
  assert.equal(normaliseInvitationStatus(2), 'PENDING');
  assert.equal(normaliseInvitationStatus('EXPIRED'), 'EXPIRED');
  assert.equal(normaliseInvitationStatus(99), 'UNKNOWN');
  assert.equal(normaliseBillingSetupStatus(4), 'APPROVED');
  assert.equal(normaliseBillingSetupStatus(3), 'APPROVED_HELD');
  assert.equal(normaliseVerificationStatus(4), 'SUCCESS');
  assert.equal(normaliseVerificationStatus(5), 'FAILURE');
  assert.equal(normaliseVerificationStatus(null), 'UNKNOWN');
  assert.equal(normaliseAccessRole(2), 'ADMIN');
  assert.equal(normaliseAccessRole('READ_ONLY'), 'READ_ONLY');
  assert.equal(normaliseAccessRole('admin'), 'UNKNOWN');
  // The numbers above are the google-ads-api 24.1.0 enum values.
  assert.equal(enums.AccessInvitationStatus.PENDING, 2);
  assert.equal(enums.BillingSetupStatus.APPROVED, 4);
  assert.equal(enums.IdentityVerificationProgramStatus.SUCCESS, 4);
  assert.equal(enums.IdentityVerificationProgramStatus.FAILURE, 5);
});
