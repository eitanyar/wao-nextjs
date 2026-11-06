import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { isSafeDeploymentSlug } from '@/lib/deployment/deploy-access';
import { buildResearchedCopyReviewPacket } from '@/lib/site-bot/research/copyReviewPacket';
import { getResearchPath, readResearchDossier } from '@/lib/site-bot/research/researchStore';

export const dynamic = 'force-dynamic';

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const HEADERS = { 'Cache-Control': 'private, no-store' };
const MAX_RECORD_BYTES = 16 * 1024 * 1024;

function reply(body: object, status: number) {
  return NextResponse.json(body, { status, headers: HEADERS });
}

// Check every directory component, not just the final file: a symlinked parent
// must never redirect this review endpoint outside its intended data tree.
function fileState(file: string): 'ready' | 'missing' | 'invalid' {
  const relative = path.relative(process.cwd(), file);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return 'invalid';
  let current = process.cwd();
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

  const dossierPath = getResearchPath(researchId);
  if (!dossierPath) return reply({ error: 'invalid_input' }, 400);
  const dossierState = fileState(dossierPath);
  if (dossierState !== 'ready') return reply({ error: dossierState === 'missing' ? 'not_found' : 'invalid_record' }, dossierState === 'missing' ? 404 : 409);
  const dossier = await readResearchDossier(researchId, undefined, { bounded: true });
  if (!dossier) return reply({ error: 'invalid_record' }, 409);

  const sitePath = path.join(process.cwd(), 'data', 'sites', `${slug}.json`);
  const siteState = fileState(sitePath);
  if (siteState !== 'ready') return reply({ error: siteState === 'missing' ? 'not_found' : 'invalid_record' }, siteState === 'missing' ? 404 : 409);

  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(sitePath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const stat = fs.fstatSync(descriptor);
    if (!stat.isFile() || stat.size > MAX_RECORD_BYTES) return reply({ error: 'invalid_record' }, 409);
    const chunks: Buffer[] = [];
    let total = 0;
    // Read from the opened descriptor, including one byte beyond the limit to
    // detect growth after fstat without ever draining an unbounded file.
    while (total <= MAX_RECORD_BYTES) {
      const chunk = Buffer.allocUnsafe(Math.min(64 * 1024, MAX_RECORD_BYTES + 1 - total));
      const count = fs.readSync(descriptor, chunk, 0, chunk.length, null);
      if (count === 0) break;
      total += count;
      if (total > MAX_RECORD_BYTES) return reply({ error: 'invalid_record' }, 409);
      chunks.push(chunk.subarray(0, count));
    }
    const raw = Buffer.concat(chunks, total);
    const packet = buildResearchedCopyReviewPacket(raw, dossier);
    if (packet.researchId !== researchId || packet.slug !== slug) return reply({ error: 'invalid_record' }, 409);
    const record = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)) as {
      researchedPages: Array<{ copy: unknown }>;
    };
    const pages = packet.pages.map((page, index) => ({ ...page, copy: record.researchedPages[index].copy }));
    return reply({ packet, pages, reviewStatus: 'pending_human_review', deployable: false }, 200);
  } catch {
    return reply({ error: 'invalid_record' }, 409);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}
