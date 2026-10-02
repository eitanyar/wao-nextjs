import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { chmod, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const MAX_BODY_BYTES = 64 * 1024;
const MAX_ANSWER_LENGTH = 4000;
const MAX_NOTE_LENGTH = 2000;
const MAX_DRAFT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const UI_KEYS = ['title', 'intro', 'save', 'saving', 'saved', 'clearDraft', 'clearConfirm', 'missingStatus', 'draftStatus', 'approvedStatus', 'approveAnswer', 'approvalBlocked', 'progressSummary', 'privacyNotice', 'localOnlyNotice', 'loadError', 'saveError'];
const SECTION_IDS = ['businessFacts', 'mediaRights', 'leadRecipient', 'privacyRetention', 'seoDomain', 'ownershipLane'];
const SECTION_KEYS = ['id', 'title', 'question', 'helper', 'placeholder'];
const FINAL_KEYS = ['title', 'question', 'helper', 'attestation', 'approve', 'revoke'];
const QA_KEYS = ['schemaVersion', 'artifactPath', 'status', 'reviewedBy', 'reviewedAt', 'sha256', 'checks'];
const QA_CHECK_KEYS = ['schema', 'sabraRegister', 'singularMale', 'sentenceLength', 'clarity', 'rtlBidi', 'approvalSemantics', 'noUnsupportedClaims'];

function fail(message) {
  throw new Error(message);
}

function exactKeys(value, keys) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && JSON.stringify(Object.keys(value)) === JSON.stringify(keys);
}

function isString(value) {
  return typeof value === 'string' && value.length > 0 && !/[\r\n]/.test(value);
}

function parseIpv4(host) {
  if (typeof host !== 'string' || !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return null;
  const octets = host.split('.').map(Number);
  if (octets.some(value => value > 255 || String(value) !== String(Number(value)))) return null;
  return octets;
}

export function isAllowedHost(host) {
  const octets = parseIpv4(host);
  if (!octets) return false;
  const [a, b] = octets;
  return a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

export function parseArgs(args) {
  const options = { host: '127.0.0.1', port: 3197 };
  const seen = new Set();
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if ((option !== '--host' && option !== '--port') || seen.has(option) || index + 1 >= args.length) fail('Invalid arguments.');
    seen.add(option);
    const value = args[++index];
    if (option === '--host') options.host = value;
    else if (!/^\d+$/.test(value)) fail('Invalid arguments.');
    else options.port = Number(value);
  }
  if (!isAllowedHost(options.host) || !Number.isInteger(options.port) || options.port < 1024 || options.port > 65535) fail('Invalid arguments.');
  return options;
}

function assertCopySchema(copy) {
  if (!exactKeys(copy, ['schemaVersion', 'locale', 'dir', 'ui', 'sections', 'finalApproval']) || copy.schemaVersion !== 1 || copy.locale !== 'he-IL' || copy.dir !== 'rtl') fail('Copy schema is invalid.');
  if (!exactKeys(copy.ui, UI_KEYS) || !Object.values(copy.ui).every(isString)) fail('Copy schema is invalid.');
  if (!Array.isArray(copy.sections) || copy.sections.length !== SECTION_IDS.length) fail('Copy schema is invalid.');
  copy.sections.forEach((section, index) => {
    if (!exactKeys(section, SECTION_KEYS) || section.id !== SECTION_IDS[index] || !SECTION_KEYS.every(key => isString(section[key]))) fail('Copy schema is invalid.');
  });
  if (!exactKeys(copy.finalApproval, FINAL_KEYS) || !Object.values(copy.finalApproval).every(isString)) fail('Copy schema is invalid.');
}

function assertQaSchema(qa, digest, expectedHash) {
  if (!exactKeys(qa, QA_KEYS) || qa.schemaVersion !== 1 || qa.artifactPath !== 'docs/copy/site-bot-pilot-intake-notebook.json' || qa.status !== 'approved' || qa.reviewedBy !== 'waohebrewqa' || !/^\d{4}-\d{2}-\d{2}T/.test(qa.reviewedAt) || !/^[a-f0-9]{64}$/.test(qa.sha256) || qa.sha256 !== digest || (expectedHash && digest !== expectedHash)) fail('Copy approval is invalid.');
  if (!exactKeys(qa.checks, QA_CHECK_KEYS) || !Object.values(qa.checks).every(value => value === true)) fail('Copy approval is invalid.');
}

export async function loadApprovedCopy({ copyPath = join(ROOT, 'docs/copy/site-bot-pilot-intake-notebook.json'), qaPath = join(ROOT, 'docs/copy/site-bot-pilot-intake-notebook.qa.json'), expectedHash } = {}) {
  const [bytes, qaBytes] = await Promise.all([readFile(copyPath), readFile(qaPath, 'utf8')]);
  const digest = createHash('sha256').update(bytes).digest('hex');
  let copy;
  let qa;
  try {
    copy = JSON.parse(bytes.toString('utf8'));
    qa = JSON.parse(qaBytes);
  } catch {
    fail('Copy approval is invalid.');
  }
  assertCopySchema(copy);
  assertQaSchema(qa, digest, expectedHash);
  return copy;
}

function validText(value, limit) {
  return typeof value === 'string' && Array.from(value).length <= limit && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(value);
}

function blankDraft(copy, now) {
  return {
    schemaVersion: 1,
    updatedAt: now,
    sections: Object.fromEntries(copy.sections.map(section => [section.id, { answer: '', approved: false, approvedAt: null }])),
    finalApproval: { approved: false, note: '', approvedAt: null },
  };
}

function assertStoredDraft(draft) {
  if (!exactKeys(draft, ['schemaVersion', 'updatedAt', 'sections', 'finalApproval']) || draft.schemaVersion !== 1 || !Number.isFinite(draft.updatedAt) || !exactKeys(draft.sections, SECTION_IDS) || !exactKeys(draft.finalApproval, ['approved', 'note', 'approvedAt'])) fail('Stored draft is invalid.');
  for (const id of SECTION_IDS) {
    const section = draft.sections[id];
    if (!exactKeys(section, ['answer', 'approved', 'approvedAt']) || !validText(section.answer, MAX_ANSWER_LENGTH) || typeof section.approved !== 'boolean' || !(section.approvedAt === null || Number.isFinite(section.approvedAt))) fail('Stored draft is invalid.');
  }
  if (!validText(draft.finalApproval.note, MAX_NOTE_LENGTH) || typeof draft.finalApproval.approved !== 'boolean' || !(draft.finalApproval.approvedAt === null || Number.isFinite(draft.finalApproval.approvedAt))) fail('Stored draft is invalid.');
}

export function validateDraftPayload(payload, copy, prior, now = Date.now()) {
  if (!exactKeys(payload, ['sections', 'finalApproval']) || !exactKeys(payload.sections, SECTION_IDS) || !exactKeys(payload.finalApproval, ['approved', 'note'])) fail('Draft is invalid.');
  if (prior) assertStoredDraft(prior);
  const draft = blankDraft(copy, now);
  let changedAny = false;
  for (const id of SECTION_IDS) {
    const value = payload.sections[id];
    if (!exactKeys(value, ['answer', 'approved']) || !validText(value.answer, MAX_ANSWER_LENGTH) || typeof value.approved !== 'boolean') fail('Draft is invalid.');
    const answer = value.answer;
    const previous = prior?.sections[id];
    const changed = !previous || previous.answer !== answer;
    changedAny ||= Boolean(previous && changed);
    const approved = value.approved && answer.trim().length > 0 && (!previous || !changed);
    if (value.approved && answer.trim().length === 0) fail('Draft is invalid.');
    draft.sections[id] = { answer, approved, approvedAt: approved ? (previous?.approvedAt ?? now) : null };
  }
  if (!validText(payload.finalApproval.note, MAX_NOTE_LENGTH) || typeof payload.finalApproval.approved !== 'boolean') fail('Draft is invalid.');
  const allApproved = SECTION_IDS.every(id => draft.sections[id].approved);
  if (payload.finalApproval.approved && !allApproved && !changedAny) fail('Draft is invalid.');
  const previousFinal = prior?.finalApproval;
  const finalApproved = payload.finalApproval.approved && allApproved && !changedAny;
  draft.finalApproval = { approved: finalApproved, note: payload.finalApproval.note, approvedAt: finalApproved ? (previousFinal?.approvedAt ?? now) : null };
  return draft;
}

function draftPath(storageRoot) {
  return join(storageRoot, 'draft.json');
}

async function ensureStorage(storageRoot) {
  await mkdir(storageRoot, { recursive: true, mode: 0o700 });
  await chmod(storageRoot, 0o700);
}

export async function readDraft(storageRoot, now = Date.now()) {
  const path = draftPath(storageRoot);
  let details;
  try {
    details = await stat(path);
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
  if (now - details.mtimeMs > MAX_DRAFT_AGE_MS) {
    await rm(path, { force: true });
    return null;
  }
  let draft;
  try {
    draft = JSON.parse(await readFile(path, 'utf8'));
  } catch {
    fail('Stored draft is invalid.');
  }
  assertStoredDraft(draft);
  return draft;
}

export async function writeDraft(storageRoot, draft) {
  assertStoredDraft(draft);
  await ensureStorage(storageRoot);
  const path = draftPath(storageRoot);
  const temporary = join(storageRoot, `.draft-${randomBytes(16).toString('hex')}.tmp`);
  await writeFile(temporary, JSON.stringify(draft), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  await chmod(temporary, 0o600);
  await rename(temporary, path);
  await chmod(path, 0o600);
}

async function clearDraft(storageRoot) {
  await rm(draftPath(storageRoot), { force: true });
}

function headers(nonce, contentType) {
  return {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'self'; style-src 'nonce-${nonce}'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'`,
  };
}

function shell(nonce, token) {
  return `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="/?token=${token}"><title>Local notebook</title><style nonce="${nonce}">body{font-family:system-ui;margin:auto;max-width:48rem;padding:1rem;background:#f7f7f7}main{display:grid;gap:1rem}.card{background:#fff;padding:1rem;border-radius:.5rem}textarea{box-sizing:border-box;width:100%;min-height:7rem}.row{display:flex;gap:.5rem;justify-content:space-between;align-items:center}.status{font-weight:700}button{padding:.6rem}fieldset{border:0;padding:0;margin:0}@media(max-width:390px){body{padding:.5rem}.row{align-items:start;flex-direction:column}}</style></head><body><main id="app" aria-live="polite"></main><script nonce="${nonce}">(async()=>{const token=new URL(location.href).searchParams.get('token');if(!token)return;const api=path=>path+'?token='+encodeURIComponent(token);const app=document.querySelector('#app');let copy,draft;const status=value=>value.approved?'approved':value.answer.trim()?'draft':'missing';const derive=()=>{const counts={missing:0,draft:0,approved:0};copy.sections.forEach(section=>{counts[status(draft.sections[section.id])]++});const allApproved=counts.approved===copy.sections.length;return{counts,allApproved,finalApproved:allApproved&&draft.finalApproval.approved}};const request=async(path,options={})=>{const response=await fetch(api(path),options);if(!response.ok)throw new Error('request');return response.json()};const render=()=>{const derived=derive();const counts=derived.counts;app.replaceChildren();const title=document.createElement('h1');title.textContent=copy.ui.title;app.append(title);const intro=document.createElement('p');intro.textContent=copy.ui.intro;app.append(intro);const privacyNotice=document.createElement('p');privacyNotice.className='card';privacyNotice.textContent=copy.ui.privacyNotice;const localOnlyNotice=document.createElement('p');localOnlyNotice.className='card';localOnlyNotice.textContent=copy.ui.localOnlyNotice;app.append(privacyNotice,localOnlyNotice);copy.sections.forEach(section=>{const value=draft.sections[section.id];const state=status(value);const card=document.createElement('section');card.className='card';const heading=document.createElement('h2');heading.textContent=section.title;const question=document.createElement('p');question.textContent=section.question;const help=document.createElement('p');help.textContent=section.helper;const area=document.createElement('textarea');area.id='answer-'+section.id;area.value=value.answer;area.placeholder=section.placeholder;const row=document.createElement('div');row.className='row';const approval=document.createElement('label');const box=document.createElement('input');box.id='approve-'+section.id;box.type='checkbox';box.checked=value.approved;box.onchange=()=>{value.approved=box.checked;value.approvedAt=null;draft.finalApproval.approved=false;draft.finalApproval.approvedAt=null;render()};approval.append(box,document.createTextNode(copy.ui.approveAnswer));const label=document.createElement('span');label.className='status';label.dataset.state=state;label.textContent=copy.ui[state+'Status'];area.oninput=()=>{value.answer=area.value;value.approved=false;value.approvedAt=null;draft.finalApproval.approved=false;draft.finalApproval.approvedAt=null;const next=derive();label.dataset.state=status(value);label.textContent=copy.ui[label.dataset.state+'Status'];box.checked=false;progress.dataset.approvedCount=String(next.counts.approved);progress.textContent=copy.ui.progressSummary+': '+next.counts.approved+'/'+copy.sections.length;finalBox.checked=next.finalApproved;finalBox.disabled=!next.allApproved};row.append(approval,label);card.append(heading,question,help,area,row);app.append(card)});const progress=document.createElement('p');progress.id='approval-progress';progress.className='card';progress.dataset.approvedCount=String(counts.approved);progress.textContent=copy.ui.progressSummary+': '+counts.approved+'/'+copy.sections.length;app.append(progress);const final=document.createElement('section');final.className='card';const finalTitle=document.createElement('h2');finalTitle.textContent=copy.finalApproval.title;const finalQuestion=document.createElement('p');finalQuestion.textContent=copy.finalApproval.question;const attestation=document.createElement('p');attestation.textContent=copy.finalApproval.attestation;const noteId='final-note';const noteLabel=document.createElement('label');noteLabel.htmlFor=noteId;noteLabel.textContent=copy.finalApproval.helper;const note=document.createElement('textarea');note.id=noteId;note.value=draft.finalApproval.note;note.oninput=()=>{draft.finalApproval.note=note.value};const finalBox=document.createElement('input');finalBox.id='final-approval';finalBox.type='checkbox';finalBox.checked=derived.finalApproved;finalBox.disabled=!derived.allApproved;finalBox.onchange=()=>{draft.finalApproval.approved=finalBox.checked};const finalLabel=document.createElement('label');finalLabel.append(finalBox,document.createTextNode(copy.finalApproval.approve));final.append(finalTitle,finalQuestion,attestation,noteLabel,note,finalLabel);app.append(final);const actions=document.createElement('div');actions.className='row';const save=document.createElement('button');save.id='save-draft';save.textContent=copy.ui.save;save.onclick=async()=>{draft=await request('/api/draft',{method:'PUT',headers:{'content-type':'application/json',origin:location.origin},body:JSON.stringify({sections:Object.fromEntries(Object.entries(draft.sections).map(([id,value])=>[id,{answer:value.answer,approved:value.approved}])),finalApproval:{approved:draft.finalApproval.approved,note:draft.finalApproval.note}})});render()};const clear=document.createElement('button');clear.id='clear-draft';clear.textContent=copy.ui.clearDraft;clear.onclick=async()=>{await request('/api/draft',{method:'DELETE',headers:{origin:location.origin}});draft={sections:Object.fromEntries(copy.sections.map(s=>[s.id,{answer:'',approved:false}])),finalApproval:{approved:false,note:''}};render()};actions.append(save,clear);app.append(actions)};try{copy=await request('/api/copy');draft=await request('/api/draft');if(!draft)draft={sections:Object.fromEntries(copy.sections.map(s=>[s.id,{answer:'',approved:false}])),finalApproval:{approved:false,note:''}};render()}catch{app.textContent='Unable to load.'}})();</script></main></body></html>`;
}

async function body(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) fail('Body is too large.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    fail('Draft is invalid.');
  }
}

function send(response, status, nonce, contentType, value) {
  response.writeHead(status, headers(nonce, contentType));
  response.end(value);
}

export async function createNotebookServer({ copy, storageRoot = join(tmpdir(), 'wao-sitebot-pilot-intake'), now = () => Date.now(), token = randomBytes(32).toString('hex') }) {
  assertCopySchema(copy);
  await ensureStorage(storageRoot);
  await readDraft(storageRoot, now());
  const server = createServer(async (request, response) => {
    const nonce = randomBytes(16).toString('base64');
    try {
      const url = new URL(request.url, 'http://local.invalid');
      const supplied = url.searchParams.get('token');
      if (supplied !== token || url.searchParams.getAll('token').length !== 1) return send(response, 403, nonce, 'text/plain; charset=utf-8', 'Forbidden');
      const path = url.pathname;
      if (request.method === 'GET' && path === '/') return send(response, 200, nonce, 'text/html; charset=utf-8', shell(nonce, token));
      if (request.method === 'GET' && path === '/health') return send(response, 200, nonce, 'application/json; charset=utf-8', JSON.stringify({ ready: true }));
      if (!['/api/copy', '/api/draft'].includes(path)) return send(response, 404, nonce, 'text/plain; charset=utf-8', 'Not found');
      if (path === '/api/copy') {
        if (request.method !== 'GET') return send(response, 405, nonce, 'text/plain; charset=utf-8', 'Method not allowed');
        return send(response, 200, nonce, 'application/json; charset=utf-8', JSON.stringify(copy));
      }
      if (!['GET', 'PUT', 'DELETE'].includes(request.method)) return send(response, 405, nonce, 'text/plain; charset=utf-8', 'Method not allowed');
      if (request.method === 'GET') return send(response, 200, nonce, 'application/json; charset=utf-8', JSON.stringify(await readDraft(storageRoot, now())));
      const expectedOrigin = `http://${request.headers.host}`;
      if (request.headers.origin !== expectedOrigin) return send(response, 403, nonce, 'text/plain; charset=utf-8', 'Forbidden');
      if (request.method === 'DELETE') {
        await clearDraft(storageRoot);
        return send(response, 200, nonce, 'application/json; charset=utf-8', JSON.stringify({ cleared: true }));
      }
      const prior = await readDraft(storageRoot, now());
      const next = validateDraftPayload(await body(request), copy, prior, now());
      await writeDraft(storageRoot, next);
      return send(response, 200, nonce, 'application/json; charset=utf-8', JSON.stringify(next));
    } catch (error) {
      const status = error instanceof Error && error.message === 'Body is too large.' ? 413 : 400;
      return send(response, status, nonce, 'text/plain; charset=utf-8', status === 413 ? 'Request too large' : 'Invalid request');
    }
  });
  return { server, token };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const copy = await loadApprovedCopy();
  const notebook = await createNotebookServer({ copy });
  await new Promise((resolveListen, rejectListen) => notebook.server.once('error', rejectListen).listen(options.port, options.host, resolveListen));
  console.log(`NOTEBOOK_URL=http://${options.host}:${options.port}/?token=${notebook.token}`);
  const close = () => notebook.server.close(() => process.exit(0));
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error('Notebook startup failed.');
    process.exitCode = 1;
  });
}
