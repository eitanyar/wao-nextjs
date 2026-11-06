import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'checkout_unavailable' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
  );
}