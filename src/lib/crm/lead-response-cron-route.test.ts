import assert from 'node:assert/strict';
import test from 'node:test';
import { handleLeadResponseCronRequest } from './lead-response-cron-route';

test('lead response cron route rejects requests without CRON_SECRET authorization', async () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = 'test-secret';
  try {
    const response = await handleLeadResponseCronRequest(new Request('http://localhost/api/leads/response-cron', { method: 'POST' }));
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'Unauthorized' });
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});

test('lead response cron route returns a mocked authorized worker summary', async () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = 'test-secret';
  try {
    const response = await handleLeadResponseCronRequest(
      new Request('http://localhost/api/leads/response-cron', { method: 'POST', headers: { authorization: 'Bearer test-secret' } }),
      async () => ({ sent: 1, failed: 0, skipped: 2, alreadyClaimed: 3 }),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, sent: 1, failed: 0, skipped: 2, alreadyClaimed: 3 });
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});
