import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('client recovery source boundary is email-only and generic', () => {
  const form = read('src/app/(product)/client/recover/recovery-form.tsx');
  const request = read('src/app/api/client/recover/request/route.ts');
  const complete = read('src/app/api/client/recover/complete/route.ts');
  const core = read('src/lib/client-pin-recovery.ts');
  assert.match(form, /key="recovery-email-entry"/);
  assert.match(form, /key="recovery-code-entry"/);
  assert.match(form, /value=\{email\}/);
  assert.match(form, /type="email"/);
  assert.match(form, /inputMode="email"/);
  assert.match(form, /autoComplete="email"/);
  assert.doesNotMatch(form, /whatsappMobile|type="tel"|inputMode="tel"/);
  assert.match(request, /sameOrigin\(request\)/);
  assert.match(complete, /sameOrigin\(request\)/);
  assert.doesNotMatch(request, /whatsappMobile|clientId/);
  assert.doesNotMatch(complete, /whatsappMobile|clientId/);
  assert.match(core, /CLIENT_PIN_RECOVERY_EMAIL_ENABLE/);
  assert.match(core, /CLIENT_PIN_RECOVERY_EMAIL_FROM/);
  assert.match(core, /resolveUniqueRecoveryEnrollmentByEmail/);
  assert.doesNotMatch(core, /whatsapp-cloud|approvalWhatsapp|approvalContact/);
});

test('proxy exception and authentication authorization ordering remain constrained', () => {
  const proxy = read('src/proxy.ts');
  const action = read('src/app/(product)/admin/clients/action.ts');
  assert.match(proxy, /req\.method === 'GET' && pathname === '\/client\/recover'/);
  assert.doesNotMatch(proxy, /pathname\.startsWith\('\/client\/recover/);
  assert.ok(action.indexOf('await requireAdmin()') < action.indexOf('formData.get'));
});

function assertGeoSignupCallbackDisabled(source) {
  // Whole-module shape excludes additional imports, exports and any request, token,
  // provisioning, session, cookie, client, invoice, charge or PIN-disclosure path.
  assert.match(source, /^\s*import \{ NextResponse \} from 'next\/server';\s*export async function POST\(\) \{\s*return NextResponse\.json\(\s*\{ error: 'checkout_unavailable' \},\s*\{ status: 503, headers: \{ 'Cache-Control': 'private, no-store' \} \}\s*\);\s*\}\s*$/);
}

test('GEO signup callback source remains fixed unavailable with no token or provisioning', () => {
  const callback = read('src/app/api/geo/signup/callback/route.ts');
  assertGeoSignupCallbackDisabled(callback);

  const mutations = [
    callback.replace('  return NextResponse.json(', '  const token = await createSessionToken(clientId);\n  return NextResponse.json('),
    callback.replace('  return NextResponse.json(', '  await provisionClientAuth(clientId, bootstrapPin);\n  return NextResponse.json('),
    callback.replace("{ error: 'checkout_unavailable' }", "{ success: true, clientId, pin: bootstrapPin }"),
    callback.replace('status: 503', 'status: 200'),
    callback.replace("'private, no-store'", "'public, max-age=60'"),
    callback.replace("'Cache-Control': 'private, no-store'", "'Cache-Control': 'private, no-store', 'Set-Cookie': token"),
  ];
  for (const mutation of mutations) {
    assert.notEqual(mutation, callback, 'mutation changes the real callback source');
    assert.throws(() => assertGeoSignupCallbackDisabled(mutation));
  }
});
