import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { completeClientPinRecovery } from '@/lib/client-pin-recovery';
import { checkRateLimit } from '@/lib/payments/rate-limit';

function source(request: NextRequest): string { return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'; }
function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  return Boolean(origin && origin === request.nextUrl.origin);
}
function field(body: unknown, key: 'whatsappMobile' | 'code' | 'newPin' | 'confirmPin', limit: number): string {
  const value = body && typeof body === 'object' ? (body as Record<string, unknown>)[key] : undefined;
  return typeof value === 'string' && value.length <= limit ? value : '';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!sameOrigin(request)) return NextResponse.json({ status: 'invalid-or-expired' }, { status: 400 });
  const length = Number(request.headers.get('content-length') ?? '0');
  if (!Number.isFinite(length) || length > 1024) return NextResponse.json({ status: 'invalid-or-expired' }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ status: 'invalid-or-expired' }, { status: 400 }); }
  const validShape = Boolean(body && typeof body === 'object' && Object.keys(body).every(key => ['whatsappMobile', 'code', 'newPin', 'confirmPin'].includes(key)));
  const whatsappMobile = validShape ? field(body, 'whatsappMobile', 32) : '';
  const sourceValue = source(request);
  const key = createHash('sha256').update(`${sourceValue}:${whatsappMobile || 'invalid'}`).digest('hex');
  const result = await completeClientPinRecovery({ whatsappMobile, code: field(body, 'code', 8), newPin: field(body, 'newPin', 12), confirmPin: field(body, 'confirmPin', 12), source: sourceValue }, { rateLimit: () => checkRateLimit(`client-recovery:complete:${key}`, { maxRequests: 10, windowMs: 15 * 60 * 1000 }).allowed });
  return NextResponse.json(result, { status: result.status === 'complete' ? 200 : 400 });
}
