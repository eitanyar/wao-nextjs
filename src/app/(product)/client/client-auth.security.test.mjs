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

function assertGeoSignupCallbackTokenBoundary(source) {
  const provision = "const auth = await provisionClientAuth(pending.clientId, bootstrapPin, undefined, { mustChangePin: true });";
  const token = "const token = await createSessionToken(pending.clientId, { sessionVersion: auth.sessionVersion, scope: 'change-pin' });";
  const response = "return NextResponse.json({ success: true, clientId: pending.clientId });";

  assert.match(source, /randomInt\(100000, 1_000_000\)/);
  assert.match(source, /const bootstrapPin = String\(randomInt\(100000, 1_000_000\)\);/);
  assert.ok(source.includes(provision), 'provisions a must-change-PIN auth record');
  assert.ok(source.includes(token), 'mints only a versioned change-pin token from the provisioned record');
  assert.ok(source.indexOf(provision) < source.indexOf(token), 'provisions auth before token minting');
  assert.doesNotMatch(source, /createSessionToken\(\s*pending\.clientId\s*\)/);
  assert.doesNotMatch(source, /readClientAuthRecord/);
  assert.doesNotMatch(source, /scope:\s*['"](?:full|admin-impersonation)['"]/);
  assert.ok(source.includes(response), 'does not expose a PIN in the successful callback JSON');
  assert.doesNotMatch(source, /return NextResponse\.json\(\{[^\n}]*\bpin\b/);
}

test('GEO signup callback mints only the provisioned current-version change-pin token', () => {
  const callback = read('src/app/api/geo/signup/callback/route.ts');
  const provision = "const auth = await provisionClientAuth(pending.clientId, bootstrapPin, undefined, { mustChangePin: true });";
  const token = "const token = await createSessionToken(pending.clientId, { sessionVersion: auth.sessionVersion, scope: 'change-pin' });";
  assertGeoSignupCallbackTokenBoundary(callback);

  const mutations = [
    callback.replace(token, 'const token = await createSessionToken(pending.clientId);'),
    callback.replace('auth.sessionVersion', '1'),
    callback.replace("scope: 'change-pin'", "scope: 'full'"),
    callback.replace(provision, '__PROVISION__').replace(token, `${token}\n    ${provision}`).replace('__PROVISION__\n    ', ''),
    callback.replace(`${provision}\n`, ''),
    callback.replace('return NextResponse.json({ success: true, clientId: pending.clientId });', 'return NextResponse.json({ success: true, clientId: pending.clientId, pin: bootstrapPin });'),
  ];
  for (const mutation of mutations) assert.throws(() => assertGeoSignupCallbackTokenBoundary(mutation));
});
