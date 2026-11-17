// The photo-library build gates (scripts/build-photo-library.mjs): the approval must match the folder exactly.
// The full rebuild-and-compare (determinism) is `node scripts/build-photo-library.mjs --check` (about a minute).
// HEBREW-SAFETY: zero Hebrew bytes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { approvalFile, planFromApproval } from './build-photo-library.mjs';

const approval = JSON.parse(fs.readFileSync(approvalFile('plumber'), 'utf8'));
const folder = fs.readdirSync(path.dirname(approvalFile('plumber'))).sort();

test('the approved plumber folder plans cleanly: camera split, fallback, equipment and hands flags', () => {
  const plan = planFromApproval('plumber', approval, folder);
  assert.deepEqual(plan.services['leak-detection'], { standard: ['leak-detection-2', 'leak-detection-3'], thermalCamera: ['leak-detection-hand-2', 'leak-detection-1'] });
  assert.deepEqual(plan.fallback, ['plumber-atmo-1', 'plumber-atmo-5', 'plumber-atmo-6']);
  assert.equal(plan.sources.length, 21);
  assert.deepEqual(plan.sources.filter((s) => s.equipment).map((s) => s.id), ['leak-detection-1', 'leak-detection-hand-2']);
  assert.deepEqual(plan.sources.filter((s) => s.hands).map((s) => s.id), ['leak-detection-hand-2']);
  assert.equal(approval.demoHero, 'leak-detection-hand-2.png');
});

test('gates: listed twice, listed and dropped, missing, unlisted stray, wrong trade, unknown list', () => {
  const bad = (mutate, files, re) => { const a = structuredClone(approval); mutate(a); assert.throws(() => planFromApproval('plumber', a, files ?? folder), re); };
  bad((a) => { a.tradeFallback.push('leak-repair-1.png'); }, null, /listed twice/);
  bad((a) => { a.dropped['plumber-atmo-1.png'] = 'x'; }, null, /both listed and dropped/);
  bad(() => {}, folder.filter((f) => f !== 'drain-cleaning-2.png'), /listed but missing/);
  bad(() => {}, [...folder, 'stray-photo.png'], /unlisted photos/);
  bad((a) => { a.trade = 'electrician'; }, null, /names trade/);
  bad((a) => { a.services['leak-detection'].other = []; }, null, /unknown lists/);
  bad((a) => { a.services['drain-cleaning'] = 'drain-cleaning-1.png'; }, null, /must be a list/);
  // A dropped file present in the folder is fine (never built).
  assert.doesNotThrow(() => planFromApproval('plumber', approval, [...folder, 'plumber-atmo-4.png']));
});
