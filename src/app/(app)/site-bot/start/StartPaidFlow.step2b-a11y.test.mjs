// Site Bot step 2b, Maya's a11y audit (2026-11-25) + logic edges, as a contract on the StartPaidFlow source.
// The runtime behaviour (focus never on body, the same-tick double click) is checked on a dev run; this keeps the markup
// from regressing. HEBREW-SAFETY: zero Hebrew bytes; copy is referenced by key only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const flow = fs.readFileSync(new URL('./StartPaidFlow.tsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../../../globals.css', import.meta.url), 'utf8');
const payClient = fs.readFileSync(new URL('../../../../components/site-bot/SiteBotPayClient.tsx', import.meta.url), 'utf8');

/** The JSX of the first <button ...> carrying the given data attribute. */
function buttonTag(attr) {
  const at = flow.indexOf(`${attr}={`);
  assert.ok(at >= 0, attr);
  const start = flow.lastIndexOf('<button', at);
  // The opening tag ends where the button's content (always renderMixed copy here) starts.
  return flow.slice(start, flow.indexOf('{renderMixed(', at));
}

test('fact buttons: each one is described by its fact text and stays focusable (aria-disabled, never disabled) mid-request', () => {
  for (const attr of ['data-interview-fact-confirm', 'data-interview-fact-fix', 'data-interview-fact-remove']) {
    const tag = buttonTag(attr);
    assert.match(tag, /aria-describedby=\{`interview-fact-text-\$\{fact\.id\}`\}/, attr);
    assert.match(tag, /aria-disabled=\{submitting \|\| undefined\}/, attr);
    assert.doesNotMatch(tag, /\sdisabled=/, attr);
  }
  const save = buttonTag('data-interview-fact-save');
  assert.match(save, /aria-disabled=\{submitting \|\| !factEdit\.trim\(\) \|\| undefined\}/);
  assert.doesNotMatch(save, /\sdisabled=/);
  assert.match(css, /\.wao-intake \.btn-primary\[aria-disabled="true"\]/);
});

test('fix field: Cancel (FACT_FIX_CANCEL) and Escape close it; focus then returns to that fact\'s Fix button', () => {
  const cancel = buttonTag('data-interview-fact-cancel');
  assert.match(cancel, /closeFactEdit\(fact\.id\)/);
  assert.match(flow, /STEP2B_COPY\.FACT_FIX_CANCEL/);
  assert.match(flow, /e\.key !== "Escape"[^\n]*\n\s*e\.preventDefault\(\);\n\s*closeFactEdit\(fact\.id\);/);
  assert.match(flow, /function closeFactEdit\(factId: string\) \{\n\s*factFocusReturnRef\.current = factId;\n\s*setEditingFact\(null\);/);
  assert.match(flow, /if \(decision === "fix"\) closeFactEdit\(factId\);/);
  assert.match(flow, /querySelector<HTMLButtonElement>\(`\[data-interview-fact-fix="\$\{CSS\.escape\(factId\)\}"\]`\)\?\.focus\(\);\n\s*\}, \[editingFact\]\);/);
  assert.match(flow, /useLayoutEffect\(\(\) => \{\n\s*if \(editingFact !== null \|\| factFocusReturnRef\.current === null\) return;/);
});

test('each fact has an always-mounted visually hidden role="status" with the FACT_STATUS_* text of its status', () => {
  assert.match(flow, /<span role="status" className="sr-only" data-interview-fact-status-text=\{fact\.id\}>\n\s*\{fact\.status === "pending" \? "" : renderMixed\(STEP2B_COPY\[FACT_STATUS_COPY_KEY\[fact\.status\]\]\)\}/);
  const facts = fs.readFileSync(new URL('../../../../lib/site-bot/interviewFacts.ts', import.meta.url), 'utf8');
  for (const [status, key] of [['confirmed', 'FACT_STATUS_CONFIRMED'], ['edited', 'FACT_STATUS_EDITED'], ['removed', 'FACT_STATUS_REMOVED']]) {
    assert.match(facts, new RegExp(`${status}: '${key}'`));
  }
});

test('all three step-2b textareas are dir="auto"; the gate textarea is aria-invalid and described by its alert on error', () => {
  for (const id of ['id="interview-answer"', 'id="interview-gate-answer"', 'id={`interview-fact-edit-${fact.id}`}']) {
    const at = flow.indexOf(id);
    assert.ok(at >= 0, id);
    assert.match(flow.slice(at, flow.indexOf('/>', at)), /dir="auto"/, id);
  }
  assert.match(flow, /<p id="interview-gate-error" role="alert"/);
  const gate = flow.slice(flow.indexOf('id="interview-gate-answer"'), flow.indexOf('/>', flow.indexOf('id="interview-gate-answer"')));
  assert.match(gate, /aria-invalid=\{gateError \|\| undefined\}/);
  assert.match(gate, /aria-describedby=\{gateError \? "interview-gate-error" : undefined\}/);
});

test('the error block takes focus when the phase turns to error; SESSION_ELSEWHERE\'s heading is described by its body', () => {
  assert.match(flow, /<div ref=\{errorRef\} tabIndex=\{-1\}[^>]*role="alert"/);
  assert.match(flow, /if \(phase !== "error"\) return;\n\s*const timer = setTimeout\(\(\) => errorRef\.current\?\.focus\(\), 0\);/);
  assert.match(flow, /aria-describedby="interview-elsewhere-body"[^\n]*SESSION_ELSEWHERE_HEAD/);
  assert.match(flow, /<p id="interview-elsewhere-body"[^\n]*SESSION_ELSEWHERE_BODY/);
});

test('mobile: a focused intake field scrolls 64px clear of the header (CSS only)', () => {
  assert.ok(css.includes('@media (max-width:767px){ html:has(.wao-intake){ scroll-padding-top:64px; } .wao-intake textarea.wao-intake-field{ scroll-margin-top:64px; } }'));
});

test('selected price chips show an aria-hidden check, like the area chips', () => {
  const at = flow.indexOf('data-interview-price-chip={chip}');
  const chip = flow.slice(at, flow.indexOf('</button>', at));
  assert.match(chip, /\{selected && <span aria-hidden="true">✓<\/span>\}/);
});

test('FACTS_EMPTY shows only with its return; empty facts after the return show FACTS_DONE alone under FACTS_HEAD', () => {
  const start = flow.indexOf('{phase === "facts" && (');
  const block = flow.slice(start, flow.indexOf('{phase === "facts_confirmed" && (', start));
  assert.equal(block.split('STEP2B_COPY.FACTS_EMPTY').length - 1, 1);
  assert.ok(block.indexOf('factsScreen?.empty && factsScreen.canReturn ?') < block.indexOf('STEP2B_COPY.FACTS_EMPTY'));
  const emptyBranch = block.slice(block.indexOf(') : factsScreen?.empty ? ('), block.indexOf(') : (\n              <>'));
  assert.match(emptyBranch, /data-interview-facts-done="true" disabled=\{!factsScreen\.canFinish\}/);
  assert.doesNotMatch(emptyBranch, /STEP2B_COPY\.(FACTS_BODY|FACTS_EMPTY)|data-interview-facts-return/);
});

test('SiteBotPayClient: the unread openGateCount field is gone', () => {
  assert.doesNotMatch(payClient, /openGateCount/);
});
