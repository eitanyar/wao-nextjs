const SAFE_DEPLOYMENT_SLUG = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,38}[a-z0-9]$/;

/**
 * Slugs that would collide with infrastructure hosts on wao.co.il once a tenant is served at
 * `{slug}.wao.co.il` (Site Bot shared-Worker hosting, docs/missions/site-bot-shared-worker-hosting-2026-11-12.md).
 * `sites` is the owner-domain CNAME target, `sites-origin` the SaaS fallback origin; the rest are
 * existing Google/mail/main-site or legacy hosts on the zone.
 */
export const RESERVED_DEPLOYMENT_SLUGS: ReadonlySet<string> = new Set([
  'sites', 'sites-origin', 'www', 'mail', 'calendar', 'chat', 'docs', 'email', 'smtp', 'alfa', 'karate', 'send',
]);

export function isSafeDeploymentSlug(value: unknown): value is string {
  return typeof value === 'string' && SAFE_DEPLOYMENT_SLUG.test(value) && !RESERVED_DEPLOYMENT_SLUGS.has(value);
}
