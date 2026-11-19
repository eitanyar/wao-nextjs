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
const page = load(path.join(dir, 'page.tsx'), {
  react: React, 'react/jsx-runtime': jsx,
  'next/link': { __esModule: true, default: (props) => React.createElement('a', { href: props.href }, props.children) },
  '@/lib/bot/delivery-model': { deliveryModelOptions: [], deliveryModelFollowUp: () => '' },
  '@/lib/google-ads/onboarding-demo': { resolveOnboardingDemoEntry: () => ({ isDemo: false, mode: 'test' }) },
  '@/components/google-ads/GoogleAdPreview': { __esModule: true, default: () => null },
  './staff-context': staff,
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
