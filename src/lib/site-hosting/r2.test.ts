import assert from 'node:assert/strict';
import test from 'node:test';

import { HostConflictError, createS3Store, publishTenantSite, readTenantPointer, rollbackTenant } from './r2';
import { memoryBackend, startS3Server } from './s3Server.testkit';

const credentials = { accessKeyId: 'test-access-key', secretAccessKey: 'test-secret-key' };
const bucket = 'wao-sites';

function siteFiles(marker: string): Record<string, string | Uint8Array> {
  return {
    'index.html': `<html>home ${marker}</html>`,
    'about.html': `<html>about ${marker}</html>`,
    'sherut/x.html': `<html>service ${marker}</html>`,
    '404.html': '<html>not found</html>',
    'sitemap.xml': '<urlset></urlset>',
    'fonts/heebo-400.woff2': new Uint8Array([0, 1, 2, 3]),
  };
}

async function withServer(fn: (ctx: { store: ReturnType<typeof createS3Store>; server: Awaited<ReturnType<typeof startS3Server>>; backend: ReturnType<typeof memoryBackend> }) => Promise<void>, inject?: (m: string, k: string) => number | undefined) {
  const backend = memoryBackend();
  const server = await startS3Server({ bucket, credentials, backend, inject });
  try {
    const store = createS3Store({ endpoint: server.endpoint, bucket, credentials });
    await fn({ store, server, backend });
  } finally {
    await server.close();
  }
}

test('S3 store: signed put/head/get/list/delete round-trip against the mock server', async () => {
  await withServer(async ({ store, server }) => {
    const etag = await store.put('sites/a-b-c/v/x y.html', new TextEncoder().encode('hello'), 'text/html; charset=utf-8');
    assert.match(etag, /^"[0-9a-f]{32}"$/);
    assert.deepEqual(await store.head('sites/a-b-c/v/x y.html'), { etag, size: 5 });
    assert.equal((await store.get('sites/a-b-c/v/x y.html'))?.toString(), 'hello');
    assert.equal(await store.get('missing'), null);
    assert.equal(await store.head('missing'), null);
    await store.put('sites/a-b-c/w/y.html', new Uint8Array([1]), 'text/html');
    assert.deepEqual(await store.list('sites/a-b-c/', '/'), { keys: [], prefixes: ['sites/a-b-c/v/', 'sites/a-b-c/w/'] });
    await store.delete('sites/a-b-c/w/y.html');
    assert.deepEqual((await store.list('sites/')).keys, ['sites/a-b-c/v/x y.html']);
    assert.equal(server.authFailures, 0);
  });
});

test('S3 store: a wrong secret is rejected by signature verification', async () => {
  await withServer(async ({ server }) => {
    const bad = createS3Store({ endpoint: server.endpoint, bucket, credentials: { ...credentials, secretAccessKey: 'wrong' } });
    await assert.rejects(bad.put('k', new Uint8Array([1]), 'text/plain'), /403 SignatureDoesNotMatch/);
    assert.equal(server.authFailures, 1);
  });
});

test('S3 store: list follows continuation tokens', async () => {
  await withServer(async ({ store, backend }) => {
    for (let i = 0; i < 2500; i++) await backend.put(`p/${String(i).padStart(4, '0')}`, Buffer.from('x'), 'text/plain');
    const listed = await store.list('p/');
    assert.equal(listed.keys.length, 2500);
    assert.equal(listed.keys[2499], 'p/2499');
  });
});

test('publish: versioned upload, read-back, pointer flip, hosts, robots.txt', async () => {
  await withServer(async ({ store, backend }) => {
    const result = await publishTenantSite({
      store, slug: 'test-plumber-tlv', files: siteFiles('v1'), canonicalOrigin: 'https://test-plumber-tlv.wao.co.il',
      hosts: [{ host: 'test-plumber-tlv.wao.co.il', role: 'canonical' }],
      now: new Date('2026-11-15T10:00:00Z'), randomHex: 'aaaaaa',
    });
    assert.equal(result.version, '20261115T100000Z-aaaaaa');
    assert.equal(result.fileCount, 7, 'six files + rendered robots.txt');
    assert.equal(result.previousVersion, undefined);
    assert.deepEqual(result.hostsWritten, ['test-plumber-tlv.wao.co.il']);
    const robots = backend.objects.get(`sites/test-plumber-tlv/${result.version}/robots.txt`);
    assert.equal(robots?.body.toString(), 'User-agent: *\nAllow: /\n\nSitemap: https://test-plumber-tlv.wao.co.il/sitemap.xml\n');
    assert.equal(robots?.contentType, 'text/plain; charset=utf-8');
    assert.equal(backend.objects.get(`sites/test-plumber-tlv/${result.version}/fonts/heebo-400.woff2`)?.contentType, 'font/woff2');
    const pointer = await readTenantPointer(store, 'test-plumber-tlv');
    assert.equal(pointer?.version, result.version);
    assert.equal(pointer?.status, 'live');
    assert.equal(pointer?.indexEtag, result.indexEtag);
    assert.deepEqual(JSON.parse(backend.objects.get('hosts/test-plumber-tlv.wao.co.il.json')!.body.toString()), { slug: 'test-plumber-tlv', role: 'canonical' });
  });
});

test('publish: redeploying one tenant never touches another tenant, keeps current+previous, prunes older', async () => {
  await withServer(async ({ store, backend }) => {
    const hostsA = [{ host: 'tenant-a.wao.co.il', role: 'canonical' as const }];
    await publishTenantSite({ store, slug: 'tenant-b', files: siteFiles('b'), canonicalOrigin: 'https://tenant-b.wao.co.il',
      hosts: [{ host: 'tenant-b.wao.co.il', role: 'canonical' }], now: new Date('2026-11-15T09:00:00Z'), randomHex: 'bbbbbb' });
    const snapshotB = new Map([...backend.objects].filter(([k]) => k.includes('tenant-b')).map(([k, v]) => [k, v.etag]));
    const v1 = await publishTenantSite({ store, slug: 'tenant-a', files: siteFiles('1'), canonicalOrigin: 'https://tenant-a.wao.co.il', hosts: hostsA, now: new Date('2026-11-15T10:00:00Z'), randomHex: '111111' });
    const v2 = await publishTenantSite({ store, slug: 'tenant-a', files: siteFiles('2'), canonicalOrigin: 'https://tenant-a.wao.co.il', hosts: hostsA, now: new Date('2026-11-15T11:00:00Z'), randomHex: '222222' });
    assert.equal(v2.previousVersion, v1.version);
    assert.deepEqual(v2.hostsWritten, [], 'unchanged host entry is not rewritten');
    const v3 = await publishTenantSite({ store, slug: 'tenant-a', files: siteFiles('3'), canonicalOrigin: 'https://tenant-a.wao.co.il', hosts: hostsA, now: new Date('2026-11-15T12:00:00Z'), randomHex: '333333' });
    assert.deepEqual(v3.pruned, [v1.version]);
    const versionsA = new Set([...backend.objects.keys()].filter(k => k.startsWith('sites/tenant-a/')).map(k => k.split('/')[2]));
    assert.deepEqual([...versionsA].sort(), [v2.version, v3.version]);
    const afterB = new Map([...backend.objects].filter(([k]) => k.includes('tenant-b')).map(([k, v]) => [k, v.etag]));
    assert.deepEqual(afterB, snapshotB, 'tenant-b objects and ETags unchanged');
  });
});

test('publish: a host owned by another tenant is refused before any upload', async () => {
  await withServer(async ({ store, backend, server }) => {
    await backend.put('hosts/www.example.co.il.json', Buffer.from(JSON.stringify({ slug: 'owner-one', role: 'canonical' })), 'application/json');
    await assert.rejects(publishTenantSite({ store, slug: 'intruder', files: siteFiles('x'), canonicalOrigin: 'https://www.example.co.il',
      hosts: [{ host: 'www.example.co.il', role: 'canonical' }] }), HostConflictError);
    assert.equal(server.requests.filter(r => r.method === 'PUT').length, 0);
  });
});

test('publish: a failed upload never flips the pointer', async () => {
  let failNext = false;
  await withServer(async ({ store }) => {
    const v1 = await publishTenantSite({ store, slug: 'tenant-a', files: siteFiles('1'), canonicalOrigin: 'https://tenant-a.wao.co.il',
      hosts: [{ host: 'tenant-a.wao.co.il', role: 'canonical' }] });
    failNext = true;
    await assert.rejects(publishTenantSite({ store, slug: 'tenant-a', files: siteFiles('2'), canonicalOrigin: 'https://tenant-a.wao.co.il',
      hosts: [{ host: 'tenant-a.wao.co.il', role: 'canonical' }] }), /PUT .*about\.html failed: 403/);
    assert.equal((await readTenantPointer(store, 'tenant-a'))?.version, v1.version);
  }, (method, key) => (failNext && method === 'PUT' && key.endsWith('/about.html') ? 403 : undefined));
});

test('publish: rejects unsafe file names and sites without index/404/sitemap', async () => {
  await withServer(async ({ store, server }) => {
    for (const files of [{ ...siteFiles('x'), '../escape.html': 'x' }, { ...siteFiles('x'), '/abs.html': 'x' }]) {
      await assert.rejects(publishTenantSite({ store, slug: 'tenant-a', files, canonicalOrigin: 'https://tenant-a.wao.co.il', hosts: [] }), /Unsafe site file name/);
    }
    const { '404.html': _omit, ...no404 } = siteFiles('x');
    void _omit;
    await assert.rejects(publishTenantSite({ store, slug: 'tenant-a', files: no404, canonicalOrigin: 'https://tenant-a.wao.co.il', hosts: [] }), /missing 404\.html/);
    await assert.rejects(publishTenantSite({ store, slug: 'www', files: siteFiles('x'), canonicalOrigin: 'https://www.wao.co.il', hosts: [] }), /Invalid tenant slug/);
    assert.equal(server.requests.length, 0);
  });
});

test('rollback rewrites the pointer to the previous version and back', async () => {
  await withServer(async ({ store }) => {
    const hosts = [{ host: 'tenant-a.wao.co.il', role: 'canonical' as const }];
    const v1 = await publishTenantSite({ store, slug: 'tenant-a', files: siteFiles('1'), canonicalOrigin: 'https://tenant-a.wao.co.il', hosts, now: new Date('2026-11-15T10:00:00Z') });
    await assert.rejects(rollbackTenant(store, 'tenant-a'), /no previous version/);
    const v2 = await publishTenantSite({ store, slug: 'tenant-a', files: siteFiles('2'), canonicalOrigin: 'https://tenant-a.wao.co.il', hosts, now: new Date('2026-11-15T11:00:00Z') });
    const rolled = await rollbackTenant(store, 'tenant-a');
    assert.equal(rolled.version, v1.version);
    assert.equal(rolled.previousVersion, v2.version);
    const forward = await rollbackTenant(store, 'tenant-a');
    assert.equal(forward.version, v2.version);
  });
});
