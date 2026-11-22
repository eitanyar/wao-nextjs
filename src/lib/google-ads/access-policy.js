import { missingReadinessKeys } from './live-readiness.js';

/**
 * Gate for every Google Ads mutation route.
 *
 * Test mode: only the authenticated sandbox client (unchanged).
 * Live mode, in order:
 *  1. GOOGLE_ADS_ENABLE_LIVE_MODE is the global kill switch (`liveModeEnabled`).
 *  2. `requireAdminForLive` routes (live create-campaign) also need a valid
 *     wao-admin cookie (`isAdmin`).
 *  3. The client's live-readiness record must be complete for the route's
 *     stage (see live-readiness.js). A missing record (undefined/null) counts
 *     as incomplete, so a caller that forgets to pass it fails closed.
 *     Stage 'none' skips readiness (used only for pausing a campaign, which
 *     must always be possible).
 *
 * Admin on behalf: for `requireAdminForLive` routes only (live create-campaign),
 * with the kill switch on, a valid admin may act for `requestedClientId`
 * without a matching client session (a new pilot client has no session yet).
 * The result then carries `actingAsAdmin: true` so the route records the
 * admin as the actor. Every other route keeps the session-match rule.
 *
 * Error codes are English and stable (`code`); user-facing Hebrew, if ever
 * needed, is mapped from the code in the UI, never authored here.
 *
 * @param {{
 *   sessionClientId: string | null | undefined,
 *   requestedClientId: string | null | undefined,
 *   mode: string,
 *   sandboxClientId: string,
 *   liveModeEnabled: boolean,
 *   liveReadinessRecord?: object | null,
 *   liveReadinessStage?: 'full' | 'pre-account' | 'none',
 *   requireAdminForLive?: boolean,
 *   isAdmin?: boolean,
 * }} params
 * @returns {{ allowed: true, actingAsAdmin?: true }
 *   | { allowed: false, status: number, error: string, code?: string, missing?: string[] }}
 */
export function resolveGoogleAdsMutationAccess({
  sessionClientId,
  requestedClientId,
  mode,
  sandboxClientId,
  liveModeEnabled,
  liveReadinessRecord,
  liveReadinessStage = 'full',
  requireAdminForLive = false,
  isAdmin = false,
}) {
  const adminOnBehalf = mode === 'live'
    && liveModeEnabled === true
    && requireAdminForLive === true
    && isAdmin === true
    && Boolean(requestedClientId)
    && requestedClientId !== sessionClientId;

  if (!sessionClientId && !adminOnBehalf) {
    return {
      allowed: false,
      status: 401,
      error: 'Sign in before changing a Google Ads account.',
    };
  }

  if (!adminOnBehalf && (!requestedClientId || requestedClientId !== sessionClientId)) {
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

  if (mode === 'live') {
    if (requireAdminForLive && isAdmin !== true) {
      return {
        allowed: false,
        status: 403,
        code: 'live_admin_required',
        error: 'Live Google Ads account creation requires a WAO admin session.',
      };
    }

    const missing = liveReadinessStage === 'none'
      ? []
      : missingReadinessKeys(liveReadinessRecord, liveReadinessStage === 'pre-account' ? 'pre-account' : 'full');
    if (missing.length > 0) {
      return {
        allowed: false,
        status: 403,
        code: 'live_readiness_incomplete',
        error: 'This client is not ready for live Google Ads changes yet.',
        missing,
      };
    }
  }

  return adminOnBehalf ? { allowed: true, actingAsAdmin: true } : { allowed: true };
}
