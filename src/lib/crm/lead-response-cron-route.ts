import { isCronAuthorized } from '../payments/cron-auth';
import { runPendingLeadResponses, type LeadResponseSummary } from './lead-response';

export async function handleLeadResponseCronRequest(
  request: Request,
  runWorker: () => Promise<LeadResponseSummary> = runPendingLeadResponses,
): Promise<Response> {
  if (!isCronAuthorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const summary = await runWorker();
    return Response.json({ success: true, ...summary });
  } catch {
    return Response.json({ error: 'Failed to run lead responses' }, { status: 500 });
  }
}
