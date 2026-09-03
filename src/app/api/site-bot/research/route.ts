import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { readResearchDossier } from '@/lib/site-bot/research/researchStore';
import { resumeSiteResearch, runSiteResearch, type SiteResearchInput } from '@/lib/site-bot/research/runResearch';

export const dynamic = 'force-dynamic';

function isAuthorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const [scheme, token] = (req.headers.get('authorization') ?? '').split(' ');
  return scheme === 'Bearer' && token === expected;
}

function opaqueId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value);
}

function summary(dossier: Awaited<ReturnType<typeof readResearchDossier>>) {
  if (!dossier) return null;
  return {
    researchId: dossier.researchId,
    status: dossier.status,
    gates: dossier.humanGates.map(gate => ({ id: gate.id, status: gate.status, requiredFor: gate.requiredFor })),
    stages: {
      truth: dossier.businessTruth.assertions.length > 0,
      keywords: dossier.keywordEvidence.length > 0,
      serps: dossier.serpObservations.length > 0,
      evidence: dossier.evidence.length > 0,
      usage: dossier.providerUsage.length > 0,
      readiness: dossier.status === 'architecture_ready' || dossier.status === 'held',
    },
  };
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || (body.action !== 'start' && body.action !== 'resume')) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const researchId = body.action === 'start' ? (opaqueId(body.researchId) ? body.researchId : randomUUID()) : body.researchId;
  if (!opaqueId(researchId) || !body.input || typeof body.input !== 'object') return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  try {
    const result = body.action === 'resume'
      ? await resumeSiteResearch(researchId, body.input as SiteResearchInput)
      : await runSiteResearch(researchId, body.input as SiteResearchInput);
    return NextResponse.json(summary(result.dossier));
  } catch {
    return NextResponse.json({ error: 'research_failed' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const researchId = new URL(req.url).searchParams.get('researchId');
  if (!opaqueId(researchId)) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const dossier = await readResearchDossier(researchId);
  if (!dossier) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(summary(dossier));
}
