import assert from 'node:assert/strict';
import test from 'node:test';

import {
  injectFraudBlockerTracker,
  verifyFraudBlockerRenderedPages,
  verifyFraudBlockerTracker,
} from './renderIntegration';

const sid = 'sid_fixture_1';

test('injectFraudBlockerTracker inserts one tracker immediately after an opening head tag', () => {
  const html = injectFraudBlockerTracker('<!DOCTYPE html><html><head data-test="x"><title>Fixture</title></head><body></body></html>', sid);
  assert.match(html, /^<!DOCTYPE html><html><head data-test="x"><script async src="https:\/\/monitor\.fraudblocker\.com\/fbt\.js\?sid=sid_fixture_1"><\/script><noscript><img src="https:\/\/monitor\.fraudblocker\.com\/fbt\.gif\?sid=sid_fixture_1" alt="" \/><\/noscript><title>/);
  assert.deepEqual(verifyFraudBlockerTracker(html, sid), { valid: true, scriptCount: 1, fallbackCount: 1 });
});

test('tracker verifier rejects missing, duplicated, and wrong-SID HTML', () => {
  const clean = injectFraudBlockerTracker('<html><head></head><body></body></html>', sid);
  assert.equal(verifyFraudBlockerTracker('<html><head></head><body></body></html>', sid).valid, false);
  assert.equal(verifyFraudBlockerTracker(`${clean}${clean}`, sid).valid, false);
  assert.equal(verifyFraudBlockerTracker(clean, 'sid_other').valid, false);
  assert.throws(() => injectFraudBlockerTracker('<html><body></body></html>', sid), /head/i);
});

test('rendered page verification checks only HTML and rejects a page without its tracker', () => {
  const pages = {
    'index.html': injectFraudBlockerTracker('<html><head></head><body>index</body></html>', sid),
    'privacy.html': injectFraudBlockerTracker('<html><head></head><body>privacy</body></html>', sid),
    'sitemap.xml': '<urlset></urlset>',
  };
  assert.deepEqual(verifyFraudBlockerRenderedPages(pages, sid), { valid: true, invalidPaths: [] });
  assert.deepEqual(verifyFraudBlockerRenderedPages({ ...pages, 'accessibility.html': '<html><head></head><body></body></html>' }, sid), { valid: false, invalidPaths: ['accessibility.html'] });
});
