/**
 * Restricts the pre-production Google Ads flow to the authenticated sandbox
 * client. Live mutations stay unavailable until a separate live-readiness gate
 * explicitly enables them.
 */
export function resolveGoogleAdsMutationAccess({
  sessionClientId,
  requestedClientId,
  mode,
  sandboxClientId,
  liveModeEnabled,
}) {
  if (!sessionClientId) {
    return {
      allowed: false,
      status: 401,
      error: 'Sign in before changing a Google Ads account.',
    };
  }

  if (!requestedClientId || requestedClientId !== sessionClientId) {
    return {
      allowed: false,
      status: 403,
      error: 'You can only mutate the Google Ads account linked to your session.',
    };
  }

  if (mode === 'live' && !liveModeEnabled) {
    return {
      allowed: false,
      status: 403,
      error: 'Live Google Ads mutations are disabled during sandbox validation.',
    };
  }

  if (mode === 'test' && requestedClientId !== sandboxClientId) {
    return {
      allowed: false,
      status: 403,
      error: 'Test Google Ads mutations are restricted to the internal sandbox client.',
    };
  }

  return { allowed: true };
}
