import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leadMatchesClientIndex } from './ownership.js';

// `leadMatchesClientIndex` is the pure core that `intelligence.ts`'s
// exported `isLeadOwnedByClient(lead, clientId)` wraps (it loads the
// client's GoogleAdsClientIndex via `loadClientGoogleAdsIndex` and delegates
// here) — real-behavior tests against this core, per
// docs/specs/priority-3-lead-capture-reliability-and-client-feedback.md §6.2.

const CLIENT_INDEX = {
  clientId: 'client-a',
  primarySlug: 'plumber-tel-aviv',
  primaryCustomerId: '111-111-1111',
  primaryCampaignId: 'camp-1',
  updatedAt: new Date().toISOString(),
  campaigns: [
    { slug: 'plumber-tel-aviv', customerId: '111-111-1111', campaignId: 'camp-1', createdAt: new Date().toISOString() },
    { slug: 'electrician-tel-aviv', customerId: '222-222-2222', campaignId: 'camp-2', createdAt: new Date().toISOString() },
  ],
};

test('lead slug matches a client\'s primarySlug → true', () => {
  const lead = { id: 1, slug: 'plumber-tel-aviv' };
  assert.equal(leadMatchesClientIndex(lead, CLIENT_INDEX), true);
});

test('lead slug matches a non-primary entry in campaigns[] → true (multi-campaign client not locked out)', () => {
  const lead = { id: 2, slug: 'electrician-tel-aviv' };
  assert.equal(leadMatchesClientIndex(lead, CLIENT_INDEX), true);
});

test('lead with neither slug nor customerId set → false (no wildcard bypass)', () => {
  const lead = { id: 3 };
  assert.equal(leadMatchesClientIndex(lead, CLIENT_INDEX), false);

  const leadWithEmptyStrings = { id: 4, slug: '', customerId: '' };
  assert.equal(leadMatchesClientIndex(leadWithEmptyStrings, CLIENT_INDEX), false);
});

test('lead slug/customerId belongs to a different client entirely → false', () => {
  const leadBySlug = { id: 5, slug: 'roofer-haifa' };
  assert.equal(leadMatchesClientIndex(leadBySlug, CLIENT_INDEX), false);

  const leadByCustomerId = { id: 6, customerId: '999-999-9999' };
  assert.equal(leadMatchesClientIndex(leadByCustomerId, CLIENT_INDEX), false);
});

test('no client index at all → false (fail closed)', () => {
  const lead = { id: 7, slug: 'plumber-tel-aviv' };
  assert.equal(leadMatchesClientIndex(lead, null), false);
});

// ── Regression guard: buildWeeklyDigest's own (deliberately lenient) filter
// must remain untouched by this change. Re-assert its documented behavior —
// an unattributed lead (no slug/customerId) IS included, unlike the strict
// isLeadOwnedByClient/leadMatchesClientIndex above — directly from source,
// since buildWeeklyDigest itself has its own dedicated test suite
// (weekly-digest-batch.test.mjs) that this must not duplicate or risk. ──────
test("buildWeeklyDigest's own scoping filter is untouched (still lenient — different security semantics, on purpose)", () => {
  const baseDir = path.dirname(fileURLToPath(import.meta.url));
  const intelligenceCode = fs.readFileSync(path.join(baseDir, 'intelligence.ts'), 'utf8');
  assert.match(
    intelligenceCode,
    /const scopedLeads = leads\.filter\(lead => !lead\.slug \|\| lead\.slug === input\.campaign\.slug \|\| lead\.customerId === input\.campaign\.customerId\);/,
    'buildWeeklyDigest\'s lenient scoping predicate must remain exactly as shipped — isLeadOwnedByClient is a separate, stricter helper, not a replacement'
  );
});
