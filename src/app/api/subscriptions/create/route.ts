import { NextResponse } from 'next/server';
import { createPendingSubscription } from '@/lib/payments/subscriptions';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? '').trim();
    const trialAmount = Number(body?.trialAmount);
    const recurringAmount = Number(body?.recurringAmount);
    const currency = body?.currency ? String(body.currency) : undefined;

    if (!email || !Number.isFinite(trialAmount) || !Number.isFinite(recurringAmount)) {
      return NextResponse.json(
        { success: false, error: 'email, trialAmount and recurringAmount are required.' },
        { status: 400 }
      );
    }

    const result = await createPendingSubscription({ email, trialAmount, recurringAmount, currency });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[subscriptions/create] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create subscription.' }, { status: 500 });
  }
}
