export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

type GateState = { status?: unknown; ts?: unknown } | null;
export function optinEligible(now: number, gate: GateState, impressions: unknown, sessionShown: boolean, primaryClicked: boolean): boolean {
  if (sessionShown || primaryClicked || gate?.status === 'submitted') return false;
  if (gate?.status === 'dismissed' && typeof gate.ts === 'number' && now - gate.ts < DISMISS_MS) return false;
  return Array.isArray(impressions) && impressions.filter(t => typeof t === 'number' && t <= now && now - t < WEEK_MS).length < 2;
}

export function intentReady(now: number, started: number, maxScroll: number, viewport: number, cookieVisible: boolean): boolean {
  return !cookieVisible && now - started >= 30_000 && maxScroll >= viewport;
}

export function topExitTrajectory(samples: { y: number; t: number }[]): boolean {
  if (samples.length < 2) return false;
  const first = samples[0], last = samples[samples.length - 1];
  return last.t > first.t && last.y - first.y <= -20 && (last.y - first.y) / (last.t - first.t) <= -0.15;
}
