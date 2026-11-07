import fs from 'fs';
import path from 'path';
import { dataRoot } from '@/lib/dataRoots';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { assertDeployReady, deriveNextPipelineAction } from '@/lib/site-bot/research/pipelineState';
import { getResearchPath, readResearchDossier } from '@/lib/site-bot/research/researchStore';

export const dynamic = 'force-dynamic';

function opaqueId(value: string | null): value is string {
  return Boolean(value && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value));
}

function getReply(body: object, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

function fileState(file: string, base: string = dataRoot('siteResearch').walkBase): 'ready' | 'missing' | 'invalid' {
  const relative = path.relative(base, file);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return 'invalid';
  let current = base;
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
  const authCookies = await cookies();
  const adminAuthorized = await verifyAdminToken(authCookies.get(ADMIN_COOKIE_NAME)?.value ?? '');
  if (!adminAuthorized) return getReply({ error: 'unauthorized' }, 401);

  const researchId = new URL(req.url).searchParams.get('researchId');
  if (!opaqueId(researchId)) return getReply({ error: 'invalid_input' }, 400);

  const dossierPath = getResearchPath(researchId);
  const dossierState = dossierPath ? fileState(dossierPath) : 'invalid';
  if (dossierState !== 'ready') return getReply({ error: dossierState === 'missing' ? 'not_found' : 'invalid_record' }, dossierState === 'missing' ? 404 : 409);
  const dossier = await readResearchDossier(researchId, undefined, { bounded: true });
  if (!dossier) return getReply({ error: 'invalid_record' }, 409);

  const next = deriveNextPipelineAction({ charged: true, dossier });
  const deployReadiness = assertDeployReady(dossier);
  const heldReasons = next.action === 'held' ? next.reasons : [];
  return getReply({
    researchId,
    status: dossier.status,
    nextAction: next.action,
    openGateCount: dossier.humanGates.filter(gate => gate.status !== 'approved').length + deployReadiness.reasons.length,
    heldReasons,
    resultUrl: null,
  }, 200);
}
