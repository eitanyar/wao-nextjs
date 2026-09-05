import { isCronAuthorized } from '../payments/cron-auth';
import { runAllAutonomousClientCycles, type AutonomousBatchCycleSummary } from './autonomous-cycle';

export async function handleAutonomousCycleRequest(
  request: Request,
  runCycle: () => Promise<AutonomousBatchCycleSummary> = runAllAutonomousClientCycles,
): Promise<Response> {
  if (!isCronAuthorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const summary = await runCycle();
    return Response.json({ success: true, ...summary });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Failed to run autonomous cycle' }, { status: 500 });
  }
}
