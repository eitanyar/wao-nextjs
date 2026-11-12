// HEBREW-SAFETY: zero Hebrew bytes. The generated how-it-works copy module is exactly what the generator emits today.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SOURCE, OUTPUT, generate, parseSource, pick, tokenizePrice } from './build-how-it-works-copy.mjs';
import { NET_TOKEN } from './build-landing-copy.mjs';

const source = fs.readFileSync(SOURCE, 'utf8');

test('committed how-it-works copy module is exactly the generated one (re-run scripts/build-how-it-works-copy.mjs)', () => {
  assert.equal(fs.readFileSync(OUTPUT, 'utf8'), generate(source));
  assert.ok([...fs.readFileSync(new URL('./build-how-it-works-copy.mjs', import.meta.url), 'utf8')].every(c => c.codePointAt(0) < 128));
});

test('only rendered fields are emitted; discarded blocks never reach the module', () => {
  const src = parseSource(source);
  const out = pick(src);
  assert.deepEqual(Object.keys(out).sort(), ['answer_block', 'breadcrumb', 'closing', 'description', 'h1', 'hub_link', 'intro', 'silo_nav', 'steps', 'title', 'webpage_name']);
  const generated = fs.readFileSync(OUTPUT, 'utf8');
  for (const phrase of src.negative_free_intent_phrases?.block ?? []) {
    // a discarded phrase may still occur inside approved prose, but never as a JSON string value of its own
    assert.ok(!generated.includes(JSON.stringify(phrase) + ','), phrase);
  }
  assert.equal(out.title, src.title_options[0]);
  assert.equal(out.h1, src.h1_options[0]);
  assert.equal(out.description, src.meta_description_options[src.seo.meta_chosen - 1]);
  assert.equal(out.steps.length, 8);
  assert.ok(!generated.includes(src.no_link_to));
  assert.equal(out.hub_link.href, '/google-ads/how-it-works');
  assert.equal(out.closing.cta, src.links.find(l => l.href === 'DEMO_HREF').anchor);
});

test('the generator fails closed', () => {
  const src = parseSource(source);
  assert.throws(() => parseSource('no block'), /Expected 1 fenced/);
  assert.throws(() => pick({ ...src, title_options: [src.title_options[0], 'x'] }), /exactly one ruled/);
  assert.throws(() => pick({ ...src, no_link_to: '/knowledge/google-ads-quality-score' }), /no_link_to/);
  assert.throws(() => pick({ ...src, closing: { ...src.closing, body: src.closing.body + ' [x](/y)' } }), /Unruled link/);
  assert.throws(() => tokenizePrice({ a: 'x 249 y 249' }, '249', 1), /Expected 1/);
  assert.deepEqual(tokenizePrice({ a: '249 2490' }, '249', 1), { a: `${NET_TOKEN} 2490` });
});
