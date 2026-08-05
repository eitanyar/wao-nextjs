import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mapEnumeratedCampaignRows,
  computeBlendedCplDisplay,
  type RawEnumeratedCampaignRow,
  type EnumeratedCampaign,
} from './campaign-enumeration';

/**
 * §8.0's worked AAAsada example (5 enabled campaigns) used as the fixture across these tests —
 * confirmed live numbers from docs/specs/priority-3-search-term-cleanup-scoring.md §8.0.
 */
function aasadaRows(): RawEnumeratedCampaignRow[] {
  return [
    {
      campaign: { id: '1', name: 'ערים קרובות', status: 'ENABLED', advertising_channel_type: 'SEARCH' },
      metrics: { cost_micros: String(1094.48 * 1_000_000), all_conversions: '17.75' },
    },
    {
      campaign: { id: '2', name: 'אירועים', status: 'ENABLED', advertising_channel_type: 'SEARCH' },
      metrics: { cost_micros: String(2348.90 * 1_000_000), all_conversions: '10.2' },
    },
    {
      campaign: { id: '3', name: 'ברנד', status: 'ENABLED', advertising_channel_type: 'SEARCH' },
      metrics: { cost_micros: String(24.57 * 1_000_000), all_conversions: '4.5' },
    },
    {
      campaign: {
        id: '24045777050',
        name: 'אזכרות - שבעה - דינאמי',
        status: 'ENABLED',
        advertising_channel_type: 'SEARCH',
        dynamic_search_ads_setting: { domain_name: 'aaasada.com' },
      },
      metrics: { cost_micros: String(2555.57 * 1_000_000), all_conversions: '39.33' },
    },
    {
      campaign: {
        id: '24053311090',
        name: 'שבת חתן - דינאמי',
        status: 'ENABLED',
        advertising_channel_type: 'SEARCH',
      },
      metrics: { cost_micros: String(1429.62 * 1_000_000), all_conversions: '24.5' },
    },
  ];
}

test('mapEnumeratedCampaignRows classifies all 5 AAAsada campaigns per §8.0/§8.2', () => {
  const mapped = mapEnumeratedCampaignRows(aasadaRows(), 'aasada');
  assert.equal(mapped.length, 5);

  const byId = new Map(mapped.map((c) => [c.campaignId, c]));
  assert.equal(byId.get('1')?.type, 'non-brand'); // ערים קרובות
  assert.equal(byId.get('2')?.type, 'non-brand'); // אירועים — the worst-performing campaign
  assert.equal(byId.get('3')?.type, 'brand'); // ברנד
  assert.equal(byId.get('24045777050')?.type, 'seasonal-remarketing'); // אזכרות - שבעה - דינאמי
  assert.equal(byId.get('24053311090')?.type, 'seasonal-remarketing'); // שבת חתן - דינאמי
});

test('mapEnumeratedCampaignRows reads metrics.all_conversions (§8.4), not metrics.conversions', () => {
  const rows: RawEnumeratedCampaignRow[] = [
    {
      campaign: { id: '99', name: 'Test', status: 'ENABLED', advertising_channel_type: 'SEARCH' },
      // @ts-expect-error — deliberately supply the OLD field name to prove it's ignored.
      metrics: { cost_micros: '1000000', conversions: '99' },
    },
  ];
  const mapped = mapEnumeratedCampaignRows(rows, 'aasada');
  assert.equal(mapped[0].conversions, 0); // old field name must not be read at all
});

test('mapEnumeratedCampaignRows computes cpl = spendIls / conversions, undefined at 0 conversions', () => {
  const mapped = mapEnumeratedCampaignRows(aasadaRows(), 'aasada');
  const events = mapped.find((c) => c.campaignId === '2')!; // אירועים
  assert.ok(events.cpl !== undefined);
  assert.ok(Math.abs(events.cpl! - 230.19) < 0.5); // §8.0's worked ₪230.19/lead

  const zeroConv = mapEnumeratedCampaignRows(
    [{ campaign: { id: '7', name: 'x' }, metrics: { cost_micros: '5000000', all_conversions: '0' } }],
    'aasada'
  )[0];
  assert.equal(zeroConv.cpl, undefined);
});

test('mapEnumeratedCampaignRows drops rows with no campaign.id', () => {
  const rows: RawEnumeratedCampaignRow[] = [
    { campaign: { name: 'no id' }, metrics: { cost_micros: '1000000', all_conversions: '1' } },
  ];
  assert.equal(mapEnumeratedCampaignRows(rows, 'aasada').length, 0);
});

test('mapEnumeratedCampaignRows captures isDsaSetting from dynamic_search_ads_setting.domain_name', () => {
  const mapped = mapEnumeratedCampaignRows(aasadaRows(), 'aasada');
  const shiva = mapped.find((c) => c.campaignId === '24045777050')!;
  const wedding = mapped.find((c) => c.campaignId === '24053311090')!;
  assert.equal(shiva.isDsaSetting, true);
  assert.equal(wedding.isDsaSetting, false); // §8.1's open question — not confirmed as DSA yet
});

// ---------------------------------------------------------------------------------------
// §8.5 — blended CPL is display-only math, computable from the enumeration output but never
// itself a gating signal (there is no gate-taking function in this module at all — the
// pure-function boundary itself is part of the enforcement).
// ---------------------------------------------------------------------------------------

test('computeBlendedCplDisplay reconciles with §8.0\'s AAAsada worked example (~₪77.41/lead)', () => {
  const mapped = mapEnumeratedCampaignRows(aasadaRows(), 'aasada');
  const blended = computeBlendedCplDisplay(mapped);
  assert.ok(Math.abs(blended.spendIls - (1094.48 + 2348.90 + 24.57 + 2555.57 + 1429.62)) < 0.01);
  assert.ok(Math.abs(blended.conversions - (17.75 + 10.2 + 4.5 + 39.33 + 24.5)) < 0.01);
  assert.ok(blended.cpl !== undefined && Math.abs(blended.cpl - 77.41) < 1);
});

test('computeBlendedCplDisplay launders nothing — the broken אירועים campaign is still visible per-campaign even though the blend looks healthy', () => {
  const mapped = mapEnumeratedCampaignRows(aasadaRows(), 'aasada');
  const blended = computeBlendedCplDisplay(mapped);
  const events = mapped.find((c) => c.campaignId === '2')!;

  // The blend (~₪77/lead) looks fine, but the broken campaign (₪230/lead) is still fully
  // visible in the per-campaign array — this is the exact property §8.0 requires: enumeration
  // output must retain the ability to see the broken campaign, not just the average.
  assert.ok(blended.cpl! < 100);
  assert.ok(events.cpl! > 200);
});

test('computeBlendedCplDisplay handles an empty campaign list without throwing', () => {
  const blended = computeBlendedCplDisplay([]);
  assert.deepEqual(blended, { spendIls: 0, conversions: 0, cpl: undefined });
});

// Sanity type-check that EnumeratedCampaign's shape actually flows through mapEnumeratedCampaignRows.
test('mapEnumeratedCampaignRows returns the documented EnumeratedCampaign shape', () => {
  const mapped: EnumeratedCampaign[] = mapEnumeratedCampaignRows(aasadaRows(), 'aasada');
  for (const c of mapped) {
    assert.equal(typeof c.campaignId, 'string');
    assert.equal(typeof c.campaignName, 'string');
    assert.equal(typeof c.spendIls, 'number');
    assert.equal(typeof c.conversions, 'number');
    assert.ok(['brand', 'non-brand', 'seasonal-remarketing'].includes(c.type));
  }
});
