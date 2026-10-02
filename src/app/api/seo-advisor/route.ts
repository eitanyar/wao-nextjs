import { NextResponse } from 'next/server';
import { handlePublicSeoEvent, signPublicSeoSession, PUBLIC_SEO_RATE_LIMIT } from '@/lib/seo-advisor-public-service';
import { startPublicSeoSession } from '@/lib/seo-advisor-public-session';
import { openPublicSeoBudgetStore, closePublicSeoBudgetStore } from '@/lib/seo-advisor-public-budget';
import type { PublicSeoExecutor } from '@/lib/seo-advisor-public-orchestrator';
import { createPublicSeoOpenSeoExecutor } from '@/lib/seo-advisor-public-executor';
import { checkRateLimit } from '@/lib/payments/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const disabledExecutor: PublicSeoExecutor = async () => {
  throw new Error('public_seo_executor_not_wired');
};

export function readConfig() {
  if (process.env.WAO_PUBLIC_SEO_ARMED !== '1') return null;
  const secret = process.env.WAO_PUBLIC_SEO_SECRET;
  const ceiling = process.env.WAO_PUBLIC_SEO_DAILY_CEILING;
  const projectId = process.env.WAO_PUBLIC_SEO_PROJECT_ID;
  const dbPath = process.env.WAO_PUBLIC_SEO_DB_PATH;
  const executorMode = process.env.WAO_PUBLIC_SEO_EXECUTOR;
  const origin = process.env.WAO_PUBLIC_SEO_OPENSEO_ORIGIN;
  if (!secret?.trim() || !projectId?.trim() || !dbPath?.startsWith('/') ||
    !ceiling || !/^(?:0|[1-9]\d*)$/u.test(ceiling)) return null;
  const dailyCeiling = Number(ceiling);
  if (!Number.isSafeInteger(dailyCeiling) || dailyCeiling < 300) return null;
  if (executorMode === 'openseo') {
    if (!origin) return null;
    try {
      const url = new URL(origin);
      if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
        url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    } catch { return null; }
  }
  return { secret, dailyCeiling, projectId, dbPath, executorMode, origin };
}

function clientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

function rateLimited(retryAfterMs: number) {
  return NextResponse.json({ error: 'rate_limited', retryAfterMs }, {
    status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
  });
}

export async function GET(request: Request) {
  const config = readConfig();
  if (!config) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  try {
    const limit = checkRateLimit(`public-seo:${clientKey(request)}`, PUBLIC_SEO_RATE_LIMIT);
    if (!limit.allowed) return rateLimited(limit.retryAfterMs);
    const turn = startPublicSeoSession();
    const token = signPublicSeoSession(turn.session, { secret: config.secret });
    return NextResponse.json({ token, utterances: turn.utterances }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const config = readConfig();
  if (!config) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
  }
  try {
    const store = openPublicSeoBudgetStore({ dbPath: config.dbPath });
    try {
      const input = body as { token?: unknown; event?: unknown };
      const result = await handlePublicSeoEvent({
        token: input.token, event: input.event, clientKey: clientKey(request),
        secret: config.secret, store, dailyCeiling: config.dailyCeiling,
        projectId: config.projectId,
        executor: config.executorMode === 'openseo'
          ? createPublicSeoOpenSeoExecutor({ projectId: config.projectId, origin: config.origin })
          : disabledExecutor,
      });
      switch (result.status) {
        case 'ok':
          return NextResponse.json({ token: result.token, utterances: result.utterances }, { status: 200 });
        case 'rate_limited':
          return rateLimited(result.retryAfterMs);
        case 'invalid_token':
          return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
        case 'unavailable':
          return NextResponse.json({ error: 'unavailable' }, { status: 503 });
      }
    } finally {
      closePublicSeoBudgetStore(store);
    }
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
