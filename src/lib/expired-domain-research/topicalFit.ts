import { normalizeResearchKeyword } from './validation';

export interface FitEvidence { id: string; keyword?: string; text?: string; continuity?: number | null; demand?: number | null; intent?: string | null; cpc?: number | null; }
export interface FitResult { score: number; confidence: number; components: Record<string, number>; matchedInputs: string[]; missingInputs: string[]; evidenceIds: string[]; }
export interface TopicalFitInput { keywords: string[]; historical: FitEvidence[]; openSeo: FitEvidence[]; }
export interface BusinessFitInput { businessInputs: string[]; openSeo: FitEvidence[]; }
const clamp = (value: number): number => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
const tokens = (values: string[]): string[] => [...new Set(values.flatMap(value => normalizeResearchKeyword(value).toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)))].sort();
const ids = (values: FitEvidence[]): string[] => [...new Set(values.map(value => value.id).filter(Boolean))].sort();
const linked = (values: FitEvidence[], wanted: string[], field: 'text' | 'keyword'): FitEvidence[] => values.filter(value => {
  const raw = value[field];
  if (!raw) return false;
  try { const supplied = new Set(tokens([raw])); return wanted.some(token => supplied.has(token)); } catch { return false; }
});

export function compileTopicalFit(input: TopicalFitInput): FitResult {
  const wanted = tokens(input.keywords); const historical = linked(input.historical ?? [], wanted, 'text'); const seo = linked(input.openSeo ?? [], wanted, 'keyword');
  const matched = wanted.filter(token => historical.some(item => tokens([item.text!]).includes(token)) || seo.some(item => tokens([item.keyword!]).includes(token)));
  const continuityValues = historical.map(item => item.continuity).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const continuity = continuityValues.length ? continuityValues.reduce((sum, value) => sum + clamp(value), 0) / continuityValues.length : 0;
  const coverage = wanted.length ? (matched.length / wanted.length) * 100 : 0;
  const demand = seo.some(item => typeof item.demand === 'number' && item.demand > 0) ? 100 : 0;
  const score = Math.round(clamp(coverage * 0.55 + continuity * 0.3 + demand * 0.15) * 100) / 100;
  const present = [historical.length > 0, seo.length > 0, continuityValues.length > 0].filter(Boolean).length;
  return { score, confidence: Math.round((present / 3) * 100), components: { keywordCoverage: Math.round(coverage * 100) / 100, historicalContinuity: Math.round(continuity * 100) / 100, demandEvidence: demand }, matchedInputs: matched, missingInputs: wanted.filter(value => !matched.includes(value)), evidenceIds: ids([...historical, ...seo]) };
}

export function compileBusinessFit(input: BusinessFitInput): FitResult {
  const wanted = tokens(input.businessInputs); const seo = linked(input.openSeo ?? [], wanted, 'keyword');
  const matched = wanted.filter(token => seo.some(item => tokens([item.keyword!]).includes(token)));
  const demand = seo.some(item => typeof item.demand === 'number' && item.demand > 0) ? 100 : 0;
  const intent = seo.some(item => ['commercial', 'transactional'].includes((item.intent ?? '').toLocaleLowerCase())) ? 100 : 0;
  const cpc = seo.some(item => typeof item.cpc === 'number' && item.cpc > 0) ? 100 : 0;
  const coverage = wanted.length ? matched.length / wanted.length * 100 : 0;
  return { score: Math.round(clamp(coverage * 0.5 + demand * 0.2 + intent * 0.2 + cpc * 0.1) * 100) / 100, confidence: Math.round(([demand, intent, cpc].filter(value => value > 0).length / 3) * 100), components: { businessInputCoverage: coverage, demandEvidence: demand, intentEvidence: intent, cpcEvidence: cpc }, matchedInputs: matched, missingInputs: wanted.filter(value => !matched.includes(value)), evidenceIds: ids(seo) };
}
