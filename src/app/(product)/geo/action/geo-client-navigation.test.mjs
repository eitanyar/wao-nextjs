import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { execFileSync, spawn } from 'node:child_process';
import { createHmac, randomBytes, scryptSync } from 'node:crypto';
import { once } from 'node:events';
import puppeteer from 'puppeteer';

const repo = process.cwd();
const servingRevision = '2cea54d57dc9f6df66169715ce588bb7065bb63b';
const sourceRoot = path.resolve(process.env.GEO_NAVIGATION_SOURCE_ROOT ?? repo);
const servingBaseline = process.env.GEO_NAVIGATION_SERVING_BASELINE === '1';
const owner = 'synthetic-geo-owner';
const other = 'synthetic-geo-other';
const actionId = `${owner}-1-first`;
const actionPath = `/geo/action/${actionId}`;
const staffSelector = 'a[href="/geo/dashboard"]';

async function freePort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

function session(secret, clientId, overrides = {}) {
  const payload = Buffer.from(JSON.stringify({ clientId, sessionVersion: 1, expiry: Date.now() + 3600000, scope: 'full', ...overrides })).toString('base64url');
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('hex')}`;
}

async function json(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value));
}

// Real Next routes and real authentication, never a mocked HTTP response.
// All filesystem loaders resolve into this private cwd; no production data hook.
test('GEO client login, first recommendation, admin visibility and closed authorization matrix', { timeout: 360000 }, async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wao-geo-navigation-'));
  await fs.chmod(root, 0o700);
  t.diagnostic(`Private evidence: ${root}`);
  const app = path.join(root, 'app');
  await fs.mkdir(app);
  if (sourceRoot !== repo) {
    const relative = path.relative(os.tmpdir(), sourceRoot);
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'alternate source must be private scratch');
  }
  if (servingBaseline) {
    assert.notEqual(sourceRoot, repo, 'baseline probe never rewrites shared source');
    const pagePath = 'src/app/(product)/geo/action/[actionId]/page.tsx';
    assert.equal(await fs.readFile(path.join(sourceRoot, pagePath), 'utf8'), execFileSync('git', ['show', `${servingRevision}:${pagePath}`], { cwd: repo, encoding: 'utf8' }), 'probe must use the actual serving page');
  }
  for (const entry of ['src', 'public', 'package.json', 'package-lock.json', 'tsconfig.json', 'next-env.d.ts', 'next.config.ts', 'postcss.config.mjs']) {
    await fs.cp(path.join(sourceRoot, entry), path.join(app, entry), {
      recursive: true,
      filter: source => !/(?:^|\/)\.env(?:\.|$)|credential|gsc-token|wp-token/.test(source),
    });
  }
  await fs.symlink(path.join(repo, 'node_modules'), path.join(app, 'node_modules'), 'dir');
  // Next's documented internal test seam prevents any Google Fonts network fetch.
  const fontMock = path.join(root, 'font-responses.cjs');
  await fs.writeFile(fontMock, "module.exports = new Proxy({}, { get: () => '@font-face { font-family: Fixture; src: url(https://fixture.invalid/font.woff2); }' });\n");
  const clientSecret = randomBytes(32).toString('hex');
  const adminSecret = randomBytes(32).toString('hex');
  const pin = String(200000 + randomBytes(3).readUIntBE(0, 3) % 700000);
  const salt = randomBytes(16);
  const hash = ['scrypt-v1', 16384, 8, 1, salt.toString('base64url'), scryptSync(pin, salt, 32, { N: 16384, r: 8, p: 1 }).toString('base64url')].join('$');
  const now = new Date().toISOString();
  for (const clientId of [owner, other]) {
    await json(path.join(app, 'data/clients', clientId, 'client.json'), { clientId, siteUrl: 'https://fixture.invalid', entitlements: ['geo', 'advisor'], wpConnected: false, platform: 'code' });
    await json(path.join(app, 'data/clients', clientId, 'client-auth.json'), { pinHash: hash, sessionVersion: 1, mustChangePin: false, createdAt: now, updatedAt: now });
  }
  const fixtures = [];
  for (const rank of [2, 1, 3]) {
    const snapshot = rank === 1 ? 'current' : rank === 2 ? 'old-pending' : 'archived';
    const action = {
      actionId: rank === 1 ? actionId : rank === 2 ? `${owner}-2-second` : `${owner}-3-archive`, clientId: owner, rank,
      query: `Synthetic recommendation ${snapshot}`, rankingUrl: `https://fixture.invalid/${snapshot}`, implementationMode: 'enhance', actionType: 'faq_block', priority: 'HIGH', score: 100 / rank,
      impressions: 100, clicks: 2, ctr: 0.02, status: rank === 3 ? 'superseded' : 'generated', generatedAt: rank === 1 ? now : '2026-08-01T00:00:00.000Z',
      ...(rank === 1 ? { publishMode: 'manual' } : {}),
      ...(rank === 3 ? { supersededBy: actionId, supersededAt: now } : {}),
      content: { hebrewContent: `<section><h2>Synthetic content ${rank}</h2><h3>Question ${snapshot}?</h3><p>Exact answer ${snapshot}.</p></section>`, placementInstruction: `Insert ${snapshot} below its introduction.`, metaDescription: `Synthetic fixture ${snapshot}.`, jsonLd: { '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: `Question ${snapshot}?`, acceptedAnswer: { '@type': 'Answer', text: `Exact answer ${snapshot}.` } }] }, tamarNotes: '', noaChanges: null },
    };
    const file = path.join(app, 'data/clients', owner, 'tasks/geo', ...(rank === 3 ? ['_archive'] : []), `${rank}.json`);
    await json(file, action);
    fixtures.push({ snapshot, action, file });
  }
  // Live wins over a conflicting same-ID archive; snapshots must never be substituted.
  const shadow = path.join(app, 'data/clients', owner, 'tasks/geo/_archive/shadow.json');
  await json(shadow, { ...fixtures.find(item => item.snapshot === 'current').action, query: 'Wrong archived shadow', content: { hebrewContent: '<p>Wrong shadow content</p>', jsonLd: {} } });
  const actionFiles = [...fixtures.map(item => item.file), shadow];
  const originalActions = await Promise.all(actionFiles.map(file => fs.readFile(file, 'utf8')));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const log = await fs.open(path.join(root, 'next.log'), 'w');
  const server = spawn(process.execPath, [path.join(repo, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: app, stdio: ['ignore', log.fd, log.fd],
    env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: os.tmpdir(), NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1', NEXT_FONT_GOOGLE_MOCKED_RESPONSES: fontMock, CLIENT_PORTAL_SECRET: clientSecret, ADMIN_SECRET: adminSecret },
  });
  let browser;
  const evidence = [];
  const navigations = [];
  const geometry = [];
  const platformPosts = [];
  const unexpectedMutations = [];
  try {
    for (let attempt = 0; ; attempt++) {
      try { await fetch(`${base}/client/login`, { signal: AbortSignal.timeout(2000) }); break; } catch {
        assert.equal(server.exitCode, null, 'private Next server must remain running');
        if (attempt > 90) throw new Error(`Private server readiness failed; see ${root}/next.log`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--disable-background-networking', '--disable-component-update'] });
    async function pageWithCookies(cookies = [], allowPlatform = false) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await context.overridePermissions(base, ['clipboard-read', 'clipboard-write']);
      await page.setRequestInterception(true);
      page.on('request', request => {
        const url = new URL(request.url());
        if (url.origin !== base && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
        if (!['GET', 'HEAD'].includes(request.method()) && url.pathname !== '/client/login') {
          if (allowPlatform && url.pathname === '/api/geo/client/platform' && request.method() === 'POST') {
            platformPosts.push({ url: url.pathname, method: request.method(), ...JSON.parse(request.postData()) });
            return request.respond({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
          }
          unexpectedMutations.push({ path: url.pathname, method: request.method() });
          return request.abort();
        }
        return request.continue();
      });
      page.on('response', response => {
        const request = response.request();
        const url = new URL(response.url());
        if (url.origin === base && (request.isNavigationRequest() || request.headers().rsc)) navigations.push({ path: url.pathname, status: response.status(), redirects: request.redirectChain().map(item => new URL(item.url()).pathname) });
      });
      if (cookies.length) await context.setCookie(...cookies.map(([name, value]) => ({ name, value, url: base, httpOnly: true })));
      return page;
    }
    async function record(page, name, response) {
      const request = response?.request();
      evidence.push({ name, status: response?.status(), finalPath: new URL(page.url()).pathname + new URL(page.url()).search, redirects: request?.redirectChain().map(item => new URL(item.url()).pathname) ?? [] });
    }
    async function login(page) {
      await page.goto(`${base}/client/login`, { waitUntil: 'networkidle0' });
      await page.type('[name="clientId"]', owner);
      await page.type('[name="pin"]', pin);
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('button[type="submit"]')]);
      assert.equal(new URL(page.url()).pathname, '/client/dashboard');
      const cookies = await page.browserContext().cookies();
      assert.equal(cookies.some(cookie => cookie.name === 'wao-admin'), false);
      assert.equal(cookies.some(cookie => cookie.name === 'wao-client'), true, 'real login issued client cookie');
    }
    async function exactContent(page, fixture, name, response) {
      const { action } = fixture;
      await page.waitForFunction((destination, query) => window.location.pathname === destination && document.querySelector('main h1')?.textContent === query, {}, `/geo/action/${action.actionId}`, action.query);
      if (response) {
        assert.equal(response.status(), 200);
        assert.deepEqual(response.request().redirectChain().map(item => new URL(item.url()).pathname), []);
      }
      assert.equal(new URL(page.url()).pathname, `/geo/action/${action.actionId}`);
      assert.equal(await page.$eval('main h1', el => el.textContent), action.query);
      assert.equal(await page.$eval('main ol > li .prose', el => el.innerHTML), action.content.hebrewContent);
      assert.deepEqual(JSON.parse(await page.$eval('main pre code', el => el.textContent)), { '@context': 'https://schema.org', ...action.content.jsonLd });
      assert.equal(await page.$eval('main header p bdi', el => el.textContent), action.rankingUrl);
      assert.equal(await page.$eval('main ol > li:nth-child(2) p.text-xs bdi', el => el.textContent), action.rankingUrl);
      assert.ok((await page.$eval('main ol > li:nth-child(2)', el => el.textContent)).includes(action.content.placementInstruction));
      assert.equal(await page.$(staffSelector), null);
      await page.click('main details summary');
      for (const [selector, payload] of [['main ol > li:first-child button', action.content.hebrewContent], ['main details button', JSON.stringify({ '@context': 'https://schema.org', ...action.content.jsonLd }, null, 2)]]) {
        await page.click(selector);
        await page.waitForFunction(expected => navigator.clipboard.readText().then(text => text === expected), {}, payload);
        assert.equal(await page.evaluate(() => navigator.clipboard.readText()), payload, 'manual copy preserves exact payload');
      }
      const superseded = action.status === 'superseded';
      assert.equal(await page.$('#publish-mode') === null, superseded);
      assert.equal(await page.$('#action-cta') === null, superseded);
      if (!superseded) {
        assert.equal(await page.$eval('input[value="manual"]', el => el.checked && !el.disabled && !el.closest('fieldset').disabled), true);
        assert.equal(await page.$eval('#action-cta button', el => el.disabled), false);
      } else assert.notEqual(await page.$(`a[href="${actionPath}"]`), null, 'newer action offered only as explicit link');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'no horizontal overflow');
      await page.screenshot({ path: path.join(root, `${name}.png`), fullPage: true });
      await record(page, name, response);
    }
    if (servingBaseline) {
      await t.test('actual serving baseline redirects freshly logged-in clients to admin on both devices', async () => {
        for (const [device, width, height] of [['desktop', 1280, 900], ['mobile', 390, 844]]) {
          const page = await pageWithCookies();
          await page.setViewport({ width, height });
          await login(page);
          await record(page, `${device}-successful-client-login`);
          await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click(`a[href="${actionPath}"]`)]);
          // An App Router streamed redirect can follow its initial navigation.
          await page.waitForFunction(() => window.location.pathname === '/admin/login');
          assert.equal(new URL(page.url()).pathname, '/admin/login');
          await record(page, `${device}-baseline-first-click`);
          for (const fixture of fixtures) {
            const destination = `/geo/action/${fixture.action.actionId}`;
            const response = await page.goto(`${base}${destination}`, { waitUntil: 'networkidle0' });
            assert.equal(new URL(page.url()).pathname, '/admin/login');
            assert.equal(new URL(page.url()).searchParams.get('next'), destination);
            assert.ok(response.request().redirectChain().some(request => new URL(request.url()).pathname === destination));
            const direct = await fetch(`${base}${destination}`, { redirect: 'manual', headers: { cookie: (await page.browserContext().cookies()).filter(cookie => cookie.name === 'wao-client').map(cookie => `${cookie.name}=${cookie.value}`).join('; ') } });
            assert.equal(direct.status, 307, 'genuine logged-in baseline redirect');
            await record(page, `${device}-baseline-${fixture.snapshot}`, response);
            evidence.push({ name: `${device}-baseline-${fixture.snapshot}-initial`, status: direct.status, location: direct.headers.get('location') });
          }
          await page.browserContext().close();
        }
      });
      assert.deepEqual(await Promise.all(actionFiles.map(file => fs.readFile(file, 'utf8'))), originalActions, 'baseline never changes recommendations');
      return;
    }
    await t.test('fresh independent desktop/mobile logins preserve current old and archived exact snapshots', async () => {
      for (const [device, width, height] of [['desktop', 1280, 900], ['mobile', 390, 844]]) {
        const devicePage = await pageWithCookies();
        await devicePage.setViewport({ width, height });
        await login(devicePage);
        await record(devicePage, `${device}-successful-client-login`);
        const start = navigations.length;
        await Promise.all([devicePage.waitForNavigation({ waitUntil: 'networkidle0' }), devicePage.click(`a[href="${actionPath}"]`)]);
        await devicePage.waitForFunction(destination => window.location.pathname === destination, {}, actionPath);
        assert.equal(new URL(devicePage.url()).pathname, actionPath);
        await exactContent(devicePage, fixtures.find(item => item.snapshot === 'current'), `${device}-first-current`);
        for (const fixture of fixtures) {
          const destination = `/geo/action/${fixture.action.actionId}`;
          const response = await devicePage.goto(`${base}${destination}?ref=synthetic-${fixture.snapshot}`, { waitUntil: 'networkidle0' });
          assert.equal(new URL(devicePage.url()).search, `?ref=synthetic-${fixture.snapshot}`);
          await exactContent(devicePage, fixture, `${device}-${fixture.snapshot}-direct`, response);
          const refresh = await devicePage.reload({ waitUntil: 'networkidle0' });
          assert.equal(new URL(devicePage.url()).search, `?ref=synthetic-${fixture.snapshot}`);
          await exactContent(devicePage, fixture, `${device}-${fixture.snapshot}-refresh`, refresh);
        }
        for (const fixture of fixtures.filter(item => item.snapshot !== 'archived')) {
          await devicePage.goto(`${base}/client/dashboard`, { waitUntil: 'networkidle0' });
          const selector = `section[dir="ltr"] a[href="/geo/action/${fixture.action.actionId}"]`;
          await Promise.all([devicePage.waitForNavigation({ waitUntil: 'networkidle0' }), devicePage.click(selector)]);
          await exactContent(devicePage, fixture, `${device}-${fixture.snapshot}-advisor`);
        }
        assert.equal(navigations.slice(start).some(item => ['/admin/login', '/geo/login', '/client/login'].includes(item.path)), false, 'successful owner journey has no login redirects');
        await devicePage.browserContext().close();
      }
    });
    await t.test('mobile selector viewport hit targets and strip restoration', async () => {
      const probe = process.env.GEO_NAVIGATION_COLLISION_PROBE === '1';
      async function measure(page, name, settle = true) {
        if (settle) await new Promise(resolve => setTimeout(resolve, 300));
        const state = await page.evaluate(() => {
          const strip = [...document.querySelectorAll('div')].find(el => el.style.position === 'fixed' && el.style.zIndex === '180');
          const select = document.getElementById('geo-platform-select');
          const label = document.querySelector('label[for="geo-platform-select"]');
          const rect = el => el?.getBoundingClientRect().toJSON() ?? null;
          const hit = el => {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            const point = { x: r.left + r.width / 2, y: Math.max(1, r.top) + (Math.min(innerHeight, r.bottom) - Math.max(1, r.top)) / 2 };
            const target = document.elementFromPoint(point.x, point.y);
            return { point, own: target === el || el.contains(target), strip: strip.contains(target), tag: target?.tagName, id: target?.id };
          };
          const style = getComputedStyle(strip);
          return { scrollY, viewport: { width: innerWidth, height: innerHeight }, select: rect(select), label: rect(label), strip: rect(strip), inert: strip.inert, stripStyle: { display: style.display, visibility: style.visibility, pointerEvents: style.pointerEvents, transform: style.transform }, selectHit: hit(select), labelHit: hit(label), overflow: document.documentElement.scrollWidth > innerWidth };
        });
        geometry.push({ name, ...state });
        await page.screenshot({ path: path.join(root, `${name}-viewport.png`), fullPage: false });
        assert.equal(state.overflow, false);
        return state;
      }
      async function align(page, top) {
        await page.evaluate(y => {
          const label = document.querySelector('label[for="geo-platform-select"]');
          window.scrollTo({ top: scrollY + label.getBoundingClientRect().top - y, behavior: 'instant' });
        }, top);
      }
      function clearSelector(state) {
        assert.equal(state.labelHit.own, true, 'label hit target is its own element');
        assert.equal(state.selectHit.own, true, 'native selector hit target is its own element');
        assert.equal(state.stripStyle.visibility, 'hidden', 'collision suppression is immediate, not just slide-out');
        assert.equal(state.stripStyle.pointerEvents, 'none');
        assert.equal(state.inert, true, 'strip cannot receive keyboard focus');
      }
      for (const [width, height] of [[390, 844], [360, 800]]) {
        const mobile = await pageWithCookies([], true);
        await mobile.setViewport({ width, height });
        await login(mobile);
        for (const fixture of fixtures.filter(item => item.snapshot !== 'archived')) {
          const prefix = `selector-${width}-${fixture.snapshot}`;
          const response = await mobile.goto(`${base}/geo/action/${fixture.action.actionId}?ref=synthetic-selector`, { waitUntil: 'networkidle0' });
          await exactContent(mobile, fixture, `${prefix}-clipboard`, response);
          const clipboard = await measure(mobile, `${prefix}-clipboard`);
          for (const element of [clipboard.label, clipboard.select]) {
            assert.ok(element.bottom <= clipboard.strip.top || element.top >= clipboard.strip.bottom,
              `clipboard-scrolled controls must not overlap the strip: ${JSON.stringify(clipboard)}`);
          }
          assert.ok(Math.abs(clipboard.strip.top) < 1, 'strip remains visible after clipboard scroll');
          await mobile.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
          const top = await measure(mobile, `${prefix}-top`);
          assert.equal(top.stripStyle.visibility, probe ? 'visible' : 'hidden');
          assert.ok(top.strip.bottom <= 0);
          await align(mobile, 8);
          const collision = await measure(mobile, `${prefix}-collision`);
          assert.ok(collision.scrollY > 180);
          assert.ok(collision.label.top >= 0 && collision.select.bottom < height);
          if (probe) assert.equal(collision.labelHit.strip || collision.selectHit.strip, true, 'actual strip hit interception reproduced');
          else {
            clearSelector(collision);
            let step = 0;
            for (const y of [collision.strip.height + 8, 8, -collision.label.height - collision.select.height - 16, 8, collision.strip.height + 8]) {
              await align(mobile, y);
              await mobile.waitForFunction(() => {
                const strip = [...document.querySelectorAll('div')].find(el => el.style.position === 'fixed' && el.style.zIndex === '180');
                const label = document.querySelector('label[for="geo-platform-select"]');
                const select = document.getElementById('geo-platform-select');
                const collides = [label, select].some(el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < strip.getBoundingClientRect().height; });
                return getComputedStyle(strip).visibility === (collides ? 'hidden' : 'visible');
              });
              const immediate = await measure(mobile, `${prefix}-direction-${step++}-immediate`, false);
              if (y === 8) clearSelector(immediate);
              const state = await measure(mobile, `${prefix}-direction-${step}-settled`);
              if (y === 8) clearSelector(state);
              else {
                assert.equal(state.stripStyle.visibility, 'visible');
                assert.equal(state.inert, false);
                assert.ok(Math.abs(state.strip.top) < 1);
              }
            }
            await align(mobile, 8);
            await mobile.setViewport({ width: width === 390 ? 360 : 390, height });
            clearSelector(await measure(mobile, `${prefix}-resized`));
            await mobile.setViewport({ width, height });
            await align(mobile, collision.strip.height + 8);
            await measure(mobile, `${prefix}-before-size-change`);
            await mobile.evaluate(() => {
              const strip = [...document.querySelectorAll('div')].find(el => el.style.position === 'fixed' && el.style.zIndex === '180');
              strip.querySelector('button').style.paddingBlock = '40px';
            });
            const taller = await measure(mobile, `${prefix}-size-change`);
            assert.ok(taller.strip.height > collision.strip.height);
            clearSelector(taller);
            await mobile.evaluate(() => {
              const strip = [...document.querySelectorAll('div')].find(el => el.style.position === 'fixed' && el.style.zIndex === '180');
              strip.querySelector('button').style.paddingBlock = '';
            });
            assert.equal((await measure(mobile, `${prefix}-size-restored`)).stripStyle.visibility, 'visible');
            await align(mobile, 8);
            await measure(mobile, `${prefix}-before-keyboard`);
            await mobile.click('label[for="geo-platform-select"]');
            assert.equal(await mobile.$eval('#geo-platform-select', el => el === document.activeElement), true);
            await mobile.keyboard.press('ArrowDown');
            await mobile.keyboard.press('Tab');
            await mobile.waitForFunction(() => document.getElementById('geo-platform-select').value === 'other');
            assert.equal(await mobile.evaluate(() => localStorage.getItem('wao-geo-platform')), 'other');
            await mobile.select('#geo-platform-select', 'code');
            await align(mobile, collision.strip.height + 8);
            await measure(mobile, `${prefix}-restored`);
            const button = await mobile.evaluateHandle(() => [...document.querySelectorAll('div')].find(el => el.style.position === 'fixed' && el.style.zIndex === '180').querySelector('button'));
            await button.asElement().click();
            await button.dispose();
            await mobile.waitForFunction(() => {
              const r = document.getElementById('action-cta').getBoundingClientRect();
              return r.top >= 0 && r.bottom <= innerHeight;
            });
            await measure(mobile, `${prefix}-cta`);
            await mobile.setViewport({ width: 1280, height: 900 });
            await align(mobile, 8);
            const desktop = await measure(mobile, `${prefix}-desktop`);
            assert.equal(desktop.stripStyle.display, 'none');
            assert.equal(desktop.selectHit.own, true);
            assert.equal(desktop.labelHit.own, true);
            await mobile.setViewport({ width, height });
          }
        }
        const archive = fixtures.find(item => item.snapshot === 'archived');
        const archivedResponse = await mobile.goto(`${base}/geo/action/${archive.action.actionId}`, { waitUntil: 'networkidle0' });
        await exactContent(mobile, archive, `selector-${width}-archive-content`, archivedResponse);
        assert.equal(await mobile.$('#geo-platform-select'), null);
        assert.equal(await mobile.$('#action-cta'), null);
        await mobile.evaluate(() => window.scrollTo({ top: 250, behavior: 'instant' }));
        assert.ok(Math.abs((await measure(mobile, `selector-${width}-archive`)).strip.top) < 1);
        await mobile.setViewport({ width: 1280, height: 900 });
        assert.equal((await measure(mobile, `selector-${width}-desktop`)).stripStyle.display, 'none');
        await mobile.browserContext().close();
      }
      if (!probe) {
        assert.equal(platformPosts.length, 8);
        for (const post of platformPosts) assert.deepEqual(post, { url: '/api/geo/client/platform', method: 'POST', clientId: owner, platform: post.platform });
        assert.deepEqual(platformPosts.map(post => post.platform), ['other', 'code', 'other', 'code', 'other', 'code', 'other', 'code']);
      }
      assert.deepEqual(unexpectedMutations, [], 'no unexpected mutation attempts');
    });
    const page = await pageWithCookies();
    await t.test('real client-only login and first pending recommendation click', async () => {
      await page.goto(`${base}/client/login`, { waitUntil: 'networkidle0' });
      await page.type('[name="clientId"]', owner);
      await page.type('[name="pin"]', pin);
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('button[type="submit"]')]);
      assert.equal(new URL(page.url()).pathname, '/client/dashboard');
      assert.equal((await page.browserContext().cookies()).some(cookie => cookie.name === 'wao-admin'), false);
      const hrefs = await page.$$eval('a[href^="/geo/action/"]', links => links.map(link => link.getAttribute('href')));
      assert.equal(hrefs[0], actionPath, 'rank-1 pending destination');
      assert.deepEqual(hrefs, [actionPath, `/geo/action/${owner}-2-second`, actionPath, `/geo/action/${owner}-2-second`], 'pending and advisor destinations');
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click(`a[href="${actionPath}"]`)]);
      assert.equal(new URL(page.url()).pathname, actionPath);
      assert.match(await page.$eval('main', el => el.textContent), /Synthetic content 1/);
      await record(page, 'first-pending-click');
    });
    await t.test('non-WordPress owner visibility, manual instructions and refresh', async () => {
      assert.equal(await page.$eval('input[value="manual"]', el => el.checked), true);
      assert.equal(await page.$eval('input[value="auto"]', el => el.disabled), true);
      assert.equal(await page.$$eval('main ol > li', items => items.length), 3);
      if (process.env.GEO_NAVIGATION_BASELINE === '1') {
        assert.notEqual(await page.$(staffSelector), null, 'baseline exposes staff link');
        await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click(staffSelector)]);
        assert.equal(new URL(page.url()).pathname, '/geo/login');
        await record(page, 'baseline-staff-link-redirect');
        await page.goto(`${base}${actionPath}`, { waitUntil: 'networkidle0' });
      } else assert.equal(await page.$(staffSelector), null, 'clients never see staff connection link');
      const response = await page.reload({ waitUntil: 'networkidle0' });
      assert.equal(response.status(), 200);
      assert.equal(new URL(page.url()).pathname, actionPath);
      await record(page, 'owner-refresh', response);
      for (const [name, width, height] of [['desktop', 1280, 900], ['mobile', 390, 844]]) {
        await page.setViewport({ width, height });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${name} no horizontal overflow`);
        await page.screenshot({ path: path.join(root, `${name}.png`), fullPage: true });
      }
    });
    await t.test('advisor recommendation click remains in client journey', async () => {
      await page.goto(`${base}/client/dashboard`, { waitUntil: 'networkidle0' });
      const selector = `section[dir="ltr"] a[href="${actionPath}"]`;
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click(selector)]);
      assert.equal(new URL(page.url()).pathname, actionPath);
      await record(page, 'advisor-click');
    });
    await t.test('admin-only view retains connection link without mutation access', async () => {
      const expiry = String(Date.now() + 3600000);
      const token = `${expiry}.${createHmac('sha256', adminSecret).update(expiry).digest('hex')}`;
      const admin = await pageWithCookies([['wao-admin', token]]);
      const response = await admin.goto(`${base}${actionPath}`, { waitUntil: 'networkidle0' });
      assert.equal(response.status(), 200);
      assert.notEqual(await admin.$(staffSelector), null);
      assert.match(await admin.$eval('main', el => el.textContent), /Synthetic content 1/);
      assert.equal((await fetch(`${base}/api/geo/action/${actionId}`, { headers: { cookie: `wao-admin=${token}` } })).status, 401);
      await record(admin, 'admin-only', response);
    });
    await t.test('anonymous invalid expired and restricted sessions use client continuation', async () => {
      for (const [name, token] of [['anonymous', null], ['invalid', 'invalid'], ['expired', session(clientSecret, owner, { expiry: Date.now() - 1000 })], ['change-pin', session(clientSecret, owner, { scope: 'change-pin' })]]) {
        const denied = await pageWithCookies(token ? [['wao-client', token]] : []);
        const response = await denied.goto(`${base}${actionPath}`, { waitUntil: 'networkidle0' });
        const url = new URL(denied.url());
        assert.equal(url.pathname, '/client/login', name);
        assert.equal(url.searchParams.get('next'), actionPath, name);
        assert.doesNotMatch(await denied.content(), /Synthetic content 1/);
        await record(denied, name, response);
      }
      const restricted = session(clientSecret, owner, { scope: 'change-pin' });
      assert.equal((await fetch(`${base}/api/geo/action/${actionId}`, { headers: { cookie: `wao-client=${restricted}` } })).status, 401);
      const response = await fetch(`${base}/client/dashboard`, { redirect: 'manual', headers: { cookie: `wao-client=${restricted}` } });
      assert.equal(new URL(response.headers.get('location'), base).pathname, '/client/change-pin');
    });
    await t.test('cross-client and unknown action stay concealed; staff dashboard stays protected', async () => {
      for (const [name, token, destination] of [['cross-client', session(clientSecret, other), actionPath], ['unknown', session(clientSecret, owner), '/geo/action/synthetic-unknown']]) {
        const denied = await pageWithCookies([['wao-client', token]]);
        const response = await denied.goto(`${base}${destination}`, { waitUntil: 'networkidle0' });
        assert.equal(response.status(), 404, name);
        assert.doesNotMatch(await denied.content(), /Synthetic content 1/);
        assert.equal(new URL(denied.url()).pathname, destination);
        await record(denied, name, response);
      }
      const response = await fetch(`${base}/geo/dashboard`, { redirect: 'manual', headers: { cookie: `wao-client=${session(clientSecret, owner)}` } });
      assert.equal(new URL(response.headers.get('location'), base).pathname, '/geo/login');
    });
    assert.deepEqual(await Promise.all(actionFiles.map(file => fs.readFile(file, 'utf8'))), originalActions, 'all live/archive action bytes unchanged');
    assert.deepEqual(unexpectedMutations, [], 'all non-login mutations remain blocked and unattempted');
  } finally {
    await browser?.close();
    server.kill('SIGTERM');
    if (server.exitCode === null) await once(server, 'exit');
    await log.close();
    await fs.writeFile(path.join(root, 'navigation.json'), JSON.stringify(evidence, null, 2));
    await fs.writeFile(path.join(root, 'viewport-geometry.json'), JSON.stringify(geometry, null, 2));
    await fs.writeFile(path.join(root, 'synthetic-platform-posts.json'), JSON.stringify({ platformPosts, unexpectedMutations }, null, 2));
    await fs.writeFile(path.join(root, 'navigation-responses.json'), JSON.stringify(navigations, null, 2));
    await fs.writeFile(path.join(root, 'expected-snapshots.json'), JSON.stringify(fixtures.map(({ snapshot, action }) => ({ snapshot, action })), null, 2));
  }
});
