// /google-ads/onboarding (2026-11-20): internal mode labels (Sandbox badge, internal-test notice, Live-locked notice,
// sandbox controls, demo-mode banner) render only for staff (wao-admin cookie, verified in layout.tsx). Public visitors
// see none of them.
// HEBREW-SAFETY: zero Hebrew bytes. Hebrew label expectations are read from page.tsx at runtime.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const dir = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(dir, 'page.tsx'), 'utf8');

function load(file, imports) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, console, require(name) {
    assert.ok(Object.hasOwn(imports, name), `unexpected import: ${name}`);
    return imports[name];
  } }, { filename: file });
  return exports;
}

const staff = load(path.join(dir, 'staff-context.tsx'), { react: React, 'react/jsx-runtime': jsx });
const firstAdPreview = load(path.join(dir, '../../../../lib/google-ads/first-ad-preview.ts'), {
  '../payments/rate-limit': load(path.join(dir, '../../../../lib/payments/rate-limit.ts'), {}),
});
const page = load(path.join(dir, 'page.tsx'), {
  react: React, 'react/jsx-runtime': jsx,
  'next/link': { __esModule: true, default: (props) => React.createElement('a', { href: props.href }, props.children) },
  '@/lib/bot/delivery-model': { deliveryModelOptions: [], deliveryModelFollowUp: () => '' },
  '@/lib/google-ads/onboarding-demo': { resolveOnboardingDemoEntry: () => ({ isDemo: false, mode: 'test' }) },
  '@/lib/google-ads/first-ad-preview': firstAdPreview,
  '@/content/astra-homepage-copy.json': JSON.parse(fs.readFileSync(path.join(dir, '../../../../content/astra-homepage-copy.json'), 'utf8')),
  '@/components/google-ads/GoogleAdPreview': { __esModule: true, default: () => null },
  './staff-context': staff,
  '@/lib/useLeadTracking': { getAttribution: () => ({}) },
  '@/lib/tracking/conversions': load(path.join(dir, '../../../../lib/tracking/conversions.ts'), {}),
});

function render(isStaff) {
  return renderToStaticMarkup(React.createElement(staff.OnboardingStaffProvider, { isStaff },
    React.createElement(page.default)));
}

// Hebrew label text, taken from the source so this file stays Hebrew-free.
function quotedAfter(anchor) {
  const at = source.indexOf(anchor);
  assert.notEqual(at, -1, `anchor missing: ${anchor}`);
  return source.slice(at + anchor.length).match(/"([^"]+)"/)[1];
}
const badgeLine = source.split('\n').find((line) => line.includes('● Sandbox / '));
assert.ok(badgeLine, 'sandbox badge line missing from source');
const badgeHebrew = badgeLine.split('/ ')[1].trim();
const testNotice = quotedAfter('{mode === "test"\n              ? ');
const liveNotice = quotedAfter('              : ');
const internalLabels = ['Sandbox', 'Live (locked)', badgeHebrew, testNotice, liveNotice];

test('public render carries no internal sandbox / test labels', () => {
  const html = render(false);
  assert.match(html, /<h1/);
  for (const label of internalLabels) assert.ok(!html.includes(label), `public render leaks: ${label}`);
});

test('staff render still shows the mode indicator', () => {
  const html = render(true);
  for (const label of [badgeHebrew, testNotice, 'Live (locked)']) assert.ok(html.includes(label), `staff render missing: ${label}`);
});

// 2026-11-20: the first ad comes after three answers, so the opening counter reads "1 of 3", never "of 25".
test('opening progress counter is question 1 of 3', () => {
  const html = render(false);
  assert.ok(html.includes('width:33%'), 'progress bar must be one third on the first question');
  assert.match(html, />[^<>\d]*1 [^<>\d]* 3<\/div>/, 'counter must read 1 of 3');
  assert.doesNotMatch(source, /progressTotal = 25/);
});

test('the mobile jump-to-ad label is the homepage CTA, imported, never retyped', () => {
  assert.match(source, /import homepageCopy from "@\/content\/astra-homepage-copy\.json";/);
  assert.match(source, /\{homepageCopy\.hero\.primary_cta\.label\}/);
  const jump = source.slice(source.indexOf('{firstAdShown && i === firstAdMessageIndex && ('));
  const wrapper = jump.slice(0, 600).match(/<div className="([^"]*lg:hidden[^"]*)"([^>]*)>/);
  assert.ok(wrapper, 'jump button wrapper must carry lg:hidden');
  assert.doesNotMatch(wrapper[2], /display/, 'an inline display would override lg:hidden on desktop');
  assert.match(jump.slice(0, 600), /type="button"/);
  assert.match(jump.slice(0, 600), /minHeight: "44px"/);
  assert.match(jump.slice(0, 600), /onClick=\{jumpToAd\}/);
});

// Dror 2026-11-20: ads_bot_* conversion pushes go through the once-per-session tracker, suppressed for demo and staff.
test('onboarding conversion pushes are wired through the guarded tracker', () => {
  assert.match(source, /suppressed: isDemo \|\| isStaff,/);
  assert.match(source, /conversionsRef\.current = createOnboardingConversions\(\);/);
  assert.match(source, /if \(data\.firstAdPreview\) conversionsRef\.current\?\.firstAdShown\(trackingContext\(\)\);/);
  assert.match(source, /conversionsRef\.current\?\.stateChanged\(trackingContext\(\), previousState, data\.currentState, data\.collectedData\);/);
  assert.match(source, /if \(data\.approved === true\) conversionsRef\.current\?\.approved\(trackingContext\(\)\);/);
  assert.doesNotMatch(source, /dataLayer\.push/, 'no unguarded direct pushes');
  assert.doesNotMatch(source, /purchase/, 'no purchase event while checkout is 503');
});
