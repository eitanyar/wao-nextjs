import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { extractServedAreaNames, isRadiusAnswer, localitiesNamedIn, MAX_LISTED_SERVED_AREAS, withServedAreaNames, type Locality } from './servedAreas';
import { PREFIX_LETTERS } from '../lp/copyGates';
import { buildSiteResearchInput } from './research/researchInput';
import { compileBusinessTruthModel } from './research/businessTruth';
import { assembleSiteIdentity, siteIdentityInput } from './siteIdentity';
import type { CollectedData } from '../bot/prompts';

// The real tracked list (no Hebrew is typed in this test: every name comes from the list itself).
const areas = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'config/market-scanner/areas.json'), 'utf8')) as { regions: Array<{ cities: Locality[] }> };
const LOCALITIES: Locality[] = areas.regions.flatMap(region => region.cities);
const plain = LOCALITIES.filter(item => !item.he_match_guard && !LOCALITIES.some(other => other !== item && (other.he_name.includes(item.he_name) || item.he_name.includes(other.he_name))));
const [base, a, b, c, d, e] = plain;
const guarded = LOCALITIES.find(item => item.he_match_guard?.prefix_letters && !item.he_match_guard.end);
const VAV = PREFIX_LETTERS[0];
const BET = PREFIX_LETTERS[3];
const junk = String.fromCharCode(0x05D6, 0x05D2, 0x05E4, 0x05D8);

describe('servedAreas: radius answers', () => {
  it('a distance answer never produces localities, even when it names places', () => {
    assert.equal(isRadiusAnswer(`up to 30 km from ${base.he_name}`), true);
    assert.equal(extractServedAreaNames(`up to 30 km from ${a.he_name}, ${b.he_name}`, base.he_name, LOCALITIES), undefined);
    assert.equal(extractServedAreaNames(`${a.he_name} 20`, base.he_name, LOCALITIES), undefined);
  });
});

describe('servedAreas: named localities', () => {
  it('keeps the owner order, dedups, drops the base city and attaches prefixes', () => {
    const answer = `${base.he_name}, ${b.he_name}, ${a.he_name} ${VAV}${BET}${c.he_name}, ${b.he_name}`;
    assert.deepEqual(extractServedAreaNames(answer, base.he_name, LOCALITIES), {
      listed: [b.he_name, a.he_name, c.he_name], overflow: [], source: 'travel_boundary', ownerConfirmed: false,
    });
  });

  it('caps at base + 3 and keeps the overflow', () => {
    const names = extractServedAreaNames([a, b, c, d, e].map(item => item.he_name).join(', '), base.he_name, LOCALITIES);
    assert.equal(names?.listed.length, MAX_LISTED_SERVED_AREAS);
    assert.deepEqual(names?.listed, [a.he_name, b.he_name, c.he_name]);
    assert.deepEqual(names?.overflow, [d.he_name, e.he_name]);
  });

  it('ignores unknown words, Latin text and names glued to other letters', () => {
    assert.equal(extractServedAreaNames(`${junk} and the whole region ${junk}`, base.he_name, LOCALITIES), undefined);
    assert.equal(extractServedAreaNames(`${a.he_name}${junk}`, base.he_name, LOCALITIES), undefined);
    assert.equal(extractServedAreaNames(`${junk}${a.he_name}`, base.he_name, LOCALITIES), undefined);
    assert.deepEqual(extractServedAreaNames(`${junk}, ${a.he_name}`, base.he_name, LOCALITIES)?.listed, [a.he_name]);
  });

  it('matches aliases to the canonical name and honours the areas.json match guard', () => {
    const aliased = LOCALITIES.find(item => item.he_aliases?.some(alias => !item.he_name.includes(alias) && !/["\u05F4]/.test(alias)) && !item.he_match_guard)!;
    const alias = aliased.he_aliases!.find(value => !aliased.he_name.includes(value) && !/["\u05F4]/.test(value))!;
    assert.deepEqual(localitiesNamedIn(`${junk}, ${alias}`, LOCALITIES).map(item => item.slug), [aliased.slug]);
    if (guarded) {
      assert.equal(localitiesNamedIn(guarded.he_name, LOCALITIES).length, 0);
      assert.deepEqual(localitiesNamedIn(`${guarded.he_match_guard!.prefix_letters![0]}${guarded.he_name}`, LOCALITIES).map(item => item.slug), [guarded.slug]);
    }
  });
});

describe('servedAreas: downstream', () => {
  const data: CollectedData = {
    businessName: 'Synthetic', businessNiche: 'Plumber', primaryService: 'Plumber', serviceModel: 'field',
    targetLocation: base.he_name, specificCities: base.he_name, priorityServices: ['leak repair'], secondaryServices: 'leak repair',
    travelBoundary: `${a.he_name}, ${b.he_name}`,
    servedAreaNames: { listed: ['client injected'], overflow: [], source: 'travel_boundary', ownerConfirmed: true },
  };
  const derived = withServedAreaNames(data, LOCALITIES);

  it('checkout recomputes the field and discards a client-sent value', () => {
    assert.deepEqual(derived.servedAreaNames, { listed: [a.he_name, b.he_name], overflow: [], source: 'travel_boundary', ownerConfirmed: false });
    const radius = withServedAreaNames({ ...data, travelBoundary: '25 km' }, LOCALITIES);
    assert.equal('servedAreaNames' in radius, false);
  });

  it('named localities reach the site identity serviceArea (schema areaServed, gates) with the base first', () => {
    const identity = assembleSiteIdentity(siteIdentityInput(['leak repair'], derived), null, () => new Date('2026-11-09T00:00:00Z'));
    assert.deepEqual(identity.serviceArea, [base.he_name, a.he_name, b.he_name]);
    assert.equal(identity.baseCity, base.he_name);
  });

  it('named localities never create city pages: truth city-page areas stay base-only', () => {
    const truth = compileBusinessTruthModel(buildSiteResearchInput('checkout:synthetic', derived, () => new Date('2026-11-09T00:00:00Z')).businessTruth);
    assert.deepEqual(truth.cityPageEligibleAreas, [base.he_name]);
    assert.deepEqual(truth.servedAreas.map(item => item.value), [base.he_name]);
    assert.deepEqual(truth.humanGates, []);
  });
});
