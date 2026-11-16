/**
 * The site origin for absolute links in emails (manage / cancel links, staff alerts): NEXT_PUBLIC_BASE_URL when set,
 * else the canonical production origin. Never a localhost fallback: a link in an email must work for its reader.
 * No trailing slash.
 */
export const CANONICAL_SITE_ORIGIN = 'https://www.wao.co.il';

export function siteBaseUrl(env: Record<string, string | undefined> = process.env): string {
  return (env.NEXT_PUBLIC_BASE_URL || CANONICAL_SITE_ORIGIN).replace(/\/+$/, '');
}
