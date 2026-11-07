import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutCallbackOutcome, checkoutInitSessionId, customerErrorText, readJsonBody } from './customerError';

// Synthetic Hebrew-letter test string built from code points (not copy).
const HEBREW_SAMPLE = '\u05D0\u05D1\u05D2';
const FALLBACK = 'fallback-generic';
const UUID = '123e4567-e89b-42d3-a456-426614174000';

const response = (body: string) => ({ json: async () => JSON.parse(body) });

test('B9: a non-2xx callback is always an error, never done, whatever the body says', () => {
  const gatesBody = { success: true, researchId: 'r-1', collectedData: { businessNiche: 'x' }, openResearchGates: [{ id: 'g' }] };
  for (const body of [{}, { success: true }, gatesBody, { success: true, charged: true, status: 'architecture_ready' }]) {
    assert.deepEqual(checkoutCallbackOutcome(false, body), { kind: 'error' }, JSON.stringify(body));
  }
  for (const body of [{}, { success: false }, { success: 'true' }, { success: 1 }, { error: 'checkout_unavailable' }]) {
    assert.deepEqual(checkoutCallbackOutcome(true, body), { kind: 'error' }, JSON.stringify(body));
  }
  assert.deepEqual(checkoutCallbackOutcome(true, { success: true }), { kind: 'done' });
  assert.deepEqual(checkoutCallbackOutcome(true, { ...gatesBody, openResearchGates: [] }), { kind: 'done' });
  assert.deepEqual(checkoutCallbackOutcome(true, gatesBody), {
    kind: 'gates', researchId: 'r-1', collectedData: { businessNiche: 'x' }, openResearchGates: [{ id: 'g' }],
  });
});

test('B10: init navigates only for a 2xx with a UUID session ID', () => {
  assert.equal(checkoutInitSessionId(true, { sessionId: UUID }), UUID);
  for (const [ok, body] of [
    [false, { sessionId: UUID }],
    [true, {}],
    [true, { sessionId: undefined }],
    [true, { sessionId: 'undefined' }],
    [true, { sessionId: '' }],
    [true, { sessionId: 42 }],
    [true, { sessionId: '../admin' }],
    [true, { sessionId: `${UUID}/x` }],
  ] as const) {
    assert.equal(checkoutInitSessionId(ok, body), null, JSON.stringify([ok, body]));
  }
});

test('customer error text shows only existing Hebrew server copy, else the fallback', () => {
  assert.equal(customerErrorText(HEBREW_SAMPLE, FALLBACK), HEBREW_SAMPLE);
  for (const raw of ['checkout_unavailable', 'unauthorized', 'Failed to fetch', 'Unexpected token < in JSON', '', undefined, null, 503, {}]) {
    assert.equal(customerErrorText(raw, FALLBACK), FALLBACK, String(raw));
  }
});

test('non-JSON and non-object bodies read as an empty object', async () => {
  assert.deepEqual(await readJsonBody(response('<html>502 Bad Gateway</html>')), {});
  assert.deepEqual(await readJsonBody(response('')), {});
  assert.deepEqual(await readJsonBody(response('[1]')), {});
  assert.deepEqual(await readJsonBody(response('null')), {});
  assert.deepEqual(await readJsonBody(response('{"error":"checkout_unavailable"}')), { error: 'checkout_unavailable' });
});
