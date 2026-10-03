// Per-process only, like the fixed-window rate limiter; resets on process restart.
const consumedJtis = new Set<string>();

export function consumePreviewTokenJti(jti: string): boolean {
  if (consumedJtis.has(jti)) return false;
  consumedJtis.add(jti);
  return true;
}

export function resetTokenConsumptionState(): void {
  consumedJtis.clear();
}
