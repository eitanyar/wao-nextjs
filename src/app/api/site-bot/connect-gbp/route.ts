import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json(
    { error: 'gbp_connect_disabled' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
  );
}