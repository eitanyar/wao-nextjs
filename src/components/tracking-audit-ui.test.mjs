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
const bundle = fs.readFileSync(path.join(root, 'docs/copy/google-ads-manual-audit-ui-copy-2026-10-03.md'), 'utf8');
function value(key) {
  const lines = bundle.split('\n').filter((line) => line.startsWith(`${key}: `));
  assert.equal(lines.length, 1, key);
  return lines[0].slice(key.length + 2);
}
const audit = { taskId: 'synthetic-audit', kind: 'tracking_audit', title: 'Synthetic tag check', whyNeeded: 'Synthetic evidence', recommendedAction: 'Manual investigation', source: 'alert', risk: 'low' };
const normal = { ...audit, taskId: 'synthetic-normal', kind: 'general_review', title: 'Synthetic normal task' };

// Compile the actual component sources, replacing only Next/server dependencies with inert adapters.
function load(file, hooks = React) {
  const cache = new Map();
  function moduleAt(relativePath) {
    const absolute = path.resolve(root, relativePath);
    if (cache.has(absolute)) return cache.get(absolute);
    const source = fs.readFileSync(absolute, 'utf8');
    const output = ts.transpileModule(source, { fileName: absolute, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    cache.set(absolute, exports);
    const dependencies = {
      react: hooks,
      'react/jsx-runtime': require('react/jsx-runtime'),
      'next/navigation': { useRouter: () => ({ refresh: () => { throw Error('Unexpected refresh'); } }) },
      '@/lib/bidi': { renderMixed: (text) => text },
      '@/components/geo/StatusBar': { STATUS_CONFIG: { 'pending-review': { color: 'bg-blue-500', label: 'Pending review' } } },
    };
    vm.runInNewContext(output, { exports, window: { confirm: (...args) => globalThis.window.confirm(...args) }, fetch: (...args) => globalThis.fetch(...args), require: (name) => {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      if (name.startsWith('./')) return moduleAt(path.resolve(path.dirname(absolute), name + '.tsx'));
      throw Error(`Unexpected dependency ${name}`);
    }, console }, { filename: absolute });
    return exports;
  }
  return moduleAt(file).default;
}
function review(task, hooks) {
  const Card = load('src/components/admin/review/RecommendationCard.tsx', hooks);
  return React.createElement(Card, { task, queueDepth: 2, initialInquiries: [] });
}
function panel(tasks, approvals = [], hooks) {
  const Panel = load('src/components/google-ads-operator-panel.tsx', hooks);
  return React.createElement(Panel, { clientId: 'synthetic-client', tasks, approvals });
}
function html(element) { return renderToStaticMarkup(element); }
export function syntheticMarkup(surface, mode = 'audit') {
  if (surface === 'review') return html(review(mode === 'audit' ? audit : normal));
  if (surface === 'dashboard') return html(panel(mode === 'mixed' ? [audit, normal] : mode === 'normal' ? [normal] : [audit]));
  throw Error('Unknown synthetic surface');
}

// An inert hook adapter lets tests inspect the real JSX callbacks without mounting Next or issuing HTTP.
function treeHooks() {
  return { ...React, useMemo: (fn) => fn(), useState: (initial) => [initial, () => {}], useEffect: () => {}, useRef: () => ({ current: null }) };
}
function expand(element) {
  if (Array.isArray(element)) return element.flatMap(expand);
  if (!element || typeof element !== 'object') return [];
  if (typeof element.type === 'function') return expand(element.type(element.props));
  return [element, ...expand(element.props.children)];
}

test('admin audit renders exact QA status/explanation and no decision, inquiry, or queue affordance', () => {
  const content = html(review(audit));
  assert.ok(content.includes(value('audit.review.status')));
  assert.ok(content.includes(value('audit.review.explanation')));
  assert.ok(content.includes(audit.whyNeeded));
  assert.ok(content.includes(audit.recommendedAction));
  assert.doesNotMatch(content, /<button|<form|<textarea|72/);
  assert.doesNotMatch(content, /\+2/);
  const nodes = expand(review(audit, treeHooks()).type(review(audit, treeHooks()).props));
  assert.equal(nodes.filter((node) => node.type === 'button' || node.type === 'form').length, 0);
});

test('admin non-audit retains decisions, inquiry disclosure, queue depth and live-warning copy', () => {
  const content = html(review(normal));
  assert.match(content, /<button/);
  assert.match(content, /72/);
  assert.match(content, /\+2/);
  assert.ok(!content.includes(value('audit.review.status')));
  const element = review(normal, treeHooks());
  const buttons = expand(element.type(element.props)).filter((node) => node.type === 'button');
  assert.ok(buttons.length >= 2);
});

test('dashboard audit-only and mixed lists retain evidence, exact copy, inert audit row and active normal row', async () => {
  const auditHtml = html(panel([audit]));
  assert.ok(auditHtml.includes(value('audit.dashboard.status')));
  assert.ok(auditHtml.includes(value('audit.dashboard.explanation')));
  assert.ok(auditHtml.includes(audit.title) && auditHtml.includes(audit.whyNeeded) && auditHtml.includes(audit.recommendedAction));
  assert.doesNotMatch(auditHtml, /<button|Approval gated|Approve task|Approved|Needs review/);
  const mixedHtml = html(panel([audit, normal]));
  assert.equal((mixedHtml.match(/<button/g) || []).length, 1);
  assert.ok(mixedHtml.includes(value('audit.dashboard.explanation')));
  assert.match(mixedHtml, /Approval gated|Approve task/);
  const approvedHtml = html(panel([normal], [{ taskId: normal.taskId, title: normal.title, recommendedAction: normal.recommendedAction, approvedAt: 'synthetic', status: 'approved' }]));
  assert.match(approvedHtml, /Recently approved/);
  assert.match(approvedHtml, /Approved/);

  const hooks = treeHooks();
  const Panel = load('src/components/google-ads-operator-panel.tsx', hooks);
  const mixed = expand(Panel({ clientId: 'synthetic-client', tasks: [audit, normal], approvals: [] }));
  const buttons = mixed.filter((node) => node.type === 'button');
  assert.equal(buttons.length, 1);
  let confirmed = 0;
  let posted = 0;
  globalThis.window = { confirm: () => { confirmed++; return true; } };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/google-ads/operator-task');
    assert.equal(options.method, 'POST');
    assert.equal(JSON.parse(options.body).taskId, normal.taskId);
    posted++;
    return { ok: true, json: async () => ({ task: { ...normal, status: 'approved' }, message: 'Synthetic approval' }) };
  };
  try {
    await buttons[0].props.onClick();
    assert.equal(confirmed, 1);
    assert.equal(posted, 1);
  } finally {
    delete globalThis.window;
    delete globalThis.fetch;
  }
  assert.equal(expand(Panel({ clientId: 'synthetic-client', tasks: [audit], approvals: [] })).filter((node) => node.type === 'button').length, 0);
});

test('rendered dashboard audit cards are RTL/right aligned with isolated tokens; normal cards remain LTR', () => {
  const cardNodes = (tasks) => {
    const Panel = load('src/components/google-ads-operator-panel.tsx', treeHooks());
    return expand(Panel({ clientId: 'synthetic-client', tasks, approvals: [] }))
      .filter((node) => node.type === 'div' && node.props.className?.startsWith('rounded-xl border border-white/10 bg-white/5 p-4'));
  };
  for (const tasks of [[audit], [audit, normal]]) {
    const [auditCard, normalCard] = cardNodes(tasks);
    assert.equal(auditCard.props.dir, 'rtl');
    assert.equal(auditCard.props.lang, 'he');
    assert.match(auditCard.props.className, /\btext-right\b/);
    const isolated = expand(auditCard).filter((node) => node.type === 'bdi');
    assert.equal(isolated.length, 4);
    assert.deepEqual(isolated.map((node) => node.props.dir), ['auto', 'auto', 'auto', 'ltr']);
    assert.deepEqual(isolated.slice(0, 3).map((node) => node.props.children), [audit.title, audit.whyNeeded, audit.recommendedAction]);
    const markup = syntheticMarkup('dashboard', tasks.length === 1 ? 'audit' : 'mixed');
    assert.match(markup, /<div dir="rtl" lang="he" class="[^"]*text-right/);
    assert.match(markup, /<bdi dir="auto">Synthetic tag check<\/bdi>/);
    assert.match(markup, /<bdi dir="ltr">Risk: low<\/bdi>/);
    if (normalCard) {
      assert.equal(normalCard.props.dir, undefined);
      assert.equal(normalCard.props.lang, undefined);
      assert.doesNotMatch(normalCard.props.className, /\btext-right\b/);
      assert.equal(expand(normalCard).filter((node) => node.type === 'bdi').length, 0);
    }
  }
  const [normalCard] = cardNodes([normal]);
  assert.equal(normalCard.props.dir, undefined);
  assert.equal(normalCard.props.lang, undefined);
  assert.doesNotMatch(syntheticMarkup('dashboard', 'normal'), /dir="rtl"|lang="he"|<bdi/);
});

test('dashboard shared approval introduction is omitted for mixed and audit-only lists', () => {
  const source = fs.readFileSync(path.join(root, 'src/app/(product)/client/dashboard/page.tsx'), 'utf8');
  assert.match(source, /!googleAdsOperatorTasks\.some\(\(task\) => task\.kind === 'tracking_audit'\)/);
  const show = (tasks) => !tasks.some((task) => task.kind === 'tracking_audit');
  assert.equal(show([normal]), true);
  assert.equal(show([audit]), false);
  assert.equal(show([normal, audit]), false);
});

test('audit approval handler returns before confirm, state, or POST (fail-on-call adapters)', async () => {
  const source = fs.readFileSync(path.join(root, 'src/components/google-ads-operator-panel.tsx'), 'utf8');
  const file = ts.createSourceFile('panel.tsx', source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  let handler;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'approveTask') handler = node.getText(file);
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(handler, 'actual approveTask declaration exists');
  const output = ts.transpileModule(`${handler}\nexports.approveTask = approveTask;`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(output, {
    exports,
    window: { confirm: () => { throw Error('Unexpected audit confirm'); } },
    fetch: () => { throw Error('Unexpected audit POST'); },
    setBusyTaskId: () => { throw Error('Unexpected audit state update'); },
  });
  await exports.approveTask(audit);
});
