import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

function actionBody(source, name) {
  const start = source.indexOf(`export async function ${name}`);
  assert.notEqual(start, -1, `${name} is exported`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}' && --depth === 0) return source.slice(open + 1, index);
  }
  throw new Error(`unterminated_${name}`);
}

function verifierPrecedesFormRead(body, verifier) {
  const verifierIndex = body.indexOf(`await ${verifier}`);
  const formIndex = body.indexOf('formData.get');
  return verifierIndex !== -1 && (formIndex === -1 || verifierIndex < formIndex);
}

test('reviewed client access copy has the complete runtime key contract', () => {
  const copy = JSON.parse(read('src/data/client-access-copy.he.json'));
  const expected = {
    login: ['title', 'intro', 'clientIdLabel', 'pinLabel', 'submit', 'failure', 'recoveryLink'],
    recovery: ['title', 'body', 'whatsappCta', 'backToLogin'],
    change: ['forcedTitle', 'forcedIntro', 'ownerTitle', 'ownerIntro', 'currentPinLabel', 'newPinLabel', 'confirmPinLabel', 'policyHint', 'mismatch', 'policyFailure', 'currentFailure', 'genericFailure', 'submit'],
    admin: ['resetOpen', 'pinLabel', 'confirmPinLabel', 'submit', 'success', 'failure'],
  };
  for (const [section, keys] of Object.entries(expected)) {
    for (const key of keys) assert.equal(typeof copy[section][key], 'string', `${section}.${key}`);
  }
});

test('client authentication boundaries preserve generic login failure and automated recovery', () => {
  const loginAction = read('src/app/(product)/client/login/action.ts');
  const loginPage = read('src/app/(product)/client/login/page.tsx');
  const loginForm = read('src/app/(product)/client/login/login-form.tsx');
  const recoveryPage = read('src/app/(product)/client/recover/page.tsx');
  assert.match(loginAction, /verifyClientCredentials/);
  assert.match(loginAction, /client-login-ip:/);
  assert.match(loginAction, /client-login-pair:/);
  assert.doesNotMatch(loginAction, /unknown-client/);
  assert.match(loginAction, /type LoginActionState/);
  assert.match(loginAction, /failure/);
  assert.match(loginPage, /LoginForm/);
  assert.match(loginForm, /\/client\/recover/);
  const recoveryForm = read('src/app/(product)/client/recover/recovery-form.tsx');
  const requestRoute = read('src/app/api/client/recover/request/route.ts');
  const completeRoute = read('src/app/api/client/recover/complete/route.ts');
  assert.match(recoveryPage, /RecoveryForm/);
  assert.doesNotMatch(recoveryPage, /wa\.me|whatsappCta|recovery\.body/);
  assert.match(recoveryForm, /\/api\/client\/recover\/request/);
  assert.match(recoveryForm, /\/api\/client\/recover\/complete/);
  assert.match(recoveryForm, /whatsappMobile/);
  assert.match(recoveryForm, /type="tel"/);
  assert.match(recoveryForm, /inputMode="tel"/);
  assert.match(recoveryForm, /autoComplete="tel"/);
  assert.match(recoveryForm, /WhatsApp/);
  assert.doesNotMatch(recoveryForm, /clientId|clientIdLabel|autoComplete="username"/);
  assert.match(requestRoute, /sameOrigin\(request\)/);
  assert.match(completeRoute, /sameOrigin\(request\)/);
  assert.match(requestRoute, /whatsappMobile/);
  assert.match(completeRoute, /whatsappMobile/);
  assert.doesNotMatch(requestRoute, /clientId/);
  assert.doesNotMatch(completeRoute, /clientId/);
  assert.doesNotMatch(recoveryPage, /clientIdLabel/);
  assert.doesNotMatch(recoveryForm, /whatsapp-cloud|approvalWhatsapp/);
});

test('recovery form gives controlled mobile and uncontrolled code stages distinct identities', () => {
  const recoveryForm = read('src/app/(product)/client/recover/recovery-form.tsx');
  assert.match(recoveryForm, /requested \? \(\s*<form key="recovery-code-entry"/);
  assert.match(recoveryForm, /\) : <form key="recovery-mobile-entry"/);
  assert.match(recoveryForm, /key="recovery-mobile-entry"[\s\S]*value=\{whatsappMobile\}/);
  assert.match(recoveryForm, /key="recovery-code-entry"[\s\S]*id="code"/);
});

test('proxy limits the public recovery exception to an exact GET tuple', () => {
  const proxy = read('src/proxy.ts');
  assert.match(proxy, /if \(!isProtected \|\| pathname\.startsWith\(LOGIN_PATH\)\) return NextResponse\.next\(\);/);
  assert.match(proxy, /if \(req\.method === 'GET' && pathname === '\/client\/recover'\) return NextResponse\.next\(\);/);
  assert.doesNotMatch(proxy, /pathname\.startsWith\('\/client\/recover/);
  assert.doesNotMatch(proxy, /req\.method === 'GET' && pathname\.startsWith\('\/client/);
  assert.doesNotMatch(proxy, /pathname === '\/client'\s*\|\|/);
});

test('authorization checks are awaited inside each action body before form reads', () => {
  const change = actionBody(read('src/app/(product)/client/change-pin/action.ts'), 'changeClientPinAction');
  const reset = actionBody(read('src/app/(product)/admin/clients/action.ts'), 'resetClientPinAction');
  const impersonate = actionBody(read('src/app/(product)/admin/clients/action.ts'), 'loginAsClientAction');
  assert.equal(verifierPrecedesFormRead(change, 'verifyClientSession'), true);
  assert.equal(verifierPrecedesFormRead(reset, 'verifyAdminToken'), true);
  assert.equal(verifierPrecedesFormRead(impersonate, 'verifyAdminToken'), true);
  assert.equal(verifierPrecedesFormRead(change.replace('await verifyClientSession', 'verifyClientSession'), 'verifyClientSession'), false);
  assert.equal(verifierPrecedesFormRead(reset.replace('await verifyAdminToken', 'verifyAdminToken'), 'verifyAdminToken'), false);
  assert.equal(verifierPrecedesFormRead(impersonate.replace('await verifyAdminToken', 'verifyAdminToken'), 'verifyAdminToken'), false);
  assert.equal(verifierPrecedesFormRead(change.replace('await verifyClientSession', "formData.get('x'); await verifyClientSession"), 'verifyClientSession'), false);
});

test('security flow has no provider notification imports', () => {
  for (const relative of ['src/app/(product)/client/login/action.ts', 'src/app/(product)/client/change-pin/action.ts', 'src/app/(product)/admin/clients/action.ts']) {
    assert.doesNotMatch(read(relative), /notifications\/|whatsapp-cloud|nodemailer/);
  }
});

test('login, change, and admin forms use typed action states without retained submitted values', () => {
  const loginForm = read('src/app/(product)/client/login/login-form.tsx');
  const changeForm = read('src/app/(product)/client/change-pin/change-pin-form.tsx');
  const adminPage = read('src/app/(product)/admin/clients/page.tsx');
  const changePage = read('src/app/(product)/client/change-pin/page.tsx');
  for (const source of [loginForm, changeForm]) {
    assert.match(source, /useActionState/);
    assert.match(source, /aria-live/);
    assert.match(source, /focus-visible:ring/);
    assert.match(source, /min-h-11/);
    assert.doesNotMatch(source, /value=\{state\.(pin|currentPin|newPin|confirmPin)\}/);
  }
  assert.match(adminPage, /aria-live/);
  assert.match(adminPage, /focus-visible:ring/);
  assert.match(adminPage, /min-h-11/);
  assert.match(changePage, /scope === 'change-pin'/);
  assert.match(changeForm, /showCurrentPin/);
  assert.match(changeForm, /currentPin/);
  assert.match(changeForm, /newPin/);
  assert.match(changeForm, /confirmPin/);
});

test('development fixture seam and podcast fixture selector fail closed independently', () => {
  const config = read('next.config.ts');
  const store = read('src/lib/client-auth-store.ts');
  assert.match(config, /distDir: podcastFixtureDistDir/);
  assert.doesNotMatch(config, /WAO_CLIENT_AUTH_SMOKE_DIST_DIR|clientAuthSmokeDistDir/);
  assert.equal(fs.existsSync(path.join(root, 'scripts/verify-client-auth-get-smoke.mjs')), false);
  assert.match(store, /WAO_CLIENT_AUTH_DEV_FIXTURE_ROOT/);
  assert.match(store, /WAO_CLIENT_AUTH_DEV_FIXTURE_ENABLE !== '1'/);
  assert.match(store, /process\.env\.NODE_ENV === 'production'/);
  assert.match(store, /\^wao-client-auth-ui-\[A-Za-z0-9_-\]\{1,64\}\$/);
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
