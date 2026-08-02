import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseConversionActionId,
  resolveDataManagerRefreshToken,
  getDataManagerAccessToken,
  sendConversionEvent,
} from './data-manager-events.js';

// Priority 4 spec §6.1 items 1–3.
test('parseConversionActionId extracts the numeric conversion-action ID from a resource-name string', () => {
  assert.equal(
    parseConversionActionId('customers/1725891566/conversionActions/7705676785'),
    '7705676785'
  );
});

test('parseConversionActionId(null) returns null without throwing', () => {
  assert.equal(parseConversionActionId(null), null);
});

test('parseConversionActionId returns null (not a throw) on a malformed resource name', () => {
  assert.equal(parseConversionActionId('not-a-resource-name'), null);
});

// Priority 4 spec §6.1 item 10.
test('resolveDataManagerRefreshToken falls back from the test-mode var to the general var', () => {
  const prevTest = process.env.GOOGLE_DATAMANAGER_TEST_REFRESH_TOKEN;
  const prevGeneral = process.env.GOOGLE_DATAMANAGER_REFRESH_TOKEN;
  try {
    delete process.env.GOOGLE_DATAMANAGER_TEST_REFRESH_TOKEN;
    process.env.GOOGLE_DATAMANAGER_REFRESH_TOKEN = 'general-token';
    assert.equal(resolveDataManagerRefreshToken('test'), 'general-token');

    process.env.GOOGLE_DATAMANAGER_TEST_REFRESH_TOKEN = 'test-specific-token';
    assert.equal(resolveDataManagerRefreshToken('test'), 'test-specific-token');

    assert.equal(resolveDataManagerRefreshToken('live'), 'general-token');
  } finally {
    if (prevTest === undefined) delete process.env.GOOGLE_DATAMANAGER_TEST_REFRESH_TOKEN;
    else process.env.GOOGLE_DATAMANAGER_TEST_REFRESH_TOKEN = prevTest;
    if (prevGeneral === undefined) delete process.env.GOOGLE_DATAMANAGER_REFRESH_TOKEN;
    else process.env.GOOGLE_DATAMANAGER_REFRESH_TOKEN = prevGeneral;
  }
});

// Priority 4 spec §6.1 item 9.
test('getDataManagerAccessToken maps a failed OAuth exchange (e.g. invalid_grant) to an error result, no throw', async () => {
  const prevClientId = process.env.GOOGLE_DATAMANAGER_CLIENT_ID;
  const prevClientSecret = process.env.GOOGLE_DATAMANAGER_CLIENT_SECRET;
  process.env.GOOGLE_DATAMANAGER_CLIENT_ID = 'test-client-id';
  process.env.GOOGLE_DATAMANAGER_CLIENT_SECRET = 'test-client-secret';

  let calls = 0;
  const fetchImpl = async (url) => {
    calls += 1;
    assert.equal(url, 'https://oauth2.googleapis.com/token');
    return {
      ok: false,
      status: 400,
      json: async () => ({ error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }),
    };
  };

  const result = await getDataManagerAccessToken('a-refresh-token', fetchImpl);
  assert.equal(calls, 1);
  assert.deepEqual(result, { error: 'Token has been expired or revoked.', status: 400 });

  if (prevClientId === undefined) delete process.env.GOOGLE_DATAMANAGER_CLIENT_ID;
  else process.env.GOOGLE_DATAMANAGER_CLIENT_ID = prevClientId;
  if (prevClientSecret === undefined) delete process.env.GOOGLE_DATAMANAGER_CLIENT_SECRET;
  else process.env.GOOGLE_DATAMANAGER_CLIENT_SECRET = prevClientSecret;
});

test('getDataManagerAccessToken succeeds and returns the access token', async () => {
  process.env.GOOGLE_DATAMANAGER_CLIENT_ID = 'test-client-id';
  process.env.GOOGLE_DATAMANAGER_CLIENT_SECRET = 'test-client-secret';

  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ access_token: 'ya29.mocked-access-token' }),
  });

  const result = await getDataManagerAccessToken('a-refresh-token', fetchImpl);
  assert.deepEqual(result, { accessToken: 'ya29.mocked-access-token' });
});

// Priority 4 spec §6.1 item 6.
test('sendConversionEvent builds the events:ingest request shape from §1 and maps a clean 200 to ok:true', async () => {
  let capturedUrl;
  let capturedInit;
  const fetchImpl = async (url, init) => {
    capturedUrl = url;
    capturedInit = init;
    return {
      ok: true,
      status: 200,
      json: async () => ({ requestId: 'req-abc-123' }),
    };
  };

  const result = await sendConversionEvent({
    accessToken: 'ya29.mocked',
    mccId: '1234567890',
    customerId: '1725891566',
    productDestinationId: '7705676785',
    clickId: { gclid: 'Cj0KCQ-mocked-gclid' },
    transactionId: 'order-42',
    eventTimestamp: '2026-08-02T14:30:00+03:00',
    conversionValue: 650,
    fetchImpl,
  });

  assert.equal(capturedUrl, 'https://datamanager.googleapis.com/v1/events:ingest');
  assert.equal(capturedInit.headers.Authorization, 'Bearer ya29.mocked');
  const body = JSON.parse(capturedInit.body);
  assert.equal(body.destinations[0].operatingAccount.accountId, '1725891566');
  assert.equal(body.destinations[0].loginAccount.accountId, '1234567890');
  assert.equal(body.destinations[0].productDestinationId, '7705676785');
  assert.deepEqual(body.events[0].adIdentifiers, { gclid: 'Cj0KCQ-mocked-gclid' });
  assert.equal(body.events[0].transactionId, 'order-42');
  assert.equal(body.events[0].conversionValue, 650);
  assert.equal(body.events[0].currency, 'ILS');
  // Confirmed empirically against the live sandbox (2026-08-02) that
  // `events:ingest` rejects the request without this, despite Google's docs
  // currently still listing it as optional — regression guard.
  assert.equal(body.events[0].eventSource, 'WEB');

  assert.deepEqual(result, { ok: true, requestId: 'req-abc-123' });
});

// Priority 4 spec §6.1 item 7.
test('sendConversionEvent maps a 200 response with fieldWarnings to the same partial-failure shape callers already handle', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ fieldWarnings: [{ field: 'conversionValue', description: 'unusually high' }] }),
  });

  const result = await sendConversionEvent({
    accessToken: 'ya29.mocked',
    mccId: '1234567890',
    customerId: '1725891566',
    productDestinationId: '7705676785',
    clickId: { gclid: 'Cj0KCQ-mocked-gclid' },
    transactionId: 'order-42',
    eventTimestamp: '2026-08-02T14:30:00+03:00',
    conversionValue: 650,
    fetchImpl,
  });

  assert.equal(result.ok, false);
  assert.equal(result.fieldWarnings, true);
  assert.ok(result.body?.fieldWarnings);
});

// Priority 4 spec §6.1 item 8.
test('sendConversionEvent maps a non-2xx response (e.g. 401) to an error result, no throw', async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: { message: 'Request had invalid authentication credentials.' } }),
  });

  const result = await sendConversionEvent({
    accessToken: 'expired-token',
    mccId: '1234567890',
    customerId: '1725891566',
    productDestinationId: '7705676785',
    clickId: { gclid: 'Cj0KCQ-mocked-gclid' },
    transactionId: 'order-42',
    eventTimestamp: '2026-08-02T14:30:00+03:00',
    conversionValue: 650,
    fetchImpl,
  });

  assert.deepEqual(result, {
    ok: false,
    fieldWarnings: false,
    error: 'Request had invalid authentication credentials.',
    status: 401,
  });
});

test('sendConversionEvent maps a network-level throw to an error result, no throw', async () => {
  const fetchImpl = async () => {
    throw new Error('getaddrinfo ENOTFOUND datamanager.googleapis.com');
  };

  const result = await sendConversionEvent({
    accessToken: 'ya29.mocked',
    mccId: '1234567890',
    customerId: '1725891566',
    productDestinationId: '7705676785',
    clickId: { gclid: 'Cj0KCQ-mocked-gclid' },
    transactionId: 'order-42',
    eventTimestamp: '2026-08-02T14:30:00+03:00',
    conversionValue: 650,
    fetchImpl,
  });

  assert.equal(result.ok, false);
  assert.equal(result.fieldWarnings, false);
  assert.equal(result.status, 502);
  assert.match(result.error, /ENOTFOUND/);
});
