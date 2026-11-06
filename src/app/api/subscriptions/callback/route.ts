import { NextResponse } from 'next/server';

function unavailable() {
  return NextResponse.json(
    { error: 'subscription_unavailable' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
  );
}

export async function GET() {
  return unavailable();
}

export async function POST() {
  return unavailable();
}
