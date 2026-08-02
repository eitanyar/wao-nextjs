import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const routePath = path.join(baseDir, 'route.ts');
const routeCode = fs.readFileSync(routePath, 'utf8');

const proxyPath = path.join(baseDir, '..', '..', '..', 'proxy.ts');
const proxyCode = fs.readFileSync(proxyPath, 'utf8');

test('GET /api/leads requires the admin cookie (matches /geo/dashboard convention)', () => {
  assert.match(routeCode, /verifyAdminToken/);
  assert.match(routeCode, /ADMIN_COOKIE_NAME/);
  assert.match(routeCode, /export async function GET\(\) \{\s*\n\s*if \(!\(await isAdminAuthorized\(\)\)\)/);
  assert.match(routeCode, /status: 401/);
});

test('POST /api/leads (public lead-capture form) is NOT gated by the admin check', () => {
  const postMatch = routeCode.match(/export async function POST\(req: Request\) \{[\s\S]*$/);
  assert.ok(postMatch, 'POST handler should exist');
  assert.doesNotMatch(postMatch[0], /isAdminAuthorized/);
});

test('proxy.ts protects the /leads admin page with the same admin-cookie gate as /geo/dashboard', () => {
  assert.match(proxyCode, /ADMIN_PROTECTED\s*=\s*\[[^\]]*'\/leads'/);
  assert.match(proxyCode, /matcher:\s*\[[^\]]*'\/leads\/:path\*'/);
});

// Regression: `isClickStub` used to check `body.type === 'click-stub'`, a
// value LandingPage.tsx's pingClick() never actually sends (it sends
// 'phone-click' / 'whatsapp-click'), so every lead — including click stubs —
// silently got status: "חדש". Extracts and re-executes the real isClickStub
// expression against representative payloads so the assertion tracks the
// actual route logic rather than duplicating it by hand.
test("POST /api/leads: isClickStub matches the real 'phone-click'/'whatsapp-click' values pingClick() sends, producing status: 'לחיצה'", () => {
  const exprMatch = routeCode.match(/const isClickStub = ([^;]+);/);
  assert.ok(exprMatch, 'isClickStub assignment should exist');

  const evalIsClickStub = (type) => {
    const body = { type };
    // eslint-disable-next-line no-eval
    return eval(exprMatch[1]);
  };

  assert.equal(evalIsClickStub('phone-click'), true);
  assert.equal(evalIsClickStub('whatsapp-click'), true);
  assert.equal(evalIsClickStub('form'), false);
  assert.equal(evalIsClickStub(undefined), false);
  // The old (dead) literal must no longer be what the check matches against.
  assert.equal(evalIsClickStub('click-stub'), false);

  assert.match(routeCode, /status: isClickStub \? "לחיצה" : "חדש"/);
});
