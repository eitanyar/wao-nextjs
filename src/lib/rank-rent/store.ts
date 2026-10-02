/**
 * Atomic filesystem store for isolated rank-and-rent portfolio control-plane records.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { PortfolioSite, SiteLifecycle } from './types';

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const MAX_RECORD_BYTES = 1024 * 1024;
const ROOT_FIELDS = ['schemaVersion', 'siteId', 'niche', 'ownershipModel', 'canonicalDomainCandidate', 'researchId', 'repository', 'cloudflarePages', 'approvals', 'certification', 'events', 'lifecycle', 'createdAt', 'updatedAt'];


export interface PortfolioSiteSummary {
  siteId: string;
  niche: string;
  ownershipModel: PortfolioSite['ownershipModel'];
  canonicalDomainCandidate: string;
  lifecycle: SiteLifecycle;
  updatedAt: string;
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyFields(value: Record<string, unknown>, fields: readonly string[]): boolean {
  return Object.keys(value).every(key => fields.includes(key));
}

function validText(value: unknown, maxLength = 256): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= maxLength
    && !/[\u0000-\u001F\u007F-\u009F]/u.test(value);
}

function validTimestamp(value: unknown): value is string {
  return validText(value, 64) && Number.isFinite(Date.parse(value));
}

function validDomain(value: unknown): value is string {
  if (!validText(value, 253) || value.endsWith('.')) return false;
  return value.split('.').length >= 2
    && value.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
}

function validRemoteUrl(value: unknown): boolean {
  if (value === undefined) return true;
  if (!validText(value, 2048)) return false;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:')
      && !parsed.username
      && !parsed.password;
  } catch {
    return false;
  }
}

function validRepositoryBinding(value: unknown): boolean {
  if (!record(value) || !hasOnlyFields(value, ['repositoryId', 'status', 'remoteUrl'])) return false;
  return typeof value.repositoryId === 'string'
    && SAFE_ID.test(value.repositoryId)
    && ['unbound', 'approved', 'connected'].includes(String(value.status))
    && validRemoteUrl(value.remoteUrl);
}

function validPagesBinding(value: unknown): boolean {
  if (!record(value) || !hasOnlyFields(value, ['status', 'projectId'])) return false;
  return ['unbound', 'approved', 'connected'].includes(String(value.status))
    && (value.projectId === undefined || (typeof value.projectId === 'string' && SAFE_ID.test(value.projectId)));
}

function validApproval(value: unknown): boolean {
  if (!record(value) || !hasOnlyFields(value, ['approvalId', 'requiredFor', 'status', 'requestedAt', 'resolvedAt'])) return false;
  return typeof value.approvalId === 'string'
    && SAFE_ID.test(value.approvalId)
    && ['candidate', 'researching', 'approved_for_content', 'approved_for_build', 'ready_for_manual_launch', 'live', 'held', 'retired'].includes(String(value.requiredFor))
    && ['pending', 'approved', 'rejected', 'held'].includes(String(value.status))
    && validTimestamp(value.requestedAt)
    && (value.resolvedAt === undefined || validTimestamp(value.resolvedAt));
}

function validCertification(value: unknown): boolean {
  if (!record(value) || !hasOnlyFields(value, ['status', 'certifiedAt'])) return false;
  return ['not_started', 'pending', 'certified', 'held', 'rejected'].includes(String(value.status))
    && (value.certifiedAt === undefined || validTimestamp(value.certifiedAt));
}

function validEvent(value: unknown): boolean {
  if (!record(value) || !hasOnlyFields(value, ['eventId', 'type', 'occurredAt'])) return false;
  return typeof value.eventId === 'string'
    && SAFE_ID.test(value.eventId)
    && ['created', 'lifecycle_changed', 'approval_recorded', 'certification_recorded', 'repository_bound', 'pages_bound', 'held', 'retired'].includes(String(value.type))
    && validTimestamp(value.occurredAt);
}

function requiresApproval(lifecycle: SiteLifecycle): readonly SiteLifecycle[] {
  switch (lifecycle) {
    case 'approved_for_content': return ['approved_for_content'];
    case 'approved_for_build': return ['approved_for_content', 'approved_for_build'];
    case 'ready_for_manual_launch': return ['approved_for_content', 'approved_for_build', 'ready_for_manual_launch'];
    case 'live': return ['approved_for_content', 'approved_for_build', 'ready_for_manual_launch', 'live'];
    default: return [];
  }
}

function validSite(value: unknown, expectedSiteId?: string): value is PortfolioSite {
  if (!record(value) || !hasOnlyFields(value, ROOT_FIELDS)) return false;
  if (value.schemaVersion !== 1 || typeof value.siteId !== 'string' || !SAFE_ID.test(value.siteId) || (expectedSiteId !== undefined && value.siteId !== expectedSiteId)) return false;
  if (!validText(value.niche) || !['wao_owned', 'client_owned'].includes(String(value.ownershipModel)) || !validDomain(value.canonicalDomainCandidate) || typeof value.researchId !== 'string' || !SAFE_ID.test(value.researchId) || !validRepositoryBinding(value.repository) || !validPagesBinding(value.cloudflarePages) || !validCertification(value.certification) || !validTimestamp(value.createdAt) || !validTimestamp(value.updatedAt)) return false;
  if (!['candidate', 'researching', 'approved_for_content', 'approved_for_build', 'ready_for_manual_launch', 'live', 'held', 'retired'].includes(String(value.lifecycle)) || !Array.isArray(value.approvals) || !value.approvals.every(validApproval) || !Array.isArray(value.events) || !value.events.every(validEvent)) return false;
  const approvals = value.approvals as unknown[];
  const approvalRequirements = requiresApproval(value.lifecycle as SiteLifecycle);
  return approvalRequirements.every(requiredFor => approvals.some(approval => record(approval) && approval.requiredFor === requiredFor && approval.status === 'approved'));
}

function rootDirectory(customRoot?: string): string | null {
  const repositoryRoot = path.resolve(process.cwd());
  if (process.env.NODE_ENV === 'production') {
    const configured = process.env.RANK_RENT_DATA_DIR;
    if (!configured) return null;
    const resolved = path.resolve(configured);
    return resolved === repositoryRoot || resolved.startsWith(`${repositoryRoot}${path.sep}`) ? null : resolved;
  }
  return path.resolve(customRoot ?? path.join(repositoryRoot, 'data', 'rank-rent'));
}

export function resolvePortfolioSitePath(siteId: string, customRoot?: string): string | null {
  const base = rootDirectory(customRoot);
  if (!base || typeof siteId !== 'string' || !SAFE_ID.test(siteId)) return null;
  const target = path.resolve(base, `${siteId}.json`);
  return target.startsWith(`${base}${path.sep}`) ? target : null;
}

export function readPortfolioSite(siteId: string, customRoot?: string): PortfolioSite | null {
  const target = resolvePortfolioSitePath(siteId, customRoot);
  if (!target) return null;
  try {
    if (fs.statSync(target).size > MAX_RECORD_BYTES) return null;
    const parsed: unknown = JSON.parse(fs.readFileSync(target, 'utf8'));
    return validSite(parsed, siteId) ? parsed : null;
  } catch {
    return null;
  }
}

export function writePortfolioSiteAtomic(site: PortfolioSite, customRoot?: string): boolean {
  const target = resolvePortfolioSitePath(site.siteId, customRoot);
  if (!target || !validSite(site, site.siteId)) return false;
  const body = `${JSON.stringify(site, null, 2)}\n`;
  if (Buffer.byteLength(body, 'utf8') > MAX_RECORD_BYTES) return false;
  const temporary = path.join(path.dirname(target), `.${path.basename(target)}.${process.pid}.${crypto.randomUUID()}.tmp`);
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(temporary, body, { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temporary, target);
    return true;
  } catch {
    fs.rmSync(temporary, { force: true });
    return false;
  }
}

export function listPortfolioSites(customRoot?: string): PortfolioSiteSummary[] {
  const base = rootDirectory(customRoot);
  if (!base || !fs.existsSync(base)) return [];
  return fs.readdirSync(base, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .flatMap(entry => {
      const site = readPortfolioSite(entry.name.slice(0, -5), customRoot);
      return site ? [{ siteId: site.siteId, niche: site.niche, ownershipModel: site.ownershipModel, canonicalDomainCandidate: site.canonicalDomainCandidate, lifecycle: site.lifecycle, updatedAt: site.updatedAt }] : [];
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.siteId.localeCompare(right.siteId));
}
