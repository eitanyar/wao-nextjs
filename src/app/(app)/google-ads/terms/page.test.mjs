// /google-ads/terms: unpublished = notFound; published = the generated terms through the shared TermsDocument.
// HEBREW-SAFETY: zero Hebrew bytes. Every Hebrew expectation is read from the generated module / md source.
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

const repository = fileURLToPath(new URL('../../../../../', import.meta.url));
const local = relative => path.join(repository, relative);

function load(file, imports = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports, ...globals, require(name) {
    assert.ok(Object.hasOwn(imports, name), `unexpected import: ${name}`);
    return imports[name];
  } }, { filename: file });
  return exports;
}

const react = { react: React, 'react/jsx-runtime': jsx };
const bidi = load(local('src/lib/bidi.tsx'), react);
const termsModule = load(local('src/lib/legal/adsBotTermsDoc.ts'));
const TERMS = termsModule.ADS_BOT_TERMS;
const termsText = load(local('src/components/legal/termsText.tsx'), { ...react, '@/lib/bidi': bidi });
const cssModule = { __esModule: true, default: new Proxy({}, { get: (_, key) => (typeof key === 'string' ? `css-${key}` : undefined) }) };
const termsDocument = load(local('src/components/legal/TermsDocument.tsx'), { ...react, '@/lib/bidi': bidi, './terms.module.css': cssModule, './termsText': termsText });

class NotFound extends Error {}

async function render(env) {
  const flag = load(local('src/lib/google-ads/adsBotTermsPublished.ts'), {}, { process: { env } });
  const page = load(local('src/app/(app)/google-ads/terms/page.tsx'), {
    ...react,
    'next/navigation': { notFound: () => { throw new NotFound('NEXT_NOT_FOUND'); } },
    'next/server': { connection: async () => {} },
    '@/lib/legal/adsBotTermsDoc': termsModule,
    '@/components/legal/TermsDocument': termsDocument,
    '@/lib/google-ads/adsBotTermsPublished': flag,
  });
  return { page, html: renderToStaticMarkup(await page.default()) };
}

test('unpublished by default: notFound unless ADS_BOT_TERMS_PUBLISHED is exactly "true"', async () => {
  for (const env of [{}, { ADS_BOT_TERMS_PUBLISHED: '1' }, { ADS_BOT_TERMS_PUBLISHED: 'TRUE' }, { ADS_BOT_TERMS_PUBLISHED: 'false' }]) {
    await assert.rejects(() => render(env), NotFound, JSON.stringify(env));
  }
});

test('published: renders the generated title, every numbered section with its anchor, both tables, and the email links', async () => {
  const { page, html } = await render({ ADS_BOT_TERMS_PUBLISHED: 'true' });
  assert.ok(html.includes('data-legal-doc="ads-bot-terms"'));
  const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/)[1];
  assert.equal(h1, renderToStaticMarkup(React.createElement(React.Fragment, null, bidi.renderMixed(TERMS.title))));
  const h2s = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/g)];
  assert.equal(h2s.length, 20);
  TERMS.sections.forEach(section => assert.ok(html.includes(`id="${section.id}"`), section.id));
  assert.equal((html.match(/class="css-tableScroll"/g) ?? []).length, 2);
  const source = fs.readFileSync(local('docs/legal/ads-bot-terms-of-use.md'), 'utf8');
  const emails = source.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [];
  assert.deepEqual([...html.matchAll(/<a href="mailto:([^"]+)"/g)].map(m => m[1]), emails);
  assert.equal((html.match(/<bdi dir="ltr">\([^)<]*<\/bdi>/g) ?? []).length, 0, 'bidi gate');
  assert.deepEqual(JSON.parse(JSON.stringify(page.metadata)), { title: TERMS.title, robots: { index: false, follow: true } });
});

test('not in the sitemap; the checkout consent link points here', () => {
  assert.doesNotMatch(fs.readFileSync(local('src/app/sitemap.ts'), 'utf8'), /google-ads\/terms/);
  assert.match(fs.readFileSync(local('src/lib/google-ads/billing/adsBotCheckoutCopy.ts'), 'utf8'), /ADS_BOT_TERMS_PATH = '\/google-ads\/terms'/);
});
