import test from 'node:test';
import assert from 'node:assert/strict';
import { PORTFOLIO_SCHEMA_VERSION, transitionSiteLifecycle } from './types';
import type { OwnershipModel, SiteLifecycle } from './types';

test('portfolio contracts expose the restricted lifecycle and ownership literals', () => {
  const ownership: OwnershipModel = 'wao_owned';
  const lifecycle: SiteLifecycle = 'approved_for_build';
  assert.equal(PORTFOLIO_SCHEMA_VERSION, 1);
  assert.deepEqual([ownership, lifecycle], ['wao_owned', 'approved_for_build']);
});

test('portfolio lifecycle rejects transitions that bypass approval gates', () => {
  assert.equal(transitionSiteLifecycle('candidate', 'researching'), 'researching');
  assert.throws(() => transitionSiteLifecycle('candidate', 'live'), /Invalid portfolio lifecycle transition/);
  assert.throws(() => transitionSiteLifecycle('live', 'approved_for_content'), /Invalid portfolio lifecycle transition/);
});
