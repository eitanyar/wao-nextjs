import { handleAutonomousCycleRequest } from '@/lib/google-ads/autonomous-cycle-route';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  return handleAutonomousCycleRequest(request);
}
