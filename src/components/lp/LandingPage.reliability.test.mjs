import assert from 'node:assert/strict';
import fs     from 'node:fs';
import path   from 'node:path';
import test   from 'node:test';
import { fileURLToPath } from 'node:url';

// docs/specs/priority-3-lead-capture-reliability-and-client-feedback.md §1.1
// (Part A). LandingPage.tsx is a 'use client' component with no jsdom/RTL
// framework introduced in this codebase (§6.5's stated boundary) — these
// tests assert against the real source text rather than mounting the
// component, same convention as src/app/(app)/admin/live-readiness's
// admin-gate.security.test.mjs for next/headers-coupled files. Roni's
// runtime pass (a real tel/wa.me tap, network panel, "close tab immediately
// after tap" repro) is the actual behavioral verification for this file.

const dir = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(dir, 'LandingPage.tsx'), 'utf8');

const pingClickBody = src.slice(src.indexOf('function pingClick'), src.indexOf('const nameInputRef'));
const handleSubmitBody = src.slice(src.indexOf('async function handleSubmit'));

test('pingClick() uses navigator.sendBeacon with a Blob, not a bare fetch().catch()', () => {
  assert.match(pingClickBody, /navigator\.sendBeacon\('\/api\/leads', blob\)/);
  assert.match(pingClickBody, /new Blob\(\[payload\], \{ type: 'application\/json' \}\)/);
});

test('pingClick() falls back to fetch(..., { keepalive: true }) only when sendBeacon is unavailable or rejects the payload', () => {
  const fallbackIdx = pingClickBody.indexOf('if (!accepted)');
  const fetchIdx = pingClickBody.indexOf('fetch(');
  assert.notEqual(fallbackIdx, -1);
  assert.ok(fallbackIdx < fetchIdx, 'the fetch fallback must be gated on sendBeacon not being accepted');
  assert.match(pingClickBody.slice(fetchIdx), /keepalive:\s*true/);
});

test('handleSubmit() submits with fetch keepalive:true (not a bare fetch)', () => {
  assert.match(src, /keepalive: true, \/\/ survives the tab closing before the response resolves/);
});

test('handleSubmit() generates orderId once via useRef, not a fresh uid() call inside the handler (idempotent retry/double-submit)', () => {
  assert.match(src, /const formOrderIdRef = useRef<string \| null>\(null\)/);
  assert.match(handleSubmitBody, /if \(!formOrderIdRef\.current\) formOrderIdRef\.current = uid\(\)/);
  // The old per-call `orderId: uid()` inline inside the request body must be
  // gone from the form-submit path — it now flows through the ref.
  assert.doesNotMatch(handleSubmitBody, /orderId: uid\(\)/);
});

test('handleSubmit() performs exactly one automatic retry on a network-level failure, not a backoff tier', () => {
  const setTimeoutMatches = handleSubmitBody.match(/setTimeout/g) || [];
  assert.equal(setTimeoutMatches.length, 1, 'expected exactly one setTimeout call (one retry, no backoff tier)');
  assert.match(handleSubmitBody, /await new Promise\(\(resolve\) => setTimeout\(resolve, 1500\)\)/);

  // The retry re-uses the same submitLead(orderId) call, not a duplicated
  // fetch with a different orderId.
  const submitCalls = (handleSubmitBody.match(/submitLead\(orderId\)/g) || []).length;
  assert.equal(submitCalls, 2, 'expected exactly two submitLead(orderId) calls: the initial attempt and the one retry');
});

test('a non-ok response (real server error) sets formStatus error without retrying', () => {
  const notOkIdx = handleSubmitBody.indexOf('if (!res.ok)');
  assert.notEqual(notOkIdx, -1);
  const afterNotOk = handleSubmitBody.slice(notOkIdx, notOkIdx + 120);
  assert.doesNotMatch(afterNotOk, /setTimeout/);
});
