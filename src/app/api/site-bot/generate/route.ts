import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { CollectedData } from '@/lib/bot/prompts';
import type { PageBrief } from '@/lib/site-bot/research/pageBrief';
import { readResearchDossier, writeResearchDossierAtomic } from '@/lib/site-bot/research/researchStore';
import { transitionResearchStatus } from '@/lib/site-bot/research/types';
import { buildSimulationGenerationResult, generateResearchPageCopy, isApprovedPortfolioBrief } from '@/lib/lp/researchPageCopy';

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
    brief.page && typeof brief.page.id === 'string' && typeof brief.page.targetPath === 'string'
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

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const collectedData = body?.collectedData as CollectedData | undefined;
  if (!collectedData?.businessNiche) {
    return NextResponse.json({ error: 'collectedData.businessNiche is required' }, { status: 400 });
  }

  const rawSlug = body.slug || collectedData.preferredSlug;
  const slug = rawSlug
    ? rawSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || slugify(collectedData.businessName || collectedData.businessNiche, collectedData.phone)
    : slugify(collectedData.businessName || collectedData.businessNiche, collectedData.phone);

  if (body.simulation === true) {
    return NextResponse.json({
      success: true,
      slug,
      simulation: true,
      deployable: false,
      copy: buildSimulationGenerationResult(collectedData),
    });
  }

  if (!opaqueId(body.researchId) || !isPageBrief(body.pageBrief)) {
    return NextResponse.json({ error: 'researchId and pageBrief are required for paid generation', deployable: false }, { status: 400 });
  }

  const dossier = await readResearchDossier(body.researchId);
  if (!dossier || !isApprovedPortfolioBrief(dossier, body.pageBrief)) {
    return NextResponse.json({ error: 'research_copy_not_ready', deployable: false }, { status: 409 });
  }

  try {
    const copy = await generateResearchPageCopy(body.pageBrief, collectedData);
    dossier.status = transitionResearchStatus(dossier.status, 'deploy_ready');
    dossier.pipelineChecks = {
      ...dossier.pipelineChecks,
      copy: 'pass',
      hebrewQa: 'pass',
      neuronEvaluation: dossier.pipelineChecks?.neuronEvaluation ?? 'pending',
      duplicateCannibalization: dossier.pipelineChecks?.duplicateCannibalization ?? 'pending',
    };
    if (!await writeResearchDossierAtomic(dossier.researchId, dossier)) {
      throw new Error('Unable to persist deploy-ready research dossier');
    }

    const sitesDir = path.join(process.cwd(), 'data', 'sites');
    fs.mkdirSync(sitesDir, { recursive: true });
    fs.writeFileSync(path.join(sitesDir, `${slug}.json`), JSON.stringify({
      slug,
      researchId: dossier.researchId,
      approvedPageId: body.pageBrief.page.id,
      collectedData,
      copy,
      createdAt: new Date().toISOString(),
    }, null, 2));

    return NextResponse.json({ success: true, slug, simulation: false, deployable: true });
  } catch {
    dossier.status = transitionResearchStatus(dossier.status, 'held');
    await writeResearchDossierAtomic(dossier.researchId, dossier);
    return NextResponse.json({
      error: 'research_copy_held',
      deployable: false,
      held: true,
    }, { status: 502 });
  }
}