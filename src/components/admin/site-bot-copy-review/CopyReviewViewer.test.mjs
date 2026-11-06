import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = process.cwd();
const componentPath = 'src/components/admin/site-bot-copy-review/CopyReviewViewer.tsx';
const pagePath = 'src/app/(product)/admin/site-bot-copy-review/page.tsx';
const proxyPath = 'src/proxy.ts';
const endpoint = '/api/site-bot/research/copy-review';
const digest = 'a'.repeat(64);
const copy = headline => ({ heroHeadline: headline, heroSubheadline: 'Summary', heroCta: 'Contact',
  aboutBlurb: 'About', servicesHeadline: 'Services', faqHeadline: 'FAQ', guaranteeBlock: 'Guarantee',
  formHeadline: 'Contact', stickyBarLine: 'Call', aboutPageHeadline: 'About', aboutPageBody: 'About text',
  trustBarItems: [], serviceItems: [], faqItems: [{ q: 'Question', a: 'Answer' }], serviceDetails: [],
  nested: { rows: ['first', null, false, 0, '', '  spaced\nline', '<script>alert(1)</script>'],
    'a/b~c': [{ title: 'Nested' }, []], blank: {} }, emptyArray: [], emptyObject: {} });
const identities = [
  { opportunityId: 'home', classification: 'homepage', targetPath: '/' },
  { opportunityId: 'service', classification: 'money_service', targetPath: '/service' },
  { opportunityId: 'proof', classification: 'proof', targetPath: '/proof' },
];
const fixture = () => ({
  packet: { sha256: digest, researchId: 'research-alpha', slug: 'example-site', approvedPageId: 'home', pages: identities, pageCount: 3 },
  pages: identities.map((identity, i) => ({ ...identity, copy: copy(`PAGE_${i + 1}`), brief: 'SECRET_BRIEF' })),
  reviewStatus: 'pending_human_review', deployable: false, collectedData: 'SECRET_COLLECTED',
  evidence: 'SECRET_EVIDENCE', path: 'SECRET_PATH',
});

function load(source, imports, extra = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, source), 'utf8'), {
    fileName: source, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected import: ${name}`);
    return imports[name];
  }, AbortController, URLSearchParams, Object, Set, Number, String, ...extra }, { filename: source });
  return exports;
}
function nodes(element) {
  if (Array.isArray(element)) return element.flatMap(nodes);
  if (!element || typeof element !== 'object') return [];
  if (typeof element.type === 'function') return nodes(element.type(element.props));
  return [element, ...nodes(element.props.children)];
}
function deferred() {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
}
function viewer(fetchAdapter = () => { throw Error('Unexpected fetch'); }) {
  const state = [], refs = [];
  let cursor = 0;
  let refCursor = 0;
  const hooks = { ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
    useRef(initial) { const index = refCursor++; return refs[index] ??= { current: initial }; },
    useEffect() {},
  };
  const component = load(componentPath, { react: hooks, 'react/jsx-runtime': require('react/jsx-runtime') }, { fetch: fetchAdapter }).CopyReviewViewer;
  function tree() { cursor = 0; refCursor = 0; return component(); }
  const markup = () => renderToStaticMarkup(tree());
  const controls = () => {
    const all = nodes(tree());
    const inputs = all.filter(n => n.type === 'input');
    const buttons = all.filter(n => n.type === 'button');
    assert.equal(inputs.length, 2);
    assert.equal(buttons.length, 1);
    return { inputs, button: buttons[0] };
  };
  return { markup, controls };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
function select(view, researchId = 'research-alpha', slug = 'example-site') {
  view.controls().inputs[0].props.onChange({ target: { value: researchId } });
  view.controls().inputs[1].props.onChange({ target: { value: slug } });
}

test('actual component does not fetch until deliberate click; exact GET credentials and encoded query, no mutating control', async () => {
  const calls = [];
  const view = viewer(async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => fixture() }; });
  assert.match(view.markup(), /Draft only.*Hebrew QA and human approval remain pending.*Not deployable/);
  assert.equal(calls.length, 0);
  select(view);
  assert.equal(calls.length, 0);
  await view.controls().button.props.onClick();
  assert.equal(calls.length, 1);
  const { url, options } = calls[0];
  assert.equal(url, `${endpoint}?researchId=research-alpha&slug=example-site`);
  assert.equal(options.method, 'GET');
  assert.equal(options.credentials, 'same-origin');
  assert.equal(options.cache, 'no-store');
  assert.ok(options.signal);
  assert.doesNotMatch(view.markup(), /<form|type="submit"|Approve|Download|Save draft|SECRET_/i);
});

test('every copy primitive and empty container from three ordered pages renders escaped with isolated paths, not extra fields', async () => {
  const view = viewer(async () => ({ ok: true, json: async () => fixture() }));
  select(view);
  await view.controls().button.props.onClick();
  const html = view.markup();
  assert.ok(html.indexOf('PAGE_1') < html.indexOf('PAGE_2') && html.indexOf('PAGE_2') < html.indexOf('PAGE_3'));
  assert.equal((html.match(/aria-label="Page \d"/g) ?? []).length, 3);
  for (const marker of ['/copy/heroHeadline', '/copy/heroSubheadline', '/copy/heroCta', '/copy/aboutBlurb',
    '/copy/servicesHeadline', '/copy/faqHeadline', '/copy/guaranteeBlock', '/copy/formHeadline',
    '/copy/stickyBarLine', '/copy/aboutPageHeadline', '/copy/aboutPageBody', '/copy/trustBarItems',
    '/copy/serviceItems', '/copy/faqItems/0/q', '/copy/faqItems/0/a', '/copy/serviceDetails', '/copy/nested/rows/0', '/copy/nested/rows/1',
    '/copy/nested/rows/2', '/copy/nested/rows/3', '/copy/nested/rows/4', '/copy/nested/rows/5',
    '/copy/nested/rows/6', '/copy/nested/a~1b~0c/0/title', '/copy/nested/a~1b~0c/1',
    '/copy/nested/blank', '/copy/emptyArray', '/copy/emptyObject']) {
    assert.equal(html.split(`>${marker}</code>`).length - 1, 3, marker);
  }
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script|SECRET_|collectedData|brief|evidence/);
  assert.match(html, /\[empty array\]/);
  assert.match(html, /\[empty object\]/);
  assert.match(html, /SHA-256.*aaaaaaaa.*Review status.*pending_human_review.*Deployable.*false.*Page count.*3/s);
  assert.match(html, /dir="rtl" lang="he"/);
  assert.match(html, /<code dir="ltr"/);
  assert.match(html, /\[overflow-wrap:anywhere\]/);
});

test('401, 400, 404, 409, network and malformed success clear old draft without reflecting response bodies', async () => {
  const bad = [401, 400, 404, 409].map(status => ({ ok: false, status, json: () => { throw Error('Body must not be read'); } }));
  bad.push({ ok: true, json: async () => ({ ...fixture(), packet: { ...fixture().packet, pageCount: 4 }, privatePath: 'SECRET_PATH' }) });
  for (const failure of [...bad, new Error('SECRET_NETWORK')]) {
    let count = 0;
    const view = viewer(async () => {
      count++;
      if (count === 1) return { ok: true, json: async () => fixture() };
      if (failure instanceof Error) throw failure;
      return failure;
    });
    select(view);
    await view.controls().button.props.onClick();
    assert.match(view.markup(), /PAGE_1/);
    await view.controls().button.props.onClick();
    const html = view.markup();
    assert.doesNotMatch(html, /PAGE_1|SECRET_|aaaaaaaaaaaaaaaa/);
    assert.match(html, /Review unavailable/);
  }
});

test('selection changes abort/clear old data and stale responses cannot overwrite new selection', async () => {
  const first = deferred();
  const calls = [];
  const view = viewer((url, options) => {
    calls.push({ url, signal: options.signal });
    if (calls.length === 1) return first.promise;
    return Promise.resolve({ ok: true, json: async () => ({ ...fixture(), packet: { ...fixture().packet, researchId: 'research-beta' }, pages: fixture().pages.map(p => ({ ...p, copy: copy('NEW_ONLY') })) }) });
  });
  select(view);
  const pending = view.controls().button.props.onClick();
  assert.equal(view.controls().button.props.disabled, true);
  view.controls().inputs[0].props.onChange({ target: { value: 'research-beta' } });
  assert.equal(calls[0].signal.aborted, true);
  assert.doesNotMatch(view.markup(), /PAGE_1|aaaaaaaaaaaaaaaa/);
  await view.controls().button.props.onClick();
  first.resolve({ ok: true, json: async () => fixture() });
  await pending;
  await tick();
  assert.match(view.markup(), /NEW_ONLY/);
  assert.doesNotMatch(view.markup(), /PAGE_1/);
  assert.equal(calls.length, 2);
});

test('invalid identifiers and inconsistent page inventory or invalid copy fail closed before display', async () => {
  const calls = [];
  const invalid = viewer((...args) => { calls.push(args); throw Error('Unexpected call'); });
  select(invalid, '../bad', 'example-site');
  await invalid.controls().button.props.onClick();
  assert.equal(calls.length, 0);
  for (const broken of [
    { ...fixture(), pages: fixture().pages.slice(0, 2) },
    { ...fixture(), pages: fixture().pages.map((p, i) => i === 1 ? { ...p, opportunityId: 'wrong' } : p) },
    { ...fixture(), pages: fixture().pages.map((p, i) => i === 2 ? { ...p, copy: { broken: [undefined] } } : p) },
    { ...fixture(), pages: fixture().pages.map((p, i) => i === 2 ? { ...p, copy: { ...p.copy, heroCta: undefined } } : p) },
    { ...fixture(), packet: { ...fixture().packet, approvedPageId: 'service' } },
  ]) {
    const view = viewer(async () => ({ ok: true, json: async () => broken }));
    select(view);
    await view.controls().button.props.onClick();
    assert.match(view.markup(), /Review unavailable/);
    assert.doesNotMatch(view.markup(), /PAGE_1|aaaaaaaaaaaaaaaa/);
  }
});

test('actual proxy and page require admin auth before page component or review request', async () => {
  const source = fs.readFileSync(path.join(root, proxyPath), 'utf8');
  assert.match(source, /'\/admin\/site-bot-copy-review\/\:path\*'/);
  const reads = [];
  let permitted = false;
  const admin = { ADMIN_COOKIE_NAME: 'admin-cookie', verifyAdminToken: async token => { reads.push(token); return permitted && token === 'valid'; },
    verifyAdminClientFixtureAccess: () => { throw Error('Unexpected fixture auth'); } };
  const proxy = load(proxyPath, {
    'next/server': { NextResponse: { redirect: url => ({ kind: 'redirect', url: String(url) }), next: () => ({ kind: 'next' }) } },
    '@/lib/client-auth': { COOKIE_NAME: 'client-cookie', verifyClientSession: () => { throw Error('Unexpected client auth'); } },
    '@/lib/admin-auth': admin,
  }).proxy;
  const request = token => ({ nextUrl: { pathname: '/admin/site-bot-copy-review', clone: () => ({ pathname: '', searchParams: { set(key, value) { this[key] = value; } }, toString() { return `${this.pathname}?next=${encodeURIComponent(this.searchParams.next)}`; } }) },
    cookies: { get: name => { assert.equal(name, 'admin-cookie'); return token ? { value: token } : undefined; } }, headers: { get: () => 'example.invalid' } });
  assert.match((await proxy(request())).url, /\/admin\/login\?next=%2Fadmin%2Fsite-bot-copy-review/);
  assert.match((await proxy(request('bad'))).url, /\/admin\/login\?next=%2Fadmin%2Fsite-bot-copy-review/);
  permitted = true;
  assert.equal((await proxy(request('valid'))).kind, 'next');
  let rendered = 0;
  const page = load(pagePath, {
    'next/headers': { cookies: async () => ({ get: name => { assert.equal(name, 'admin-cookie'); return { value: permitted ? 'valid' : 'bad' }; } }) },
    'next/navigation': { redirect: dest => { throw Object.assign(new Error('redirect'), { destination: dest }); } },
    '@/lib/admin-auth': admin,
    '@/components/admin/site-bot-copy-review/CopyReviewViewer': { CopyReviewViewer: () => { rendered++; return null; } },
    'react/jsx-runtime': require('react/jsx-runtime'),
  });
  assert.equal(page.dynamic, 'force-dynamic');
  assert.equal(page.metadata.robots.index, false);
  assert.equal(page.metadata.robots.follow, false);
  assert.equal(page.metadata.robots.nocache, true);
  permitted = false;
  await assert.rejects(page.default(), { destination: '/admin/login?next=%2Fadmin%2Fsite-bot-copy-review' });
  assert.equal(rendered, 0);
  permitted = true;
  renderToStaticMarkup(await page.default());
  assert.equal(rendered, 1);
  assert.deepEqual(reads, ['', 'bad', 'valid', 'bad', 'valid']);
});
