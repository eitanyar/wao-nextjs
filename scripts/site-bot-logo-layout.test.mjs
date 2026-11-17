// Site Bot header logo: rendered-layout test (real Chromium layout with the self-hosted Heebo, not the width estimate).
// Every fixture name x every generated variant (and an owner file logo) x descriptor auto / forced on / off x two trades,
// rendered as the real homepage and measured at 320, 360, 390 and 1280 px: the header keeps the no-look page's height, the
// name / logo link / descriptor never overflow, text is hidden only by the clamp (and the clamp only where the estimate has
// no whole step: the very-long names), and the descriptor gives way city first, then the whole line. A sabotaged copy of one case must fail (the check is not vacuous).
// Run: node --test scripts/site-bot-logo-layout.test.mjs   (LOGO_LAYOUT_REPORT=<file> also writes every measurement).
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { failures, layoutCases, logoNameFlags, measure, VARIANTS } from './lib/logo-layout.mjs';

test('header logo: real layout at 320 / 360 / 390 / 1280 keeps the header height, never overflows the name, drops city then line', { timeout: 600000 }, async () => {
  const cases = layoutCases();
  assert.ok(cases.length > 100, `cases: ${cases.length}`);
  for (const variant of VARIANTS) assert.ok(cases.some(item => item.variant === variant), `${variant} covered`);
  assert.ok(cases.some(item => item.mode !== 'off' && /class="logo-desc-city"/.test(item.html)), 'a descriptor with a city is covered');
  // Negative control: one case with the name forced to one oversized line must be caught.
  const control = cases.find(item => item.variant === 'name' && item.mode === 'on' && /class="logo-desc-city"/.test(item.html));
  const sabotaged = { ...control, key: 'control', html: control.html.replace('</head>', '<style>.logo-name{font-size:30px !important;white-space:nowrap !important;}</style></head>') };
  const results = await measure([...cases, sabotaged]);
  const controlFailures = failures(results.filter(r => r.key === 'control'));
  assert.ok(controlFailures.some(line => /name overflows/.test(line)), 'the sabotaged control is caught');
  results.splice(0, results.length, ...results.filter(r => r.key !== 'control'));
  if (process.env.LOGO_LAYOUT_REPORT) fs.writeFileSync(process.env.LOGO_LAYOUT_REPORT, JSON.stringify(results));
  // Every descriptor state is exercised somewhere (else the drop-order check proves nothing).
  for (const state of ['full', 'label', 'none']) assert.ok(results.some(r => r.desc === state), `descriptor state ${state} seen`);
  // The clamp is the last step: only for the names flagged very-long (no whole step at 13px / 12px in the budget).
  const clampedNames = new Set(results.filter(r => r.clamped).map(r => r.name));
  for (const name of clampedNames) assert.ok(logoNameFlags(name).includes('very-long'), `clamped but not very-long: ${name.length} chars`);
  const failed = failures(results);
  assert.deepEqual(failed.slice(0, 40), [], `${failed.length} layout failures`);
});
