import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { access, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';
import puppeteer from 'puppeteer';
import { createLocalPreviewRuntime } from './site-bot-local-preview.mjs';
import { createOperatorPreviewRuntime, loadOperatorPreviewInput } from './site-bot-operator-preview.mjs';

const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8WgWQAAAABJRU5ErkJggg==', 'base64');
const roots = [];

function copy(headline) {
  return {
    heroHeadline: headline,
    heroSubheadline: `${headline} description`,
    heroCta: 'Disabled',
    trustBarItems: ['Synthetic proof'],
    aboutBlurb: 'Synthetic about copy.',
    servicesHeadline: 'Services',
    serviceItems: ['Synthetic Service'],
    faqHeadline: 'FAQ',
    faqItems: [],
    guaranteeBlock: 'Synthetic only.',
    reviewFeatured: null,
    reviewContext: null,
    responseTimeBadge: null,
    scarcityLine: null,
    formHeadline: 'No submissions',
    stickyBarLine: 'Offline only',
    aboutPageHeadline: 'About synthetic',
    aboutPageBody: 'Synthetic fixture.',
    serviceDetails: [{ name: 'Synthetic Service', description: 'Synthetic fixture service.' }],
  };
}

function record(overrides = {}) {
  const pages = [
    { opportunityId: 'home', classification: 'homepage', targetPath: '/', copy: copy('Synthetic Home') },
    { opportunityId: 'hub', classification: 'service_hub', targetPath: '/services', copy: copy('Synthetic Services') },
    { opportunityId: 'money', classification: 'money_service', targetPath: '/services/synthetic-service', copy: copy('Synthetic Money Service') },
  ];
  return {
    slug: 'operator-preview',
    researchId: 'research-alpha',
    approvedPageId: 'home',
    collectedData: {
      businessName: 'Fictional Operator Workshop',
      businessNiche: 'synthetic service',
      primaryService: 'Synthetic Service',
      vatStatus: 'between_120k_1m',
    },
    copy: structuredClone(pages[0].copy),
    researchedPages: pages,
    researchedGraphEdges: [{ fromId: 'home', toId: 'hub' }, { fromId: 'hub', toId: 'money' }],
    createdAt: '2026-09-20T00:00:00.000Z',
    ...overrides,
  };
}

function dossier(overrides = {}) {
  return {
    researchId: 'research-alpha', status: 'copy_ready',
    pageOpportunities: [
      { id: 'home', targetPath: '/', status: 'ready' },
      { id: 'hub', targetPath: '/services', status: 'ready' },
      { id: 'money', targetPath: '/services/synthetic-service', status: 'ready' },
    ],
    pipelineChecks: { copy: 'pass', hebrewQa: 'pending' },
    ...overrides,
  };
}

async function ownedRoot(prefix = 'wao-sitebot-operator-test-') {
  const value = await mkdtemp(join(tmpdir(), prefix));
  roots.push(value);
  return value;
}

async function fixtureFiles(root, value = record(), hero = pngBytes, research = dossier()) {
  const recordPath = join(root, 'record.json');
  const heroPath = join(root, 'hero.bin');
  const dossierPath = join(root, 'dossier.json');
  const recordBytes = Buffer.from(JSON.stringify(value), 'utf8');
  const sha256 = createHash('sha256').update(recordBytes).digest('hex');
  await writeFile(recordPath, recordBytes);
  await writeFile(heroPath, hero);
  await writeFile(dossierPath, JSON.stringify(research), 'utf8');
  return { recordPath, heroPath, dossierPath, sha256 };
}

async function unusedPort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function assertPortClosed(port) {
  await assert.rejects(fetch(`http://127.0.0.1:${port}/`));
}

async function waitForOutput(read, pattern, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const match = read().match(pattern);
    if (match) return match;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error('Expected CLI output was not observed.');
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(value => rm(value, { recursive: true, force: true })));
});

test('loads only explicit bounded regular record, pending dossier and magic-validated image files', async () => {
  const root = await ownedRoot();
  const input = await fixtureFiles(root);
  const { recordPath, heroPath, dossierPath } = input;
  const beforeRecord = await readFile(recordPath);
  const beforeHero = await readFile(heroPath);
  const beforeDossier = await readFile(dossierPath);
  const loaded = await loadOperatorPreviewInput(input);
  assert.deepEqual(loaded.record, record());
  assert.match(loaded.heroDataUrl, /^data:image\/png;base64,/);
  assert.deepEqual(await readFile(recordPath), beforeRecord);
  assert.deepEqual(await readFile(heroPath), beforeHero);
  assert.deepEqual(await readFile(dossierPath), beforeDossier);

  for (const [name, bytes, mime] of [
    ['jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg'],
    ['webp', Buffer.concat([Buffer.from('RIFF', 'ascii'), Buffer.alloc(4), Buffer.from('WEBP', 'ascii')]), 'image/webp'],
  ]) {
    const imagePath = join(root, `${name}.bin`);
    await writeFile(imagePath, bytes);
    assert.match((await loadOperatorPreviewInput({ ...input, heroPath: imagePath })).heroDataUrl, new RegExp(`^data:${mime};base64,`));
  }

  const directory = await ownedRoot();
  const symlinkPath = join(root, 'record-link.json');
  await symlink(recordPath, symlinkPath);
  await assert.rejects(loadOperatorPreviewInput({ ...input, recordPath: symlinkPath }), /regular file/i);
  await assert.rejects(loadOperatorPreviewInput({ ...input, recordPath: directory }), /regular file/i);

  const unsupported = join(root, 'unsupported.bin');
  await writeFile(unsupported, Buffer.from('GIF89a', 'ascii'));
  await assert.rejects(loadOperatorPreviewInput({ ...input, heroPath: unsupported }), /PNG, JPEG, or WebP/i);

  const oversizedHero = join(root, 'oversized-hero.bin');
  await writeFile(oversizedHero, Buffer.alloc(5 * 1024 * 1024 + 1));
  await assert.rejects(loadOperatorPreviewInput({ ...input, heroPath: oversizedHero }), /too large/i);

  const oversizedRecord = join(root, 'oversized-record.json');
  await writeFile(oversizedRecord, Buffer.alloc(2 * 1024 * 1024 + 1, 0x20));
  await assert.rejects(loadOperatorPreviewInput({ ...input, recordPath: oversizedRecord }), /too large/i);

  const dossierLink = join(root, 'dossier-link.json');
  await symlink(dossierPath, dossierLink);
  await assert.rejects(loadOperatorPreviewInput({ ...input, dossierPath: dossierLink }), /regular file/i);
  await assert.rejects(loadOperatorPreviewInput({ ...input, dossierPath: directory }), /regular file/i);
  await assert.rejects(loadOperatorPreviewInput({ ...input, dossierPath: join(root, 'absent.json') }), /regular file/i);
  const oversizedDossier = join(root, 'oversized-dossier.json');
  await writeFile(oversizedDossier, Buffer.alloc(2 * 1024 * 1024 + 1, 0x20));
  await assert.rejects(loadOperatorPreviewInput({ ...input, dossierPath: oversizedDossier }), /too large/i);
  await assert.rejects(loadOperatorPreviewInput({ ...input, dossierPath: undefined }));
});

test('rejects malformed and incomplete records before creating preview output', async () => {
  const root = await ownedRoot();
  const tempParent = await ownedRoot();
  const input = await fixtureFiles(root);
  const cases = [
    '{',
    JSON.stringify({ ...record(), researchId: '' }),
    JSON.stringify({ ...record(), researchedPages: [] }),
    JSON.stringify({ ...record(), researchedGraphEdges: [{ fromId: 'home', toId: 'hub' }] }),
    JSON.stringify({ ...record(), slug: '../escape' }),
  ];
  for (const [index, body] of cases.entries()) {
    const recordPath = join(root, `invalid-${index}.json`);
    await writeFile(recordPath, body, 'utf8');
    const before = await readdir(tempParent);
    await assert.rejects(createOperatorPreviewRuntime({ ...input, recordPath, sha256: createHash('sha256').update(body).digest('hex'), tempParent, buildOnly: true, log: () => {} }));
    assert.deepEqual(await readdir(tempParent), before);
  }
});

test('rejects changed bytes, wrong digest and ineligible or stale dossiers before output or listener', async () => {
  const root = await ownedRoot();
  const tempParent = await ownedRoot();
  const input = await fixtureFiles(root);
  const port = await unusedPort();
  const fail = async options => {
    await assert.rejects(createOperatorPreviewRuntime({ ...input, ...options, port, tempParent, log: () => {} }));
    assert.deepEqual(await readdir(tempParent), []);
    await assertPortClosed(port);
  };
  await fail({ sha256: '0'.repeat(64) });
  await fail({ sha256: input.sha256.toUpperCase() });
  await fail({ dossierPath: undefined });
  await writeFile(input.recordPath, `${JSON.stringify(record())} `);
  await fail({});
  await writeFile(input.recordPath, JSON.stringify(record()));
  for (const changed of [
    { researchId: 'research-other' },
    { status: 'held' },
    { status: 'deploy_ready' },
    { pipelineChecks: { copy: 'pass', hebrewQa: 'pass' } },
    { pipelineChecks: { copy: 'pending', hebrewQa: 'pending' } },
    { pageOpportunities: dossier().pageOpportunities.slice(0, 2) },
    { pageOpportunities: dossier().pageOpportunities.map(item => item.id === 'money' ? { ...item, status: 'held' } : item) },
    { pageOpportunities: dossier().pageOpportunities.map(item => item.id === 'money' ? { ...item, targetPath: '/stale' } : item) },
  ]) {
    await writeFile(input.dossierPath, JSON.stringify(dossier(changed)));
    await fail({});
  }
  await writeFile(input.dossierPath, '{');
  await fail({});
});

test('matching review digest retains buildOnly output and explicit cleanup', async () => {
  const root = await ownedRoot();
  const tempParent = await ownedRoot();
  const input = await fixtureFiles(root);
  const runtime = await createOperatorPreviewRuntime({ ...input, tempParent, buildOnly: true, log: () => {} });
  try {
    assert.equal(runtime.url, null);
    assert.equal(runtime.bundle.manifest.deployable, false);
    assert.equal(runtime.bundle.manifest.kind, 'operator-researched');
    assert.equal((await readdir(tempParent)).length, 1);
  } finally {
    await runtime.close();
  }
  assert.deepEqual(await readdir(tempParent), []);
});

test('serves the exact inert graph with a visible embedded hero at desktop and mobile sizes', async () => {
  const root = await ownedRoot();
  const tempParent = await ownedRoot();
  const input = await fixtureFiles(root);
  const port = await unusedPort();
  const lines = [];
  const runtime = await createOperatorPreviewRuntime({ ...input, port, tempParent, log: line => lines.push(line) });
  let browser;
  try {
    assert.deepEqual(lines.map(line => line.split('=')[0]), ['PREVIEW_DIR', 'PREVIEW_URL']);
    assert.equal(runtime.url, `http://127.0.0.1:${port}/`);
    const required = [
      '/', '/services--hub.html', '/services/synthetic-service--money.html', '/contact.html',
      '/privacy.html', '/accessibility.html', '/sitemap.xml', '/preview-manifest.json',
    ];
    for (const route of required) assert.equal((await fetch(`${runtime.url.slice(0, -1)}${route}`)).status, 200, route);
    assert.equal((await fetch(`${runtime.url}missing.html`)).status, 404);

    browser = await puppeteer.launch({ headless: true, executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage();
      const nonLoopback = [];
      const embeddedHeroRequests = [];
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      page.on('request', request => {
        const url = new URL(request.url());
        if (url.protocol === 'data:') {
          embeddedHeroRequests.push(request.url());
          void request.continue();
        } else if (url.hostname !== '127.0.0.1') {
          nonLoopback.push(request.url());
          void request.abort();
        } else void request.continue();
      });
      await page.setRequestInterception(true);
      await page.setViewport(viewport);
      await page.goto(runtime.url, { waitUntil: 'networkidle0' });
      const observed = await page.evaluate(() => {
        const hero = document.querySelector('[data-local-preview-hero="true"]');
        return {
          marker: document.body.innerText.includes('LOCAL OPERATOR PREVIEW - NOT PRODUCTION - NO SUBMISSION'),
          hero: hero ? { complete: hero.complete, naturalWidth: hero.naturalWidth, naturalHeight: hero.naturalHeight, alt: hero.getAttribute('alt') } : null,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          activeForms: document.querySelectorAll('form:not([data-local-preview-inert="true"])').length,
          activeOutbound: document.querySelectorAll('a[href^="http"],a[href^="tel:"],a[href^="mailto:"],a[href^="//"]').length,
          text: document.body.innerText,
        };
      });
      assert.equal(observed.marker, true);
      assert.deepEqual(observed.hero, { complete: true, naturalWidth: 1, naturalHeight: 1, alt: '' });
      assert.equal(observed.overflow, false);
      assert.equal(observed.activeForms, 0);
      assert.equal(observed.activeOutbound, 0);
      assert.doesNotMatch(observed.text, /hero\.bin|record\.json|data:image/i);
      assert.deepEqual(nonLoopback, []);
      assert.deepEqual(embeddedHeroRequests, [`data:image/png;base64,${pngBytes.toString('base64')}`]);
      assert.deepEqual(pageErrors, []);
      await page.close();
    }
  } finally {
    await browser?.close();
    await runtime.close();
    await runtime.close();
  }
  await assert.rejects(access(runtime.previewDir));
  await assertPortClosed(port);
});

test('generic runtime rejects malformed bundles and cleans owned roots after programmatic close', async () => {
  const tempParent = await ownedRoot();
  const before = await readdir(tempParent);
  await assert.rejects(createLocalPreviewRuntime({ bundle: { root: 'preview', files: {}, manifest: {} }, tempParent, buildOnly: true, log: () => {} }));
  assert.deepEqual(await readdir(tempParent), before);
});

test('CLI rejects unknown, duplicate, missing, and invalid port arguments before writes', async () => {
  const tempParent = await ownedRoot();
  const root = await ownedRoot();
  const { recordPath, heroPath, dossierPath, sha256 } = await fixtureFiles(root);
  const dossierLink = join(root, 'dossier-link.json');
  await symlink(dossierPath, dossierLink);
  const oversizedDossier = join(root, 'oversized-dossier.json');
  await writeFile(oversizedDossier, Buffer.alloc(2 * 1024 * 1024 + 1));
  const valid = ['--record', recordPath, '--hero', heroPath, '--dossier', dossierPath, '--sha256', sha256];
  const cases = [
    [],
    ['--record', recordPath],
    ['--hero', heroPath],
    ['--record', recordPath, '--hero', heroPath, '--sha256', sha256],
    ['--record', recordPath, '--hero', heroPath, '--dossier', dossierPath],
    ['--unknown'],
    ['--record', recordPath, '--record', recordPath, '--hero', heroPath],
    ['--record', recordPath, '--hero', heroPath, '--port', '80'],
    [...valid, '--unknown', 'x'],
    [...valid, '--dossier', dossierPath],
    [...valid, '--sha256', sha256],
    [...valid.slice(0, -1), 'a'.repeat(63)],
    [...valid.slice(0, -1), sha256.toUpperCase()],
    [...valid.slice(0, -1), ` ${sha256}`],
    [...valid.slice(0, -1), '0'.repeat(64)],
    ['--record', recordPath, '--hero', heroPath, '--dossier', dossierLink, '--sha256', sha256],
    ['--record', recordPath, '--hero', heroPath, '--dossier', oversizedDossier, '--sha256', sha256],
    ['--record', recordPath, '--hero', heroPath, '--dossier', join(root, 'missing.json'), '--sha256', sha256],
  ];
  for (const args of cases) {
    const child = spawn(process.execPath, ['scripts/site-bot-operator-preview.mjs', ...args], {
      cwd: process.cwd(), env: { ...process.env, TMPDIR: tempParent }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    const code = await new Promise(resolve => child.once('exit', resolve));
    assert.notEqual(code, 0);
    assert.deepEqual(await readdir(tempParent), []);
  }
  await writeFile(dossierPath, JSON.stringify(dossier({ status: 'held' })));
  const child = spawn(process.execPath, ['scripts/site-bot-operator-preview.mjs', ...valid], {
    cwd: process.cwd(), env: { ...process.env, TMPDIR: tempParent }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.notEqual(await new Promise(resolve => child.once('exit', resolve)), 0);
  assert.deepEqual(await readdir(tempParent), []);
});

test('real CLI logs no source path, closes its port, and removes owned output on SIGTERM', async () => {
  const root = await ownedRoot();
  const tempParent = await ownedRoot();
  const { recordPath, heroPath, dossierPath, sha256 } = await fixtureFiles(root);
  const port = await unusedPort();
  const child = spawn(process.execPath, [
    'scripts/site-bot-operator-preview.mjs', '--record', recordPath, '--hero', heroPath,
    '--dossier', dossierPath, '--sha256', sha256, '--port', String(port),
  ], {
    cwd: process.cwd(), env: { ...process.env, TMPDIR: tempParent }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  let previewDir;
  try {
    const urlMatch = await waitForOutput(() => stdout, new RegExp(`PREVIEW_URL=(http://127\\.0\\.0\\.1:${port}/)`));
    previewDir = (await waitForOutput(() => stdout, /PREVIEW_DIR=(.+)\n/))[1];
    assert.equal((await fetch(urlMatch[1])).status, 200);
    assert.equal(stderr, '');
    assert.equal(stdout.includes(recordPath), false);
    assert.equal(stdout.includes(heroPath), false);
    assert.equal(stdout.includes(dossierPath), false);
    assert.equal(stdout.includes(sha256), false);
  } finally {
    child.kill('SIGTERM');
    assert.equal(await new Promise(resolve => child.once('exit', resolve)), 0);
  }
  await assertPortClosed(port);
  await assert.rejects(access(previewDir));
  assert.deepEqual(await readFile(recordPath), Buffer.from(JSON.stringify(record()), 'utf8'));
  assert.deepEqual(await readFile(heroPath), pngBytes);
  assert.deepEqual(await readFile(dossierPath), Buffer.from(JSON.stringify(dossier()), 'utf8'));
});
