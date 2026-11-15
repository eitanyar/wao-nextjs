import assert from 'node:assert/strict';
import test from 'node:test';

import { buildOwnerLeadEmail, notifyOwnerOfLead, ownerContactFor, telHref } from './ownerLeadEmail';
import { OWNER_LEAD_EMAIL_COPY } from './ownerLeadEmailCopy';
import type { OutgoingEmail } from '../site-bot/clientMessageEmail';

const env = { SITE_BOT_SUPPORT_ALERT_EMAIL: 'staff@example.com', NEXT_PUBLIC_BASE_URL: 'https://www.wao.co.il' };
const record = { slug: 'test-plumber', collectedData: { businessName: 'Biz', ownerContact: { mobile: '+972501111111', email: 'owner@example.com' } } };
const read = (slug: string) => (slug === 'test-plumber' ? record : slug === 'no-email' ? { slug: 'no-email', collectedData: {} } : null);
const input = { clientId: 'test-plumber', leadId: 42, name: 'Dana <b>', phone: '050-123 4567' };

test('owner contact comes only from a matching Site Bot record with a valid email', () => {
  assert.deepEqual(ownerContactFor('test-plumber', read), { email: 'owner@example.com', businessName: 'Biz' });
  assert.equal(ownerContactFor('no-email', read), null);
  assert.equal(ownerContactFor('ads-lp-client', read), null);
  assert.equal(ownerContactFor('test-plumber', () => ({ ...record, slug: 'other' })), null);
});

test('tel link keeps digits and a leading plus only', () => {
  assert.equal(telHref('050-123 4567'), 'tel:0501234567');
  assert.equal(telHref('+972 50 123 4567'), 'tel:+972501234567');
  assert.equal(telHref('abc'), null);
});

test('email: to the owner, copy placeholders filled, visitor data escaped, call button and dashboard link', () => {
  const email = buildOwnerLeadEmail(input, { email: 'owner@example.com', businessName: 'Biz' }, env);
  assert.equal(email.to, 'owner@example.com');
  assert.equal(email.tag, 'owner_lead');
  assert.equal(email.subject, OWNER_LEAD_EMAIL_COPY.subject.replace('{name}', 'Dana <b>'));
  assert.ok(email.html!.includes('href="tel:0501234567"'));
  assert.ok(email.html!.includes('Dana &lt;b&gt;'));
  assert.ok(!email.html!.includes('Dana <b>'));
  assert.ok(email.html!.includes('https://www.wao.co.il/client/leads'));
  assert.ok(!/\{(name|business)\}/.test(email.text + email.html + email.subject));
  assert.ok(!email.html!.includes('+972501111111'), 'owner private mobile never in the email');
});

test('notify: owner sent; no email or failed send alerts staff; ads-LP skipped; never throws', async () => {
  const sent: OutgoingEmail[] = [];
  const ok = async (e: OutgoingEmail) => { sent.push(e); return 'sent' as const; };
  assert.equal(await notifyOwnerOfLead(input, { transport: ok, read, env }), 'owner_sent');
  assert.equal(sent[0].to, 'owner@example.com');

  sent.length = 0;
  assert.equal(await notifyOwnerOfLead({ ...input, clientId: 'no-email' }, { transport: ok, read, env }), 'staff_alerted');
  assert.equal(sent[0].to, 'staff@example.com');
  assert.match(sent[0].subject, /no_owner_email/);

  sent.length = 0;
  let n = 0;
  const failFirst = async (e: OutgoingEmail) => { n += 1; if (n === 1) throw new Error('resend down'); sent.push(e); return 'sent' as const; };
  assert.equal(await notifyOwnerOfLead(input, { transport: failFirst, read, env }), 'staff_alerted');
  assert.match(sent[0].subject, /send_failed/);

  assert.equal(await notifyOwnerOfLead({ ...input, clientId: 'ads-lp-client' }, { transport: ok, read, env }), 'not_site_bot');
  assert.equal(await notifyOwnerOfLead(input, { transport: async () => { throw new Error('x'); }, read, env }), 'failed');
});
