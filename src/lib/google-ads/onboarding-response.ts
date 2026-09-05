export interface OnboardingTerminalResponse {
  response: string;
  currentState: string;
  collectedData: Record<string, unknown>;
  isSimulation: boolean;
}

interface ResolveBoundedOnboardingResponseOptions<T> {
  live: () => Promise<T>;
  fallback: () => T | Promise<T>;
  timeoutMs: number;
}

export async function resolveBoundedOnboardingResponse<T>({
  live,
  fallback,
  timeoutMs,
}: ResolveBoundedOnboardingResponseOptions<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      live(),
      new Promise<T>((resolve) => {
        timeout = setTimeout(() => resolve(fallback()), timeoutMs);
      }),
    ]);
  } catch {
    return await fallback();
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
