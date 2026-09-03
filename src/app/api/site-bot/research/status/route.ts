import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { assertDeployReady, deriveNextPipelineAction } from '@/lib/site-bot/research/pipelineState';
import { readResearchDossier } from '@/lib/site-bot/research/researchStore';

export const dynamic = 'force-dynamic';

function opaqueId(value: string | null): value is string {
  return Boolean(value && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value));
}

function resultUrl(researchId: string): string | null {
  const sitesDir = path.join(process.cwd(), 'data', 'sites');
  try {
    for (const fileName of fs.readdirSync(sitesDir)) {
      if (!fileName.endsWith('.json')) continue;
      const record = JSON.parse(fs.readFileSync(path.join(sitesDir, fileName), 'utf8')) as { researchId?: unknown; slug?: unknown };
      if (record.researchId === researchId && typeof record.slug === 'string' && /^[a-z0-9-]+$/.test(record.slug)) {
        return `https://${record.slug}.wao.co.il`;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export async function GET(req: Request) {
  const researchId = new URL(req.url).searchParams.get('researchId');
  if (!opaqueId(researchId)) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const dossier = await readResearchDossier(researchId);
  if (!dossier) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const next = deriveNextPipelineAction({ charged: true, dossier });
  const deployReadiness = assertDeployReady(dossier);
  const heldReasons = next.action === 'held' ? next.reasons : [];
  return NextResponse.json({
    researchId,
    status: dossier.status,
    nextAction: next.action,
    openGateCount: dossier.humanGates.filter(gate => gate.status !== 'approved').length + deployReadiness.reasons.length,
    heldReasons,
    resultUrl: deployReadiness.ready ? resultUrl(researchId) : null,
  });
}
