// Site-Bot review-request kit (readiness step 5, capability 6). Hermetic: temp billing DB, recording transport.
// HEBREW-SAFETY: zero Hebrew bytes. Test copy is English; Hebrew letters needed by the maqaf rule are \u escapes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-review-kit-'));
process.env.BILLING_DB_PATH = path.join(tmpDir, 'billing.db');
process.env.SITE_BOT_EMAIL_OUTBOX_PATH = path.join(tmpDir, 'outbox.jsonl');
process.env.NEXT_PUBLIC_BASE_URL = 'https://wao.co.il';
delete process.env.RESEND_API_KEY;
delete process.env.SITE_BOT_SUPPORT_ALERT_EMAIL;
delete process.env.BILLING_ADMIN_ALERT_EMAIL;
delete process.env.SITE_BOT_SUPPORT_FROM_EMAIL;

import { closeDb, getDb, insertSubscription, type SubscriptionRow } from '../payments/db';
import { linkSiteBotSession } from './clientMessages';
import type { MailTransport, OutgoingEmail } from './clientMessageEmail';
import {
  REVIEW_KIT_COPY_KEYS,
  SITE_BOT_REVIEW_KIT_COPY,
  SITE_BOT_REVIEW_KIT_COPY_PENDING,
  reviewKitCopyReady,
} from './reviewKitCopy';
import {
  buildWhatsAppShareUrl,
  fillReviewMessage,
  onSiteBotSiteLive,
  reviewCardFor,
  sendReviewKitEmail,
  sweepReviewKits,
  withPrefixMaqaf,
} from './reviewKit';
import { buildGoogleWriteReviewUrl, isReviewablePlaceId, placeReviewUrl } from '../gbp/reviewLink';
import { buildGoogleWriteReviewUrl as reexported } from '../crm/reviewFlywheelCopy';
import { isUsablePlaceId } from '../lp/renderSitePages';
import { findSubscriptionIdBySession, getNotice, getSiteBotSite, recordSiteLive } from './siteLifecycleStore';

test.after(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const NOW = new Date('2026-11-30T08:00:00.000Z');
const PLACE = 'ChIJN1t_tDeuEmsRUsoyG83frY4';
const BET = '\u05d1';
const MAQAF = '\u05be';

const COPY: Record<string, string> = Object.fromEntries(REVIEW_KIT_COPY_KEYS.map((key) => [key, `T:${key}`]));
COPY.reviewMessage = `Hi! Thanks for choosing ${BET}{businessName}. A review helps: {reviewLink}\nThank you`;
COPY.reviewEmailIntro = 'Your site for {businessName} is live.';
const READY = { copy: COPY, pending: false };

function makeSubscription(overrides: Partial<SubscriptionRow> = {}): string {
  const id = crypto.randomUUID();
  insertSubscription(getDb(), {
    id, user_id: `owner-${id.slice(0, 6)}@example.com`, status: 'active', provider: 'mock', provider_token: null, card_last4: null,
    card_expiry: null, trial_amount: null, recurring_amount: 234.82, currency: 'ILS', next_charge_at: null, canceled_at: null,
    cancel_reason: null, failed_attempts: 0, created_at: NOW.toISOString(), updated_at: NOW.toISOString(), joined_at: NOW.toISOString(),
    extended_cancellation_flag: null, extended_flag_basis: null, plan: 'site-bot', net_amount: null, vat_mode: null,
    vat_rate: null, billing_interval: null, billing_anchor_at: null, periods_paid: null, dunning_started_at: null, paused_at: null, ...overrides,
  } as SubscriptionRow);
  return id;
}

function linked(overrides: Partial<SubscriptionRow> = {}, businessName = 'Acme Plumbing'): { subscriptionId: string; sessionId: string } {
  const subscriptionId = makeSubscription(overrides);
  const sessionId = crypto.randomUUID();
  linkSiteBotSession({ subscriptionId, sessionId, businessName, ownerMobile: null, now: NOW });
  return { subscriptionId, sessionId };
}

function sub(id: string): SubscriptionRow {
  return getDb().prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) as SubscriptionRow;
}

function recorder(mode: 'sent' | 'throw' = 'sent') {
  const sent: OutgoingEmail[] = [];
  const transport: MailTransport = async (email) => {
    if (mode === 'throw') throw new Error('down');
    sent.push(email);
    return 'sent';
  };
  return { sent, transport };
}

function live(subscriptionId: string, placeId: string | null = PLACE) {
  recordSiteLive({ subscriptionId, slug: 'acme', siteUrl: 'https://acme.wao.co.il', placeId, ownDomain: false, businessName: 'Acme Plumbing', now: NOW });
}

test('copy gate: the pending flag agrees with the values; while pending nothing renders', () => {
  const placeholders = REVIEW_KIT_COPY_KEYS.filter((key) => SITE_BOT_REVIEW_KIT_COPY[key] === `__HE_TODO_${key}__`);
  assert.equal(SITE_BOT_REVIEW_KIT_COPY_PENDING, placeholders.length > 0);
  for (const key of REVIEW_KIT_COPY_KEYS) {
    const value = SITE_BOT_REVIEW_KIT_COPY[key];
    assert.ok(value === `__HE_TODO_${key}__` || !value.includes('__HE_TODO_'), `${key}: placeholder or approved copy`);
  }
  assert.equal(reviewKitCopyReady(REVIEW_KIT_COPY_KEYS), !SITE_BOT_REVIEW_KIT_COPY_PENDING);
  assert.equal(reviewKitCopyReady(REVIEW_KIT_COPY_KEYS, COPY, true), false, 'flag alone blocks');
  assert.equal(reviewKitCopyReady(REVIEW_KIT_COPY_KEYS, { ...COPY, copyButton: '__HE_TODO_copyButton__' }, false), false, 'a placeholder blocks');
  assert.equal(reviewKitCopyReady(REVIEW_KIT_COPY_KEYS, COPY, false), true);
});

test('review link: Place ID -> writereview URL, encoded; unusable IDs give null; builder re-exported unchanged', () => {
  assert.equal(placeReviewUrl(PLACE), `https://search.google.com/local/writereview?placeid=${PLACE}`);
  assert.equal(buildGoogleWriteReviewUrl('ChIJ space&test'), 'https://search.google.com/local/writereview?placeid=ChIJ%20space%26test');
  for (const bad of [null, undefined, '', 'short', 'fixture-abcdefghijk', 'has space ChIJxxxxxxx', 42]) assert.equal(placeReviewUrl(bad), null);
  assert.equal(reexported, buildGoogleWriteReviewUrl);
  for (const candidate of [PLACE, 'fixture-1234567890', 'abc', 'ChIJ-abc_DEF123', 'bad id with spaces']) {
    assert.equal(isReviewablePlaceId(candidate), isUsablePlaceId(candidate), `parity with isUsablePlaceId: ${candidate}`);
  }
});

test('maqaf rule: Hebrew prefix + Latin/digit name gets U+05BE; Hebrew names attach directly', () => {
  const t = `x ${BET}{businessName} y`;
  assert.equal(withPrefixMaqaf(t, 'Acme'), `x ${BET}${MAQAF}{businessName} y`);
  assert.equal(withPrefixMaqaf(t, '24/7 Plumbing'), `x ${BET}${MAQAF}{businessName} y`);
  assert.equal(withPrefixMaqaf(t, '\u05d0\u05d1\u05d2'), t, 'Hebrew name unchanged');
  assert.equal(withPrefixMaqaf('Thanks {businessName}', 'Acme'), 'Thanks {businessName}', 'no prefix letter, unchanged');
  assert.equal(fillReviewMessage(`${BET}{businessName} {reviewLink}`, ' Acme ', 'https://x.test'), `${BET}${MAQAF}Acme https://x.test`);
});

test('WhatsApp share: no recipient, full message percent-encoded (newlines, Hebrew, & and ?)', () => {
  const message = `${BET}${MAQAF}Acme & co?\nhttps://search.google.com/local/writereview?placeid=${PLACE}`;
  const url = buildWhatsAppShareUrl(message);
  assert.ok(url.startsWith('https://wa.me/?text='), 'wa.me with no phone number');
  assert.equal(decodeURIComponent(url.slice('https://wa.me/?text='.length)), message);
  assert.ok(!/[\s&]/.test(url.slice('https://wa.me/?text='.length)), 'no raw spaces/ampersands');
  assert.equal(new URL(url).searchParams.get('text'), message);
});

test('account card: shown only for an active Site-Bot subscription with a live site, a Place ID and approved copy', () => {
  const { subscriptionId } = linked();
  assert.equal(reviewCardFor(sub(subscriptionId), READY), null, 'not live yet');
  live(subscriptionId);
  const view = reviewCardFor(sub(subscriptionId), READY);
  assert.ok(view);
  assert.equal(view.reviewLink, placeReviewUrl(PLACE));
  assert.ok(view.message.includes(`${BET}${MAQAF}Acme Plumbing`));
  assert.ok(view.message.includes(view.reviewLink));
  assert.equal(new URL(view.whatsappUrl).searchParams.get('text'), view.message);
  if (SITE_BOT_REVIEW_KIT_COPY_PENDING) assert.equal(reviewCardFor(sub(subscriptionId)), null, 'the real pending copy hides the card');
  assert.equal(reviewCardFor(sub(subscriptionId), { copy: COPY, pending: true }), null, 'pending hides the card');
  assert.equal(reviewCardFor({ ...sub(subscriptionId), cancel_at_period_end: 1 }, READY), null, 'cancelling hides it');
  assert.equal(reviewCardFor({ ...sub(subscriptionId), status: 'past_due' }, READY), null);
  assert.equal(reviewCardFor({ ...sub(subscriptionId), plan: null }, READY), null);
});

test('no Place ID: card hidden, no owner email, exactly one staff alert', async () => {
  const { subscriptionId } = linked();
  live(subscriptionId, null);
  assert.equal(reviewCardFor(sub(subscriptionId), READY), null);
  const { sent, transport } = recorder();
  assert.equal(await sendReviewKitEmail(subscriptionId, NOW, transport, READY), 'no_place_id');
  assert.equal(await sendReviewKitEmail(subscriptionId, NOW, transport, READY), 'no_place_id');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].tag, 'review_kit_no_place');
  assert.equal(sent[0].to, 'eitan@wao.co.il');
  assert.ok(!sent[0].text.includes('writereview'), 'never a broken link');
});

test('go-live email: once, to the owner, with link and message; idempotent across hook and sweep', async () => {
  const { subscriptionId, sessionId } = linked();
  assert.equal(findSubscriptionIdBySession(sessionId), subscriptionId);
  const { sent, transport } = recorder();
  const input = { researchId: sessionId, slug: 'acme', siteUrl: 'https://acme.wao.co.il', placeId: PLACE, ownDomain: false, businessName: 'Acme Plumbing' };
  assert.equal(await onSiteBotSiteLive(input, NOW, transport, READY), 'sent');
  assert.equal(await onSiteBotSiteLive(input, NOW, transport, READY), 'already_sent', 'redeploy sends nothing');
  await sweepReviewKits(NOW, transport, READY);
  const mine = sent.filter((e) => e.refIds[0] === subscriptionId);
  assert.equal(mine.length, 1);
  const [email] = mine;
  assert.equal(email.tag, 'review_kit');
  assert.equal(email.to, sub(subscriptionId).user_id);
  assert.ok(email.text.includes(placeReviewUrl(PLACE)!));
  assert.ok(email.text.includes(`${BET}${MAQAF}Acme Plumbing`));
  assert.ok(email.html?.includes(`href="${placeReviewUrl(PLACE)}"`));
  assert.equal(getNotice(subscriptionId, 'review_kit_email')?.state, 'sent');
});

test('go-live with copy pending records the site and sends nothing; the sweep sends it once copy is approved', async () => {
  const { subscriptionId, sessionId } = linked();
  const { sent, transport } = recorder();
  const input = { researchId: sessionId, slug: 'b', siteUrl: 'https://b.wao.co.il', placeId: PLACE, ownDomain: false, businessName: 'B' };
  assert.equal(await onSiteBotSiteLive(input, NOW, transport, { copy: COPY, pending: true }), 'copy_pending');
  assert.ok(getSiteBotSite(subscriptionId)?.live_at);
  assert.equal(sent.length, 0);
  await sweepReviewKits(NOW, transport, READY);
  await sweepReviewKits(NOW, transport, READY);
  assert.equal(sent.filter((e) => e.refIds[0] === subscriptionId).length, 1);
});

test('a failed send releases the claim so the next run retries; skip paths never throw', async () => {
  const { subscriptionId } = linked();
  live(subscriptionId);
  assert.equal(await sendReviewKitEmail(subscriptionId, NOW, recorder('throw').transport, READY), 'failed');
  assert.equal(getNotice(subscriptionId, 'review_kit_email'), null);
  const { sent, transport } = recorder();
  assert.equal(await sendReviewKitEmail(subscriptionId, NOW, transport, READY), 'sent');
  assert.equal(sent.length, 1);
  assert.equal(await onSiteBotSiteLive({ researchId: crypto.randomUUID(), slug: 'x', siteUrl: 'https://x', placeId: PLACE, ownDomain: false, businessName: 'X' }, NOW, transport, READY), 'no_subscription');
  assert.equal(await onSiteBotSiteLive({ researchId: null, slug: 'x', siteUrl: 'https://x', placeId: PLACE, ownDomain: false, businessName: 'X' }, NOW, transport, READY), 'skipped');
  assert.equal(await onSiteBotSiteLive({ researchId: 'r', simulation: true, slug: 'x', siteUrl: 'https://x', placeId: PLACE, ownDomain: false, businessName: 'X' }, NOW, transport, READY), 'skipped');
});

test('placeIdNeedsRematch drops the Place ID at go-live', async () => {
  const { subscriptionId, sessionId } = linked();
  const { transport } = recorder();
  await onSiteBotSiteLive({ researchId: sessionId, slug: 'r', siteUrl: 'https://r.wao.co.il', placeId: PLACE, placeIdNeedsRematch: true, ownDomain: false, businessName: 'R' }, NOW, transport, READY);
  assert.equal(getSiteBotSite(subscriptionId)?.place_id, null);
});
