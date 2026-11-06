import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'fix_plan_disabled' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
  );
}
