// Account page controls: the two-step cancel (open / back / yes, focus targets, in-page question, no window.confirm) and
// the generic error that points at the support box only when the box is on the page (genericNoBox otherwise).
// HEBREW-SAFETY: zero Hebrew bytes. Every Hebrew expectation is read from accountCopy.ts at runtime.
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

const repository = fileURLToPath(new URL('../../../../../', import.meta.url));
const local = (relative) => path.join(repository, relative);
const here = (name) => fileURLToPath(new URL(name, import.meta.url));

function load(file, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports, Intl, Date, Object, require(name) {
    assert.ok(Object.hasOwn(imports, name), `unexpected import: ${name}`);
    return imports[name];
  } }, { filename: file });
  return exports;
}

const react = { react: React, 'react/jsx-runtime': jsx };
const copy = load(local('src/lib/payments/accountCopy.ts'));
const deps = { ...react, '@/lib/payments/accountCopy': copy };
const cancel = load(here('./CancelSubscriptionButton.tsx'), deps);
const card = load(here('./CardUpdateButton.tsx'), deps);
const requestForm = load(here('./RequestLinkForm.tsx'), deps);
const C = copy.CANCEL_BUTTON_COPY;
const markup = (node) => renderToStaticMarkup(node);
const text = (value) => renderToStaticMarkup(React.createElement(React.Fragment, null, value));
const noop = () => {};
const view = (state, extra = {}) =>
  markup(React.createElement(cancel.CancelSubscriptionView, { state, confirmDate: '14.12.2026', showMessageBox: true, onOpen: noop, onBack: noop, onConfirm: noop, ...extra }));

test('two-step cancel: open -> back closes; open -> yes -> loading -> done; failure reopens from the button', () => {
  const r = cancel.cancelFlowReducer;
  let s = cancel.INITIAL_CANCEL_STATE;
  assert.equal(r(s, { type: 'submit' }), s, 'yes is impossible before the question is open');
  s = r(s, { type: 'open' });
  assert.deepEqual([s.phase, s.focus], ['confirming', 'question']);
  s = r(s, { type: 'back' });
  assert.deepEqual([s.phase, s.focus], ['idle', 'button']);
  s = r(r(s, { type: 'open' }), { type: 'submit' });
  assert.equal(s.phase, 'loading');
  assert.equal(r(s, { type: 'back' }), s, 'back is ignored while the cancel request runs');
  const failed = r(s, { type: 'failed', errorKind: 'generic' });
  assert.deepEqual([failed.phase, failed.errorKind, failed.focus], ['error', 'generic', 'button']);
  assert.equal(r(failed, { type: 'open' }).phase, 'confirming', 'after a failure the next tap asks again');
  const done = r(s, { type: 'succeeded', accessUntil: '2026-12-13T22:30:00.000Z' });
  assert.deepEqual([done.phase, done.focus, done.accessUntil], ['done', 'done', '2026-12-13T22:30:00.000Z']);
});

test('first view: one cancel button, no question yet', () => {
  const html = view(cancel.INITIAL_CANCEL_STATE);
  assert.ok(html.includes(text(C.idle)) && html.includes('data-cancel-open'));
  assert.ok(!html.includes('data-cancel-confirm'));
});

test('confirm question renders in the page with the paid-through date isolated, yes and back buttons', () => {
  const html = view({ ...cancel.INITIAL_CANCEL_STATE, phase: 'confirming', focus: 'question' });
  const [before, after] = C.confirmQuestion.split('{date}');
  assert.ok(html.includes(`${text(before)}<bdi dir="ltr">14.12.2026</bdi>${text(after)}`));
  assert.ok(html.includes('role="group"') && html.includes('aria-labelledby="cancel-confirm-question"'));
  assert.ok(/<p id="cancel-confirm-question" tabindex="-1"/.test(html), 'the question can take focus');
  assert.ok(html.includes(text(C.confirmYes)) && html.includes(text(C.confirmBack)));
  assert.ok(!html.includes('data-cancel-open'));
  const noDate = view({ ...cancel.INITIAL_CANCEL_STATE, phase: 'confirming' }, { confirmDate: null });
  assert.ok(noDate.includes(text(C.confirmQuestionNoDate)) && !noDate.includes('{date}'));
  const src = fs.readFileSync(here('./CancelSubscriptionButton.tsx'), 'utf8');
  assert.ok(!/\bconfirm\(/.test(src), 'no window.confirm');
});

test('after yes: loading label on the yes button, then the done message and the service-until date', () => {
  const loading = view({ ...cancel.INITIAL_CANCEL_STATE, phase: 'loading' });
  assert.ok(loading.includes(text(C.loading)) && loading.includes('aria-disabled="true"'));
  const done = view({ ...cancel.INITIAL_CANCEL_STATE, phase: 'done', accessUntil: '2026-12-13T22:30:00.000Z' });
  assert.ok(done.includes(text(C.doneMessage)) && done.includes(text(C.doneAccessUntil)));
  assert.ok(done.includes('<bdi dir="ltr" class="font-semibold">14.12.2026</bdi>'));
  assert.ok(done.includes('data-cancel-done="end-of-period"'));
  // Focus lands on the done message paragraph itself (it has an accessible name: its text).
  assert.ok(done.includes(`<p tabindex="-1" class="text-green-400 text-sm outline-none" data-cancel-done-message="">${text(C.doneMessage)}</p>`));
});

test('generic error points at the support box only when it is shown; genericNoBox otherwise', () => {
  const error = { ...cancel.INITIAL_CANCEL_STATE, phase: 'error', errorKind: 'generic' };
  const withBox = view(error, { showMessageBox: true });
  const noBox = view(error, { showMessageBox: false });
  assert.ok(withBox.includes(text(C.errorGeneric)) && !withBox.includes(text(C.errorGenericNoBox)));
  assert.ok(noBox.includes(text(C.errorGenericNoBox)) && !noBox.includes(text(C.errorGeneric)));
  assert.ok(noBox.includes('id="cancel-error" role="alert"') && noBox.includes('aria-describedby="cancel-error"'));
  assert.ok(!view(cancel.INITIAL_CANCEL_STATE).includes('aria-describedby'), 'no describedby without an error');
  assert.equal(cancel.cancelErrorMessage('invalid_token', false), C.errorInvalidToken);

  const K = copy.CARD_UPDATE_BUTTON_COPY;
  assert.equal(card.cardUpdateErrorMessage('generic', true), K.errorGeneric);
  assert.equal(card.cardUpdateErrorMessage('generic', false), K.errorGenericNoBox);
  assert.equal(card.cardUpdateErrorMessage('invalid_token', true), K.errorInvalidToken);
});

test('stateful components render their idle state on the server', () => {
  const cancelHtml = markup(React.createElement(cancel.default, { token: 't', showMessageBox: false, confirmDate: null }));
  assert.ok(cancelHtml.includes(text(C.idle)));
  const cardHtml = markup(React.createElement(card.default, { token: 't', showMessageBox: false }));
  assert.ok(cardHtml.includes(text(copy.CARD_UPDATE_BUTTON_COPY.idle)));
});

test('touch targets: every cancel-flow button is at least 44px tall', () => {
  for (const phase of ['idle', 'confirming', 'loading']) {
    const html = view({ ...cancel.INITIAL_CANCEL_STATE, phase });
    const buttons = html.match(/<button[^>]*>/g) ?? [];
    assert.ok(buttons.length > 0 && buttons.every((b) => b.includes('min-h-11')), phase);
  }
  for (const prominent of [true, false]) {
    const html = markup(React.createElement(card.default, { token: 't', showMessageBox: false, prominent }));
    assert.ok(/<button[^>]*min-h-11/.test(html));
  }
});

test('request form: the state notice is the h1, the status line is mounted empty, the email input is mobile-safe', () => {
  const notice = copy.ACCOUNT_PAGE_COPY.cardUpdateCallbackError;
  const html = markup(React.createElement(requestForm.default, { notice: { text: notice, tone: 'error' } }));
  assert.ok(/<h1 class="[^"]*text-red-400"[^>]*>/.test(html) && html.includes(`>${text(notice)}</h1>`));
  assert.ok(html.includes('<p role="status" class="sr-only"></p>'), 'status container mounted before success');
  const input = html.match(/<input[^>]*>/)[0];
  for (const attr of ['type="email"', 'dir="ltr"', 'inputMode="email"', 'autoCapitalize="none"', 'spellCheck="false"', 'min-h-11', 'text-base']) {
    assert.ok(input.includes(attr), `${attr} in ${input}`);
  }
  assert.ok(/<button type="submit"[^>]*min-h-11/.test(html));
  const bare = markup(React.createElement(requestForm.default, {}));
  assert.ok(!bare.includes('<h1'), 'no notice, no heading');
});
