import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'gbp_oauth_disabled' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
  );
}
