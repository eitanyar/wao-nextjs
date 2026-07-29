import { NextResponse } from 'next/server';
import { cancelSubscriptionByToken } from '@/lib/payments/subscriptions';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body?.token ?? '').trim();

    if (!token) {
      return NextResponse.json({ success: false, error: 'Missing token.' }, { status: 400 });
    }

    const outcome = await cancelSubscriptionByToken(token);

    if (!outcome.ok) {
      const status = outcome.reason === 'invalid_token' ? 401 : 400;
      return NextResponse.json({ success: false, error: outcome.reason }, { status });
    }

    return NextResponse.json({ success: true, subscriptionId: outcome.subscriptionId });
  } catch (error: any) {
    console.error('[subscriptions/cancel] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to cancel subscription.' }, { status: 500 });
  }
}
