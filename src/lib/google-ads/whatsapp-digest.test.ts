// HEBREW-SAFETY: zero Hebrew bytes. Expected lines are read from the Noa-gated template file.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { buildClientWeekNumbers, leadsCapturedByWao, type LeadRecord, type WeeklyDigest } from '../crm/intelligence';
import { WEEKLY_SPEND_QUERY, fetchWeeklySpendIls, readWeeklySpendIls } from './campaign-enumeration';
import type { buildClient } from './mutations';
import {
  CLIENT_LEADS_URL,
  DIGEST_DISABLED_EXTERNAL_LEADS_NOTE,
  weeklyDigestSendState,
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

// ── Weekly spend read (read-only, mocked client) ──
function withLiveEnv<T>(run: () => Promise<T>): Promise<T> {
  const prev = { token: process.env.GOOGLE_ADS_REFRESH_TOKEN, mcc: process.env.GOOGLE_ADS_MCC_CUSTOMER_ID };
  process.env.GOOGLE_ADS_REFRESH_TOKEN = 'synthetic-live-token';
  process.env.GOOGLE_ADS_MCC_CUSTOMER_ID = '999-888-7777';
  return run().finally(() => {
    if (prev.token === undefined) delete process.env.GOOGLE_ADS_REFRESH_TOKEN; else process.env.GOOGLE_ADS_REFRESH_TOKEN = prev.token;
    if (prev.mcc === undefined) delete process.env.GOOGLE_ADS_MCC_CUSTOMER_ID; else process.env.GOOGLE_ADS_MCC_CUSTOMER_ID = prev.mcc;
  });
}
function mockClient(query: (gaql: string) => Promise<unknown[]>, seen: string[] = []) {
  return {
    Customer: (opts: { customer_id: string }) => {
      seen.push(opts.customer_id);
      return { query };
    },
  } as unknown as ReturnType<typeof buildClient>;
}

test('weekly spend query is a read-only customer-level LAST_7_DAYS cost read', () => {
  assert.match(WEEKLY_SPEND_QUERY, /^\s*SELECT metrics\.cost_micros\s+FROM customer\s+WHERE segments\.date DURING LAST_7_DAYS\s*$/);
});

test('7-day spend 3,700 / markedReal 3 -> the 1,233 cost line is present', () => withLiveEnv(async () => {
  const queries: string[] = [];
  const customers: string[] = [];
  const client = mockClient(async (gaql) => {
    queries.push(gaql);
    return [{ metrics: { cost_micros: '2500000000' } }, { metrics: { cost_micros: 1_200_000_000 } }];
  }, customers);
  const spend = await readWeeklySpendIls({ customerId: '8344335641', mode: 'live', clientInstance: client });
  assert.deepEqual(spend, { ok: true, spendIls: 3700 });
  assert.deepEqual(queries, [WEEKLY_SPEND_QUERY]);
  assert.deepEqual(customers, ['8344335641']);
  const week = { windowDays: 7, windowStart: '', windowEnd: '', leadsIn: 5, markedReal: 3, unmarked: 1, closedDeals: 1 };
  const msg = decode(buildWeeklyDigestWhatsAppLink({
    contactPhone: '972500000000', contactName: 'Dana', campaignName: 'Acme',
    digest: digest(30, 9000), week, weekSpendIls: spend.ok ? spend.spendIls : undefined,
  }));
  assert.ok(msg.split('\n').includes(T('cost_per_real').replace('{costPerReal}', '1,233')));
  assertAllFromTemplate(msg);
}));

test('weekly spend read failure -> cost line hidden, never estimated', () => withLiveEnv(async () => {
  const failing = mockClient(async () => { throw new Error('PERMISSION_DENIED'); });
  const spend = await readWeeklySpendIls({ customerId: '1', clientInstance: failing });
  assert.equal(spend.ok, false);
  const failedSpend: number | undefined = undefined;
  const bad = await fetchWeeklySpendIls({ customer: { query: async () => [{ metrics: { cost_micros: 'NaN' } }] } });
  assert.equal(bad.ok, false);
  const week = { windowDays: 7, windowStart: '', windowEnd: '', leadsIn: 5, markedReal: 3, unmarked: 0, closedDeals: 0 };
  // 30-day digest (the staff page's) + failed read -> no spend source at all.
  const msg = decode(buildWeeklyDigestWhatsAppLink({
    contactPhone: '972500000000', contactName: 'Dana', campaignName: 'Acme',
    digest: digest(30, 9000), week, weekSpendIls: failedSpend,
  }));
  assert.ok(!msg.includes(T('cost_per_real').split('{')[0]));
  assertAllFromTemplate(msg);
}));

// ── Own-domain clients: no client digest link ──
test('leadsCapturedByWao: WAO-hosted final URL yes, own domain no; no URL -> WAO-created campaign only', () => {
  const idx = (finalUrl?: string) => ({ campaigns: [{ slug: 's', customerId: '1', campaignId: '2', createdAt: '', finalUrl }] });
  const waoCampaign = { slug: 's', verifiedLeadConversionResourceName: 'customers/1/conversionActions/2' };
  const founderCampaign = { slug: 's', verifiedLeadConversionResourceName: null };
  assert.equal(leadsCapturedByWao(idx('https://emergency-trades-4567.wao.co.il'), founderCampaign), true);
  assert.equal(leadsCapturedByWao(idx('https://www.wao.co.il/lp/s'), founderCampaign), true);
  assert.equal(leadsCapturedByWao(idx('https://www.retter.co.il/'), waoCampaign), false);
  assert.equal(leadsCapturedByWao(idx('https://aaasada.com/'), waoCampaign), false);
  assert.equal(leadsCapturedByWao(idx('https://notwao.co.il/'), waoCampaign), false);
  assert.equal(leadsCapturedByWao(idx('not a url'), waoCampaign), false);
  assert.equal(leadsCapturedByWao(idx(undefined), waoCampaign), true);
  assert.equal(leadsCapturedByWao(idx(undefined), founderCampaign), false);
  assert.equal(leadsCapturedByWao(null, founderCampaign), false);
});

test('send state: external lead capture -> disabled with the staff-only note and no link; WAO -> link', () => {
  const week = buildClientWeekNumbers({ campaign, leads: LEADS, now: NOW });
  const base = { contactPhone: '972500000000', contactName: 'Dana', campaignName: 'Acme', digest: digest(30, 9000), week };
  for (const leadCapture of ['external', undefined] as const) {
    const off = weeklyDigestSendState({ ...base, leadCapture });
    assert.deepEqual(off, { enabled: false, note: DIGEST_DISABLED_EXTERNAL_LEADS_NOTE });
  }
  assert.match(DIGEST_DISABLED_EXTERNAL_LEADS_NOTE, /^[\x20-\x7E]+$/);
  const on = weeklyDigestSendState({ ...base, leadCapture: 'wao' });
  assert.equal(on.enabled, true);
  if (on.enabled) assert.match(on.waLink, /^https:\/\/wa\.me\/972500000000\?text=/);
});

test('staff page + batch wiring: send state gates the link; spend read only for WAO-captured clients', () => {
  const page = fs.readFileSync(path.join(process.cwd(), 'src/app/(product)/geo/dashboard/page.tsx'), 'utf8');
  assert.match(page, /weeklyDigestSendState\(\{\s*leadCapture: adsResult\.leadCapture,/);
  assert.match(page, /weekSpendIls: adsResult\.weekSpendIls,/);
  assert.match(page, /waLink=\{digestSend\?\.enabled \? digestSend\.waLink : ''\}/);
  assert.match(page, /disabled=\{!hasPhone \|\| !digestSend\?\.enabled\}/);
  assert.match(page, /\{digestSend\.note\}/);
  assert.doesNotMatch(page, /buildWeeklyDigestWhatsAppLink/);
  const batch = fs.readFileSync(path.join(process.cwd(), 'src/lib/google-ads/weekly-digest-batch.ts'), 'utf8');
  assert.match(batch, /const leadCapture: 'wao' \| 'external' = leadsCapturedByWao\(index, campaign\)/);
  assert.match(batch, /if \(leadCapture === 'wao'\) \{\s*const spend = await readWeeklySpendIls\(/);
  assert.equal((batch.match(/leadCapture, weekSpendIls/g) ?? []).length, 1);
  assert.match(batch, /leadCapture,\s*weekSpendIls,\s*\}\);/);
});
