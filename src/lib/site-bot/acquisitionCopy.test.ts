import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ACQUISITION_COPY } from './acquisitionCopy';

describe('acquisitionCopy', () => {
  const expectedKeys = [
    'WA_SHARE_PEER_TEXT',
    'WA_SHARE_MARKETER_TEXT',
    'OUTBOUND_HOOK_CATEGORIES',
    'OUTBOUND_HOOK_HOURS',
    'OUTBOUND_HOOK_PHOTOS',
    'OUTBOUND_HOOK_GENERAL',
    'OUTBOUND_FOLLOWUP',
    'COMMUNITY_POST_HEADLINE',
    'COMMUNITY_POST_BODY',
    'ENTRY_HERO_HEADLINE',
    'ENTRY_HERO_SUBTITLE',
    'ENTRY_VALUE_PROP_1',
    'ENTRY_VALUE_PROP_2',
    'ENTRY_VALUE_PROP_3',
    'ENTRY_CTA_BUTTON',
    'ENTRY_TRUST_BADGE',
  ];

  it('exports ACQUISITION_COPY record with exactly 16 tokens', () => {
    const keys = Object.keys(ACQUISITION_COPY);
    assert.equal(keys.length, 16);
    assert.equal(keys.length, expectedKeys.length);
  });

  it('contains all expected token keys with non-empty string values (> 5 chars)', () => {
    for (const key of expectedKeys) {
      assert.ok(key in ACQUISITION_COPY, `Missing key: ${key}`);
      const val = ACQUISITION_COPY[key];
      assert.equal(typeof val, 'string', `Value for ${key} must be string`);
      assert.ok(val.trim().length > 5, `Value for ${key} too short: ${val.length}`);
    }
  });

  it('contains no unparsed template placeholders in values', () => {
    const placeholderRegex = /__[A-Z0-9_]+__/g;
    for (const [key, val] of Object.entries(ACQUISITION_COPY)) {
      const matches = val.match(placeholderRegex);
      assert.equal(matches, null, `Found unparsed placeholder in ${key}: ${matches?.join(', ')}`);
    }
  });
});
