import test from 'node:test';
import assert from 'node:assert/strict';
import { captureLead } from './lead-capture';

const now = new Date('2026-10-01T00:00:00.000Z');
const consent = '2026-09-30T12:00:00.000Z';

test('magnet capture keeps email and valid consent but does not enroll first response', () => {
  const { lead } = captureLead({ leads: [], now, body: { type: 'gbp-magnet-unlock',
    name: 'Buyer', phone: '0501234567', email: 'buyer@example.com', contactConsentAt: consent } });
  assert.equal(lead.email, 'buyer@example.com');
  assert.equal(lead.contactConsentAt, consent);
  assert.equal(lead.firstResponseStatus, 'not_eligible');
  assert.equal(lead.status, 'new');
});

test('magnet invalid consent is not recorded; form and click-stub semantics remain', () => {
  const magnet = captureLead({ leads: [], now, body: { type: 'gbp-magnet-unlock',
    phone: '0501234567', contactConsentAt: 'invalid' } }).lead;
  assert.equal(magnet.contactConsentAt, undefined);
  assert.equal(magnet.firstResponseStatus, 'not_eligible');
  const form = captureLead({ leads: [], now, body: { type: 'form',
    phone: '0501234567', contactConsentAt: consent } }).lead;
  assert.equal(form.contactConsentAt, consent);
  assert.equal(form.firstResponseStatus, 'pending');
  const click = captureLead({ leads: [], now, body: { type: 'phone-click',
    contactConsentAt: consent } }).lead;
  assert.equal(click.status, 'click');
  assert.equal(click.contactConsentAt, undefined);
  assert.equal(click.email, null);
});
