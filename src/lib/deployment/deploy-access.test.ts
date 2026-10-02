import assert from 'node:assert/strict';
import test from 'node:test';

import { isSafeDeploymentSlug } from './deploy-access';

test('isSafeDeploymentSlug accepts lowercase DNS-safe slugs at the allowed boundaries', () => {
  assert.equal(isSafeDeploymentSlug('abc'), true);
  assert.equal(isSafeDeploymentSlug('northstar-plumbing'), true);
  assert.equal(isSafeDeploymentSlug(`a${'1'.repeat(38)}b`), true);
});

test('isSafeDeploymentSlug rejects unsafe values and malformed DNS labels', () => {
  for (const value of [
    '',
    'ab',
    'Uppercase',
    'contains space',
    'two--hyphens',
    '-leading',
    'trailing-',
    '../escape',
    'path/name',
    'name.value',
    'quote"value',
    'shell;value',
    `a${'1'.repeat(39)}b`,
    null,
    42,
  ]) {
    assert.equal(isSafeDeploymentSlug(value), false, String(value));
  }
});


