// Knowledge illustration pilot: data map, built files (size budget + IPTC XMP), and page wiring
// (<picture> after the first H2 block, JSON-LD image, og:image on the 12 pilot slugs only).
// HEBREW-SAFETY: zero Hebrew bytes. Every Hebrew expectation is read from the waocopy source or knowledge.ts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import ts from 'typescript';
import { SLUGS, VARIANTS, OUT_DIR, DIGITAL_SOURCE_TYPE, readAlts, renderDataModule } from './build-knowledge-illustrations.mjs';

const repository = fileURLToPath(new URL('../', import.meta.url));
const local = relative => path.join(repository, relative);

function load(file, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports, URL, require(name) {
    assert.ok(Object.hasOwn(imports, name), `unexpected import: ${name}`);
    return imports[name];
  } }, { filename: file });
  return exports;
}

const react = { react: React, 'react/jsx-runtime': jsx };
const bidi = load(local('src/lib/bidi.tsx'), react);
const knowledge = load(local('src/data/knowledge.ts'));
const illustrations = load(local('src/data/knowledgeIllustrations.ts'));
const Link = ({ href, children, ...rest }) => React.createElement('a', { href, ...rest }, children);
const page = load(local('src/app/(app)/knowledge/[slug]/page.tsx'), {
  ...react,
  'next/link': { __esModule: true, default: Link },
  'next/navigation': { notFound() { throw new Error('notFound'); } },
  '@/data/knowledge': knowledge,
  '@/lib/bidi': bidi,
  '@/components/SiloNav': { __esModule: true, default: () => null },
  '@/data/knowledgeIllustrations': illustrations,
});

const NON_PILOT = knowledge.KNOWLEDGE_ARTICLES.map(a => a.slug).filter(s => !SLUGS.includes(s));
const params = slug => ({ params: Promise.resolve({ slug }) });
const renderPage = async slug => renderToStaticMarkup(await page.default(params(slug)));
const attr = text => renderToStaticMarkup(React.createElement('img', { alt: text })).slice(10, -3);
const jsonLdBlocks = html => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m => JSON.parse(m[1]));

test('data map: 12 pilot slugs, alts byte-equal to the waocopy source, generated file in sync', () => {
  const alts = readAlts();
  const map = illustrations.KNOWLEDGE_ILLUSTRATIONS;
  assert.deepEqual(Object.keys(map), SLUGS);
  for (const slug of SLUGS) {
    assert.equal(map[slug].alt, alts[slug]);
    assert.equal(map[slug].width, 1600);
    assert.equal(map[slug].height, 900);
    assert.ok(knowledge.KNOWLEDGE_ARTICLES.some(a => a.slug === slug), `${slug} is a real article`);
  }
  assert.equal(fs.readFileSync(local('src/data/knowledgeIllustrations.ts'), 'utf8'), renderDataModule(alts));
});

test('built files: every variant exists, right size, <=100 KB, carries IPTC DigitalSourceType', async () => {
  for (const slug of SLUGS) {
    for (const v of VARIANTS) {
      const file = path.join(OUT_DIR, `${slug}-${v.suffix}.${v.ext}`);
      const buf = fs.readFileSync(file);
      assert.ok(buf.length <= 100_000, `${file} is ${buf.length} bytes`);
      assert.ok(buf.includes(Buffer.from(DIGITAL_SOURCE_TYPE)), `${file} lacks DigitalSourceType`);
      const meta = await sharp(buf).metadata();
      assert.equal(meta.width, v.width);
      assert.equal(meta.height, v.height);
      assert.ok(meta.xmp && meta.xmp.toString().includes('Iptc4xmpExt:DigitalSourceType'), `${file} xmp`);
    }
  }
});

test('metadata: og:image only on pilot slugs; title and og:title unchanged', async () => {
  for (const slug of [...SLUGS, NON_PILOT[0]]) {
    const article = knowledge.KNOWLEDGE_ARTICLES.find(a => a.slug === slug);
    const meta = await page.generateMetadata(params(slug));
    assert.deepEqual(JSON.parse(JSON.stringify(meta.title)), article.metaTitle ? { absolute: article.metaTitle } : article.title);
    assert.equal(meta.openGraph.title, article.title);
    assert.equal(meta.description, article.summary);
    if (SLUGS.includes(slug)) {
      assert.deepEqual(JSON.parse(JSON.stringify(meta.openGraph.images.map(i => [i.url, i.width, i.height, i.type]))), // cross-realm (vm) arrays
        [[`https://www.wao.co.il/images/knowledge/${slug}-og.jpg`, 1200, 630, 'image/jpeg']]);
    } else {
      assert.equal('images' in meta.openGraph, false);
    }
  }
});

test('page: pilot renders <picture> right after the first H2 block, JSON-LD image array; non-pilot unchanged', async () => {
  for (const slug of SLUGS) {
    const article = knowledge.KNOWLEDGE_ARTICLES.find(a => a.slug === slug);
    const html = await renderPage(slug);
    assert.equal((html.match(/<picture>/g) || []).length, 1, `${slug} picture count`);
    const pic = html.indexOf('<picture>');
    assert.ok(html.indexOf('</h1>') < pic, 'picture after H1');
    const firstH2 = html.indexOf('<h2');
    assert.ok(firstH2 > 0 && firstH2 < pic, 'picture after first H2');
    assert.ok(html.lastIndexOf('</section>', pic) > firstH2, 'picture after the first section closes');
    const nextSection = html.indexOf('<section', pic);
    const firstWithHeading = article.sections.findIndex(s => s.heading);
    if (firstWithHeading < article.sections.length - 1) {
      assert.ok(nextSection > pic, 'a later section follows the picture');
      assert.equal(html.slice(0, pic).split('<section').length - 1, firstWithHeading + 1, 'exactly one section before');
    }
    const img = html.slice(pic, html.indexOf('</picture>', pic));
    assert.match(img, /<source type="image\/avif" srcSet="[^"]*-800\.avif 800w, [^"]*-1200\.avif 1200w"/);
    assert.match(img, /<source type="image\/webp" srcSet="[^"]*-800\.webp 800w, [^"]*-1200\.webp 1200w"/);
    assert.ok(img.includes(`alt="${attr(illustrations.KNOWLEDGE_ILLUSTRATIONS[slug].alt)}"`), `${slug} alt`);
    assert.match(img, /width="1600" height="900" loading="lazy" decoding="async"/);
    assert.match(img, /aspect-ratio:16 \/ 9/);
    const ld = jsonLdBlocks(html).find(b => b['@type'] === 'Article');
    assert.deepEqual(ld.image, ['1200.webp', '4x3.webp', '1x1.webp'].map(s => `https://www.wao.co.il/images/knowledge/${slug}-${s}`));
    assert.equal(ld.headline, article.title);
  }
  for (const slug of NON_PILOT.slice(0, 5)) {
    const html = await renderPage(slug);
    assert.equal(html.includes('<picture'), false, `${slug} has no picture`);
    assert.equal('image' in jsonLdBlocks(html).find(b => b['@type'] === 'Article'), false);
  }
});
