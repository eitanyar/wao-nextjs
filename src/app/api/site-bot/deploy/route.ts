import { NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';
import { execFileSync } from 'child_process';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, lstatSync, openSync, fstatSync, readSync, closeSync, constants } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { cookies } from 'next/headers';
import { renderSitePages, buildSitemap } from '@/lib/lp/renderSitePages';
import { renderResearchedSitePages, type ResearchedSitePage, type ResearchedSiteGraphEdge } from '@/lib/lp/researchedSite';
import { detectVertical } from '@/lib/lp/verticalDetect';
import { VERTICAL_THEMES } from '@/lib/lp/verticalThemes';
import { VERTICAL_ASSETS } from '@/lib/lp/verticalAssets';
import type { CollectedData } from '@/lib/bot/prompts';
import type { SiteCopy } from '@/lib/lp/lpCopyPrompt';
import type { CoreThirtyNode } from '@/lib/lp/coreThirty';
import type { CoreThirtyPageCopy } from '@/lib/lp/coreThirtyCopy';
import { checkNearDuplicates } from '@/lib/lp/duplicateCheck';
import type { DuplicateCheckPage } from '@/lib/lp/duplicateCheck';
import { renderCoreThirtyPages, buildCoreThirtySitemapUrls } from '@/lib/lp/renderCoreThirtyPages';
import { ensureSiteBotClientRecord, clientRecordExists } from '@/lib/geo/client';
import { provisionClientAuth } from '@/lib/client-auth-store';
import { createSessionToken, COOKIE_NAME } from '@/lib/client-auth';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { assertDeployReady } from '@/lib/site-bot/research/pipelineState';
import { assertResearchedSiteGraphSafe } from '@/lib/site-bot/researchedSiteGraphValidation';
import { getResearchPath, readResearchDossier } from '@/lib/site-bot/research/researchStore';
import { matchesResearchedCopyReviewPacket } from '@/lib/site-bot/research/copyReviewPacket';
import type { SiteResearchDossier } from '@/lib/site-bot/research/types';
import { createFraudBlockerClient } from '@/lib/fraud-blocker/client';
import { fraudBlockerFailureState, provisionFraudBlockerDomain, recordFraudBlockerTrackerInstallation } from '@/lib/fraud-blocker/deployment';
import { readFraudBlockerState, writeFraudBlockerState } from '@/lib/fraud-blocker/store';
import { isSafeDeploymentSlug } from '@/lib/deployment/deploy-access';

interface DeployRequest {
  slug: string;
  googleAdsCustomerId?: string;
  gtagSnippet?: string;
  formConversionLabel?: string;
  phoneConversionLabel?: string;
  whatsappConversionLabel?: string;
  testOnlyOfflineSimulationDeploy?: boolean;
}

interface SiteRecord {
  collectedData: CollectedData;
  copy: SiteCopy;
  slug: string;
  researchId?: string;
  approvedPageId?: string;
  researchedPages?: ResearchedSitePage[];
  researchedGraphEdges?: ResearchedSiteGraphEdge[];
  simulation?: boolean;
  legacyCoreThirty?: boolean;
  coreThirtyNodes?: CoreThirtyNode[];
  coreThirtyCopies?: Record<string, CoreThirtyPageCopy>;
}

const MAX_SITE_RECORD_BYTES = 16 * 1024 * 1024;

function fileState(root: string, file: string): 'ready' | 'missing' | 'invalid' {
  const relative = path.relative(root, file);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return 'invalid';
  let current = root;
  const parts = relative.split(path.sep);
  for (const [index, part] of parts.entries()) {
    current = path.join(/* turbopackIgnore: true */ current, part);
    try {
      const stat = lstatSync(current);
      if (stat.isSymbolicLink() || !(index === parts.length - 1 ? stat.isFile() : stat.isDirectory())) return 'invalid';
    } catch (error) {
      return (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'missing' : 'invalid';
    }
  }
  return 'ready';
}

function readBoundedSiteBytes(file: string): Buffer | null {
  let descriptor: number | undefined;
  try {
    descriptor = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const stat = fstatSync(descriptor);
    if (!stat.isFile() || stat.size > MAX_SITE_RECORD_BYTES) return null;
    const chunks: Buffer[] = [];
    let total = 0;
    while (total <= MAX_SITE_RECORD_BYTES) {
      const chunk = Buffer.allocUnsafe(Math.min(64 * 1024, MAX_SITE_RECORD_BYTES + 1 - total));
      const count = readSync(descriptor, chunk, 0, chunk.length, null);
      if (count === 0) break;
      total += count;
      if (total > MAX_SITE_RECORD_BYTES) return null;
      chunks.push(chunk.subarray(0, count));
    }
    return Buffer.concat(chunks, total);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function sameJsonValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length &&
      left.every((value, index) => sameJsonValue(value, right[index]));
  }
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) =>
    key === rightKeys[index] && sameJsonValue((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]));
}

function assertResearchedRecordBoundToDossier(record: SiteRecord, dossier: SiteResearchDossier): void {
  const mismatch = () => { throw new Error('Researched site dossier mismatch.'); };
  if (record.researchId !== dossier.researchId || !Array.isArray(dossier.pageOpportunities)) mismatch();

  const identities = new Set<string>();
  const paths = new Set<string>();
  const ready = new Map<string, string>();
  for (const opportunity of dossier.pageOpportunities) {
    if (!opportunity || typeof opportunity !== 'object' ||
      typeof opportunity.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(opportunity.id) ||
      typeof opportunity.targetPath !== 'string' || !opportunity.targetPath.startsWith('/') ||
      typeof opportunity.opportunity !== 'string' ||
      !Array.isArray(opportunity.evidenceIds) || !opportunity.evidenceIds.every(id => typeof id === 'string') ||
      !['ready', 'held', 'unknown'].includes(opportunity.status) ||
      identities.has(opportunity.id) || paths.has(opportunity.targetPath)) mismatch();
    identities.add(opportunity.id);
    paths.add(opportunity.targetPath);
    if (opportunity.status === 'ready') ready.set(opportunity.id, opportunity.targetPath);
  }

  const pages = record.researchedPages!; // The shared graph validator has already checked these.
  if (pages.length !== ready.size || pages.some(page => ready.get(page.opportunityId) !== page.targetPath)) mismatch();
  const homepage = pages.find(page => page.classification === 'homepage')!;
  if (record.approvedPageId !== homepage.opportunityId || !sameJsonValue(record.copy, homepage.copy)) mismatch();
}

const CF_BASE = 'https://api.cloudflare.com/client/v4';

function cfHeaders(apiToken: string) {
  return {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  };
}

async function cfPost(path: string, body: unknown, apiToken: string) {
  const res = await fetch(`${CF_BASE}${path}`, {
    method: 'POST',
    headers: cfHeaders(apiToken),
    body: JSON.stringify(body),
    redirect: 'error',
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

async function cfGet(path: string, apiToken: string) {
  const res = await fetch(`${CF_BASE}${path}`, { headers: cfHeaders(apiToken), redirect: 'error' });
  return { ok: res.ok, data: await res.json() };
}

function cfResult(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object' || (data as { success?: unknown }).success !== true) return null;
  const result = (data as { result?: unknown }).result;
  return result && typeof result === 'object' && !Array.isArray(result) ? result as Record<string, unknown> : null;
}

function matchesDomain(data: unknown, name: string, zoneId: string, project: string): boolean {
  const result = cfResult(data);
  return result?.name === name &&
    ['initializing', 'pending', 'active'].includes(result.status as string) &&
    result.zone_tag === zoneId &&
    (result.project_name === undefined || result.project_name === project) &&
    ['http', 'txt'].includes((result.validation_data as { method?: string } | undefined)?.method ?? '') &&
    ['initializing', 'pending', 'active'].includes((result.validation_data as { status?: string } | undefined)?.status ?? '') &&
    ['pending', 'active'].includes((result.verification_data as { status?: string } | undefined)?.status ?? '');
}

function matchesDnsRecord(result: Record<string, unknown> | null, name: string, target: string, zoneId: string): boolean {
  return result?.type === 'CNAME' && result.name === name && result.content === target &&
    (result.zone_id === undefined || result.zone_id === zoneId);
}

function matchesSingleDnsReadback(data: unknown, name: string, target: string, zoneId: string): boolean {
  if (!data || typeof data !== 'object' || (data as { success?: unknown }).success !== true) return false;
  const { result, result_info: info } = data as { result?: unknown; result_info?: { total_pages?: unknown; count?: unknown } };
  return Array.isArray(result) && result.length === 1 &&
    info?.total_pages === 1 && info.count === 1 &&
    matchesDnsRecord(result[0], name, target, zoneId);
}

function privateJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req: Request) {
  try {
    const authCookies = await cookies();
    const adminAuthorized = await verifyAdminToken(authCookies.get(ADMIN_COOKIE_NAME)?.value ?? '');
    if (!adminAuthorized) {
      return privateJson({ error: 'unauthorized' }, 401);
    }

    const body: DeployRequest = await req.json();
    const { slug, googleAdsCustomerId, gtagSnippet, formConversionLabel, phoneConversionLabel, whatsappConversionLabel } = body;

    if (!isSafeDeploymentSlug(slug)) return privateJson({ error: 'invalid_deployment_slug' }, 400);

    // ── Step 1: Load site data from filesystem ────────────────────────────
    const root = process.cwd();
    const sitePath = path.join(root, 'data', 'sites', `${slug}.json`);
    const siteState = fileState(root, sitePath);
    if (siteState !== 'ready') return privateJson({ error: siteState === 'missing' ? 'site_not_found' : 'invalid_site_record' }, siteState === 'missing' ? 404 : 409);
    let record: SiteRecord;
    let recordBytes: Buffer;
    try {
      const bytes = readBoundedSiteBytes(sitePath);
      if (!bytes) return privateJson({ error: 'invalid_site_record' }, 409);
      recordBytes = bytes;
      record = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(recordBytes));
      if (!record || typeof record !== 'object' || Array.isArray(record)) {
        return privateJson({ error: 'invalid_site_record' }, 409);
      }
      if (typeof record.slug !== 'string' || record.slug !== slug) {
        return privateJson({ error: 'invalid_site_record' }, 409);
      }
      if (!record.simulation &&
        (!record.researchId || (typeof record.researchId === 'string' && !record.researchId.trim())) &&
        (Object.prototype.hasOwnProperty.call(record, 'approvedPageId') ||
          Object.prototype.hasOwnProperty.call(record, 'researchedPages') ||
          Object.prototype.hasOwnProperty.call(record, 'researchedGraphEdges'))) {
        return privateJson({ error: 'invalid_site_record' }, 409);
      }
      if (record.researchId && !record.simulation && record.legacyCoreThirty === true) {
        return privateJson({ error: 'invalid_site_record' }, 409);
      }
    } catch (error) {
      const missing = (error as NodeJS.ErrnoException).code === 'ENOENT';
      return privateJson({ error: missing ? 'site_not_found' : 'invalid_site_record' }, missing ? 404 : 409);
    }

    if (record.simulation && !(body.testOnlyOfflineSimulationDeploy === true && process.env.NODE_ENV === 'test')) {
      return privateJson({ error: 'simulation_deploy_rejected' }, 409);
    }
    let dossier: SiteResearchDossier | null = null;
    if (record.researchId && !record.simulation) {
      let dossierPath: string | null;
      try {
        dossierPath = getResearchPath(record.researchId);
      } catch {
        dossierPath = null;
      }
      if (!dossierPath || fileState(root, dossierPath) !== 'ready') {
        return privateJson({ error: 'research_dossier_required' }, 409);
      }
      try {
        dossier = await readResearchDossier(record.researchId, undefined, { bounded: true });
      } catch {
        return privateJson({ error: 'research_dossier_required' }, 409);
      }
      if (!dossier) return privateJson({ error: 'research_dossier_required' }, 409);
      const readiness = assertDeployReady(dossier);
      if (!readiness.ready) {
        return privateJson({ error: 'deploy_not_ready', reasons: readiness.reasons }, 409);
      }
    }

    // Paid research records must carry their selected hierarchy. Falling back
    // to Core-30 for these records would recreate opaque, unapproved URLs.
    const isResearchedRecord = Boolean(record.researchId) && !record.simulation;
    if (isResearchedRecord && !record.researchedPages?.length) {
      return privateJson({ error: 'researched_site_pages_required' }, 409);
    }
    if (isResearchedRecord) {
      try {
        assertResearchedSiteGraphSafe(record.researchedPages!, record.researchedGraphEdges!);
      } catch {
        return privateJson({ error: 'researched_site_graph_invalid' }, 409);
      }
      try {
        assertResearchedRecordBoundToDossier(record, dossier!);
      } catch {
        return privateJson({ error: 'researched_site_dossier_mismatch' }, 409);
      }
      if (!dossier?.approvedCopyReviewPacket ||
        !matchesResearchedCopyReviewPacket(recordBytes, dossier.approvedCopyReviewPacket)) {
        return privateJson({ error: 'copy_review_approval_required' }, 409);
      }
    }

    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    if (!apiToken?.trim() || !accountId?.trim() || !zoneId?.trim()) {
      return privateJson({ error: 'deployment_provider_unavailable' }, 503);
    }

    const { collectedData, copy } = record;
    const verticalKey = detectVertical(collectedData.businessNiche || '');
    const theme = VERTICAL_THEMES[verticalKey];
    const assets = VERTICAL_ASSETS[verticalKey];
    const heroImageUrl = collectedData.trustAssetUrls?.[0] || collectedData.profilePhotoUrl || assets.heroImages[0].url;
    const siteUrl = `https://${slug}.wao.co.il`;
    let fraudBlockerSid: string | undefined;
    try {
      fraudBlockerSid = await provisionFraudBlockerDomain({ clientId: slug, domain: `${slug}.wao.co.il`, client: createFraudBlockerClient() });
    } catch (error) {
      writeFraudBlockerState(fraudBlockerFailureState(slug, `${slug}.wao.co.il`, error));
      return privateJson({ error: 'fraud_blocker_provisioning_required' }, 424);
    }

    const renderParams = {
      theme,
      assets,
      data: collectedData,
      heroImageUrl,
      slug,
      googleAdsCustomerId,
      gtagSnippet,
      formConversionLabel,
      phoneConversionLabel,
      whatsappConversionLabel,
      siteUrl,
      fraudBlockerSid,
    };

    // ── Step 2: Render researched or explicit legacy pages ─────────────────
    const pages = isResearchedRecord
      ? renderResearchedSitePages({ ...renderParams, pages: record.researchedPages!, graphEdges: record.researchedGraphEdges })
      : renderSitePages({ ...renderParams, copy });

    // ── Step 2b: Render the core-30 supplementary local-SEO pages ───────────
    // Deploy-time never regenerates copy — only reads what generate/route.ts
    // already persisted, keeping deploy fast/deterministic with no LLM calls.
    let allPages: Record<string, string> = pages;
    const nodes: CoreThirtyNode[] = record.legacyCoreThirty || record.simulation ? record.coreThirtyNodes || [] : [];
    const copiesMap = new Map(Object.entries(record.coreThirtyCopies || {}));

    if (nodes.length > 0) {
      const duplicateCheckPages: DuplicateCheckPage[] = nodes
        .filter((n) => copiesMap.has(n.id))
        .map((n) => {
          const c = copiesMap.get(n.id)!;
          return {
            id: n.id,
            narrative: c.narrative,
            faqItems: c.faqItems,
            metaDescription: c.metaDescription,
          };
        });

      const findings = checkNearDuplicates(duplicateCheckPages);

      // Policy (VISION.md Gate 1, product-safety decision — implemented
      // exactly, not redesigned here): never hard-block the whole deploy over
      // a near-duplicate finding. Exclude at the page level instead — drop
      // the second id in every flagged pair, keep the first.
      const excludedIds = new Set(findings.map((f) => f.bId));
      for (const f of findings) {
        console.warn(
          `Core-30 near-duplicate finding (field=${f.field}, score=${f.score.toFixed(3)}): ${f.aId} <-> ${f.bId} — excluding ${f.bId}`
        );
      }

      const filteredNodes = nodes.filter((n) => !excludedIds.has(n.id));

      if (excludedIds.size > 0) {
        // Non-fatal audit-trail write — must never fail the deploy, same
        // forgiving pattern as the dashboard-bridge step below.
        try {
          const updatedRecord = { ...record, coreThirtyDuplicateExclusions: Array.from(excludedIds) };
          writeFileSync(sitePath, JSON.stringify(updatedRecord, null, 2), 'utf-8');
        } catch (err) {
          console.warn('Core-30 duplicate-exclusion audit-trail write (non-fatal):', err);
        }
      }

      if (filteredNodes.length > 0) {
        const coreThirtyPages = renderCoreThirtyPages({
          nodes: filteredNodes,
          copies: copiesMap,
          theme,
          assets,
          data: collectedData,
          heroImageUrl,
          slug,
          siteUrl,
          googleAdsCustomerId,
          phoneConversionLabel,
          whatsappConversionLabel,
          gtagSnippet,
          formConversionLabel,
          fraudBlockerSid,
        });
        allPages = { ...pages, ...coreThirtyPages };
        allPages['sitemap.xml'] = buildSitemap(siteUrl, buildCoreThirtySitemapUrls(filteredNodes, copiesMap));
      }
    }

    if (fraudBlockerSid && !recordFraudBlockerTrackerInstallation({
      state: readFraudBlockerState(slug) ?? fraudBlockerFailureState(slug, `${slug}.wao.co.il`, new Error('Fraud Blocker state was not persisted.')),
      pages: allPages,
    })) {
      writeFraudBlockerState(fraudBlockerFailureState(slug, `${slug}.wao.co.il`, new Error('Tracker verification failed.')));
      return privateJson({ error: 'fraud_blocker_tracker_verification_failed' }, 424);
    }

    // ── Step 3: Write to a tmp dir ──────────────────────────────────────────
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'wao-site-'));
    try {
    for (const [filename, content] of Object.entries(allPages)) {
      const filePath = path.join(tmpDir, filename);
      const parentPath = path.dirname(filePath);
      if (parentPath !== tmpDir) {
        mkdirSync(parentPath, { recursive: true });
      }
      writeFileSync(filePath, content, 'utf-8');
    }

    const env = {
      ...process.env,
      CLOUDFLARE_API_TOKEN: apiToken,
      CLOUDFLARE_ACCOUNT_ID: accountId,
    };

      try {
        execFileSync('./node_modules/.bin/wrangler', ['pages', 'project', 'create', slug, '--production-branch', 'main'], { env, stdio: 'pipe', timeout: 30_000 });
      } catch {
        // project already exists — fine
      }

      execFileSync('./node_modules/.bin/wrangler', ['pages', 'deploy', tmpDir, '--project-name', slug, '--branch', 'main', '--commit-dirty=true'], { env, stdio: 'pipe', timeout: 60_000 });

      // Confirm the provider accepted this exact Pages association and DNS binding.
      // Pending registration is not proof that the public URL is reachable.
      const subdomain = `${slug}.wao.co.il`;
      const target = `${slug}.pages.dev`;
      const domainPath = `/accounts/${accountId}/pages/projects/${slug}/domains`;
      try {
        const domainRes = await cfPost(domainPath, { name: subdomain }, apiToken);
        if (domainRes.ok) {
          if (!matchesDomain(domainRes.data, subdomain, zoneId, slug)) throw new Error('unbound domain');
        } else {
          if (domainRes.status !== 409) throw new Error('domain rejected');
          const existing = await cfGet(`${domainPath}/${encodeURIComponent(subdomain)}`, apiToken);
          if (!existing.ok || !matchesDomain(existing.data, subdomain, zoneId, slug)) throw new Error('domain conflict');
        }

        const dnsPath = `/zones/${zoneId}/dns_records`;
        const dnsRes = await cfPost(dnsPath, { type: 'CNAME', name: subdomain, content: target, proxied: true, ttl: 1 }, apiToken);
        if (dnsRes.ok) {
          if (!matchesDnsRecord(cfResult(dnsRes.data), subdomain, target, zoneId)) throw new Error('unbound DNS');
        } else {
          const errors = (dnsRes.data as { errors?: Array<{ code?: number }> } | null)?.errors;
          if (dnsRes.status !== 409 && !errors?.some(entry => entry.code === 81053)) throw new Error('DNS rejected');
          const existing = await cfGet(`${dnsPath}?name.exact=${encodeURIComponent(subdomain)}&per_page=2`, apiToken);
          if (!existing.ok || !matchesSingleDnsReadback(existing.data, subdomain, target, zoneId)) throw new Error('DNS conflict');
        }
      } catch {
        return privateJson({ error: 'deployment_domain_binding_failed' }, 502);
      }
    // ── Step 4: Bridge to the client-dashboard record ──────────────────────
    // Site Bot previously had no data/clients/{slug}/client.json at all, so
    // clients had no /client/dashboard account. This creates one on first
    // deploy only (idempotent on redeploy) and auto-logs in a brand-new
    // client the same way geo/signup/callback does. Must never block/fail
    // the deploy response after the mandatory domain binding succeeds.
    try {
      const isFirstTimeRecord = !clientRecordExists(slug);

      ensureSiteBotClientRecord({
        clientId: slug,
        siteUrl,
        businessNiche: collectedData.businessNiche || '',
        topService: collectedData.secondaryServices?.split(/[,\n،]/)[0]?.trim() || undefined,
        targetLocation: collectedData.targetLocation,
        usp: collectedData.usp,
        approvalContact: collectedData.ownerName || collectedData.businessName,
        approvalWhatsapp: collectedData.whatsappNumber || collectedData.phone,
      });

      if (isFirstTimeRecord) {
        const bootstrapPin = String(randomInt(100000, 1_000_000));
        const auth = await provisionClientAuth(slug, bootstrapPin, undefined, { mustChangePin: true });
        const token = await createSessionToken(slug, { sessionVersion: auth.sessionVersion, scope: 'change-pin' });
        const jar = await cookies();
        jar.set(COOKIE_NAME, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60,
          path: '/',
        });
      }
    } catch (err) {
      console.warn('Site Bot -> client-dashboard bridge (non-fatal):', err);
    }

    return privateJson({ success: true, url: siteUrl, projectName: slug });
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }

  } catch (error: unknown) {
    console.error('Site Bot deploy error:', error);
    return privateJson(
      { error: error instanceof Error ? error.message : 'Deploy failed' },
      500
    );
  }
}
