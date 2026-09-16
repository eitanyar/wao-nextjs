import assert from 'node:assert/strict';
import test from 'node:test';
import { ADMIN_CLIENT_FIXTURE_TOKEN, verifyAdminClientFixtureAccess, verifyAdminToken } from './admin-auth';

const keys = [
  'NODE_ENV',
  'WAO_ADMIN_AUTH_DEV_FIXTURE_ENABLE',
  'WAO_CLIENT_AUTH_DEV_FIXTURE_ENABLE',
  'WAO_CLIENT_AUTH_DEV_FIXTURE_ROOT',
  'ADMIN_SECRET',
] as const;
const fixtureRoot = '/tmp/wao-client-auth-ui-admin-auth-test';

function restore(previous: Record<string, string | undefined>): void {
  for (const key of keys) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
}

function configureValidFixture(): void {
  process.env.NODE_ENV = 'development';
  process.env.WAO_ADMIN_AUTH_DEV_FIXTURE_ENABLE = '1';
  process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ENABLE = '1';
  process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ROOT = fixtureRoot;
  delete process.env.ADMIN_SECRET;
}

test('synthetic admin marker succeeds only with the exact development fixture gates', async (t) => {
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]])) as Record<string, string | undefined>;
  t.after(() => restore(previous));
  configureValidFixture();

  assert.equal(await verifyAdminClientFixtureAccess(ADMIN_CLIENT_FIXTURE_TOKEN, '/admin/clients', fixtureRoot), 'synthetic');
  for (const [key, value] of [
    ['NODE_ENV', 'production'],
    ['WAO_ADMIN_AUTH_DEV_FIXTURE_ENABLE', '0'],
    ['WAO_CLIENT_AUTH_DEV_FIXTURE_ENABLE', '0'],
    ['WAO_CLIENT_AUTH_DEV_FIXTURE_ROOT', ''],
  ] as const) {
    configureValidFixture();
    if (value) process.env[key] = value;
    else delete process.env[key];
    assert.equal(await verifyAdminClientFixtureAccess(ADMIN_CLIENT_FIXTURE_TOKEN, '/admin/clients', fixtureRoot), null, `${key}=${value || 'missing'}`);
  }
});

test('synthetic admin marker rejects every alternate root and route without ambient fallback', async (t) => {
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]])) as Record<string, string | undefined>;
  t.after(() => restore(previous));
  configureValidFixture();

  for (const root of [
    '/tmp/wao-client-auth-ui-admin-auth-test/child',
    '/tmp/wao-client-auth-ui-admin-auth-test-suffix',
    '/tmp/not-wao-client-auth-ui-admin-auth-test',
    '/tmp/wao-client-auth-ui-../escape',
  ]) {
    assert.equal(await verifyAdminClientFixtureAccess(ADMIN_CLIENT_FIXTURE_TOKEN, '/admin/clients', root), null, root);
  }
  for (const pathname of ['/admin/clients/', '/admin/podcast-titles', '/admin/clients/other']) {
    assert.equal(await verifyAdminClientFixtureAccess(ADMIN_CLIENT_FIXTURE_TOKEN, pathname, fixtureRoot), null, pathname);
  }
  assert.equal(await verifyAdminClientFixtureAccess('not-a-marker', '/admin/clients', fixtureRoot), null);
  assert.equal(await verifyAdminToken(ADMIN_CLIENT_FIXTURE_TOKEN), false);
});
