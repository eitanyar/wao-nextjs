import assert from 'node:assert/strict';
import test from 'node:test';

import { createS3Store } from './r2';
import { memoryBackend, startS3Server } from './s3Server.testkit';
import { WorkerDeployError, deployTenantToWorker, ensureTenantDns, siteHostingMode, workerHostingConfig } from './workerDeploy';

const config = { apiToken: 'synthetic-token', zoneId: 'synthetic-zone' };
const name = 'tenant-a.wao.co.il';

function fakeCloudflare(script: Record<string, { ok: boolean; status: number; data: unknown } | Array<{ ok: boolean; status: number; data: unknown }>>) {
  const calls: string[] = [];
  const fetchImpl = async (url: string, init: RequestInit = {}) => {
    assert.ok(url.startsWith('https://api.cloudflare.com/client/v4/'));
    assert.equal((init.headers as Record<string, string>).Authorization, 'Bearer synthetic-token');
    assert.equal(init.redirect, 'error');
    const event = `${init.method ?? 'GET'} ${url.slice('https://api.cloudflare.com/client/v4'.length)}`;
    calls.push(init.body ? `${event} ${init.body}` : event);
    const entry = script[event];
    const reply = Array.isArray(entry) ? entry.shift() : entry;
    if (!reply) throw new Error(`unscripted ${event}`);
    return { ok: reply.ok, status: reply.status, json: async () => reply.data };
  };
  return { fetchImpl, calls };
}

const lookup = `GET /zones/synthetic-zone/dns_records?name.exact=${encodeURIComponent(name)}&per_page=2`;
const list = (records: unknown[]) => ({ ok: true, status: 200, data: { success: true, result: records, result_info: { total_pages: 1, count: records.length } } });
const record = (content: string, extra: Record<string, unknown> = {}) => ({ type: 'CNAME', name, content, proxied: true, zone_id: 'synthetic-zone', ...extra });

test('hosting mode: pages by default, worker on request, anything else is an error', () => {
  assert.equal(siteHostingMode(undefined), 'pages');
  assert.equal(siteHostingMode(''), 'pages');
  assert.equal(siteHostingMode(' Pages '), 'pages');
  assert.equal(siteHostingMode('worker'), 'worker');
  assert.equal(siteHostingMode('workers'), null);
  assert.equal(siteHostingMode('r2'), null);
});

test('worker config lists every missing variable and never defaults credentials', () => {
  assert.deepEqual(workerHostingConfig({}), { ok: false, missing: ['CLOUDFLARE_SITES_API_TOKEN', 'CLOUDFLARE_ZONE_ID', 'SITES_R2_ENDPOINT', 'SITES_R2_ACCESS_KEY_ID', 'SITES_R2_SECRET_ACCESS_KEY'] });
  assert.deepEqual(workerHostingConfig({ CLOUDFLARE_API_TOKEN: 'old-pages-token', CLOUDFLARE_ZONE_ID: 'z' }).ok, false, 'the Pages token is not a fallback');
  const full = { CLOUDFLARE_SITES_API_TOKEN: 't', CLOUDFLARE_ZONE_ID: 'z', SITES_R2_ENDPOINT: 'https://acct.r2.cloudflarestorage.com/', SITES_R2_ACCESS_KEY_ID: 'a', SITES_R2_SECRET_ACCESS_KEY: 's' };
  const resolved = workerHostingConfig(full);
  assert.ok(resolved.ok);
  assert.equal(resolved.ok && resolved.config.r2Endpoint, 'https://acct.r2.cloudflarestorage.com');
  assert.equal(resolved.ok && resolved.config.bucket, 'wao-sites');
  assert.equal(workerHostingConfig({ ...full, SITES_R2_ENDPOINT: 'http://insecure.example' }).ok, false);
});

test('DNS: existing proxied CNAME to sites.wao.co.il is reused (GET only)', async () => {
  const cf = fakeCloudflare({ [lookup]: list([record('sites.wao.co.il')]) });
  assert.equal(await ensureTenantDns(cf.fetchImpl, config, 'tenant-a'), 'exists');
  assert.deepEqual(cf.calls, [lookup]);
});

test('DNS: legacy proxied CNAME to {slug}.pages.dev is accepted, not rewritten', async () => {
  const cf = fakeCloudflare({ [lookup]: list([record('tenant-a.pages.dev')]) });
  assert.equal(await ensureTenantDns(cf.fetchImpl, config, 'tenant-a'), 'legacy-pages-target');
  assert.equal(cf.calls.length, 1);
});

test('DNS: absent record is created proxied to sites.wao.co.il', async () => {
  const cf = fakeCloudflare({ [lookup]: list([]), 'POST /zones/synthetic-zone/dns_records': { ok: true, status: 200, data: { success: true, result: record('sites.wao.co.il') } } });
  assert.equal(await ensureTenantDns(cf.fetchImpl, config, 'tenant-a'), 'created');
  assert.equal(cf.calls[1], `POST /zones/synthetic-zone/dns_records ${JSON.stringify({ type: 'CNAME', name, content: 'sites.wao.co.il', proxied: true, ttl: 1 })}`);
});

test('DNS: 81053 race is resolved by a matching read-back, else fails closed', async () => {
  const race = { ok: false, status: 400, data: { success: false, errors: [{ code: 81053 }] } };
  const ok = fakeCloudflare({ [lookup]: [list([]), list([record('sites.wao.co.il')])], 'POST /zones/synthetic-zone/dns_records': race });
  assert.equal(await ensureTenantDns(ok.fetchImpl, config, 'tenant-a'), 'exists');
  const bad = fakeCloudflare({ [lookup]: [list([]), list([record('evil.example')])], 'POST /zones/synthetic-zone/dns_records': race });
  await assert.rejects(ensureTenantDns(bad.fetchImpl, config, 'tenant-a'), /DNS conflict/);
});

test('DNS: conflicting records fail closed and are never overwritten', async () => {
  for (const records of [[record('other.example')], [record('sites.wao.co.il', { proxied: false })], [{ ...record('1.2.3.4'), type: 'A' }],
    [record('sites.wao.co.il'), record('sites.wao.co.il')], [record('sites.wao.co.il', { zone_id: 'other-zone' })]]) {
    const cf = fakeCloudflare({ [lookup]: list(records) });
    await assert.rejects(ensureTenantDns(cf.fetchImpl, config, 'tenant-a'), /DNS conflict/);
    assert.equal(cf.calls.length, 1);
  }
  const unavailable = fakeCloudflare({ [lookup]: { ok: false, status: 403, data: { success: false } } });
  await assert.rejects(ensureTenantDns(unavailable.fetchImpl, config, 'tenant-a'), /DNS lookup unavailable/);
});

test('deployTenantToWorker publishes then binds DNS; failures name their stage', async () => {
  const backend = memoryBackend();
  const credentials = { accessKeyId: 'k', secretAccessKey: 's' };
  const server = await startS3Server({ bucket: 'wao-sites', credentials, backend });
  try {
    const store = createS3Store({ endpoint: server.endpoint, bucket: 'wao-sites', credentials });
    const full = { ...config, r2Endpoint: 'https://unused.example', r2AccessKeyId: 'k', r2SecretAccessKey: 's', bucket: 'wao-sites' };
    const files = { 'index.html': 'i', '404.html': 'n', 'sitemap.xml': 's' };
    const cf = fakeCloudflare({ [lookup]: list([record('sites.wao.co.il')]) });
    const result = await deployTenantToWorker({ config: full, slug: 'tenant-a', files, canonicalOrigin: 'https://tenant-a.wao.co.il',
      hosts: [{ host: name, role: 'canonical' }], fetch: cf.fetchImpl, store });
    assert.equal(result.dns, 'exists');
    assert.equal(result.publish.fileCount, 4);
    const broken = fakeCloudflare({ [lookup]: list([record('other.example')]) });
    await assert.rejects(deployTenantToWorker({ config: full, slug: 'tenant-a', files, canonicalOrigin: 'https://tenant-a.wao.co.il',
      hosts: [{ host: name, role: 'canonical' }], fetch: broken.fetchImpl, store }), (e: unknown) => e instanceof WorkerDeployError && e.stage === 'dns');
    await assert.rejects(deployTenantToWorker({ config: full, slug: 'tenant-a', files: {}, canonicalOrigin: 'https://tenant-a.wao.co.il',
      hosts: [], fetch: cf.fetchImpl, store }), (e: unknown) => e instanceof WorkerDeployError && e.stage === 'publish');
  } finally {
    await server.close();
  }
});
