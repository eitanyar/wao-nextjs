import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const sha256 = (relative) => crypto.createHash('sha256').update(read(relative)).digest('hex');

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

test('synthetic admin fixture is exact-route, gated, and short-circuits ambient auth', () => {
  const auth = read('src/lib/admin-auth.ts');
  assert.match(auth, /ADMIN_CLIENT_FIXTURE_TOKEN = 'wao-admin-client-fixture-v1'/);
  assert.match(auth, /WAO_ADMIN_AUTH_DEV_FIXTURE_ENABLE === '1'/);
  assert.match(auth, /WAO_CLIENT_AUTH_DEV_FIXTURE_ENABLE === '1'/);
  assert.match(auth, /pathname === '\/admin\/clients'/);
  assert.match(auth, /\^\\\/tmp\\\/wao-client-auth-ui-\[A-Za-z0-9_-\]\{1,64\}\$/);
  const markerBranch = auth.slice(auth.indexOf('if (token === ADMIN_CLIENT_FIXTURE_TOKEN)'), auth.indexOf('return await verifyAdminToken'));
  assert.match(markerBranch, /return validFixture \? 'synthetic' : null/);
  assert.doesNotMatch(markerBranch, /getAdminSecret|verifyAdminToken|verifyAdminCredentials|createAdminToken/);
});

test('proxy and page scope synthetic authorization to only the canonical client route', () => {
  const proxy = read('src/proxy.ts');
  const page = read('src/app/(product)/admin/clients/page.tsx');
  assert.match(proxy, /pathname === '\/admin\/clients'\s*\? await verifyAdminClientFixtureAccess/);
  assert.match(proxy, /: await verifyAdminToken\(token\) \? 'live' : null/);
  assert.match(page, /const fixtureRoot = resolveConfiguredClientAuthRoot\(\);/);
  assert.match(page, /verifyAdminClientFixtureAccess\([^\n]+, '\/admin\/clients', fixtureRoot \?\? undefined\)/);
  assert.match(page, /authorized === 'synthetic' \? fixtureRoot! : fixtureRoot \?\? CLIENTS_DIR/);
  assert.ok(page.indexOf('if (!authorized) redirect') < page.indexOf('const clients = loadClients(root);'));
});

test('recovery actions use scoped authorization while impersonation and reset remain live-only', () => {
  const action = read('src/app/(product)/admin/clients/action.ts');
  assert.match(action, /verifyAdminClientFixtureAccess\([^\n]+, '\/admin\/clients', root \?\? undefined\)/);
  for (const name of [
    'requestClientRecoveryContactVerificationAction',
    'completeClientRecoveryContactVerificationAction',
    'revealClientRecoveryContactAction',
  ]) {
    const body = actionBody(action, name);
    assert.ok(body.indexOf('await requireAdmin()') < body.indexOf('formData.get'), `${name} authorizes before form reads`);
    assert.match(body, /clientsRoot: context\.root/);
  }
  for (const name of ['loginAsClientAction', 'resetClientPinAction']) {
    const body = actionBody(action, name);
    assert.ok(body.indexOf('await verifyAdminToken') < body.indexOf('formData.get'), `${name} remains live-token only`);
    assert.doesNotMatch(body, /verifyAdminClientFixtureAccess/);
  }
});

test('protected login sources are unchanged and canonical discovery includes this suite', () => {
  assert.equal(sha256('src/app/(product)/admin/login/action.ts'), 'bf287779db43b9edf477e87808186a18dd817f035a3d17445e84e857e751a585');
  assert.equal(sha256('src/app/(product)/admin/login/page.tsx'), 'd7eebd2d488b4eed1854473fc41f42db4d7b4aa9ae9ae1f3869f9001eaf3eec3');
  const packageJson = read('package.json');
  assert.match(packageJson, /admin-recovery-contact\.security\.test\.mjs/);
  assert.match(packageJson, /dist\/lib\/admin-auth\.test\.js/);
});
