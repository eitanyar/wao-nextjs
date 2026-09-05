import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCampaignAge } from './campaignAge';
import { evaluateSearchTermHarvesting } from './searchTermHarvest';

describe('Google Ads Operator Phase 2 (campaignAge & searchTermHarvest)', () => {
  it('evaluates campaign lifecycle phases accurately based on age in days', () => {
    const refDate = new Date('2026-08-25T12:00:00Z');

    // < 14 days -> launch
    const launchRes = evaluateCampaignAge({
      startDate: '2026-08-20T12:00:00Z',
      referenceDate: refDate,
    });
    assert.equal(launchRes.ageDays, 5);
    assert.equal(launchRes.phase, 'launch');

    // 14 - 45 days -> growth
    const growthRes = evaluateCampaignAge({
      startDate: '2026-08-01T12:00:00Z',
      referenceDate: refDate,
    });
    assert.equal(growthRes.ageDays, 24);
    assert.equal(growthRes.phase, 'growth');

    // > 45 days -> maturity
    const maturityRes = evaluateCampaignAge({
      startDate: '2026-06-01T12:00:00Z',
      referenceDate: refDate,
    });
    assert.equal(maturityRes.ageDays, 85);
    assert.equal(maturityRes.phase, 'maturity');

    // Missing dates fail closed -> unknown
    const fallbackRes = evaluateCampaignAge({ referenceDate: refDate });
    assert.equal(fallbackRes.phase, 'unknown');
  });

  it('harvests search terms meeting conversion & CPL criteria', () => {
    const candidates = evaluateSearchTermHarvesting({
      campaignId: 'camp-123',
      targetCplIls: 100,
      searchTerms: [
        { query: 'leak locator tlv', conversions: 3, spendIls: 240, isExistingKeyword: false, adGroupResourceName: 'customers/123/adGroups/1' },
        { query: 'emergency plumber', conversions: 5, spendIls: 400, isExistingKeyword: false, adGroupResourceName: 'customers/123/adGroups/1' },
        { query: 'already existing kw', conversions: 10, spendIls: 500, isExistingKeyword: true, adGroupResourceName: 'customers/123/adGroups/1' },
        { query: 'expensive non converter', conversions: 0, spendIls: 300, isExistingKeyword: false, adGroupResourceName: 'customers/123/adGroups/1' },
        { query: 'high cpl query', conversions: 2, spendIls: 500, isExistingKeyword: false, adGroupResourceName: 'customers/123/adGroups/1' },
      ],
    });

    assert.equal(candidates.length, 2);
    assert.equal(candidates[0].query, 'leak locator tlv');
    assert.equal(candidates[0].recommendedMatchType, 'phrase');
    assert.equal(candidates[1].query, 'emergency plumber');
    assert.equal(candidates[1].recommendedMatchType, 'exact');
  });

  it('fails closed without a CPL ceiling or when a negative keyword conflicts', () => {
    const searchTerms = [{ query: 'conflicted query', conversions: 3, spendIls: 150, adGroupResourceName: 'customers/123/adGroups/1', hasNegativeKeywordConflict: true }];
    assert.deepEqual(evaluateSearchTermHarvesting({ campaignId: 'camp-123', searchTerms }), []);
    assert.deepEqual(evaluateSearchTermHarvesting({ campaignId: 'camp-123', targetCplIls: 100, searchTerms }), []);
  });
});
