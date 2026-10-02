import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  advancePublicSeoSession, loadPublicSeoDialogue, mapDiagnosisOutcome, startPublicSeoSession,
  type DiagnosisOutcome,
} from './seo-advisor-public-session';

const root = process.cwd();
const fixturePath = path.join(root, 'fixtures/seo-advisor-public/dialogue.json');
const draftPath = path.join(root, 'docs/copy/seo-advisor-public-dialogue-2026-10-02.md');
const finding = { retrievedAt: '2026-10-02T10:00:00.000Z', organicTraffic: 0, organicKeywords: 3 };
const reserved = { status: 'reserved' as const, domain: 'example.com', day: '2026-10-02', token: 'test-token' };
const rankedKeyword = { keyword: 'sample query', page: '/sample', position: 12 };
const result = (outcome: DiagnosisOutcome) => {
  const { session: start } = startPublicSeoSession();
  const submitted = advancePublicSeoSession(start, { type: 'submit_domain', domain: 'example.com', market: 'IL' });
  const approved = advancePublicSeoSession(submitted.session, { type: 'approve' });
  return advancePublicSeoSession(approved.session, { type: 'run', outcome });
};
const beat = (id: keyof ReturnType<typeof loadPublicSeoDialogue>['beats']) => loadPublicSeoDialogue().beats[id];
const withFinding = (extra: Partial<DiagnosisOutcome> = {}): DiagnosisOutcome => ({ reservation: reserved, finding, ...extra });

test('fixture fidelity, full beat set, and deterministic regeneration', () => {
  const bytes = fs.readFileSync(fixturePath);
  const draft = fs.readFileSync(draftPath, 'utf8');
  const dialogue = loadPublicSeoDialogue();
  assert.equal(Object.keys(dialogue.beats).length, 19);
  for (const lines of Object.values(dialogue.beats)) {
    assert.ok(lines.length > 0);
    for (const line of lines) assert.ok(draft.includes(line), 'Fixture string missing from frozen draft');
  }
  const run = spawnSync(process.execPath, ['scripts/generate-seo-advisor-dialogue.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(fs.readFileSync(fixturePath), bytes);
  assert.equal(dialogue.positionAlternatives['11-20'], 3);
  assert.equal(dialogue.positionAlternatives['4-10'], 4);
});

test('S1 dialogue, domain validation, market fallback, S2 consent and S3 result', () => {
  const start = startPublicSeoSession();
  assert.deepEqual(start.utterances, beat('s1_open_beat_a'));
  assert.deepEqual(advancePublicSeoSession(start.session, { type: 'hesitation' }).utterances, beat('s1_hesitation'));
  const next = advancePublicSeoSession(start.session, { type: 'next_intro' });
  assert.deepEqual(next.utterances, beat('s1_open_beat_b'));
  assert.deepEqual(advancePublicSeoSession(next.session, { type: 'next_intro' }).utterances, beat('s1_open_beat_c'));
  const invalid = advancePublicSeoSession(start.session, { type: 'submit_domain', domain: 'invalid', market: 'IL' });
  assert.deepEqual(invalid.utterances, beat('s4e_invalid_domain'));
  assert.equal(invalid.session.state, 'S1');
  assert.deepEqual(advancePublicSeoSession(start.session, { type: 'submit_domain', domain: 'example.com', market: 'FR' }).utterances, beat('s4d_unsupported_market'));
  const submitted = advancePublicSeoSession(start.session, { type: 'submit_domain', domain: 'Example.COM', market: 'US' });
  assert.equal(submitted.session.domain, 'example.com');
  assert.deepEqual(submitted.utterances, beat('s2_consent').map(line => line.replace('{domain}', 'example.com')));
  const premature = advancePublicSeoSession(submitted.session, { type: 'run', outcome: withFinding({ rankedKeyword }) });
  assert.deepEqual(premature.utterances, submitted.utterances);
  assert.equal(premature.session.runCount, 0);
  const approved = advancePublicSeoSession(submitted.session, { type: 'approve' });
  assert.deepEqual(approved.utterances, beat('s2_waiting'));
  const done = advancePublicSeoSession(approved.session, { type: 'run', outcome: withFinding({ rankedKeyword }) });
  assert.equal(done.session.state, 'S3');
  assert.equal(done.session.runCount, 1);
  const lines = beat('s3a_main');
  assert.deepEqual(done.utterances, lines.filter((_, i) => i !== 4).map(line => line.replace('{page}', '/sample').replace('{keyword}', 'sample query').replace('{position}', '12')));
  assert.deepEqual(advancePublicSeoSession(done.session, { type: 'close' }).utterances, beat('s5a_warm_close'));
  assert.deepEqual(advancePublicSeoSession(done.session, { type: 'no_contact' }).utterances, beat('s5c_no_contact'));
  assert.deepEqual(advancePublicSeoSession(done.session, { type: 'guarantee_question' }).utterances, beat('anti_guarantee'));
  assert.deepEqual(advancePublicSeoSession(done.session, { type: 'run', outcome: withFinding() }).utterances, []);
});

test('position alternatives, authority constraint, and overview-only cannot imply detail', () => {
  const upper = result(withFinding({ rankedKeyword: { ...rankedKeyword, position: 4 } }));
  assert.ok(upper.utterances.includes(beat('s3a_main')[4]));
  assert.ok(!upper.utterances.includes(beat('s3a_main')[3]));
  assert.deepEqual(result(withFinding({ authority: { referringDomains: 9 } })).utterances, beat('s3b_authority_gap'));
  assert.deepEqual(result(withFinding({ authority: { referringDomains: 10 } })).utterances, beat('s3c_baseline'));
  assert.deepEqual(result(withFinding()).utterances, beat('s3c_baseline'));
  assert.deepEqual(result(withFinding({ rankedKeyword: { ...rankedKeyword, position: 21 } })).utterances, beat('s3c_baseline'));
  assert.deepEqual(result(withFinding({ rankedKeyword: { ...rankedKeyword, page: '' } })).utterances, beat('s3c_baseline'));
  assert.equal(mapDiagnosisOutcome({ reservation: reserved, finding }).beat, 's3c_baseline');
});

test('cache and stale evidence always disclose a real date', () => {
  const cached = result({ reservation: { status: 'cached', domain: 'example.com', day: '2026-10-02', finding } });
  assert.deepEqual(cached.utterances, [...beat('s3c_baseline'), ...beat('s3_close_freshness').map(line => line.replace('{evidence_date}', '2026-10-02'))]);
  const oldFinding = { ...finding, retrievedAt: '2026-10-01T10:00:00.000Z' };
  const stale = result({ reservation: reserved, cache: { status: 'found', domain: 'example.com', day: '2026-10-01', stale: true, finding: oldFinding } });
  assert.equal(stale.session.state, 'S4');
  assert.deepEqual(stale.utterances, [...beat('s4c_stale').map(line => line.replace('{evidence_date}', '2026-10-01')), ...beat('s3_close_freshness').map(line => line.replace('{evidence_date}', '2026-10-01'))]);
  const badDate = result({ reservation: reserved, cache: { status: 'found', domain: 'example.com', day: '2026-10-01', stale: true, finding: { ...finding, retrievedAt: 'bad' } } });
  assert.deepEqual(badDate.utterances, beat('s4a_insufficient').map(line => line.replace('{domain}', 'example.com')));
  assert.ok(!badDate.utterances.some(line => line.includes('{')));
});

test('all S4 mappings, one run maximum, and S5 exits', () => {
  const insufficient = result({ reservation: reserved, finding: { ...finding, organicKeywords: null, organicTraffic: null } });
  assert.equal(insufficient.session.state, 'S4');
  assert.deepEqual(insufficient.utterances, beat('s4a_insufficient').map(line => line.replace('{domain}', 'example.com')));
  assert.deepEqual(advancePublicSeoSession(insufficient.session, { type: 'close' }).utterances, beat('s5b_soft_exit'));
  const failed: DiagnosisOutcome[] = [
    { reservation: { status: 'already_reserved' } }, { reservation: { status: 'budget_exhausted' } },
    { reservation: { status: 'unavailable' } }, { reservation: { status: 'invalid_arguments' } },
    { reservation: reserved, executorError: true },
  ];
  for (const outcome of failed) {
    const turn = result(outcome);
    assert.deepEqual(turn.utterances, beat('s4b_unavailable'));
    assert.equal(turn.session.runCount, 1);
    assert.deepEqual(advancePublicSeoSession(turn.session, { type: 'run', outcome: withFinding() }).utterances, []);
  }
  const start = startPublicSeoSession();
  const submitted = advancePublicSeoSession(start.session, { type: 'submit_domain', domain: 'example.com', market: 'IL' });
  const declined = advancePublicSeoSession(submitted.session, { type: 'decline' });
  assert.equal(declined.session.state, 'S5');
  assert.deepEqual(declined.utterances, beat('s5b_soft_exit'));
  assert.deepEqual(advancePublicSeoSession(declined.session, { type: 'run', outcome: withFinding() }).utterances, []);
  assert.deepEqual(advancePublicSeoSession(declined.session, { type: 'no_contact' }).utterances, beat('s5c_no_contact'));
});
