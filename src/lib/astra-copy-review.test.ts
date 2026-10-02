import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { ASTRA_COPY_PATH, flattenAstraCopyLeaves, loadAstraCopyReview, type JsonValue } from './astra-copy-review';

const sourceHash = '4668a79f686a2807f3628c8006555600ad8b91ca44d5f235af1633629eab5e51';
const pagePath = 'src/app/(product)/admin/astra-copy-review/page.tsx';
const controlPath = 'src/components/admin/astra-copy-review/CopyFeedbackReference.tsx';
const implementationPaths = [pagePath, controlPath, 'src/lib/astra-copy-review.ts', 'src/lib/astra-copy-review.test.ts'];

function directLeaves(value: JsonValue, pointer = ''): Array<{ pointer: string; value: string | number | boolean | null }> {
  if (Array.isArray(value)) return value.flatMap((item, index) => directLeaves(item, `${pointer}/${index}`));
  if (value !== null && typeof value === 'object') {
    return Object.keys(value).flatMap(key => directLeaves(value[key], `${pointer}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`));
  }
  return [{ pointer, value: value as string | number | boolean | null }];
}

test('pinned source bytes decode fatally and all primitive leaves retain exact order and value', async () => {
  const bytes = await readFile(join(process.cwd(), ASTRA_COPY_PATH));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), sourceHash);
  const direct = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as JsonValue;
  const review = await loadAstraCopyReview();
  assert.equal(review.path, ASTRA_COPY_PATH);
  assert.equal(review.sha256, sourceHash);
  assert.deepEqual(review.artifact, direct);
  assert.deepEqual(review.leaves, directLeaves(direct));
  assert.equal(new Set(review.leaves.map(leaf => leaf.pointer)).size, review.leaves.length);
  assert.throws(() => new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from([0xc3, 0x28])), TypeError);
});

test('RFC 6901 escaping, array indices, and untouched primitive values', () => {
  const input: JsonValue = { 'a/b~c': [null, false, 0, '  untouched\n'], empty: [] };
  assert.deepEqual(flattenAstraCopyLeaves(input), [
    { pointer: '/a~1b~0c/0', value: null },
    { pointer: '/a~1b~0c/1', value: false },
    { pointer: '/a~1b~0c/2', value: 0 },
    { pointer: '/a~1b~0c/3', value: '  untouched\n' },
  ]);
  assert.deepEqual(flattenAstraCopyLeaves('root'), [{ pointer: '', value: 'root' }]);
});

test('ASCII-only implementation, dual admin gates, draft noindex and no feedback submission seams', async () => {
  for (const path of implementationPaths) {
    const bytes = await readFile(join(process.cwd(), path));
    assert.ok(!/[\u0590-\u05ff]/u.test(bytes.toString('utf8')), `${path} contains Hebrew`);
  }
  const [proxy, page, control] = await Promise.all(['src/proxy.ts', pagePath, controlPath].map(path =>
    readFile(join(process.cwd(), path), 'utf8')));
  assert.match(proxy, /MASTER_ADMIN_PROTECTED = \[[^\]]*'\/admin\/astra-copy-review'/);
  assert.match(proxy, /matcher: \[[^\]]*'\/admin\/astra-copy-review\/:path\*'/);
  assert.match(page, /verifyAdminToken\(/);
  assert.match(page, /redirect\('\/admin\/login\?next=%2Fadmin%2Fastra-copy-review'\)/);
  assert.match(page, /index: false, follow: false, nocache: true/);
  for (const marker of ['DRAFT — REVIEW ONLY', 'NOT APPROVED FOR PUBLICATION', 'Material Hebrew QA still required']) {
    assert.ok(page.includes(marker));
  }
  assert.match(page, /dir="rtl" lang="he"/);
  assert.match(page, /<code dir="ltr"/);
  assert.match(control, /navigator\.clipboard\.writeText\(/);
  for (const content of [page, control]) {
    assert.doesNotMatch(content, /<(?:form|input|a|img|iframe|video|script)\b|\b(?:fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|serverAction)\b/i);
  }
});
