import assert from 'node:assert/strict';
import test from 'node:test';
import { ADMIN_CLIENT_FIXTURE_TOKEN, createAdminToken, verifyAdminClientFixtureAccess, verifyAdminToken } from './admin-auth';

const keys = [
  'NODE_ENV',
  'WAO_ADMIN_AUTH_DEV_FIXTURE_ENABLE',
  'WAO_CLIENT_AUTH_DEV_FIXTURE_ENABLE',
  'WAO_CLIENT_AUTH_DEV_FIXTURE_ROOT',
  'WAO_CLIENT_AUTH_DEV_FIXTURE_AUDIT_ROOT',
  'WAO_ADMIN_AUTH_PRODUCTION_FIXTURE_ENABLE',
  'WAO_ADMIN_AUTH_PRODUCTION_FIXTURE_TOKEN',
  'ADMIN_SECRET',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
] as const;
const fixtureRoot = '/tmp/wao-client-auth-ui-admin-auth-test';
const auditRoot = '/tmp/wao-client-auth-audit-admin-auth-test';
const loopbackHost = '127.0.0.1:3110';
const productionToken = 'a'.repeat(64);
const environment = process.env as Record<string, string | undefined>;

function restore(previous: Record<string, string | undefined>): void {
  for (const key of keys) {
    if (previous[key] === undefined) delete environment[key];
    else environment[key] = previous[key];
  }
}

function withEnvironment(t: test.TestContext): void {
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]])) as Record<string, string | undefined>;
  t.after(() => restore(previous));
}

function configureValidDevelopmentFixture(): void {
  environment['NODE_ENV'] = 'development';
  process.env.WAO_ADMIN_AUTH_DEV_FIXTURE_ENABLE = '1';
  process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ENABLE = '1';
  process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ROOT = fixtureRoot;
  delete process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_AUDIT_ROOT;
  delete process.env.WAO_ADMIN_AUTH_PRODUCTION_FIXTURE_ENABLE;
  delete process.env.WAO_ADMIN_AUTH_PRODUCTION_FIXTURE_TOKEN;
  delete process.env.ADMIN_SECRET;
  delete process.env.ADMIN_USERNAME;
  delete process.env.ADMIN_PASSWORD;
}

function configureValidProductionFixture(): void {
  environment['NODE_ENV'] = 'production';
  process.env.WAO_ADMIN_AUTH_DEV_FIXTURE_ENABLE = '1';
  process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ENABLE = '1';
  process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ROOT = fixtureRoot;
  process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_AUDIT_ROOT = auditRoot;
  process.env.WAO_ADMIN_AUTH_PRODUCTION_FIXTURE_ENABLE = '1';
  process.env.WAO_ADMIN_AUTH_PRODUCTION_FIXTURE_TOKEN = productionToken;
  delete process.env.ADMIN_SECRET;
  delete process.env.ADMIN_USERNAME;
  delete process.env.ADMIN_PASSWORD;
}

async function fixtureAccess(token = productionToken, pathname = '/admin/clients', root = fixtureRoot, host: string | null = loopbackHost): Promise<'live' | 'synthetic' | null> {
  return verifyAdminClientFixtureAccess(token, pathname, root, host);
}

test('synthetic admin marker succeeds only with the exact development fixture gates', async (t) => {
  withEnvironment(t);
  configureValidDevelopmentFixture();

  assert.equal(await verifyAdminClientFixtureAccess(ADMIN_CLIENT_FIXTURE_TOKEN, '/admin/clients', fixtureRoot), 'synthetic');
  for (const [key, value] of [
    ['NODE_ENV', 'production'],
    ['WAO_ADMIN_AUTH_DEV_FIXTURE_ENABLE', '0'],
    ['WAO_CLIENT_AUTH_DEV_FIXTURE_ENABLE', '0'],
    ['WAO_CLIENT_AUTH_DEV_FIXTURE_ROOT', ''],
  ] as const) {
    configureValidDevelopmentFixture();
    if (value) environment[key as string] = value;
    else delete environment[key as string];
    assert.equal(await verifyAdminClientFixtureAccess(ADMIN_CLIENT_FIXTURE_TOKEN, '/admin/clients', fixtureRoot), null, `${key}=${value || 'missing'}`);
  }
});

test('development synthetic admin marker rejects alternate roots and routes without ambient fallback', async (t) => {
  withEnvironment(t);
  configureValidDevelopmentFixture();

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
});

test('production synthetic capability requires every exact gate and both loopback port boundaries', async (t) => {
  withEnvironment(t);
  configureValidProductionFixture();

  assert.equal(await fixtureAccess(productionToken, '/admin/clients', fixtureRoot, '127.0.0.1:3110'), 'synthetic');
  assert.equal(await fixtureAccess(productionToken, '/admin/clients', fixtureRoot, '127.0.0.1:3199'), 'synthetic');

  const deniedMutations: Array<() => void> = [
    () => { delete process.env.WAO_ADMIN_AUTH_PRODUCTION_FIXTURE_ENABLE; },
    () => { process.env.WAO_ADMIN_AUTH_PRODUCTION_FIXTURE_ENABLE = '0'; },
    () => { process.env.WAO_ADMIN_AUTH_DEV_FIXTURE_ENABLE = '0'; },
    () => { process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ENABLE = '0'; },
    () => { delete process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ROOT; },
    () => { process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ROOT = '/tmp/wao-client-auth-ui-other'; },
    () => { process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_AUDIT_ROOT = '/tmp/wao-client-auth-audit-other/child'; },
    () => { delete process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_AUDIT_ROOT; },
    () => { delete process.env.WAO_ADMIN_AUTH_PRODUCTION_FIXTURE_TOKEN; },
    () => { process.env.WAO_ADMIN_AUTH_PRODUCTION_FIXTURE_TOKEN = 'b'.repeat(64); },
    () => { process.env.ADMIN_SECRET = 'live-secret'; },
    () => { process.env.ADMIN_USERNAME = 'live-user'; },
    () => { process.env.ADMIN_PASSWORD = 'live-password'; },
  ];
  for (const mutate of deniedMutations) {
    configureValidProductionFixture();
    mutate();
    assert.equal(await fixtureAccess(), null);
  }

  for (const token of ['', 'a'.repeat(63), 'A'.repeat(64), 'g'.repeat(64), 'b'.repeat(64), ADMIN_CLIENT_FIXTURE_TOKEN]) {
    configureValidProductionFixture();
    assert.equal(await fixtureAccess(token), null);
  }
  for (const pathname of ['/admin/clients/', '/admin/clients/other', '/admin/podcast-titles']) {
    configureValidProductionFixture();
    assert.equal(await fixtureAccess(productionToken, pathname), null);
  }
  for (const root of ['', '/tmp/wao-client-auth-ui-other', '/tmp/wao-client-auth-ui-admin-auth-test/child']) {
    configureValidProductionFixture();
    assert.equal(await fixtureAccess(productionToken, '/admin/clients', root), null);
  }
});

test('production synthetic capability accepts only direct valid IPv4 loopback hosts', async (t) => {
  withEnvironment(t);
  configureValidProductionFixture();

  for (const host of [null, '', 'localhost:3110', '[::1]:3110', '127.0.0.1', '127.0.0.1:3109', '127.0.0.1:3200', '127.0.0.1:03110', '127.0.0.1:3110:80', 'public.example:3110', 'evil.example,127.0.0.1:3110']) {
    assert.equal(await fixtureAccess(productionToken, '/admin/clients', fixtureRoot, host), null);
  }
});

test('fixture tokens never pass live verification and live authorization remains delegated', async (t) => {
  withEnvironment(t);
  configureValidProductionFixture();

  assert.equal(await verifyAdminToken(ADMIN_CLIENT_FIXTURE_TOKEN), false);
  assert.equal(await verifyAdminToken(productionToken), false);

  process.env.ADMIN_SECRET = 'live-secret';
  const liveToken = await createAdminToken();
  assert.equal(await verifyAdminClientFixtureAccess(liveToken, '/admin/clients', fixtureRoot, loopbackHost), 'live');
});
