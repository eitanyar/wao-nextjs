import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { allowedLeadOrigin, cachedOwnerHosts, isAllowedLeadOrigin, readOwnerHosts, resetOwnerHostCacheForTests } from './leadOrigins';

const owners = new Set(['www.owner.co.il', 'owner.co.il']);

test('allows https wao.co.il, its subdomains and attached owner hosts', () => {
  for (const origin of ['https://wao.co.il', 'https://www.wao.co.il', 'https://test-plumber-tlv.wao.co.il', 'https://a.b.wao.co.il',
    'https://www.owner.co.il', 'https://owner.co.il']) {
    assert.equal(isAllowedLeadOrigin(origin, owners), true, origin);
  }
});

test('rejects http, look-alikes, ports, paths and unknown hosts', () => {
  for (const origin of ['', 'null', 'http://wao.co.il', 'http://test.wao.co.il', 'http://www.owner.co.il', 'https://evilwao.co.il',
    'https://wao.co.il.evil.com', 'https://www.owner.co.il.evil.com', 'https://evil.com/.wao.co.il', 'https://evil.com?.wao.co.il',
    'https://evil.com#.wao.co.il', 'https://test.wao.co.il:8443', 'https://www.owner.co.il:443', 'https://WWW.OWNER.CO.IL',
    'https://user@www.owner.co.il', 'https://-bad.wao.co.il', 'https://.wao.co.il', 'https://a..wao.co.il', 'https://other.co.il',
    'https://xowner.co.il', 'https://www.owner.co.il/', 'https://www.owner.co.il.', 'javascript:alert(1)', 'https://1.2.3.4']) {
    assert.equal(isAllowedLeadOrigin(origin, owners), false, origin);
    assert.equal(allowedLeadOrigin(origin, () => owners), null, origin);
  }
});

test('wao.co.il origins never read the owner list; others read it lazily', () => {
  let reads = 0;
  const loader = () => { reads++; return owners; };
  assert.equal(allowedLeadOrigin('https://test-plumber-tlv.wao.co.il', loader), 'https://test-plumber-tlv.wao.co.il');
  assert.equal(allowedLeadOrigin('http://www.owner.co.il', loader), null);
  assert.equal(reads, 0);
  assert.equal(allowedLeadOrigin('https://www.owner.co.il', loader), 'https://www.owner.co.il');
  assert.equal(reads, 1);
});

test('owner hosts come from data/sites ownerDomain + canonicalOrigin, cached 60 s', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'wao-lead-origins-'));
  const previous = process.env.WAO_SITES_DIR;
  try {
    writeFileSync(path.join(dir, 'a.json'), JSON.stringify({ slug: 'a-site', ownerDomain: 'Owner.co.il' }));
    writeFileSync(path.join(dir, 'b.json'), JSON.stringify({ slug: 'b-site', ownerDomain: 'second.co.il', canonicalOrigin: 'https://www.second.co.il' }));
    writeFileSync(path.join(dir, 'c.json'), JSON.stringify({ slug: 'c-site', ownerDomain: 'wao.co.il', canonicalOrigin: 'https://evil.wao.co.il' }));
    writeFileSync(path.join(dir, 'broken.json'), '{not json');
    writeFileSync(path.join(dir, 'notes.txt'), 'ownerDomain: ignored.co.il');
    assert.deepEqual([...readOwnerHosts(dir)].sort(), ['owner.co.il', 'second.co.il', 'www.owner.co.il', 'www.second.co.il']);
    assert.deepEqual([...readOwnerHosts(path.join(dir, 'missing'))], []);

    process.env.WAO_SITES_DIR = dir;
    resetOwnerHostCacheForTests();
    assert.ok(cachedOwnerHosts(1_000).has('www.owner.co.il'));
    writeFileSync(path.join(dir, 'd.json'), JSON.stringify({ slug: 'd-site', ownerDomain: 'late.co.il' }));
    assert.equal(cachedOwnerHosts(30_000).has('www.late.co.il'), false, 'cached');
    assert.equal(cachedOwnerHosts(61_001).has('www.late.co.il'), true, 'refreshed after 60 s');
  } finally {
    if (previous === undefined) delete process.env.WAO_SITES_DIR; else process.env.WAO_SITES_DIR = previous;
    resetOwnerHostCacheForTests();
    rmSync(dir, { recursive: true, force: true });
  }
});
