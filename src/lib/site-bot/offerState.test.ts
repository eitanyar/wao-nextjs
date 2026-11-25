import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import type { AuditCandidateSnapshot, AuditRecord } from './auditStore';
import { openLaunchStore, recordPaidSignup, type LaunchStore } from './launchStore';
import {
  auditResultPath, claimInterviewStart, interviewSpotHeld, interviewStartDecision, PLACE_ID, profileCauseFor, resolveOffer,
  waitlistCategoryFor, type OfferDeps,
} from './offerState';
import { PLACE_ID as INTAKE_PLACE_ID } from './startIntake';

const auditId = '123e4567-e89b-42d3-a456-426614174000';
const candidate = (placeId: string, over: Partial<AuditCandidateSnapshot> = {}): AuditCandidateSnapshot => ({
  placeId, displayName: 'Synthetic Plumbing', formattedAddress: 'Synthetic Address', types: ['plumber'], primaryType: 'plumber',
  businessStatus: 'OPERATIONAL', hasRegularOpeningHours: true, hasSpecialOpeningHours: false, hasPhone: true, hasWebsite: false,
  photosFetched: true, photoCount: 3, hasRating: true, userRatingCount: 9, hasEditorialSummary: false, ...over,
});

function harness({ open = true, limits = { total: 10, weekly: 3 } as { total: number; weekly: number } | null, candidates = [] as AuditCandidateSnapshot[] } = {}) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'offer-state-')), 'launch.sqlite');
  const store = openLaunchStore(file, () => new Date('2026-12-01T10:00:00Z'));
  const calls: string[] = [];
  const deps: OfferDeps = {
    gateOpen: async () => { calls.push('gate'); return open; },
    withStore: <T>(fn: (s: LaunchStore) => T, fallback: T): T => { calls.push('store'); try { return fn(store); } catch { return fallback; } },
    limits: () => limits,
    readAudit: async (id: string): Promise<AuditRecord | null> => (id === auditId
      ? { auditId, query: { businessName: 'x' }, fetchedAt: '2026-12-01T00:00:00Z', expiresAt: '2027-01-01T00:00:00Z', candidates }
      : null),
  };
  return { deps, store, calls, close: () => store.db.close() };
}

test('the local PLACE_ID shape is the intake one', () => {
  assert.equal(PLACE_ID.source, INTAKE_PLACE_ID.source);
});

test('closed gate: an eligible business is pre-open and the cap store is never opened', async () => {
  const h = harness({ open: false });
  try {
    assert.equal(await resolveOffer(candidate('ChIJ-place-1'), h.deps), 'waitlist_preopen');
    assert.deepEqual(h.calls, ['gate']);
  } finally { h.close(); }
});

test('not-eligible offers are decided before the gate (no gate, no store access)', async () => {
  const h = harness();
  try {
    assert.equal(await resolveOffer(candidate('ChIJ-place-1', { hasWebsite: true }), h.deps), 'not_eligible_has_site');
    assert.equal(await resolveOffer(candidate('ChIJ-place-1', { primaryType: 'restaurant', types: ['restaurant'] }), h.deps), 'not_eligible_trade');
    assert.equal(await resolveOffer(candidate('ChIJ-place-1', { userRatingCount: 0 }), h.deps), 'not_eligible_profile');
    assert.deepEqual(h.calls, []);
  } finally { h.close(); }
});

test('profile block cause: only with not_eligible_profile; closed (incl. temporarily) wins over no ratings', async () => {
  const h = harness();
  try {
    const closed = candidate('ChIJ-place-1', { businessStatus: 'CLOSED_TEMPORARILY', userRatingCount: 0, hasRating: false });
    const noRatings = candidate('ChIJ-place-1', { userRatingCount: 0, hasRating: false });
    assert.equal(profileCauseFor(await resolveOffer(closed, h.deps), closed), 'closed');
    assert.equal(profileCauseFor(await resolveOffer(noRatings, h.deps), noRatings), 'no_ratings');
    // Any other offer carries no cause, even for a closed business (a website is checked first).
    const closedWithSite = candidate('ChIJ-place-1', { businessStatus: 'CLOSED_PERMANENTLY', hasWebsite: true });
    assert.equal(profileCauseFor(await resolveOffer(closedWithSite, h.deps), closedWithSite), undefined);
    assert.equal(profileCauseFor('waitlist_preopen', closed), undefined);
  } finally { h.close(); }
});

test('generic / missing primary types reach the waiting list, not the trade block (AC tech as "service")', async () => {
  const h = harness({ open: false });
  try {
    const ac = candidate('ChIJ-place-1', { primaryType: 'service', types: ['point_of_interest', 'service', 'establishment'] });
    assert.equal(await resolveOffer(ac, h.deps), 'waitlist_preopen');
    const noType = candidate('ChIJ-place-1', { primaryType: undefined, types: ['point_of_interest', 'establishment'] });
    assert.equal(await resolveOffer(noType, h.deps), 'waitlist_preopen');
    // The waiting-list category: the scope match, else the first non-generic type, else null.
    assert.equal(waitlistCategoryFor(candidate('ChIJ-place-1', { primaryType: 'service', types: ['manufacturer', 'general_contractor', 'service'] })),
      'gcid:general_contractor');
    assert.equal(waitlistCategoryFor(candidate('ChIJ-place-1', { primaryType: 'restaurant', types: ['restaurant'] })), 'gcid:restaurant');
    assert.equal(waitlistCategoryFor(noType), null);
  } finally { h.close(); }
});

test('open gate: eligible with a spot, full once the cap is reached, eligible again for a business that holds a spot', async () => {
  const places = ['ChIJ-place-1', 'ChIJ-place-2', 'ChIJ-place-3', 'ChIJ-place-4'];
  const h = harness({ candidates: places.map(id => candidate(id)) });
  try {
    assert.equal(await resolveOffer(candidate(places[0]), h.deps), 'eligible');
    for (const id of places.slice(0, 3)) assert.deepEqual(await claimInterviewStart(auditId, id, h.deps), { kind: 'claimed', status: 'reserved' });
    assert.equal(await resolveOffer(candidate(places[3]), h.deps), 'waitlist_full');
    assert.equal(await resolveOffer(candidate(places[1]), h.deps), 'eligible');
    assert.deepEqual(await claimInterviewStart(auditId, places[1], h.deps), { kind: 'claimed', status: 'already' });
    assert.deepEqual(await claimInterviewStart(auditId, places[3], h.deps), { kind: 'blocked', offer: 'waitlist_full' });
  } finally { h.close(); }
});

test('server-side interview start: a crafted URL past a full cap is blocked to the full waiting list, never the interview', async () => {
  const places = ['ChIJ-place-1', 'ChIJ-place-2'];
  const h = harness({ limits: { total: 1, weekly: 3 }, candidates: places.map(id => candidate(id)) });
  try {
    assert.deepEqual(await interviewStartDecision(auditId, places[0], h.deps), { kind: 'allowed' });
    recordPaidSignup(h.store, 'session-1'); // total cap of 1 reached
    assert.deepEqual(await interviewStartDecision(auditId, places[0], h.deps), { kind: 'blocked', offer: 'waitlist_full' });
    assert.deepEqual(await claimInterviewStart(auditId, places[0], h.deps), { kind: 'blocked', offer: 'waitlist_full' });
    assert.equal(await interviewSpotHeld(auditId, places[0], h.deps), false);
    assert.equal(auditResultPath(auditId, places[0]), `/site-bot/audit?auditId=${auditId}&placeId=${places[0]}`);
  } finally { h.close(); }
});

test('server-side interview start: no audit, a foreign place, malformed ids, not eligible or bad config never claim', async () => {
  const h = harness({ candidates: [candidate('ChIJ-place-1'), candidate('ChIJ-place-site', { hasWebsite: true })] });
  try {
    for (const [a, p] of [[undefined, undefined], ['not-a-uuid', 'ChIJ-place-1'], [auditId, 'short'], [auditId, '../../../etc'],
      ['123e4567-e89b-42d3-a456-426614174999', 'ChIJ-place-1'], [auditId, 'ChIJ-place-other']]) {
      assert.deepEqual(await interviewStartDecision(a, p, h.deps), { kind: 'no_audit' }, `${a} ${p}`);
      assert.deepEqual(await claimInterviewStart(a, p, h.deps), { kind: 'no_audit' }, `${a} ${p}`);
    }
    assert.deepEqual(await claimInterviewStart(auditId, 'ChIJ-place-site', h.deps), { kind: 'blocked', offer: 'not_eligible_has_site' });
    assert.equal(await interviewSpotHeld(auditId, 'ChIJ-place-1', h.deps), false);
  } finally { h.close(); }
  const closed = harness({ open: false, candidates: [candidate('ChIJ-place-1')] });
  try {
    assert.deepEqual(await claimInterviewStart(auditId, 'ChIJ-place-1', closed.deps), { kind: 'blocked', offer: 'waitlist_preopen' });
  } finally { closed.close(); }
  const misconfigured = harness({ limits: null, candidates: [candidate('ChIJ-place-1')] });
  try {
    assert.deepEqual(await interviewStartDecision(auditId, 'ChIJ-place-1', misconfigured.deps), { kind: 'blocked', offer: 'waitlist_full' });
    assert.deepEqual(await claimInterviewStart(auditId, 'ChIJ-place-1', misconfigured.deps), { kind: 'blocked', offer: 'waitlist_full' });
  } finally { misconfigured.close(); }
});

test('checkout init check: only a business that claimed its spot passes', async () => {
  const h = harness({ candidates: [candidate('ChIJ-place-1')] });
  try {
    assert.equal(await interviewSpotHeld(auditId, 'ChIJ-place-1', h.deps), false);
    await claimInterviewStart(auditId, 'ChIJ-place-1', h.deps);
    assert.equal(await interviewSpotHeld(auditId, 'ChIJ-place-1', h.deps), true);
    assert.equal(await interviewSpotHeld(undefined, 'ChIJ-place-1', h.deps), false);
  } finally { h.close(); }
});
