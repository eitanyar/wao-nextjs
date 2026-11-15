import assert from 'node:assert/strict';
import test from 'node:test';

import { handle, type Env } from './index';

function body(text: string) {
  return { body: new Response(text).body, httpEtag: '"e1"', text: async () => text };
}

test('edge-cache hit re-applies the per-file cache policy (zone Browser Cache TTL must not leak to HTML)', async () => {
  const objects: Record<string, string> = {
    'hosts/t-one.wao.co.il.json': JSON.stringify({ slug: 't-one', role: 'canonical' }),
    'tenants/t-one.json': JSON.stringify({ slug: 't-one', version: '20261115T000000Z-abc123', canonicalOrigin: 'https://t-one.wao.co.il', status: 'live', fileCount: 1, indexEtag: '"e1"', updatedAt: '2026-11-15T00:00:00Z' }),
  };
  const env = { SITES: { get: async (k: string) => (k in objects ? body(objects[k]) : null) } } as unknown as Env;
  const cached = new Response('<html>cached</html>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=31536000', age: '28', etag: '"e1"', 'x-wao-site': 't-one' } });
  (globalThis as unknown as { caches: unknown }).caches = { default: { match: async () => cached.clone(), put: async () => undefined } };
  try {
    const res = await handle(new Request('https://t-one.wao.co.il/about'), env, { waitUntil: () => undefined }, 1_000);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-wao-cache'), 'HIT');
    assert.equal(res.headers.get('cache-control'), 'public, max-age=60');
    assert.equal(res.headers.get('age'), null);
    assert.equal(await res.text(), '<html>cached</html>');
  } finally {
    delete (globalThis as unknown as { caches?: unknown }).caches;
  }
});
