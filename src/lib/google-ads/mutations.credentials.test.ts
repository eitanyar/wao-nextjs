import assert from 'node:assert/strict';
import test from 'node:test';
import { buildClient, resolveAdsAccount, resolveCustomer, resolveCustomerById } from './mutations';

const keys = [
  'GOOGLE_ADS_TEST_REFRESH_TOKEN',
  'GOOGLE_ADS_TEST_MCC_CUSTOMER_ID',
  'GOOGLE_ADS_REFRESH_TOKEN',
  'GOOGLE_ADS_MCC_CUSTOMER_ID',
  'GOOGLE_ADS_SANDBOX_CLIENT_ID',
] as const;

function withSyntheticEnvironment(run: () => void) {
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    for (const key of keys) delete process.env[key];
    process.env.GOOGLE_ADS_REFRESH_TOKEN = 'synthetic-live-token';
    process.env.GOOGLE_ADS_MCC_CUSTOMER_ID = '999-888-7777';
    run();
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

const failOnCustomer = {
  Customer: () => assert.fail('Customer must not be called without a complete test pair'),
} as unknown as ReturnType<typeof buildClient>;

test('test account requires the complete dedicated pair despite populated live credentials', () => withSyntheticEnvironment(() => {
  for (const [testToken, testMcc] of [
    [undefined, undefined],
    [undefined, '111-222-3333'],
    ['', '111-222-3333'],
    ['   ', '111-222-3333'],
    ['synthetic-test-token', undefined],
    ['synthetic-test-token', ''],
    ['synthetic-test-token', '   '],
  ]) {
    if (testToken === undefined) delete process.env.GOOGLE_ADS_TEST_REFRESH_TOKEN;
    else process.env.GOOGLE_ADS_TEST_REFRESH_TOKEN = testToken;
    if (testMcc === undefined) delete process.env.GOOGLE_ADS_TEST_MCC_CUSTOMER_ID;
    else process.env.GOOGLE_ADS_TEST_MCC_CUSTOMER_ID = testMcc;

    assert.throws(() => resolveAdsAccount('test'), /Test mode requires/);
    assert.throws(() => resolveCustomerById('1234567890', 'test', failOnCustomer), /Test mode requires/);
    assert.throws(() => resolveCustomer({ customerId: '1234567890', mode: 'test' } as Parameters<typeof resolveCustomer>[0], failOnCustomer), /Test mode requires/);
  }
}));

test('test pair is used exclusively, with normalized MCC and sandbox client identity', () => withSyntheticEnvironment(() => {
  process.env.GOOGLE_ADS_TEST_REFRESH_TOKEN = 'synthetic-test-token';
  process.env.GOOGLE_ADS_TEST_MCC_CUSTOMER_ID = '111-222-3333';
  const account = resolveAdsAccount('test');
  assert.deepEqual(account, {
    refreshToken: 'synthetic-test-token', mccId: '1112223333', clientId: 'google-ads-sandbox',
  });
  let calls = 0;
  const client = { Customer: (options: unknown) => { calls++; return options; } } as ReturnType<typeof buildClient>;
  assert.deepEqual(resolveCustomerById('1234567890', 'test', client), {
    customer_id: '1234567890', login_customer_id: '1112223333', refresh_token: 'synthetic-test-token',
  });
  assert.equal(calls, 1);
}));

test('live mode retains live-only credentials even when test pair is present', () => withSyntheticEnvironment(() => {
  process.env.GOOGLE_ADS_TEST_REFRESH_TOKEN = 'synthetic-test-token';
  process.env.GOOGLE_ADS_TEST_MCC_CUSTOMER_ID = '111-222-3333';
  assert.deepEqual(resolveAdsAccount('live'), {
    refreshToken: 'synthetic-live-token', mccId: '9998887777', clientId: undefined,
  });
  delete process.env.GOOGLE_ADS_REFRESH_TOKEN;
  assert.throws(() => resolveAdsAccount('live'), /Live mode requires/);
  process.env.GOOGLE_ADS_REFRESH_TOKEN = 'synthetic-live-token';
  delete process.env.GOOGLE_ADS_MCC_CUSTOMER_ID;
  assert.throws(() => resolveAdsAccount('live'), /Live mode requires/);
}));
