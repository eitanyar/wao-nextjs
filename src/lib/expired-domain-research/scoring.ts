import type { Candidate, CandidateScore } from './types';

const clamp = (value: number): number => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
const round = (value: number): number => Math.round(value * 100) / 100;
const ids = (candidate: Candidate): string[] => [...candidate.historicalEvidence, ...candidate.domainStatusEvidence, ...candidate.openSeoEvidence, ...candidate.mozAuthorityEvidence].map(evidence => evidence.id).sort();

export function scoreCandidate(candidate: Candidate): CandidateScore {
  const missingFields: string[] = [];
  const evidenceIds = ids(candidate);
  const topicalFit = candidate.topicalFit === null ? (missingFields.push('topical_fit'), 0) : clamp(candidate.topicalFit);
  const continuity = candidate.historicalEvidence.map(evidence => evidence.continuityScore).find((value): value is number => value !== null);
  const historicalContinuity = continuity === undefined ? (missingFields.push('historical_continuity'), 0) : clamp(continuity);
  const businessFit = candidate.businessFit === null ? (missingFields.push('business_fit'), 0) : clamp(candidate.businessFit);
  const moz = candidate.mozAuthorityEvidence[0];
  const mozComplete = Boolean(moz && moz.pageAuthority !== null && moz.domainAuthority !== null && moz.spamScore !== null);
  if (!mozComplete) missingFields.push('moz_metrics_incomplete');
  const authority = mozComplete ? round((moz!.pageAuthority! + moz!.domainAuthority!) / 2) : 0;
  const cleanliness = mozComplete ? round(100 - moz!.spamScore!) : 0;
  const penalties: CandidateScore['penalties'] = [];
  if (candidate.riskGates.some(gate => gate.id === 'risky_redirect' && gate.status !== 'pass')) {
    const evidence = candidate.riskGates.filter(gate => gate.id === 'risky_redirect').flatMap(gate => gate.evidenceIds).sort();
    penalties.push({ code: 'risky_redirect', points: 25, evidenceIds: evidence });
  }
  if (candidate.domainStatusEvidence.length === 0 || candidate.domainStatusEvidence.some(evidence => evidence.availability === 'unknown')) missingFields.push('domain_status_unknown');
  const weighted = topicalFit * 0.30 + historicalContinuity * 0.15 + businessFit * 0.15 + authority * 0.25 + cleanliness * 0.15;
  const penalty = penalties.reduce((total, item) => total + item.points, 0);
  const score = round(Math.max(0, weighted - penalty));
  const presentComponents = [candidate.topicalFit, continuity, candidate.businessFit, mozComplete ? authority : undefined, mozComplete ? cleanliness : undefined].filter(value => value !== null && value !== undefined).length;
  const confidence = round((presentComponents / 5) * 100);
  return { hostname: candidate.hostname, score, confidence, components: { topicalFit, historicalContinuity, businessFit, authority, cleanliness }, evidenceIds, penalties, missingFields: [...new Set(missingFields)].sort(), formulaVersion: 1 };
}

export function rankCandidates(candidates: Candidate[]): CandidateScore[] {
  return candidates.map(scoreCandidate).sort((left, right) => right.score - left.score || right.confidence - left.confidence || Number(left.missingFields.includes('moz_metrics_incomplete')) - Number(right.missingFields.includes('moz_metrics_incomplete')) || left.hostname.localeCompare(right.hostname));
}
