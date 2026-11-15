import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  RESERVED_DEPLOYMENT_SLUGS, SITES_CNAME_TARGET, SITES_FALLBACK_ORIGIN, isSafeSiteFileName, newHostingVersion, normalizeOwnerDomain,
  ownerHostsOf, parseHostEntry, parseTenantPointer, r2Keys, renderRobotsTxt, tenantCanonicalOrigin, tenantHosts,
} from './tenant';

test('canonical origin is the subdomain until an owner domain is recorded live as https://www.{domain}', () => {
  assert.equal(tenantCanonicalOrigin('plumber-tlv', {}), 'https://plumber-tlv.wao.co.il');
  assert.equal(tenantCanonicalOrigin('plumber-tlv', null), 'https://plumber-tlv.wao.co.il');
  assert.equal(tenantCanonicalOrigin('plumber-tlv', { ownerDomain: 'example.co.il' }), 'https://plumber-tlv.wao.co.il', 'intake domain alone is not live');
  assert.equal(tenantCanonicalOrigin('plumber-tlv', { ownerDomain: 'example.co.il', canonicalOrigin: 'https://www.example.co.il' }), 'https://www.example.co.il');
  assert.equal(tenantCanonicalOrigin('plumber-tlv', { ownerDomain: 'www.Example.co.il', canonicalOrigin: 'https://www.example.co.il' }), 'https://www.example.co.il');
  for (const canonicalOrigin of ['https://example.co.il', 'http://www.example.co.il', 'https://www.other.co.il', 'https://www.example.co.il/', 'https://www.example.co.il:8443']) {
    assert.equal(tenantCanonicalOrigin('plumber-tlv', { ownerDomain: 'example.co.il', canonicalOrigin }), 'https://plumber-tlv.wao.co.il', canonicalOrigin);
  }
});

test('owner domains never shadow wao.co.il and must be plain hostnames', () => {
  assert.equal(normalizeOwnerDomain('WWW.Example.CO.IL.'), 'example.co.il');
  for (const bad of ['wao.co.il', 'www.wao.co.il', 'x.wao.co.il', 'localhost', '1.2.3.4', 'exa mple.co.il', '', null, 'https://example.co.il']) {
    assert.equal(normalizeOwnerDomain(bad), null, String(bad));
  }
});

test('tenant hosts: subdomain canonical, or owner www canonical + subdomain (and aliased apex) as redirects', () => {
  assert.deepEqual(tenantHosts('plumber-tlv', {}), [{ host: 'plumber-tlv.wao.co.il', role: 'canonical' }]);
  const live = { ownerDomain: 'example.co.il', canonicalOrigin: 'https://www.example.co.il' };
  assert.deepEqual(tenantHosts('plumber-tlv', live), [
    { host: 'www.example.co.il', role: 'canonical' }, { host: 'plumber-tlv.wao.co.il', role: 'redirect' },
  ]);
  assert.deepEqual(tenantHosts('plumber-tlv', { ...live, ownerApexAliased: true }).map(h => `${h.host}:${h.role}`),
    ['www.example.co.il:canonical', 'plumber-tlv.wao.co.il:redirect', 'example.co.il:redirect']);
  assert.deepEqual(ownerHostsOf(live).sort(), ['example.co.il', 'www.example.co.il']);
  assert.deepEqual(ownerHostsOf({ canonicalOrigin: 'https://www.wao.co.il' }), []);
});

test('reserved infrastructure slugs (design note list)', () => {
  assert.deepEqual([...RESERVED_DEPLOYMENT_SLUGS].sort(),
    ['alfa', 'calendar', 'chat', 'docs', 'email', 'karate', 'mail', 'send', 'sites', 'sites-origin', 'smtp', 'www']);
  assert.equal(`sites.wao.co.il`, SITES_CNAME_TARGET);
  assert.equal(`sites-origin.wao.co.il`, SITES_FALLBACK_ORIGIN);
});

test('versions, keys, robots.txt and file-name safety', () => {
  const version = newHostingVersion(new Date('2026-11-12T18:30:05.999Z'), 'ab12cd');
  assert.equal(version, '20261112T183005Z-ab12cd');
  assert.throws(() => newHostingVersion(new Date(), 'zz'));
  assert.equal(r2Keys.file('plumber-tlv', version, 'about.html'), `sites/plumber-tlv/${version}/about.html`);
  assert.equal(r2Keys.host('www.example.co.il'), 'hosts/www.example.co.il.json');
  assert.equal(renderRobotsTxt('https://www.example.co.il/'), 'User-agent: *\nAllow: /\n\nSitemap: https://www.example.co.il/sitemap.xml\n');
  for (const ok of ['index.html', 'sherut/x.html', 'fonts/heebo-400.woff2', '404.html']) assert.equal(isSafeSiteFileName(ok), true, ok);
  for (const bad of ['', '/abs.html', '../x.html', 'a/../b', 'a//b', './a', 'a\\b', '\u05e9.html', 'a b.html', 'a/']) assert.equal(isSafeSiteFileName(bad), false, bad);
  assert.equal(parseTenantPointer({ slug: 'plumber-tlv', version, canonicalOrigin: 'https://plumber-tlv.wao.co.il', status: 'live' })?.version, version);
  assert.equal(parseTenantPointer({ slug: 'plumber-tlv', version: 'x', canonicalOrigin: 'https://plumber-tlv.wao.co.il', status: 'live' }), null);
  assert.equal(parseHostEntry({ slug: 'plumber-tlv', role: 'redirect' })?.role, 'redirect');
});

test('the Worker router mirrors the R2 layout and reserved infra hosts', () => {
  const router = readFileSync(path.resolve('workers/wao-sites/src/router.ts'), 'utf8');
  assert.match(router, /host: \(host: string\) => `hosts\/\$\{host\}\.json`/);
  assert.match(router, /tenant: \(slug: string\) => `tenants\/\$\{slug\}\.json`/);
  assert.match(router, /file: \(slug: string, version: string, rel: string\) => `sites\/\$\{slug\}\/\$\{version\}\/\$\{rel\}`/);
  assert.ok(router.includes(`'${SITES_CNAME_TARGET}'`) && router.includes(`'${SITES_FALLBACK_ORIGIN}'`));
  assert.ok(router.includes('/^\\d{8}T\\d{6}Z-[0-9a-f]{6}$/'), 'same version format');
});
