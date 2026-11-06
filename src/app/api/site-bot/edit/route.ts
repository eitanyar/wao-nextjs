import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json(
    { error: 'site_edit_disabled' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
  );
}
