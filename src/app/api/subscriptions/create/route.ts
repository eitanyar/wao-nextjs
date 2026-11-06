import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'subscription_unavailable' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
  );
}
