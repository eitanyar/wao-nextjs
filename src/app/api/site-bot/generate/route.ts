import { NextResponse } from 'next/server';
import path from 'node:path';
import { cookies } from 'next/headers';
import type { CollectedData } from '@/lib/bot/prompts';
import type { PageBrief } from '@/lib/site-bot/research/pageBrief';
import { readResearchDossier, writeResearchDossierAtomic } from '@/lib/site-bot/research/researchStore';
import { buildSimulationGenerationResult, generateResearchPageCopy } from '@/lib/lp/researchPageCopy';
import type { ResearchedSiteGraphEdge } from '@/lib/lp/researchedSite';
import { detectVertical } from '@/lib/lp/verticalDetect';
import { VERTICAL_THEMES } from '@/lib/lp/verticalThemes';
import { VERTICAL_ASSETS } from '@/lib/lp/verticalAssets';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { isSafeDeploymentSlug } from '@/lib/deployment/deploy-access';
import {
  buildResearchedSiteGeneration,
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

export async function POST(req: Request) {
  const authCookies = await cookies();
  const adminAuthorized = await verifyAdminToken(authCookies.get(ADMIN_COOKIE_NAME)?.value ?? '');
  if (!adminAuthorized) {
    return NextResponse.json({ error: 'unauthorized', deployable: false }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'invalid_request', deployable: false }, { status: 400 });
  }

  const collectedData = body.collectedData as CollectedData | undefined;
  if (!collectedData?.businessNiche) {
    return NextResponse.json({ error: 'collectedData.businessNiche is required', deployable: false }, { status: 400 });
  }

  const hasExplicitSlug = Object.prototype.hasOwnProperty.call(body, 'slug');
  const slug = hasExplicitSlug
    ? body.slug
    : slugify(collectedData.businessName || collectedData.businessNiche, collectedData.phone);
  if (!isSafeDeploymentSlug(slug)) {
    return NextResponse.json({ error: 'invalid_deployment_slug', deployable: false }, { status: 400 });
  }

  if (body.simulation === true) {
    return NextResponse.json({
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
    return NextResponse.json({ error: 'research_generation_input_invalid', deployable: false }, { status: 400 });
  }

  const dossier = await readResearchDossier(body.researchId);
  if (!dossier) {
    return NextResponse.json({ error: 'research_copy_not_ready', deployable: false }, { status: 409 });
  }

  try {
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
      generateCopy: generateResearchPageCopy,
      renderInputs: {
        theme,
        assets,
        heroImageUrl,
        siteUrl: `https://${slug}.wao.co.il`,
      },
    });

    await persistResearchedSiteRecordAtomic(record, {
      sitesRoot: path.join(process.cwd(), 'data', 'sites'),
      dossier,
      writeDossier: updated => writeResearchDossierAtomic(updated.researchId, updated),
    });

    return NextResponse.json({
      success: true,
      slug,
      simulation: false,
      deployable: true,
      pageCount: record.researchedPages.length,
    });
  } catch {
    return NextResponse.json({ error: 'research_generation_failed', deployable: false }, { status: 502 });
  }
}
