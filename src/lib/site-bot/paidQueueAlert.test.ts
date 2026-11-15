import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPaidQueueAlert, plannedHost, sendPaidQueueAlert } from './paidQueueAlert';
import type { OutgoingEmail } from './clientMessageEmail';

const paidAt = new Date('2026-11-25T07:40:00Z');
const env = { SITE_BOT_SUPPORT_ALERT_EMAIL: 'staff@example.com' };

test('alert names the business, the planned own-domain host and the ids', () => {
  const email = buildPaidQueueAlert({
    sessionId: '11111111-2222-4333-8444-555555555555', subscriptionId: 'sub-1', paidAt,
    collectedData: { businessName: 'Biz\nInjected: x', domainChoice: 'has_domain', ownerDomain: 'example.co.il', ownerContact: { mobile: '+972501234567', email: 'o@example.com' } },
  }, env);
  assert.equal(email.to, 'staff@example.com');
  assert.equal(email.tag, 'paid_queue_alert');
  assert.match(email.subject, /^Site Bot paid — waiting for build — Biz Injected: x$/);
  assert.match(email.text, /Planned host: www\.example\.co\.il \(own domain/);
  assert.match(email.text, /Owner mobile: \+972501234567/);
  assert.match(email.text, /Session: 11111111-2222-4333-8444-555555555555/);
  assert.doesNotMatch(email.text, /\nInjected/);
});

test('no domain or unsure: sub-domain host; unsure asks staff to check', () => {
  assert.match(plannedHost({ domainChoice: 'no_domain' }), /^\{slug\}\.wao\.co\.il/);
  assert.match(plannedHost({ domainChoice: 'not_sure' }), /not sure about a domain: ask/);
  assert.match(plannedHost({ domainChoice: 'has_domain', ownerDomain: 'bad domain' }), /^\{slug\}\.wao\.co\.il/);
  assert.match(plannedHost(undefined), /^\{slug\}\.wao\.co\.il/);
});

test('missing business name falls back to the session prefix; send never throws', async () => {
  const email = buildPaidQueueAlert({ sessionId: 'abcdef12-0000-4000-8000-000000000000', subscriptionId: 's', paidAt, collectedData: undefined }, env);
  assert.match(email.subject, /— abcdef12$/);
  const sent: OutgoingEmail[] = [];
  assert.equal(await sendPaidQueueAlert({ sessionId: 'x', subscriptionId: 's', paidAt, collectedData: undefined }, async (e) => { sent.push(e); return 'sent'; }), true);
  assert.equal(sent.length, 1);
  assert.equal(await sendPaidQueueAlert({ sessionId: 'x', subscriptionId: 's', paidAt, collectedData: undefined }, async () => { throw new Error('down'); }), false);
});
