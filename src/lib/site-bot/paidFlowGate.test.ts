import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdminToken } from '../admin-auth';
import { isPaidFlowAllowed, isPaidFlowAllowedForRequest, isPaidFlowCallbackAllowed, paidFlowMode } from './paidFlowGate';

// Runtime paid-flow gate (launch rehearsal runbook 2026-11-13): unset = closed, 'rehearsal' = admin
// cookie only, 'open' = public; legacy '1' opens only off-production. Read per call, never cached.

const environment = process.env as Record<string, string | undefined>;
const keys = ['SITE_BOT_PAID_FLOW', 'NODE_ENV', 'ADMIN_SECRET'] as const;

function withEnvironment(t: test.TestContext, values: Partial<Record<(typeof keys)[number], string>>): void {
  const previous = Object.fromEntries(keys.map(key => [key, environment[key]]));
  t.after(() => {
    for (const key of keys) {
      if (previous[key] === undefined) delete environment[key];
      else environment[key] = previous[key];
    }
  });
  for (const key of keys) {
    if (values[key] === undefined) delete environment[key];
    else environment[key] = values[key];
  }
}

const CLOSED: Array<Record<string, string | undefined>> = [
  {},
  { NODE_ENV: 'production' },
  { NODE_ENV: 'development' },
  { SITE_BOT_PAID_FLOW: '1', NODE_ENV: 'production' },
  { SITE_BOT_PAID_FLOW: '', NODE_ENV: 'development' },
  { SITE_BOT_PAID_FLOW: '0', NODE_ENV: 'development' },
  { SITE_BOT_PAID_FLOW: 'true', NODE_ENV: 'production' },
  { SITE_BOT_PAID_FLOW: ' 1', NODE_ENV: 'development' },
  { SITE_BOT_PAID_FLOW: 'OPEN', NODE_ENV: 'production' },
  { SITE_BOT_PAID_FLOW: 'open ', NODE_ENV: 'production' },
  { SITE_BOT_PAID_FLOW: 'Rehearsal', NODE_ENV: 'production' },
  { SITE_BOT_PAID_FLOW: 'closed', NODE_ENV: 'production' },
];

test('paidFlowMode: unset and unrecognised values are closed; legacy 1 is closed in production', () => {
  for (const env of CLOSED) assert.equal(paidFlowMode(env), 'closed', JSON.stringify(env));
});

test('paidFlowMode: rehearsal and open in any NODE_ENV; legacy 1 opens only off-production', () => {
  for (const NODE_ENV of ['production', 'development', 'test', undefined]) {
    assert.equal(paidFlowMode({ SITE_BOT_PAID_FLOW: 'rehearsal', NODE_ENV }), 'rehearsal');
    assert.equal(paidFlowMode({ SITE_BOT_PAID_FLOW: 'open', NODE_ENV }), 'open');
  }
  assert.equal(paidFlowMode({ SITE_BOT_PAID_FLOW: '1', NODE_ENV: 'development' }), 'open');
  assert.equal(paidFlowMode({ SITE_BOT_PAID_FLOW: '1', NODE_ENV: 'test' }), 'open');
  assert.equal(paidFlowMode({ SITE_BOT_PAID_FLOW: '1', NODE_ENV: 'production' }), 'closed');
});

test('paidFlowMode reads process.env at call time (a switch needs no rebuild or reload)', t => {
  withEnvironment(t, { NODE_ENV: 'production' });
  assert.equal(paidFlowMode(), 'closed');
  environment.SITE_BOT_PAID_FLOW = 'rehearsal';
  assert.equal(paidFlowMode(), 'rehearsal');
  environment.SITE_BOT_PAID_FLOW = 'open';
  assert.equal(paidFlowMode(), 'open');
  delete environment.SITE_BOT_PAID_FLOW;
  assert.equal(paidFlowMode(), 'closed');
});

test('paidFlowMode fails closed when the env object throws', () => {
  const hostile = new Proxy({}, { get: () => { throw new Error('env exploded'); } });
  assert.equal(paidFlowMode(hostile as Record<string, string | undefined>), 'closed');
});

test('isPaidFlowAllowed: open is public, closed is never allowed, even with a valid admin cookie', async t => {
  withEnvironment(t, { ADMIN_SECRET: 'synthetic-admin-secret-for-gate-test' });
  const token = await createAdminToken();
  for (const env of CLOSED) {
    assert.equal(await isPaidFlowAllowed(undefined, env), false, JSON.stringify(env));
    assert.equal(await isPaidFlowAllowed(token, env), false, JSON.stringify(env));
  }
  for (const cookie of [undefined, '', 'forged', token]) {
    assert.equal(await isPaidFlowAllowed(cookie, { SITE_BOT_PAID_FLOW: 'open', NODE_ENV: 'production' }), true);
  }
});

test('isPaidFlowAllowed: rehearsal needs a valid admin token', async t => {
  withEnvironment(t, { ADMIN_SECRET: 'synthetic-admin-secret-for-gate-test' });
  const env = { SITE_BOT_PAID_FLOW: 'rehearsal', NODE_ENV: 'production' };
  const token = await createAdminToken();
  assert.equal(await isPaidFlowAllowed(token, env), true);
  for (const cookie of [undefined, '', 'forged', `${token}x`, `1.${token.split('.')[1]}`, ` ${token}`]) {
    assert.equal(await isPaidFlowAllowed(cookie, env), false, String(cookie));
  }
  // An expired token is refused.
  const [, sig] = token.split('.');
  assert.equal(await isPaidFlowAllowed(`${Date.now() - 1000}.${sig}`, env), false);
});

test('isPaidFlowAllowed: rehearsal fails closed with no ADMIN_SECRET configured', async t => {
  withEnvironment(t, { ADMIN_SECRET: 'synthetic-admin-secret-for-gate-test' });
  const token = await createAdminToken();
  delete environment.ADMIN_SECRET;
  assert.equal(await isPaidFlowAllowed(token, { SITE_BOT_PAID_FLOW: 'rehearsal', NODE_ENV: 'production' }), false);
});

test('isPaidFlowAllowedForRequest: closed and open decide on env alone; rehearsal outside a request fails closed', async t => {
  withEnvironment(t, { NODE_ENV: 'production' });
  assert.equal(await isPaidFlowAllowedForRequest(), false);
  environment.SITE_BOT_PAID_FLOW = 'open';
  assert.equal(await isPaidFlowAllowedForRequest(), true);
  // No request scope here, so cookies() throws; the gate must say no rather than throw.
  environment.SITE_BOT_PAID_FLOW = 'rehearsal';
  assert.equal(await isPaidFlowAllowedForRequest(), false);
});

test('isPaidFlowCallbackAllowed: rehearsal and open (no admin cookie: provider callback), closed otherwise', () => {
  for (const env of CLOSED) assert.equal(isPaidFlowCallbackAllowed(env), false, JSON.stringify(env));
  assert.equal(isPaidFlowCallbackAllowed({ SITE_BOT_PAID_FLOW: 'rehearsal', NODE_ENV: 'production' }), true);
  assert.equal(isPaidFlowCallbackAllowed({ SITE_BOT_PAID_FLOW: 'open', NODE_ENV: 'production' }), true);
  assert.equal(isPaidFlowCallbackAllowed({ SITE_BOT_PAID_FLOW: '1', NODE_ENV: 'development' }), true);
});
