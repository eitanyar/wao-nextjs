import { runGbpScopeSmokeTest } from '@/lib/gbp/client';
import { NextResponse } from 'next/server';

export async function GET() {
  const result = await runGbpScopeSmokeTest();
  return NextResponse.json(result);
}
