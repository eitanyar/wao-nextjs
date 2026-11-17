// Account page showcase toggle (approved 2026-11-17): label, on/off states and the after-off notice byte-exact from the
// legal JSON; an ARIA switch whose aria-checked follows the state. HEBREW-SAFETY: zero Hebrew bytes.
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

const repo = fileURLToPath(new URL('../../../../../', import.meta.url));
const legal = JSON.parse(fs.readFileSync(path.join(repo, 'docs/legal/showcase-consent-legal-FINAL-2026-11-17.json'), 'utf8'));
const T = legal.accountToggle;

function load(relative, imports) {
  const file = path.join(repo, relative);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require(name) {
    assert.ok(Object.hasOwn(imports, name), `unexpected import: ${name}`);
    return imports[name];
  } }, { filename: file });
  return exports;
}

const toggle = load('src/app/(product)/account/subscription/ShowcaseConsentToggle.tsx', {
  react: React, 'react/jsx-runtime': jsx,
  '@/lib/bidi': { renderMixed: (v) => v },
  '@/lib/payments/accountCopy': load('src/lib/payments/accountCopy.ts', {}),
  '@/lib/showcase/consentCopy.generated': load('src/lib/showcase/consentCopy.generated.ts', {}),
  './accountEvents': load('src/app/(product)/account/subscription/accountEvents.ts', {}),
});
const view = (props) => renderToStaticMarkup(React.createElement(toggle.ShowcaseConsentView, { granted: false, busy: false, notice: false, error: null, onToggle: () => {}, ...props }));

test('off: switch unchecked, label + off state, no notice', () => {
  const html = view({});
  assert.match(html, /role="switch" aria-checked="false"/);
  assert.ok(html.includes(T.label));
  assert.ok(html.includes(T.offState));
  assert.ok(!html.includes(T.onState));
  assert.ok(!html.includes(T.afterOffNotice));
});

test('on: switch checked, on state', () => {
  const html = view({ granted: true });
  assert.match(html, /role="switch" aria-checked="true"/);
  assert.ok(html.includes(T.onState));
  assert.ok(!html.includes(T.afterOffNotice), 'notice never while on');
});

test('just switched off: the after-off notice is shown', () => {
  const html = view({ granted: false, notice: true });
  assert.ok(html.includes(T.afterOffNotice));
  assert.ok(html.includes(T.offState));
});

test('the initial server render (default export) follows initialGranted', () => {
  assert.match(renderToStaticMarkup(React.createElement(toggle.default, { token: 't', initialGranted: true })), /aria-checked="true"/);
  assert.match(renderToStaticMarkup(React.createElement(toggle.default, { token: 't', initialGranted: false })), /aria-checked="false"/);
});
