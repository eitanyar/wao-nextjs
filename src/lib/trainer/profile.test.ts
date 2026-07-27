import test from 'node:test';
import assert from 'node:assert';
import {
  computeMastery,
  applyProfileUpdate,
  applyMemoUpdate,
  emptyProfile,
  RESOLVE_AFTER,
  type Memo,
} from './profile';

/* ---------------------------- EWMA mastery ---------------------------- */

test('computeMastery seeds a new skill at 10*score', () => {
  assert.strictEqual(computeMastery(undefined, 5), 50);
  assert.strictEqual(computeMastery(undefined, 0), 0);
  assert.strictEqual(computeMastery(undefined, 10), 100);
});

test('computeMastery applies the EWMA 0.7*old + 0.3*(10*score)', () => {
  // 0.7*50 + 0.3*80 = 35 + 24 = 59
  assert.strictEqual(computeMastery(50, 8), 59);
  // 0.7*59 + 0.3*20 = 41.3 + 6 = 47.3
  assert.strictEqual(computeMastery(59, 2), 47.3);
});

test('applyProfileUpdate seeds then moves mastery and bumps session count', () => {
  let p = emptyProfile();
  assert.strictEqual(p.sessions, 0);

  p = applyProfileUpdate(p, { closing: 8, emotion_labeling: 2 }, '2026-07-27T00:00:00.000Z');
  assert.strictEqual(p.sessions, 1);
  assert.strictEqual(p.mastery.closing, 80);           // seed
  assert.strictEqual(p.mastery.emotion_labeling, 20);  // seed
  assert.strictEqual(p.updatedAt, '2026-07-27T00:00:00.000Z');

  p = applyProfileUpdate(p, { closing: 8, emotion_labeling: 2 });
  assert.strictEqual(p.sessions, 2);
  assert.strictEqual(p.mastery.closing, 80);           // 0.7*80 + 0.3*80
  assert.strictEqual(p.mastery.emotion_labeling, 20);  // 0.7*20 + 0.3*20
});

/* ---------------------------- Memo lifecycle ---------------------------- */

const liveMemo = (skill: string, cleanStreak = 0): Memo => ({
  id: `${skill}-seed`,
  skill,
  text: 'pattern',
  quoteHe: 'ציטוט',
  status: 'live',
  cleanStreak,
  createdAt: '2026-07-26T00:00:00.000Z',
  updatedAt: '2026-07-26T00:00:00.000Z',
});

test('applyMemoUpdate opens a fresh live memo for a new pattern', () => {
  const out = applyMemoUpdate(
    [],
    { newMemos: [{ text: 'never labels fear', skill: 'emotion_labeling', quoteHe: 'נכוויתי' }], flaggedSkills: ['emotion_labeling'], scoredSkills: ['emotion_labeling', 'closing'] },
    '2026-07-27T00:00:00.000Z',
  );
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].skill, 'emotion_labeling');
  assert.strictEqual(out[0].status, 'live');
  assert.strictEqual(out[0].cleanStreak, 0);
});

test('applyMemoUpdate does not duplicate a live memo when the pattern re-fires', () => {
  const out = applyMemoUpdate(
    [liveMemo('emotion_labeling')],
    { newMemos: [{ text: 'still not labeling', skill: 'emotion_labeling', quoteHe: 'אכלתי אותה' }], flaggedSkills: ['emotion_labeling'], scoredSkills: ['emotion_labeling'] },
  );
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].text, 'still not labeling');  // refreshed
  assert.strictEqual(out[0].cleanStreak, 0);              // reset
  assert.strictEqual(out[0].status, 'live');
});

test('a live memo resolves after RESOLVE_AFTER clean relevant sessions', () => {
  let memos = [liveMemo('emotion_labeling')];
  const cleanSession = { newMemos: [], flaggedSkills: [], scoredSkills: ['emotion_labeling'] };

  for (let i = 1; i < RESOLVE_AFTER; i++) {
    memos = applyMemoUpdate(memos, cleanSession);
    assert.strictEqual(memos[0].status, 'live', `still live after ${i} clean session(s)`);
    assert.strictEqual(memos[0].cleanStreak, i);
  }
  memos = applyMemoUpdate(memos, cleanSession); // the RESOLVE_AFTER-th
  assert.strictEqual(memos[0].status, 'resolved');
  assert.strictEqual(memos[0].cleanStreak, RESOLVE_AFTER);
});

test('a flag resets the clean streak so the memo never resolves', () => {
  let memos = [liveMemo('emotion_labeling', 2)]; // one clean session away from resolving
  memos = applyMemoUpdate(memos, { newMemos: [], flaggedSkills: ['emotion_labeling'], scoredSkills: ['emotion_labeling'] });
  assert.strictEqual(memos[0].status, 'live');
  assert.strictEqual(memos[0].cleanStreak, 0);
});

test('the clean streak does not advance on a session that did not score the skill', () => {
  let memos = [liveMemo('emotion_labeling', 1)];
  // A session about a different skill entirely — not relevant.
  memos = applyMemoUpdate(memos, { newMemos: [], flaggedSkills: [], scoredSkills: ['closing'] });
  assert.strictEqual(memos[0].cleanStreak, 1); // unchanged
  assert.strictEqual(memos[0].status, 'live');
});

test('a resurfaced pattern opens a fresh memo and leaves the resolved one as history', () => {
  const resolved: Memo = { ...liveMemo('emotion_labeling', RESOLVE_AFTER), status: 'resolved' };
  const out = applyMemoUpdate(
    [resolved],
    { newMemos: [{ text: 'regressed', skill: 'emotion_labeling', quoteHe: 'שוב' }], flaggedSkills: ['emotion_labeling'], scoredSkills: ['emotion_labeling'] },
  );
  assert.strictEqual(out.length, 2);
  assert.strictEqual(out.filter((m) => m.status === 'resolved').length, 1);
  assert.strictEqual(out.filter((m) => m.status === 'live').length, 1);
});
