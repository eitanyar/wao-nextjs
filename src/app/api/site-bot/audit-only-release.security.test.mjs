import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('audit page excludes grid, paid, outbound, and mutation reachability', () => {
  const source = read('src/app/(app)/site-bot/audit/page.tsx');
  for (const forbidden of ['grid-scan', 'GeoGridVisualizer', 'ScorecardShareSection', '/site-bot/start', '/site-bot/pay', '/site-bot/generate', '/site-bot/deploy', 'phoneInput', 'handleShare', 'CTA_SHARE']) {
    assert.equal(source.includes(forbidden), false, `unexpected audit-page seam: ${forbidden}`);
  }
  assert.match(source, /AUDIT_DISCLOSURE/);
  assert.match(source, /href="\/privacy"/);
  const destination = '/contact?ref=site-bot-audit#contact-form';
  const hrefs = [...source.matchAll(/<Link\s+href="([^"]+)"/g)].map(([, href]) => href);
  assert.deepEqual(hrefs.filter(href => href.startsWith('/contact')), [destination]);
  const result = source.slice(source.indexOf("{state === 'ready'"), source.indexOf("{state === 'not_found'"));
  const notFound = source.slice(source.indexOf("{state === 'not_found'"));
  assert.match(result, /renderHelpForm\(\)/);
  assert.doesNotMatch(result, /href="\/contact\?ref=site-bot-audit#contact-form"/);
  assert.match(notFound, /href="\/contact\?ref=site-bot-audit#contact-form"/);
  for (const href of hrefs.filter(href => href.startsWith('/contact'))) {
    const url = new URL(href, 'https://example.invalid');
    assert.equal(url.pathname, '/contact');
    assert.equal(url.hash, '#contact-form');
    assert.deepEqual([...url.searchParams.entries()], [['ref', 'site-bot-audit']]);
    assert.doesNotMatch(href, /auditId|businessName|placeId|provider|location|websiteUri/i);
  }
});

test('offer page CTAs carry only their static ref to the existing contact form', () => {
  const offer = read('src/app/(app)/site-bot/page.tsx');
  const audit = read('src/app/(app)/site-bot/audit/page.tsx');
  const contact = read('src/app/(app)/contact/page.tsx');
  const allOfferHrefs = [...offer.matchAll(/<Link\s+href="([^"]+)"/g)].map(([, href]) => href);
  const offerHrefs = allOfferHrefs.filter(href => href.startsWith('/contact'));
  // Checkout is offline: the three primary CTAs go to the contact form, never /site-bot/start.
  assert.deepEqual(offerHrefs, Array(3).fill('/contact?ref=site-bot-build#contact-form'));
  assert.equal(offer.includes('/site-bot/start'), false);
  assert.equal(allOfferHrefs.filter(href => href === '/site-bot/audit').length, 2);
  for (const href of offerHrefs) {
    const offerUrl = new URL(href, 'https://example.invalid');
    assert.equal(offerUrl.pathname, '/contact');
    assert.equal(offerUrl.hash, '#contact-form');
    assert.deepEqual([...offerUrl.searchParams.entries()], [['ref', 'site-bot-build']]);
    assert.doesNotMatch(href, /auditId|businessName|placeId|provider|location|websiteUri/i);
  }
  const auditHrefs = [...audit.matchAll(/<Link\s+href="([^"]+)"/g)]
    .map(([, href]) => href).filter(href => href.startsWith('/contact'));
  assert.deepEqual(auditHrefs, ['/contact?ref=site-bot-audit#contact-form']);
  assert.match(contact, /id="contact-form"/);
  assert.match(contact, /<ContactForm source="contact-page"\s*\/>/);
  assert.doesNotMatch(contact, /site-bot-build|site-bot-audit/);
  assert.deepEqual([...new URL('/contact', 'https://example.invalid').searchParams.entries()], []);
});

test('contact destination consumes optional ref without changing the acknowledged lead boundary', () => {
  const contact = read('src/app/(app)/contact/page.tsx');
  const tracking = read('src/lib/useLeadTracking.ts');
  const form = read('src/components/ContactForm.tsx');
  const lead = read('src/app/api/lead/route.ts');
  assert.match(contact, /id="contact-form"/);
  assert.match(contact, /<ContactForm source="contact-page"\s*\/>/);
  assert.doesNotMatch(contact, /site-bot-audit/);
  assert.equal(new URL('/contact', 'https://example.invalid').searchParams.get('ref'), null);
  assert.match(tracking, /new URLSearchParams\(window\.location\.search\)/);
  assert.match(tracking, /ref: params\.get\("ref"\)/);
  assert.match(form, /ref: tracking\.ref \?\? undefined/);
  assert.match(form, /"ok" in acknowledgement && acknowledgement\.ok === true/);
  assert.match(form, /if \(accepted\) \{\s*window\.dataLayer = window\.dataLayer \|\| \[\];\s*window\.dataLayer\.push\(\{ event: "lead_submit", source, ref: tracking\.ref \?\? undefined \}\);/);
  assert.match(lead, /ref: leadField\(body\.ref, 200\) \|\| undefined/);
  assert.match(lead, /return leadResponse\(req, accepted \? 200 : 503, \{ ok: accepted \}\)/);
});

test('cookie banner suppresses the audit conversion route', () => {
  const source = read('src/components/CookieBanner.tsx');
  assert.match(source, /"\/site-bot\/audit"/);
});

test('lookup minimizes provider records, rejects phone input, and logs bounded codes', () => {
  const source = read('src/app/api/site-bot/audit-lookup/route.ts');
  for (const forbidden of ['normalizePhone', 'persistAudit', 'nationalPhoneNumber:', 'websiteUri:', 'editorialSummary:', 'location:', 'console.error(\'audit-lookup error:\'']) {
    assert.equal(source.includes(forbidden), false, `unexpected lookup seam: ${forbidden}`);
  }
  assert.match(source, /body\?\.phone/);
  assert.match(source, /AUDIT_LOOKUP_FAILED/);
  assert.match(source, /writeAuditRecord/);
});

test('result route redacts full provider records and uses the audit store', () => {
  const source = read('src/app/api/site-bot/audit-result/route.ts');
  for (const forbidden of ['withPlace', 'googleMapsUri', 'primaryCategory', 'nationalPhoneNumber', 'internationalPhoneNumber', 'fs.readFileSync', 'path.join']) {
    assert.equal(source.includes(forbidden), false, `unexpected result seam: ${forbidden}`);
  }
  assert.match(source, /readAuditRecord/);
  assert.match(source, /AUDIT_RESULT_FAILED/);
});

test('audit store stays within UUID JSON records and enforces expiry', () => {
  const source = read('src/lib/site-bot/auditStore.ts');
  for (const required of ['isAuditExpired', 'deleteAuditRecord', 'purgeExpiredAuditRecords', 'AUDIT_RETENTION_MS', 'fs.lstatSync']) {
    assert.match(source, new RegExp(required));
  }
  assert.equal(source.includes('data/clients'), false);
});

test('direct grid-scan POST stays disabled before any provider or request access', () => {
  const source = read('src/app/api/site-bot/grid-scan/route.ts');
  assert.equal(source.trim(), `import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json(
    { error: 'grid_scan_disabled' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
  );
}`);
});

test('direct GBP connection POST stays disabled before any binding or request access', () => {
  const source = read('src/app/api/site-bot/connect-gbp/route.ts');
  assert.equal(source.trim(), `import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json(
    { error: 'gbp_connect_disabled' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
  );
}`);
});

test('both public GBP OAuth GETs stay disabled before state, token or binding access', () => {
  for (const route of ['start', 'callback']) {
    const source = read(`src/app/api/site-bot/gbp/oauth/${route}/route.ts`);
    assert.equal(source.trim(), `import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'gbp_oauth_disabled' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
  );
}`);
  }
});

test('public GBP connection status GET stays disabled before audit or request access', () => {
  const source = read('src/app/api/site-bot/connect-status/route.ts');
  assert.equal(source.trim(), `import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'gbp_status_disabled' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
  );
}`);
});

test('direct fix-approval POST stays disabled before audit, log or request access', () => {
  const source = read('src/app/api/site-bot/fix-approve/route.ts');
  assert.equal(source.trim(), `import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'fix_approval_disabled' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
  );
}`);
});

test('direct fix-execution POST stays disabled before plan, log, token, GBP or request access', () => {
  const source = read('src/app/api/site-bot/fix-execute/route.ts');
  assert.equal(source.trim(), `import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'fix_execution_disabled' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
  );
}`);
});

test('direct fix-plan POST stays disabled before audit, rate, scorer, planner, write or request access', () => {
  const source = read('src/app/api/site-bot/fix-plan/route.ts');
  assert.equal(source.trim(), `import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'fix_plan_disabled' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
  );
}`);
});

test('direct fix page throws Next 404 before props, imports, or effects', async () => {
  const { default: ts } = await import('typescript');
  const { default: vm } = await import('node:vm');
  const pagePath = path.join(root, 'src/app/(product)/site-bot/fix/[auditId]/page.tsx');
  const source = read('src/app/(product)/site-bot/fix/[auditId]/page.tsx');
  assert.equal(source.trim(), `import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  robots: { index: false },
};

export default function SiteBotFixPage() {
  notFound();
}`);
  const code = ts.transpileModule(source, {
    fileName: pagePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const unexpected = [];
  const deny = name => { unexpected.push(name); throw new Error(`unexpected ${name}`); };
  const exports = {};
  const notFound = () => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404'); };
  vm.runInNewContext(code, {
    exports,
    require: name => name === 'next/navigation' ? { notFound } : deny(`import: ${name}`),
    process: new Proxy({}, { get: (_, name) => deny(`process.${String(name)}`) }),
    fetch: () => deny('fetch'),
    console: new Proxy({}, { get: (_, name) => deny(`console.${String(name)}`) }),
    Date: class { constructor() { deny('clock'); } static now() { deny('clock'); } },
    setTimeout: () => deny('setTimeout'),
    setInterval: () => deny('setInterval'),
  }, { filename: pagePath });
  assert.deepEqual(Object.keys(exports).sort(), ['default', 'metadata']);
  assert.equal(exports.metadata.robots.index, false);
  const trapped = fixture => new Proxy(fixture, {
    get: (_, key) => deny(`props.${String(key)}`),
    ownKeys: () => deny('props keys'),
    getOwnPropertyDescriptor: () => deny('props descriptor'),
  });
  for (const props of [
    undefined,
    null,
    trapped({ params: Promise.resolve({ auditId: '../../escape' }) }),
    trapped({ params: Promise.resolve({ auditId: '123e4567-e89b-42d3-a456-426614174000' }) }),
    trapped({ params: { then: () => deny('params thenable') }, searchParams: { then: () => deny('search thenable') },
      authorized: true, env: { ENABLE_FIX_PAGE: 'true' } }),
  ]) {
    assert.throws(() => exports.default(props), { message: 'NEXT_HTTP_ERROR_FALLBACK;404' });
    assert.deepEqual(unexpected, []);
  }
});

test('direct Site-Bot start page is server-only and throws 404 before intake or checkout access', async () => {
  const { default: ts } = await import('typescript');
  const { default: vm } = await import('node:vm');
  const pagePath = path.join(root, 'src/app/(app)/site-bot/start/page.tsx');
  const source = read('src/app/(app)/site-bot/start/page.tsx');
  assert.equal(source.trim(), `import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  robots: { index: false },
};

export default function SiteBotStartPage() {
  notFound();
}`);
  const code = ts.transpileModule(source, {
    fileName: pagePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const unexpected = [];
  const deny = name => { unexpected.push(name); throw new Error(`unexpected ${name}`); };
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: name => name === 'next/navigation' ? { notFound: () => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404'); } } : deny(`import: ${name}`),
    process: new Proxy({}, { get: (_, name) => deny(`process.${String(name)}`) }),
    fetch: () => deny('fetch'),
    console: new Proxy({}, { get: (_, name) => deny(`console.${String(name)}`) }),
    Date: class { constructor() { deny('clock'); } static now() { deny('clock'); } },
    setTimeout: () => deny('setTimeout'),
    setInterval: () => deny('setInterval'),
  }, { filename: pagePath });
  assert.deepEqual(Object.keys(exports).sort(), ['default', 'metadata']);
  assert.equal(exports.metadata.robots.index, false);
  const trapped = new Proxy({}, {
    get: (_, key) => deny(`props.${String(key)}`),
    ownKeys: () => deny('props keys'),
    getOwnPropertyDescriptor: () => deny('props descriptor'),
  });
  for (const props of [undefined, null, trapped]) {
    assert.throws(() => exports.default(props), { message: 'NEXT_HTTP_ERROR_FALLBACK;404' });
    assert.deepEqual(unexpected, []);
  }
});

test('both public checkout POSTs stay disabled before request, pending record, provider or research access', () => {
  const disabled = `import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'checkout_unavailable' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
  );
}`;
  for (const route of ['init', 'callback']) {
    assert.equal(read(`src/app/api/site-bot/checkout/${route}/route.ts`).trim(), disabled);
  }
});

test('audit lookup reserves four durable provider slots before purge and search', () => {
  const route = read('src/app/api/site-bot/audit-lookup/route.ts');
  const budget = read('src/lib/site-bot/auditLookupBudget.ts');
  assert.match(route, /reserveSiteBotAuditLookup\(store, ceiling\)/);
  assert.ok(route.indexOf('reserveSiteBotAuditLookup(store, ceiling)') < route.indexOf('purgeExpiredAuditRecords();'));
  assert.ok(route.indexOf('purgeExpiredAuditRecords();') < route.indexOf('searchPlacesByName({ name: businessName })'));
  assert.match(route, /audit_budget_unavailable/);
  assert.match(route, /audit_budget_exhausted/);
  assert.match(budget, /CALLS_PER_LOOKUP = 4/);
  assert.match(budget, /\.immediate\(\)/);
});

test('audit lookup bounds streamed bytes before rate, key, reservation and store access', async () => {
  const { default: ts } = await import('typescript');
  const { default: vm } = await import('node:vm');
  const routePath = path.join(root, 'src/app/api/site-bot/audit-lookup/route.ts');
  const source = read('src/app/api/site-bot/audit-lookup/route.ts');
  const post = source.slice(source.indexOf('export async function POST('));
  assert.ok(post.indexOf('await readBoundedAuditLookupBody(req)') >= 0);
  assert.ok(post.indexOf('await readBoundedAuditLookupBody(req)') < post.indexOf('checkRateLimit('));
  assert.ok(post.indexOf('checkRateLimit(') < post.indexOf('reserveSiteBotAuditLookup('));
  assert.doesNotMatch(source, /req\.(?:json|text)\(/);
  const code = ts.transpileModule(source, {
    fileName: routePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const accessed = [];
  const deny = name => { accessed.push(name); throw new Error(`unexpected ${name}`); };
  const exports = {};
  vm.runInNewContext(code, {
    exports, TextDecoder, Uint8Array,
    require: name => name === 'next/server'
      ? { NextResponse: { json: (body, options) => Response.json(body, options) } }
      : new Proxy({}, { get: (_, property) => property === '__esModule' ? true : deny(`${name}.${String(property)}`) }),
    process: new Proxy({}, { get: (_, name) => deny(`process.${String(name)}`) }),
    console: new Proxy({}, { get: (_, name) => deny(`console.${String(name)}`) }),
  }, { filename: routePath });
  let cancelled = false;
  const stream = new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(4097)); },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  const request = new Request('https://example.invalid/audit-lookup', { method: 'POST', body: stream, duplex: 'half' });
  Object.defineProperty(request, 'headers', { get: () => deny('headers') });
  const response = await exports.POST(request);
  assert.equal(response.status, 413);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.deepEqual(await response.json(), { error: 'payload_too_large' });
  assert.equal(cancelled, true);
  assert.deepEqual(accessed, []);
});
