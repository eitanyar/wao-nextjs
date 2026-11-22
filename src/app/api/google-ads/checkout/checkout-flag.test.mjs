import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// ADS_BOT_CHECKOUT_ENABLED (mission item 3): off = today's behaviour byte for byte. Runs the REAL route files in a vm.
// The Ads Bot routes return the standard 503 when off and delegate to ./paid only when the flag is exactly 'true';
// the generic /api/checkout and /api/subscriptions/create stubs stay 503 whatever the flag says.

const root = process.cwd();
const UNAVAILABLE = (error) => ({ status: 503, body: { error }, cache: 'private, no-store' });

function load(rel, env, paidCalls) {
  const file = path.join(root, rel);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    process: { env },
    require: (name) => {
      if (name === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === '@/lib/google-ads/billing/adsBotCheckoutFlag') {
        return { adsBotCheckoutEnabled: (e = env) => e.ADS_BOT_CHECKOUT_ENABLED === 'true' };
      }
      if (name === './paid') return { POST: async () => { paidCalls.push(rel); return Response.json({ paid: true }); } };
      throw new Error(`unexpected import ${name} in ${rel}`);
    },
  }, { filename: file });
  return exports;
}

const strip = ({ status, body, cache }) => ({ status, body, cache });

async function call(rel, method, env) {
  const paidCalls = [];
  const handler = load(rel, env, paidCalls)[method];
  const res = await handler(new Request('https://example.invalid/x', { method, ...(method === 'POST' ? { body: '{}' } : {}) }));
  return { status: res.status, body: await res.json(), cache: res.headers.get('cache-control'), paidCalls };
}

test('the flag module is the real rule: exactly "true" turns it on', async () => {
  const src = fs.readFileSync(path.join(root, 'src/lib/google-ads/billing/adsBotCheckoutFlag.ts'), 'utf8');
  assert.match(src, /return env\.ADS_BOT_CHECKOUT_ENABLED === 'true';/);
});

for (const rel of ['src/app/api/google-ads/checkout/init/route.ts', 'src/app/api/google-ads/checkout/callback/route.ts']) {
  test(`${rel}: flag off -> 503 checkout_unavailable, ./paid never loaded`, async () => {
    for (const env of [{}, { ADS_BOT_CHECKOUT_ENABLED: 'false' }, { ADS_BOT_CHECKOUT_ENABLED: '1' }]) {
      const { paidCalls, ...res } = await call(rel, 'POST', env);
      assert.deepEqual(res, UNAVAILABLE('checkout_unavailable'), JSON.stringify(env));
      assert.deepEqual(paidCalls, []);
    }
  });
  test(`${rel}: flag on -> delegates to ./paid`, async () => {
    const res = await call(rel, 'POST', { ADS_BOT_CHECKOUT_ENABLED: 'true' });
    assert.deepEqual(res.body, { paid: true });
    assert.deepEqual(res.paidCalls, [rel]);
  });
}

test('generic /api/checkout, /api/checkout/callback, /api/subscriptions/create, /api/subscriptions/callback: 503 with the flag off AND on (unchanged)', async () => {
  for (const env of [{}, { ADS_BOT_CHECKOUT_ENABLED: 'true' }]) {
    assert.deepEqual(strip(await call('src/app/api/checkout/route.ts', 'POST', env)), UNAVAILABLE('checkout_unavailable'));
    assert.deepEqual(strip(await call('src/app/api/checkout/callback/route.ts', 'GET', env)), UNAVAILABLE('checkout_unavailable'));
    assert.deepEqual(strip(await call('src/app/api/subscriptions/create/route.ts', 'POST', env)), UNAVAILABLE('subscription_unavailable'));
    for (const method of ['GET', 'POST']) {
      assert.deepEqual(strip(await call('src/app/api/subscriptions/callback/route.ts', method, env)), UNAVAILABLE('subscription_unavailable'));
    }
  }
});

test('the /google-ads/pay page 404s with the flag off; the admin pay-link action refuses with it off', () => {
  const page = fs.readFileSync(path.join(root, 'src/app/(app)/google-ads/pay/page.tsx'), 'utf8');
  const gate = page.indexOf('if (!adsBotCheckoutEnabled()) notFound();');
  assert.ok(gate > 0 && gate < page.indexOf('verifyPayLinkToken(t)'), 'flag checked before anything else');
  const action = fs.readFileSync(path.join(root, 'src/app/(product)/admin/ads-bot-billing/action.ts'), 'utf8');
  const body = action.slice(action.indexOf('export async function sendPayLinkAction'));
  assert.ok(body.indexOf('requireAdmin()') < body.indexOf("if (!adsBotCheckoutEnabled()) redirect(`${PAGE}?error=checkout_disabled`);"));
  assert.ok(body.indexOf('checkout_disabled') < body.indexOf('sendAdsBotPayLinkEmail('));
  const record = action.slice(action.indexOf('export async function recordManualChargeAction'), action.indexOf('export async function sendPayLinkAction'));
  assert.ok(record.indexOf('requireAdmin()') < record.indexOf('recordManualAdsBotCharge('), 'manual record is admin-gated');
});
