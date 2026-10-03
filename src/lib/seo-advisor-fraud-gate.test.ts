import assert from 'node:assert/strict';
import test from 'node:test';

import { buildFraudBlockerTrackerHtml } from './fraud-blocker/tracker';
import { publicSeoFraudTrackerHtml } from './seo-advisor-fraud-gate';

const SID = 'sid_A-1._~';

test('valid SID returns the exact tracker script and noscript HTML once', () => {
  const html = publicSeoFraudTrackerHtml(SID);
  assert.equal(html, buildFraudBlockerTrackerHtml(SID));
  assert.equal(
    html,
    '<script async src="https://monitor.fraudblocker.com/fbt.js?sid=sid_A-1._~"></script><noscript><img src="https://monitor.fraudblocker.com/fbt.gif?sid=sid_A-1._~" alt="" /></noscript>'
  );
  assert.equal(html?.match(/fbt\.js/g)?.length, 1);
  assert.equal(html?.match(/fbt\.gif/g)?.length, 1);
});

test('unset, non-string, and unsafe SIDs fail closed without throwing', () => {
  for (const sid of [undefined, '', '   ', null, 123, {}, [], true,
    'spaces are unsafe', 'bad<script>', 'sid?query', 'sid/path']) {
    assert.equal(publicSeoFraudTrackerHtml(sid), null);
  }
});
