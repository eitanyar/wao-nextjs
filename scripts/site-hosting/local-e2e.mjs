#!/usr/bin/env node
// Local end-to-end for the wao-sites Worker: no network, no Cloudflare account. HEBREW-SAFETY: ZERO Hebrew bytes.
//
//   npm run test (or the two site-hosting tsc builds) first, so dist/ holds the compiled libs + renderers, then:
//   node scripts/site-hosting/local-e2e.mjs --out DIR
//
// Pipeline exercised: real renderer (dist/lib/lp) → real R2 client (dist/lib/site-hosting/r2.js, SigV4) → local
// S3 shim (verifies every signature) → Miniflare R2 (wrangler getPlatformProxy, persisted) → `wrangler dev --local`
// serving the real Worker → curl with Host/SNI per tenant. Reads data/sites/*.json, never writes it.
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { parseArgs, stamp } from './lib.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const args = parseArgs(process.argv.slice(2));
const OUT = path.resolve(typeof args.out === 'string' ? args.out : path.join(ROOT, 'artifacts', 'site-hosting', `e2e-${stamp()}`));
const PERSIST = path.join(OUT, 'miniflare-state');
const CONFIG = path.join(ROOT, 'workers', 'wao-sites', 'wrangler.jsonc');
const WRANGLER = path.join(ROOT, 'node_modules', '.bin', 'wrangler');
const quietEnv = { ...process.env, WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_API_TOKEN: '', CLOUDFLARE_ACCOUNT_ID: '', NO_COLOR: '1' };
process.env.WRANGLER_SEND_METRICS = 'false';
fs.rmSync(PERSIST, { recursive: true, force: true });
fs.mkdirSync(PERSIST, { recursive: true });

const requireDist = createRequire(path.join(ROOT, 'dist', 'package.json'));
const r2 = requireDist('./lib/site-hosting/r2.js');
const tenantLib = requireDist('./lib/site-hosting/tenant.js');
const { startS3Server } = requireDist('./lib/site-hosting/s3Server.testkit.js');
const { renderSitePages, buildSitemap } = requireDist('./lib/lp/renderSitePages.js');
const { renderCoreThirtyPages, buildCoreThirtySitemapUrls } = requireDist('./lib/lp/renderCoreThirtyPages.js');
const { detectVertical } = requireDist('./lib/lp/verticalDetect.js');
const { VERTICAL_THEMES } = requireDist('./lib/lp/verticalThemes.js');
const { VERTICAL_ASSETS } = requireDist('./lib/lp/verticalAssets.js');
const { siteFontFiles } = requireDist('./lib/lp/siteFonts.js');

const sha = value => createHash('sha256').update(value).digest('hex').slice(0, 16);
const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: Boolean(pass), detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

/** Renders a data/sites record exactly like the deploy route's legacy path (no fraud tracker, no ads ids). */
function renderRecord(slug, siteUrl, overlay = {}) {
  const record = { ...JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'sites', `${slug}.json`), 'utf8')), ...overlay };
  const data = record.collectedData;
  const verticalKey = detectVertical(data.businessNiche || '');
  const theme = VERTICAL_THEMES[verticalKey];
  const assets = VERTICAL_ASSETS[verticalKey];
  const heroImageUrl = data.trustAssetUrls?.[0] || data.profilePhotoUrl || assets.heroImages[0].url;
  const params = { theme, assets, data, heroImageUrl, slug: overlay.renderSlug ?? slug, siteUrl };
  let pages = renderSitePages({ ...params, copy: record.copy });
  const nodes = record.legacyCoreThirty ? record.coreThirtyNodes || [] : [];
  if (nodes.length) {
    const copies = new Map(Object.entries(record.coreThirtyCopies || {}));
    const core = renderCoreThirtyPages({ ...params, nodes, copies });
    pages = { ...pages, ...core, 'sitemap.xml': buildSitemap(siteUrl, buildCoreThirtySitemapUrls(nodes, copies)) };
  }
  return { ...pages, ...siteFontFiles() };
}

async function freePort() {
  return new Promise(resolve => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
  });
}

async function withStore(fn) {
  const { getPlatformProxy } = await import(path.join(ROOT, 'node_modules', 'wrangler', 'wrangler-dist', 'cli.js'));
  const proxy = await getPlatformProxy({ configPath: CONFIG, persist: { path: path.join(PERSIST, 'v3') }, remoteBindings: false });
  const bucket = proxy.env.SITES;
  const backend = {
    async put(key, body, contentType) { return (await bucket.put(key, new Uint8Array(body), { httpMetadata: { contentType } })).httpEtag; },
    async get(key) {
      const o = await bucket.get(key);
      return o ? { body: Buffer.from(await o.arrayBuffer()), etag: o.httpEtag, contentType: o.httpMetadata?.contentType ?? 'application/octet-stream' } : null;
    },
    async delete(key) { await bucket.delete(key); },
    async list(prefix) {
      const keys = [];
      let cursor;
      do {
        const page = await bucket.list({ prefix, cursor, limit: 1000 });
        keys.push(...page.objects.map(o => o.key));
        cursor = page.truncated ? page.cursor : undefined;
      } while (cursor);
      return keys.sort();
    },
    async etags(prefix) {
      const out = {};
      for (const key of await this.list(prefix)) out[key] = (await bucket.head(key)).httpEtag;
      return out;
    },
  };
  const credentials = { accessKeyId: 'e2e-local-key', secretAccessKey: 'e2e-local-secret' };
  const shim = await startS3Server({ bucket: 'wao-sites', credentials, backend });
  const store = r2.createS3Store({ endpoint: shim.endpoint, bucket: 'wao-sites', credentials });
  try {
    return await fn({ store, backend, shim });
  } finally {
    await shim.close();
    await proxy.dispose();
  }
}

async function withWorker(protocol, fn) {
  const port = await freePort();
  const child = spawn(WRANGLER, ['dev', '-c', CONFIG, '--local', '--persist-to', PERSIST, '--port', String(port), '--ip', '127.0.0.1',
    '--local-protocol', protocol, '--log-level', 'warn', '--show-interactive-dev-session=false'], { cwd: ROOT, env: quietEnv, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', d => { log += d; });
  child.stderr.on('data', d => { log += d; });
  const deadline = Date.now() + 60_000;
  for (;;) {
    try {
      const code = execFileSync('curl', ['-sk', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '2', '-H', 'Host: sites.wao.co.il', `${protocol}://127.0.0.1:${port}/__wao/health`]).toString();
      if (code !== '200') throw new Error(code);
      break;
    } catch {
      if (Date.now() > deadline || child.exitCode !== null) { child.kill('SIGTERM'); throw new Error(`wrangler dev did not start:\n${log}`); }
      await new Promise(r => setTimeout(r, 500));
    }
  }
  try {
    return await fn(port);
  } finally {
    child.kill('SIGINT');
    await new Promise(r => { child.once('exit', r); setTimeout(r, 5000); });
    fs.writeFileSync(path.join(OUT, `wrangler-dev-${protocol}-${port}.log`), log);
  }
}

/** curl with Host + SNI = `host` (via --resolve), returns status, headers, body. */
function curl(protocol, port, host, pathAndQuery, extra = []) {
  const url = `${protocol}://${host}:${port}${pathAndQuery}`;
  const raw = execFileSync('curl', ['-sk', '--path-as-is', '-i', '--max-time', '15', '--resolve', `${host}:${port}:127.0.0.1`, ...extra, url], { maxBuffer: 32 * 1024 * 1024 }).toString('latin1');
  const split = raw.indexOf('\r\n\r\n');
  const head = raw.slice(0, split).split('\r\n');
  const status = Number(head[0].split(' ')[1]);
  const headers = Object.fromEntries(head.slice(1).map(l => [l.slice(0, l.indexOf(':')).toLowerCase(), l.slice(l.indexOf(':') + 1).trim()]));
  return { status, headers, body: Buffer.from(raw.slice(split + 4), 'latin1') };
}

const PLUMBER = 'test-plumber-tlv';
const CORE = 'test-core30-verify';
const OWNER = 'owner-demo';
const SUSPENDED = 'suspended-demo';
const OWNER_ORIGIN = 'https://www.owner-demo.example';

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  console.log(`local e2e — out ${OUT}`);
  const plumberV1 = renderRecord(PLUMBER, `https://${PLUMBER}.wao.co.il`);
  plumberV1['index.html'] = `${plumberV1['index.html']}\n<!-- e2e-marker v1 -->\n`;
  const core = renderRecord(CORE, `https://${CORE}.wao.co.il`);
  const owner = renderRecord(PLUMBER, OWNER_ORIGIN, { renderSlug: OWNER });

  // Phase 1: seed through the real R2 client + SigV4 shim.
  const seeded = await withStore(async ({ store, backend, shim }) => {
    const p1 = await r2.publishTenantSite({ store, slug: PLUMBER, files: plumberV1, canonicalOrigin: `https://${PLUMBER}.wao.co.il`, hosts: tenantLib.tenantHosts(PLUMBER, {}) });
    const c1 = await r2.publishTenantSite({ store, slug: CORE, files: core, canonicalOrigin: `https://${CORE}.wao.co.il`, hosts: tenantLib.tenantHosts(CORE, {}) });
    const ownerRecord = { ownerDomain: 'owner-demo.example', canonicalOrigin: OWNER_ORIGIN };
    const o1 = await r2.publishTenantSite({ store, slug: OWNER, files: owner, canonicalOrigin: tenantLib.tenantCanonicalOrigin(OWNER, ownerRecord), hosts: tenantLib.tenantHosts(OWNER, ownerRecord) });
    await r2.publishTenantSite({ store, slug: SUSPENDED, files: core, canonicalOrigin: `https://${SUSPENDED}.wao.co.il`, hosts: tenantLib.tenantHosts(SUSPENDED, {}) });
    const pointer = await r2.readTenantPointer(store, SUSPENDED);
    await store.put(`tenants/${SUSPENDED}.json`, new TextEncoder().encode(JSON.stringify({ ...pointer, status: 'suspended' })), 'application/json');
    check('seed: SigV4 shim saw zero auth failures', shim.authFailures === 0, `${shim.requests.length} signed S3 requests`);
    check('seed: plumber read-back count + index ETag', p1.fileCount === Object.keys(plumberV1).length + 1, `${p1.fileCount} objects, version ${p1.version}`);
    check('seed: owner-domain tenant hosts', o1.hostsWritten.join(',') === `www.owner-demo.example,${OWNER}.wao.co.il`, o1.hostsWritten.join(', '));
    return { p1, c1, coreEtags: await backend.etags(`sites/${CORE}/`), notFound: (await backend.get(`sites/${PLUMBER}/${p1.version}/404.html`)).body };
  });

  // Phase 2: serve over https (wrangler dev --local-protocol https).
  let coreHomeHash;
  await withWorker('https', async port => {
    const h = (host, p, extra) => curl('https', port, host, p, extra);
    const home = h(`${PLUMBER}.wao.co.il`, '/');
    check('tenant / → 200 + x-wao-site + html + max-age=60', home.status === 200 && home.headers['x-wao-site'] === PLUMBER &&
      home.headers['content-type'] === 'text/html; charset=utf-8' && home.headers['cache-control'] === 'public, max-age=60', `${home.status} ${home.headers['x-wao-site']} ${home.headers['cache-control']}`);
    check('tenant / carries the v1 marker and the subdomain canonical', home.body.includes('e2e-marker v1') && home.body.includes(`https://${PLUMBER}.wao.co.il/`));
    const again = h(`${PLUMBER}.wao.co.il`, '/');
    check('edge cache: second request served from the Cache API', again.headers['x-wao-cache'] === 'HIT', `x-wao-cache ${home.headers['x-wao-cache']} → ${again.headers['x-wao-cache']}`);
    const cond = h(`${PLUMBER}.wao.co.il`, '/', ['-H', `If-None-Match: ${home.headers.etag}`]);
    check('If-None-Match → 304', cond.status === 304, `${cond.status}`);
    const about = h(`${PLUMBER}.wao.co.il`, '/about');
    check('/about → 200', about.status === 200, `${about.status}`);
    const aboutHtml = h(`${PLUMBER}.wao.co.il`, '/about.html?utm_source=x');
    check('/about.html → 301 /about (query kept)', aboutHtml.status === 301 && aboutHtml.headers.location === '/about?utm_source=x', `${aboutHtml.status} ${aboutHtml.headers.location}`);
    const missing = h(`${PLUMBER}.wao.co.il`, '/no-such-page');
    check('unknown path → 404 with the tenant 404.html', missing.status === 404 && missing.body.equals(seeded.notFound) && missing.headers['x-wao-site'] === PLUMBER, `${missing.status}, body sha ${sha(missing.body)} vs 404.html ${sha(seeded.notFound)}`);
    const robots = h(`${PLUMBER}.wao.co.il`, '/robots.txt');
    check('robots.txt rendered with the sitemap line', robots.status === 200 && robots.body.toString().includes(`Sitemap: https://${PLUMBER}.wao.co.il/sitemap.xml`), robots.body.toString().trim().replace(/\n/g, ' | '));
    const sitemap = h(`${PLUMBER}.wao.co.il`, '/sitemap.xml');
    check('sitemap.xml → application/xml', sitemap.status === 200 && sitemap.headers['content-type'].startsWith('application/xml'), sitemap.headers['content-type']);
    const fontKey = Object.keys(plumberV1).find(k => k.endsWith('.woff2'));
    const font = h(`${PLUMBER}.wao.co.il`, `/${fontKey}`);
    check('font → font/woff2, long cache', font.status === 200 && font.headers['content-type'] === 'font/woff2' && font.headers['cache-control'] === 'public, max-age=604800', `/${fontKey} ${font.headers['content-type']}`);
    const health = h(`${PLUMBER}.wao.co.il`, '/__wao/health');
    const healthJson = JSON.parse(health.body.toString());
    check('GET /__wao/health → slug + version JSON', health.status === 200 && healthJson.slug === PLUMBER && healthJson.version === seeded.p1.version, health.body.toString());
    const infra = h('sites.wao.co.il', '/__wao/health');
    check('sites.wao.co.il health → worker JSON (no tenant header)', infra.status === 200 && infra.body.toString().includes('"worker":"wao-sites"') && !infra.headers['x-wao-site'], infra.body.toString());
    for (const p of ['/%2e%2e%2ftenants%2ftest-core30-verify.json', '/..%2f..%2ftenants', '//etc/passwd', '/a%5c..%5cb', '/%00', '/a%00.html', '/%D7%A9', '/%EF%BC%8E%EF%BC%8E/x', '/%c0%ae%c0%ae/x', `/${'a'.repeat(1100)}`]) {
      const r = h(`${PLUMBER}.wao.co.il`, p);
      check(`traversal ${p.length > 40 ? `${p.slice(0, 20)}…(${p.length})` : p} → 400`, r.status === 400 && r.headers['x-wao-site'] === PLUMBER, `${r.status}`);
    }
    const dotdot = h(`${PLUMBER}.wao.co.il`, '/../tenants/x');
    check('literal /../ is normalised by the URL parser and stays inside the tenant (404, never another tenant)', dotdot.status === 404 && dotdot.headers['x-wao-site'] === PLUMBER, `${dotdot.status}`);
    const redirectHost = h(`${OWNER}.wao.co.il`, '/about?x=1');
    check('redirect-role host → 301 canonicalOrigin + path + query', redirectHost.status === 301 && redirectHost.headers.location === `${OWNER_ORIGIN}/about?x=1`, `${redirectHost.status} ${redirectHost.headers.location}`);
    const ownerHome = h('www.owner-demo.example', '/');
    check('owner-domain canonical host → 200, canonicals carry https://www.owner-demo.example', ownerHome.status === 200 && ownerHome.headers['x-wao-site'] === OWNER && ownerHome.body.includes(`${OWNER_ORIGIN}/`) && !ownerHome.body.includes(`${OWNER}.wao.co.il`), `${ownerHome.status}`);
    const ownerRobots = h('www.owner-demo.example', '/robots.txt');
    check('owner robots.txt sitemap line on the owner origin', ownerRobots.body.toString().includes(`Sitemap: ${OWNER_ORIGIN}/sitemap.xml`));
    const suspended = h(`${SUSPENDED}.wao.co.il`, '/');
    check('suspended tenant → 410', suspended.status === 410 && suspended.headers['x-wao-site'] === SUSPENDED, `${suspended.status}`);
    const post = h(`${PLUMBER}.wao.co.il`, '/', ['-X', 'POST']);
    check('POST → 405', post.status === 405, `${post.status}`);
    const coreHome = h(`${CORE}.wao.co.il`, '/');
    coreHomeHash = sha(coreHome.body);
    check('second tenant / → 200 (its own content)', coreHome.status === 200 && coreHome.headers['x-wao-site'] === CORE, `${coreHome.status} sha ${coreHomeHash}`);
  });

  // Phase 3: http + passthrough (wrangler dev --local-protocol http) and a local origin for the unknown host.
  // Separate process: the curl calls below are synchronous and would block an in-process server.
  const originPort = await freePort();
  const origin = spawn(process.execPath, ['-e', `require('http').createServer((q, s) => s.writeHead(200, { 'content-type': 'text/plain' }).end('origin-ok ' + q.headers.host + ' ' + q.url)).listen(${originPort}, '127.0.0.1')`], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 500));
  await withWorker('http', async port => {
    const toHttps = curl('http', port, `${PLUMBER}.wao.co.il`, '/about?a=1');
    check('http:// → 301 https:// (same host, path, query)', toHttps.status === 301 && toHttps.headers.location === `https://${PLUMBER}.wao.co.il:${port}/about?a=1`, `${toHttps.status} ${toHttps.headers.location}`);
    // An unknown host must reach whatever it resolves to, untouched. Here: a plain local origin on 127.0.0.1.
    const raw = execFileSync('curl', ['-s', '-i', '--max-time', '15', '-H', `Host: 127.0.0.1:${originPort}`, `http://127.0.0.1:${port}/passthrough?q=1`]).toString();
    check('unknown host → passthrough fetch(request) to its own origin, no x-wao-site', /origin-ok/.test(raw) && !/x-wao-site/i.test(raw), raw.split('\r\n')[0] + ' | ' + raw.split('\r\n\r\n')[1]?.slice(0, 60));
    const wao = execFileSync('curl', ['-s', '-i', '--max-time', '15', '-H', `Host: localhost:${originPort}`, `http://127.0.0.1:${port}/`]).toString();
    check('non-FQDN host (localhost) → passthrough too', /origin-ok/.test(wao), wao.split('\r\n')[0]);
  });
  origin.kill('SIGTERM');

  // Phase 4: redeploy ONE tenant with a changed file.
  const plumberV2 = { ...plumberV1, 'index.html': plumberV1['index.html'].replace('e2e-marker v1', 'e2e-marker v2') };
  const redeploy = await withStore(async ({ store, backend }) => {
    const p2 = await r2.publishTenantSite({ store, slug: PLUMBER, files: plumberV2, canonicalOrigin: `https://${PLUMBER}.wao.co.il`, hosts: tenantLib.tenantHosts(PLUMBER, {}) });
    const coreAfter = await backend.etags(`sites/${CORE}/`);
    const same = JSON.stringify(coreAfter) === JSON.stringify(seeded.coreEtags);
    check('redeploy plumber: second tenant R2 objects + ETags unchanged', same, `${Object.keys(coreAfter).length} objects compared`);
    const versions = new Set((await backend.list(`sites/${PLUMBER}/`)).map(k => k.split('/')[2]));
    check('redeploy keeps current + previous version', versions.size === 2 && versions.has(p2.version) && versions.has(seeded.p1.version), [...versions].join(', '));
    return { p2 };
  });
  await withWorker('https', async port => {
    const home = curl('https', port, `${PLUMBER}.wao.co.il`, '/');
    check('after redeploy: new content live (v2 marker, new version header)', home.body.includes('e2e-marker v2') && home.headers['x-wao-version'] === redeploy.p2.version, home.headers['x-wao-version']);
    const coreHome = curl('https', port, `${CORE}.wao.co.il`, '/');
    check('after redeploy: second tenant page byte-identical', sha(coreHome.body) === coreHomeHash, sha(coreHome.body));
  });

  // Phase 5: rollback = pointer flip to the previous version.
  await withStore(async ({ store }) => {
    const rolled = await r2.rollbackTenant(store, PLUMBER);
    check('rollback pointer → previous version', rolled.version === seeded.p1.version, `${redeploy.p2.version} → ${rolled.version}`);
  });
  await withWorker('https', async port => {
    const home = curl('https', port, `${PLUMBER}.wao.co.il`, '/');
    check('after rollback: v1 content served again', home.body.includes('e2e-marker v1') && home.headers['x-wao-version'] === seeded.p1.version, home.headers['x-wao-version']);
  });

  const failed = results.filter(r => !r.pass);
  fs.writeFileSync(path.join(OUT, 'results.json'), `${JSON.stringify({ at: new Date().toISOString(), results }, null, 2)}\n`);
  console.log(`\n${results.length - failed.length}/${results.length} passed${failed.length ? `; FAILED: ${failed.map(f => f.name).join(' | ')}` : ''}`);
  return failed.length ? 1 : 0;
}

main().then(code => process.exit(code), error => { console.error(error); process.exit(1); });
