import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { createHelpSubmission, helpAttemptKey } from '../../../../lib/site-bot/helpSubmission.mjs';

const repository = fileURLToPath(new URL('../../../../../', import.meta.url));
const pagePath = fileURLToPath(new URL('./page.tsx', import.meta.url));
const local = relative => path.join(repository, relative);
const fail = message => { throw new Error(`Unexpected capability: ${message}`); };
function load(file, imports = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports, require(name) {
    assert.ok(Object.hasOwn(imports, name), `unexpected import: ${name}`);
    return imports[name];
  }, URL, URLSearchParams, AbortController, setTimeout, clearTimeout, queueMicrotask,
  fetch: () => fail('network'), console: { log: fail, error: fail, warn: fail },
  process: Object.freeze({ env: Object.freeze({}) }), ...globals }, { filename: file });
  return exports;
}
const copy = load(local('src/lib/site-bot/auditJourneyCopy.ts')).AUDIT_JOURNEY_COPY;
const scoreCopy = load(local('src/lib/site-bot/scorecardCopy.ts')).SCORECARD_COPY;
const acquisitionCopy = load(local('src/lib/site-bot/acquisitionCopy.ts')).ACQUISITION_COPY;
const stateModule = load(local('src/lib/site-bot/auditJourneyState.ts'));
// Approved help-form copy is asserted from the same JSON module the page imports, never typed here.
const helpCopy = JSON.parse(fs.readFileSync(local('src/content/site-bot-help-form-copy.json'), 'utf8'));
// M1 (F1): the real buy-CTA slot module. These harnesses render the page without the audit
// layout, i.e. with the paid-flow gate closed, so the slot must render nothing (prod output).
const intakeCopy = load(local('src/lib/site-bot/intakeCopy.ts'));
const paidBuyCta = load(fileURLToPath(new URL('./paidBuyCta.tsx', import.meta.url)), {
  react: React, 'react/jsx-runtime': jsx, 'next/link': { __esModule: true, default: props => React.createElement('a', props) },
  '@/lib/site-bot/intakeCopy': intakeCopy,
});
const fakeDocument = { elements: {}, getElementById(key) { return this.elements[key] ?? null; } };
const privacyStub = props => React.createElement('input', { type: 'checkbox', checked: props.checked, onChange: props.onChange });
const id = '123e4567-e89b-42d3-a456-426614174000';
const otherId = '123e4567-e89b-42d3-a456-426614174001';
const keys = ['categories', 'hours', 'phone_website', 'photos', 'reviews', 'description'];
const score = (status = 'pass') => ({ total: 6, passed: status === 'pass' ? 6 : 0, failed: status === 'fail' ? 6 : 0,
  unknown: status === 'unknown' ? 6 : 0, dimensions: keys.map(key => ({ key, status, evidence: 'synthetic internal only', copyToken: `DIM_${key.toUpperCase()}_TITLE` })) });
const candidate = n => ({ placeId: `place-${n}`, displayName: `Synthetic Business ${n}`, formattedAddress: `Synthetic Address ${n}` });
const ready = (n = 1, status = 'pass') => ({ status: 'ready', placeId: candidate(n).placeId, businessName: candidate(n).displayName,
  formattedAddress: candidate(n).formattedAddress, score: score(status) });
const response = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function nodes(element) {
  if (Array.isArray(element)) return element.flatMap(nodes);
  if (!element || typeof element !== 'object') return [];
  return [element, ...nodes(element.props?.children)];
}
const escaped = text => renderToStaticMarkup(React.createElement('span', null, text)).slice(6, -7);
const views = [];
test.afterEach(() => { for (const view of views.splice(0)) view.unmount(); });
function harness(initial = '', adapter = () => fail('unplanned fetch'), storage = new Map()) {
  const slots = [], effects = [], calls = [];
  let cursor = 0, dirty = true, tree, mounted = true, writes = 0;
  const location = { href: `https://example.invalid/site-bot/audit?keep=one${initial}#retained` };
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const hooks = { ...React,
    useState(initialValue) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initialValue === 'function' ? initialValue() : initialValue;
      return [slots[i], value => {
        assert.ok(mounted, 'no state writes after unmount'); writes++;
        const next = typeof value === 'function' ? value(slots[i]) : value;
        if (!Object.is(next, slots[i])) { slots[i] = next; dirty = true; }
      }];
    },
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useCallback(fn, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) slots[i] = { fn, deps };
      return slots[i].fn;
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) {
        const previous = slots[i];
        slots[i] = { deps, cleanup: previous?.cleanup };
        effects.push(() => { slots[i].cleanup?.(); slots[i].cleanup = fn(); });
      }
    },
  };
  const page = load(pagePath, { react: hooks, 'react/jsx-runtime': jsx,
    'next/navigation': { useSearchParams: () => new URL(location.href).searchParams },
    'next/link': { __esModule: true, default: props => React.createElement('a', props) },
    '@/lib/site-bot/acquisitionCopy': { ACQUISITION_COPY: acquisitionCopy },
    '@/lib/site-bot/scorecardCopy': { SCORECARD_COPY: scoreCopy },
    '@/lib/site-bot/auditJourneyCopy': { AUDIT_JOURNEY_COPY: copy },
    '@/lib/site-bot/auditJourneyState': stateModule,
    '@/lib/site-bot/helpSubmission.mjs': { createHelpSubmission, helpAttemptKey },
    '@/components/PrivacyConsent': { __esModule: true, default: privacyStub },
    '@/content/site-bot-help-form-copy.json': helpCopy,
    './paidBuyCta': paidBuyCta,
  }, { document: fakeDocument, crypto: { randomUUID: () => otherId }, window: { location,
    sessionStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    history: { replaceState(_state, _unused, url) { location.href = String(url); dirty = true; } } },
    fetch(url, options) {
      assert.ok(url === '/api/site-bot/audit-lookup' || url.startsWith('/api/site-bot/audit-result?') || url === '/api/site-bot/help-request' || url === '/api/site-bot/help-request/recover');
      if (url === '/api/site-bot/audit-lookup') {
        assert.equal(options.method, 'POST');
        assert.deepEqual(Object.keys(JSON.parse(options.body)), ['businessName']);
      } else if (!url.startsWith('/api/site-bot/help-request')) assert.equal(options.method, undefined);
      calls.push({ url, options });
      return adapter(url, options, calls.length);
    } });
  // Call the actual child used by the default Suspense page, without exporting a test-only component.
  const component = page.default().props.children.type;
  function render() {
    if (dirty) { cursor = 0; dirty = false; tree = component(); }
    return tree;
  }
  const view = {
    calls, location,
    tree: render,
    html: () => renderToStaticMarkup(render()),
    all: () => nodes(render()),
    button: text => {
      const found = nodes(render()).find(node => node.type === 'button' && nodes(node).length &&
        renderToStaticMarkup(node).includes(escaped(text)));
      assert.ok(found, 'expected actual button'); return found;
    },
    async flush() {
      for (let i = 0; i < 8; i++) { render(); while (effects.length) effects.shift()(); await tick(); }
      render();
    },
    commitEffects() { render(); while (effects.length) effects.shift()(); },
    navigate(query) { location.href = `https://example.invalid/site-bot/audit?keep=one${query}#retained`; dirty = true; render(); },
    lookupCallback(name = 'Synthetic Lookup') {
      const input = nodes(render()).find(node => node.type === 'input');
      assert.ok(input); input.props.onChange({ target: { value: name } });
      const submit = nodes(render()).find(node => node.type === 'form').props.onSubmit;
      return () => submit({ preventDefault() {} });
    },
    submit(name) { return this.lookupCallback(name)(); },
    unmount() {
      if (!mounted) return;
      for (const slot of slots) slot?.cleanup?.();
      effects.length = 0; mounted = false;
    },
    writes: () => writes,
  };
  views.push(view); render();
  return view;
}
const noReport = view => assert.doesNotMatch(view.html(), /data-dimension=|data-audit-id=/);
function report(view, audit = id, place = 'place-1') {
  const html = view.html();
  assert.ok(html.includes(`data-audit-id="${audit}"`) && html.includes(`data-place-id="${place}"`));
  assert.equal(view.all().filter(node => node.props?.['data-dimension']).length, 6);
  const url = new URL(view.location.href);
  assert.equal(url.searchParams.get('auditId'), audit);
  assert.equal(url.searchParams.get('placeId'), place);
  assert.equal(url.searchParams.get('keep'), 'one'); assert.equal(url.hash, '#retained');
}
async function confirm(view) { view.button(copy.SB_CONFIRM_YES).props.onClick(); await view.flush(); }

test('fresh sole lookup requires name/address confirmation, authoritative tuple and preserved URL; rejection clears everything', async () => {
  const view = harness('', async url => response(url === '/api/site-bot/audit-lookup' ? { auditId: id } : ready()));
  await view.flush();
  assert.ok(view.html().includes(escaped(acquisitionCopy.ENTRY_HERO_HEADLINE)));
  assert.ok(view.html().includes('/privacy'));
  assert.equal(view.calls.length, 0);
  await view.submit(); await view.flush(); noReport(view);
  assert.ok(view.html().includes('Synthetic Business 1') && view.html().includes('Synthetic Address 1'));
  assert.equal(new URL(view.location.href).searchParams.get('auditId'), null);
  view.button(copy.SB_CONFIRM_NO).props.onClick(); await view.flush(); noReport(view);
  assert.ok(view.all().some(n => n.type === 'form'));
  await view.submit(); await view.flush(); await confirm(view); report(view);
  assert.deepEqual(JSON.parse(view.calls[0].options.body), { businessName: 'Synthetic Lookup' });
  assert.equal(view.calls.length, 4);
});

test('M1: with the paid-flow gate closed the confirmed report carries the CTA slot but renders no CTA or start link', async () => {
  const view = harness('', async url => response(url === '/api/site-bot/audit-lookup' ? { auditId: id } : ready()));
  await view.flush(); await view.submit(); await view.flush(); await confirm(view); report(view);
  const slot = view.all().find(node => node.type === paidBuyCta.PaidBuyCtaSlot);
  assert.ok(slot, 'slot sits in the confirmed report');
  assert.deepEqual([slot.props.auditId, slot.props.placeId], [id, 'place-1']);
  const html = view.html();
  assert.doesNotMatch(html, /data-paid-buy-cta|\/site-bot\/start/);
  assert.equal(html.includes(intakeCopy.INTAKE_COPY.M1_CTA_LABEL), false);
});

test('confirmed report keeps the free result visible and permits an optional consented durable help request', async () => {
  const view = harness('', async url => response(url === '/api/site-bot/audit-lookup' ? { auditId: id } :
    url.startsWith('/api/site-bot/audit-result?') ? ready() : { ok: true, requestId: otherId, status: 'received' }));
  await view.flush(); await view.submit(); await view.flush(); await confirm(view); report(view);
  const form = view.all().find(node => node.type === 'form' && node.props['data-help-form']);
  assert.ok(form, 'help form appears only after confirmation');
  assert.ok(view.all().some(node => node.type === 'h2' && node.props.children === helpCopy.HELP_FORM_HEADING));
  assert.ok(!view.all().some(node => node.type === 'h2' && node.props.children === scoreCopy.CTA_TRIAL));
  await form.props.onSubmit({ preventDefault() {} }); await view.flush();
  assert.equal(view.calls.length, 2, 'no consent means no request');
  view.all().find(node => node.type === privacyStub).props.onChange(true); await view.flush();
  for (const [field, value] of [['name', 'Synthetic Contact'], ['phone', '0500000000']]) {
    view.all().find(node => node.type === 'input' && node.props.name === field).props.onChange({ target: { value } });
  }
  await view.flush();
  assert.equal(view.all().find(node => node.type === 'button' && node.props.type === 'submit').props.disabled, false);
  assert.equal(stateModule.identityQuery(view.location.href), JSON.stringify([id, 'place-1']));
  await view.all().find(node => node.type === 'form' && node.props['data-help-form']).props.onSubmit({ preventDefault() {} });
  await view.flush(); report(view);

  const sent = view.calls.at(-1);
  assert.equal(sent.url, '/api/site-bot/help-request');
  assert.deepEqual(JSON.parse(sent.options.body), { requestId: otherId, auditId: id, placeId: 'place-1',
    name: 'Synthetic Contact', phone: '0500000000', privacyAccepted: true });
});

test('uncertain customer form locks edits, but explicit retry after reload keeps the original request ID', async () => {
  const storage = new Map();
  const adapter = async url => url.startsWith('/api/site-bot/audit-result?') ? response(ready()) :
    url === '/api/site-bot/help-request' ? Promise.reject(Error('lost receipt')) : fail(url);
  const view = harness(`&auditId=${id}`, adapter, storage);
  await view.flush(); await confirm(view);
  view.all().find(node => node.type === privacyStub).props.onChange(true);
  for (const [field, value] of [['name', 'Synthetic Contact'], ['phone', '0500000000']])
    view.all().find(node => node.type === 'input' && node.props.name === field).props.onChange({ target: { value } });
  await view.flush();
  assert.equal(view.all().find(node => node.type === 'button' && node.props.type === 'submit').props.disabled, false);
  await view.all().find(node => node.props?.['data-help-form']).props.onSubmit({ preventDefault() {} }); await view.flush();
  assert.equal(view.calls.length, 2);
  const originalId = JSON.parse(view.calls[1].options.body).requestId;
  assert.equal(storage.size, 1);
  assert.ok(!view.all().some(node => node.props?.href === '/contact?ref=site-bot-audit#contact-form'));
  const reload = harness(`&auditId=${id}&placeId=place-1`, adapter, storage);
  await reload.flush(); await confirm(reload);
  assert.ok(reload.all().some(node => node.props?.role === 'alert'));
  reload.all().find(node => node.type === privacyStub).props.onChange(true);
  for (const [field, value] of [['name', 'Synthetic Contact'], ['phone', '0500000000']])
    reload.all().find(node => node.type === 'input' && node.props.name === field).props.onChange({ target: { value } });
  await reload.flush();
  assert.equal(reload.all().find(node => node.type === 'button' && node.props.type === 'submit').props.disabled, false);
  await reload.all().find(node => node.props?.['data-help-form']).props.onSubmit({ preventDefault() {} });
  assert.equal(reload.calls.length, 2);
  assert.equal(JSON.parse(reload.calls[1].options.body).requestId, originalId);
});

test('expired audit permits only pending receipt recovery with explicit consent', async () => {
  const storage = new Map([[helpAttemptKey({ auditId: id, placeId: 'place-1' }), `pending:${otherId}`]]);
  const adapter = async (url, options) => {
    if (url.startsWith('/api/site-bot/audit-result?')) return response({ error: 'not_found' }, 404);
    assert.equal(url, '/api/site-bot/help-request/recover');
    assert.equal(JSON.parse(options.body).requestId, otherId);
    return response({ ok: true, requestId: otherId, status: 'received' });
  };
  const view = harness(`&auditId=${id}&placeId=place-1`, adapter, storage);
  await view.flush();
  noReport(view);
  assert.ok(view.all().some(node => node.props?.['data-help-form']));
  for (const [field, value] of [['name', 'Synthetic Contact'], ['phone', '0500000000']])
    view.all().find(node => node.type === 'input' && node.props.name === field).props.onChange({ target: { value } });
  await view.flush();
  assert.equal(view.all().find(node => node.type === 'button' && node.props.type === 'submit').props.disabled, true);
  view.all().find(node => node.type === privacyStub).props.onChange(true);
  await view.flush();
  await view.all().find(node => node.props?.['data-help-form']).props.onSubmit({ preventDefault() {} });
  await view.flush();
  assert.equal(view.calls.length, 2);
  assert.equal(view.calls[1].url, '/api/site-bot/help-request/recover');
  const live = view.all().find(node => node.props?.['aria-live'] === 'polite' && node.props['data-help-live']);
  assert.ok(nodes(live).some(node => node.props?.['data-help-received']), 'receipt is announced inside the always-mounted live region');
  assert.ok(!view.all().some(node => node.props?.['data-help-form']));
  const noMarker = harness(`&auditId=${id}&placeId=place-1`, adapter);
  await noMarker.flush();
  assert.ok(!noMarker.all().some(node => node.props?.['data-help-form']));
  assert.equal(noMarker.calls.length, 1);
});

test('initial audit-only and explicit-place deep links are never confirmation; reload of confirmed URL asks again', async () => {
  for (const suffix of [`&auditId=${id}`, `&auditId=${id}&placeId=place-1`]) {
    const view = harness(suffix, async () => response(ready()));
    await view.flush(); noReport(view); await confirm(view); report(view);
    const reload = harness(`&auditId=${id}&placeId=place-1`, async () => response(ready()));
    await reload.flush(); noReport(reload);
    assert.ok(reload.button(copy.SB_CONFIRM_NO));
  }
});

test('multiple deliberate candidate click confirms only the matching minimized ready identity', async () => {
  const view = harness(`&auditId=${id}`, async url => response(new URL(url, 'https://example.invalid').searchParams.has('placeId') ? ready(2) :
    { status: 'pick', candidates: [candidate(1), candidate(2)] }));
  await view.flush(); noReport(view);
  assert.ok(view.html().includes(escaped(copy.SB_PICK_PROMPT)));
  const buttons = view.all().filter(n => n.type === 'button');
  assert.equal(buttons.length, 2); assert.ok(view.html().includes('Synthetic Address 2'));
  await buttons[1].props.onClick(); await view.flush(); report(view, id, 'place-2');
  assert.doesNotMatch(view.html(), /Synthetic Business 1/);
  assert.ok(view.calls[1].url.includes('placeId=place-2'));
});

test('zero candidates and HTTP 404 use reviewed no-match without claiming missing profile', async () => {
  for (const result of [response({ status: 'not_found' }), response({}, 404)]) {
    const view = harness(`&auditId=${id}`, async () => result); await view.flush(); noReport(view);
    assert.ok(view.html().includes(escaped(copy.SB_NOMATCH_TITLE)));
    assert.ok(view.html().includes(escaped(copy.SB_NOMATCH_BODY)));
    assert.ok(view.all().some(node => node.props?.href === '/site-bot/audit' && node.props.children === acquisitionCopy.ENTRY_CTA_BUTTON));
  }
});

test('malformed ready tuple, explicit mismatch, malformed score/pick and invalid audit never expose findings', async () => {
  const invalid = [null, {}, { ...ready(), placeId: '' }, { ...ready(), businessName: '  ' },
    { ...ready(), formattedAddress: null }, { ...ready(), score: {} },
    { ...ready(), score: { ...score(), passed: 5 } },
    { ...ready(), score: { ...score(), dimensions: [score().dimensions[0], ...score().dimensions.slice(0, 5)] } },
    { ...ready(), placeId: 'wrong' }, { status: 'pick', candidates: [candidate(1)] }];
  for (const data of invalid) {
    const view = harness(`&auditId=${id}&placeId=place-1`, async () => response(data)); await view.flush(); noReport(view);
    assert.ok(view.html().includes(escaped(scoreCopy.FORM_ERROR_GENERIC)));
  }
  const view = harness('&auditId=invalid', () => fail('invalid audit fetch')); await view.flush(); noReport(view);
  assert.equal(view.calls.length, 0);
  const blankPlace = harness(`&auditId=${id}&placeId=`, async () => response(ready()));
  await blankPlace.flush(); noReport(blankPlace);
  assert.ok(blankPlace.html().includes(escaped(scoreCopy.FORM_ERROR_GENERIC)));
});

test('candidate selection rejects authoritative name, address and place substitutions', async () => {
  for (const change of [{ placeId: 'wrong' }, { businessName: 'Other' }, { formattedAddress: 'Other' }]) {
    const view = harness(`&auditId=${id}`, async (_url, _options, count) => response(count === 1 ?
      { status: 'pick', candidates: [candidate(1), candidate(2)] } : { ...ready(2), ...change }));
    await view.flush(); await view.all().filter(n => n.type === 'button')[1].props.onClick(); await view.flush(); noReport(view);
    assert.ok(view.html().includes(escaped(scoreCopy.FORM_ERROR_GENERIC)));
    assert.equal(new URL(view.location.href).searchParams.get('placeId'), null);
  }
});

test('actual render escapes names/addresses and preserves report H1 and approved contact invitation', async () => {
  const view = harness(`&auditId=${id}`, async () => response({ ...ready(), businessName: '<script>name</script>', formattedAddress: '<img src=x onerror=bad>' }));
  await view.flush(); assert.doesNotMatch(view.html(), /<script|<img/);
  assert.ok(view.html().includes('&lt;script&gt;name&lt;/script&gt;') && view.html().includes('&lt;img'));
  await confirm(view); report(view); assert.doesNotMatch(view.html(), /<script|<img/);
  assert.ok(view.html().includes(escaped(scoreCopy.PAGE_TITLE)));
  const invitation = view.all().find(n => n.type === 'h2' && n.props.children === helpCopy.HELP_FORM_HEADING);
  assert.ok(invitation);
});

test('all six actual criteria render neutral reviewed statuses; only three failed keys have owner-first DIY; unknown never fixes', async () => {
  for (const status of ['pass', 'fail', 'unknown']) {
    const view = harness(`&auditId=${id}`, async () => response(ready(1, status)));
    await view.flush(); await confirm(view); report(view);
    const html = view.html();
    for (const token of ['SB_CHECKLIST_INTRO', 'SB_CHECKLIST_CANDOR']) assert.equal(html.split(escaped(copy[token])).length - 1, 1);
    const cards = view.all().filter(n => n.props?.['data-dimension']);
    for (const [i, card] of cards.entries()) {
      assert.equal(card.props['data-dimension'], keys[i]); assert.equal(card.props['data-status'], status);
      const rendered = renderToStaticMarkup(card);
      assert.ok(rendered.includes(escaped(scoreCopy[`DIM_${keys[i].toUpperCase()}_TITLE`])));
      const token = status === 'pass' ? 'SB_STATUS_CONFIRMED' : status === 'fail' ? 'SB_STATUS_MISSING' : 'SB_STATUS_UNKNOWN';
      assert.ok(rendered.includes(escaped(copy[token])));
      const diy = status === 'fail' && ['categories', 'hours', 'photos'].includes(keys[i]);
      assert.equal(rendered.includes(escaped(copy.SB_SELFFIX_ACCESS_NOTE)), diy);
      assert.equal(rendered.includes(escaped(copy.SB_MISSING_ACTION)), diy);
      if (diy) {
        const firstStep = copy[`SB_FIX_${keys[i].toUpperCase()}`].split('\n')[0];
        assert.ok(rendered.indexOf(escaped(copy.SB_MISSING_ACTION)) < rendered.indexOf(escaped(firstStep)));
      }
      assert.equal(rendered.includes(escaped(copy.SB_UNKNOWN_VERIFY)), status === 'unknown');
    }
    for (const token of Object.keys(scoreCopy).filter(k => /^(PAGE_SUBTITLE|SCORELINE|SEC_|STATUS_|DIY_|DIM_.*_(PASS|FAIL|UNKNOWN)$)/.test(k))) {
      if (scoreCopy[token] && scoreCopy[token].length > 20) assert.ok(!html.includes(escaped(scoreCopy[token])), `old unsupported token ${token}`);
    }
    assert.doesNotMatch(html, /synthetic internal only/);
    assert.ok(view.all().find(n => n.type === 'form' && n.props['data-help-form']), 'optional form does not gate the report');
    assert.equal(view.all().filter(n => n.type === 'button').length, 1);
  }
});

test('changed URL immediately hides confirmed report; failures clear identity with no retries', async () => {
  for (const failure of [response({}, 429), response({}, 500), response({}, 404), response({ status: 'not_found' }), response({}), new Error('PRIVATE')]) {
    const view = harness(`&auditId=${id}`, async (_url, _options, count) => {
      if (count === 1) return response(ready());
      if (failure instanceof Error) throw failure;
      return failure;
    });
    await view.flush(); await confirm(view); report(view);
    view.navigate(`&auditId=${otherId}`); noReport(view);
    await view.flush(); noReport(view); assert.doesNotMatch(view.html(), /Synthetic Business 1|PRIVATE/);
    assert.equal(view.calls.length, 2);
    if (failure.status === 429) assert.ok(view.html().includes(escaped(scoreCopy.FORM_ERROR_RATE)));
  }
});

test('late success, network error and deferred JSON cannot replace newer identity or apply finally; unmount aborts all writes', async () => {
  for (const mode of ['success', 'error', 'json', 'json-error']) {
    const old = deferred();
    const view = harness(`&auditId=${id}`, async (_url, _options, count) => {
      if (count > 1) return response(ready(2));
      if (mode.startsWith('json')) return { ok: true, status: 200, json: () => old.promise };
      return old.promise;
    });
    await view.flush(); assert.equal(view.calls.length, 1);
    view.navigate(`&auditId=${otherId}&placeId=place-2`); await view.flush();
    assert.equal(view.calls[0].options.signal.aborted, true);
    await confirm(view); report(view, otherId, 'place-2');
    const before = view.writes();
    if (mode.endsWith('error')) old.reject(new Error('PRIVATE_LATE'));
    else old.resolve(mode === 'json' ? ready() : response(ready()));
    await view.flush(); report(view, otherId, 'place-2'); assert.equal(view.writes(), before);
    assert.doesNotMatch(view.html(), /PRIVATE_LATE|Synthetic Business 1/);
  }
  for (const json of [false, true]) {
    const old = deferred();
    const view = harness(`&auditId=${id}`, async () => json ? { ok: true, status: 200, json: () => old.promise } : old.promise);
    await view.flush(); view.unmount(); const before = view.writes();
    assert.equal(view.calls[0].options.signal.aborted, true);
    old.resolve(json ? ready() : response(ready())); await tick(); await tick(); assert.equal(view.writes(), before);
  }
});

test('new lookup clears prior confirmation immediately and survives internal history update; stale lookup JSON cannot start result request', async () => {
  const old = deferred();
  const view = harness('', async (url, _options, count) => {
    if (count === 1) return { ok: true, status: 200, json: () => old.promise };
    if (url === '/api/site-bot/audit-lookup') return response({ auditId: otherId });
    return response(ready(2));
  });
  await view.flush();
  const submit = view.submit(); await view.flush();
  view.navigate(''); await view.flush();
  // Re-enter through a URL change to the form, then start the new actual form callback.
  view.navigate('&auditId=invalid'); await view.flush();
  view.navigate(''); await view.flush();
  await view.submit('New Lookup'); await view.flush(); noReport(view);
  const before = view.calls.length; old.resolve({ auditId: id }); await submit; await view.flush();
  assert.equal(view.calls.length, before); await confirm(view); report(view, otherId, 'place-2');
  view.navigate(''); await view.flush();
  await view.submit('Again'); await view.flush(); await confirm(view); report(view, otherId, 'place-2');
  // Begin another lookup from a real freshly loaded confirmation URL using its form transition.
  view.navigate('&auditId=invalid'); await view.flush();
  const pending = view.submit('After failure'); noReport(view); await pending; await view.flush();
  await confirm(view); report(view, otherId, 'place-2');
});

test('URL change before effects makes an old confirmation callback inert; unmount before initial microtask prevents lookup', async () => {
  const view = harness(`&auditId=${id}`, async () => response(ready()));
  await view.flush(); const yes = view.button(copy.SB_CONFIRM_YES);
  view.navigate(`&auditId=${otherId}`); yes.props.onClick(); noReport(view);
  await view.flush(); noReport(view);
  const untouched = harness(`&auditId=${id}`, () => fail('unmounted initial request'));
  untouched.commitEffects(); untouched.unmount(); await tick(); assert.equal(untouched.calls.length, 0);
});

test('new lookup callback immediately invalidates a confirmed tuple and survives internal URL cleanup', async () => {
  const next = deferred();
  const view = harness('', async (url, _options, count) => {
    if (url === '/api/site-bot/audit-lookup') return count === 1 ? response({ auditId: id }) : next.promise;
    return response(ready(count === 2 ? 1 : 2));
  });
  await view.flush(); const lookup = view.lookupCallback();
  await lookup(); await view.flush(); await confirm(view); report(view);
  const pending = lookup(); noReport(view);
  assert.equal(new URL(view.location.href).searchParams.get('placeId'), null);
  await view.flush(); assert.equal(view.calls[2].options.signal.aborted, false);
  next.resolve(response({ auditId: otherId })); await pending; await view.flush(); noReport(view);
  await confirm(view); report(view, otherId, 'place-2');
});

test('superseded candidate requests cannot substitute success, error or JSON for the latest deliberate selection', async () => {
  for (const mode of ['success', 'error', 'json']) {
    const old = deferred();
    const view = harness(`&auditId=${id}`, async (_url, _options, count) => {
      if (count === 1) return response({ status: 'pick', candidates: [candidate(1), candidate(2)] });
      if (count === 2) return mode === 'json' ? { ok: true, status: 200, json: () => old.promise } : old.promise;
      return response(ready(2));
    });
    await view.flush(); const buttons = view.all().filter(n => n.type === 'button');
    const first = buttons[0].props.onClick(); noReport(view); await view.flush();
    await buttons[1].props.onClick(); await view.flush(); report(view, id, 'place-2');
    assert.equal(view.calls[1].options.signal.aborted, true);
    const before = view.writes();
    if (mode === 'error') old.reject(new Error('PRIVATE_CANDIDATE'));
    else old.resolve(mode === 'json' ? ready() : response(ready()));
    await first; await view.flush(); report(view, id, 'place-2'); assert.equal(view.writes(), before);
  }
  const view = harness(`&auditId=${id}`, async () => response({ status: 'pick', candidates: [candidate(1), candidate(2)] }));
  await view.flush(); const oldPick = view.all().find(n => n.type === 'button');
  view.navigate(`&auditId=${otherId}`); await oldPick.props.onClick(); assert.equal(view.calls.length, 1); noReport(view);
});

test('actual page, route, helper and generated copy pass strict noEmit using installed real declarations, no runtime imports', () => {
  const options = { noEmit: true, strict: true, noUnusedLocals: true, noUnusedParameters: true, target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.ReactJSX,
    // Match tsconfig.json: installed Next bundled declaration internals are not app sources.
    // Real declarations still resolve all imports; strict checks cover every application source.
    esModuleInterop: true, resolveJsonModule: true, skipLibCheck: true, baseUrl: repository, paths: { '@/*': ['src/*'] },
    types: ['node', 'react', 'react-dom'], typeRoots: [local('node_modules/@types')], lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'] };
  const host = ts.createCompilerHost(options); host.writeFile = () => fail('compiler emit');
  const program = ts.createProgram([pagePath, local('src/app/api/site-bot/audit-result/route.ts'), local('src/lib/site-bot/auditJourneyState.ts'), local('src/lib/site-bot/auditJourneyCopy.ts')], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: f => f, getCurrentDirectory: () => repository, getNewLine: () => '\n' }));
  for (const relative of ['src/lib/site-bot/auditStore.ts', 'src/lib/gbp/auditScore.ts', 'node_modules/next/navigation.d.ts']) {
    assert.ok(program.getSourceFile(local(relative)), `real source declaration included: ${relative}`);
  }
});

test('external navigation supersedes an uncommitted internal URL update and a later history return still asks confirmation', async () => {
  const view = harness(`&auditId=${id}`, async url => response(ready(url.includes(otherId) ? 2 : 1)));
  await view.flush(); view.button(copy.SB_CONFIRM_YES).props.onClick();
  // External URL arrives before navigation effects consume the replaceState marker.
  view.navigate(`&auditId=${otherId}`); await view.flush(); noReport(view);
  view.navigate(`&auditId=${id}&placeId=place-1`); await view.flush(); noReport(view);
  assert.ok(view.button(copy.SB_CONFIRM_YES));
  assert.equal(view.calls.length, 3); await confirm(view); report(view);
});

test('canonical discovery includes the actual generator and page suites exactly once after help intake', () => {
  const manifest = JSON.parse(fs.readFileSync(local('package.json'), 'utf8'));
  const commands = manifest.scripts.test.split(' && ');
  const help = 'node --test src/app/api/site-bot/help-request/route.test.mjs';
  const generator = 'node --test scripts/build-audit-journey-copy.test.mjs';
  const page = "node --test 'src/app/(app)/site-bot/audit/page.test.mjs'";
  for (const command of [help, generator, page]) assert.equal(commands.filter(value => value === command).length, 1);
  assert.deepEqual(commands.slice(-3), [help, generator, page]);
  assert.equal(manifest.scripts.test.split('scripts/build-audit-journey-copy.test.mjs').length - 1, 1);
  assert.equal(manifest.scripts.test.split('src/app/(app)/site-bot/audit/page.test.mjs').length - 1, 1);
  assert.equal(pagePath, local('src/app/(app)/site-bot/audit/page.tsx'));
});

test('lookup rate, HTTP, malformed identity, JSON and network errors expose only the existing form error and never request findings', async () => {
  for (const failure of [response({}, 429), response({}, 404), response({}, 500), response({}), response({ auditId: 'bad' }),
    { ok: true, status: 200, json: async () => { throw new Error('PRIVATE_JSON'); } }, new Error('PRIVATE_NETWORK')]) {
    const view = harness('', async () => { if (failure instanceof Error) throw failure; return failure; });
    await view.flush(); await view.submit(); await view.flush(); noReport(view);
    assert.equal(view.calls.length, 1); assert.doesNotMatch(view.html(), /PRIVATE_/);
    assert.ok(view.html().includes(escaped(failure.status === 429 ? scoreCopy.FORM_ERROR_RATE : scoreCopy.FORM_ERROR_GENERIC)));
    assert.equal(view.all().find(n => n.type === 'input').props.disabled, false);
  }
});

test('superseded lookup success, rejection and JSON completion cannot launch another result or clear latest confirmation', async () => {
  for (const mode of ['success', 'error', 'json', 'json-error']) {
    const old = deferred();
    const view = harness('', async (url, _options, count) => {
      if (count === 1) return mode.startsWith('json') ? { ok: true, status: 200, json: () => old.promise } : old.promise;
      return response(url === '/api/site-bot/audit-lookup' ? { auditId: otherId } : ready(2));
    });
    await view.flush(); const lookup = view.lookupCallback();
    const first = lookup(); await view.flush();
    await lookup(); await view.flush(); noReport(view); await confirm(view); report(view, otherId, 'place-2');
    const before = view.writes();
    if (mode.endsWith('error')) old.reject(new Error('PRIVATE_LATE_LOOKUP'));
    else old.resolve(mode === 'json' ? { auditId: id } : response({ auditId: id }));
    await first; await view.flush(); report(view, otherId, 'place-2');
    assert.equal(view.calls.length, 3); assert.equal(view.writes(), before);
    assert.equal(view.calls[0].options.signal.aborted, true);
  }
});

const helpErrors = view => view.all().filter(node => node.props?.['data-help-error']).map(node => [node.props['data-help-error'], node.props.role, node.props.children]);
const liveRegion = view => view.all().filter(node => node.props?.['aria-live'] === 'polite' && node.props['data-help-live']);

test('help form wiring: approved copy, anchor, focusable heading, hint describes submit, live region always mounted', async () => {
  for (const key of ['HELP_FORM_HEADING', 'HELP_JUMP_LINK', 'HELP_EMAIL_LABEL', 'HELP_CONTACT_HINT', 'HELP_ERROR_RETRY', 'HELP_ERROR_BLOCKED'])
    assert.ok(typeof helpCopy[key] === 'string' && helpCopy[key].trim(), key);
  assert.equal(fs.readFileSync(local('src/content/site-bot-help-form-copy.json'), 'utf8'),
    fs.readFileSync(local('docs/copy/site-bot-help-form-copy-2026-11-06.json'), 'utf8'), 'app copy is the approved file byte-for-byte');
  const view = harness(`&auditId=${id}`, async () => response(ready()));
  await view.flush();
  assert.ok(!view.all().some(node => node.props?.['data-help-jump']), 'no jump link before confirmation');
  await confirm(view); report(view);
  const section = view.all().find(node => node.type === 'section' && node.props.id === 'help-form');
  assert.ok(section && section.props.style.scrollMarginTop, 'anchored section clears the sticky header');
  const heading = view.all().find(node => node.type === 'h2' && node.props.children === helpCopy.HELP_FORM_HEADING);
  assert.equal(heading.props.tabIndex, -1); assert.equal(heading.props.id, 'help-form-heading');
  const jump = view.all().filter(node => node.props?.['data-help-jump']);
  assert.equal(jump.length, 1); assert.equal(jump[0].props.href, '#help-form'); assert.equal(jump[0].props.children, helpCopy.HELP_JUMP_LINK);
  const order = view.all();
  assert.ok(order.indexOf(jump[0]) > order.findIndex(node => node.type === 'h1') && order.indexOf(jump[0]) < order.findIndex(node => node.props?.['data-dimension']), 'jump link sits below H1/intro, above findings');
  assert.ok(view.all().some(node => node.type === 'label' && node.props.htmlFor === 'help-email' && node.props.children === helpCopy.HELP_EMAIL_LABEL));
  const hint = view.all().find(node => node.props?.id === 'help-contact-hint');
  assert.equal(hint.props.children, helpCopy.HELP_CONTACT_HINT);
  assert.equal(view.all().find(node => node.type === 'button' && node.props.type === 'submit').props['aria-describedby'], 'help-contact-hint');
  assert.equal(liveRegion(view).length, 1, 'live region mounted before any message');
  assert.deepEqual(helpErrors(view), []);
  // Scorecard CTA_TRIAL keeps its other uses; it is just no longer the help-form heading.
  assert.ok(!view.all().some(node => node.type === 'h2' && node.props.children === scoreCopy.CTA_TRIAL));

  // Jump link scrolls the section into view and focuses the heading without touching the URL.
  const calls = [];
  fakeDocument.elements = { 'help-form': { scrollIntoView: options => calls.push(['scroll', options]) },
    'help-form-heading': { focus: options => calls.push(['focus', options]) } };
  let prevented = false; const before = view.location.href;
  jump[0].props.onClick({ preventDefault() { prevented = true; } });
  fakeDocument.elements = {};
  assert.ok(prevented); assert.equal(view.location.href, before);
  // Options objects come from the page's vm realm, so compare structurally via JSON.
  assert.equal(JSON.stringify(calls), JSON.stringify([['scroll', { block: 'start' }], ['focus', { preventScroll: true }]]));
});

test('help errors split by state: lost receipt and retry use RETRY, blocked uses BLOCKED; receipt hides jump link', async () => {
  const storage = new Map();
  const adapter = async url => url.startsWith('/api/site-bot/audit-result?') ? response(ready()) :
    url === '/api/site-bot/help-request' ? Promise.reject(Error('lost receipt')) : fail(url);
  const view = harness(`&auditId=${id}`, adapter, storage);
  await view.flush(); await confirm(view);
  view.all().find(node => node.type === privacyStub).props.onChange(true);
  view.all().find(node => node.type === 'input' && node.props.name === 'name').props.onChange({ target: { value: 'Synthetic Contact' } });
  view.all().find(node => node.type === 'input' && node.props.name === 'phone').props.onChange({ target: { value: '0500000000' } });
  await view.flush();
  await view.all().find(node => node.props?.['data-help-form']).props.onSubmit({ preventDefault() {} }); await view.flush();
  assert.deepEqual(helpErrors(view), [['retry', 'alert', helpCopy.HELP_ERROR_RETRY]], 'unconfirmed');
  assert.ok(nodes(liveRegion(view)[0]).some(node => node.props?.['data-help-error']), 'error rendered inside live region');

  const retry = harness(`&auditId=${id}&placeId=place-1`, adapter, storage);
  await retry.flush(); await confirm(retry);
  assert.deepEqual(helpErrors(retry), [['retry', 'alert', helpCopy.HELP_ERROR_RETRY]], 'retry');

  const blocked = harness(`&auditId=${id}&placeId=place-1`, adapter, new Map([[helpAttemptKey({ auditId: id, placeId: 'place-1' }), 'garbage']]));
  await blocked.flush(); await confirm(blocked);
  assert.deepEqual(helpErrors(blocked), [['blocked', 'alert', helpCopy.HELP_ERROR_BLOCKED]], 'blocked');
  assert.equal(blocked.all().find(node => node.type === 'button' && node.props.type === 'submit').props.disabled, true);

  const done = harness(`&auditId=${id}&placeId=place-1`, adapter, new Map([[helpAttemptKey({ auditId: id, placeId: 'place-1' }), 'received']]));
  await done.flush(); await confirm(done);
  assert.ok(!done.all().some(node => node.props?.['data-help-form']));
  assert.ok(!done.all().some(node => node.props?.['data-help-jump']), 'jump link only while the form is shown');
  assert.ok(nodes(liveRegion(done)[0]).some(node => node.props?.['data-help-received']));
});
