import test from 'node:test';
import assert from 'node:assert/strict';
import { siteBaseUrl } from './siteBaseUrl';
import { buildCancelUrl } from './payments/subscriptions';
import { accountPageUrl } from './site-bot/cancelNotices';

test('siteBaseUrl: env value without trailing slashes, else the canonical origin (never localhost)', () => {
  assert.equal(siteBaseUrl({}), 'https://www.wao.co.il');
  assert.equal(siteBaseUrl({ NEXT_PUBLIC_BASE_URL: '' }), 'https://www.wao.co.il');
  assert.equal(siteBaseUrl({ NEXT_PUBLIC_BASE_URL: 'https://staging.example.test//' }), 'https://staging.example.test');
});

test('manage-link and cancel-notice emails share one origin', () => {
  const saved = process.env.NEXT_PUBLIC_BASE_URL;
  try {
    for (const value of [undefined, 'https://staging.example.test/']) {
      if (value === undefined) delete process.env.NEXT_PUBLIC_BASE_URL; else process.env.NEXT_PUBLIC_BASE_URL = value;
      const manage = new URL(buildCancelUrl('tok'));
      const cancel = new URL(accountPageUrl());
      assert.equal(manage.origin, cancel.origin);
      assert.equal(manage.origin, siteBaseUrl());
      assert.equal(manage.pathname, '/account/subscription');
    }
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_BASE_URL; else process.env.NEXT_PUBLIC_BASE_URL = saved;
  }
});
