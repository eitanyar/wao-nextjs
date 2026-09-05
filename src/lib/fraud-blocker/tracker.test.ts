import assert from 'node:assert/strict';
import test from 'node:test';

import { buildFraudBlockerTrackerHtml } from './tracker';

test('tracker HTML contains the exact documented script and fallback URLs', () => {
  assert.equal(
    buildFraudBlockerTrackerHtml('sid_A-1._~'),
    '<script async src="https://monitor.fraudblocker.com/fbt.js?sid=sid_A-1._~"></script><noscript><img src="https://monitor.fraudblocker.com/fbt.gif?sid=sid_A-1._~" alt="" /></noscript>'
  );
});

test('tracker rejects unsafe SIDs', () => {
  for (const sid of ['', 'spaces are unsafe', 'bad<script>', 'sid?query', 'sid/path']) {
    assert.throws(() => buildFraudBlockerTrackerHtml(sid));
  }
});
