import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getResearchPath, readResearchDossier } from '@/lib/site-bot/research/researchStore';
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

function postReply(body: object | null, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) return postReply({ error: 'Unauthorized' }, 401);
  const body = await req.json().catch(() => null);
  if (!body || (body.action !== 'start' && body.action !== 'resume')) return postReply({ error: 'invalid_input' }, 400);
  const researchId = body.action === 'start' ? (opaqueId(body.researchId) ? body.researchId : randomUUID()) : body.researchId;
  if (!opaqueId(researchId) || !body.input || typeof body.input !== 'object') return postReply({ error: 'invalid_input' }, 400);
  try {
    const result = body.action === 'resume'
      ? await resumeSiteResearch(researchId, body.input as SiteResearchInput)
      : await runSiteResearch(researchId, body.input as SiteResearchInput);
    return postReply(summary(result.dossier), 200);
  } catch {
    return postReply({ error: 'research_failed' }, 500);
  }
}

function getReply(body: object | null, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

function getFileState(file: string, researchId: string): 'ready' | 'missing' | 'invalid' {
  const root = process.cwd();
  if (file !== path.resolve(root, 'data', 'site-research', researchId, 'dossier.json')) return 'invalid';
  const relative = path.relative(root, file);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return 'invalid';
  let current = root;
  const parts = relative.split(path.sep);
  for (const [index, part] of parts.entries()) {
    current = path.join(/* turbopackIgnore: true */ current, part);
    try {
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink() || !(index === parts.length - 1 ? stat.isFile() : stat.isDirectory())) return 'invalid';
    } catch (error) {
      return (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'missing' : 'invalid';
    }
  }
  return 'ready';
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return getReply({ error: 'Unauthorized' }, 401);
  const researchId = new URL(req.url).searchParams.get('researchId');
  if (!opaqueId(researchId)) return getReply({ error: 'invalid_input' }, 400);
  const dossierPath = getResearchPath(researchId);
  const state = dossierPath ? getFileState(dossierPath, researchId) : 'invalid';
  if (state !== 'ready') return getReply({ error: state === 'missing' ? 'not_found' : 'invalid_record' }, state === 'missing' ? 404 : 409);
  const dossier = await readResearchDossier(researchId, undefined, { bounded: true });
  if (!dossier) return getReply({ error: 'invalid_record' }, 409);
  return getReply(summary(dossier), 200);
}
