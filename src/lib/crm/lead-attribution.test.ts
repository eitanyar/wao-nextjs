import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { deriveLeadAttribution } from './lead-attribution';
import { captureLead } from './lead-capture';
import { createLeadsStore } from './leadsStore';

test('click identifiers take precedence over explicit organic and GBP signals', () => {
  assert.deepEqual(
    deriveLeadAttribution({
      gclid: 'paid-click',
      utmSource: 'google_business_profile',
      utmMedium: 'organic',
      landingReferrer: 'https://www.google.com/search?q=service',
    }),
    { acquisitionChannel: 'google_ads', attributionConfidence: 'high' }
  );
});

test('explicit GBP UTM and Google referrer map to their named channels', () => {
  assert.deepEqual(
    deriveLeadAttribution({ utmSource: 'gbp', utmMedium: 'listing' }),
    { acquisitionChannel: 'google_business_profile', attributionConfidence: 'high' }
  );
  assert.deepEqual(
    deriveLeadAttribution({ landingReferrer: 'https://www.google.co.il/search?q=service' }),
    { acquisitionChannel: 'organic_search', attributionConfidence: 'high' }
  );
});

test('consented form lead is stored as pending in an injected temporary store', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'wao-leads-'));
  const store = createLeadsStore({ baseDir: directory });
  try {
    const result = captureLead({
      leads: [],
      body: {
        orderId: 'consented-form',
        type: 'form',
        phone: '0500000000',
        contactConsentAt: '2026-09-04T00:00:00.000Z',
        utmSource: 'google',
        utmMedium: 'organic',
      },
      now: new Date('2026-09-04T00:01:00.000Z'),
    });

    await store.writeLeads([result.lead]);
    const [stored] = await store.readLeads();
    assert.equal(stored.contactConsentAt, '2026-09-04T00:00:00.000Z');
    assert.equal(stored.firstResponseStatus, 'pending');
    assert.equal(stored.firstResponseAttempts, 0);
    assert.equal(stored.acquisitionChannel, 'organic_search');
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('click stubs are never response eligible', () => {
  const result = captureLead({
    leads: [],
    body: {
      orderId: 'click-stub',
      type: 'phone-click',
      phone: '0500000000',
      contactConsentAt: '2026-09-04T00:00:00.000Z',
      gclid: 'paid-click',
    },
    now: new Date('2026-09-04T00:01:00.000Z'),
  });

  assert.equal(result.lead.firstResponseStatus, 'not_eligible');
});

test('ambiguous attribution is unknown rather than inferred organic', () => {
  assert.deepEqual(
    deriveLeadAttribution({ utmSource: 'newsletter', utmMedium: 'email' }),
    { acquisitionChannel: 'unknown', attributionConfidence: 'low' }
  );
});

test('order id retries preserve the original lifecycle state', () => {
  const first = captureLead({
    leads: [],
    body: {
      orderId: 'retry-order',
      type: 'form',
      phone: '0500000000',
      contactConsentAt: '2026-09-04T00:00:00.000Z',
    },
    now: new Date('2026-09-04T00:01:00.000Z'),
  });
  const retry = captureLead({
    leads: [first.lead],
    body: { orderId: 'retry-order', type: 'phone-click', gclid: 'later-click' },
    now: new Date('2026-09-04T00:02:00.000Z'),
  });

  assert.equal(retry.created, false);
  assert.equal(retry.lead, first.lead);
  assert.equal(retry.lead.firstResponseStatus, 'pending');
});
