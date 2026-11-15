import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  CLOSED_GATE_ENVS, GATE_MODULE, OPEN_GATE_ENVS, REHEARSAL_GATE_ENVS, VALID_ADMIN_TOKEN,
  closedRequestCases, gatedCallbackSource, gatedProcess, gatedRouteSource, loadGate, openRequestCases,
} from './paidFlowGate.testkit.mjs';

const root = path.resolve(import.meta.dirname, '../../../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

// Paid-journey v2: the paid routes below are reachable ONLY through the runtime SITE_BOT_PAID_FLOW
// gate (src/lib/site-bot/paidFlowGate.ts): closed by default (and for the legacy '1' in production),
// 'rehearsal' = valid admin cookie only, 'open' = public. These checks keep the closed state identical
// to the audit-only release: same 503 body and headers, no request, import, cookie, network, clock,
// console or env access beyond the two gate keys.
async function assertGatedStub(relativePath, method, error, { callback = false } = {}) {
  const { default: ts } = await import('typescript');
  const { default: vm } = await import('node:vm');
  const source = read(relativePath);
  assert.equal(source.trim(), (callback ? gatedCallbackSource : gatedRouteSource)(method, error));
  const code = ts.transpileModule(source, {
    fileName: path.join(root, relativePath),
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const run = async (env, cookie) => {
    const unexpected = [];
    const deny = name => { unexpected.push(name); throw new Error(`unexpected ${name}`); };
    const exports = {};
    vm.runInNewContext(code, {
      exports,
      require: name => {
        if (name === 'next/server') return { NextResponse: { json: (body, options) => Response.json(body, options) } };
        if (name === GATE_MODULE) return loadGate(env, deny, { cookie }).gate;
        return deny(`import: ${name}`);
      },
      process: gatedProcess(env, deny),
      fetch: () => deny('fetch'),
      console: new Proxy({}, { get: (_, name) => deny(`console.${String(name)}`) }),
      Date: class { constructor() { deny('clock'); } static now() { deny('clock'); } },
      setTimeout: () => deny('setTimeout'),
      setInterval: () => deny('setInterval'),
    }, { filename: path.join(root, relativePath) });
    assert.deepEqual(Object.keys(exports), [method]);
    const request = new Proxy({}, {
      get: (_, key) => deny(`request.${String(key)}`),
      ownKeys: () => deny('request keys'),
      getOwnPropertyDescriptor: () => deny('request descriptor'),
    });
    let response = null;
    let thrown = null;
    try { response = await exports[method](request); } catch (error) { thrown = error; }
    return { response, thrown, unexpected };
  };
  const withCookies = envs => envs.flatMap(env => [undefined, VALID_ADMIN_TOKEN].map(cookie => ({ env, cookie })));
  // The provider's server callback carries no admin cookie, so for checkout/callback rehearsal opens it
  // without one (it authenticates by its own provider check); every other paid route needs the cookie.
  const closedCases = callback ? withCookies(CLOSED_GATE_ENVS) : closedRequestCases();
  const openCases = callback ? withCookies([...OPEN_GATE_ENVS, ...REHEARSAL_GATE_ENVS]) : openRequestCases();
  for (const { env, cookie } of closedCases) {
    const label = `${relativePath} ${JSON.stringify(env)} cookie=${JSON.stringify(cookie)}`;
    const { response, thrown, unexpected } = await run(env, cookie);
    assert.equal(thrown, null, `${label} threw`);
    assert.equal(response.status, 503, label);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    assert.deepEqual(await response.json(), { error });
    assert.deepEqual(unexpected, [], `${label} touched ${unexpected}`);
  }
  for (const { env, cookie } of openCases) {
    // With the gate open the stub's first and only effect is loading ./paid; it still
    // must not read the request before handing it over.
    const label = `${relativePath} ${JSON.stringify(env)} cookie=${JSON.stringify(cookie)}`;
    const { thrown, unexpected } = await run(env, cookie);
    assert.match(String(thrown?.message), /unexpected import: \.\/paid/, label);
    assert.deepEqual(unexpected, ['import: ./paid'], label);
  }
  const paidSibling = path.join(path.dirname(relativePath), 'paid.ts');
  assert.ok(fs.existsSync(path.join(root, paidSibling)), `${paidSibling} must exist`);
}

// Loads a gated page/layout with the real runtime gate (sandboxed). The module itself may not read
// process at all; it may only call connection() and then the gate, in that order, so the decision
// is made per request and never prerendered at build time. `events` records that order.
async function loadGatedServerModule(relativePath, env, cookie, extraRequire = () => undefined) {
  const { default: ts } = await import('typescript');
  const { default: vm } = await import('node:vm');
  const file = path.join(root, relativePath);
  const code = ts.transpileModule(read(relativePath), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const unexpected = [];
  const deny = name => { unexpected.push(name); throw new Error(`unexpected ${name}`); };
  const events = [];
  const rendered = [];
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: name => {
      if (name === 'next/server') return { connection: async () => { events.push('connection'); } };
      if (name === 'next/navigation') {
        return {
          redirect: url => { events.push(`redirect:${url}`); throw new Error(`NEXT_REDIRECT;${url}`); },
          notFound: () => deny('notFound'),
        };
      }
      if (name === GATE_MODULE) {
        const { gate } = loadGate(env, deny, { cookie });
        return { isPaidFlowAllowedForRequest: async () => { events.push('gate'); return gate.isPaidFlowAllowedForRequest(); } };
      }
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => { rendered.push(type); return { type, props }; } };
      const extra = extraRequire(name, deny);
      return extra === undefined ? deny(`import: ${name}`) : extra;
    },
    process: new Proxy({}, { get: (_, key) => deny(`process.${String(key)}`) }),
    fetch: () => deny('fetch'),
    console: new Proxy({}, { get: (_, key) => deny(`console.${String(key)}`) }),
    Date: class { constructor() { deny('clock'); } static now() { deny('clock'); } },
    setTimeout: () => deny('setTimeout'),
    setInterval: () => deny('setInterval'),
  }, { filename: file });
  return { exports, unexpected, events, rendered };
}

// Every env shape the build-time config must be indifferent to.
const ALL_GATE_ENVS = [...CLOSED_GATE_ENVS, ...OPEN_GATE_ENVS, ...REHEARSAL_GATE_ENVS];

async function nextConfigRedirects(env) {
  const { default: ts } = await import('typescript');
  const { default: vm } = await import('node:vm');
  const { createRequire } = await import('node:module');
  const req = createRequire(path.join(root, 'package.json'));
  const compiled = ts.transpileModule(read('next.config.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: id => req(id), __dirname: root, process: { env } }, { filename: 'next.config.ts' });
  // JSON round-trip: the vm realm's arrays/objects have foreign prototypes.
  return JSON.parse(JSON.stringify(await exports.default.redirects()));
}

test('paid handlers are imported only by their own gated stub', () => {
  const offenders = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(rel); continue; }
      if (!/\.(ts|tsx|mjs|js)$/.test(entry.name) || /\.test\.|testkit/.test(entry.name)) continue;
      const text = read(rel);
      if (/site-bot\/(checkout\/(init|callback)|connect-gbp|connect-status)\/paid/.test(text) || /StartPaidFlow/.test(text)) {
        offenders.push(rel);
      }
      if (/['"]\.\/paid['"]/.test(text)) offenders.push(rel);
    }
  };
  walk('src');
  assert.deepEqual(offenders.sort(), [
    'src/app/(app)/site-bot/start/page.tsx',
    'src/app/api/site-bot/checkout/callback/route.ts',
    'src/app/api/site-bot/checkout/init/route.ts',
    'src/app/api/site-bot/connect-gbp/route.ts',
    'src/app/api/site-bot/connect-status/route.ts',
    'src/app/api/site-bot/prefill/route.ts',
  ]);
});

test('next.config never redirects /site-bot/start at build time; the runtime gate in the page owns it', async () => {
  const { createRequire } = await import('node:module');
  const req = createRequire(path.join(root, 'package.json'));
  const { getPathMatch } = req('next/dist/shared/lib/router/utils/path-match');
  for (const env of ALL_GATE_ENVS) {
    const redirects = await nextConfigRedirects({ ...env });
    assert.deepEqual(redirects.filter(entry => entry.source === '/site-bot/start'), [], JSON.stringify(env));
    for (const pathname of ['/site-bot/start']) {
      const claimed = redirects.filter(entry => getPathMatch(entry.source, { strict: true, removeUnnamedParams: true })(pathname));
      assert.deepEqual(claimed, [], `${pathname} ${JSON.stringify(env)}`);
    }
  }
  // No build-time copy of the gate is left in the config.
  assert.doesNotMatch(read('next.config.ts'), /SITE_BOT_PAID_FLOW\s*===/);
});

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
  // Checkout is offline: the "talk to Eitan" CTAs (hero + close, r2 2026-11-12) go to the contact form, never /site-bot/start.
  assert.deepEqual(offerHrefs, Array(2).fill('/contact?ref=site-bot-build#contact-form'));
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
  // ok = mail acknowledged, or (client-site leads only) stored in the CRM. A main-site form has no slug,
  // so intake() returns stored: false before any store and the acknowledgement stays mail-only.
  assert.match(lead, /if \(!input\.slug\) return \{ stored: false, created: false \};/);
  assert.match(lead, /const ok = stored\.stored \|\| accepted;\s*return leadResponse\(req, ok \? 200 : 503, \{ ok \}\)/);
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

test('direct GBP connection POST stays disabled unless the runtime paid-flow gate allows the request', async () => {
  await assertGatedStub('src/app/api/site-bot/connect-gbp/route.ts', 'POST', 'gbp_connect_disabled');
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

test('public GBP connection status GET stays disabled unless the runtime paid-flow gate allows the request', async () => {
  await assertGatedStub('src/app/api/site-bot/connect-status/route.ts', 'GET', 'gbp_status_disabled');
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

test('direct Site-Bot start page 307s to /site-bot before intake or checkout access unless the runtime paid-flow gate allows the request', async () => {
  const source = read('src/app/(app)/site-bot/start/page.tsx');
  assert.equal(source.trim(), `import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { isPaidFlowAllowedForRequest } from '@/lib/site-bot/paidFlowGate';
import StartPaidFlow from './StartPaidFlow';

export const metadata: Metadata = {
  robots: { index: false },
};

// Paid-journey v2: the intake chat (./StartPaidFlow) renders ONLY when the runtime
// SITE_BOT_PAID_FLOW gate (src/lib/site-bot/paidFlowGate.ts) allows this request. Closed (the
// production default) 307s to /site-bot, as the old next.config redirect did. connection() makes
// the page render per request, so the gate is never answered once at build time.
export default async function SiteBotStartPage() {
  await connection();
  if (await isPaidFlowAllowedForRequest()) {
    return <StartPaidFlow />;
  }
  redirect('/site-bot');
}`);
  assert.match(read('src/app/(app)/site-bot/start/StartPaidFlow.tsx'), /^"use client";/);
  const load = async (env, cookie) => {
    let StartPaidFlow = null;
    const loaded = await loadGatedServerModule('src/app/(app)/site-bot/start/page.tsx', env, cookie, (name, deny) => {
      if (name !== './StartPaidFlow') return undefined;
      // The client component is a reference only: any property access means it ran on the server.
      StartPaidFlow = new Proxy(function StartPaidFlow() {}, { get: (_, key) => key === '__esModule' ? false : deny(`StartPaidFlow.${String(key)}`) });
      return StartPaidFlow;
    });
    return { ...loaded, StartPaidFlow };
  };
  const trapped = new Proxy({}, {
    get: (_, key) => { throw new Error(`unexpected props.${String(key)}`); },
    ownKeys: () => { throw new Error('unexpected props keys'); },
    getOwnPropertyDescriptor: () => { throw new Error('unexpected props descriptor'); },
  });
  for (const { env, cookie } of closedRequestCases()) {
    const label = `${JSON.stringify(env)} cookie=${JSON.stringify(cookie)}`;
    const { exports, unexpected, rendered, events } = await load(env, cookie);
    assert.deepEqual(Object.keys(exports).sort(), ['default', 'metadata']);
    assert.equal(exports.metadata.robots.index, false);
    for (const props of [undefined, null, trapped]) {
      await assert.rejects(exports.default(props), { message: 'NEXT_REDIRECT;/site-bot' }, label);
    }
    assert.deepEqual(events, ['connection', 'gate', 'redirect:/site-bot', 'connection', 'gate', 'redirect:/site-bot', 'connection', 'gate', 'redirect:/site-bot'], label);
    assert.deepEqual(unexpected, [], label);
    assert.deepEqual(rendered, []);
  }
  for (const { env, cookie } of openRequestCases()) {
    const label = `${JSON.stringify(env)} cookie=${JSON.stringify(cookie)}`;
    const { exports, unexpected, rendered, events, StartPaidFlow } = await load(env, cookie);
    const element = await exports.default(trapped);
    assert.equal(element.type, StartPaidFlow, label);
    assert.deepEqual(rendered, [StartPaidFlow]);
    assert.deepEqual(events, ['connection', 'gate'], label);
    assert.deepEqual(unexpected, [], label);
  }
});

test('both public checkout POSTs stay disabled unless the runtime paid-flow gate allows them (callback: no admin cookie in rehearsal)', async () => {
  await assertGatedStub('src/app/api/site-bot/checkout/init/route.ts', 'POST', 'checkout_unavailable');
  await assertGatedStub('src/app/api/site-bot/checkout/callback/route.ts', 'POST', 'checkout_unavailable', { callback: true });
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

test('next.config never redirects /site-bot/pay/* at build time; the runtime gate in the pay layout owns it (M0.5 B16)', async () => {
  const { createRequire } = await import('node:module');
  const req = createRequire(path.join(root, 'package.json'));
  const { getPathMatch } = req('next/dist/shared/lib/router/utils/path-match');
  const payPaths = ['/site-bot/pay', '/site-bot/pay/x', '/site-bot/pay/undefined',
    '/site-bot/pay/123e4567-e89b-42d3-a456-426614174000', '/site-bot/pay/a/b'];
  const matching = (redirects, pathname) => redirects.filter(entry => getPathMatch(entry.source, { strict: true, removeUnnamedParams: true })(pathname));
  for (const env of ALL_GATE_ENVS) {
    const redirects = await nextConfigRedirects({ ...env });
    assert.deepEqual(redirects.filter(entry => entry.source.startsWith('/site-bot/pay')), [], JSON.stringify(env));
    for (const pathname of payPaths) assert.deepEqual(matching(redirects, pathname), [], `${pathname} ${JSON.stringify(env)}`);
  }
});

test('pay layout 307s the mock card form to /site-bot before rendering children unless the runtime paid-flow gate allows the request (M0.5 B16)', async () => {
  const source = read('src/app/(product)/site-bot/pay/layout.tsx');
  assert.equal(source.trim(), `import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { isPaidFlowAllowedForRequest } from '@/lib/site-bot/paidFlowGate';

export const metadata: Metadata = {
  robots: { index: false },
};

// Paid-journey v2 M0.5 (B16): the mock checkout page under /site-bot/pay renders ONLY when the
// runtime SITE_BOT_PAID_FLOW gate (src/lib/site-bot/paidFlowGate.ts) allows this request. Closed
// (the production default) 307s every /site-bot/pay/* path to /site-bot before any child renders,
// as the old next.config redirect did. connection() keeps the decision per request.
export default async function SiteBotPayLayout({ children }: { children: ReactNode }) {
  await connection();
  if (await isPaidFlowAllowedForRequest()) {
    return children;
  }
  redirect('/site-bot');
}`);
  // The page itself is the only child segment; no sibling route can bypass the layout.
  assert.deepEqual(fs.readdirSync(path.join(root, 'src/app/(product)/site-bot/pay')).sort(), ['[sessionId]', 'layout.tsx']);
  assert.deepEqual(fs.readdirSync(path.join(root, 'src/app/(product)/site-bot/pay/[sessionId]')), ['page.tsx']);
  // An async layout's return value is probed for `then` by the promise machinery; nothing else may be read.
  const children = new Proxy({}, { get: (_, key) => { if (key === 'then') return undefined; throw new Error(`children rendered: ${String(key)}`); } });
  for (const { env, cookie } of closedRequestCases()) {
    const label = `${JSON.stringify(env)} cookie=${JSON.stringify(cookie)}`;
    const { exports, unexpected, events } = await loadGatedServerModule('src/app/(product)/site-bot/pay/layout.tsx', env, cookie);
    assert.deepEqual(Object.keys(exports).sort(), ['default', 'metadata']);
    assert.equal(exports.metadata.robots.index, false);
    await assert.rejects(exports.default({ children }), { message: 'NEXT_REDIRECT;/site-bot' }, label);
    assert.deepEqual(events, ['connection', 'gate', 'redirect:/site-bot'], label);
    assert.deepEqual(unexpected, [], label);
  }
  for (const { env, cookie } of openRequestCases()) {
    const label = `${JSON.stringify(env)} cookie=${JSON.stringify(cookie)}`;
    const { exports, unexpected, events } = await loadGatedServerModule('src/app/(product)/site-bot/pay/layout.tsx', env, cookie);
    assert.equal(await exports.default({ children }), children, label);
    assert.deepEqual(events, ['connection', 'gate'], label);
    assert.deepEqual(unexpected, [], label);
  }
});

test('pay page and start flow gate navigation and "done" on the checked response helpers (M0.5 B9/B10)', () => {
  // 2026-11-11: page.tsx is the server wrapper (card-field defaults from the env); the flow lives in the client part.
  const payPage = read('src/app/(product)/site-bot/pay/[sessionId]/page.tsx');
  assert.match(payPage, /<SiteBotPayClient cardDefaults=\{cardFieldDefaults\(process\.env\)\} \/>/);
  assert.doesNotMatch(payPage, /4242/);
  const pay = read('src/components/site-bot/SiteBotPayClient.tsx');
  assert.doesNotMatch(pay, /4242|defaultValue="/, 'no test card value in the client bundle');
  const pay_ = pay.slice(pay.indexOf('async function pay()'), pay.indexOf('async function submitGate()'));
  assert.match(pay_, /const outcome = checkoutCallbackOutcome\(res\.ok, json\);\s*if \(outcome\.kind === "error"\) throw/);
  assert.match(pay_, /await readJsonBody\(res\)/);
  assert.doesNotMatch(pay_, /res\.json\(\)/);
  assert.ok(pay_.indexOf('outcome.kind === "error"') < pay_.indexOf('setPhase("done")'));
  const start = read('src/app/(app)/site-bot/start/StartPaidFlow.tsx');
  const finish = start.slice(start.indexOf('async function finish('), start.indexOf('function handleSend('));
  assert.match(finish, /const sessionId = checkoutInitSessionId\(res\.ok, json\);\s*if \(!sessionId\) throw/);
  assert.match(finish, /router\.push\(`\/site-bot\/pay\/\$\{sessionId\}`\)/);
  assert.doesNotMatch(finish, /json\.sessionId|res\.json\(\)/);
});

test('GBP pre-fill GET stays disabled unless the runtime paid-flow gate allows the request (M1 B11)', async () => {
  await assertGatedStub('src/app/api/site-bot/prefill/route.ts', 'GET', 'prefill_disabled');
  // The paid handler is a thin wiring of the pure, unit-tested handler; it never writes the audit store.
  const paid = read('src/app/api/site-bot/prefill/paid.ts');
  assert.match(paid, /handlePrefillRequest\(/);
  for (const forbidden of ['writeAuditRecord', 'bindAuditLocation', 'fs.', 'data/audits', 'searchPlacesByName']) {
    assert.equal(paid.includes(forbidden), false, `unexpected prefill seam: ${forbidden}`);
  }
});

test('audit layout renders children unchanged and never the buy-CTA provider unless the runtime paid-flow gate allows the request (M1 F1)', async () => {
  const source = read('src/app/(app)/site-bot/audit/layout.tsx');
  assert.equal(source.trim(), `import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { connection } from 'next/server';
import { isPaidFlowAllowedForRequest } from '@/lib/site-bot/paidFlowGate';
import { PaidBuyCtaProvider } from './paidBuyCta';
import { SCORECARD_COPY } from '@/lib/site-bot/scorecardCopy';

// Title = the existing scorecard form title (Yonatan 2026-11-13, anchor audit_title); the root
// template appends the RLM-anchored brand. The page stays noindex.
export const metadata: Metadata = {
  title: SCORECARD_COPY.FORM_TITLE,
  robots: { index: false },
};

// Paid-journey v2 M1 (F1): the audit result shows the buy CTA ONLY when the runtime
// SITE_BOT_PAID_FLOW gate (src/lib/site-bot/paidFlowGate.ts) allows this request ('open', or
// 'rehearsal' with a valid admin cookie). Closed (the production default) returns children
// exactly as the audit-only release does, and <PaidBuyCtaSlot> on the page renders nothing.
// connection() keeps the decision per request instead of baking it in at build time.
export default async function AuditLayout({ children }: { children: ReactNode }) {
  await connection();
  if (await isPaidFlowAllowedForRequest()) {
    return <PaidBuyCtaProvider>{children}</PaidBuyCtaProvider>;
  }
  return children;
}`);
  const load = async (env, cookie) => {
    let PaidBuyCtaProvider = null;
    const loaded = await loadGatedServerModule('src/app/(app)/site-bot/audit/layout.tsx', env, cookie, (name, deny) => {
      if (name === './paidBuyCta') {
        PaidBuyCtaProvider = new Proxy(function PaidBuyCtaProvider() {}, { get: (_, key) => deny(`PaidBuyCtaProvider.${String(key)}`) });
        return { PaidBuyCtaProvider };
      }
      // Pure constants module, only for the metadata title (2026-11-13).
      if (name === '@/lib/site-bot/scorecardCopy') return { SCORECARD_COPY: { FORM_TITLE: 'audit-title' } };
      return undefined;
    });
    return { ...loaded, PaidBuyCtaProvider };
  };
  // An async layout's return value is probed for `then` by the promise machinery; nothing else may be read.
  const children = new Proxy({}, { get: (_, key) => { if (key === 'then') return undefined; throw new Error(`children inspected: ${String(key)}`); } });
  for (const { env, cookie } of closedRequestCases()) {
    const label = `${JSON.stringify(env)} cookie=${JSON.stringify(cookie)}`;
    const { exports, unexpected, rendered, events } = await load(env, cookie);
    assert.deepEqual(Object.keys(exports).sort(), ['default', 'metadata']);
    assert.equal(exports.metadata.robots.index, false);
    assert.equal(await exports.default({ children }), children, label);
    assert.deepEqual(rendered, []);
    assert.deepEqual(events, ['connection', 'gate'], label);
    assert.deepEqual(unexpected, [], label);
  }
  for (const { env, cookie } of openRequestCases()) {
    const label = `${JSON.stringify(env)} cookie=${JSON.stringify(cookie)}`;
    const { exports, unexpected, rendered, events, PaidBuyCtaProvider } = await load(env, cookie);
    const element = await exports.default({ children });
    assert.equal(element.type, PaidBuyCtaProvider, label);
    assert.equal(element.props.children, children);
    assert.deepEqual(rendered, [PaidBuyCtaProvider]);
    assert.deepEqual(events, ['connection', 'gate'], label);
    assert.deepEqual(unexpected, [], label);
  }
});

test('buy CTA renders nothing without the gated provider; only the audit layout renders the provider (M1 F1)', async () => {
  const { default: ts } = await import('typescript');
  const { default: vm } = await import('node:vm');
  const React = (await import('react')).default;
  const jsxRuntime = await import('react/jsx-runtime');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const ctaPath = path.join(root, 'src/app/(app)/site-bot/audit/paidBuyCta.tsx');
  const code = ts.transpileModule(read('src/app/(app)/site-bot/audit/paidBuyCta.tsx'), {
    fileName: ctaPath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const copyCode = ts.transpileModule(read('src/lib/site-bot/intakeCopy.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const copyExports = {};
  vm.runInNewContext(copyCode, { exports: copyExports });
  const exports = {};
  vm.runInNewContext(code, {
    exports, URLSearchParams,
    require: name => {
      if (name === 'react') return React;
      if (name === 'react/jsx-runtime') return jsxRuntime;
      if (name === 'next/link') return { __esModule: true, default: props => React.createElement('a', props) };
      if (name === '@/lib/site-bot/intakeCopy') return copyExports;
      throw new Error(`unexpected import: ${name}`);
    },
  }, { filename: ctaPath });
  const auditId = '123e4567-e89b-42d3-a456-426614174000';
  const slot = React.createElement(exports.PaidBuyCtaSlot, { auditId, placeId: 'ChIJ-synthetic' });
  // Flag off: the layout returns children as-is, so the slot has no provider and renders nothing.
  assert.equal(renderToStaticMarkup(slot), '');
  const open = renderToStaticMarkup(React.createElement(exports.PaidBuyCtaProvider, null, slot));
  assert.match(open, /data-paid-buy-cta="true"/);
  assert.match(open, new RegExp(`href="/site-bot/start\\?auditId=${auditId}&amp;placeId=ChIJ-synthetic"`));
  assert.equal(renderToStaticMarkup(React.createElement(exports.PaidBuyCtaProvider, null, React.createElement(exports.PaidBuyCtaSlot, { auditId }))), '');
  const offenders = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(rel); continue; }
      if (!/\.(ts|tsx|mjs|js)$/.test(entry.name) || /\.test\.|testkit/.test(entry.name)) continue;
      if (/PaidBuyCtaProvider/.test(read(rel))) offenders.push(rel);
    }
  };
  walk('src');
  assert.deepEqual(offenders.sort(), ['src/app/(app)/site-bot/audit/layout.tsx', 'src/app/(app)/site-bot/audit/paidBuyCta.tsx']);
  // The page holds only the slot; the start URL lives in the gated CTA module.
  const page = read('src/app/(app)/site-bot/audit/page.tsx');
  assert.match(page, /<PaidBuyCtaSlot auditId=\{identity\?\.auditId\} placeId=\{identity\?\.placeId\} \/>/);
  assert.equal(page.includes('/site-bot/start'), false);
});
