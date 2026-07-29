/**
 * Shared auth guard for the billing cron routes
 * (`src/app/api/subscriptions/cron/*`). Extracted into `lib/payments` (rather
 * than duplicated inline in each route.ts) so it's unit-testable under the
 * plain `node --test` setup without needing to import `next/server` route
 * modules in the test build.
 *
 * Fails closed: if `CRON_SECRET` isn't configured server-side at all, this
 * always returns `false` — it never silently skips auth.
 */
export function isCronAuthorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token === expected;
}
