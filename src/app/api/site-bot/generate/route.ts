import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { dataRoot, sitesDir } from '@/lib/dataRoots';
import { cookies } from 'next/headers';
import type { CollectedData } from '@/lib/bot/prompts';
import { assertBoundedPageBrief, type PageBrief } from '@/lib/site-bot/research/pageBrief';
import { getResearchPath, readResearchDossier, writeResearchDossierAtomic } from '@/lib/site-bot/research/researchStore';
import { buildSimulationGenerationResult, generateResearchPageCopy, GeneratedCopyValidationError } from '@/lib/lp/researchPageCopy';
import type { ResearchedSiteGraphEdge } from '@/lib/lp/researchedSite';
import { detectVertical } from '@/lib/lp/verticalDetect';
import { VERTICAL_THEMES } from '@/lib/lp/verticalThemes';
import { VERTICAL_ASSETS } from '@/lib/lp/verticalAssets';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { isSafeDeploymentSlug } from '@/lib/deployment/deploy-access';
import {
  assertResearchedGenerationReady,
  buildResearchedSiteGeneration,
  preflightResearchedSiteTarget,
  persistResearchedSiteRecordAtomic,
} from '@/lib/site-bot/researchedSiteGeneration';

export const dynamic = 'force-dynamic';

function slugify(name: string, phone?: string): string {
  const latin = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
    .replace(/^-|-$/g, '');
  if (latin.length >= 3) return latin;
  const suffix = (phone || '').replace(/\D/g, '').slice(-4) || Date.now().toString(36).slice(-4);
  return `wao-client-${suffix}`;
}

function opaqueId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value);
}

function isPageBrief(value: unknown): value is PageBrief {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const brief = value as Partial<PageBrief>;
  return Boolean(
    brief.page && typeof brief.page.id === 'string' && typeof brief.page.targetPath === 'string' && typeof brief.page.pageClass === 'string'
    && brief.persona && typeof brief.persona.value === 'string'
    && brief.waoOffer && typeof brief.waoOffer.value === 'string'
    && Array.isArray(brief.targetQueries)
    && Array.isArray(brief.approvedEntityAnchors)
    && Array.isArray(brief.firstPartyProof)
    && Array.isArray(brief.assertableLocalFacts)
    && Array.isArray(brief.customerDecisions)
    && Array.isArray(brief.constraints)
    && Array.isArray(brief.links)
    && Array.isArray(brief.informationGainGaps)
    && Array.isArray(brief.prohibitedClaims)
    && Array.isArray(brief.faqCandidates)
    && (brief.faqPolicy === 'none' || brief.faqPolicy === 'optional' || brief.faqPolicy === 'required_for_user_clarity')
  );
}

function isGraphEdge(value: unknown): value is ResearchedSiteGraphEdge {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const edge = value as Partial<ResearchedSiteGraphEdge>;
  return opaqueId(edge.fromId) && opaqueId(edge.toId);
}

function dossierFileReady(file: string): boolean {
  const base = dataRoot('siteResearch').walkBase;
  const relative = path.relative(base, file);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return false;
  let current = base;
  const parts = relative.split(path.sep);
  for (const [index, part] of parts.entries()) {
    current = path.join(/* turbopackIgnore: true */ current, part);
    try {
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink() || !(index === parts.length - 1 ? stat.isFile() : stat.isDirectory())) return false;
    } catch {
      return false;
    }
  }
  return true;
}

// Machine-readable reason for a 502 research_generation_failed (admin-only route).
// The client-facing error code stays generic; details go to the server log only.
type GenerationFailureReason = 'site_target_conflict' | 'copy_validation_failed' | 'copy_generation_failed' | 'persist_failed';
type GenerationStep = 'preflight' | 'generate' | 'persist';

function failureReason(step: GenerationStep, error: unknown): GenerationFailureReason {
  if (step === 'preflight') return 'site_target_conflict';
  if (step === 'persist') return 'persist_failed';
  return error instanceof GeneratedCopyValidationError ? 'copy_validation_failed' : 'copy_generation_failed';
}

function logGenerationFailure(reason: GenerationFailureReason, slug: string, researchId: string, error: unknown): void {
  // Field names, limits and lengths only: never generated copy text or owner data.
  const detail = error instanceof GeneratedCopyValidationError
    ? { stage: error.stage, violations: error.violations }
    : { message: error && typeof (error as Error).message === 'string' ? (error as Error).message.slice(0, 200) : 'non-error thrown' };
  console.error(`[site-bot generate] research_generation_failed ${JSON.stringify({ reason, slug, researchId, ...detail })}`);
}

function postReply(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req: Request) {
  const authCookies = await cookies();
  const adminAuthorized = await verifyAdminToken(authCookies.get(ADMIN_COOKIE_NAME)?.value ?? '');
  if (!adminAuthorized) {
    return postReply({ error: 'unauthorized', deployable: false }, 401);
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return postReply({ error: 'invalid_request', deployable: false }, 400);
  }

  const collectedData = body.collectedData as CollectedData | undefined;
  if (!collectedData?.businessNiche) {
    return postReply({ error: 'collectedData.businessNiche is required', deployable: false }, 400);
  }

  const hasExplicitSlug = Object.prototype.hasOwnProperty.call(body, 'slug');
  const slug = hasExplicitSlug
    ? body.slug
    : slugify(collectedData.businessName || collectedData.businessNiche, collectedData.phone);
  if (!isSafeDeploymentSlug(slug)) {
    return postReply({ error: 'invalid_deployment_slug', deployable: false }, 400);
  }

  if (body.simulation === true) {
    return postReply({
      success: true,
      slug,
      simulation: true,
      deployable: false,
      copy: buildSimulationGenerationResult(collectedData),
    });
  }

  if (
    !opaqueId(body.researchId)
    || !Array.isArray(body.pageBriefs)
    || !body.pageBriefs.every(isPageBrief)
    || !Array.isArray(body.graphEdges)
    || !body.graphEdges.every(isGraphEdge)
  ) {
    return postReply({ error: 'research_generation_input_invalid', deployable: false }, 400);
  }

  const dossierPath = getResearchPath(body.researchId);
  if (!dossierPath || !dossierFileReady(dossierPath)) {
    return postReply({ error: 'research_copy_not_ready', deployable: false }, 409);
  }
  const dossier = await readResearchDossier(body.researchId, undefined, { bounded: true });
  if (!dossier) {
    return postReply({ error: 'research_copy_not_ready', deployable: false }, 409);
  }
  try {
    assertResearchedGenerationReady(dossier, body.researchId);
  } catch {
    return postReply({ error: 'research_copy_not_ready', deployable: false }, 409);
  }

  try {
    for (const brief of body.pageBriefs) assertBoundedPageBrief(brief);
  } catch {
    return postReply({ error: 'research_generation_input_invalid', deployable: false }, 400);
  }

  let step: GenerationStep = 'preflight';
  try {
    const sitesRoot = sitesDir();
    preflightResearchedSiteTarget(slug, body.researchId, { sitesRoot });
    step = 'generate';
    const verticalKey = detectVertical(collectedData.businessNiche);
    const theme = VERTICAL_THEMES[verticalKey];
    const assets = VERTICAL_ASSETS[verticalKey];
    const heroImageUrl = collectedData.trustAssetUrls?.[0] || collectedData.profilePhotoUrl || assets.heroImages[0].url;
    const record = await buildResearchedSiteGeneration({
      slug,
      researchId: body.researchId,
      collectedData,
      dossier,
      pageBriefs: body.pageBriefs,
      graphEdges: body.graphEdges,
    }, {
      // M2a: bounded repair pass + safe fixes run inside generateResearchPageCopy;
      // log what they did (field names, limits, lengths and fix kinds only, never copy text).
      generateCopy: (brief, data, site) => generateResearchPageCopy(brief, data, {
        ...(site ? { priorHeroHeadlines: site.priorHeroHeadlines } : {}),
        onEvent: event => {
          if (event.kind === 'violations') return;
          console.info(`[site-bot generate] copy_${event.kind} ${JSON.stringify({ slug, page: brief.page.id, stage: event.stage, attempt: event.attempt, fields: event.fields, fixes: event.fixes })}`);
        },
      }),
      renderInputs: {
        theme,
        assets,
        heroImageUrl,
        siteUrl: `https://${slug}.wao.co.il`,
      },
    });

    step = 'persist';
    await persistResearchedSiteRecordAtomic(record, {
      sitesRoot,
      dossier,
      writeDossier: updated => writeResearchDossierAtomic(updated.researchId, updated),
    });

    return postReply({
      success: true,
      slug,
      simulation: false,
      deployable: false,
      pageCount: record.researchedPages.length,
    });
  } catch (error) {
    const reason = failureReason(step, error);
    logGenerationFailure(reason, slug, body.researchId, error);
    return postReply({ error: 'research_generation_failed', reason, deployable: false }, 502);
  }
}
