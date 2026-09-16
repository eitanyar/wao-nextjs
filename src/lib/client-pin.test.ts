import assert from 'node:assert/strict';
import test from 'node:test';
import { hashClientPin, validateClientPinPolicy, verifyClientPin } from './client-pin';

test('client PIN policy accepts bounded non-sequential ASCII digits', () => {
  assert.equal(validateClientPinPolicy('482951'), true);
  assert.equal(validateClientPinPolicy('482951123456'), true);
  assert.equal(validateClientPinPolicy('48295'), false);
  assert.equal(validateClientPinPolicy('4829511234567'), false);
  assert.equal(validateClientPinPolicy('111111'), false);
  assert.equal(validateClientPinPolicy('123456'), false);
  assert.equal(validateClientPinPolicy('654321'), false);
  assert.equal(validateClientPinPolicy('12a456'), false);
});

test('client PIN hashes use unique salts and verify only the matching PIN', async () => {
  const first = await hashClientPin('482951');
  const second = await hashClientPin('482951');
  assert.notEqual(first, second);
  assert.equal(await verifyClientPin('482951', first), true);
  assert.equal(await verifyClientPin('482952', first), false);
  assert.equal(await verifyClientPin('482951', 'invalid'), false);
});
