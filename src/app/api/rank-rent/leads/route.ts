import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { checkRateLimit } from '../../../../lib/payments/rate-limit';
import { handlePortfolioLeadRequest } from '../../../../lib/rank-rent/leads';
import { listPortfolioSites, readPortfolioSite } from '../../../../lib/rank-rent/store';
import type { PortfolioSite } from '../../../../lib/rank-rent/types';

const MAX_AUTHORIZATION_BYTES = 1_048_576;

function absoluteExternalRoot(value: string | undefined): string | null {
  if (!value || !path.isAbsolute(value)) return null;
  const resolved = path.resolve(value); const repository = path.resolve(process.cwd());
  return resolved === repository || resolved.startsWith(`${repository}${path.sep}`) ? null : resolved;
}
function exactOrigin(origin: string): string | null {
  try { const parsed = new URL(origin); return parsed.protocol === 'https:' && parsed.pathname === '/' && !parsed.search && !parsed.hash && !parsed.username && !parsed.password && !parsed.port ? parsed.origin : null; } catch { return null; }
}
function resolveSite(origin: string, dataRoot: string): PortfolioSite | null {
  const exact = exactOrigin(origin); if (!exact) return null;
  const summary = listPortfolioSites(dataRoot).find(site => exact === `https://${site.canonicalDomainCandidate}` && site.lifecycle === 'live');
  return summary ? readPortfolioSite(summary.siteId, dataRoot) : null;
}
function readGrant(siteId: string, authorizationRoot: string): unknown | null {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(siteId)) return null;
  const target = path.resolve(authorizationRoot, `${siteId}.json`);
  if (target !== path.join(authorizationRoot, `${siteId}.json`)) return null;
  try { const stat = fs.lstatSync(target); if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > MAX_AUTHORIZATION_BYTES) return null; return JSON.parse(fs.readFileSync(target, 'utf8')); } catch { return null; }
}

export async function POST(request: Request): Promise<Response> {
  const dataRoot = absoluteExternalRoot(process.env.RANK_RENT_DATA_DIR);
  const authorizationRoot = absoluteExternalRoot(process.env.RANK_RENT_AUTHORIZATION_DATA_DIR);
  const leadsRoot = absoluteExternalRoot(process.env.RANK_RENT_LEADS_DATA_DIR);
  if (!dataRoot || !authorizationRoot || !leadsRoot) return Response.json({ success: false, reason: 'service_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  return handlePortfolioLeadRequest(request, {
    now: () => new Date().toISOString(),
    resolveSite: origin => resolveSite(origin, dataRoot),
    readGrant: siteId => readGrant(siteId, authorizationRoot),
    resolveLeadRoot: () => leadsRoot,
    pageResolver: (_site, pathname) => pathname === '/' ? 'home' : pathname.split('/').filter(Boolean).pop() ?? null,
    rateLimit: key => { const result = checkRateLimit(crypto.createHash('sha256').update(key).digest('hex'), { maxRequests: 30, windowMs: 60_000 }); return { allowed: result.allowed, retryAfterSeconds: Math.ceil(result.retryAfterMs / 1000) }; },
  });
}

export async function OPTIONS(request: Request): Promise<Response> { return POST(new Request(request.url, { method: 'OPTIONS', headers: request.headers })); }
