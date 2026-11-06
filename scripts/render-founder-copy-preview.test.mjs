import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DRAFTS, REPO_ROOT, OUTPUT_ROOT, escapeHtml, extractDraftRows, loadDrafts, renderFounderCopyPreview, publishPreview, sha256, createPreviewServer } from './render-founder-copy-preview.mjs';

const header = '| Key | Source | Old (reference) | Replacement |\n|---|---|---|---|';
const ascii = text => `${header}\n| \`contact.steps.1.tags\` (OPTIONAL, not rendered) | page.tsx:65 | OLD_PRIVATE | \`${text}\` |`;
const fixture = fn => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'founder-preview-test-'));
  try { return fn(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
};

test('HTML escaping covers every delimiter and keeps text inert', () => {
  assert.equal(escapeHtml('<script a="x">&\'</script>'), '&lt;script a=&quot;x&quot;&gt;&amp;&#39;&lt;/script&gt;');
});
test('synthetic ASCII extraction preserves code-span pipes and payload', () => {
  const rows = extractDraftRows(ascii('A | B \\| C'));
  assert.deepEqual(rows[0].texts, ['A | B | C']);
  assert.equal(rows[0].optional, true);
});
test('synthetic HTML injection is escaped even in all source labels', () => {
  const rows = extractDraftRows(ascii('<script>alert("x")</script><img src=x onerror=x>'));
  const html = renderFounderCopyPreview([{ title: '<iframe>', route: '<img>', file: '<script>', sha256: '"<hash>', rows }]);
  assert.ok(!/<script|<img|<iframe|<form|<input/i.test(html));
  assert.ok(html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'));
  assert.ok(!html.includes('OLD_PRIVATE'));
});
test('malformed, duplicate, missing, unsafe, and ambiguous rows fail closed', () => {
  assert.throws(() => extractDraftRows('No table'), /No replacement/);
  assert.throws(() => extractDraftRows(ascii('x').replace(' | OLD_PRIVATE |', ' | extra | OLD_PRIVATE |')), /Malformed/);
  assert.throws(() => extractDraftRows(ascii('x').replace('`x`', '`unclosed')), /Unclosed/);
  assert.throws(() => extractDraftRows(ascii('x') + '\n' + ascii('x').split('\n')[2]), /Duplicate/);
  assert.throws(() => extractDraftRows(ascii('x').replace('`x`', 'missing')), /Missing/);
  assert.throws(() => extractDraftRows(ascii('a\u0000b')), /Unsafe/);
  assert.throws(() => extractDraftRows(ascii('a\u202eb')), /Unsafe/);
  assert.throws(() => extractDraftRows(ascii('x').replace('`x`', '`x` and `y`')), /ambiguous/);
  assert.throws(() => extractDraftRows(ascii('x').replace('page.tsx:65', 'secret.env:1')), /Invalid source/);
});
test('real pinned drafts: independent key census and exact UTF-8 text-node preservation', () => {
  const drafts = loadDrafts();
  assert.deepEqual(drafts.map(draft => draft.rows.length), [27, 27, 8]);
  for (const draft of drafts) {
    const bytes = fs.readFileSync(path.join(REPO_ROOT, draft.file));
    assert.equal(sha256(bytes), draft.sha256);
    const lines = bytes.toString('utf8').split('\n');
    // Only the replacement tables precede these non-replacement sections.
    const boundary = draft.file.includes('offer-truth') ? '## 2.' : '## 4.';
    const prefix = bytes.toString('utf8').split(boundary)[0];
    const keys = [...prefix.matchAll(/^\| `([A-Za-z][A-Za-z0-9.]*)`/gm)].map(match => match[1]);
    assert.deepEqual(draft.rows.map(row => row.key), keys);
    for (const row of draft.rows) {
      const line = lines[row.line - 1];
      const payload = line.split('Structural note:')[0];
      const spans = [...payload.matchAll(/`([^`]+)`/g)].map(match => match[1]).filter(text => row.optional ? text.startsWith('[') : /[\u0590-\u05ff]/.test(text));
      assert.deepEqual(row.texts.map(text => Buffer.from(text)), spans.map(text => Buffer.from(text.replace(/\\\|/g, '|'))), row.key);
    }
  }
  assert.equal(drafts[1].rows.find(row => row.key === 'contact.hero.h1').texts.length, 3);
  assert.equal(drafts[1].rows.filter(row => row.optional).length, 3);
});
test('rendered output is deterministic, hash-bound, complete, gated and read-only', () => {
  const drafts = loadDrafts(), html = renderFounderCopyPreview(drafts);
  assert.equal(html, renderFounderCopyPreview(loadDrafts()));
  assert.equal((html.match(/<article /g) || []).length, 62);
  assert.equal((html.match(/lang="he"/g) || []).length, 61);
  assert.equal((html.match(/SEO-GATED &mdash;/g) || []).length, 11);
  assert.ok(html.includes('DRAFT &mdash; NOT APPLIED'));
  assert.ok(html.includes('form-action \'none\''));
  assert.ok(!/<script|<form|<iframe|<img|<link|<input|<button|https?:\/\//i.test(html));
  for (const draft of drafts) {
    assert.ok(html.includes(draft.sha256));
    for (const row of draft.rows) for (const text of row.texts) assert.ok(html.includes(escapeHtml(text)), row.key);
  }
});
test('publishing uses only injected output and fails before changing output on hash drift', () => fixture(root => {
  const repoRoot = path.join(root, 'repo'), outputRoot = path.join(root, 'preview');
  for (const draft of DRAFTS) {
    const file = path.join(repoRoot, draft.file);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.copyFileSync(path.join(REPO_ROOT, draft.file), file);
  }
  const result = publishPreview({ repoRoot, outputRoot });
  assert.deepEqual(fs.readdirSync(outputRoot), ['index.html']);
  const before = fs.readFileSync(result.output);
  assert.equal(result.htmlSha256, sha256(before));
  assert.equal(publishPreview({ repoRoot, outputRoot }).htmlSha256, result.htmlSha256);
  fs.appendFileSync(path.join(repoRoot, DRAFTS[0].file), '\nDRIFT');
  assert.throws(() => publishPreview({ repoRoot, outputRoot }), /Draft drift/);
  assert.deepEqual(fs.readFileSync(result.output), before);
}));
test('publication refuses unrelated files and symlinks', () => fixture(root => {
  const outputRoot = path.join(root, 'preview');
  fs.mkdirSync(outputRoot);
  fs.writeFileSync(path.join(outputRoot, 'private.md'), 'not served');
  assert.throws(() => publishPreview({ outputRoot }), /unrelated files/);
  fs.unlinkSync(path.join(outputRoot, 'private.md'));
  fs.symlinkSync(path.join(root, 'other'), path.join(outputRoot, 'index.html'));
  assert.throws(() => publishPreview({ outputRoot }), /Unsafe output file/);
}));

test('loopback server serves only verified GET/HEAD root with restrictive headers', async () => {
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'founder-server-test-'));
  const expectedHtml = '<!doctype html><p>ASCII synthetic preview</p>';
  let server;
  try {
    fs.writeFileSync(path.join(outputRoot, 'index.html'), expectedHtml);
    server = createPreviewServer({ outputRoot, expectedHtml });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    assert.equal(server.address().address, '127.0.0.1');
    const url = `http://127.0.0.1:${server.address().port}`;
    for (const method of ['GET', 'HEAD']) {
      const response = await fetch(url + '/', { method });
      assert.equal(response.status, 200);
      assert.equal(await response.text(), method === 'GET' ? expectedHtml : '');
      assert.equal(response.headers.get('content-type'), 'text/html; charset=UTF-8');
      assert.equal(response.headers.get('cache-control'), 'private,no-store');
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      for (const directive of ["script-src 'none'", "connect-src 'none'", "form-action 'none'", "frame-ancestors 'none'"]) assert.ok(response.headers.get('content-security-policy').includes(directive));
      assert.equal(response.headers.get('set-cookie'), null);
    }
    for (const resource of ['/index.html', '/private.md', '/%2e%2e/private.md', '/?approve=true', '/approve']) {
      assert.equal((await fetch(url + resource)).status, 404);
    }
    for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
      const response = await fetch(url + '/', { method });
      assert.equal(response.status, 405);
      assert.equal(response.headers.get('allow'), 'GET, HEAD');
    }
    assert.equal(fs.readFileSync(path.join(outputRoot, 'index.html'), 'utf8'), expectedHtml);
    assert.deepEqual(fs.readdirSync(outputRoot), ['index.html']);
    fs.writeFileSync(path.join(outputRoot, 'index.html'), 'DRIFT');
    assert.throws(() => createPreviewServer({ outputRoot, expectedHtml }), /Preview drift/);
    // The already-running service retains only its verified in-memory snapshot.
    assert.equal(await (await fetch(url + '/')).text(), expectedHtml);
    fs.writeFileSync(path.join(outputRoot, 'private.md'), 'PRIVATE');
    assert.throws(() => createPreviewServer({ outputRoot, expectedHtml }), /Unsafe serving/);
  } finally {
    if (server?.listening) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    fs.rmSync(outputRoot, { recursive: true, force: true });
  }
});

if (process.env.WAO_FOUNDER_PREVIEW_BROWSER === '1') {
  test('real HTTPS browser: trusted TLS, UTF-8 cells, desktop and 320px without overflow', async () => {
    const { default: puppeteer } = await import('puppeteer');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--host-resolver-rules=MAP msi-1.tailc496b2.ts.net 100.102.160.114'] });
    try {
      const page = await browser.newPage();
      const response = await page.goto('https://msi-1.tailc496b2.ts.net:8443/', { waitUntil: 'networkidle0', timeout: 30000 });
      assert.equal(response.status(), 200);
      assert.ok(response.securityDetails());
      const expected = loadDrafts().flatMap(draft => draft.rows.flatMap(row => row.texts));
      const observed = await page.$$eval('.copy', nodes => nodes.map(node => node.textContent));
      assert.deepEqual(observed.map(text => Buffer.from(text)), expected.map(text => Buffer.from(text)));
      const screenshotRoot = path.join(os.tmpdir(), 't_5b25ef64-browser');
      fs.mkdirSync(screenshotRoot, { recursive: true });
      for (const width of [1280, 320]) {
        await page.setViewport({ width, height: 900 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`);
        assert.ok(await page.$$eval('.copy[lang="he"]', nodes => nodes.every(node => getComputedStyle(node).direction === 'rtl')));
        await page.screenshot({ path: path.join(screenshotRoot, `${width}.png`) });
        console.log(`Browser screenshot: ${screenshotRoot}/${width}.png`);
        const card = await page.$('article');
        await card.screenshot({ path: path.join(screenshotRoot, `${width}-card.png`) });
        console.log(`RTL card screenshot: ${screenshotRoot}/${width}-card.png`);
      }
      assert.equal(await page.$('script, form, input, iframe'), null);
      assert.deepEqual(fs.readdirSync(OUTPUT_ROOT), ['index.html']);
    } finally { await browser.close(); }
  });
}
