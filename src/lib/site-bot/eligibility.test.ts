import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasRatings, isNotOperational, isSiteBotOffer, profileEligibility, SITE_BOT_OFFERS, siteBotOffer, waitlistReason,
  type EligibilityCandidate,
} from './eligibility';

const plumber = (over: Partial<EligibilityCandidate> = {}): EligibilityCandidate => ({
  hasWebsite: false, types: ['plumber', 'point_of_interest'], primaryType: 'plumber', businessStatus: 'OPERATIONAL',
  hasRating: true, userRatingCount: 12, ...over,
});
const open = (hasSpot: boolean) => ({ open: true, hasSpot: () => hasSpot });
const closed = { open: false, hasSpot: () => { throw new Error('a closed gate never reads the cap'); } };

test('state 1: a GBP with a website is not eligible, whatever else is true', () => {
  assert.equal(profileEligibility(plumber({ hasWebsite: true })), 'has_site');
  assert.equal(profileEligibility(plumber({ hasWebsite: true, primaryType: 'restaurant', userRatingCount: 0 })), 'has_site');
  assert.equal(siteBotOffer('has_site', open(true)), 'not_eligible_has_site');
  assert.equal(siteBotOffer('has_site', closed), 'not_eligible_has_site');
});

test('state 2: a primary category outside launch scope is the trade block (with the trade waiting list)', () => {
  assert.equal(profileEligibility(plumber({ primaryType: 'restaurant', types: ['restaurant'] })), 'trade');
  assert.equal(profileEligibility(plumber({ primaryType: undefined, types: ['point_of_interest'] })), 'trade');
  assert.equal(siteBotOffer('trade', open(true)), 'not_eligible_trade');
  assert.equal(waitlistReason('not_eligible_trade'), 'trade');
});

test('state 3: not OPERATIONAL or zero ratings is the profile block; a missing status is no signal', () => {
  for (const status of ['CLOSED_TEMPORARILY', 'CLOSED_PERMANENTLY', 'SUSPENDED_SYNTHETIC']) {
    assert.equal(profileEligibility(plumber({ businessStatus: status })), 'profile', status);
  }
  assert.equal(profileEligibility(plumber({ userRatingCount: 0 })), 'profile');
  assert.equal(profileEligibility(plumber({ userRatingCount: undefined, hasRating: false })), 'profile');
  assert.equal(profileEligibility(plumber({ businessStatus: undefined })), 'eligible');
  assert.equal(profileEligibility(plumber({ userRatingCount: undefined, hasRating: true })), 'eligible');
  assert.equal(siteBotOffer('profile', open(true)), 'not_eligible_profile');
  assert.equal(waitlistReason('not_eligible_profile'), null);
  assert.equal(isNotOperational({ businessStatus: '' }), false);
  assert.equal(hasRatings({ hasRating: true, userRatingCount: 0 }), false);
});

test('state 4: eligible but no spot -> pre-open when the gate is closed (cap never read), full when open and capped', () => {
  assert.equal(siteBotOffer('eligible', closed), 'waitlist_preopen');
  assert.equal(siteBotOffer('eligible', open(false)), 'waitlist_full');
  assert.equal(waitlistReason('waitlist_preopen'), 'preopen');
  assert.equal(waitlistReason('waitlist_full'), 'full');
});

test('state 5: eligible with a spot and the gate open -> the existing CTA (no waiting list)', () => {
  assert.equal(profileEligibility(plumber()), 'eligible');
  assert.equal(profileEligibility(plumber({ primaryType: 'tutoring_service', types: ['tutoring_service'] })), 'eligible');
  assert.equal(profileEligibility(plumber({ primaryType: 'photographer', types: ['photographer'] })), 'eligible');
  assert.equal(siteBotOffer('eligible', open(true)), 'eligible');
  assert.equal(waitlistReason('eligible'), null);
  assert.equal(waitlistReason('not_eligible_has_site'), null);
});

test('the offer list is closed: exactly the six offers, and anything else is not an offer', () => {
  assert.equal(SITE_BOT_OFFERS.length, 6);
  for (const offer of SITE_BOT_OFFERS) assert.equal(isSiteBotOffer(offer), true);
  for (const value of ['', 'ELIGIBLE', 'open', null, undefined, 1, {}]) assert.equal(isSiteBotOffer(value), false);
});
