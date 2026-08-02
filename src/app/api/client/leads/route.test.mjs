import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyClientLeadFeedback } from '../../../../lib/crm/clientLeadsActions.js';
import { leadMatchesClientIndex } from '../../../../lib/crm/ownership.js';

// docs/specs/priority-3-lead-capture-reliability-and-client-feedback.md §6.3
// (tests #9-14). `applyClientLeadFeedback` / `leadMatchesClientIndex` are the
// real, pure logic the route (`route.ts`) wires session/fs/uploadLeadConversion
// around — these tests exercise real behavior (mocked write/upload functions
// with call-count assertions), not source-text regex. #9 (401 without a
// session) is asserted structurally against the route's cookie-gate wiring,
// since `verifySessionToken`/`cookies()` need a live Next.js request context
// to exercise directly — the session-gate helper itself is already covered
// (see client-auth.production-secret.test.mjs) and re-used verbatim here.

const CLIENT_A_INDEX = {
  clientId: 'client-a',
  primarySlug: 'plumber-tel-aviv',
  primaryCustomerId: '111-111-1111',
  primaryCampaignId: 'camp-1',
  updatedAt: new Date().toISOString(),
  campaigns: [
    { slug: 'plumber-tel-aviv', customerId: '111-111-1111', campaignId: 'camp-1', createdAt: new Date().toISOString() },
  ],
};

const CLIENT_B_INDEX = {
  clientId: 'client-b',
  primarySlug: 'electrician-haifa',
  primaryCustomerId: '333-333-3333',
  primaryCampaignId: 'camp-3',
  updatedAt: new Date().toISOString(),
  campaigns: [
    { slug: 'electrician-haifa', customerId: '333-333-3333', campaignId: 'camp-3', createdAt: new Date().toISOString() },
  ],
};

const LEADS = [
  { id: 1, name: 'Client A Lead', phone: '050-1111111', date: '2026-08-01 10:00', status: 'חדש', quality: 'PENDING', revenue: 0, closed: false, closedAt: null, type: 'form', slug: 'plumber-tel-aviv', gclid: 'gclid-1' },
  { id: 2, name: 'Client B Lead', phone: '050-2222222', date: '2026-08-01 11:00', status: 'חדש', quality: 'PENDING', revenue: 0, closed: false, closedAt: null, type: 'form', slug: 'electrician-haifa', gclid: 'gclid-2' },
];

function makeWriteLeadsMock() {
  let callCount = 0;
  let lastArgs = null;
  const fn = async (leads) => { callCount += 1; lastArgs = leads; };
  fn.callCount = () => callCount;
  fn.lastArgs = () => lastArgs;
  return fn;
}

function makeUploadMock({ shouldReject = false } = {}) {
  let callCount = 0;
  const calls = [];
  const fn = async (args) => {
    callCount += 1;
    calls.push(args);
    if (shouldReject) throw new Error('Google Ads upload failed (simulated)');
    return { success: true, leadId: args.leadId, type: args.type, conversionValue: 100 };
  };
  fn.callCount = () => callCount;
  fn.calls = () => calls;
  return fn;
}

// ── #9: GET with no/invalid session → 401 (structural check on route wiring) ──
test('GET /api/client/leads requires a valid wao-client session (401 gate wired)', () => {
  const baseDir = path.dirname(fileURLToPath(import.meta.url));
  const routeCode = fs.readFileSync(path.join(baseDir, 'route.ts'), 'utf8');
  assert.match(routeCode, /verifySessionToken/);
  assert.match(routeCode, /COOKIE_NAME/);
  assert.match(routeCode, /if \(!clientId\) \{\s*\n\s*return NextResponse\.json\(\{ success: false, error: 'Unauthorized' \}, \{ status: 401 \}\);/);
});

// ── #10: GET scoped list returns only the authenticated client's leads ────────
test('scoped GET filtering (leadMatchesClientIndex) returns only the authenticated client\'s leads', () => {
  const ownLeadsForA = LEADS.filter((lead) => leadMatchesClientIndex(lead, CLIENT_A_INDEX));
  assert.deepEqual(ownLeadsForA.map((l) => l.id), [1]);

  const ownLeadsForB = LEADS.filter((lead) => leadMatchesClientIndex(lead, CLIENT_B_INDEX));
  assert.deepEqual(ownLeadsForB.map((l) => l.id), [2]);
});

// ── #11: POST feedback for a lead not owned by the client → 403, zero writes ──
test('POST feedback for a lead not owned by the authenticated client → 403, write function called zero times', async () => {
  const writeLeads = makeWriteLeadsMock();
  const uploadLeadConversion = makeUploadMock();

  const result = await applyClientLeadFeedback({
    leadId: 2, // belongs to client B
    quality: 'GOOD',
    leads: LEADS,
    clientIndex: CLIENT_A_INDEX, // authenticated as client A
    writeLeads,
    uploadLeadConversion,
  });

  assert.equal(result.status, 403);
  assert.equal(result.body.success, false);
  assert.equal(writeLeads.callCount(), 0);
  assert.equal(uploadLeadConversion.callCount(), 0);
});

// ── #12: POST { quality: 'GOOD' } for an owned lead ────────────────────────────
test("POST { quality: 'GOOD' } for an owned lead → 200, quality updated in the written file, uploadLeadConversion called once with type: 'verified-lead'", async () => {
  const writeLeads = makeWriteLeadsMock();
  const uploadLeadConversion = makeUploadMock();

  const result = await applyClientLeadFeedback({
    leadId: 1,
    quality: 'GOOD',
    leads: LEADS,
    clientIndex: CLIENT_A_INDEX,
    writeLeads,
    uploadLeadConversion,
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.conversionUpload, 'ok');

  assert.equal(writeLeads.callCount(), 1);
  const written = writeLeads.lastArgs().find((l) => l.id === 1);
  assert.equal(written.quality, 'GOOD');

  assert.equal(uploadLeadConversion.callCount(), 1);
  assert.deepEqual(uploadLeadConversion.calls()[0], { leadId: 1, type: 'verified-lead' });
});

// ── #13: POST { closed: { revenue } } for an owned lead ────────────────────────
test("POST { closed: { revenue: 1200 } } for an owned lead → closed/closedAt/revenue/quality all set correctly, uploadLeadConversion called once with type: 'closed-deal'", async () => {
  const writeLeads = makeWriteLeadsMock();
  const uploadLeadConversion = makeUploadMock();

  const result = await applyClientLeadFeedback({
    leadId: 1,
    closed: { revenue: 1200 },
    leads: LEADS,
    clientIndex: CLIENT_A_INDEX,
    writeLeads,
    uploadLeadConversion,
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);

  const written = writeLeads.lastArgs().find((l) => l.id === 1);
  assert.equal(written.closed, true);
  assert.equal(typeof written.closedAt, 'string');
  assert.equal(written.revenue, 1200);
  assert.equal(written.quality, 'GOOD');

  assert.equal(uploadLeadConversion.callCount(), 1);
  assert.deepEqual(uploadLeadConversion.calls()[0], { leadId: 1, type: 'closed-deal' });
});

// ── #14: regression guard — a rejected upload never blocks/reverts the CRM write
test("a Google Ads upload failure never blocks or reverts the client's lead rating", async () => {
  const writeLeads = makeWriteLeadsMock();
  const uploadLeadConversion = makeUploadMock({ shouldReject: true });

  const result = await applyClientLeadFeedback({
    leadId: 1,
    quality: 'GOOD',
    leads: LEADS,
    clientIndex: CLIENT_A_INDEX,
    writeLeads,
    uploadLeadConversion,
  });

  assert.deepEqual(result, { status: 200, body: { success: true, lead: result.body.lead, conversionUpload: 'failed' } });
  assert.equal(writeLeads.callCount(), 1); // the write already happened before the (rejected) upload attempt
  assert.equal(result.body.lead.quality, 'GOOD');
});
