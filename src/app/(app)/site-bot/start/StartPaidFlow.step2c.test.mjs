// Site Bot step 2c: the start page's preview screens and the 2b carry-overs (source checks; the runtime walk is Roni's).
// HEBREW-SAFETY: zero Hebrew bytes; every copy reference is a key of the generated module.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const flow = fs.readFileSync(path.join(import.meta.dirname, 'StartPaidFlow.tsx'), 'utf8');
const block = (start, end) => flow.slice(flow.indexOf(start), flow.indexOf(end, flow.indexOf(start)));

test('preview: the sandboxed iframe (no tokens) titled PREVIEW_FRAME_LABEL, loading only the cookie-gated frame route', () => {
  const ready = block('data-interview-preview="ready"', '{phase === "elsewhere" && (');
  const frame = ready.slice(ready.indexOf('<iframe'), ready.indexOf('/>', ready.indexOf('<iframe')));
  assert.match(frame, /sandbox=\{PREVIEW_IFRAME_SANDBOX\}/);
  assert.match(frame, /title=\{STEP2C_COPY\.PREVIEW_FRAME_LABEL\}/);
  assert.match(frame, /src=\{preview\.frameUrl\}/);
  assert.doesNotMatch(frame, /allow-/);
  assert.match(flow, /view\.frameUrl\.startsWith\("\/api\/site-bot\/interview-preview-frame\?"\)/);
  // Order: head, body, frame, fix link / fix used, next list (split on \n), pay CTA + sub.
  const order = ['STEP2C_COPY.PREVIEW_HEAD', 'STEP2C_COPY.PREVIEW_BODY', '<iframe', 'STEP2C_COPY.PREVIEW_FIX_LINK', 'STEP2C_COPY.PREVIEW_FIX_USED',
    'STEP2C_COPY.PREVIEW_NEXT_HEAD', 'copyLines(STEP2C_COPY.PREVIEW_NEXT_LIST)', 'STEP2C_COPY.PAY_CTA)', 'payCtaSub()'];
  const at = order.map(item => ready.indexOf(item));
  assert.ok(at.every(index => index > 0), JSON.stringify(at));
  assert.deepEqual([...at].sort((a, b) => a - b), at);
});

test('generating and failed screens use the 2c copy; the poll never lets a rejection escape', () => {
  assert.match(block('data-interview-preview="generating"', 'data-interview-preview="failed"'), /STEP2C_COPY\.GENERATING_HEAD[\s\S]*copyLines\(STEP2C_COPY\.GENERATING_BODY\)/);
  assert.match(block('data-interview-preview="failed"', 'data-interview-preview="ready"'), /copyLines\(STEP2C_COPY\.PREVIEW_FAILED\)/);
  const poll = block('const poll = async () => {', 'return () => { cancelled = true;');
  assert.match(poll, /try \{[\s\S]*\} catch \{/);
  assert.match(poll, /timer = setTimeout\(\(\) => \{ void poll\(\); \}, next\)/);
});

test('2b carry-overs: FACTS_EMPTY_FINAL above FACTS_DONE on the no-return screen; aria-disabled on the step buttons', () => {
  const empty = block(') : factsScreen?.empty ? (', ') : (\n              <>');
  assert.ok(empty.indexOf('STEP2C_COPY.FACTS_EMPTY_FINAL') > 0);
  assert.ok(empty.indexOf('STEP2C_COPY.FACTS_EMPTY_FINAL') < empty.indexOf('STEP2B_COPY.FACTS_DONE'));
  for (const marker of ['data-interview-holding-cta="true"', 'data-interview-skip="true"', 'data-interview-gate-skip="true"', 'data-interview-gate-next="true"', 'data-interview-pay="true"', 'data-interview-preview-fix="true"']) {
    const tag = flow.slice(flow.indexOf(marker), flow.indexOf('>', flow.indexOf(marker)));
    assert.match(tag, /aria-disabled=\{submitting/, marker);
    assert.doesNotMatch(tag, /\sdisabled=/, marker);
  }
  const next = block('data-interview-next="true"', '</button>');
  assert.match(next, /aria-disabled=\{submitting \|\|/);
  assert.doesNotMatch(next, /\sdisabled=/);
});
