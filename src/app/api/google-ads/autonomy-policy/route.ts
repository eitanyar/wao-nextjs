import { cookies } from 'next/headers';
import { COOKIE_NAME, verifySessionToken } from '@/lib/client-auth';
import { handleAutonomyPolicyRequest } from '@/lib/google-ads/autonomy-policy-route';

async function sessionClientId(): Promise<string | null> {
  const jar = await cookies();
  return verifySessionToken(jar.get(COOKIE_NAME)?.value ?? '');
}

export async function GET(request: Request) {
  return handleAutonomyPolicyRequest(request, await sessionClientId());
}

export async function POST(request: Request) {
  return handleAutonomyPolicyRequest(request, await sessionClientId());
}
