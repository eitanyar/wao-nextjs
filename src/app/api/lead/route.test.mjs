// /api/lead -> client CRM (rehearsal runbook S11). Runs the real route handler (transpiled) with the
// real intake module and a real leads store on a TEMP file; only SMTP, CORS and the tenant lookup are
// fixtures. Never touches data/ or src/data/leads.json. Needs the compiled dist/ from `npm run test`.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(baseDir, '../../../..');
const requireDist = createRequire(path.join(repoRoot, 'dist', 'package.json'));
const { createLeadsStore } = requireDist('./lib/crm/leadsStore.js');
const intakeModule = requireDist('./lib/crm/siteLeadIntake.js');
const routeCode = fs.readFileSync(path.join(baseDir, 'route.ts'), 'utf8');

const SMTP_ENV = { SMTP_HOST: 'smtp.test', SMTP_USER: 'bot@wao.test', SMTP_PASS: 'x', LEAD_NOTIFY_EMAIL: 'leads@wao.test' };
const SITE = 'test-rehearsal-2511';
const lookup = {
  siteRecord: (slug) => (slug === SITE ? { slug: SITE } : null),
  campaign: () => null,
  clientCustomerIds: () => [],
};

function harness({ env = {}, mail = 'accept' } = {}) {
  const leadsFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wao-api-lead-')), 'leads.json');
  const calls = { mail: 0, warn: [], error: [] };
  const require = (specifier) => {
    switch (specifier) {
      case 'next/server':
        return { NextResponse: class { constructor(body, init = {}) { this.body = body; this.status = init.status; }
          static json(body, init = {}) { return { body, status: init.status ?? 200, headers: init.headers }; } } };
      case '@/lib/site-hosting/leadOrigins':
        return { allowedLeadOrigin: (origin) => origin || null };
      case 'nodemailer':
        return { __esModule: true, default: { createTransport: () => ({ sendMail: async ({ to }) => {
          calls.mail += 1;
          if (mail === 'throw') throw new Error('smtp down');
          return mail === 'accept' ? { accepted: [to], rejected: [] } : { accepted: [], rejected: [to] };
        } }) } };
      case '@/lib/crm/leadsStore':
        return { createLeadsStore: () => createLeadsStore({ filePath: leadsFile }) };
      case '@/lib/crm/siteLeadIntake':
        return intakeModule;
      case '@/lib/crm/siteLeadTenantLookup':
        return { fileTenantLookup: lookup };
      default:
        throw new Error(`Unexpected route dependency: ${specifier}`);
    }
  };
  const source = ts.transpileModule(routeCode, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const routeModule = { exports: {} };
  vm.runInNewContext(source, {
    console: { error: (...a) => calls.error.push(a.join(' ')), log: () => {}, warn: (...a) => calls.warn.push(a.join(' ')) },
    process: { env: { ...env } },
    exports: routeModule.exports,
    module: routeModule,
    require,
  });
  const leads = () => (fs.existsSync(leadsFile) ? JSON.parse(fs.readFileSync(leadsFile, 'utf8')) : []);
  return { calls, post: routeModule.exports.POST, leads };
}

const request = (body, origin) => ({ headers: { get: (name) => (name.toLowerCase() === 'origin' ? origin ?? null : null) }, json: async () => body });

// The exact body renderSitePages' lead form posts (src/lib/lp/renderSitePages.ts pageScript).
const formBody = (orderId = 'mhx1abcde') => ({
  name: 'Test Person', phone: '050-1234567', service: 'site-form', source: `site-${SITE}`,
  message: 'site message', orderId, slug: SITE, customerId: '', type: 'form', privacyAccepted: true,
});
const clickBody = (service, orderId = 'tap1') => ({
  name: null, phone: null, service, source: `site-${SITE}`, orderId, slug: SITE, customerId: '', type: 'click-stub',
});
const SITE_ORIGIN = `https://${SITE}.wao.co.il`;

test('SMTP unset: a verified site lead is still stored under the client and the response is ok', async () => {
  const h = harness();
  const res = await h.post(request(formBody(), SITE_ORIGIN));
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  const [lead] = h.leads();
  assert.equal(lead.clientId, SITE);
  assert.equal(lead.slug, SITE);
  assert.equal(h.calls.mail, 0);
});

test('SMTP failing (throw or rejected): lead stored, response ok, failure logged', async () => {
  for (const mail of ['throw', 'reject']) {
    const h = harness({ env: SMTP_ENV, mail });
    const res = await h.post(request(formBody(), SITE_ORIGIN));
    assert.equal(res.status, 200, mail);
    assert.equal(res.body.ok, true);
    assert.equal(h.calls.mail, 1);
    assert.equal(h.leads().length, 1);
  }
});

test('SMTP ok: stored and WAO is emailed once; a double submit is acknowledged without a second email', async () => {
  const h = harness({ env: SMTP_ENV });
  assert.equal((await h.post(request(formBody(), SITE_ORIGIN))).status, 200);
  assert.equal((await h.post(request(formBody(), SITE_ORIGIN))).status, 200);
  assert.equal((await h.post(request(formBody('second-id'), SITE_ORIGIN))).status, 200);
  assert.equal(h.leads().length, 1);
  assert.equal(h.calls.mail, 1);
});

test('origin mismatch: WAO still emailed, lead not assigned to the client', async () => {
  const h = harness({ env: SMTP_ENV });
  const res = await h.post(request(formBody(), 'https://other.wao.co.il'));
  assert.equal(res.status, 200);
  assert.equal(h.calls.mail, 1);
  const [lead] = h.leads();
  assert.equal(lead.clientId, undefined);
  assert.equal(lead.slug, '');
  assert.equal(lead.tenantCheck, 'origin_mismatch');
  // The mismatch log line itself is asserted in src/lib/crm/siteLeadIntake.test.ts (it is written by
  // the intake module, which runs outside this vm context).
});

test('main-site form (no slug) keeps the email-only path: nothing stored, 503 without SMTP', async () => {
  const h = harness();
  const body = { name: 'Main', phone: '050-0000000', privacyAccepted: true, source: 'contact-page' };
  const res = await h.post(request(body, 'https://wao.co.il'));
  assert.equal(res.status, 503);
  assert.equal(h.leads().length, 0);
  const withSmtp = harness({ env: SMTP_ENV });
  assert.equal((await withSmtp.post(request(body, 'https://wao.co.il'))).status, 200);
  assert.equal(withSmtp.leads().length, 0);
});

test('click pings: verified tap stored as a click event (no email, no consent); unverified tap 400', async () => {
  const h = harness({ env: SMTP_ENV });
  const phone = await h.post(request(clickBody('phone-click'), SITE_ORIGIN));
  const wa = await h.post(request(clickBody('whatsapp-click', 'tap2'), SITE_ORIGIN));
  assert.equal(phone.status, 200);
  assert.equal(wa.status, 200);
  assert.deepEqual(h.leads().map((lead) => [lead.type, lead.status, lead.clientId, lead.name, lead.phone]), [
    ['phone-click', 'click', SITE, null, null],
    ['whatsapp-click', 'click', SITE, null, null],
  ]);
  assert.equal(h.calls.mail, 0);
  const forged = await h.post(request(clickBody('phone-click', 'tap3'), 'https://evil.example.com'));
  assert.equal(forged.status, 400);
  assert.equal(h.leads().length, 2);
});

test('form without privacyAccepted is still rejected before any store', async () => {
  const h = harness({ env: SMTP_ENV });
  const res = await h.post(request({ ...formBody(), privacyAccepted: false }, SITE_ORIGIN));
  assert.equal(res.status, 400);
  assert.equal(h.leads().length, 0);
  assert.equal(h.calls.mail, 0);
});
