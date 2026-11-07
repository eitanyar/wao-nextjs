import fs from 'fs';
import path from 'path';
import { dataRoot } from '@/lib/dataRoots';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import type { CollectedData } from '@/lib/bot/prompts';
import {
  applyResearchGateAnswer,
  deriveOpenResearchGates,
  persistResearchGateApproval,
} from '@/lib/site-bot/research/gates';
import { getResearchPath, readResearchDossier } from '@/lib/site-bot/research/researchStore';

export const dynamic = 'force-dynamic';

function opaqueId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value);
}

function isCollectedData(value: unknown): value is CollectedData {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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
  if (dossierState !== 'ready') return getReply({ error: 'not_found' }, 404);
  const dossier = await readResearchDossier(researchId, undefined, { bounded: true });
  if (!dossier) return getReply({ error: 'not_found' }, 404);
  return getReply({ researchId, approvals: dossier.researchGateApprovals ?? {} }, 200);
}

export async function POST(req: Request) {
  const authCookies = await cookies();
  const adminAuthorized = await verifyAdminToken(authCookies.get(ADMIN_COOKIE_NAME)?.value ?? '');
  if (!adminAuthorized) return getReply({ error: 'unauthorized' }, 401);

  const body = await req.json().catch(() => null);
  if (!body || !opaqueId(body.researchId) || !isCollectedData(body.collectedData) || typeof body.gateId !== 'string' || typeof body.evidenceDigest !== 'string') {
    return getReply({ error: 'invalid_input' }, 400);
  }
  const gates = deriveOpenResearchGates(body.researchId, body.collectedData, true);
  const gate = gates.find(item => item.id === body.gateId);
  if (!gate) return getReply({ error: 'not_found' }, 404);
  const answered = applyResearchGateAnswer(body.collectedData, gate, body.answer);
  const result = await persistResearchGateApproval(body.researchId, gate, answered, body.evidenceDigest);
  if (result.status === 'not_found') return getReply({ error: 'not_found' }, 404);
  if (result.status === 'stale') return getReply({ error: 'stale_evidence' }, 409);
  return getReply({ status: result.status, collectedData: result.collectedData, approvals: result.dossier.researchGateApprovals ?? {} }, 200);
}
