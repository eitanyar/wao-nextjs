import { NextResponse } from 'next/server';
import type { CollectedData } from '@/lib/bot/prompts';
import {
  applyResearchGateAnswer,
  deriveOpenResearchGates,
  persistResearchGateApproval,
} from '@/lib/site-bot/research/gates';
import { readResearchDossier } from '@/lib/site-bot/research/researchStore';

export const dynamic = 'force-dynamic';

function opaqueId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value);
}

function isCollectedData(value: unknown): value is CollectedData {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export async function GET(req: Request) {
  const researchId = new URL(req.url).searchParams.get('researchId');
  if (!opaqueId(researchId)) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const dossier = await readResearchDossier(researchId);
  if (!dossier) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ researchId, approvals: dossier.researchGateApprovals ?? {} });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || !opaqueId(body.researchId) || !isCollectedData(body.collectedData) || typeof body.gateId !== 'string' || typeof body.evidenceDigest !== 'string') {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  const gates = deriveOpenResearchGates(body.researchId, body.collectedData, true);
  const gate = gates.find(item => item.id === body.gateId);
  if (!gate) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const answered = applyResearchGateAnswer(body.collectedData, gate, body.answer);
  const result = await persistResearchGateApproval(body.researchId, gate, answered, body.evidenceDigest);
  if (result.status === 'stale') return NextResponse.json({ error: 'stale_evidence' }, { status: 409 });
  return NextResponse.json({ status: result.status, collectedData: result.collectedData, approvals: result.dossier.researchGateApprovals ?? {} });
}
