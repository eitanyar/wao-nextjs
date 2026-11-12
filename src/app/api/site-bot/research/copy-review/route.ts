import fs from 'fs';
import path from 'path';
import { dataRoot } from '@/lib/dataRoots';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { isSafeDeploymentSlug } from '@/lib/deployment/deploy-access';
import { approveResearchedCopyReview, buildResearchedCopyReviewPacket } from '@/lib/site-bot/research/copyReviewPacket';
import { getResearchPath, readResearchDossier, writeResearchDossierAtomic } from '@/lib/site-bot/research/researchStore';
import type { SiteResearchDossier } from '@/lib/site-bot/research/types';
import { claimsNeedingCheck, unverifiedClaims } from '@/lib/lp/claimVerification';
import type { CollectedData } from '@/lib/bot/prompts';

export const dynamic = 'force-dynamic';

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const HEADERS = { 'Cache-Control': 'private, no-store' };
const MAX_RECORD_BYTES = 16 * 1024 * 1024;
const MAX_BODY_BYTES = 8 * 1024;

function reply(body: object, status: number) {
  return NextResponse.json(body, { status, headers: HEADERS });
}

// Check every directory component, not just the final file: a symlinked parent
// must never redirect this review endpoint outside its intended data tree.
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

type Loaded = { dossier: SiteResearchDossier; raw: Buffer } | { error: Response };

/** The dossier and the exact site-record bytes of one review, with the same path, symlink and size checks for GET and POST. */
async function loadReview(researchId: string, slug: string): Promise<Loaded> {
  const dossierPath = getResearchPath(researchId);
  if (!dossierPath) return { error: reply({ error: 'invalid_input' }, 400) };
  const dossierState = fileState(dossierPath);
  if (dossierState !== 'ready') return { error: reply({ error: dossierState === 'missing' ? 'not_found' : 'invalid_record' }, dossierState === 'missing' ? 404 : 409) };
  const dossier = await readResearchDossier(researchId, undefined, { bounded: true });
  if (!dossier) return { error: reply({ error: 'invalid_record' }, 409) };

  const sitesRoot = dataRoot('sites');
  const sitePath = path.join(sitesRoot.dir, `${slug}.json`);
  const siteState = fileState(sitePath, sitesRoot.walkBase);
  if (siteState !== 'ready') return { error: reply({ error: siteState === 'missing' ? 'not_found' : 'invalid_record' }, siteState === 'missing' ? 404 : 409) };

  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(sitePath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const stat = fs.fstatSync(descriptor);
    if (!stat.isFile() || stat.size > MAX_RECORD_BYTES) return { error: reply({ error: 'invalid_record' }, 409) };
    const chunks: Buffer[] = [];
    let total = 0;
    // Read from the opened descriptor, including one byte beyond the limit to
    // detect growth after fstat without ever draining an unbounded file.
    while (total <= MAX_RECORD_BYTES) {
      const chunk = Buffer.allocUnsafe(Math.min(64 * 1024, MAX_RECORD_BYTES + 1 - total));
      const count = fs.readSync(descriptor, chunk, 0, chunk.length, null);
      if (count === 0) break;
      total += count;
      if (total > MAX_RECORD_BYTES) return { error: reply({ error: 'invalid_record' }, 409) };
      chunks.push(chunk.subarray(0, count));
    }
    return { dossier, raw: Buffer.concat(chunks, total) };
  } catch {
    return { error: reply({ error: 'invalid_record' }, 409) };
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

/**
 * Launch step 2 (B4): the claims this record carries that need a staff check, with the owner's raw answer so the reviewer
 * can check it (licence against the registry; a free-text warranty with the owner).
 */
function claimsForReview(data: Partial<CollectedData> | undefined) {
  const owner = data ?? {};
  return claimsNeedingCheck(owner).map(claim => ({ claim, ownerAnswer: claim === 'licence' ? String(owner.license ?? '') : String(owner.guarantee ?? '') }));
}

export async function GET(req: Request) {
  const authCookies = await cookies();
  const authorized = await verifyAdminToken(authCookies.get(ADMIN_COOKIE_NAME)?.value ?? '');
  if (!authorized) return reply({ error: 'unauthorized' }, 401);

  let researchId: string;
  let slug: string;
  try {
    const params = new URL(req.url).searchParams;
    if (Array.from(params.keys()).sort().join(',') !== 'researchId,slug' ||
      params.getAll('researchId').length !== 1 || params.getAll('slug').length !== 1) {
      return reply({ error: 'invalid_input' }, 400);
    }
    researchId = params.get('researchId')!;
    slug = params.get('slug')!;
    if (!OPAQUE_ID.test(researchId) || !isSafeDeploymentSlug(slug)) return reply({ error: 'invalid_input' }, 400);
  } catch {
    return reply({ error: 'invalid_input' }, 400);
  }

  const loaded = await loadReview(researchId, slug);
  if ('error' in loaded) return loaded.error;
  try {
    const packet = buildResearchedCopyReviewPacket(loaded.raw, loaded.dossier);
    if (packet.researchId !== researchId || packet.slug !== slug) return reply({ error: 'invalid_record' }, 409);
    const record = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(loaded.raw)) as {
      researchedPages: Array<{ copy: unknown }>;
      collectedData?: Partial<CollectedData>;
    };
    const pages = packet.pages.map((page, index) => ({ ...page, copy: record.researchedPages[index].copy }));
    return reply({ packet, pages, claims: claimsForReview(record.collectedData), reviewStatus: 'pending_human_review', deployable: false }, 200);
  } catch {
    return reply({ error: 'invalid_record' }, 409);
  }
}

/**
 * Launch step 2 (B4): store the approved copy-review packet that deploy/route.ts requires, with the staff checks of the
 * licence / free-text warranty claims. Body: { researchId, slug, sha256 (of the record the reviewer loaded),
 * claimVerification?: { licence?: { verifiedBy, verifiedAt }, warranty?: { verifiedBy, verifiedAt } } }. A claim left out
 * stays unverified, and the renderer drops it. Writes the research dossier only; deploy still needs its other gates
 * (Hebrew QA pass, deploy_ready).
 */
export async function POST(req: Request) {
  const authCookies = await cookies();
  const authorized = await verifyAdminToken(authCookies.get(ADMIN_COOKIE_NAME)?.value ?? '');
  if (!authorized) return reply({ error: 'unauthorized' }, 401);
  const fetchSite = req.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') return reply({ error: 'forbidden' }, 403);
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return reply({ error: 'invalid_input' }, 400);

  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return reply({ error: 'invalid_input' }, 400);
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return reply({ error: 'invalid_input' }, 400);
    body = parsed as Record<string, unknown>;
  } catch {
    return reply({ error: 'invalid_input' }, 400);
  }
  if (Object.keys(body).some(key => !['researchId', 'slug', 'sha256', 'claimVerification'].includes(key))) return reply({ error: 'invalid_input' }, 400);
  const { researchId, slug, sha256, claimVerification } = body;
  if (typeof researchId !== 'string' || !OPAQUE_ID.test(researchId) || !isSafeDeploymentSlug(slug) || typeof sha256 !== 'string') {
    return reply({ error: 'invalid_input' }, 400);
  }

  const loaded = await loadReview(researchId, slug as string);
  if ('error' in loaded) return loaded.error;
  let approved;
  try {
    approved = approveResearchedCopyReview(loaded.raw, loaded.dossier, sha256, claimVerification);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/changed since/.test(message)) return reply({ error: 'review_stale' }, 409);
    if (/claim verification/.test(message)) return reply({ error: 'invalid_claim_verification' }, 400);
    return reply({ error: 'invalid_record' }, 409);
  }
  if (approved.researchId !== researchId || approved.slug !== slug) return reply({ error: 'invalid_record' }, 409);
  const dossier: SiteResearchDossier = { ...loaded.dossier, approvedCopyReviewPacket: approved, updatedAt: new Date().toISOString() };
  if (!await writeResearchDossierAtomic(researchId, dossier)) return reply({ error: 'write_failed' }, 500);
  let data: Partial<CollectedData> = {};
  try {
    data = (JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(loaded.raw)) as { collectedData?: Partial<CollectedData> }).collectedData ?? {};
  } catch { /* the packet builder already parsed these bytes */ }
  return reply({ approved: true, sha256: approved.sha256, unverifiedClaims: unverifiedClaims(data, approved.claimVerification) }, 200);
}
