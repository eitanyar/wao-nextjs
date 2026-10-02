import { createHmac } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requestClientPinRecovery } from '@/lib/client-pin-recovery';
import { checkRateLimit } from '@/lib/payments/rate-limit';

function source(request: NextRequest): string { return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'; }
function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  return Boolean(origin && origin === request.nextUrl.origin);
}
function bucket(stage: 'request-source' | 'request-source-subject', sourceValue: string, subjectDigest: string): boolean {
  const digest = createHmac('sha256', process.env.CLIENT_PORTAL_SECRET ?? 'unconfigured').update(`wao-client-pin-recovery-route-rate-v1\u0000${sourceValue}\u0000${subjectDigest}`).digest('hex');
  const config = stage === 'request-source' ? { maxRequests: 5, windowMs: 15 * 60 * 1000 } : { maxRequests: 3, windowMs: 15 * 60 * 1000 };
  return checkRateLimit(`client-recovery:${stage}:${digest}`, config).allowed;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!sameOrigin(request)) return NextResponse.json({ status: 'accepted' }, { status: 202 });
  const length = Number(request.headers.get('content-length') ?? '0');
  if (!Number.isFinite(length) || length > 1024) return NextResponse.json({ status: 'accepted' }, { status: 202 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ status: 'accepted' }, { status: 202 }); }
  const email = body && typeof body === 'object' && Object.keys(body).length === 1 && typeof (body as { email?: unknown }).email === 'string' && (body as { email: string }).email.length <= 254 ? (body as { email: string }).email : '';
  await requestClientPinRecovery({ email, source: source(request) }, { rateLimit: (stage, sourceValue, subjectDigest) => stage === 'complete-source-subject' ? true : bucket(stage, sourceValue, subjectDigest) });
  return NextResponse.json({ status: 'accepted' }, { status: 202 });
}
