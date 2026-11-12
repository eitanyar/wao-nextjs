// HEBREW-SAFETY: zero Hebrew bytes. Expected lines are read from the Noa-gated template file.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { buildClientWeekNumbers, type LeadRecord, type WeeklyDigest } from '../crm/intelligence';
import {
  CLIENT_LEADS_URL,
  buildWeeklyDigestWhatsAppLink,
  composeWeeklyDigestWhatsAppMessage,
  formatWholeShekels,
  selectWeeklyDigestLines,
  type WeeklyDigestMessageInput,
} from './whatsapp-digest';

const templatePath = path.join(process.cwd(), 'docs/copy/ads-bot-weekly-digest-whatsapp-final-2026-11-12.json');
const TEMPLATE: Array<{ id: string; text: string; when: string }> = JSON.parse(fs.readFileSync(templatePath, 'utf8')).template_lines;
const T = (id: string) => {
  const l = TEMPLATE.find((x) => x.id === id);
  assert.ok(l, id);
  return l.text;
};

const LINK = 'https://example.test/client/leads';
type InputOverride = Partial<Omit<WeeklyDigestMessageInput, 'week'>> & { week?: Partial<WeeklyDigestMessageInput['week']> };
function input(over: InputOverride = {}): WeeklyDigestMessageInput {
  return {
    contactName: 'Dana',
    campaignName: 'Acme Plumbing',
    weekSpendIls: 1500,
    openAlerts: 0,
    leadsLink: LINK,
    ...over,
    week: { leadsIn: 5, markedReal: 3, unmarked: 0, closedDeals: 0, ...over.week },
  };
}
const ids = (over: InputOverride = {}) => selectWeeklyDigestLines(input(over));

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/** Every non-empty output line must be one template line with its placeholders filled. */
function assertAllFromTemplate(message: string) {
  const patterns = TEMPLATE.flatMap((l) => {
    const full = new RegExp('^' + escapeRe(l.text).replace(/\\\{[A-Za-z]+\\\}/g, '.+') + '$', 'u');
    const noName = new RegExp('^' + escapeRe(l.text.replace(' {ownerName}', '')) + '$', 'u');
    return [full, noName];
  });
  for (const row of message.split('\n')) {
    if (row === '') continue;
    assert.ok(patterns.some((p) => p.test(row)), `not from the template: ${row}`);
  }
  assert.doesNotMatch(message, /\n\n\n/);
  assert.doesNotMatch(message, / {2}/);
  assert.doesNotMatch(message, /[{}]/);
}

test('always lines: greeting, frame, leads in, marked real, support close; template order', () => {
  const shown = ids();
  for (const id of ['greeting', 'week_frame', 'leads_in', 'marked_real', 'support_close']) assert.ok(shown.includes(id as never), id);
  const order = TEMPLATE.map((l) => l.id);
  assert.deepEqual([...shown], order.filter((id) => shown.includes(id as never)));
});

test('markedReal > 0: cost per real shown, whole shekels with thousands separator; nudge hidden', () => {
  const msg = composeWeeklyDigestWhatsAppMessage(input({ weekSpendIls: 3700, week: { markedReal: 3 } }));
  assert.ok(msg.split('\n').includes(T('cost_per_real').replace('{costPerReal}', '1,233')));
  assert.ok(!ids({ week: { markedReal: 3 } }).includes('mark_nudge_zero'));
  assert.equal(formatWholeShekels(1234567.4), '1,234,567');
  assert.equal(formatWholeShekels(999.5), '1,000');
  assertAllFromTemplate(msg);
});

test('markedReal > 0 but no weekly spend source: the cost line is hidden, not faked', () => {
  assert.ok(!ids({ weekSpendIls: undefined, week: { markedReal: 3 } }).includes('cost_per_real'));
});

test('markedReal == 0: nudge replaces the cost line; unmarked reminders suppressed', () => {
  const shown = ids({ week: { leadsIn: 4, markedReal: 0, unmarked: 4 } });
  assert.ok(shown.includes('mark_nudge_zero'));
  for (const id of ['cost_per_real', 'unmarked_reminder', 'unmarked_reminder_one']) assert.ok(!shown.includes(id as never), id);
  const msg = composeWeeklyDigestWhatsAppMessage(input({ week: { leadsIn: 4, markedReal: 0, unmarked: 4 } }));
  assert.ok(msg.split('\n').includes(T('mark_nudge_zero').replace('{leadsLink}', LINK)));
  assertAllFromTemplate(msg);
});

test('leadsIn == 0: nudge hidden too', () => {
  const shown = ids({ week: { leadsIn: 0, markedReal: 0, unmarked: 0 } });
  for (const id of ['mark_nudge_zero', 'cost_per_real', 'unmarked_reminder', 'unmarked_reminder_one']) assert.ok(!shown.includes(id as never), id);
  assert.ok(composeWeeklyDigestWhatsAppMessage(input({ week: { leadsIn: 0, markedReal: 0, unmarked: 0 } })).includes(T('leads_in').replace('{leadsIn}', '0')));
});

test('unmarked 0 / 1 / 2+ (with markedReal > 0)', () => {
  assert.ok(!ids({ week: { unmarked: 0 } }).some((id) => id.startsWith('unmarked')));
  assert.deepEqual(ids({ week: { unmarked: 1 } }).filter((id) => id.startsWith('unmarked')), ['unmarked_reminder_one']);
  assert.deepEqual(ids({ week: { unmarked: 2 } }).filter((id) => id.startsWith('unmarked')), ['unmarked_reminder']);
  const msg = composeWeeklyDigestWhatsAppMessage(input({ week: { unmarked: 7 } }));
  assert.ok(msg.split('\n').includes(T('unmarked_reminder').replace('{unmarked}', '7').replace('{leadsLink}', LINK)));
  const one = composeWeeklyDigestWhatsAppMessage(input({ week: { unmarked: 1 } }));
  assert.ok(one.split('\n').includes(T('unmarked_reminder_one').replace('{leadsLink}', LINK)));
});

test('closedDeals 0 / 1 / 2+', () => {
  assert.ok(!ids({ week: { closedDeals: 0 } }).some((id) => id.startsWith('closed')));
  assert.deepEqual(ids({ week: { closedDeals: 1 } }).filter((id) => id.startsWith('closed')), ['closed_deals_one']);
  assert.deepEqual(ids({ week: { closedDeals: 2 } }).filter((id) => id.startsWith('closed')), ['closed_deals_extra']);
  assert.ok(composeWeeklyDigestWhatsAppMessage(input({ week: { closedDeals: 4 } })).split('\n').includes(T('closed_deals_extra').replace('{closedDeals}', '4')));
});

test('alerts: all-clear only with none open; alert text is never rendered', () => {
  assert.ok(ids({ openAlerts: 0 }).includes('alerts_all_clear'));
  assert.ok(!ids({ openAlerts: 2 }).includes('alerts_all_clear'));
});

test('empty name: bare greeting, no double space; campaign name without quotes', () => {
  const msg = composeWeeklyDigestWhatsAppMessage(input({ contactName: '  ' }));
  assert.equal(msg.split('\n')[0], T('greeting').replace(' {ownerName}', ''));
  assert.ok(msg.split('\n').includes(T('week_frame').replace('{campaignName}', 'Acme Plumbing')));
  assert.doesNotMatch(msg, /["'“”]/);
  assertAllFromTemplate(msg);
  assert.equal(composeWeeklyDigestWhatsAppMessage(input()).split('\n')[0], T('greeting').replace('{ownerName}', 'Dana'));
});

// ── Data source: buildClientWeekNumbers (fixtures only, never data/clients) ──
const NOW = new Date('2026-11-12T12:00:00.000Z');
const campaign = { slug: 'acme', customerId: '111' };
function lead(id: number, over: Partial<LeadRecord>): LeadRecord {
  return { id, slug: 'acme', date: '2026-11-10 09:00:00', quality: 'PENDING', closed: false, closedAt: null, type: 'form', ...over };
}
const LEADS: LeadRecord[] = [
  lead(1, { quality: 'GOOD' }),
  lead(2, { quality: 'GOOD', type: 'phone-click', status: 'click' }),
  lead(3, { quality: 'JUNK', type: 'whatsapp-click', status: 'click' }),
  lead(4, {}),
  lead(5, { quality: undefined }),
  lead(6, { quality: 'GOOD', closed: true, closedAt: '2026-11-11T10:00:00.000Z' }),
  lead(7, { date: '2026-10-01 09:00:00', quality: 'GOOD', closed: true, closedAt: '2026-11-09T10:00:00.000Z' }), // old lead closed this week
  lead(8, { date: '2026-10-01 09:00:00' }), // last month
  lead(9, { slug: 'other', customerId: '222' }), // another client's
  lead(10, { slug: '', customerId: '111' }), // matched by customerId
];

test('buildClientWeekNumbers: created this week by date; marks from quality; closed by closedAt', () => {
  const w = buildClientWeekNumbers({ campaign, leads: LEADS, now: NOW });
  assert.equal(w.windowDays, 7);
  assert.equal(w.leadsIn, 7); // 1,2,3,4,5,6,10 (form + call tap + WhatsApp tap)
  assert.equal(w.markedReal, 3); // 1,2,6
  assert.equal(w.unmarked, 3); // 4,5,10
  assert.equal(w.closedDeals, 2); // 6,7
});

function digest(windowDays: number, spendIls: number | undefined, alerts = 0): WeeklyDigest {
  return {
    slug: 'acme', customerId: '111', campaignName: 'Acme', windowDays, windowStart: '', windowEnd: '',
    totals: { leads: 0, verifiedLeads: 0, closedDeals: 0, revenue: 0, newLeads: 0, previousLeads: 0, leadChangePct: null, revenueChangePct: null, spendIls },
    pacing: { mode: 'estimated', expectedWeeklyLeads: 0, actualWeeklyLeads: 0, deviationPct: 0, status: 'on_track' },
    alerts: Array.from({ length: alerts }, () => ({ type: 'no_leads' as const, severity: 'info' as const, title: 'Staff-only alert title', message: 'x' })),
    nextActions: ['Staff-only next action'],
  };
}
const decode = (link: string) => decodeURIComponent(link.split('?text=')[1]);

test('wa.me link: weekly spend used only when the digest covers the same 7 days; staff text never leaks', () => {
  const week = buildClientWeekNumbers({ campaign, leads: LEADS, now: NOW });
  const base = { contactPhone: '+972-50-000-0000', contactName: 'Dana', campaignName: 'Acme' };
  const weekly = buildWeeklyDigestWhatsAppLink({ ...base, digest: digest(7, 3000), week });
  assert.match(weekly, /^https:\/\/wa\.me\/972500000000\?text=/);
  const weeklyMsg = decode(weekly);
  assert.ok(weeklyMsg.split('\n').includes(T('cost_per_real').replace('{costPerReal}', '1,000')));
  assert.ok(weeklyMsg.includes(CLIENT_LEADS_URL));
  assert.match(CLIENT_LEADS_URL, /^https?:\/\/[^/]+\/client\/leads$/);
  assertAllFromTemplate(weeklyMsg);

  const monthly = decode(buildWeeklyDigestWhatsAppLink({ ...base, digest: digest(30, 9000, 2), week }));
  assert.ok(!monthly.includes(T('cost_per_real').split('{')[0]));
  assert.ok(!monthly.includes(T('alerts_all_clear')));
  assert.doesNotMatch(monthly, /Staff-only/);
  assertAllFromTemplate(monthly);
});
