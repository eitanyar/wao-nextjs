import test from 'node:test';
import assert from 'node:assert/strict';
import { deliveryModelOptions, deliveryModelFollowUp } from './delivery-model.js';

test('offers every universal delivery model before business questions', () => {
  assert.deepEqual(deliveryModelOptions.map(option => option.value), [
    'field', 'location', 'remote', 'mixed',
  ]);
});

test('moves from delivery selection to the main-service question', () => {
  assert.match(deliveryModelFollowUp('field'), /איזה שירות/);
  assert.match(deliveryModelFollowUp('location'), /איזה שירות/);
  assert.match(deliveryModelFollowUp('remote'), /איזה שירות/);
  assert.match(deliveryModelFollowUp('mixed'), /איזה שירות/);
});
