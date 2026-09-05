import assert from 'node:assert/strict';
import test from 'node:test';

import { handleAutonomousCycleRequest } from './autonomous-cycle-route';

test('autonomous-cycle route rejects a request without CRON_SECRET authorization', async () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = 'test-secret';
  try {
    const response = await handleAutonomousCycleRequest(new Request('http://localhost/api/google-ads/autonomous-cycle', { method: 'POST' }));
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'Unauthorized' });
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});

test('autonomous-cycle route returns a mocked authorized batch summary', async () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = 'test-secret';
  try {
    const response = await handleAutonomousCycleRequest(
      new Request('http://localhost/api/google-ads/autonomous-cycle', { method: 'POST', headers: { authorization: 'Bearer test-secret' } }),
      async () => ({ ranAt: '2026-09-04T00:00:00.000Z', clients: [{ clientId: 'client-a', status: 'ok', actions: [] }] }),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, ranAt: '2026-09-04T00:00:00.000Z', clients: [{ clientId: 'client-a', status: 'ok', actions: [] }] });
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});
