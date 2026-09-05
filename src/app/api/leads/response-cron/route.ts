import { handleLeadResponseCronRequest } from '@/lib/crm/lead-response-cron-route';

export async function POST(request: Request): Promise<Response> {
  return handleLeadResponseCronRequest(request);
}
