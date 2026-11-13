import assert from 'node:assert/strict';
import test from 'node:test';

import { decideSend, isInsideSendWindow, nextSendAt, nextWindowAtOrAfter, scheduleAll, stateAfterInbound, NURTURE_DAY_OFFSETS } from './schedule';
import { israelLocalParts } from '../calendar/il-calendar';

const at = (iso: string) => new Date(iso);
const out = (d: Date | null) => (d ? d.toISOString() : null);

test('B1: consent Thursday 22:00 → first send Sunday 07:00', () => {
  const consent = at('2027-01-07T20:00:00Z'); // Thursday 22:00 Israel (+02:00)
  assert.equal(israelLocalParts(consent).weekday, 4);
  assert.equal(out(nextSendAt(consent, 1, consent)), '2027-01-10T05:00:00.000Z');
});

test('B1: day 0 is the first window start after consent, never instantly', () => {
  const insideWindow = at('2027-01-10T05:30:00Z'); // Sunday 07:30, inside 07:00–08:00
  assert.equal(out(nextSendAt(insideWindow, 1, insideWindow)), '2027-01-10T17:30:00.000Z', 'Sunday 19:30');
  const morning = at('2027-01-11T03:00:00Z'); // Monday 05:00
  assert.equal(out(nextSendAt(morning, 1, morning)), '2027-01-11T05:00:00.000Z');
});

test('B1: a due time on a Friday moves to the next window', () => {
  const consent = at('2027-01-04T05:30:00Z'); // Monday 07:30
  // Message 2 is due Friday 8.1 07:30 → Sunday 10.1 07:00.
  assert.equal(out(nextSendAt(consent, 2, consent)), '2027-01-10T05:00:00.000Z');
});

test('B1: a due time on a holiday eve moves past the holiday', () => {
  const consent = at('2027-06-06T16:45:00Z'); // Sunday 19:45 Israel (+03:00)
  // Message 2 due Thursday 10.6 19:45 = Erev Shavuot → Shavuot Fri 11.6, Sat 12.6 → Sunday 13.6 07:00.
  assert.equal(out(nextSendAt(consent, 2, consent)), '2027-06-13T04:00:00.000Z');
  // Erev Pesach (Wed 21.4.2027) through the end of Pesach (Wed 28.4) → Thursday 29.4 07:00.
  const pesach = at('2027-04-17T04:30:00Z'); // Saturday 07:30; message 2 due Wed 21.4 07:30
  assert.equal(out(nextSendAt(pesach, 2, pesach)), '2027-04-29T04:00:00.000Z');
});

test('B1: offsets 0/4/9/15/22 hold', () => {
  const consent = at('2027-01-10T05:30:00Z'); // Sunday 07:30
  assert.deepEqual(NURTURE_DAY_OFFSETS, [0, 4, 9, 15, 22]);
  assert.deepEqual(scheduleAll(consent).map((s) => out(s.dueAt)), [
    '2027-01-10T17:30:00.000Z', // day 0, Sunday 19:30
    '2027-01-14T05:30:00.000Z', // day 4, Thursday 07:30
    '2027-01-19T05:30:00.000Z', // day 9, Tuesday 07:30
    '2027-01-25T05:30:00.000Z', // day 15, Monday 07:30
    '2027-02-01T05:30:00.000Z', // day 22, Monday 07:30
  ]);
});

test('B1: window edges are [start, end); a later `now` never schedules into the past', () => {
  assert.equal(out(nextWindowAtOrAfter(at('2027-01-13T19:00:00Z'))), '2027-01-14T05:00:00.000Z', 'Wed 21:00 → Thu 07:00');
  assert.equal(out(nextWindowAtOrAfter(at('2027-01-13T18:59:00Z'))), '2027-01-13T18:59:00.000Z', 'Wed 20:59 is inside');
  assert.equal(isInsideSendWindow(at('2027-01-13T05:59:00Z')), true);
  assert.equal(isInsideSendWindow(at('2027-01-13T06:00:00Z')), false);
  assert.equal(isInsideSendWindow(at('2027-01-15T05:30:00Z')), false, 'Friday');
  const consent = at('2027-01-10T05:30:00Z');
  assert.equal(out(nextSendAt(consent, 2, at('2027-01-15T10:00:00Z'))), '2027-01-17T05:00:00.000Z', 'recomputed after a delay');
});

test('B1: outside the calendar coverage nothing is scheduled (fail closed)', () => {
  const consent = at('2027-12-26T05:30:00Z');
  assert.equal(nextSendAt(consent, 5, consent), null);
  assert.throws(() => nextSendAt(consent, 6, consent));
});

test('B1 stop rules: no read or reply on messages 1–3 → completed before message 4; a reply → paused', () => {
  const sent = [{ n: 1, status: 'delivered' }, { n: 2, status: 'sent' }, { n: 3, status: 'delivered' }];
  assert.deepEqual(decideSend({ contactState: 'active', suppressed: false, n: 4, sends: sent, replied: false }), { action: 'complete', reason: 'no_engagement' });
  assert.deepEqual(decideSend({ contactState: 'active', suppressed: false, n: 3, sends: sent, replied: false }), { action: 'send' });
  assert.deepEqual(decideSend({ contactState: 'active', suppressed: false, n: 4, sends: [...sent.slice(0, 2), { n: 3, status: 'read' }], replied: false }), { action: 'send' });
  assert.deepEqual(decideSend({ contactState: 'active', suppressed: false, n: 5, sends: sent, replied: true }), { action: 'send' });
  for (const state of ['stopped', 'converted', 'completed', 'paused'] as const) {
    assert.deepEqual(decideSend({ contactState: state, suppressed: false, n: 2, sends: [], replied: false }), { action: 'skip', reason: `state_${state}` });
  }
  assert.deepEqual(decideSend({ contactState: 'active', suppressed: true, n: 1, sends: [], replied: false }), { action: 'skip', reason: 'suppressed' });

  assert.deepEqual(stateAfterInbound('active', false), { state: 'paused', notifyStaff: true });
  assert.deepEqual(stateAfterInbound('active', true), { state: 'stopped', notifyStaff: false });
  assert.deepEqual(stateAfterInbound('converted', false), { state: 'converted', notifyStaff: false });
  assert.deepEqual(stateAfterInbound('paused', true), { state: 'stopped', notifyStaff: false });
});
