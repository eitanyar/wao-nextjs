import assert from 'node:assert/strict';
import test from 'node:test';
import type { ResearchedSitePage } from '../lp/researchedSite';
import {
  compareSegments,
  existingWebsiteCheck,
  internalLinkCheck,
  isCodeBuiltQaItem,
  longestSharedRun,
  maskedWords,
  modelWrittenStrings,
  napCheck,
  nationalPhone,
  similarityStatus,
  siteSegments,
  type PreflightSiteRecord,
} from './reviewPreflight';

// HEBREW-SAFETY: synthetic Latin fixtures only.

const page = (classification: string, copy: Record<string, unknown>): ResearchedSitePage =>
  ({ opportunityId: classification, classification, targetPath: classification === 'homepage' ? '/' : '/services/x', copy } as unknown as ResearchedSitePage);

const record = (name: string, city: string, hero: string, about: string, detail = 'I find the leak with a thermal camera before I open any wall'): PreflightSiteRecord => ({
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  researchId: 'r1',
  collectedData: { businessName: name, businessNiche: 'plumber', targetLocation: city, phone: '050-1234567' },
  researchedPages: [page('homepage', {
    heroHeadline: hero,
    heroSubheadline: `Call ${name} in ${city} today`,
    heroCta: 'Call now and book the same day visit',
    aboutPageBody: about,
    serviceItems: ['Leak Detection'],
    serviceDetails: [{ name: 'Leak Detection', description: detail }],
    trustBarItems: ['Two year warranty on every pipe job we do'],
  })],
});

test('similarity: identical model text with different NAP is a FAIL, masked names and places do not count', () => {
  const about = 'I have fixed pipes for twelve years and I always leave the bathroom clean and dry when I go';
  const a = record('Alpha Plumbing', 'Springfield', 'Same day leak repair without breaking your tiles', about);
  const b = record('Beta Pipes', 'Shelbyville', 'Same day leak repair without breaking your tiles', about);
  const result = compareSegments(siteSegments(a, null), siteSegments(b, null));
  assert.ok(result.jaccard > 0.25, `jaccard ${result.jaccard}`);
  assert.equal(result.status, 'FAIL');
  assert.ok(!result.run.includes('alpha') && !result.run.includes('springfield'));
});

test('similarity: distinct copy passes; one shared 8-word run alone is a WARN', () => {
  const a = record('Alpha Plumbing', 'Springfield', 'Burst pipe at night handled by one calm technician', 'My father taught me to solder copper on a farm near the river');
  const b = record('Beta Pipes', 'Shelbyville', 'Blocked drains cleared with a camera and a written report', 'I started as an apprentice in a hotel boiler room twenty years back', 'Every job ends with a pressure test and photos sent to you');
  const distinct = compareSegments(siteSegments(a, null), siteSegments(b, null));
  assert.equal(distinct.status, 'PASS', JSON.stringify(distinct));
  assert.equal(similarityStatus(0.05, 8), 'WARN');
  assert.equal(similarityStatus(0.16, 2), 'WARN');
  assert.equal(similarityStatus(0.26, 0), 'FAIL');
  assert.equal(similarityStatus(0.15, 7), 'PASS');
});

test('similarity: code-built fields (heroCta, serviceItems, trustBarItems, code Q&A) and labels are excluded', () => {
  const strings = modelWrittenStrings(page('money_service', {
    heroHeadline: 'Model hero',
    heroCta: 'System CTA',
    trustBarItems: ['Code trust item'],
    serviceItems: ['Label'],
    qaItems: [
      { questionId: 'q1', q: 'Pool question?', a: 'Code price answer', factIds: ['system-pricing'] },
      { questionId: 'q2', q: 'Another pool question?', a: 'Model answer', factIds: ['offer', 'proof-responseTime'] },
    ],
  }));
  assert.deepEqual(strings, ['Model hero', 'Model answer']);
  assert.equal(isCodeBuiltQaItem({ factIds: ['proof-guarantee'] }), true);
  assert.equal(isCodeBuiltQaItem({ factIds: ['offer'] }), false);
});

test('longestSharedRun never crosses a segment boundary; masking removes the mask words', () => {
  const run = longestSharedRun([['a', 'b', 'c'], ['d', 'e']], [['c', 'd', 'e'], ['a', 'b']]);
  assert.deepEqual(run, { length: 2, words: ['a', 'b'] });
  assert.deepEqual(maskedWords('Call Alpha Plumbing in Springfield now', ['Alpha Plumbing', 'Springfield']), ['call', 'in', 'now']);
});

const html = (body: string, schema?: Record<string, unknown>) =>
  `<html><head>${schema ? `<script type="application/ld+json">${JSON.stringify(schema)}</script>` : ''}</head><body>${body}</body></html>`;

test('NAP: matching name, phone (local, +972 and wa.me forms) and address pass', () => {
  const files = {
    'index.html': html('<h1>Alpha Plumbing</h1><a href="tel:050-1234567">050-1234567</a><a href="https://wa.me/972501234567">wa</a>',
      { '@type': 'Plumber', name: 'Alpha Plumbing', telephone: '+972501234567', address: { streetAddress: '1 Main St' } }),
    'contact.html': html('<p>Alpha Plumbing, 1 Main St</p><a href="tel:+972501234567">call</a>'),
    'privacy.html': html('<p>Alpha Plumbing privacy</p>'),
  };
  const check = napCheck(files, { businessName: 'Alpha Plumbing', phone: '050-1234567', streetAddress: '1 Main St' });
  assert.equal(check.status, 'PASS', check.details.join('\n'));
});

test('NAP: a foreign phone, a schema name mismatch, a missing name and an unknown street address fail', () => {
  const files = {
    'index.html': html('<h1>Alpha Plumbing</h1><a href="tel:052-9999999">call</a>', { '@type': 'Plumber', name: 'Alpha Plumbing Ltd', telephone: '050-1234567', address: { streetAddress: '9 Other Rd' } }),
    'services/x.html': html('<h1>Leak detection</h1><a href="tel:050-1234567">call</a>'),
  };
  const check = napCheck(files, { businessName: 'Alpha Plumbing', phone: '050-1234567' });
  assert.equal(check.status, 'FAIL');
  const text = check.details.join('\n');
  assert.match(text, /052-9999999/);
  assert.match(text, /schema business name/);
  assert.match(text, /services\/x\.html: business name/);
  assert.match(text, /record has none/);
});

test('nationalPhone normalises the Israeli forms and rejects junk', () => {
  assert.equal(nationalPhone('+972-50-123-4567'), '0501234567');
  assert.equal(nationalPhone('972501234567'), '0501234567');
  assert.equal(nationalPhone('03-1234567'), '031234567');
  assert.equal(nationalPhone('12'), null);
});

test('internal links: missing page and missing fragment fail; own absolute origin is internal', () => {
  const ok = internalLinkCheck({ 'index.html': '<a href="/contact">c</a><a href="#about">a</a><div id="about"></div>', 'contact.html': '<a href="https://s.wao.co.il/">home</a>' }, 'https://s.wao.co.il');
  assert.equal(ok.status, 'PASS', ok.details.join('\n'));
  const bad = internalLinkCheck({ 'index.html': '<a href="/services/gone">g</a><a href="/#nope">n</a>' }, 'https://s.wao.co.il');
  assert.equal(bad.status, 'FAIL');
  assert.equal(bad.details.length, 2);
});

test('existing website: websiteUri or an audit hasWebsite fails (pilot policy); a declared domain warns', () => {
  assert.equal(existingWebsiteCheck({ websiteUri: 'https://alpha.example' }, []).status, 'FAIL');
  assert.match(existingWebsiteCheck({}, [{ placeId: 'p', hasWebsite: true }]).details.join(' '), /no-website businesses only/);
  assert.equal(existingWebsiteCheck({ domainChoice: 'has_domain', ownerDomain: 'alpha.co.il' }, []).status, 'WARN');
  assert.equal(existingWebsiteCheck({ domainChoice: 'no_domain' }, [{ placeId: 'p', hasWebsite: false }]).status, 'PASS');
});
