import test from 'node:test';
import assert from 'node:assert';
import { runJudge } from './judge';
import { setGenerateJsonMock } from './llm';

test('runJudge parses valid response using stubbed generateJson', async () => {
  const fakeResult = {
    scores: {
      emotion_labeling: 3,
      listening_ratio: 7,
      question_quality: 6,
      objection_handling: 5,
      framing_analogy: 6,
      boundary_setting: 5,
      brevity_pacing: 7,
      closing: 9,
    },
    overall: 6.2,
    passed: false,
    strengths: [
      { point: 'Strong closing intent.', quoteHe: 'בוא נסגור פגישה' }
    ],
    weaknesses: [
      { point: 'Missed emotion labeling.', quoteHe: 'נכוויתי', skill: 'emotion_labeling' }
    ],
    drills: ['Always label the fear first.'],
    memos: [
      { text: 'Fails to reflect emotion before pitching.', skill: 'emotion_labeling', quoteHe: 'נכוויתי' }
    ]
  };

  setGenerateJsonMock(async () => fakeResult as any);

  const result = await runJudge({
    transcript: [
      { role: 'agent', text: 'אכלתי אותה עם סוכנות קודמת, נכוויתי קשות.' },
      { role: 'user', text: 'בוא נסגור פגישה ונרוץ קדימה.' }
    ],
    hiddenObjective: 'Make the user label the fear before pitching.',
  });

  assert.strictEqual(result.passed, false);
  assert.strictEqual(result.overall, 6.2);
  assert.strictEqual(result.scores.emotion_labeling, 3);
  assert.strictEqual(result.strengths.length, 1);
  assert.strictEqual(result.weaknesses.length, 1);
  assert.strictEqual(result.memos.length, 1);
});
