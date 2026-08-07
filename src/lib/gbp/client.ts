/**
 * Google Business Profile (GBP) API client — thin wrapper against the documented REST
 * contract, gated on credentials. Mirrors the GOOGLE_ADS_* env-var naming pattern already
 * used in this repo (see .env.local) so ops can add real creds the same way.
 *
 * Required env vars (none are currently set — see runGbpScopeSmokeTest()):
 *   GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN
 *   (OAuth scope needed: https://www.googleapis.com/auth/business.manage)
 *
 * Endpoints used (current GBP API surface, split across three services):
 *   - Account Management API  — mybusinessaccountmanagement.googleapis.com/v1/accounts
 *   - Business Information API — mybusinessbusinessinformation.googleapis.com/v1/{location}
 *   - My Business API v4 (legacy, still the only interface for reviews/posts) —
 *     mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews
 *     mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/localPosts
 *
 * NOTE: Q&A (mybusinessqanda.googleapis.com) is intentionally NOT wrapped here — out of
 * scope per docs/specs/gmb-bot-scope.md §1 ("explicitly deferred, not in v1").
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ACCOUNT_MGMT_BASE = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const BUSINESS_INFO_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const LEGACY_V4_BASE = 'https://mybusiness.googleapis.com/v4';

export function hasGbpCredentials(): boolean {
  return !!(
    process.env.GBP_CLIENT_ID &&
    process.env.GBP_CLIENT_SECRET &&
    process.env.GBP_REFRESH_TOKEN
  );
}

async function getAccessToken(): Promise<string> {
  if (!hasGbpCredentials()) {
    throw new Error('GBP credentials not configured (GBP_CLIENT_ID/GBP_CLIENT_SECRET/GBP_REFRESH_TOKEN)');
  }
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GBP_CLIENT_ID!,
      client_secret: process.env.GBP_CLIENT_SECRET!,
      refresh_token: process.env.GBP_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`GBP token refresh failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.access_token as string;
}

async function gbpFetch(url: string, token: string, init?: RequestInit) {
  return fetch(url, {
    ...init,
    headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}` },
  });
}

// ── Read scopes ───────────────────────────────────────────────────────────────
export async function listAccounts(token: string) {
  return gbpFetch(`${ACCOUNT_MGMT_BASE}/accounts`, token);
}

export async function getLocation(token: string, accountId: string, locationId: string) {
  return gbpFetch(`${BUSINESS_INFO_BASE}/accounts/${accountId}/locations/${locationId}`, token);
}

export async function listReviews(token: string, accountId: string, locationId: string) {
  return gbpFetch(`${LEGACY_V4_BASE}/accounts/${accountId}/locations/${locationId}/reviews`, token);
}

// ── Write scopes (WoZ-gated — only ever called from the staff post-live step) ──
export async function replyToReview(
  token: string, accountId: string, locationId: string, reviewId: string, comment: string
) {
  return gbpFetch(
    `${LEGACY_V4_BASE}/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`,
    token,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comment }) }
  );
}

export async function createLocalPost(
  token: string, accountId: string, locationId: string, body: Record<string, unknown>
) {
  return gbpFetch(
    `${LEGACY_V4_BASE}/accounts/${accountId}/locations/${locationId}/localPosts`,
    token,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
}

// ── Scope smoke test (docs/specs/gmb-bot-scope.md §5) ──────────────────────────
export type GbpScopeCheckResult = 'pass' | 'fail' | 'skipped-no-credentials';

export interface GbpSmokeTestReport {
  ranAt: string;
  hasCredentials: boolean;
  results: {
    'accounts.list':      GbpScopeCheckResult;
    'location.read':      GbpScopeCheckResult;
    'reviews.read':       GbpScopeCheckResult;
    'reviews.reply':      GbpScopeCheckResult; // never actually posts — read-only capability inference
    'posts.write':        GbpScopeCheckResult; // never actually posts — read-only capability inference
  };
  notes: string[];
}

/**
 * Confirms which of {read reviews, write reply, read Q&A (deferred, not checked),
 * write posts, read location data} actually work under the granted scope — per
 * docs/specs/gmb-bot-scope.md §5's open dependency.
 *
 * Only `accounts.list`, `location.read`, and `reviews.read` are live-called (safe,
 * read-only). `reviews.reply` and `posts.write` are NOT live-called here — writing a
 * throwaway reply/post to a real GBP profile as a "test" is exactly the irreversible-write
 * risk §2 of the spec exists to prevent, so those two are reported as
 * 'skipped-no-credentials' until a real WoZ approval flow exercises them for real, on a
 * real approved item.
 */
export async function runGbpScopeSmokeTest(accountId?: string, locationId?: string): Promise<GbpSmokeTestReport> {
  const ranAt = new Date().toISOString();
  const notes: string[] = [];

  if (!hasGbpCredentials()) {
    notes.push(
      'No GBP credentials configured (GBP_CLIENT_ID / GBP_CLIENT_SECRET / GBP_REFRESH_TOKEN missing from env). ' +
      'Smoke test could not run against a live API — built against the documented contract only, per spec §5.'
    );
    return {
      ranAt,
      hasCredentials: false,
      results: {
        'accounts.list': 'skipped-no-credentials',
        'location.read': 'skipped-no-credentials',
        'reviews.read':  'skipped-no-credentials',
        'reviews.reply': 'skipped-no-credentials',
        'posts.write':   'skipped-no-credentials',
      },
      notes,
    };
  }

  let token: string;
  try {
    token = await getAccessToken();
  } catch (err) {
    notes.push(`Token refresh failed: ${err instanceof Error ? err.message : String(err)}`);
    return {
      ranAt,
      hasCredentials: true,
      results: {
        'accounts.list': 'fail',
        'location.read': 'fail',
        'reviews.read':  'fail',
        'reviews.reply': 'skipped-no-credentials',
        'posts.write':   'skipped-no-credentials',
      },
      notes,
    };
  }

  const results: GbpSmokeTestReport['results'] = {
    'accounts.list': 'fail',
    'location.read': 'skipped-no-credentials',
    'reviews.read':  'skipped-no-credentials',
    'reviews.reply': 'skipped-no-credentials',
    'posts.write':   'skipped-no-credentials',
  };

  try {
    const res = await listAccounts(token);
    results['accounts.list'] = res.ok ? 'pass' : 'fail';
    if (!res.ok) notes.push(`accounts.list: ${res.status} ${await res.text()}`);
  } catch (err) {
    notes.push(`accounts.list threw: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (accountId && locationId) {
    try {
      const res = await getLocation(token, accountId, locationId);
      results['location.read'] = res.ok ? 'pass' : 'fail';
      if (!res.ok) notes.push(`location.read: ${res.status} ${await res.text()}`);
    } catch (err) {
      notes.push(`location.read threw: ${err instanceof Error ? err.message : String(err)}`);
    }
    try {
      const res = await listReviews(token, accountId, locationId);
      results['reviews.read'] = res.ok ? 'pass' : 'fail';
      if (!res.ok) notes.push(`reviews.read: ${res.status} ${await res.text()}`);
    } catch (err) {
      notes.push(`reviews.read threw: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    notes.push('accountId/locationId not provided — location.read and reviews.read skipped.');
  }

  notes.push('reviews.reply and posts.write are never live-tested by this smoke test — irreversible-write risk (spec §2). Confirm those only via a real approved WoZ item.');

  return { ranAt, hasCredentials: true, results, notes };
}
