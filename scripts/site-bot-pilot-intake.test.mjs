import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { mkdtemp, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer';
import {
  createNotebookServer,
  isAllowedHost,
  loadApprovedCopy,
  parseArgs,
  readDraft,
  validateDraftPayload,
  writeDraft,
} from './site-bot-pilot-intake.mjs';

const copyPath = new URL('../docs/copy/site-bot-pilot-intake-notebook.json', import.meta.url);
const qaPath = new URL('../docs/copy/site-bot-pilot-intake-notebook.qa.json', import.meta.url);
const roots = [];

async function root() {
  const value = await mkdtemp(join(tmpdir(), 'wao-pilot-intake-test-'));
  roots.push(value);
  return value;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(value => rm(value, { recursive: true, force: true })));
});

test('binds approved copy bytes to the approved ASCII sidecar', async () => {
  const copy = await loadApprovedCopy({ copyPath, qaPath });
  assert.equal(copy.sections.length, 6);
  await assert.rejects(() => loadApprovedCopy({ copyPath, qaPath, expectedHash: '0'.repeat(64) }));
});

test('accepts only explicit safe IPv4 bindings and strict arguments', () => {
  for (const host of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '100.64.0.1', '100.127.255.254']) assert.equal(isAllowedHost(host), true);
  for (const host of ['0.0.0.0', '8.8.8.8', 'localhost', '::1', '100.128.0.1', '172.15.0.1', '192.169.0.1']) assert.equal(isAllowedHost(host), false);
  assert.deepEqual(parseArgs([]), { host: '127.0.0.1', port: 3197 });
  assert.deepEqual(parseArgs(['--host', '127.0.0.1', '--port', '3197']), { host: '127.0.0.1', port: 3197 });
  for (const args of [['--host', '0.0.0.0'], ['--port', '80'], ['--host', 'localhost'], ['--wat'], ['--port', '3197', '--port', '3198']]) assert.throws(() => parseArgs(args));
});

test('rejects extra keys, body limits, controls, and invalid approval states', async () => {
  const copy = await loadApprovedCopy({ copyPath, qaPath });
  const payload = { sections: Object.fromEntries(copy.sections.map(section => [section.id, { answer: '', approved: false }])), finalApproval: { approved: false, note: '' } };
  assert.throws(() => validateDraftPayload({ ...payload, extra: true }, copy, null, Date.now()));
  payload.sections.businessFacts = { answer: 'x'.repeat(4001), approved: false };
  assert.throws(() => validateDraftPayload(payload, copy, null, Date.now()));
  payload.sections.businessFacts = { answer: 'x\u0000', approved: false };
  assert.throws(() => validateDraftPayload(payload, copy, null, Date.now()));
  payload.sections.businessFacts = { answer: 'ok', approved: true };
  assert.equal(validateDraftPayload(payload, copy, null, Date.now()).sections.businessFacts.approved, true);
});

test('revokes changed approvals and final approval until all sections remain approved', async () => {
  const copy = await loadApprovedCopy({ copyPath, qaPath });
  const sections = Object.fromEntries(copy.sections.map(section => [section.id, { answer: `answer-${section.id}`, approved: true }]));
  const accepted = validateDraftPayload({ sections, finalApproval: { approved: true, note: 'note' } }, copy, null, 1000);
  assert.equal(accepted.finalApproval.approved, true);
  const changed = structuredClone(accepted);
  changed.sections.businessFacts.answer = 'changed';
  const revoked = validateDraftPayload({ sections: Object.fromEntries(Object.entries(changed.sections).map(([id, value]) => [id, { answer: value.answer, approved: value.approved }])), finalApproval: { approved: true, note: 'note' } }, copy, accepted, 2000);
  assert.equal(revoked.sections.businessFacts.approved, false);
  assert.equal(revoked.finalApproval.approved, false);
});

test('renders all approved notices and recomputes the client-derived final state on answer input', async () => {
  const source = await readFile(new URL('./site-bot-pilot-intake.mjs', import.meta.url), 'utf8');
  for (const key of ['privacyNotice', 'localOnlyNotice']) assert.match(source, new RegExp(`textContent=copy\\.ui\\.${key}`));
  for (const key of ['helper', 'attestation']) assert.match(source, new RegExp(`textContent=copy\\.finalApproval\\.${key}`));
  assert.match(source, /const noteId='final-note';/);
  assert.match(source, /noteLabel\.htmlFor=noteId;/);
  assert.match(source, /const derive=\(\)=>\{.*finalApproved:allApproved&&draft\.finalApproval\.approved/);
  assert.match(source, /area\.oninput=\(\)=>\{.*draft\.finalApproval\.approved=false;.*progress\.dataset\.approvedCount=.*finalBox\.disabled=!next\.allApproved}/);
});

test('keeps a typed approved answer focused while immediately revoking approvals', async () => {
  const copy = await loadApprovedCopy({ copyPath, qaPath });
  const storageRoot = await root();
  const notebook = await createNotebookServer({ copy, storageRoot, token: 't'.repeat(64) });
  await new Promise((resolve, reject) => notebook.server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const address = notebook.server.address();
  const base = `http://127.0.0.1:${address.port}`;
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(`${base}/?token=${notebook.token}`);
    await page.waitForSelector('#answer-businessFacts');
    for (const [index, section] of copy.sections.entries()) {
      await page.locator(`#answer-${section.id}`).fill(`seed-${index}`);
      await page.locator(`#approve-${section.id}`).click();
    }
    await page.locator('#final-approval').click();
    await page.waitForFunction(() => document.querySelector('#final-approval').checked);

    const first = 'part-one-';
    const second = 'part-two';
    const expected = `seed-0${first}${second}`;
    await page.click('#answer-businessFacts');
    await page.keyboard.type(first);
    const firstState = await page.evaluate(({ expectedValue }) => {
      const area = document.querySelector('#answer-businessFacts');
      const finalBox = document.querySelector('#final-approval');
      return area.value === expectedValue && document.activeElement === area && area.selectionStart === expectedValue.length && area.selectionEnd === expectedValue.length && document.querySelector('#approve-businessFacts').checked === false && document.querySelector('[data-state]').dataset.state === 'draft' && document.querySelector('#approval-progress').dataset.approvedCount === '5' && finalBox.checked === false && finalBox.disabled === true;
    }, { expectedValue: `seed-0${first}` });
    assert.equal(firstState, true);

    await page.keyboard.type(second);
    const secondState = await page.evaluate(({ expectedValue }) => {
      const area = document.querySelector('#answer-businessFacts');
      const finalBox = document.querySelector('#final-approval');
      return area.value === expectedValue && document.activeElement === area && area.selectionStart === expectedValue.length && area.selectionEnd === expectedValue.length && document.querySelector('#approve-businessFacts').checked === false && document.querySelector('[data-state]').dataset.state === 'draft' && document.querySelector('#approval-progress').dataset.approvedCount === '5' && finalBox.checked === false && finalBox.disabled === true;
    }, { expectedValue: expected });
    assert.equal(secondState, true);

    await page.locator('#save-draft').click();
    await page.waitForFunction(() => document.querySelector('#approval-progress').dataset.approvedCount === '5');
    const persisted = await (await fetch(`${base}/api/draft?token=${notebook.token}`)).json();
    assert.equal(persisted.sections.businessFacts.answer === expected, true);
    assert.equal(persisted.sections.businessFacts.approved, false);
    assert.equal(persisted.sections.businessFacts.approvedAt, null);
    assert.equal(persisted.finalApproval.approved, false);
    assert.equal(persisted.finalApproval.approvedAt, null);

    assert.equal(new URL(page.url()).searchParams.get('token'), notebook.token);
    const reload = await page.reload({ waitUntil: 'networkidle0' });
    assert.equal(reload.status(), 200);
    await page.waitForSelector('#answer-businessFacts');
    assert.equal(await page.locator('#answer-businessFacts').map(area => area.value).wait(), expected);
    assert.equal((await fetch(`${base}/`)).status, 403);

    await page.locator('#clear-draft').click();
    await page.waitForFunction(() => document.querySelector('#approval-progress').dataset.approvedCount === '0');
  } finally {
    await browser?.close();
    await new Promise(resolve => notebook.server.close(resolve));
  }
});

test('uses an atomic private temporary root and expires stale drafts', async () => {
  const copy = await loadApprovedCopy({ copyPath, qaPath });
  const storageRoot = await root();
  const draft = validateDraftPayload({ sections: Object.fromEntries(copy.sections.map(section => [section.id, { answer: '', approved: false }])), finalApproval: { approved: false, note: '' } }, copy, null, 1000);
  await writeDraft(storageRoot, draft);
  const file = join(storageRoot, 'draft.json');
  assert.equal((await stat(file)).mode & 0o777, 0o600);
  assert.deepEqual(await readDraft(storageRoot, 1001), draft);
  await utimes(file, new Date(0), new Date(0));
  assert.equal(await readDraft(storageRoot, 8 * 24 * 60 * 60 * 1000), null);
});

test('enforces token, routes, origins, and protective headers without leaking answers', async () => {
  const copy = await loadApprovedCopy({ copyPath, qaPath });
  const storageRoot = await root();
  const notebook = await createNotebookServer({ copy, storageRoot, now: () => 1000, token: 't'.repeat(64) });
  await new Promise((resolve, reject) => notebook.server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const address = notebook.server.address();
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const denied = await fetch(`${base}/`);
    assert.equal(denied.status, 403);
    const shell = await fetch(`${base}/?token=${notebook.token}`);
    assert.equal(shell.status, 200);
    assert.match(shell.headers.get('content-security-policy'), /nonce-/);
    assert.equal(shell.headers.get('cache-control'), 'no-store');
    assert.equal(shell.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
    assert.equal(shell.headers.get('referrer-policy'), 'no-referrer');
    assert.equal((await fetch(`${base}/missing?token=${notebook.token}`)).status, 404);
    assert.equal((await fetch(`${base}/api/draft?token=${notebook.token}`, { method: 'POST' })).status, 405);
    const body = JSON.stringify({ sections: Object.fromEntries(copy.sections.map(section => [section.id, { answer: 'synthetic-answer', approved: false }])), finalApproval: { approved: false, note: '' } });
    const wrongOrigin = await fetch(`${base}/api/draft?token=${notebook.token}`, { method: 'PUT', headers: { origin: 'http://wrong.invalid', 'content-type': 'application/json' }, body });
    assert.equal(wrongOrigin.status, 403);
    const saved = await fetch(`${base}/api/draft?token=${notebook.token}`, { method: 'PUT', headers: { origin: base, 'content-type': 'application/json' }, body });
    assert.equal(saved.status, 200);
    const oversized = await fetch(`${base}/api/draft?token=${notebook.token}`, { method: 'PUT', headers: { origin: base, 'content-type': 'application/json' }, body: 'x'.repeat(65537) });
    assert.equal(oversized.status, 413);
  } finally {
    await new Promise(resolve => notebook.server.close(resolve));
  }
});

test('fails closed on malformed stored draft', async () => {
  const storageRoot = await root();
  await writeFile(join(storageRoot, 'draft.json'), '{bad', { mode: 0o600 });
  await assert.rejects(() => readDraft(storageRoot, Date.now()));
  assert.equal((await readFile(join(storageRoot, 'draft.json'), 'utf8')).includes('bad'), true);
});

test('starts the real CLI with an isolated temporary root and protects its shell', async () => {
  const isolatedTmp = await root();
  const child = spawn(process.execPath, ['scripts/site-bot-pilot-intake.mjs', '--port', '3197'], { cwd: process.cwd(), env: { ...process.env, TMPDIR: isolatedTmp }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', () => {});
  try {
    const url = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CLI did not start.')), 5000);
      const poll = () => {
        const match = output.match(/NOTEBOOK_URL=(http:\/\/127\.0\.0\.1:3197\/\?token=[a-f0-9]{64})/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
        else setTimeout(poll, 10);
      };
      poll();
    });
    assert.equal((await fetch('http://127.0.0.1:3197/')).status, 403);
    assert.equal((await fetch(url)).status, 200);
    assert.equal((await fetch(`${url.replace('/?token=', '/health?token=')}`)).status, 200);
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve => child.once('exit', resolve));
  }
});
