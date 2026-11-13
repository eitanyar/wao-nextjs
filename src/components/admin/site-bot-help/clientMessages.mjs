// Internal operator queue for Site-Bot client messages (sibling of inbox.mjs). English operator UI.
// The server, not this UI, enforces access control. Message text is untrusted: every value is set with
// textContent / attributes only, never parsed as HTML.
import { formatIsraelTime } from './inbox.mjs';

export const STATUSES = ['received', 'handling', 'done'];
export const CATEGORIES = ['change', 'support', 'billing', 'cancel', 'reviews', 'other'];
const KINDS = ['client_message', 'cancel_notice_due'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const emailPattern = /^[^\s@<>"?&#]+@[^\s@<>"?&#]+\.[^\s@<>"?&#]+$/;
const LIST_URL = '/api/admin/site-bot/client-messages';
const UPDATE_URL = '/api/admin/site-bot/client-messages/update';
const object = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const iso = (x) => typeof x === 'string' && Number.isFinite(Date.parse(x));
const optString = (x, max) => x === null || (typeof x === 'string' && x.length <= max);

/** Validates one server row; throws on anything unexpected. */
export function project(r) {
  if (!object(r) || typeof r.id !== 'string' || !uuid.test(r.id) || typeof r.subscription_id !== 'string' ||
      !KINDS.includes(r.kind) || typeof r.body !== 'string' || r.body.length > 2000 || !STATUSES.includes(r.status) ||
      !(r.staff_category === null || CATEGORIES.includes(r.staff_category)) || !optString(r.staff_note, 1000) ||
      !optString(r.business_name, 200) || !optString(r.contact_email, 254) || !optString(r.contact_mobile, 40) ||
      !optString(r.meta_json, 2000) || !iso(r.received_at) || !iso(r.updated_at) ||
      !(r.staff_alerted_at === null || iso(r.staff_alerted_at))) throw new Error('invalid message');
  let meta = null;
  if (r.kind === 'cancel_notice_due' && r.meta_json) {
    try {
      const parsed = JSON.parse(r.meta_json);
      if (object(parsed)) meta = { effectiveAt: iso(parsed.effectiveAt) ? parsed.effectiveAt : null, siteOfflineAt: iso(parsed.siteOfflineAt) ? parsed.siteOfflineAt : null };
    } catch { meta = null; }
  }
  return {
    id: r.id, kind: r.kind, body: r.body, status: r.status, category: r.staff_category, note: r.staff_note ?? '',
    business: r.business_name, email: r.contact_email, mobile: r.contact_mobile, receivedAt: r.received_at,
    staffAlerted: r.staff_alerted_at !== null, meta,
  };
}

/** Open items (received / handling) before done ones; newest first inside each group. */
export function sortMessages(items) {
  return [...items].sort((a, b) => (a.status === 'done') - (b.status === 'done') || Date.parse(b.receivedAt) - Date.parse(a.receivedAt));
}

function israelWeekday(ms) {
  return new Date(ms).toLocaleDateString('en-US', { timeZone: 'Asia/Jerusalem', weekday: 'short' });
}

/** One business day after `receivedAt` (Friday and Saturday are skipped); true when `now` is past it. */
export function olderThanOneBusinessDay(receivedAt, now = Date.now()) {
  let deadline = Date.parse(receivedAt) + 24 * 60 * 60 * 1000;
  while (['Fri', 'Sat'].includes(israelWeekday(deadline))) deadline += 24 * 60 * 60 * 1000;
  return now > deadline;
}

/** ASCII-only reply link. Never carries message content. */
export function replyHref(item) {
  if (!item.email || !emailPattern.test(item.email)) return null;
  return `mailto:${item.email}?subject=${encodeURIComponent(`WAO Site Bot [${item.id.slice(0, 8)}]`)}`;
}

export function createSameOriginTransport(fetchFn = globalThis.fetch) {
  const base = { credentials: 'same-origin', cache: 'no-store', redirect: 'error' };
  return {
    list: () => fetchFn(LIST_URL, { ...base, method: 'GET' }),
    update: (id, patch) => fetchFn(UPDATE_URL, { ...base, method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, ...patch }) }),
  };
}

function errorReason(status) { return status === 401 ? 'unauthorized' : status === 503 ? 'unavailable' : 'unknown'; }

export function createClientInbox({ transport, render, now = () => Date.now() }) {
  let generation = 0, disposed = false, last = null;
  const show = (state) => { last = state; render(state); };
  async function load(notice) {
    if (disposed) return;
    const id = ++generation;
    if (!last || last.status !== 'records') show({ status: 'loading' });
    if (disposed || id !== generation) return;
    try {
      const response = await transport.list();
      if (disposed || id !== generation) return;
      if (response.status !== 200) {
        if (notice && last && last.status === 'records') show({ ...last, notice: `${notice} Unable to refresh messages.` });
        else show({ status: 'error', reason: errorReason(response.status) });
        return;
      }
      const body = await response.json();
      if (disposed || id !== generation) return;
      if (!object(body) || body.ok !== true || !Array.isArray(body.messages)) throw new Error('invalid response');
      let skipped = 0;
      const items = [];
      for (const raw of body.messages) { try { items.push(project(raw)); } catch { skipped++; } }
      const sorted = sortMessages(items);
      const open = sorted.filter((m) => m.status !== 'done');
      show({ status: sorted.length ? 'records' : 'empty', items: sorted, skipped, openCount: open.length,
        overdueCount: open.filter((m) => olderThanOneBusinessDay(m.receivedAt, now())).length, ...(notice ? { notice } : {}) });
    } catch {
      if (!disposed && id === generation) show({ status: 'error', reason: 'unknown' });
    }
  }
  return {
    load: () => load(),
    async update(id, patch) {
      if (disposed) return;
      let notice = 'Update failed.';
      try {
        const response = await transport.update(id, patch);
        if (response.status === 200) notice = 'Saved.';
        else if (response.status === 401) notice = 'Access not authorized.';
        else if (response.status === 404) notice = 'Message no longer exists.';
        else if (response.status === 400) notice = 'Update rejected (invalid value).';
      } catch { /* keep failure notice */ }
      await load(notice);
    },
    dispose() { disposed = true; ++generation; },
  };
}

const STATUS_ID = 'site-bot-client-messages-status';
const BUTTON_CLASS = 'min-h-11 rounded-lg border border-[var(--accent)] px-4 py-2 text-sm font-semibold disabled:opacity-50';

export function renderClientInbox(root, state, actions = {}) {
  const doc = root.ownerDocument;
  // The status line stays mounted across renders so screen readers announce save results.
  let message = root.firstChild;
  if (!message || message.id !== STATUS_ID) {
    root.replaceChildren();
    message = doc.createElement('p');
    message.id = STATUS_ID;
    message.setAttribute('role', 'status');
    message.setAttribute('aria-live', 'polite');
    root.append(message);
  } else {
    while (root.lastChild !== message) root.removeChild(root.lastChild);
  }
  const labels = { loading: 'Loading messages...', empty: 'No client messages.', records: 'Client messages',
    error: state.reason === 'unauthorized' ? 'Access not authorized.' : state.reason === 'unavailable' ? 'Client messages are turned off or unavailable.' : 'Unable to load messages.' };
  message.textContent = state.notice ? `${labels[state.status]} - ${state.notice}` : (labels[state.status] ?? 'Unable to load messages.');
  if (state.status !== 'records' && state.status !== 'empty') return;
  const counts = doc.createElement('p');
  counts.textContent = `Open: ${state.openCount ?? 0}. Open for more than one business day: ${state.overdueCount ?? 0}.`;
  root.append(counts);
  if (state.skipped > 0) {
    const skipped = doc.createElement('p');
    skipped.textContent = `Skipped ${state.skipped} unexpected row${state.skipped === 1 ? '' : 's'}.`;
    root.append(skipped);
  }
  if (state.status !== 'records') return;
  const list = doc.createElement('ul');
  for (const item of state.items) list.append(renderItem(doc, item, actions, message));
  root.append(list);
}

function line(doc, label, ...parts) {
  const p = doc.createElement('p');
  p.append(`${label}: `, ...parts);
  return p;
}

function timeNode(doc, value) {
  const node = doc.createElement('time');
  node.setAttribute('datetime', value);
  node.textContent = formatIsraelTime(value);
  return node;
}

function renderItem(doc, item, actions, message) {
  const li = doc.createElement('li');
  li.className = 'my-4 rounded-lg border border-white/15 p-4';
  li.dataset.status = item.status;
  const head = doc.createElement('p');
  const idNode = doc.createElement('span');
  idNode.textContent = item.id.slice(0, 8);
  idNode.title = item.id;
  const badge = doc.createElement('span');
  badge.className = 'ms-2 rounded border border-white/30 px-2 text-xs';
  badge.textContent = item.kind === 'cancel_notice_due' ? 'Cancel notice due' : 'Client message';
  head.append(idNode, badge);
  li.append(head);
  li.append(line(doc, 'Business', item.business ?? '-'));
  li.append(line(doc, 'Email', item.email ?? '-'));
  li.append(line(doc, 'Mobile', item.mobile ?? '-'));
  li.append(line(doc, 'Received', timeNode(doc, item.receivedAt)));
  li.append(line(doc, 'Status', item.status));
  li.append(line(doc, 'Category', item.category ?? '-'));
  if (!item.staffAlerted) {
    const warn = doc.createElement('p');
    warn.className = 'text-amber-400';
    warn.textContent = 'Alert email not sent';
    li.append(warn);
  }
  if (item.kind === 'cancel_notice_due') {
    li.append(line(doc, 'Effective', item.meta?.effectiveAt ? timeNode(doc, item.meta.effectiveAt) : '-'));
    li.append(line(doc, 'Site offline on', item.meta?.siteOfflineAt ? timeNode(doc, item.meta.siteOfflineAt) : '-'));
    const checklist = doc.createElement('ul');
    for (const step of ['Send the cancel-day notice.', 'Send the notice 7 days before the site goes offline.', "Remove WAO's manager access to the Google profile."]) {
      const entry = doc.createElement('li');
      entry.textContent = step;
      checklist.append(entry);
    }
    li.append(checklist);
  } else {
    const body = doc.createElement('p');
    body.setAttribute('dir', 'auto');
    body.setAttribute('style', 'white-space: pre-wrap');
    body.textContent = item.body;
    li.append(body);
  }

  const controls = doc.createElement('div');
  controls.className = 'mt-2 flex flex-wrap items-center gap-2';
  const update = (patch, disable) => {
    for (const el of disable) el.disabled = true;
    const recover = () => { for (const el of disable) el.disabled = false; message.textContent = 'Client messages - Update failed.'; };
    if (typeof actions.update !== 'function') { recover(); return; }
    try { Promise.resolve(actions.update(item.id, patch)).catch(recover); } catch { recover(); }
  };
  for (const status of ['handling', 'done']) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = BUTTON_CLASS;
    button.textContent = status === 'handling' ? 'Mark handling' : 'Mark done';
    button.dataset.status = status;
    button.disabled = item.status === status || typeof actions.update !== 'function';
    button.addEventListener('click', () => update({ status }, [button]));
    controls.append(button);
  }
  const selectId = `cm-category-${item.id}`;
  const selectLabel = doc.createElement('label');
  selectLabel.setAttribute('for', selectId);
  selectLabel.textContent = 'Category';
  const select = doc.createElement('select');
  select.id = selectId;
  for (const value of ['', ...CATEGORIES]) {
    const option = doc.createElement('option');
    option.value = value;
    option.textContent = value || '(none)';
    if ((item.category ?? '') === value) option.selected = true;
    select.append(option);
  }
  select.addEventListener('change', () => update({ staffCategory: select.value || null }, [select]));
  controls.append(selectLabel, select);
  li.append(controls);

  const noteRow = doc.createElement('div');
  noteRow.className = 'mt-2 flex flex-wrap items-end gap-2';
  const noteId = `cm-note-${item.id}`;
  const noteLabel = doc.createElement('label');
  noteLabel.setAttribute('for', noteId);
  noteLabel.textContent = 'Internal note';
  const note = doc.createElement('textarea');
  note.id = noteId;
  note.maxLength = 1000;
  note.value = item.note;
  const save = doc.createElement('button');
  save.type = 'button';
  save.className = BUTTON_CLASS;
  save.textContent = 'Save note';
  save.addEventListener('click', () => update({ staffNote: note.value }, [save]));
  noteRow.append(noteLabel, note, save);
  const href = replyHref(item);
  if (href) {
    const link = doc.createElement('a');
    link.setAttribute('href', href);
    link.className = 'underline';
    link.textContent = 'Reply by email';
    noteRow.append(link);
  }
  li.append(noteRow);
  return li;
}
