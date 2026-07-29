import { NextResponse } from 'next/server';
import { createCardUpdateSession } from '@/lib/payments/card-update';

/**
 * Starts the card-update tokenization flow. Body: `{ token }` — the
 * magic-link token that got the customer to the account page. Only PEEKED
 * here (not consumed) — see `card-update.ts` doc comment for why.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body?.token ?? '').trim();

    if (!token) {
      return NextResponse.json({ success: false, error: 'Missing token.' }, { status: 400 });
    }

    const outcome = await createCardUpdateSession(token);

    if (!outcome.ok) {
      const status = outcome.reason === 'invalid_token' ? 401 : 400;
      return NextResponse.json({ success: false, error: outcome.reason }, { status });
    }

    return NextResponse.json({ success: true, redirectUrl: outcome.redirectUrl });
  } catch (error: any) {
    console.error('[subscriptions/card-update/create] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to start card update.' }, { status: 500 });
  }
}
