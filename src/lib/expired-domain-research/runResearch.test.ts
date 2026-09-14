import assert from 'node:assert/strict';
import test from 'node:test';
import { createResearchRun, resumeExpiredDomainResearch, runExpiredDomainResearch } from './runResearch';
import type { CandidateEvidenceBatch, ResearchDependencies } from './runResearch';
import type { DomainStatusEvidence, HistoricalEvidence, MozAuthorityEvidence, OpenSeoEvidence, ProviderOperation, ResearchRun } from './types';
import { validateResearchRun } from './validation';

const stamp = '2026-01-01T00:00:00.000Z';
const digest = 'a'.repeat(64);
const input = { runId: 'run-1', keywords: ['topic research'], waybackUrls: ['https://archive.test/topic'], requestedCandidates: ['a.test', 'b.test'], requestedAt: stamp };
const base = (id: string, provider: string, retrievedAt = stamp) => ({ id, sourceUrl: 'https://evidence.test/', provider, tool: 'test', method: 'injected', retrievedAt, freshnessHours: 1, confidence: 90, rawResponseDigest: digest });
const historical = (hostname: string, id = `history-${hostname}`, retrievedAt = stamp): HistoricalEvidence => ({ ...base(id, 'wayback', retrievedAt), capturedAt: stamp, topicalTags: ['topic'], continuityScore: 80 });
const status = (hostname: string, id = `status-${hostname}`, retrievedAt = stamp): DomainStatusEvidence => ({ ...base(id, 'domain-status', retrievedAt), availability: 'unknown', observedAt: stamp });
const open = (hostname: string, id = `open-${hostname}`, retrievedAt = stamp): OpenSeoEvidence => ({ ...base(id, 'open-seo', retrievedAt), provider: 'open-seo', domainRank: 1, pageRank: 2, targetSpamScore: 3, backlinks: 4, referringDomains: 5, organicTraffic: 6, organicKeywords: 7 });
const moz = (hostname: string, id = `moz-${hostname}`, retrievedAt = stamp): MozAuthorityEvidence => ({ ...base(id, 'moz-data-api-v3', retrievedAt), provider: 'moz-data-api-v3', pageAuthority: 30, domainAuthority: 40, spamScore: 2 });
const result = <T>(hostname: string, evidence: T[], statusValue: 'successful' | 'negative' | 'partial' | 'unavailable' = 'successful', reason: string | null = null) => ({ hostname, status: statusValue, reason, evidence });
const batch = <T>(operation: string, results: ReturnType<typeof result<T>>[], extras: Partial<CandidateEvidenceBatch<T>> = {}): CandidateEvidenceBatch<T> => ({ operation, status: 'successful', results, skipped: [], operations: results.length, httpAttempts: results.length, ...extras });
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function dependencies(options: { now?: () => Date; id?: () => string; history?: (hosts: string[]) => Promise<CandidateEvidenceBatch<HistoricalEvidence>>; status?: (hosts: string[]) => Promise<CandidateEvidenceBatch<DomainStatusEvidence>>; open?: (hosts: string[]) => Promise<CandidateEvidenceBatch<OpenSeoEvidence>>; moz?: (hosts: string[]) => Promise<CandidateEvidenceBatch<MozAuthorityEvidence>>; calls?: string[]; persist?: (run: ResearchRun) => Promise<boolean>; discover?: () => Promise<{ candidates: string[]; evidence: ReturnType<typeof result<HistoricalEvidence>>[] }> } = {}): ResearchDependencies {
  const calls = options.calls ?? []; let number = 0;
  return { now: options.now ?? (() => new Date(stamp)), id: options.id ?? (() => `id-${++number}`), persist: options.persist ?? (async () => true), discover: options.discover ?? (async () => { calls.push('discover'); return { candidates: ['B.test', 'a.test'], evidence: [result('a.test', [historical('a.test')])] }; }), history: options.history ?? (async hosts => { calls.push(`history:${hosts.join(',')}`); return batch('history', hosts.map(hostname => result(hostname, [historical(hostname)]))); }), status: options.status ?? (async hosts => { calls.push(`status:${hosts.join(',')}`); return batch('status', hosts.map(hostname => result(hostname, [status(hostname)]))); }), openSeo: options.open ?? (async hosts => { calls.push(`open:${hosts.join(',')}`); return batch('open', hosts.map(hostname => result(hostname, [open(hostname)])), { observedCredits: hosts.length }); }), moz: options.moz ?? (async hosts => { calls.push(`moz:${hosts.join(',')}`); return batch('moz', hosts.map(hostname => result(hostname, [moz(hostname)]))); }) };
}

async function completedRun(): Promise<ResearchRun> {
  let number = 0;
  const run = createResearchRun(input, { approvedOpenSeoCredits: 10, approvedMozCalls: 10, now: () => new Date(stamp), id: () => `seed-${++number}` });
  assert.equal((await runExpiredDomainResearch(run, dependencies({ id: () => `run-${++number}` }))).status, 'complete');
  return run;
}

function hold(run: ResearchRun): void { run.orchestration!.stage = 'held'; run.orchestration!.stageHistory.push({ stage: 'held', completedAt: stamp }); }
function setAllFresh(run: ResearchRun, at: Date): void { const timestamp = at.toISOString(); for (const candidate of run.candidates) for (const evidence of [...candidate.historicalEvidence, ...candidate.domainStatusEvidence, ...candidate.openSeoEvidence, ...candidate.mozAuthorityEvidence]) evidence.retrievedAt = timestamp; run.updatedAt = timestamp; }

test('typed candidate-bound adapter evidence and outcomes persist per matching hostname', async () => {
  const run = await completedRun();
  assert.deepEqual(run.candidates.map(candidate => candidate.hostname), ['a.test', 'b.test']);
  for (const candidate of run.candidates) assert.deepEqual([candidate.historicalEvidence.length, candidate.domainStatusEvidence.length, candidate.openSeoEvidence.length, candidate.mozAuthorityEvidence.length], [1, 1, 1, 1]);
  assert.equal(run.orchestration?.candidateEvidenceOutcomes?.length, 8);
  for (const outcome of run.orchestration?.candidateEvidenceOutcomes ?? []) { const operation: ProviderOperation | undefined = run.orchestration?.providerOperations.find(entry => entry.id === outcome.operationId); const candidate = run.candidates.find(item => item.hostname === outcome.hostname)!; const evidence = outcome.provider === 'wayback' ? candidate.historicalEvidence : outcome.provider === 'domain-status' ? candidate.domainStatusEvidence : outcome.provider === 'open-seo' ? candidate.openSeoEvidence : candidate.mozAuthorityEvidence; assert.equal(operation?.provider, outcome.provider); assert.equal(outcome.evidenceIds.every(id => evidence.some(item => item.id === id) && Boolean(operation?.evidenceIds.includes(id))), true); }
});

test('negative results retain candidate-bound reasons and malformed results hold before later adapters', async () => {
  const negative = createResearchRun(input, { approvedOpenSeoCredits: 10, approvedMozCalls: 10, now: () => new Date(stamp), id: () => 'negative' });
  assert.equal((await runExpiredDomainResearch(negative, dependencies({ history: async hosts => batch('history', hosts.map(hostname => result(hostname, [], 'unavailable', 'history_unavailable'))) }))).status, 'complete');
  assert.equal(negative.orchestration?.candidateEvidenceOutcomes?.filter(item => item.reason === 'history_unavailable').length, 1);
  const calls: string[] = []; const malformed = createResearchRun(input, { approvedOpenSeoCredits: 10, approvedMozCalls: 10, now: () => new Date(stamp), id: () => 'malformed' });
  const outcome = await runExpiredDomainResearch(malformed, dependencies({ calls, history: async () => batch('history', [result('outside.test', [historical('a.test')])]) }));
  assert.equal(outcome.status, 'held'); assert.equal(outcome.reason, 'adapter_hostname_invalid'); assert.equal(calls.some(call => /^(status|open|moz):/.test(call)), false);
});

test('all provider TTL boundaries reuse equality and refresh only stale eligible hostnames', async () => {
  const providers = [{ name: 'wayback', hours: 720, call: 'history', stale: (run: ResearchRun, at: Date) => run.candidates[0].historicalEvidence[0].retrievedAt = new Date(at.getTime() - 720 * 60 * 60 * 1000 - 1).toISOString(), history: true }, { name: 'domain-status', hours: 24, call: 'status', stale: (run: ResearchRun, at: Date) => run.candidates[0].domainStatusEvidence[0].retrievedAt = new Date(at.getTime() - 24 * 60 * 60 * 1000 - 1).toISOString() }, { name: 'open-seo', hours: 12, call: 'open', stale: (run: ResearchRun, at: Date) => run.candidates[0].openSeoEvidence[0].retrievedAt = new Date(at.getTime() - 12 * 60 * 60 * 1000 - 1).toISOString() }, { name: 'moz-data-api-v3', hours: 168, call: 'moz', stale: (run: ResearchRun, at: Date) => run.candidates[0].mozAuthorityEvidence[0].retrievedAt = new Date(at.getTime() - 168 * 60 * 60 * 1000 - 1).toISOString() }];
  for (const provider of providers) {
    const at = new Date(Date.parse(stamp) + provider.hours * 60 * 60 * 1000); const equal = await completedRun(); hold(equal);
    const equalityCalls: string[] = []; assert.equal((await resumeExpiredDomainResearch(equal, { approvedOpenSeoCredits: 10, approvedMozCalls: 10 }, dependencies({ calls: equalityCalls, now: () => at }))).status, 'complete', provider.name);
    assert.equal(equalityCalls.some(call => call.startsWith(`${provider.call}:`)), false, `${provider.name} equality fresh`);
    const run = await completedRun(); setAllFresh(run, at); provider.stale(run, at); hold(run); const calls: string[] = [];
    const outcome = await resumeExpiredDomainResearch(run, { approvedOpenSeoCredits: 10, approvedMozCalls: 10 }, dependencies({ calls, now: () => at, history: async hosts => { calls.push(`history:${hosts.join(',')}`); return batch('history', hosts.map(hostname => result(hostname, [historical(hostname, `new-history-${hostname}`, at.toISOString())]))); }, status: async hosts => { calls.push(`status:${hosts.join(',')}`); return batch('status', hosts.map(hostname => result(hostname, [status(hostname, `new-status-${hostname}`, at.toISOString())]))); }, open: async hosts => { calls.push(`open:${hosts.join(',')}`); return batch('open', hosts.map(hostname => result(hostname, [open(hostname, `new-open-${hostname}`, at.toISOString())])), { observedCredits: hosts.length }); }, moz: async hosts => { calls.push(`moz:${hosts.join(',')}`); return batch('moz', hosts.map(hostname => result(hostname, [moz(hostname, `new-moz-${hostname}`, at.toISOString())]))); } }));
    assert.equal(outcome.status, 'complete', `${provider.name} stale resumes`); assert.deepEqual(calls.filter(call => call.includes(':')), [`${provider.call}:a.test`], `${provider.name} only requests stale target`);
  }
});

test('provider ceilings retain only eligible ordered candidates', async () => {
  const names = Array.from({ length: 55 }, (_, index) => `d${String(index).padStart(2, '0')}.test`); const calls: string[] = []; let number = 0;
  const run = createResearchRun({ ...input, runId: 'run-ceilings', requestedCandidates: [] }, { approvedOpenSeoCredits: 10, approvedMozCalls: 10, now: () => new Date(stamp), id: () => `cap-${++number}` });
  assert.equal((await runExpiredDomainResearch(run, dependencies({ calls, discover: async () => ({ candidates: names, evidence: [] }) }))).status, 'complete');
  assert.deepEqual(calls.filter(call => call.includes(':')), [`history:${names.slice(0, 50).join(',')}`, `status:${names.slice(0, 25).join(',')}`, `open:${names.slice(0, 3).join(',')}`, `moz:${names.slice(0, 10).join(',')}`]);
});

test('mixed fresh stale and missing history evidence requests only stale or missing hostnames in order', async () => {
  let number = 0; const run = createResearchRun({ ...input, runId: 'mixed-history', requestedCandidates: ['a.test', 'b.test', 'c.test'] }, { approvedOpenSeoCredits: 10, approvedMozCalls: 10, now: () => new Date(stamp), id: () => `mixed-${++number}` });
  assert.equal((await runExpiredDomainResearch(run, dependencies({ discover: async () => ({ candidates: ['a.test', 'b.test', 'c.test'], evidence: [result('a.test', [historical('a.test')])] }) }))).status, 'complete');
  const at = new Date(Date.parse(stamp) + 720 * 60 * 60 * 1000); setAllFresh(run, at); run.candidates[0].historicalEvidence[0].retrievedAt = new Date(at.getTime() - 720 * 60 * 60 * 1000 - 1).toISOString(); const missing = run.orchestration!.candidateEvidenceOutcomes!.find(item => item.hostname === 'b.test' && item.provider === 'wayback')!; run.candidates[1].historicalEvidence = []; run.scores = run.scores.map(score => score.hostname === 'b.test' ? { ...score, evidenceIds: score.evidenceIds.filter(id => !missing.evidenceIds.includes(id)) } : score); run.orchestration!.candidateEvidenceOutcomes = run.orchestration!.candidateEvidenceOutcomes!.filter(item => item !== missing); run.orchestration!.providerOperations = run.orchestration!.providerOperations.filter(item => item.id !== missing.operationId); hold(run);
  const calls: string[] = []; let resumeNumber = 0; const outcome = await resumeExpiredDomainResearch(run, { approvedOpenSeoCredits: 10, approvedMozCalls: 10 }, dependencies({ calls, now: () => at, id: () => `resume-mixed-${++resumeNumber}`, history: async hosts => { calls.push(`history:${hosts.join(',')}`); return batch('history', hosts.map(hostname => result(hostname, [historical(hostname, `mixed-new-${hostname}`, at.toISOString())]))); } }));
  assert.equal(outcome.status, 'complete', outcome.reason); assert.equal(calls.find(call => call.startsWith('history:')), 'history:a.test,b.test'); assert.equal(calls.some(call => call.includes('c.test')), false);
});

test('invalid loaded run or approval causes zero writes and zero provider calls', async () => {
  let writes = 0; const calls: string[] = []; const deps = dependencies({ calls, persist: async () => { writes += 1; return true; } }); deps.read = async () => ({ invalid: true } as unknown as ResearchRun);
  await assert.rejects(() => resumeExpiredDomainResearch('missing', { approvedOpenSeoCredits: 10, approvedMozCalls: 10 }, deps), /invalid_resume_run/); assert.equal(writes, 0); assert.equal(calls.length, 0);
  const run = await completedRun(); hold(run); await assert.rejects(() => resumeExpiredDomainResearch(run, { approvedOpenSeoCredits: -1, approvedMozCalls: 10 }, deps), /invalid_resume_approval/); assert.equal(writes, 0); assert.equal(calls.length, 0);
});

test('replacement approval persists before metered zero-approval hold and completed retry is inert', async () => {
  const run = await completedRun(); const at = new Date(Date.parse(stamp) + 12 * 60 * 60 * 1000 + 1); setAllFresh(run, at); run.candidates[0].openSeoEvidence[0].retrievedAt = new Date(at.getTime() - 12 * 60 * 60 * 1000 - 1).toISOString(); hold(run);
  const snapshots: ResearchRun[] = []; const calls: string[] = []; const held = await resumeExpiredDomainResearch(run, { approvedOpenSeoCredits: 0, approvedMozCalls: 10 }, dependencies({ calls, now: () => at, persist: async saved => { snapshots.push(clone(saved)); return true; } }));
  assert.equal(held.status, 'held'); assert.equal(calls.some(call => call.startsWith('open:')), false); assert.equal(snapshots[0].orchestration?.approvedOpenSeoCredits, 0); assert.equal(snapshots[0].orchestration?.stage, 'niche_enriched'); assert.equal(snapshots.at(-1)?.orchestration?.holdReasons.includes('openseo_approval_zero'), true);
  const complete = await completedRun(); const before = JSON.stringify(complete); const completeCalls: string[] = []; assert.equal((await resumeExpiredDomainResearch(complete, { approvedOpenSeoCredits: 10, approvedMozCalls: 10 }, dependencies({ calls: completeCalls }))).status, 'complete'); assert.equal(JSON.stringify(complete), before); assert.equal(completeCalls.length, 0);
});

test('normal-stage resume rewinds to stale earlier wayback evidence without later provider calls', async () => {
  const now = new Date(Date.parse(stamp) + 1000 * 60 * 60 * 1000); const run = await completedRun();
  run.orchestration!.stage = 'risk_gated'; run.orchestration!.stageHistory = run.orchestration!.stageHistory.slice(0, -2); setAllFresh(run, now);
  const stale = clone(run.candidates[0].historicalEvidence[0]); stale.retrievedAt = new Date(now.getTime() - 720 * 60 * 60 * 1000 - 1).toISOString(); run.candidates[0].historicalEvidence[0] = stale;
  assert.equal(run.updatedAt, now.toISOString());
  assert.equal(validateResearchRun(run), true);
  const prior = clone(run); const snapshots: ResearchRun[] = []; const calls: string[] = []; let number = 0;
  const deps = dependencies({ now: () => now, id: () => `normal-resume-${++number}`, persist: async saved => { snapshots.push(clone(saved)); return true; }, discover: async () => { throw new Error('unexpected_discover'); }, history: async hosts => { calls.push(`history:${hosts.join(',')}`); return batch('history-resume', hosts.map(hostname => result(hostname, [historical(hostname, `normal-new-${hostname}`, now.toISOString())]))); }, status: async () => { throw new Error('unexpected_status'); }, open: async () => { throw new Error('unexpected_open'); }, moz: async () => { throw new Error('unexpected_moz'); } });
  deps.read = async runId => runId === run.runId ? clone(run) : null;
  const outcome = await resumeExpiredDomainResearch(run.runId, { approvedOpenSeoCredits: 10, approvedMozCalls: 10 }, deps);
  assert.equal(snapshots[0].orchestration?.stage, 'discovered'); assert.equal(snapshots[0].orchestration?.approvedOpenSeoCredits, 10); assert.equal(snapshots[0].orchestration?.approvedMozCalls, 10);
  assert.deepEqual(calls, ['history:a.test']); assert.equal(outcome.status, 'complete'); assert.equal(outcome.run.orchestration?.stage, 'complete');
  const candidate = outcome.run.candidates.find(item => item.hostname === 'a.test')!; assert.equal(JSON.stringify(candidate.historicalEvidence.slice(0, 1)), JSON.stringify(prior.candidates[0].historicalEvidence)); assert.equal(candidate.historicalEvidence.length, 2);
  const meta = outcome.run.orchestration!; const priorMeta = prior.orchestration!;
  assert.equal(JSON.stringify(meta.providerOperations.slice(0, priorMeta.providerOperations.length)), JSON.stringify(priorMeta.providerOperations)); assert.equal(JSON.stringify(meta.candidateEvidenceOutcomes?.slice(0, priorMeta.candidateEvidenceOutcomes?.length)), JSON.stringify(priorMeta.candidateEvidenceOutcomes)); assert.equal(JSON.stringify(outcome.run.providerUsage), JSON.stringify(prior.providerUsage)); assert.equal(JSON.stringify(meta.skips), JSON.stringify(priorMeta.skips)); assert.equal(JSON.stringify(meta.holdReasons), JSON.stringify(priorMeta.holdReasons)); assert.equal(JSON.stringify(meta.failureReasons), JSON.stringify(priorMeta.failureReasons)); assert.equal(JSON.stringify(meta.stageHistory.slice(0, priorMeta.stageHistory.length)), JSON.stringify(priorMeta.stageHistory)); assert.equal(new Set(meta.stageHistory.map(entry => entry.stage)).size, meta.stageHistory.length);
  const operation = meta.providerOperations.at(-1)!; const evidence = candidate.historicalEvidence.at(-1)!; const candidateOutcome = (meta.candidateEvidenceOutcomes ?? []).at(-1)!;
  assert.equal(operation.provider, 'wayback'); assert.deepEqual(operation.evidenceIds, [evidence.id]); assert.equal(candidateOutcome.hostname, 'a.test'); assert.equal(candidateOutcome.operationId, operation.id); assert.deepEqual(candidateOutcome.evidenceIds, [evidence.id]);
});

test('initial execution persists immutable validated lifecycle snapshots in order', async () => {
  let number = 0;
  const snapshots: ResearchRun[] = [];
  const calls: string[] = [];
  const run = createResearchRun(input, { approvedOpenSeoCredits: 3, approvedMozCalls: 10, now: () => new Date(stamp), id: () => `lifecycle-${++number}` });
  const outcome = await runExpiredDomainResearch(run, dependencies({ calls, id: () => `operation-${++number}`, persist: async saved => { snapshots.push(clone(saved)); return true; } }));
  assert.equal(outcome.status, 'complete');
  assert.deepEqual(snapshots.map(saved => saved.orchestration?.stage), ['discovered', 'status_checked', 'niche_enriched', 'authority_enriched', 'risk_gated', 'ranked', 'complete']);
  assert.equal(snapshots.every(validateResearchRun), true);
  const serialized = snapshots.map(saved => JSON.stringify(saved));
  run.candidates[0].historicalEvidence[0].topicalTags.push('later');
  assert.deepEqual(snapshots.map(saved => JSON.stringify(saved)), serialized);
  assert.deepEqual(calls, ['discover', 'history:b.test', 'status:a.test,b.test', 'open:a.test,b.test', 'moz:a.test,b.test']);
});

test('persistence failures stop initial execution at every durable transition', async () => {
  const cases = [
    { stage: 'discovered', later: /^(history|status|open|moz):/ }, { stage: 'status_checked', later: /^(status|open|moz):/ },
    { stage: 'niche_enriched', later: /^(open|moz):/ }, { stage: 'authority_enriched', later: /^moz:/ },
    { stage: 'risk_gated', later: /^$/ }, { stage: 'complete', later: /^$/ },
  ];
  for (const item of cases) {
    const snapshots: ResearchRun[] = []; const calls: string[] = []; let number = 0;
    const run = createResearchRun({ ...input, runId: `persist-${item.stage}` }, { approvedOpenSeoCredits: 3, approvedMozCalls: 10, now: () => new Date(stamp), id: () => `persist-id-${++number}` });
    const outcome = await runExpiredDomainResearch(run, dependencies({ calls, id: () => `persist-operation-${++number}`, persist: async saved => { snapshots.push(clone(saved)); return saved.orchestration?.stage !== item.stage; } }));
    assert.equal(outcome.status, 'failed', item.stage); assert.equal(outcome.reason, 'persistence_failed', item.stage);
    assert.equal(calls.some(call => item.later.test(call)), false, item.stage); assert.equal(snapshots.at(-1)?.orchestration?.stage, item.stage, item.stage);
    assert.equal(snapshots.slice(0, -1).every(validateResearchRun), true, item.stage);
  }
});

test('initial normalization records invalid duplicate and cap exclusions without mutating inputs', async () => {
  const discovered = ['A.test', 'invalid host', 'a.test', ...Array.from({ length: 52 }, (_, index) => `d${String(index).padStart(2, '0')}.test`)];
  const requested = [' request.test ', 'A.test', 'bad host']; const original = clone({ discovered, requested });
  const run = createResearchRun({ ...input, runId: 'normalization', requestedCandidates: requested }, { approvedOpenSeoCredits: 3, approvedMozCalls: 10, now: () => new Date(stamp), id: () => 'normalization-id' });
  const outcome = await runExpiredDomainResearch(run, dependencies({ discover: async () => ({ candidates: discovered, evidence: [] }) }));
  assert.equal(outcome.status, 'complete');
  assert.deepEqual(run.candidates.map(candidate => candidate.hostname), ['request.test', 'a.test', ...Array.from({ length: 48 }, (_, index) => `d${String(index).padStart(2, '0')}.test`)]);
  assert.deepEqual(run.orchestration?.truncations, [{ stage: 'discovered', originalCount: 54, retainedCount: 50, skippedHostnames: ['d48.test', 'd49.test', 'd50.test', 'd51.test'], reason: 'candidate_cap_50' }]);
  assert.deepEqual(run.orchestration?.skips, [{ stage: 'discovered', hostname: 'bad host', reason: 'invalid_hostname' }, { stage: 'discovered', hostname: 'a.test', reason: 'duplicate_hostname' }, { stage: 'discovered', hostname: 'invalid host', reason: 'invalid_hostname' }, ...['d48.test', 'd49.test', 'd50.test', 'd51.test'].map(hostname => ({ stage: 'discovered', hostname, reason: 'candidate_cap_50' }))]);
  assert.deepEqual({ discovered, requested }, original);
});

test('invalid approvals and unpersisted metered estimates fail closed before provider calls', async () => {
  const invalid = createResearchRun(input, { approvedOpenSeoCredits: 3, approvedMozCalls: 10, now: () => new Date(stamp), id: () => 'invalid-approval' }); invalid.orchestration!.approvedOpenSeoCredits = -1;
  const invalidCalls: string[] = []; let invalidWrites = 0;
  const invalidOutcome = await runExpiredDomainResearch(invalid, dependencies({ calls: invalidCalls, persist: async () => { invalidWrites += 1; return true; } }));
  assert.equal(invalidOutcome.status, 'failed'); assert.equal(invalidOutcome.reason, 'invalid_approval'); assert.equal(invalidWrites, 0); assert.deepEqual(invalidCalls, []);
  const snapshots: ResearchRun[] = []; const calls: string[] = []; let openCalled = false;
  const estimate = createResearchRun(input, { approvedOpenSeoCredits: 3, approvedMozCalls: 10, now: () => new Date(stamp), id: () => 'estimate' });
  const outcome = await runExpiredDomainResearch(estimate, dependencies({ calls, persist: async saved => { snapshots.push(clone(saved)); return true; }, open: async hosts => { openCalled = true; assert.equal(snapshots.at(-1)?.orchestration?.stage, 'niche_enriched'); assert.equal(snapshots.at(-1)?.orchestration?.estimatedOpenSeoCredits, hosts.length); return batch('open', hosts.map(hostname => result(hostname, [open(hostname)])), { observedCredits: hosts.length, estimatedCredits: hosts.length, remainingCredits: 0 }); } }));
  assert.equal(outcome.status, 'complete'); assert.equal(openCalled, true);
});

test('malformed provider accounting holds before fabricated batch state or later adapters', async () => {
  const rows: Array<Partial<CandidateEvidenceBatch<OpenSeoEvidence>>> = [{ operations: -1 }, { operations: 1.5 }, { operations: Number.NaN }, { httpAttempts: -1 }, { httpAttempts: 1.5 }, { observedCredits: -1 }, { observedCredits: 1.5 }, { observedCredits: Number.POSITIVE_INFINITY }, { estimatedCredits: -1 }, { remainingCredits: -1 }, { observedCredits: 4 }];
  for (const [index, extras] of rows.entries()) {
    const snapshots: ResearchRun[] = []; const calls: string[] = [];
    const run = createResearchRun({ ...input, runId: `bad-accounting-${index}` }, { approvedOpenSeoCredits: 3, approvedMozCalls: 10, now: () => new Date(stamp), id: () => `bad-${index}` });
    const outcome = await runExpiredDomainResearch(run, dependencies({ calls, persist: async saved => { snapshots.push(clone(saved)); return true; }, open: async hosts => batch('open', hosts.map(hostname => result(hostname, [open(hostname)])), { observedCredits: hosts.length, estimatedCredits: hosts.length, remainingCredits: 0, ...extras }) }));
    assert.equal(outcome.status, 'held', String(index)); assert.equal(calls.some(call => call.startsWith('moz:')), false, String(index));
    assert.equal(snapshots.some(saved => saved.orchestration?.stage === 'authority_enriched' || saved.orchestration?.stage === 'complete'), false, String(index));
    assert.equal(run.orchestration?.providerOperations.some(operation => operation.provider === 'open-seo'), false, String(index));
  }
});

test('all provider outcome classes retain candidate operation and evidence provenance', async () => {
  const statuses: Array<'successful' | 'negative' | 'partial' | 'unavailable'> = ['successful', 'negative', 'partial', 'unavailable'];
  for (const statusValue of statuses) {
    let number = 0;
    const run = createResearchRun({ ...input, runId: `outcome-${statusValue}` }, { approvedOpenSeoCredits: 3, approvedMozCalls: 10, now: () => new Date(stamp), id: () => `outcome-${++number}` });
    const outcome = await runExpiredDomainResearch(run, dependencies({ id: () => `outcome-operation-${++number}`, discover: async () => ({ candidates: ['a.test', 'b.test'], evidence: [] }), history: async hosts => batch('history', hosts.map(hostname => result(hostname, statusValue === 'successful' ? [historical(hostname)] : [], statusValue, statusValue === 'successful' ? null : `history_${statusValue}`))), status: async hosts => batch('status', hosts.map(hostname => result(hostname, statusValue === 'successful' ? [status(hostname)] : [], statusValue, statusValue === 'successful' ? null : `status_${statusValue}`))), open: async hosts => batch('open', hosts.map(hostname => result(hostname, statusValue === 'successful' ? [open(hostname)] : [], statusValue, statusValue === 'successful' ? null : `open_${statusValue}`)), { observedCredits: hosts.length, estimatedCredits: hosts.length, remainingCredits: 0 }), moz: async hosts => batch('moz', hosts.map(hostname => result(hostname, statusValue === 'successful' ? [moz(hostname)] : [], statusValue, statusValue === 'successful' ? null : `moz_${statusValue}`))) }));
    assert.equal(outcome.status, 'complete', statusValue);
    for (const item of run.orchestration?.candidateEvidenceOutcomes ?? []) { const operation = run.orchestration?.providerOperations.find(candidate => candidate.id === item.operationId); assert.equal(item.status, statusValue, statusValue); assert.equal(operation?.provider, item.provider, statusValue); assert.deepEqual(operation?.evidenceIds, item.evidenceIds, statusValue); }
    assert.equal(validateResearchRun(run), true, statusValue);
  }
});
