import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const routePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'create-campaign', 'route.ts');
const route = fs.readFileSync(routePath, 'utf8');

test('uses qualified and converted lead categories for new offline conversion actions', () => {
  const verifiedLead = route.match(/name: 'ליד מאומת',[\s\S]*?category: enums\.ConversionActionCategory\.(\w+)/);
  const closedDeal = route.match(/name: 'עסקה סגורה',[\s\S]*?category: enums\.ConversionActionCategory\.(\w+)/);

  assert.equal(verifiedLead?.[1], 'QUALIFIED_LEAD');
  assert.equal(closedDeal?.[1], 'CONVERTED_LEAD');
});

test('uses the required Maximize Clicks and EU political advertising campaign fields', () => {
  const campaign = route.match(/const campaignRes = await newCustomer\.campaigns\.create\(\[\{([\s\S]*?)\}\]\);/);

  assert.match(campaign?.[1] || '', /target_spend:\s*\{\s*cpc_bid_ceiling_micros:\s*15_000_000\s*\}/);
  assert.match(campaign?.[1] || '', /contains_eu_political_advertising:\s*enums\.EuPoliticalAdvertisingStatus\.DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING/);
  assert.doesNotMatch(campaign?.[1] || '', /bidding_strategy_type:/);
});
