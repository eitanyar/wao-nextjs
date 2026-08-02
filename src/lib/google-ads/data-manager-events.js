/**
 * Pure, framework-free Data Manager API logic — extracted out of
 * `conversion-upload.ts` (docs/specs/priority-4-data-manager-api-migration.md
 * §3/§5.1) into a plain `.js` sibling **only** so it can carry real,
 * mocked-`fetch` unit coverage under plain `node --test` (matching the
 * established pattern in this directory — `access-policy.js`/
 * `live-readiness.js` — since this Node build has no TypeScript type-
 * stripping support (`ERR_NO_TYPESCRIPT` under `--experimental-strip-types`)
 * and this codebase's only working path to compile-and-run real TypeScript
 * unit tests, the `tsconfig.test.json` → `dist/` pipeline, is scoped to the
 * trainer/payments subgraph and out of scope to extend here per spec §5.2
 * ("no other file changes required")). No behavior change from the version
 * of this logic that was inline in `conversion-upload.ts` — same functions,
 * same signatures, same request/response shape (spec §1).
 */

/**
 * `productDestinationId` is a bare numeric conversion-action ID, not the
 * resource-name string (`customers/{id}/conversionActions/{id}`) that
 * `CampaignConfig.verifiedLeadConversionResourceName`/
 * `closedDealConversionResourceName` already store (spec §1). Returns
 * `null`, never throws, on malformed/absent input.
 */
export function parseConversionActionId(resourceName) {
  if (!resourceName) return null;
  const match = String(resourceName).trim().match(/^customers\/\d+\/conversionActions\/(\d+)$/);
  return match ? match[1] : null;
}

/**
 * `datamanager`-scoped refresh token lookup, mirroring `resolveAdsAccount`'s
 * mode-gated fallback pattern (spec §4). Env var names are `GOOGLE_DATAMANAGER_*`
 * (no `_ADS_` infix) — what was actually minted for the new, deliberately
 * separate Testing-status OAuth client (spec §2 step 4).
 */
export function resolveDataManagerRefreshToken(mode) {
  if (mode === 'test') {
    return process.env.GOOGLE_DATAMANAGER_TEST_REFRESH_TOKEN || process.env.GOOGLE_DATAMANAGER_REFRESH_TOKEN;
  }
  return process.env.GOOGLE_DATAMANAGER_REFRESH_TOKEN;
}

/**
 * Exchanges the `datamanager`-scoped refresh token for a short-lived OAuth
 * access token, same primitive `scripts/get-google-ads-token.mjs` already
 * uses for the classic-API exchange (spec §3.2 step 2). No caching layer.
 */
export async function getDataManagerAccessToken(refreshToken, fetchImpl = fetch) {
  const clientId = process.env.GOOGLE_DATAMANAGER_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DATAMANAGER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { error: 'GOOGLE_DATAMANAGER_CLIENT_ID/GOOGLE_DATAMANAGER_CLIENT_SECRET not configured', status: 500 };
  }

  try {
    const response = await fetchImpl('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });
    const body = await response.json().catch(() => null);

    if (!response.ok || !body?.access_token) {
      return {
        error: body?.error_description || body?.error || `OAuth token exchange failed (HTTP ${response.status})`,
        status: response.status || 502,
      };
    }
    return { accessToken: body.access_token };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'OAuth token exchange threw', status: 502 };
  }
}

/**
 * Builds and sends the `events:ingest` request body (spec §1/§3.2 step 3),
 * and maps the response back into the shape `uploadLeadConversion()` needs
 * (spec §3.2 step 4). Per Google's own docs (spec §1), no custom headers
 * beyond auth/content-type — routing is entirely via the `Destination`
 * object's fields, not a `login-customer-id`-style header.
 */
export async function sendConversionEvent({
  accessToken,
  mccId,
  customerId,
  productDestinationId,
  clickId,
  transactionId,
  eventTimestamp,
  conversionValue,
  fetchImpl = fetch,
}) {
  try {
    const response = await fetchImpl('https://datamanager.googleapis.com/v1/events:ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        destinations: [
          {
            operatingAccount: { accountId: customerId, accountType: 'GOOGLE_ADS' },
            loginAccount: { accountId: mccId, accountType: 'GOOGLE_ADS' },
            productDestinationId,
          },
        ],
        events: [
          {
            // Not in spec §1's request-shape example (which predates a live
            // call) — confirmed empirically (2026-08-02, live sandbox
            // verification, docs/specs/priority-4-data-manager-api-migration.md
            // §6.5) that `events:ingest` rejects the request with
            // `event_source: Required field is missing` without this, even
            // though Google's own reference docs currently still list
            // `eventSource` as optional. `WEB` is correct for every event
            // this codebase sends — every lead here originates from a WAO
            // client's website form/click, never an app/in-store/phone/
            // message source.
            eventSource: 'WEB',
            transactionId,
            eventTimestamp,
            adIdentifiers: clickId,
            currency: 'ILS',
            conversionValue,
          },
        ],
      }),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        fieldWarnings: false,
        error: body?.error?.message || (body ? JSON.stringify(body) : `HTTP ${response.status}`),
        status: response.status,
      };
    }

    if (body?.fieldWarnings) {
      return { ok: false, fieldWarnings: true, body };
    }

    return { ok: true, requestId: body?.requestId };
  } catch (err) {
    return {
      ok: false,
      fieldWarnings: false,
      error: err instanceof Error ? err.message : 'events:ingest request threw',
      status: 502,
    };
  }
}

/** RFC 3339, e.g. 2026-08-02T14:30:00+03:00 (spec §1) — Israel = UTC+3. */
export function toEventTimestamp(isoOrDisplay) {
  const offset = '+03:00';
  const d = new Date(isoOrDisplay.includes('T') ? isoOrDisplay : isoOrDisplay.replace(' ', 'T'));
  const safe = isNaN(d.getTime()) ? new Date() : d;
  return safe.toISOString().slice(0, 19) + offset;
}
