// Staff queue UI for Site-Bot client messages (spec acceptance 17-18). textContent-only rendering, no innerHTML.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import * as ui from './clientMessages.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const id1 = '123e4567-e89b-42d3-a456-426614174001';
const id2 = '123e4567-e89b-42d3-a456-426614174002';
const id3 = '123e4567-e89b-42d3-a456-426614174003';
const base = {
  subscription_id: 'sub-1', kind: 'client_message', body: 'hello', meta_json: null, business_name: 'Acme', contact_email: 'owner@example.com',
  contact_mobile: '+972501234567', status: 'received', staff_category: null, staff_note: null, received_at: '2026-12-06T08:00:00.000Z',
  updated_at: '2026-12-06T08:00:00.000Z', staff_alerted_at: '2026-12-06T08:00:01.000Z', client_confirmed_at: null, reminded_at: null,
};

function fakeDocument() {
  const created = [];
  const doc = {
    created,
    createElement(tag) {
      const el = { tagName: tag.toUpperCase(), ownerDocument: doc, childNodes: [], attributes: {}, dataset: {}, listeners: {}, disabled: false, id: '', className: '', title: '', type: '', value: '',
        get firstChild() { return this.childNodes[0] ?? null; }, get lastChild() { return this.childNodes.at(-1) ?? null; },
        get textContent() { return this.childNodes.map((n) => (typeof n === 'string' ? n : n.textContent)).join(''); },
        set textContent(v) { this.childNodes = [String(v)]; },
        setAttribute(k, v) { this.attributes[k] = String(v); }, getAttribute(k) { return this.attributes[k] ?? null; },
        append(...nodes) { this.childNodes.push(...nodes); }, replaceChildren() { this.childNodes = []; },
        removeChild(n) { this.childNodes.splice(this.childNodes.indexOf(n), 1); return n; },
        addEventListener(type, fn) { this.listeners[type] = fn; }, click() { this.listeners.click?.(); },
        querySelectorAll(t) { return walk(this).filter((n) => n !== this && n.tagName === t.toUpperCase()); },
      };
      created.push(el);
      return el;
    },
  };
  return doc;
}
const walk = (n) => (typeof n === 'string' ? [] : [n, ...n.childNodes.flatMap(walk)]);

test('17: a body with <script> and <img onerror> reaches the DOM as text only', () => {
  const hostile = '<script>alert(1)</script><img src=x onerror=alert(1)>\nsecond line';
  const item = ui.project({ ...base, id: id1, body: hostile });
  const doc = fakeDocument();
  const root = doc.createElement('div');
  ui.renderClientInbox(root, { status: 'records', items: [item], skipped: 0, openCount: 1, overdueCount: 0 }, { update: async () => {} });
  const tags = new Set(doc.created.map((el) => el.tagName));
  assert.ok(!tags.has('SCRIPT') && !tags.has('IMG'), 'no element created from message text');
  const bodyNode = walk(root).find((n) => n.tagName === 'P' && n.getAttribute('dir') === 'auto');
  assert.deepEqual(bodyNode.childNodes, [hostile], 'set as one text node');
  assert.equal(bodyNode.getAttribute('style'), 'white-space: pre-wrap');
  assert.ok(doc.created.every((el) => !Object.hasOwn(el, 'innerHTML')), 'innerHTML never assigned');
  const source = fs.readFileSync(path.join(here, 'clientMessages.mjs'), 'utf8');
  assert.ok(!/innerHTML|insertAdjacentHTML|outerHTML/.test(source));
  assert.match(source, /^[\x00-\x7f]*$/, 'operator UI is ASCII-only');
});

test('18: open items sort before done ones; a cancel item shows both dates and the checklist', () => {
  const items = [
    ui.project({ ...base, id: id1, status: 'done', received_at: '2026-12-07T08:00:00.000Z' }),
    ui.project({ ...base, id: id2, status: 'received', received_at: '2026-12-05T08:00:00.000Z' }),
    ui.project({ ...base, id: id3, kind: 'cancel_notice_due', body: '', status: 'handling', staff_category: 'cancel', staff_alerted_at: null,
      meta_json: JSON.stringify({ effectiveAt: '2027-01-06T08:00:00.000Z', siteOfflineAt: '2027-02-05T08:00:00.000Z', cancelAtPeriodEnd: true }), received_at: '2026-12-06T08:00:00.000Z' }),
  ];
  assert.deepEqual(ui.sortMessages(items).map((m) => m.id), [id3, id2, id1]);
  const doc = fakeDocument();
  const root = doc.createElement('div');
  ui.renderClientInbox(root, { status: 'records', items: ui.sortMessages(items), skipped: 0, openCount: 2, overdueCount: 1 }, { update: async () => {} });
  const text = root.textContent;
  assert.match(text, /Open: 2\. Open for more than one business day: 1\./);
  const cancel = walk(root).find((n) => n.tagName === 'LI' && n.dataset.status === 'handling');
  const cancelText = cancel.textContent;
  assert.match(cancelText, /Cancel notice due/);
  assert.match(cancelText, /Effective: 06\/01\/2027/);
  assert.match(cancelText, /Site offline on: 05\/02\/2027/);
  assert.match(cancelText, /Send the cancel-day notice\.Send the notice 7 days before the site goes offline\.Remove WAO's manager access to the Google profile\./);
  assert.match(cancelText, /Alert email not sent/);
  const times = walk(cancel).filter((n) => n.tagName === 'TIME').map((t) => t.getAttribute('datetime'));
  assert.deepEqual(times, ['2026-12-06T08:00:00.000Z', '2027-01-06T08:00:00.000Z', '2027-02-05T08:00:00.000Z']);
});

test('controls call update with the right patches; reply link is ASCII-only and carries no message text', async () => {
  const item = ui.project({ ...base, id: id1, body: 'please change my number' });
  const calls = [];
  const doc = fakeDocument();
  const root = doc.createElement('div');
  ui.renderClientInbox(root, { status: 'records', items: [item], skipped: 0, openCount: 1, overdueCount: 0 }, { update: async (...args) => { calls.push(args); } });
  const buttons = root.querySelectorAll('button');
  buttons.find((b) => b.textContent === 'Mark handling').click();
  const select = root.querySelectorAll('select')[0];
  select.value = 'change';
  select.listeners.change();
  const note = root.querySelectorAll('textarea')[0];
  note.value = 'done by hand';
  buttons.find((b) => b.textContent === 'Save note').click();
  assert.deepEqual(calls, [[id1, { status: 'handling' }], [id1, { staffCategory: 'change' }], [id1, { staffNote: 'done by hand' }]]);
  const link = root.querySelectorAll('a')[0];
  assert.equal(link.getAttribute('href'), 'mailto:owner@example.com?subject=WAO%20Site%20Bot%20%5B123e4567%5D');
  assert.equal(ui.replyHref({ id: id1, email: null }), null);
  assert.equal(ui.replyHref({ id: id1, email: 'a@b.c?subject=x' }), null, 'no header injection through the address');
  for (const label of root.querySelectorAll('label')) assert.ok(root.querySelectorAll(label.tagName).length && walk(root).some((n) => n.id === label.getAttribute('for')), 'labels point at controls');
});

test('inbox state flow: list -> records, update -> notice, invalid rows skipped, unauthorized error', async () => {
  const states = [];
  let current = { ...base, id: id1 };
  const transport = {
    list: async () => Response.json({ ok: true, messages: [current, { bogus: true }] }),
    update: async (id, patch) => { current = { ...current, ...(patch.status ? { status: patch.status } : {}) }; return Response.json({ ok: true }); },
  };
  const inbox = ui.createClientInbox({ transport, render: (s) => states.push(s), now: () => Date.parse('2026-12-09T08:00:00.000Z') });
  await inbox.load();
  assert.equal(states.at(-1).status, 'records');
  assert.equal(states.at(-1).skipped, 1);
  assert.equal(states.at(-1).overdueCount, 1);
  await inbox.update(id1, { status: 'done' });
  assert.equal(states.at(-1).items[0].status, 'done');
  assert.equal(states.at(-1).notice, 'Saved.');
  const denied = [];
  await ui.createClientInbox({ transport: { list: async () => new Response('{}', { status: 401 }), update: async () => new Response('{}') }, render: (s) => denied.push(s) }).load();
  assert.deepEqual(denied.at(-1), { status: 'error', reason: 'unauthorized' });
  const fetches = [];
  await ui.createSameOriginTransport(async (url, init) => { fetches.push([url, init]); return new Response('{}'); }).update(id1, { status: 'done' });
  assert.equal(fetches[0][0], '/api/admin/site-bot/client-messages/update');
  assert.equal(fetches[0][1].credentials, 'same-origin');
  assert.equal(JSON.parse(fetches[0][1].body).id, id1);
});

test('one business day skips Friday and Saturday (Israel time)', () => {
  // Thursday 10:00 Israel -> deadline Friday -> skipped to Sunday 10:00.
  const thursday = '2026-12-10T08:00:00.000Z';
  assert.equal(ui.olderThanOneBusinessDay(thursday, Date.parse('2026-12-12T20:00:00.000Z')), false, 'Saturday evening: not yet');
  assert.equal(ui.olderThanOneBusinessDay(thursday, Date.parse('2026-12-13T08:00:01.000Z')), true, 'Sunday after 10:00');
});
