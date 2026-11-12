// /site-bot/terms renderer: numbered headings, mailto units, scrollable table regions, and the domain policy text.
// HEBREW-SAFETY: zero Hebrew bytes. Every Hebrew expectation is read from the md source or the docs/copy patch files.
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
const here = name => fileURLToPath(new URL(name, import.meta.url));

function load(file, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports, require(name) {
    assert.ok(Object.hasOwn(imports, name), `unexpected import: ${name}`);
    return imports[name];
  } }, { filename: file });
  return exports;
}

const react = { react: React, 'react/jsx-runtime': jsx };
const bidi = load(local('src/lib/bidi.tsx'), react);
const termsModule = load(local('src/lib/legal/siteBotTerms.ts'));
const TERMS = termsModule.SITE_BOT_TERMS;
const termsText = load(here('./termsText.tsx'), { ...react, '@/lib/bidi': bidi });
const cssModule = { __esModule: true, default: new Proxy({}, { get: (_, key) => (typeof key === 'string' ? `css-${key}` : undefined) }) };
const page = load(here('./page.tsx'), {
  ...react, '@/lib/bidi': bidi, '@/lib/legal/siteBotTerms': termsModule, './terms.module.css': cssModule, './termsText': termsText,
});
const html = renderToStaticMarkup(React.createElement(page.default));
const markup = node => renderToStaticMarkup(React.createElement(React.Fragment, null, node));
const escaped = text => markup(text);
const source = fs.readFileSync(local('docs/legal/site-bot-terms-of-use.md'), 'utf8');

test('headings: every section heading renders "N. " in the RTL flow (no LTR isolate), then the rest', () => {
  const h2s = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/g)].map(m => m[1]);
  assert.equal(h2s.length, 20);
  assert.equal(TERMS.sections.length, 20);
  TERMS.sections.forEach((section, i) => {
    const [, n, rest] = section.heading.match(/^(\d+)\.\s+(.*)$/);
    assert.equal(n, String(i + 1));
    assert.equal(h2s[i], `${n}. ${markup(bidi.renderMixed(rest))}`);
    assert.ok(!h2s[i].startsWith('<'), 'the number is bare text at the start of the RTL heading');
    assert.ok(html.includes(`id="${section.id}"`), `${section.id} anchor kept`);
  });
  assert.ok(!/<h2[^>]*>[^<]*<(span|bdi)[^>]*dir="ltr"[^>]*>\d+\./.test(html), 'no LTR isolate around a heading number');
  // Headings without a leading number fall back to renderMixed, whole.
  assert.equal(markup(termsText.renderHeading('Intro (A)')), markup(bidi.renderMixed('Intro (A)')));
});

test('emails: one mailto link per address, the whole address (with "@") inside a single LTR isolate', () => {
  const emails = source.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g);
  assert.ok(emails && emails.length >= 2, 'the terms carry the support and contact address');
  const links = [...html.matchAll(/<a href="mailto:([^"]+)"[^>]*><bdi dir="ltr">([^<]*)<\/bdi><\/a>/g)];
  assert.deepEqual(links.map(m => m[1]), emails);
  assert.deepEqual(links.map(m => m[2]), emails);
  // No "@" in rendered text outside an isolate.
  const outside = html.replace(/<bdi dir="ltr">[^<]*<\/bdi>/g, '').replace(/<[^>]*>/g, '');
  assert.ok(!outside.includes('@'), 'an "@" is rendered outside a <bdi>');
  // The global renderMixed still splits an address (proves the terms renderer, not renderMixed, keeps it whole).
  assert.notEqual(markup(bidi.renderMixed('a@b.co')), '<bdi dir="ltr">a@b.co</bdi>');
  assert.equal(markup(termsText.renderTermsText('1 a@b.co 2')), '1 <a href="mailto:a@b.co" style="color:var(--accent);text-decoration:underline"><bdi dir="ltr">a@b.co</bdi></a> 2');
});

test('bidi gate: no LTR isolate starts with an opening parenthesis', () => {
  assert.equal((html.match(/<bdi dir="ltr">\([^)<]*<\/bdi>/g) ?? []).length, 0);
});

test('tables: keyboard-focusable scroll region named by its section heading, with aria-hidden edge fades', () => {
  const tableSections = TERMS.sections.filter(s => s.blocks.some(b => b.type === 'table'));
  assert.equal(tableSections.length, 2);
  const regions = [...html.matchAll(/<div class="css-tableScroll"([^>]*)>/g)].map(m => m[1]);
  assert.equal(regions.length, 2);
  regions.forEach((attrs, i) => {
    assert.match(attrs, /tabindex="0"/);
    assert.match(attrs, /role="region"/);
    assert.ok(attrs.includes(`aria-label="${escaped(tableSections[i].heading)}"`), attrs);
  });
  assert.equal((html.match(/<span aria-hidden="true" class="css-fade css-fadeStart"><\/span>/g) ?? []).length, 2);
  assert.equal((html.match(/<span aria-hidden="true" class="css-fade css-fadeEnd"><\/span>/g) ?? []).length, 2);
  const css = fs.readFileSync(here('./terms.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/#fff|white/i.test(css), 'fade colors come from var(--bg)');
  assert.ok(!/(^|[^-])(left|right)\s*:/m.test(css), 'logical insets only');
  assert.match(css, /min-width: 520px;/);
  assert.equal((css.match(/@container terms-table \(width < 520px\)/g) ?? []).length, 2, 'fade query matches the table min-width');
});

/** `key :: value` fields of a docs/copy final file. */
function copyFields(relative) {
  return Object.fromEntries(fs.readFileSync(local(relative), 'utf8').split('\n').filter(Boolean).map(line => {
    const at = line.indexOf(' :: ');
    assert.ok(at > 0, line);
    return [line.slice(0, at), line.slice(at + 4)];
  }));
}

test('domain policy: section 6 is the 2026-11-12 own-domain-first text; older wordings are gone; the status section is removed', () => {
  const patch = JSON.parse(fs.readFileSync(local('docs/copy/site-bot-domain-client-buys-2026-11-11.json'), 'utf8')).patches;
  const terms = patch.find(p => p.file === 'docs/legal/site-bot-terms-of-use.md');
  const final = copyFields('docs/copy/site-bot-terms-s6-and-checkout-final-2026-11-12.txt');
  // 2026-11-12 supersedes the 2026-11-11 client-buys paragraph (its "new" is the 11-12 "old").
  assert.equal(final['terms.s6.p1.old'], terms.new);
  assert.equal(source.split(final['terms.s6.p1.new']).length - 1, 1);
  assert.ok(!source.includes(final['terms.s6.p1.old']));
  assert.ok(!source.includes(terms.old));
  // The two words of the old policy named in the brief ("we will register", "from our account"), taken from the old text.
  const oldWords = terms.old.split(' ');
  const banned = [oldWords[13], oldWords[39]];
  assert.deepEqual(banned.map(w => w.length), [5, 8]);
  const generated = fs.readFileSync(local('src/lib/legal/siteBotTerms.ts'), 'utf8');
  for (const word of banned) {
    assert.ok(!source.includes(word), 'old domain wording left in the terms source');
    assert.ok(!generated.includes(word), 'old domain wording left in the generated terms');
    assert.ok(!html.includes(word), 'old domain wording rendered');
  }
  const section6 = TERMS.sections.find(s => s.id === 'section-6');
  assert.equal(section6.blocks[0].inlines.map(r => r.text).join(''), final['terms.s6.p1.new']);
  assert.ok(!TERMS.sections.some(s => s.id === 'section-21'));
  assert.ok(!/^### 21\./m.test(source));
});
