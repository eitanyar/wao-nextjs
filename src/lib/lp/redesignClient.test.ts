// Client-site redesign (design review 2026-11-14 client items 2, 4, 5, 6, 8; Yonatan guardrail 4), rendered from the
// demo site record the video recorder uses. HEBREW-SAFETY: ZERO Hebrew bytes; expectations come from the record/labels.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { renderResearchedSitePages, researchedServiceAreas, type ResearchedSitePage } from './researchedSite';
import { researchedRenderInputs } from '../site-bot/researchToSite';
import { serviceIcon } from './siteDesign';
import { parseBusinessHours } from './businessHours';
import type { CollectedData } from '../bot/prompts';

const root = process.cwd();
const record = JSON.parse(fs.readFileSync(path.join(root, 'data/video/demo/stand-in/site-record.json'), 'utf8'));
const pages = record.researchedPages as ResearchedSitePage[];

function render(data: CollectedData = record.collectedData) {
  return renderResearchedSitePages({
    ...researchedRenderInputs(data, 'demo-plumber'),
    siteUrl: 'https://demo-plumber.invalid',
    data,
    slug: 'demo-plumber',
    pages: structuredClone(pages),
    graphEdges: structuredClone(record.researchedGraphEdges),
  });
}

const schemaBusiness = (html: string) => {
  const json = /<script type="application\/ld\+json">([^]*?)<\/script>/.exec(html)![1];
  const parsed = JSON.parse(json);
  return (parsed['@graph'] ?? [parsed]).find((item: Record<string, unknown>) => String(item['@id'] ?? '').endsWith('#business'));
};

test('client item 2: no letter avatar on any page (no photo, no circle)', () => {
  for (const [file, html] of Object.entries(render())) {
    if (!file.endsWith('.html')) continue;
    assert.doesNotMatch(html, /border-radius:50%;background:[^;]+;margin:0 auto (?:16|20)px;display:flex/, file);
  }
});

test('client item 5: every section wrapper is the one 1120px container, start-aligned', () => {
  const files = render();
  for (const file of ['index.html', 'services/leak-detection.html']) {
    const html = files[file];
    const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
    const widths = new Set([...main.matchAll(/max-width:(\d+)px;margin:0 auto/g)].map((m) => m[1]));
    assert.deepEqual([...widths], ['1120'], `${file}: ${[...widths]}`);
    assert.doesNotMatch(main.replace(/<form[^]*?<\/form>/, ''), /<h2[^>]*text-align:center/, `${file}: centred heading`);
  }
});

test('client item 6: per-service icons from a fixed set, neutral fallback; never from Hebrew', () => {
  assert.equal(serviceIcon('svc-leak-detection /services/leak-detection'), 'drop');
  assert.equal(serviceIcon('svc-drain-cleaning'), 'drain');
  assert.equal(serviceIcon('svc-water-heater-installation'), 'sun');
  assert.equal(serviceIcon('svc-ac-repair'), 'snow');
  assert.equal(serviceIcon('svc-electric-panel'), 'bolt');
  assert.equal(serviceIcon('svc-locksmith'), 'lock');
  assert.equal(serviceIcon('svc-tiling'), 'svc');
  assert.equal(serviceIcon('accent-wall'), 'svc', 'no false AC match inside a word');
  assert.equal(serviceIcon(null), 'svc');
  const home = render()['index.html'];
  const icons = [...home.matchAll(/<span class="tile"><svg[^>]*><use href="#i-([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(icons, ['drop', 'drain', 'sun']);
  for (const name of icons) assert.ok(home.includes(`<symbol id="i-${name}"`), `sprite has ${name}`);
  assert.match(home, /\.svc-card\{position:relative;height:100%;/);
});

test('client item 8 + Yonatan 4: the footer NAP equals the schema (name, +972 phone link, areas, hours) on every page', () => {
  const files = render();
  for (const file of ['index.html', 'services/leak-detection.html']) {
    const html = files[file];
    const business = schemaBusiness(html);
    const footer = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));
    assert.ok(footer.includes(`data-footer-name style="margin:0 0 6px;"><strong`), `${file}: name row`);
    assert.ok(footer.includes(`>${business.name}</strong>`), `${file}: name == schema name`);
    assert.ok(footer.includes(`href="tel:${business.telephone}"`), `${file}: phone link == schema telephone`);
    assert.equal(business.telephone, '+972500000000');
    const page = pages.find((p) => file === 'index.html' ? p.classification === 'homepage' : p.targetPath === '/services/leak-detection')!;
    const areas = researchedServiceAreas(page);
    assert.deepEqual(business.areaServed.map((a: { name: string }) => a.name), areas);
    const areasRow = /data-footer-areas[^>]*><strong>[^<]+<\/strong> ([^<]+)<\/p>/.exec(footer)![1];
    assert.deepEqual(areasRow.split(' · '), areas, `${file}: footer areas == schema areaServed`);
    assert.doesNotMatch(footer, /data-footer-address/, 'no address unless the record has one');
    // Hours: the row exists exactly when the schema carries openingHoursSpecification (same parse).
    assert.equal(/data-footer-hours/.test(footer), Array.isArray(business.openingHoursSpecification), `${file}: hours row == schema hours`);
  }
  // A record whose hours parse: the row and the schema both carry them.
  const withHours = render({ ...record.collectedData, businessHours: 'Sun-Thu 08:00-18:00' } as CollectedData)['index.html'];
  assert.ok(parseBusinessHours('Sun-Thu 08:00-18:00'));
  assert.ok(Array.isArray(schemaBusiness(withHours).openingHoursSpecification));
  assert.match(withHours.slice(withHours.indexOf('<footer')), /data-footer-hours/);
  assert.match(withHours, /data-hero-hours/);
});

test('Yonatan 4: unparseable hours -> no hero hours row, no footer hours row, no schema hours', () => {
  const data = { ...record.collectedData, businessHours: 'mornings mostly' } as CollectedData;
  const home = render(data)['index.html'];
  assert.doesNotMatch(home, /data-hero-hours|data-footer-hours/);
  assert.equal(schemaBusiness(home).openingHoursSpecification, undefined);
  assert.doesNotMatch(home, /priceRange|paymentAccepted|"openingHours"/);
});
