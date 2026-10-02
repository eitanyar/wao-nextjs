import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { access, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';
import puppeteer from 'puppeteer';
import { readDraft } from './site-bot-pilot-intake.mjs';
import {
  createPilotRehearsal,
  loadPilotRehearsalFixture,
} from './site-bot-pilot-rehearsal.mjs';

const fixturePath = new URL('../fixtures/site-bot/pilot-rehearsal.json', import.meta.url);
const roots = [];

async function ownedRoot(prefix = 'wao-sitebot-rehearsal-test-') {
  const value = await mkdtemp(join(tmpdir(), prefix));
  roots.push(value);
  return value;
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

async function waitForOutput(read, pattern, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const match = read().match(pattern);
    if (match) return match;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error('Expected CLI output was not observed.');
}

async function waitUntil(check, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error('Expected condition was not observed.');
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(value => rm(value, { recursive: true, force: true })));
});

test('loads one strict, unapproved, matching synthetic rehearsal scenario', async () => {
  const fixture = await loadPilotRehearsalFixture(fixturePath);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.scenarioId, 'fictional-rooftop-maintenance-v1');
  assert.deepEqual(Object.keys(fixture.intakeDraft.sections), [
    'businessFacts',
    'mediaRights',
    'leadRecipient',
    'privacyRetention',
    'seoDomain',
    'ownershipLane',
  ]);
  assert.equal(Object.values(fixture.intakeDraft.sections).every(section => section.approved === false), true);
  assert.equal(fixture.intakeDraft.finalApproval.approved, false);
  assert.equal(fixture.previewInput.synthetic, true);
  assert.equal(fixture.previewInput.showHeroAsset, true);
  assert.equal(fixture.previewInput.canonicalOrigin, 'https://fictional-rooftop-workshop.invalid');
  assert.equal(fixture.previewInput.collectedData.businessName, 'Fictional Rooftop Workshop');
  assert.match(fixture.intakeDraft.sections.ownershipLane.answer, /synthetic, local-only, non-deployable/i);
  assert.match(fixture.intakeDraft.finalApproval.note, /not real-world approval/i);
  assert.match(fixture.stopGate, /NOT REAL-WORLD APPROVAL/);

  const invalidRoot = await ownedRoot();
  const original = JSON.parse(await readFile(fixturePath, 'utf8'));
  const cases = [
    { ...original, synthetic: false },
    { ...original, extra: true },
    { ...original, scenarioId: '../escape' },
    { ...original, intakeDraft: { ...original.intakeDraft, finalApproval: { ...original.intakeDraft.finalApproval, approved: true } } },
    { ...original, previewInput: { ...original.previewInput, canonicalOrigin: 'https://example.com' } },
    { ...original, previewInput: { ...original.previewInput, heroAssetPath: '../remote.svg' } },
    { ...original, previewInput: { ...original.previewInput, collectedData: { ...original.previewInput.collectedData, businessName: 'Fictional Rooftop Workshop', phone: '555' } } },
  ];
  for (const [index, value] of cases.entries()) {
    const path = join(invalidRoot, `invalid-${index}.json`);
    await writeFile(path, JSON.stringify(value), 'utf8');
    await assert.rejects(loadPilotRehearsalFixture(path), /invalid/i);
  }
});

test('withholds preview until six browser approvals and final approval, then serves only the safe loopback bundle', async () => {
  const intakePort = await unusedPort();
  const previewPort = await unusedPort();
  const tempParent = await ownedRoot();
  const lines = [];
  const rehearsal = await createPilotRehearsal({
    fixturePath,
    intakePort,
    previewPort,
    tempParent,
    pollIntervalMs: 10,
    log: line => lines.push(line),
  });
  let browser;
  const nonLoopback = [];
  const pageErrors = [];
  try {
    assert.equal(rehearsal.previewUrl, null);
    await assertPortClosed(previewPort);
    assert.equal((await fetch(`http://127.0.0.1:${intakePort}/`)).status, 403);
    assert.equal((await fetch(rehearsal.notebookUrl)).status, 200);
    assert.equal(lines.filter(line => line.startsWith('NOTEBOOK_URL=')).length, 1);
    assert.equal(lines.some(line => line.startsWith('PREVIEW_URL=')), false);

    browser = await puppeteer.launch({ headless: true, executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.hostname !== '127.0.0.1') {
        nonLoopback.push(request.url());
        void request.abort();
      } else {
        void request.continue();
      }
    });
    await page.setRequestInterception(true);
    await page.goto(rehearsal.notebookUrl, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#answer-businessFacts');
    for (const [index, id] of ['businessFacts', 'mediaRights', 'leadRecipient', 'privacyRetention', 'seoDomain', 'ownershipLane'].entries()) {
      assert.notEqual(await page.locator(`#answer-${id}`).map(area => area.value).wait(), '');
      await page.locator(`#approve-${id}`).click();
      await page.waitForFunction(expected => document.querySelector('#approval-progress').dataset.approvedCount === String(expected), {}, index + 1);
    }
    assert.equal(rehearsal.previewUrl, null);
    await assertPortClosed(previewPort);
    await page.waitForFunction(() => document.querySelector('#final-approval').disabled === false);
    await page.locator('#final-approval').click();
    await page.waitForFunction(() => document.querySelector('#final-approval').checked === true);
    await page.locator('#save-draft').click();
    const notebookToken = new URL(rehearsal.notebookUrl).searchParams.get('token');
    const draftUrl = `http://127.0.0.1:${intakePort}/api/draft?token=${notebookToken}`;
    await waitUntil(async () => (await (await fetch(draftUrl)).json()).finalApproval.approved === true);
    assert.equal((await readDraft(rehearsal.storageRoot)).finalApproval.approved, true);
    const preview = await rehearsal.waitForPreview({ timeoutMs: 5000 });

    assert.equal(preview.url, `http://127.0.0.1:${previewPort}/`);
    assert.equal(rehearsal.previewUrl, preview.url);
    assert.equal(lines.filter(line => line.startsWith('PREVIEW_URL=')).length, 1);
    assert.equal(lines.at(-1), 'REHEARSAL COMPLETE - NOT REAL-WORLD APPROVAL - ALL EXTERNAL AND PUBLICATION GATES REMAIN CLOSED');
    const required = [
      '/',
      '/services--services.html',
      '/services/rooftop-maintenance--rooftop-maintenance.html',
      '/contact.html',
      '/privacy.html',
      '/accessibility.html',
      '/sitemap.xml',
      '/assets/hero.svg',
      '/preview-manifest.json',
    ];
    for (const path of required) assert.equal((await fetch(`${preview.url.slice(0, -1)}${path}`)).status, 200, path);
    assert.equal((await fetch(`${preview.url}favicon.ico`)).status, 204);
    const home = await (await fetch(preview.url)).text();
    assert.match(home, /LOCAL PREVIEW - SYNTHETIC DATA - NO SUBMISSION/);
    assert.match(home, /Fictional Rooftop Workshop/);
    assert.match(home, /not approved for real-world use/i);
    assert.match(home, /<img[^>]+data-local-preview-hero="true"[^>]+src="\/assets\/hero\.svg"/i);
    assert.doesNotMatch(home, /<form\b(?![^>]*data-local-preview-inert)/i);
    const manifest = await (await fetch(`${preview.url}preview-manifest.json`)).json();
    assert.deepEqual({ synthetic: manifest.synthetic, deployable: manifest.deployable, canonicalOrigin: manifest.canonicalOrigin }, {
      synthetic: true,
      deployable: false,
      canonicalOrigin: 'https://fictional-rooftop-workshop.invalid',
    });
    assert.deepEqual(nonLoopback, []);
    assert.deepEqual(pageErrors, []);
  } finally {
    await browser?.close();
    await rehearsal.close();
  }
  await assert.rejects(access(rehearsal.storageRoot));
  if (rehearsal.previewDir) await assert.rejects(access(rehearsal.previewDir));
  await assertPortClosed(intakePort);
  await assertPortClosed(previewPort);
});

test('closes before preview creation and cleans up startup failures', async () => {
  const intakePort = await unusedPort();
  const previewPort = await unusedPort();
  const tempParent = await ownedRoot();
  const rehearsal = await createPilotRehearsal({ fixturePath, intakePort, previewPort, tempParent, log: () => {} });
  await rehearsal.close();
  await rehearsal.close();
  await assert.rejects(access(rehearsal.storageRoot));
  await assertPortClosed(intakePort);
  await assertPortClosed(previewPort);

  const blocker = createServer();
  await new Promise((resolve, reject) => blocker.once('error', reject).listen(intakePort, '127.0.0.1', resolve));
  const before = new Set(await readdir(tempParent));
  try {
    await assert.rejects(createPilotRehearsal({ fixturePath, intakePort, previewPort, tempParent, log: () => {} }));
  } finally {
    await new Promise(resolve => blocker.close(resolve));
  }
  assert.deepEqual(new Set(await readdir(tempParent)), before);
});

test('CLI rejects unknown, duplicate, and invalid port arguments before creating owned directories', async () => {
  const tempParent = await ownedRoot();
  for (const args of [
    ['--unknown'],
    ['--intake-port', '3197', '--intake-port', '3199'],
    ['--preview-port', '80'],
    ['--intake-port', '3197', '--preview-port', '3197'],
  ]) {
    const child = spawn(process.execPath, ['scripts/site-bot-pilot-rehearsal.mjs', ...args], {
      cwd: process.cwd(),
      env: { ...process.env, TMPDIR: tempParent },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const code = await new Promise(resolve => child.once('exit', resolve));
    assert.notEqual(code, 0);
    assert.deepEqual(await readdir(tempParent), []);
  }
});

test('real CLI starts, reports only live URLs and stop gate, and removes owned roots on SIGTERM', async () => {
  const intakePort = await unusedPort();
  const previewPort = await unusedPort();
  const tempParent = await ownedRoot();
  const child = spawn(process.execPath, [
    'scripts/site-bot-pilot-rehearsal.mjs',
    '--intake-port', String(intakePort),
    '--preview-port', String(previewPort),
  ], {
    cwd: process.cwd(),
    env: { ...process.env, TMPDIR: tempParent },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  try {
    const match = await waitForOutput(() => stdout, new RegExp(`NOTEBOOK_URL=(http://127\\.0\\.0\\.1:${intakePort}/\\?token=[a-f0-9]{64})`));
    assert.equal((await fetch(match[1])).status, 200);
    assert.equal(stdout.includes('PREVIEW_URL='), false);
    assert.equal(stderr, '');
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve => child.once('exit', resolve));
  }
  assert.deepEqual(await readdir(tempParent), []);
  await assertPortClosed(intakePort);
  await assertPortClosed(previewPort);
});
