import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { seedFromAudit, PREFILLABLE_KEYS } from './seedPrefill';
import type { NormalizedPlace } from '../places/client';

describe('seedPrefill', () => {
  it('full place maps all fields and sets serviceModel to location for restaurant', () => {
    const place: NormalizedPlace = {
      placeId: 'place_123',
      displayName: 'Test Restaurant',
      formattedAddress: '123 Main St, Tel Aviv',
      city: 'Tel Aviv',
      nationalPhoneNumber: '03-1234567',
      primaryType: 'restaurant',
      types: ['restaurant', 'food', 'point_of_interest'],
    };

    const res = seedFromAudit(place);
    assert.equal(res.businessName, 'Test Restaurant');
    assert.equal(res.streetAddress, '123 Main St, Tel Aviv');
    assert.equal(res.targetLocation, 'Tel Aviv');
    assert.equal(res.specificCities, 'Tel Aviv');
    assert.equal(res.phone, '03-1234567');
    assert.equal(res.whatsappNumber, '03-1234567');
    assert.equal(res.serviceModel, 'location');
  });

  it('primaryType plumber yields field; primaryType undefined yields field', () => {
    const plumberPlace: NormalizedPlace = {
      placeId: 'place_plumber',
      displayName: 'Quick Plumber',
      formattedAddress: '45 Herzl St',
      primaryType: 'plumber',
      types: ['plumber'],
    };
    const resPlumber = seedFromAudit(plumberPlace);
    assert.equal(resPlumber.serviceModel, 'field');

    const noTypePlace: NormalizedPlace = {
      placeId: 'place_notype',
      displayName: 'Unknown Service',
      formattedAddress: '10 Allenby St',
      types: [],
    };
    const resNoType = seedFromAudit(noTypePlace);
    assert.equal(resNoType.serviceModel, 'field');
  });

  it('empty place has businessName and serviceModel field only, no empty string values', () => {
    const emptyPlace: NormalizedPlace = {
      placeId: 'place_empty',
      displayName: 'Minimal Business',
      formattedAddress: '',
      types: [],
    };
    const res = seedFromAudit(emptyPlace);
    assert.equal(res.businessName, 'Minimal Business');
    assert.equal(res.serviceModel, 'field');
    assert.equal(res.streetAddress, undefined);
    assert.equal(res.targetLocation, undefined);
    assert.equal(res.specificCities, undefined);
    assert.equal(res.phone, undefined);
    assert.equal(res.whatsappNumber, undefined);

    for (const [k, v] of Object.entries(res)) {
      assert.notEqual(v, '', `Key ${k} should not be an empty string`);
    }
  });

  it('PREFILLABLE_KEYS matches expected keys exactly', () => {
    assert.deepEqual(PREFILLABLE_KEYS, [
      'businessName',
      'streetAddress',
      'targetLocation',
      'specificCities',
      'phone',
      'whatsappNumber',
      'serviceModel',
    ]);
  });
});
