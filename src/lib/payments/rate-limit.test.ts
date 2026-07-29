import test from 'node:test';
import assert from 'node:assert';
import { checkRateLimit, resetRateLimitState } from './rate-limit';

test.beforeEach(() => resetRateLimitState());

test('allows requests under the limit', () => {
  const key = 'user@example.com';
  const opts = { maxRequests: 3, windowMs: 60_000 };

  assert.strictEqual(checkRateLimit(key, opts).allowed, true);
  assert.strictEqual(checkRateLimit(key, opts).allowed, true);
  assert.strictEqual(checkRateLimit(key, opts).allowed, true);
});

test('blocks requests once the limit is exceeded within the window', () => {
  const key = 'user@example.com';
  const opts = { maxRequests: 3, windowMs: 60_000 };

  checkRateLimit(key, opts);
  checkRateLimit(key, opts);
  checkRateLimit(key, opts);
  const fourth = checkRateLimit(key, opts);

  assert.strictEqual(fourth.allowed, false);
  assert.ok(fourth.retryAfterMs > 0);
});

test('different keys have independent limits', () => {
  const opts = { maxRequests: 1, windowMs: 60_000 };
  assert.strictEqual(checkRateLimit('a@example.com', opts).allowed, true);
  assert.strictEqual(checkRateLimit('b@example.com', opts).allowed, true);
  assert.strictEqual(checkRateLimit('a@example.com', opts).allowed, false);
});
