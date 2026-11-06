import assert from 'node:assert/strict';
import test from 'node:test';

import { completePaidCheckoutResearch } from './researchCompletion';

test('paid checkout completes the reachable research contract without attempting deployment', async () => {
  let removed = false;
  let researchCalls = 0;
  const response = await completePaidCheckoutResearch({
    sessionId: 'checkout-123',
    runResearch: async () => {
      researchCalls += 1;
      return { dossier: { status: 'needs_input', humanGates: [{ status: 'pending' }, { status: 'approved' }] } };
    },
    openResearchGateCount: 2,
    removePending: () => { removed = true; },
  });

  assert.equal(researchCalls, 1);
  assert.equal(removed, true);
  assert.deepEqual(response, {
    success: true,
    charged: true,
    researchId: 'checkout-123',
    status: 'needs_input',
    openGateCount: 3,
  });
  assert.equal('url' in response, false);
  assert.equal('slug' in response, false);
  assert.equal('collectedData' in response, false);
  assert.equal('statusUrl' in response, false);
  assert.equal('openResearchGates' in response, false);
});

test('paid checkout carries supplied collected data and open gates without changing them', async () => {
  const collectedData = { businessName: 'Fixture Business', priorityServices: ['Service A'] };
  const openResearchGates = [{ id: 'checkout-123:geography:digest', type: 'geography' as const, evidenceDigest: 'digest' }];
  const originalData = structuredClone(collectedData);
  const originalGates = structuredClone(openResearchGates);
  const response = await completePaidCheckoutResearch({
    sessionId: 'checkout-123',
    runResearch: async () => ({ dossier: { status: 'architecture_ready', humanGates: [] } }),
    openResearchGateCount: openResearchGates.length,
    collectedData,
    openResearchGates,
    removePending: () => {},
  });

  assert.strictEqual(response.collectedData, collectedData);
  assert.strictEqual(response.openResearchGates, openResearchGates);
  assert.deepEqual(collectedData, originalData);
  assert.deepEqual(openResearchGates, originalGates);
  assert.equal('url' in response, false);
  assert.equal('slug' in response, false);
  assert.equal('statusUrl' in response, false);
});

test('paid checkout retains its pending record when research cannot complete', async () => {
  let removed = false;
  await assert.rejects(
    completePaidCheckoutResearch({
      sessionId: 'checkout-123',
      runResearch: async () => { throw new Error('research unavailable'); },
      openResearchGateCount: 0,
      removePending: () => { removed = true; },
    }),
    /research unavailable/
  );
  assert.equal(removed, false);
});
