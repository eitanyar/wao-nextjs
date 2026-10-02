import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

function actionBody(source, name) {
  const start = source.indexOf(`export async function ${name}`);
  assert.notEqual(start, -1);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}' && --depth === 0) return source.slice(open + 1, index);
  }
  throw new Error('unterminated_action');
}

test('admin recovery contact is email-only with fixture-scoped authorization', () => {
  const control = read('src/app/(product)/admin/clients/recovery-contact-control.tsx');
  const action = read('src/app/(product)/admin/clients/action.ts');
  const core = read('src/lib/client-recovery-contact.ts');
  const auth = read('src/lib/admin-auth.ts');
  for (const label of ['Recovery Email: Enabled', 'Recovery Email: Disabled', 'Recovery Email: Invalid', 'Verified email', 'Verified at', 'Reveal', 'Hide', 'Enroll or update', 'Email', 'Send verification code', 'Verification code', 'Confirm verified email']) assert.match(control, new RegExp(label));
  assert.doesNotMatch(control, /whatsapp|mobile/i);
  assert.doesNotMatch(core, /whatsapp|approvalContact|approvalWhatsapp/i);
  assert.match(core, /beginClientRecoveryContactVerification/);
  assert.match(core, /consumeClientRecoveryContactVerification/);
  assert.match(auth, /pathname === '\/admin\/clients'/);
  for (const name of ['requestClientRecoveryContactVerificationAction', 'completeClientRecoveryContactVerificationAction', 'revealClientRecoveryContactAction']) {
    const body = actionBody(action, name);
    assert.ok(body.indexOf('await requireAdmin()') < body.indexOf('formData.get'));
  }
  for (const name of ['loginAsClientAction', 'resetClientPinAction']) {
    const body = actionBody(action, name);
    assert.ok(body.indexOf('await verifyAdminToken') < body.indexOf('formData.get'));
    assert.doesNotMatch(body, /verifyAdminClientFixtureAccess/);
  }
});

test('proxy, page, and recovery actions pass only the direct request host into fixture authorization', () => {
  const proxy = read('src/proxy.ts');
  const page = read('src/app/(product)/admin/clients/page.tsx');
  const action = read('src/app/(product)/admin/clients/action.ts');
  const auth = read('src/lib/admin-auth.ts');
  const requireAdmin = action.slice(action.indexOf('async function requireAdmin()'), action.indexOf('export async function requestClientRecoveryContactVerificationAction'));

  assert.match(proxy, /pathname === '\/admin\/clients'\s*\? await verifyAdminClientFixtureAccess\(token, pathname, process\.env\.WAO_CLIENT_AUTH_DEV_FIXTURE_ROOT, req\.headers\.get\('host'\)\)/);
  assert.match(proxy, /: await verifyAdminToken\(token\) \? 'live' : null/);
  assert.match(page, /const requestHeaders = await headers\(\);/);
  assert.match(page, /const fixtureRootCandidate = process\.env\.WAO_CLIENT_AUTH_DEV_FIXTURE_ROOT;/);
  assert.match(page, /verifyAdminClientFixtureAccess\([^\n]+, '\/admin\/clients', fixtureRootCandidate, requestHeaders\.get\('host'\)\)/);
  assert.match(requireAdmin, /const requestHeaders = await headers\(\);/);
  assert.match(requireAdmin, /const fixtureRootCandidate = process\.env\.WAO_CLIENT_AUTH_DEV_FIXTURE_ROOT;/);
  assert.match(requireAdmin, /verifyAdminClientFixtureAccess\([^\n]+, '\/admin\/clients', fixtureRootCandidate, requestHeaders\.get\('host'\)\)/);
  assert.doesNotMatch(proxy, /x-forwarded-host/);
  assert.doesNotMatch(page, /x-forwarded-host/);
  assert.doesNotMatch(requireAdmin, /x-forwarded-host/);
  assert.match(auth, /WAO_ADMIN_AUTH_PRODUCTION_FIXTURE_ENABLE === '1'/);
  assert.match(auth, /WAO_CLIENT_AUTH_DEV_FIXTURE_AUDIT_ROOT/);
  assert.match(auth, /LOOPBACK_FIXTURE_HOST_PATTERN\.test\(requestHost \?\? ''\)/);
  assert.match(auth, /pathname === '\/admin\/clients'/);
  assert.doesNotMatch(auth, /x-forwarded-host/);
});

test('production fixture root selection follows synthetic authorization and never reaches live or generic callers', () => {
  const page = read('src/app/(product)/admin/clients/page.tsx');
  const action = read('src/app/(product)/admin/clients/action.ts');
  const authStore = read('src/lib/client-auth-store.ts');
  const pinRecovery = read('src/lib/client-pin-recovery.ts');
  const contactRecovery = read('src/lib/client-recovery-contact.ts');
  const requireAdmin = action.slice(action.indexOf('async function requireAdmin()'), action.indexOf('export async function requestClientRecoveryContactVerificationAction'));
  const signal = 'resolveConfiguredClientAuthRoot({ productionSyntheticAuthorized: true })';

  assert.ok(page.indexOf('verifyAdminClientFixtureAccess') < page.indexOf(signal));
  assert.ok(requireAdmin.indexOf('verifyAdminClientFixtureAccess') < requireAdmin.indexOf(signal));
  assert.match(page, /authorized === 'synthetic' \? resolveConfiguredClientAuthRoot\(\{ productionSyntheticAuthorized: true \}\) : CLIENTS_DIR/);
  assert.match(requireAdmin, /authorized === 'synthetic' \? resolveConfiguredClientAuthRoot\(\{ productionSyntheticAuthorized: true \}\) : undefined/);
  assert.match(authStore, /options\.productionSyntheticAuthorized === true/);
  assert.doesNotMatch(pinRecovery, /productionSyntheticAuthorized/);
  assert.doesNotMatch(contactRecovery, /productionSyntheticAuthorized/);
  assert.equal((page.match(/productionSyntheticAuthorized/g) ?? []).length, 1);
  assert.equal((action.match(/productionSyntheticAuthorized/g) ?? []).length, 1);
});

test('canonical discovery includes both source and transport suites', () => {
  const packageJson = read('package.json');
  assert.match(packageJson, /resend-transactional\.test\.js/);
  assert.match(packageJson, /admin-recovery-contact\.security\.test\.mjs/);
  assert.match(packageJson, /client-auth\.security\.test\.mjs/);
});
