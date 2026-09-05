import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createLeadsStore } from './leadsStore';
import { runPendingLeadResponses } from './lead-response';

const client = {
  clientId: 'client-a',
  siteUrl: 'https://example.test',
  leadResponseEnabled: true,
  leadResponseTemplateName: 'lead_first_response',
  leadResponseTemplateLanguage: 'en',
};
const index = {
  clientId: 'client-a',
  primarySlug: 'campaign-a',
  primaryCustomerId: 'customer-a',
  primaryCampaignId: 'campaign-a-id',
  updatedAt: '2026-09-04T00:00:00.000Z',
  campaigns: [{ slug: 'campaign-a', customerId: 'customer-a', campaignId: 'campaign-a-id', createdAt: '2026-09-04T00:00:00.000Z' }],
};

function lead(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    type: 'form',
    phone: '0501234567',
    contactConsentAt: '2026-09-04T00:00:00.000Z',
    slug: 'campaign-a',
    firstResponseStatus: 'pending' as const,
    firstResponseAttempts: 0,
    ...overrides,
  };
}

async function withStore(run: (store: ReturnType<typeof createLeadsStore>) => Promise<void>) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'wao-lead-response-'));
  try {
    await run(createLeadsStore({ baseDir: directory }));
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

function dependencies(store: ReturnType<typeof createLeadsStore>, sendTemplate: () => Promise<{ messageId: string }>) {
  return {
    store,
    listClients: () => ['client-a'],
    loadClient: () => client,
    loadClientIndex: () => index,
    sendTemplate,
    now: () => new Date('2026-09-04T00:01:00.000Z'),
  };
}

test('sends one consented owned form lead and records the provider result', async () => {
  await withStore(async store => {
    await store.writeLeads([lead(1)]);
    let sends = 0;
    const result = await runPendingLeadResponses(dependencies(store, async () => {
      sends += 1;
      return { messageId: 'provider-message-id' };
    }));

    assert.deepEqual(result, { sent: 1, failed: 0, skipped: 0, alreadyClaimed: 0 });
    assert.equal(sends, 1);
    const [stored] = await store.readLeads();
    assert.equal(stored.firstResponseStatus, 'sent');
    assert.equal(stored.firstResponseProvider, 'whatsapp_cloud');
    assert.equal(stored.firstResponseProviderMessageId, 'provider-message-id');
  });
});

test('overlapping workers claim a lead once before provider I/O', async () => {
  await withStore(async store => {
    await store.writeLeads([lead(2)]);
    let release!: () => void;
    const waiting = new Promise<void>(resolve => { release = resolve; });
    let sends = 0;
    const first = runPendingLeadResponses(dependencies(store, async () => {
      sends += 1;
      await waiting;
      return { messageId: 'provider-message-id' };
    }));
    while (sends === 0) await new Promise(resolve => setTimeout(resolve, 1));
    const second = await runPendingLeadResponses(dependencies(store, async () => ({ messageId: 'unexpected' })));
    release();
    const firstResult = await first;

    assert.equal(firstResult.sent, 1);
    assert.deepEqual(second, { sent: 0, failed: 0, skipped: 0, alreadyClaimed: 1 });
    assert.equal(sends, 1);
  });
});

test('does not send consentless, click-stub, or unowned leads', async () => {
  await withStore(async store => {
    await store.writeLeads([
      lead(3, { contactConsentAt: undefined }),
      lead(4, { type: 'whatsapp-click' }),
      lead(5, { slug: 'unknown-campaign' }),
    ]);
    let sends = 0;
    const result = await runPendingLeadResponses(dependencies(store, async () => {
      sends += 1;
      return { messageId: 'unexpected' };
    }));

    assert.deepEqual(result, { sent: 0, failed: 0, skipped: 3, alreadyClaimed: 0 });
    assert.equal(sends, 0);
    const stored = await store.readLeads();
    assert.equal(stored[0].firstResponseStatus, 'not_eligible');
    assert.equal(stored[1].firstResponseStatus, 'not_eligible');
    assert.equal(stored[2].firstResponseStatus, 'not_eligible');
  });
});

test('records sanitized provider errors and stops retrying after three attempts', async () => {
  await withStore(async store => {
    await store.writeLeads([lead(6)]);
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const result = await runPendingLeadResponses(dependencies(store, async () => {
        throw new Error('provider failure\nwith unsafe details');
      }));
      assert.equal(result.failed, 1);
      const [stored] = await store.readLeads();
      assert.equal(stored.firstResponseStatus, 'failed');
      assert.equal(stored.firstResponseAttempts, attempt);
      assert.doesNotMatch(stored.firstResponseLastError ?? '', /\n/);
    }
    const result = await runPendingLeadResponses(dependencies(store, async () => ({ messageId: 'unexpected' })));
    assert.deepEqual(result, { sent: 0, failed: 0, skipped: 1, alreadyClaimed: 0 });
    const [stored] = await store.readLeads();
    assert.equal(stored.firstResponseStatus, 'failed');
    assert.equal(stored.firstResponseAttempts, 3);
  });
});
