import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const routePath = path.join(baseDir, 'route.ts');
const routeCode = fs.readFileSync(routePath, 'utf8');

const proxyPath = path.join(baseDir, '..', '..', '..', 'proxy.ts');
const proxyCode = fs.readFileSync(proxyPath, 'utf8');

function postHandler() {
  const match = routeCode.match(/export async function POST\(req: Request\) \{[\s\S]*$/);
  assert.ok(match, 'POST handler should exist');
  return match[0];
}

function orderedIndex(source, first, second) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  assert.notEqual(firstIndex, -1, `missing ${first}`);
  assert.notEqual(secondIndex, -1, `missing ${second}`);
  assert.ok(firstIndex < secondIndex, `${first} must occur before ${second}`);
}

function createRouteHarness({ authorized = false, leads = [] } = {}) {
  const calls = { capture: 0, conversion: 0, notification: 0, read: 0, reviewQueue: 0, write: 0 };
  const fixtureLeads = [...leads];
  const require = (specifier) => {
    switch (specifier) {
      case 'next/server':
        return { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } };
      case 'next/headers':
        return { cookies: async () => ({ get: () => undefined }) };
      case '@/lib/mail':
        return { sendLeadNotificationEmail: () => { calls.notification += 1; } };
      case '@/lib/admin-auth':
        return { ADMIN_COOKIE_NAME: 'admin', verifyAdminToken: () => authorized };
      case '@/lib/crm/leadsStore':
        return {
          findLeadById: (storedLeads, id) => storedLeads.find((lead) => lead.id === id),
          readLeads: async () => { calls.read += 1; return fixtureLeads; },
          writeLeads: async () => { calls.write += 1; },
        };
      case '@/lib/google-ads/conversion-upload':
        return { uploadLeadConversion: async () => { calls.conversion += 1; return { success: true }; } };
      case '@/lib/crm/intelligence':
        return { loadCampaignConfigBySlug: () => undefined };
      case '@/lib/shared/clients':
        return { loadClient: () => undefined };
      case '@/lib/crm/reviewFlywheelCopy':
        return { buildReviewRequestOwnerNotification: () => '' };
      case '@/lib/gmb/whatsapp':
        return { buildWaLink: () => '' };
      case '@/lib/crm/reviewFlywheelStore':
        return { appendReviewFlywheelQueueItem: () => { calls.reviewQueue += 1; } };
      case '@/lib/crm/lead-capture':
        return { captureLead: ({ body }) => { calls.capture += 1; return { lead: { id: 999, ...body } }; } };
      default:
        throw new Error(`Unexpected route dependency: ${specifier}`);
    }
  };
  const source = ts.transpileModule(routeCode, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, {
    console: { error: () => {}, log: () => {}, warn: () => {} },
    exports: module.exports,
    module,
    require,
  });
  return { calls, handler: module.exports };
}

const requestWithBody = (body) => ({ json: async () => body });

test('GET /api/leads requires the admin cookie', () => {
  assert.match(routeCode, /verifyAdminToken/);
  assert.match(routeCode, /ADMIN_COOKIE_NAME/);
  assert.match(routeCode, /export async function GET\(\) \{\s*\n\s*if \(!\(await isAdminAuthorized\(\)\)\)/);
  assert.match(routeCode, /status: 401/);
});

test('POST keeps no-action public lead capture separate from the admin gate', () => {
  const post = postHandler();
  assert.match(post, /const bodyRecord = isJsonRecord\(body\) \? body : undefined/);
  assert.match(post, /const hasAction = Boolean\(bodyRecord && Object\.prototype\.hasOwnProperty\.call\(bodyRecord, "action"\)\)/);
  assert.match(post, /let action: AdminMutationAction \| undefined/);
  assert.match(post, /const leadBody = body as LeadCapturePayload/);
  assert.match(post, /const captured = captureLead\(\{ leads, body: leadBody \}\)/);
  assert.match(post, /sendLeadNotificationEmail\(newLead\)/);
  orderedIndex(post, 'if (action && bodyRecord)', 'const leadBody = body as LeadCapturePayload');
});

test('POST rejects malformed JSON before any CRM read', () => {
  const post = postHandler();
  assert.match(post, /try \{\s*body = await req\.json\(\);\s*\} catch \{\s*return NextResponse\.json\(\{ success: false, error: "Invalid JSON body" \}, \{ status: 400 \}\)/);
  orderedIndex(post, 'body = await req.json()', 'const leads = await readLeads()');
});

test('each supported admin mutation is authorized before CRM reads and side effects', () => {
  const post = postHandler();
  assert.match(routeCode, /const ADMIN_MUTATION_ACTIONS = new Set\(\[\s*"updateQuality",\s*"updateRevenue",\s*"enrichStub",\s*"markClosed",\s*\]\)/);
  assert.match(post, /if \(!\(await isAdminAuthorized\(\)\)\) \{\s*return NextResponse\.json\(\{ success: false, error: "Unauthorized" \}, \{ status: 401 \}\)/);
  orderedIndex(post, 'if (!(await isAdminAuthorized()))', 'const leads = await readLeads()');
  orderedIndex(post, 'if (!(await isAdminAuthorized()))', 'await writeLeads(updatedLeads)');
  orderedIndex(post, 'if (!(await isAdminAuthorized()))', 'uploadConversion(');
  orderedIndex(post, 'if (!(await isAdminAuthorized()))', 'maybeQueueReviewFlywheelRequest(lead)');
});

test('unknown actions fail closed instead of falling through to public capture', () => {
  const post = postHandler();
  assert.match(post, /if \(!isAdminMutationAction\(bodyRecord\.action\)\) \{\s*return NextResponse\.json\(\{ success: false, error: "Unsupported action" \}, \{ status: 400 \}\)/);
  orderedIndex(post, 'error: "Unsupported action"', 'const leadBody = body as LeadCapturePayload');
});

test('admin mutation payloads validate identifiers, qualities, revenue, and bounded enrichment fields before writes', () => {
  const post = postHandler();
  assert.match(routeCode, /Number\.isSafeInteger\(value\) && value > 0/);
  assert.match(routeCode, /const LEAD_QUALITIES = new Set\(\["PENDING", "GOOD", "JUNK"\]\)/);
  assert.match(routeCode, /Number\.isFinite\(value\) && value >= 0/);
  assert.match(routeCode, /MAX_STUB_NAME_LENGTH = 200/);
  assert.match(routeCode, /MAX_STUB_PHONE_LENGTH = 64/);
  assert.match(post, /if \(!isValidMutationPayload\(bodyRecord\.action, bodyRecord\)\) \{\s*return NextResponse\.json\(\{ success: false, error: "Invalid mutation payload" \}, \{ status: 400 \}\)/);
  orderedIndex(post, 'if (!isValidMutationPayload(bodyRecord.action, bodyRecord))', 'const leads = await readLeads()');
});

test('POST restores the stable operational 500 boundary after explicit client errors', () => {
  const post = postHandler();
  const operationalStart = post.indexOf('try {', post.indexOf('action = bodyRecord.action'));
  assert.notEqual(operationalStart, -1, 'operational boundary should exist');
  const operational = post.slice(operationalStart);
  assert.match(operational, /try \{\s*if \(action && bodyRecord\) \{[\s\S]*const leadBody = body as LeadCapturePayload[\s\S]*\} catch \(error: unknown\) \{\s*console\.error\("Error processing lead:", error\);\s*return NextResponse\.json\(\s*\{ success: false, error: "Failed to route lead" \},\s*\{ status: 500 \}\s*\)/);
  assert.ok(post.indexOf('if (!isAdminMutationAction(bodyRecord.action))') < operationalStart);
  assert.ok(post.indexOf('if (!(await isAdminAuthorized()))') < operationalStart);
  assert.ok(post.indexOf('if (!isValidMutationPayload(bodyRecord.action, bodyRecord))') < operationalStart);
  orderedIndex(operational, 'try {', 'const leads = await readLeads()');
  orderedIndex(operational, 'try {', 'const captured = captureLead({ leads, body: leadBody })');
});

test('synthetic handler: GET and known mutations reject unauthenticated callers before every side effect', async () => {
  const getHarness = createRouteHarness();
  const getResponse = await getHarness.handler.GET();
  assert.equal(getResponse.status, 401);
  assert.equal(getHarness.calls.read, 0);

  const payloads = [
    { action: 'updateQuality', id: 1, quality: 'GOOD' },
    { action: 'updateRevenue', id: 1, revenue: 0 },
    { action: 'enrichStub', id: 1, name: 'Name', phone: '123' },
    { action: 'markClosed', id: 1, revenue: 25 },
  ];
  for (const payload of payloads) {
    const harness = createRouteHarness();
    const response = await harness.handler.POST(requestWithBody(payload));
    assert.equal(response.status, 401, payload.action);
    assert.deepEqual(harness.calls, {
      capture: 0, conversion: 0, notification: 0, read: 0, reviewQueue: 0, write: 0,
    }, payload.action);
  }
});

test('synthetic handler: malformed, unknown, and invalid mutation payloads fail closed before CRM access', async () => {
  const cases = [
    { label: 'unknown action', request: requestWithBody({ action: 'deleteLead', id: 1 }), error: 'Unsupported action' },
    { label: 'fractional identifier', request: requestWithBody({ action: 'updateRevenue', id: 1.5, revenue: 5 }), error: 'Invalid mutation payload' },
    { label: 'invalid quality', request: requestWithBody({ action: 'updateQuality', id: 1, quality: 'BAD' }), error: 'Invalid mutation payload' },
    { label: 'negative revenue', request: requestWithBody({ action: 'markClosed', id: 1, revenue: -1 }), error: 'Invalid mutation payload' },
  ];
  for (const { label, request, error } of cases) {
    const harness = createRouteHarness({ authorized: true });
    const response = await harness.handler.POST(request);
    assert.equal(response.status, 400, label);
    assert.equal(response.body.error, error, label);
    assert.deepEqual(harness.calls, {
      capture: 0, conversion: 0, notification: 0, read: 0, reviewQueue: 0, write: 0,
    }, label);
  }

  const malformedHarness = createRouteHarness({ authorized: true });
  const malformedResponse = await malformedHarness.handler.POST({ json: async () => { throw new Error('bad json'); } });
  assert.equal(malformedResponse.status, 400);
  assert.equal(malformedResponse.body.error, 'Invalid JSON body');
  assert.equal(malformedHarness.calls.read, 0);
});

test('synthetic handler: public no-action capture keeps notification and orderId idempotency behavior', async () => {
  const freshHarness = createRouteHarness();
  const freshResponse = await freshHarness.handler.POST(requestWithBody({ orderId: 'order-1', name: 'Name' }));
  assert.equal(freshResponse.status, 200);
  assert.equal(freshHarness.calls.read, 1);
  assert.equal(freshHarness.calls.capture, 1);
  assert.equal(freshHarness.calls.write, 1);
  assert.equal(freshHarness.calls.notification, 1);

  const existing = { id: 7, orderId: 'order-1', name: 'Existing' };
  const retryHarness = createRouteHarness({ leads: [existing] });
  const retryResponse = await retryHarness.handler.POST(requestWithBody({ orderId: 'order-1', name: 'Retry' }));
  assert.equal(retryResponse.status, 200);
  assert.equal(retryResponse.body.lead, existing);
  assert.deepEqual(retryHarness.calls, {
    capture: 0, conversion: 0, notification: 0, read: 1, reviewQueue: 0, write: 0,
  });
});

test('proxy.ts protects the /leads admin page with the admin-cookie gate', () => {
  assert.match(proxyCode, /ADMIN_PROTECTED\s*=\s*\[[^\]]*'\/leads'/);
  assert.match(proxyCode, /matcher:\s*\[[^\]]*'\/leads\/:path\*'/);
});
