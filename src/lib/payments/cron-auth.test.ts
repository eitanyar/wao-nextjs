import test from 'node:test';
import assert from 'node:assert';

import { isCronAuthorized } from './cron-auth';

function makeReq(headers: Record<string, string> = {}): Request {
  return new Request('https://example.test/api/subscriptions/cron/charge', { method: 'POST', headers });
}

test('isCronAuthorized: rejects when CRON_SECRET is not configured at all (fails closed)', () => {
  delete process.env.CRON_SECRET;
  const req = makeReq({ authorization: 'Bearer whatever' });
  assert.strictEqual(isCronAuthorized(req), false);
});

test('isCronAuthorized: rejects a request with no Authorization header', () => {
  process.env.CRON_SECRET = 'test-secret';
  const req = makeReq();
  assert.strictEqual(isCronAuthorized(req), false);
});

test('isCronAuthorized: rejects a wrong bearer token', () => {
  process.env.CRON_SECRET = 'test-secret';
  const req = makeReq({ authorization: 'Bearer wrong-token' });
  assert.strictEqual(isCronAuthorized(req), false);
});

test('isCronAuthorized: rejects a non-Bearer scheme', () => {
  process.env.CRON_SECRET = 'test-secret';
  const req = makeReq({ authorization: 'Basic test-secret' });
  assert.strictEqual(isCronAuthorized(req), false);
});

test('isCronAuthorized: accepts the correct bearer token', () => {
  process.env.CRON_SECRET = 'test-secret';
  const req = makeReq({ authorization: 'Bearer test-secret' });
  assert.strictEqual(isCronAuthorized(req), true);
});
