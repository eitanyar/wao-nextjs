import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { listPortfolioSites, readPortfolioSite, resolvePortfolioSitePath, writePortfolioSiteAtomic } from './store';
import type { PortfolioSite } from './types';

function site(siteId = 'site-1', updatedAt = '2026-01-01T00:00:00.000Z'): PortfolioSite {
  return {
    schemaVersion: 1,
    siteId,
    niche: 'event-venues',
    ownershipModel: 'wao_owned',
    canonicalDomainCandidate: 'example.test',
    researchId: 'research-1',
    repository: { repositoryId: `repo-${siteId}`, status: 'unbound' },
    cloudflarePages: { status: 'unbound' },
    approvals: [],
    certification: { status: 'not_started' },
    events: [],
    lifecycle: 'candidate',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt,
  };
}

test('portfolio storage atomically round trips a valid non-PII record and returns summaries', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-store-'));
  try {
    const record = site();
    assert.equal(writePortfolioSiteAtomic(record, root), true);
    assert.deepEqual(readPortfolioSite('site-1', root), record);
    assert.deepEqual(listPortfolioSites(root), [{
      siteId: 'site-1',
      niche: 'event-venues',
      ownershipModel: 'wao_owned',
      canonicalDomainCandidate: 'example.test',
      lifecycle: 'candidate',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('portfolio storage fails closed for adversarial paths, invalid transitions, oversized records, and missing production root', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-store-'));
  const previousNodeEnv = process.env.NODE_ENV;
  const previousDataDir = process.env.RANK_RENT_DATA_DIR;
  try {
    assert.equal(resolvePortfolioSitePath('../escape', root), null);
    assert.equal(readPortfolioSite('../escape', root), null);
    assert.equal(writePortfolioSiteAtomic({ ...site(), lifecycle: 'live', approvals: [] }, root), false);
    assert.equal(writePortfolioSiteAtomic({ ...site(), niche: 'x'.repeat(1024 * 1024) }, root), false);
    Object.defineProperty(process.env, 'NODE_ENV', { configurable: true, enumerable: true, value: 'production', writable: true });
    delete process.env.RANK_RENT_DATA_DIR;
    assert.equal(resolvePortfolioSitePath('site-1'), null);
  } finally {
    Object.defineProperty(process.env, 'NODE_ENV', { configurable: true, enumerable: true, value: previousNodeEnv, writable: true });
    if (previousDataDir === undefined) delete process.env.RANK_RENT_DATA_DIR;
    else process.env.RANK_RENT_DATA_DIR = previousDataDir;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('portfolio storage orders summaries newest first', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-store-'));
  try {
    assert.equal(writePortfolioSiteAtomic(site('older', '2026-01-01T00:00:00.000Z'), root), true);
    assert.equal(writePortfolioSiteAtomic(site('newer', '2026-01-02T00:00:00.000Z'), root), true);
    assert.deepEqual(listPortfolioSites(root).map(summary => summary.siteId), ['newer', 'older']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
