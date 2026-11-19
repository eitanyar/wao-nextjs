// Pay page showcase-consent checkbox (approved 2026-11-17): a separate checkbox, unticked by default, not required,
// label + help byte-exact from the legal JSON, and the pay request carries its value (false when untouched).
// HEBREW-SAFETY: zero Hebrew bytes. Every Hebrew expectation is read from the source JSON at runtime.
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

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const legal = JSON.parse(fs.readFileSync(path.join(repo, 'docs/legal/showcase-consent-legal-FINAL-2026-11-17.json'), 'utf8'));

function load(relative, imports) {
  const file = path.join(repo, relative);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, console, require(name) {
    assert.ok(Object.hasOwn(imports, name), `unexpected import: ${name}`);
    return imports[name];
  } }, { filename: file });
  return exports;
}

const copy = load('src/lib/showcase/consentCopy.generated.ts', {});
const identity = (value) => value;
const pay = load('src/components/site-bot/SiteBotPayClient.tsx', {
  react: React, 'react/jsx-runtime': jsx,
  'next/link': { __esModule: true, default: (props) => React.createElement('a', { href: props.href }, props.children) },
  'next/navigation': { useParams: () => ({ sessionId: '123e4567-e89b-42d3-a456-426614174000' }) },
  '@/lib/bidi': { renderMixed: identity },
  '@/lib/site-bot/postPayCopy.generated': { SITE_BOT_POSTPAY_COPY: {} },
  '@/lib/site-bot/checkout/customerError': { checkoutCallbackOutcome: () => ({ kind: 'done' }), checkoutPayErrorKind: () => 'after_charge', doneDomainLine: () => null, readJsonBody: async () => ({}) },
  '@/lib/site-bot/checkout/checkoutCopy': {
    SITE_BOT_CHECKOUT_COPY_PENDING: false, SITE_BOT_TERMS_PATH: '/site-bot/terms',
    siteBotCheckoutText: (key) => `[${key}]`, siteBotTermsConsentParts: () => ({ before: '[b]', linkLabel: '[l]', after: '[a]' }),
  },
  '@/lib/site-bot/checkout/accountCopy': { SITE_BOT_ACCOUNT_COPY: { manageLink: 'x' }, accountLinkHref: () => '/account', customerVisibleLabel: identity },
  '@/lib/payments/plans': { SITE_BOT_PLAN: { netAmount: 1 }, formatShekels: String },
  '@/lib/showcase/consentCopy.generated': copy,
  '@/lib/site-bot/research/gatePresentation': { buildResearchGateAnswer: identity },
});

const html = renderToStaticMarkup(React.createElement(pay.default, { cardDefaults: { number: '', expiry: '', cvc: '' } }));

test('one separate showcase checkbox, unticked by default and not required', () => {
  const inputs = html.match(/<input[^>]*type="checkbox"[^>]*>/g) ?? [];
  assert.equal(inputs.length, 1);
  assert.doesNotMatch(inputs[0], /checked/);
  assert.doesNotMatch(inputs[0], /required/);
  assert.match(inputs[0], /id="showcase-consent"/);
  assert.match(html, /data-showcase-consent="site-bot"/);
});

test('label and help are the approved Site Bot strings, byte for byte', () => {
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/</g, '&lt;');
  assert.ok(html.includes(`<label for="showcase-consent"`));
  assert.ok(html.includes(esc(legal.siteBot.checkboxLabel)));
  assert.ok(html.includes(esc(legal.siteBot.checkboxHelp)));
  assert.ok(!html.includes(esc(legal.adsBot.checkboxLabel)));
});

test('the pay request sends the checkbox value; paying does not depend on it', () => {
  const source = fs.readFileSync(path.join(repo, 'src/components/site-bot/SiteBotPayClient.tsx'), 'utf8');
  assert.match(source, /useState\(false\);\n/);
  assert.match(source, /JSON\.stringify\(\{ sessionId, showcaseConsent \}\)/);
  assert.doesNotMatch(source, /disabled=\{!showcaseConsent/);
});
