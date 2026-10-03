import test from 'node:test';
import assert from 'node:assert/strict';
import { consumePreviewTokenJti, resetTokenConsumptionState } from './token-consumption';

test('jti is consumed once and reset restores availability', () => {
  resetTokenConsumptionState();
  assert.equal(consumePreviewTokenJti('first'), true);
  assert.equal(consumePreviewTokenJti('first'), false);
  assert.equal(consumePreviewTokenJti('second'), true);
  resetTokenConsumptionState();
  assert.equal(consumePreviewTokenJti('first'), true);
});
