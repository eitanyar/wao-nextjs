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

function makeUploadMock({ shouldReject = false, result } = {}) {
  let callCount = 0;
  const calls = [];
  const fn = async (args) => {
    callCount += 1;
    calls.push(args);
    if (shouldReject) throw new Error('Google Ads upload failed (simulated)');
    if (result) return typeof result === 'function' ? result(args) : result;
    return { success: true, leadId: args.leadId, type: args.type, conversionValue: 100 };
  };
  fn.callCount = () => callCount;
  fn.calls = () => calls;
  return fn;
}

function makePatchLeadMock({ shouldReject = false } = {}) {
  const calls = [];
  const fn = async (leadId, patch) => {
    calls.push({ leadId, patch });
    if (shouldReject) throw new Error('persist failed (simulated)');
  };
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
  const patchLead = makePatchLeadMock();

  const result = await applyClientLeadFeedback({
    leadId: 1,
    quality: 'GOOD',
    leads: LEADS,
    clientIndex: CLIENT_A_INDEX,
    writeLeads,
    uploadLeadConversion,
    patchLead,
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.conversionUpload, 'ok');
  assert.equal(patchLead.calls().length, 1);
  assert.equal(patchLead.calls()[0].patch.verifiedUpload.status, 'ok');

  assert.equal(writeLeads.callCount(), 1);
  const written = writeLeads.lastArgs().find((l) => l.id === 1);
  assert.equal(written.quality, 'GOOD');

  assert.equal(uploadLeadConversion.callCount(), 1);
  assert.deepEqual(uploadLeadConversion.calls()[0], { leadId: 1, type: 'verified-lead' });
});

// ── #13: POST { closed: { revenue } } for an owned lead ────────────────────────
// Updated 2026-11-12 (ads-bot-phase2 spec §3 0d): this lead was never marked GOOD, so the close
// also uploads verified-lead first, then closed-deal.
test("POST { closed: { revenue: 1200 } } for an owned lead never marked GOOD → closed/closedAt/revenue/quality set, uploads verified-lead then closed-deal", async () => {
  const writeLeads = makeWriteLeadsMock();
  const uploadLeadConversion = makeUploadMock();
  const patchLead = makePatchLeadMock();

  const result = await applyClientLeadFeedback({
    leadId: 1,
    closed: { revenue: 1200 },
    leads: LEADS,
    clientIndex: CLIENT_A_INDEX,
    writeLeads,
    uploadLeadConversion,
    patchLead,
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);

  const written = writeLeads.lastArgs().find((l) => l.id === 1);
  assert.equal(written.closed, true);
  assert.equal(typeof written.closedAt, 'string');
  assert.equal(written.revenue, 1200);
  assert.equal(written.quality, 'GOOD');

  assert.equal(uploadLeadConversion.callCount(), 2);
  assert.deepEqual(uploadLeadConversion.calls(), [{ leadId: 1, type: 'verified-lead' }, { leadId: 1, type: 'closed-deal' }]);
  const { patch } = patchLead.calls()[0];
  assert.equal(patch.verifiedUpload.status, 'ok');
  assert.equal(patch.closedUpload.status, 'ok');
});

// ── #14: regression guard — a rejected upload never blocks/reverts the CRM write
test("a Google Ads upload failure never blocks or reverts the client's lead rating", async () => {
  const writeLeads = makeWriteLeadsMock();
  const uploadLeadConversion = makeUploadMock({ shouldReject: true });
  const patchLead = makePatchLeadMock();

  const result = await applyClientLeadFeedback({
    leadId: 1,
    quality: 'GOOD',
    leads: LEADS,
    clientIndex: CLIENT_A_INDEX,
    writeLeads,
    uploadLeadConversion,
    patchLead,
  });

  assert.deepEqual(result, { status: 200, body: { success: true, lead: result.body.lead, conversionUpload: 'failed' } });
  assert.equal(writeLeads.callCount(), 1); // the write already happened before the (rejected) upload attempt
  assert.equal(result.body.lead.quality, 'GOOD');
});

// ── ads-bot-phase2 spec §11 Step 0 — 0c/0d: the UploadResult is inspected and persisted ──
async function feedback(overrides) {
  const writeLeads = makeWriteLeadsMock();
  const patchLead = makePatchLeadMock();
  const uploadLeadConversion = makeUploadMock(overrides.upload);
  const result = await applyClientLeadFeedback({
    leadId: 1,
    leads: overrides.leads ?? LEADS,
    clientIndex: CLIENT_A_INDEX,
    writeLeads,
    uploadLeadConversion,
    patchLead: overrides.noPatchLead ? undefined : patchLead,
    now: () => new Date('2026-11-12T08:00:00.000Z'),
    ...overrides.body,
  });
  return { result, writeLeads, patchLead, uploadLeadConversion };
}

test('0c: { success: false } from the upload is persisted as failed (not reported ok)', async () => {
  const { result, patchLead } = await feedback({ body: { quality: 'GOOD' }, upload: { result: { success: false, error: 'conversion before click', status: 400 } } });
  assert.equal(result.status, 200);
  assert.equal(result.body.conversionUpload, 'failed');
  assert.deepEqual(patchLead.calls()[0], { leadId: 1, patch: { verifiedUpload: { status: 'failed', at: '2026-11-12T08:00:00.000Z', attempts: 1, error: 'conversion before click' } } });
  assert.equal(result.body.lead.verifiedUpload.status, 'failed');
});

test('0c: { skipped } is persisted as skipped_no_click_id', async () => {
  const { result, patchLead } = await feedback({ body: { quality: 'GOOD' }, upload: { result: { skipped: true, reason: 'no_click_id', message: 'x' } } });
  assert.equal(result.body.conversionUpload, 'skipped');
  assert.equal(patchLead.calls()[0].patch.verifiedUpload.status, 'skipped_no_click_id');
});

test('0c: success is persisted with the Data Manager requestId', async () => {
  const { patchLead } = await feedback({ body: { quality: 'GOOD' }, upload: { result: (args) => ({ success: true, leadId: args.leadId, type: args.type, conversionValue: 100, requestId: 'dm-req-42' }) } });
  assert.deepEqual(patchLead.calls()[0].patch.verifiedUpload, { status: 'ok', at: '2026-11-12T08:00:00.000Z', attempts: 1, requestId: 'dm-req-42' });
});

test('0d: closed with a prior OK verified upload uploads only closed-deal', async () => {
  const leads = LEADS.map((l) => (l.id === 1 ? { ...l, quality: 'GOOD', verifiedUpload: { status: 'ok', at: '2026-11-01T00:00:00.000Z', attempts: 1 } } : l));
  const { uploadLeadConversion, patchLead } = await feedback({ leads, body: { closed: { revenue: 900 } } });
  assert.deepEqual(uploadLeadConversion.calls(), [{ leadId: 1, type: 'closed-deal' }]);
  assert.deepEqual(Object.keys(patchLead.calls()[0].patch), ['closedUpload']);
});

test('0d: closed with a prior FAILED verified upload re-sends verified-lead then closed-deal', async () => {
  const leads = LEADS.map((l) => (l.id === 1 ? { ...l, quality: 'GOOD', verifiedUpload: { status: 'failed', at: '2026-11-01T00:00:00.000Z', attempts: 1 } } : l));
  const { uploadLeadConversion, patchLead } = await feedback({ leads, body: { closed: { revenue: 900 } } });
  assert.deepEqual(uploadLeadConversion.calls(), [{ leadId: 1, type: 'verified-lead' }, { leadId: 1, type: 'closed-deal' }]);
  assert.equal(patchLead.calls()[0].patch.verifiedUpload.attempts, 2);
});

test('0c: without patchLead the outcome is persisted by a second writeLeads; JUNK uploads nothing', async () => {
  const { writeLeads, result } = await feedback({ noPatchLead: true, body: { quality: 'GOOD' } });
  assert.equal(writeLeads.callCount(), 2);
  assert.equal(writeLeads.lastArgs().find((l) => l.id === 1).verifiedUpload.status, 'ok');
  assert.equal(result.body.lead.quality, 'GOOD');
  const junk = await feedback({ body: { quality: 'JUNK' } });
  assert.equal(junk.uploadLeadConversion.callCount(), 0);
  assert.equal(junk.patchLead.calls().length, 0);
  assert.equal(junk.result.body.conversionUpload, 'not_applicable');
});

test('0c: an outcome-persistence failure never affects the 200 or the CRM write', async () => {
  const writeLeads = makeWriteLeadsMock();
  const result = await applyClientLeadFeedback({
    leadId: 1, quality: 'GOOD', leads: LEADS, clientIndex: CLIENT_A_INDEX, writeLeads,
    uploadLeadConversion: makeUploadMock(), patchLead: makePatchLeadMock({ shouldReject: true }),
  });
  assert.equal(result.status, 200);
  assert.equal(writeLeads.callCount(), 1);
  assert.equal(writeLeads.lastArgs().find((l) => l.id === 1).quality, 'GOOD');
});

// ── post-launch week 1 spec, task A1 — qualityMarkedAt ──────────────────────────
test('A1: marking real, junk and closed each sets qualityMarkedAt (written to the CRM file)', async () => {
  for (const body of [{ quality: 'GOOD' }, { quality: 'JUNK' }, { closed: { revenue: 500 } }]) {
    const { writeLeads, result } = await feedback({ body });
    const written = writeLeads.lastArgs().find((l) => l.id === 1);
    assert.equal(written.qualityMarkedAt, '2026-11-12T08:00:00.000Z', JSON.stringify(body));
    assert.equal(result.body.lead.qualityMarkedAt, '2026-11-12T08:00:00.000Z');
  }
});

test('A1: a repeat mark with the same quality keeps the first time; a changed mark resets it', async () => {
  const first = '2026-11-01T09:00:00.000Z';
  const good = LEADS.map((l) => (l.id === 1 ? { ...l, quality: 'GOOD', qualityMarkedAt: first } : l));
  const repeat = await feedback({ leads: good, body: { quality: 'GOOD' } });
  assert.equal(repeat.writeLeads.lastArgs().find((l) => l.id === 1).qualityMarkedAt, first);
  const closed = await feedback({ leads: good, body: { closed: { revenue: 700 } } });
  assert.equal(closed.writeLeads.lastArgs().find((l) => l.id === 1).qualityMarkedAt, first, 'close on an already-GOOD lead keeps the mark time');
  assert.equal(closed.writeLeads.lastArgs().find((l) => l.id === 1).closedAt, '2026-11-12T08:00:00.000Z');
  const changed = await feedback({ leads: good, body: { quality: 'JUNK' } });
  assert.equal(changed.writeLeads.lastArgs().find((l) => l.id === 1).qualityMarkedAt, '2026-11-12T08:00:00.000Z');
});

test('A1: withQualityMark drops the mark time when the lead goes back to unmarked', async () => {
  const { withQualityMark } = await import('../../../../lib/crm/clientLeadsActions.js');
  const lead = { id: 9, quality: 'GOOD', qualityMarkedAt: '2026-11-01T09:00:00.000Z' };
  assert.deepEqual(withQualityMark(lead, 'PENDING', '2026-11-12T08:00:00.000Z'), { id: 9, quality: 'PENDING' });
  assert.equal(withQualityMark({ id: 9, quality: 'PENDING' }, 'GOOD', 'T').qualityMarkedAt, 'T');
  assert.equal(withQualityMark({ id: 9, quality: 'GOOD' }, 'GOOD', 'T').qualityMarkedAt, 'T', 'a legacy GOOD lead with no time gets one');
});
