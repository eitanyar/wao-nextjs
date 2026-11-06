// Internal operator inbox. The server, not this UI, enforces access control.
// All values are rendered with textContent only.
const controls = /[\x00-\x1f\x7f-\x9f]/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const emailPattern = /^[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;
const keys = new Set(['requestId','displayName','name','phone','email','receivedAt','followUp']);
export const FOLLOW_UP_STATUSES = ['handling','done'];
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const field = (x,max) => typeof x === 'string' && !!x && x === x.trim() && x.length <= max && !controls.test(x);
const has = (x,k) => Object.hasOwn(x,k);
const iso = x => typeof x === 'string' && Number.isFinite(Date.parse(x)) && new Date(x).toISOString() === x;
const INBOX_URL = '/api/admin/site-bot/help-requests/inbox';
const STATUS_URL = '/api/admin/site-bot/help-requests/status';

// Operator UI is English, but times are shown in Israel local time.
export function formatIsraelTime(value) {
  return new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Jerusalem' });
}

function projectFollowUp(f) {
  if (!object(f)) throw new Error('invalid follow-up');
  if (f.status === 'received' && Object.keys(f).length === 1) return {status:'received'};
  if (!FOLLOW_UP_STATUSES.includes(f.status) || !iso(f.updatedAt) || f.updatedBy !== 'admin' || Object.keys(f).length !== 3) throw new Error('invalid follow-up');
  return {status:f.status,updatedAt:f.updatedAt,updatedBy:f.updatedBy};
}
export function project(r) {
  if (!object(r) || Object.keys(r).some(k=>!keys.has(k)) || typeof r.requestId !== 'string' || !uuid.test(r.requestId) ||
      !field(r.name,120) || typeof r.displayName !== 'string' || !r.displayName.trim() || controls.test(r.displayName) ||
      (has(r,'phone') && !field(r.phone,40)) || (has(r,'email') && (!field(r.email,254) || !emailPattern.test(r.email))) ||
      (!has(r,'phone') && !has(r,'email')) || !iso(r.receivedAt)) throw new Error('invalid record');
  return {requestId:r.requestId,displayName:r.displayName,name:r.name,...(has(r,'email')?{email:r.email}:{}),...(has(r,'phone')?{phone:r.phone}:{}),
    receivedAt:r.receivedAt,followUp:projectFollowUp(r.followUp)};
}
export function createSameOriginTransport(fetchFn = globalThis.fetch) {
  const base = {credentials:'same-origin', cache:'no-store', redirect:'error'};
  return {
    list: () => fetchFn(INBOX_URL, {...base, method:'GET'}),
    setStatus: (requestId, status) => fetchFn(STATUS_URL, {...base, method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({requestId,status})}),
  };
}
function errorReason(status) { return status === 401 ? 'unauthorized' : status === 503 ? 'unavailable' : 'unknown'; }
export function createInbox({transport,render}) {
  let generation = 0, disposed = false, last = null;
  const show = state => { last = state; render(state); };
  async function load(notice) {
    if (disposed) return;
    const id = ++generation;
    const failed = state => {
      if (notice && last && last.status === 'records') show({...last, notice: `${notice} Unable to refresh requests.`});
      else show(state);
    };
    if (!last || last.status !== 'records') show({status:'loading'});
    // A synchronous render can dispose or trigger another load.
    if (disposed || id !== generation) return;
    try {
      const response = await transport.list();
      if (disposed || id !== generation) return;
      if (response.status !== 200) { failed({status:'error',reason:errorReason(response.status)}); return; }
      const body = await response.json();
      if (disposed || id !== generation) return;
      if (!object(body) || body.ok !== true || !Array.isArray(body.requests) || !Number.isSafeInteger(body.skipped) || body.skipped < 0) throw new Error('invalid response');
      const records = body.requests.map(project);
      show({status:records.length ? 'records' : 'empty', records, skipped:body.skipped, ...(notice ? {notice} : {})});
    } catch {
      if (!disposed && id === generation) failed({status:'error',reason:'unknown'});
    }
  }
  return {
    load: () => load(),
    async setStatus(requestId, status) {
      if (disposed || !FOLLOW_UP_STATUSES.includes(status)) return;
      let notice = 'Status update failed.';
      try {
        const response = await transport.setStatus(requestId, status);
        if (response.status === 200) notice = 'Status saved.';
        else if (response.status === 401) notice = 'Access not authorized.';
        else if (response.status === 404) notice = 'Request no longer exists.';
      } catch { /* keep failure notice */ }
      await load(notice);
    },
    dispose() { disposed = true; ++generation; },
  };
}
const STATUS_ID = 'site-bot-help-inbox-status';
export function renderInbox(root,state,actions = {}) {
  const doc = root.ownerDocument;
  // The status line stays mounted across renders so screen readers announce save results.
  let message = root.firstChild;
  if (!message || message.id !== STATUS_ID) {
    root.replaceChildren();
    message = doc.createElement('p');
    message.id = STATUS_ID;
    message.setAttribute('role','status');
    message.setAttribute('aria-live','polite');
    root.append(message);
  } else {
    while (root.lastChild !== message) root.removeChild(root.lastChild);
  }
  const messages = {loading:'Loading requests...',empty:'No requests.',records:'Requests',error:state.reason === 'unauthorized' ? 'Access not authorized.' : state.reason === 'unavailable' ? 'Requests are temporarily unavailable.' : 'Unable to load requests.'};
  message.textContent = state.notice ? `${messages[state.status]} - ${state.notice}` : (messages[state.status] ?? 'Unable to load requests.');
  if (state.status !== 'records' && state.status !== 'empty') return;
  if (state.skipped > 0) {
    const skipped = doc.createElement('p');
    skipped.textContent = `Skipped ${state.skipped} unreadable or unexpected file${state.skipped === 1 ? '' : 's'}.`;
    root.append(skipped);
  }
  if (state.status !== 'records') return;
  const list = doc.createElement('ul');
  for (const record of state.records) {
    const item = doc.createElement('li');
    item.className = 'my-4 rounded-lg border border-white/15 p-4';
    const time = value => {
      const node = doc.createElement('time');
      node.setAttribute('datetime', value);
      node.textContent = formatIsraelTime(value);
      return node;
    };
    const lines = [['Request', [record.requestId.slice(0,8)]],['Business',[record.displayName]],['Contact',[record.name]],
      ['Email',record.email === undefined ? undefined : [record.email]],['Phone',record.phone === undefined ? undefined : [record.phone]],['Received',[time(record.receivedAt)]],
      ['Follow-up', record.followUp.updatedAt ? [`${record.followUp.status} (by ${record.followUp.updatedBy}, `, time(record.followUp.updatedAt), ')'] : [record.followUp.status]]];
    for (const [label,parts] of lines) {
      if (parts === undefined) continue;
      const line = doc.createElement('p');
      line.append(`${label}: `, ...parts);
      if (label === 'Request') line.title = record.requestId;
      item.append(line);
    }
    const buttons = doc.createElement('div');
    buttons.className = 'mt-2 flex gap-2';
    for (const status of FOLLOW_UP_STATUSES) {
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'min-h-11 rounded-lg border border-[var(--accent)] px-4 py-2 text-sm font-semibold disabled:opacity-50';
      button.textContent = status === 'handling' ? 'Mark handling' : 'Mark done';
      button.dataset.status = status;
      button.disabled = record.followUp.status === status || typeof actions.setStatus !== 'function';
      button.addEventListener('click', () => {
        const all = [...buttons.querySelectorAll('button')];
        for (const b of all) b.disabled = true;
        const recover = () => {
          for (const b of all) b.disabled = b.dataset.status === record.followUp.status;
          message.textContent = 'Requests - Status update failed.';
        };
        try { Promise.resolve(actions.setStatus(record.requestId, status)).catch(recover); } catch { recover(); }
      });
      buttons.append(button);
    }
    item.append(buttons);
    list.append(item);
  }
  root.append(list);
}
