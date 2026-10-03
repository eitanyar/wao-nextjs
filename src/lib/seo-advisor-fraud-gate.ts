import { buildFraudBlockerTrackerHtml } from './fraud-blocker/tracker';

export function publicSeoFraudTrackerHtml(sid: unknown): string | null {
  if (typeof sid !== 'string') return null;
  try {
    return buildFraudBlockerTrackerHtml(sid);
  } catch {
    return null;
  }
}
