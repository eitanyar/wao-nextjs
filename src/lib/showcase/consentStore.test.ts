import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { SHOWCASE_CONSENT_COPY } from './consentCopy.generated';
import {
  currentShowcaseText,
  getShowcaseConsent,
  isShowcaseConsentGranted,
  recordShowcaseConsent,
  showcaseConsentRecordId,
  withdrawShowcaseConsent,
} from './consentStore';

function withDir(fn: (dir: string) => void): void {
  const saved = process.env.WAO_SHOWCASE_CONSENT_DIR;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-showcase-consent-'));
  process.env.WAO_SHOWCASE_CONSENT_DIR = dir;
  try {
    fn(dir);
  } finally {
    if (saved === undefined) delete process.env.WAO_SHOWCASE_CONSENT_DIR;
    else process.env.WAO_SHOWCASE_CONSENT_DIR = saved;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const sha = (text: string) => crypto.createHash('sha256').update(text, 'utf8').digest('hex');

test('no record = not granted (the default is off)', () => withDir(() => {
  const id = crypto.randomUUID();
  assert.equal(getShowcaseConsent(id), null);
  assert.equal(isShowcaseConsentGranted(id), false);
  assert.equal(withdrawShowcaseConsent({ accountId: id, source: 'account', reason: 'owner_toggle' }), null);
}));

test('a checkout grant writes one record with the text version and the clause digest', () => withDir((dir) => {
  const id = crypto.randomUUID();
  const now = new Date('2026-11-17T10:00:00.000Z');
  const consent = recordShowcaseConsent({ accountId: id, product: 'site-bot', source: 'checkout', now });
  assert.equal(consent.granted, true);
  assert.equal(consent.id, showcaseConsentRecordId(id));
  assert.equal(consent.source, 'checkout');
  assert.equal(consent.grantedAt, now.toISOString());
  assert.equal(consent.textVersion, 'showcase-consent-2026-11-17');
  const p = SHOWCASE_CONSENT_COPY.products['site-bot'];
  assert.equal(consent.textSha256, sha(`${p.clauseTitle}\n\n${p.clauseBody}`));
  assert.equal(consent.withdrawnAt, undefined);
  // Stored under the showcase root, one JSONL line.
  const lines = fs.readFileSync(path.join(dir, `${id}.jsonl`), 'utf8').trim().split('\n');
  assert.equal(lines.length, 1);
  assert.equal(JSON.parse(lines[0]).granted, true);
  // Idempotent: a replayed grant appends nothing.
  recordShowcaseConsent({ accountId: id, product: 'site-bot', source: 'checkout' });
  assert.equal(getShowcaseConsent(id)?.history.length, 1);
}));

test('withdraw via the toggle, then re-grant from the account: append-only history', () => withDir((dir) => {
  const id = crypto.randomUUID();
  recordShowcaseConsent({ accountId: id, product: 'site-bot', source: 'checkout', now: new Date('2026-11-17T10:00:00Z') });
  const off = withdrawShowcaseConsent({ accountId: id, source: 'account', reason: 'owner_toggle', now: new Date('2026-11-18T10:00:00Z') });
  assert.equal(off?.granted, false);
  assert.equal(off?.withdrawnAt, '2026-11-18T10:00:00.000Z');
  assert.equal(off?.withdrawReason, 'owner_toggle');
  assert.equal(off?.grantedAt, '2026-11-17T10:00:00.000Z');
  // A second withdraw is a no-op.
  withdrawShowcaseConsent({ accountId: id, source: 'account', reason: 'owner_toggle' });
  const on = recordShowcaseConsent({ accountId: id, product: 'site-bot', source: 'account', now: new Date('2026-11-19T10:00:00Z') });
  assert.equal(on.granted, true);
  assert.equal(on.source, 'account');
  assert.equal(on.withdrawnAt, undefined);
  assert.deepEqual(on.history.map((e) => [e.granted, e.source]), [[true, 'checkout'], [false, 'account'], [true, 'account']]);
  assert.equal(fs.readFileSync(path.join(dir, `${id}.jsonl`), 'utf8').trim().split('\n').length, 3);
}));

test('a cancellation withdraws with reason "cancelled" at receipt time', () => withDir(() => {
  const id = crypto.randomUUID();
  recordShowcaseConsent({ accountId: id, product: 'ads-bot', source: 'checkout' });
  const at = new Date('2026-12-01T08:30:00Z');
  const consent = withdrawShowcaseConsent({ accountId: id, source: 'cancellation', reason: 'cancelled', now: at });
  assert.equal(consent?.granted, false);
  assert.equal(consent?.withdrawReason, 'cancelled');
  assert.equal(consent?.withdrawnAt, at.toISOString());
  assert.equal(consent?.product, 'ads-bot');
  assert.equal(consent?.textSha256, currentShowcaseText('ads-bot').textSha256);
}));

test('the text digest is stable and per product', () => {
  assert.equal(currentShowcaseText('site-bot').textSha256, currentShowcaseText('site-bot').textSha256);
  assert.notEqual(currentShowcaseText('site-bot').textSha256, currentShowcaseText('ads-bot').textSha256);
});

test('account ids that could escape the root are refused', () => withDir(() => {
  for (const bad of ['../x', 'a/b', '', 'x'.repeat(200)]) {
    assert.throws(() => getShowcaseConsent(bad), /invalid_account/);
    assert.throws(() => recordShowcaseConsent({ accountId: bad, product: 'site-bot', source: 'account' }), /invalid_account/);
  }
}));
