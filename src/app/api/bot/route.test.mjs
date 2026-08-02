import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const routePath = path.join(baseDir, 'route.ts');
const routeCode = fs.readFileSync(routePath, 'utf8');

// ── Regression test for the ownerName (T2b) turn-index drift bug ───────────
// Root cause: prompts.ts (the live/Gemini path) has always asked a T2b
// "ownerName" question right after T2 (businessName), but the offline
// handleSimulation() switch never had a matching case — so any answer meant
// for T2b landed in the T3 (secondaryServices) slot, and every following
// answer cascaded one slot off for the rest of the session. This corrupted
// real intake data (see data/lps/wao-client-1.json, wao-client-8vxf.json).

test('TURN_QUESTIONS has an ownerName question at index 2, matching prompts.ts T2b', () => {
  const match = routeCode.match(/const TURN_QUESTIONS: Record<number, string> = \{([\s\S]*?)\n\};/);
  assert.ok(match, 'TURN_QUESTIONS table not found');
  const body = match[1];
  const entry2 = body.match(/\n\s*2:\s*"([^"]*)"/);
  assert.ok(entry2, 'TURN_QUESTIONS[2] entry not found');
  assert.match(entry2[1], /שמך הפרטי/, 'TURN_QUESTIONS[2] should be the "ומה שמך הפרטי?" (T2b ownerName) question');
});

test('handleSimulation switch has a distinct case for each turn 0-24 with no duplicates', () => {
  const caseNumbers = [...routeCode.matchAll(/^\s*case (\d+):/gm)].map(m => parseInt(m[1], 10));
  const seen = new Set();
  const duplicates = [];
  for (const n of caseNumbers) {
    if (seen.has(n)) duplicates.push(n);
    seen.add(n);
  }
  assert.deepEqual(duplicates, [], `Duplicate case labels indicate a re-introduced turn-index drift: ${duplicates}`);
  // Every turn from 0 to 24 (T1 through T25, the phone/whatsapp turn) must
  // have a corresponding case — a gap here is exactly the class of bug that
  // corrupted wao-client-1.json / wao-client-8vxf.json.
  for (let i = 0; i <= 24; i++) {
    assert.ok(seen.has(i), `Missing switch case for turn ${i} — this creates a slot-shift for every later answer`);
  }
});

test('case 2 stores the answer into data.ownerName (not secondaryServices)', () => {
  const case2 = routeCode.match(/case 2:\s*\n([\s\S]*?)\n\s*case 3:/);
  assert.ok(case2, 'case 2 block not found');
  assert.match(case2[1], /data\.ownerName\s*=\s*text/);
  assert.doesNotMatch(case2[1], /data\.secondaryServices/);
});

test('case 3 stores the answer into data.secondaryServices (shifted correctly after ownerName insertion)', () => {
  const case3 = routeCode.match(/case 3:\s*\n([\s\S]*?)\n\s*case 4:/);
  assert.ok(case3, 'case 3 block not found');
  assert.match(case3[1], /data\.secondaryServices\s*=\s*text/);
});

test('the inferred-service-model jump lands on turnIndex 5 (T5 cities/address), not 4', () => {
  assert.match(routeCode, /data\.turnIndex = 5;/);
  assert.doesNotMatch(routeCode, /data\.turnIndex = 4;/);
});

test('phone/whatsapp turn (case 24) is guarded by isPlausiblePhoneAnswer before being stored', () => {
  const case24 = routeCode.match(/case 24: \{([\s\S]*?)\n\s*\/\/ All done/);
  assert.ok(case24, 'case 24 block not found');
  assert.match(case24[1], /isPlausiblePhoneAnswer\(text\)/);
});

// ── Unit test the phone-plausibility guard logic directly (TS-stripped) ────
function loadIsPlausiblePhoneAnswer() {
  const match = routeCode.match(
    /export function isPlausiblePhoneAnswer\(text: string\): boolean \{([\s\S]*?)\n\}/
  );
  assert.ok(match, 'isPlausiblePhoneAnswer function not found in route.ts');
  const body = match[1];
  // eslint-disable-next-line no-new-func
  return new Function('text', body);
}

test('isPlausiblePhoneAnswer rejects upload-status strings and other non-phone free text', () => {
  const isPlausiblePhoneAnswer = loadIsPlausiblePhoneAnswer();
  assert.equal(isPlausiblePhoneAnswer('העלאתי 1 תמונות'), false);
  assert.equal(isPlausiblePhoneAnswer('כן, יש לי תמונה טובה שלי בגינה, מעלה.'), false);
  assert.equal(isPlausiblePhoneAnswer('אין לי רישיון מיוחד'), false);
});

test('isPlausiblePhoneAnswer accepts real Israeli phone numbers', () => {
  const isPlausiblePhoneAnswer = loadIsPlausiblePhoneAnswer();
  assert.equal(isPlausiblePhoneAnswer('052-9876543'), true);
  assert.equal(isPlausiblePhoneAnswer('0501234567'), true);
  assert.equal(isPlausiblePhoneAnswer('050-1234567 וגם וואטסאפ זהה'), false); // too much surrounding prose
  assert.equal(isPlausiblePhoneAnswer('050 123 4567'), true);
});

// ── Regression test for the second corruption source: upload-acknowledgment
// messages consuming a turn ────────────────────────────────────────────────
// src/app/(app)/google-ads/onboarding/page.tsx's handleUpload() posts a
// synthetic "העלאתי N תמונות" / "העלאתי תמונת פרופיל" message to /api/bot
// after every file upload. Before this guard, handleSimulation's switch(turn)
// stored that literal string into whatever field the current turnIndex
// pointed at (reproduced live: capacityUnit -> "העלאתי 2 תמונות"), matching
// the corruption found in data/lps/wao-client-1.json.

test('DIAGNOSING state short-circuits on an upload-acknowledgment message before the turn switch', () => {
  const diagnosingBlock = routeCode.match(
    /if \(currentState === "DIAGNOSING"\) \{([\s\S]*?)\/\/ ── Store this turn's answer/
  );
  assert.ok(diagnosingBlock, 'DIAGNOSING branch not found');
  assert.match(
    diagnosingBlock[1],
    /העלאתי \(\\d\+ תמונות\|תמונת פרופיל\)/,
    'upload-acknowledgment guard regex not found before the turn-consuming switch'
  );
  assert.match(diagnosingBlock[1], /return NextResponse\.json/, 'guard must return early, not fall through to the switch');
});
