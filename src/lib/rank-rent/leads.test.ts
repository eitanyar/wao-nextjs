import fs from 'fs';
import os from 'os';
import path from 'path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { capturePortfolioLead, handlePortfolioLeadRequest, redactPortfolioLead, resolvePortfolioLeadPath, validatePortfolioLead, type PortfolioLeadInput } from './leads';
import type { AuthorizationGrant } from './authorization';
import type { PortfolioSite } from './types';

const NOW = '2026-09-07T12:00:00.000Z';
const EVENT = '2026-09-07T11:00:00.000Z';
function site(): PortfolioSite { return { schemaVersion: 1, siteId: 'site-one', niche: 'service', ownershipModel: 'wao_owned', canonicalDomainCandidate: 'lead.example', researchId: 'research-one', repository: { repositoryId: 'repo-one', status: 'connected' }, cloudflarePages: { status: 'connected' }, approvals: [{ approvalId: 'approval-one', requiredFor: 'live', status: 'approved', requestedAt: '2026-09-06T12:00:00.000Z', resolvedAt: '2026-09-07T10:00:00.000Z' }], certification: { status: 'certified' }, events: [], lifecycle: 'live', createdAt: '2026-09-06T12:00:00.000Z', updatedAt: NOW }; }
function grant(): AuthorizationGrant { const types = ['domain_dns', 'git_repository', 'cloudflare_pages', 'analytics', 'search_console', 'google_business_profile', 'content_media_rights', 'lead_recipient'] as const; const scopes: Record<(typeof types)[number], string[]> = { domain_dns: ['dns_read'], git_repository: ['repository_read'], cloudflare_pages: ['pages_read'], analytics: ['analytics_read'], search_console: ['search_console_read'], google_business_profile: ['gbp_read'], content_media_rights: ['content_use'], lead_recipient: ['lead_delivery'] }; return { schemaVersion: 1, grantId: 'grant-one', siteId: 'site-one', customerOwnerId: 'owner-one', managerId: 'wao', processingPurpose: 'lead capture', grantedAt: '2026-09-01T12:00:00.000Z', expiresAt: '2026-10-01T12:00:00.000Z', ownerAcknowledgedAt: '2026-09-01T12:00:00.000Z', assets: types.map((assetType, index) => ({ assetType, assetId: `asset-${index}`, ownerId: 'owner-one', managerId: 'wao', scopes: scopes[assetType], evidenceDigest: 'a'.repeat(64) })) }; }
function input(eventId = 'event-one'): PortfolioLeadInput { return { schemaVersion: 1, eventId, siteId: 'site-one', pageId: 'page-one', eventType: 'form', occurredAt: EVENT, sourceUrl: 'https://lead.example/contact', service: 'repair', area: 'city', disclosureVersion: 'disclosure-one', intendedRecipientClass: 'wao_managed_provider', contact: { consentAt: '2026-09-07T10:30:00.000Z', phone: '+15551234567', email: 'TEST@EXAMPLE.COM' }, attribution: { utmSource: 'search' } }; }
function root(): string { return fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-leads-')); }
function adapters() { return { pageResolver: (_site: PortfolioSite, pathname: string) => pathname === '/contact' ? 'page-one' : null }; }

test('validates strict consented forms and contact-free click stubs', () => {
  const valid = validatePortfolioLead(input(), NOW); assert.equal(valid.ok, true); if (valid.ok) assert.equal(valid.value.contact?.email, 'test@example.com');
  const click = input(); click.eventType = 'phone_click'; delete click.contact; assert.equal(validatePortfolioLead(click, NOW).ok, true);
  click.contact = { consentAt: EVENT, phone: '+15551234567' }; assert.equal(validatePortfolioLead(click, NOW).ok, false);
  assert.equal(validatePortfolioLead({ ...input(), token: 'nope' }, NOW).ok, false);
});

test('rejects unsafe roots and provides no path escape', () => {
  assert.equal(resolvePortfolioLeadPath('../site', 'event-one', root()), null);
  assert.equal(resolvePortfolioLeadPath('site-one', 'event-one', path.relative('/', root())), null);
  const target = resolvePortfolioLeadPath('site-one', 'event-one', root()); assert.match(target ?? '', /site-one\/event-one\.json$/);
});

test('captures atomically and handles retry conflict without PII receipts', () => {
  const directory = root(); try {
    const first = capturePortfolioLead(input(), NOW, site(), grant(), directory, adapters()); assert.equal(first.ok, true); if (!first.ok) return;
    assert.equal(first.value.created, true); assert.equal(JSON.stringify(first.value).includes('15551234567'), false);
    const retry = capturePortfolioLead(input(), NOW, site(), grant(), directory, adapters()); assert.equal(retry.ok, true); if (retry.ok) assert.equal(retry.value.created, false);
    const changed = input(); changed.service = 'other'; const conflict = capturePortfolioLead(changed, NOW, site(), grant(), directory, adapters()); assert.deepEqual(conflict, { ok: false, reason: 'duplicate_conflict' });
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('fails closed for page, portfolio, and grant gates', () => {
  const directory = root(); try {
    assert.equal(capturePortfolioLead(input(), NOW, { ...site(), lifecycle: 'held' }, grant(), directory, adapters()).ok, false);
    assert.equal(capturePortfolioLead(input(), NOW, site(), { ...grant(), siteId: 'other-site' }, directory, adapters()).ok, false);
    assert.equal(capturePortfolioLead(input(), NOW, site(), grant(), directory, { pageResolver: () => null }).ok, false);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('maps request CORS, media, size, and successful receipts', async () => {
  const directory = root(); try {
    const requestAdapters = { ...adapters(), now: () => NOW, resolveSite: (origin: string) => origin === 'https://lead.example' ? site() : null, readGrant: () => grant(), resolveLeadRoot: () => directory, rateLimit: () => ({ allowed: true }) };
    const options = await handlePortfolioLeadRequest(new Request('https://control.example/api', { method: 'OPTIONS', headers: { Origin: 'https://lead.example' } }), requestAdapters); assert.equal(options.status, 204); assert.equal(options.headers.get('access-control-allow-origin'), 'https://lead.example');
    const media = await handlePortfolioLeadRequest(new Request('https://control.example/api', { method: 'POST', headers: { Origin: 'https://lead.example', 'Content-Type': 'text/plain' } }), requestAdapters); assert.equal(media.status, 415);
    const ok = await handlePortfolioLeadRequest(new Request('https://control.example/api', { method: 'POST', headers: { Origin: 'https://lead.example', 'Content-Type': 'application/json' }, body: JSON.stringify(input('event-two')) }), requestAdapters); assert.equal(ok.status, 201); assert.equal((await ok.text()).includes('15551234567'), false);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
