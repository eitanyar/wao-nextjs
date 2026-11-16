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
import { submitOwnerResearchGate } from '@/lib/site-bot/research/ownerGates';
import { isPaidFlowCallbackAllowed } from '@/lib/site-bot/paidFlowGate';
import { checkRateLimit } from '@/lib/payments/rate-limit';

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

/** Header carrying the owner's capability: the checkout session id of /site-bot/pay/<sessionId> (= the research id). */
const OWNER_SESSION_HEADER = 'x-site-bot-session';
const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_OWNER_BODY_BYTES = 32 * 1024;

async function boundedOwnerJson(req: Request): Promise<unknown> {
  if (req.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json' || !req.body) return null;
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > MAX_OWNER_BODY_BYTES) return null;
  const reader = req.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_OWNER_BODY_BYTES) { await reader.cancel(); return null; }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

// Owner path (F2, 2026-11-16): the paying owner answers his own gates from the pay page, without the admin cookie.
// Capability = the checkout session id the pay page holds (an unguessable UUID minted by checkout/init; the research id
// equals it). It authorises only that research, and only a gate the checkout callback recorded for the owner, still open.
// Reachable only while the paid flow is rehearsal/open (same switch as the checkout callback); closed -> 401 as before.
async function ownerPOST(req: Request, sessionId: string) {
  if (!isPaidFlowCallbackAllowed() || !SESSION_ID.test(sessionId)) return getReply({ error: 'unauthorized' }, 401);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const limit = { maxRequests: 30, windowMs: 10 * 60 * 1000 };
  if (!checkRateLimit(`sitebot-gates:${ip}`, limit).allowed || !checkRateLimit(`sitebot-gates-session:${sessionId}`, limit).allowed) {
    return getReply({ error: 'rate_limited' }, 429);
  }
  const body = await boundedOwnerJson(req) as Record<string, unknown> | null;
  if (!body || typeof body !== 'object' || Array.isArray(body) || !opaqueId(body.researchId) || !isCollectedData(body.collectedData)
    || typeof body.gateId !== 'string' || body.gateId.length > 300 || typeof body.evidenceDigest !== 'string' || body.evidenceDigest.length > 100) {
    return getReply({ error: 'invalid_input' }, 400);
  }
  if (body.researchId !== sessionId) return getReply({ error: 'forbidden' }, 403);
  const result = await submitOwnerResearchGate(sessionId, body.gateId, body.evidenceDigest, body.answer);
  if (result.status !== 'approved') {
    const [error, status] = ({
      forbidden: ['forbidden', 403],
      not_found: ['not_found', 404],
      closed: ['gate_closed', 409],
      stale: ['stale_evidence', 409],
      invalid_answer: ['invalid_input', 400],
    } as const)[result.status];
    return getReply({ error }, status);
  }
  // The owner's own collectedData (pay-page state) with this answer applied, so the page can build the next answer.
  const collectedData = applyResearchGateAnswer(body.collectedData, result.gate, result.answer);
  return getReply({ status: 'approved', collectedData }, 200);
}

export async function POST(req: Request) {
  const authCookies = await cookies();
  const adminAuthorized = await verifyAdminToken(authCookies.get(ADMIN_COOKIE_NAME)?.value ?? '');
  if (!adminAuthorized) {
    const ownerSession = req.headers?.get(OWNER_SESSION_HEADER);
    if (ownerSession) return ownerPOST(req, ownerSession);
    return getReply({ error: 'unauthorized' }, 401);
  }

  const body = await req.json().catch(() => null);
  if (!body || !opaqueId(body.researchId) || !isCollectedData(body.collectedData) || typeof body.gateId !== 'string' || typeof body.evidenceDigest !== 'string') {
    return getReply({ error: 'invalid_input' }, 400);
  }
  const gates = deriveOpenResearchGates(body.researchId, body.collectedData, true);
  const gate = gates.find(item => item.id === body.gateId);
  if (!gate) return getReply({ error: 'not_found' }, 404);
  const answered = applyResearchGateAnswer(body.collectedData, gate, body.answer);
  // A staff answer is validated and stored with the approval, so generation applies it over the owner's (gateAnswers.ts).
  // An approval without an answer stays as before (nothing stored).
  const result = await persistResearchGateApproval(body.researchId, gate, answered, body.evidenceDigest, body.answer === undefined ? {} : { staffAnswer: body.answer });
  if (result.status === 'not_found') return getReply({ error: 'not_found' }, 404);
  if (result.status === 'invalid_answer') return getReply({ error: 'invalid_input' }, 400);
  if (result.status === 'stale') return getReply({ error: 'stale_evidence' }, 409);
  return getReply({ status: result.status, collectedData: result.collectedData, approvals: result.dossier.researchGateApprovals ?? {} }, 200);
}
