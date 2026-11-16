import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TtlCache, cacheControlFor, contentTypeFor, edgeCacheKey, httpsRedirect, keys, normalizeHost, parseHostEntry,
  parseTenantPointer, redirectRoleLocation, resolvePath, INFRA_HOSTS, HEALTH_PATH,
} from './router';

test('normalizeHost lower-cases, strips port and trailing dot', () => {
  assert.equal(normalizeHost('Test-Plumber-TLV.WAO.co.il'), 'test-plumber-tlv.wao.co.il');
  assert.equal(normalizeHost('www.example.co.il.'), 'www.example.co.il');
  assert.equal(normalizeHost('www.example.co.il:443'), 'www.example.co.il');
  assert.equal(normalizeHost('www.example.co.il.:8787'), 'www.example.co.il');
  assert.equal(normalizeHost(' sites.wao.co.il '), 'sites.wao.co.il');
});

test('normalizeHost rejects non-hostnames (they pass through, never map to a tenant)', () => {
  for (const raw of ['', null, undefined, 'localhost', '127.0.0.1', '127.0.0.1:8787', '[::1]:8787', 'a..b.co.il',
    '-bad.co.il', 'bad-.co.il', 'xn--…', '\u05d0\u05d1.co.il', 'host.co.il:abc', `${'a'.repeat(64)}.co.il`, 'a b.co.il', 'a_b.co.il']) {
    assert.equal(normalizeHost(raw as string), null, String(raw));
  }
});

test('resolvePath maps served paths to version-relative keys', () => {
  const key = (p: string) => {
    const r = resolvePath(p);
    assert.equal(r.kind, 'key', p);
    return (r as { rel: string }).rel;
  };
  assert.equal(key('/'), 'index.html');
  assert.equal(key('/about'), 'about.html');
  assert.equal(key('/sherut/x'), 'sherut/x.html');
  assert.equal(key('/services/'), 'services/index.html');
  assert.equal(key('/sitemap.xml'), 'sitemap.xml');
  assert.equal(key('/robots.txt'), 'robots.txt');
  assert.equal(key('/fonts/heebo-400.woff2'), 'fonts/heebo-400.woff2');
  assert.equal(key('/404'), '404.html');
  assert.equal(key('/a%2Db'), 'a-b.html');
});

test('resolvePath 301s .html and index.html forms to the extensionless served path, keeping the query', () => {
  assert.deepEqual(resolvePath('/about.html'), { kind: 'redirect', location: '/about' });
  assert.deepEqual(resolvePath('/about.html', '?utm_source=x&a=1'), { kind: 'redirect', location: '/about?utm_source=x&a=1' });
  assert.deepEqual(resolvePath('/index.html'), { kind: 'redirect', location: '/' });
  assert.deepEqual(resolvePath('/services/index.html'), { kind: 'redirect', location: '/services/' });
  assert.deepEqual(resolvePath('/sherut/x.html', '?'), { kind: 'redirect', location: '/sherut/x' });
});

test('resolvePath rejects traversal and encoding tricks with 400', () => {
  const bad = [
    '/..', '/../tenants/other.json', '/a/../b', '/./a', '/a/.', '/%2e%2e/x', '/%2E%2E%2Fsecret', '/a/%2e%2e/b', '/.%2e/x',
    '//etc/passwd', '/a//b', '/a\\b', '/a%5cb', '/a%5C..%5Cb', '/%00', '/a%00.html', '/a\u0000b', '/%0a', '/a%2fb',
    '/%c0%ae%c0%ae/x', '/%e0%80%ae', '/%ZZ', '/%', '/\u05e9', '/%D7%A9', '/\uff0e\uff0e/x', '/%EF%BC%8E%EF%BC%8E/x',
    '/a b', '/a%20b', '/a?b', '/<script>', `/${'a'.repeat(1100)}`, '', 'about', 'https://evil.com/x',
  ];
  for (const raw of bad) assert.deepEqual(resolvePath(raw), { kind: 'bad' }, JSON.stringify(raw));
});

test('every resolvable key stays a plain relative key (cannot escape the tenant version prefix)', () => {
  for (const raw of ['/', '/a', '/a/b/', '/a.b.c', '/a..b', '/~x', '/x-y_z']) {
    const r = resolvePath(raw);
    if (r.kind !== 'key') continue;
    assert.ok(!r.rel.startsWith('/') && !r.rel.split('/').some(s => s === '..' || s === '.' || s === ''), raw);
    assert.ok(keys.file('slug-a', '20261112T183005Z-abcdef', r.rel).startsWith('sites/slug-a/20261112T183005Z-abcdef/'));
  }
});

test('content types and cache headers by extension', () => {
  assert.equal(contentTypeFor('index.html'), 'text/html; charset=utf-8');
  assert.equal(contentTypeFor('sitemap.xml'), 'application/xml; charset=utf-8');
  assert.equal(contentTypeFor('robots.txt'), 'text/plain; charset=utf-8');
  assert.equal(contentTypeFor('fonts/heebo.woff2'), 'font/woff2');
  assert.equal(contentTypeFor('img/a.JPG'), 'image/jpeg');
  assert.equal(contentTypeFor('a.css'), 'text/css; charset=utf-8');
  assert.equal(contentTypeFor('a.unknown'), 'application/octet-stream');
  assert.equal(cacheControlFor('index.html'), 'public, max-age=60');
  assert.equal(cacheControlFor('sitemap.xml'), 'public, max-age=300');
  assert.equal(cacheControlFor('fonts/heebo.woff2'), 'public, max-age=604800');
  assert.equal(cacheControlFor('a.css'), 'public, max-age=604800');
  // Visual pack: the content-hashed hero / logo files under img/ are cached for a year, immutable; nothing else is.
  assert.equal(cacheControlFor('img/hero-0123456789ab-480.avif'), 'public, max-age=31536000, immutable');
  assert.equal(cacheControlFor('img/logo-0123456789ab.webp'), 'public, max-age=31536000, immutable');
  assert.equal(contentTypeFor('img/hero-0123456789ab-480.avif'), 'image/avif');
  assert.equal(cacheControlFor('assets/fonts/heebo-hebrew.woff2'), 'public, max-age=604800');
  assert.equal(cacheControlFor('services/img.html'), 'public, max-age=60');
  assert.equal(cacheControlFor('img/index.html'), 'public, max-age=60');
});

test('edge cache key is per slug/version/path (a new version never reads an old entry)', () => {
  const a = edgeCacheKey('plumber', '20261112T183005Z-abcdef', 'index.html');
  const b = edgeCacheKey('plumber', '20261113T090000Z-123456', 'index.html');
  const c = edgeCacheKey('other', '20261112T183005Z-abcdef', 'index.html');
  assert.notEqual(a, b);
  assert.notEqual(a, c);
  assert.equal(new URL(a).pathname, '/plumber/20261112T183005Z-abcdef/index.html');
});

test('http → https and redirect-role locations keep path and query', () => {
  assert.equal(httpsRedirect(new URL('http://x.wao.co.il/a?b=1')), 'https://x.wao.co.il/a?b=1');
  assert.equal(httpsRedirect(new URL('https://x.wao.co.il/a')), null);
  assert.equal(redirectRoleLocation('https://www.example.co.il', new URL('https://x.wao.co.il/about?utm=1')),
    'https://www.example.co.il/about?utm=1');
  assert.equal(redirectRoleLocation('https://www.example.co.il/', new URL('https://example.co.il/')), 'https://www.example.co.il/');
});

test('host entry and tenant pointer parsing is strict', () => {
  assert.deepEqual(parseHostEntry({ slug: 'plumber-tlv', role: 'canonical' }), { slug: 'plumber-tlv', role: 'canonical' });
  assert.equal(parseHostEntry({ slug: '../x', role: 'canonical' }), null);
  assert.equal(parseHostEntry({ slug: 'plumber-tlv', role: 'admin' }), null);
  assert.equal(parseHostEntry(null), null);
  const pointer = { slug: 'plumber-tlv', version: '20261112T183005Z-abcdef', canonicalOrigin: 'https://plumber-tlv.wao.co.il', status: 'live' };
  assert.deepEqual(parseTenantPointer(pointer, 'plumber-tlv'), pointer);
  assert.equal(parseTenantPointer(pointer, 'other-slug'), null, 'pointer slug must match the host entry');
  assert.equal(parseTenantPointer({ ...pointer, version: '../../x' }, 'plumber-tlv'), null);
  assert.equal(parseTenantPointer({ ...pointer, status: 'deleted' }, 'plumber-tlv'), null);
  assert.equal(parseTenantPointer({ ...pointer, canonicalOrigin: 'http://plumber-tlv.wao.co.il' }, 'plumber-tlv'), null);
  assert.deepEqual(parseTenantPointer({ ...pointer, status: 'suspended' }, 'plumber-tlv')?.status, 'suspended');
});

test('TtlCache expires after the TTL and caches negative results', () => {
  const cache = new TtlCache<string | null>(30_000, 2);
  cache.set('a', null, 0);
  assert.deepEqual(cache.get('a', 29_999), { hit: true, value: null });
  assert.deepEqual(cache.get('a', 30_000), { hit: false });
  cache.set('b', 'x', 0);
  cache.set('c', 'y', 0);
  cache.set('d', 'z', 0); // evicts the oldest
  assert.deepEqual(cache.get('b', 1), { hit: false });
  assert.deepEqual(cache.get('d', 1), { hit: true, value: 'z' });
});

test('infra hosts and health path constants', () => {
  assert.ok(INFRA_HOSTS.has('sites.wao.co.il') && INFRA_HOSTS.has('sites-origin.wao.co.il'));
  assert.equal(HEALTH_PATH, '/__wao/health');
});
