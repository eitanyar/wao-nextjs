import type { AuditResult } from '@/lib/gbp/auditScore';

export interface ReadyIdentity {
  auditId: string;
  placeId: string;
  businessName: string;
  formattedAddress: string;
  score: AuditResult;
}
export interface Candidate {
  placeId: string;
  displayName: string;
  formattedAddress: string;
}
export const AUDIT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const keys = ['categories', 'hours', 'phone_website', 'photos', 'reviews', 'description'];
export function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
export function validCandidates(value: unknown): value is Candidate[] {
  if (!Array.isArray(value) || value.length < 2) return false;
  return value.every(candidate => candidate && nonempty(candidate.placeId) && nonempty(candidate.displayName) &&
    nonempty(candidate.formattedAddress)) && new Set(value.map(candidate => candidate.placeId)).size === value.length;
}
export function readyIdentity(data: unknown, auditId: string, requestedPlace?: string | null, selected?: Candidate): ReadyIdentity {
  if (!data || typeof data !== 'object' || !AUDIT_ID.test(auditId)) throw new Error('Invalid identity');
  const value = data as Record<string, unknown>;
  if (value.status !== 'ready' || !nonempty(value.placeId) || !nonempty(value.businessName) || !nonempty(value.formattedAddress) ||
    (requestedPlace != null && requestedPlace !== value.placeId) || (selected && (selected.placeId !== value.placeId ||
      selected.displayName !== value.businessName || selected.formattedAddress !== value.formattedAddress))) throw new Error('Invalid identity');
  const score = value.score as AuditResult | undefined;
  if (!score || score.total !== 6 || !Array.isArray(score.dimensions) || score.dimensions.length !== 6 ||
    !keys.every(key => score.dimensions.filter(d => d && d.key === key).length === 1) ||
    !score.dimensions.every(d => ['pass', 'fail', 'unknown'].includes(d.status) && typeof d.evidence === 'string' &&
      d.copyToken === `DIM_${d.key.toUpperCase()}_TITLE`) ||
    score.passed !== score.dimensions.filter(d => d.status === 'pass').length ||
    score.failed !== score.dimensions.filter(d => d.status === 'fail').length ||
    score.unknown !== score.dimensions.filter(d => d.status === 'unknown').length) throw new Error('Invalid score');
  return { auditId, placeId: value.placeId, businessName: value.businessName, formattedAddress: value.formattedAddress, score };
}
export function identityQuery(url: string): string {
  const params = new URL(url).searchParams;
  return JSON.stringify([params.get('auditId'), params.get('placeId')]);
}
export function identityCopy(text: string, businessName: string, address: string): string {
  return text.replace(/\{business_name\}|\{address\}/g, token => token === '{business_name}' ? businessName : address);
}
