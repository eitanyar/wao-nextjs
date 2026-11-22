// /google-ads/pay client: renders the approved copy, the consent checkbox with its terms link, and the invalid-link
// text. HEBREW-SAFETY: zero Hebrew bytes; every expectation is read from the copy JSON.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const root = process.cwd();
const strings = JSON.parse(fs.readFileSync(path.join(root, 'src/lib/google-ads/billing/adsBotBillingStrings.json'), 'utf8'));

function load(rel, imports) {
  const file = path.join(root, rel);
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports, require(name) {
    assert.ok(Object.hasOwn(imports, name), `unexpected import: ${name}`);
    return imports[name];
  } }, { filename: file });
  return exports;
}

const copy = load('src/lib/google-ads/billing/adsBotCheckoutCopy.ts', { './adsBotBillingStrings.json': { __esModule: true, default: strings } });
const Link = ({ href, children, ...rest }) => React.createElement('a', { href, ...rest }, children);
const client = load('src/components/google-ads/AdsBotPayClient.tsx', {
  react: React, 'react/jsx-runtime': jsx, 'next/link': { __esModule: true, default: Link }, '@/lib/google-ads/billing/adsBotCheckoutCopy': copy,
});
const render = token => renderToStaticMarkup(React.createElement(client.default, { token }));
const esc = text => renderToStaticMarkup(React.createElement(React.Fragment, null, text));

test('valid link: title, price, refund, button, and the consent checkbox with the terms link in place', () => {
  const html = render('t');
  for (const key of ['title', 'price_line', 'refund_line', 'pay_button']) assert.ok(html.includes(esc(strings.checkout[key])), key);
  const match = /^([^[\]]*)\[([^[\]]+)\]([^[\]]*)$/.exec(strings.checkout.consent);
  assert.ok(match, 'consent has exactly one [link] segment');
  const label = html.match(/<label[^>]*>(.*?)<\/label>/)[1];
  assert.match(label, /<input type="checkbox"/);
  assert.ok(label.includes(`${esc(match[1])}<a href="/google-ads/terms" target="_blank" rel="noopener noreferrer">${esc(match[2])}</a>${esc(match[3])}`));
  assert.ok(!label.includes('[') && !label.includes(']'), 'no bracket left in the rendered consent');
  assert.match(html, /<button type="button" disabled=""/, 'pay is disabled until consent is ticked');
});

test('invalid link: the approved invalid-link text, nothing else', () => {
  const html = render(null);
  assert.equal(html, `<main dir="rtl" style="max-width:560px;margin:48px auto;padding:0 16px"><p>${esc(strings.checkout.invalid_link)}</p></main>`);
});
